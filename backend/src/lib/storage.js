import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { HttpError } from "./http.js";

// Two interchangeable drivers. Both expose:
//   save(buffer) -> { provider, key }
//   open(file)   -> Promise<Readable>
//   remove(file)

const newKey = () => `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`;

const local = {
  async save(buffer) {
    await fsp.mkdir(env.uploadsDir, { recursive: true });
    const key = newKey();
    await fsp.writeFile(path.join(env.uploadsDir, key), buffer);
    return { provider: "local", key };
  },
  async open(file) {
    const full = path.join(env.uploadsDir, path.basename(file.key));
    await fsp.access(full);
    return fs.createReadStream(full);
  },
  async remove(file) {
    await fsp.rm(path.join(env.uploadsDir, path.basename(file.key)), { force: true });
  },
};

// PDFs are stored as *private* raw files: they have no public URL. The backend
// fetches them through a short-lived signed download link after checking the
// user is signed in, so students never see a shareable Cloudinary link.
const CLOUD_OPTS = { resource_type: "raw", type: "private" };

const cloud = {
  save(buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { ...CLOUD_OPTS, public_id: `examstore/papers/${newKey()}`, overwrite: false },
        (err, result) => {
          if (!err) return resolve({ provider: "cloudinary", key: result.public_id });
          if (/file size too large/i.test(err.message)) {
            return reject(new HttpError(400, "File is too large for the storage plan (Cloudinary free plan allows 10 MB)"));
          }
          reject(err);
        }
      );
      stream.end(buffer);
    });
  },
  async open(file) {
    const url = cloudinary.utils.private_download_url(file.key, "", {
      ...CLOUD_OPTS,
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Cloudinary responded ${res.status}`);
    return Readable.fromWeb(res.body);
  },
  async remove(file) {
    await cloudinary.uploader.destroy(file.key, { ...CLOUD_OPTS, invalidate: true });
  },
};

const useCloud = env.storageDriver === "cloudinary";
if (useCloud) cloudinary.config({ ...env.cloudinary, secure: true });

const drivers = { local, cloudinary: cloud };

export const storage = {
  driver: useCloud ? "cloudinary" : "local",
  save: (buffer) => (useCloud ? cloud : local).save(buffer),
  // Each file remembers which driver stored it, so switching drivers later is safe.
  open: (file) => drivers[file.provider].open(file),
  remove: (file) => drivers[file.provider].remove(file),
  // Fails fast at startup if the Cloudinary credentials are missing or wrong.
  async verify() {
    if (!useCloud) return;
    const names = { cloud_name: "CLOUDINARY_CLOUD_NAME", api_key: "CLOUDINARY_API_KEY", api_secret: "CLOUDINARY_API_SECRET" };
    const missing = Object.keys(names).filter((k) => !env.cloudinary[k]).map((k) => names[k]);
    if (missing.length) throw new Error(`STORAGE_DRIVER=cloudinary but ${missing.join(", ")} not set in backend/.env`);
    try {
      await cloudinary.api.ping();
    } catch (err) {
      const e = err.error || err;
      const status = e.http_code;
      const hint =
        /cloud_name mismatch/i.test(e.message || "") ? "CLOUDINARY_CLOUD_NAME doesn't match this API key; copy the Cloud name shown next to the key"
          : status === 401 ? "API key or secret is wrong"
          : status === 404 ? "cloud name not found, check CLOUDINARY_CLOUD_NAME"
          : e.message || String(err);
      throw new Error(`Cannot reach Cloudinary (${hint})`);
    }
  },
};
