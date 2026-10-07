import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./lib/db.js";
import { createApp } from "./app.js";
import { storage } from "./lib/storage.js";

try {
  await connectDB();
} catch (err) {
  console.error("[db] could not connect:", err.message);
  process.exit(1);
}

try {
  await storage.verify();
  console.log(`[storage] using ${storage.driver === "cloudinary" ? `Cloudinary (${env.cloudinary.cloud_name})` : "local disk (backend/uploads)"}`);
} catch (err) {
  console.error("[storage]", err.message);
  process.exit(1);
}

const server = createApp().listen(env.port, () => {
  console.log(`[api] ExamStore running on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close();
  await disconnectDB().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
