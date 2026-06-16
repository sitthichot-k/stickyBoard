import crypto from 'crypto';
import { env } from '../config/env.js';

// Symmetric encryption for secrets at rest (e.g. the SMTP password). The key is
// derived from MAIL_SECRET (falls back to JWT_SECRET) so a DB dump alone can't
// reveal the plaintext — the key stays in the server's env.
const keyOf = () => crypto.createHash('sha256').update(env.mailSecret || env.jwt.secret).digest();

export function encrypt(plain) {
  if (plain == null || plain === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyOf(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decrypt(blob) {
  if (!blob) return '';
  try {
    const [ivB, tagB, dataB] = String(blob).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyOf(), Buffer.from(ivB, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return ''; // wrong key / corrupted → treat as no secret rather than crash
  }
}
