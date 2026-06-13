import { Connection } from '../models/connection.model.js';
import { createBaseService } from './base.service.js';

const base = createBaseService(Connection);

// Arrows on a sheet, oldest first. If no sheetId is given, returns all
// (back-compat until the frontend always scopes by sheet).
export const listConnections = (sheetId) => {
  const filter = { deletedAt: null };
  if (sheetId) filter.sheetId = sheetId;
  return Connection.find(filter).sort({ createdAt: 1 });
};
export const createConnection = (payload) => base.create(payload);
export const deleteConnection = (id) => base.delete(id);

// Undo a delete: clear the soft-delete marker (keeps the same id).
export const restoreConnection = (id) =>
  Connection.findByIdAndUpdate(id, { deletedAt: null }, { new: true });

// Soft-delete every arrow touching a note (used when that note is removed).
export const deleteConnectionsForNote = (noteId) =>
  Connection.updateMany(
    { deletedAt: null, $or: [{ from: noteId }, { to: noteId }] },
    { deletedAt: new Date() },
  );

// Cascade: soft-delete every arrow on a sheet (used when the sheet is removed).
export const deleteConnectionsForSheet = (sheetId) =>
  Connection.updateMany({ deletedAt: null, sheetId }, { deletedAt: new Date() });
