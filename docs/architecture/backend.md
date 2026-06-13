# Backend Architecture

Express + Mongoose REST API under `backend/src/`. ESM (`"type": "module"`).

## Structure (feature modules)

```
backend/src/
├── routes/      app.js · routes.js (aggregator) · server.js · seed.js
├── config/      env.js · db.js
├── middleware/  auth.js · errorHandler.js · logger.js   (shared infra)
├── helpers/     base.service.js                         (shared code)
└── modules/<feature>/
    ├── controller/  <feature>.controller.js   parse request, shape response
    ├── models/      <feature>.model.js        Mongoose schema(s)
    ├── service/     <feature>.service.js       business logic + DB queries
    └── <feature>.routes.js                     URL → controller wiring (thin)
```

Each module bundles everything for one feature; a module only has the
subfolders it needs (e.g. `user` has just models/ + service/; `auth` has
controller/ + routes). Request flow: `routes → controller → service → models`.
Controllers never touch Mongoose directly; they call services. Cross-module
imports are allowed (e.g. `auth` uses the `user` service).

Modules: `health · auth · user · admin · sheet · note · connection · stroke`.

## Bootstrapping (`routes/`)

- `routes/server.js` — entry point: connects the DB, starts the HTTP server,
  handles graceful shutdown (SIGINT/SIGTERM).
- `routes/app.js` — assembles the Express app: a request logger, CORS, JSON body
  parsing, mounts the API under `/api/v1`, then the 404 + error middleware.
- `routes/routes.js` — aggregator: mounts every module router with the right
  auth guards (`requireAuth` / `requireAdmin`).
- `routes/seed.js` — sample data + seed admin (`npm run seed`).
- `config/env.js` — single source of config (`env`, `isProduction`).
- `config/db.js` — `connectDatabase()` / `disconnectDatabase()`.

## The base service pattern

`helpers/base.service.js` exports `createBaseService(model, options)` — a
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

## Auth

Login-only (no public sign-up). `POST /auth/login` verifies a bcrypt password and
returns a JWT; `middleware/auth.js` exposes `requireAuth` (verifies the bearer
token → `req.user`) and `requireAdmin` (role check). Data routes are mounted
behind `requireAuth` in `routes/routes.js`; admin routes also use `requireAdmin`.
Config lives in `config/env.js` (`jwt.secret`, `jwt.expiresIn`, seed admin).

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

## Logging & error handling

`middleware/logger.js` logs one line per request on `res.finish` with a business
code (HTTP status × 100, e.g. `20000`/`40400`) — invaluable for spotting what
failed and where during development.

`middleware/errorHandler.js` provides `notFound` (404 JSON) and `errorHandler`
(central handler — keeps all 4 args so Express recognises it). Both include the
business `code` in the JSON body; stack traces are added only outside production.

## Scripts

```bash
npm run dev    # nodemon
npm start      # node src/server.js
npm run seed   # populate sample notes
```
