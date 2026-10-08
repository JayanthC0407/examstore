import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import PaperRequest from "../models/PaperRequest.js";
import Paper from "../models/Paper.js";
import { HttpError, badRequest, notFound, toInt } from "../lib/http.js";
import { storage } from "../lib/storage.js";
import { parsePaperInput, inspectPdf, assertNotPublished, storePdf, sendPdf } from "../lib/papers.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { uploadPdf } from "../middleware/upload.js";

const router = Router();

const MAX_PENDING_PER_USER = 10;
const PAPER_FIELDS = ["subjectName", "subjectCode", "department", "semester", "year", "examType"];

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many submissions. Please try again in an hour." },
});

const isAdmin = (user) => user.role === "admin";
const isOwner = (request, user) => String(request.submittedBy?._id || request.submittedBy) === String(user._id);

async function findRequest(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound("Request not found");
  const request = await PaperRequest.findById(id);
  if (!request) throw notFound("Request not found");
  return request;
}

const alreadyReviewed = (r) => new HttpError(409, `This request was already ${r.status}`);
const removeFile = (file) =>
  file && storage.remove(file).catch((e) => console.error("[requests] file cleanup failed", e.message));

// ---------- Students (any signed-in user) ----------

router.post("/", requireAuth, submitLimiter, uploadPdf, async (req, res) => {
  // `notes` is the published paper's note, which admins write; students send `message`.
  const { notes: _ignored, ...details } = parsePaperInput(req.body);
  const message = String(req.body.message || "").trim().slice(0, 500);

  const pending = await PaperRequest.countDocuments({ submittedBy: req.user._id, status: "pending" });
  if (pending >= MAX_PENDING_PER_USER) {
    throw badRequest(`You already have ${pending} requests waiting for review. Please wait for an admin to review them.`);
  }

  const sha256 = await inspectPdf(req.file);
  if (await PaperRequest.exists({ "file.sha256": sha256, status: "pending" })) {
    throw new HttpError(409, "This exact file has already been submitted and is waiting for review");
  }

  const file = await storePdf(req.file, sha256);
  const request = await PaperRequest.create({ ...details, message, file, submittedBy: req.user._id });
  res.status(201).json({ request });
});

router.get("/mine", requireAuth, async (req, res) => {
  const items = await PaperRequest.find({ submittedBy: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ items });
});

// A student can withdraw their own request while it's still pending.
router.delete("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound("Request not found");
  const request = await PaperRequest.findOneAndDelete({ _id: req.params.id, submittedBy: req.user._id, status: "pending" });
  if (!request) throw notFound("No pending request of yours with that id");
  await removeFile(request.file);
  res.json({ ok: true });
});

// The submitter or any admin can preview the PDF.
router.get("/:id/file", requireAuth, async (req, res) => {
  const request = await findRequest(req.params.id);
  if (!isAdmin(req.user) && !isOwner(request, req.user)) throw notFound("Request not found");
  if (!request.file) throw notFound("This request's file was removed when it was rejected");
  await sendPdf(res, request);
});

// ---------- Admins ----------

router.get("/", requireAdmin, async (req, res) => {
  const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : "pending";
  const limit = 20;
  const page = Math.max(toInt(req.query.page, 1), 1);

  const [items, total, countRows] = await Promise.all([
    PaperRequest.find({ status })
      .sort({ createdAt: status === "pending" ? 1 : -1 }) // oldest pending first: first come, first served
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("submittedBy", "fullName email")
      .populate("reviewedBy", "fullName"),
    PaperRequest.countDocuments({ status }),
    PaperRequest.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const counts = { pending: 0, approved: 0, rejected: 0, ...Object.fromEntries(countRows.map((c) => [c._id, c.n])) };

  res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1), counts });
});

// Accept: publishes the paper, using any details the admin corrected in the body.
router.post("/:id/approve", requireAdmin, async (req, res) => {
  const request = await findRequest(req.params.id);
  if (request.status !== "pending") throw alreadyReviewed(request);

  const base = Object.fromEntries(PAPER_FIELDS.map((k) => [k, request[k]]));
  const details = parsePaperInput({ ...base, ...req.body });
  await assertNotPublished(request.file.sha256);

  // Claim it atomically so two admins can't both publish it.
  const claimed = await PaperRequest.findOneAndUpdate(
    { _id: request._id, status: "pending" },
    { status: "approved", reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  );
  if (!claimed) throw alreadyReviewed(await findRequest(req.params.id));

  let paper;
  try {
    // The paper takes over the request's stored file; the submitter is credited as uploader.
    paper = await Paper.create({ notes: "", ...details, file: request.file, uploadedBy: request.submittedBy });
  } catch (err) {
    await PaperRequest.updateOne({ _id: request._id }, { status: "pending", $unset: { reviewedBy: 1, reviewedAt: 1 } });
    throw err;
  }
  claimed.set({ ...details, paper: paper._id });
  await claimed.save();

  res.json({ request: claimed, paper });
});

// Reject: deletes the stored file; the request stays so the student can see the outcome.
router.post("/:id/reject", requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound("Request not found");
  const reason = String(req.body.reason || "").trim().slice(0, 300);

  const claimed = await PaperRequest.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    { status: "rejected", reviewedBy: req.user._id, reviewedAt: new Date(), rejectionReason: reason },
    { new: false } // the pre-update doc still carries the file to delete
  );
  if (!claimed) throw alreadyReviewed(await findRequest(req.params.id));

  await removeFile(claimed.file);
  const request = await PaperRequest.findByIdAndUpdate(claimed._id, { $unset: { file: 1 } }, { new: true });
  res.json({ request });
});

export default router;
