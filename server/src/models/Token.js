import mongoose from 'mongoose';
import { TOKEN_STATUS, PRIORITY_LEVELS } from '../config/constants.js';

const tokenSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true
    },
    patientPhone: {
      type: String,
      required: [true, 'Patient phone is required'],
      trim: true
    },
    normalizedPhone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    date: {
      type: String,
      required: true,
      trim: true,
      index: true // Format: YYYY-MM-DD
    },
    sequenceNumber: {
      type: Number,
      required: true
    },
    tokenNumber: {
      type: String,
      required: true,
      trim: true
    },
    displayCode: {
      type: String,
      required: true,
      trim: true
    },
    trackingUuid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    // Concurrency lock key: set to "${doctorId}_${date}_${normalizedPhone}" when active,
    // cleared to null when terminal/inactive. Enforced via unique partial index.
    activeBookingKey: {
      type: String,
      default: null
    },
    priority: {
      type: String,
      enum: Object.keys(PRIORITY_LEVELS),
      default: PRIORITY_LEVELS.STANDARD.key
    },
    // Priority Rank: 1 = Emergency, 2 = Elderly, 3 = Standard (sorted ascending)
    priorityRank: {
      type: Number,
      default: PRIORITY_LEVELS.STANDARD.rank
    },
    source: {
      type: String,
      enum: ['ONLINE', 'WALKIN', 'SMS'],
      default: 'ONLINE'
    },
    status: {
      type: String,
      enum: Object.values(TOKEN_STATUS),
      default: TOKEN_STATUS.WAITING,
      index: true
    },
    bookedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    calledAt: {
      type: Date,
      default: null
    },
    startedConsultationAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    skippedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    recalledAt: {
      type: Date,
      default: null
    },
    consultationDurationMinutes: {
      type: Number,
      default: null
    },
    estimatedWaitMinutes: {
      type: Number,
      default: 0
    },
    estimatedWaitDisplay: {
      type: String,
      default: ''
    },
    assignmentRationale: {
      type: String,
      default: 'DIRECT_DOCTOR_SELECTION',
      trim: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    nearTurnAlertSent: {
      type: Boolean,
      default: false
    },
    nearTurnAlertSentAt: {
      type: Date,
      default: null
    },
    isCheckedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    isNoShow: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index for per-doctor per-day queue queries: ordered by priorityRank ASC, bookedAt ASC
tokenSchema.index({ doctorId: 1, date: 1, status: 1, priorityRank: 1, bookedAt: 1 });

// Unique per-doctor-per-day tokenNumber index
tokenSchema.index({ doctorId: 1, date: 1, tokenNumber: 1 }, { unique: true });

// Unique per-doctor-per-day sequenceNumber index
tokenSchema.index({ doctorId: 1, date: 1, sequenceNumber: 1 }, { unique: true });

// Safe concurrency index: Only active tokens hold a non-null activeBookingKey string
tokenSchema.index(
  { activeBookingKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      activeBookingKey: { $type: 'string' }
    }
  }
);

export const Token = mongoose.model('Token', tokenSchema);
