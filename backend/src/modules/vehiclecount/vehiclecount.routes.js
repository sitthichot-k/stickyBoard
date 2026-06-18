import { Router } from 'express';
import * as controller from './controller/vehiclecount.controller.js';
import { requireServiceToken } from '../violation/middleware/serviceToken.js';

// Mounted at /vehicle-counts. Only the AI detector posts here (service token);
// the counts are surfaced read-only via the admin dashboard stats.
const router = Router();

router.post('/ingest', requireServiceToken, controller.ingest);

export default router;
