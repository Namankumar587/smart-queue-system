import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: [true, 'Clinic ID is required'],
      index: true
    },
    doctorCode: {
      type: String,
      required: [true, 'Doctor code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number / counter is required'],
      trim: true
    },
    avgConsultMinutes: {
      type: Number,
      default: 10,
      min: [2, 'Consultation duration must be at least 2 minutes'],
      max: [60, 'Consultation duration cannot exceed 60 minutes']
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    schedule: {
      days: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    consultationStats: {
      totalConsultations: {
        type: Number,
        default: 0
      },
      avgWaitMinutes: {
        type: Number,
        default: 0
      },
      lastConsultationAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

doctorSchema.index({ clinicId: 1, department: 1, isAvailable: 1 });

export const Doctor = mongoose.model('Doctor', doctorSchema);
