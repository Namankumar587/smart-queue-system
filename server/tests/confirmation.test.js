import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { Notification } from '../src/models/Notification.js';
import { TOKEN_STATUS } from '../src/config/constants.js';

describe('PROMPT 7 - Confirmation & Token Card Contract Tests', () => {
  let server;
  let baseUrl;
  let clinicId;
  let doctorId;

  before(async () => {
    await connectDB();

    // Start test server on ephemeral port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
        resolve();
      });
    });

    // Create test clinic
    const clinic = await Clinic.create({
      name: 'GL Bajaj Confirmation Test Clinic',
      code: 'CONF-TEST',
      address: 'Knowledge Park III, Greater Noida',
      phone: '+91-99999-88888',
      timezone: 'Asia/Kolkata',
      operatingHours: { open: '08:00', close: '20:00' },
      defaultConsultationMinutes: 10
    });
    clinicId = clinic._id;

    // Create test doctor
    const doctor = await Doctor.create({
      clinicId,
      name: 'Dr. Confirmation Specialist',
      doctorCode: 'DOC-CONF-001',
      department: 'Cardiology',
      roomNumber: 'Room 205',
      avgConsultMinutes: 12,
      isAvailable: true
    });
    doctorId = doctor._id;
  });

  after(async () => {
    try {
      await Token.deleteMany({ clinicId });
      await Doctor.deleteMany({ clinicId });
      await Clinic.deleteMany({ _id: clinicId });
    } catch (e) {
      console.error('[confirmation after delete error]:', e);
    }
    try {
      if (server) {
        if (typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        await new Promise((resolve) => server.close(resolve));
      }
    } catch (e) {
      console.error('[confirmation after server error]:', e);
    }
    try {
      await disconnectDB();
    } catch (e) {
      console.error('[confirmation after disconnect error]:', e);
    }
  });

  test('1. Confirmation endpoint provides real API data with large token code, doctor, room, and queue position', async () => {
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Test Patient Secret Name',
        patientPhone: '+91-98765-43210',
        priority: 'STANDARD'
      })
    });

    assert.equal(bookRes.status, 201);
    const bookJson = await bookRes.json();
    const { trackingUuid, displayCode } = bookJson.data;
    assert.ok(trackingUuid, 'Must return trackingUuid');
    assert.ok(displayCode, 'Must return displayCode');

    // Fetch tracking / confirmation data
    const res = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(res.status, 200);
    const resJson = await res.json();
    assert.equal(resJson.success, true);

    const token = resJson.data;
    assert.equal(token.trackingUuid, trackingUuid);
    assert.equal(token.displayCode, displayCode);
    assert.equal(token.doctor.name, 'Dr. Confirmation Specialist');
    assert.equal(token.doctor.department, 'Cardiology');
    assert.equal(token.doctor.roomNumber, 'Room 205');
    assert.equal(token.doctor.doctorCode, 'DOC-CONF-001');
    assert.equal(typeof token.positionAhead, 'number');
    assert.equal(token.status, TOKEN_STATUS.WAITING);
  });

  test('2. Estimated wait includes explicit "estimate, not a guarantee" wording', async () => {
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Wait Test Patient',
        patientPhone: '+91-98765-43211',
        priority: 'STANDARD'
      })
    });

    const bookJson = await bookRes.json();
    const { trackingUuid } = bookJson.data;
    const res = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(res.status, 200);

    const resJson = await res.json();
    const data = resJson.data;
    assert.ok(data.waitDisclaimer, 'Must include wait disclaimer');
    assert.ok(
      data.waitDisclaimer.toLowerCase().includes('estimate, not a guarantee'),
      `Disclaimer should contain 'estimate, not a guarantee'. Got: ${data.waitDisclaimer}`
    );
  });

  test('3. Scannable QR code encodes approved tracking URL, never JWT or raw patient data', async () => {
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'QR Data Privacy Check',
        patientPhone: '+91-98765-43212',
        priority: 'STANDARD'
      })
    });

    const bookJson = await bookRes.json();
    const { trackingUuid } = bookJson.data;
    const res = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(res.status, 200);

    const resJson = await res.json();
    const data = resJson.data;
    assert.ok(data.qrCode, 'Must generate scannable QR code data URL');
    assert.ok(data.qrCode.startsWith('data:image/png;base64,'), 'QR must be PNG data URL');

    // Approved tracking URL check
    assert.ok(data.trackingUrl, 'Must return approved trackingUrl');
    assert.ok(data.trackingUrl.includes(`/track/${trackingUuid}`));

    // Ensure raw QR data URL does NOT leak phone number or patient name in plain text
    assert.ok(!data.qrCode.includes('+91-98765-43212'), 'QR must not contain plain phone number');
    assert.ok(!data.qrCode.includes('QR Data Privacy Check'), 'QR must not contain patient name');
    // Ensure no JWT format (header.payload.signature) in tracking URL
    assert.ok(!data.trackingUrl.includes('eyJ'), 'Tracking URL must not be a JWT');
  });

  test('4. Zero PII: Patient name, phone number, and notes are never returned in public tracking payload', async () => {
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Highly Confidential Patient',
        patientPhone: '+91-98765-43213',
        priority: 'ELDERLY',
        notes: 'Confidential symptoms notes'
      })
    });

    assert.equal(bookRes.status, 201);
    const bookJson = await bookRes.json();
    const { trackingUuid } = bookJson.data;
    const res = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(res.status, 200);

    const resJson = await res.json();
    const data = resJson.data;
    assert.equal(data.patientName, undefined, 'Must not leak patientName');
    assert.equal(data.patientPhone, undefined, 'Must not leak patientPhone');
    assert.equal(data.phone, undefined, 'Must not leak phone');
    assert.equal(data.notes, undefined, 'Must not leak notes');

    // Stringify payload to ensure zero PII anywhere in JSON
    const jsonStr = JSON.stringify(data);
    assert.ok(!jsonStr.includes('Highly Confidential Patient'));
    assert.ok(!jsonStr.includes('9876543213'));
    assert.ok(!jsonStr.includes('Confidential symptoms'));
  });

  test('5. Notification status is honest: reported only when backend has it, never fabricating delivery', async () => {
    // Sub-case A: Token with no notification yet (delete any auto-created notification)
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Notification Verification Patient',
        patientPhone: '+91-98765-43214',
        priority: 'STANDARD'
      })
    });

    assert.equal(bookRes.status, 201);
    const bookJson = await bookRes.json();
    const { trackingUuid } = bookJson.data;

    // Clear notifications for this token to test unnotified state
    const tokenDoc = await Token.findOne({ trackingUuid });
    await Notification.deleteMany({ tokenId: tokenDoc._id });

    const resA = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(resA.status, 200);
    const jsonA = await resA.json();
    assert.equal(jsonA.data.notificationStatus, null, 'Unsent notification must be null, not fabricated');

    // Sub-case B: Token with simulated notification
    await Notification.create({
      tokenId: tokenDoc._id,
      recipientPhone: '+91-98765-43214',
      channel: 'SMS',
      type: 'BOOKING_CONFIRMATION',
      message: 'Test confirmation message',
      status: 'SIMULATED'
    });

    const resB = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(resB.status, 200);
    const jsonB = await resB.json();
    assert.equal(jsonB.data.notificationStatus, 'SIMULATED');

    // Sub-case C: Token with real sent notification
    await Notification.create({
      tokenId: tokenDoc._id,
      recipientPhone: '+91-98765-43214',
      channel: 'SMS',
      type: 'TURN_ALERT',
      message: 'Your turn is coming up',
      status: 'SENT'
    });

    const resC = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(resC.status, 200);
    const jsonC = await resC.json();
    assert.equal(jsonC.data.notificationStatus, 'SENT');
  });

  test('6. Missing or expired trackingUuid returns graceful 404 with uniform error envelope', async () => {
    const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${baseUrl}/tokens/track/${nonExistentUuid}`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error, 'Must provide human-readable error description');
  });
});


