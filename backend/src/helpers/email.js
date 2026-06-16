import { sendMail } from '../modules/setting/service/mail.service.js';

// Email templates. Transport + SMTP config live in mail.service (admin-managed,
// encrypted at rest); this layer just renders + hands off to sendMail.

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
