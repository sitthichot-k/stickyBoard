import mongoose from 'mongoose';

// A freehand drawing stroke on a sheet.
const strokeSchema = new mongoose.Schema(
  {
    sheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sheet', required: true, index: true },
    // Drawing style.
    tool: { type: String, enum: ['pencil', 'pen', 'brush'], default: 'pen' },
    color: { type: String, default: '#1f2937' },
    width: { type: Number, default: 3, min: 1 },
    // Flat list of coordinates in frame space: [x0, y0, x1, y1, ...].
    points: { type: [Number], default: [] },
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

export const Stroke = mongoose.model('Stroke', strokeSchema);
