# Frontend Architecture

Vue 3 SPA under `frontend/src/`, built with Vite. State in Pinia, routing in
Vue Router, HTTP via axios.

## Layout

```
main.js              app bootstrap (Pinia + Router + global CSS)
App.vue              shell: sidebar (brand + nav) + theme toggle + <RouterView>
router/index.js      routes (currently just the Board)
api/                 axios client + endpoint wrappers (http, notes, connections)
stores/notes.js      Pinia store — notes, connections, undo/redo history
views/BoardView.vue  the canvas: pan, tools, arrows, toolbox
components/
  StickyNote.vue     a single note: drag, edit, resize, recolor, link anchors
  ui/                BaseButton, BaseAlert
styles/              tokens.css (design tokens / theme) + main.css
```

## Shell & theming (`App.vue`)

- **Sidebar** holds the brand wordmark and navigation.
- **Theme toggle** (top-right) switches light/dark; the choice is persisted to
  `localStorage` and applied to `<html data-theme>` before paint.
- All colours come from CSS variables in `styles/tokens.css` (incl. a dynamic
  brand gradient and a dark theme). Change them in one place.

## The board (`views/BoardView.vue`)

A wide (4000×3000) pannable frame. A single `tool` state drives interaction:

| Tool | Behaviour |
| --- | --- |
| `select` | move / edit / resize / recolor notes (drag empty space pans) |
| `pan` | drag anywhere to pan; notes ignore pointer events |
| `connect` | drag from a note's anchor to another note to draw an arrow |

Plus an **Add note** action (drops a note at the centre of the current view) and
**undo/redo** buttons. Arrows are an SVG layer rendered *above* the notes;
routing is orthogonal (elbow) with self-loops drawn around the note's outside.

## State (`stores/notes.js`)

Single Pinia store owns `notes`, `connections`, and the undo/redo stacks.

- `patch(id, patch, persist)` — local update; when `persist` is true it saves to
  the API and records an undo step (live drag/resize updates pass
  `persist=false` so only the final value is persisted/recorded).
- Connection actions: `addConnection`, `removeConnection`.
- History: `record`, `undo`, `redo` (command pattern). See
  [../skill/undo-redo.md](../skill/undo-redo.md).

## API client (`api/`)

- `http.js` — axios instance (`baseURL` from `VITE_API_URL`, default `/api`) with
  a response interceptor that normalises error messages.
- `notes.js`, `connections.js` — one function per endpoint.

## Build scripts

```bash
npm run dev       # vite dev server (HMR)
npm run build     # production bundle → dist/
npm run preview   # serve the built bundle
```
