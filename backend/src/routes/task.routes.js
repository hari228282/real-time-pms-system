import { Router } from 'express';

import { taskController } from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createTaskSchema,
  listTasksSchema,
  moveTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from '../validators/task.validators.js';

// mergeParams lets this router read :id from the parent project route (/projects/:id/tasks).
const router = Router({ mergeParams: true });

router.use(requireAuth);

// Collection routes — nested under a project.
router.get('/', validate(listTasksSchema), taskController.list);
router.post('/', validate(createTaskSchema), taskController.create);

export default router;

/**
 * Item-level routes live on a flat /api/tasks/:taskId path (a task id is globally unique, so
 * we don't need the project in the URL). Exported separately and mounted in app.js.
 */
export const taskItemRouter = Router();
taskItemRouter.use(requireAuth);
taskItemRouter.get('/:taskId', validate(taskIdSchema), taskController.getOne);
taskItemRouter.patch('/:taskId', validate(updateTaskSchema), taskController.update);
taskItemRouter.patch('/:taskId/status', validate(moveTaskSchema), taskController.move);
taskItemRouter.delete('/:taskId', validate(taskIdSchema), taskController.remove);
