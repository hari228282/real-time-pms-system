/**
 * Single response envelope used everywhere so the frontend can rely on one shape:
 *   success: { success: true, data }
 *   failure: { success: false, error: { code, message } }   (built by the error middleware)
 */
export const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

export const created = (res, data) => ok(res, data, 201);
