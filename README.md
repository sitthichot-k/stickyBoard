# Sticky Board — Vue + Node admin / RBAC starter

A **Vue + Node + MongoDB starter** built around a dynamic, admin-configurable
control plane — with a **whiteboard** as the demo domain. The admin side (auth,
roles/permissions, config, logs, notifications) is app-agnostic: swap the
whiteboard for your own domain and keep everything else. See
[CUSTOMIZE.md](CUSTOMIZE.md).

| Layer    | Stack                              | Port  |
| -------- | ---------------------------------- | ----- |
| Frontend | Vue 3 + Vite + Pinia + Vue Router  | 8080  |
| Backend  | Node + Express + Mongoose          | 8081  |
| Database | MongoDB                            | 27018 |

## The control plane (the reusable core)

- **Dynamic RBAC** — custom roles + a **Permission Matrix** (per role × page:
  view/edit/delete/action/**owner**-scoping/**logs**); admin always passes.
- **Auth** — login, optional self-registration (fake/disposable-email blocked),
  email verification, password reset, and an account page. JWT.
- **Admin suite** — Dashboard (KPIs + request-log performance: p95/error-rate/
  throughput), Users, **Logs** (audit + 5xx capture + TTL retention),
  **Config** (live rate-limit/logging/retention/registration toggles, SMTP,
  blocked-IP monitor), **Notifications** (templates + event matrix), Settings
  (announcement banner), per-user **themes**.
- **Security** — rate limiting (flood + login brute-force), security headers,
  secrets encrypted at rest, regex-escaped search, prod-secret guard.
- **API docs** — Swagger UI at `/api/docs` ([guide](docs/architecture/swagger-guide.md)).
- **Tested** — Vitest unit + integration (mongodb-memory-server) + frontend, with
  GitHub Actions CI.

## Demo domain — the whiteboard

Sheets (dots/grid/blank), draggable/resizable notes, note-to-note arrows,
freehand drawing + eraser, pan/zoom, minimap, full **undo/redo**, and two
client-side **PDF tools** (Merge, Scan-to-PDF incl. iOS HEIC).

## Project structure

Both apps use a **feature-module** layout (see [docs/](docs/) for details).

```
backend/src/
├── config/      env.js · db.js
├── middleware/  auth · errorHandler · logger
├── helpers/     base.service.js          (shared CRUD factory)
├── routes/      app · routes (aggregator) · server · seed
└── modules/<feature>/   controller/ · models/ · service/ · <feature>.routes.js
        health · auth · user · admin · sheet · note · connection · stroke
        setting · log · security · notification

frontend/src/
├── helpers/http.js   (axios client)        components/ (shared Base* UI)
├── router/  styles/  App.vue  main.js
└── modules/<feature>/   api/ · stores/ · components/ · views/
        auth · board · admin · settings · config · logs · security
        notification · tools
```

## Run with Docker (dev — hot reload)

```bash
docker compose up --build                      # first run builds the dev images
docker compose exec backend npm run seed       # sample data + seed users
```

- Edit `backend/src` → **nodemon** restarts; edit `frontend/src` → **Vite HMR**.
- Only dependency changes (`package.json`) need `--build`.
- After moving/renaming files or changing `docker-compose.yml`, recreate:
  `docker compose up -d --force-recreate`.

Then open **http://localhost:8080** and sign in:

| Role  | Email                | Password    |
| ----- | -------------------- | ----------- |
| admin | `admin@example.com`  | `admin1234` |
| user  | `user@example.com`   | `user1234`  |

> Self-registration is **off by default** — admins create users from **Admin →
> Users**, and can enable public sign-up in **Config**.

### Production (built images, nginx)

Set the prod build targets in `docker-compose.yml` (`backend` → `target: prod`,
`frontend` → `target: serve`), drop the dev `command`/`volumes`, set a strong
`JWT_SECRET`, then `docker compose up --build`.

- Frontend → http://localhost:8080
- Backend health → http://localhost:8081/api/v1/health

## Run locally (without Docker)

```bash
# MongoDB must be running (the backend .env points at localhost:27017)
cd backend  && cp .env.example .env && npm install && npm run seed && npm run dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

## API

Versioned under `/api/v1`. `health`, `auth/login`, and `auth/register` are
public; everything else needs an `Authorization: Bearer <token>` and is gated by
the **permission matrix**. Interactive docs at **`/api/docs`** (Swagger), full
reference in [docs/architecture/rest-api.md](docs/architecture/rest-api.md).

## Tests

```bash
cd backend  && npm test   # unit + integration (mongodb-memory-server)
cd frontend && npm test   # vitest
```

CI (`.github/workflows/ci.yml`) runs both + the frontend build on every push/PR.

## Documentation

- [CUSTOMIZE.md](CUSTOMIZE.md) — **rebrand + swap the demo for your own domain**.
- [docs/](docs/) — architecture, data model, REST API, Swagger guide, skills.
- [docs/PRD-stickyNote.md](docs/PRD-stickyNote.md) — product requirements (FR ids).

## Extending

- **New backend module** → [docs/skill/creating-a-crud-module.md](docs/skill/creating-a-crud-module.md),
  then register its page in `backend/src/modules/security/catalog.js`.
- **New page** → a view + a route (`meta.page`) + a `navGroups` entry in `App.vue`.
- **Theme / colours** → `frontend/src/styles/tokens.css`.
- **Ports / secrets** → the root `.env` and `backend/.env` (`JWT_SECRET`,
  `MAIL_SECRET`, …).
- Full repurposing walkthrough: [CUSTOMIZE.md](CUSTOMIZE.md).
