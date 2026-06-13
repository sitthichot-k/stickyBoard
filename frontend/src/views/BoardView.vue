<script setup>
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotesStore } from '@/stores/notes.js';
import StickyNote from '@/components/StickyNote.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';

const store = useNotesStore();
const { notes, connections, loading, error, colors, canUndo, canRedo } = storeToRefs(store);

onMounted(store.load);

const NOTE_HALF = 110; // half of the default 220px note — used to center new notes

// Active tool: 'select' (move/edit), 'pan' (drag canvas), 'connect' (draw arrows).
const tool = ref('select');
const tools = [
  { id: 'select', icon: '🖱️', label: 'Select' },
  { id: 'pan', icon: '✋', label: 'Pan' },
  { id: 'connect', icon: '🔗', label: 'Connect' },
];

/* ---- Pan: drag the canvas to move around the wide frame ---- */
const boardEl = ref(null);
const panning = ref(false);
let pan = null;

function onBoardDown(e) {
  if (e.button !== 0) return;
  // Pan tool drags anywhere; other tools pan only from empty space.
  if (tool.value !== 'pan' && e.target.closest('.note')) return;
  panning.value = true;
  pan = {
    x: e.clientX,
    y: e.clientY,
    left: boardEl.value.scrollLeft,
    top: boardEl.value.scrollTop,
  };
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

// Add a note at the center of whatever part of the frame is currently in view.
function addNote() {
  const el = boardEl.value;
  if (!el) return store.add();
  store.add({
    x: el.scrollLeft + el.clientWidth / 2 - NOTE_HALF,
    y: el.scrollTop + el.clientHeight / 2 - NOTE_HALF,
  });
}

/* ---- Arrows between notes ---- */
const noteById = computed(() => Object.fromEntries(notes.value.map((n) => [n.id, n])));
const STUB = 24; // how far the arrow exits a note before bending

// The anchor point + outward direction for a note's side.
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
      return { x: x + w, y: y + h / 2, dir: { x: 1, y: 0 } }; // right
  }
}

// Orthogonal (elbow) corners between two outward-facing stub ends.
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

// A right-angled route from source anchor `s` to target anchor `t`.
function orthoPath(s, t) {
  const s2 = { x: s.x + s.dir.x * STUB, y: s.y + s.dir.y * STUB };
  const t2 = { x: t.x + t.dir.x * STUB, y: t.y + t.dir.y * STUB };
  return toPath([{ x: s.x, y: s.y }, s2, ...elbow(s2, t2, s.dir, t.dir), t2, { x: t.x, y: t.y }]);
}

// Side order (clockwise) and the corner reached when leaving a side CW / CCW.
const SIDE_IDX = { top: 0, right: 1, bottom: 2, left: 3 };
const CW_CORNER = ['TR', 'BR', 'BL', 'TL'];
const CCW_CORNER = ['TL', 'TR', 'BR', 'BL'];

// A right-angled loop for a self-connected note that always routes AROUND the
// note (along an expanded boundary) so it never crosses the note body.
function selfLoopPath(note, fromSide, toSide) {
  const M = 26; // margin outside the note
  const L = note.x - M;
  const R = note.x + note.width + M;
  const T = note.y - M;
  const B = note.y + note.height + M;
  const s = anchor(note, fromSide);
  const t = anchor(note, toSide);

  if (fromSide === toSide) {
    // Same side: a square loop poking straight out from that edge.
    const O = 26;
    const perp = { x: -s.dir.y, y: s.dir.x };
    const p1 = { x: s.x + s.dir.x * M, y: s.y + s.dir.y * M };
    const p2 = { x: p1.x + perp.x * O, y: p1.y + perp.y * O };
    const p3 = { x: t.x + perp.x * O, y: t.y + perp.y * O };
    return toPath([{ x: s.x, y: s.y }, p1, p2, p3, { x: t.x, y: t.y }]);
  }

  // Project each anchor straight out to the expanded boundary.
  const proj = (side, p) => {
    if (side === 'left') return { x: L, y: p.y };
    if (side === 'right') return { x: R, y: p.y };
    if (side === 'top') return { x: p.x, y: T };
    return { x: p.x, y: B }; // bottom
  };
  const s2 = proj(fromSide, s);
  const t2 = proj(toSide, t);

  // Walk the expanded rectangle's perimeter the short way, collecting corners.
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

/* ---- Linking: drag from a note's anchor onto another note (connect tool) ---- */
const link = ref(null); // { from, fromSide, x, y } in frame coordinates while dragging

function toFrame(clientX, clientY) {
  const r = boardEl.value.getBoundingClientRect();
  return {
    x: clientX - r.left + boardEl.value.scrollLeft,
    y: clientY - r.top + boardEl.value.scrollTop,
  };
}

// Closest side of a note element to a screen point — used when dropping on the body.
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
</script>

<template>
  <div class="board-page">
    <BaseAlert v-if="error" variant="danger" class="board-error">
      {{ error }} — is the backend running & seeded? (<code>npm run seed</code>)
    </BaseAlert>

    <div class="board-info text-muted">{{ notes.length }} notes</div>

    <div
      ref="boardEl"
      class="board"
      :class="[`tool-${tool}`, { panning }]"
      @pointerdown="onBoardDown"
      @pointermove="onBoardMove"
      @pointerup="onBoardUp"
    >
      <p v-if="!loading && !notes.length" class="board-empty text-muted">
        The board is empty — add a note from the toolbar below.
      </p>

      <!-- Wide frame you pan across; notes are positioned within it. -->
      <div class="board-frame">
        <svg class="links" width="4000" height="3000">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path class="links__arrow" d="M0,0 L8,3 L0,6 Z" />
            </marker>
          </defs>

          <g v-for="e in edges" :key="e.id">
            <path class="links__line" :d="e.d" marker-end="url(#arrowhead)" />
            <!-- Wider invisible hit area: click to delete the arrow. -->
            <path
              class="links__hit"
              :d="e.d"
              @pointerdown.stop
              @click="store.removeConnection(e.id)"
            >
              <title>Click to remove this arrow</title>
            </path>
          </g>

          <path
            v-if="pendingPath"
            class="links__pending"
            :d="pendingPath"
            marker-end="url(#arrowhead)"
          />
        </svg>

        <StickyNote
          v-for="note in notes"
          :key="note.id"
          :note="note"
          :colors="colors"
          :tool="tool"
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

    <!-- Floating toolbox (footer). -->
    <div class="toolbox">
      <button
        class="toolbox__btn"
        title="Undo"
        :disabled="!canUndo"
        @click="store.undo()"
      >
        <span class="toolbox__icon">↶</span>
      </button>
      <button
        class="toolbox__btn"
        title="Redo"
        :disabled="!canRedo"
        @click="store.redo()"
      >
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
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.board {
  position: absolute;
  inset: 0;
  overflow: auto;
  touch-action: none; /* drag pans instead of scrolling the page */
}
/* Cursor reflects the active tool. */
.board.tool-pan {
  cursor: grab;
}
.board.tool-pan.panning {
  cursor: grabbing;
}
.board.tool-connect {
  cursor: crosshair;
}
/* Hide scrollbars — panning is done by dragging. */
.board {
  scrollbar-width: none;
}
.board::-webkit-scrollbar {
  display: none;
}
.board-frame {
  position: relative;
  width: 4000px;
  height: 3000px;
  background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
  background-size: 24px 24px;
}
/* Arrow layer — sits above the notes so arrows are never hidden; the SVG
   itself ignores pointer events, only the arrow hit-paths are interactive. */
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
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
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
