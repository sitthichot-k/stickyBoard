import { Router } from 'express';
import * as controller from './controller/log.controller.js';

const router = Router();

// Mounted behind requireAuth + requireAdmin (see routes/routes.js).
router.get('/', controller.list);

export default router;
