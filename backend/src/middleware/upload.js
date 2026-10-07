import multer from "multer";
import { env } from "../config/env.js";
import { badRequest } from "../lib/http.js";

// Files are buffered in memory so we can verify and hash them before storing.
export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter(_req, file, cb) {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(badRequest("Only PDF files are allowed"));
    }
  },
}).single("file");
