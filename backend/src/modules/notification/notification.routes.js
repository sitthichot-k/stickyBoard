import { Router } from 'express';
import * as controller from './controller/notification.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';

const router = Router();
const view = [requireAuth, requirePermission('admin-notifications', 'view')];
const edit = [requireAuth, requirePermission('admin-notifications', 'edit')];
const del = [requireAuth, requirePermission('admin-notifications', 'delete')];

router.get('/templates', ...view, controller.list);
router.post('/templates', ...edit, controller.create);
router.patch('/templates/:key', ...edit, controller.update);
router.delete('/templates/:key', ...del, controller.remove);

router.get('/seed-defaults/preview', ...view, controller.previewDefaults);
router.post('/seed-defaults', ...edit, controller.seedDefaults);

router.get('/matrix', ...view, controller.matrix);
router.put('/matrix', ...edit, controller.setRule);

export default router;
