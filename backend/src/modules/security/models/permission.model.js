import mongoose from 'mongoose';

// One row per (role × page). `granted` holds the subset of capability keys
// (view/edit/delete/action/owner/logs) that are turned on for that cell.
// Using a string array avoids reserved-word clashes (e.g. `delete`) and makes
// the capability set easy to extend.
const permissionSchema = new mongoose.Schema(
  {
    roleKey: { type: String, required: true, lowercase: true, trim: true, index: true },
    pageKey: { type: String, required: true, trim: true, index: true },
    granted: { type: [String], default: [] },
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

// One rule per role+page.
permissionSchema.index({ roleKey: 1, pageKey: 1 }, { unique: true });

export const Permission = mongoose.model('Permission', permissionSchema);
