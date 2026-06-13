import { Note } from '../models/note.model.js';
import { createBaseService } from './base.service.js';

const base = createBaseService(Note);

// Every (non-deleted) note on a sheet, ordered by stack. If no sheetId is given,
// returns all notes (back-compat until the frontend always scopes by sheet).
export const listNotes = (sheetId) => {
  const filter = { deletedAt: null };
  if (sheetId) filter.sheetId = sheetId;
  return Note.find(filter).sort({ z: 1, createdAt: 1 });
};

// Cascade: soft-delete every note on a sheet (used when the sheet is removed).
export const deleteNotesForSheet = (sheetId) =>
  Note.updateMany({ deletedAt: null, sheetId }, { deletedAt: new Date() });

export const getNote = (id) => base.searchOne(id);
export const createNote = (payload) => base.create(payload);

// Partial update (used for drag/move, recolor, edit text, bring-to-front).
export const updateNote = (id, payload) => base.update(id, payload);
export const deleteNote = (id) => base.delete(id);

// Undo a delete: clear the soft-delete marker (keeps the same id).
export const restoreNote = (id) =>
  Note.findByIdAndUpdate(id, { deletedAt: null }, { new: true });
