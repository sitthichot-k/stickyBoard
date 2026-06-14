import { Log } from '../models/log.model.js';
import { createBaseService } from '../../../helpers/base.service.js';

const base = createBaseService(Log, {
  searchableFields: ['action', 'message', 'userEmail'],
  defaultSort: '-createdAt',
});

// Fire-and-forget: logging must never break the request that triggered it.
export async function recordLog({ level = 'info', action, message = '', userId = null, userEmail = '', meta = {} }) {
  try {
    await Log.create({ level, action, message, userId, userEmail, meta });
  } catch {
    /* swallow — never let an audit-log failure surface to the caller */
  }
}

// Paginated, filterable list (admin). `filters` may include { level, action }.
export const listLogs = (opts) => base.searchAll(opts);
