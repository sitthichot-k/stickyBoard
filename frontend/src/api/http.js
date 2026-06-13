import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Normalise error messages coming back from the API.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ?? error.message ?? 'Unexpected network error';
    return Promise.reject(new Error(message));
  },
);

export default http;
