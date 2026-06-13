<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  note: { type: Object, required: true },
  colors: { type: Array, default: () => [] },
  // Active board tool: 'select' | 'pan' | 'connect'.
  tool: { type: String, default: 'select' },
  // Board zoom factor — drag/resize deltas are divided by it.
  zoom: { type: Number, default: 1 },
});

const emit = defineEmits([
  'focus',
  'move',
  'change',
  'delete',
  'link-start',
  'link-move',
  'link-end',
]);

// Local copy of the text so typing stays snappy; persisted (debounced) on input.
const text = ref(props.note.content);
watch(
  () => props.note.content,
  (val) => {
    if (val !== text.value) text.value = val;
  },
);

let saveTimer;
function onInput() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => emit('change', { content: text.value }), 400);
}

/* ---- Dragging the header to move (select tool only) ---- */
let start = null;

function onPointerDown(e) {
  if (e.button !== 0 || props.tool !== 'select') return;
  emit('focus');
  start = { px: e.clientX, py: e.clientY, x: props.note.x, y: props.note.y };
  e.currentTarget.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!start) return;
  // Screen delta → frame delta (the board may be zoomed).
  const x = Math.max(0, start.x + (e.clientX - start.px) / props.zoom);
  const y = Math.max(0, start.y + (e.clientY - start.py) / props.zoom);
  emit('move', { x, y }); // local update only — no API call mid-drag
}

function onPointerUp(e) {
  if (!start) return;
  e.currentTarget.releasePointerCapture(e.pointerId);
  start = null;
  emit('change', { x: props.note.x, y: props.note.y }); // persist final position
}

/* ---- Resizing (bottom-right handle, select tool only) ---- */
let rs = null;

function onResizeDown(e) {
  if (e.button !== 0) return;
  e.stopPropagation();
  emit('focus');
  rs = { px: e.clientX, py: e.clientY, w: props.note.width, h: props.note.height };
  e.currentTarget.setPointerCapture(e.pointerId);
}

function onResizeMove(e) {
  if (!rs) return;
  const width = Math.max(140, rs.w + (e.clientX - rs.px) / props.zoom);
  const height = Math.max(120, rs.h + (e.clientY - rs.py) / props.zoom);
  emit('move', { width, height }); // local update only
}

function onResizeUp(e) {
  if (!rs) return;
  e.currentTarget.releasePointerCapture(e.pointerId);
  rs = null;
  emit('change', { width: props.note.width, height: props.note.height }); // persist
}

/* ---- Linking: in connect mode, drag from one of the 4 anchors ---- */
const SIDES = ['top', 'right', 'bottom', 'left'];
let linking = false;

function onAnchorDown(side, e) {
  if (e.button !== 0) return;
  e.stopPropagation();
  emit('focus');
  linking = true;
  emit('link-start', { id: props.note.id, side, clientX: e.clientX, clientY: e.clientY });
  e.currentTarget.setPointerCapture(e.pointerId);
}

function onAnchorMove(e) {
  if (!linking) return;
  emit('link-move', { clientX: e.clientX, clientY: e.clientY });
}

function onAnchorUp(e) {
  if (!linking) return;
  e.currentTarget.releasePointerCapture(e.pointerId);
  linking = false;
  emit('link-end', { clientX: e.clientX, clientY: e.clientY });
}
</script>

<template>
  <div
    class="note"
    :class="{ 'note--connect': tool === 'connect' }"
    :data-id="note.id"
    :style="{
      left: `${note.x}px`,
      top: `${note.y}px`,
      zIndex: note.z,
      width: `${note.width}px`,
      height: `${note.height}px`,
      background: note.color,
      pointerEvents: tool === 'pan' ? 'none' : 'auto',
    }"
    @pointerdown="emit('focus')"
  >
    <header
      class="note__bar"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <span class="note__grip">⠿</span>
      <button class="note__del" title="Delete" @pointerdown.stop @click="emit('delete')">
        ×
      </button>
    </header>

    <textarea
      v-model="text"
      class="note__text"
      placeholder="Write something…"
      :readonly="tool !== 'select'"
      :style="{ pointerEvents: tool === 'select' ? 'auto' : 'none' }"
      @input="onInput"
    />

    <footer class="note__colors">
      <button
        v-for="c in colors"
        :key="c"
        class="swatch"
        :class="{ 'swatch--on': c === note.color }"
        :style="{ background: c }"
        :title="c"
        @click="emit('change', { color: c })"
      />
    </footer>

    <!-- Drag to resize (select tool only). -->
    <span
      v-if="tool === 'select'"
      class="note__resize"
      title="Drag to resize"
      @pointerdown="onResizeDown"
      @pointermove="onResizeMove"
      @pointerup="onResizeUp"
    />

    <!-- Connection anchors (connect tool): drag one onto another note. -->
    <template v-if="tool === 'connect'">
      <span
        v-for="side in SIDES"
        :key="side"
        class="note__anchor"
        :class="`note__anchor--${side}`"
        :data-id="note.id"
        :data-side="side"
        @pointerdown="onAnchorDown(side, $event)"
        @pointermove="onAnchorMove"
        @pointerup="onAnchorUp"
      />
    </template>
  </div>
</template>

<style scoped>
.note {
  position: absolute;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.15s ease;
}
.note:hover {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.26);
}
/* In connect mode the whole note is a draggable link source. */
.note--connect {
  cursor: crosshair;
}
.note--connect:hover {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.note__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 6px;
  cursor: grab;
  touch-action: none;
  color: rgba(0, 0, 0, 0.4);
}
.note--connect .note__bar {
  cursor: crosshair;
}
.note__bar:active {
  cursor: grabbing;
}
.note__grip {
  font-size: 14px;
  letter-spacing: 1px;
  user-select: none;
}
.note__del {
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.45);
  padding: 0 4px;
}
.note__del:hover {
  color: var(--color-danger);
}
.note__text {
  flex: 1;
  resize: none;
  border: none;
  background: transparent;
  padding: 4px 10px 8px;
  font: inherit;
  color: #1a1a1a;
  outline: none;
}
.note__colors {
  display: flex;
  gap: 5px;
  padding: 6px 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  cursor: pointer;
  padding: 0;
}
.swatch--on {
  outline: 2px solid rgba(0, 0, 0, 0.55);
  outline-offset: 1px;
}
/* Connection anchors — 4 dots on the edges, shown in connect mode. */
.note__anchor {
  position: absolute;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
  box-shadow: var(--shadow-sm);
  cursor: crosshair;
  touch-action: none;
  transition: transform 0.1s ease;
}
.note__anchor:hover {
  transform: scale(1.3);
}
.note__anchor--top {
  top: -8px;
  left: 50%;
  margin-left: -6.5px;
}
.note__anchor--bottom {
  bottom: -8px;
  left: 50%;
  margin-left: -6.5px;
}
.note__anchor--left {
  left: -8px;
  top: 50%;
  margin-top: -6.5px;
}
.note__anchor--right {
  right: -8px;
  top: 50%;
  margin-top: -6.5px;
}
/* Resize handle — bottom-right corner. */
.note__resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  touch-action: none;
  background: linear-gradient(
    135deg,
    transparent 0 50%,
    rgba(0, 0, 0, 0.28) 50% 60%,
    transparent 60% 72%,
    rgba(0, 0, 0, 0.28) 72% 82%,
    transparent 82%
  );
  border-bottom-right-radius: 4px;
}
</style>
