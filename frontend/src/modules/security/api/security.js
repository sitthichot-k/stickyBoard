import http from '@/helpers/http.js';

// Page catalogue + capability columns for the matrix UI.
export const fetchCatalog = () => http.get('/security/catalog').then((r) => r.data);

// Roles (groups).
export const fetchRoles = () => http.get('/security/roles').then((r) => r.data);
export const createRole = (body) => http.post('/security/roles', body).then((r) => r.data);
export const updateRole = (key, body) => http.patch(`/security/roles/${key}`, body).then((r) => r.data);
export const deleteRole = (key) => http.delete(`/security/roles/${key}`);

// Permission matrix for one role + single-row update.
export const fetchMatrix = (role) =>
  http.get('/security/matrix', { params: { role } }).then((r) => r.data);
export const setMatrixRow = (body) => http.put('/security/matrix', body).then((r) => r.data);
