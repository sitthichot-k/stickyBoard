import { Router } from 'express';
import * as controller from './controller/log.controller.js';
import { requirePermission } from '../../middleware/permission.js';

// Mounted behind requireAuth (see routes/routes.js); access via the matrix.
const router = Router();

router.get('/', requirePermission('admin-logs', 'view'), controller.list);

export default router;
