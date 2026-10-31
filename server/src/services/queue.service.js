import { v4 as uuidv4 } from 'uuid';
import { Token } from '../models/Token.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { Counter } from '../models/Counter.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import {
  TOKEN_STATUS,
  PRIORITY_LEVELS,
  ALLOWED_TRANSITIONS,
  ROLLING_AVG_WINDOW,
  MIN_ROLLING_SAMPLES,
  ESTIMATOR_STRATEGIES,
  DEFAULT_ESTIMATOR_CONFIG
} from '../config/constants.js';
import { SMS_CONFIG, NOTIFICATION_TYPES, renderSMSTemplate } from '../config/smsTemplates.js';
import { sendSMS, maskPhoneNumber } from './sms.service.js';
import { generateQRCodeDataURL } from './qr.service.js';
import { env } from '../config/env.js';
import { queueEvents } from './eventBus.js';

/**
 * Normalizes phone numbers to standard E.164-compatible format.
 */
export const normalizePhoneNumber = (phone) => {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return phone.startsWith('+') ? `+${digits}` : `+91${digits}`;
};

/**
 * Dispatches an idempotent clinic SMS notification using approved templates.
 * Enforces deduplication via idempotencyKey and persists delivery state.
 * Non-blocking: failures never abort transactions or block queue operations.
 */
export const dispatchClinicNotification = async ({
  token,
  type,
  params = {},
  idempotencyKey = null
}) => {
  try {
    const key = idempotencyKey || `${token._id}_${type}`;

    // 1. Idempotency Check: Prevent duplicate notifications
    const existing = await Notification.findOne({ idempotencyKey: key });
    if (existing) {
      return existing;
    }

    const clinicName = token.clinicId?.name || params.clinicName || 'Clinic';
    const doctorName = token.doctorId?.name || params.doctorName || 'Doctor';
    const department = token.doctorId?.department || params.department || '';
    const roomNumber = token.doctorId?.roomNumber || params.roomNumber || 'consultation room';

    const rendered = renderSMSTemplate(type, {
      clinicName,
      doctorName,
      department,
      roomNumber,
      displayCode: token.displayCode,
      tokenNumber: token.tokenNumber,
      estimatedWait: token.estimatedWaitMinutes ?? params.estimatedWait ?? 0,
      trackingUrl: `${env.CLIENT_URL}/track/${token.trackingUuid}`,
      patientsAhead: params.patientsAhead ?? 0,
      status: token.status,
      ...params
    });

    const smsResult = await sendSMS(token.patientPhone, rendered.text, rendered.dltTemplateId);

    const notificationRecord = await Notification.create({
      tokenId: token._id,
      idempotencyKey: key,
      recipientPhone: token.normalizedPhone,
      type,
      dltTemplateId: rendered.dltTemplateId,
      message: rendered.text,
      status: smsResult.status || (smsResult.simulated ? 'SIMULATED' : smsResult.sent ? 'SENT' : 'FAILED'),
      providerMessageId: smsResult.sid || null,
      error: smsResult.error || null,
      sentAt: new Date()
    });

    return notificationRecord;
  } catch (error) {
    // Non-blocking: SMS failure must never crash or undo transactions
    console.error(`[Notification Failure] ${type} for token ${token?.displayCode}: ${error.message}`);
    return null;
  }
};

/**
 * Deterministically evaluates active queue depth for a doctor and dispatches
 * near-turn alerts to patients within the configured threshold (e.g., <= 3 ahead).
 * Enforces persistent sent-event state on the Token to guarantee zero duplicate alerts.
 */
export const evaluateNearTurnAlerts = async (doctorId, date) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const inServiceCount = await Token.countDocuments({
      doctorId,
      date: targetDate,
      status: { $in: [TOKEN_STATUS.CALLED, TOKEN_STATUS.IN_CONSULTATION] }
    });

    const waitingTokens = await Token.find({
      doctorId,
      date: targetDate,
      status: TOKEN_STATUS.WAITING
    })
      .sort({ priorityRank: 1, bookedAt: 1 })
      .populate('doctorId')
      .populate('clinicId');

    const threshold = SMS_CONFIG.NEAR_TURN_THRESHOLD;

    for (let i = 0; i < waitingTokens.length; i++) {
      const token = waitingTokens[i];
      const patientsAhead = inServiceCount + i;

      if (patientsAhead <= threshold) {
        // Atomically claim the alert sent state to prevent race conditions during high concurrency
        const claimed = await Token.findOneAndUpdate(
          { _id: token._id, nearTurnAlertSent: false },
          {
            $set: {
              nearTurnAlertSent: true,
              nearTurnAlertSentAt: new Date()
            }
          },
          { new: true }
        );

        if (!claimed) {
          continue; // Already claimed by concurrent execution
        }

        // Dispatch alert with idempotency key
        await dispatchClinicNotification({
          token: claimed,
          type: NOTIFICATION_TYPES.NEAR_TURN_ALERT,
          params: { patientsAhead },
          idempotencyKey: `${token._id}_${NOTIFICATION_TYPES.NEAR_TURN_ALERT}`
        });
      }
    }
  } catch (err) {
    console.error('[NearTurnAlert Evaluation Error]:', err.message);
  }
};

