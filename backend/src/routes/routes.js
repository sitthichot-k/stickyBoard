import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import sheetRoutes from '../modules/sheet/sheet.routes.js';
import noteRoutes from '../modules/note/note.routes.js';
import connectionRoutes from '../modules/connection/connection.routes.js';
import strokeRoutes from '../modules/stroke/stroke.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import settingRoutes from '../modules/setting/setting.routes.js';
import logRoutes from '../modules/log/log.routes.js';
import securityRoutes from '../modules/security/security.routes.js';
import notificationRoutes from '../modules/notification/notification.routes.js';
import cameraRoutes from '../modules/camera/camera.routes.js';
import violationRoutes from '../modules/violation/violation.routes.js';
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

// Permission-gated (per-route requirePermission inside each router; admin always
// passes). The permission config surface itself stays hard admin-only.
router.use('/admin', requireAuth, adminRoutes);
router.use('/logs', requireAuth, logRoutes);
router.use('/security', requireAuth, requireAdmin, securityRoutes);
router.use('/notifications', notificationRoutes); // per-route requirePermission inside
router.use('/cameras', cameraRoutes); // per-route requirePermission inside
router.use('/violations', violationRoutes); // service-token + per-route requirePermission inside

export default router;
