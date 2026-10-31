import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Doctor } from '../src/models/Doctor.js';
import { Clinic } from '../src/models/Clinic.js';
import { Token } from '../src/models/Token.js';
import { TOKEN_STATUS } from '../src/config/constants.js';

describe('New Improvements - SSE Streaming, Patient Cancellation & TV Display Suite', () => {
  let server;
  let baseUrl;
  let clinic;
  let doctor;
  let activeToken;

  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
        resolve();
      });
    });

    clinic = await Clinic.create({
      name: 'GL Bajaj Smart OPD Health Center',
      code: 'GLB-OPD-IMPROVE',
      address: 'Plot 2, Knowledge Park III, Greater Noida',
      phone: '+919999888877',
      defaultConsultationMinutes: 10
    });

    doctor = await Doctor.create({
      clinicId: clinic._id,
      name: 'Dr. Aarav Mehta',
      doctorCode: 'DOC-MEHTA',
      department: 'Cardiology',
      roomNumber: 'Room 204',
      avgConsultMinutes: 8,
      isAvailable: true
    });

    // Book a test token
    const bookRes = await fetch(`${baseUrl}/tokens/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: doctor._id.toString(),
        patientName: 'Rohan Sharma',
        patientPhone: '9876543210',
        priority: 'STANDARD'
      })
    });

    const bookJson = await bookRes.json();
    assert.equal(bookRes.status, 201);
    activeToken = bookJson.data;
  });

  after(async () => {
    if (doctor) await Doctor.deleteMany({ _id: doctor._id });
    if (clinic) await Clinic.deleteMany({ _id: clinic._id });
    if (activeToken) await Token.deleteMany({ trackingUuid: activeToken.trackingUuid });
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  it('1. Public TV Display endpoint returns all active rooms with serving and up-next tokens', async () => {
    const res = await fetch(`${baseUrl}/tokens/display/public`);
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.rooms));

    const room = json.data.rooms.find((r) => r.doctorId === doctor._id.toString());
    assert.ok(room, 'Doctor Mehta room should be present in public display list');
    assert.equal(room.roomNumber, 'Room 204');
    assert.equal(room.doctorName, 'Dr. Aarav Mehta');
    assert.equal(room.department, 'Cardiology');
    assert.ok(room.totalWaiting >= 1);
  });

  it('2. Patient-Initiated Cancellation endpoint successfully surrenders the token', async () => {
    const res = await fetch(`${baseUrl}/tokens/track/${activeToken.trackingUuid}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Patient plans to visit tomorrow' })
    });
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.status, TOKEN_STATUS.CANCELLED);

    // Verify in database that activeBookingKey is released
    const tokenInDb = await Token.findOne({ trackingUuid: activeToken.trackingUuid });
    assert.equal(tokenInDb.status, TOKEN_STATUS.CANCELLED);
    assert.equal(tokenInDb.activeBookingKey, null);
  });

  it('3. Repeated cancellation of an already cancelled token returns HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/tokens/track/${activeToken.trackingUuid}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Repeated cancellation attempt' })
    });
    const json = await res.json();

    assert.equal(res.status, 400);
    assert.equal(json.success, false);
    assert.match(json.error, /already cancelled/i);
  });

  it('4. Non-existent trackingUuid returns HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/tokens/track/00000000-0000-0000-0000-000000000000/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Ghost cancel' })
    });
    const json = await res.json();

    assert.equal(res.status, 404);
    assert.equal(json.success, false);
  });

  it('5. Waiting Room TV Display SSE Stream returns text/event-stream content type and initial event', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${baseUrl}/tokens/display/stream`, {
      signal: controller.signal
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/event-stream');

    const reader = res.body.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    assert.ok(text.includes('event: initial'));
    assert.ok(text.includes('data:'));

    clearTimeout(timeout);
    controller.abort();
  });
});
