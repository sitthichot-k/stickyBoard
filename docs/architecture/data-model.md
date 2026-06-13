# Data Model

Three MongoDB collections: `sheets`, `notes`, and `connections`. All use Mongoose
`timestamps` and a `toJSON` transform that exposes `id` (instead of `_id`),
drops `__v`, and hides `deletedAt`.

A **sheet** is a board that owns its notes and arrows. Every note/connection
references its sheet via `sheetId`.

## Sheet

`backend/src/models/sheet.model.js`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `name` | String | — | required, max 120 chars |
| `background` | enum dots/grid/blank | `dots` | canvas background style |
| `deletedAt` | Date | `null` | soft-delete marker |
| `createdAt` / `updatedAt` | Date | — | from `timestamps` |

## Note

`backend/src/models/note.model.js`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `sheetId` | ObjectId (ref Sheet) | — | required — the owning sheet |
| `content` | String | `''` | max 2000 chars |
| `x`, `y` | Number | 40 | top-left position on the board (px) |
| `z` | Number | 1 | stacking order — higher is on top |
| `width`, `height` | Number | 220 | note size (px) |
| `color` | String | `#fff9c4` | background hex |
| `deletedAt` | Date | `null` | soft-delete marker (null = active) |
| `createdAt` / `updatedAt` | Date | — | from `timestamps` |

Writable fields from the client are whitelisted in the note controller
(`content, x, y, z, width, height, color`).

## Connection

`backend/src/models/connection.model.js` — an arrow from one note to another.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `sheetId` | ObjectId (ref Sheet) | — | required — the owning sheet |
| `from` | ObjectId (ref Note) | — | source note |
| `to` | ObjectId (ref Note) | — | target note (`from === to` ⇒ self-loop) |
| `fromSide` | enum top/bottom/left/right | `right` | edge the arrow leaves |
| `toSide` | enum top/bottom/left/right | `left` | edge the arrow enters |
| `deletedAt` | Date | `null` | soft-delete marker |
| `createdAt` / `updatedAt` | Date | — | from `timestamps` |

## Soft delete

Nothing is hard-deleted in normal operation. `delete` stamps `deletedAt`; all
reads filter `{ deletedAt: null }`. This makes **undo** trivial (clear the
marker, same id — no id remapping). Cascades: removing a note soft-deletes its
connections; removing a sheet soft-deletes its notes and connections. Details:
[../skill/soft-delete-and-restore.md](../skill/soft-delete-and-restore.md).
