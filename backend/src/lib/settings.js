import Setting from "../models/Setting.js";
import { canSendCodes } from "./mail.js";

// Admin-controlled settings, cached in memory (one server instance) and
// refreshed on every change.
let cache;

export async function getSettings() {
  if (!cache) {
    cache = await Setting.findById("site").lean();
    if (!cache) cache = (await Setting.create({ _id: "site" })).toObject();
  }
  return cache;
}

export async function updateSettings(patch, userId) {
  cache = await Setting.findByIdAndUpdate(
    "site",
    { ...patch, updatedBy: userId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return cache;
}

// Sign-up asks for an emailed code when an admin has it switched on AND codes can be
// delivered (Brevo configured, or development where codes print to the console).
export async function isEmailVerificationOn() {
  return canSendCodes && (await getSettings()).emailVerification;
}
