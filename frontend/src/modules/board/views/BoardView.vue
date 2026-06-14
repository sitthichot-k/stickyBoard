<script setup>
import { computed, onMounted, onUnmounted, nextTick, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotesStore } from '@/modules/board/stores/notes.js';
import { useSheetsStore } from '@/modules/board/stores/sheets.js';
import StickyNote from '@/modules/board/components/StickyNote.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const route = useRoute();
const router = useRouter();
const store = useNotesStore();
const sheets = useSheetsStore();
const { notes, connections, strokes, loading, error, colors, canUndo, canRedo } = storeToRefs(store);
const { current: sheet } = storeToRefs(sheets);

const bgClass = computed(() => `bg-${sheet.value?.background || 'dots'}`);

const FRAME_W = 4000;
const FRAME_H = 3000;
const NOTE_HALF = 110; // half of the default 220px note

/* ---- Zoom & viewport tracking ---- */
const boardEl = ref(null);
const zoom = ref(1);
const ZMIN = 0.3;
const ZMAX = 2;
// Live viewport (kept reactive for the minimap).
const scrollX = ref(0);
const scrollY = ref(0);
const viewW = ref(0);
const viewH = ref(0);

function syncView() {
  const el = boardEl.value;
  if (!el) return;
  scrollX.value = el.scrollLeft;
  scrollY.value = el.scrollTop;
  viewW.value = el.clientWidth;
  viewH.value = el.clientHeight;
}

function centerView() {
  const el = boardEl.value;
  if (!el) return;
  el.scrollLeft = (FRAME_W * zoom.value - el.clientWidth) / 2;
  el.scrollTop = (FRAME_H * zoom.value - el.clientHeight) / 2;
  syncView();
}

function applyZoom(next) {
  const el = boardEl.value;
  if (!el) return;
  const z0 = zoom.value;
  const z1 = Math.min(ZMAX, Math.max(ZMIN, Math.round(next * 100) / 100));
  if (z1 === z0) return;
  // Keep the current viewport center fixed (in frame coordinates).
  const cx = (el.scrollLeft + el.clientWidth / 2) / z0;
  const cy = (el.scrollTop + el.clientHeight / 2) / z0;
  zoom.value = z1;
  nextTick(() => {
    el.scrollLeft = cx * z1 - el.clientWidth / 2;
    el.scrollTop = cy * z1 - el.clientHeight / 2;
    syncView();
  });
}
const zoomIn = () => applyZoom(zoom.value + 0.2);
const zoomOut = () => applyZoom(zoom.value - 0.2);
const zoomReset = () => applyZoom(1);

onMounted(async () => {
  const sheetId = route.params.id;
  const found = await sheets.open(sheetId);
  if (!found) return router.replace('/');
  await store.load(sheetId);
  await nextTick();
  centerView(); // start in the middle of the sheet
  window.addEventListener('resize', syncView);
});
onUnmounted(() => window.removeEventListener('resize', syncView));

/* ---- Tools ---- */
const tool = ref('select');
const tools = [
  { id: 'select', icon: '🖱️', label: 'Select & move' },
  { id: 'pan', icon: '✋', label: 'Pan the board' },
  { id: 'connect', icon: '🔗', label: 'Connect notes' },
  { id: 'draw', icon: '✏️', label: 'Draw' },
  { id: 'eraser', icon: '🧽', label: 'Eraser' },
];

/* ---- Drawing (draw tool) ---- */
const STROKE_STYLES = {
  pencil: { width: 2, opacity: 0.7 },
  pen: { width: 3, opacity: 1 },
  brush: { width: 9, opacity: 0.85 },
};
const drawTools = [
  { id: 'pencil', icon: '✏️', label: 'Pencil' },
  { id: 'pen', icon: '🖊️', label: 'Pen' },
  { id: 'brush', icon: '🖌️', label: 'Brush' },
];
const drawColors = ['#1f2937', '#dc2626', '#2563eb', '#16a34a', '#d97706'];
const drawTool = ref('pen');
const drawColor = ref('#1f2937');
const drawWidth = ref(STROKE_STYLES.pen.width); // adjustable thickness
const drawing = ref(null); // current stroke: { points: [x,y,...] } in frame coords

