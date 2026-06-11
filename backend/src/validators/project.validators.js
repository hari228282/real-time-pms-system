import { z } from 'zod';

// Reusable Mongo ObjectId check (24-char hex) for route params.
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
  }),
});

export const projectIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const updateProjectSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(2000).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

export const addMemberSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']).optional(),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({ id: objectId, userId: objectId }),
});
