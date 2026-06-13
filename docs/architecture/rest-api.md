# REST API

Base URL: `/api` (proxied to the backend). All responses are JSON; documents are
serialised with `id` (not `_id`).

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | `{ status: 'ok', uptime, timestamp }` |

## Notes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/notes` | list all active notes, ordered by stack (`z`, then `createdAt`) |
| POST | `/api/notes` | create a note |
| PATCH | `/api/notes/:id` | partial update (move / resize / recolor / edit / raise) |
| DELETE | `/api/notes/:id` | soft-delete the note **and its arrows** → `204` |
| POST | `/api/notes/:id/restore` | undo a delete (clears `deletedAt`) → the note |

Writable fields: `content, x, y, z, width, height, color` (others ignored).

## Connections

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/connections` | list all active arrows (oldest first) |
| POST | `/api/connections` | create an arrow — body `{ from, to, fromSide?, toSide? }` |
| DELETE | `/api/connections/:id` | soft-delete the arrow → `204` |
| POST | `/api/connections/:id/restore` | undo a delete → the connection |

Notes on `POST /api/connections`:
- `from` and `to` are required note ids.
- `from === to` is allowed (self-loop).
- `fromSide` / `toSide` are one of `top|bottom|left|right` (default `right`/`left`).

## Errors

Errors return `{ error: "<message>" }` with an appropriate status
(`400` validation, `404` not found, `500` server). In non-production a `stack`
field is included.
