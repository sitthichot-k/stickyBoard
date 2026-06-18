import mongoose from 'mongoose';
import * as service from '../service/vehiclecount.service.js';
import * as cameraService from '../../camera/service/camera.service.js';

const TYPES = ['motorcycle', 'car', 'truck', 'bus'];

// AI-service endpoint (service token): record one counted vehicle. JSON body —
// no image, so the global JSON parser handles it.
export async function ingest(req, res, next) {
  try {
    const { cameraId, gate, type, trackId, detectedAt } = req.body ?? {};
    if (!cameraId || !mongoose.isValidObjectId(cameraId)) {
      return res.status(400).json({ error: 'valid cameraId is required' });
    }
    if (!['entrance', 'exit'].includes(gate)) {
      return res.status(400).json({ error: 'gate must be entrance or exit' });
    }
    if (!TYPES.includes(type)) {
      return res.status(400).json({ error: 'invalid vehicle type' });
    }
    const cam = await cameraService.getCamera(cameraId);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });

    const { count, deduped } = await service.recordCount({
      cameraId,
      gate,
      type,
      trackId: trackId ? String(trackId) : '',
      detectedAt: detectedAt ? new Date(detectedAt) : new Date(),
    });
    res.status(deduped ? 200 : 201).json({ id: count.id, deduped });
  } catch (err) {
    next(err);
  }
}
