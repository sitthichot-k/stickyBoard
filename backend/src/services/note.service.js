import { Note } from '../models/note.model.js';
import { createBaseService } from './base.service.js';

const base = createBaseService(Note);

// The board shows every (non-deleted) note at once, so no pagination here — just ordered by stack.
export const listNotes = () => Note.find({ deletedAt: null }).sort({ z: 1, createdAt: 1 });

export const getNote = (id) => base.searchOne(id);
export const createNote = (payload) => base.create(payload);

// Partial update (used for drag/move, recolor, edit text, bring-to-front).
export const updateNote = (id, payload) => base.update(id, payload);
export const deleteNote = (id) => base.delete(id);

// Undo a delete: clear the soft-delete marker (keeps the same id).
export const restoreNote = (id) =>
  Note.findByIdAndUpdate(id, { deletedAt: null }, { new: true });
