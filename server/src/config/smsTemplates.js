/**
 * Configurable, clinic-approved SMS notification templates.
 *
 * Compliance Notice (TRAI DLT India Mandate):
 * In live Indian telecommunication networks, commercial SMS must be pre-registered
 * under the Telecom Commercial Communications Customer Preference Regulations (TCCCPR, 2018):
 * 1. Principal Entity (PE) Registration on telecom operator DLT portals.
 * 2. Header (Sender ID): 6-character registered alphabetic header (e.g., GLBHLT).
 * 3. Content Template Registration: Fixed template syntax with variable placeholders {#var#}.
 * 4. In development and student evaluations, SMS_ENABLED=false runs in SIMULATED mode
 *    with masked PII (+91-******4321), zero third-party billing, and zero DLT friction.
 */

export const SMS_CONFIG = Object.freeze({
  SENDER_ID: 'GLBHLT', // Approved 6-character TRAI DLT header
  NEAR_TURN_THRESHOLD: 3, // Alert patient when <= 3 tokens remain ahead (DEC-04)
  RETRY_LIMIT: 2
});

export const NOTIFICATION_TYPES = Object.freeze({
  BOOKING_CONFIRMATION: 'BOOKING_CONFIRMATION',
  NEAR_TURN_ALERT: 'NEAR_TURN_ALERT',
  NOW_CALLING: 'NOW_CALLING',
  CANCELLATION: 'CANCELLATION',
  STATUS_HELP: 'STATUS_HELP',
  RECALLED: 'RECALLED'
});

export const DEFAULT_SMS_TEMPLATES = Object.freeze({
  [NOTIFICATION_TYPES.BOOKING_CONFIRMATION]: {
    dltTemplateId: 'DLT-GLB-001-BOOK',
    title: 'Booking Confirmation',
    template:
      '[{clinicName}] Token {displayCode} ({tokenNumber}) confirmed for {doctorName} ({department}). Est. wait: {estimatedWait} mins. Track live: {trackingUrl}'
  },
  [NOTIFICATION_TYPES.NEAR_TURN_ALERT]: {
    dltTemplateId: 'DLT-GLB-002-NEARTURN',
    title: 'Near-Turn Queue Alert',
    template:
      '[{clinicName}] Queue Alert: Only {patientsAhead} patient(s) ahead of Token {displayCode}. Please proceed towards {roomNumber} for {doctorName}.'
  },
  [NOTIFICATION_TYPES.NOW_CALLING]: {
    dltTemplateId: 'DLT-GLB-003-CALLING',
    title: 'Now Calling Patient',
    template:
      '[{clinicName}] Attention: Token {displayCode} ({tokenNumber}) is now CALLED. Please proceed to {roomNumber} for {doctorName}.'
  },
  [NOTIFICATION_TYPES.CANCELLATION]: {
    dltTemplateId: 'DLT-GLB-004-CANCEL',
    title: 'Token Cancellation',
    template:
      '[{clinicName}] Token {displayCode} has been cancelled. If you require assistance, please visit the clinic reception.'
  },
  [NOTIFICATION_TYPES.STATUS_HELP]: {
    dltTemplateId: 'DLT-GLB-005-STATUS',
    title: 'Status & Help Query',
    template:
      '[{clinicName}] Token {displayCode}: Status is {status} with {patientsAhead} patient(s) ahead. Est. wait: {estimatedWait} mins. Track: {trackingUrl}'
  },
  [NOTIFICATION_TYPES.RECALLED]: {
    dltTemplateId: 'DLT-GLB-006-RECALL',
    title: 'Token Recalled',
    template:
      '[{clinicName}] Token {displayCode} has been reinstated in line. Please remain in the waiting area for {doctorName}.'
  }
});

/**
 * Replaces `{variable}` tokens with runtime clinic values.
 */
export const renderSMSTemplate = (type, params = {}) => {
  const tpl = DEFAULT_SMS_TEMPLATES[type];
  if (!tpl) {
    throw new Error(`Unrecognized SMS template type: ${type}`);
  }

  let text = tpl.template;
  for (const [key, val] of Object.entries(params)) {
    text = text.replaceAll(`{${key}}`, val !== undefined && val !== null ? String(val) : '');
  }

  return {
    dltTemplateId: tpl.dltTemplateId,
    type,
    text
  };
};
