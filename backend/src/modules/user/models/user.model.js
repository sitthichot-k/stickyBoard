import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '', trim: true },
    // References a Role.key. Validated against the roles collection on
    // create/update (custom roles are allowed) rather than a fixed enum.
    role: { type: String, default: 'user', lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.passwordHash; // never expose the hash
        delete ret.deletedAt;
        return ret;
      },
    },
  },
);

export const User = mongoose.model('User', userSchema);
