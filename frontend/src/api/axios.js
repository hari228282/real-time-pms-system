import axios from 'axios';

import { getSocketId } from '../socket/socket.js';
import { useAuthStore } from '../store/authStore.js';

/**
 * One configured axios instance for the whole app. Interceptors are the single place we:
 *  - inject the JWT (request) so no call site repeats auth wiring,
 *  - attach the socket id (request) so the server excludes us from our own event echo,
 *  - unwrap the { success, data } envelope and centralize 401 handling (response).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const socketId = getSocketId();
  if (socketId) config.headers['x-socket-id'] = socketId;

  return config;
});

api.interceptors.response.use(
  // Unwrap so callers get `data` directly instead of `res.data.data`.
  (res) => res.data?.data ?? res.data,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data?.error;

    // A 401 means the token is missing/expired — force a clean logout so the UI redirects.
    if (status === 401) {
      useAuthStore.getState().logout();
    }

    // Normalize to a plain Error with the server's message for components to display.
    const message = payload?.message || error.message || 'Request failed';
    return Promise.reject(Object.assign(new Error(message), { status, code: payload?.code }));
  }
);

export default api;
