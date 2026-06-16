import { Router } from 'express';
import * as controller from './controller/admin.controller.js';
import { requirePermission } from '../../middleware/permission.js';

// Mounted behind requireAuth (see routes/routes.js); access is governed by the
// permission matrix (admin always passes).
const router = Router();

router.get('/stats', requirePermission('admin-dashboard', 'view'), controller.stats);
router.get('/performance', requirePermission('admin-dashboard', 'view'), controller.performance);
router.get('/users', requirePermission('admin-users', 'view'), controller.listUsers);
router.post('/users', requirePermission('admin-users', 'edit'), controller.createUser);
router.patch('/users/:id/role', requirePermission('admin-users', 'edit'), controller.updateRole);
router.delete('/users/:id', requirePermission('admin-users', 'delete'), controller.removeUser);

export default router;
