<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/modules/auth/stores/auth.js';
import * as api from '@/modules/auth/api/auth.js';
import BaseButton from '@/components/BaseButton.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const auth = useAuthStore();

const name = ref(auth.user?.name || '');
const savingProfile = ref(false);
const profileMsg = ref('');
const profileErr = ref('');

const pw = ref({ current: '', next: '', confirm: '' });
const savingPw = ref(false);
const pwMsg = ref('');
const pwErr = ref('');

async function saveProfile() {
  if (savingProfile.value) return;
  savingProfile.value = true;
  profileMsg.value = '';
  profileErr.value = '';
  try {
    const user = await api.updateProfile({ name: name.value.trim() });
    auth.setUser(user);
    profileMsg.value = 'Profile updated.';
  } catch (e) {
    profileErr.value = e.message;
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  if (savingPw.value) return;
  pwMsg.value = '';
  pwErr.value = '';
  if (pw.value.next.length < 6) {
    pwErr.value = 'New password must be at least 6 characters';
    return;
  }
  if (pw.value.next !== pw.value.confirm) {
    pwErr.value = 'Passwords do not match';
    return;
  }
  savingPw.value = true;
  try {
    await api.changePassword(pw.value.current, pw.value.next);
    pw.value = { current: '', next: '', confirm: '' };
    pwMsg.value = 'Password changed.';
  } catch (e) {
    pwErr.value = e.message;
  } finally {
    savingPw.value = false;
  }
}
</script>

<template>
  <div class="page">
    <header class="page__head">
      <h1>👤 Account</h1>
    </header>

    <section class="panel">
      <h2 class="panel__title">Profile</h2>
      <div class="meta">
        <span class="text-muted">{{ auth.user?.email }}</span>
        <span class="badge">{{ auth.user?.role }}</span>
        <span v-if="auth.user?.emailVerified" class="badge badge--ok">verified</span>
        <span v-else class="badge badge--warn">unverified</span>
      </div>

      <BaseAlert v-if="profileErr" variant="danger">{{ profileErr }}</BaseAlert>
      <BaseAlert v-else-if="profileMsg" variant="success">{{ profileMsg }}</BaseAlert>

      <label class="field">
        <span>Display name</span>
        <input v-model="name" class="field__input" />
      </label>
      <BaseButton :disabled="savingProfile" @click="saveProfile">
        {{ savingProfile ? 'Saving…' : 'Save profile' }}
      </BaseButton>
    </section>

    <section class="panel">
      <h2 class="panel__title">Change password</h2>
      <BaseAlert v-if="pwErr" variant="danger">{{ pwErr }}</BaseAlert>
      <BaseAlert v-else-if="pwMsg" variant="success">{{ pwMsg }}</BaseAlert>

      <label class="field">
        <span>Current password</span>
        <input v-model="pw.current" type="password" class="field__input" autocomplete="current-password" />
      </label>
      <label class="field">
        <span>New password</span>
        <input v-model="pw.next" type="password" class="field__input" autocomplete="new-password" minlength="6" />
      </label>
      <label class="field">
        <span>Confirm new password</span>
        <input v-model="pw.confirm" type="password" class="field__input" autocomplete="new-password" />
      </label>
      <BaseButton :disabled="savingPw" @click="changePassword">
        {{ savingPw ? 'Saving…' : 'Change password' }}
      </BaseButton>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 80px var(--space-5) var(--space-6);
  max-width: 560px;
  height: 100%;
  overflow: auto;
}
.page__head {
  margin-bottom: var(--space-5);
}
.page__head h1 {
  margin: 0;
}
.panel {
  margin-bottom: var(--space-4);
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.panel__title {
  margin: 0;
  font-size: var(--font-size-base);
}
.meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
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
}
.badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.badge--ok {
  background: var(--color-success-soft);
  color: var(--color-success);
}
.badge--warn {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}
</style>
