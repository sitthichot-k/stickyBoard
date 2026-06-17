import fs from 'fs';
import path from 'path';
import { env } from '../../../config/env.js';

// Violation snapshots are written to a durable directory (unlike the reaped HLS
// temp dir). Mount a volume at SNAPSHOT_DIR in production so images survive a
// container restart.
const DIR = env.ai.snapshotDir;

export function ensureSnapshotDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

// Resolve a stored filename to an absolute path, guarding against traversal.
// Returns null for anything that isn't a plain filename.
export function snapshotFile(name) {
  if (!name || !/^[\w.-]+$/.test(name)) return null;
  return path.join(DIR, name);
}

export function saveSnapshot(name, buffer) {
  ensureSnapshotDir();
  fs.writeFileSync(path.join(DIR, name), buffer);
  return name;
}

export function removeSnapshot(name) {
  const fp = snapshotFile(name);
  if (!fp) return;
  try {
    fs.rmSync(fp, { force: true });
  } catch {
    /* ignore — a missing file is fine */
  }
}
