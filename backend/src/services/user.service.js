import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { createBaseService } from './base.service.js';

const base = createBaseService(User, { searchableFields: ['email', 'name'] });

export const listUsers = () => User.find({ deletedAt: null }).sort({ createdAt: -1 });
export const getUser = (id) => base.searchOne(id);
export const deleteUser = (id) => base.delete(id);

// Auth lookups need the passwordHash, which the base reads hide via toJSON only
// (the field is still selected). Find by email including the hash.
export const findByEmail = (email) =>
  User.findOne({ email: String(email).toLowerCase().trim(), deletedAt: null });

export async function createUser({ email, password, name, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({ email, passwordHash, name, role });
}

export async function setRole(id, role) {
  return User.findOneAndUpdate({ _id: id, deletedAt: null }, { role }, { new: true });
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export const countUsers = () => User.countDocuments({ deletedAt: null });
