import { Router } from "express";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { HttpError, badRequest } from "../lib/http.js";
import { setSession, clearSession, requireAuth } from "../middleware/auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isAdminEmail = (email) => env.adminEmails.includes(email);

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw badRequest("Password must be at least 8 characters");
  }
}

router.post("/signup", authLimiter, async (req, res) => {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!fullName) throw badRequest("Please enter your name");
  if (!EMAIL_RE.test(email)) throw badRequest("Please enter a valid email address");
  const domain = email.split("@")[1];
  if (!isAdminEmail(email) && !env.allowedDomains.includes(domain)) {
    throw badRequest(`Use your institute email (@${env.allowedDomains.join(", @")})`);
  }
  validatePassword(password);

  if (await User.exists({ email })) throw new HttpError(409, "An account with this email already exists");

  const user = new User({ fullName, email, role: isAdminEmail(email) ? "admin" : "student" });
  await user.setPassword(password);
  user.lastLoginAt = new Date();
  await user.save();

  setSession(res, user);
  res.status(201).json({ user: user.toPublic() });
});

router.post("/login", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.checkPassword(String(req.body.password || "")))) {
    throw new HttpError(401, "Incorrect email or password");
  }

  if (isAdminEmail(email) && user.role !== "admin") user.role = "admin";
  user.lastLoginAt = new Date();
  await user.save();

  setSession(res, user);
  res.json({ user: user.toPublic() });
});

router.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  res.json({ user: req.user ? req.user.toPublic() : null });
});

router.patch("/me", requireAuth, async (req, res) => {
  const fullName = String(req.body.fullName || "").trim();
  if (!fullName) throw badRequest("Name cannot be empty");
  req.user.fullName = fullName;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

router.post("/me/password", requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.checkPassword(String(req.body.currentPassword || "")))) {
    throw badRequest("Current password is incorrect");
  }
  validatePassword(req.body.newPassword);
  await user.setPassword(req.body.newPassword);
  await user.save();
  res.json({ ok: true });
});

export default router;
