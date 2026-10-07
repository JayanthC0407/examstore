import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { env } from "../config/env.js";

let memoryServer;
const LOCAL_DEV_PORT = 27027;
const LOCAL_DEV_URI = `mongodb://127.0.0.1:${LOCAL_DEV_PORT}/examstore`;

export async function connectDB() {
  let uri = env.mongoUri;

  if (!uri) {
    if (env.isProd) throw new Error("MONGODB_URI must be set in production");
    // Reuse the dev database if the server already started it (e.g. when running scripts).
    try {
      await mongoose.connect(LOCAL_DEV_URI, { serverSelectionTimeoutMS: 1500 });
      console.log("[db] connected to running local database");
      return;
    } catch {
      await mongoose.disconnect().catch(() => {});
    }
    // Development fallback: a real mongod managed for us, persisted on disk.
    const { MongoMemoryServer } = await import("mongodb-memory-server").catch(() => {
      throw new Error(
        "MONGODB_URI is not set and mongodb-memory-server is not installed. Set MONGODB_URI in backend/.env."
      );
    });
    const dbPath = path.join(env.dataDir, "db");
    fs.mkdirSync(dbPath, { recursive: true });
    console.log("[db] No MONGODB_URI, starting local database (first run downloads MongoDB, ~1 min)...");
    memoryServer = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: "wiredTiger", port: LOCAL_DEV_PORT },
    });
    uri = memoryServer.getUri("examstore");
  }

  await mongoose.connect(uri);
  console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop({ doCleanup: false });
}
