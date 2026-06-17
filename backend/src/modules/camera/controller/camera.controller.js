import fs from 'fs';
import * as service from '../service/camera.service.js';
import * as stream from '../service/stream.service.js';
import { recordLog } from '../../log/service/log.service.js';

export async function list(req, res, next) {
  try {
    res.json(await service.listCameras());
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, location, url, enabled } = req.body ?? {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!service.parseRtsp(url).ok) {
      return res.status(400).json({ error: 'url must be a valid rtsp:// URL' });
    }
    const cam = await service.createCamera({
      name: name.trim(),
      location: String(location ?? '').trim(),
      url,
      enabled: enabled !== false,
      createdBy: req.user.id,
    });
    recordLog({ action: 'camera.create', message: `Added camera ${cam.name} (${cam.host})`, userId: req.user.id, meta: { cameraId: cam.id } });
    res.status(201).json(cam);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { name, location, url, enabled } = req.body ?? {};
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (location !== undefined) patch.location = String(location).trim();
    if (enabled !== undefined) patch.enabled = Boolean(enabled);
    if (url !== undefined) {
      if (!service.parseRtsp(url).ok) return res.status(400).json({ error: 'url must be a valid rtsp:// URL' });
      patch.url = url;
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });
    const cam = await service.updateCamera(req.params.id, patch);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });
    recordLog({ action: 'camera.update', message: `Updated camera ${cam.name}`, userId: req.user.id, meta: { cameraId: cam.id } });
    res.json(cam);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const cam = await service.deleteCamera(req.params.id);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });
    stream.stopStream(req.params.id);
    recordLog({ level: 'warn', action: 'camera.delete', message: `Deleted camera ${cam.name}`, userId: req.user.id, meta: { cameraId: cam.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

const waitFor = async (fp, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fs.existsSync(fp)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
};

// Serve the live HLS playlist/segments (ffmpeg starts on demand).
export async function hls(req, res, next) {
  try {
    const dir = await stream.ensureStream(req.params.id, req.user.id);
    if (!dir) return res.status(404).json({ error: 'Camera not found or disabled' });
    stream.touch(req.params.id);

    const file = req.params.file || 'index.m3u8';
    const fp = stream.fileFor(req.params.id, file);
    if (!fp) return res.status(400).end();

    if (!fs.existsSync(fp) && file.endsWith('.m3u8')) await waitFor(fp, 8000); // ffmpeg warm-up
    if (!fs.existsSync(fp)) return res.status(503).json({ error: 'Stream warming up — retry' });

    res.setHeader('Content-Type', file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(fp).pipe(res);
  } catch (err) {
    next(err);
  }
}
