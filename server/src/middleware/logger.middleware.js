import { env } from '../config/env.js';

const PII_KEYS = new Set([
  'password',
  'patientname',
  'patientphone',
  'phone',
  'token',
  'authorization',
  'notes',
  'patient_name',
  'patient_phone'
]);

export const redactPII = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redactPII(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
};

export const structuredLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    // Include redacted request body for mutation requests
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      logEntry.body = redactPII(req.body);
    }

    if (env.NODE_ENV === 'test') {
      return; // Silent during automated unit testing
    }

    if (env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
      console.log(
        `[REQ ${logEntry.requestId.slice(0, 8)}] ${logEntry.method} ${logEntry.url} ${statusColor}${logEntry.statusCode}\x1b[0m (${durationMs}ms)`
      );
    }
  });

  next();
};
