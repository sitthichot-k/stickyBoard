<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import Hls from 'hls.js';
import * as api from '@/modules/camera/api/camera.js';
import BaseAlert from '@/components/BaseAlert.vue';
import BaseButton from '@/components/BaseButton.vue';

const cameras = ref([]);
const loading = ref(true);
const error = ref('');

const selected = ref(null);
const playError = ref('');
const videoRef = ref(null);
let hls = null;

// AI overlay: swap the HLS player for the detector's annotated MJPEG (boxes).
const aiOverlay = ref(false);
const overlayError = ref('');
const showOverlay = computed(() => aiOverlay.value && !!selected.value?.aiEnabled);
const overlaySrc = computed(() => (selected.value ? api.overlayUrl(selected.value.id) : ''));

// When showing the overlay, stop the HLS player (and vice-versa) so only one
// stream runs at a time.
watch(showOverlay, (on) => {
  overlayError.value = '';
  if (on) stopPlayer();
  else if (selected.value) nextTick(startPlayer);
});

const showEditor = ref(false);
const editing = ref(null);
const form = ref({ name: '', location: '', url: '', enabled: true, aiEnabled: false });
const saving = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    cameras.value = await api.fetchCameras();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
onUnmounted(stopPlayer);

function stopPlayer() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  if (videoRef.value) videoRef.value.removeAttribute('src');
}

function view(cam) {
  selected.value = cam;
  playError.value = '';
  overlayError.value = '';
  if (!showOverlay.value) nextTick(startPlayer);
}

function startPlayer() {
  stopPlayer();
  const video = videoRef.value;
  if (!video || !selected.value) return;
  const url = api.hlsUrl(selected.value.id);
  const token = localStorage.getItem('token') || '';

  if (Hls.isSupported()) {
    hls = new Hls({
      xhrSetup: (xhr) => xhr.setRequestHeader('Authorization', `Bearer ${token}`),
      // Start ~3 short segments from the live edge (smooth + near-live), but keep
      // a rewind buffer and DON'T auto-snap to live — so the user can pause /
      // scrub back within the server's DVR window. (Not lowLatencyMode: ffmpeg
      // doesn't emit LL-HLS.)
      liveSyncDurationCount: 3,
      backBufferLength: 60,
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) playError.value = 'Stream error — check the camera is reachable and online.';
    });
  } else {
    // Native HLS (e.g. Safari) — can't attach the auth header reliably.
    video.src = url;
  }
  video.play().catch(() => {});
}

