import { Doctor } from '../models/Doctor.js';
import { Token } from '../models/Token.js';
import { Clinic } from '../models/Clinic.js';
import { TOKEN_STATUS } from '../config/constants.js';

export const getReceptionOverviewData = async () => {
  const doctors = await Doctor.find({ isAvailable: true }).populate('clinicId', 'name');

  const queues = await Promise.all(
    doctors.map(async (doc) => {
      const waitingCount = await Token.countDocuments({
        doctorId: doc._id,
        status: TOKEN_STATUS.WAITING
      });

      const activeToken = await Token.findOne({
        doctorId: doc._id,
        status: { $in: [TOKEN_STATUS.CALLED, TOKEN_STATUS.IN_CONSULTATION] }
      });

      return {
        doctorId: doc._id,
        doctorName: doc.name,
        doctorCode: doc.doctorCode,
        department: doc.department,
        roomNumber: doc.roomNumber,
        waitingCount,
        activeToken: activeToken
          ? {
              tokenNumber: activeToken.tokenNumber,
              displayCode: activeToken.displayCode,
              status: activeToken.status,
              priority: activeToken.priority
            }
          : null
      };
    })
  );

  return {
    totalDoctors: doctors.length,
    queues
  };
};

export const getClinicAnalyticsData = async () => {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const totalToday = await Token.countDocuments({ createdAt: { $gte: todayStart } });
  const completedToday = await Token.countDocuments({
    status: TOKEN_STATUS.COMPLETED,
    completedAt: { $gte: todayStart }
  });
  const skippedToday = await Token.countDocuments({
    status: TOKEN_STATUS.SKIPPED,
    createdAt: { $gte: todayStart }
  });
  const waitingCurrent = await Token.countDocuments({ status: TOKEN_STATUS.WAITING });

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
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    metrics: {
      totalToday,
      completedToday,
      skippedToday,
      waitingCurrent
    },
    departments: departmentBreakdown.map((d) => ({
      department: d._id,
      tokenCount: d.count
    }))
  };
};

export const listAllDoctors = async () => {
  return Doctor.find().populate('clinicId', 'name code').sort({ name: 1 });
};

export const createNewDoctor = async ({ clinicId, name, department, roomNumber, avgConsultMinutes }) => {
  let targetClinicId = clinicId;
  if (!targetClinicId) {
    const defaultClinic = await Clinic.findOne();
    if (!defaultClinic) {
      throw new Error('No clinic found. Please seed or create a clinic first.');
    }
    targetClinicId = defaultClinic._id;
  }

  return Doctor.create({
    clinicId: targetClinicId,
    name,
    department,
    roomNumber,
    avgConsultMinutes: avgConsultMinutes || 10
  });
};

export const updateDoctorProfile = async (doctorId, updates) => {
  const sanitizedUpdates = {};
  if (typeof updates.isAvailable === 'boolean') sanitizedUpdates.isAvailable = updates.isAvailable;
  if (updates.avgConsultMinutes) sanitizedUpdates.avgConsultMinutes = updates.avgConsultMinutes;
  if (updates.roomNumber) sanitizedUpdates.roomNumber = updates.roomNumber;

  const doctor = await Doctor.findByIdAndUpdate(doctorId, { $set: sanitizedUpdates }, { new: true });
  if (!doctor) {
    throw new Error('Doctor not found');
  }
  return doctor;
};
