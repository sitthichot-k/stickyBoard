<script setup>
import { ref, onMounted } from 'vue';
import * as api from '@/modules/admin/api/admin.js';
import { useAuthStore } from '@/modules/auth/stores/auth.js';
import BaseButton from '@/components/BaseButton.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const auth = useAuthStore();
const users = ref([]);
const loading = ref(false);
const error = ref('');

const showCreate = ref(false);
const form = ref({ email: '', name: '', password: '', role: 'user' });
const saving = ref(false);

const isSelf = (u) => u.id === auth.user?.id;

async function load() {
  loading.value = true;
  error.value = '';
  try {
    users.value = await api.fetchUsers();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function openCreate() {
  form.value = { email: '', name: '', password: '', role: 'user' };
  error.value = '';
  showCreate.value = true;
}
async function create() {
  if (saving.value || !form.value.email || !form.value.password) return;
  saving.value = true;
  error.value = '';
  try {
    const user = await api.createUser({ ...form.value });
    users.value.unshift(user);
    showCreate.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
async function changeRole(u, role) {
  if (role === u.role) return;
  try {
    Object.assign(u, await api.setRole(u.id, role));
  } catch (e) {
    error.value = e.message;
    load(); // resync on failure
  }
}
async function remove(u) {
  if (!confirm(`Delete ${u.email}?`)) return;
  try {
    await api.deleteUser(u.id);
    users.value = users.value.filter((x) => x.id !== u.id);
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <div class="page">
    <header class="page__head">
      <div>
        <h1>Users</h1>
        <span class="text-muted">{{ users.length }} user(s)</span>
      </div>
      <BaseButton @click="openCreate">+ Add user</BaseButton>
    </header>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>

    <table v-if="users.length" class="table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Role</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>
            {{ u.email }}
            <span v-if="isSelf(u)" class="badge">you</span>
          </td>
          <td>{{ u.name || '—' }}</td>
          <td>
            <select
              class="role"
              :value="u.role"
              :disabled="isSelf(u)"
              @change="changeRole(u, $event.target.value)"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </td>
          <td class="table__actions">
            <button class="del" :disabled="isSelf(u)" @click="remove(u)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Create user modal -->
    <div v-if="showCreate" class="modal" @click.self="showCreate = false">
      <form class="modal__box" @submit.prevent="create">
        <h2>Add user</h2>
        <label class="field">
          <span>Email</span>
          <input v-model="form.email" type="email" class="field__input" required />
        </label>
        <label class="field">
          <span>Name</span>
          <input v-model="form.name" class="field__input" />
        </label>
        <label class="field">
          <span>Password</span>
          <input v-model="form.password" type="password" class="field__input" minlength="6" required />
        </label>
        <label class="field">
          <span>Role</span>
          <select v-model="form.role" class="field__input">
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <div class="modal__actions">
          <BaseButton type="button" variant="ghost" @click="showCreate = false">Cancel</BaseButton>
          <BaseButton type="submit" :disabled="saving || !form.email || !form.password">
            {{ saving ? 'Creating…' : 'Create' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 80px var(--space-5) var(--space-6);
  max-width: 880px;
  height: 100%;
  overflow: auto;
}
.page__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}
.page__head h1 {
  margin: 0;
}
.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.table th,
.table td {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.table th {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  background: var(--color-bg);
}
.table tr:last-child td {
  border-bottom: none;
}
.badge {
  margin-left: var(--space-2);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.role {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
}
.role:disabled {
  opacity: 0.6;
}
.table__actions {
  text-align: right;
}
.del {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  cursor: pointer;
  color: var(--color-text-muted);
  font: inherit;
}
.del:hover:not(:disabled) {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.del:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
}
.modal__box {
  width: min(420px, 92vw);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.modal__box h2 {
  margin: 0 0 var(--space-2);
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.field > span {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.field__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  background: var(--color-bg);
  color: var(--color-text);
}
.field__input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 0;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
</style>
