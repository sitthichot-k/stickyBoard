import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import sheetRoutes from './sheet.routes.js';
import noteRoutes from './note.routes.js';
import connectionRoutes from './connection.routes.js';
import strokeRoutes from './stroke.routes.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected — everything below requires a valid token.
router.use('/sheets', requireAuth, sheetRoutes);
router.use('/notes', requireAuth, noteRoutes);
router.use('/connections', requireAuth, connectionRoutes);
router.use('/strokes', requireAuth, strokeRoutes);

export default router;
