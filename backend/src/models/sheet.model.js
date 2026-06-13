import mongoose from 'mongoose';

// A board/canvas that owns its own notes and arrows.
const sheetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Canvas background style.
    background: { type: String, enum: ['dots', 'grid', 'blank'], default: 'dots' },
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

export const Sheet = mongoose.model('Sheet', sheetSchema);