/**
 * Public on-demand SMS status query (Rate-limited per hour).
 */
export const requestStatusHelpSMS = async (trackingUuid) => {
  const token = await Token.findOne({ trackingUuid })
    .populate('doctorId')
    .populate('clinicId');

  if (!token) {
    const error = new Error('Token not found');
    error.statusCode = 404;
    throw error;
  }

  const waitInfo = await calculateTokenQueuePosition(token.doctorId._id || token.doctorId, token.date, token);
  const hourBucket = new Date().toISOString().slice(0, 13);
  const idempotencyKey = `${token._id}_STATUS_HELP_${hourBucket}`;

  return dispatchClinicNotification({
    token,
    type: NOTIFICATION_TYPES.STATUS_HELP,
    params: {
      status: token.status,
      patientsAhead: waitInfo.patientsAhead,
      estimatedWait: waitInfo.estimatedWaitMinutes
    },
    idempotencyKey
  });
};

/**
 * Formats wait estimates into consistent, non-promissory representations.
 * Never promises an exact wait time to avoid patient conflict.
 * Returns both integer minutes and approximate human-friendly range/disclaimer.
 */
export const formatWaitEstimate = (patientsAhead, effectiveMinutes) => {
  if (patientsAhead <= 0) {
    return {
      patientsAhead: 0,
      estimatedWaitMinutes: 0,
      minWaitMinutes: 0,
      maxWaitMinutes: 5,
      display: 'Next in line (< 5 mins)',
      displayRange: '< 5 mins',
      disclaimer: 'Estimated wait is dynamic based on consultation pace and is an estimate, not a guarantee.'
    };
  }

  const baseMinutes = patientsAhead * effectiveMinutes;
  // Non-promissory variance window (+/- 20% or minimum 3 mins)
  const variance = Math.max(3, Math.round(baseMinutes * 0.2));
  const minWaitMinutes = Math.max(1, baseMinutes - variance);
  const maxWaitMinutes = baseMinutes + variance;

  return {
    patientsAhead,
    estimatedWaitMinutes: baseMinutes,
    minWaitMinutes,
    maxWaitMinutes,
    display: `~${baseMinutes} mins`,
    displayRange: `${minWaitMinutes} - ${maxWaitMinutes} mins`,
    disclaimer: 'Estimated wait is dynamic based on consultation pace and is an estimate, not a guarantee.'
  };
};

/**
 * Calculates effective doctor consultation minutes using a documented, configurable
 * rolling average of recent completed consultations (default: last 20) or exponential
 * moving average (EMA) with fallback to doctor/clinic default duration.
 *
 * Deterministic Algorithm:
 * 1. Read doctor profile and associated clinic settings.
 *    Fallback duration precedence:
 *    doctor.avgConsultMinutes -> clinic.defaultConsultationMinutes -> 10 minutes.
 * 2. Query up to `windowSize` (default 20) most recent completed visits for the doctor.
 * 3. If sample count < `minSamples` (default 3):
 *    Return fallback duration (insufficient operational history).
 * 4. If strategy === 'EMA':
 *    Calculate exponential moving average across chronological visits:
 *    ema_t = alpha * duration_t + (1 - alpha) * ema_(t-1)
 * 5. If strategy === 'ROLLING_MEAN' (default):
 *    effective = round(sum(durations) / sampleCount)
 * 6. Clamp effective duration to [minDuration (2 min), maxDuration (60 min)].
 *
 * NOTE: ML prediction is future scope and NOT an LLM task.
 */
