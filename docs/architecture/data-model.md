# Data Model

Two MongoDB collections: `notes` and `connections`. Both use Mongoose
`timestamps` and a `toJSON` transform that exposes `id` (instead of `_id`),
drops `__v`, and hides `deletedAt`.

## Note

`backend/src/models/note.model.js`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
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
| `from` | ObjectId (ref Note) | — | source note |
| `to` | ObjectId (ref Note) | — | target note (`from === to` ⇒ self-loop) |
| `fromSide` | enum top/bottom/left/right | `right` | edge the arrow leaves |
| `toSide` | enum top/bottom/left/right | `left` | edge the arrow enters |
| `deletedAt` | Date | `null` | soft-delete marker |
| `createdAt` / `updatedAt` | Date | — | from `timestamps` |

## Soft delete

Nothing is hard-deleted in normal operation. `delete` stamps `deletedAt`; all
reads filter `{ deletedAt: null }`. This makes **undo** trivial (clear the
marker, same id — no id remapping). When a note is removed, its connections are
soft-deleted too. Details:
[../skill/soft-delete-and-restore.md](../skill/soft-delete-and-restore.md).
