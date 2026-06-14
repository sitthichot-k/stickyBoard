import http from '@/helpers/http.js';

export function fetchLogs(params) {
  return http.get('/logs', { params }).then((res) => res.data);
}
