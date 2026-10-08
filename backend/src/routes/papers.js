import { Router } from "express";
import mongoose from "mongoose";
import Paper from "../models/Paper.js";
import { DEPARTMENT_CODES, EXAM_TYPE_CODES } from "../config/catalog.js";
import { notFound, escapeRegex, toInt } from "../lib/http.js";
import { storage } from "../lib/storage.js";
import { parsePaperInput, inspectPdf, storePdf, sendPdf } from "../lib/papers.js";
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
  await sendPdf(res, paper, {
    asDownload,
    // Count only once the file is known to exist.
    onOpen: asDownload ? () => Paper.updateOne({ _id: paper._id }, { $inc: { downloads: 1 } }) : undefined,
  });
});

// ---------- Admin ----------

router.post("/", requireAdmin, uploadPdf, async (req, res) => {
  const data = parsePaperInput(req.body);
  const sha256 = await inspectPdf(req.file);
  const file = await storePdf(req.file, sha256);
  const paper = await Paper.create({ ...data, file, uploadedBy: req.user._id });
  res.status(201).json({ paper });
});

router.patch("/:id", requireAdmin, uploadPdf, async (req, res) => {
  const paper = await findPaper(req.params.id);
  Object.assign(paper, parsePaperInput(req.body, { partial: true }));

  let oldFile;
  if (req.file) {
    oldFile = paper.file;
    paper.file = await storePdf(req.file, await inspectPdf(req.file));
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
