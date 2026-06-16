<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import * as api from '@/modules/auth/api/auth.js';
import BaseButton from '@/components/BaseButton.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const route = useRoute();
const token = String(route.query.token ?? '');
const status = ref('verifying'); // verifying | ok | fail
const resendEmail = ref('');
const resent = ref(false);

onMounted(async () => {
  if (!token) {
    status.value = 'fail';
    return;
  }
  try {
    await api.verifyEmail(token);
    status.value = 'ok';
  } catch {
    status.value = 'fail';
  }
});

async function resend() {
  if (!resendEmail.value) return;
  try {
    await api.resendVerification(resendEmail.value.trim());
    resent.value = true;
  } catch {
    resent.value = true; // generic — don't reveal account existence
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth__card">
      <div class="auth__brand">📌 Sticky Board</div>
      <h1 class="auth__title">Email verification</h1>

      <p v-if="status === 'verifying'" class="text-muted">Verifying…</p>

      <BaseAlert v-else-if="status === 'ok'" variant="success">
        Your email is verified. You can sign in now.
      </BaseAlert>

      <template v-else>
        <BaseAlert variant="danger">This verification link is invalid or has expired.</BaseAlert>
        <BaseAlert v-if="resent" variant="success">If the account exists, a new link was sent.</BaseAlert>
        <template v-else>
          <label class="auth-field">
            <span>Resend verification to</span>
            <input v-model="resendEmail" type="email" class="auth-input" placeholder="your@email.com" />
          </label>
          <BaseButton variant="ghost" @click="resend">Resend link</BaseButton>
        </template>
      </template>

      <div class="auth__links">
        <RouterLink to="/login">← Back to sign in</RouterLink>
      </div>
    </div>
  </div>
</template>
