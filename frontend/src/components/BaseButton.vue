<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary|success|warning|danger|info|ghost
  size: { type: String, default: 'md' }, // sm|md|lg
  disabled: { type: Boolean, default: false },
});
</script>

<template>
  <button class="btn" :class="[`btn--${variant}`, `btn--${size}`]" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.btn {
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease, background 0.15s ease;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn:not(:disabled):hover {
  filter: brightness(0.95);
}

/* sizes */
.btn--sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
}
.btn--md {
  padding: var(--space-2) var(--space-4);
}
.btn--lg {
  padding: var(--space-3) var(--space-5);
  font-size: var(--font-size-lg);
}

/* variants */
.btn--primary {
  background: var(--gradient-brand);
  background-size: 200% 200%;
  color: #fff;
  border: none;
  animation: brand-shift 8s ease-in-out infinite alternate;
}
@media (prefers-reduced-motion: reduce) {
  .btn--primary {
    animation: none;
  }
}
.btn--success {
  background: var(--color-success);
  color: #fff;
}
.btn--warning {
  background: var(--color-warning);
  color: #fff;
}
.btn--danger {
  background: var(--color-danger);
  color: #fff;
}
.btn--info {
  background: var(--color-info);
  color: #fff;
}
.btn--ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}
</style>
