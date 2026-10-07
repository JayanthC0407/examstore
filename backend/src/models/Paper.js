import mongoose from "mongoose";
import { DEPARTMENT_CODES, EXAM_TYPE_CODES } from "../config/catalog.js";

const fileSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ["local", "cloudinary"], required: true },
    key: { type: String, required: true },
    originalName: String,
    size: Number,
    sha256: { type: String, index: true },
  },
  { _id: false }
);

const paperSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true, trim: true, maxlength: 120 },
    subjectCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    department: { type: String, required: true, enum: DEPARTMENT_CODES },
    semester: { type: Number, required: true, min: 1, max: 10 },
    year: { type: Number, required: true, min: 1990, max: 2100 },
    examType: { type: String, required: true, enum: EXAM_TYPE_CODES },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    file: { type: fileSchema, required: true },
    downloads: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

paperSchema.index({ department: 1, semester: 1, year: -1 });
paperSchema.index({ subjectCode: 1, year: -1 });
paperSchema.index({ downloads: -1 });

paperSchema.set("toJSON", {
  transform(_doc, ret) {
    // Never leak storage internals to clients; files are served via /file.
    ret.file = { originalName: ret.file?.originalName, size: ret.file?.size };
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Paper", paperSchema);
