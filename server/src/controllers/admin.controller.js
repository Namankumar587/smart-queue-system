import {
  listAllDoctors,
  createNewDoctor,
  updateDoctorProfile
} from '../services/clinic.service.js';
import { createStaffAccount } from '../services/auth.service.js';
import {
  listStaffUsers,
  toggleStaffStatus,
  resetStaffPassword,
  getClinicSettings,
  updateClinicSettings,
  getAuditLogs,
  getDetailedClinicAnalytics
} from '../services/admin.service.js';

export const getAnalytics = async (req, res, next) => {
  try {
    const data = await getDetailedClinicAnalytics();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const listDoctors = async (req, res, next) => {
  try {
    const doctors = await listAllDoctors();
    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const doctor = await createNewDoctor(req.body);
    res.status(201).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const updateDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const doctor = await updateDoctorProfile(doctorId, req.body);
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const listStaff = async (req, res, next) => {
  try {
    const staff = await listStaffUsers();
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, doctorProfileId } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, password, and role are required'
      });
    }

    const newStaff = await createStaffAccount({ name, email, password, role, doctorProfileId });
    res.status(201).json({ success: true, data: newStaff });
  } catch (error) {
    next(error);
  }
};

export const updateStaffStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const updated = await toggleStaffStatus(userId, isActive, req.user);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const handleResetStaffPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const result = await resetStaffPassword(userId, newPassword, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await getClinicSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const updated = await updateClinicSettings(req.body, req.user);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const listAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, action, targetType } = req.query;
    const data = await getAuditLogs({ page, limit, action, targetType });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getSmsDiagnostics = async (req, res, next) => {
  try {
    const { getSmsProviderDiagnostics } = await import('../services/sms.service.js');
    res.status(200).json({ success: true, data: getSmsProviderDiagnostics() });
  } catch (error) {
    next(error);
  }
};

export const testSmsDispatch = async (req, res, next) => {
  try {
    const { recipientPhone, message } = req.body || {};
    if (!recipientPhone) {
      return res.status(400).json({ success: false, error: 'Recipient phone number is required' });
    }
    const { sendSMS } = await import('../services/sms.service.js');
    const result = await sendSMS(recipientPhone, message || 'Test alert from Smart Queue Medical Clinic.');
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
