import { defineStore } from 'pinia';
import * as api from '@/modules/settings/api/settings.js';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    announcement: { enabled: false, message: '', level: 'info' },
  }),
  actions: {
    async loadPublic() {
      try {
        const s = await api.fetchPublicSettings();
        if (s.announcement) this.announcement = s.announcement;
      } catch {
        /* ignore — banner just stays hidden */
      }
    },
  },
});
