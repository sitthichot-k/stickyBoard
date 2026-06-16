<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import * as api from '@/modules/notification/api/notification.js';
import BaseAlert from '@/components/BaseAlert.vue';

const matrix = ref([]); // all events
const templates = ref([]);
const selectedPage = ref('');
const filter = ref('');
const loading = ref(true);
const error = ref('');

const fmtVars = (vars) => vars.map((v) => '{{' + v + '}}').join(' ');
const titleCase = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Only configurable (non-system) events live here; system ones move to Config.
const events = computed(() => matrix.value.filter((r) => !r.system));
const pages = computed(() => [...new Set(events.value.map((e) => e.page))]);

const rows = computed(() => {
  const q = filter.value.trim().toLowerCase();
  return events.value
    .filter((e) => e.page === selectedPage.value)
    .filter((e) => !q || e.label.toLowerCase().includes(q) || e.eventKey.toLowerCase().includes(q));
});
const templateExists = (key) => templates.value.some((t) => t.key === key);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [m, t] = await Promise.all([api.fetchMatrix(), api.fetchTemplates()]);
    matrix.value = m;
    templates.value = t;
    if (!selectedPage.value) selectedPage.value = pages.value[0] || '';
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(pages, (p) => {
  if (!p.includes(selectedPage.value)) selectedPage.value = p[0] || '';
});

async function patchRule(row, patch) {
  try {
    Object.assign(row, await api.setRule({ eventKey: row.eventKey, ...patch }));
  } catch (e) {
    error.value = e.message;
    load();
  }
}
const toggle = (row) => patchRule(row, { enabled: !row.enabled });
const changeTemplate = (row, templateKey) => patchRule(row, { templateKey });
</script>

<template>
  <div class="page">
    <header class="page__head">
      <h1>🔔 Notification Matrix</h1>
      <span class="text-muted">Pick which action sends which email — toggle on/off, no code</span>
    </header>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>

    <div class="toolbar">
      <label class="field">
        <span class="field__label">Page</span>
        <select v-model="selectedPage" class="control">
          <option v-for="p in pages" :key="p" :value="p">{{ titleCase(p) }}</option>
        </select>
      </label>
      <input v-model="filter" class="control filter--grow" type="search" placeholder="🔍 Search actions…" />
    </div>

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="!rows.length" class="text-muted">No actions to configure for this page.</p>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Recipient</th>
            <th class="center">Enabled</th>
            <th>Template</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.eventKey">
            <td>
              <strong>{{ row.label }}</strong>
              <div class="vars text-muted">{{ fmtVars(row.vars) }}</div>
            </td>
            <td class="text-muted nowrap">{{ row.recipient }}</td>
            <td class="center">
              <button
                class="switch"
                :class="{ on: row.enabled }"
                role="switch"
                :aria-checked="row.enabled"
                @click="toggle(row)"
              />
            </td>
            <td>
              <select
                class="control"
                :disabled="!row.enabled"
                :value="row.templateKey"
                @change="changeTemplate(row, $event.target.value)"
              >
                <option v-for="t in templates" :key="t.key" :value="t.key">{{ t.name }}</option>
                <option v-if="!templateExists(row.templateKey)" :value="row.templateKey">
                  {{ row.templateKey }} (built-in)
                </option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
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
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.page__head h1 {
  margin: 0;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.field__label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
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
.filter--grow {
  flex: 1;
  min-width: 200px;
}
.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
}
.table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.table th,
.table td {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
  font-size: var(--font-size-sm);
}
.table th {
  color: var(--color-text-muted);
  background: var(--color-bg);
}
.table th.center,
.table td.center {
  text-align: center;
}
.table tr:last-child td {
  border-bottom: none;
}
.vars {
  font-size: 0.7rem;
  margin-top: 2px;
}
.nowrap {
  white-space: nowrap;
}
.switch {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  border: none;
  background: var(--color-border);
  cursor: pointer;
}
.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease;
}
.switch.on {
  background: var(--color-primary);
}
.switch.on::after {
  transform: translateX(18px);
}
</style>
