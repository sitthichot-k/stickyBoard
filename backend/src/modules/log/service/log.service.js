import mongoose from 'mongoose';
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

// Primary retention: a MongoDB TTL index lets the server auto-expire old logs
// natively. Re-syncs the window on boot (collMod) when LOG_RETENTION_DAYS
// changes. The interval cleanup below stays as a backup if this can't run.
export async function ensureLogTtlIndex() {
  const seconds = Math.max(1, Math.round(loggerConfig.retentionDays * 24 * 60 * 60));
  try {
    const indexes = await Log.collection.indexes();
    const ttl = indexes.find((i) => i.expireAfterSeconds != null && i.key?.createdAt === 1);
    if (!ttl) {
      await Log.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: seconds, name: 'log_ttl' });
      console.log(`[logs] TTL index created (${loggerConfig.retentionDays}d)`);
    } else if (ttl.expireAfterSeconds !== seconds) {
      await mongoose.connection.db.command({
        collMod: Log.collection.collectionName,
        index: { name: ttl.name, expireAfterSeconds: seconds },
      });
      console.log(`[logs] TTL index updated → ${loggerConfig.retentionDays}d`);
    }
  } catch (err) {
    console.error('[logs] TTL index ensure failed (interval cleanup still active):', err.message);
  }
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
