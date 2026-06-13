# Architecture Overview

Sticky Board is a small but full-stack whiteboard app: draggable sticky notes on
an infinite canvas, with arrows connecting them.

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | Vue 3 (`<script setup>`), Pinia, Vue Router, Vite, axios |
| Backend | Node 20, Express 4, Mongoose 8 (ESM modules) |
| Database | MongoDB 7 |
| Dev/Deploy | Docker Compose (single dev-primary file), multi-stage Dockerfiles, nginx (prod frontend) |

## High-level shape

```
Browser (Vue SPA)
   │  axios → /api
   ▼
Express API  ──►  Mongoose  ──►  MongoDB
 routes → controllers → services → models
```

- **Frontend** renders the board, handles all interaction (drag, pan, connect,
  resize, undo/redo), and talks to the API through a thin axios client.
- **Backend** is a conventional layered REST API. Business/data logic lives in
  *services*; controllers only do request/response plumbing.
- **MongoDB** stores `notes` and `connections`. Deletes are **soft** (a
  `deletedAt` marker) so they can be undone.

## Ports (defaults)

| Service | Host | Container |
| --- | --- | --- |
| Frontend | 8080 | 80 (nginx) / 80 (vite dev) |
| Backend | 8081 | 8081 |
| MongoDB | 27018 | 27017 |

All configurable via the root `.env` (consumed by `docker-compose.yml`).

## Where things live

```
backend/src/           Express API (see architecture/backend.md)
frontend/src/          Vue SPA   (see architecture/frontend.md)
docker-compose.yml     single dev-primary stack
docs/                  this documentation
```
