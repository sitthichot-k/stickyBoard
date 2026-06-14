import { Router } from 'express';
import * as controller from './controller/stroke.controller.js';
import { requirePermission } from '../../middleware/permission.js';

// Drawings live on a board, so they share the `sheets` page permission.
const router = Router();

router.get('/', requirePermission('sheets', 'view'), controller.list);
router.post('/', requirePermission('sheets', 'edit'), controller.create);
router.delete('/:id', requirePermission('sheets', 'delete'), controller.remove);
router.post('/:id/restore', requirePermission('sheets', 'action'), controller.restore);

export default router;
