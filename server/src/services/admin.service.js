import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Clinic } from '../models/Clinic.js';
import { Doctor } from '../models/Doctor.js';
import { Token } from '../models/Token.js';
import { AuditLog } from '../models/AuditLog.js';
import { TOKEN_STATUS } from '../config/constants.js';

export const listStaffUsers = async () => {
  return User.find()
    .select('-passwordHash')
    .populate('doctorProfileId', 'name doctorCode department roomNumber')
    .sort({ createdAt: -1 });
};

export const toggleStaffStatus = async (userId, isActive, adminUser) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('Staff user not found');
    error.statusCode = 404;
    throw error;
  }

  // Prevent admin from disabling their own account
  if (adminUser && adminUser._id.toString() === user._id.toString() && !isActive) {
    const error = new Error('Administrators cannot disable their own active account');
    error.statusCode = 400;
    throw error;
  }

  user.isActive = Boolean(isActive);
  if (user.isActive) {
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
  }
  await user.save();

  await AuditLog.create({
    action: user.isActive ? 'STAFF_ACCOUNT_ENABLED' : 'STAFF_ACCOUNT_DISABLED',
    performedBy: adminUser?._id || null,
    performedByRole: 'ADMIN',
    targetType: 'USER',
    targetId: user._id,
    details: { targetEmail: user.email, targetRole: user.role, isActive: user.isActive }
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  };
};

export const resetStaffPassword = async (userId, newPassword, adminUser) => {
  if (!newPassword || newPassword.length < 6) {
    const error = new Error('Password must be at least 6 characters long');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('Staff user not found');
    error.statusCode = 404;
    throw error;
  }

  const saltRounds = 10;
  user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  await user.save();

  await AuditLog.create({
    action: 'STAFF_PASSWORD_RESET',
    performedBy: adminUser?._id || null,
    performedByRole: 'ADMIN',
    targetType: 'USER',
    targetId: user._id,
    details: { targetEmail: user.email, targetRole: user.role }
  });

  return { success: true, message: `Password successfully reset for ${user.email}` };
};

export const getClinicSettings = async () => {
  let clinic = await Clinic.findOne();
  if (!clinic) {
    clinic = await Clinic.create({
      name: 'GL Bajaj Community Health Center',
      code: 'GLB-CLINIC-01',
      operatingHours: { open: '08:30', close: '17:30' },
      defaultConsultationMinutes: 10,
      timezone: 'Asia/Kolkata',
      isActive: true
    });
  }
  return clinic;
};

export const updateClinicSettings = async (updates, adminUser) => {
  let clinic = await Clinic.findOne();
  if (!clinic) {
    clinic = new Clinic();
  }

  if (updates.name) clinic.name = updates.name.trim();
  if (updates.address !== undefined) clinic.address = updates.address.trim();
  if (updates.phone !== undefined) clinic.phone = updates.phone.trim();
  if (updates.timezone) clinic.timezone = updates.timezone.trim();
  if (updates.defaultConsultationMinutes) {
    clinic.defaultConsultationMinutes = Math.min(60, Math.max(2, Number(updates.defaultConsultationMinutes)));
  }
  if (updates.operatingHours) {
    if (updates.operatingHours.open) clinic.operatingHours.open = updates.operatingHours.open;
    if (updates.operatingHours.close) clinic.operatingHours.close = updates.operatingHours.close;
  }
  if (typeof updates.isActive === 'boolean') {
    clinic.isActive = updates.isActive;
  }

  await clinic.save();

  await AuditLog.create({
    action: 'CLINIC_SETTINGS_UPDATED',
    performedBy: adminUser?._id || null,
    performedByRole: 'ADMIN',
    targetType: 'CLINIC',
    targetId: clinic._id,
    details: { updates }
  });

  return clinic;
};

export const getAuditLogs = async ({ page = 1, limit = 20, action, targetType }) => {
  const query = {};
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum),
    AuditLog.countDocuments(query)
  ]);

  return {
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

export const getDetailedClinicAnalytics = async () => {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [
    totalToday,
    completedToday,
    skippedToday,
    waitingCurrent,
    inConsultationCurrent,
    calledCurrent,
    doctors
  ] = await Promise.all([
    Token.countDocuments({ createdAt: { $gte: todayStart } }),
    Token.countDocuments({ status: TOKEN_STATUS.COMPLETED, completedAt: { $gte: todayStart } }),
    Token.countDocuments({ status: TOKEN_STATUS.SKIPPED, createdAt: { $gte: todayStart } }),
    Token.countDocuments({ status: TOKEN_STATUS.WAITING }),
    Token.countDocuments({ status: TOKEN_STATUS.IN_CONSULTATION }),
    Token.countDocuments({ status: TOKEN_STATUS.CALLED }),
    Doctor.find().sort({ name: 1 })
  ]);

  // Compute average duration of today's completed consultations
  const completedTokens = await Token.find({
    status: TOKEN_STATUS.COMPLETED,
    completedAt: { $gte: todayStart }
  }).select('consultationDurationMinutes bookedAt completedAt');

  let avgConsultDuration = 0;
  let avgWaitDuration = 0;
  if (completedTokens.length > 0) {
    const totalConsultMinutes = completedTokens.reduce(
      (acc, t) => acc + (t.consultationDurationMinutes || 10),
      0
    );
    avgConsultDuration = Math.round(totalConsultMinutes / completedTokens.length);

    const totalWaitMinutes = completedTokens.reduce((acc, t) => {
      const wait = Math.max(0, Math.round((t.completedAt - t.bookedAt) / 60000));
      return acc + wait;
    }, 0);
    avgWaitDuration = Math.round(totalWaitMinutes / completedTokens.length);
  }

  // Department breakdown
  const departmentBreakdown = await Token.aggregate([
    { $match: { createdAt: { $gte: todayStart } } },
    {
      $lookup: {
        from: 'doctors',
        localField: 'doctorId',
        foreignField: '_id',
        as: 'doctor'
      }
    },
    { $unwind: '$doctor' },
    {
      $group: {
        _id: '$doctor.department',
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', TOKEN_STATUS.COMPLETED] }, 1, 0] }
        }
      }
    }
  ]);

  // Per-doctor workload statistics
  const doctorStats = await Promise.all(
    doctors.map(async (doc) => {
      const [docTotal, docCompleted, docWaiting] = await Promise.all([
        Token.countDocuments({ doctorId: doc._id, createdAt: { $gte: todayStart } }),
        Token.countDocuments({ doctorId: doc._id, status: TOKEN_STATUS.COMPLETED, completedAt: { $gte: todayStart } }),
        Token.countDocuments({ doctorId: doc._id, status: TOKEN_STATUS.WAITING })
      ]);
      return {
        doctorId: doc._id,
        name: doc.name,
        doctorCode: doc.doctorCode,
        department: doc.department,
        roomNumber: doc.roomNumber,
        isAvailable: doc.isAvailable,
        totalToday: docTotal,
        completedToday: docCompleted,
        waitingCurrent: docWaiting,
        avgConsultMinutes: doc.avgConsultMinutes
      };
    })
  );

  return {
    metrics: {
      totalToday,
      completedToday,
      skippedToday,
      waitingCurrent,
      activeCurrent: inConsultationCurrent + calledCurrent,
      avgConsultDurationMinutes: avgConsultDuration,
      avgWaitDurationMinutes: avgWaitDuration,
      completionRate: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
    },
    departments: departmentBreakdown.map((d) => ({
      department: d._id,
      total: d.total,
      completed: d.completed
    })),
    doctors: doctorStats
  };
};
