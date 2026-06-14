import * as service from '../service/sheet.service.js';
import { deleteNotesForSheet } from '../../note/service/note.service.js';
import { deleteConnectionsForSheet } from '../../connection/service/connection.service.js';
import { deleteStrokesForSheet } from '../../stroke/service/stroke.service.js';
import { isOwnerScoped } from '../../security/service/permission.service.js';

const BACKGROUNDS = ['dots', 'grid', 'blank'];

export async function list(req, res, next) {
  try {
    // Owner-scoped roles only see their own boards; admins see all.
    const ownerId = (await isOwnerScoped(req.user.role)) ? req.user.id : undefined;
    res.json(await service.listSheets({ ownerId }));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const sheet = await service.getSheet(req.params.id);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    // Owner-scoped roles can't open someone else's board (404 to avoid leaking
    // that it exists). Board notes/arrows/strokes inherit this boundary — they
    // can only be reached with a sheetId from a board the user can open.
    if ((await isOwnerScoped(req.user.role)) && String(sheet.ownerId) !== req.user.id) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    res.json(sheet);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, background } = req.body ?? {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (background && !BACKGROUNDS.includes(background)) {
      return res.status(400).json({ error: `background must be one of: ${BACKGROUNDS.join(', ')}` });
    }
    const sheet = await service.createSheet({
      name: name.trim(),
      background,
      ownerId: req.user?.id ?? null,
    });
    res.status(201).json(sheet);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const sheet = await service.deleteSheet(req.params.id);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    // Cascade: soft-delete the sheet's notes, arrows, and drawings.
    await Promise.all([
      deleteNotesForSheet(sheet.id),
      deleteConnectionsForSheet(sheet.id),
      deleteStrokesForSheet(sheet.id),
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
