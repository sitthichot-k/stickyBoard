import * as service from '../services/stroke.service.js';

const TOOLS = ['pencil', 'pen', 'brush'];

export async function list(req, res, next) {
  try {
    res.json(await service.listStrokes(req.query.sheetId));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { sheetId, tool, color, width, points } = req.body ?? {};
    if (!sheetId) return res.status(400).json({ error: 'sheetId is required' });
    if (!Array.isArray(points) || points.length < 4) {
      return res.status(400).json({ error: 'points must contain at least 2 coordinates' });
    }
    if (tool && !TOOLS.includes(tool)) {
      return res.status(400).json({ error: `tool must be one of: ${TOOLS.join(', ')}` });
    }
    const stroke = await service.createStroke({ sheetId, tool, color, width, points });
    res.status(201).json(stroke);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const stroke = await service.deleteStroke(req.params.id);
    if (!stroke) return res.status(404).json({ error: 'Stroke not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function restore(req, res, next) {
  try {
    const stroke = await service.restoreStroke(req.params.id);
    if (!stroke) return res.status(404).json({ error: 'Stroke not found' });
    res.json(stroke);
  } catch (err) {
    next(err);
  }
}
