import mongoose from "mongoose";

// Site-wide switches that admins change from the console. One document, _id "site".
const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "site" },
    emailVerification: { type: Boolean, default: true }, // require an emailed code at sign-up
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
