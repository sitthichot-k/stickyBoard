import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the auth token (if any) to every request.
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // Token missing/expired → drop it and bounce to login (except the login call).
    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    const message =
      error.response?.data?.error ?? error.message ?? 'Unexpected network error';
    return Promise.reject(new Error(message));
  },
);

export default http;
