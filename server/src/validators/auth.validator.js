const ALLOWED_LOGIN_FIELDS = new Set(['email', 'password']);

export const validateLoginInput = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request payload: JSON object expected'
    });
  }

  // Strip unexpected fields
  for (const key of Object.keys(req.body)) {
    if (!ALLOWED_LOGIN_FIELDS.has(key)) {
      delete req.body[key];
    }
  }

  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 255) {
    return res.status(400).json({
      success: false,
      error: 'Valid email address is required'
    });
  }

  if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return res.status(400).json({
      success: false,
      error: 'Password must be between 6 and 128 characters long'
    });
  }

  next();
};
