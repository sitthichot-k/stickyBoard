<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import * as api from '@/modules/auth/api/auth.js';
import BaseButton from '@/components/BaseButton.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const email = ref('');
const busy = ref(false);
const sent = ref(false);
const error = ref('');

async function submit() {
  if (busy.value || !email.value) return;
  busy.value = true;
  error.value = '';
  try {
    await api.forgotPassword(email.value.trim());
    sent.value = true;
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
      <h1 class="auth__title">Reset password</h1>

      <BaseAlert v-if="sent" variant="success">
        If an account exists for that email, a reset link is on its way.
      </BaseAlert>
      <BaseAlert v-else-if="error" variant="danger">{{ error }}</BaseAlert>

      <template v-if="!sent">
        <label class="auth-field">
          <span>Email</span>
          <input v-model="email" type="email" class="auth-input" autocomplete="username" required />
        </label>
        <BaseButton class="auth__submit" :disabled="busy" type="submit">
          {{ busy ? 'Sending…' : 'Send reset link' }}
        </BaseButton>
      </template>

      <div class="auth__links">
        <RouterLink to="/login">← Back to sign in</RouterLink>
      </div>
    </form>
  </div>
</template>
