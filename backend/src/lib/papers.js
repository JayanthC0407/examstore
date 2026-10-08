import crypto from "node:crypto";
import { DEPARTMENT_CODES, EXAM_TYPE_CODES } from "../config/catalog.js";
import { HttpError, badRequest, notFound, toInt } from "./http.js";
import { storage } from "./storage.js";
import Paper from "../models/Paper.js";

// Shared by admin uploads (routes/papers.js) and student requests (routes/requests.js).

// Validates paper details. With partial=true only provided fields are checked.
export function parsePaperInput(body, { partial = false } = {}) {
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

// Checks an uploaded PDF and returns its checksum. Throws 409 if a published
// paper already has exactly this file.
export async function inspectPdf(file) {
  if (!file) throw badRequest("Please attach a PDF file", { file: "PDF file is required" });
  if (file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw badRequest("That file isn't a valid PDF", { file: "Not a valid PDF" });
  }
  const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
  await assertNotPublished(sha256);
  return sha256;
}

export async function assertNotPublished(sha256) {
  const existing = await Paper.findOne({ "file.sha256": sha256 }).select("_id subjectName year");
  if (existing) {
    throw new HttpError(409, `This exact file is already in ExamStore (${existing.subjectName}, ${existing.year})`, {
      duplicateOf: existing._id,
    });
  }
}

export async function storePdf(file, sha256) {
  const saved = await storage.save(file.buffer);
  return { ...saved, originalName: file.originalname, size: file.size, sha256 };
}

function downloadName(doc) {
  const base = `${doc.subjectCode} ${doc.subjectName} ${doc.examType} ${doc.year}`;
  return base.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") + ".pdf";
}

// Streams a stored PDF (a paper's, or a request's under review) to the response.
export async function sendPdf(res, doc, { asDownload = false, onOpen } = {}) {
  let stream;
  try {
    stream = await storage.open(doc.file);
  } catch (err) {
    console.error("[pdf] file missing for", doc._id, err.message);
    throw notFound("The file for this paper is missing. Please let an admin know.");
  }
  if (onOpen) await onOpen();
  // The page CSP would stop the browser's built-in PDF viewer (used by "Open") from rendering.
  res.removeHeader("Content-Security-Policy");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${asDownload ? "attachment" : "inline"}; filename="${downloadName(doc)}"`);
  if (doc.file.size) res.setHeader("Content-Length", doc.file.size);
  res.setHeader("Cache-Control", "private, max-age=3600");
  stream.on("error", (err) => {
    console.error("[pdf] stream error", err.message);
    res.destroy(err);
  });
  stream.pipe(res);
}