export const getEffectiveConsultationMinutes = async (doctorId, options = {}) => {
  const config = {
    strategy: options.strategy || DEFAULT_ESTIMATOR_CONFIG.strategy,
    windowSize: options.windowSize || DEFAULT_ESTIMATOR_CONFIG.windowSize,
    minSamples: options.minSamples || DEFAULT_ESTIMATOR_CONFIG.minSamples,
    emaAlpha: options.emaAlpha || DEFAULT_ESTIMATOR_CONFIG.emaAlpha,
    minDuration: options.minDuration || DEFAULT_ESTIMATOR_CONFIG.minDurationMinutes,
    maxDuration: options.maxDuration || DEFAULT_ESTIMATOR_CONFIG.maxDurationMinutes
  };

  const doctor = await Doctor.findById(doctorId).populate('clinicId');
  const fallbackMinutes =
    doctor?.avgConsultMinutes ||
    doctor?.clinicId?.defaultConsultationMinutes ||
    DEFAULT_ESTIMATOR_CONFIG.defaultClinicConsultMinutes;

  const recentTokens = await Token.find({
    doctorId,
    status: TOKEN_STATUS.COMPLETED,
    consultationDurationMinutes: { $gt: 0 }
  })
    .sort({ completedAt: -1 })
    .limit(config.windowSize)
    .select('consultationDurationMinutes completedAt');

  if (!recentTokens || recentTokens.length < config.minSamples) {
    return Math.max(config.minDuration, Math.min(config.maxDuration, fallbackMinutes));
  }

  let calculatedMinutes;

  if (config.strategy === ESTIMATOR_STRATEGIES.EMA) {
    // Chronological order: oldest to newest
    const chronological = [...recentTokens].reverse();
    let ema = chronological[0].consultationDurationMinutes;
    for (let i = 1; i < chronological.length; i++) {
      const dur = chronological[i].consultationDurationMinutes;
      ema = config.emaAlpha * dur + (1 - config.emaAlpha) * ema;
    }
    calculatedMinutes = Math.round(ema);
  } else {
    // Arithmetic mean
    const totalMinutes = recentTokens.reduce((sum, t) => sum + t.consultationDurationMinutes, 0);
    calculatedMinutes = Math.round(totalMinutes / recentTokens.length);
  }

  return Math.max(config.minDuration, Math.min(config.maxDuration, calculatedMinutes));
};

/**
 * Retrieves the live active queue for a doctor on a specific clinic day.
 * Ordered strictly by: priorityRank ASCENDING, then bookedAt ASCENDING.
 */
export const getActiveQueueForDoctor = async (doctorId, date) => {
  const activeStatuses = [
    TOKEN_STATUS.IN_CONSULTATION,
    TOKEN_STATUS.CALLED,
    TOKEN_STATUS.WAITING,
    TOKEN_STATUS.SKIPPED
  ];

  return Token.find({
    doctorId,
    date,
    status: { $in: activeStatuses }
  }).sort({
    // Deterministic priority ordering: 1 (Emergency) < 2 (Elderly) < 3 (Standard)
    priorityRank: 1,
    bookedAt: 1
  });
};

/**
 * Computes deterministic patients ahead and non-promissory estimated wait for a given token.
 * Wait estimate = patientsAhead * effectiveConsultationMinutes.
 */
export const calculateTokenQueuePosition = async (doctorId, date, token) => {
  if (token.status !== TOKEN_STATUS.WAITING) {
    return {
      patientsAhead: 0,
      estimatedWaitMinutes: 0,
      minWaitMinutes: 0,
      maxWaitMinutes: 0,
      display: 'In Service / Completed',
      displayRange: 'N/A',
      disclaimer: 'Token is no longer waiting in the queue.'
    };
  }

  // Count active consultations ahead (currently IN_CONSULTATION or CALLED)
  const inServiceAhead = await Token.countDocuments({
    doctorId,
    date,
    status: { $in: [TOKEN_STATUS.IN_CONSULTATION, TOKEN_STATUS.CALLED] }
  });

  // Count waiting tokens with higher priority rank (lower number) OR same rank but earlier bookedAt
  const waitingAhead = await Token.countDocuments({
    doctorId,
    date,
    status: TOKEN_STATUS.WAITING,
    _id: { $ne: token._id },
    $or: [
      { priorityRank: { $lt: token.priorityRank } },
      { priorityRank: token.priorityRank, bookedAt: { $lt: token.bookedAt } }
    ]
  });

  const patientsAhead = inServiceAhead + waitingAhead;
  const effectiveMinutes = await getEffectiveConsultationMinutes(doctorId);
  return formatWaitEstimate(patientsAhead, effectiveMinutes);
};

/**
 * Selects the optimal doctor within a department using deterministic load balancing.
 *
 * Deterministic Algorithm:
 * 1. Find all active, available doctors in the department for the specified clinic.
 * 2. If 0 available: throw HTTP 400 error.
 * 3. For each candidate doctor:
 *    - Count active tokens (IN_CONSULTATION, CALLED, WAITING).
 *    - Determine doctor's effective consultation duration.
 *    - Compute active queue wait: queueWaitMinutes = activeCount * effectiveMinutes.
 * 4. Deterministic Ranking Criteria:
 *    a. Primary: lowest queueWaitMinutes ascending.
 *    b. Secondary (Tie-break): lowest activeCount ascending.
 *    c. Tertiary (Deterministic Tie-break): doctorCode ascending.
 * 5. Returns selected doctor and detailed assignment rationale.
 */
