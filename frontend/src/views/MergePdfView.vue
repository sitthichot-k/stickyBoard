<script setup>
import { ref } from 'vue';
import { PDFDocument } from 'pdf-lib';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';

const files = ref([]); // { id, file }
const busy = ref(false);
const error = ref('');
const done = ref('');
const dragOver = ref(false);
let seq = 0;

function addPickedFiles(list) {
  error.value = '';
  done.value = '';
  let skipped = 0;
  for (const file of Array.from(list || [])) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) files.value.push({ id: ++seq, file });
    else skipped += 1;
  }
  if (skipped) error.value = `Skipped ${skipped} non-PDF file(s).`;
}

function addFiles(e) {
  addPickedFiles(e.target.files);
  e.target.value = ''; // allow re-picking the same file
}

function onDrop(e) {
  dragOver.value = false;
  addPickedFiles(e.dataTransfer?.files);
}

function remove(id) {
  files.value = files.value.filter((f) => f.id !== id);
}
function move(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= files.value.length) return;
  const arr = files.value;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
function clearAll() {
  files.value = [];
  error.value = '';
  done.value = '';
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function merge() {
  if (files.value.length < 2 || busy.value) return;
  busy.value = true;
  error.value = '';
  done.value = '';
  try {
    const out = await PDFDocument.create();
    for (const { file } of files.value) {
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    const merged = await out.save();
    const url = URL.createObjectURL(new Blob([merged], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    a.click();
    URL.revokeObjectURL(url);
    done.value = `Merged ${files.value.length} files → merged.pdf`;
  } catch (err) {
    error.value = `Couldn't merge: ${err.message}`;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="tool">
    <header class="tool__head">
      <h1>📄 Merge PDF</h1>
      <p class="text-muted">
        Combine several PDF files into one. Everything runs in your browser — nothing is uploaded.
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
          <input type="file" accept="application/pdf" multiple hidden @change="addFiles" />
          <span class="dropzone__plus">＋</span>
          <span>{{ dragOver ? 'Drop PDF files here' : 'Click or drag & drop PDF files' }}</span>
        </label>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>
    <BaseAlert v-if="done" variant="success">{{ done }}</BaseAlert>

    <ul v-if="files.length" class="filelist">
      <li v-for="(f, i) in files" :key="f.id" class="fileitem">
        <span class="fileitem__idx">{{ i + 1 }}</span>
        <span class="fileitem__name">{{ f.file.name }}</span>
        <span class="text-muted fileitem__size">{{ fmtSize(f.file.size) }}</span>
        <span class="fileitem__actions">
          <button :disabled="i === 0" title="Move up" @click="move(i, -1)">↑</button>
          <button :disabled="i === files.length - 1" title="Move down" @click="move(i, 1)">↓</button>
          <button class="fileitem__del" title="Remove" @click="remove(f.id)">×</button>
        </span>
      </li>
    </ul>

    <div class="tool__actions">
      <BaseButton variant="ghost" :disabled="!files.length || busy" @click="clearAll">Clear</BaseButton>
      <BaseButton :disabled="files.length < 2 || busy" @click="merge">
        {{ busy ? 'Merging…' : 'Merge & download' }}
      </BaseButton>
    </div>
    <p v-if="files.length === 1" class="text-muted tool__hint">Add at least 2 files to merge.</p>
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
  /* drop the title to the same level as "Your sheets" (clears the theme toggle) */
  padding: 80px var(--space-5) 0;
}
.tool__head h1 {
  margin: 0 0 var(--space-2);
}
/* The working component sits in the upper-middle of the space. */
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
.tool__hint {
  text-align: right;
  margin-top: var(--space-2);
}
</style>
