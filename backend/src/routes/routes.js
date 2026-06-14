import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import sheetRoutes from '../modules/sheet/sheet.routes.js';
import noteRoutes from '../modules/note/note.routes.js';
import connectionRoutes from '../modules/connection/connection.routes.js';
import strokeRoutes from '../modules/stroke/stroke.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import settingRoutes from '../modules/setting/setting.routes.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected — everything below requires a valid token.
router.use('/sheets', requireAuth, sheetRoutes);
router.use('/notes', requireAuth, noteRoutes);
router.use('/connections', requireAuth, connectionRoutes);
router.use('/strokes', requireAuth, strokeRoutes);
router.use('/settings', settingRoutes); // mixed access — guards are per-route

// Admin-only.
router.use('/admin', requireAuth, requireAdmin, adminRoutes);

export default router;
