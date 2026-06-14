import mongoose from 'mongoose';

// A board/canvas that owns its own notes and arrows.
const sheetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Canvas background style.
    background: { type: String, enum: ['dots', 'grid', 'blank'], default: 'dots' },
    // The user who created the board. Drives "owner mode" (a role can be limited
    // to only its own boards). Null for data created before ownership existed.
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
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
