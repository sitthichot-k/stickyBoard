import mongoose from 'mongoose';

// A detected traffic violation. Phase 1 covers helmet only (`no_helmet`); the
// snapshot image lives on disk (see storage.service) and only its filename is
// stored here. The snapshot is served via GET /violations/:id/snapshot, so the
// raw path is never exposed in JSON.
const violationSchema = new mongoose.Schema(
  {
    cameraId: { type: mongoose.Schema.Types.ObjectId, ref: 'Camera', required: true, index: true },
    type: { type: String, default: 'no_helmet', enum: ['no_helmet'] },
    snapshotPath: { type: String, required: true }, // filename under the snapshot dir
    thumbPath: { type: String, default: null }, // reserved for a future thumbnail
    confidence: { type: Number, default: null, min: 0, max: 1 },
    trackId: { type: String, default: '' }, // tracker id from the AI service (de-dup key)
    bbox: { type: [Number], default: undefined }, // [x, y, w, h] in frame px
    detectedAt: { type: Date, default: Date.now, index: true },
    status: { type: String, default: 'new', enum: ['new', 'reviewed', 'dismissed'], index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    note: { type: String, default: '', trim: true, maxlength: 500 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.snapshotPath; // internal — image is served via /:id/snapshot
        delete ret.thumbPath;
        delete ret.deletedAt;
        return ret;
      },
    },
  },
);

export const Violation = mongoose.model('Violation', violationSchema);
