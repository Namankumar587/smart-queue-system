import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { User } from '../src/models/User.js';
import { Token } from '../src/models/Token.js';
import { TOKEN_STATUS, ROLES } from '../src/config/constants.js';

describe('PROMPT 9 - Reception & Staff Queue Control Contract Tests', () => {
  let server;
  let baseUrl;
  let clinicId;
  let doctorId;
  let receptionistUser;
  let receptionistToken;

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

    // Clean up test collections
    await Clinic.deleteMany({ code: 'STAFF-TEST' });
    await Doctor.deleteMany({ doctorCode: 'DOC-STAFF-001' });
    await User.deleteMany({ email: 'staff.reception.test@glbitm.ac.in' });

    // Create test clinic
    const clinic = await Clinic.create({
      name: 'GL Bajaj Staff Dashboard Clinic',
      code: 'STAFF-TEST',
      address: 'Knowledge Park III, Greater Noida',
      phone: '+91-99999-66666',
      timezone: 'Asia/Kolkata',
      operatingHours: { open: '08:00', close: '20:00' },
      defaultConsultationMinutes: 10
    });
    clinicId = clinic._id;

    // Create test doctor
    const doctor = await Doctor.create({
      clinicId,
      name: 'Dr. Staff Queue Specialist',
      doctorCode: 'DOC-STAFF-001',
      department: 'Pediatrics',
      roomNumber: 'Room 105',
      avgConsultMinutes: 10,
      isAvailable: true
    });
    doctorId = doctor._id;

    // Create receptionist user
    receptionistUser = await User.create({
      name: 'Ritu Verma',
      email: 'staff.reception.test@glbitm.ac.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // placeholder hash
      role: ROLES.RECEPTIONIST,
      clinicId,
      isActive: true
    });

    // Generate valid receptionist JWT
    receptionistToken = jwt.sign(
      {
        sub: receptionistUser._id.toString(),
        id: receptionistUser._id,
        role: ROLES.RECEPTIONIST,
        email: receptionistUser.email
      },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );
  });

  beforeEach(async () => {
    await Token.deleteMany({ clinicId });
  });

  after(async () => {
    await Token.deleteMany({ clinicId });
    await Doctor.deleteMany({ clinicId });
    await Clinic.deleteMany({ _id: clinicId });
    await User.deleteMany({ email: 'staff.reception.test@glbitm.ac.in' });
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  test('1. GET /reception/overview returns doctor queues with waiting counts and room info', async () => {
    // Book a waiting token
    await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId,
        doctorId,
        patientName: 'Overview Test Patient',
        patientPhone: '+91-98765-77771',
        priority: 'STANDARD'
      })
    });

    const res = await fetch(`${baseUrl}/reception/overview`, {
      headers: {
        Authorization: `Bearer ${receptionistToken}`
      }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.queues.length >= 1);

    const docQueue = json.data.queues.find((q) => q.doctorId.toString() === doctorId.toString());
    assert.ok(docQueue, 'Must include test doctor');
    assert.equal(docQueue.doctorName, 'Dr. Staff Queue Specialist');
    assert.equal(docQueue.roomNumber, 'Room 105');
    assert.equal(docQueue.waitingCount, 1);
  });

  test('2. POST /reception/walkin registers in-person walk-in token with WALKIN source', async () => {
    const res = await fetch(`${baseUrl}/reception/walkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({
        doctorId,
        patientName: 'Walkin Fast Entry Patient',
        patientPhone: '+91-98765-77772',
        priority: 'ELDERLY',
        notes: 'Needs wheelchair assistance'
      })
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.source, 'WALKIN');
    assert.equal(json.data.priority, 'ELDERLY');
    assert.ok(json.data.tokenNumber, 'Must return tokenNumber');
    assert.ok(json.data.tokenNumber.startsWith('T-'), 'Token number should be formatted as T-XXX');
  });

  test('3. Receptionist executes full queue cycle: call_next -> start_consultation -> complete', async () => {
    // 1. Create a waiting token via walkin
    const bookRes = await fetch(`${baseUrl}/reception/walkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({
        doctorId,
        patientName: 'Cycle Test Patient',
        patientPhone: '+91-98765-77773',
        priority: 'STANDARD'
      })
    });
    const { trackingUuid } = (await bookRes.json()).data;
    const tokenDoc = await Token.findOne({ trackingUuid });

    // 2. Call Next: WAITING -> CALLED
    const callRes = await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({ action: 'call_next' })
    });
    assert.equal(callRes.status, 200);
    const callJson = await callRes.json();
    assert.equal(callJson.data.status, TOKEN_STATUS.CALLED);

    // 3. Start Consultation: CALLED -> IN_CONSULTATION
    const startRes = await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({ action: 'start_consultation' })
    });
    assert.equal(startRes.status, 200);
    const startJson = await startRes.json();
    assert.equal(startJson.data.status, TOKEN_STATUS.IN_CONSULTATION);

    // 4. Complete Visit: IN_CONSULTATION -> COMPLETED
    const completeRes = await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({ action: 'complete' })
    });
    assert.equal(completeRes.status, 200);
    const completeJson = await completeRes.json();
    assert.equal(completeJson.data.status, TOKEN_STATUS.COMPLETED);
  });

  test('4. Skip (No-Show) and Recall (Requeue) lifecycle works correctly', async () => {
    // Create token and move to CALLED
    const bookRes = await fetch(`${baseUrl}/reception/walkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({
        doctorId,
        patientName: 'No Show Patient',
        patientPhone: '+91-98765-77774',
        priority: 'STANDARD'
      })
    });
    const { trackingUuid } = (await bookRes.json()).data;
    const tokenDoc = await Token.findOne({ trackingUuid });

    await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({ action: 'call_next' })
    });

    // Skip / No-show: CALLED -> SKIPPED
    const skipRes = await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({ action: 'skip' })
    });
    assert.equal(skipRes.status, 200);
    const skipJson = await skipRes.json();
    assert.equal(skipJson.data.status, TOKEN_STATUS.SKIPPED);

    // Requeue / Recall: SKIPPED -> WAITING
    const recallRes = await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({ action: 'recall' })
    });
    assert.equal(recallRes.status, 200);
    const recallJson = await recallRes.json();
    assert.equal(recallJson.data.status, TOKEN_STATUS.WAITING);
  });

  test('5. Rejects invalid state transitions with HTTP 400 and clear error description', async () => {
    const bookRes = await fetch(`${baseUrl}/reception/walkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({
        doctorId,
        patientName: 'Invalid Transition Patient',
        patientPhone: '+91-98765-77775',
        priority: 'STANDARD'
      })
    });
    const { trackingUuid } = (await bookRes.json()).data;
    const tokenDoc = await Token.findOne({ trackingUuid });

    // Attempt to directly complete a WAITING token without calling or consulting
    const invalidRes = await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`
      },
      body: JSON.stringify({ action: 'complete' })
    });

    assert.equal(invalidRes.status, 400);
    const json = await invalidRes.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes('Invalid transition'));
  });
});


