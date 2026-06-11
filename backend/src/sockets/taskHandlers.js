import { projectService } from '../services/project.service.js';

import { SOCKET_EVENTS, projectRoom } from './realtime.js';

/**
 * Per-connection event wiring. We only handle ROOM MEMBERSHIP here (join/leave). The actual
 * task mutations happen over REST (validated + persisted there) and are broadcast by the
 * controllers — so the socket channel stays a thin, authorized subscription layer.
 */
export function registerTaskHandlers(io, socket) {
  // Client asks to subscribe to a project's live updates.
  socket.on(SOCKET_EVENTS.JOIN, async ({ projectId } = {}, ack) => {
    try {
      // Re-check authorization: handshake proved WHO the user is; this proves they're
      // allowed in THIS project's room. Without it, any authenticated user could subscribe
      // to any project's events.
      await projectService.getMemberProjectOrThrow(projectId, socket.user.id);
      socket.join(projectRoom(projectId));
      ack?.({ ok: true });
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: err.code || 'JOIN_FAILED',
        message: err.message,
      });
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on(SOCKET_EVENTS.LEAVE, ({ projectId } = {}, ack) => {
    socket.leave(projectRoom(projectId));
    ack?.({ ok: true });
  });

  socket.on('disconnect', () => {
    // Socket.IO auto-removes the socket from all its rooms on disconnect; nothing to do.
  });
}
