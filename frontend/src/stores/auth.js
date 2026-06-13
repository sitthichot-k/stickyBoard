import { defineStore } from 'pinia';
import * as api from '@/api/auth.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
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
