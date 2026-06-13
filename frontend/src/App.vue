<script setup>
import { ref } from 'vue';

// Restore the saved theme (defaults to light) and apply it before paint.
const theme = ref(localStorage.getItem('theme') || 'light');
document.documentElement.setAttribute('data-theme', theme.value);

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme.value);
  document.documentElement.setAttribute('data-theme', theme.value);
}
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <RouterLink to="/" class="sidebar__brand">📌 Sticky Board</RouterLink>
      <nav class="sidebar__nav">
        <span class="sidebar__group">Boards</span>
        <RouterLink to="/">🗒️ Board</RouterLink>

        <span class="sidebar__group">Tools</span>
        <RouterLink to="/tools/merge-pdf">📄 Merge PDF</RouterLink>
      </nav>
      <div class="sidebar__foot text-muted">v1.0</div>
    </aside>

    <main class="app__main">
      <button
        class="theme-toggle"
        :title="theme === 'light' ? 'Switch to dark' : 'Switch to light'"
        @click="toggleTheme"
      >
        {{ theme === 'light' ? '🌙' : '☀️' }}
      </button>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100vh;
}

/* ---- Sidebar: brand + navigation ---- */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-4);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  z-index: 10;
}
.sidebar__brand {
  font-weight: 800;
  font-size: var(--font-size-lg);
  background: var(--gradient-brand);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: brand-shift 8s ease-in-out infinite alternate;
}
.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.sidebar__group {
  margin-top: var(--space-3);
  padding: 0 var(--space-3);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.sidebar__group:first-child {
  margin-top: 0;
}
.sidebar__nav a {
  color: var(--color-text-muted);
  font-weight: 600;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
}
.sidebar__nav a.router-link-active {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.sidebar__foot {
  margin-top: auto;
  font-size: var(--font-size-sm);
}
@media (prefers-reduced-motion: reduce) {
  .sidebar__brand {
    animation: none;
  }
}

/* ---- Main canvas area ---- */
.app__main {
  position: relative;
  flex: 1;
  overflow: hidden;
}
.theme-toggle {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 20;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.1rem;
  box-shadow: var(--shadow-sm);
}
.theme-toggle:hover {
  box-shadow: var(--shadow-md);
}
</style>
