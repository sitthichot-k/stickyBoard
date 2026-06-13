import * as service from '../service/note.service.js';
import { deleteConnectionsForNote } from '../../connection/service/connection.service.js';

// Only allow these fields to be written from the client.
const WRITABLE = ['content', 'x', 'y', 'z', 'width', 'height', 'color'];

function pick(body) {
  return Object.fromEntries(
    Object.entries(body ?? {}).filter(([key]) => WRITABLE.includes(key)),
  );
}

export async function list(req, res, next) {
  try {
    res.json(await service.listNotes(req.query.sheetId));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const sheetId = req.body?.sheetId;
    if (!sheetId) return res.status(400).json({ error: 'sheetId is required' });
    const note = await service.createNote({ ...pick(req.body), sheetId });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const note = await service.updateNote(req.params.id, pick(req.body));
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const note = await service.deleteNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    await deleteConnectionsForNote(note.id); // drop arrows touching this note
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function restore(req, res, next) {
  try {
    const note = await service.restoreNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
}
