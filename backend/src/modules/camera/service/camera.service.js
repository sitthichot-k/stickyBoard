import { Camera } from '../models/camera.model.js';
import { createBaseService } from '../../../helpers/base.service.js';
import { encrypt, decrypt } from '../../../helpers/crypto.js';

const base = createBaseService(Camera, { searchableFields: ['name', 'location', 'host'] });

// Validate + parse an RTSP URL. Returns { ok, host } — host has no credentials.
export function parseRtsp(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol !== 'rtsp:') return { ok: false };
    return { ok: true, host: `${u.hostname}:${u.port || 554}` };
  } catch {
    return { ok: false };
  }
}

export const listCameras = () => Camera.find({ deletedAt: null }).sort({ name: 1 });
export const getCamera = (id) => base.searchOne(id);
export const deleteCamera = (id) => base.delete(id);

export function createCamera({ name, location, url, enabled, aiEnabled, createdBy }) {
  const { host } = parseRtsp(url);
  return Camera.create({ name, location, host, urlEnc: encrypt(url), enabled, aiEnabled, createdBy });
}

export function updateCamera(id, patch) {
  const set = { ...patch };
  if (patch.url) {
    set.host = parseRtsp(patch.url).host;
    set.urlEnc = encrypt(patch.url);
    delete set.url;
  }
  return Camera.findOneAndUpdate({ _id: id, deletedAt: null }, set, { new: true });
}

// Internal only — the decrypted URL is handed to ffmpeg, never to a client.
export async function getStreamUrl(id) {
  const cam = await Camera.findOne({ _id: id, deletedAt: null });
  if (!cam || !cam.enabled) return null;
  return decrypt(cam.urlEnc);
}

// Internal only — cameras the AI service should process, with their decrypted
// RTSP URL. Gated by a service token at the route; never exposed to browsers.
export async function getAiSources() {
  const cams = await Camera.find({ deletedAt: null, enabled: true, aiEnabled: true });
  return cams.map((c) => ({
    id: String(c._id),
    name: c.name,
    location: c.location,
    rtspUrl: decrypt(c.urlEnc),
  }));
}
