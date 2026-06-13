# Backend Architecture

Express + Mongoose REST API under `backend/src/`. ESM (`"type": "module"`).

## Layers

```
routes/        URL → controller wiring (thin)
controllers/   parse request, shape response, call a service
services/      business logic + DB queries (the real work)
models/        Mongoose schemas
middleware/    cross-cutting: error handler, 404
config/        env loading, Mongoose connection
```

Request flow: `routes → controllers → services → models`. Controllers never
touch Mongoose directly; they call services.

## Bootstrapping

- `server.js` — entry point: connects the DB, starts the HTTP server, handles
  graceful shutdown (SIGINT/SIGTERM).
- `app.js` — assembles the Express app: CORS, JSON body parsing, mounts `/api`
  routes, then the 404 + error middleware (registered last).
- `config/env.js` — single source of config, read from environment with sane
  defaults. Exposes `env` and `isProduction`.
- `config/db.js` — `connectDatabase()` / `disconnectDatabase()`.

## The base service pattern

`services/base.service.js` exports `createBaseService(model, options)` — a
factory that returns the five operations every module needs:

| Method | Behaviour |
| --- | --- |
| `create(payload)` | insert one |
| `update(id, payload)` | update one (returns updated doc) |
| `delete(id)` | **soft** delete — stamps `deletedAt` |
| `searchOne(id)` | find one non-deleted doc |
| `searchAll({ page, limit, search, sort, filters })` | paginated, searchable, sortable list |

Feature services compose it instead of re-implementing CRUD. See
[../skill/creating-a-crud-module.md](../skill/creating-a-crud-module.md).

## Feature modules

- **notes** — the sticky notes. `note.service.js` wraps the base service; it
  keeps a custom `listNotes()` (board shows all notes, ordered by stack `z`).
- **connections** — arrows between notes (`from`/`to` + `fromSide`/`toSide`).
  Built on the base service. Deleting a note also soft-deletes its arrows
  (`deleteConnectionsForNote`).
- **health** — `GET /api/health` liveness probe.

Both notes and connections expose a `restore` operation (clears `deletedAt`)
that powers frontend undo. See
[../skill/soft-delete-and-restore.md](../skill/soft-delete-and-restore.md).

## Error handling

`middleware/errorHandler.js` provides `notFound` (404 JSON) and `errorHandler`
(central handler — keeps all 4 args so Express recognises it). Stack traces are
included only when not in production.

## Scripts

```bash
npm run dev    # nodemon
npm start      # node src/server.js
npm run seed   # populate sample notes
```
