import mongoose from 'mongoose';

// A reusable notification (email) template. `body`/`subject` may contain
// {{placeholders}} filled in at send time.
const templateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    subject: { type: String, default: '', trim: true, maxlength: 200 },
    body: { type: String, default: '' },
    description: { type: String, default: '', trim: true, maxlength: 200 },
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

export const NotificationTemplate = mongoose.model('NotificationTemplate', templateSchema);
