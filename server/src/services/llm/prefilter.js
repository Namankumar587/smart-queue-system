/**
 * Prefilter Module
 * 1. Blocks adversarial prompt-injection and jailbreak patterns.
 * 2. Intercepts medical emergency keywords BEFORE any model call with fixed clinic instructions (no diagnosis/triage).
 * 3. Intercepts requests for medical advice/prescriptions with fixed medical disclaimers.
 * 4. Blocks attempts to execute unauthorized admin/write actions on queues.
 * 5. Matches common static inquiries deterministically with 0 token consumption.
 */

export const CLINIC_EMERGENCY_INSTRUCTION =
  '[GL Bajaj Clinic EMERGENCY PROTOCOL] This automated SMS service cannot provide emergency medical care, triage, or diagnosis. ' +
  'If you or someone with you is experiencing a medical emergency (such as severe chest pain, difficulty breathing, profuse bleeding, seizure, or sudden unconsciousness), ' +
  'please immediately dial emergency services (112 or 108) or proceed directly to our 24/7 Triage Desk at Plot No. 2, Knowledge Park III or call +91-120-2323818.';

export const CLINIC_MEDICAL_ADVICE_DISCLAIMER =
  '[GL Bajaj Clinic] This automated service is for queue status and appointment booking only. ' +
  'We cannot provide medical diagnosis, treatment advice, or prescriptions over SMS. ' +
  'Please book a consultation with our licensed medical doctors (Reply BOOK <Doctor Name>) or visit the clinic in person.';

// Medical Emergency Patterns — must trigger fixed instruction BEFORE ANY model call
const EMERGENCY_PATTERNS = [
  /\b(emergency|ambulance|triage|critical|urgent\s+care)\b/i,
  /\b(chest\s+pain|heart\s+attack|stroke|cardiac|angina)\b/i,
  /\b(breathing\s+difficulty|cannot\s+breathe|shortness\s+of\s+breath|choking|suffocating)\b/i,
  /\b(unconscious|passed\s+out|fainted|seizure|convulsions?)\b/i,
  /\b(bleeding\s+(heavily|profusely|excessively)|severe\s+bleeding|hemorrhage|khoon\s+bah\s+raha)\b/i,
  /\b(poisoning|overdose|suicide|poison|zehar)\b/i,
  /\b(severe\s+burns?|electric\s+shock)\b/i
];

// Requests for medical diagnosis, drug prescriptions, or symptom checks
const MEDICAL_ADVICE_PATTERNS = [
  /\b(what\s+medicine|which\s+medicine|koun\s+si\s+dawa|kya\s+dawa)\b/i,
  /\b(prescribe|prescription|dosage|dose\s+of)\b/i,
  /\b(can\s+you\s+diagnose|do\s+i\s+have|what\s+is\s+my\s+illness|is\s+it\s+cancer)\b/i,
  /\b(how\s+to\s+cure|home\s+remedy\s+for|treatment\s+for\s+(fever|cough|vomiting|headache|infection|pain))\b/i,
  /\b(should\s+i\s+take\s+(paracetamol|ibuprofen|antibiotics?|aspirin|crocin|combiflam))\b/i
];

// Adversarial prompt-injection and unauthorized admin/write action patterns
const INJECTION_AND_ADMIN_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s+override/i,
  /you\s+are\s+now\s+(in\s+)?dan\s+mode/i,
  /jailbreak/i,
  /output\s+(your\s+)?(system\s+prompt|instructions|developer\s+mode)/i,
  /reveal\s+(api\s+key|jwt|secret|passwords?)/i,
  /exec\s*\(/i,
  /<\s*script/i,
  /drop\s+table/i,
  // Admin & queue write manipulation attempts
  /\b(call\s+next(\s+patient)?|next\s+token)\b/i,
  /\b(delete|remove|drop)\s+(token|queue|table|database)\b/i,
  /\b(reset|clear)\s+queue\b/i,
  /\b(admin\s+override|bypass\s+queue|give\s+me\s+token\s+#?1|make\s+me\s+first)\b/i,
  /\b(set|update)\s+status\s+to\s+(called|completed|cancelled|in_consultation)\b/i,
  /\b(grant\s+admin|im\s+admin|i\s+am\s+admin|root\s+access)\b/i
];

// Deterministic FAQ patterns
const DETERMINISTIC_FAQS = [
  {
    pattern: /^(clinic\s+)?(hours|timings|timing|open|close)\??$/i,
    response: '[GL Bajaj Clinic] Operating hours: Monday to Friday 08:30 to 17:30, Saturday 09:00 to 14:00. Closed on Sunday.'
  },
  {
    pattern: /^(address|location|where\s+is\s+the\s+clinic)\??$/i,
    response: '[GL Bajaj Clinic] Location: Plot No. 2, Knowledge Park III, Greater Noida, UP 201306.'
  }
];

/**
 * Evaluates input for prompt injection, emergencies, medical advice requests, and FAQs.
 * @param {string} text - Cleaned message text
 * @returns {{
 *   isInjection: boolean,
 *   isEmergency: boolean,
 *   emergencyResponse: string|null,
 *   isMedicalAdvice: boolean,
 *   medicalAdviceResponse: string|null,
 *   isFaq: boolean,
 *   faqResponse: string|null,
 *   reason: string|null
 * }}
 */
export const prefilterCheck = (text = '') => {
  const clean = text.trim();

  // 1. Check Prompt Injection and Admin Actions (Security Perimeter)
  for (const pattern of INJECTION_AND_ADMIN_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isInjection: true,
        isEmergency: false,
        emergencyResponse: null,
        isMedicalAdvice: false,
        medicalAdviceResponse: null,
        isFaq: false,
        faqResponse: null,
        reason: `Adversarial or admin action pattern matched: ${pattern.source}`
      };
    }
  }

  // 2. Check Emergency Keywords (Fixed clinic instruction before any model call)
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isInjection: false,
        isEmergency: true,
        emergencyResponse: CLINIC_EMERGENCY_INSTRUCTION,
        isMedicalAdvice: false,
        medicalAdviceResponse: null,
        isFaq: false,
        faqResponse: null,
        reason: `Emergency keyword intercepted: ${pattern.source}`
      };
    }
  }

  // 3. Check Requests for Medical Advice / Prescriptions
  for (const pattern of MEDICAL_ADVICE_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isInjection: false,
        isEmergency: false,
        emergencyResponse: null,
        isMedicalAdvice: true,
        medicalAdviceResponse: CLINIC_MEDICAL_ADVICE_DISCLAIMER,
        isFaq: false,
        faqResponse: null,
        reason: `Medical advice/prescription request intercepted: ${pattern.source}`
      };
    }
  }

  // 4. Check Deterministic FAQ Match
  for (const faq of DETERMINISTIC_FAQS) {
    if (faq.pattern.test(clean)) {
      return {
        isInjection: false,
        isEmergency: false,
        emergencyResponse: null,
        isMedicalAdvice: false,
        medicalAdviceResponse: null,
        isFaq: true,
        faqResponse: faq.response,
        reason: 'Deterministic FAQ match'
      };
    }
  }

  return {
    isInjection: false,
    isEmergency: false,
    emergencyResponse: null,
    isMedicalAdvice: false,
    medicalAdviceResponse: null,
    isFaq: false,
    faqResponse: null,
    reason: null
  };
};