export const autoAssignDoctorByDepartment = async ({ clinicId, department, date }) => {
  if (!department) {
    const error = new Error('Department is required for auto-assignment');
    error.statusCode = 400;
    throw error;
  }

  const query = { department: department.trim(), isAvailable: true };
  if (clinicId) {
    query.clinicId = clinicId;
  }

  const availableDoctors = await Doctor.find(query).populate('clinicId');

  if (!availableDoctors || availableDoctors.length === 0) {
    const error = new Error(`No available doctors found for department '${department}'`);
    error.statusCode = 400;
    throw error;
  }

  const targetDate = date || new Date().toISOString().split('T')[0];

  // Evaluate queue load for each candidate doctor
  const candidateLoads = await Promise.all(
    availableDoctors.map(async (doc) => {
      const activeCount = await Token.countDocuments({
        doctorId: doc._id,
        date: targetDate,
        status: {
          $in: [TOKEN_STATUS.IN_CONSULTATION, TOKEN_STATUS.CALLED, TOKEN_STATUS.WAITING]
        }
      });

      const effectiveMinutes = await getEffectiveConsultationMinutes(doc._id);
      const queueWaitMinutes = activeCount * effectiveMinutes;

      return {
        doctor: doc,
        activeCount,
        effectiveMinutes,
        queueWaitMinutes
      };
    })
  );

  // Deterministic multi-tier sort:
  // 1. Lowest queueWaitMinutes
  // 2. Fewest active tokens
  // 3. Alphabetical doctorCode
  candidateLoads.sort((a, b) => {
    if (a.queueWaitMinutes !== b.queueWaitMinutes) {
      return a.queueWaitMinutes - b.queueWaitMinutes;
    }
    if (a.activeCount !== b.activeCount) {
      return a.activeCount - b.activeCount;
    }
    return (a.doctor.doctorCode || '').localeCompare(b.doctor.doctorCode || '');
  });

  const best = candidateLoads[0];
  const rationale =
    availableDoctors.length === 1
      ? `AUTO_ASSIGNED: Dr. ${best.doctor.name} (${best.doctor.doctorCode}) is the only available doctor in ${department}.`
      : `AUTO_LOAD_BALANCED: Assigned to Dr. ${best.doctor.name} (${best.doctor.doctorCode}) with lowest estimated queue wait (${best.queueWaitMinutes} mins, ${best.activeCount} active patients ahead) across ${availableDoctors.length} available doctors in ${department}.`;

  return {
    doctor: best.doctor,
    queueWaitMinutes: best.queueWaitMinutes,
    activeCount: best.activeCount,
    effectiveMinutes: best.effectiveMinutes,
    rationale,
    evaluatedCandidates: candidateLoads.length
  };
};

/**
 * Creates a token with atomic sequence counter ($inc) and retry resiliency.
 * Enforces per-doctor per-day uniqueness and duplicate active phone blocking.
 * Supports direct doctor booking or load-balanced department auto-assignment.
 */
