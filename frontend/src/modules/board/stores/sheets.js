import { defineStore } from 'pinia';
import * as api from '@/modules/board/api/sheets.js';

export const useSheetsStore = defineStore('sheets', {
  state: () => ({
    sheets: [],
    current: null, // the sheet currently open on the board
    loading: false,
    error: '',
  }),
  actions: {
    async load() {
      this.loading = true;
      this.error = '';
      try {
        this.sheets = await api.fetchSheets();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async create({ name, background }) {
      try {
        const sheet = await api.createSheet({ name, background });
        this.sheets.unshift(sheet);
        return sheet;
      } catch (err) {
        this.error = err.message;
        return null;
      }
    },

    async remove(id) {
      const prev = this.sheets;
      this.sheets = this.sheets.filter((s) => s.id !== id); // optimistic
      try {
        await api.deleteSheet(id);
      } catch (err) {
        this.error = err.message;
        this.sheets = prev; // roll back on failure
      }
    },

    // Update the open sheet (e.g. its background style). Optimistic.
    async updateCurrent(patch) {
      if (!this.current) return;
      const prev = this.current;
      this.current = { ...this.current, ...patch };
      try {
        const updated = await api.updateSheet(prev.id, patch);
        this.current = updated;
        const i = this.sheets.findIndex((s) => s.id === updated.id);
        if (i !== -1) this.sheets[i] = updated;
      } catch (err) {
        this.error = err.message;
        this.current = prev; // roll back
      }
    },

    // Open a sheet for the board view; returns the sheet (or null if missing).
    async open(id) {
      try {
        this.current = await api.getSheet(id);
        return this.current;
      } catch (err) {
        this.error = err.message;
        this.current = null;
        return null;
      }
    },
  },
});
