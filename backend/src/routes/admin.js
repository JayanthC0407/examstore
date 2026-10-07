import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Paper from "../models/Paper.js";
import { requireAdmin } from "../middleware/auth.js";
import { badRequest, notFound, escapeRegex, toInt } from "../lib/http.js";

const router = Router();
router.use(requireAdmin);

router.get("/stats", async (_req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [papers, users, admins, newUsers, totals, top, recent] = await Promise.all([
    Paper.countDocuments(),
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ createdAt: { $gte: since } }),
    Paper.aggregate([{ $group: { _id: null, downloads: { $sum: "$downloads" } } }]),
    Paper.find().sort({ downloads: -1 }).limit(5),
    Paper.find().sort({ createdAt: -1 }).limit(6).populate("uploadedBy", "fullName"),
  ]);

  res.json({
    papers,
    users,
    admins,
    newUsers,
    downloads: totals[0]?.downloads || 0,
    top,
    recent,
  });
});

// Known subjects, so the upload form can autocomplete and stay consistent.
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

router.get("/users", async (req, res) => {
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), "i");
    filter.$or = [{ fullName: rx }, { email: rx }];
  }
  if (req.query.role === "admin" || req.query.role === "student") filter.role = req.query.role;

  const limit = 25;
  const page = Math.max(toInt(req.query.page, 1), 1);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ role: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    items: items.map((u) => ({ ...u.toPublic(), lastLoginAt: u.lastLoginAt })),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

router.patch("/users/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!["admin", "student"].includes(role)) throw badRequest("Role must be admin or student");
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound("User not found");
  if (String(req.user._id) === req.params.id) throw badRequest("You can't change your own role");

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw notFound("User not found");
  res.json({ user: user.toPublic() });
});

export default router;
