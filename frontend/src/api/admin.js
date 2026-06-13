import http from './http.js';

export function fetchStats() {
  return http.get('/admin/stats').then((res) => res.data);
}

export function fetchUsers() {
  return http.get('/admin/users').then((res) => res.data);
}

export function createUser(payload) {
  return http.post('/admin/users', payload).then((res) => res.data);
}

export function setRole(id, role) {
  return http.patch(`/admin/users/${id}/role`, { role }).then((res) => res.data);
}

export function deleteUser(id) {
  return http.delete(`/admin/users/${id}`).then((res) => res.data);
}
