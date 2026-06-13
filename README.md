# Sticky Board — Vue + Node + MongoDB

A sticky-note board web app (built on a reusable full-stack template). Users can
add notes anywhere on the board, drag them around, edit the text, recolor them,
and delete them — all persisted to MongoDB.

| Layer    | Stack                              | Port |
| -------- | ---------------------------------- | ---- |
| Frontend | Vue 3 + Vite + Pinia + Vue Router  | 8080 |
| Backend  | Node + Express + Mongoose          | 8081 |
| Database | MongoDB                            | 27017 |

Each module is independently containerised so its environment can be controlled in isolation.

## Project structure

```
.
├── docker-compose.yml            # single stack — dev by default (mounts + hot reload)
├── .env.example                  # compose-level variables (ports, db name, …)
├── backend/
│   ├── Dockerfile                # multi-stage: dev (nodemon) | prod (node)
│   ├── .dockerignore / .env.example
│   └── src/
│       ├── server.js             # entry point (listen + graceful shutdown)
│       ├── app.js                # express app assembly
│       ├── config/               # env + mongoose connection
│       ├── routes/               # route definitions (health, notes)
│       ├── controllers/          # request/response handling
│       ├── services/             # business logic + DB queries (base.service.js + Note)
│       ├── models/               # mongoose schemas (Note)
│       ├── middleware/           # error handler, 404
│       └── seed.js               # sample notes
└── frontend/
    ├── Dockerfile                # multi-stage: dev (vite) | build | serve (nginx)
    ├── default.conf.template     # nginx: SPA fallback + /api proxy (port from env)
    ├── .dockerignore / .env.example
    └── src/
        ├── main.js / App.vue
        ├── router/ stores/ api/  # routing, pinia stores, axios client
        ├── styles/               # tokens.css (theme) + main.css
        ├── components/
        │   ├── StickyNote.vue     # draggable, editable note
        │   └── ui/                # Button, Alert
        └── views/                # Board (home)
```

## Run with Docker

### Development (hot reload — no rebuild on code changes)

`docker compose up` runs the single `docker-compose.yml`, which bind-mounts the
source folders and runs the dev servers with file watching:

```bash
docker compose up --build      # first run builds the dev images
docker compose exec backend npm run seed   # add sample data
```

- Edit anything under `backend/src` → **nodemon** restarts the server.
- Edit anything under `frontend/src` → **Vite HMR** updates the browser.
- Only changing dependencies (`package.json`) needs a rebuild.

### Production (built images, nginx)

For a production build, set the prod build targets in `docker-compose.yml`
(`backend` → `target: prod`, `frontend` → `target: serve`) and remove the dev
`command`/`volumes` from those services, then:

```bash
docker compose up --build
```

Then:

- Frontend → http://localhost:8080
- Backend API → http://localhost:8081/api/health
- MongoDB → localhost:27018

## Run locally (without Docker)

```bash
# 1. MongoDB must be running on localhost:27017

# 2. Backend
cd backend && cp .env.example .env && npm install
npm run seed      # populate sample notes
npm run dev       # http://localhost:8081

# 3. Frontend
cd ../frontend && cp .env.example .env && npm install
npm run dev       # http://localhost:8080
```

## Notes API

| Method | Path             | Purpose                              |
| ------ | ---------------- | ------------------------------------ |
| GET    | `/api/notes`     | list all notes                       |
| POST   | `/api/notes`     | create a note                        |
| PATCH  | `/api/notes/:id` | partial update (move / edit / color) |
| DELETE | `/api/notes/:id` | delete a note                        |

## Customising

- **Theme/colors** → `frontend/src/styles/tokens.css` (CSS variables; includes a dark theme).
- **Note colors** → the `COLORS` array in `frontend/src/stores/notes.js`.
- **New API resource** → add a model → service → controller → route, then mount it in `backend/src/routes/index.js`.
- **New page** → add a view in `frontend/src/views/` and a route in `frontend/src/router/index.js`.
- **Ports** → edit the root `.env` (`BACKEND_PORT`, `FRONTEND_PORT`, `MONGO_PORT`).
