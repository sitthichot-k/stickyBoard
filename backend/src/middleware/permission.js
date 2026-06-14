import { can } from '../modules/security/service/permission.service.js';

// Gate a route by a page capability from the permission matrix. Must run after
// requireAuth. The admin role always passes (see permission.service `can`).
export function requirePermission(pageKey, capability) {
  return async (req, res, next) => {
    try {
      if (req.user?.role && (await can(req.user.role, pageKey, capability))) return next();
      return res.status(403).json({ error: 'You do not have permission for this action' });
    } catch (err) {
      next(err);
    }
  };
}