function openNew() {
  editing.value = null;
  form.value = { name: '', location: '', url: '', enabled: true, aiEnabled: false, gate: 'none', countVehicles: false };
  showEditor.value = true;
}
function openEdit(c) {
  editing.value = c.id;
  form.value = {
    name: c.name,
    location: c.location || '',
    url: '',
    enabled: c.enabled,
    aiEnabled: !!c.aiEnabled,
    gate: c.gate || 'none',
    countVehicles: !!c.countVehicles,
  };
  showEditor.value = true;
}
async function save() {
  if (saving.value || !form.value.name.trim()) return;
  saving.value = true;
  error.value = '';
  try {
    const body = {
      name: form.value.name,
      location: form.value.location,
      enabled: form.value.enabled,
      aiEnabled: form.value.aiEnabled,
      gate: form.value.gate,
      countVehicles: form.value.countVehicles,
    };
    if (form.value.url.trim()) body.url = form.value.url.trim();
    if (editing.value) await api.updateCamera(editing.value, body);
    else await api.createCamera(body);
    showEditor.value = false;
    await load();
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
async function remove(c) {
  if (!confirm(`Delete camera "${c.name}"?`)) return;
  try {
    await api.deleteCamera(c.id);
    if (selected.value?.id === c.id) {
      stopPlayer();
      selected.value = null;
    }
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <div class="page">
    <header class="page__head">
      <div>
        <h1>📹 Cameras</h1>
        <span class="text-muted">RTSP cameras — streamed via the server (HLS)</span>
      </div>
      <BaseButton @click="openNew">+ Add camera</BaseButton>
    </header>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>

    <div class="grid">
      <section class="panel player-panel">
        <h2 class="panel__title">
          <span>{{ selected ? selected.name : 'Live view' }}</span>
          <label v-if="selected?.aiEnabled" class="ai-toggle">
            <input v-model="aiOverlay" type="checkbox" />
            <span>🪖 AI overlay</span>
          </label>
        </h2>
        <div class="player">
          <img
            v-if="showOverlay"
            class="player__overlay"
            :src="overlaySrc"
            alt="AI detection overlay"
            @error="overlayError = 'AI overlay unavailable — is the ai-detector service running for this camera?'"
          />
          <video v-show="!showOverlay" ref="videoRef" controls autoplay muted playsinline />
          <p v-if="!selected" class="player__hint text-muted">Pick a camera to view its live stream.</p>
        </div>
        <BaseAlert v-if="showOverlay && overlayError" variant="warning">{{ overlayError }}</BaseAlert>
        <BaseAlert v-else-if="!showOverlay && playError" variant="warning">{{ playError }}</BaseAlert>
      </section>

      <section class="panel">
        <h2 class="panel__title">Cameras ({{ cameras.length }})</h2>
        <p v-if="loading" class="text-muted">Loading…</p>
        <p v-else-if="!cameras.length" class="text-muted">No cameras yet — add one.</p>
        <ul v-else class="list">
          <li v-for="c in cameras" :key="c.id" class="cam" :class="{ active: selected?.id === c.id }">
            <div class="cam__info">
              <strong>{{ c.name }}</strong>
              <span class="text-muted">{{ c.host }}<template v-if="c.location"> · {{ c.location }}</template></span>
              <span v-if="!c.enabled" class="badge badge--off">disabled</span>
              <span v-if="c.aiEnabled" class="badge badge--ai">🪖 AI</span>
              <span v-if="c.gate && c.gate !== 'none'" class="badge badge--gate">
                {{ c.gate === 'entrance' ? '↧ in' : '↥ out' }}<template v-if="c.countVehicles"> · count</template>
              </span>
            </div>
            <div class="cam__actions">
              <BaseButton size="sm" :disabled="!c.enabled" @click="view(c)">View</BaseButton>
              <button class="link" @click="openEdit(c)">Edit</button>
              <button class="link link--danger" @click="remove(c)">Delete</button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- Editor -->
    <div v-if="showEditor" class="modal" @click.self="showEditor = false">
      <div class="modal__box">
        <h2>{{ editing ? 'Edit camera' : 'Add camera' }}</h2>
        <label class="field"><span>Name</span><input v-model="form.name" class="control" /></label>
        <label class="field"><span>Location</span><input v-model="form.location" class="control" /></label>
        <label class="field">
          <span>RTSP URL {{ editing ? '(leave blank to keep)' : '' }}</span>
          <input v-model="form.url" class="control" placeholder="rtsp://user:pass@host:554/path" autocomplete="off" />
        </label>
        <label class="field field--row">
          <input v-model="form.enabled" type="checkbox" />
          <span>Enabled</span>
        </label>
        <label class="field field--row">
          <input v-model="form.aiEnabled" type="checkbox" />
          <span>AI helmet detection</span>
        </label>
        <label class="field">
          <span>Gate (vehicle counting)</span>
          <select v-model="form.gate" class="control">
            <option value="none">Not a gate</option>
            <option value="entrance">Entrance (in)</option>
            <option value="exit">Exit (out)</option>
          </select>
        </label>
        <label v-if="form.gate !== 'none'" class="field field--row">
          <input v-model="form.countVehicles" type="checkbox" />
          <span>Count vehicles here (the gate's counter — one per gate)</span>
        </label>
        <div class="modal__actions">
          <BaseButton variant="ghost" @click="showEditor = false">Cancel</BaseButton>
          <BaseButton :disabled="saving || !form.name.trim()" @click="save">
            {{ saving ? 'Saving…' : 'Save' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 80px var(--space-5) var(--space-6);
  height: 100%;
  overflow: auto;
}
.page__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.page__head h1 {
  margin: 0;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}
@media (max-width: 860px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.panel {
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.panel__title {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.ai-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}
.player {
  position: relative;
  background: #000;
  border-radius: var(--radius-sm);
  overflow: hidden;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
}
.player video,
.player__overlay {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
.player__hint {
  position: absolute;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.cam {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.cam.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}
.cam__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-sm);
  min-width: 0;
}
.cam__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.badge--off {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-warning-soft);
  color: var(--color-warning);
  width: fit-content;
}
.badge--ai {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  width: fit-content;
}
.badge--gate {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-info-soft, var(--color-bg));
  color: var(--color-info);
  width: fit-content;
}
.link {
  border: none;
  background: none;
  padding: 0 4px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: var(--color-primary);
}
.link--danger {
  color: var(--color-danger);
}
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  padding: var(--space-4);
}
.modal__box {
  width: min(480px, 100%);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.modal__box h2 {
  margin: 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.field--row {
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
}
.field > span {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.control {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  background: var(--color-bg);
  color: var(--color-text);
}
.control:focus {
  outline: 2px solid var(--color-primary);
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
</style>
