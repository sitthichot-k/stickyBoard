<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '@/modules/auth/stores/auth.js';
import * as api from '@/modules/auth/api/auth.js';
import BaseButton from '@/components/BaseButton.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');
const allowRegistration = ref(false);
const needVerify = ref(false);

onMounted(async () => {
  try {
    allowRegistration.value = (await api.authConfig()).allowRegistration;
  } catch {
    /* ignore — just hide the sign-up link */
  }
});

async function submit() {
  if (busy.value || !email.value || !password.value) return;
  busy.value = true;
  error.value = '';
  needVerify.value = false;
  try {
    await auth.login(email.value.trim(), password.value);
    router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/');
  } catch (e) {
    error.value = e.message;
    needVerify.value = e.response?.data?.code === 'EMAIL_NOT_VERIFIED';
  } finally {
    busy.value = false;
  }
}

async function resend() {
  try {
    await api.resendVerification(email.value.trim());
    error.value = 'Verification email sent — check your inbox.';
    needVerify.value = false;
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <div class="auth">
    <form class="auth__card" @submit.prevent="submit">
      <div class="auth__brand">📌 Sticky Board</div>
      <h1 class="auth__title">Sign in</h1>

      <BaseAlert v-if="error" variant="danger">
        {{ error }}
        <button v-if="needVerify" type="button" class="linkbtn" @click="resend">Resend verification</button>
      </BaseAlert>

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
          autocomplete="current-password"
          required
        />
      </label>

      <BaseButton class="auth__submit" :disabled="busy" type="submit">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </BaseButton>

      <div class="auth__links">
        <RouterLink to="/forgot-password">Forgot password?</RouterLink>
        <RouterLink v-if="allowRegistration" to="/register">Create an account</RouterLink>
      </div>
    </form>
  </div>
</template>

<style scoped>
.linkbtn {
  margin-left: var(--space-2);
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