// Picking a pencil/pen/brush resets thickness to that style's default.
function selectDrawTool(id) {
  drawTool.value = id;
  drawWidth.value = STROKE_STYLES[id].width;
}

// Eraser sizes (radius in frame px) — small / medium / large.
const eraserSizes = [
  { id: 's', label: 'Small', r: 10 },
  { id: 'm', label: 'Medium', r: 20 },
  { id: 'l', label: 'Large', r: 34 },
];
const eraserSize = ref(20);

function strokeOpacity(t) {
  return STROKE_STYLES[t]?.opacity ?? 1;
}
function pointsToPath(points) {
  let d = `M ${points[0]},${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += ` L ${points[i]},${points[i + 1]}`;
  return d;
}

function startStroke(e) {
  const p = toFrame(e.clientX, e.clientY);
  drawing.value = { points: [p.x, p.y] };
  boardEl.value.setPointerCapture(e.pointerId);
}
function extendStroke(e) {
  const p = toFrame(e.clientX, e.clientY);
  drawing.value.points.push(p.x, p.y);
}
function finishStroke(e) {
  boardEl.value.releasePointerCapture(e.pointerId);
  const points = drawing.value.points;
  drawing.value = null;
  if (points.length >= 4) {
    store.addStroke({
      tool: drawTool.value,
      color: drawColor.value,
      width: drawWidth.value,
      points,
    });
  }
}

/* ---- Eraser (eraser tool): partial erase that splits strokes ---- */
const erasing = ref(false);
const eraseTick = ref(0); // bump to recompute the live erase preview
let eraseOriginals = []; // snapshot of strokes at gesture start
let eraseMasks = null; // Map(strokeId -> boolean[] per point — true = erased)
let eraseLast = null;

function markErase(p) {
  const reach = eraserSize.value * eraserSize.value;
  for (const o of eraseOriginals) {
    const mask = eraseMasks.get(o.id);
    const pts = o.points;
    for (let i = 0; i < pts.length; i += 2) {
      if (mask[i / 2]) continue;
      const dx = pts[i] - p.x;
      const dy = pts[i + 1] - p.y;
      if (dx * dx + dy * dy <= reach) mask[i / 2] = true;
    }
  }
}
function survivingRuns(points, mask) {
  const runs = [];
  let cur = [];
  for (let i = 0; i < points.length; i += 2) {
    if (mask[i / 2]) {
      if (cur.length >= 4) runs.push(cur);
      cur = [];
    } else {
      cur.push(points[i], points[i + 1]);
    }
  }
  if (cur.length >= 4) runs.push(cur);
  return runs;
}
function startErase(e) {
  erasing.value = true;
  eraseOriginals = strokes.value.map((s) => ({
    id: s.id,
    tool: s.tool,
    color: s.color,
    width: s.width,
    points: s.points,
  }));
  eraseMasks = new Map(eraseOriginals.map((o) => [o.id, new Array(o.points.length / 2).fill(false)]));
  eraseLast = null;
  boardEl.value.setPointerCapture(e.pointerId);
  eraseMove(e);
}
function eraseMove(e) {
  const p = toFrame(e.clientX, e.clientY);
  if (eraseLast) {
    // Sample along the movement so fast drags don't leave gaps.
    const dx = p.x - eraseLast.x;
    const dy = p.y - eraseLast.y;
    const steps = Math.max(1, Math.floor(Math.hypot(dx, dy) / (eraserSize.value / 2)));
    for (let i = 1; i <= steps; i++) {
      markErase({ x: eraseLast.x + (dx * i) / steps, y: eraseLast.y + (dy * i) / steps });
    }
  } else {
    markErase(p);
  }
  eraseLast = p;
  eraseTick.value++;
}
function endErase(e) {
  boardEl.value.releasePointerCapture(e.pointerId);
  // Build the final stroke list: untouched strokes kept, touched ones replaced
  // by their surviving fragments (temp ids until persisted).
  const next = [];
  const originalIds = [];
  const tempPieces = [];
  for (const s of strokes.value) {
    const mask = eraseMasks.get(s.id);
    if (!mask || !mask.some(Boolean)) {
      next.push(s);
      continue;
    }
    originalIds.push(s.id);
    for (const points of survivingRuns(s.points, mask)) {
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const piece = { tool: s.tool, color: s.color, width: s.width, points };
      next.push({ id: tempId, sheetId: s.sheetId, ...piece });
      tempPieces.push({ tempId, piece });
    }
  }
  // Commit the final result synchronously, THEN drop the live preview.
  if (originalIds.length) store.commitErase(next, originalIds, tempPieces);
  erasing.value = false;
  eraseOriginals = [];
  eraseMasks = null;
  eraseLast = null;
}

// Strokes to render — during an erase, touched strokes show only their survivors.
const renderStrokes = computed(() => {
  eraseTick.value; // reactive dependency
  const out = [];
  for (const s of strokes.value) {
    const mask = erasing.value && eraseMasks ? eraseMasks.get(s.id) : null;
    const style = { color: s.color, width: s.width, opacity: strokeOpacity(s.tool) };
    if (!mask || !mask.some(Boolean)) {
      out.push({ key: s.id, d: pointsToPath(s.points), ...style });
    } else {
      survivingRuns(s.points, mask).forEach((run, i) =>
        out.push({ key: `${s.id}-${i}`, d: pointsToPath(run), ...style }),
      );
    }
  }
  return out;
});

/* ---- Cursor: reflect the active tool ---- */
function svgCursor(emoji) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><text y='22' font-size='22'>${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 24, crosshair`;
}
const DRAW_CURSORS = {
  pencil: svgCursor('✏️'),
  pen: svgCursor('🖊️'),
  brush: svgCursor('🖌️'),
};
const boardCursor = computed(() => {
  if (tool.value === 'draw') return DRAW_CURSORS[drawTool.value];
  if (tool.value === 'eraser') return 'none'; // shown as a circle indicator instead
  return null;
});
const cursorPos = ref({ x: 0, y: 0 });
const cursorHover = ref(false);

