import { Sheet } from '../models/sheet.model.js';
import { createBaseService } from '../../../helpers/base.service.js';

const base = createBaseService(Sheet, { searchableFields: ['name'] });

// Sheets are listed newest-first on the landing page. Pass `ownerId` to scope
// the list to one user's boards (used by "owner mode").
export const listSheets = ({ ownerId } = {}) => {
  const filter = { deletedAt: null };
  if (ownerId) filter.ownerId = ownerId;
  return Sheet.find(filter).sort({ createdAt: -1 });
};
export const getSheet = (id) => base.searchOne(id);
export const createSheet = (payload) => base.create(payload);
export const updateSheet = (id, payload) => base.update(id, payload);
export const deleteSheet = (id) => base.delete(id);

// Undo a delete: clear the soft-delete marker (keeps the same id).
export const restoreSheet = (id) =>
  Sheet.findByIdAndUpdate(id, { deletedAt: null }, { new: true });
