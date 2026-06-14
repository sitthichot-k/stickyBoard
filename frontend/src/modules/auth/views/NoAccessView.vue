<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/stores/auth.js';
import BaseButton from '@/components/BaseButton.vue';

const router = useRouter();
const auth = useAuthStore();

function signOut() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="noaccess">
    <div class="noaccess__card">
      <h1>🔒 No access</h1>
      <p class="text-muted">
        Your role doesn’t have access to any pages yet. Please contact an
        administrator to be granted permissions.
      </p>
      <BaseButton @click="signOut">Sign out</BaseButton>
    </div>
  </div>
</template>

<style scoped>
.noaccess {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-5);
  background: var(--color-bg);
}
.noaccess__card {
  max-width: 420px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.noaccess__card h1 {
  margin: 0;
}
</style>
