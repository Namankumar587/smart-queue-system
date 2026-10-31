import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Doctor } from '../src/models/Doctor.js';
import { env } from '../src/config/env.js';
import { ROLES } from '../src/config/constants.js';

describe('Staff Authentication & RBAC Security Suite', () => {
  let server;
  let baseUrl;
  let doctor1;
  let doctor2;
  let receptionistUser;
  let doctor1User;
  let disabledUser;

  before(async () => {
    await connectDB();

    // Start ephemeral server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Retrieve seeded doctors
    doctor1 = await Doctor.findOne({ doctorCode: 'DOC-GEN-101' });
    doctor2 = await Doctor.findOne({ doctorCode: 'DOC-PED-102' });

    // Retrieve seeded users
    receptionistUser = await User.findOne({ email: 'reception@glbitm.ac.in' });
    doctor1User = await User.findOne({ email: 'priya.sharma@glbitm.ac.in' });

    // Create a disabled test user
    await User.deleteMany({ email: 'disabled.staff@glbitm.ac.in' });
    disabledUser = await User.create({
      name: 'Disabled Test Staff',
      email: 'disabled.staff@glbitm.ac.in',
      passwordHash: doctor1User.passwordHash,
      role: ROLES.RECEPTIONIST,
      isActive: false
    });
  });

  beforeEach(async () => {
    // Reset any lockout state so tests run in complete isolation
    await User.updateMany({}, { $set: { failedLoginAttempts: 0, lockoutUntil: null } });
  });

  after(async () => {
    await User.deleteMany({ email: 'disabled.staff@glbitm.ac.in' });
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  test('1. Wrong password returns generic 401 error to prevent account enumeration', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@glbitm.ac.in',
        password: 'DefinitivelyWrongPassword123!'
      })
    });

    assert.strictEqual(res.status, 401, 'Expected HTTP 401 for wrong password');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'Invalid email or password');
  });

  test('2. Disabled account cannot authenticate even with correct password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'disabled.staff@glbitm.ac.in',
        password: env.SEED_DEFAULT_PASSWORD
      })
    });

    assert.strictEqual(res.status, 403, 'Expected HTTP 403 Forbidden for deactivated account');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.error.includes('disabled'), 'Expected account disabled error message');
  });

  test('3. Malformed JWT token returns 401 Invalid or malformed session token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid-garbage-token-string-xyz'
      }
    });

    assert.strictEqual(res.status, 401, 'Expected HTTP 401 for malformed token');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'Invalid or malformed session token');
  });

  test('4. Expired JWT token returns 401 Session token has expired', async () => {
    const expiredToken = jwt.sign(
      { sub: receptionistUser._id.toString(), id: receptionistUser._id, role: receptionistUser.role },
      env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${expiredToken}`
      }
    });

    assert.strictEqual(res.status, 401, 'Expected HTTP 401 for expired token');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'Session token has expired. Please log in again.');
  });

  test('5. Role escalation: Receptionist cannot access Admin analytics endpoint', async () => {
    const receptionistToken = jwt.sign(
      { sub: receptionistUser._id.toString(), id: receptionistUser._id, role: ROLES.RECEPTIONIST },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await fetch(`${baseUrl}/api/v1/admin/analytics`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${receptionistToken}`
      }
    });

    assert.strictEqual(res.status, 403, 'Expected HTTP 403 Forbidden for role escalation');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.error.includes('Access denied'), 'Expected Access denied message');
  });

  test("6. Service-level doctor isolation: Doctor A cannot read Doctor B's queue", async () => {
    // Generate valid JWT for Doctor 1 (Dr. Priya Sharma)
    const doctor1Token = jwt.sign(
      {
        sub: doctor1User._id.toString(),
        id: doctor1User._id,
        role: ROLES.DOCTOR,
        doctorId: doctor1._id.toString()
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Doctor 1 attempts to read Doctor 2's queue (Dr. Amit Verma)
    const res = await fetch(`${baseUrl}/api/v1/doctor/queue?doctorId=${doctor2._id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${doctor1Token}`
      }
    });

    assert.strictEqual(res.status, 403, 'Expected HTTP 403 Forbidden when Doctor accesses another queue');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(
      json.error.includes('Doctors cannot access or manage another doctor') ||
        json.error.includes('Doctors can only access their own designated queue'),
      'Expected doctor ownership violation error'
    );
  });
});