export const createToken = async ({
  clinicId,
  doctorId,
  department,
  patientName,
  patientPhone,
  priority = 'STANDARD',
  source = 'ONLINE',
  notes = '',
  staffUserId = null,
  staffRole = 'PATIENT_PUBLIC'
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  let doctor = null;
  let assignmentRationale = 'DIRECT_DOCTOR_SELECTION';

  if (doctorId) {
    doctor = await Doctor.findById(doctorId).populate('clinicId');
    if (!doctor || !doctor.isAvailable) {
      const error = new Error('Selected doctor is currently unavailable');
      error.statusCode = 400;
      throw error;
    }
    assignmentRationale = `DIRECT_DOCTOR_SELECTION: Patient directly selected Dr. ${doctor.name} (${doctor.doctorCode})`;
  } else if (department) {
    const autoResult = await autoAssignDoctorByDepartment({ clinicId, department, date: todayStr });
    doctor = autoResult.doctor;
    assignmentRationale = autoResult.rationale;
  } else {
    const error = new Error('Either doctorId or department is required to book a token');
    error.statusCode = 400;
    throw error;
  }

  const resolvedDoctorId = doctor._id;
  const actualClinicId = clinicId || doctor.clinicId?._id || doctor.clinicId;
  const normalizedPhone = normalizePhoneNumber(patientPhone);

  // 1. Maintain or update patient master record
  let patient = await Patient.findOne({ normalizedPhone });
  if (!patient) {
    patient = await Patient.create({
      name: patientName.trim(),
      phone: patientPhone.trim(),
      normalizedPhone,
      lastVisitAt: new Date()
    });
  } else {
    patient.name = patientName.trim();
    patient.lastVisitAt = new Date();
    await patient.save();
  }

  // 2. Concurrency Lock Key: ${doctorId}_${date}_${normalizedPhone}
  const activeBookingKey = `${resolvedDoctorId}_${todayStr}_${normalizedPhone}`;

  // 3. Resolve Priority Metadata (Rank 1: Emergency, Rank 2: Elderly, Rank 3: Standard)
  const priorityMeta = PRIORITY_LEVELS[priority] || PRIORITY_LEVELS.STANDARD;

  // 4. Retry loop (up to 3 attempts) for atomic daily sequence increments under extreme load
  let token = null;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Atomic counter increment using $inc (never read-then-increment)
      const counterKey = `doc_${resolvedDoctorId}_${todayStr}`;
      const counter = await Counter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { currentSeq: 1 }, $setOnInsert: { sequenceDate: todayStr } },
        { new: true, upsert: true }
      );

      const seq = counter.currentSeq;
      const tokenNumber = `T-${String(seq).padStart(3, '0')}`;
      const displayCode = `${doctor.doctorCode || 'DOC'}-${String(seq).padStart(3, '0')}`;
      const trackingUuid = uuidv4();
      const bookedAt = new Date();

      // Estimate initial wait time using non-promissory formatting
      const effectiveMinutes = await getEffectiveConsultationMinutes(resolvedDoctorId);
      const waitingTokensAhead = await Token.countDocuments({
        doctorId: resolvedDoctorId,
        date: todayStr,
        status: TOKEN_STATUS.WAITING,
        $or: [
          { priorityRank: { $lt: priorityMeta.rank } },
          { priorityRank: priorityMeta.rank, bookedAt: { $lt: bookedAt } }
        ]
      });
      const inServiceAhead = await Token.countDocuments({
        doctorId: resolvedDoctorId,
        date: todayStr,
        status: { $in: [TOKEN_STATUS.IN_CONSULTATION, TOKEN_STATUS.CALLED] }
      });
      const waitInfo = formatWaitEstimate(waitingTokensAhead + inServiceAhead, effectiveMinutes);

      token = await Token.create({
        clinicId: actualClinicId,
        doctorId: resolvedDoctorId,
        patientId: patient._id,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        normalizedPhone,
        date: todayStr,
        sequenceNumber: seq,
        tokenNumber,
        displayCode,
        trackingUuid,
        activeBookingKey,
        priority: priorityMeta.key,
        priorityRank: priorityMeta.rank,
        source,
        status: TOKEN_STATUS.WAITING,
        bookedAt,
        estimatedWaitMinutes: waitInfo.estimatedWaitMinutes,
        estimatedWaitDisplay: waitInfo.display,
        assignmentRationale,
        notes: notes ? notes.trim() : ''
      });

      break; // Creation succeeded
    } catch (err) {
      // Handle duplicate active booking key (E11000)
      if (err.code === 11000 && (err.keyPattern?.activeBookingKey || err.message?.includes('activeBookingKey'))) {
        const duplicateError = new Error(
          `Patient (${normalizedPhone}) already holds an active token today with ${doctor.name}. Please wait for your turn or cancel the existing booking.`
        );
        duplicateError.statusCode = 409;
        throw duplicateError;
      }

      // Retry on transient sequence index collision (rare)
      if (err.code === 11000 && attempt < maxRetries) {
        continue;
      }

      throw err;
    }
  }

  if (!token) {
    throw new Error('Failed to generate token after concurrent retries. Please try again.');
  }

  // 5. Audit Log (Non-blocking)
  AuditLog.create({
    action: 'TOKEN_BOOKED',
    performedBy: staffUserId,
    performedByRole: staffRole,
    targetType: 'TOKEN',
    targetId: token._id,
    details: {
      tokenNumber: token.tokenNumber,
      displayCode: token.displayCode,
      doctorId,
      priority: priorityMeta.key,
      source
    }
  }).catch((e) => console.error('[AuditLog] Error:', e.message));

  // 6. Configurable Notification Dispatch (Non-blocking)
  dispatchClinicNotification({
    token,
    type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
    params: {
      clinicName: doctor.clinicId?.name,
      doctorName: doctor.name,
      department: doctor.department,
      estimatedWait: token.estimatedWaitMinutes
    },
    idempotencyKey: `${token._id}_${NOTIFICATION_TYPES.BOOKING_CONFIRMATION}`
  }).catch((e) => console.error('[Notification] Error:', e.message));

  // 7. Deterministic Near-Turn Alert Check
  evaluateNearTurnAlerts(resolvedDoctorId, todayStr).catch((e) => console.error('[NearTurn] Error:', e.message));

  // 8. Real-time PubSub Emission for SSE streams
  try {
    queueEvents.emit('token:created', {
      tokenId: token._id.toString(),
      trackingUuid: token.trackingUuid,
      doctorId: resolvedDoctorId.toString(),
      status: token.status,
      displayCode: token.displayCode,
      tokenNumber: token.tokenNumber
    });
    queueEvents.emit('queue:changed', { doctorId: resolvedDoctorId.toString(), date: todayStr });
  } catch (err) {
    console.error('[EventBus] Non-fatal emission error:', err.message);
  }

  return token;
};

/**
 * Resolves public token status with zero PII exposure and dynamic queue metrics.
 */
