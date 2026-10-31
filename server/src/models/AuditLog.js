import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      index: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    performedByRole: {
      type: String,
      enum: ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT_PUBLIC', 'SYSTEM'],
      required: true
    },
    targetType: {
      type: String,
      enum: ['TOKEN', 'DOCTOR', 'CLINIC', 'USER', 'SYSTEM'],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
