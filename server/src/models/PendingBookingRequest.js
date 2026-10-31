import mongoose from 'mongoose';

/**
 * PendingBookingRequest Schema
 * Implements two-phase deterministic booking confirmation for SMS inbound requests.
 * The LLM parser creates this pending record only. The actual Token is created only
 * when the patient replies YES via a deterministic keyword handler.
 */
const pendingBookingRequestSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    doctorName: {
      type: String,
      required: true
    },
    targetDate: {
      type: String, // YYYY-MM-DD
      required: true
    },
    patientName: {
      type: String,
      default: 'SMS Inbound Patient'
    },
    priority: {
      type: String,
      default: 'STANDARD'
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING'
    },
    // Auto-expire unconfirmed requests after 15 minutes
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000),
      index: { expires: '15m' }
    }
  },
  {
    timestamps: true
  }
);

export const PendingBookingRequest = mongoose.model('PendingBookingRequest', pendingBookingRequestSchema);
