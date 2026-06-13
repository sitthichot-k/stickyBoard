import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    content: { type: String, default: '', trim: true, maxlength: 2000 },
    // Position on the board (top-left corner, in pixels).
    x: { type: Number, default: 40 },
    y: { type: Number, default: 40 },
    // Stacking order — higher sits on top.
    z: { type: Number, default: 1 },
    // Note size (pixels).
    width: { type: Number, default: 220 },
    height: { type: Number, default: 220 },
    // Background color (hex).
    color: { type: String, default: '#fff9c4' },
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

export const Note = mongoose.model('Note', noteSchema);
