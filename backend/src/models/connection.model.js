import mongoose from 'mongoose';

// An arrow from one note to another.
const connectionSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
    // Which edge of each note the arrow attaches to.
    fromSide: { type: String, enum: ['top', 'bottom', 'left', 'right'], default: 'right' },
    toSide: { type: String, enum: ['top', 'bottom', 'left', 'right'], default: 'left' },
    // Soft-delete marker — null means active. Hidden from API responses.
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.deletedAt;
        return ret;
      },
    },
  },
);

export const Connection = mongoose.model('Connection', connectionSchema);
