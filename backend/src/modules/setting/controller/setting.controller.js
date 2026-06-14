import * as service from '../service/setting.service.js';
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
