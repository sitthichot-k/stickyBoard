import { Connection } from '../models/connection.model.js';
import { createBaseService } from './base.service.js';

const base = createBaseService(Connection);

// All arrows are shown at once, oldest first — no pagination needed.
export const listConnections = () => Connection.find({ deletedAt: null }).sort({ createdAt: 1 });
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
