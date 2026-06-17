import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock the board APIs so no real HTTP happens.
vi.mock('@/modules/board/api/notes.js', () => ({
  fetchNotes: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  restoreNote: vi.fn(),
}));
vi.mock('@/modules/board/api/connections.js', () => ({
  fetchConnections: vi.fn(),
  createConnection: vi.fn(),
  deleteConnection: vi.fn(),
  restoreConnection: vi.fn(),
}));
vi.mock('@/modules/board/api/strokes.js', () => ({
  fetchStrokes: vi.fn(),
  createStroke: vi.fn(),
  deleteStroke: vi.fn(),
  restoreStroke: vi.fn(),
}));

import { useNotesStore } from '@/modules/board/stores/notes.js';
import * as notesApi from '@/modules/board/api/notes.js';

beforeEach(() => setActivePinia(createPinia()));

describe('notes delete (persist before removing locally)', () => {
  it('keeps the note when the delete is denied', async () => {
    const store = useNotesStore();
    store.notes = [{ id: '1' }];
    notesApi.deleteNote.mockRejectedValueOnce(new Error('You do not have permission for this action'));

    await store.remove('1');

    expect(store.notes).toHaveLength(1); // not optimistically removed
    expect(store.error).toMatch(/permission/i);
  });

  it('removes the note when the delete succeeds', async () => {
    const store = useNotesStore();
    store.notes = [{ id: '1' }];
    notesApi.deleteNote.mockResolvedValueOnce(undefined);

    await store.remove('1');

    expect(store.notes).toHaveLength(0);
  });
});
