import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Clinic } from '../models/Clinic.js';
import { env } from '../config/env.js';

export const loginStaff = async (email, password) => {
  const normalizedEmail = String(email || '').toLowerCase().trim();

  // 1. Find user by email
  const user = await User.findOne({ email: normalizedEmail }).populate('doctorProfileId');

  // Generic invalid credentials message to prevent account enumeration
  const GENERIC_AUTH_ERROR = 'Invalid email or password';

  if (!user) {
    throw new Error(GENERIC_AUTH_ERROR);
  }

  // 2. Disabled account check
  if (!user.isActive) {
    const disabledError = new Error('Account is disabled. Please contact the clinic administrator.');
    disabledError.statusCode = 403;
    throw disabledError;
  }

  // 3. Temporary lockout check (15 minutes after 5 failures)
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockoutUntil - new Date()) / 60000);
    const lockoutError = new Error(
      `Account is temporarily locked due to repeated failed login attempts. Please try again in ${minutesLeft} minute(s).`
    );
    lockoutError.statusCode = 423; // HTTP 423 Locked
    throw lockoutError;
  }

  // 4. Constant-time password comparison against bcrypt hash
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
    }
    await user.save();
    throw new Error(GENERIC_AUTH_ERROR);
  }

  // 5. Successful login: Reset failure counters
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;

  // Resolve & backfill clinicId if missing
  let clinicId = user.clinicId?._id || user.clinicId || null;
  if (!clinicId && user.doctorProfileId?.clinicId) {
    clinicId = user.doctorProfileId.clinicId;
    user.clinicId = clinicId;
  }
  if (!clinicId) {
    const primaryClinic = (await Clinic.findOne({ isActive: true })) || (await Clinic.findOne());
    if (primaryClinic) {
      clinicId = primaryClinic._id;
      user.clinicId = clinicId;
    }
  }

  await user.save();

  const doctorId = user.doctorProfileId?._id || user.doctorProfileId || null;

  // 6. Return signed JWT with subject, role, doctorId, and clinicId
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      id: user._id,
      email: user.email,
      role: user.role,
      doctorId,
      clinicId
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      doctorId,
      clinicId,
      doctorProfile: user.doctorProfileId || null
    }
  };
};

export const createStaffAccount = async ({ name, email, password, role, doctorProfileId, clinicId }) => {
  const normalizedEmail = String(email || '').toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error(`Staff member with email ${normalizedEmail} already exists`);
    error.statusCode = 409;
    throw error;
  }

  let assignedClinicId = clinicId;
  if (!assignedClinicId) {
    const primaryClinic = (await Clinic.findOne({ isActive: true })) || (await Clinic.findOne());
    assignedClinicId = primaryClinic?._id || null;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    doctorProfileId: doctorProfileId || null,
    clinicId: assignedClinicId,
    isActive: true
  });

  return {
    id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    clinicId: newUser.clinicId,
    doctorProfileId: newUser.doctorProfileId
  };
};
