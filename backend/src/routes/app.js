import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import { env } from '../config/env.js';
import { requestLogger } from '../middleware/logger.js';
import { notFound, errorHandler } from '../middleware/errorHandler.js';

const app = express();

// Log every request (with a business code) as soon as possible.
app.use(requestLogger);

// Core middleware
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes — versioned under /api/v1.
app.use('/api/v1', routes);

// 404 + error handling (must be registered last)
app.use(notFound);
app.use(errorHandler);

export default app;
