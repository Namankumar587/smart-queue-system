import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { Counter } from '../src/models/Counter.js';
import { createToken, updateTokenStatus, normalizePhoneNumber } from '../src/services/queue.service.js';
import { TOKEN_STATUS } from '../src/config/constants.js';

describe('Concurrency & Active-Booking Uniqueness Suite', () => {
  let clinicId;
  let doctorId;
  const testPhone = '+91-98765-00111';

  before(async () => {
    await connectDB();

    // Clean up test phone tokens to ensure test idempotency
    const normalizedPhone = normalizePhoneNumber(testPhone);
    await Token.deleteMany({ normalizedPhone });

    let clinic = await Clinic.findOne({ code: 'GLB-CLINIC-DEMO' });
    if (!clinic) {
      clinic = await Clinic.create({
        name: 'Concurrency Test Clinic',
        code: 'TEST-CLINIC',
        address: 'Test Address'
      });
    }
    clinicId = clinic._id;

    let doctor = await Doctor.findOne({ doctorCode: 'DOC-CONCURRENCY' });
    if (!doctor) {
      doctor = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-CONCURRENCY',
        name: 'Dr. Concurrency Tester',
        department: 'Testing Department',
        roomNumber: 'Room 999',
        avgConsultMinutes: 10,
        isAvailable: true
      });
    }
    doctorId = doctor._id;
  });

  after(async () => {
    try {
      const normalizedPhone = normalizePhoneNumber(testPhone);
      await Token.deleteMany({ normalizedPhone });
    } catch (_) {}
    await disconnectDB();
  });

  test('Concurrent booking attempt with same phone on same day triggers 409 duplicate lock', async () => {
    // 1. First booking succeeds
    const token1 = await createToken({
      clinicId,
      doctorId,
      patientName: 'Concurrency Test Patient',
      patientPhone: testPhone,
      priority: 'STANDARD'
    });

    assert.ok(token1._id, 'Token 1 should be created successfully');
    assert.ok(token1.activeBookingKey, 'Token 1 must have activeBookingKey lock set');

    // 2. Second booking with same doctor and same phone on same day MUST fail
    let duplicateRejected = false;
    try {
      await createToken({
        clinicId,
        doctorId,
        patientName: 'Concurrency Test Patient (Duplicate Attempt)',
        patientPhone: testPhone,
        priority: 'STANDARD'
      });
    } catch (err) {
      duplicateRejected = true;
      assert.strictEqual(err.statusCode, 409, 'Expected HTTP 409 Conflict status');
      assert.ok(err.message.includes('already holds an active token'), 'Expected active token conflict error');
    }

    assert.strictEqual(duplicateRejected, true, 'Second active token booking must be rejected by unique lock');

    // 3. Advance token 1 through state progression: WAITING -> CALLED -> IN_CONSULTATION -> COMPLETED
    await updateTokenStatus(token1._id, TOKEN_STATUS.CALLED);
    await updateTokenStatus(token1._id, TOKEN_STATUS.IN_CONSULTATION);
    const completedToken1 = await updateTokenStatus(token1._id, TOKEN_STATUS.COMPLETED);
    assert.strictEqual(completedToken1.activeBookingKey, null, 'Active lock must be released on COMPLETED');

    // 4. Now patient can book again since previous token is no longer active
    const token2 = await createToken({
      clinicId,
      doctorId,
      patientName: 'Concurrency Test Patient (Subsequent Visit)',
      patientPhone: testPhone,
      priority: 'STANDARD'
    });

    assert.ok(token2._id, 'Token 2 should succeed after Token 1 completed');
    assert.strictEqual(token2.sequenceNumber > token1.sequenceNumber, true, 'Token 2 must have higher sequence number');
  });

  test('50 parallel booking attempts produce 100% unique sequence and token numbers', async () => {
    // Dedicated doctor for 50 parallel bookings test
    let parallelDoc = await Doctor.findOne({ doctorCode: 'DOC-PARALLEL-50' });
    if (!parallelDoc) {
      parallelDoc = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-PARALLEL-50',
        name: 'Dr. High Concurrency Tester',
        department: 'Stress Testing',
        roomNumber: 'Room 50-PARALLEL',
        avgConsultMinutes: 5,
        isAvailable: true
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    await Token.deleteMany({ doctorId: parallelDoc._id, date: todayStr });
    await Counter.deleteMany({ key: new RegExp(`^doc_${parallelDoc._id}`) });

    // Generate 50 distinct booking payloads
    const bookingPayloads = Array.from({ length: 50 }, (_, i) => {
      const idx = String(i + 1).padStart(3, '0');
      return {
        clinicId,
        doctorId: parallelDoc._id,
        patientName: `Parallel Patient ${idx}`,
        patientPhone: `+91-97000-00${idx}`,
        priority: i % 10 === 0 ? 'EMERGENCY_WALKIN' : i % 5 === 0 ? 'ELDERLY' : 'STANDARD'
      };
    });

    // Fire all 50 booking attempts simultaneously
    const startTime = Date.now();
    const tokenResults = await Promise.all(
      bookingPayloads.map((payload) => createToken(payload))
    );
    const durationMs = Date.now() - startTime;

    assert.strictEqual(tokenResults.length, 50, 'All 50 bookings must resolve successfully');

    // 1. Verify sequence numbers are 100% unique and range 1..50
    const sequenceNumbers = tokenResults.map((t) => t.sequenceNumber).sort((a, b) => a - b);
    const uniqueSequences = new Set(sequenceNumbers);
    assert.strictEqual(uniqueSequences.size, 50, 'Every token must have a unique sequenceNumber');
    assert.strictEqual(sequenceNumbers[0], 1, 'First sequence number must be 1');
    assert.strictEqual(sequenceNumbers[49], 50, '50th sequence number must be 50');

    // 2. Verify token numbers are 100% unique
    const tokenNumbers = tokenResults.map((t) => t.tokenNumber);
    const uniqueTokens = new Set(tokenNumbers);
    assert.strictEqual(uniqueTokens.size, 50, 'Every token must have a unique tokenNumber');

    // 3. Verify tracking UUIDs are 100% unique
    const trackingUuids = tokenResults.map((t) => t.trackingUuid);
    const uniqueTracking = new Set(trackingUuids);
    assert.strictEqual(uniqueTracking.size, 50, 'Every token must have a unique trackingUuid');

    // 4. Verify MongoDB count matches exactly 50
    const dbCount = await Token.countDocuments({ doctorId: parallelDoc._id, date: todayStr });
    assert.strictEqual(dbCount, 50, 'Database must contain exactly 50 tokens for this doctor and day');

    console.log(`[Concurrency Benchmark] 50 parallel bookings completed atomically in ${durationMs}ms`);

    // Let background notification promises settle before test teardown
    await new Promise((r) => setTimeout(r, 150));

    // Clean up
    await Token.deleteMany({ doctorId: parallelDoc._id, date: todayStr });
    await Doctor.deleteMany({ _id: parallelDoc._id });
  });
});

