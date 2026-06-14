import mongoose from 'mongoose';

// A role/group that users can be assigned to. Beyond the system roles
// (admin, user) admins can create custom roles and tune their permissions.
const roleSchema = new mongoose.Schema(
  {
    // URL/identifier slug — referenced by User.role and permission rows.
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', trim: true, maxlength: 200 },
    // System roles can't be renamed or deleted.
    isSystem: { type: Boolean, default: false },
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

export const Role = mongoose.model('Role', roleSchema);
