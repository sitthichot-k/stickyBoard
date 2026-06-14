import * as service from '../service/log.service.js';

export async function list(req, res, next) {
  try {
    const { level, action, search } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filters = {};
    if (level) filters.level = level;
    if (action) filters.action = action;
    res.json(await service.listLogs({ page, limit, search, sort: '-createdAt', filters }));
  } catch (err) {
    next(err);
  }
}
