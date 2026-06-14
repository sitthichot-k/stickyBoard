import { Router } from 'express';
import * as controller from './controller/sheet.controller.js';
import { requirePermission } from '../../middleware/permission.js';

// Boards + their notes/arrows/strokes are all governed by the `sheets` page.
const router = Router();

router.get('/', requirePermission('sheets', 'view'), controller.list);
router.post('/', requirePermission('sheets', 'edit'), controller.create);
router.get('/:id', requirePermission('sheets', 'view'), controller.getOne);
router.delete('/:id', requirePermission('sheets', 'delete'), controller.remove);

export default router;
