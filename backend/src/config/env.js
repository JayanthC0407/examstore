import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(here, "../..");

dotenv.config({ path: path.join(BACKEND_ROOT, ".env"), quiet: true });

const list = (value) =>
  (value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

export const env = {
  isProd,
  // API_PORT wins so a PORT meant for another dev tool can't collide; hosts like Render set PORT.
  port: Number(process.env.API_PORT || process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret",
  allowedDomains: list(process.env.ALLOWED_EMAIL_DOMAINS || "student.nitw.ac.in"),
  adminEmails: list(process.env.ADMIN_EMAILS),
  storageDriver: (process.env.STORAGE_DRIVER || "local").toLowerCase(),
  // Cloudinary's free plan caps raw files at 10 MB.
  maxUploadBytes:
    (Number(process.env.MAX_UPLOAD_MB) || ((process.env.STORAGE_DRIVER || "").toLowerCase() === "cloudinary" ? 10 : 25)) *
    1024 *
    1024,
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
  dataDir: path.join(BACKEND_ROOT, ".data"),
  uploadsDir: path.join(BACKEND_ROOT, "uploads"),
  frontendDist: path.resolve(BACKEND_ROOT, "../frontend/dist"),
};
