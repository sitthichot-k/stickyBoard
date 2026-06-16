import http from '@/helpers/http.js';

export const fetchRuntime = () => http.get('/settings/runtime').then((r) => r.data);
export const updateRuntime = (patch) => http.put('/settings/runtime', patch).then((r) => r.data);
export const fetchBlocked = () => http.get('/settings/runtime/blocked').then((r) => r.data);
export const unblock = (key) =>
  http.delete(`/settings/runtime/blocked/${encodeURIComponent(key)}`).then((r) => r.data);

// SMTP config (password is write-only — never returned).
export const fetchMail = () => http.get('/settings/mail').then((r) => r.data);
export const updateMail = (patch) => http.put('/settings/mail', patch).then((r) => r.data);
export const testMail = () => http.post('/settings/mail/test').then((r) => r.data);
