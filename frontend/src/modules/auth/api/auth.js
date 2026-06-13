import http from '@/helpers/http.js';

export function login(email, password) {
  return http.post('/auth/login', { email, password }).then((res) => res.data);
}

export function me() {
  return http.get('/auth/me').then((res) => res.data);
}
