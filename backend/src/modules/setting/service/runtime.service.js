import { Setting } from '../models/setting.model.js';
import { loggerConfig } from '../../../config/logger.js';
import { rateLimitConfig } from '../../../config/rateLimit.js';
import { ensureLogTtlIndex } from '../../log/service/log.service.js';

/**
 * Runtime controls that admins can toggle from the Config page without a
 * redeploy. Persisted in the settings collection (key `runtime`) and held in an
 * in-memory cache so middleware can read it synchronously on every request.
 * Falls back to the env-derived defaults when nothing is stored.
 */
const KEY = 'runtime';

function envDefaults() {
  return {
    rateLimitEnabled: rateLimitConfig.enabled,
    logApiTraffic: loggerConfig.logApiTraffic,
    logRetentionDays: loggerConfig.retentionDays,
  };
}

function resolve(stored) {
  const d = envDefaults();
  const v = stored && typeof stored === 'object' ? stored : {};
  const days = Number(v.logRetentionDays);
  return {
    rateLimitEnabled: typeof v.rateLimitEnabled === 'boolean' ? v.rateLimitEnabled : d.rateLimitEnabled,
    logApiTraffic: typeof v.logApiTraffic === 'boolean' ? v.logApiTraffic : d.logApiTraffic,
    logRetentionDays: Number.isFinite(days) && days > 0 ? Math.floor(days) : d.logRetentionDays,
  };
}

let cache = envDefaults();

// Synchronous read for hot-path middleware.
export function getRuntime() {
  return cache;
}

// Load the persisted config into the cache (called once on boot).
export async function loadRuntime() {
  try {
    const doc = await Setting.findOne({ key: KEY });
    cache = resolve(doc?.value);
  } catch {
    cache = envDefaults();
  }
  loggerConfig.retentionDays = cache.logRetentionDays; // keep TTL/cleanup in sync
  return cache;
}

// Persist a partial update, refresh the cache, and apply side-effects.
export async function setRuntime(patch = {}) {
  const next = resolve({ ...cache, ...patch });
  const retentionChanged = next.logRetentionDays !== cache.logRetentionDays;
  await Setting.findOneAndUpdate({ key: KEY }, { value: next }, { upsert: true });
  cache = next;
  loggerConfig.retentionDays = next.logRetentionDays;
  if (retentionChanged) await ensureLogTtlIndex(); // apply the new TTL window live
  return cache;
}
