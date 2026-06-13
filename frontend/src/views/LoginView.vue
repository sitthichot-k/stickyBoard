<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');

async function submit() {
  if (busy.value || !email.value || !password.value) return;
  busy.value = true;
  error.value = '';
  try {
    await auth.login(email.value.trim(), password.value);
    router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/');
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login">
    <form class="login__card" @submit.prevent="submit">
      <div class="login__brand">📌 Sticky Board</div>
      <h1 class="login__title">Sign in</h1>

      <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>

      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" class="field__input" autocomplete="username" required />
      </label>
      <label class="field">
        <span>Password</span>
        <input
          v-model="password"
          type="password"
          class="field__input"
          autocomplete="current-password"
          required
        />
      </label>

      <BaseButton class="login__submit" :disabled="busy" type="submit">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </BaseButton>
    </form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: var(--gradient-bg) fixed;
}
.login__card {
  width: min(380px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.login__brand {
  font-weight: 800;
  font-size: var(--font-size-lg);
  background: var(--gradient-brand);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.login__title {
  margin: 0;
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
.login__submit {
  margin-top: var(--space-2);
}
</style>
