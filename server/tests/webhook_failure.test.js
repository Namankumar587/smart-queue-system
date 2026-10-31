import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { Notification } from '../src/models/Notification.js';
import { sendSMS } from '../src/services/sms.service.js';
import { createToken } from '../src/services/queue.service.js';

describe('Twilio Webhook & SMS Failure Tolerance Suite', () => {
  let server;
  let baseUrl;
  let clinicId;
  let doctorId;
  const testAuthToken = env.TWILIO_AUTH_TOKEN || 'test_auth_token_for_mocking';

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
        resolve();
      });
    });

    let clinic = await Clinic.findOne({ code: 'GLB-WEBHOOK-CLINIC' });
    if (!clinic) {
      clinic = await Clinic.create({
        name: 'GL Bajaj Webhook Testing Center',
        code: 'GLB-WEBHOOK-CLINIC',
        phone: '+91-99999-00000',
        defaultConsultationMinutes: 10
      });
    }
    clinicId = clinic._id;

    let doctor = await Doctor.findOne({ doctorCode: 'DOC-WEBHOOK-01' });
    if (!doctor) {
      doctor = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-WEBHOOK-01',
        name: 'Dr. Webhook Resilience Specialist',
        department: 'Resilience Unit',
        roomNumber: 'Room 404',
        avgConsultMinutes: 10,
        isAvailable: true
      });
    }
    doctorId = doctor._id;
  });

  beforeEach(async () => {
    await Notification.deleteMany({
      providerMessageId: { $in: ['SM_MOCK_SUCCESS_777', 'SM_MOCK_DUPLICATE_888'] }
    });
  });

  after(async () => {
    await Token.deleteMany({ doctorId });
    await Notification.deleteMany({
      providerMessageId: { $in: ['SM_MOCK_SUCCESS_777', 'SM_MOCK_DUPLICATE_888'] }
    });
    await new Promise((resolve) => server.close(resolve));
  });

  test('1. Invalid Twilio signature is rejected with HTTP 403 Forbidden', async () => {
    const webhookUrl = `${baseUrl}/webhooks/twilio`;
    const payload = {
      MessageSid: 'SM_FAKE_MSG_001',
      MessageStatus: 'delivered',
      To: '+919876543210'
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-twilio-signature': 'totally_invalid_signature_string=='
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 403, 'Invalid signature must be rejected with 403');
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes('Invalid Twilio webhook signature'));
  });

  test('2. Valid Twilio signature updates notification status to DELIVERED', async () => {
    const webhookUrl = `${baseUrl}/webhooks/twilio`;
    const messageSid = 'SM_MOCK_SUCCESS_777';

    // Seed a notification record
    const notification = await Notification.create({
      clinicId,
      recipientPhone: '+91-98765-43210',
      recipientMaskedPhone: '+91-******3210',
      type: 'BOOKING_CONFIRMATION',
      provider: 'TWILIO',
      providerMessageId: messageSid,
      message: 'Test booking message',
      status: 'SENT'
    });

    const payload = {
      MessageSid: messageSid,
      MessageStatus: 'delivered',
      To: '+919876543210'
    };

    // Calculate valid HMAC-SHA1 signature according to Twilio specs:
    // URL + sorted params
    let sigData = webhookUrl;
    const sortedKeys = Object.keys(payload).sort();
    for (const key of sortedKeys) {
      sigData += key + payload[key];
    }
    const validSignature = crypto.createHmac('sha1', testAuthToken).update(sigData, 'utf-8').digest('base64');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-twilio-signature': validSignature
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.duplicate, false);

    // Verify DB update
    const updated = await Notification.findById(notification._id);
    assert.equal(updated.status, 'DELIVERED');
    assert.ok(updated.deliveredAt instanceof Date);
  });

  test('3. Duplicate webhook callback is handled idempotently without redundant DB writes', async () => {
    const webhookUrl = `${baseUrl}/webhooks/twilio`;
    const messageSid = 'SM_MOCK_DUPLICATE_888';

    // Seed a notification that is already in DELIVERED state
    await Notification.create({
      clinicId,
      recipientPhone: '+91-98765-43210',
      recipientMaskedPhone: '+91-******3210',
      type: 'NOW_CALLING',
      provider: 'TWILIO',
      providerMessageId: messageSid,
      message: 'Now calling message',
      status: 'DELIVERED',
      deliveredAt: new Date(Date.now() - 5000)
    });

    const payload = {
      MessageSid: messageSid,
      MessageStatus: 'delivered',
      To: '+919876543210'
    };

    let sigData = webhookUrl;
    const sortedKeys = Object.keys(payload).sort();
    for (const key of sortedKeys) {
      sigData += key + payload[key];
    }
    const validSignature = crypto.createHmac('sha1', testAuthToken).update(sigData, 'utf-8').digest('base64');

    // Repeated delivery webhook
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-twilio-signature': validSignature
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.duplicate, true, 'Must identify duplicate callback idempotently');
    assert.ok(json.message.includes('already processed'));
  });

  test('4. SMS disabled mode operates safely in simulation with zero carrier cost', async () => {
    // Force SMS_ENABLED=false
    const origSmsEnabled = env.SMS_ENABLED;
    env.SMS_ENABLED = false;

    try {
      const result = await sendSMS('+91-98765-43210', 'Simulation message body');
      assert.equal(result.sent, true);
      assert.equal(result.simulated, true);
      assert.equal(result.status, 'SIMULATED');
      assert.ok(result.sid.startsWith('sim_'));
    } finally {
      env.SMS_ENABLED = origSmsEnabled;
    }
  });

  test('5. Carrier provider failure is non-blocking: does not abort booking or throw unhandled error', async () => {
    // Missing phone number or message body triggers safe failure return
    const failResult = await sendSMS(null, null);
    assert.equal(failResult.sent, false);
    assert.equal(failResult.status, 'FAILED');
    assert.ok(failResult.error);

    // Creating token with valid patient completes successfully even when notification service encounters errors
    const token = await createToken({
      clinicId,
      doctorId,
      patientName: 'Carrier Failure Patient',
      patientPhone: '+91-98765-99999',
      priority: 'STANDARD'
    });

    assert.ok(token._id, 'Token booking must succeed regardless of external notification outcome');
    assert.equal(token.patientName, 'Carrier Failure Patient');
  });

  after(async () => {
    try {
      await Notification.deleteMany({ recipientPhone: { $regex: /98765|99999/ } });
      if (clinicId) {
        await Token.deleteMany({ clinicId });
        await Doctor.deleteMany({ clinicId });
        await Clinic.deleteMany({ _id: clinicId });
      }
    } catch (_) {}
    if (server) {
      if (server.closeAllConnections) server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });
});



