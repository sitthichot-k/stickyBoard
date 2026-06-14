/**
 * One-off migration: assign existing boards (created before ownership existed)
 * to the seed admin so "owner mode" has a defined owner for every board.
 *
 * Non-destructive — only touches sheets where `ownerId` is missing/null.
 * Run with: npm run backfill:owners
 */
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { Sheet } from '../modules/sheet/models/sheet.model.js';
import { findByEmail } from '../modules/user/service/user.service.js';

async function backfill() {
  await connectDatabase();

  const admin = await findByEmail(env.seedAdmin.email);
  if (!admin) {
    console.error(`[backfill] admin "${env.seedAdmin.email}" not found — run "npm run seed" first`);
    await disconnectDatabase();
    process.exit(1);
  }

  const { modifiedCount } = await Sheet.updateMany(
    { $or: [{ ownerId: null }, { ownerId: { $exists: false } }] },
    { ownerId: admin._id },
  );
  console.log(`[backfill] assigned ${modifiedCount} board(s) to ${admin.email}`);

  await disconnectDatabase();
  process.exit(0);
}

backfill().catch((err) => {
  console.error('[backfill] failed', err);
  process.exit(1);
});
