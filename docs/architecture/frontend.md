# Frontend Architecture

Vue 3 SPA under `frontend/src/`, built with Vite. State in Pinia, routing in
Vue Router, HTTP via axios.

## Layout (feature modules)

```
frontend/src/
├── main.js          app bootstrap (Pinia + Router + global CSS)
├── App.vue          shell: sidebar (brand + nav + user) + theme toggle + <RouterView>
├── router/index.js  routes + global auth guard ('/login' is the only public route)
├── styles/          tokens.css (theme) + main.css
├── helpers/http.js  central axios client (token attach + 401 handling)
├── components/      shared UI — BaseButton, BaseAlert
└── modules/<feature>/   (only the subfolders it needs)
    ├── api/         endpoint wrappers
    ├── stores/      Pinia stores
    ├── components/  feature-specific components
    └── views/       route pages (.vue)
```

Modules:

- **auth** — `LoginView`, `NoAccessView`, auth store (token + current user +
  resolved `permissions`, with `can`/`canAccess` helpers), auth api.
- **board** — `SheetsView`, `BoardView`, `StickyNote`; sheets + notes stores
  (notes/connections/strokes/undo-redo); sheets/notes/connections/strokes api.
- **admin** — `UsersView` (manage users), `DashboardView` (KPIs + SVG charts),
  admin api.
- **settings** — `SettingsView` (admin) + a settings store; drives the
  site-wide announcement banner in `App.vue`.
- **logs** — `LogsView` (admin): paginated event log with level/search filters.
- **security** — `SecurityView` (admin): the Permission Matrix — pick a group
  (role), toggle each page's capabilities, and manage custom roles; security api.
- **tools** — `MergePdfView`, `ScanPdfView` (client-side, standalone).

## Shell & theming (`App.vue`)

- **Sidebar** holds the brand wordmark and navigation. Nav items come from a
  config filtered by `auth.canAccess(page)`, so menus appear/disappear with the
  permission matrix (empty groups are hidden).
- **Route guards** — each route declares `meta.page`; the global guard checks
  `auth.canAccess` (admin always passes) and falls back to the boards page, or
  `NoAccessView` if the role can't open anything.
- **Theme toggle** (top-right) switches light/dark; the choice is persisted to
  `localStorage` and applied to `<html data-theme>` before paint.
- All colours come from CSS variables in `styles/tokens.css` (incl. a dynamic
  brand gradient and a dark theme). Change them in one place.

## The board (`modules/board/views/BoardView.vue`)

A wide (4000×3000) pannable frame. A single `tool` state drives interaction:

| Tool | Behaviour |
| --- | --- |
| `select` | move / edit / resize / recolor notes (drag empty space pans) |
| `pan` | drag anywhere to pan; notes ignore pointer events |
| `connect` | drag from a note's anchor to another note to draw an arrow |
| `draw` | freehand drawing (pencil/pen/brush, colour, adjustable thickness) |
| `eraser` | drag over strokes to remove them (small/medium/large) |

Notes, arrows, and strokes are all scoped to the open sheet and persist via the
store; there's also a collapsible minimap and zoom (30–200%).

Plus an **Add note** action (drops a note at the centre of the current view) and
**undo/redo** buttons. Arrows are an SVG layer rendered *above* the notes;
routing is orthogonal (elbow) with self-loops drawn around the note's outside.

## State (`modules/board/stores/notes.js`)

Single Pinia store owns `notes`, `connections`, and the undo/redo stacks.

- `patch(id, patch, persist)` — local update; when `persist` is true it saves to
  the API and records an undo step (live drag/resize updates pass
  `persist=false` so only the final value is persisted/recorded).
- Connection actions: `addConnection`, `removeConnection`.
- History: `record`, `undo`, `redo` (command pattern). See
  [../skill/undo-redo.md](../skill/undo-redo.md).

## API client (`helpers/http.js` + `modules/*/api/`)

- `helpers/http.js` — axios instance (`baseURL` from `VITE_API_URL`, default
  `/api/v1`), attaches the bearer token, normalises errors, and bounces to login
  on 401.
- Each module's `api/` has one function per endpoint (e.g.
  `modules/board/api/sheets.js`).

## Tools (standalone pages)

Client-side utilities that don't touch the board data model live under
`/tools/*` and appear in the sidebar's **Tools** group. They keep the shared
page shape: title top-left, working component centred.

- `modules/tools/views/MergePdfView.vue` — merge several PDFs into one, entirely
  in the browser (`pdf-lib`); supports click-to-pick and drag & drop.
- `modules/tools/views/ScanPdfView.vue` — combine images into one A4 PDF
  (`pdf-lib`); HEIC/HEIF (iOS) is decoded to JPEG via a lazy-loaded `heic2any`.

## Build scripts

```bash
npm run dev       # vite dev server (HMR)
npm run build     # production bundle → dist/
npm run preview   # serve the built bundle
```
