import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { createBaseService } from '../../../helpers/base.service.js';

const base = createBaseService(User, { searchableFields: ['email', 'name'] });

export const listUsers = () => User.find({ deletedAt: null }).sort({ createdAt: -1 });
export const listAdminEmails = () => User.find({ role: 'admin', deletedAt: null }).distinct('email');
export const getUser = (id) => base.searchOne(id);
export const deleteUser = (id) => base.delete(id);

// Auth lookups need the passwordHash, which the base reads hide via toJSON only
// (the field is still selected). Find by email including the hash.
export const findByEmail = (email) =>
  User.findOne({ email: String(email).toLowerCase().trim(), deletedAt: null });

export async function createUser({ email, password, name, role, emailVerified = false }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({ email, passwordHash, name, role, emailVerified });
}

// Set a new password (used by reset + change-password).
export async function setPassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.findByIdAndUpdate(id, { passwordHash }, { new: true });
}

export const markEmailVerified = (id) =>
  User.findByIdAndUpdate(id, { emailVerified: true }, { new: true });

// Self-service profile update (whitelisted fields only).
export const updateProfile = (id, { name }) =>
  User.findByIdAndUpdate(id, { name: String(name ?? '').trim() }, { new: true });

export async function setRole(id, role) {
  return User.findOneAndUpdate({ _id: id, deletedAt: null }, { role }, { new: true });
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export const countUsers = () => User.countDocuments({ deletedAt: null });
