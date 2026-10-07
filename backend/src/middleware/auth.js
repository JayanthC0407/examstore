import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http.js";

const COOKIE = "es_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setSession(res, user) {
  const token = jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: "7d" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    maxAge: MAX_AGE_MS,
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure: env.isProd });
}

// Runs on every request: populates req.user when a valid session exists.
export async function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next();
  try {
    const { sub } = jwt.verify(token, env.jwtSecret);
    req.user = await User.findById(sub);
  } catch {
    // Expired or tampered token: treat as signed out.
  }
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue");
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue");
  if (req.user.role !== "admin") throw new HttpError(403, "Admins only");
  next();
}
