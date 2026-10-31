import mongoose from 'mongoose';
import { Doctor } from '../models/Doctor.js';
import { Token } from '../models/Token.js';
import { TOKEN_STATUS, ROLES } from '../config/constants.js';
import { updateTokenStatus } from './queue.service.js';

export const verifyDoctorQueueAccess = (staffUser, targetDoctorId) => {
  if (!staffUser) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  if (staffUser.role === ROLES.ADMIN || staffUser.role === ROLES.RECEPTIONIST) {
    return true; // Admin and Receptionist have supervisory / front-desk access across all doctor queues
  }

  if (staffUser.role === ROLES.DOCTOR) {
    const userDoctorId = staffUser.doctorProfileId?._id?.toString() || staffUser.doctorProfileId?.toString();
    if (!userDoctorId) {
      const error = new Error('Doctor profile unlinked or not configured');
      error.statusCode = 403;
      throw error;
    }

    if (userDoctorId !== targetDoctorId.toString()) {
      const error = new Error("Unauthorized: Doctors cannot access or manage another doctor's queue");
      error.statusCode = 403;
      throw error;
    }
    return true;
  }

  const error = new Error('Unauthorized: Insufficient privileges for doctor queue');
  error.statusCode = 403;
  throw error;
};

export const getDoctorQueueData = async (targetDoctorId, staffUser) => {
  // Service-level doctor ownership check
  verifyDoctorQueueAccess(staffUser, targetDoctorId);

  const doctor = await Doctor.findById(targetDoctorId);
  if (!doctor) {
    throw new Error('Doctor profile not found');
  }

  // Active tokens in the doctor's queue sorted deterministically
  const activeTokens = await Token.find({
    doctorId: targetDoctorId,
    status: { $in: [TOKEN_STATUS.WAITING, TOKEN_STATUS.CALLED, TOKEN_STATUS.IN_CONSULTATION, TOKEN_STATUS.SKIPPED] }
  }).sort({
    priorityRank: 1,
    bookedAt: 1
  });

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const completedToday = await Token.countDocuments({
    doctorId: targetDoctorId,
    status: TOKEN_STATUS.COMPLETED,
    completedAt: { $gte: todayStart }
  });

  return {
    doctor: {
      id: doctor._id,
      name: doctor.name,
      doctorCode: doctor.doctorCode,
      department: doctor.department,
      roomNumber: doctor.roomNumber,
      isAvailable: doctor.isAvailable
    },
    queue: activeTokens,
    stats: {
      waitingCount: activeTokens.filter((t) => t.status === TOKEN_STATUS.WAITING).length,
      completedToday
    }
  };
};

export const processDoctorAction = async (tokenId, action, staffUser) => {
  const isObjectId = mongoose.isValidObjectId(tokenId);
  const token = isObjectId
    ? await Token.findById(tokenId)
    : await Token.findOne({ trackingUuid: tokenId });

  if (!token) {
    const error = new Error('Token not found');
    error.statusCode = 404;
    throw error;
  }

  // Service-level ownership check: Doctor can only action their own tokens
  verifyDoctorQueueAccess(staffUser, token.doctorId);

  const actionToStatusMap = {
    call_next: TOKEN_STATUS.CALLED,
    start_consultation: TOKEN_STATUS.IN_CONSULTATION,
    complete: TOKEN_STATUS.COMPLETED,
    skip: TOKEN_STATUS.SKIPPED,
    no_show: TOKEN_STATUS.SKIPPED,
    recall: TOKEN_STATUS.WAITING,
    cancel: TOKEN_STATUS.CANCELLED
  };

  const targetStatus = actionToStatusMap[action];
  if (!targetStatus) {
    const error = new Error(`Unrecognized action: ${action}`);
    error.statusCode = 400;
    throw error;
  }

  if (action === 'no_show') {
    await Token.findByIdAndUpdate(token._id, { $set: { isNoShow: true } });
  }

  return updateTokenStatus(token._id, targetStatus, staffUser);
};
