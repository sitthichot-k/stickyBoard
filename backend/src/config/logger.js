// Logging configuration (DB event logs).
export const loggerConfig = {
  // Persist a DB log for every API request (set LOG_API_TRAFFIC=false to disable).
  logApiTraffic: process.env.LOG_API_TRAFFIC !== 'false',

  // Skip these URL prefixes — noisy / would feed back on themselves.
  skipPaths: ['/api/v1/health', '/api/v1/logs'],

  // Delete logs older than this many days.
  retentionDays: Number(process.env.LOG_RETENTION_DAYS ?? 30),

  // How often the cleanup runs.
  cleanupIntervalMs: 24 * 60 * 60 * 1000, // daily
};
