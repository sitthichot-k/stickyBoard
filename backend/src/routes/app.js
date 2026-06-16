import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import { env } from '../config/env.js';
import { requestLogger } from '../middleware/logger.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import { securityHeaders } from '../middleware/securityHeaders.js';
import { notFound, errorHandler } from '../middleware/errorHandler.js';

const app = express();

// Behind nginx/proxy — trust the first hop so req.ip is the real client.
app.set('trust proxy', 1);
app.disable('x-powered-by'); // don't advertise Express

// Log every request (with a business code) as soon as possible.
app.use(requestLogger);

// Core middleware
app.use(securityHeaders);
app.use(cors({ origin: env.corsOrigin }));
// Flood guard before body parsing — reject spam before doing real work.
app.use(rateLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API routes — versioned under /api/v1.
app.use('/api/v1', routes);

// 404 + error handling (must be registered last)
app.use(notFound);
app.use(errorHandler);

export default app;
