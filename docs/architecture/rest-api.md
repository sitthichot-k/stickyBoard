# REST API

Base URL: `/api` (proxied to the backend). All responses are JSON; documents are
serialised with `id` (not `_id`).

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | `{ status: 'ok', uptime, timestamp }` |

## Sheets

A sheet is a board that owns its notes and arrows. Clients open a sheet before
working on notes.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/sheets` | list active sheets (newest first) |
| POST | `/api/sheets` | create a sheet — body `{ name, background? }` |
| GET | `/api/sheets/:id` | fetch one sheet |
| DELETE | `/api/sheets/:id` | soft-delete the sheet **and its notes + arrows** → `204` |

`background` is one of `dots | grid | blank` (default `dots`). `name` is required.

## Notes

Notes belong to a sheet. List can be filtered by `?sheetId=`; create **requires**
`sheetId` in the body.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/notes?sheetId=:id` | list a sheet's active notes, ordered by stack (`z`, then `createdAt`) |
| POST | `/api/notes` | create a note (body must include `sheetId`) |
| PATCH | `/api/notes/:id` | partial update (move / resize / recolor / edit / raise) |
| DELETE | `/api/notes/:id` | soft-delete the note **and its arrows** → `204` |
| POST | `/api/notes/:id/restore` | undo a delete (clears `deletedAt`) → the note |

Writable fields: `content, x, y, z, width, height, color` (others ignored).

## Connections

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/connections?sheetId=:id` | list a sheet's active arrows (oldest first) |
| POST | `/api/connections` | create an arrow — body `{ sheetId, from, to, fromSide?, toSide? }` |
| DELETE | `/api/connections/:id` | soft-delete the arrow → `204` |
| POST | `/api/connections/:id/restore` | undo a delete → the connection |

Notes on `POST /api/connections`:
- `sheetId` is required (the arrow's sheet).
- `from` and `to` are required note ids.
- `from === to` is allowed (self-loop).
- `fromSide` / `toSide` are one of `top|bottom|left|right` (default `right`/`left`).

## Errors

Errors return `{ error: "<message>" }` with an appropriate status
(`400` validation, `404` not found, `500` server). In non-production a `stack`
field is included.
