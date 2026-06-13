import http from '@/helpers/http.js';

export function fetchNotes(sheetId) {
  return http.get('/notes', { params: sheetId ? { sheetId } : {} }).then((res) => res.data);
}

export function createNote(payload) {
  return http.post('/notes', payload).then((res) => res.data);
}

// Partial update (position, color, content, stacking order…).
export function updateNote(id, patch) {
  return http.patch(`/notes/${id}`, patch).then((res) => res.data);
}

export function deleteNote(id) {
  return http.delete(`/notes/${id}`).then((res) => res.data);
}

export function restoreNote(id) {
  return http.post(`/notes/${id}/restore`).then((res) => res.data);
}
