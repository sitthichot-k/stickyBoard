import http from '@/helpers/http.js';

export const fetchCameras = () => http.get('/cameras').then((r) => r.data);
export const createCamera = (body) => http.post('/cameras', body).then((r) => r.data);
export const updateCamera = (id, body) => http.patch(`/cameras/${id}`, body).then((r) => r.data);
export const deleteCamera = (id) => http.delete(`/cameras/${id}`);

// Full URL for the HLS playlist (hls.js loads this, attaching the bearer token).
export const hlsUrl = (id) =>
  `${import.meta.env.VITE_API_URL || '/api/v1'}/cameras/${id}/hls/index.m3u8`;

// AI overlay MJPEG (annotated frames). Loaded by an <img>, so the token rides in
// the query string (the backend proxy accepts ?token= for this route).
export const overlayUrl = (id) => {
  const token = localStorage.getItem('token') || '';
  return `${import.meta.env.VITE_API_URL || '/api/v1'}/cameras/${id}/overlay?token=${encodeURIComponent(token)}`;
};
