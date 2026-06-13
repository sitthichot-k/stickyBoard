import { createRouter, createWebHistory } from 'vue-router';

const routes = [
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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
