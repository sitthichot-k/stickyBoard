import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'sheets',
    component: () => import('@/views/SheetsView.vue'),
  },
  {
    path: '/sheet/:id',
    name: 'board',
    component: () => import('@/views/BoardView.vue'),
  },
  {
    path: '/tools/merge-pdf',
    name: 'merge-pdf',
    component: () => import('@/views/MergePdfView.vue'),
  },
  {
    path: '/tools/scan-pdf',
    name: 'scan-pdf',
    component: () => import('@/views/ScanPdfView.vue'),
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/views/UsersView.vue'),
    meta: { admin: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// The whole app requires login; only routes with meta.public are open.
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  // Make sure the current user is loaded before role-based checks (e.g. refresh).
  if (auth.token && !auth.user) await auth.fetchMe();

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { path: '/' };
  }
  if (to.meta.admin && !auth.isAdmin) {
    return { path: '/' };
  }
  return true;
});

export default router;
