import http from '@/helpers/http.js';

export function login(email, password) {
  return http.post('/auth/login', { email, password }).then((res) => res.data);
}

export function me() {
  return http.get('/auth/me').then((res) => res.data);
}

// Public flags for the login/register pages (no auth needed).
export function authConfig() {
  return http.get('/auth/config').then((res) => res.data);
}

export function register(payload) {
  return http.post('/auth/register', payload).then((res) => res.data);
}

export function verifyEmail(token) {
  return http.post('/auth/verify-email', { token }).then((res) => res.data);
}

export function resendVerification(email) {
  return http.post('/auth/resend-verification', { email }).then((res) => res.data);
}

export function forgotPassword(email) {
  return http.post('/auth/forgot-password', { email }).then((res) => res.data);
}

export function resetPassword(token, password) {
  return http.post('/auth/reset-password', { token, password }).then((res) => res.data);
}

export function updateProfile(payload) {
  return http.patch('/auth/me', payload).then((res) => res.data);
}

export function changePassword(currentPassword, newPassword) {
  return http.post('/auth/change-password', { currentPassword, newPassword }).then((res) => res.data);
}
