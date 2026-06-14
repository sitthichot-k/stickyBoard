<script setup>
import { ref, computed, watch } from 'vue';
import * as api from '@/modules/security/api/security.js';
import BaseAlert from '@/components/BaseAlert.vue';
import BaseButton from '@/components/BaseButton.vue';

// owner/logs are modifiers, not access grants — the "All" master toggle only
// covers the access capabilities (view/edit/delete/action).
const MODIFIERS = ['owner', 'logs'];

const catalog = ref({ pages: [], capabilities: [] });
const roles = ref([]);
const selectedRole = ref('');
const grants = ref({}); // { pageKey: [caps] }
const filter = ref('');
const newRoleName = ref('');
const loading = ref(true);
const error = ref('');

const capKeys = computed(() => catalog.value.capabilities.map((c) => c.key));
const accessKeys = computed(() => capKeys.value.filter((k) => !MODIFIERS.includes(k)));
const isAdminRole = computed(() => selectedRole.value === 'admin');
const selectedRoleObj = computed(() => roles.value.find((r) => r.key === selectedRole.value));
const canDeleteRole = computed(() => selectedRoleObj.value && !selectedRoleObj.value.isSystem);
const ruleCount = computed(() =>
  Object.values(grants.value).reduce((n, caps) => n + caps.length, 0),
);

const visiblePages = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return catalog.value.pages;
  return catalog.value.pages.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q),
  );
});

async function loadAll() {
  loading.value = true;
  error.value = '';
  try {
    const [cat, rs] = await Promise.all([api.fetchCatalog(), api.fetchRoles()]);
    catalog.value = cat;
    roles.value = rs;
    if (!selectedRole.value) {
      selectedRole.value = rs.find((r) => r.key === 'user')?.key || rs[0]?.key || '';
    }
    await loadMatrix();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loadMatrix() {
  if (!selectedRole.value) return;
  const { rows } = await api.fetchMatrix(selectedRole.value);
  grants.value = Object.fromEntries(rows.map((r) => [r.pageKey, r.granted]));
}

watch(selectedRole, loadMatrix);

const has = (pageKey, cap) => (grants.value[pageKey] || []).includes(cap);
const hasAll = (pageKey) => accessKeys.value.every((k) => has(pageKey, k));

async function save(pageKey, granted) {
  const prev = grants.value[pageKey] || [];
  grants.value = { ...grants.value, [pageKey]: granted }; // optimistic
  try {
    const row = await api.setMatrixRow({ roleKey: selectedRole.value, pageKey, granted });
    grants.value = { ...grants.value, [pageKey]: row.granted };
  } catch (e) {
    grants.value = { ...grants.value, [pageKey]: prev }; // revert
    error.value = e.message;
  }
}

function toggle(pageKey, cap) {
  if (isAdminRole.value) return;
  const set = new Set(grants.value[pageKey] || []);
  set.has(cap) ? set.delete(cap) : set.add(cap);
  save(pageKey, [...set]);
}

function toggleAll(pageKey) {
  if (isAdminRole.value) return;
  const on = hasAll(pageKey);
  const set = new Set(grants.value[pageKey] || []);
  accessKeys.value.forEach((k) => (on ? set.delete(k) : set.add(k)));
  save(pageKey, [...set]);
}

async function addRole() {
  const name = newRoleName.value.trim();
  if (!name) return;
  error.value = '';
  try {
    const role = await api.createRole({ name });
    roles.value.push(role);
    newRoleName.value = '';
    selectedRole.value = role.key; // triggers loadMatrix
  } catch (e) {
    error.value = e.message;
  }
}

async function removeRole() {
  if (!canDeleteRole.value) return;
  const key = selectedRole.value;
  if (!confirm(`Delete role "${selectedRoleObj.value.name}"? Its permissions are removed.`)) return;
  error.value = '';
  try {
    await api.deleteRole(key);
    roles.value = roles.value.filter((r) => r.key !== key);
    selectedRole.value = roles.value.find((r) => r.key === 'user')?.key || roles.value[0]?.key || '';
  } catch (e) {
    error.value = e.message;
  }
}

loadAll();
</script>

<template>
  <div class="page">
    <header class="page__head">
      <h1>🛡️ Permission Matrix</h1>
      <span class="text-muted">{{ catalog.pages.length }} pages · {{ ruleCount }} grants</span>
    </header>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>

    <div class="toolbar">
      <label class="field">
        <span class="field__label">Group</span>
        <select v-model="selectedRole" class="control">
          <option v-for="r in roles" :key="r.key" :value="r.key">
            {{ r.name }} ({{ r.key }})
          </option>
        </select>
      </label>
      <BaseButton
        v-if="canDeleteRole"
        variant="ghost"
        class="danger-btn"
        @click="removeRole"
      >
        Delete role
      </BaseButton>

      <form class="field field--grow new-role" @submit.prevent="addRole">
        <input v-model="newRoleName" class="control" placeholder="New role name…" />
        <BaseButton type="submit" variant="ghost">Add role</BaseButton>
      </form>

      <input v-model="filter" class="control filter" placeholder="Filter pages…" />
    </div>

    <p v-if="isAdminRole" class="text-muted note">
      The <strong>admin</strong> role always has full access — toggles are read-only.
    </p>

    <p v-if="loading" class="text-muted">Loading…</p>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Page</th>
            <th>Path</th>
            <th class="center">All</th>
            <th v-for="c in catalog.capabilities" :key="c.key" class="center" :title="c.help">
              {{ c.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in visiblePages" :key="p.key">
            <td>
              <strong>{{ p.label }}</strong>
              <span class="group-tag">{{ p.group }}</span>
            </td>
            <td class="text-muted"><code>{{ p.path }}</code></td>
            <td class="center">
              <button
                class="switch"
                :class="{ on: hasAll(p.key) }"
                :disabled="isAdminRole"
                role="switch"
                :aria-checked="hasAll(p.key)"
                @click="toggleAll(p.key)"
              />
            </td>
            <td v-for="c in catalog.capabilities" :key="c.key" class="center">
              <button
                class="switch"
                :class="{ on: has(p.key, c.key), [`switch--${c.key}`]: true }"
                :disabled="isAdminRole"
                role="switch"
                :aria-checked="has(p.key, c.key)"
                @click="toggle(p.key, c.key)"
              />
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
.field--grow {
  flex: 1;
}
.new-role {
  flex-direction: row;
  align-items: stretch;
  gap: var(--space-2);
  min-width: 220px;
}
.new-role .control {
  flex: 1;
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
.filter {
  margin-left: auto;
}
.danger-btn:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}
.note {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-sm);
}
.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-md);
}
.table {
  width: 100%;
  min-width: 760px;
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
  font-size: var(--font-size-sm);
}
.table th {
  color: var(--color-text-muted);
  background: var(--color-bg);
  white-space: nowrap;
}
.table th.center,
.table td.center {
  text-align: center;
}
.table tr:last-child td {
  border-bottom: none;
}
.group-tag {
  margin-left: var(--space-2);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

/* Toggle switch */
.switch {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  border: none;
  background: var(--color-border);
  cursor: pointer;
  transition: background 0.15s ease;
  vertical-align: middle;
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
  transform: translateX(16px);
}
.switch:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
/* tint the two modifier toggles so they read as different from access grants */
.switch--owner.on {
  background: var(--color-warning);
}
.switch--logs.on {
  background: var(--color-info);
}
</style>
