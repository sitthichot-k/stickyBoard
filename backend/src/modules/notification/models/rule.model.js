import mongoose from 'mongoose';

// One row per catalog event: whether it's enabled and which template it uses.
const ruleSchema = new mongoose.Schema(
  {
    eventKey: { type: String, required: true, unique: true, trim: true, index: true },
    enabled: { type: Boolean, default: false },
    templateKey: { type: String, default: '', trim: true },
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

export const NotificationRule = mongoose.model('NotificationRule', ruleSchema);
