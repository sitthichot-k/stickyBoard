import http from '@/helpers/http.js';

// List violations (paginated). `params` may include { page, limit, status, cameraId, search }.
export const fetchViolations = (params = {}) =>
  http.get('/violations', { params }).then((r) => r.data);

export const fetchViolation = (id) => http.get(`/violations/${id}`).then((r) => r.data);

export const reviewViolation = (id, body) =>
  http.patch(`/violations/${id}`, body).then((r) => r.data);

export const deleteViolation = (id) => http.delete(`/violations/${id}`);

// The snapshot is auth-gated, so an <img src> can't carry the bearer token —
// fetch it as a blob and hand back an object URL (callers must revoke it).
export async function fetchSnapshotUrl(id) {
  const res = await http.get(`/violations/${id}/snapshot`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}
