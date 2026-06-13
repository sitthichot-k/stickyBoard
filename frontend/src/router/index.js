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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// The whole app requires login; only routes with meta.public are open.
router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { path: '/' };
  }
  return true;
});

export default router;
