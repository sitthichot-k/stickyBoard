import http from '@/helpers/http.js';

export function fetchStrokes(sheetId) {
  return http.get('/strokes', { params: sheetId ? { sheetId } : {} }).then((res) => res.data);
}

export function createStroke(payload) {
  return http.post('/strokes', payload).then((res) => res.data);
}

export function deleteStroke(id) {
  return http.delete(`/strokes/${id}`).then((res) => res.data);
}

export function restoreStroke(id) {
  return http.post(`/strokes/${id}/restore`).then((res) => res.data);
}
