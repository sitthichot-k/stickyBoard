import http from '@/helpers/http.js';

// Templates
export const fetchTemplates = () => http.get('/notifications/templates').then((r) => r.data);
export const createTemplate = (body) => http.post('/notifications/templates', body).then((r) => r.data);
export const updateTemplate = (key, body) =>
  http.patch(`/notifications/templates/${key}`, body).then((r) => r.data);
export const deleteTemplate = (key) => http.delete(`/notifications/templates/${key}`);

// Event matrix
export const fetchMatrix = () => http.get('/notifications/matrix').then((r) => r.data);
export const setRule = (body) => http.put('/notifications/matrix', body).then((r) => r.data);

// Seed defaults (+ preview of what a reset would affect)
export const previewSeed = () => http.get('/notifications/seed-defaults/preview').then((r) => r.data);
export const seedDefaults = () => http.post('/notifications/seed-defaults').then((r) => r.data);
