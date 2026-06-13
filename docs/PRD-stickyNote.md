# PRD — Sticky Board

Product requirements for **Sticky Board**, a sticky-notes whiteboard. This is the
reference document for AI-flow prompts: every task cites a `Feature` and the
`FR` ids below. See [AI-flow/README.md](AI-flow/README.md).

- **Status legend:** ✅ Implemented · 🟡 Partial · ⬜ Planned
- New work that isn't covered here gets a new id `FR-NEW-00x` and should be added
  to this document as part of the change.

## 1. Vision & scope

A lightweight, single-board whiteboard where a user drops sticky notes on an
infinite canvas, connects them with arrows, and edits freely — with everything
persisted and every action undoable.

**In scope:** one shared board, notes, arrows, undo/redo, theming.
**Out of scope (now):** authentication, multiple boards, real-time multi-user
collaboration, export/import, image/file attachments, comments.

## 2. Personas

- **Planner** — arranges ideas as notes and links them to show relationships.

## 3. Functional requirements

### 3.1 Board & canvas — `Feature: Board`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-BOARD-001 | Wide pannable canvas (4000×3000) with a dotted grid; drag empty space to pan. | ✅ |
| FR-BOARD-002 | Tool modes — `select`, `pan`, `connect` — switchable from a floating toolbox. | ✅ |
| FR-BOARD-003 | "Add note" places a note at the centre of the current viewport. | ✅ |
| FR-BOARD-004 | Show the current note count. | ✅ |

### 3.2 Notes — `Feature: Notes`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-NOTE-001 | Create a note. | ✅ |
| FR-NOTE-002 | Edit note text with debounced autosave (~400 ms). | ✅ |
| FR-NOTE-003 | Move a note by dragging its header. | ✅ |
| FR-NOTE-004 | Resize a note via a corner handle (min 140×120). | ✅ |
| FR-NOTE-005 | Recolor a note from a fixed swatch palette. | ✅ |
| FR-NOTE-006 | Delete a note (soft delete). | ✅ |
| FR-NOTE-007 | Bring a note to front when focused (stacking via `z`). | ✅ |

### 3.3 Connections (arrows) — `Feature: Connections`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-CONN-001 | In connect mode, show 4 anchors (top/bottom/left/right) per note. | ✅ |
| FR-CONN-002 | Drag an anchor onto another note to create an arrow; dropping on an anchor uses that side, otherwise the nearest side. | ✅ |
| FR-CONN-003 | Arrows route as straight orthogonal (elbow) paths based on the chosen sides. | ✅ |
| FR-CONN-004 | A note can connect to itself (self-loop), routed around the note's outside. | ✅ |
| FR-CONN-005 | Arrows render above notes (never hidden behind a note). | ✅ |
| FR-CONN-006 | Delete an arrow by clicking it. | ✅ |
| FR-CONN-007 | Deleting a note also removes its arrows. | ✅ |

### 3.4 History — `Feature: Undo/Redo`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-HIST-001 | Undo/redo buttons in the toolbox, disabled when nothing is available. | ✅ |
| FR-HIST-002 | Undo/redo covers add/remove/move/resize/recolor/text/connect/disconnect. | ✅ |
| FR-HIST-003 | Undo of a delete restores the same id (via soft-delete restore). | ✅ |
| FR-HIST-004 | Stacking (`z`) changes are excluded; text is one step per debounced save. | ✅ |

### 3.5 Theme & layout — `Feature: Theme/Layout`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-THEME-001 | Light/dark toggle in the top-right corner. | ✅ |
| FR-THEME-002 | Selected theme persists across reloads (localStorage), applied before paint. | ✅ |
| FR-THEME-003 | Centralised design tokens incl. a dynamic brand gradient. | ✅ |
| FR-LAYOUT-001 | Sidebar (brand + navigation) and a floating bottom toolbox. | ✅ |

### 3.6 Backend & persistence — `Feature: API`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-API-001 | REST API for notes, connections, and health (see [architecture/rest-api.md](architecture/rest-api.md)). | ✅ |
| FR-API-002 | Soft delete + restore for notes and connections. | ✅ |
| FR-API-003 | Shared base service (`createBaseService`) for CRUD modules. | ✅ |
| FR-API-004 | Seed script for sample data. | ✅ |

## 4. Non-functional requirements

| NFR | Requirement |
| --- | --- |
| NFR-001 | Runs via a single dev-primary `docker-compose.yml` (hot reload). |
| NFR-002 | `frontend` builds clean; `backend` loads without error. |
| NFR-003 | No secrets in the repo; `.env` gitignored, only `*.example` committed. |
| NFR-004 | Config centralised: backend `config/env.js`, theme `styles/tokens.css`, compose root `.env`. |

## 5. How to use this PRD with AI-flow

1. Pick a `Feature` and the `FR` ids the change touches.
2. Run one phase at a time: **Backend → Frontend → Test/Docs**.
3. Keep changes within the cited scope; finish with the 4-point summary.
4. For genuinely new behaviour, add an `FR-NEW-00x` row here in the same change.
