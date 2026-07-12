const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errorDetails = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    return res.status(400).json({ error: `Validation failed: ${errorDetails}` });
  }

  // Update request parts with validated, transformed data
  req.body = result.data.body;
  req.query = result.data.query;
  req.params = result.data.params;

  next();
};

module.exports = { validate };
