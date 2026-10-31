import mongoose from 'mongoose';

const clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Clinic name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Clinic code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    operatingHours: {
      open: { type: String, default: '08:30' },
      close: { type: String, default: '17:30' }
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    defaultConsultationMinutes: {
      type: Number,
      default: 10,
      min: [2, 'Default consultation must be at least 2 minutes'],
      max: [60, 'Default consultation cannot exceed 60 minutes']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Clinic = mongoose.model('Clinic', clinicSchema);
