# PRD — Sticky Board

Product requirements for **Sticky Board**, a sticky-notes whiteboard. This is the
reference document for AI-flow prompts: every task cites a `Feature` and the
`FR` ids below. See [AI-flow/README.md](AI-flow/README.md).

- **Status legend:** ✅ Implemented · 🟡 Partial · ⬜ Planned
- New work that isn't covered here gets a new id `FR-NEW-00x` and should be added
  to this document as part of the change.

## 1. Vision & scope

A lightweight whiteboard where a user creates **sheets** (boards), drops sticky
notes on an infinite canvas, connects them with arrows, and edits freely — with
everything persisted and every action undoable.

**In scope:** multiple sheets, notes, arrows, undo/redo, theming.
**Out of scope (now):** authentication, real-time multi-user collaboration,
export/import, image/file attachments, comments.

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

### 3.7 Sheets — `Feature: Sheets`

A user can't reach the note board directly; they first create/open a **sheet**.
Each sheet owns its own notes and arrows and has a chosen background.

| FR | Requirement | Status |
| --- | --- | --- |
| FR-SHEET-001 | Landing page lists existing sheets and offers "Create blank sheet"; the note board is reachable only via a sheet. | ✅ |
| FR-SHEET-002 | Create a sheet with a name. | ✅ |
| FR-SHEET-003 | Choose a sheet background: `dots`, `grid`, or `blank`. | ✅ |
| FR-SHEET-004 | Open a sheet to its scoped note board. | ✅ |
| FR-SHEET-005 | Notes and connections belong to a sheet (scoped by `sheetId`). | ✅ |
| FR-SHEET-006 | Deleting a sheet removes its notes and arrows. | ✅ |
| FR-SHEET-007 | The board renders the sheet's chosen background. | ✅ |

### 3.6 Backend & persistence — `Feature: API`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-API-001 | REST API for notes, connections, and health (see [architecture/rest-api.md](architecture/rest-api.md)). | ✅ |
| FR-API-002 | Soft delete + restore for notes and connections. | ✅ |
| FR-API-003 | Shared base service (`createBaseService`) for CRUD modules. | ✅ |
| FR-API-004 | Seed script for sample data. | ✅ |

### 3.8 Drawing — `Feature: Drawing`

Freehand drawing on the sheet, alongside notes and arrows.

| FR | Requirement | Status |
| --- | --- | --- |
| FR-NEW-005a | A `draw` tool with three styles — pencil, pen, brush (differing width/opacity). | ✅ |
| FR-NEW-005b | Drag on the canvas to draw a freehand stroke; strokes persist per sheet. | ✅ |
| FR-NEW-005c | Strokes are scoped to a sheet and removed when the sheet is deleted. | ✅ |
| FR-NEW-005d | Drawing participates in undo/redo. | ✅ |
| FR-NEW-005e | Adjustable stroke thickness (slider) and an eraser tool (small/medium/large). | ✅ |
| FR-NEW-006 | Tooltips on every toolbox icon. | ✅ |

### 3.9 Board navigation — `Feature: Board nav`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-NEW-001 | "Create blank sheet" sits below the title (right-aligned); sheets page is left-aligned with a skeleton create card. | ✅ |
| FR-NEW-002 | Opening a sheet centres the view on the frame. | ✅ |
| FR-NEW-003 | Collapsible top-right minimap with notes + live viewport (click/drag to navigate). | ✅ |
| FR-NEW-004 | Zoom in/out (30–200%). | ✅ |

### 3.10 API infrastructure — `Feature: API infra`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-INFRA-001 | API is versioned under `/api/v1`. | ✅ |
| FR-INFRA-002 | Every request is logged with a business code (HTTP × 100); error responses include that `code`. | ✅ |

### 3.11 Merge PDF — `Feature: Merge PDF`

A sidebar tool that combines several PDFs into one. Client-side only (no upload,
no backend); no watermark while in development.

| FR | Requirement | Status |
| --- | --- | --- |
| FR-PDF-001 | Sidebar "Merge PDF" entry opens the tool at `/tools/merge-pdf`. | ✅ |
| FR-PDF-002 | Select (click or drag & drop) multiple PDF files; add more, remove individual ones. | ✅ |
| FR-PDF-003 | Reorder the files before merging. | ✅ |
| FR-PDF-004 | Merge into a single PDF and download it (client-side via `pdf-lib`). | ✅ |

### 3.12 Scan to PDF — `Feature: Scan to PDF`

A sidebar tool that combines image files into a single PDF. Client-side only.

| FR | Requirement | Status |
| --- | --- | --- |
| FR-SCAN-001 | Sidebar "Scan to PDF" entry opens the tool at `/tools/scan-pdf`. | ✅ |
| FR-SCAN-002 | Select (click or drag & drop) multiple image files (incl. HEIC/iOS), with thumbnails; add/remove. | ✅ |
| FR-SCAN-003 | Reorder images before exporting. | ✅ |
| FR-SCAN-004 | Export one PDF — each image centred and fit onto an A4 page (`pdf-lib`). | ✅ |

### 3.13 Auth — `Feature: Auth`

The whole app requires login. No public registration — users are created by an
admin (or seeded). Roles: `user` and `admin`.

| FR | Requirement | Status |
| --- | --- | --- |
| FR-AUTH-001 | User model: email, hashed password, name, role (`user`/`admin`). | ✅ |
| FR-AUTH-002 | `POST /auth/login` returns a JWT + user; `GET /auth/me` returns the current user. | ✅ |
| FR-AUTH-003 | Data endpoints require a valid token; admin endpoints require the `admin` role. | ✅ |
| FR-AUTH-004 | Frontend requires login for the whole app (route guard → `/login`); logout clears the session. | ✅ |
| FR-AUTH-005 | No public registration — users are seeded or created by an admin. | ✅ |