/* ---- Pan: drag the canvas to move around the frame ---- */
const panning = ref(false);
let pan = null;

function onBoardDown(e) {
  if (e.button !== 0) return;
  if (tool.value === 'draw') return startStroke(e);
  if (tool.value === 'eraser') return startErase(e);
  if (tool.value !== 'pan' && e.target.closest('.note')) return;
  panning.value = true;
  pan = { x: e.clientX, y: e.clientY, left: boardEl.value.scrollLeft, top: boardEl.value.scrollTop };
  boardEl.value.setPointerCapture(e.pointerId);
}
function onBoardMove(e) {
  // Track the pointer for the tool cursor indicator (eraser circle).
  const r = boardEl.value.getBoundingClientRect();
  cursorPos.value = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (drawing.value) return extendStroke(e);
  if (erasing.value) return eraseMove(e);
  if (!pan) return;
  boardEl.value.scrollLeft = pan.left - (e.clientX - pan.x);
  boardEl.value.scrollTop = pan.top - (e.clientY - pan.y);
}
function onBoardUp(e) {
  if (drawing.value) return finishStroke(e);
  if (erasing.value) return endErase(e);
  if (!pan) return;
  boardEl.value.releasePointerCapture(e.pointerId);
  pan = null;
  panning.value = false;
}

// Add a note at the centre of the current view (in frame coordinates).
function addNote() {
  const el = boardEl.value;
  if (!el) return store.add();
  store.add({
    x: (el.scrollLeft + el.clientWidth / 2) / zoom.value - NOTE_HALF,
    y: (el.scrollTop + el.clientHeight / 2) / zoom.value - NOTE_HALF,
  });
}

/* ---- Arrows between notes ---- */
const noteById = computed(() => Object.fromEntries(notes.value.map((n) => [n.id, n])));
const STUB = 24;

function anchor(note, side) {
  const { x, y, width: w, height: h } = note;
  switch (side) {
    case 'top':
      return { x: x + w / 2, y, dir: { x: 0, y: -1 } };
    case 'bottom':
      return { x: x + w / 2, y: y + h, dir: { x: 0, y: 1 } };
    case 'left':
      return { x, y: y + h / 2, dir: { x: -1, y: 0 } };
    default:
      return { x: x + w, y: y + h / 2, dir: { x: 1, y: 0 } };
  }
}

