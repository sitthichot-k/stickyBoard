import nodemailer from 'nodemailer';
import { Setting } from '../models/setting.model.js';
import { env } from '../../../config/env.js';
import { encrypt, decrypt } from '../../../helpers/crypto.js';

/**
 * SMTP config that admins can manage from the Config page. The password is
 * encrypted at rest, never returned by the API (write-only), and the transport
 * is rebuilt whenever the config changes. Env values are the bootstrap defaults.
 */
const KEY = 'mail';

function fromEnv() {
  return {
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    user: env.mail.user,
    pass: env.mail.pass, // plaintext in the in-memory cache only
    from: env.mail.from,
  };
}

// Merge a stored doc (pass encrypted) over the env defaults → in-memory cache.
function resolveDoc(value) {
  const d = fromEnv();
  const v = value || {};
  return {
    host: v.host ?? d.host,
    port: Number(v.port ?? d.port) || 587,
    secure: typeof v.secure === 'boolean' ? v.secure : d.secure,
    user: v.user ?? d.user,
    pass: v.pass != null ? decrypt(v.pass) : d.pass,
    from: v.from ?? d.from,
  };
}

let cache = fromEnv();
let transport = null;

export function invalidateTransport() {
  transport = null;
}

function buildTransport() {
  return nodemailer.createTransport(
    cache.host
      ? {
          host: cache.host,
          port: cache.port,
          secure: cache.secure,
          auth: cache.user ? { user: cache.user, pass: cache.pass } : undefined,
        }
      : { jsonTransport: true }, // no SMTP → capture instead of send
  );
}

export async function loadMailConfig() {
  try {
    const doc = await Setting.findOne({ key: KEY });
    cache = resolveDoc(doc?.value);
  } catch {
    cache = fromEnv();
  }
  invalidateTransport();
  return cache;
}

// Safe view for the API — never includes the password.
export function getMailConfigMasked() {
  const { pass, ...rest } = cache;
  return { ...rest, hasPassword: Boolean(pass) };
}

// Persist a partial update. The password only changes when a new non-empty one
// is supplied (so editing other fields never wipes it).
export async function setMailConfig(patch = {}) {
  const next = {
    host: patch.host ?? cache.host,
    port: Number(patch.port ?? cache.port) || 587,
    secure: typeof patch.secure === 'boolean' ? patch.secure : cache.secure,
    user: patch.user ?? cache.user,
    from: patch.from ?? cache.from,
    pass: typeof patch.pass === 'string' && patch.pass ? patch.pass : cache.pass,
  };
  // Store with the password encrypted; everything else is plaintext.
  await Setting.findOneAndUpdate(
    { key: KEY },
    { value: { ...next, pass: next.pass ? encrypt(next.pass) : '' } },
    { upsert: true },
  );
  cache = next;
  invalidateTransport();
  return getMailConfigMasked();
}

// App-flow send — failures are swallowed (audit logging must never break a request).
export async function sendMail({ to, subject, html, text }) {
  try {
    transport = transport || buildTransport();
    await transport.sendMail({ from: cache.from, to, subject, html, text });
    if (!cache.host) console.log(`[email] (no SMTP — not sent) to=${to} · ${subject}\n[email] ${text}`);
  } catch (err) {
    console.error('[email] send failed:', err.message);
  }
}

// Test send — throws on failure so the Config page can surface the error.
export async function sendTestMail(to) {
  const t = buildTransport();
  if (cache.host) await t.verify();
  await t.sendMail({
    from: cache.from,
    to,
    subject: 'Sticky Board — test email',
    text: 'Your SMTP configuration works. ✅',
    html: '<p>Your SMTP configuration works. ✅</p>',
  });
}