export const getPublicTokenStatus = async (trackingUuid) => {
  const token = await Token.findOne({ trackingUuid })
    .populate('doctorId', 'name doctorCode department roomNumber avgConsultMinutes isAvailable')
    .populate('clinicId', 'name address phone timezone defaultConsultationMinutes');

  if (!token) {
    return null;
  }

  const docId = token.doctorId?._id || token.doctorId;

  const waitInfo = docId
    ? await calculateTokenQueuePosition(docId, token.date, token)
    : {
        patientsAhead: 0,
        estimatedWaitMinutes: 0,
        display: 'Immediate / Ready',
        displayRange: '0 - 5 mins',
        disclaimer: 'Please wait for your token to be announced.'
      };

  const trackingUrl = `${env.CLIENT_URL}/track/${token.trackingUuid}`;
  let qrCode = null;
  try {
    qrCode = await generateQRCodeDataURL(trackingUrl);
  } catch (err) {
    console.error('[QRCode] Non-fatal generation error:', err.message);
  }

  // Retrieve authoritative notification delivery status if available
  const latestNotification = await Notification.findOne({ tokenId: token._id })
    .sort({ createdAt: -1 })
    .select('status type createdAt');

  // Look up doctor's currently serving token (IN_CONSULTATION or CALLED) without exposing patient details
  const currentServingToken = docId
    ? await Token.findOne({
        doctorId: docId,
        date: token.date,
        status: { $in: [TOKEN_STATUS.IN_CONSULTATION, TOKEN_STATUS.CALLED] }
      })
        .sort({ status: 1, calledAt: -1, updatedAt: -1 })
        .select('displayCode tokenNumber status')
    : null;

  const currentServingCode = currentServingToken
    ? (currentServingToken.displayCode || `T-${String(currentServingToken.tokenNumber).padStart(3, '0')}`)
    : null;

  return {
    trackingUuid: token.trackingUuid,
    trackingUrl,
    qrCode,
    notificationStatus: latestNotification?.status || null,
    tokenNumber: token.tokenNumber,
    displayCode: token.displayCode,
    status: token.status,
    priority: token.priority,
    priorityRank: token.priorityRank,
    positionAhead: waitInfo.patientsAhead,
    currentServingCode,
    currentServingStatus: currentServingToken?.status || null,
    estimatedWaitMinutes: waitInfo.estimatedWaitMinutes,
    estimatedWaitDisplay: waitInfo.display,
    estimatedWaitRange: waitInfo.displayRange,
    waitDisclaimer: waitInfo.disclaimer,
    assignmentRationale: token.assignmentRationale,
    doctor: {
      name: token.doctorId?.name || 'Assigned Doctor',
      doctorCode: token.doctorId?.doctorCode || 'DOC',
      department: token.doctorId?.department || 'General',
      roomNumber: token.doctorId?.roomNumber || 'Room 101'
    },
    clinic: {
      name: token.clinicId?.name || 'Clinic Health Center',
      phone: token.clinicId?.phone || '',
      address: token.clinicId?.address || ''
    },
    bookedAt: token.bookedAt,
    calledAt: token.calledAt,
    completedAt: token.completedAt
  };
};

/**
 * Transitions token states enforcing allowed transitions, recording duration,
 * and releasing/re-acquiring activeBookingKey lock.
 */
