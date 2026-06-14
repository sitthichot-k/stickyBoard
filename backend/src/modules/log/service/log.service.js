import { Log } from '../models/log.model.js';
import { createBaseService } from '../../../helpers/base.service.js';
import { loggerConfig } from '../../../config/logger.js';

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

// Delete logs older than the retention window. Returns the count removed.
export async function purgeOldLogs(retentionDays = loggerConfig.retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const res = await Log.deleteMany({ createdAt: { $lt: cutoff } });
  return res.deletedCount ?? 0;
}

// Run cleanup now + on a daily interval (called once at startup).
export function startLogCleanup() {
  const run = async () => {
    try {
      const n = await purgeOldLogs();
      if (n) console.log(`[logs] purged ${n} logs older than ${loggerConfig.retentionDays}d`);
    } catch (err) {
      console.error('[logs] cleanup failed', err);
    }
  };
  run();
  setInterval(run, loggerConfig.cleanupIntervalMs).unref();
}
