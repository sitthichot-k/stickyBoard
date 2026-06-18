<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import * as api from '@/modules/violation/api/violation.js';
import { fetchCameras } from '@/modules/camera/api/camera.js';
import { useAuthStore } from '@/modules/auth/stores/auth.js';
import BaseAlert from '@/components/BaseAlert.vue';
import BaseButton from '@/components/BaseButton.vue';

const auth = useAuthStore();
const canEdit = computed(() => auth.can('admin-violations', 'edit'));
const canDelete = computed(() => auth.can('admin-violations', 'delete'));

const items = ref([]);
const pagination = ref({ page: 1, limit: 12, total: 0, totalPages: 1 });
const loading = ref(true);
const error = ref('');

const filters = reactive({ status: '', cameraId: '' });
const camById = ref({});
const cameras = ref([]);

// Snapshot object URLs keyed by violation id (revoked on reload/unmount).
const thumbs = reactive({});

const STATUS = {
  new: { label: 'New', variant: 'warning' },
  reviewed: { label: 'Reviewed', variant: 'success' },
  dismissed: { label: 'Dismissed', variant: 'muted' },
};

const camName = (id) => camById.value[id]?.name || `Camera ${String(id).slice(-6)}`;
const fmtTime = (d) => new Date(d).toLocaleString();
const fmtConf = (c) => (c == null ? '—' : `${Math.round(c * 100)}%`);

function clearThumbs() {
  for (const k of Object.keys(thumbs)) {
    URL.revokeObjectURL(thumbs[k]);
    delete thumbs[k];
  }
}

