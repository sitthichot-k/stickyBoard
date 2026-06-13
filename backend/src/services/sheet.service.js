import { Sheet } from '../models/sheet.model.js';
import { createBaseService } from './base.service.js';

const base = createBaseService(Sheet, { searchableFields: ['name'] });

// Sheets are listed newest-first on the landing page.
export const listSheets = () => Sheet.find({ deletedAt: null }).sort({ createdAt: -1 });
export const getSheet = (id) => base.searchOne(id);
export const createSheet = (payload) => base.create(payload);
export const deleteSheet = (id) => base.delete(id);

// Undo a delete: clear the soft-delete marker (keeps the same id).
export const restoreSheet = (id) =>
  Sheet.findByIdAndUpdate(id, { deletedAt: null }, { new: true });
