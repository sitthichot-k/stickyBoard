import { isProduction } from '../config/env.js';
import { businessCode } from './logger.js';

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
  }

  res.status(status).json(body);
}
