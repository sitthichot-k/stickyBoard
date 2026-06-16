import mongoose from 'mongoose';
import { Log } from '../../log/models/log.model.js';

// Performance insight derived from the api.request logs we already store
// (each carries meta.method/path/status/ms). App-level only — no host hardware.
const WINDOW_HOURS = 24;
const round = (n) => Math.round(n ?? 0);

const STATUS_CLASS = {
  $switch: {
    branches: [
      { case: { $lt: ['$meta.status', 300] }, then: '2xx' },
      { case: { $lt: ['$meta.status', 400] }, then: '3xx' },
      { case: { $lt: ['$meta.status', 500] }, then: '4xx' },
    ],
    default: '5xx',
  },
};

const endpointGroup = [
  {
    $group: {
      _id: { method: '$meta.method', path: '$meta.path' },
      count: { $sum: 1 },
      avgMs: { $avg: '$meta.ms' },
    },
  },
];
const endpointProject = {
  $project: { _id: 0, method: '$_id.method', path: '$_id.path', count: 1, avgMs: { $round: ['$avgMs', 0] } },
};

export async function getPerformance() {
  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000);
  const match = { action: 'api.request', createdAt: { $gte: since } };

  const [summary, byHourRaw, statusRaw, topEndpoints, slowest, rateLimitBlocks] = await Promise.all([
    // Totals + latency percentiles in one pass ($percentile needs Mongo 7+).
    Log.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ['$meta.status', 400] }, 1, 0] } },
          serverErrors: { $sum: { $cond: [{ $gte: ['$meta.status', 500] }, 1, 0] } },
          avgMs: { $avg: '$meta.ms' },
          maxMs: { $max: '$meta.ms' },
          pct: { $percentile: { input: '$meta.ms', p: [0.5, 0.95, 0.99], method: 'approximate' } },
        },
      },
    ]),
    Log.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%dT%H', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Log.aggregate([
      { $match: match },
      { $group: { _id: STATUS_CLASS, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Log.aggregate([{ $match: match }, ...endpointGroup, { $sort: { count: -1 } }, { $limit: 8 }, endpointProject]),
    Log.aggregate([
      { $match: match },
      ...endpointGroup,
      { $match: { count: { $gte: 3 } } }, // ignore one-off spikes
      { $sort: { avgMs: -1 } },
      { $limit: 8 },
      endpointProject,
    ]),
    Log.countDocuments({ action: 'ratelimit.blocked', createdAt: { $gte: since } }),
  ]);

  const s = summary[0];
  const total = s?.total ?? 0;

  // Zero-filled hourly throughput (UTC hour keys match $dateToString output).
  const byHour = Object.fromEntries(byHourRaw.map((r) => [r._id, r.count]));
  const throughput = [];
  for (let i = WINDOW_HOURS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 3600 * 1000);
    const key = d.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    throughput.push({ hour: `${key.slice(11)}:00`, count: byHour[key] ?? 0 });
  }

  return {
    windowHours: WINDOW_HOURS,
    requests: total,
    errorRate: total ? +((100 * s.errors) / total).toFixed(1) : 0,
    serverErrorRate: total ? +((100 * s.serverErrors) / total).toFixed(1) : 0,
    rateLimitBlocks,
    latency: {
      avg: round(s?.avgMs),
      p50: round(s?.pct?.[0]),
      p95: round(s?.pct?.[1]),
      p99: round(s?.pct?.[2]),
      max: round(s?.maxMs),
    },
    throughput,
    statusBreakdown: statusRaw.map((x) => ({ klass: x._id, count: x.count })),
    topEndpoints,
    slowest,
    process: processMetrics(),
  };
}

// Self-metrics of the backend process (this container) — not host hardware.
function processMetrics() {
  const mem = process.memoryUsage();
  const mb = (b) => +(b / 1048576).toFixed(1);
  return {
    uptimeSec: round(process.uptime()),
    rssMb: mb(mem.rss),
    heapUsedMb: mb(mem.heapUsed),
    heapTotalMb: mb(mem.heapTotal),
    nodeVersion: process.version,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
}
