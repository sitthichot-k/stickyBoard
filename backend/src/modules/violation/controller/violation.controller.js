import fs from 'fs';
import mongoose from 'mongoose';
import * as service from '../service/violation.service.js';
import * as cameraService from '../../camera/service/camera.service.js';
import { snapshotFile } from '../service/storage.service.js';
import { recordLog } from '../../log/service/log.service.js';

// ---- AI-service endpoints (service-token auth) ----

// Cameras the AI service should process (enabled + aiEnabled), with their
// decrypted RTSP URL. Only ever reachable with a valid service token.
export async function sources(req, res, next) {
  try {
    res.json(await cameraService.getAiSources());
  } catch (err) {
    next(err);
  }
}

// Ingest a detected violation: raw image in the body, metadata in the query.
export async function ingest(req, res, next) {
  try {
    const { cameraId } = req.query;
    if (!cameraId || !mongoose.isValidObjectId(cameraId)) {
      return res.status(400).json({ error: 'valid cameraId is required' });
    }
    const cam = await cameraService.getCamera(cameraId);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ error: 'snapshot image body is required' });
    }

    const conf = req.query.confidence != null ? Number(req.query.confidence) : null;
    const bbox = req.query.bbox
      ? String(req.query.bbox).split(',').map(Number).filter((n) => !Number.isNaN(n))
      : undefined;

    const { violation, deduped } = await service.recordViolation({
      cameraId,
      type: 'no_helmet',
      confidence: conf == null || Number.isNaN(conf) ? null : conf,
      trackId: req.query.trackId ? String(req.query.trackId) : '',
      bbox: bbox && bbox.length === 4 ? bbox : undefined,
      detectedAt: req.query.detectedAt ? new Date(req.query.detectedAt) : new Date(),
      image: req.body,
    });

    if (!deduped) {
      recordLog({
        level: 'warn',
        action: 'violation.detected',
        message: `No-helmet violation on ${cam.name}`,
        meta: { cameraId, violationId: violation.id },
      });
    }
    res.status(deduped ? 200 : 201).json({ id: violation.id, deduped });
  } catch (err) {
    next(err);
  }
}

// ---- Admin endpoints (RBAC: admin-violations) ----

export async function list(req, res, next) {
  try {
    const { page, limit, search, status, cameraId } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (cameraId && mongoose.isValidObjectId(cameraId)) filters.cameraId = cameraId;
    res.json(await service.listViolations({ page, limit, search, filters }));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const v = await service.getViolation(req.params.id);
    if (!v) return res.status(404).json({ error: 'Violation not found' });
    res.json(v);
  } catch (err) {
    next(err);
  }
}

// Serve the snapshot image (path comes from the DB record — traversal-safe).
export async function snapshot(req, res, next) {
  try {
    const v = await service.getViolation(req.params.id);
    if (!v) return res.status(404).json({ error: 'Violation not found' });
    const fp = snapshotFile(v.snapshotPath);
    if (!fp || !fs.existsSync(fp)) return res.status(404).json({ error: 'Snapshot not found' });
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    fs.createReadStream(fp).pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function review(req, res, next) {
  try {
    const { status, note } = req.body ?? {};
    if (status && !['new', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    if (status === undefined && note === undefined) {
      return res.status(400).json({ error: 'nothing to update' });
    }
    const v = await service.reviewViolation(req.params.id, { status, note }, req.user.id);
    if (!v) return res.status(404).json({ error: 'Violation not found' });
    recordLog({
      action: 'violation.review',
      message: `Violation ${v.id} → ${v.status}`,
      userId: req.user.id,
      meta: { violationId: v.id },
    });
    res.json(v);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const v = await service.deleteViolation(req.params.id);
    if (!v) return res.status(404).json({ error: 'Violation not found' });
    recordLog({
      level: 'warn',
      action: 'violation.delete',
      message: `Deleted violation ${v.id}`,
      userId: req.user.id,
      meta: { violationId: v.id },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
