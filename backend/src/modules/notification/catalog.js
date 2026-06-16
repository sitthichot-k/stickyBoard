/**
 * Catalog of notifiable events (code-defined). Each maps to a page + action so
 * the admin matrix can group them, and carries a built-in default template so a
 * critical flow never breaks even before the DB templates are seeded.
 *
 * - `recipient`: 'user' (the person in context, via vars.email/`to`) or 'admins'.
 * - `system`: always enabled and cannot be turned off (e.g. the verify/reset
 *   links) — the wording is still editable.
 * - `vars`: placeholders the template body/subject may use as `{{name}}` etc.
 */
export const EVENTS = [
  {
    key: 'auth.welcome',
    page: 'auth',
    label: 'Welcome (after registration)',
    recipient: 'user',
    system: false,
    vars: ['name', 'email'],
    default: {
      subject: 'Welcome to Sticky Board',
      body: 'Hi {{name}},\n\nYour account ({{email}}) is ready. 🎉',
    },
  },
  {
    key: 'auth.verify',
    page: 'auth',
    label: 'Email verification link',
    recipient: 'user',
    system: true,
    vars: ['name', 'email', 'link'],
    default: {
      subject: 'Verify your email',
      body: 'Hi {{name}},\n\nVerify your email: {{link}}',
    },
  },
  {
    key: 'auth.reset',
    page: 'auth',
    label: 'Password reset link',
    recipient: 'user',
    system: true,
    vars: ['name', 'email', 'link'],
    default: {
      subject: 'Reset your password',
      body: "We received a request to reset your password.\n\n{{link}}\n\nIf you didn't request this, ignore this email.",
    },
  },
  {
    key: 'auth.passwordChanged',
    page: 'auth',
    label: 'Password changed confirmation',
    recipient: 'user',
    system: false,
    vars: ['name', 'email'],
    default: {
      subject: 'Your password was changed',
      body: 'Hi {{name}},\n\nYour password was just changed. If this wasn’t you, contact an administrator.',
    },
  },
  {
    key: 'user.created',
    page: 'admin-users',
    label: 'User created (notify admins)',
    recipient: 'admins',
    system: false,
    vars: ['email', 'role'],
    default: {
      subject: 'New user created',
      body: 'A new user was created: {{email}} ({{role}}).',
    },
  },
  {
    key: 'user.roleChanged',
    page: 'admin-users',
    label: 'Role changed (notify the user)',
    recipient: 'user',
    system: false,
    vars: ['email', 'role'],
    default: {
      subject: 'Your role has changed',
      body: 'Your role is now {{role}}.',
    },
  },
];

export const EVENT_KEYS = EVENTS.map((e) => e.key);
export const getEvent = (key) => EVENTS.find((e) => e.key === key) || null;

// Replace {{placeholders}} with values from `vars` (missing → empty string).
export function render(text, vars = {}) {
  return String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? '').toString());
}
