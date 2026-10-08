import { Router } from "express";
import Paper from "../models/Paper.js";
import { DEPARTMENTS, EXAM_TYPES, SEMESTERS } from "../config/catalog.js";
import { env } from "../config/env.js";

const router = Router();

// Everything the UI needs to render filters, forms and the landing page.
router.get("/", async (_req, res) => {
  const [years, subjects, totals, byDept] = await Promise.all([
    Paper.distinct("year"),
    Paper.distinct("subjectCode"),
    Paper.aggregate([{ $group: { _id: null, papers: { $sum: 1 }, downloads: { $sum: "$downloads" } } }]),
    Paper.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]),
  ]);

  const counts = Object.fromEntries(byDept.map((d) => [d._id, d.count]));

  res.json({
    departments: DEPARTMENTS.map((d) => ({ ...d, count: counts[d.code] || 0 })),
    examTypes: EXAM_TYPES,
    semesters: SEMESTERS,
    years: years.sort((a, b) => b - a),
    allowedDomains: env.allowedDomains,
    maxUploadMb: Math.round(env.maxUploadBytes / 1024 / 1024),
    stats: {
      papers: totals[0]?.papers || 0,
      downloads: totals[0]?.downloads || 0,
      subjects: subjects.length,
    },
  });
});

// Known subjects, so the upload and request forms can autocomplete and stay consistent.
router.get("/subjects", async (_req, res) => {
  const subjects = await Paper.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$subjectCode",
        subjectName: { $first: "$subjectName" },
        department: { $first: "$department" },
        semester: { $first: "$semester" },
        papers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  res.json({ items: subjects.map(({ _id, ...s }) => ({ subjectCode: _id, ...s })) });
});

export default router;