function elbow(a, b, ad, bd) {
  const aH = ad.x !== 0;
  const bH = bd.x !== 0;
  if (aH && bH) {
    const mx = (a.x + b.x) / 2;
    return [{ x: mx, y: a.y }, { x: mx, y: b.y }];
  }
  if (!aH && !bH) {
    const my = (a.y + b.y) / 2;
    return [{ x: a.x, y: my }, { x: b.x, y: my }];
  }
  if (aH && !bH) return [{ x: b.x, y: a.y }];
  return [{ x: a.x, y: b.y }];
}

function toPath(points) {
  return 'M ' + points.map((p) => `${p.x},${p.y}`).join(' L ');
}

function orthoPath(s, t) {
  const s2 = { x: s.x + s.dir.x * STUB, y: s.y + s.dir.y * STUB };
  const t2 = { x: t.x + t.dir.x * STUB, y: t.y + t.dir.y * STUB };
  return toPath([{ x: s.x, y: s.y }, s2, ...elbow(s2, t2, s.dir, t.dir), t2, { x: t.x, y: t.y }]);
}

const SIDE_IDX = { top: 0, right: 1, bottom: 2, left: 3 };
const CW_CORNER = ['TR', 'BR', 'BL', 'TL'];
const CCW_CORNER = ['TL', 'TR', 'BR', 'BL'];

function selfLoopPath(note, fromSide, toSide) {
  const M = 26;
  const L = note.x - M;
  const R = note.x + note.width + M;
  const T = note.y - M;
  const B = note.y + note.height + M;
  const s = anchor(note, fromSide);
  const t = anchor(note, toSide);

  if (fromSide === toSide) {
    const O = 26;
    const perp = { x: -s.dir.y, y: s.dir.x };
    const p1 = { x: s.x + s.dir.x * M, y: s.y + s.dir.y * M };
    const p2 = { x: p1.x + perp.x * O, y: p1.y + perp.y * O };
    const p3 = { x: t.x + perp.x * O, y: t.y + perp.y * O };
    return toPath([{ x: s.x, y: s.y }, p1, p2, p3, { x: t.x, y: t.y }]);
  }

  const proj = (side, p) => {
    if (side === 'left') return { x: L, y: p.y };
    if (side === 'right') return { x: R, y: p.y };
    if (side === 'top') return { x: p.x, y: T };
    return { x: p.x, y: B };
  };
  const s2 = proj(fromSide, s);
  const t2 = proj(toSide, t);

  const corner = { TL: { x: L, y: T }, TR: { x: R, y: T }, BR: { x: R, y: B }, BL: { x: L, y: B } };
  const a = SIDE_IDX[fromSide];
  const b = SIDE_IDX[toSide];
  const cw = (b - a + 4) % 4;
  const ccw = (a - b + 4) % 4;
  const names = [];
  if (cw <= ccw) {
    for (let k = 0; k < cw; k++) names.push(CW_CORNER[(a + k) % 4]);
  } else {
    for (let k = 0; k < ccw; k++) names.push(CCW_CORNER[(a - k + 4) % 4]);
  }
  const mids = names.map((n) => corner[n]);
  return toPath([{ x: s.x, y: s.y }, s2, ...mids, t2, { x: t.x, y: t.y }]);
}

const edges = computed(() =>
  connections.value
    .map((c) => {
      const a = noteById.value[c.from];
      const b = noteById.value[c.to];
      if (!a || !b) return null;
      const fromSide = c.fromSide || 'right';
      const toSide = c.toSide || 'left';
      const d =
        c.from === c.to
          ? selfLoopPath(a, fromSide, toSide)
          : orthoPath(anchor(a, fromSide), anchor(b, toSide));
      return { id: c.id, d };
    })
    .filter(Boolean),
);

/* ---- Linking (connect tool) ---- */
const link = ref(null);

