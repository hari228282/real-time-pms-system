import { projectService } from '../services/project.service.js';
import { created, ok } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';

export const projectController = {
  create: catchAsync(async (req, res) => {
    const project = await projectService.create(req.body, req.user.id);
    created(res, { project });
  }),

  list: catchAsync(async (req, res) => {
    const projects = await projectService.listForUser(req.user.id);
    ok(res, { projects });
  }),

  getOne: catchAsync(async (req, res) => {
    const project = await projectService.getById(req.params.id, req.user.id);
    ok(res, { project });
  }),

  update: catchAsync(async (req, res) => {
    const project = await projectService.update(req.params.id, req.user.id, req.body);
    ok(res, { project });
  }),

  remove: catchAsync(async (req, res) => {
    const result = await projectService.remove(req.params.id, req.user.id);
    ok(res, result);
  }),

  addMember: catchAsync(async (req, res) => {
    const project = await projectService.addMember(req.params.id, req.user.id, req.body);
    ok(res, { project });
  }),

  removeMember: catchAsync(async (req, res) => {
    const project = await projectService.removeMember(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    ok(res, { project });
  }),
};
