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

Modules: `health · auth · user · admin · sheet · note · connection · stroke ·
setting · log · security`.

## Bootstrapping (`routes/`)

- `routes/server.js` — entry point: connects the DB, starts the HTTP server
  (also ensures the system roles + default permission matrix and starts log
  cleanup), handles graceful shutdown (SIGINT/SIGTERM).
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
token → `req.user`) and `requireAdmin` (role check, used only for the sensitive
`/security` config surface). Data routes are mounted behind `requireAuth` in
`routes/routes.js`. Config lives in `config/env.js` (`jwt.secret`,
`jwt.expiresIn`, seed admin).

## Authorisation — dynamic RBAC (`security` module)

Access is data-driven, not hardcoded. The `security` module owns a `Role`
collection (system roles `admin`/`user` + custom roles) and a `Permission`
collection — one row per role × page holding a `granted` list of capabilities
(`view/edit/delete/action/owner/logs`). A static page catalogue
(`security/catalog.js`) maps Vue route names and API path prefixes to pages.

- `middleware/permission.js` `requirePermission(page, capability)` gates each
  route via the matrix; the **admin role always passes**.
- **Owner mode** — when a role has the `owner` capability on the boards page, the
  sheet list/getOne scope to `Sheet.ownerId` (a user only sees boards they made);
  board notes/arrows/strokes inherit this since they need a reachable `sheetId`.
- **Logs capability** — `middleware/logger.js` only persists a request when the
  acting role has `logs` on the request's page (health + the log endpoint stay
  always-skipped).
- On boot the server ensures the system roles and seeds the default matrix once
  (idempotent), so a fresh DB works without `npm run seed`.
- `/auth/login` + `/auth/me` return the role's resolved `permissions` map so the
  SPA can drive its guards and sidebar.

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
failed and where during development. It also **persists every API request to the
`log` collection** (the dynamic **Logs** capability per page can opt a page out);
the `log` module additionally records semantic audit events (`auth.login`,
`user.*`, `runtime.update`, `ratelimit.blocked`, …). Retention is enforced by a
**MongoDB TTL index** (`ensureLogTtlIndex`, re-synced on boot) with the daily
interval purge as a backup.

`middleware/errorHandler.js` provides `notFound` (404 JSON) and `errorHandler`
(central handler — keeps all 4 args so Express recognises it). Both include the
business `code` in the JSON body; stack traces are added only outside production.
**5xx errors are also persisted** as an `app.error` log (message + method/path +
stack in `meta`) so admins can diagnose from the Logs page.

## Observability & runtime config

- **Performance** — `admin/service/performance.service.js` derives latency
  (p50/p95/p99 via `$percentile`), error rate, hourly throughput, status mix, and
  top/slowest endpoints from the `api.request` logs (plus process self-metrics),
  surfaced at `GET /admin/performance`.
- **Runtime controls** — `setting/service/runtime.service.js` holds
  admin-tunable flags (`rateLimitEnabled`, `logApiTraffic`, `logRetentionDays`)
  persisted in settings and cached in memory so the rate limiter and logger read
  them synchronously; changes apply live (Config page → `/settings/runtime`),
  with `config/*` holding the env-derived fallbacks. The rate limiter exposes a
  blocked-callers list + manual unblock.

## Scripts

```bash
npm run dev    # nodemon
npm start      # node src/server.js
npm run seed   # populate sample notes
```
