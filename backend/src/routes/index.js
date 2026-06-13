import { Router } from 'express';
import healthRoutes from './health.routes.js';
import sheetRoutes from './sheet.routes.js';
import noteRoutes from './note.routes.js';
import connectionRoutes from './connection.routes.js';
import strokeRoutes from './stroke.routes.js';

const router = Router();

// Mount feature routers here.
router.use('/health', healthRoutes);
router.use('/sheets', sheetRoutes);
router.use('/notes', noteRoutes);
router.use('/connections', connectionRoutes);
router.use('/strokes', strokeRoutes);

export default router;
