import { defineStore } from 'pinia';
import * as api from '@/modules/auth/api/auth.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    // Resolved permission map { pageKey: [caps] } from the backend.
    permissions: (state) => state.user?.permissions || {},
    // can(page, capability) — admin always passes.
    can: (state) => (page, capability) =>
      state.user?.role === 'admin' || (state.user?.permissions?.[page] || []).includes(capability),
    // canAccess(page) — may the user open the page at all?
    canAccess() {
      return (page) => this.can(page, 'view');
    },
  },
  actions: {
    async login(email, password) {
      const { token, user } = await api.login(email, password);
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
    },
    // Validate the stored token and load the current user (on app start).
    async fetchMe() {
      if (!this.token) return;
      try {
        this.user = await api.me();
      } catch {
        this.logout();
      }
    },
  },
});
