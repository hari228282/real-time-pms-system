import { io } from 'socket.io-client';

/**
 * Single shared Socket.IO client for the whole app. We keep ONE connection (not one per
 * component) and expose helpers to connect/disconnect. The token is attached in
 * `handshake.auth` so the backend's io.use() middleware can authenticate the connection.
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined; // undefined => same origin

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token }, // read by socketAuth() on the server handshake
    autoConnect: true,
    transports: ['websocket'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

/** Current socket id, sent as `x-socket-id` on REST mutations so the server can skip echoing
 *  the change back to the originator (it already applied it optimistically). */
export function getSocketId() {
  return socket?.id;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
