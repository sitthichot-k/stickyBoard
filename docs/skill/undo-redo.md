# Skill: Undo / Redo

Implemented in `frontend/src/stores/notes.js` with a **command pattern** backed
by the soft-delete/restore API, so undo persists correctly to the server.

## Model

Two stacks of commands in the store:

```js
undoStack: []  // commands available to undo
redoStack: []  // commands available to redo
```

Each command is `{ undo(): Promise, redo(): Promise }`. A public action performs
its work, then pushes a command via `record()` (which clears `redoStack`).
`undo()` pops from `undoStack`, runs `command.undo()`, pushes to `redoStack`;
`redo()` is the mirror.

## What each action records

| Action | undo | redo |
| --- | --- | --- |
| add note | delete (soft) | restore |
| remove note | restore note **+ its arrows** | delete again |
| move / resize / recolor | patch back old values | patch new values |
| edit text | restore previous text | apply new text |
| add connection | delete connection | restore connection |
| remove connection | restore connection | delete connection |

## Capturing "before" values

`patch(id, patch, persist)` is called many times during a drag/resize with
`persist=false` (local only — no history). Only the final `persist=true` call
records history. To know the *previous* value at that point, the store keeps a
non-reactive `persisted` map (last-saved values per note) and diffs against it.

```js
// only meaningful, changed keys are recorded
const before = {}, after = {};
for (const k of Object.keys(patch)) {
  if (!HISTORY_KEYS.includes(k)) continue;     // z (stacking) is excluded
  if (snap[k] !== patch[k]) { before[k] = snap[k]; after[k] = patch[k]; }
}
```

## Why soft delete matters here

Undoing a delete (or redoing an add) restores the **same document id**. If we
hard-deleted and recreated, every id would change and connections referencing it
would break. Restore keeps ids stable. See
[soft-delete-and-restore.md](soft-delete-and-restore.md).

## Notes

- `z`/bring-to-front changes are excluded from history (avoids noise from merely
  clicking a note).
- Text edits are recorded per debounced save (~400 ms), not per keystroke.
- History is per session (a page reload starts a fresh history; data persists).
