import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { Notification } from '../src/models/Notification.js';
import { maskPhoneNumber } from '../src/services/sms.service.js';
import {
  dispatchClinicNotification,
  evaluateNearTurnAlerts
} from '../src/services/queue.service.js';
import { NOTIFICATION_TYPES } from '../src/config/smsTemplates.js';

describe('PROMPT 23 - SMS Templates, Alerts & Failure Behavior Tests', () => {
  let server;
  let baseUrl;
  let testClinic;
  let testDoctor;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    await Clinic.deleteMany({ code: 'GLB-TEST-SMS' });
    testClinic = await Clinic.create({
      name: 'GL Bajaj SMS Test Clinic',
      code: 'GLB-TEST-SMS',
      operatingHours: { open: '08:30', close: '17:30' },
      defaultConsultationMinutes: 10,
      timezone: 'Asia/Kolkata',
      isActive: true
    });

    await Doctor.deleteMany({ clinicId: testClinic._id });
    testDoctor = await Doctor.create({
      clinicId: testClinic._id,
      name: 'Dr. SMS Alert Specialist',
      doctorCode: 'DOC-SMS-001',
      department: 'General Medicine',
      roomNumber: 'Room 303',
      avgConsultMinutes: 10,
      isAvailable: true
    });
  });

  after(async () => {
    try {
      await Notification.deleteMany({ recipientPhone: { $regex: /9876599/ } });
      if (testClinic) {
        await Token.deleteMany({ clinicId: testClinic._id });
        await Doctor.deleteMany({ clinicId: testClinic._id });
        await Clinic.deleteMany({ _id: testClinic._id });
      }
    } catch (_) {}
    if (server) {
      if (server.closeAllConnections) server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  it('1. Phone number masking protects PII in server logs', () => {
    assert.strictEqual(maskPhoneNumber('+91-9876543210'), '+91-******3210');
    assert.strictEqual(maskPhoneNumber('9876543210'), '******3210');
    assert.strictEqual(maskPhoneNumber('+919876543210'), '+91-******3210');
    assert.strictEqual(maskPhoneNumber(''), '—');
  });

  it('2. Booking token dispatches BOOKING_CONFIRMATION template and records notification', async () => {
    const res = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId: testClinic._id,
        doctorId: testDoctor._id,
        patientName: 'SMS Booking Patient',
        patientPhone: '+91-98765-99001',
        priority: 'STANDARD'
      })
    });
    const json = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.trackingUuid);

    // Wait briefly for non-blocking notification persistence
    await new Promise((r) => setTimeout(r, 60));

    const notification = await Notification.findOne({
      recipientPhone: '+919876599001',
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION
    });

    assert.ok(notification, 'Notification record must be persisted in database');
    assert.strictEqual(notification.status, 'SIMULATED');
    assert.ok(notification.message.includes('confirmed for Dr. SMS Alert Specialist'));
    assert.ok(notification.message.includes('GL Bajaj SMS Test Clinic'));
  });

  it('3. Idempotency key prevents duplicate notifications for the same event', async () => {
    const token = await Token.findOne({ normalizedPhone: '+919876599001' })
      .populate('doctorId')
      .populate('clinicId');

    const key = `test_idempotent_event_${token._id}`;

    // First dispatch
    const first = await dispatchClinicNotification({
      token,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
      idempotencyKey: key
    });
    assert.ok(first);

    // Count notifications
    const countBefore = await Notification.countDocuments({ idempotencyKey: key });
    assert.strictEqual(countBefore, 1);

    // Second dispatch with same idempotency key
    const second = await dispatchClinicNotification({
      token,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
      idempotencyKey: key
    });
    assert.ok(second);

    // Count should still be 1 (no duplicate document created)
    const countAfter = await Notification.countDocuments({ idempotencyKey: key });
    assert.strictEqual(countAfter, 1, 'Must not duplicate notification for identical idempotency key');
  });

  it('4. Deterministic near-turn alerts fire when patient is within threshold (<= 3 ahead)', async () => {
    // Book token 2 and token 3
    const bookToken = async (name, phone) => {
      const res = await fetch(`${baseUrl}/tokens/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: testClinic._id,
          doctorId: testDoctor._id,
          patientName: name,
          patientPhone: phone,
          priority: 'STANDARD'
        })
      });
      return res.json();
    };

    await bookToken('Near Turn Patient 2', '+91-98765-99002');
    await bookToken('Near Turn Patient 3', '+91-98765-99003');

    // Tokens in queue: Patient 1, Patient 2, Patient 3
    // For Patient 2: 1 patient ahead (<= 3). It should have nearTurnAlertSent: true
    await new Promise((r) => setTimeout(r, 80));

    const token2 = await Token.findOne({ normalizedPhone: '+919876599002' });
    assert.ok(token2);
    assert.strictEqual(token2.nearTurnAlertSent, true, 'nearTurnAlertSent flag must be true');

    const alertNotification = await Notification.findOne({
      tokenId: token2._id,
      type: NOTIFICATION_TYPES.NEAR_TURN_ALERT
    });
    assert.ok(alertNotification, 'Near-turn alert notification must exist in database');
    assert.ok(alertNotification.message.includes('Queue Alert: Only'));

    // Re-evaluating near-turn alerts must be idempotent (zero additional alerts)
    const alertCountBefore = await Notification.countDocuments({
      tokenId: token2._id,
      type: NOTIFICATION_TYPES.NEAR_TURN_ALERT
    });
    await evaluateNearTurnAlerts(testDoctor._id);
    const alertCountAfter = await Notification.countDocuments({
      tokenId: token2._id,
      type: NOTIFICATION_TYPES.NEAR_TURN_ALERT
    });
    assert.strictEqual(alertCountAfter, alertCountBefore, 'Must not re-dispatch already sent near-turn alert');
  });

  it('5. On-demand patient status SMS query (/tokens/track/:uuid/status-sms) works correctly', async () => {
    const token = await Token.findOne({ normalizedPhone: '+919876599001' });

    const res = await fetch(`${baseUrl}/tokens/track/${token.trackingUuid}/status-sms`, {
      method: 'POST'
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.message.includes('Status notification successfully requested'));

    const statusNotification = await Notification.findOne({
      tokenId: token._id,
      type: NOTIFICATION_TYPES.STATUS_HELP
    });
    assert.ok(statusNotification);
    assert.ok(statusNotification.message.includes('Status is'));
  });
});


