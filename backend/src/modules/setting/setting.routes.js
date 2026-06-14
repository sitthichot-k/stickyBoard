import { Router } from 'express';
import * as controller from './controller/setting.controller.js';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';

const router = Router();

// Any signed-in user can read public settings (banner, etc.).
router.get('/', requireAuth, controller.getPublic);
// Admin-only: full settings + updates.
router.get('/all', requireAuth, requireAdmin, controller.getAll);
router.put('/:key', requireAuth, requireAdmin, controller.update);

export default router;
