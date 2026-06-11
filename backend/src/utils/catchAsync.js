/**
 * Wraps an async route handler so any rejected promise is forwarded to Express's error
 * middleware via next(err). This is what keeps controllers free of try/catch boilerplate —
 * they just `await` and throw; this wrapper routes failures to the central handler.
 */
export const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