export const updateTokenStatus = async (tokenId, targetStatus, updatedByStaff) => {
  const token = await Token.findById(tokenId).populate('doctorId').populate('clinicId');
  if (!token) {
    const error = new Error('Token not found');
    error.statusCode = 404;
    throw error;
  }

  const allowedNextStates = ALLOWED_TRANSITIONS[token.status] || [];
  if (!allowedNextStates.includes(targetStatus)) {
    const error = new Error(
      `Invalid transition: Cannot move token from '${token.status}' to '${targetStatus}'. Allowed: ${allowedNextStates.join(', ') || 'None'}`
    );
    error.statusCode = 400;
    throw error;
  }

  const updates = { status: targetStatus };
  const now = new Date();

  if (targetStatus === TOKEN_STATUS.CALLED) {
    updates.calledAt = now;
  } else if (targetStatus === TOKEN_STATUS.IN_CONSULTATION) {
    updates.startedConsultationAt = now;
  } else if (targetStatus === TOKEN_STATUS.COMPLETED) {
    updates.completedAt = now;
    updates.activeBookingKey = null; // Release active lock on completion

    // Record consultation duration in integer minutes
    const startTime = token.startedConsultationAt || token.calledAt || now;
    const durationMinutes = Math.max(1, Math.round((now - startTime) / 60000));
    updates.consultationDurationMinutes = durationMinutes;

    // Update doctor consultation stats asynchronously
    Doctor.findByIdAndUpdate(token.doctorId._id, {
      $inc: { 'consultationStats.totalConsultations': 1 },
      $set: { 'consultationStats.lastConsultationAt': now }
    }).catch((e) => console.error('[DoctorStats] Error:', e.message));
  } else if (targetStatus === TOKEN_STATUS.SKIPPED) {
    // No-show / Skip: release active booking key so queue is not blocked
    updates.skippedAt = now;
    updates.activeBookingKey = null;
  } else if (targetStatus === TOKEN_STATUS.CANCELLED) {
    updates.cancelledAt = now;
    updates.activeBookingKey = null;
  } else if (targetStatus === TOKEN_STATUS.WAITING) {
    // Requeue / Recall: re-acquire active lock
    updates.recalledAt = now;
    updates.activeBookingKey = `${token.doctorId._id}_${token.date}_${token.normalizedPhone}`;
  }

  const updatedToken = await Token.findByIdAndUpdate(tokenId, { $set: updates }, { new: true });

  // Audit event
  AuditLog.create({
    action: `TOKEN_${targetStatus}`,
    performedBy: updatedByStaff?._id || null,
    performedByRole: updatedByStaff?.role || 'SYSTEM',
    targetType: 'TOKEN',
    targetId: token._id,
    details: {
      previousStatus: token.status,
      newStatus: targetStatus,
      tokenNumber: token.tokenNumber,
      displayCode: token.displayCode
    }
  }).catch((e) => console.error('[AuditLog] Error:', e.message));

  // Notification Dispatch based on target status
  if (targetStatus === TOKEN_STATUS.CALLED) {
    dispatchClinicNotification({
      token,
      type: NOTIFICATION_TYPES.NOW_CALLING,
      params: {
        clinicName: token.clinicId?.name,
        doctorName: token.doctorId?.name,
        roomNumber: token.doctorId?.roomNumber
      },
      idempotencyKey: `${token._id}_${NOTIFICATION_TYPES.NOW_CALLING}`
    }).catch((e) => console.error('[Notification] Error:', e.message));
  } else if (targetStatus === TOKEN_STATUS.CANCELLED) {
    dispatchClinicNotification({
      token,
      type: NOTIFICATION_TYPES.CANCELLATION,
      params: {
        clinicName: token.clinicId?.name
      },
      idempotencyKey: `${token._id}_${NOTIFICATION_TYPES.CANCELLATION}`
    }).catch((e) => console.error('[Notification] Error:', e.message));
  } else if (targetStatus === TOKEN_STATUS.WAITING) {
    dispatchClinicNotification({
      token,
      type: NOTIFICATION_TYPES.RECALLED,
      params: {
        clinicName: token.clinicId?.name,
        doctorName: token.doctorId?.name
      },
      idempotencyKey: `${token._id}_${NOTIFICATION_TYPES.RECALLED}`
    }).catch((e) => console.error('[Notification] Error:', e.message));
  }

  // Deterministically re-evaluate Near-Turn Alerts for all waiting patients of this doctor
  const docId = token.doctorId?._id || token.doctorId;
  evaluateNearTurnAlerts(docId, token.date).catch((e) => console.error('[NearTurn] Error:', e.message));

  // Real-time PubSub Emission for SSE streams (Instant patient & TV display updates)
  try {
    queueEvents.emit('token:updated', {
      tokenId: updatedToken._id.toString(),
      trackingUuid: token.trackingUuid,
      doctorId: docId.toString(),
      status: targetStatus,
      displayCode: token.displayCode,
      tokenNumber: token.tokenNumber,
      doctorName: token.doctorId?.name,
      roomNumber: token.doctorId?.roomNumber
    });
    queueEvents.emit('queue:changed', { doctorId: docId.toString(), date: token.date });
  } catch (err) {
    console.error('[EventBus] Non-fatal emission error:', err.message);
  }

  return updatedToken;
};

/**
 * Explicit administrative or receptionist transfer of an active token to another doctor.
 * Strictly prevents silent background reassignments.
 */
