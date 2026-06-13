import * as service from '../service/connection.service.js';

export async function list(req, res, next) {
  try {
    res.json(await service.listConnections(req.query.sheetId));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { sheetId, from, to, fromSide, toSide } = req.body ?? {};
    if (!sheetId) return res.status(400).json({ error: 'sheetId is required' });
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
    // Self-loops (from === to) are allowed.
    const connection = await service.createConnection({ sheetId, from, to, fromSide, toSide });
    res.status(201).json(connection);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const connection = await service.deleteConnection(req.params.id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function restore(req, res, next) {
  try {
    const connection = await service.restoreConnection(req.params.id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });
    res.json(connection);
  } catch (err) {
    next(err);
  }
}
