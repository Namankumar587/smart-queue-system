import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { Clinic } from '../../src/models/Clinic.js';
import { Doctor } from '../../src/models/Doctor.js';
import { Patient } from '../../src/models/Patient.js';
import { Token } from '../../src/models/Token.js';
import {
  getSummary,
  getNoShowCounts,
  getAverageServiceTime,
  getStaffCopilotBriefing
} from '../../src/services/llm/copilot.service.js';
import { answerPatientFaq } from '../../src/services/llm/patientFaq.service.js';
import {
  CLINIC_EMERGENCY_INSTRUCTION,
  CLINIC_MEDICAL_ADVICE_DISCLAIMER
} from '../../src/services/llm/prefilter.js';

describe('PROMPT 27 - Grounded Patient FAQ & Staff Copilot (Optional / Future Phase)', () => {
  let clinicA;
  let clinicB;
  let doctorA;
  let doctorB;
  let patientA;
  let testTokenA;
  const today = new Date().toISOString().split('T')[0];

  before(async () => {
    await connectDB();

    // 1. Create Test Clinics
    await Clinic.deleteMany({ code: { $in: ['GLB-COPILOT-A', 'GLB-COPILOT-B'] } });
    clinicA = await Clinic.create({
      name: 'GL Bajaj Copilot Test Clinic A',
      code: 'GLB-COPILOT-A',
      operatingHours: { open: '08:30', close: '17:30' },
      timezone: 'Asia/Kolkata',
      isActive: true
    });

    clinicB = await Clinic.create({
      name: 'GL Bajaj Copilot Test Clinic B',
      code: 'GLB-COPILOT-B',
      operatingHours: { open: '09:00', close: '18:00' },
      timezone: 'Asia/Kolkata',
      isActive: true
    });

    // 2. Create Doctors
    await Doctor.deleteMany({ doctorCode: { $in: ['DOC-COPILOT-A', 'DOC-COPILOT-B'] } });
    doctorA = await Doctor.create({
      clinicId: clinicA._id,
      doctorCode: 'DOC-COPILOT-A',
      name: 'Dr. Neha Agarwal',
      department: 'Pediatrics',
      roomNumber: 'Room 202',
      avgConsultMinutes: 12,
      isAvailable: true,
      schedule: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        startTime: '09:00',
        endTime: '17:00'
      }
    });

    doctorB = await Doctor.create({
      clinicId: clinicB._id,
      doctorCode: 'DOC-COPILOT-B',
      name: 'Dr. Vivek Mehra',
      department: 'Cardiology',
      roomNumber: 'Room 303',
      avgConsultMinutes: 15,
      isAvailable: true,
      schedule: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        startTime: '09:00',
        endTime: '17:00'
      }
    });

    // 3. Create Patient
    patientA = await Patient.create({
      name: 'Synthetic Patient One',
      phone: '+919999911111',
      normalizedPhone: '+919999911111'
    });

    // 4. Seed Seed Tokens for Clinic A:
    // - 2 WAITING
    // - 1 CALLED
    // - 3 COMPLETED (with durations: 10, 15, 11 min)
    // - 1 CANCELLED
    // - 1 SKIPPED
    await Token.deleteMany({ clinicId: clinicA._id });
    await Token.deleteMany({ clinicId: clinicB._id });

    testTokenA = await Token.create({
      clinicId: clinicA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      patientName: patientA.name,
      patientPhone: patientA.phone,
      normalizedPhone: patientA.normalizedPhone,
      date: today,
      sequenceNumber: 1,
      tokenNumber: 'DOC-COPILOT-A-001',
      displayCode: 'T-001',
      trackingUuid: '11111111-1111-4111-a111-111111111111',
      status: 'WAITING',
      estimatedWaitMinutes: 12
    });

    await Token.create({
      clinicId: clinicA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      patientName: 'Synthetic Patient Two',
      patientPhone: '+919999911112',
      normalizedPhone: '+919999911112',
      date: today,
      sequenceNumber: 2,
      tokenNumber: 'DOC-COPILOT-A-002',
      displayCode: 'T-002',
      trackingUuid: '22222222-2222-4222-a222-222222222222',
      status: 'WAITING',
      estimatedWaitMinutes: 24
    });

    await Token.create({
      clinicId: clinicA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      patientName: 'Synthetic Patient Three',
      patientPhone: '+919999911113',
      normalizedPhone: '+919999911113',
      date: today,
      sequenceNumber: 3,
      tokenNumber: 'DOC-COPILOT-A-003',
      displayCode: 'T-003',
      trackingUuid: '33333333-3333-4333-a333-333333333333',
      status: 'CALLED'
    });

    await Token.create({
      clinicId: clinicA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      patientName: 'Synthetic Patient Four',
      patientPhone: '+919999911114',
      normalizedPhone: '+919999911114',
      date: today,
      sequenceNumber: 4,
      tokenNumber: 'DOC-COPILOT-A-004',
      displayCode: 'T-004',
      trackingUuid: '44444444-4444-4444-a444-444444444444',
      status: 'COMPLETED',
      consultationDurationMinutes: 10
    });

    await Token.create({
      clinicId: clinicA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      patientName: 'Synthetic Patient Five',
      patientPhone: '+919999911115',
      normalizedPhone: '+919999911115',
      date: today,
      sequenceNumber: 5,
      tokenNumber: 'DOC-COPILOT-A-005',
      displayCode: 'T-005',
      trackingUuid: '55555555-5555-4555-a555-555555555555',
      status: 'COMPLETED',
      consultationDurationMinutes: 15
    });

    await Token.create({
      clinicId: clinicA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      patientName: 'Synthetic Patient Six',
      patientPhone: '+919999911116',
      normalizedPhone: '+919999911116',
      date: today,
      sequenceNumber: 6,
      tokenNumber: 'DOC-COPILOT-A-006',
      displayCode: 'T-006',
      trackingUuid: '66666666-6666-4666-a666-666666666666',
      status: 'COMPLETED',
      consultationDurationMinutes: 11
    });

    await Token.create({
      clinicId: clinicA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      patientName: 'Synthetic Patient Seven',
      patientPhone: '+919999911117',
      normalizedPhone: '+919999911117',
      date: today,
      sequenceNumber: 7,
      tokenNumber: 'DOC-COPILOT-A-007',
      displayCode: 'T-007',
      trackingUuid: '77777777-7777-4777-a777-777777777777',
      status: 'CANCELLED'
    });

    await Token.create({
      clinicId: clinicA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      patientName: 'Synthetic Patient Eight',
      patientPhone: '+919999911118',
      normalizedPhone: '+919999911118',
      date: today,
      sequenceNumber: 8,
      tokenNumber: 'DOC-COPILOT-A-008',
      displayCode: 'T-008',
      trackingUuid: '88888888-8888-4888-a888-888888888888',
      status: 'SKIPPED'
    });

    // Seed 1 token for Clinic B to test scoping
    await Token.create({
      clinicId: clinicB._id,
      doctorId: doctorB._id,
      patientId: patientA._id,
      patientName: 'Clinic B Patient',
      patientPhone: '+919999922222',
      normalizedPhone: '+919999922222',
      date: today,
      sequenceNumber: 1,
      tokenNumber: 'DOC-COPILOT-B-001',
      displayCode: 'T-001',
      trackingUuid: '99999999-9999-4999-a999-999999999999',
      status: 'WAITING'
    });
  });

  after(async () => {
    await Token.deleteMany({ clinicId: { $in: [clinicA._id, clinicB._id] } });
    await Doctor.deleteMany({ _id: { $in: [doctorA._id, doctorB._id] } });
    await Clinic.deleteMany({ _id: { $in: [clinicA._id, clinicB._id] } });
    await Patient.deleteMany({ _id: patientA._id });
    await disconnectDB();
  });

  // =========================================================================
  // 1. PATIENT FAQ TESTS
  // =========================================================================
  it('1. Patient FAQ: Grounded strictly in approved clinic knowledge base (hours, address, doctors)', async () => {
    const hoursFaq = await answerPatientFaq({ query: 'What time does the clinic open and close?' });
    assert.match(hoursFaq.reply, /Operating Hours: Monday to Friday: 08:30 to 17:30/);
    assert.equal(hoursFaq.source, 'CLINIC_KB');
    assert.equal(hoursFaq.featureStage, 'OPTIONAL_FUTURE_PHASE');

    const addressFaq = await answerPatientFaq({ query: 'Where is the clinic located?' });
    assert.match(addressFaq.reply, /Plot No\. 2, Knowledge Park III/);
    assert.equal(addressFaq.source, 'CLINIC_KB');
  });

  it('2. Patient FAQ: Grounded in caller own read-only token status', async () => {
    const statusQuery = await answerPatientFaq({
      query: 'Where am I in line? What is my token wait time?',
      tokenTrackingUuid: testTokenA.trackingUuid
    });

    assert.equal(statusQuery.source, 'CALLER_TOKEN_STATUS');
    assert.match(statusQuery.reply, /DOC-COPILOT-A-001/);
    assert.match(statusQuery.reply, /WAITING/);
    assert.match(statusQuery.reply, /Dr\. Neha Agarwal/);
    assert.match(statusQuery.reply, /12 mins/);
    assert.ok(statusQuery.callerTokenStatus, 'Caller token status object must be attached');
    assert.equal(statusQuery.callerTokenStatus.tokenNumber, 'DOC-COPILOT-A-001');

    // Asserts zero exposure of other patients' phone numbers or names
    assert.equal(statusQuery.callerTokenStatus.patientName, undefined);
    assert.equal(statusQuery.callerTokenStatus.patientPhone, undefined);
  });

  it('3. Patient FAQ Safety Handoffs: Intercepts medical advice, emergencies and emergency prioritisation', async () => {
    // 3A. Emergency
    const emergencyRes = await answerPatientFaq({ query: 'I have severe chest pain and cannot breathe' });
    assert.equal(emergencyRes.reply, CLINIC_EMERGENCY_INSTRUCTION);
    assert.equal(emergencyRes.source, 'SAFETY_HANDOFF');

    // 3B. Medical advice
    const adviceRes = await answerPatientFaq({ query: 'What medicine or dosage should I take for fever?' });
    assert.equal(adviceRes.reply, CLINIC_MEDICAL_ADVICE_DISCLAIMER);
    assert.equal(adviceRes.source, 'SAFETY_HANDOFF');

    // 3C. Emergency Prioritisation Request
    const priorityRes = await answerPatientFaq({ query: 'Please give me emergency priority to bypass queue' });
    assert.match(priorityRes.reply, /Emergency prioritisation cannot be granted via automated chat/);
    assert.match(priorityRes.reply, /Triage Room 101/);
    assert.equal(priorityRes.source, 'SAFETY_HANDOFF');
  });

  // =========================================================================
  // 2. STAFF COPILOT TESTS
  // =========================================================================
  it('4. Staff Copilot: getSummary aggregates token counts accurately and strictly scoped to clinic', async () => {
    const summaryA = await getSummary(clinicA._id, today);

    // 2 WAITING + 1 CALLED + 3 COMPLETED + 1 CANCELLED + 1 SKIPPED = 8 total
    assert.equal(summaryA.total, 8);
    assert.equal(summaryA.waiting, 2);
    assert.equal(summaryA.called, 1);
    assert.equal(summaryA.completed, 3);
    assert.equal(summaryA.cancelled, 1);
    assert.equal(summaryA.skipped, 1);

    // Clinic B must be isolated (1 WAITING)
    const summaryB = await getSummary(clinicB._id, today);
    assert.equal(summaryB.total, 1);
    assert.equal(summaryB.waiting, 1);
    assert.equal(summaryB.completed, 0);
  });

  it('5. Staff Copilot: getNoShowCounts aggregates cancelled and skipped counts', async () => {
    const noShows = await getNoShowCounts(clinicA._id, today);

    assert.equal(noShows.cancelledCount, 1);
    assert.equal(noShows.skippedCount, 1);
    assert.equal(noShows.totalNoShows, 2);
  });

  it('6. Staff Copilot: getAverageServiceTime computes mean consultation duration accurately', async () => {
    const serviceTime = await getAverageServiceTime(clinicA._id, today);

    // Completed consultations durations: 10, 15, 11 => avg = 36 / 3 = 12.0 mins
    assert.equal(serviceTime.avgServiceTimeMinutes, 12.0);
    assert.equal(serviceTime.sampleSize, 3);
  });

  it('7. Staff Copilot Briefing: Displays source numbers side-by-side with generated narrative', async () => {
    const briefing = await getStaffCopilotBriefing(clinicA._id, today);

    assert.equal(briefing.featureStage, 'OPTIONAL_FUTURE_PHASE');
    assert.equal(briefing.dataScope, 'READ_ONLY_AGGREGATES_NO_PII');

    // 1. Verify exact source numbers
    assert.ok(briefing.sourceMetrics, 'sourceMetrics object must be provided beside narrative');
    assert.equal(briefing.sourceMetrics.totalTokens, 8);
    assert.equal(briefing.sourceMetrics.waiting, 2);
    assert.equal(briefing.sourceMetrics.inConsultation, 1);
    assert.equal(briefing.sourceMetrics.completed, 3);
    assert.equal(briefing.sourceMetrics.totalNoShows, 2);
    assert.equal(briefing.sourceMetrics.avgServiceTimeMinutes, 12.0);

    // 2. Verify narrative matches the exact source numbers
    assert.match(briefing.narrative, /8 total tokens/);
    assert.match(briefing.narrative, /2 patient\(s\) are waiting/);
    assert.match(briefing.narrative, /1 are in consultation/);
    assert.match(briefing.narrative, /3 have completed/);
    assert.match(briefing.narrative, /2 no-shows\/cancellations/);
    assert.match(briefing.narrative, /12 minutes per consultation/);

    // 3. Cryptographic assertion: Zero raw patient rows or patient PII exposed
    const briefingStr = JSON.stringify(briefing);
    assert.doesNotMatch(briefingStr, /Synthetic Patient/);
    assert.doesNotMatch(briefingStr, /\+9199999/);
    assert.doesNotMatch(briefingStr, /DOC-COPILOT-A-001/);
  });
});
