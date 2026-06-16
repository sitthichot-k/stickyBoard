import * as users from '../../user/service/user.service.js';
import { getStats } from '../service/stats.service.js';
import { getPerformance } from '../service/performance.service.js';
import { recordLog } from '../../log/service/log.service.js';
import { getRole } from '../../security/service/role.service.js';
import { notify } from '../../notification/service/notify.service.js';

// A role is valid if it exists (and isn't soft-deleted) in the roles collection.
const isValidRole = async (role) => Boolean(await getRole(role));

export async function stats(req, res, next) {
  try {
    res.json(await getStats());
  } catch (err) {
    next(err);
  }
}

export async function performance(req, res, next) {
  try {
    res.json(await getPerformance());
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    res.json(await users.listUsers());
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { email, password, name, role } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }
    if (role && !(await isValidRole(role))) {
      return res.status(400).json({ error: `Unknown role: ${role}` });
    }
    if (await users.findByEmail(email)) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    // Admin-created accounts are trusted → verified up front (no self-signup gate).
    const user = await users.createUser({ email, password, name, role: role || 'user', emailVerified: true });
    recordLog({
      action: 'user.create',
      message: `Created user ${user.email} (${user.role})`,
      userId: req.user.id,
      meta: { targetId: user.id },
    });
    notify('user.created', { vars: { email: user.email, role: user.role } }); // → admins (opt-in)
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req, res, next) {
  try {
    const { role } = req.body ?? {};
    if (!role || !(await isValidRole(role))) {
      return res.status(400).json({ error: `Unknown role: ${role}` });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }
    const user = await users.setRole(req.params.id, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    recordLog({
      action: 'user.role',
      message: `Set ${user.email} role to ${role}`,
      userId: req.user.id,
      meta: { targetId: user.id, role },
    });
    notify('user.roleChanged', { vars: { email: user.email, role } }); // → the user (opt-in)
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function removeUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const user = await users.deleteUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    recordLog({
      level: 'warn',
      action: 'user.delete',
      message: `Deleted user ${user.email}`,
      userId: req.user.id,
      meta: { targetId: user.id },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
