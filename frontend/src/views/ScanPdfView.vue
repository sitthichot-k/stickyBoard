<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { PDFDocument, PageSizes } from 'pdf-lib';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';

const items = ref([]); // { id, file, url, blob, loading }
const busy = ref(false);
const error = ref('');
const done = ref('');
const dragOver = ref(false);
let seq = 0;

// True while any HEIC file is still being decoded.
const converting = computed(() => items.value.some((i) => i.loading));

const IMAGE_RE = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;
function isImage(file) {
  return file.type.startsWith('image/') || IMAGE_RE.test(file.name);
}
function isHeic(file) {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

// HEIC/HEIF (iOS) can't be decoded by <img>/canvas, so convert to JPEG first
// (lazy-loaded decoder). Other formats pass through unchanged.
async function toDisplayBlob(file) {
  if (!isHeic(file)) return file;
  const { default: heic2any } = await import('heic2any');
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  return Array.isArray(out) ? out[0] : out;
}

function addPicked(list) {
  error.value = '';
  done.value = '';
  let skipped = 0;
  for (const file of Array.from(list || [])) {
    if (!isImage(file)) {
      skipped += 1;
      continue;
    }
    const id = ++seq;
    items.value.push({ id, file, url: '', blob: null, loading: true });
    toDisplayBlob(file)
      .then((blob) => {
        const it = items.value.find((i) => i.id === id);
        if (it) {
          it.blob = blob;
          it.url = URL.createObjectURL(blob);
        }
      })
      .catch((e) => {
        items.value = items.value.filter((i) => i.id !== id);
        error.value = `Couldn't read ${file.name}: ${e.message}`;
      })
      .finally(() => {
        const it = items.value.find((i) => i.id === id);
        if (it) it.loading = false;
      });
  }
  if (skipped) error.value = `Skipped ${skipped} non-image file(s).`;
}

function onPick(e) {
  addPicked(e.target.files);
  e.target.value = '';
}
function onDrop(e) {
  dragOver.value = false;
  addPicked(e.dataTransfer?.files);
}
function remove(id) {
  const it = items.value.find((i) => i.id === id);
  if (it?.url) URL.revokeObjectURL(it.url);
  items.value = items.value.filter((i) => i.id !== id);
}
function move(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= items.value.length) return;
  const a = items.value;
  [a[i], a[j]] = [a[j], a[i]];
}
function clearAll() {
  items.value.forEach((i) => i.url && URL.revokeObjectURL(i.url));
  items.value = [];
  error.value = '';
  done.value = '';
}
onBeforeUnmount(() => items.value.forEach((i) => i.url && URL.revokeObjectURL(i.url)));

function fmtSize(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('could not read an image'));
    img.src = url;
  });
}

// Re-encode any image blob to JPEG (flattened on white) so pdf-lib can embed it.
async function toJpegBytes(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function exportPdf() {
  if (!items.value.length || busy.value || converting.value) return;
  busy.value = true;
  error.value = '';
  done.value = '';
  try {
    const pdf = await PDFDocument.create();
    const margin = 24; // points
    for (const { blob } of items.value) {
      const img = await pdf.embedJpg(await toJpegBytes(blob));
      const page = pdf.addPage(PageSizes.A4);
      const { width: pw, height: ph } = page.getSize();
      const scale = Math.min((pw - 2 * margin) / img.width, (ph - 2 * margin) / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
    const bytes = await pdf.save();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scan.pdf';
    a.click();
    URL.revokeObjectURL(url);
    done.value = `Created scan.pdf with ${items.value.length} page(s).`;
  } catch (err) {
    error.value = `Couldn't create PDF: ${err.message}`;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="tool">
    <header class="tool__head">
      <h1>🖼️ Scan to PDF</h1>
      <p class="text-muted">
        Combine image files into one PDF — each image is centred on an A4 page. Runs in your browser.
      </p>
    </header>

    <div class="tool__body">
      <div class="tool__panel">
        <label
          class="dropzone"
          :class="{ 'dropzone--over': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <input type="file" accept="image/*,.heic,.heif" multiple hidden @change="onPick" />
          <span class="dropzone__plus">＋</span>
          <span>{{ dragOver ? 'Drop images here' : 'Click or drag & drop images' }}</span>
          <span class="dropzone__hint">JPG · PNG · WEBP · HEIC (iOS)</span>
        </label>

        <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>
        <BaseAlert v-if="done" variant="success">{{ done }}</BaseAlert>

        <ul v-if="items.length" class="filelist">
          <li v-for="(it, i) in items" :key="it.id" class="fileitem">
            <span class="fileitem__idx">{{ i + 1 }}</span>
            <span v-if="it.loading" class="fileitem__thumb fileitem__thumb--loading">…</span>
            <img v-else class="fileitem__thumb" :src="it.url" alt="" />
            <span class="fileitem__name">{{ it.file.name }}</span>
            <span class="text-muted fileitem__size">{{ fmtSize(it.file.size) }}</span>
            <span class="fileitem__actions">
              <button :disabled="i === 0" title="Move up" @click="move(i, -1)">↑</button>
              <button :disabled="i === items.length - 1" title="Move down" @click="move(i, 1)">↓</button>
              <button class="fileitem__del" title="Remove" @click="remove(it.id)">×</button>
            </span>
          </li>
        </ul>

        <div class="tool__actions">
          <BaseButton variant="ghost" :disabled="!items.length || busy" @click="clearAll">Clear</BaseButton>
          <BaseButton :disabled="!items.length || busy || converting" @click="exportPdf">
            {{ busy ? 'Building…' : converting ? 'Decoding…' : 'Export to PDF' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.tool__head {
  flex-shrink: 0;
  /* same level as "Your sheets" (clears the theme toggle) */
  padding: 80px var(--space-5) 0;
}
.tool__head h1 {
  margin: 0 0 var(--space-2);
}
.tool__body {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  padding: clamp(var(--space-5), 9vh, 120px) var(--space-5) var(--space-5);
}
.tool__panel {
  width: 100%;
  max-width: 640px;
}
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 240px;
  padding: var(--space-6);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  font-weight: 600;
  margin-bottom: var(--space-4);
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.dropzone:hover,
.dropzone--over {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.dropzone--over {
  background: var(--color-primary-soft);
}
.dropzone__plus {
  font-size: 2rem;
  line-height: 1;
}
.dropzone__hint {
  font-size: var(--font-size-sm);
  font-weight: 500;
  opacity: 0.7;
}
.filelist {
  list-style: none;
  padding: 0;
  margin: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.fileitem {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
.fileitem__idx {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 700;
}
.fileitem__thumb {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}
.fileitem__thumb--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-weight: 700;
}
.fileitem__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fileitem__size {
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}
.fileitem__actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}
.fileitem__actions button {
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text);
}
.fileitem__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.fileitem__del:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}
.tool__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
</style>
