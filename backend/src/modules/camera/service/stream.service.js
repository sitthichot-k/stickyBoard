import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getStreamUrl } from './camera.service.js';
import { recordLog } from '../../log/service/log.service.js';

// Per-camera ffmpeg → HLS transcode. Processes start on demand and are reaped
// after a short idle window. `-c:v copy` just repackages H.264 (cheap); set
// CAMERA_TRANSCODE=true to re-encode (libx264) for non-H.264 sources.
const HLS_ROOT = path.join(os.tmpdir(), 'sticky-hls');
const IDLE_MS = 30_000;
const TRANSCODE = process.env.CAMERA_TRANSCODE === 'true';
// Seconds of rewind/pause buffer kept on disk (segments are 1s each).
const DVR_SECONDS = Math.max(6, Number(process.env.CAMERA_DVR_SECONDS ?? 60));

const streams = new Map(); // cameraId -> { proc, dir, lastAccess }
const dirFor = (id) => path.join(HLS_ROOT, String(id));

export async function ensureStream(cameraId, userId = null) {
  const existing = streams.get(cameraId);
  if (existing) {
    existing.lastAccess = Date.now();
    return existing.dir;
  }

  const url = await getStreamUrl(cameraId);
  if (!url) return null;

  const dir = dirFor(cameraId);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });

  const args = [
    '-rtsp_transport', 'tcp',
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-i', url,
    '-an',
    '-c:v', TRANSCODE ? 'libx264' : 'copy',
    // Re-encode → force a ~1s GOP so segments can actually be short (lower latency).
    ...(TRANSCODE ? ['-preset', 'veryfast', '-tune', 'zerolatency', '-g', '30', '-keyint_min', '30'] : []),
    '-f', 'hls',
    '-hls_time', '1',
    '-hls_list_size', String(DVR_SECONDS), // keep a rewind window (DVR)
    '-hls_flags', 'delete_segments+omit_endlist',
    '-hls_segment_filename', path.join(dir, 'seg%03d.ts'),
    path.join(dir, 'index.m3u8'),
  ];

  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  proc.stderr.on('data', () => {}); // ffmpeg is chatty on stderr; ignore
  proc.on('error', (err) => {
    console.error('[camera] ffmpeg failed (is it installed?):', err.message);
    cleanup(cameraId, proc);
  });
  proc.on('exit', () => cleanup(cameraId, proc));

  streams.set(cameraId, { proc, dir, lastAccess: Date.now() });
  recordLog({ action: 'camera.view', message: `Started camera stream ${cameraId}`, userId, meta: { cameraId } });
  return dir;
}

export function touch(cameraId) {
  const s = streams.get(cameraId);
  if (s) s.lastAccess = Date.now();
}

function cleanup(cameraId, proc) {
  const s = streams.get(cameraId);
  if (s && s.proc !== proc) return; // a newer process owns this id
  streams.delete(cameraId);
  try {
    fs.rmSync(dirFor(cameraId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function stopStream(cameraId) {
  const s = streams.get(cameraId);
  if (!s) return;
  try {
    s.proc.kill('SIGKILL');
  } catch {
    /* ignore */
  }
  cleanup(cameraId, s.proc);
}

// Resolve a requested HLS file safely (no path traversal).
export function fileFor(cameraId, file) {
  if (!/^[\w.-]+$/.test(file)) return null;
  return path.join(dirFor(cameraId), file);
}

// Reap idle streams.
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of streams) {
    if (now - s.lastAccess > IDLE_MS) stopStream(id);
  }
}, 10_000).unref();
