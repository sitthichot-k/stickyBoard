import http from '@/helpers/http.js';

export const fetchRuntime = () => http.get('/settings/runtime').then((r) => r.data);
export const updateRuntime = (patch) => http.put('/settings/runtime', patch).then((r) => r.data);
export const fetchBlocked = () => http.get('/settings/runtime/blocked').then((r) => r.data);
export const unblock = (key) =>
  http.delete(`/settings/runtime/blocked/${encodeURIComponent(key)}`).then((r) => r.data);
