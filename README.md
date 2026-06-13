# Sticky Board — Vue + Node + MongoDB

A whiteboard web app. Create **sheets**, drop sticky **notes** on an infinite
canvas, connect them with **arrows**, **draw** freehand, and zoom/pan around —
all persisted to MongoDB with full **undo/redo**. Ships with **login + roles**,
an **admin** area (user management + analytics dashboard), and two client-side
**PDF tools** (Merge PDF, Scan to PDF).

| Layer    | Stack                              | Port  |
| -------- | ---------------------------------- | ----- |
| Frontend | Vue 3 + Vite + Pinia + Vue Router  | 8080  |
| Backend  | Node + Express + Mongoose          | 8081  |
| Database | MongoDB                            | 27018 |

## Features

- **Board** — sheets (dots/grid/blank background), draggable & resizable notes,
  note-to-note arrows (4 anchors, elbow routing, self-loops), freehand drawing
  (pencil/pen/brush + eraser), pan, zoom (30–200%), and a collapsible minimap.
- **Undo / redo** — every action, persisted (built on soft-delete + restore).
- **Auth** — login-only (no public sign-up), JWT, `user`/`admin` roles; the
  whole app is behind a login guard.
- **Admin** — manage users (create / change role / delete) and a dashboard
  (KPIs + activity/top-sheet charts).
- **Tools** — Merge PDF and Scan to PDF (images→A4, incl. iOS HEIC), entirely
  in the browser.
- **API** — versioned under `/api/v1`, request logging with business codes.

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

frontend/src/
├── helpers/http.js   (axios client)        components/ (shared Base* UI)
├── router/  styles/  App.vue  main.js
└── modules/<feature>/   api/ · stores/ · components/ · views/
        auth · board · admin · tools
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

> No public registration — admins create users from **Admin → Users**.

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

Versioned under `/api/v1`. `health` and `auth/login` are public; everything else
needs an `Authorization: Bearer <token>`, and `/admin/*` needs the `admin` role.
Full reference: [docs/architecture/rest-api.md](docs/architecture/rest-api.md).

## Documentation

- [docs/](docs/) — architecture, data model, REST API, and how-to "skills".
- [docs/PRD-stickyNote.md](docs/PRD-stickyNote.md) — product requirements (FR ids).
- [docs/AI-flow/](docs/AI-flow/) — the phase-by-phase workflow used to build this.

## Extending

- **New backend module** → [docs/skill/creating-a-crud-module.md](docs/skill/creating-a-crud-module.md).
- **New page** → add a view under `frontend/src/modules/<feature>/views/` and a
  route in `frontend/src/router/index.js`.
- **Theme / colours** → `frontend/src/styles/tokens.css`.
- **Ports / secrets** → the root `.env` and `backend/.env` (`JWT_SECRET`, …).
