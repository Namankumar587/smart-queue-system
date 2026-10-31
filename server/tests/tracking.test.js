import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { TOKEN_STATUS } from '../src/config/constants.js';

describe('PROMPT 8 - Live Tracking /track/:id Contract & Policy Tests', () => {
  let server;
  let baseUrl;
  let clinicId;
  let doctorId;

  before(async () => {
    await connectDB();

    // Ephemeral HTTP test server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
        resolve();
      });
    });

    // Clean up prior test records if any
    await Clinic.deleteMany({ code: 'TRACK-TEST' });
    await Doctor.deleteMany({ doctorCode: 'DOC-TRACK-001' });

    // Create test clinic
    const clinic = await Clinic.create({
      name: 'GL Bajaj Tracking Test Clinic',
      code: 'TRACK-TEST',
      address: 'Knowledge Park III, Greater Noida',
      phone: '+91-99999-77777',
      timezone: 'Asia/Kolkata',
      operatingHours: { open: '08:00', close: '20:00' },
      defaultConsultationMinutes: 10
    });
    clinicId = clinic._id;

    // Create test doctor
    const doctor = await Doctor.create({
      clinicId,
      name: 'Dr. Live Tracking Specialist',
      doctorCode: 'DOC-TRACK-001',
      department: 'Orthopedics',
      roomNumber: 'Room 304',
      avgConsultMinutes: 15,
      isAvailable: true
    });
    doctorId = doctor._id;
  });

  beforeEach(async () => {
    await Token.deleteMany({ clinicId });
  });

  after(async () => {
    await Token.deleteMany({ clinicId });
    await Doctor.deleteMany({ clinicId });
    await Clinic.deleteMany({ _id: clinicId });
    await new Promise((resolve) => server.close(resolve));
  });

  test('1. Server response includes strict Cache-Control: no-store and pragma headers', async () => {
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Cache Control Patient',
        patientPhone: '+91-98765-55551',
        priority: 'STANDARD'
      })
    });

    const bookJson = await bookRes.json();
    const { trackingUuid } = bookJson.data;

    const res = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(res.status, 200);

    const cacheControl = res.headers.get('cache-control');
    assert.ok(cacheControl, 'Must send Cache-Control header');
    assert.ok(cacheControl.includes('no-store'), 'Cache-Control must contain no-store');
    assert.ok(cacheControl.includes('no-cache'), 'Cache-Control must contain no-cache');

    const pragma = res.headers.get('pragma');
    assert.ok(pragma && pragma.includes('no-cache'), 'Pragma must be no-cache');
  });

  test('2. Response payload includes token code, doctor, room, position, wait estimate, and current serving code', async () => {
    // Token A: Active / In-consultation serving token
    const bookA = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Currently Serving Patient',
        patientPhone: '+91-98765-55552',
        priority: 'STANDARD'
      })
    });
    const jsonA = await bookA.json();
    const servingCode = jsonA.data.displayCode;

    // Transition Token A to CALLED
    const tokenDocA = await Token.findOne({ trackingUuid: jsonA.data.trackingUuid });
    tokenDocA.status = TOKEN_STATUS.CALLED;
    tokenDocA.calledAt = new Date();
    await tokenDocA.save();

    // Token B: Waiting patient tracking their turn
    const bookB = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Waiting Patient',
        patientPhone: '+91-98765-55553',
        priority: 'STANDARD'
      })
    });
    const jsonB = await bookB.json();
    const { trackingUuid: uuidB, displayCode: codeB } = jsonB.data;

    const resB = await fetch(`${baseUrl}/tokens/track/${uuidB}`);
    assert.equal(resB.status, 200);

    const dataB = (await resB.json()).data;
    assert.equal(dataB.displayCode, codeB);
    assert.equal(dataB.doctor.name, 'Dr. Live Tracking Specialist');
    assert.equal(dataB.doctor.department, 'Orthopedics');
    assert.equal(dataB.doctor.roomNumber, 'Room 304');
    assert.equal(dataB.status, TOKEN_STATUS.WAITING);
    assert.equal(dataB.positionAhead, 1, 'Token A is CALLED ahead of Token B');
    assert.equal(dataB.currentServingCode, servingCode, 'Must report doctor current serving code');
    assert.ok(dataB.estimatedWaitDisplay.includes('mins'));
    assert.ok(dataB.waitDisclaimer.toLowerCase().includes('estimate, not a guarantee'));
  });

  test('3. Zero PII: Never renders patient phone numbers or other patients data', async () => {
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Secret Medical Record',
        patientPhone: '+91-98765-55554',
        priority: 'STANDARD',
        notes: 'Private doctor consultation notes'
      })
    });

    const { trackingUuid } = (await bookRes.json()).data;
    const res = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    const json = await res.json();
    const rawString = JSON.stringify(json);

    assert.equal(json.data.patientPhone, undefined);
    assert.equal(json.data.patientName, undefined);
    assert.equal(json.data.notes, undefined);
    assert.ok(!rawString.includes('Secret Medical Record'));
    assert.ok(!rawString.includes('9876555554'));
    assert.ok(!rawString.includes('Private doctor consultation notes'));
  });

  test('4. Invalid tracking IDs return graceful HTTP 404 with uniform error format', async () => {
    const invalidUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const res = await fetch(`${baseUrl}/tokens/track/${invalidUuid}`);
    assert.equal(res.status, 404);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error, 'Must provide descriptive error message');
  });

  test('5. Handles completed and cancelled token states accurately without failing', async () => {
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Status Transition Patient',
        patientPhone: '+91-98765-55555',
        priority: 'STANDARD'
      })
    });

    const { trackingUuid } = (await bookRes.json()).data;
    const tokenDoc = await Token.findOne({ trackingUuid });

    // Transition to COMPLETED
    tokenDoc.status = TOKEN_STATUS.COMPLETED;
    tokenDoc.completedAt = new Date();
    await tokenDoc.save();

    const resCompleted = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(resCompleted.status, 200);
    const dataCompleted = (await resCompleted.json()).data;
    assert.equal(dataCompleted.status, TOKEN_STATUS.COMPLETED);
    assert.equal(dataCompleted.positionAhead, 0);

    // Transition to CANCELLED
    tokenDoc.status = TOKEN_STATUS.CANCELLED;
    await tokenDoc.save();

    const resCancelled = await fetch(`${baseUrl}/tokens/track/${trackingUuid}`);
    assert.equal(resCancelled.status, 200);
    const dataCancelled = (await resCancelled.json()).data;
    assert.equal(dataCancelled.status, TOKEN_STATUS.CANCELLED);
    assert.equal(dataCancelled.positionAhead, 0);
  });

  after(async () => {
    try {
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



