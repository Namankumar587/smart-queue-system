import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Notification } from '../src/models/Notification.js';
import { createStaffAccount } from '../src/services/auth.service.js';
import { redactPII } from '../src/middleware/logger.middleware.js';
import { validateTwilioSignature } from '../src/controllers/webhook.controller.js';

describe('PROMPT Practical Threat Model - Automated Security Controls Test Suite', () => {
  let server;
  let baseUrl;
  let testClinic;
  let doctorA;
  let doctorB;
  let doctorAToken;
  let doctorBToken;
  let staffToken;
  let adminToken;
  let testTokenA;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    // 1. Setup Test Clinic
    await Clinic.deleteMany({ code: 'GLB-SEC-TEST' });
    testClinic = await Clinic.create({
      name: 'GL Bajaj Security Assessment Clinic',
      code: 'GLB-SEC-TEST',
      operatingHours: { open: '08:00', close: '20:00' },
      defaultConsultationMinutes: 10,
      timezone: 'Asia/Kolkata',
      isActive: true
    });

    // 2. Setup Doctor A and Doctor B profiles
    await Doctor.deleteMany({ clinicId: testClinic._id });
    doctorA = await Doctor.create({
      clinicId: testClinic._id,
      name: 'Dr. Alice Security Alpha',
      doctorCode: 'SEC-A',
      department: 'Cardiology',
      roomNumber: 'Room 101',
      isAvailable: true
    });

    doctorB = await Doctor.create({
      clinicId: testClinic._id,
      name: 'Dr. Bob Security Beta',
      doctorCode: 'SEC-B',
      department: 'Neurology',
      roomNumber: 'Room 102',
      isAvailable: true
    });

    // 3. Setup Users & Roles
    await User.deleteMany({ email: { $in: ['docA@sec.test', 'docB@sec.test', 'staff@sec.test', 'admin@sec.test'] } });

    const userDocA = await createStaffAccount({
      email: 'docA@sec.test',
      password: 'SecurityPassword123!',
      name: 'Dr. Alice Security Alpha',
      role: 'DOCTOR',
      clinicId: testClinic._id,
      doctorProfileId: doctorA._id
    });

    const userDocB = await createStaffAccount({
      email: 'docB@sec.test',
      password: 'SecurityPassword123!',
      name: 'Dr. Bob Security Beta',
      role: 'DOCTOR',
      clinicId: testClinic._id,
      doctorProfileId: doctorB._id
    });

    const userStaff = await createStaffAccount({
      email: 'staff@sec.test',
      password: 'SecurityPassword123!',
      name: 'Reception Staff',
      role: 'RECEPTIONIST',
      clinicId: testClinic._id
    });

    const userAdmin = await createStaffAccount({
      email: 'admin@sec.test',
      password: 'SecurityPassword123!',
      name: 'Security Admin',
      role: 'ADMIN',
      clinicId: testClinic._id
    });

    // Obtain JWT session tokens
    const login = async (email, password) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      return data.data?.token || data.data?.accessToken;
    };

    doctorAToken = await login('docA@sec.test', 'SecurityPassword123!');
    doctorBToken = await login('docB@sec.test', 'SecurityPassword123!');
    staffToken = await login('staff@sec.test', 'SecurityPassword123!');
    adminToken = await login('admin@sec.test', 'SecurityPassword123!');

    // 4. Create a token in Doctor A's queue
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: doctorA._id.toString(),
        patientName: 'John ThreatModel',
        patientPhone: '+91-9876543210',
        priority: 'STANDARD'
      })
    });
    const bookJson = await bookRes.json();
    testTokenA = await Token.findOne({ trackingUuid: bookJson.data.trackingUuid });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await Clinic.deleteMany({ code: 'GLB-SEC-TEST' });
    await Doctor.deleteMany({ doctorCode: { $in: ['SEC-A', 'SEC-B'] } });
    await User.deleteMany({ email: { $in: ['docA@sec.test', 'docB@sec.test', 'staff@sec.test', 'admin@sec.test'] } });
    await Token.deleteMany({ patientName: 'John ThreatModel' });
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }
  });

  // =========================================================================
  // 1. BROKEN ACCESS CONTROL & IDOR PREVENTION
  // =========================================================================
  describe('1. Broken Access Control & IDOR Prevention', () => {
    it('prevents Doctor B from viewing Doctor A queue (HTTP 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/doctor/queue?doctorId=${doctorA._id}`, {
        headers: { Authorization: `Bearer ${doctorBToken}` }
      });
      assert.equal(res.status, 403, 'Doctor B must not access Doctor A queue');
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.error.includes('Unauthorized') || json.error.includes('cannot access'));
    });

    it('prevents Doctor B from calling or completing Doctor A token (IDOR Transition Guard)', async () => {
      const res = await fetch(`${baseUrl}/doctor/tokens/${testTokenA._id}/action`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorBToken}`
        },
        body: JSON.stringify({ action: 'call_next' })
      });
      assert.equal(res.status, 403, 'Doctor B must be denied transitioning Doctor A token');
      const json = await res.json();
      assert.equal(json.success, false);
    });

    it('prevents non-admin staff from accessing administrative user management', async () => {
      const res = await fetch(`${baseUrl}/admin/users`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      assert.equal(res.status, 403, 'Reception staff must not access Admin endpoints');
      const json = await res.json();
      assert.equal(json.success, false);
    });

    it('denies unauthenticated requests to protected endpoints with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/doctor/queue`);
      assert.equal(res.status, 401, 'Unauthenticated request must return 401');
      const json = await res.json();
      assert.equal(json.success, false);
    });
  });

  // =========================================================================
  // 2. TRACKING-ID GUESSING RESILIENCE
  // =========================================================================
  describe('2. Tracking-ID Guessing & High-Entropy Identifiers', () => {
    it('uses 122-bit high-entropy UUIDv4 for public tracking, not sequential numbers', () => {
      assert.ok(testTokenA.trackingUuid);
      // Verify UUID v4 regex format
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      assert.ok(uuidV4Regex.test(testTokenA.trackingUuid), 'Tracking identifier must be standard UUIDv4');
      assert.notEqual(testTokenA.trackingUuid, testTokenA.tokenNumber);
    });

    it('returns uniform HTTP 404 for non-existent or guessed UUIDs with zero DB leakage', async () => {
      const guessedUuid = '00000000-0000-4000-8000-000000000000';
      const res = await fetch(`${baseUrl}/tokens/track/${guessedUuid}`);
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error, 'Token not found. Please check your tracking link.');
    });
  });

  // =========================================================================
  // 3. NOSQL INJECTION & MALICIOUS OPERATOR SANITIZATION
  // =========================================================================
  describe('3. NoSQL Injection & Operator Sanitization', () => {
    it('rejects request body containing MongoDB operator ($ne) with HTTP 400', async () => {
      const maliciousPayload = {
        doctorId: doctorA._id.toString(),
        patientName: 'Malicious Patient',
        patientPhone: { $ne: null }
      };

      const res = await fetch(`${baseUrl}/tokens/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPayload)
      });

      assert.equal(res.status, 400, 'Payload with $ne operator must be rejected with 400');
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.error.includes('Prohibited query operators'));
    });

    it('rejects query parameter with MongoDB operator ($gt) with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/tokens/track/test?[$gt]=admin`);
      assert.equal(res.status, 400, 'Query param with $gt operator must be rejected with 400');
      const json = await res.json();
      assert.equal(json.success, false);
    });

    it('rejects prototype pollution attempts in JSON body with HTTP 400', async () => {
      const pollutionPayload = '{"__proto__":{"isAdmin":true},"email":"docA@sec.test","password":"SecurityPassword123!"}';

      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: pollutionPayload
      });

      assert.equal(res.status, 400, 'Prototype pollution payload must be rejected with 400');
    });
  });

  // =========================================================================
  // 4. ALLOW-LISTED FIELDS & MASS ASSIGNMENT DEFENSE
  // =========================================================================
  describe('4. Allow-listed Fields & Mass Assignment Defense', () => {
    it('discards injected privilege fields during booking without breaking flow', async () => {
      const massAssignmentPayload = {
        doctorId: doctorA._id.toString(),
        patientName: 'Valid Name',
        patientPhone: '+91-98765-88888',
        priority: 'STANDARD',
        // Injected fields attempted by attacker:
        status: 'COMPLETED',
        sequenceNumber: 999,
        priorityRank: 1,
        activeBookingKey: 'malicious_override'
      };

      const res = await fetch(`${baseUrl}/tokens/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(massAssignmentPayload)
      });

      assert.equal(res.status, 201, 'Valid booking proceeds with stripped unauthorized fields');
      const json = await res.json();
      assert.equal(json.success, true);

      // Verify in DB that status is WAITING, not injected COMPLETED
      const created = await Token.findOne({ trackingUuid: json.data.trackingUuid });
      assert.equal(created.status, 'WAITING', 'Attacker cannot override initial token status');
      assert.notEqual(created.sequenceNumber, 999, 'Attacker cannot manipulate sequence counter');
      assert.equal(created.priorityRank, 3, 'Attacker cannot forge priority rank');

      await Token.deleteOne({ _id: created._id });
    });
  });

  // =========================================================================
  // 5. PII OVER-LOGGING REDACTION & PUBLIC TRACKING ZERO-PII
  // =========================================================================
  describe('5. PII Over-logging Redaction & Public Zero-PII', () => {
    it('redactPII utility masks sensitive fields (password, phone, patientName, notes)', () => {
      const sampleLog = {
        patientName: 'Jane Sensitive Patient',
        patientPhone: '+91-9876543210',
        password: 'SecretPassword99!',
        notes: 'Confidential clinical history',
        doctorId: '650000000000000000000001',
        tokenNumber: 'T-001'
      };

      const sanitized = redactPII(sampleLog);
      assert.equal(sanitized.patientName, '[REDACTED]');
      assert.equal(sanitized.patientPhone, '[REDACTED]');
      assert.equal(sanitized.password, '[REDACTED]');
      assert.equal(sanitized.notes, '[REDACTED]');
      // Non-PII fields remain preserved for debugging
      assert.equal(sanitized.doctorId, '650000000000000000000001');
      assert.equal(sanitized.tokenNumber, 'T-001');
    });

    it('public /track/:uuid endpoint returns strict zero-PII data with no-store cache headers', async () => {
      const res = await fetch(`${baseUrl}/tokens/track/${testTokenA.trackingUuid}`);
      assert.equal(res.status, 200);

      // Verify Cache-Control
      const cacheControl = res.headers.get('cache-control');
      assert.ok(cacheControl && cacheControl.includes('no-store'), 'Must include no-store');

      const json = await res.json();
      assert.equal(json.success, true);
      const data = json.data;

      // Verify zero PII in public response
      assert.equal(data.patientName, undefined, 'Patient name must NEVER be exposed publicly');
      assert.equal(data.patientPhone, undefined, 'Patient phone must NEVER be exposed publicly');
      assert.equal(data.normalizedPhone, undefined, 'Normalized phone must NEVER be exposed publicly');
      assert.equal(data.notes, undefined, 'Clinical notes must NEVER be exposed publicly');
      assert.ok(data.displayCode, 'Display code is present');
      assert.ok(data.doctor?.name, 'Doctor name is present');
    });
  });

  // =========================================================================
  // 6. RATE LIMITING & ABUSE PREVENTION
  // =========================================================================
  describe('6. Rate Limiting & Abuse Prevention', () => {
    it('enforces rate limiting on repeated auth login attempts when test header is passed', async () => {
      let hit429 = false;
      // Trigger requests with test header to verify authLimiter response
      for (let i = 0; i < 25; i++) {
        const res = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-rate-limit': 'true'
          },
          body: JSON.stringify({ email: 'wrong@sec.test', password: 'BadPassword123!' })
        });
        if (res.status === 429) {
          hit429 = true;
          const json = await res.json();
          assert.equal(json.success, false);
          assert.ok(json.error.includes('Too many login attempts'));
          break;
        }
      }
      assert.ok(hit429, 'Excessive login attempts must trigger HTTP 429 Too Many Requests');
    });

    it('enforces rate limiting on booking requests per phone number', async () => {
      let hit429 = false;
      const targetPhone = '+91-98765-99999';

      for (let i = 0; i < 15; i++) {
        const res = await fetch(`${baseUrl}/tokens/book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-rate-limit': 'true'
          },
          body: JSON.stringify({
            doctorId: doctorA._id.toString(),
            patientName: `Spam Patient ${i}`,
            patientPhone: targetPhone,
            priority: 'STANDARD'
          })
        });

        if (res.status === 429) {
          hit429 = true;
          const json = await res.json();
          assert.equal(json.success, false);
          assert.ok(json.error.includes('Too many') || json.error.includes('requests'));
          break;
        }
      }
      assert.ok(hit429, 'Excessive bookings for same phone must trigger HTTP 429');
    });
  });

  // =========================================================================
  // 7. TWILIO WEBHOOK SPOOFING & REPLAY PROTECTION
  // =========================================================================
  describe('7. Webhook Spoofing & Replay Mitigation', () => {
    it('rejects forged webhook with invalid HMAC signature (HTTP 403 Forbidden)', async () => {
      const forgedPayload = {
        MessageSid: 'SM_FORGED_123456789',
        MessageStatus: 'delivered',
        To: '+919876543210'
      };

      const res = await fetch(`${baseUrl}/webhooks/twilio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-twilio-signature': 'ForgedSignatureBase64String=='
        },
        body: JSON.stringify(forgedPayload)
      });

      assert.equal(res.status, 403, 'Webhook with invalid signature must return 403');
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error, 'Invalid Twilio webhook signature');
    });

    it('accepts valid HMAC signature and processes status update idempotently', async () => {
      const authToken = env.TWILIO_AUTH_TOKEN || 'test_auth_token_for_mocking';
      const webhookUrl = `${baseUrl}/webhooks/twilio`;
      const messageSid = `SM_SEC_TEST_${Date.now()}`;

      // Create dummy notification record
      await Notification.create({
        tokenId: testTokenA._id,
        idempotencyKey: `webhook_sec_test_${messageSid}`,
        recipientPhone: testTokenA.normalizedPhone,
        type: 'BOOKING_CONFIRMATION',
        message: 'Test security webhook',
        status: 'SENT',
        providerMessageId: messageSid
      });

      const params = {
        MessageSid: messageSid,
        MessageStatus: 'delivered',
        To: testTokenA.normalizedPhone
      };

      // Compute valid Twilio HMAC-SHA1 signature
      let signaturePayload = webhookUrl;
      const keys = Object.keys(params).sort();
      for (const k of keys) {
        signaturePayload += k + params[k];
      }
      const validSignature = crypto.createHmac('sha1', authToken).update(signaturePayload, 'utf-8').digest('base64');

      // 1. Initial valid webhook delivery
      const res1 = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-twilio-signature': validSignature
        },
        body: JSON.stringify(params)
      });

      assert.equal(res1.status, 200);
      const json1 = await res1.json();
      assert.equal(json1.success, true);
      assert.equal(json1.duplicate, false);

      // 2. Replay identical webhook -> Idempotent handling (duplicate: true)
      const res2 = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-twilio-signature': validSignature
        },
        body: JSON.stringify(params)
      });

      assert.equal(res2.status, 200);
      const json2 = await res2.json();
      assert.equal(json2.success, true);
      assert.equal(json2.duplicate, true, 'Replayed webhook must be handled idempotently');

      await Notification.deleteOne({ providerMessageId: messageSid });
    });
  });

  // =========================================================================
  // 8. AUDIT LOGGING FOR QUEUE OVERRIDES
  // =========================================================================
  describe('8. Audit Logging for Queue Overrides', () => {
    it('creates immutable AuditLog entry when staff or doctor transitions a token', async () => {
      // Doctor A calls testTokenA
      const callRes = await fetch(`${baseUrl}/doctor/tokens/${testTokenA._id}/action`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorAToken}`
        },
        body: JSON.stringify({ action: 'call_next' })
      });

      assert.equal(callRes.status, 200);

      // Verify AuditLog entry was persisted
      const auditEntry = await AuditLog.findOne({
        targetId: testTokenA._id,
        action: 'TOKEN_CALLED'
      }).sort({ createdAt: -1 });

      assert.ok(auditEntry, 'Audit log entry must be created for TOKEN_CALLED');
      assert.equal(auditEntry.performedByRole, 'DOCTOR');
      assert.equal(auditEntry.targetType, 'TOKEN');
      assert.equal(auditEntry.details?.previousStatus, 'WAITING');
      assert.equal(auditEntry.details?.newStatus, 'CALLED');
    });
  });
});
