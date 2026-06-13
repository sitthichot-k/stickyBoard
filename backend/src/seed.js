/**
 * Seed script: populates the database with sample sticky notes (board demo)
 * so the UI has data to show.
 *
 * Run with: npm run seed
 */
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { Note } from './models/note.model.js';

async function seed() {
  await connectDatabase();

  await Note.deleteMany({});
  const notes = [
    { content: 'Welcome to the board! 👋\nDrag me around.', x: 60, y: 80, z: 1, color: '#fff9c4' },
    { content: 'Double-click the text to edit a note.', x: 320, y: 140, z: 2, color: '#c8e6c9' },
    { content: 'Pick a color from the dots at the bottom.', x: 180, y: 320, z: 3, color: '#ffccbc' },
  ];
  await Note.insertMany(notes);
  console.log(`[seed] inserted ${notes.length} notes`);

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
