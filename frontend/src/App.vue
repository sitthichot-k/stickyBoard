<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/stores/auth.js';
import { useSettingsStore } from '@/modules/settings/stores/settings.js';

// Restore the saved theme (defaults to light) and apply it before paint.
const theme = ref(localStorage.getItem('theme') || 'light');
document.documentElement.setAttribute('data-theme', theme.value);

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme.value);
  document.documentElement.setAttribute('data-theme', theme.value);
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const settings = useSettingsStore();

// Public pages (login) render full-screen without the app shell.
const showShell = computed(() => !route.meta.public);
const banner = computed(() => settings.announcement);

// Mobile: the sidebar becomes a toggleable drawer; close it on navigation.
const sidebarOpen = ref(false);
watch(() => route.fullPath, () => {
  sidebarOpen.value = false;
});

// Load public settings (banner) whenever the user is signed in.
watch(
  () => auth.isAuthenticated,
  (on) => {
    if (on) settings.loadPublic();
  },
  { immediate: true },
);

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div v-if="showShell" class="app" :class="{ 'app--drawer-open': sidebarOpen }">
    <div class="sidebar-backdrop" @click="sidebarOpen = false" />
    <aside class="sidebar">
      <RouterLink to="/" class="sidebar__brand">📌 Sticky Board</RouterLink>
      <nav class="sidebar__nav">
        <span class="sidebar__group">Boards</span>
        <RouterLink to="/">🗒️ Board</RouterLink>

        <span class="sidebar__group">Tools</span>
        <RouterLink to="/tools/merge-pdf">📄 Merge PDF</RouterLink>
        <RouterLink to="/tools/scan-pdf">🖼️ Scan to PDF</RouterLink>

        <template v-if="auth.isAdmin">
          <span class="sidebar__group">Admin</span>
          <RouterLink to="/admin/dashboard">📊 Dashboard</RouterLink>
          <RouterLink to="/admin/users">👥 Users</RouterLink>
          <RouterLink to="/admin/settings">⚙️ Settings</RouterLink>
          <RouterLink to="/admin/logs">📋 Logs</RouterLink>
        </template>
      </nav>

      <div class="sidebar__foot">
        <div v-if="auth.user" class="sidebar__user">
          <span class="sidebar__user-name">{{ auth.user.name || auth.user.email }}</span>
          <span class="sidebar__role">{{ auth.user.role }}</span>
        </div>
        <button class="sidebar__logout" @click="logout">Sign out</button>
      </div>
    </aside>

    <main class="app__main">
      <div v-if="banner.enabled && banner.message" class="banner" :class="`banner--${banner.level}`">
        {{ banner.message }}
      </div>
      <div class="app__view">
        <button class="sidebar-toggle" aria-label="Open menu" @click="sidebarOpen = true">☰</button>
        <button
          class="theme-toggle"
          :title="theme === 'light' ? 'Switch to dark' : 'Switch to light'"
          @click="toggleTheme"
        >
          {{ theme === 'light' ? '🌙' : '☀️' }}
        </button>
        <RouterView />
      </div>
    </main>
  </div>

  <RouterView v-else />
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
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.sidebar__user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.sidebar__user-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.sidebar__role {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.sidebar__logout {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: var(--color-text-muted);
  text-align: left;
}
.sidebar__logout:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
@media (prefers-reduced-motion: reduce) {
  .sidebar__brand {
    animation: none;
  }
}

/* ---- Main canvas area ---- */
.app__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.app__view {
  position: relative;
  flex: 1;
  overflow: hidden;
}
.banner {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-5);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-align: center;
  color: #fff;
}
.banner--info {
  background: var(--color-info);
}
.banner--warning {
  background: var(--color-warning);
}
.banner--danger {
  background: var(--color-danger);
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

/* Hamburger + backdrop — only used on small screens. */
.sidebar-toggle {
  display: none;
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  z-index: 20;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.2rem;
  box-shadow: var(--shadow-sm);
}
.sidebar-backdrop {
  display: none;
}

/* ---- Mobile: sidebar becomes a slide-in drawer ---- */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: var(--shadow-md);
  }
  .app--drawer-open .sidebar {
    transform: translateX(0);
  }
  .app--drawer-open .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgba(15, 23, 42, 0.45);
  }
  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
