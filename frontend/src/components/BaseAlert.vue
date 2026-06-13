<script setup>
defineProps({
  variant: { type: String, default: 'info' }, // success|warning|danger|info
});
</script>

<template>
  <div class="alert" :class="`alert--${variant}`">
    <slot />
  </div>
</template>

<style scoped>
.alert {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  border-left: 4px solid;
  font-size: var(--font-size-base);
}
.alert--success {
  background: var(--color-success-soft);
  border-color: var(--color-success);
  color: var(--color-success);
}
.alert--warning {
  background: var(--color-warning-soft);
  border-color: var(--color-warning);
  color: var(--color-warning);
}
.alert--danger {
  background: var(--color-danger-soft);
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.alert--info {
  background: var(--color-info-soft);
  border-color: var(--color-info);
  color: var(--color-info);
}
</style>
