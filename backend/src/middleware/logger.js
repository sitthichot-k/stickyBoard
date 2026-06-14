import { loggerConfig } from '../config/logger.js';
import { recordLog } from '../modules/log/service/log.service.js';
import { can } from '../modules/security/service/permission.service.js';
import { pageForApiPath } from '../modules/security/catalog.js';

// Human-readable label per HTTP status (extend as needed).
const STATUS_LABEL = {
  200: 'success',
  201: 'created',
  204: 'no content',
  400: 'bad request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not found',
  409: 'conflict',
  422: 'unprocessable entity',
  500: 'internal error',
};

// Business code = HTTP status × 100 (e.g. 200 → 20000, 404 → 40400, 500 → 50000).
export function businessCode(status) {
  return status * 100;
}

export function statusLabel(status) {
  return STATUS_LABEL[status] ?? (status < 400 ? 'ok' : 'error');
}

/**
 * Logs one line per request when the response finishes, e.g.
 *   [api] OK   20000 success — GET /api/v1/notes 12ms
 *   [api] WARN 40400 not found — GET /api/v1/sheets/abc 4ms
 * so it's obvious in dev what happened and where.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', async () => {
    const ms = Date.now() - start;
    const { statusCode } = res;
    const tag = statusCode >= 500 ? 'ERR ' : statusCode >= 400 ? 'WARN' : 'OK  ';
    const line = `[api] ${tag} ${businessCode(statusCode)} ${statusLabel(statusCode)} — ${req.method} ${req.originalUrl} ${ms}ms`;
    if (statusCode >= 500) console.error(line);
    else if (statusCode >= 400) console.warn(line);
    else console.log(line);

    // Persist the request as a DB log unless: logging is off, it's a CORS
    // preflight, it hits a noisy path, or the request's page has its "Logs"
    // capability turned off for the acting role (the permission matrix).
    if (!loggerConfig.logApiTraffic || req.method === 'OPTIONS') return;
    if (loggerConfig.skipPaths.some((p) => req.originalUrl.startsWith(p))) return;
    const page = pageForApiPath(req.originalUrl);
    if (page && req.user?.role && !(await can(req.user.role, page.key, 'logs'))) return;

    recordLog({
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      action: 'api.request',
      message: `${req.method} ${req.originalUrl} → ${statusCode}`,
      userId: req.user?.id ?? null,
      userEmail: req.user?.email ?? '',
      meta: { method: req.method, path: req.originalUrl, status: statusCode, ms },
    });
  });
  next();
}
