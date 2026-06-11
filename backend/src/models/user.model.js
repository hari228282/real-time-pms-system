import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true, // creates the unique index used for login + dedupe
      lowercase: true,
      trim: true,
    },
    // `select: false` keeps the hash out of every query result by default, so it can never
    // be accidentally serialized into an API response.
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

/**
 * Instance helper to set the password — hashing lives on the model so services never deal
 * with bcrypt details. We hash here rather than in a pre-save hook because the hook can't
 * see the plaintext (we store only the hash field).
 */
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Strip sensitive/internal fields from any JSON serialization.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
