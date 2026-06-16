<script setup>
import { ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import * as api from '@/modules/auth/api/auth.js';
import BaseButton from '@/components/BaseButton.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const route = useRoute();
const token = String(route.query.token ?? '');
const password = ref('');
const confirm = ref('');
const busy = ref(false);
const error = ref('');
const done = ref(false);

async function submit() {
  if (busy.value) return;
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await api.resetPassword(token, password.value);
    done.value = true;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <form class="auth__card" @submit.prevent="submit">
      <div class="auth__brand">📌 Sticky Board</div>
      <h1 class="auth__title">Set a new password</h1>

      <BaseAlert v-if="!token" variant="danger">Missing or invalid reset link.</BaseAlert>
      <BaseAlert v-else-if="done" variant="success">Password updated — you can sign in now.</BaseAlert>
      <BaseAlert v-else-if="error" variant="danger">{{ error }}</BaseAlert>

      <template v-if="token && !done">
        <label class="auth-field">
          <span>New password</span>
          <input v-model="password" type="password" class="auth-input" autocomplete="new-password" minlength="6" required />
        </label>
        <label class="auth-field">
          <span>Confirm password</span>
          <input v-model="confirm" type="password" class="auth-input" autocomplete="new-password" required />
        </label>
        <BaseButton class="auth__submit" :disabled="busy" type="submit">
          {{ busy ? 'Saving…' : 'Update password' }}
        </BaseButton>
      </template>

      <div class="auth__links">
        <RouterLink to="/login">← Back to sign in</RouterLink>
      </div>
    </form>
  </div>
</template>
