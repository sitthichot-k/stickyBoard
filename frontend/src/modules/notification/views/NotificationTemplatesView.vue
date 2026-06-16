<script setup>
import { ref, onMounted } from 'vue';
import * as api from '@/modules/notification/api/notification.js';
import BaseAlert from '@/components/BaseAlert.vue';
import BaseButton from '@/components/BaseButton.vue';

const templates = ref([]);
const loading = ref(true);
const error = ref('');
const seeding = ref(false);

const showEditor = ref(false);
const editing = ref(null);
const form = ref({ name: '', subject: '', body: '', description: '' });
const saving = ref(false);

const placeholderHint = ['name', 'email', 'link', 'role'].map((v) => '{{' + v + '}}').join(' ');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    templates.value = await api.fetchTemplates();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function runSeed() {
  if (seeding.value) return;
  error.value = '';
  try {
    const preview = await api.previewSeed();
    const affected = preview.filter((p) => p.status === 'edited' || p.status === 'deleted');
    if (affected.length) {
      const list = affected.map((p) => `• ${p.name} (${p.status})`).join('\n');
      if (!confirm(`Reset these to default? Your changes will be overwritten:\n\n${list}`)) return;
    }
    seeding.value = true;
    await api.seedDefaults();
    await load();
  } catch (e) {
    error.value = e.message;
  } finally {
    seeding.value = false;
  }
}

function openNew() {
  editing.value = null;
  form.value = { name: '', subject: '', body: '', description: '' };
  showEditor.value = true;
}
function openEdit(t) {
  editing.value = t.key;
  form.value = { name: t.name, subject: t.subject, body: t.body, description: t.description || '' };
  showEditor.value = true;
}
async function save() {
  if (saving.value || !form.value.name.trim()) return;
  saving.value = true;
  error.value = '';
  try {
    if (editing.value) await api.updateTemplate(editing.value, form.value);
    else await api.createTemplate(form.value);
    showEditor.value = false;
    await load();
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
async function remove(t) {
  if (!confirm(`Delete template "${t.name}"?`)) return;
  try {
    await api.deleteTemplate(t.key);
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
        <h1>✉️ Notification Templates</h1>
        <span class="text-muted">Reusable email templates with placeholders</span>
      </div>
      <div class="head-actions">
        <BaseButton variant="ghost" :disabled="seeding" @click="runSeed">
          {{ seeding ? 'Resetting…' : 'Seed defaults' }}
        </BaseButton>
        <BaseButton @click="openNew">+ New template</BaseButton>
      </div>
    </header>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>
    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="!templates.length" class="text-muted">
      No templates yet — click “Seed defaults” or add one.
    </p>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Subject</th>
            <th>Description</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in templates" :key="t.key">
            <td><strong>{{ t.name }}</strong></td>
            <td class="nowrap"><code>{{ t.key }}</code></td>
            <td class="text-muted">{{ t.subject || '—' }}</td>
            <td class="text-muted">{{ t.description || '—' }}</td>
            <td class="right nowrap">
              <button class="link" @click="openEdit(t)">Edit</button>
              <button class="link link--danger" @click="remove(t)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showEditor" class="modal" @click.self="showEditor = false">
      <div class="modal__box">
        <h2>{{ editing ? 'Edit template' : 'New template' }}</h2>
        <p class="text-muted hint">Placeholders: <code>{{ placeholderHint }}</code> (where the event provides them)</p>
        <label class="field"><span>Name</span><input v-model="form.name" class="control" /></label>
        <label class="field"><span>Subject</span><input v-model="form.subject" class="control" /></label>
        <label class="field"><span>Body</span><textarea v-model="form.body" rows="7" class="control" /></label>
        <label class="field"><span>Description</span><input v-model="form.description" class="control" /></label>
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
.head-actions {
  display: flex;
  gap: var(--space-2);
}
.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.table th,
.table td {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
.table th {
  color: var(--color-text-muted);
  background: var(--color-bg);
}
.table tr:last-child td {
  border-bottom: none;
}
.right {
  text-align: right;
}
.nowrap {
  white-space: nowrap;
}
.link {
  border: none;
  background: none;
  padding: 0 var(--space-2);
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
  width: min(560px, 100%);
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
.modal__box h2 {
  margin: 0;
}
.hint {
  margin: 0;
  font-size: var(--font-size-sm);
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
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