function toFrame(clientX, clientY) {
  const r = boardEl.value.getBoundingClientRect();
  return {
    x: (clientX - r.left + boardEl.value.scrollLeft) / zoom.value,
    y: (clientY - r.top + boardEl.value.scrollTop) / zoom.value,
  };
}

function nearestSide(noteEl, clientX, clientY) {
  const r = noteEl.getBoundingClientRect();
  const dx = (clientX - (r.left + r.width / 2)) / r.width;
  const dy = (clientY - (r.top + r.height / 2)) / r.height;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

function onLinkStart({ id, side, clientX, clientY }) {
  link.value = { from: id, fromSide: side, ...toFrame(clientX, clientY) };
}
function onLinkMove({ clientX, clientY }) {
  if (!link.value) return;
  const p = toFrame(clientX, clientY);
  link.value.x = p.x;
  link.value.y = p.y;
}
function onLinkEnd({ clientX, clientY }) {
  if (!link.value) return;
  const el = document.elementFromPoint(clientX, clientY);
  const dot = el?.closest('.note__anchor');
  const noteEl = el?.closest('.note');
  let toId;
  let toSide;
  if (dot) {
    toId = dot.dataset.id;
    toSide = dot.dataset.side;
  } else if (noteEl) {
    toId = noteEl.dataset.id;
    toSide = nearestSide(noteEl, clientX, clientY);
  }
  if (toId) store.addConnection(link.value.from, toId, link.value.fromSide, toSide);
  link.value = null;
}

const pendingPath = computed(() => {
  if (!link.value) return null;
  const a = noteById.value[link.value.from];
  if (!a) return null;
  const s = anchor(a, link.value.fromSide);
  const s2 = { x: s.x + s.dir.x * STUB, y: s.y + s.dir.y * STUB };
  const p = { x: link.value.x, y: link.value.y };
  const bend = s.dir.x !== 0 ? { x: p.x, y: s2.y } : { x: s2.x, y: p.y };
  return toPath([{ x: s.x, y: s.y }, s2, bend, p]);
});

/* ---- Minimap ---- */
const MINI_W = 200;
const MM = MINI_W / FRAME_W; // minimap scale (0.05)
const MINI_H = FRAME_H * MM;
const miniOpen = ref(true);
const minimapEl = ref(null);
let draggingMap = false;

const miniNotes = computed(() =>
  notes.value.map((n) => ({
    id: n.id,
    x: n.x * MM,
    y: n.y * MM,
    w: n.width * MM,
    h: n.height * MM,
    color: n.color,
  })),
);

const miniView = computed(() => ({
  left: (scrollX.value / zoom.value) * MM,
  top: (scrollY.value / zoom.value) * MM,
  width: (viewW.value / zoom.value) * MM,
  height: (viewH.value / zoom.value) * MM,
}));

function minimapTo(e) {
  const el = boardEl.value;
  const r = minimapEl.value.getBoundingClientRect();
  const fx = (e.clientX - r.left) / MM; // frame coords
  const fy = (e.clientY - r.top) / MM;
  el.scrollLeft = fx * zoom.value - el.clientWidth / 2;
  el.scrollTop = fy * zoom.value - el.clientHeight / 2;
  syncView();
}
function onMiniDown(e) {
  draggingMap = true;
  minimapEl.value.setPointerCapture(e.pointerId);
  minimapTo(e);
}
function onMiniMove(e) {
  if (draggingMap) minimapTo(e);
}
function onMiniUp(e) {
  draggingMap = false;
  minimapEl.value.releasePointerCapture(e.pointerId);
}
</script>

<template>
  <div class="board-page">
    <BaseAlert v-if="error" variant="danger" class="board-error">
      {{ error }} — is the backend running & seeded? (<code>npm run seed</code>)
    </BaseAlert>

    <div class="board-info">
      <RouterLink to="/" class="board-info__back" title="Back to sheets">←</RouterLink>
      <strong>{{ sheet?.name || 'Board' }}</strong>
      <span class="text-muted"> · {{ notes.length }} notes</span>
    </div>

    <div
      ref="boardEl"
      class="board"
      :class="[`tool-${tool}`, { panning }]"
      :style="boardCursor ? { cursor: boardCursor } : {}"
      @pointerdown="onBoardDown"
      @pointermove="onBoardMove"
      @pointerup="onBoardUp"
      @pointerenter="cursorHover = true"
      @pointerleave="cursorHover = false"
      @scroll="syncView"
    >
      <!-- Scaler sizes the scroll area; the frame scales its content. -->
      <div class="board-scaler" :style="{ width: `${FRAME_W * zoom}px`, height: `${FRAME_H * zoom}px` }">
        <div
          class="board-frame"
          :class="bgClass"
          :style="{ width: `${FRAME_W}px`, height: `${FRAME_H}px`, transform: `scale(${zoom})` }"
        >
          <!-- Drawing layer — sits behind the notes. -->
          <svg class="strokes" :width="FRAME_W" :height="FRAME_H">
            <path
              v-for="r in renderStrokes"
              :key="r.key"
              :d="r.d"
              :stroke="r.color"
              :stroke-width="r.width"
              :opacity="r.opacity"
            />
            <path
              v-if="drawing"
              :d="pointsToPath(drawing.points)"
              :stroke="drawColor"
              :stroke-width="drawWidth"
              :opacity="strokeOpacity(drawTool)"
            />
          </svg>

          <svg class="links" :width="FRAME_W" :height="FRAME_H">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path class="links__arrow" d="M0,0 L8,3 L0,6 Z" />
              </marker>
            </defs>

            <g v-for="e in edges" :key="e.id">
              <path class="links__line" :d="e.d" marker-end="url(#arrowhead)" />
              <path class="links__hit" :d="e.d" @pointerdown.stop @click="store.removeConnection(e.id)">
                <title>Click to remove this arrow</title>
              </path>
            </g>

            <path v-if="pendingPath" class="links__pending" :d="pendingPath" marker-end="url(#arrowhead)" />
          </svg>

          <StickyNote
            v-for="note in notes"
            :key="note.id"
            :note="note"
            :colors="colors"
            :tool="tool"
            :zoom="zoom"
            @focus="store.bringToFront(note.id)"
            @move="(pos) => store.patch(note.id, pos, false)"
            @change="(patch) => store.patch(note.id, patch, true)"
            @delete="store.remove(note.id)"
            @link-start="onLinkStart"
            @link-move="onLinkMove"
            @link-end="onLinkEnd"
          />
        </div>
      </div>
    </div>

    <!-- Empty hint — centred on the viewport (not tied to scroll/zoom). -->
    <p v-if="!loading && !notes.length" class="board-empty text-muted">
      The board is empty — add a note from the toolbar below.
    </p>

    <!-- Eraser size indicator — a circle that follows the cursor. -->
    <div
      v-if="tool === 'eraser' && cursorHover"
      class="eraser-cursor"
      :style="{
        left: `${cursorPos.x}px`,
        top: `${cursorPos.y}px`,
        width: `${eraserSize * 2 * zoom}px`,
        height: `${eraserSize * 2 * zoom}px`,
      }"
    />

    <!-- Minimap (top-right, below the theme toggle) -->
    <div class="minimap" :class="{ 'minimap--closed': !miniOpen }">
      <div class="minimap__bar">
        <span class="minimap__title">Map</span>
        <button class="minimap__icon" :title="miniOpen ? 'Collapse' : 'Expand'" @click="miniOpen = !miniOpen">
          {{ miniOpen ? '–' : '🗺' }}
        </button>
      </div>

      <template v-if="miniOpen">
        <div
          ref="minimapEl"
          class="minimap__canvas"
          :class="bgClass"
          :style="{ width: `${MINI_W}px`, height: `${MINI_H}px` }"
          @pointerdown="onMiniDown"
          @pointermove="onMiniMove"
          @pointerup="onMiniUp"
        >
          <span
            v-for="n in miniNotes"
            :key="n.id"
            class="minimap__note"
            :style="{ left: `${n.x}px`, top: `${n.y}px`, width: `${n.w}px`, height: `${n.h}px`, background: n.color }"
          />
          <span
            class="minimap__view"
            :style="{ left: `${miniView.left}px`, top: `${miniView.top}px`, width: `${miniView.width}px`, height: `${miniView.height}px` }"
          />
        </div>

        <div class="minimap__zoom">
          <button title="Zoom out" :disabled="zoom <= ZMIN" @click="zoomOut">−</button>
          <button class="minimap__pct" title="Reset zoom" @click="zoomReset">{{ Math.round(zoom * 100) }}%</button>
          <button title="Zoom in" :disabled="zoom >= ZMAX" @click="zoomIn">＋</button>
        </div>
      </template>
    </div>

    <!-- Draw / eraser sub-toolbar -->
    <div v-if="tool === 'draw' || tool === 'eraser'" class="drawbar">
      <template v-if="tool === 'draw'">
        <button
          v-for="d in drawTools"
          :key="d.id"
          class="drawbar__btn"
          :class="{ active: drawTool === d.id }"
          :data-tip="d.label"
          @click="selectDrawTool(d.id)"
        >
          {{ d.icon }}
        </button>
        <span class="drawbar__sep" />
        <button
          v-for="c in drawColors"
          :key="c"
          class="drawbar__swatch"
          :class="{ on: drawColor === c }"
          :style="{ background: c }"
          :title="c"
          @click="drawColor = c"
        />
        <span class="drawbar__sep" />
        <input
          v-model.number="drawWidth"
          type="range"
          min="1"
          max="30"
          class="drawbar__slider"
          title="Thickness"
        />
        <span class="drawbar__num">{{ drawWidth }}px</span>
      </template>

      <template v-else>
        <span class="drawbar__label">Eraser size</span>
        <button
          v-for="es in eraserSizes"
          :key="es.id"
          class="drawbar__btn"
          :class="{ active: eraserSize === es.r }"
          :data-tip="es.label"
          @click="eraserSize = es.r"
        >
          {{ es.label[0] }}
        </button>
      </template>
    </div>

    <!-- Floating toolbox (footer) -->
    <div class="toolbox">
      <button class="toolbox__btn" data-tip="Undo" :disabled="!canUndo" @click="store.undo()">
        <span class="toolbox__icon">↶</span>
      </button>
      <button class="toolbox__btn" data-tip="Redo" :disabled="!canRedo" @click="store.redo()">
        <span class="toolbox__icon">↷</span>
      </button>
      <span class="toolbox__sep" />
      <button
        v-for="t in tools"
        :key="t.id"
        class="toolbox__btn"
        :class="{ active: tool === t.id }"
        :data-tip="t.label"
        @click="tool = t.id"
      >
        <span class="toolbox__icon">{{ t.icon }}</span>
      </button>
      <span class="toolbox__sep" />
      <button class="toolbox__btn toolbox__add" data-tip="Add note" @click="addNote">
        ＋<span class="toolbox__add-label">Note</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.board-page {
  position: relative;
  height: 100%;
}
.board-error {
  position: absolute;
  top: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  max-width: 520px;
}
.board-info {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  font-size: var(--font-size-sm);
}
.board-info__back {
  font-size: 1.1rem;
  color: var(--color-primary);
  text-decoration: none;
  line-height: 1;
}
@media (max-width: 768px) {
  /* clear the hamburger menu button (top-left) */
  .board-info {
    left: 64px;
  }
}

