import * as users from '../services/user.service.js';

const ROLES = ['user', 'admin'];

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
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    }
    if (await users.findByEmail(email)) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    const user = await users.createUser({ email, password, name, role: role || 'user' });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req, res, next) {
  try {
    const { role } = req.body ?? {};
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }
    const user = await users.setRole(req.params.id, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
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
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
