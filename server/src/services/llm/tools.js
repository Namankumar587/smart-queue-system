import { Doctor } from '../../models/Doctor.js';
import { Clinic } from '../../models/Clinic.js';

/**
 * Read-Only Trusted Context Tools
 * CRITICAL ARCHITECTURAL INVARIANT:
 * This module exports strictly READ-ONLY data lookups.
 * It contains ZERO methods for creating tokens, modifying queues, or executing writes.
 */

/**
 * Retrieves the currently active and available doctors from the database.
 * Used as trusted context for the LLM prompt.
 */
export const getActiveDoctorList = async () => {
  const doctors = await Doctor.find({ isAvailable: true }).select(
    '_id doctorCode name department roomNumber avgConsultMinutes schedule'
  );

  return doctors.map((doc) => ({
    id: doc._id.toString(),
    code: doc.doctorCode,
    name: doc.name,
    department: doc.department,
    room: doc.roomNumber,
    availableDays: doc.schedule?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  }));
};

/**
 * Retrieves the trusted clinic operating schedule and limits.
 */
export const getClinicRulesContext = async () => {
  const clinic = await Clinic.findOne({ isActive: true });
  const today = new Date().toISOString().split('T')[0];

  return {
    today,
    openTime: clinic?.operatingHours?.open || '08:30',
    closeTime: clinic?.operatingHours?.close || '17:30',
    timezone: clinic?.timezone || 'Asia/Kolkata',
    maxAdvanceDays: 7
  };
};

/**
 * Verifies if a given doctorId (or code) exists and is active.
 * @param {string} doctorIdOrCode
 * @param {Array} activeDoctorsList
 * @returns {Object|null}
 */
export const resolveActiveDoctor = (doctorIdOrCode, activeDoctorsList = []) => {
  if (!doctorIdOrCode) return null;
  const target = String(doctorIdOrCode).trim().toLowerCase();

  return (
    activeDoctorsList.find(
      (doc) =>
        doc.id.toLowerCase() === target ||
        doc.code.toLowerCase() === target ||
        doc.name.toLowerCase().includes(target)
    ) || null
  );
};

/**
 * Validates requested date string against clinic rules.
 * Rule: must be today or within 7 days in future; cannot be in past; day of week must match.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Object} rules - Clinic rules
 * @param {Array} doctorScheduleDays - Optional doctor's available days
 * @returns {{ isValid: boolean, normalizedDate: string|null, reason: string|null }}
 */
export const validateBookingDate = (dateStr, rules, doctorScheduleDays = null) => {
  const todayStr = rules?.today || new Date().toISOString().split('T')[0];

  // If no date provided, default to today
  if (!dateStr || dateStr.toLowerCase() === 'today') {
    return { isValid: true, normalizedDate: todayStr, reason: null };
  }

  // Parse YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { isValid: false, normalizedDate: null, reason: 'Date format must be YYYY-MM-DD' };
  }

  const requestedDate = new Date(`${dateStr}T00:00:00Z`);
  const todayDate = new Date(`${todayStr}T00:00:00Z`);

  if (isNaN(requestedDate.getTime())) {
    return { isValid: false, normalizedDate: null, reason: 'Invalid calendar date' };
  }

  if (requestedDate < todayDate) {
    return { isValid: false, normalizedDate: null, reason: 'Cannot book for a date in the past' };
  }

  // Check 7-day advance booking limit
  const maxAdvanceMs = (rules.maxAdvanceDays || 7) * 24 * 60 * 60 * 1000;
  if (requestedDate.getTime() - todayDate.getTime() > maxAdvanceMs) {
    return {
      isValid: false,
      normalizedDate: null,
      reason: `Advance bookings are only permitted up to ${rules.maxAdvanceDays || 7} days ahead`
    };
  }

  // Validate doctor schedule days if supplied
  if (doctorScheduleDays && doctorScheduleDays.length > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const requestedDay = dayNames[requestedDate.getUTCDay()];
    if (!doctorScheduleDays.includes(requestedDay)) {
      return {
        isValid: false,
        normalizedDate: null,
        reason: `Doctor is not scheduled on ${requestedDay}s. Available days: ${doctorScheduleDays.join(', ')}`
      };
    }
  }

  return { isValid: true, normalizedDate: dateStr, reason: null };
};
