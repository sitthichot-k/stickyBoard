<script setup>
import { computed, onMounted, onUnmounted, nextTick, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotesStore } from '@/stores/notes.js';
import { useSheetsStore } from '@/stores/sheets.js';
import StickyNote from '@/components/StickyNote.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';

const route = useRoute();
const router = useRouter();
const store = useNotesStore();
const sheets = useSheetsStore();
const { notes, connections, loading, error, colors, canUndo, canRedo } = storeToRefs(store);
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
  { id: 'select', icon: '🖱️', label: 'Select' },
  { id: 'pan', icon: '✋', label: 'Pan' },
  { id: 'connect', icon: '🔗', label: 'Connect' },
];

/* ---- Pan: drag the canvas to move around the frame ---- */
const panning = ref(false);
let pan = null;

function onBoardDown(e) {
  if (e.button !== 0) return;
  if (tool.value !== 'pan' && e.target.closest('.note')) return;
  panning.value = true;
  pan = { x: e.clientX, y: e.clientY, left: boardEl.value.scrollLeft, top: boardEl.value.scrollTop };
  boardEl.value.setPointerCapture(e.pointerId);
}
function onBoardMove(e) {
  if (!pan) return;
  boardEl.value.scrollLeft = pan.left - (e.clientX - pan.x);
  boardEl.value.scrollTop = pan.top - (e.clientY - pan.y);
}
function onBoardUp(e) {
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
      @pointerdown="onBoardDown"
      @pointermove="onBoardMove"
      @pointerup="onBoardUp"
      @scroll="syncView"
    >
      <!-- Scaler sizes the scroll area; the frame scales its content. -->
      <div class="board-scaler" :style="{ width: `${FRAME_W * zoom}px`, height: `${FRAME_H * zoom}px` }">
        <div
          class="board-frame"
          :class="bgClass"
          :style="{ width: `${FRAME_W}px`, height: `${FRAME_H}px`, transform: `scale(${zoom})` }"
        >
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

    <!-- Floating toolbox (footer) -->
    <div class="toolbox">
      <button class="toolbox__btn" title="Undo" :disabled="!canUndo" @click="store.undo()">
        <span class="toolbox__icon">↶</span>
      </button>
      <button class="toolbox__btn" title="Redo" :disabled="!canRedo" @click="store.redo()">
        <span class="toolbox__icon">↷</span>
      </button>
      <span class="toolbox__sep" />
      <button
        v-for="t in tools"
        :key="t.id"
        class="toolbox__btn"
        :class="{ active: tool === t.id }"
        :title="t.label"
        @click="tool = t.id"
      >
        <span class="toolbox__icon">{{ t.icon }}</span>
      </button>
      <span class="toolbox__sep" />
      <button class="toolbox__btn toolbox__add" title="Add note" @click="addNote">
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
.board.tool-connect {
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
