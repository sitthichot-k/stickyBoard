import { Violation } from '../models/violation.model.js';
import { createBaseService } from '../../../helpers/base.service.js';
import { env } from '../../../config/env.js';
import { saveSnapshot, removeSnapshot } from './storage.service.js';

const base = createBaseService(Violation, { defaultSort: '-detectedAt' });

export const listViolations = (opts) => base.searchAll(opts);
export const getViolation = (id) => base.searchOne(id);

// Same tracked rider on the same camera within this window counts as one event.
// (The AI service tracks across frames; this is a backstop against bursts.)
const DEDUP_MS = 60_000;

export async function recordViolation({ cameraId, type, confidence, trackId, bbox, detectedAt, image }) {
  if (trackId) {
    const since = new Date(Date.now() - DEDUP_MS);
    const dup = await Violation.findOne({ cameraId, trackId, deletedAt: null, createdAt: { $gte: since } });
    if (dup) return { violation: dup, deduped: true };
  }
  const v = new Violation({ cameraId, type, confidence, trackId, bbox, detectedAt });
  v.snapshotPath = saveSnapshot(`${v._id}.jpg`, image);
  await v.save();
  return { violation: v, deduped: false };
}

// Update status / note. Stamps the reviewer when moving out of `new`.
export async function reviewViolation(id, { status, note }, reviewerId) {
  const patch = {};
  if (status) patch.status = status;
  if (note !== undefined) patch.note = note;
  if (status && status !== 'new') {
    patch.reviewedBy = reviewerId;
    patch.reviewedAt = new Date();
  }
  return Violation.findOneAndUpdate({ _id: id, deletedAt: null }, patch, { new: true, runValidators: true });
}

// Soft delete (keeps the image so it can be restored, like the rest of the app).
// Hard removal + file cleanup happens only via the retention purge.
export const deleteViolation = (id) => base.delete(id);

// Retention: hard-delete violations past the window and unlink their snapshots
// (a TTL index can't remove files, so this runs as an interval job).
export async function purgeOldViolations(retentionDays = env.ai.retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const old = await Violation.find({ detectedAt: { $lt: cutoff } }).select('snapshotPath');
  for (const v of old) removeSnapshot(v.snapshotPath);
  const res = await Violation.deleteMany({ detectedAt: { $lt: cutoff } });
  return res.deletedCount ?? 0;
}

export function startViolationCleanup() {
  const run = async () => {
    try {
      const n = await purgeOldViolations();
      if (n) console.log(`[violations] purged ${n} older than ${env.ai.retentionDays}d`);
    } catch (err) {
      console.error('[violations] cleanup failed', err);
    }
  };
  run();
  setInterval(run, 24 * 60 * 60 * 1000).unref();
}

// Summary for the admin dashboard (counts, 14-day trend, top cameras).
export async function getViolationStats() {
  const active = { deletedAt: null };
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, unreviewed, today, last7] = await Promise.all([
    Violation.countDocuments(active),
    Violation.countDocuments({ ...active, status: 'new' }),
    Violation.countDocuments({ ...active, detectedAt: { $gte: startToday } }),
    Violation.countDocuments({ ...active, detectedAt: { $gte: since7 } }),
  ]);

  // 14-day trend (zero-filled), matching the notes-activity chart shape.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 13);
  const raw = await Violation.aggregate([
    { $match: { ...active, detectedAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$detectedAt' } }, count: { $sum: 1 } } },
  ]);
  const byDay = Object.fromEntries(raw.map((r) => [r._id, r.count]));
  const trend = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    trend.push({ date, count: byDay[date] ?? 0 });
  }

  const topCameras = await Violation.aggregate([
    { $match: active },
    { $group: { _id: '$cameraId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'cameras', localField: '_id', foreignField: '_id', as: 'cam' } },
    { $unwind: { path: '$cam', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, name: { $ifNull: ['$cam.name', 'Unknown'] }, count: 1 } },
  ]);

  return { total, unreviewed, today, last7, trend, topCameras };
}
