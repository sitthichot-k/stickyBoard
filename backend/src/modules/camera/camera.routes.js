import { Router } from 'express';
import * as controller from './controller/camera.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';

// Mounted at /cameras. Gated by the admin-cameras page in the permission matrix.
const router = Router();

router.get('/', requireAuth, requirePermission('admin-cameras', 'view'), controller.list);
router.get('/:id/hls/:file?', requireAuth, requirePermission('admin-cameras', 'view'), controller.hls);
router.post('/', requireAuth, requirePermission('admin-cameras', 'edit'), controller.create);
router.patch('/:id', requireAuth, requirePermission('admin-cameras', 'edit'), controller.update);
router.delete('/:id', requireAuth, requirePermission('admin-cameras', 'delete'), controller.remove);

export default router;
