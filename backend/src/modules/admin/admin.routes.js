import { Router } from 'express';
import * as controller from './controller/admin.controller.js';

const router = Router();

// Mounted behind requireAuth + requireAdmin (see routes/index.js).
router.get('/stats', controller.stats);
router.get('/users', controller.listUsers);
router.post('/users', controller.createUser);
router.patch('/users/:id/role', controller.updateRole);
router.delete('/users/:id', controller.removeUser);

export default router;
