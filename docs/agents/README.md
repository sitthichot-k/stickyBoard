# Agent & Contributor Guide

Conventions and guardrails for AI agents (and humans) working on this repo. Read
this before making changes; it captures decisions that aren't obvious from the
code alone.

## Project in one paragraph

Sticky Board is a Vue 3 + Pinia SPA over a Node/Express + MongoDB REST API.
Users place sticky notes on a wide pannable canvas, connect them with arrows,
and can undo/redo. Deletes are soft. See [../architecture/overview.md](../architecture/overview.md).

## Golden rules

1. **Backend layering.** `routes → controllers → services → models`. Controllers
   never touch Mongoose directly — put data logic in a service.
2. **Reuse the base service.** New CRUD modules compose
   `createBaseService(model, options)` instead of hand-writing create/update/
   delete/search. See [../skill/creating-a-crud-module.md](../skill/creating-a-crud-module.md).
3. **Soft delete only.** Never hard-delete user data. Add a `deletedAt` field to
   new models and expose a `restore` so undo keeps working. See
   [../skill/soft-delete-and-restore.md](../skill/soft-delete-and-restore.md).
4. **Stable ids.** Undo/redo relies on ids never changing. Don't replace
   delete+recreate flows with new ids.
5. **Config in one place.** Backend config → `config/env.js`. Frontend theme/
   colours → `styles/tokens.css`. Compose/runtime values → root `.env`.
6. **No secrets in git.** `.env` files are gitignored; only `*.example` is
   committed. Don't commit real credentials, `node_modules`, or `dist/`.

## Frontend conventions

- Vue 3 `<script setup>`, single Pinia store for board state.
- A persisted action goes through `store.patch(id, patch, persist=true)`; live
  drag/resize uses `persist=false` (local only) and persists once on release.
- Keep interaction driven by the single `tool` state in `BoardView.vue`.

## Definition of done

- `cd frontend && npm run build` succeeds.
- Backend still loads: `cd backend && node -e "import('./src/app.js')"`.
- New endpoints documented in [../architecture/rest-api.md](../architecture/rest-api.md).
- No new secrets, `node_modules`, or build output staged for commit.

## Local commands

```bash
# Docker (dev, hot reload)
docker compose up --build
docker compose exec backend npm run seed

# Without Docker
cd backend  && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Gotchas

- `{ deletedAt: null }` reads are safe on models without the field, but the
  delete **write** only persists if the model declares `deletedAt` (Mongoose
  strict mode).
- Arrows render in an SVG layer **above** notes; self-loops route around the
  note's outside so they never cross the body.
- Theme is applied to `<html data-theme>` from `localStorage` before paint.
