import { taskService } from '../services/task.service.js';
import { SOCKET_EVENTS, emitToProject } from '../sockets/realtime.js';
import { created, ok } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';

/**
 * Controllers persist via the service FIRST, then broadcast the committed result to the
 * project room. The `x-socket-id` header (set by the frontend socket layer) identifies the
 * originating client so it's excluded from the echo — it already updated optimistically.
 */
const originSocket = (req) => req.headers['x-socket-id'];

export const taskController = {
  list: catchAsync(async (req, res) => {
    const tasks = await taskService.list(req.params.id, req.user.id, req.query);
    ok(res, { tasks });
  }),

  getOne: catchAsync(async (req, res) => {
    const task = await taskService.getByIdAuthorized(req.params.taskId, req.user.id);
    ok(res, { task });
  }),

  create: catchAsync(async (req, res) => {
    const task = await taskService.create(req.params.id, req.user.id, req.body);
    emitToProject(task.project, SOCKET_EVENTS.TASK_CREATED, { task }, originSocket(req));
    created(res, { task });
  }),

  update: catchAsync(async (req, res) => {
    const task = await taskService.update(req.params.taskId, req.user.id, req.body);
    emitToProject(task.project, SOCKET_EVENTS.TASK_UPDATED, { task }, originSocket(req));
    ok(res, { task });
  }),

  move: catchAsync(async (req, res) => {
    const task = await taskService.move(req.params.taskId, req.user.id, req.body);
    emitToProject(
      task.project,
      SOCKET_EVENTS.TASK_MOVED,
      {
        taskId: task.id,
        status: task.status,
        position: task.position,
        projectId: task.project,
      },
      originSocket(req)
    );
    ok(res, { task });
  }),

  remove: catchAsync(async (req, res) => {
    const result = await taskService.remove(req.params.taskId, req.user.id);
    emitToProject(
      result.project,
      SOCKET_EVENTS.TASK_DELETED,
      { taskId: result.id, projectId: result.project },
      originSocket(req)
    );
    ok(res, result);
  }),
};
