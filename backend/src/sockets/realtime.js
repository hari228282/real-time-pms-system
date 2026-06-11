/**
 * Tiny indirection that holds the Socket.IO server instance after it's created, so the REST
 * side (controllers) can broadcast room events WITHOUT importing the whole socket setup or
 * creating a circular dependency. This is the "persist-then-broadcast" publish point.
 */
let io = null;

export const SOCKET_EVENTS = Object.freeze({
  JOIN: 'join-project',
  LEAVE: 'leave-project',
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_MOVED: 'task:moved',
  TASK_DELETED: 'task:deleted',
  ERROR: 'error',
});

export const projectRoom = (projectId) => `project:${projectId}`;

export function setIO(instance) {
  io = instance;
}

/**
 * Emit an event to everyone in a project's room. If `exceptSocketId` is provided (the
 * originating client's socket id, sent via the `x-socket-id` header), that client is
 * skipped — it already applied the change optimistically, so re-sending would be redundant.
 */
export function emitToProject(projectId, event, payload, exceptSocketId) {
  if (!io) return; // realtime not initialized (e.g. in tests) — no-op
  const room = projectRoom(projectId);
  if (exceptSocketId) {
    io.to(room).except(exceptSocketId).emit(event, payload);
  } else {
    io.to(room).emit(event, payload);
  }
}
