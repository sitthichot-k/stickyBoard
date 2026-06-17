import mongoose from 'mongoose';

// An RTSP camera. The full stream URL (which contains credentials) is stored
// ENCRYPTED and never returned by the API; only a credential-free `host` is
// exposed for display.
const cameraSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, default: '', trim: true, maxlength: 120 },
    host: { type: String, default: '' }, // display only — host:port, no credentials
    urlEnc: { type: String, required: true }, // rtsp URL, encrypted at rest
    enabled: { type: Boolean, default: true },
    aiEnabled: { type: Boolean, default: false }, // run AI helmet detection on this camera

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.urlEnc; // never leak the credentialed URL
        delete ret.deletedAt;
        return ret;
      },
    },
  },
);

export const Camera = mongoose.model('Camera', cameraSchema);
