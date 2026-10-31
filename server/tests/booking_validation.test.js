import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { User } from '../src/models/User.js';
import { Token } from '../src/models/Token.js';
import { TOKEN_STATUS, ROLES } from '../src/config/constants.js';

describe('Booking Validation, Rate Limiting & Lifecycle Suite', () => {
  let server;
  let baseUrl;
  let clinicId;
  let activeDoctorId;
  let unavailableDoctorId;
  let staffToken;

  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
        resolve();
      });
    });

    let clinic = await Clinic.findOne({ code: 'VAL-TEST-CLINIC' });
    if (!clinic) {
      clinic = await Clinic.create({
        name: 'GL Bajaj Validation Test Clinic',
        code: 'VAL-TEST-CLINIC',
        phone: '+91-99999-11111',
        defaultConsultationMinutes: 10
      });
    }
    clinicId = clinic._id;

    // Active doctor
    let doc1 = await Doctor.findOne({ doctorCode: 'DOC-VAL-ACTIVE' });
    if (!doc1) {
      doc1 = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-VAL-ACTIVE',
        name: 'Dr. Active Generalist',
        department: 'General Medicine',
        roomNumber: 'Room 101',
        avgConsultMinutes: 10,
        isAvailable: true
      });
    }
    activeDoctorId = doc1._id;

    // Unavailable doctor
    let doc2 = await Doctor.findOne({ doctorCode: 'DOC-VAL-UNAVAIL' });
    if (!doc2) {
      doc2 = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-VAL-UNAVAIL',
        name: 'Dr. Unavailable Specialist',
        department: 'General Medicine',
        roomNumber: 'Room 102',
        avgConsultMinutes: 10,
        isAvailable: false
      });
    }
    unavailableDoctorId = doc2._id;

    // Staff user for check-in and doctor actions
    let staffUser = await User.findOne({ email: 'val.staff@glbitm.ac.in' });
    if (!staffUser) {
      staffUser = await User.create({
        name: 'Staff Validator',
        email: 'val.staff@glbitm.ac.in',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        role: ROLES.RECEPTIONIST,
        clinicId,
        isActive: true
      });
    }

    staffToken = jwt.sign(
      {
        sub: staffUser._id.toString(),
        id: staffUser._id,
        role: ROLES.RECEPTIONIST,
        email: staffUser.email
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
    await User.deleteMany({ email: 'val.staff@glbitm.ac.in' });
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  test('1. Health endpoint returns 200 with standard health indicators', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'ok');
    assert.ok(json.data.timestamp);
    assert.ok(typeof json.data.uptimeSeconds === 'number');
    assert.ok(json.data.database);
  });

  test('2. API error envelope is uniform across bad requests and not found endpoints', async () => {
    // 404 test
    const notFoundRes = await fetch(`${baseUrl}/non-existent-route`);
    assert.equal(notFoundRes.status, 404);
    const notFoundJson = await notFoundRes.json();
    assert.equal(notFoundJson.success, false);
    assert.ok(notFoundJson.error);

    // 400 test with invalid body
    const badReqRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(badReqRes.status, 400);
    const badReqJson = await badReqRes.json();
    assert.equal(badReqJson.success, false);
    assert.ok(badReqJson.error);
  });

  test('3. Booking validation rejects missing name, invalid phone, invalid doctorId and invalid priority', async () => {
    // Missing patientName
    const res1 = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: activeDoctorId,
        patientName: '',
        patientPhone: '+91-98765-43210'
      })
    });
    assert.equal(res1.status, 400);
    assert.ok((await res1.json()).error.includes('Patient name must be at least 2 characters'));

    // Invalid phone
    const res2 = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: activeDoctorId,
        patientName: 'Aarav Gupta',
        patientPhone: '123'
      })
    });
    assert.equal(res2.status, 400);
    assert.ok((await res2.json()).error.includes('Valid contact phone number is required'));

    // Invalid doctorId
    const res3 = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: 'not-a-valid-objectid',
        patientName: 'Aarav Gupta',
        patientPhone: '+91-98765-43210'
      })
    });
    assert.equal(res3.status, 400);
    assert.ok((await res3.json()).error.includes('Valid Doctor ID is required'));

    // Invalid priority
    const res4 = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: activeDoctorId,
        patientName: 'Aarav Gupta',
        patientPhone: '+91-98765-43210',
        priority: 'SUPER_URGENT_VIP'
      })
    });
    assert.equal(res4.status, 400);
    assert.ok((await res4.json()).error.includes('Invalid priority level'));
  });

  test('4. Booking rejected when doctor is marked unavailable', async () => {
    const res = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: unavailableDoctorId,
        patientName: 'Pooja Sharma',
        patientPhone: '+91-98765-44444',
        priority: 'STANDARD'
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes('unavailable'));
  });

  test('5. Check-in endpoint validates token, marks isCheckedIn: true, and handles repeated scans idempotently', async () => {
    // 1. Create a token
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: activeDoctorId,
        patientName: 'Checkin Test Patient',
        patientPhone: '+91-98765-55555',
        priority: 'STANDARD'
      })
    });
    const { trackingUuid } = (await bookRes.json()).data;

    // 2. Perform first check-in
    const checkinRes1 = await fetch(`${baseUrl}/reception/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ trackingUuid })
    });

    assert.equal(checkinRes1.status, 200);
    const checkinJson1 = await checkinRes1.json();
    assert.equal(checkinJson1.success, true);
    assert.equal(checkinJson1.alreadyCheckedIn, false);
    assert.equal(checkinJson1.data.isCheckedIn, true);
    assert.ok(checkinJson1.data.checkedInAt);

    // 3. Perform second check-in (repeated scan) -> must be idempotent
    const checkinRes2 = await fetch(`${baseUrl}/reception/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ trackingUuid })
    });

    assert.equal(checkinRes2.status, 200);
    const checkinJson2 = await checkinRes2.json();
    assert.equal(checkinJson2.success, true);
    assert.equal(checkinJson2.alreadyCheckedIn, true, 'Repeated scan must report alreadyCheckedIn: true');
    assert.ok(checkinJson2.message.includes('already checked in'));
  });

  test('6. Doctor no_show action transitions token to SKIPPED and marks isNoShow: true', async () => {
    // 1. Create token
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: activeDoctorId,
        patientName: 'No Show Action Patient',
        patientPhone: '+91-98765-66666',
        priority: 'STANDARD'
      })
    });
    const { trackingUuid } = (await bookRes.json()).data;
    const tokenDoc = await Token.findOne({ trackingUuid });

    // Call first
    await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ action: 'call_next' })
    });

    // Action no_show
    const noShowRes = await fetch(`${baseUrl}/doctor/tokens/${tokenDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ action: 'no_show' })
    });

    assert.equal(noShowRes.status, 200);
    const noShowJson = await noShowRes.json();
    assert.equal(noShowJson.data.status, TOKEN_STATUS.SKIPPED);

    // Verify DB flag
    const updatedToken = await Token.findById(tokenDoc._id);
    assert.equal(updatedToken.isNoShow, true, 'isNoShow flag must be true');
    assert.equal(updatedToken.status, TOKEN_STATUS.SKIPPED);
  });
});


