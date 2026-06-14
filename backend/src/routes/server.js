import app from './app.js';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { startLogCleanup } from '../modules/log/service/log.service.js';
import { ensureSystemRoles } from '../modules/security/service/role.service.js';
import { ensureDefaultPermissions } from '../modules/security/service/permission.service.js';

async function start() {
  await connectDatabase();
  startLogCleanup(); // purge logs past the retention window (now + daily)
  await ensureSystemRoles(); // make sure the admin/user roles always exist
  await ensureDefaultPermissions(); // seed the default matrix if it's empty

  const server = app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