export const reassignTokenDoctor = async ({
  tokenId,
  targetDoctorId,
  reassignedByStaff,
  reason = 'Patient transferred by clinic staff'
}) => {
  const token = await Token.findById(tokenId);
  if (!token) {
    const error = new Error('Token not found');
    error.statusCode = 404;
    throw error;
  }

  // Only active waiting or skipped tokens can be manually reassigned
  const reassignableStatuses = [TOKEN_STATUS.WAITING, TOKEN_STATUS.SKIPPED];
  if (!reassignableStatuses.includes(token.status)) {
    const error = new Error(`Cannot reassign token in '${token.status}' state`);
    error.statusCode = 400;
    throw error;
  }

  const targetDoctor = await Doctor.findById(targetDoctorId).populate('clinicId');
  if (!targetDoctor || !targetDoctor.isAvailable) {
    const error = new Error('Target doctor is currently unavailable');
    error.statusCode = 400;
    throw error;
  }

  const oldDoctorId = token.doctorId;
  const todayStr = token.date;
  const newActiveBookingKey = `${targetDoctor._id}_${todayStr}_${token.normalizedPhone}`;

  // Check if target doctor already has an active token for this phone today
  const existingActive = await Token.findOne({
    activeBookingKey: newActiveBookingKey,
    _id: { $ne: token._id }
  });
  if (existingActive) {
    const error = new Error(`Patient already holds an active token today with Dr. ${targetDoctor.name}`);
    error.statusCode = 409;
    throw error;
  }

  // Generate atomic sequence counter for the target doctor
  const counterKey = `doc_${targetDoctor._id}_${todayStr}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { currentSeq: 1 }, $setOnInsert: { sequenceDate: todayStr } },
    { new: true, upsert: true }
  );

  const newSeq = counter.currentSeq;
  const newTokenNumber = `T-${String(newSeq).padStart(3, '0')}`;
  const newDisplayCode = `${targetDoctor.doctorCode || 'DOC'}-${String(newSeq).padStart(3, '0')}`;

  const rationale = `MANUAL_REASSIGNMENT: Transferred from Doctor ID ${oldDoctorId} to Dr. ${targetDoctor.name} (${targetDoctor.doctorCode}) by staff (${reassignedByStaff?.role || 'STAFF'}). Reason: ${reason}`;

  token.doctorId = targetDoctor._id;
  token.sequenceNumber = newSeq;
  token.tokenNumber = newTokenNumber;
  token.displayCode = newDisplayCode;
  token.activeBookingKey = newActiveBookingKey;
  token.assignmentRationale = rationale;

  // Recalculate wait position
  const waitInfo = await calculateTokenQueuePosition(targetDoctor._id, todayStr, token);
  token.estimatedWaitMinutes = waitInfo.estimatedWaitMinutes;
  token.estimatedWaitDisplay = waitInfo.display;

  await token.save();

  // Audit log entry
  AuditLog.create({
    action: 'TOKEN_REASSIGNED',
    performedBy: reassignedByStaff?._id || null,
    performedByRole: reassignedByStaff?.role || 'STAFF',
    targetType: 'TOKEN',
    targetId: token._id,
    details: {
      oldDoctorId,
      newDoctorId: targetDoctor._id,
      newTokenNumber,
      newDisplayCode,
      reason
    }
  }).catch((e) => console.error('[AuditLog] Error:', e.message));

  return token;
};

/**
 * Allows a patient to voluntarily cancel their own active appointment via their trackingUuid.
 * Immediately frees up the queue slot and notifies downstream services.
 */
export const cancelTokenByPatient = async (trackingUuid, reason = 'Voluntary patient cancellation') => {
  const token = await Token.findOne({ trackingUuid }).populate('doctorId').populate('clinicId');
  if (!token) {
    const error = new Error('Token record not found.');
    error.statusCode = 404;
    throw error;
  }

  if (token.status === TOKEN_STATUS.COMPLETED || token.status === TOKEN_STATUS.CANCELLED) {
    const error = new Error(`Cannot cancel an appointment that is already ${token.status.toLowerCase()}`);
    error.statusCode = 400;
    throw error;
  }

  if (token.status === TOKEN_STATUS.IN_CONSULTATION) {
    const error = new Error('Cannot cancel an appointment that is currently in consultation');
    error.statusCode = 400;
    throw error;
  }

  return await updateTokenStatus(token._id, TOKEN_STATUS.CANCELLED, {
    role: 'PATIENT_PUBLIC',
    _id: null,
    reason
  });
};

/**
 * Returns public waiting room display data across all active doctors and rooms.
 * Zero-PII: Only includes token codes, room numbers, doctor names, and current serving state.
 */
export const getPublicDisplayData = async () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const doctors = await Doctor.find({ isAvailable: true })
    .select('name doctorCode department roomNumber')
    .sort({ roomNumber: 1 });

  const displayRooms = await Promise.all(
    doctors.map(async (doc) => {
      const currentServing = await Token.findOne({
        doctorId: doc._id,
        date: todayStr,
        status: { $in: [TOKEN_STATUS.IN_CONSULTATION, TOKEN_STATUS.CALLED] }
      })
        .sort({ status: 1, calledAt: -1, updatedAt: -1 })
        .select('displayCode tokenNumber status priority');

      const upNextTokens = await Token.find({
        doctorId: doc._id,
        date: todayStr,
        status: TOKEN_STATUS.WAITING
      })
        .sort({ priorityRank: 1, bookedAt: 1 })
        .limit(4)
        .select('displayCode tokenNumber priority priorityRank');

      const totalWaiting = await Token.countDocuments({
        doctorId: doc._id,
        date: todayStr,
        status: TOKEN_STATUS.WAITING
      });

      return {
        doctorId: doc._id.toString(),
        doctorName: doc.name,
        department: doc.department,
        roomNumber: doc.roomNumber || 'Room 101',
        currentServing: currentServing
          ? {
              displayCode: currentServing.displayCode || `T-${String(currentServing.tokenNumber).padStart(3, '0')}`,
              tokenNumber: currentServing.tokenNumber,
              status: currentServing.status,
              priority: currentServing.priority
            }
          : null,
        upNext: upNextTokens.map((t) => ({
          displayCode: t.displayCode || `T-${String(t.tokenNumber).padStart(3, '0')}`,
          tokenNumber: t.tokenNumber,
          priority: t.priority
        })),
        totalWaiting
      };
    })
  );

  return {
    date: todayStr,
    clinicName: 'Smart Queue Medical Center',
    lastUpdated: new Date().toISOString(),
    rooms: displayRooms
  };
};
