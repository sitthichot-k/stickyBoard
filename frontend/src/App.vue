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

// Per-user accent colour (stored in localStorage — changes only this browser).
const ACCENTS = [
  { key: 'violet', color: '#8b5cf6' },
  { key: 'ocean', color: '#0ea5e9' },
  { key: 'emerald', color: '#10b981' },
  { key: 'rose', color: '#f43f5e' },
];
const accent = ref(localStorage.getItem('accent') || 'violet');
document.documentElement.setAttribute('data-accent', accent.value);

function setAccent(key) {
  accent.value = key;
  localStorage.setItem('accent', key);
  document.documentElement.setAttribute('data-accent', key);
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const settings = useSettingsStore();

// Public pages (login) render full-screen without the app shell.
const showShell = computed(() => !route.meta.public);
const banner = computed(() => settings.announcement);

// Sidebar navigation — each item maps to a permission page; only the ones the
// user can access are shown (admin sees all), and empty groups are hidden.
const navGroups = [
  { name: 'Boards', items: [{ to: '/', label: '🗒️ Board', page: 'sheets' }] },
  {
    name: 'Tools',
    items: [
      { to: '/tools/merge-pdf', label: '📄 Merge PDF', page: 'merge-pdf' },
      { to: '/tools/scan-pdf', label: '🖼️ Scan to PDF', page: 'scan-pdf' },
    ],
  },
  {
    name: 'Admin',
    items: [
      { to: '/admin/dashboard', label: '📊 Dashboard', page: 'admin-dashboard' },
      { to: '/admin/users', label: '👥 Users', page: 'admin-users' },
      { to: '/admin/settings', label: '⚙️ Settings', page: 'admin-settings' },
      { to: '/admin/config', label: '🛠️ Config', page: 'admin-config' },
      { to: '/admin/notification-templates', label: '✉️ Noti Templates', page: 'admin-notifications' },
      { to: '/admin/notification-matrix', label: '🔔 Noti Matrix', page: 'admin-notifications' },
      { to: '/admin/cameras', label: '📹 Cameras', page: 'admin-cameras' },
      { to: '/admin/logs', label: '📋 Logs', page: 'admin-logs' },
      { to: '/admin/security', label: '🛡️ Permission Matrix', page: 'admin-security' },
    ],
  },
];
const visibleGroups = computed(() =>
  navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => auth.canAccess(i.page)) }))
    .filter((g) => g.items.length),
);

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
        <template v-for="g in visibleGroups" :key="g.name">
          <span class="sidebar__group">{{ g.name }}</span>
          <RouterLink v-for="i in g.items" :key="i.to" :to="i.to">{{ i.label }}</RouterLink>
        </template>
      </nav>

      <div class="sidebar__foot">
        <div class="sidebar__theme">
          <span class="sidebar__theme-label">Theme color</span>
          <div class="sidebar__swatches">
            <button
              v-for="a in ACCENTS"
              :key="a.key"
              class="swatch"
              :class="{ on: accent === a.key }"
              :style="{ background: a.color }"
              :title="a.key"
              :aria-label="`${a.key} theme`"
              @click="setAccent(a.key)"
            />
          </div>
        </div>
        <RouterLink v-if="auth.user" to="/account" class="sidebar__user" title="Account settings">
          <span class="sidebar__user-name">{{ auth.user.name || auth.user.email }}</span>
          <span class="sidebar__role">{{ auth.user.role }}</span>
        </RouterLink>
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
  gap: var(--space-3);
}
.sidebar__theme {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.sidebar__theme-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.sidebar__swatches {
  display: flex;
  gap: var(--space-2);
}
.swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  box-shadow: var(--shadow-sm);
  transition: transform 0.12s ease;
}
.swatch:hover {
  transform: scale(1.12);
}
.swatch.on {
  border-color: var(--color-text);
}
.sidebar__user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
}
.sidebar__user:hover {
  background: var(--color-primary-soft);
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