/* Narrow screens: stack the toolbars vertically in the bottom corners. */
@media (max-width: 640px) {
  .minimap {
    display: none; /* too large for phones */
  }
  .toolbox {
    flex-direction: column;
    left: auto;
    right: var(--space-3);
    bottom: var(--space-3);
    transform: none;
  }
  .toolbox__sep {
    width: 22px;
    height: 1px;
    margin: var(--space-1) 0;
  }
  .toolbox__add-label {
    display: none;
  }
  .drawbar {
    flex-direction: column;
    left: var(--space-3);
    right: auto;
    bottom: var(--space-3);
    transform: none;
  }
  .drawbar__sep {
    width: 22px;
    height: 1px;
  }
  .drawbar__slider {
    width: 64px;
  }
}
.board {
  position: absolute;
  inset: 0;
  overflow: auto;
  touch-action: none;
  scrollbar-width: none;
}
.board.tool-pan {
  cursor: grab;
}
.board.tool-pan.panning {
  cursor: grabbing;
}
.board.tool-connect,
.board.tool-draw,
.board.tool-eraser {
  cursor: crosshair;
}
.board::-webkit-scrollbar {
  display: none;
}
.board-scaler {
  position: relative;
}
.board-frame {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  /* background pattern comes from a bg-dots|bg-grid|bg-blank class (per sheet) */
}
/* Drawing layer — behind the notes. */
.strokes {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.strokes path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.links {
  position: absolute;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}
.links__arrow {
  fill: var(--color-primary);
}
.links__line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2;
}
.links__hit {
  fill: none;
  stroke: transparent;
  stroke-width: 14;
  pointer-events: stroke;
  cursor: pointer;
}
.links__pending {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2;
  stroke-dasharray: 6 5;
  opacity: 0.8;
}
.board-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
  pointer-events: none;
}
/* Eraser size indicator. */
.eraser-cursor {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 1.5px solid var(--color-text-muted);
  background: rgba(127, 127, 127, 0.14);
  border-radius: 50%;
  pointer-events: none;
  z-index: 25;
}

