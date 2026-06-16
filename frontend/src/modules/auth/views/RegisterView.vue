<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import * as api from '@/modules/auth/api/auth.js';
import BaseButton from '@/components/BaseButton.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const name = ref('');
const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');
const done = ref(false);

async function submit() {
  if (busy.value || !email.value || !password.value) return;
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await api.register({ name: name.value.trim(), email: email.value.trim(), password: password.value });
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
      <h1 class="auth__title">Create account</h1>

      <BaseAlert v-if="done" variant="success">
        Account created! Check your email to verify it — you can sign in now.
      </BaseAlert>
      <BaseAlert v-else-if="error" variant="danger">{{ error }}</BaseAlert>

      <template v-if="!done">
        <label class="auth-field">
          <span>Name</span>
          <input v-model="name" class="auth-input" autocomplete="name" />
        </label>
        <label class="auth-field">
          <span>Email</span>
          <input v-model="email" type="email" class="auth-input" autocomplete="username" required />
        </label>
        <label class="auth-field">
          <span>Password</span>
          <input
            v-model="password"
            type="password"
            class="auth-input"
            autocomplete="new-password"
            minlength="6"
            required
          />
        </label>
        <BaseButton class="auth__submit" :disabled="busy" type="submit">
          {{ busy ? 'Creating…' : 'Create account' }}
        </BaseButton>
      </template>

      <div class="auth__links">
        <RouterLink to="/login">← Back to sign in</RouterLink>
      </div>
    </form>
  </div>
</template>
