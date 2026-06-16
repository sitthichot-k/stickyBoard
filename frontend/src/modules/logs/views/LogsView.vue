<script setup>
import { ref, onMounted } from 'vue';
import * as api from '@/modules/logs/api/logs.js';
import BaseAlert from '@/components/BaseAlert.vue';
import BaseButton from '@/components/BaseButton.vue';

const logs = ref([]);
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 });
const loading = ref(false);
const error = ref('');
const filters = ref({ level: '', search: '' });
const page = ref(1);
const limit = ref(20);
const expanded = ref(new Set());

const hasMeta = (l) => l.meta && Object.keys(l.meta).length > 0;
function toggle(id) {
  const s = new Set(expanded.value);
  s.has(id) ? s.delete(id) : s.add(id);
  expanded.value = s;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.fetchLogs({
      page: page.value,
      limit: limit.value,
      level: filters.value.level || undefined,
      search: filters.value.search || undefined,
    });
    logs.value = res.data;
    pagination.value = res.pagination;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function applyFilters() {
  page.value = 1;
  load();
}
function go(p) {
  if (p < 1 || p > pagination.value.totalPages) return;
  page.value = p;
  load();
}
function fmt(ts) {
  return new Date(ts).toLocaleString();
}
</script>

<template>
  <div class="page">
    <header class="page__head">
      <h1>📋 Logs</h1>
      <span class="text-muted">{{ pagination.total }} event(s)</span>
    </header>

    <div class="filters">
      <select v-model="filters.level" class="control" @change="applyFilters">
        <option value="">All levels</option>
        <option value="info">info</option>
        <option value="warn">warn</option>
        <option value="error">error</option>
      </select>
      <input
        v-model="filters.search"
        class="control control--grow"
        placeholder="Search action / message / email…"
        @keyup.enter="applyFilters"
      />
      <select v-model.number="limit" class="control" @change="applyFilters">
        <option :value="20">20 / page</option>
        <option :value="50">50 / page</option>
        <option :value="100">100 / page</option>
      </select>
      <BaseButton variant="ghost" @click="applyFilters">Filter</BaseButton>
    </div>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>
    <p v-else-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="!logs.length" class="text-muted">No logs match.</p>

    <div v-if="logs.length" class="table-wrap">
      <table class="table">
        <thead>
        <tr>
          <th>Time</th>
          <th>Level</th>
          <th>Action</th>
          <th>Actor</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="l in logs" :key="l.id">
          <tr :class="{ 'row--clickable': hasMeta(l) }" @click="hasMeta(l) && toggle(l.id)">
            <td class="nowrap text-muted">
              <span v-if="hasMeta(l)" class="chev">{{ expanded.has(l.id) ? '▾' : '▸' }}</span>
              {{ fmt(l.createdAt) }}
            </td>
            <td><span class="badge" :class="`badge--${l.level}`">{{ l.level }}</span></td>
            <td class="nowrap"><code>{{ l.action }}</code></td>
            <td class="nowrap text-muted">{{ l.userEmail || '—' }}</td>
            <td>{{ l.message }}</td>
          </tr>
          <tr v-if="expanded.has(l.id)" class="meta-row">
            <td :colspan="5"><pre class="meta">{{ JSON.stringify(l.meta, null, 2) }}</pre></td>
          </tr>
        </template>
        </tbody>
      </table>
    </div>

    <div v-if="pagination.totalPages > 1" class="pager">
      <BaseButton variant="ghost" :disabled="page <= 1" @click="go(page - 1)">‹ Prev</BaseButton>
      <span class="text-muted">Page {{ pagination.page }} / {{ pagination.totalPages }}</span>
      <BaseButton variant="ghost" :disabled="page >= pagination.totalPages" @click="go(page + 1)">
        Next ›
      </BaseButton>
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
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.control {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  background: var(--color-bg);
  color: var(--color-text);
}
.control--grow {
  flex: 1;
}
.control:focus {
  outline: 2px solid var(--color-primary);
}
.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-md);
}
.table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.table th,
.table td {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
  font-size: var(--font-size-sm);
}
.table th {
  color: var(--color-text-muted);
  background: var(--color-bg);
}
.table tr:last-child td {
  border-bottom: none;
}
.nowrap {
  white-space: nowrap;
}
.row--clickable {
  cursor: pointer;
}
.row--clickable:hover {
  background: var(--color-primary-soft);
}
.chev {
  display: inline-block;
  width: 12px;
  color: var(--color-text-muted);
}
.meta-row td {
  background: var(--color-bg);
  padding: 0 var(--space-3) var(--space-3);
}
.meta {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text-muted);
}
.badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
}
.badge--info {
  background: var(--color-info-soft);
  color: var(--color-info);
}
.badge--warn {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}
.badge--error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
</style>
