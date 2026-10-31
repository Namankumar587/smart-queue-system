export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST'
});

export const TOKEN_STATUS = Object.freeze({
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_CONSULTATION: 'IN_CONSULTATION',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED'
});

// Deterministic Priority Hierarchy (Ascending Sort: 1 is highest priority, 3 is standard)
export const PRIORITY_LEVELS = Object.freeze({
  EMERGENCY_WALKIN: { key: 'EMERGENCY_WALKIN', rank: 1, label: 'Urgent Walk-in' },
  ELDERLY: { key: 'ELDERLY', rank: 2, label: 'Senior Citizen' },
  STANDARD: { key: 'STANDARD', rank: 3, label: 'Standard' }
});

export const ALLOWED_TRANSITIONS = Object.freeze({
  [TOKEN_STATUS.WAITING]: [TOKEN_STATUS.CALLED, TOKEN_STATUS.CANCELLED],
  [TOKEN_STATUS.CALLED]: [TOKEN_STATUS.IN_CONSULTATION, TOKEN_STATUS.SKIPPED, TOKEN_STATUS.CANCELLED],
  [TOKEN_STATUS.IN_CONSULTATION]: [TOKEN_STATUS.COMPLETED, TOKEN_STATUS.SKIPPED],
  [TOKEN_STATUS.SKIPPED]: [TOKEN_STATUS.WAITING, TOKEN_STATUS.CANCELLED], // Requeue/recall moves SKIPPED -> WAITING
  [TOKEN_STATUS.COMPLETED]: [],
  [TOKEN_STATUS.CANCELLED]: []
});

export const ROLLING_AVG_WINDOW = 20;
export const MIN_ROLLING_SAMPLES = 3;

export const ESTIMATOR_STRATEGIES = Object.freeze({
  ROLLING_MEAN: 'ROLLING_MEAN',
  EMA: 'EMA'
});

export const DEFAULT_ESTIMATOR_CONFIG = Object.freeze({
  strategy: 'ROLLING_MEAN',
  windowSize: 20,
  minSamples: 3,
  emaAlpha: 0.2, // 20% weight on most recent visit in EMA
  minDurationMinutes: 2,
  maxDurationMinutes: 60,
  defaultClinicConsultMinutes: 10
});
