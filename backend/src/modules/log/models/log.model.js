import mongoose from 'mongoose';

// Append-only event/audit log.
const logSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info', index: true },
    action: { type: String, required: true, index: true }, // e.g. 'auth.login', 'user.create'
    message: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // actor
    userEmail: { type: String, default: '' }, // denormalised for display
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

export const Log = mongoose.model('Log', logSchema);
