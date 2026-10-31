import { resolveActiveDoctor, validateBookingDate } from './tools.js';

export const CONFIDENCE_THRESHOLD = 0.7;

export const DETERMINISTIC_FALLBACK_MENU =
  '[GL Bajaj Clinic] We could not understand your request. Please choose an option:\n' +
  '1. Book Token: Reply BOOK <Doctor Name>\n' +
  '2. Check Status: Reply STATUS <Token Code>\n' +
  '3. Cancel Token: Reply CANCEL <Token Code>\n' +
  '4. Clinic Timings: Reply HELP';

export const CONFIRMATION_PROMPT_TEMPLATE = (doctorName, date) =>
  `[GL Bajaj Clinic] You requested a token for ${doctorName} on ${date}. Reply YES to confirm or NO to cancel. (Valid for 15 minutes)`;

/**
 * Validates parsed intent against post-generation guardrails and clinic rules.
 * @param {Object} parsedData - { intent, doctorId, date, language, confidence }
 * @param {Array} activeDoctors - List of active doctors
 * @param {Object} clinicRules - Clinic operating rules
 * @returns {{ isSafe: boolean, routing: 'EXECUTE'|'MENU', errorReason: string|null, validatedData: Object }}
 */
export const enforceSmsGuardrails = (parsedData, activeDoctors, clinicRules) => {
  // 1. Below-Threshold Confidence Check
  if (!parsedData || parsedData.confidence < CONFIDENCE_THRESHOLD) {
    return {
      isSafe: false,
      routing: 'MENU',
      errorReason: `Confidence (${parsedData?.confidence ?? 0}) below required threshold (${CONFIDENCE_THRESHOLD})`,
      validatedData: null
    };
  }

  // 2. Unsupported Intent Check
  if (!['BOOK', 'STATUS', 'CANCEL', 'HELP'].includes(parsedData.intent)) {
    return {
      isSafe: false,
      routing: 'MENU',
      errorReason: `Unsupported intent: ${parsedData.intent}`,
      validatedData: null
    };
  }

  // 3. For BOOK intent: Verify Doctor ID and Date
  if (parsedData.intent === 'BOOK') {
    if (!parsedData.doctorId) {
      return {
        isSafe: false,
        routing: 'MENU',
        errorReason: 'Booking intent detected without specific doctor identifier',
        validatedData: null
      };
    }

    const resolvedDoctor = resolveActiveDoctor(parsedData.doctorId, activeDoctors);
    if (!resolvedDoctor) {
      return {
        isSafe: false,
        routing: 'MENU',
        errorReason: `Doctor '${parsedData.doctorId}' does not exist or is currently inactive`,
        validatedData: null
      };
    }

    const dateValidation = validateBookingDate(parsedData.date, clinicRules, resolvedDoctor.availableDays);
    if (!dateValidation.isValid) {
      return {
        isSafe: false,
        routing: 'MENU',
        errorReason: dateValidation.reason,
        validatedData: null
      };
    }

    return {
      isSafe: true,
      routing: 'EXECUTE',
      errorReason: null,
      validatedData: {
        intent: 'BOOK',
        doctor: resolvedDoctor,
        targetDate: dateValidation.normalizedDate,
        language: parsedData.language || 'en',
        confidence: parsedData.confidence
      }
    };
  }

  // 4. For STATUS, CANCEL, HELP intents
  return {
    isSafe: true,
    routing: 'EXECUTE',
    errorReason: null,
    validatedData: {
      intent: parsedData.intent,
      language: parsedData.language || 'en',
      confidence: parsedData.confidence
    }
  };
};
