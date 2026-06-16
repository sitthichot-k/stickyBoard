import crypto from 'crypto';
import { Token } from '../models/token.model.js';

const sha = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

// Token lifetimes.
const TTL_MS = { verify: 24 * 60 * 60 * 1000, reset: 60 * 60 * 1000 }; // 24h / 1h

// Issue a one-time token of `type` for a user; returns the raw token (e-mailed).
export async function issueToken(userId, type) {
  const raw = crypto.randomBytes(32).toString('hex');
  await Token.create({ userId, type, tokenHash: sha(raw), expiresAt: new Date(Date.now() + TTL_MS[type]) });
  return raw;
}

// Validate + consume a token (one-time use). Returns the userId or null.
export async function consumeToken(raw, type) {
  if (!raw) return null;
  const doc = await Token.findOne({ tokenHash: sha(raw), type, expiresAt: { $gt: new Date() } });
  if (!doc) return null;
  await Token.deleteOne({ _id: doc._id });
  return doc.userId;
}

// Drop all of a user's tokens of a type (e.g. after a successful reset).
export const clearTokens = (userId, type) => Token.deleteMany({ userId, type });
