import { Router } from 'express';
import healthRoutes from './health.routes.js';
import noteRoutes from './note.routes.js';
import connectionRoutes from './connection.routes.js';

const router = Router();

// Mount feature routers here.
router.use('/health', healthRoutes);
router.use('/notes', noteRoutes);
router.use('/connections', connectionRoutes);

export default router;
