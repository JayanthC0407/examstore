// Promote (or demote) an existing account.
//   npm run make-admin -- someone@student.nitw.ac.in
//   npm run make-admin -- someone@student.nitw.ac.in --revoke
import { connectDB, disconnectDB } from "../lib/db.js";
import User from "../models/User.js";

const email = process.argv[2]?.toLowerCase();
const role = process.argv.includes("--revoke") ? "student" : "admin";

if (!email) {
  console.error("Usage: npm run make-admin -- <email> [--revoke]");
  process.exit(1);
}

await connectDB();
const user = await User.findOneAndUpdate({ email }, { role }, { new: true });
if (user) console.log(`${user.email} is now ${user.role}.`);
else console.error(`No account found for ${email}. Ask them to sign up first.`);
await disconnectDB();
process.exit(user ? 0 : 1);
