/**
 * Strict SMS Intent Parser JSON Schema & Validator
 * Validates `{ intent, doctorId?, date?, language, confidence }`.
 * Allowed intent values: BOOK, STATUS, CANCEL, HELP, UNKNOWN.
 */

export const ALLOWED_INTENTS = ['BOOK', 'STATUS', 'CANCEL', 'HELP', 'UNKNOWN'];

/**
 * Validates parsed model output against the strict SMS Intent Schema.
 * @param {any} data - Raw parsed JSON from provider
 * @returns {{ isValid: boolean, errors: string[], sanitized: Object|null }}
 */
export const validateSmsIntentSchema = (data) => {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      isValid: false,
      errors: ['Output must be a valid JSON object'],
      sanitized: null
    };
  }

  // 1. Validate 'intent'
  if (!data.intent || typeof data.intent !== 'string') {
    errors.push("Missing or non-string 'intent' field");
  } else if (!ALLOWED_INTENTS.includes(data.intent.toUpperCase().trim())) {
    errors.push(`Invalid intent '${data.intent}'. Must be one of: ${ALLOWED_INTENTS.join(', ')}`);
  }

  // 2. Validate 'confidence'
  if (data.confidence === undefined || typeof data.confidence !== 'number') {
    errors.push("Missing or non-number 'confidence' field");
  } else if (data.confidence < 0 || data.confidence > 1) {
    errors.push("Field 'confidence' must be a float between 0.0 and 1.0");
  }

  // 3. Validate 'doctorId' (optional, string or null)
  if (data.doctorId !== undefined && data.doctorId !== null && typeof data.doctorId !== 'string') {
    errors.push("Optional field 'doctorId' must be a string or null");
  }

  // 4. Validate 'date' (optional, string or null)
  if (data.date !== undefined && data.date !== null && typeof data.date !== 'string') {
    errors.push("Optional field 'date' must be a string (YYYY-MM-DD) or null");
  }

  // 5. Validate 'language' (optional string, defaults to 'en')
  const language = typeof data.language === 'string' && data.language.trim() ? data.language.trim().toLowerCase() : 'en';

  if (errors.length > 0) {
    return { isValid: false, errors, sanitized: null };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      intent: data.intent.toUpperCase().trim(),
      doctorId: data.doctorId ? String(data.doctorId).trim() : null,
      date: data.date ? String(data.date).trim() : null,
      language,
      confidence: Number(data.confidence)
    }
  };
};
