import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import multer from "multer";
import { env } from "./config/env.js";
import { HttpError } from "./lib/http.js";
import { attachUser } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import paperRoutes from "./routes/papers.js";
import adminRoutes from "./routes/admin.js";
import metaRoutes from "./routes/meta.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "frame-src": ["'self'"],
        },
      },
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.body ??= {};
    next();
  });
  app.use(attachUser);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/meta", metaRoutes);
  app.use("/api/papers", paperRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "API route not found")));

  // In production the backend also serves the built frontend: one app, one port.
  if (fs.existsSync(env.frontendDist)) {
    app.use(express.static(env.frontendDist, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(env.frontendDist, "index.html")));
  } else if (!env.isProd) {
    // In development the site is served by Vite; send stray visits there.
    app.get(/^(?!\/api\/).*/, (req, res) => res.redirect(`http://localhost:5173${req.originalUrl}`));
  } else {
    app.get(/^(?!\/api\/).*/, (_req, res) =>
      res.status(503).type("text").send("Frontend not built. Run `npm run build` and restart.")
    );
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `File is too large (max ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB)`
          : err.message;
      return res.status(400).json({ message });
    }
    if (err?.name === "ValidationError") {
      return res.status(400).json({ message: "Please check the submitted details", details: err.errors });
    }
    const status = err instanceof HttpError ? err.status : err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      message: status >= 500 ? "Something went wrong on our side" : err.message,
      details: err.details,
    });
  });

  return app;
}
