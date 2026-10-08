import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import PendingSignup from "../models/PendingSignup.js";
import PasswordReset from "../models/PasswordReset.js";
import { sendMail, verificationEmail, passwordResetEmail, passwordResetAvailable } from "../lib/mail.js";
import { isEmailVerificationOn } from "../lib/settings.js";
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

// ---------- Sign-up with email verification ----------
// 1. POST /signup checks the details and emails a 6-digit code (or, when email
//    verification is switched off in the admin console, creates the account straight away).
// 2. POST /signup/verify checks the code and creates the account.
// 3. POST /signup/resend sends a fresh code.

const CODE_MINUTES = 10;
const RESEND_AFTER_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 5;

const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
const hashCode = (email, code) => crypto.createHmac("sha256", env.jwtSecret).update(`${email}:${code}`).digest("hex");
const sameHash = (x, y) => x.length === y.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(y));
const verificationInfo = (pending) => ({
  email: pending.email,
  expiresInSeconds: Math.max(0, Math.round((pending.expiresAt - Date.now()) / 1000)),
  resendInSeconds: Math.max(0, RESEND_AFTER_SECONDS - Math.round((Date.now() - pending.lastSentAt) / 1000)),
});
const readEmail = (body) => String(body.email || "").trim().toLowerCase();

function sendCode(pending, code) {
  return sendMail({ to: pending.email, ...verificationEmail({ name: pending.fullName, code, minutes: CODE_MINUTES }) });
}

