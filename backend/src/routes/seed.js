/**
 * Seed script: populates the database with sample sheets and notes
 * so the UI has data to show.
 *
 * Run with: npm run seed
 */
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { Sheet } from '../modules/sheet/models/sheet.model.js';
import { Note } from '../modules/note/models/note.model.js';
import { Connection } from '../modules/connection/models/connection.model.js';
import { User } from '../modules/user/models/user.model.js';
import { createUser } from '../modules/user/service/user.service.js';

async function seed() {
  await connectDatabase();

  // Users — seed an admin + a regular user (login-only: no public sign-up).
  await User.deleteMany({});
  const admin = await createUser({
    email: env.seedAdmin.email,
    password: env.seedAdmin.password,
    name: 'Admin',
    role: 'admin',
    emailVerified: true,
  });
  await createUser({
    email: 'user@example.com',
    password: 'user1234',
    name: 'User',
    role: 'user',
    emailVerified: true,
  });
  console.log(`[seed] admin: ${env.seedAdmin.email} / ${env.seedAdmin.password}`);

  // Roles & the permission matrix are bootstrapped automatically on server boot
  // (ensureSystemRoles + ensureDefaultPermissions), so seeding only handles
  // accounts and sample board content.

  await Promise.all([Sheet.deleteMany({}), Note.deleteMany({}), Connection.deleteMany({})]);

  const sheets = await Sheet.insertMany([
    { name: 'Welcome board', background: 'dots', ownerId: admin.id },
    { name: 'Grid demo', background: 'grid', ownerId: admin.id },
    { name: 'Blank paper', background: 'blank', ownerId: admin.id },
  ]);
  console.log(`[seed] inserted ${sheets.length} sheets`);

  const sheetId = sheets[0]._id; // sample notes live on the first sheet
  const notes = [
    { sheetId, content: 'Welcome to the board! 👋\nDrag me around.', x: 60, y: 80, z: 1, color: '#fff9c4' },
    { sheetId, content: 'Double-click the text to edit a note.', x: 320, y: 140, z: 2, color: '#c8e6c9' },
    { sheetId, content: 'Pick a color from the dots at the bottom.', x: 180, y: 320, z: 3, color: '#ffccbc' },
  ];
  await Note.insertMany(notes);
  console.log(`[seed] inserted ${notes.length} notes on "${sheets[0].name}"`);

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
