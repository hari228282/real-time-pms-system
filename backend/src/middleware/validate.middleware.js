/**
 * Generic Zod validation middleware. Each route passes a schema describing the parts of the
 * request it cares about ({ body, params, query }). We parse, and on success REPLACE the
 * request parts with the parsed (and coerced/defaulted) values so controllers receive clean,
 * typed data. On failure, the ZodError propagates to the central error handler.
 */
export const validate = (schema) => (req, _res, next) => {
  const parsed = schema.parse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (parsed.body) req.body = parsed.body;
  if (parsed.params) req.params = parsed.params;
  if (parsed.query) req.query = parsed.query;

  next();
};
