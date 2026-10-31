import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import routes from './routes/index.js';
import { requestId } from './middleware/requestId.middleware.js';
import { structuredLogger } from './middleware/logger.middleware.js';
import { sanitizeNoSql } from './middleware/sanitize.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { getHealth } from './controllers/health.controller.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();

// Trust reverse proxy (Essential for HTTPS, Render, Railway, Vercel, Cloudflare, AWS ALB)
app.set('trust proxy', 1);

// Direct Cloud Health Check Probes (Root and /api/health for PaaS orchestrators)
app.get('/health', getHealth);
app.get('/api/health', getHealth);

// Request correlation ID & Structured Logging with PII Redaction
app.use(requestId);
app.use(structuredLogger);

// Security headers (Helmet)
// Note: In development/hybrid modes, CSP is relaxed for local Three.js canvas/WebGL textures.
// In strict production deployments, standard CSP directives should be enforced.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration with explicit allowed origins (never wildcard with credentials)
const rawOrigins = [env.CORS_ORIGIN, env.CLIENT_URL].filter(Boolean).join(',');
const configuredOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ])
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, unit tests)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.trim().replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      // Standard CORS rejection (omits Access-Control-Allow-Origin header)
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
  })
);

// Body parsing with size guards (1MB payload limit protects against buffer exhaustion)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL query operator and prototype pollution sanitization
app.use(sanitizeNoSql);

// Mount versioned API routes under /api/v1
app.use('/api/v1', routes);

// Serve built frontend assets if present for unified single-origin deployment
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 & Central Error Handling with uniform envelopes
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
