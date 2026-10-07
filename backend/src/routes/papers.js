import crypto from "node:crypto";
import { Router } from "express";
import mongoose from "mongoose";
import Paper from "../models/Paper.js";
import { DEPARTMENT_CODES, EXAM_TYPE_CODES } from "../config/catalog.js";
import { HttpError, badRequest, notFound, escapeRegex, toInt } from "../lib/http.js";
import { storage } from "../lib/storage.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { uploadPdf } from "../middleware/upload.js";

const router = Router();

const SORTS = {
  recent: { createdAt: -1 },
  popular: { downloads: -1, year: -1 },
  year: { year: -1, subjectName: 1 },
  subject: { subjectName: 1, year: -1 },
};

async function findPaper(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound("Paper not found");
  const paper = await Paper.findById(id);
  if (!paper) throw notFound("Paper not found");
  return paper;
}

// Validates admin-submitted metadata. With partial=true only provided fields are checked.
function parsePaperInput(body, { partial = false } = {}) {
  const out = {};
  const errors = {};
  const has = (k) => body[k] !== undefined && body[k] !== "";

  if (has("subjectName")) out.subjectName = String(body.subjectName).trim();
  else if (!partial) errors.subjectName = "Subject name is required";

  if (has("subjectCode")) out.subjectCode = String(body.subjectCode).trim().toUpperCase();
  else if (!partial) errors.subjectCode = "Subject code is required";

  if (has("department")) {
    if (DEPARTMENT_CODES.includes(body.department)) out.department = body.department;
    else errors.department = "Unknown department";
  } else if (!partial) errors.department = "Department is required";

  if (has("semester")) {
    const s = toInt(body.semester);
    if (s >= 1 && s <= 10) out.semester = s;
    else errors.semester = "Semester must be between 1 and 10";
  } else if (!partial) errors.semester = "Semester is required";

  if (has("year")) {
    const y = toInt(body.year);
    if (y >= 1990 && y <= new Date().getFullYear() + 1) out.year = y;
    else errors.year = "Enter a valid year";
  } else if (!partial) errors.year = "Year is required";

  if (has("examType")) {
    if (EXAM_TYPE_CODES.includes(body.examType)) out.examType = body.examType;
    else errors.examType = "Unknown exam type";
  } else if (!partial) errors.examType = "Exam type is required";

  if (body.notes !== undefined) out.notes = String(body.notes).trim().slice(0, 500);

  if (Object.keys(errors).length) throw badRequest("Please fix the highlighted fields", errors);
  return out;
}

async function storeUploadedFile(file) {
  if (!file) throw badRequest("Please attach a PDF file", { file: "PDF file is required" });
  if (file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw badRequest("That file isn't a valid PDF", { file: "Not a valid PDF" });
  }
  const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
  const existing = await Paper.findOne({ "file.sha256": sha256 }).select("_id subjectName year");
  if (existing) {
    throw new HttpError(409, `This exact file is already uploaded (${existing.subjectName}, ${existing.year})`, {
      duplicateOf: existing._id,
    });
  }
  const saved = await storage.save(file.buffer);
  return { ...saved, originalName: file.originalname, size: file.size, sha256 };
}

function downloadName(paper) {
  const base = `${paper.subjectCode} ${paper.subjectName} ${paper.examType} ${paper.year}`;
  return base.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") + ".pdf";
}

// ---------- Public ----------

router.get("/", async (req, res) => {
  const { q, department, examType, sort } = req.query;
  const filter = {};

  if (department && DEPARTMENT_CODES.includes(department)) filter.department = department;
  if (examType && EXAM_TYPE_CODES.includes(examType)) filter.examType = examType;
  const semester = toInt(req.query.semester);
  if (semester) filter.semester = semester;
  const year = toInt(req.query.year);
  if (year) filter.year = year;

  if (typeof q === "string" && q.trim()) {
    // Every word must match the subject name or code, so "dbms 2023" style queries narrow results.
    const words = q.trim().split(/\s+/).slice(0, 6);
    filter.$and = words.map((w) => {
      const rx = new RegExp(escapeRegex(w), "i");
      const or = [{ subjectName: rx }, { subjectCode: rx }, { department: rx }];
      if (/^\d{4}$/.test(w)) or.push({ year: Number(w) });
      return { $or: or };
    });
  }

  const limit = Math.min(Math.max(toInt(req.query.limit, 24), 1), 60);
  const page = Math.max(toInt(req.query.page, 1), 1);

  const [items, total] = await Promise.all([
    Paper.find(filter)
      .sort(SORTS[sort] || SORTS.recent)
      .skip((page - 1) * limit)
      .limit(limit),
    Paper.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

router.get("/:id", async (req, res) => {
  const paper = await findPaper(req.params.id);
  // Other papers of the same subject, e.g. earlier years.
  const related = await Paper.find({ subjectCode: paper.subjectCode, _id: { $ne: paper._id } })
    .sort({ year: -1 })
    .limit(8);
  res.json({ paper, related });
});

// Signed-in students can view (inline) or download (attachment) the PDF.
router.get("/:id/file", requireAuth, async (req, res) => {
  const paper = await findPaper(req.params.id);
  const asDownload = req.query.download === "1";

  let stream;
  try {
    stream = await storage.open(paper.file);
  } catch (err) {
    console.error("[papers] file missing for", paper._id, err.message);
    throw notFound("The file for this paper is missing. Please let an admin know.");
  }

  if (asDownload) await Paper.updateOne({ _id: paper._id }, { $inc: { downloads: 1 } });

  // The page CSP would stop the browser's built-in PDF viewer from rendering.
  res.removeHeader("Content-Security-Policy");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${asDownload ? "attachment" : "inline"}; filename="${downloadName(paper)}"`
  );
  if (paper.file.size) res.setHeader("Content-Length", paper.file.size);
  res.setHeader("Cache-Control", "private, max-age=3600");
  stream.on("error", (err) => {
    console.error("[papers] stream error", err.message);
    res.destroy(err);
  });
  stream.pipe(res);
});

// ---------- Admin ----------

router.post("/", requireAdmin, uploadPdf, async (req, res) => {
  const data = parsePaperInput(req.body);
  const file = await storeUploadedFile(req.file);
  const paper = await Paper.create({ ...data, file, uploadedBy: req.user._id });
  res.status(201).json({ paper });
});

router.patch("/:id", requireAdmin, uploadPdf, async (req, res) => {
  const paper = await findPaper(req.params.id);
  Object.assign(paper, parsePaperInput(req.body, { partial: true }));

  let oldFile;
  if (req.file) {
    oldFile = paper.file;
    paper.file = await storeUploadedFile(req.file);
  }
  await paper.save();
  if (oldFile) await storage.remove(oldFile).catch((e) => console.error("[papers] cleanup failed", e.message));

  res.json({ paper });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const paper = await findPaper(req.params.id);
  await paper.deleteOne();
  await storage.remove(paper.file).catch((e) => console.error("[papers] cleanup failed", e.message));
  res.json({ ok: true });
});

export default router;
