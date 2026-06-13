import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Core middleware
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// 404 + error handling (must be registered last)
app.use(notFound);
app.use(errorHandler);

export default app;
