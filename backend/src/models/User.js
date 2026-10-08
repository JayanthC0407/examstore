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
    passwordChangedAt: Date, // sessions issued before this are rejected (middleware/auth.js)
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.password = await bcrypt.hash(plain, 10);
  this.passwordChangedAt = new Date();
};

// A session token is stale if it was issued before the password last changed,
// so a password change or reset signs out every other device.
userSchema.methods.sessionIsCurrent = function (issuedAtSeconds) {
  if (!this.passwordChangedAt) return true;
  return issuedAtSeconds * 1000 >= this.passwordChangedAt.getTime() - 1000; // iat has 1 s resolution
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
