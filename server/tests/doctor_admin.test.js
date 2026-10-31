import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { User } from '../src/models/User.js';
import { createStaffAccount } from '../src/services/auth.service.js';

describe('PROMPT 10 - Doctor Console & Admin Operations Tests', () => {
  let server;
  let baseUrl;
  let testClinic;
  let doctorProfile1;
  let doctorProfile2;
  let doctorToken1;
  let doctorToken2;
  let receptionistToken;
  let adminToken;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    await Clinic.deleteMany({ code: 'GLB-TEST-DOCADM' });
    testClinic = await Clinic.create({
      name: 'GL Bajaj Doctor & Admin Test Clinic',
      code: 'GLB-TEST-DOCADM',
      operatingHours: { open: '08:30', close: '17:30' },
      defaultConsultationMinutes: 10,
      timezone: 'Asia/Kolkata',
      isActive: true
    });

    await Doctor.deleteMany({ clinicId: testClinic._id });
    doctorProfile1 = await Doctor.create({
      clinicId: testClinic._id,
      name: 'Dr. Dedicated Specialist 1',
      doctorCode: 'DOC-SPEC-101',
      department: 'Cardiology',
      roomNumber: 'Room 201',
      avgConsultMinutes: 12,
      isAvailable: true
    });

    doctorProfile2 = await Doctor.create({
      clinicId: testClinic._id,
      name: 'Dr. Dedicated Specialist 2',
      doctorCode: 'DOC-SPEC-102',
      department: 'Neurology',
      roomNumber: 'Room 202',
      avgConsultMinutes: 15,
      isAvailable: true
    });

    await User.deleteMany({
      email: {
        $in: [
          'doc1.test@glbitm.ac.in',
          'doc2.test@glbitm.ac.in',
          'recep.test@glbitm.ac.in',
          'admin.test@glbitm.ac.in'
        ]
      }
    });

    await createStaffAccount({
      name: 'Dr. One',
      email: 'doc1.test@glbitm.ac.in',
      password: 'Password123!',
      role: 'DOCTOR',
      doctorProfileId: doctorProfile1._id
    });

    await createStaffAccount({
      name: 'Dr. Two',
      email: 'doc2.test@glbitm.ac.in',
      password: 'Password123!',
      role: 'DOCTOR',
      doctorProfileId: doctorProfile2._id
    });

    await createStaffAccount({
      name: 'Receptionist Test',
      email: 'recep.test@glbitm.ac.in',
      password: 'Password123!',
      role: 'RECEPTIONIST'
    });

    await createStaffAccount({
      name: 'Admin Test',
      email: 'admin.test@glbitm.ac.in',
      password: 'Password123!',
      role: 'ADMIN'
    });

    // Helper to log in and get JWT token
    const loginUser = async (email, password) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      return data.data.token;
    };

    doctorToken1 = await loginUser('doc1.test@glbitm.ac.in', 'Password123!');
    doctorToken2 = await loginUser('doc2.test@glbitm.ac.in', 'Password123!');
    receptionistToken = await loginUser('recep.test@glbitm.ac.in', 'Password123!');
    adminToken = await loginUser('admin.test@glbitm.ac.in', 'Password123!');
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await Token.deleteMany({ clinicId: testClinic._id });
    await Doctor.deleteMany({ clinicId: testClinic._id });
    await Clinic.deleteMany({ _id: testClinic._id });
    await User.deleteMany({
      email: {
        $in: [
          'doc1.test@glbitm.ac.in',
          'doc2.test@glbitm.ac.in',
          'recep.test@glbitm.ac.in',
          'admin.test@glbitm.ac.in'
        ]
      }
    });
  });

  it('1. Doctor can access their own queue via /doctor/queue without passing doctorId', async () => {
    const res = await fetch(`${baseUrl}/doctor/queue`, {
      headers: { Authorization: `Bearer ${doctorToken1}` }
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.doctor.doctorCode, 'DOC-SPEC-101');
    assert.ok(Array.isArray(json.data.queue));
  });

  it('2. Doctor CANNOT access another doctor queue (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/doctor/queue?doctorId=${doctorProfile2._id}`, {
      headers: { Authorization: `Bearer ${doctorToken1}` }
    });
    const json = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(json.success, false);
    assert.ok(json.error.includes("Doctors cannot access or manage another doctor's queue"));
  });

  it('3. Doctor CANNOT action another doctor token (HTTP 403 Forbidden)', async () => {
    // Book a token for doctor 2
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId: testClinic._id,
        doctorId: doctorProfile2._id,
        patientName: 'Jane Doc2 Patient',
        patientPhone: '+91-98765-43210',
        priority: 'STANDARD'
      })
    });
    const bookJson = await bookRes.json();
    assert.strictEqual(bookRes.status, 201);
    const token2 = await Token.findOne({ trackingUuid: bookJson.data.trackingUuid });
    const token2Id = token2._id;

    // Doctor 1 tries to call Doctor 2's token
    const actionRes = await fetch(`${baseUrl}/doctor/tokens/${token2Id}/action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken1}`
      },
      body: JSON.stringify({ action: 'call_next' })
    });
    const actionJson = await actionRes.json();

    assert.strictEqual(actionRes.status, 403);
    assert.strictEqual(actionJson.success, false);
    assert.ok(actionJson.error.includes("Doctors cannot access or manage another doctor's queue"));
  });

  it('4. Non-admin users cannot access /admin/* endpoints (HTTP 403 Forbidden)', async () => {
    const resDoctor = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { Authorization: `Bearer ${doctorToken1}` }
    });
    assert.strictEqual(resDoctor.status, 403);

    const resRecep = await fetch(`${baseUrl}/admin/staff`, {
      headers: { Authorization: `Bearer ${receptionistToken}` }
    });
    assert.strictEqual(resRecep.status, 403);
  });

  it('5. Admin operations: Doctor CRUD, staff management, clinic settings, analytics and audit logs', async () => {
    // 5a. Admin Analytics
    const analyticsRes = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const analyticsJson = await analyticsRes.json();
    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(analyticsJson.success, true);
    assert.ok(analyticsJson.data.metrics);
    assert.ok(Array.isArray(analyticsJson.data.doctors));

    // 5b. Admin Doctor Update (toggle availability)
    const docUpdateRes = await fetch(`${baseUrl}/admin/doctors/${doctorProfile1._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isAvailable: false, roomNumber: 'Room 201-B' })
    });
    const docUpdateJson = await docUpdateRes.json();
    assert.strictEqual(docUpdateRes.status, 200);
    assert.strictEqual(docUpdateJson.data.isAvailable, false);
    assert.strictEqual(docUpdateJson.data.roomNumber, 'Room 201-B');

    // 5c. Admin Staff Listing
    const staffRes = await fetch(`${baseUrl}/admin/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const staffJson = await staffRes.json();
    assert.strictEqual(staffRes.status, 200);
    assert.ok(Array.isArray(staffJson.data));
    const targetUser = staffJson.data.find((u) => u.email === 'doc1.test@glbitm.ac.in');
    assert.ok(targetUser);

    // 5d. Admin Disable & Re-enable Staff Account
    const disableRes = await fetch(`${baseUrl}/admin/staff/${targetUser._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isActive: false })
    });
    const disableJson = await disableRes.json();
    assert.strictEqual(disableRes.status, 200);
    assert.strictEqual(disableJson.data.isActive, false);

    // 5e. Admin Clinic Settings Get & Update
    const settingsGetRes = await fetch(`${baseUrl}/admin/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const settingsGetJson = await settingsGetRes.json();
    assert.strictEqual(settingsGetRes.status, 200);
    assert.strictEqual(settingsGetJson.success, true);

    const settingsUpdateRes = await fetch(`${baseUrl}/admin/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        defaultConsultationMinutes: 15,
        operatingHours: { open: '08:00', close: '18:00' }
      })
    });
    const settingsUpdateJson = await settingsUpdateRes.json();
    assert.strictEqual(settingsUpdateRes.status, 200);
    assert.strictEqual(settingsUpdateJson.data.defaultConsultationMinutes, 15);
    assert.strictEqual(settingsUpdateJson.data.operatingHours.open, '08:00');

    // 5f. Admin Audit Logs
    const auditRes = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const auditJson = await auditRes.json();
    assert.strictEqual(auditRes.status, 200);
    assert.ok(Array.isArray(auditJson.data.logs));
    assert.ok(auditJson.data.pagination);
  });

  after(async () => {
    await Clinic.deleteMany({ code: 'GLB-TEST-DOCADM' });
    if (testClinic) {
      await Doctor.deleteMany({ clinicId: testClinic._id });
      await Token.deleteMany({ clinicId: testClinic._id });
    }
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });
});

