# Documentation

Developer documentation for **Sticky Board** — a sticky-notes whiteboard
(Vue 3 + Pinia frontend, Node/Express + MongoDB backend).

## Map

| Folder | What's inside |
| --- | --- |
| [architecture/](architecture/) | How the system is built — stack, layers, data model, REST API. |
| [skill/](skill/) | Reusable patterns/how-tos used across the codebase (CRUD module, soft delete, undo/redo). |
| [agents/](agents/) | Conventions & guardrails for AI agents / contributors working on the repo. |
| [AI-flow/](AI-flow/) | The phase-by-phase workflow for driving AI on this project (Backend → Frontend → Test/Docs). |

## Quick start

```bash
docker compose up --build                  # dev stack (hot reload)
docker compose exec backend npm run seed   # sample data
```

- Frontend → http://localhost:8080
- Backend API → http://localhost:8081/api/health

See the root [README](../README.md) for the non-Docker workflow.
