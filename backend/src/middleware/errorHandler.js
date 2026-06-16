import { isProduction } from '../config/env.js';
import { businessCode } from './logger.js';
import { recordLog } from '../modules/log/service/log.service.js';

/** 404 handler — runs when no route matched. */
export function notFound(req, res) {
  res.status(404).json({
    code: businessCode(404),
    error: `Not found: ${req.method} ${req.originalUrl}`,
  });
}

/** Central error handler. Must keep all 4 args so Express recognises it. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  const body = { code: businessCode(status), error: err.message ?? 'Internal Server Error' };

  if (!isProduction && err.stack) {
    body.stack = err.stack;
  }

  if (status >= 500) {
    console.error(err);
    // Persist server errors (with the cause/stack) so admins can diagnose from
    // the Logs page instead of digging through container logs.
    recordLog({
      level: 'error',
      action: 'app.error',
      message: err.message ?? 'Internal Server Error',
      userId: req.user?.id ?? null,
      userEmail: req.user?.email ?? '',
      meta: { method: req.method, path: req.originalUrl, status, stack: err.stack },
    });
  }

  res.status(status).json(body);
}
