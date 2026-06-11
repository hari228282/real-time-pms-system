import { z } from 'zod';

import { TASK_STATUSES } from '../models/task.model.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const listTasksSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    status: z.enum(TASK_STATUSES).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  }),
});

export const createTaskSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    assignee: objectId.nullable().optional(),
    position: z.number().optional(),
  }),
});

export const taskIdSchema = z.object({
  params: z.object({ taskId: objectId }),
});

export const updateTaskSchema = z.object({
  params: z.object({ taskId: objectId }),
  body: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(5000).optional(),
      assignee: objectId.nullable().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

export const moveTaskSchema = z.object({
  params: z.object({ taskId: objectId }),
  body: z
    .object({
      status: z.enum(TASK_STATUSES).optional(),
      position: z.number().optional(),
    })
    .refine((b) => b.status !== undefined || b.position !== undefined, {
      message: 'Provide status and/or position',
    }),
});
