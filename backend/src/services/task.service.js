import { Task } from '../models/task.model.js';
import AppError from '../utils/AppError.js';

import { projectService } from './project.service.js';

/**
 * Task business logic. Every operation first re-uses projectService.getMemberProjectOrThrow
 * to enforce that the caller is a member of the task's project — authorization is centralized,
 * never duplicated. This is the only layer touching the Task model.
 */

async function list(projectId, userId, { status, limit = 100, page = 1 } = {}) {
  await projectService.getMemberProjectOrThrow(projectId, userId);

  const filter = { project: projectId };
  if (status) filter.status = status;

  const tasks = await Task.find(filter)
    .sort({ status: 1, position: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return tasks;
}

async function getByIdAuthorized(taskId, userId) {
  const task = await Task.findById(taskId);
  if (!task) throw AppError.notFound('Task not found');
  // Authorize via the task's project membership.
  await projectService.getMemberProjectOrThrow(task.project, userId);
  return task;
}

async function create(projectId, userId, data) {
  await projectService.getMemberProjectOrThrow(projectId, userId);

  const task = await Task.create({
    project: projectId,
    title: data.title,
    description: data.description ?? '',
    status: data.status ?? 'todo',
    assignee: data.assignee ?? null,
    position: data.position ?? Date.now(), // append to end by default
    createdBy: userId,
  });
  return task;
}

async function update(taskId, userId, patch) {
  const task = await getByIdAuthorized(taskId, userId);

  for (const field of ['title', 'description', 'assignee']) {
    if (patch[field] !== undefined) task[field] = patch[field];
  }
  await task.save();
  return task;
}

/** The core real-time action: move a task to a new column/position. Single-document write. */
async function move(taskId, userId, { status, position }) {
  const task = await getByIdAuthorized(taskId, userId);

  if (status !== undefined) task.status = status;
  if (position !== undefined) task.position = position;
  await task.save();
  return task;
}

async function remove(taskId, userId) {
  const task = await getByIdAuthorized(taskId, userId);
  const projectId = task.project;
  await task.deleteOne();
  return { id: taskId, project: projectId };
}

export const taskService = { list, getByIdAuthorized, create, update, move, remove };
