/**
 * NoSQL Injection and Prototype Pollution Sanitization Middleware.
 *
 * Inspects incoming request body, query parameters, and route parameters.
 * Rejects requests containing keys with MongoDB operator prefixes ('$')
 * or dot-notation ('paths.like.this'), and blocks prototype pollution vectors.
 */

const containsMongoOperators = (data) => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Explicit check for own property __proto__
  if (Object.prototype.hasOwnProperty.call(data, '__proto__')) {
    return true;
  }

  const propNames = Object.getOwnPropertyNames(data);
  for (const key of propNames) {
    // Check for MongoDB query operator prefix '$' or dot-notation
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }

    // Check for prototype pollution vectors
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return true;
    }

    // Recursively check nested objects and arrays
    const val = data[key];
    if (val && typeof val === 'object') {
      if (containsMongoOperators(val)) {
        return true;
      }
    }
  }

  return false;
};

export const sanitizeNoSql = (req, res, next) => {
  if (req.body && containsMongoOperators(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Malformed request: Prohibited query operators detected',
      requestId: req.id || null,
      timestamp: new Date().toISOString()
    });
  }

  if (req.query && containsMongoOperators(req.query)) {
    return res.status(400).json({
      success: false,
      error: 'Malformed request: Prohibited query operators detected in query parameters',
      requestId: req.id || null,
      timestamp: new Date().toISOString()
    });
  }

  if (req.params && containsMongoOperators(req.params)) {
    return res.status(400).json({
      success: false,
      error: 'Malformed request: Prohibited query operators detected in route parameters',
      requestId: req.id || null,
      timestamp: new Date().toISOString()
    });
  }

  next();
};
