import { authService } from '../services/auth.service.js';
import { created, ok } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';

/**
 * Thin controllers: pull validated data off req, call a service, shape the response.
 * No business logic, no Mongoose. catchAsync forwards any thrown error to the central handler.
 */

export const authController = {
  register: catchAsync(async (req, res) => {
    const result = await authService.register(req.body);
    created(res, result);
  }),

  login: catchAsync(async (req, res) => {
    const result = await authService.login(req.body);
    ok(res, result);
  }),

  me: catchAsync(async (req, res) => {
    const user = await authService.getById(req.user.id);
    ok(res, { user });
  }),
};
