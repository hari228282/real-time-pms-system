import { Router } from 'express';

import { projectController } from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  addMemberSchema,
  createProjectSchema,
  projectIdSchema,
  removeMemberSchema,
  updateProjectSchema,
} from '../validators/project.validators.js';

import taskRouter from './task.routes.js';

const router = Router();

// Every project route requires authentication.
router.use(requireAuth);

router.post('/', validate(createProjectSchema), projectController.create);
router.get('/', projectController.list);
router.get('/:id', validate(projectIdSchema), projectController.getOne);
router.patch('/:id', validate(updateProjectSchema), projectController.update);
router.delete('/:id', validate(projectIdSchema), projectController.remove);

router.post('/:id/members', validate(addMemberSchema), projectController.addMember);
router.delete(
  '/:id/members/:userId',
  validate(removeMemberSchema),
  projectController.removeMember
);

// Nested task collection: /api/projects/:id/tasks  (mergeParams picks up :id)
router.use('/:id/tasks', taskRouter);

export default router;
