import { defineStore, acceptHMRUpdate } from 'pinia';
import * as api from '@/api/notes.js';
import * as connectionApi from '@/api/connections.js';
import * as strokeApi from '@/api/strokes.js';

const COLORS = ['#fff9c4', '#c8e6c9', '#ffccbc', '#bbdefb', '#e1bee7', '#f8bbd0', '#ffffff'];

// Fields whose changes are worth undoing (z/stacking order is intentionally excluded).
const HISTORY_KEYS = ['x', 'y', 'width', 'height', 'color', 'content'];

// Last-persisted values per note, used to compute undo diffs. Non-reactive.
const persisted = new Map();
function snapshot(note) {
  const s = {};
  for (const k of HISTORY_KEYS) s[k] = note[k];
  persisted.set(note.id, s);
}

export const useNotesStore = defineStore('notes', {
  state: () => ({
    sheetId: null, // the sheet these notes belong to
    notes: [],
    connections: [],
    strokes: [],
    loading: false,
    error: '',
    undoStack: [], // commands available to undo
    redoStack: [], // commands available to redo
  }),
  getters: {
    colors: () => COLORS,
    maxZ: (state) => state.notes.reduce((max, n) => Math.max(max, n.z ?? 1), 0),
    canUndo: (state) => state.undoStack.length > 0,
    canRedo: (state) => state.redoStack.length > 0,
  },
  actions: {
    async load(sheetId) {
      this.sheetId = sheetId ?? null;
      this.loading = true;
      this.error = '';
      try {
        const [notes, connections, strokes] = await Promise.all([
          api.fetchNotes(sheetId),
          connectionApi.fetchConnections(sheetId),
          strokeApi.fetchStrokes(sheetId),
        ]);
        this.notes = notes;
        this.connections = connections;
        this.strokes = strokes;
        persisted.clear();
        notes.forEach(snapshot);
        this.undoStack = [];
        this.redoStack = [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    /* ---- History ---- */
    record(command) {
      this.undoStack.push(command);
      this.redoStack = []; // a fresh action invalidates the redo branch
    },
    async undo() {
      const command = this.undoStack.pop();
      if (!command) return;
      try {
        await command.undo();
        this.redoStack.push(command);
      } catch (err) {
        this.error = err.message;
        this.undoStack.push(command); // put it back on failure
      }
    },
    async redo() {
      const command = this.redoStack.pop();
      if (!command) return;
      try {
        await command.redo();
        this.undoStack.push(command);
      } catch (err) {
        this.error = err.message;
        this.redoStack.push(command);
      }
    },

    /* ---- Internal note ops (no history) ---- */
    async _createNote(position) {
      const offset = (this.notes.length % 6) * 28;
      const at = position ?? { x: 80 + offset, y: 80 + offset };
      const note = await api.createNote({
        sheetId: this.sheetId,
        content: '',
        x: Math.round(at.x),
        y: Math.round(at.y),
        z: this.maxZ + 1,
        color: COLORS[this.notes.length % COLORS.length],
      });
      this.notes.push(note);
      snapshot(note);
      return note;
    },
    // Soft-delete a note + its arrows; returns the removed arrows so they can be restored.
    async _deleteNote(id) {
      const conns = this.connections.filter((c) => c.from === id || c.to === id);
      this.notes = this.notes.filter((n) => n.id !== id);
      this.connections = this.connections.filter((c) => c.from !== id && c.to !== id);
      persisted.delete(id);
      await api.deleteNote(id);
      return conns;
    },
    async _restoreNote(id, conns = []) {
      const note = await api.restoreNote(id);
      if (!this.notes.some((n) => n.id === note.id)) this.notes.push(note);
      snapshot(note);
      for (const c of conns) {
        const restored = await connectionApi.restoreConnection(c.id);
        if (!this.connections.some((x) => x.id === restored.id)) this.connections.push(restored);
      }
    },
    async _applyPatch(id, values) {
      const note = this.notes.find((n) => n.id === id);
      if (note) Object.assign(note, values);
      await api.updateNote(id, values);
      persisted.set(id, { ...(persisted.get(id) ?? {}), ...values });
    },
    async _deleteConnection(id) {
      this.connections = this.connections.filter((c) => c.id !== id);
      await connectionApi.deleteConnection(id);
    },
    async _restoreConnection(id) {
      const conn = await connectionApi.restoreConnection(id);
      if (!this.connections.some((c) => c.id === conn.id)) this.connections.push(conn);
    },

    /* ---- Public actions (record history) ---- */
    async add(position = null) {
      try {
        const note = await this._createNote(position);
        this.record({
          undo: () => this._deleteNote(note.id),
          redo: () => this._restoreNote(note.id),
        });
      } catch (err) {
        this.error = err.message;
      }
    },

    async remove(id) {
      try {
        const conns = await this._deleteNote(id);
        this.record({
          undo: () => this._restoreNote(id, conns),
          redo: () => this._deleteNote(id),
        });
      } catch (err) {
        this.error = err.message;
      }
    },

    // Update local state immediately; optionally persist + record an undo step.
    patch(id, patch, persist = true) {
      const note = this.notes.find((n) => n.id === id);
      if (!note) return;
      Object.assign(note, patch);
      if (!persist) return; // mid-drag: local only, no history

      // Record before/after for the meaningful keys that actually changed.
      const snap = persisted.get(id) ?? {};
      const before = {};
      const after = {};
      let changed = false;
      for (const k of Object.keys(patch)) {
        if (!HISTORY_KEYS.includes(k)) continue;
        if (snap[k] !== patch[k]) {
          before[k] = snap[k];
          after[k] = patch[k];
          changed = true;
        }
      }
      if (changed) {
        this.record({
          undo: () => this._applyPatch(id, before),
          redo: () => this._applyPatch(id, after),
        });
      }

      api.updateNote(id, patch).catch((err) => {
        this.error = err.message;
      });
      persisted.set(id, { ...snap, ...patch });
    },

    bringToFront(id) {
      const note = this.notes.find((n) => n.id === id);
      if (!note || note.z === this.maxZ) return;
      this.patch(id, { z: this.maxZ + 1 }); // z is excluded from history
    },

    async addConnection(from, to, fromSide = 'right', toSide = 'left') {
      if (!from || !to) return; // self-loops (from === to) are allowed
      // Skip only an exact duplicate (same endpoints AND sides, either direction).
      const exists = this.connections.some(
        (c) =>
          (c.from === from && c.to === to && c.fromSide === fromSide && c.toSide === toSide) ||
          (c.from === to && c.to === from && c.fromSide === toSide && c.toSide === fromSide),
      );
      if (exists) return;
      try {
        const connection = await connectionApi.createConnection({
          sheetId: this.sheetId,
          from,
          to,
          fromSide,
          toSide,
        });
        this.connections.push(connection);
        this.record({
          undo: () => this._deleteConnection(connection.id),
          redo: () => this._restoreConnection(connection.id),
        });
      } catch (err) {
        this.error = err.message;
      }
    },

    async removeConnection(id) {
      try {
        await this._deleteConnection(id);
        this.record({
          undo: () => this._restoreConnection(id),
          redo: () => this._deleteConnection(id),
        });
      } catch (err) {
        this.error = err.message;
      }
    },

    /* ---- Drawing strokes ---- */
    async _deleteStroke(id) {
      this.strokes = this.strokes.filter((s) => s.id !== id);
      await strokeApi.deleteStroke(id);
    },
    async _restoreStroke(id) {
      const stroke = await strokeApi.restoreStroke(id);
      if (!this.strokes.some((s) => s.id === stroke.id)) this.strokes.push(stroke);
    },

    async addStroke({ tool, color, width, points }) {
      // Optimistic: show the stroke immediately so it doesn't flash out on release.
      const temp = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        sheetId: this.sheetId,
        tool,
        color,
        width,
        points,
      };
      this.strokes.push(temp);
      try {
        const stroke = await strokeApi.createStroke({
          sheetId: this.sheetId,
          tool,
          color,
          width,
          points,
        });
        const i = this.strokes.findIndex((s) => s.id === temp.id);
        if (i !== -1) this.strokes[i] = stroke;
        else this.strokes.push(stroke);
        this.record({
          undo: () => this._deleteStroke(stroke.id),
          redo: () => this._restoreStroke(stroke.id),
        });
      } catch (err) {
        this.error = err.message;
        this.strokes = this.strokes.filter((s) => s.id !== temp.id); // roll back
      }
    },

    async removeStroke(id) {
      try {
        await this._deleteStroke(id);
        this.record({
          undo: () => this._restoreStroke(id),
          redo: () => this._deleteStroke(id),
        });
      } catch (err) {
        this.error = err.message;
      }
    },

    // Partial erase. The caller passes the already-computed final stroke list
    // (`next`, with temp-id fragments), the original ids to remove, and the temp
    // fragments to persist. `next` is committed synchronously (no flash); the
    // backend delete/create runs after and swaps temp ids for real ones.
    async commitErase(next, originalIds, tempPieces) {
      this.strokes = next; // definitive local result, applied immediately
      const created = [];
      try {
        for (const id of originalIds) await strokeApi.deleteStroke(id);
        for (const { tempId, piece } of tempPieces) {
          const stroke = await strokeApi.createStroke({ sheetId: this.sheetId, ...piece });
          const i = this.strokes.findIndex((s) => s.id === tempId);
          if (i !== -1) this.strokes[i] = stroke;
          created.push(stroke.id);
        }
        this.record({
          undo: async () => {
            for (const id of created) await this._deleteStroke(id);
            for (const id of originalIds) await this._restoreStroke(id);
          },
          redo: async () => {
            for (const id of originalIds) await this._deleteStroke(id);
            for (const id of created) await this._restoreStroke(id);
          },
        });
      } catch (err) {
        this.error = err.message;
      }
    },
  },
});

// Keep the running store in sync when this module is hot-reloaded in dev.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useNotesStore, import.meta.hot));
}
