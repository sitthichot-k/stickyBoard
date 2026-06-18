import { VehicleCount } from '../models/vehiclecount.model.js';
import { env } from '../../../config/env.js';

const TYPES = ['motorcycle', 'car', 'truck', 'bus'];

// Same tracked vehicle on the same camera within this window counts once (the
// detector also keeps a local seen-set; this is a backstop).
const DEDUP_MS = 5 * 60 * 1000;

export async function recordCount({ cameraId, gate, type, trackId, detectedAt }) {
  if (trackId) {
    const since = new Date(Date.now() - DEDUP_MS);
    const dup = await VehicleCount.findOne({ cameraId, trackId, type, createdAt: { $gte: since } });
    if (dup) return { count: dup, deduped: true };
  }
  const count = await VehicleCount.create({ cameraId, gate, type, trackId, detectedAt });
  return { count, deduped: false };
}

// In/out summary by type for the dashboard.
export async function getVehicleCountStats() {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const emptyByType = () => Object.fromEntries(TYPES.map((t) => [t, 0]));
  const byType = { entrance: emptyByType(), exit: emptyByType() };
  const today = { entrance: 0, exit: 0 };

  const rows = await VehicleCount.aggregate([
    { $group: { _id: { gate: '$gate', type: '$type' }, count: { $sum: 1 } } },
  ]);
  for (const r of rows) {
    if (byType[r._id.gate] && r._id.type in byType[r._id.gate]) byType[r._id.gate][r._id.type] = r.count;
  }

  const todayRows = await VehicleCount.aggregate([
    { $match: { detectedAt: { $gte: startToday } } },
    { $group: { _id: '$gate', count: { $sum: 1 } } },
  ]);
  for (const r of todayRows) if (r._id in today) today[r._id] = r.count;

  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

  // 14-day in/out trend (zero-filled).
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 13);
  const raw = await VehicleCount.aggregate([
    { $match: { detectedAt: { $gte: since } } },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$detectedAt' } }, gate: '$gate' },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = new Map(); // date -> { in, out }
  for (const r of raw) {
    const e = map.get(r._id.day) ?? { in: 0, out: 0 };
    if (r._id.gate === 'entrance') e.in = r.count;
    else if (r._id.gate === 'exit') e.out = r.count;
    map.set(r._id.day, e);
  }
  const trend = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const e = map.get(date) ?? { in: 0, out: 0 };
    trend.push({ date, in: e.in, out: e.out });
  }

  return {
    totals: { in: sum(byType.entrance), out: sum(byType.exit) },
    today: { in: today.entrance, out: today.exit },
    byType,
    trend,
  };
}

// Retention: drop rows past the window (mirrors log/violation cleanup).
export async function purgeOldCounts(retentionDays = env.ai.retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const res = await VehicleCount.deleteMany({ detectedAt: { $lt: cutoff } });
  return res.deletedCount ?? 0;
}

export function startVehicleCountCleanup() {
  const run = async () => {
    try {
      const n = await purgeOldCounts();
      if (n) console.log(`[vehicle-counts] purged ${n} older than ${env.ai.retentionDays}d`);
    } catch (err) {
      console.error('[vehicle-counts] cleanup failed', err);
    }
  };
  run();
  setInterval(run, 24 * 60 * 60 * 1000).unref();
}
