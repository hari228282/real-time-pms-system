import { useEffect, useState } from 'react';

import { connectSocket, getSocket } from '../socket/socket.js';
import { useAuthStore } from '../store/authStore.js';
import { useBoardStore } from '../store/boardStore.js';

/**
 * The ONE socket abstraction components use. Given a projectId it:
 *   1. ensures the shared socket is connected (authenticated with the JWT),
 *   2. joins the project room and re-joins automatically on reconnect,
 *   3. translates incoming task:* events into board-store mutations,
 *   4. cleans up its listeners + leaves the room on unmount.
 *
 * Components never touch socket.on/emit directly — they just render the store. This keeps
 * the socket lifecycle in one testable place and avoids duplicate listeners across renders.
 */
export function useProjectSocket(projectId) {
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!projectId || !token) return;

    const socket = connectSocket(token);
    const board = useBoardStore.getState();

    const join = () => socket.emit('join-project', { projectId });

    // If we're already connected, join now; otherwise join on (re)connect.
    if (socket.connected) {
      setConnected(true);
      join();
    }

    const onConnect = () => {
      setConnected(true);
      join(); // re-join after a reconnect so we don't miss events
    };
    const onDisconnect = () => setConnected(false);

    const onCreated = ({ task }) => board.upsertTask(task);
    const onUpdated = ({ task }) => board.upsertTask(task);
    const onMoved = (payload) => board.applyMoved(payload);
    const onDeleted = ({ taskId }) => board.removeTask(taskId);
    const onError = (err) => useBoardStore.getState().setError(err.message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:moved', onMoved);
    socket.on('task:deleted', onDeleted);
    socket.on('error', onError);

    return () => {
      socket.emit('leave-project', { projectId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:moved', onMoved);
      socket.off('task:deleted', onDeleted);
      socket.off('error', onError);
    };
  }, [projectId, token]);

  return { connected: connected || !!getSocket()?.connected };
}
