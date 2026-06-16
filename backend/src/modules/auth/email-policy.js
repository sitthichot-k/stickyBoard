// Lightweight email sanity checks for self-registration: reject malformed
// addresses, RFC-2606 reserved domains (example.com, test, …), and common
// disposable/throwaway providers. Real ownership is still proven by the
// verification link — this just blocks obvious junk up front. Not exhaustive;
// a production deployment may swap in a maintained list or a verification API.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESERVED = new Set([
  'example.com', 'example.net', 'example.org', 'example.edu',
  'test', 'invalid', 'localhost', 'local',
]);

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'getnada.com', 'trashmail.com', 'dispostable.com',
  'maildrop.cc', 'mailnesia.com', 'throwawaymail.com', 'fakeinbox.com',
  'mintemail.com', 'mohmal.com', 'emailondeck.com', 'spam4.me',
  'tempinbox.com', 'tmpmail.org', 'mailcatch.com', 'discard.email',
]);

export function checkRegistrationEmail(email) {
  const e = String(email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Enter a valid email address' };
  const domain = e.split('@')[1];
  if (RESERVED.has(domain)) return { ok: false, error: 'Please use a real email address' };
  if (DISPOSABLE.has(domain)) return { ok: false, error: 'Disposable email addresses are not allowed' };
  return { ok: true };
}
