import http from '@/helpers/http.js';

export function fetchPublicSettings() {
  return http.get('/settings').then((res) => res.data);
}

export function fetchAllSettings() {
  return http.get('/settings/all').then((res) => res.data);
}

export function updateSetting(key, value) {
  return http.put(`/settings/${key}`, { value }).then((res) => res.data);
}