router.post("/signup", authLimiter, async (req, res) => {
  const fullName = String(req.body.fullName || "").trim();
  const email = readEmail(req.body);
  const { password } = req.body;

  if (!fullName) throw badRequest("Please enter your name");
  if (!EMAIL_RE.test(email)) throw badRequest("Please enter a valid email address");
  const domain = email.split("@")[1];
  if (!isAdminEmail(email) && !env.allowedDomains.includes(domain)) {
    throw badRequest(`Use your institute email (@${env.allowedDomains.join(", @")})`);
  }
  validatePassword(password);

  if (await User.exists({ email })) throw new HttpError(409, "An account with this email already exists");

  if (!(await isEmailVerificationOn())) {
    const user = new User({ fullName, email, role: isAdminEmail(email) ? "admin" : "student", lastLoginAt: new Date() });
    await user.setPassword(password);
    await user.save();
    setSession(res, user);
    return res.status(201).json({ user: user.toPublic() });
  }

  const existing = await PendingSignup.findOne({ email });
  if (existing) {
    const wait = verificationInfo(existing).resendInSeconds;
    if (wait > 0) throw new HttpError(429, `A code was just sent. Please wait ${wait} seconds before asking for another.`, { retryAfter: wait });
    if (existing.sends >= MAX_SENDS) throw new HttpError(429, "Too many codes requested for this email. Please try again in a few minutes.");
  }

  const code = newCode();
  const pending = await PendingSignup.findOneAndUpdate(
    { email },
    {
      fullName,
      passwordHash: await bcrypt.hash(password, 10),
      codeHash: hashCode(email, code),
      attempts: 0,
      sends: (existing?.sends || 0) + 1,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendCode(pending, code);
  } catch (err) {
    console.error("[mail] verification email failed:", err.message);
    if (!existing) await PendingSignup.deleteOne({ _id: pending._id });
    throw new HttpError(502, "We couldn't send the verification email. Please try again in a moment.");
  }

  res.status(202).json({ verification: verificationInfo(pending) });
});

router.post("/signup/verify", authLimiter, async (req, res) => {
  const email = readEmail(req.body);
  const code = String(req.body.code || "").replace(/\s+/g, "");
  const pending = await PendingSignup.findOne({ email });

  if (!pending || pending.expiresAt < new Date()) {
    throw new HttpError(410, "This code has expired. Please request a new one.");
  }
  if (!/^\d{6}$/.test(code)) throw badRequest("Enter the 6-digit code from the email", { code: "Enter the 6-digit code" });

  if (!sameHash(hashCode(email, code), pending.codeHash)) {
    pending.attempts += 1;
    const left = MAX_ATTEMPTS - pending.attempts;
    if (left <= 0) {
      await pending.deleteOne();
      throw new HttpError(429, "Too many wrong codes. Please sign up again to get a new code.");
    }
    await pending.save();
    throw badRequest(`That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`, { code: "Incorrect code" });
  }

  if (await User.exists({ email })) {
    await pending.deleteOne();
    throw new HttpError(409, "An account with this email already exists");
  }

  const user = await User.create({
    fullName: pending.fullName,
    email,
    password: pending.passwordHash, // already hashed when the code was sent
    role: isAdminEmail(email) ? "admin" : "student",
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
  });
  await pending.deleteOne();

  setSession(res, user);
  res.status(201).json({ user: user.toPublic() });
});

router.post("/signup/resend", authLimiter, async (req, res) => {
  const email = readEmail(req.body);
  const pending = await PendingSignup.findOne({ email });
  if (!pending || pending.expiresAt < new Date()) {
    throw new HttpError(410, "This sign-up has expired. Please fill in the form again.");
  }
  const wait = verificationInfo(pending).resendInSeconds;
  if (wait > 0) throw new HttpError(429, `Please wait ${wait} seconds before asking for another code.`, { retryAfter: wait });
  if (pending.sends >= MAX_SENDS) throw new HttpError(429, "Too many codes requested for this email. Please try again in a few minutes.");

  const code = newCode();
  pending.set({
    codeHash: hashCode(email, code),
    attempts: 0,
    sends: pending.sends + 1,
    lastSentAt: new Date(),
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
  });
  await pending.save();
  try {
    await sendCode(pending, code);
  } catch (err) {
    console.error("[mail] verification email failed:", err.message);
    throw new HttpError(502, "We couldn't send the verification email. Please try again in a moment.");
  }
  res.json({ verification: verificationInfo(pending) });
});

// ---------- Forgot password ----------
// 1. POST /password/forgot emails a 6-digit code. The reply is the same whether or
//    not the email has an account, so the form can't reveal who is registered.
// 2. POST /password/reset checks the code, sets the new password, signs this device
//    in and every other device out.

const resetHash = (email, code) => hashCode(`reset:${email}`, code);
const genericResetReply = (email) => ({
  reset: { email, expiresInSeconds: CODE_MINUTES * 60, resendInSeconds: RESEND_AFTER_SECONDS },
});

router.post("/password/forgot", authLimiter, async (req, res) => {
  if (!passwordResetAvailable()) {
    throw new HttpError(503, "Password reset by email isn't available right now. Please ask an admin for help.");
  }
  const email = readEmail(req.body);
  if (!EMAIL_RE.test(email)) throw badRequest("Please enter a valid email address");

  const user = await User.findOne({ email });
  if (!user) return res.status(202).json(genericResetReply(email));

  const existing = await PasswordReset.findOne({ email });
  if (existing) {
    const wait = verificationInfo(existing).resendInSeconds;
    if (wait > 0) throw new HttpError(429, `A code was just sent. Please wait ${wait} seconds before asking for another.`, { retryAfter: wait });
    if (existing.sends >= MAX_SENDS) throw new HttpError(429, "Too many codes requested for this email. Please try again in a few minutes.");
  }

  const code = newCode();
  const reset = await PasswordReset.findOneAndUpdate(
    { email },
    {
      codeHash: resetHash(email, code),
      attempts: 0,
      sends: (existing?.sends || 0) + 1,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  try {
    await sendMail({ to: email, ...passwordResetEmail({ name: user.fullName, code, minutes: CODE_MINUTES }) });
  } catch (err) {
    console.error("[mail] password reset email failed:", err.message);
    if (!existing) await PasswordReset.deleteOne({ _id: reset._id });
    throw new HttpError(502, "We couldn't send the email. Please try again in a moment.");
  }
  res.status(202).json(genericResetReply(email));
});

router.post("/password/reset", authLimiter, async (req, res) => {
  const email = readEmail(req.body);
  const code = String(req.body.code || "").replace(/\s+/g, "");
  const { newPassword } = req.body;

  if (!/^\d{6}$/.test(code)) throw badRequest("Enter the 6-digit code from the email", { code: "Enter the 6-digit code" });
  validatePassword(newPassword);

  const reset = await PasswordReset.findOne({ email });
  if (!reset || reset.expiresAt < new Date()) {
    throw new HttpError(410, "This code has expired or isn't valid. Please request a new one.");
  }
  if (!sameHash(resetHash(email, code), reset.codeHash)) {
    reset.attempts += 1;
    const left = MAX_ATTEMPTS - reset.attempts;
    if (left <= 0) {
      await reset.deleteOne();
      throw new HttpError(429, "Too many wrong codes. Please request a new code.");
    }
    await reset.save();
    throw badRequest(`That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`, { code: "Incorrect code" });
  }

  const user = await User.findOne({ email });
  await reset.deleteOne();
  if (!user) throw new HttpError(410, "This code has expired or isn't valid. Please request a new one.");

  await user.setPassword(newPassword); // also signs out every other device
  user.lastLoginAt = new Date();
  await user.save();
  setSession(res, user);
  res.json({ user: user.toPublic() });
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
  setSession(res, user); // fresh session here; other devices are signed out
  res.json({ ok: true });
});

export default router;
