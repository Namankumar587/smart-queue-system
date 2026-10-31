/**
 * WorkflowData.js
 * Definitions and metadata for PROMPT 29 Scene B: Five-Station Clinic Journey
 * Stations: Book, Confirm, Track, Notify, Consult.
 */

export const WORKFLOW_STATIONS = [
  {
    id: 'book',
    stepNumber: 1,
    title: '1. Book Appointment',
    shortName: 'Book',
    badge: 'Intake & Triage',
    accentColor: '#FF2D55', // Cosmic Crimson
    summary: 'Online or walk-in patient registration with priority triage.',
    details: 'Patients select their desired department and specialist doctor. Optional Senior Citizen priority tagging places elderly patients higher in queue order with automatic tie-break sequencing.',
    contractNote: 'Endpoint: POST /api/v1/tokens/book or /reception/walkin',
    privacyNote: 'Phone numbers are normalized and masked immediately in server logs.'
  },
  {
    id: 'confirm',
    stepNumber: 2,
    title: '2. Deterministic Confirm',
    shortName: 'Confirm',
    badge: 'Atomic Sequence',
    accentColor: '#FF6B8B', // Luminous Rose
    summary: 'Atomic sequential token allocation with scannable QR ticket.',
    details: 'Sequence counter guarantees non-colliding tokens (e.g. T-004) even under 50+ parallel concurrent bookings. Digital ticket includes a scannable URL with zero PII exposure.',
    contractNote: 'Security: Atomic MongoDB $inc counter + SHA-256 tracking UUID',
    privacyNote: 'QR encodes only the unguessable tracking URL, never JWT or diagnosis.'
  },
  {
    id: 'track',
    stepNumber: 3,
    title: '3. Zero-PII Live Track',
    shortName: 'Track',
    badge: 'Live Queue Polling',
    accentColor: '#F43F5E', // Hot Cerise
    summary: 'Real-time queue depth & wait estimation in your mobile browser.',
    details: 'Live tracking page polls with Cache-Control: no-store and 10s tab-visibility throttling. Shows patients ahead, current serving code, and estimated wait minutes.',
    contractNote: 'Endpoint: GET /api/v1/tokens/track/:uuid with Cache-Control: no-store',
    privacyNote: 'Response payload omits patient phone numbers and names completely.'
  },
  {
    id: 'notify',
    stepNumber: 4,
    title: '4. Near-Turn Alert',
    shortName: 'Notify',
    badge: 'Smart Notification',
    accentColor: '#F59E0B', // Amber Flame
    summary: 'Deterministic SMS alerts dispatch as your turn approaches.',
    details: 'When queue depth reaches 3 or fewer patients ahead, the system triggers an automated SMS with room directions and DLT registered headers. Non-blocking carrier fault tolerance.',
    contractNote: 'Delivery: Deterministic trigger (ahead <= 3), idempotencyKey dedup',
    privacyNote: 'Simulated mode available (SMS_ENABLED=false) with zero carrier cost.'
  },
  {
    id: 'consult',
    stepNumber: 5,
    title: '5. Doctor Consultation',
    shortName: 'Consult',
    badge: 'Clinical Care',
    accentColor: '#10B981', // Clinical Emerald
    summary: 'Staff console, active room timer, and atomic visit completion.',
    details: 'The physician console calls the next eligible patient with strict doctorId ownership. Records consultation duration for rolling-mean wait time estimation.',
    contractNote: 'State Machine: WAITING -> CALLED -> IN_CONSULTATION -> COMPLETED',
    privacyNote: 'Doctors can only access and action tokens for their own room queue.'
  }
];
