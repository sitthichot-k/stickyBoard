# Data Model

Four MongoDB collections: `sheets`, `notes`, `connections`, and `strokes`. All
use Mongoose `timestamps` and a `toJSON` transform that exposes `id` (instead of
`_id`), drops `__v`, and hides `deletedAt`.

A **sheet** is a board that owns its notes, arrows, and drawings. Every
note/connection/stroke references its sheet via `sheetId`.

A separate `users` collection backs authentication, a `settings` collection
holds admin-configurable key/value app settings, and a `logs` collection stores
audit/event records. Dynamic RBAC adds `roles` (groups) and `permissions` (the
role × page matrix). See below.

## User

`backend/src/modules/user/models/user.model.js`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `email` | String | — | required, unique, lowercased |
| `passwordHash` | String | — | bcrypt hash (never exposed in `toJSON`) |
| `name` | String | `''` | display name |
| `role` | String | `user` | references a `Role.key` (validated against the roles collection; custom roles allowed) |
| `deletedAt` | Date | `null` | soft-delete marker |

## Role

`backend/src/modules/security/models/role.model.js` — a group users belong to.
System roles (`admin`, `user`) always exist; admins can add custom roles.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `key` | String | — | required, unique slug — referenced by `User.role` + permissions |
| `name` | String | — | display name |
| `description` | String | `''` | optional |
| `isSystem` | Boolean | `false` | system roles can't be renamed/deleted |
| `deletedAt` | Date | `null` | soft-delete marker |

## Permission

`backend/src/modules/security/models/permission.model.js` — one row per
(role × page); the admin role is implicitly full-access and not stored.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `roleKey` | String | — | the role this rule applies to |
| `pageKey` | String | — | a page from the catalog (`backend/src/modules/security/catalog.js`) |
| `granted` | [String] | `[]` | capabilities turned on: `view/edit/delete/action/owner/logs` |

Unique on `{ roleKey, pageKey }`. Capabilities: `view/edit/delete/action`
gate access; `owner` scopes a role to its own boards; `logs` toggles whether
the page's requests are persisted to the logs.

## Setting

`backend/src/modules/setting/models/setting.model.js` — admin-configurable
key/value app settings (upserted; no soft delete).

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `key` | String | — | required, unique (e.g. `announcement`, `runtime`) |
| `value` | Mixed | `{}` | merged with code defaults on read |

The `runtime` key stores the live-tunable controls (`rateLimitEnabled`,
`logApiTraffic`, `logRetentionDays`) read by the Config page + middleware.

## Log

`backend/src/modules/log/models/log.model.js` — append-only audit/event log.
Retention is enforced by a MongoDB **TTL index** on `createdAt`
(`LOG_RETENTION_DAYS`, re-synced on boot) with a daily interval purge as backup.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `level` | enum info/warn/error | `info` | severity |
| `action` | String | — | e.g. `auth.login`, `user.create`, `api.request` |
| `message` | String | `''` | human-readable summary |
| `userId` | ObjectId (ref User) | `null` | actor |
| `userEmail` | String | `''` | denormalised actor email |
| `meta` | Mixed | `{}` | extra context (method/path/status, target id, …) |

## Sheet

`backend/src/modules/sheet/models/sheet.model.js`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `name` | String | — | required, max 120 chars |
| `background` | enum dots/grid/blank | `dots` | canvas background style |
| `ownerId` | ObjectId (ref User) | `null` | the creator — drives owner mode (null for pre-ownership data) |
| `deletedAt` | Date | `null` | soft-delete marker |
| `createdAt` / `updatedAt` | Date | — | from `timestamps` |

## Note

`backend/src/modules/note/models/note.model.js`

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

`backend/src/modules/connection/models/connection.model.js` — an arrow from one note to another.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `sheetId` | ObjectId (ref Sheet) | — | required — the owning sheet |
| `from` | ObjectId (ref Note) | — | source note |
| `to` | ObjectId (ref Note) | — | target note (`from === to` ⇒ self-loop) |
| `fromSide` | enum top/bottom/left/right | `right` | edge the arrow leaves |
| `toSide` | enum top/bottom/left/right | `left` | edge the arrow enters |
| `deletedAt` | Date | `null` | soft-delete marker |
| `createdAt` / `updatedAt` | Date | — | from `timestamps` |

## Stroke

`backend/src/modules/stroke/models/stroke.model.js` — a freehand drawing on a sheet.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `sheetId` | ObjectId (ref Sheet) | — | required — the owning sheet |
| `tool` | enum pencil/pen/brush | `pen` | drawing style (width/opacity) |
| `color` | String | `#1f2937` | stroke colour |
| `width` | Number | 3 | stroke thickness (px), min 1 |
| `points` | [Number] | `[]` | flat path `[x0,y0,x1,y1,…]` in frame space |
| `deletedAt` | Date | `null` | soft-delete marker |
| `createdAt` / `updatedAt` | Date | — | from `timestamps` |

## Soft delete

Nothing is hard-deleted in normal operation. `delete` stamps `deletedAt`; all
reads filter `{ deletedAt: null }`. This makes **undo** trivial (clear the
marker, same id — no id remapping). Cascades: removing a note soft-deletes its
connections; removing a sheet soft-deletes its notes, connections, and strokes. Details:
[../skill/soft-delete-and-restore.md](../skill/soft-delete-and-restore.md).
