import { isProduction } from '../config/env.js';

/**
 * Minimal, dependency-free security headers (the essentials helmet would set).
 * CSP is intentionally left out — it needs per-app tuning and is better handled
 * at the nginx/edge layer for an SPA.
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY'); // app isn't meant to be embedded
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // HSTS only makes sense over HTTPS (production behind TLS).
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}
