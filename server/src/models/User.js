import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Staff member name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.RECEPTIONIST
    },
    doctorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockoutUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Method to verify candidate password against bcrypt hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
