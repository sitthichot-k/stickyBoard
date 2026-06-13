import http from './http.js';

export function fetchConnections() {
  return http.get('/connections').then((res) => res.data);
}

export function createConnection(payload) {
  return http.post('/connections', payload).then((res) => res.data);
}

export function deleteConnection(id) {
  return http.delete(`/connections/${id}`).then((res) => res.data);
}

export function restoreConnection(id) {
  return http.post(`/connections/${id}/restore`).then((res) => res.data);
}
