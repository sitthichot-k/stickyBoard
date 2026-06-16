import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import * as users from '../../user/service/user.service.js';
import { recordLog } from '../../log/service/log.service.js';
import { permissionsForRole } from '../../security/service/permission.service.js';
import { getRuntime } from '../../setting/service/runtime.service.js';
import { issueToken, consumeToken, clearTokens } from '../service/token.service.js';
import { notify } from '../../notification/service/notify.service.js';
import { checkRegistrationEmail } from '../email-policy.js';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

const verifyLink = (token) => `${env.appUrl}/verify-email?token=${token}`;

// Fire off a verification email for a freshly created / unverified user.
async function dispatchVerification(user) {
  const raw = await issueToken(user.id, 'verify');
  await notify('auth.verify', {
    vars: { name: user.name || user.email, email: user.email, link: verifyLink(raw) },
  });
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = await users.findByEmail(email);
    if (!user || !(await users.verifyPassword(password, user.passwordHash))) {
      recordLog({ level: 'warn', action: 'auth.login.failed', message: `Failed login for ${email}` });
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Block unverified users when verification is required, or whenever public
    // registration is open (so self-signups must prove a real email — admins and
    // admin-created users are verified up front, so they're never affected).
    const mustVerify = getRuntime().requireEmailVerified || getRuntime().allowRegistration;
    if (mustVerify && !user.emailVerified && user.role !== 'admin') {
      return res.status(403).json({ error: 'Please verify your email before signing in', code: 'EMAIL_NOT_VERIFIED' });
    }
    recordLog({
      action: 'auth.login',
      message: `${user.email} signed in`,
      userId: user.id,
      userEmail: user.email,
    });
    const permissions = await permissionsForRole(user.role);
    res.json({ token: signToken(user), user: { ...user.toJSON(), permissions } });
  } catch (err) {
    next(err);
  }
}

// Public (no auth) — flags the login/register pages need before sign-in.
export function publicConfig(req, res) {
  res.json({ allowRegistration: getRuntime().allowRegistration });
}

export async function me(req, res, next) {
  try {
    const user = await users.getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Include the role's resolved permissions so the SPA can drive its route
    // guards and sidebar without hardcoding roles.
    const permissions = await permissionsForRole(user.role);
    res.json({ ...user.toJSON(), permissions });
  } catch (err) {
    next(err);
  }
}

// Public self-registration — only when the admin has enabled it.
export async function register(req, res, next) {
  try {
    if (!getRuntime().allowRegistration) {
      return res.status(403).json({ error: 'Registration is disabled' });
    }
    const { email, password, name } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
    const policy = checkRegistrationEmail(email);
    if (!policy.ok) return res.status(400).json({ error: policy.error });
    if (await users.findByEmail(email)) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    const user = await users.createUser({ email, password, name, role: 'user', emailVerified: false });
    await dispatchVerification(user);
    notify('auth.welcome', { vars: { name: user.name || user.email, email: user.email } }); // opt-in
    recordLog({ action: 'auth.register', message: `${user.email} registered`, userId: user.id, userEmail: user.email });
    res.status(201).json({ ok: true, message: 'Account created. Check your email to verify it.' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const userId = await consumeToken(req.body?.token, 'verify');
    if (!userId) return res.status(400).json({ error: 'Invalid or expired verification link' });
    const user = await users.markEmailVerified(userId);
    recordLog({ action: 'auth.verify', message: `${user?.email} verified email`, userId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const user = await users.findByEmail(req.body?.email ?? '');
    // Always 200 — don't reveal whether the email exists.
    if (user && !user.emailVerified) await dispatchVerification(user);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const user = await users.findByEmail(req.body?.email ?? '');
    // Always 200 — don't reveal whether the email exists.
    if (user) {
      const raw = await issueToken(user.id, 'reset');
      await notify('auth.reset', {
        vars: {
          name: user.name || user.email,
          email: user.email,
          link: `${env.appUrl}/reset-password?token=${raw}`,
        },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body ?? {};
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }
    const userId = await consumeToken(token, 'reset');
    if (!userId) return res.status(400).json({ error: 'Invalid or expired reset link' });
    await users.setPassword(userId, password);
    await clearTokens(userId, 'reset'); // drop any other outstanding reset tokens
    recordLog({ level: 'warn', action: 'auth.password.reset', message: 'Password reset', userId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ---- Authenticated account management ----

export async function updateProfile(req, res, next) {
  try {
    if (req.body?.name === undefined) return res.status(400).json({ error: 'nothing to update' });
    const user = await users.updateProfile(req.user.id, { name: req.body.name });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const permissions = await permissionsForRole(user.role);
    res.json({ ...user.toJSON(), permissions });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'new password must be at least 6 characters' });
    }
    const user = await users.getUser(req.user.id); // doc still carries passwordHash
    if (!user || !(await users.verifyPassword(currentPassword ?? '', user.passwordHash))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    await users.setPassword(req.user.id, newPassword);
    notify('auth.passwordChanged', { vars: { name: user.name || user.email, email: user.email } }); // opt-in
    recordLog({ action: 'auth.password.change', message: 'Password changed', userId: req.user.id, userEmail: req.user.email });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