async function loadThumb(id) {
  try {
    thumbs[id] = await api.fetchSnapshotUrl(id);
  } catch {
    /* leave the placeholder if the image is gone */
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  clearThumbs();
  try {
    const params = { page: pagination.value.page, limit: pagination.value.limit };
    if (filters.status) params.status = filters.status;
    if (filters.cameraId) params.cameraId = filters.cameraId;
    const res = await api.fetchViolations(params);
    items.value = res.data;
    pagination.value = res.pagination;
    items.value.forEach((v) => loadThumb(v.id));
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loadCameras() {
  // Best-effort — a violations-only role may not have camera access; the page
  // still works, just without names / the camera filter.
  try {
    cameras.value = await fetchCameras();
    camById.value = Object.fromEntries(cameras.value.map((c) => [c.id, c]));
  } catch {
    cameras.value = [];
  }
}

function applyFilters() {
  pagination.value.page = 1;
  load();
}
function goTo(page) {
  if (page < 1 || page > pagination.value.totalPages) return;
  pagination.value.page = page;
  load();
}

// --- review / delete ---
const selected = ref(null);
const noteDraft = ref('');
const busy = ref(false);

function openDetail(v) {
  selected.value = v;
  noteDraft.value = v.note || '';
}
function closeDetail() {
  selected.value = null;
}

async function setStatus(v, status) {
  if (busy.value) return;
  busy.value = true;
  try {
    const updated = await api.reviewViolation(v.id, { status });
    patchLocal(updated);
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function saveNote() {
  if (busy.value || !selected.value) return;
  busy.value = true;
  try {
    const updated = await api.reviewViolation(selected.value.id, { note: noteDraft.value });
    patchLocal(updated);
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

function patchLocal(updated) {
  const i = items.value.findIndex((x) => x.id === updated.id);
  if (i !== -1) items.value[i] = updated;
  if (selected.value?.id === updated.id) selected.value = updated;
}

async function remove(v) {
  if (!confirm('Delete this violation record?')) return;
  try {
    await api.deleteViolation(v.id);
    if (selected.value?.id === v.id) closeDetail();
    if (thumbs[v.id]) {
      URL.revokeObjectURL(thumbs[v.id]);
      delete thumbs[v.id];
    }
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(async () => {
  await loadCameras();
  await load();
});
onUnmounted(clearThumbs);
</script>

<template>
  <div class="page">
    <header class="page__head">
      <div>
        <h1>🪖 Violations</h1>
        <span class="text-muted">Helmet detections — no-helmet snapshots from AI cameras</span>
      </div>
      <BaseButton variant="ghost" size="sm" @click="load">↻ Refresh</BaseButton>
    </header>

    <div class="toolbar">
      <label class="fld">
        <span>Status</span>
        <select v-model="filters.status" class="control" @change="applyFilters">
          <option value="">All</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </label>
      <label v-if="cameras.length" class="fld">
        <span>Camera</span>
        <select v-model="filters.cameraId" class="control" @change="applyFilters">
          <option value="">All</option>
          <option v-for="c in cameras" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <span class="toolbar__count text-muted">{{ pagination.total }} total</span>
    </div>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="!items.length" class="text-muted">No violations recorded.</p>

    <div v-else class="gallery">
      <article v-for="v in items" :key="v.id" class="card" :class="`card--${v.status}`">
        <button class="card__shot" @click="openDetail(v)">
          <img v-if="thumbs[v.id]" :src="thumbs[v.id]" :alt="`Violation on ${camName(v.cameraId)}`" />
          <span v-else class="card__ph">🖼️</span>
          <span class="badge" :class="`badge--${STATUS[v.status].variant}`">{{ STATUS[v.status].label }}</span>
        </button>
        <div class="card__body">
          <strong class="card__cam">{{ camName(v.cameraId) }}</strong>
          <span class="text-muted card__meta">{{ fmtTime(v.detectedAt) }} · conf {{ fmtConf(v.confidence) }}</span>
          <div class="card__actions">
            <button
              v-if="canEdit && v.status !== 'reviewed'"
              class="link"
              :disabled="busy"
              @click="setStatus(v, 'reviewed')"
            >
              ✓ Reviewed
            </button>
            <button
              v-if="canEdit && v.status !== 'dismissed'"
              class="link"
              :disabled="busy"
              @click="setStatus(v, 'dismissed')"
            >
              ✕ Dismiss
            </button>
            <button v-if="canDelete" class="link link--danger" @click="remove(v)">Delete</button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="!loading && pagination.totalPages > 1" class="pager">
      <BaseButton size="sm" variant="ghost" :disabled="pagination.page <= 1" @click="goTo(pagination.page - 1)">
        ← Prev
      </BaseButton>
      <span class="text-muted">Page {{ pagination.page }} / {{ pagination.totalPages }}</span>
      <BaseButton
        size="sm"
        variant="ghost"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goTo(pagination.page + 1)"
      >
        Next →
      </BaseButton>
    </div>

    <!-- Detail modal -->
    <div v-if="selected" class="modal" @click.self="closeDetail">
      <div class="modal__box">
        <header class="modal__head">
          <h2>{{ camName(selected.cameraId) }}</h2>
          <button class="link" @click="closeDetail">Close ✕</button>
        </header>
        <div class="modal__shot">
          <img v-if="thumbs[selected.id]" :src="thumbs[selected.id]" :alt="`Violation on ${camName(selected.cameraId)}`" />
          <span v-else class="card__ph">🖼️</span>
        </div>
        <dl class="meta">
          <div><dt>Detected</dt><dd>{{ fmtTime(selected.detectedAt) }}</dd></div>
          <div><dt>Confidence</dt><dd>{{ fmtConf(selected.confidence) }}</dd></div>
          <div><dt>Status</dt><dd>{{ STATUS[selected.status].label }}</dd></div>
          <div v-if="selected.trackId"><dt>Track</dt><dd>{{ selected.trackId }}</dd></div>
        </dl>
        <label class="fld">
          <span>Note</span>
          <textarea v-model="noteDraft" class="control" rows="2" :disabled="!canEdit" />
        </label>
        <div class="modal__actions">
          <BaseButton v-if="canEdit" variant="ghost" size="sm" :disabled="busy" @click="saveNote">Save note</BaseButton>
          <span class="modal__spacer" />
          <BaseButton v-if="canEdit" size="sm" :disabled="busy || selected.status === 'reviewed'" @click="setStatus(selected, 'reviewed')">
            Mark reviewed
          </BaseButton>
          <BaseButton v-if="canEdit" variant="ghost" size="sm" :disabled="busy || selected.status === 'dismissed'" @click="setStatus(selected, 'dismissed')">
            Dismiss
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
.toolbar {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.toolbar__count {
  margin-left: auto;
  font-size: var(--font-size-sm);
}
.fld {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.fld > span {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.control {
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

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}
.card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
}
.card--new {
  border-color: var(--color-warning);
}
.card__shot {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #000;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card__shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card__ph {
  font-size: 2rem;
  opacity: 0.4;
}
.badge {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
}
.badge--warning {
  background: var(--color-warning);
  color: #fff;
}
.badge--success {
  background: var(--color-success);
  color: #fff;
}
.badge--muted {
  background: var(--color-bg);
  color: var(--color-text-muted);
}
.card__body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.card__cam {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card__meta {
  font-size: var(--font-size-sm);
}
.card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.link {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: var(--color-primary);
}
.link:disabled {
  opacity: 0.5;
  cursor: default;
}
.link--danger {
  color: var(--color-danger);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  padding: var(--space-4);
}
.modal__box {
  width: min(640px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal__head h2 {
  margin: 0;
}
.modal__shot {
  background: #000;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 50vh;
  overflow: hidden;
}
.modal__shot img {
  max-width: 100%;
  max-height: 50vh;
  object-fit: contain;
}
.meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-2);
  margin: 0;
}
.meta dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.meta dd {
  margin: 0;
  font-weight: 600;
}
.modal__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.modal__spacer {
  flex: 1;
}
textarea.control {
  width: 100%;
  resize: vertical;
}
</style>
