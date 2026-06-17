import { Router } from 'express';
import express from 'express';
import * as controller from './controller/violation.controller.js';
import { requireServiceToken } from './middleware/serviceToken.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';

// Mounted at /violations. Two surfaces:
//  - AI inference service (service-token auth) — RTSP sources + violation ingest.
//  - Admin (RBAC `admin-violations`) — review/list/snapshot/delete.
const router = Router();

// AI service — static paths first so they win over `/:id`.
router.get('/sources', requireServiceToken, controller.sources);
router.post(
  '/ingest',
  requireServiceToken,
  // Raw image body (metadata travels in the query string). The global JSON
  // parser ignores image/* content types, so the stream reaches us intact.
  express.raw({ type: ['image/jpeg', 'image/png', 'application/octet-stream'], limit: '15mb' }),
  controller.ingest,
);

// Admin
router.get('/', requireAuth, requirePermission('admin-violations', 'view'), controller.list);
router.get('/:id', requireAuth, requirePermission('admin-violations', 'view'), controller.getOne);
router.get('/:id/snapshot', requireAuth, requirePermission('admin-violations', 'view'), controller.snapshot);
router.patch('/:id', requireAuth, requirePermission('admin-violations', 'edit'), controller.review);
router.delete('/:id', requireAuth, requirePermission('admin-violations', 'delete'), controller.remove);

export default router;
