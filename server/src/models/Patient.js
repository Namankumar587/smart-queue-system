import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: [true, 'Patient phone number is required'],
      trim: true
    },
    normalizedPhone: {
      type: String,
      required: [true, 'Normalized phone is required'],
      trim: true,
      index: true
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED'],
      default: 'UNDISCLOSED'
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [130, 'Age cannot exceed 130'],
      default: null
    },
    lastVisitAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Patient = mongoose.model('Patient', patientSchema);
