export default function validate(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: details[0].message, details } });
    }
    // Express 5 makes req.query read-only, so keep parsed values separately.
    req.valid = { ...(req.valid || {}), [source]: result.data };
    next();
  };
}
