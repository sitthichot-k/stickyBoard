import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import * as users from '../../user/service/user.service.js';
import { recordLog } from '../../log/service/log.service.js';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
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
    recordLog({
      action: 'auth.login',
      message: `${user.email} signed in`,
      userId: user.id,
      userEmail: user.email,
    });
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await users.getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}
