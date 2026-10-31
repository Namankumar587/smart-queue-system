import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { Counter } from '../src/models/Counter.js';
import {
  createToken,
  updateTokenStatus,
  getActiveQueueForDoctor,
  getEffectiveConsultationMinutes,
  calculateTokenQueuePosition
} from '../src/services/queue.service.js';
import { TOKEN_STATUS, PRIORITY_LEVELS, ALLOWED_TRANSITIONS } from '../src/config/constants.js';

describe('Deterministic Queue Engine & Token Service Suite', () => {
  let clinicId;
  let testDoctor;
  const todayStr = new Date().toISOString().split('T')[0];

  before(async () => {
    await connectDB();

    let clinic = await Clinic.findOne({ code: 'GLB-QUEUE-TEST-CLINIC' });
    if (!clinic) {
      clinic = await Clinic.create({
        name: 'GL Bajaj Queue Unit Testing Clinic',
        code: 'GLB-QUEUE-TEST-CLINIC',
        address: 'Knowledge Park III, Greater Noida'
      });
    }
    clinicId = clinic._id;

    let doctor = await Doctor.findOne({ doctorCode: 'DOC-QUEUE-UNIT' });
    if (!doctor) {
      doctor = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-QUEUE-UNIT',
        name: 'Dr. Queue Determinism Specialist',
        department: 'Unit Testing Dept',
        roomNumber: 'Room 777',
        avgConsultMinutes: 10,
        isAvailable: true
      });
    }
    testDoctor = doctor;
  });

  after(async () => {
    await Token.deleteMany({ doctorId: testDoctor._id });
    await Counter.deleteMany({ key: new RegExp(`^doc_${testDoctor._id}`) });
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean tokens and counters for test doctor prior to each unit test
    await Token.deleteMany({ doctorId: testDoctor._id });
    await Counter.deleteMany({ key: new RegExp(`^doc_${testDoctor._id}`) });
  });

  test('1. Ordering: Active tokens sort strictly by priorityRank ascending (Emergency -> Elderly -> Standard)', async () => {
    // Book standard first (Rank 3)
    const tokenStd = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Standard Patient',
      patientPhone: '+91-91111-00001',
      priority: 'STANDARD'
    });

    // Book elderly second (Rank 2)
    const tokenEld = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Elderly Patient',
      patientPhone: '+91-91111-00002',
      priority: 'ELDERLY'
    });

    // Book emergency third (Rank 1)
    const tokenEmerg = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Emergency Patient',
      patientPhone: '+91-91111-00003',
      priority: 'EMERGENCY_WALKIN'
    });

    const activeQueue = await getActiveQueueForDoctor(testDoctor._id, todayStr);
    assert.strictEqual(activeQueue.length, 3, 'Queue must contain 3 active tokens');

    // Rank 1 (Emergency) must be first
    assert.strictEqual(activeQueue[0]._id.toString(), tokenEmerg._id.toString());
    assert.strictEqual(activeQueue[0].priorityRank, 1);

    // Rank 2 (Elderly) must be second
    assert.strictEqual(activeQueue[1]._id.toString(), tokenEld._id.toString());
    assert.strictEqual(activeQueue[1].priorityRank, 2);

    // Rank 3 (Standard) must be third
    assert.strictEqual(activeQueue[2]._id.toString(), tokenStd._id.toString());
    assert.strictEqual(activeQueue[2].priorityRank, 3);
  });

  test('2. Tie-breaks: Equal priority rank tokens order strictly by bookedAt ascending', async () => {
    const t0 = new Date('2026-10-28T10:00:00.000Z');
    const t1 = new Date('2026-10-28T10:05:00.000Z');

    const tokenA = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Patient A (Booked Earlier)',
      patientPhone: '+91-92222-00001',
      priority: 'STANDARD'
    });
    // Manually force timestamps to verify deterministic tie-break
    await Token.findByIdAndUpdate(tokenA._id, { bookedAt: t0 });

    const tokenB = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Patient B (Booked Later)',
      patientPhone: '+91-92222-00002',
      priority: 'STANDARD'
    });
    await Token.findByIdAndUpdate(tokenB._id, { bookedAt: t1 });

    const activeQueue = await getActiveQueueForDoctor(testDoctor._id, todayStr);
    assert.strictEqual(activeQueue[0]._id.toString(), tokenA._id.toString(), 'Earlier bookedAt must precede later bookedAt');
    assert.strictEqual(activeQueue[1]._id.toString(), tokenB._id.toString());
  });

  test('3. Atomic numbering: Concurrent bookings produce monotonic, non-colliding token numbers', async () => {
    const parallelBookings = [
      { name: 'Concurrent 1', phone: '+91-93333-00001' },
      { name: 'Concurrent 2', phone: '+91-93333-00002' },
      { name: 'Concurrent 3', phone: '+91-93333-00003' },
      { name: 'Concurrent 4', phone: '+91-93333-00004' },
      { name: 'Concurrent 5', phone: '+91-93333-00005' }
    ];

    const results = await Promise.all(
      parallelBookings.map((p) =>
        createToken({
          clinicId,
          doctorId: testDoctor._id,
          patientName: p.name,
          patientPhone: p.phone,
          priority: 'STANDARD'
        })
      )
    );

    const sequenceNumbers = results.map((r) => r.sequenceNumber).sort((a, b) => a - b);
    assert.deepStrictEqual(sequenceNumbers, [1, 2, 3, 4, 5], 'Sequences must be contiguous from 1 to 5');

    const tokenNumbers = results.map((r) => r.tokenNumber);
    const uniqueTokens = new Set(tokenNumbers);
    assert.strictEqual(uniqueTokens.size, 5, 'All token numbers must be unique');
  });

  test('4. Duplicate booking: Cannot hold two active tokens for same phone + doctor + day', async () => {
    const testPhone = '+91-94444-00001';

    const token1 = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Duplicate Test Patient',
      patientPhone: testPhone,
      priority: 'STANDARD'
    });
    assert.ok(token1._id);

    // Duplicate attempt
    let duplicateRejected = false;
    try {
      await createToken({
        clinicId,
        doctorId: testDoctor._id,
        patientName: 'Duplicate Test Patient (Duplicate)',
        patientPhone: testPhone,
        priority: 'STANDARD'
      });
    } catch (err) {
      duplicateRejected = true;
      assert.strictEqual(err.statusCode, 409);
      assert.ok(err.message.includes('already holds an active token'));
    }

    assert.strictEqual(duplicateRejected, true, 'Duplicate active booking must be rejected with HTTP 409');
  });

  test('5. State transitions: Valid progression succeeds, invalid transitions are rejected', async () => {
    const token = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'State Machine Patient',
      patientPhone: '+91-95555-00001',
      priority: 'STANDARD'
    });

    // Invalid direct transition from WAITING to COMPLETED
    let invalidTransitionRejected = false;
    try {
      await updateTokenStatus(token._id, TOKEN_STATUS.COMPLETED);
    } catch (err) {
      invalidTransitionRejected = true;
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Invalid transition'));
    }
    assert.strictEqual(invalidTransitionRejected, true);

    // Valid step 1: WAITING -> CALLED
    const calledToken = await updateTokenStatus(token._id, TOKEN_STATUS.CALLED);
    assert.strictEqual(calledToken.status, TOKEN_STATUS.CALLED);
    assert.ok(calledToken.calledAt);

    // Valid step 2: CALLED -> IN_CONSULTATION
    const consultToken = await updateTokenStatus(token._id, TOKEN_STATUS.IN_CONSULTATION);
    assert.strictEqual(consultToken.status, TOKEN_STATUS.IN_CONSULTATION);
    assert.ok(consultToken.startedConsultationAt);

    // Valid step 3: IN_CONSULTATION -> COMPLETED
    const completedToken = await updateTokenStatus(token._id, TOKEN_STATUS.COMPLETED);
    assert.strictEqual(completedToken.status, TOKEN_STATUS.COMPLETED);
    assert.ok(completedToken.completedAt);
    assert.strictEqual(completedToken.activeBookingKey, null, 'Completed token must release active lock');
  });

  test('6. No-show / Skip / Requeue: SKIPPED releases active lock, requeue restores WAITING state', async () => {
    const testPhone = '+91-96666-00001';
    const token = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'No-Show Patient',
      patientPhone: testPhone,
      priority: 'ELDERLY'
    });

    // 1. Move to CALLED
    await updateTokenStatus(token._id, TOKEN_STATUS.CALLED);

    // 2. Patient fails to arrive: Doctor clicks Skip (CALLED -> SKIPPED)
    const skippedToken = await updateTokenStatus(token._id, TOKEN_STATUS.SKIPPED);
    assert.strictEqual(skippedToken.status, TOKEN_STATUS.SKIPPED);
    assert.ok(skippedToken.skippedAt);
    assert.strictEqual(skippedToken.activeBookingKey, null, 'Skipped token must release active lock');

    // 3. Patient returns: Receptionist recalls/requeues (SKIPPED -> WAITING)
    const requeuedToken = await updateTokenStatus(token._id, TOKEN_STATUS.WAITING);
    assert.strictEqual(requeuedToken.status, TOKEN_STATUS.WAITING);
    assert.ok(requeuedToken.recalledAt);
    assert.ok(requeuedToken.activeBookingKey, 'Requeued token must re-acquire active lock');
  });

  test('7. Estimator edge cases: 0 ahead is 0 min; fallback when < 3 samples; rolling avg when >= 3 samples', async () => {
    // Edge Case A: 0 patients ahead -> 0 minutes wait
    const tokenFront = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Front Patient',
      patientPhone: '+91-97777-00001',
      priority: 'STANDARD'
    });

    const posFront = await calculateTokenQueuePosition(testDoctor._id, todayStr, tokenFront);
    assert.strictEqual(posFront.patientsAhead, 0, 'First patient in empty queue has 0 ahead');
    assert.strictEqual(posFront.estimatedWaitMinutes, 0, 'First patient in empty queue has 0 min wait');

    // Edge Case B: Fallback when < 3 completed consultations exist (doctor default = 10 min)
    const tokenSecond = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Second Patient',
      patientPhone: '+91-97777-00002',
      priority: 'STANDARD'
    });

    const posSecond = await calculateTokenQueuePosition(testDoctor._id, todayStr, tokenSecond);
    assert.strictEqual(posSecond.patientsAhead, 1, 'Second patient has 1 ahead');
    assert.strictEqual(posSecond.estimatedWaitMinutes, 10, 'Expected fallback to doctor default: 1 * 10 min');

    // Edge Case C: Rolling average of recent completed consultations
    // Create 3 completed consultations with exact duration: 15 minutes each
    await Token.deleteMany({ doctorId: testDoctor._id });
    for (let i = 1; i <= 3; i++) {
      const pastToken = await createToken({
        clinicId,
        doctorId: testDoctor._id,
        patientName: `Completed Sample ${i}`,
        patientPhone: `+91-97777-1000${i}`,
        priority: 'STANDARD'
      });
      await updateTokenStatus(pastToken._id, TOKEN_STATUS.CALLED);
      await updateTokenStatus(pastToken._id, TOKEN_STATUS.IN_CONSULTATION);
      const done = await updateTokenStatus(pastToken._id, TOKEN_STATUS.COMPLETED);
      // Explicitly set 15 minutes consultation duration
      await Token.findByIdAndUpdate(done._id, { consultationDurationMinutes: 15 });
    }

    const effectiveMinutes = await getEffectiveConsultationMinutes(testDoctor._id);
    assert.strictEqual(effectiveMinutes, 15, 'Effective consultation time should be rolling average of 15 min');

    // Create 2 waiting patients and check second patient's estimate
    const p1 = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Queue P1',
      patientPhone: '+91-97777-20001',
      priority: 'STANDARD'
    });
    const p2 = await createToken({
      clinicId,
      doctorId: testDoctor._id,
      patientName: 'Queue P2',
      patientPhone: '+91-97777-20002',
      priority: 'STANDARD'
    });

    const posP2 = await calculateTokenQueuePosition(testDoctor._id, todayStr, p2);
    assert.strictEqual(posP2.patientsAhead, 1);
    assert.strictEqual(posP2.estimatedWaitMinutes, 15, '1 patient ahead * 15 min rolling avg = 15 min');
  });
});
