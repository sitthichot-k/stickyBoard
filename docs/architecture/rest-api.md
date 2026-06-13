# REST API

Base URL: `/api/v1` (proxied to the backend). All responses are JSON; documents
are serialised with `id` (not `_id`).

Every request is logged server-side with a **business code** = HTTP status × 100
(e.g. `20000` success, `40400` not found, `50000` internal error), like:

```
[api] OK   20000 success — GET /api/v1/notes 12ms
[api] WARN 40400 not found — GET /api/v1/sheets/abc 4ms
```

Error responses include that code: `{ "code": 40400, "error": "..." }`.

## Auth

The whole app requires login (no public sign-up — users are seeded or created by
an admin). Protected endpoints need an `Authorization: Bearer <token>` header.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | body `{ email, password }` → `{ token, user }` (JWT) |
| GET | `/api/v1/auth/me` | current user (requires token) |

`health` and `auth/login` are public; **all other endpoints below require a
valid token**, and admin-only endpoints additionally require the `admin` role
(`401` without a token, `403` without the role).

## Admin (admin role required)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/admin/stats` | dashboard analytics — counts, top sheets, 14-day activity |
| GET | `/api/v1/admin/users` | list users |
| POST | `/api/v1/admin/users` | create a user — body `{ email, password, name?, role? }` |
| PATCH | `/api/v1/admin/users/:id/role` | set a user's role — body `{ role }` |
| DELETE | `/api/v1/admin/users/:id` | soft-delete a user → `204` |

Admins can't change their own role or delete their own account.

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/health` | `{ status: 'ok', uptime, timestamp }` |

## Sheets

A sheet is a board that owns its notes and arrows. Clients open a sheet before
working on notes.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/sheets` | list active sheets (newest first) |
| POST | `/api/v1/sheets` | create a sheet — body `{ name, background? }` |
| GET | `/api/v1/sheets/:id` | fetch one sheet |
| DELETE | `/api/v1/sheets/:id` | soft-delete the sheet **and its notes + arrows** → `204` |

`background` is one of `dots | grid | blank` (default `dots`). `name` is required.

## Notes

Notes belong to a sheet. List can be filtered by `?sheetId=`; create **requires**
`sheetId` in the body.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/notes?sheetId=:id` | list a sheet's active notes, ordered by stack (`z`, then `createdAt`) |
| POST | `/api/v1/notes` | create a note (body must include `sheetId`) |
| PATCH | `/api/v1/notes/:id` | partial update (move / resize / recolor / edit / raise) |
| DELETE | `/api/v1/notes/:id` | soft-delete the note **and its arrows** → `204` |
| POST | `/api/v1/notes/:id/restore` | undo a delete (clears `deletedAt`) → the note |

Writable fields: `content, x, y, z, width, height, color` (others ignored).

## Connections

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/connections?sheetId=:id` | list a sheet's active arrows (oldest first) |
| POST | `/api/v1/connections` | create an arrow — body `{ sheetId, from, to, fromSide?, toSide? }` |
| DELETE | `/api/v1/connections/:id` | soft-delete the arrow → `204` |
| POST | `/api/v1/connections/:id/restore` | undo a delete → the connection |

Notes on `POST /api/v1/connections`:
- `sheetId` is required (the arrow's sheet).
- `from` and `to` are required note ids.
- `from === to` is allowed (self-loop).
- `fromSide` / `toSide` are one of `top|bottom|left|right` (default `right`/`left`).

## Strokes

Freehand drawings on a sheet.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/strokes?sheetId=:id` | list a sheet's active strokes (oldest first) |
| POST | `/api/v1/strokes` | create a stroke — body `{ sheetId, points, tool?, color?, width? }` |
| DELETE | `/api/v1/strokes/:id` | soft-delete the stroke → `204` |
| POST | `/api/v1/strokes/:id/restore` | undo a delete → the stroke |

Notes on `POST /api/v1/strokes`:
- `sheetId` is required; `points` must be a flat array `[x0,y0,x1,y1,…]` with at least 2 coordinates.
- `tool` is one of `pencil|pen|brush` (default `pen`); `color`/`width` optional.

## Errors

Errors return `{ code: <businessCode>, error: "<message>" }` with an appropriate status
(`400` validation, `404` not found, `500` server). In non-production a `stack`
field is included.
