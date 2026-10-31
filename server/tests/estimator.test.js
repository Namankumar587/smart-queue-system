import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Clinic } from '../src/models/Clinic.js';
import { Doctor } from '../src/models/Doctor.js';
import { Token } from '../src/models/Token.js';
import { Counter } from '../src/models/Counter.js';
import { AuditLog } from '../src/models/AuditLog.js';
import {
  createToken,
  updateTokenStatus,
  getEffectiveConsultationMinutes,
  calculateTokenQueuePosition,
  formatWaitEstimate,
  autoAssignDoctorByDepartment,
  reassignTokenDoctor
} from '../src/services/queue.service.js';
import { TOKEN_STATUS, ESTIMATOR_STRATEGIES } from '../src/config/constants.js';

describe('Deterministic Wait Estimator & Load Balancing Suite', () => {
  let clinicId;
  let docFast;
  let docSlow;
  let docUnavailable;
  const todayStr = new Date().toISOString().split('T')[0];

  before(async () => {
    await connectDB();

    // Create or find dedicated test clinic with configured default consultation minutes (12 mins)
    let clinic = await Clinic.findOne({ code: 'GLB-ESTIMATOR-CLINIC' });
    if (!clinic) {
      clinic = await Clinic.create({
        name: 'GL Bajaj Estimator Testing Center',
        code: 'GLB-ESTIMATOR-CLINIC',
        defaultConsultationMinutes: 12
      });
    } else {
      clinic.defaultConsultationMinutes = 12;
      await clinic.save();
    }
    clinicId = clinic._id;

    // Doctor 1: Fast Doctor (8 min default)
    let d1 = await Doctor.findOne({ doctorCode: 'DOC-EST-FAST' });
    if (!d1) {
      d1 = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-EST-FAST',
        name: 'Dr. Fast Consultation',
        department: 'Cardiology',
        roomNumber: 'Room C-101',
        avgConsultMinutes: 8,
        isAvailable: true
      });
    }
    docFast = d1;

    // Doctor 2: Slow/Detailed Doctor (15 min default)
    let d2 = await Doctor.findOne({ doctorCode: 'DOC-EST-SLOW' });
    if (!d2) {
      d2 = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-EST-SLOW',
        name: 'Dr. Thorough Examination',
        department: 'Cardiology',
        roomNumber: 'Room C-102',
        avgConsultMinutes: 15,
        isAvailable: true
      });
    }
    docSlow = d2;

    // Doctor 3: Unavailable Doctor
    let d3 = await Doctor.findOne({ doctorCode: 'DOC-EST-UNAVAIL' });
    if (!d3) {
      d3 = await Doctor.create({
        clinicId,
        doctorCode: 'DOC-EST-UNAVAIL',
        name: 'Dr. On Leave',
        department: 'Cardiology',
        roomNumber: 'Room C-103',
        avgConsultMinutes: 10,
        isAvailable: false
      });
    }
    docUnavailable = d3;
  });

  after(async () => {
    await Token.deleteMany({ clinicId });
    await Counter.deleteMany({ key: new RegExp(`^doc_(${docFast._id}|${docSlow._id}|${docUnavailable._id})`) });
    await disconnectDB();
  });

  beforeEach(async () => {
    // Reset tokens and counters between tests
    await Token.deleteMany({ clinicId });
    await Counter.deleteMany({ key: new RegExp(`^doc_(${docFast._id}|${docSlow._id}|${docUnavailable._id})`) });
  });

  test('1. Zero patients ahead: estimate is 0 min, display is non-promissory Next in line', async () => {
    const token = await createToken({
      clinicId,
      doctorId: docFast._id,
      patientName: 'Head of Queue Patient',
      patientPhone: '+91-98888-00001',
      priority: 'STANDARD'
    });

    const waitInfo = await calculateTokenQueuePosition(docFast._id, todayStr, token);
    assert.strictEqual(waitInfo.patientsAhead, 0, 'First patient in empty queue has 0 patients ahead');
    assert.strictEqual(waitInfo.estimatedWaitMinutes, 0, 'Wait time must be 0 minutes');
    assert.strictEqual(waitInfo.display, 'Next in line (< 5 mins)');
    assert.ok(waitInfo.disclaimer.includes('dynamic based on consultation pace'));
  });

  test('2. Missing history fallback: < 3 completed visits uses doctor or clinic default duration', async () => {
    // 0 completed visits -> fallback to docFast.avgConsultMinutes (8 mins)
    const effective0 = await getEffectiveConsultationMinutes(docFast._id);
    assert.strictEqual(effective0, 8, 'Expected fallback to doctor avgConsultMinutes (8 min)');

    // 1 completed visit -> still < 3 samples -> still fallback to 8 min
    const t1 = await createToken({
      clinicId,
      doctorId: docFast._id,
      patientName: 'Sample Patient 1',
      patientPhone: '+91-98888-00002',
      priority: 'STANDARD'
    });
    await updateTokenStatus(t1._id, TOKEN_STATUS.CALLED);
    await updateTokenStatus(t1._id, TOKEN_STATUS.IN_CONSULTATION);
    const done1 = await updateTokenStatus(t1._id, TOKEN_STATUS.COMPLETED);
    await Token.findByIdAndUpdate(done1._id, { consultationDurationMinutes: 25 });

    const effective1 = await getEffectiveConsultationMinutes(docFast._id);
    assert.strictEqual(effective1, 8, 'Still fallback because only 1 completed sample exists');

    // 2 completed visits -> still < 3 samples -> still fallback to 8 min
    const t2 = await createToken({
      clinicId,
      doctorId: docFast._id,
      patientName: 'Sample Patient 2',
      patientPhone: '+91-98888-00003',
      priority: 'STANDARD'
    });
    await updateTokenStatus(t2._id, TOKEN_STATUS.CALLED);
    await updateTokenStatus(t2._id, TOKEN_STATUS.IN_CONSULTATION);
    const done2 = await updateTokenStatus(t2._id, TOKEN_STATUS.COMPLETED);
    await Token.findByIdAndUpdate(done2._id, { consultationDurationMinutes: 25 });

    const effective2 = await getEffectiveConsultationMinutes(docFast._id);
    assert.strictEqual(effective2, 8, 'Still fallback because only 2 completed samples exist');
  });

  test('3. Variable consult duration: rolling average activates at >= 3 completed visits', async () => {
    // Insert 4 completed visits with durations: 10, 14, 18, 18 -> sum = 60, avg = 15
    const durations = [10, 14, 18, 18];
    for (let i = 0; i < durations.length; i++) {
      const t = await createToken({
        clinicId,
        doctorId: docFast._id,
        patientName: `History Patient ${i}`,
        patientPhone: `+91-98888-1000${i}`,
        priority: 'STANDARD'
      });
      await updateTokenStatus(t._id, TOKEN_STATUS.CALLED);
      await updateTokenStatus(t._id, TOKEN_STATUS.IN_CONSULTATION);
      const done = await updateTokenStatus(t._id, TOKEN_STATUS.COMPLETED);
      await Token.findByIdAndUpdate(done._id, {
        consultationDurationMinutes: durations[i],
        completedAt: new Date(Date.now() + i * 1000)
      });
    }

    const effectiveAvg = await getEffectiveConsultationMinutes(docFast._id);
    assert.strictEqual(effectiveAvg, 15, 'Rolling average should be 15 min (60 / 4)');

    // Book 2 waiting patients and check the wait calculation for second patient
    const waiting1 = await createToken({
      clinicId,
      doctorId: docFast._id,
      patientName: 'Waiting 1',
      patientPhone: '+91-98888-20001',
      priority: 'STANDARD'
    });
    const waiting2 = await createToken({
      clinicId,
      doctorId: docFast._id,
      patientName: 'Waiting 2',
      patientPhone: '+91-98888-20002',
      priority: 'STANDARD'
    });

    const wait2 = await calculateTokenQueuePosition(docFast._id, todayStr, waiting2);
    assert.strictEqual(wait2.patientsAhead, 1);
    assert.strictEqual(wait2.estimatedWaitMinutes, 15, '1 patient ahead * 15 min rolling avg = 15 min');
    assert.strictEqual(wait2.display, '~15 mins');
  });

  test('4. Configurable strategy: EMA vs Rolling Mean calculation', async () => {
    // Completed visits: 10, 20, 30
    const durations = [10, 20, 30];
    for (let i = 0; i < durations.length; i++) {
      const t = await createToken({
        clinicId,
        doctorId: docFast._id,
        patientName: `EMA Patient ${i}`,
        patientPhone: `+91-98888-3000${i}`,
        priority: 'STANDARD'
      });
      await updateTokenStatus(t._id, TOKEN_STATUS.CALLED);
      await updateTokenStatus(t._id, TOKEN_STATUS.IN_CONSULTATION);
      const done = await updateTokenStatus(t._id, TOKEN_STATUS.COMPLETED);
      await Token.findByIdAndUpdate(done._id, {
        consultationDurationMinutes: durations[i],
        completedAt: new Date(Date.now() + i * 1000)
      });
    }

    // 1. Rolling Mean: (10 + 20 + 30) / 3 = 20
    const rollingMean = await getEffectiveConsultationMinutes(docFast._id, {
      strategy: ESTIMATOR_STRATEGIES.ROLLING_MEAN
    });
    assert.strictEqual(rollingMean, 20, 'Rolling mean should be exactly 20');

    // 2. EMA with alpha = 0.5:
    // Chronological: 10 -> EMA1 = 10
    // Next: 20 -> EMA2 = 0.5 * 20 + 0.5 * 10 = 15
    // Next: 30 -> EMA3 = 0.5 * 30 + 0.5 * 15 = 22.5 -> round = 23
    const emaValue = await getEffectiveConsultationMinutes(docFast._id, {
      strategy: ESTIMATOR_STRATEGIES.EMA,
      emaAlpha: 0.5
    });
    assert.strictEqual(emaValue, 23, 'EMA with alpha=0.5 should be 23');
  });

  test('5. Physical boundary clamping: values clamped between 2 and 60 minutes', async () => {
    // 3 samples with ultra-short duration (1 minute)
    for (let i = 0; i < 3; i++) {
      const t = await createToken({
        clinicId,
        doctorId: docFast._id,
        patientName: `Clamp Min ${i}`,
        patientPhone: `+91-98888-4000${i}`,
        priority: 'STANDARD'
      });
      await updateTokenStatus(t._id, TOKEN_STATUS.CALLED);
      await updateTokenStatus(t._id, TOKEN_STATUS.IN_CONSULTATION);
      const done = await updateTokenStatus(t._id, TOKEN_STATUS.COMPLETED);
      await Token.findByIdAndUpdate(done._id, {
        consultationDurationMinutes: 1,
        completedAt: new Date(Date.now() + i * 1000)
      });
    }

    const minClamped = await getEffectiveConsultationMinutes(docFast._id);
    assert.strictEqual(minClamped, 2, 'Should clamp minimum duration to 2 minutes');

    // 3 samples with ultra-long duration (120 minutes)
    await Token.deleteMany({ clinicId });
    for (let i = 0; i < 3; i++) {
      const t = await createToken({
        clinicId,
        doctorId: docFast._id,
        patientName: `Clamp Max ${i}`,
        patientPhone: `+91-98888-5000${i}`,
        priority: 'STANDARD'
      });
      await updateTokenStatus(t._id, TOKEN_STATUS.CALLED);
      await updateTokenStatus(t._id, TOKEN_STATUS.IN_CONSULTATION);
      const done = await updateTokenStatus(t._id, TOKEN_STATUS.COMPLETED);
      await Token.findByIdAndUpdate(done._id, {
        consultationDurationMinutes: 120,
        completedAt: new Date(Date.now() + i * 1000)
      });
    }

    const maxClamped = await getEffectiveConsultationMinutes(docFast._id);
    assert.strictEqual(maxClamped, 60, 'Should clamp maximum duration to 60 minutes');
  });

  test('6. Unavailable doctors: excluded from department auto-assignment load balancing', async () => {
    // docUnavailable has isAvailable: false
    const assignment = await autoAssignDoctorByDepartment({
      clinicId,
      department: 'Cardiology',
      date: todayStr
    });

    assert.notStrictEqual(
      assignment.doctor._id.toString(),
      docUnavailable._id.toString(),
      'Unavailable doctor must never be selected by auto-balancer'
    );

    // If department has only unavailable doctors, throw error
    let errorThrown = false;
    try {
      await autoAssignDoctorByDepartment({
        clinicId,
        department: 'NonExistentDept',
        date: todayStr
      });
    } catch (err) {
      errorThrown = true;
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('No available doctors found'));
    }
    assert.strictEqual(errorThrown, true);
  });

  test('7. Load balancing between different doctor queues: assigns to doctor with lowest estimated queue wait', async () => {
    // Setup:
    // docFast (avg: 8 mins): add 3 waiting patients -> Queue Wait = 3 * 8 = 24 mins
    for (let i = 1; i <= 3; i++) {
      await createToken({
        clinicId,
        doctorId: docFast._id,
        patientName: `Fast Doc Patient ${i}`,
        patientPhone: `+91-98888-6000${i}`,
        priority: 'STANDARD'
      });
    }

    // docSlow (avg: 15 mins): add 1 waiting patient -> Queue Wait = 1 * 15 = 15 mins
    await createToken({
      clinicId,
      doctorId: docSlow._id,
      patientName: 'Slow Doc Patient 1',
      patientPhone: '+91-98888-70001',
      priority: 'STANDARD'
    });

    // Auto-assign new patient to Cardiology:
    // docSlow queue wait (15 mins) < docFast queue wait (24 mins)
    const assignment = await autoAssignDoctorByDepartment({
      clinicId,
      department: 'Cardiology',
      date: todayStr
    });

    assert.strictEqual(
      assignment.doctor._id.toString(),
      docSlow._id.toString(),
      'Auto balancer must choose docSlow because 15 mins < 24 mins'
    );
    assert.ok(assignment.rationale.includes('lowest estimated queue wait'));
    assert.ok(assignment.rationale.includes('15 mins'));

    // Book using department auto-assignment
    const autoToken = await createToken({
      clinicId,
      department: 'Cardiology',
      patientName: 'Auto Balanced Patient',
      patientPhone: '+91-98888-80001',
      priority: 'STANDARD'
    });

    assert.strictEqual(autoToken.doctorId.toString(), docSlow._id.toString());
    assert.ok(autoToken.assignmentRationale.includes('AUTO_LOAD_BALANCED'));
  });

  test('8. Strict no-silent-reassignment & manual reassignment with audit trail', async () => {
    // Book patient with docFast
    const token = await createToken({
      clinicId,
      doctorId: docFast._id,
      patientName: 'Immutable Patient',
      patientPhone: '+91-98888-90001',
      priority: 'STANDARD'
    });
    assert.strictEqual(token.doctorId.toString(), docFast._id.toString());
    const originalTokenId = token._id.toString();

    // Verify token is NOT changed when other queue operations run
    const otherToken = await createToken({
      clinicId,
      doctorId: docSlow._id,
      patientName: 'Other Doctor Patient',
      patientPhone: '+91-98888-90002',
      priority: 'STANDARD'
    });

    const refreshedToken = await Token.findById(originalTokenId);
    assert.strictEqual(
      refreshedToken.doctorId.toString(),
      docFast._id.toString(),
      'Patient must remain with original doctor without silent reassignment'
    );

    // Explicit manual reassignment by staff
    const staffMock = { _id: '507f1f77bcf86cd799439011', role: 'RECEPTIONIST' };
    const reassignedToken = await reassignTokenDoctor({
      tokenId: token._id,
      targetDoctorId: docSlow._id,
      reassignedByStaff: staffMock,
      reason: 'Shift handover request'
    });

    assert.strictEqual(reassignedToken.doctorId.toString(), docSlow._id.toString());
    assert.ok(reassignedToken.assignmentRationale.includes('MANUAL_REASSIGNMENT'));
    assert.ok(reassignedToken.assignmentRationale.includes('Shift handover request'));
  });

  test('9. Wait estimator exact requirement: 4 ahead x 8 minutes = 32 minutes with no-history fallback', async () => {
    // Ensure docFast has 0 completed consultations -> fallback to docFast.avgConsultMinutes (8 min)
    await Token.deleteMany({ doctorId: docFast._id });

    // Verify fallback duration is 8 minutes (since completed visits count < 3)
    const fallbackDuration = await getEffectiveConsultationMinutes(docFast._id);
    assert.strictEqual(fallbackDuration, 8, 'Zero completed history must fallback to doctor avgConsultMinutes (8 mins)');

    // Book 4 patients ahead in the queue
    for (let i = 1; i <= 4; i++) {
      await createToken({
        clinicId,
        doctorId: docFast._id,
        patientName: `Ahead Patient ${i}`,
        patientPhone: `+91-98765-8888${i}`,
        priority: 'STANDARD'
      });
    }

    // Book 5th patient who has exactly 4 patients ahead
    const targetToken = await createToken({
      clinicId,
      doctorId: docFast._id,
      patientName: 'Target 5th Patient',
      patientPhone: '+91-98765-88885',
      priority: 'STANDARD'
    });

    const waitInfo = await calculateTokenQueuePosition(docFast._id, todayStr, targetToken);

    // Exact assertions:
    assert.strictEqual(waitInfo.patientsAhead, 4, 'Must have exactly 4 patients ahead in queue');
    assert.strictEqual(waitInfo.estimatedWaitMinutes, 32, '4 ahead * 8 minutes fallback = exactly 32 minutes');
    assert.strictEqual(waitInfo.display, '~32 mins', 'Display string must be ~32 mins');
    assert.ok(waitInfo.displayRange.includes('mins'), 'Must provide non-promissory range');
    assert.ok(waitInfo.disclaimer.includes('estimate, not a guarantee'), 'Must contain non-promissory disclaimer');
  });
});