/* ---- Minimap ---- */
.minimap {
  position: absolute;
  top: 64px; /* clears the theme toggle in the top-right corner */
  right: var(--space-4);
  z-index: 20;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.minimap__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 2px 4px 2px var(--space-3);
}
.minimap__title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
}
.minimap__icon {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1;
}
.minimap__icon:hover {
  background: var(--color-primary-soft);
}
.minimap__canvas {
  position: relative;
  background-color: var(--color-bg);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  overflow: hidden;
}
.minimap__note {
  position: absolute;
  border-radius: 1px;
  opacity: 0.85;
}
.minimap__view {
  position: absolute;
  border: 1.5px solid var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  pointer-events: none;
}
.minimap__zoom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px;
}
.minimap__zoom button {
  min-width: 26px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.95rem;
}
.minimap__zoom button:hover:not(:disabled) {
  background: var(--color-primary-soft);
}
.minimap__zoom button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.minimap__pct {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
}

/* ---- Draw sub-toolbar ---- */
.drawbar {
  position: absolute;
  bottom: calc(var(--space-5) + 56px); /* sits above the toolbox */
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.drawbar__btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.05rem;
}
.drawbar__btn:hover {
  background: var(--color-primary-soft);
}
.drawbar__btn.active {
  background: var(--gradient-brand);
  background-size: 200% 200%;
}
.drawbar__sep {
  width: 1px;
  height: 22px;
  background: var(--color-border);
  margin: 0 var(--space-1);
}
.drawbar__swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-border);
  cursor: pointer;
  padding: 0;
}
.drawbar__swatch.on {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.drawbar__slider {
  width: 90px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
.drawbar__num {
  min-width: 34px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-align: right;
}
.drawbar__label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 0 var(--space-2);
}

/* ---- Floating toolbox ---- */
.toolbox {
  position: absolute;
  bottom: var(--space-5);
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
/* Custom tooltips for icon buttons. */
.toolbox__btn,
.drawbar__btn {
  position: relative;
}
.toolbox__btn[data-tip]:hover::after,
.drawbar__btn[data-tip]:hover::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-text);
  color: var(--color-surface);
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  z-index: 40;
}
.toolbox__btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 40px;
  height: 40px;
  padding: 0 var(--space-3);
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.05rem;
  color: var(--color-text);
  transition: background 0.12s ease;
}
.toolbox__btn:hover:not(:disabled) {
  background: var(--color-primary-soft);
}
.toolbox__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.toolbox__btn.active {
  background: var(--gradient-brand);
  background-size: 200% 200%;
}
.toolbox__icon {
  line-height: 1;
}
.toolbox__sep {
  width: 1px;
  height: 24px;
  background: var(--color-border);
  margin: 0 var(--space-1);
}
.toolbox__add {
  font-weight: 700;
  color: var(--color-primary);
}
.toolbox__add-label {
  font-size: var(--font-size-sm);
}
</style>
