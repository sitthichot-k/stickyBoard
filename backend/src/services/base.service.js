/**
 * Base service factory.
 *
 * Generates the five standard operations every module needs on a Mongoose
 * model — create, update, delete, searchOne, searchAll — so feature services
 * don't re-implement the same CRUD/pagination logic.
 *
 * Deletes are SOFT: `delete` stamps `deletedAt` instead of removing the row,
 * and every read (`searchOne`, `searchAll`, `buildFilter`) hides soft-deleted
 * records. Models that should support this must declare a `deletedAt` field
 * (default null) in their schema.
 *
 * Usage:
 *   import { createBaseService } from './base.service.js';
 *   const base = createBaseService(MyModel, { searchableFields: ['name'] });
 *   export const createThing = (payload) => base.create(payload);
 *   ...or spread/override only what differs.
 *
 * @param {import('mongoose').Model} model        Mongoose model to operate on.
 * @param {object} [options]
 * @param {string[]} [options.searchableFields]   Fields matched (case-insensitive) by `search`.
 * @param {string}   [options.defaultSort]        Default sort, e.g. '-createdAt'.
 * @param {number}   [options.defaultLimit]       Default page size.
 * @param {number}   [options.maxLimit]           Hard cap on page size.
 */
export function createBaseService(model, options = {}) {
  const {
    searchableFields = [],
    defaultSort = '-createdAt',
    defaultLimit = 10,
    maxLimit = 100,
  } = options;

  /** Build a Mongoose filter from a free-text `search` plus exact-match `filters`. */
  function buildFilter({ search, filters = {} } = {}) {
    // `deletedAt: null` also matches docs where the field is absent, so it's
    // safe even for models that don't track soft deletes.
    const query = { deletedAt: null, ...filters };
    if (search && searchableFields.length) {
      query.$or = searchableFields.map((field) => ({
        [field]: { $regex: search, $options: 'i' },
      }));
    }
    return query;
  }

  return {
    /** Create one document. */
    create(payload) {
      return model.create(payload);
    },

    /** Update one document by id, returning the updated doc (or null). */
    update(id, payload) {
      return model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    },

    /**
     * Soft-delete one document by id: stamp `deletedAt` instead of removing it.
     * Returns the updated doc, or null if it doesn't exist / is already deleted.
     */
    delete(id) {
      return model.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true },
      );
    },

    /** Fetch a single (non-deleted) document by id (or null). */
    searchOne(id) {
      return model.findOne({ _id: id, deletedAt: null });
    },

    /**
     * Paginated, searchable, sortable list.
     * @returns {Promise<{ data: object[], pagination: { page, limit, total, totalPages } }>}
     */
    async searchAll({ page = 1, limit = defaultLimit, search, sort = defaultSort, filters } = {}) {
      const safeLimit = Math.min(maxLimit, Math.max(1, Number(limit) || defaultLimit));
      const safePage = Math.max(1, Number(page) || 1);
      const filter = buildFilter({ search, filters });
      const skip = (safePage - 1) * safeLimit;

      const [data, total] = await Promise.all([
        model.find(filter).sort(sort).skip(skip).limit(safeLimit),
        model.countDocuments(filter),
      ]);

      return {
        data,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
      };
    },

    // Exposed so feature services can reuse the filter logic in custom queries.
    buildFilter,
  };
}
