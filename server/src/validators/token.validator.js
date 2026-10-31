import mongoose from 'mongoose';
import { PRIORITY_LEVELS } from '../config/constants.js';

const ALLOWED_BOOKING_FIELDS = new Set([
  'doctorId',
  'department',
  'clinicId',
  'patientName',
  'patientPhone',
  'priority',
  'notes'
]);

export const validateBookingInput = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request payload: JSON object expected'
    });
  }

  // Strip non-allowlisted properties from req.body to prevent field injection
  for (const key of Object.keys(req.body)) {
    if (!ALLOWED_BOOKING_FIELDS.has(key)) {
      delete req.body[key];
    }
  }

  const { doctorId, department, patientName, patientPhone, priority } = req.body;

  if (!doctorId && (!department || typeof department !== 'string' || !department.trim())) {
    return res.status(400).json({
      success: false,
      error: 'Either a valid doctorId or a department name is required for booking'
    });
  }

  if (doctorId && !mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({
      success: false,
      error: 'Valid Doctor ID is required when doctorId is provided'
    });
  }

  if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Patient name must be at least 2 characters long'
    });
  }

  if (patientName.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Patient name must not exceed 100 characters'
    });
  }

  // Validate phone format (standard 8-15 digit phone string)
  const phoneCleaned = String(patientPhone || '').replace(/[\s-]/g, '');
  if (!phoneCleaned || phoneCleaned.length < 8 || phoneCleaned.length > 15) {
    return res.status(400).json({
      success: false,
      error: 'Valid contact phone number is required (8-15 digits)'
    });
  }

  if (priority && !PRIORITY_LEVELS[priority]) {
    return res.status(400).json({
      success: false,
      error: `Invalid priority level. Allowed values: ${Object.keys(PRIORITY_LEVELS).join(', ')}`
    });
  }

  next();
};

export const validateTokenAction = (req, res, next) => {
  const { action } = req.body || {};
  const validActions = ['call_next', 'start_consultation', 'complete', 'skip', 'recall', 'cancel', 'no_show'];

  if (!action || typeof action !== 'string' || !validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      error: `Invalid action. Allowed: ${validActions.join(', ')}`
    });
  }

  next();
};
