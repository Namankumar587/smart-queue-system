import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { redactPII } from '../src/middleware/logger.middleware.js';

describe('Health Check API & Middleware Suite', () => {
  let server;
  let baseUrl;

  before((_, done) => {
    // Start ephemeral server on random available port
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  test('GET /api/v1/health should return 200 OK with valid schema and X-Request-Id header', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(res.status, 200, 'Expected HTTP 200 status code');

    const requestIdHeader = res.headers.get('x-request-id');
    assert.ok(requestIdHeader, 'Expected X-Request-Id response header');
    assert.ok(requestIdHeader.length >= 8, 'Expected non-empty correlation request ID');

    const json = await res.json();
    assert.strictEqual(json.success, true, 'Expected success: true');
    assert.ok(json.data, 'Expected data object in response');
    assert.strictEqual(json.data.status, 'ok', 'Expected data.status: ok');
    assert.ok(json.data.timestamp, 'Expected ISO timestamp');
    assert.ok(typeof json.data.uptimeSeconds === 'number', 'Expected uptime number');
    assert.ok(json.data.database, 'Expected database connection status indicator');
  });

  test('GET /api/v1/non-existent-route should return 404 with uniform error envelope', async () => {
    const res = await fetch(`${baseUrl}/api/v1/unknown-endpoint`);
    assert.strictEqual(res.status, 404, 'Expected HTTP 404 for unknown endpoint');

    const json = await res.json();
    assert.strictEqual(json.success, false, 'Expected success: false');
    assert.ok(json.error.includes('Endpoint not found'), 'Expected 404 error message');
    assert.ok(json.requestId, 'Expected requestId in error envelope');
    assert.ok(json.timestamp, 'Expected ISO timestamp in error envelope');
  });

  test('PII redaction utility must mask patient identifiable fields and passwords', () => {
    const sensitivePayload = {
      patientName: 'John Doe',
      patientPhone: '+919988776655',
      password: 'PlainSecretPassword123',
      priority: 'STANDARD',
      notes: 'Private doctor note',
      meta: {
        token: 'eyJhbGciOi...',
        roomNumber: 'Room 101'
      }
    };

    const sanitized = redactPII(sensitivePayload);

    assert.strictEqual(sanitized.patientName, '[REDACTED]');
    assert.strictEqual(sanitized.patientPhone, '[REDACTED]');
    assert.strictEqual(sanitized.password, '[REDACTED]');
    assert.strictEqual(sanitized.notes, '[REDACTED]');
    assert.strictEqual(sanitized.meta.token, '[REDACTED]');
    assert.strictEqual(sanitized.priority, 'STANDARD');
    assert.strictEqual(sanitized.meta.roomNumber, 'Room 101');
  });
});
