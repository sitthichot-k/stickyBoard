import { rateLimitConfig } from '../config/rateLimit.js';
import { businessCode } from './logger.js';
import { recordLog } from '../modules/log/service/log.service.js';
import { getRuntime } from '../modules/setting/service/runtime.service.js';

// Every limiter's hit-map is registered so the Config page can inspect/clear
// currently-blocked callers.
const registry = [];

/**
 * Build an in-memory rate-limit middleware. Each caller (authenticated user id,
 * else client IP) gets a counter per `windowMs`; exceeding `max` blocks it with
 * 429 for `blockMs`. In-memory is fine for a single instance — scale-out would
 * need a shared store (Redis).
 *
 * @param {{ windowMs:number, max:number, blockMs:number, name?:string }} opts
 */
export function createRateLimiter({ windowMs, max, blockMs, name = 'rate' }) {
  /** key → { count, windowStart, blockedUntil } */
  const hits = new Map();
  registry.push({ name, hits });

  // Drop stale entries so the map doesn't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, e] of hits) {
      if (e.blockedUntil <= now && now - e.windowStart >= windowMs) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  function reject(res, retryMs) {
    const retryAfter = Math.ceil(retryMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      code: businessCode(429),
      error: `Too many requests — try again in ${retryAfter}s`,
    });
  }

  return function rateLimit(req, res, next) {
    if (!getRuntime().rateLimitEnabled) return next(); // toggled live from Config

    const key = req.user?.id || req.ip || 'unknown';
    const now = Date.now();
    let e = hits.get(key);
    if (!e) {
      e = { count: 0, windowStart: now, blockedUntil: 0 };
      hits.set(key, e);
    }

    // Still serving a penalty.
    if (e.blockedUntil > now) return reject(res, e.blockedUntil - now);

    // Roll the window over.
    if (now - e.windowStart >= windowMs) {
      e.count = 0;
      e.windowStart = now;
    }

    e.count += 1;

    // Just crossed the limit → start the block (log once, here).
    if (e.count > max) {
      e.blockedUntil = now + blockMs;
      recordLog({
        level: 'warn',
        action: 'ratelimit.blocked',
        message: `${name}: ${key} blocked ${Math.round(blockMs / 1000)}s (> ${max}/${Math.round(windowMs / 1000)}s)`,
        userId: req.user?.id ?? null,
        userEmail: req.user?.email ?? '',
        meta: { name, key, path: req.originalUrl, max, windowMs, blockMs },
      });
      return reject(res, blockMs);
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - e.count));
    next();
  };
}

// Global flood guard (keyed by IP at the app level — req.user isn't set yet).
export const rateLimiter = createRateLimiter({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.max,
  blockMs: rateLimitConfig.blockMs,
  name: 'global',
});

// Strict guard for the login endpoint (brute-force).
export const loginRateLimiter = createRateLimiter({
  windowMs: rateLimitConfig.loginWindowMs,
  max: rateLimitConfig.loginMax,
  blockMs: rateLimitConfig.loginBlockMs,
  name: 'login',
});

// Currently-blocked callers across all limiters (for the Config monitor).
export function getBlocked() {
  const now = Date.now();
  const out = [];
  for (const { name, hits } of registry) {
    for (const [key, e] of hits) {
      if (e.blockedUntil > now) {
        out.push({
          limiter: name,
          key,
          remainingMs: e.blockedUntil - now,
          blockedUntil: new Date(e.blockedUntil).toISOString(),
        });
      }
    }
  }
  return out.sort((a, b) => b.remainingMs - a.remainingMs);
}

// Manually lift a block (admin action). Returns how many limiters held it.
export function unblock(key) {
  let cleared = 0;
  for (const { hits } of registry) {
    if (hits.delete(key)) cleared += 1;
  }
  return cleared;
}
