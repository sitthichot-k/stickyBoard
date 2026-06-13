import { Stroke } from '../models/stroke.model.js';
import { createBaseService } from '../../../helpers/base.service.js';

const base = createBaseService(Stroke);

// Strokes on a sheet, oldest first (drawn back-to-front).
export const listStrokes = (sheetId) => {
  const filter = { deletedAt: null };
  if (sheetId) filter.sheetId = sheetId;
  return Stroke.find(filter).sort({ createdAt: 1 });
};
export const createStroke = (payload) => base.create(payload);
export const deleteStroke = (id) => base.delete(id);

// Undo a delete: clear the soft-delete marker (keeps the same id).
export const restoreStroke = (id) =>
  Stroke.findByIdAndUpdate(id, { deletedAt: null }, { new: true });

// Cascade: soft-delete every stroke on a sheet (used when the sheet is removed).
export const deleteStrokesForSheet = (sheetId) =>
  Stroke.updateMany({ deletedAt: null, sheetId }, { deletedAt: new Date() });
