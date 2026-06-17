import app from './app.js';
import { env, isProduction } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { startLogCleanup, ensureLogTtlIndex } from '../modules/log/service/log.service.js';
import { ensureSnapshotDir } from '../modules/violation/service/storage.service.js';
import { startViolationCleanup } from '../modules/violation/service/violation.service.js';
import { ensureSystemRoles } from '../modules/security/service/role.service.js';
import { ensureDefaultPermissions } from '../modules/security/service/permission.service.js';
import { loadRuntime } from '../modules/setting/service/runtime.service.js';
import { loadMailConfig } from '../modules/setting/service/mail.service.js';

async function start() {
  // Refuse to boot in production with insecure defaults.
  if (isProduction && env.jwt.secret === 'dev-secret-change-me') {
    console.error('[server] FATAL: JWT_SECRET is the default in production — set a strong secret.');
    process.exit(1);
  }
  if (isProduction && env.seedAdmin.password === 'admin1234') {
    console.warn('[server] WARNING: seed admin password is the default — change SEED_ADMIN_PASSWORD.');
  }

  await connectDatabase();
  await ensureLogTtlIndex(); // native TTL retention (primary)
  startLogCleanup(); // backup purge (now + daily)
  ensureSnapshotDir(); // durable dir for violation snapshots
  startViolationCleanup(); // purge old violation records + images (now + daily)
  await ensureSystemRoles(); // make sure the admin/user roles always exist
  await ensureDefaultPermissions(); // seed the default matrix if it's empty
  await loadRuntime(); // load runtime controls into the in-memory cache
  await loadMailConfig(); // load SMTP config (env defaults + DB override)

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
