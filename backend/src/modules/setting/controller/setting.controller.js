import * as service from '../service/setting.service.js';
import * as runtime from '../service/runtime.service.js';
import { getBlocked, unblock } from '../../../middleware/rateLimit.js';
import { recordLog } from '../../log/service/log.service.js';

// Public (any signed-in user) — settings used for display, e.g. the banner.
export async function getPublic(req, res, next) {
  try {
    res.json(await service.getPublic());
  } catch (err) {
    next(err);
  }
}

// Admin — full settings for the editor.
export async function getAll(req, res, next) {
  try {
    res.json(await service.getAll());
  } catch (err) {
    next(err);
  }
}

// Admin — upsert one setting.
export async function update(req, res, next) {
  try {
    const { key } = req.params;
    if (!service.ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ error: `Unknown setting: ${key}` });
    }
    const value = await service.setSetting(key, req.body?.value);
    recordLog({
      action: 'settings.update',
      message: `Updated setting "${key}"`,
      userId: req.user.id,
      meta: { key },
    });
    res.json({ key, value });
  } catch (err) {
    next(err);
  }
}

// ---- Runtime controls (Config page) ----

export function getRuntime(req, res) {
  res.json(runtime.getRuntime());
}

export async function updateRuntime(req, res, next) {
  try {
    const b = req.body ?? {};
    const patch = {};
    if (b.rateLimitEnabled !== undefined) patch.rateLimitEnabled = Boolean(b.rateLimitEnabled);
    if (b.logApiTraffic !== undefined) patch.logApiTraffic = Boolean(b.logApiTraffic);
    if (b.logRetentionDays !== undefined) {
      const days = Number(b.logRetentionDays);
      if (!Number.isFinite(days) || days < 1 || days > 365) {
        return res.status(400).json({ error: 'logRetentionDays must be 1–365' });
      }
      patch.logRetentionDays = Math.floor(days);
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });

    const next = await runtime.setRuntime(patch);
    recordLog({
      level: 'warn',
      action: 'runtime.update',
      message: `Runtime config changed: ${Object.keys(patch).join(', ')}`,
      userId: req.user.id,
      userEmail: req.user.email,
      meta: { patch, result: next },
    });
    res.json(next);
  } catch (err) {
    next(err);
  }
}

export function blockedList(req, res) {
  res.json(getBlocked());
}

export function unblockIp(req, res) {
  const cleared = unblock(req.params.key);
  recordLog({
    action: 'ratelimit.unblock',
    message: `Manually unblocked ${req.params.key}`,
    userId: req.user.id,
    userEmail: req.user.email,
    meta: { key: req.params.key, cleared },
  });
  res.json({ key: req.params.key, cleared });
}
