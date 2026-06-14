/**
 * Rate-limit configuration. Two tiers:
 *  - global: a generous flood guard on every request.
 *  - login:  a strict guard on POST /auth/login to slow brute-force attempts.
 *
 * When a key exceeds `max` requests within `windowMs`, it's blocked (429) for
 * `blockMs` — a penalty window longer than the counting window.
 */
const num = (v, fallback) => Number(v ?? fallback);

export const rateLimitConfig = {
  enabled: process.env.RATE_LIMIT !== 'false',

  // Global flood guard.
  windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000), // 1 minute
  max: num(process.env.RATE_LIMIT_MAX, 150), // requests per window
  blockMs: num(process.env.RATE_LIMIT_BLOCK_MS, 5 * 60_000), // block 5 minutes

  // Stricter guard for login (brute-force protection).
  loginWindowMs: num(process.env.LOGIN_RATE_WINDOW_MS, 60_000), // 1 minute
  loginMax: num(process.env.LOGIN_RATE_MAX, 8), // attempts per window
  loginBlockMs: num(process.env.LOGIN_RATE_BLOCK_MS, 15 * 60_000), // block 15 minutes
};