### 3.14 Admin — `Feature: Admin`

Admin-only user management (replaces public registration).

| FR | Requirement | Status |
| --- | --- | --- |
| FR-ADMIN-001 | Admin-only endpoints: list / create / set-role / delete users (can't affect own account). | ✅ |
| FR-ADMIN-002 | An Admin sidebar group, visible only to admins. | ✅ |
| FR-ADMIN-003 | Users page: list, create, change role, and remove users. | ✅ |

### 3.15 Dashboard — `Feature: Dashboard`

Admin-only analytics overview.

| FR | Requirement | Status |
| --- | --- | --- |
| FR-DASH-001 | `GET /admin/stats` returns counts, top sheets by notes, and a 14-day activity series. | ✅ |
| FR-DASH-002 | Admin Dashboard page: KPI cards + charts (in the Admin sidebar group). | ✅ |

> Build order: PDF tools (FR-PDF / FR-SCAN) first, then auth-gated admin
> features (FR-ADMIN / FR-DASH). See the roadmap discussion.

### 3.16 Settings — `Feature: Settings`

Admin-configurable app settings (no code change to update).

| FR | Requirement | Status |
| --- | --- | --- |
| FR-SET-001 | Generic key/value settings with defaults; `GET /settings` exposes public ones (e.g. a banner) to any signed-in user. | ✅ |
| FR-SET-002 | Admin can view all settings (`GET /settings/all`) and update one (`PUT /settings/:key`). | ✅ |
| FR-SET-003 | Admin Settings page; the site-wide announcement banner reflects the setting. | ✅ |

### 3.17 Logs — `Feature: Logs`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-LOG-001 | Persist event logs — semantic events (auth, user/settings changes) + every API request — with actor + metadata; auto-purge past a retention window. | ✅ |
| FR-LOG-002 | Admin Logs page: list + filter (level/search) + per-page. | ✅ |

### 3.18 Security (dynamic RBAC) — `Feature: Security`

Custom roles + a page/capability permission matrix, editable from the UI.

| FR | Requirement | Status |
| --- | --- | --- |
| FR-SEC-001 | Roles are data (custom roles allowed); each role × page holds a set of capabilities from a fixed catalog (view/edit/delete/action/owner/logs). | ✅ |
| FR-SEC-002 | Backend `requirePermission(page, capability)` and frontend guards/sidebar consult the matrix (admin role keeps full access). | ✅ |
| FR-SEC-003 | Admin Permission Matrix page: manage roles and toggle capabilities; assign users to any role. | ✅ |
| FR-SEC-004 | **Owner** mode: an owner-scoped role only sees boards it created (`Sheet.ownerId`). | ✅ |
| FR-SEC-005 | **Logs** capability: per page × role toggle for whether requests are persisted to the logs. | ✅ |

### 3.19 Observability & runtime config — `Feature: Config`

Deeper in-app insight + live-tunable controls (no hardware/host metrics — those
belong to infra monitoring).

| FR | Requirement | Status |
| --- | --- | --- |
| FR-OBS-001 | Dashboard performance panel from the request logs: latency p50/p95/p99, error rate, hourly throughput, status mix, top/slowest endpoints, rate-limit blocks, process self-metrics. | ✅ |
| FR-OBS-002 | 5xx errors persisted as `app.error` logs (message + stack in meta); Logs rows expand to show meta. | ✅ |
| FR-OBS-003 | Log retention via MongoDB TTL index (boot-synced) with interval-purge backup. | ✅ |
| FR-CFG-001 | Admin Config page: live toggles for rate limiting + traffic logging and an editable retention window (cached, applied without redeploy). | ✅ |
| FR-CFG-002 | Blocked-caller monitor with manual unblock. | ✅ |
| FR-CFG-003 | Admin-managed SMTP config (password encrypted at rest, write-only, send-test). | ✅ |

### 3.20 Account & auth flows — `Feature: Auth`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-AUTH-001 | Self-registration, gated by the `allowRegistration` toggle. | ✅ |
| FR-AUTH-002 | Email verification (one-time TTL token); login can require it via `requireEmailVerified` (admins exempt). | ✅ |
| FR-AUTH-003 | Password reset (forgot → emailed token → reset). | ✅ |
| FR-AUTH-004 | Account page: update profile + change password (verifies current). | ✅ |
| FR-AUTH-005 | Registration rejects fake/disposable emails; self-signups must verify before login. | ✅ |

### 3.21 Notifications — `Feature: Notification`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-NOTI-001 | Code-defined event catalog; admin-editable email templates with placeholders. | ✅ |
| FR-NOTI-002 | Matrix maps each action → template + on/off; modules call `notify()` (no hardcoded emails). | ✅ |
| FR-NOTI-003 | System emails (verify/reset) always send, template chosen in Config; seed-defaults with preview. | ✅ |

### 3.22 Cameras (RTSP → HLS) — `Feature: Camera`

| FR | Requirement | Status |
| --- | --- | --- |
| FR-CAM-001 | Manage RTSP cameras (CRUD); the credentialed URL is encrypted at rest and never returned. | ✅ |
| FR-CAM-002 | Server transcodes RTSP → HLS (ffmpeg, on demand + idle-reaped) and plays in-browser via hls.js. | ✅ |
| FR-CAM-003 | RBAC-gated (`admin-cameras`) + audited; URL only ever comes from the DB (no SSRF). | ✅ |

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
