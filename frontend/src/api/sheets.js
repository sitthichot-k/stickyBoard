import http from './http.js';

export function fetchSheets() {
  return http.get('/sheets').then((res) => res.data);
}

export function getSheet(id) {
  return http.get(`/sheets/${id}`).then((res) => res.data);
}

export function createSheet(payload) {
  return http.post('/sheets', payload).then((res) => res.data);
}

export function deleteSheet(id) {
  return http.delete(`/sheets/${id}`).then((res) => res.data);
}
