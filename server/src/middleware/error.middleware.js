import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  const response = {
    success: false,
    error: message,
    requestId: req.id || null,
    timestamp: new Date().toISOString()
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  if (env.NODE_ENV !== 'test') {
    console.error(`[Error REQ ${req.id || 'N/A'}] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    requestId: req.id || null,
    timestamp: new Date().toISOString()
  });
};
