import { Router } from 'express';
import * as controller from './controller/security.controller.js';

// Mounted behind requireAuth + requireAdmin in routes.js — the whole permission
// config surface is admin-only.
const router = Router();

router.get('/catalog', controller.catalog);

router.get('/roles', controller.listRoles);
router.post('/roles', controller.createRole);
router.patch('/roles/:key', controller.updateRole);
router.delete('/roles/:key', controller.removeRole);

router.get('/matrix', controller.getMatrix);
router.put('/matrix', controller.setMatrixRow);

export default router;
