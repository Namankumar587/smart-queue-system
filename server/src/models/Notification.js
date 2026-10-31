import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../config/smsTemplates.js';

const notificationSchema = new mongoose.Schema(
  {
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
      default: null,
      index: true
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    recipientPhone: {
      type: String,
      required: [true, 'Recipient phone is required'],
      trim: true
    },
    channel: {
      type: String,
      enum: ['SMS', 'IN_APP', 'WHATSAPP_FUTURE'],
      default: 'SMS'
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES).concat(['TURN_ALERT', 'CANCELLED']),
      required: true,
      index: true
    },
    dltTemplateId: {
      type: String,
      default: null
    },
    message: {
      type: String,
      required: [true, 'Notification message body is required']
    },
    status: {
      type: String,
      enum: ['SIMULATED', 'SENT', 'FAILED', 'DELIVERED'],
      default: 'SIMULATED',
      index: true
    },
    providerMessageId: {
      type: String,
      default: null
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    error: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
notificationSchema.index({ recipientPhone: 1, sentAt: -1 });
notificationSchema.index({ tokenId: 1, type: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
