import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "admin"], default: "student", index: true },
    lastLoginAt: Date,
    emailVerifiedAt: Date, // set when the account was created through an emailed code
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.password = await bcrypt.hash(plain, 10);
};

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
