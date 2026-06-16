import { Router } from 'express';
import * as controller from './controller/setting.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';

const router = Router();

// Any signed-in user can read public settings (banner, etc.).
router.get('/', requireAuth, controller.getPublic);
// Managing settings is governed by the matrix (admin always passes).
router.get('/all', requireAuth, requirePermission('admin-settings', 'view'), controller.getAll);

// Runtime controls (Config page) — defined before /:key so they take priority.
router.get('/runtime', requireAuth, requirePermission('admin-config', 'view'), controller.getRuntime);
router.put('/runtime', requireAuth, requirePermission('admin-config', 'edit'), controller.updateRuntime);
router.get('/runtime/blocked', requireAuth, requirePermission('admin-config', 'view'), controller.blockedList);
router.delete('/runtime/blocked/:key', requireAuth, requirePermission('admin-config', 'action'), controller.unblockIp);

// SMTP config (password never returned; write-only + encrypted at rest).
router.get('/mail', requireAuth, requirePermission('admin-config', 'view'), controller.getMail);
router.put('/mail', requireAuth, requirePermission('admin-config', 'edit'), controller.updateMail);
router.post('/mail/test', requireAuth, requirePermission('admin-config', 'action'), controller.testMail);

router.put('/:key', requireAuth, requirePermission('admin-settings', 'edit'), controller.update);

export default router;
