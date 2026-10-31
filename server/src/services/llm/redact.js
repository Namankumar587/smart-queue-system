/**
 * PII Redaction Module
 * Scrubs telephone numbers, email addresses, patient names, tracking references,
 * QR payloads/URLs, and identification tokens before any string is transmitted to external model APIs.
 */

// Regex patterns for Indian & standard phone numbers (+91, 0, or raw 10 digits with spaces/hyphens)
const PHONE_REGEX = /(\+91[\-\s]?)?[6-9]\d{9}|\b0\d{10}\b|\b\d{5}[\-\s]\d{5}\b/g;

// Standard RFC-compliant email regex
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

// Aadhaar card 12-digit pattern
const AADHAAR_REGEX = /\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b/g;

// Tracking UUID pattern
const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

// QR / Track URL payload pattern
const URL_REGEX = /https?:\/\/[^\s]+|\/track\/[^\s]+/gi;

// Clinic token codes (e.g. DOC-GEN-101-001, DOC-CARD-001, T-001)
const TOKEN_CODE_REGEX = /\bDOC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\d{3,}\b|\bT-\d{3,}\b/gi;

// Patient Name declaration patterns (excludes doctor mentions such as Dr. Priya)
const NAME_REGEX = /(my\s+name\s+is\s+|name\s*:\s*|patient\s*(?:name)?\s*:\s*|mera\s+naam\s+|i\s+am\s+)(?!(?:dr\.?|doctor)\b)([A-Za-z]+(?:\s+[A-Za-z]+)*)/gi;

/**
 * Redacts sensitive PII from incoming message strings.
 * @param {string} text - Raw input message
 * @returns {{ sanitizedText: string, redactionCount: number, tokenMap: Object }}
 */
export const redactPII = (text = '') => {
  if (typeof text !== 'string') return { sanitizedText: '', redactionCount: 0, tokenMap: {} };

  const tokenMap = {};
  let redactionCount = 0;
  let sanitized = text;

  // 1. Redact QR Payloads and URLs
  sanitized = sanitized.replace(URL_REGEX, (match) => {
    redactionCount++;
    const token = `[QR_PAYLOAD_REDACTED_${redactionCount}]`;
    tokenMap[token] = match;
    return token;
  });

  // 2. Redact Tracking UUID references
  sanitized = sanitized.replace(UUID_REGEX, (match) => {
    redactionCount++;
    const token = `[TRACKING_REF_REDACTED_${redactionCount}]`;
    tokenMap[token] = match;
    return token;
  });

  // 3. Redact Token Codes
  sanitized = sanitized.replace(TOKEN_CODE_REGEX, (match) => {
    redactionCount++;
    const token = `[TOKEN_CODE_REDACTED_${redactionCount}]`;
    tokenMap[token] = match;
    return token;
  });

  // 4. Redact Emails
  sanitized = sanitized.replace(EMAIL_REGEX, (match) => {
    redactionCount++;
    const token = `[EMAIL_REDACTED_${redactionCount}]`;
    tokenMap[token] = match;
    return token;
  });

  // 5. Redact Phone Numbers
  sanitized = sanitized.replace(PHONE_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      redactionCount++;
      const token = `[PHONE_REDACTED_${redactionCount}]`;
      tokenMap[token] = match;
      return token;
    }
    return match;
  });

  // 6. Redact Aadhaar / National ID tokens
  sanitized = sanitized.replace(AADHAAR_REGEX, (match) => {
    redactionCount++;
    const token = `[ID_REDACTED_${redactionCount}]`;
    tokenMap[token] = match;
    return token;
  });

  // 7. Redact Patient Names in declarations
  sanitized = sanitized.replace(NAME_REGEX, (match, prefix, name) => {
    if (name && name.trim().length > 1) {
      redactionCount++;
      const token = `[NAME_REDACTED_${redactionCount}]`;
      tokenMap[token] = name.trim();
      return `${prefix}${token}`;
    }
    return match;
  });

  return {
    sanitizedText: sanitized,
    redactionCount,
    tokenMap
  };
};
