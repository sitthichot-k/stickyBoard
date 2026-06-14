import { Role } from '../models/role.model.js';
import { SYSTEM_ROLES } from '../catalog.js';

export const listRoles = () => Role.find({ deletedAt: null }).sort({ isSystem: -1, createdAt: 1 });
export const getRole = (key) => Role.findOne({ key, deletedAt: null });

// Ensure the system roles (admin, user) always exist. Safe to call repeatedly.
export async function ensureSystemRoles() {
  for (const role of SYSTEM_ROLES) {
    await Role.updateOne(
      { key: role.key },
      { $set: { ...role, deletedAt: null } },
      { upsert: true },
    );
  }
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function createRole({ key, name, description = '' }) {
  const slug = (key && slugify(key)) || slugify(name);
  return Role.create({ key: slug, name: name.trim(), description, isSystem: false });
}

export const updateRole = (key, patch) =>
  Role.findOneAndUpdate({ key, deletedAt: null }, patch, { new: true });

export const softDeleteRole = (key) =>
  Role.findOneAndUpdate({ key, isSystem: false, deletedAt: null }, { deletedAt: new Date() }, { new: true });
