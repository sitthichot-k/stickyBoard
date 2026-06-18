import mongoose from 'mongoose';

// One vehicle counted at a gate. Append-only analytics (no soft delete); old
// rows are purged on a retention interval. Posted by the AI detector when a new
// vehicle track is confirmed on a counter camera.
const vehicleCountSchema = new mongoose.Schema(
  {
    cameraId: { type: mongoose.Schema.Types.ObjectId, ref: 'Camera', required: true, index: true },
    gate: { type: String, enum: ['entrance', 'exit'], required: true },
    type: { type: String, enum: ['motorcycle', 'car', 'truck', 'bus'], required: true },
    trackId: { type: String, default: '' }, // tracker id (de-dup key)
    detectedAt: { type: Date, default: Date.now, index: true },
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

export const VehicleCount = mongoose.model('VehicleCount', vehicleCountSchema);
