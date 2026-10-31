import { Token } from '../../models/Token.js';
import { Doctor } from '../../models/Doctor.js';
import { Clinic } from '../../models/Clinic.js';
import {
  prefilterCheck,
  CLINIC_EMERGENCY_INSTRUCTION,
  CLINIC_MEDICAL_ADVICE_DISCLAIMER
} from './prefilter.js';

export const FAQ_FEATURE_STAGE = 'OPTIONAL_FUTURE_PHASE';

export const EMERGENCY_PRIORITY_DISCLAIMER =
  '[GL Bajaj Clinic Policy] Emergency prioritisation cannot be granted via automated chat or SMS. ' +
  'Clinical staff conduct all triage in person. If you or the patient are experiencing acute symptoms, ' +
  'please proceed directly to our 24/7 Triage Room 101 or dial emergency services (112 or 108).';

// Approved static clinic knowledge base
const APPROVED_CLINIC_KB = {
  name: 'GL Bajaj Clinic & Queue Center',
  address: 'Plot No. 2, Knowledge Park III, Greater Noida, UP 201306',
  hours: 'Monday to Friday: 08:30 to 17:30 | Saturday: 09:00 to 14:00 | Sunday: Closed',
  triage: 'Triage Desk Room 101 (Immediate assistance for urgent cases)',
  phone: '+91-120-2323818',
  bookingPolicy: 'Tokens may be booked online up to 7 days in advance or in person at the walk-in reception counter.'
};

/**
 * Patient FAQ Handler (Optional / Future Phase)
 *
 * CRITICAL SAFETY INVARIANTS:
 * 1. Grounded ONLY in the approved clinic knowledge base and the caller's own read-only token.
 * 2. Symptoms, diagnosis, medicines, emergency prioritisation and medical advice MUST hand off
 *    to fixed clinic-approved wording or staff.
 * 3. Never returns or exposes other patients' records or raw documents.
 */
export const answerPatientFaq = async ({ query = '', tokenTrackingUuid = null }) => {
  const cleanQuery = String(query || '').trim();

  // 1. Safety Filter: Check for Emergency Keywords
  const prefilter = prefilterCheck(cleanQuery);
  if (prefilter.isEmergency) {
    return {
      featureStage: FAQ_FEATURE_STAGE,
      source: 'SAFETY_HANDOFF',
      reply: CLINIC_EMERGENCY_INSTRUCTION,
      callerTokenStatus: null
    };
  }

  // 2. Safety Filter: Check for Medical Advice / Drug Prescription Queries
  if (prefilter.isMedicalAdvice) {
    return {
      featureStage: FAQ_FEATURE_STAGE,
      source: 'SAFETY_HANDOFF',
      reply: CLINIC_MEDICAL_ADVICE_DISCLAIMER,
      callerTokenStatus: null
    };
  }

  // 3. Safety Filter: Check for Emergency Prioritisation Requests
  const priorityPatterns = /\b(emergency\s+priority|move\s+me\s+up|bypass\s+queue|make\s+me\s+urgent|priority\s+token|skip\s+the\s+line)\b/i;
  if (priorityPatterns.test(cleanQuery)) {
    return {
      featureStage: FAQ_FEATURE_STAGE,
      source: 'SAFETY_HANDOFF',
      reply: EMERGENCY_PRIORITY_DISCLAIMER,
      callerTokenStatus: null
    };
  }

  // 4. Grounding: Caller's Own Read-Only Token Status (if tracking UUID provided)
  let callerTokenStatus = null;
  if (tokenTrackingUuid) {
    const callerToken = await Token.findOne({ trackingUuid: tokenTrackingUuid })
      .populate('doctorId', 'name department roomNumber')
      .select('tokenNumber displayCode status estimatedWaitMinutes doctorId');

    if (callerToken) {
      callerTokenStatus = {
        tokenNumber: callerToken.tokenNumber,
        displayCode: callerToken.displayCode,
        status: callerToken.status,
        estimatedWaitMinutes: callerToken.estimatedWaitMinutes,
        doctorName: callerToken.doctorId?.name || 'Assigned Doctor',
        department: callerToken.doctorId?.department || 'Outpatient',
        roomNumber: callerToken.doctorId?.roomNumber || 'Room 101'
      };
    }
  }

  // 5. Grounding: Caller Token Status Inquiry
  const tokenQueryPatterns = /\b(my\s+token|my\s+status|where\s+am\s+i|position|how\s+long|wait\s+time|mera\s+number)\b/i;
  if (callerTokenStatus && tokenQueryPatterns.test(cleanQuery)) {
    return {
      featureStage: FAQ_FEATURE_STAGE,
      source: 'CALLER_TOKEN_STATUS',
      reply:
        `Your Token ${callerTokenStatus.tokenNumber} is currently ${callerTokenStatus.status}. ` +
        `Assigned doctor: ${callerTokenStatus.doctorName} (${callerTokenStatus.roomNumber}). ` +
        `Estimated wait time: ${callerTokenStatus.estimatedWaitMinutes} mins.`,
      callerTokenStatus
    };
  }

  // 6. Grounding: Clinic Operating Hours & Address
  if (/hour|timing|open|close|time|kab\s+khulta/i.test(cleanQuery)) {
    return {
      featureStage: FAQ_FEATURE_STAGE,
      source: 'CLINIC_KB',
      reply: `[GL Bajaj Clinic] Operating Hours: ${APPROVED_CLINIC_KB.hours}.`,
      callerTokenStatus
    };
  }

  if (/address|location|where|kahan|directions/i.test(cleanQuery)) {
    return {
      featureStage: FAQ_FEATURE_STAGE,
      source: 'CLINIC_KB',
      reply: `[GL Bajaj Clinic] Address: ${APPROVED_CLINIC_KB.address}. Near Triage ${APPROVED_CLINIC_KB.triage}.`,
      callerTokenStatus
    };
  }

  if (/doctor|specialist|physician/i.test(cleanQuery)) {
    const doctors = await Doctor.find({ isAvailable: true }).select('name department roomNumber');
    const docList = doctors.map((d) => `${d.name} (${d.department}, ${d.roomNumber})`).join('; ');
    return {
      featureStage: FAQ_FEATURE_STAGE,
      source: 'CLINIC_KB',
      reply: `[GL Bajaj Clinic] Active Doctors Today: ${docList || 'General Medicine (Room 101)'}.`,
      callerTokenStatus
    };
  }

  // General grounded reply from Knowledge Base
  return {
    featureStage: FAQ_FEATURE_STAGE,
    source: 'CLINIC_KB',
    reply:
      `[GL Bajaj Clinic FAQ] We provide outpatient queue management. ` +
      `Hours: ${APPROVED_CLINIC_KB.hours}. Location: ${APPROVED_CLINIC_KB.address}. ` +
      `For emergency triage, visit ${APPROVED_CLINIC_KB.triage}. ` +
      `To book a token, use our online booking portal or reply BOOK <Doctor Name>.`,
    callerTokenStatus
  };
};
