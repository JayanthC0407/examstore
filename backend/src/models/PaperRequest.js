import mongoose from "mongoose";
import { DEPARTMENT_CODES, EXAM_TYPE_CODES } from "../config/catalog.js";
import { fileSchema } from "./Paper.js";

// A paper submitted by a student, waiting for an admin to accept or reject it.
// Accepting creates a Paper that takes over this file; rejecting deletes the file.
const paperRequestSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true, trim: true, maxlength: 120 },
    subjectCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    department: { type: String, required: true, enum: DEPARTMENT_CODES },
    semester: { type: Number, required: true, min: 1, max: 10 },
    year: { type: Number, required: true, min: 1990, max: 2100 },
    examType: { type: String, required: true, enum: EXAM_TYPE_CODES },
    message: { type: String, trim: true, maxlength: 500, default: "" }, // note to admins, never published
    file: { type: fileSchema },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: { type: String, trim: true, maxlength: 300, default: "" },
    paper: { type: mongoose.Schema.Types.ObjectId, ref: "Paper" }, // set when approved
  },
  { timestamps: true }
);

paperRequestSchema.index({ status: 1, createdAt: -1 });
paperRequestSchema.index({ "file.sha256": 1, status: 1 });

paperRequestSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.file = ret.file ? { originalName: ret.file.originalName, size: ret.file.size } : null;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("PaperRequest", paperRequestSchema);
