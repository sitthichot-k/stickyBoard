import { Router } from 'express';
import * as controller from './controller/setting.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';

const router = Router();

// Any signed-in user can read public settings (banner, etc.).
router.get('/', requireAuth, controller.getPublic);
// Managing settings is governed by the matrix (admin always passes).
router.get('/all', requireAuth, requirePermission('admin-settings', 'view'), controller.getAll);
router.put('/:key', requireAuth, requirePermission('admin-settings', 'edit'), controller.update);

export default router;
