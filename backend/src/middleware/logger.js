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
  res.on('finish', () => {
    const ms = Date.now() - start;
    const { statusCode } = res;
    const tag = statusCode >= 500 ? 'ERR ' : statusCode >= 400 ? 'WARN' : 'OK  ';
    const line = `[api] ${tag} ${businessCode(statusCode)} ${statusLabel(statusCode)} — ${req.method} ${req.originalUrl} ${ms}ms`;
    if (statusCode >= 500) console.error(line);
    else if (statusCode >= 400) console.warn(line);
    else console.log(line);
  });
  next();
}
