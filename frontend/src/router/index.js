import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/modules/auth/stores/auth.js';

// `meta.page` ties a route to a permission-matrix page key; the guard checks
// the user can view it (admin always can).
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/no-access',
    name: 'no-access',
    component: () => import('@/modules/auth/views/NoAccessView.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/modules/auth/views/RegisterView.vue'),
    meta: { public: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/modules/auth/views/ForgotPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/modules/auth/views/ResetPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('@/modules/auth/views/VerifyEmailView.vue'),
    meta: { public: true },
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/modules/auth/views/AccountView.vue'),
    // No meta.page — every signed-in user can manage their own account.
  },
  {
    path: '/',
    name: 'sheets',
    component: () => import('@/modules/board/views/SheetsView.vue'),
    meta: { page: 'sheets' },
  },
  {
    path: '/sheet/:id',
    name: 'board',
    component: () => import('@/modules/board/views/BoardView.vue'),
    meta: { page: 'sheets' },
  },
  {
    path: '/tools/merge-pdf',
    name: 'merge-pdf',
    component: () => import('@/modules/tools/views/MergePdfView.vue'),
    meta: { page: 'merge-pdf' },
  },
  {
    path: '/tools/scan-pdf',
    name: 'scan-pdf',
    component: () => import('@/modules/tools/views/ScanPdfView.vue'),
    meta: { page: 'scan-pdf' },
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('@/modules/admin/views/DashboardView.vue'),
    meta: { page: 'admin-dashboard' },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/modules/admin/views/UsersView.vue'),
    meta: { page: 'admin-users' },
  },
  {
    path: '/admin/settings',
    name: 'admin-settings',
    component: () => import('@/modules/settings/views/SettingsView.vue'),
    meta: { page: 'admin-settings' },
  },
  {
    path: '/admin/config',
    name: 'admin-config',
    component: () => import('@/modules/config/views/ConfigView.vue'),
    meta: { page: 'admin-config' },
  },
  {
    path: '/admin/notification-templates',
    name: 'admin-notification-templates',
    component: () => import('@/modules/notification/views/NotificationTemplatesView.vue'),
    meta: { page: 'admin-notifications' },
  },
  {
    path: '/admin/notification-matrix',
    name: 'admin-notification-matrix',
    component: () => import('@/modules/notification/views/NotificationMatrixView.vue'),
    meta: { page: 'admin-notifications' },
  },
  {
    path: '/admin/cameras',
    name: 'admin-cameras',
    component: () => import('@/modules/camera/views/CamerasView.vue'),
    meta: { page: 'admin-cameras' },
  },
  {
    path: '/admin/logs',
    name: 'admin-logs',
    component: () => import('@/modules/logs/views/LogsView.vue'),
    meta: { page: 'admin-logs' },
  },
  {
    path: '/admin/security',
    name: 'admin-security',
    component: () => import('@/modules/security/views/SecurityView.vue'),
    meta: { page: 'admin-security' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// The whole app requires login; only routes with meta.public are open.
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  // Make sure the current user (incl. permissions) is loaded before checks.
  if (auth.token && !auth.user) await auth.fetchMe();

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { path: '/' };
  }
  // Permission-gated pages: fall back to the boards page, or a notice if the
  // user can't access anything.
  if (to.meta.page && !auth.canAccess(to.meta.page)) {
    return auth.canAccess('sheets') ? { path: '/' } : { name: 'no-access' };
  }
  return true;
});

export default router;
