import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport = null;

function getTransport() {
  if (transport) return transport;
  if (env.mail.host) {
    transport = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
    });
  } else {
    // No SMTP configured → capture the message instead of sending (dev/template).
    transport = nodemailer.createTransport({ jsonTransport: true });
  }
  return transport;
}

export async function sendMail({ to, subject, html, text }) {
  try {
    await getTransport().sendMail({ from: env.mail.from, to, subject, html, text });
    if (!env.mail.host) {
      // Surface the link so dev/template users can complete the flow without SMTP.
      console.log(`[email] (no SMTP — not sent) to=${to} · ${subject}\n[email] ${text}`);
    }
  } catch (err) {
    console.error('[email] send failed:', err.message);
  }
}

export function sendVerifyEmail(to, link) {
  return sendMail({
    to,
    subject: 'Verify your email',
    text: `Verify your email: ${link}`,
    html: `<p>Welcome to Sticky Board 👋</p>
           <p><a href="${link}">Verify your email</a></p>
           <p>Or paste this link: ${link}</p>`,
  });
}

export function sendResetEmail(to, link) {
  return sendMail({
    to,
    subject: 'Reset your password',
    text: `Reset your password: ${link}`,
    html: `<p>We received a request to reset your password.</p>
           <p><a href="${link}">Reset password</a></p>
           <p>Or paste this link: ${link}</p>
           <p>If you didn't request this, ignore this email.</p>`,
  });
}
