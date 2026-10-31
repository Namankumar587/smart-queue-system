import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { Clinic } from '../models/Clinic.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';

/**
 * Auto-Bootstrap Baseline Data for Cloud & Local Environments
 * Idempotent: Only seeds if the database has zero doctor records.
 */
export const ensureBaselineData = async () => {
  try {
    const doctorCount = await Doctor.countDocuments();
    if (doctorCount > 0) {
      return;
    }

    console.log('[Bootstrap] Empty database detected. Auto-provisioning baseline clinic, doctors and staff...');

    let clinic = await Clinic.findOne();
    if (!clinic) {
      clinic = await Clinic.create({
        name: 'GL Bajaj Community Health Center',
        code: 'GLB-CLINIC-MAIN',
        address: 'Plot No. 2, Knowledge Park III, Greater Noida, UP 201306',
        phone: '+91-120-2323818',
        operatingHours: { open: '08:30', close: '17:30' },
        timezone: 'Asia/Kolkata',
        isActive: true
      });
      console.log(`[Bootstrap] Created clinic: ${clinic.name}`);
    }

    await Doctor.insertMany([
      {
        clinicId: clinic._id,
        doctorCode: 'DOC-GEN-101',
        name: 'Dr. Priya Sharma',
        department: 'General Medicine',
        roomNumber: 'Room 101',
        avgConsultMinutes: 10,
        isAvailable: true,
        schedule: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '09:00',
          endTime: '17:00'
        }
      },
      {
        clinicId: clinic._id,
        doctorCode: 'DOC-PED-102',
        name: 'Dr. Amit Verma',
        department: 'Pediatrics',
        roomNumber: 'Room 102',
        avgConsultMinutes: 12,
        isAvailable: true,
        schedule: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          startTime: '09:30',
          endTime: '16:30'
        }
      },
      {
        clinicId: clinic._id,
        doctorCode: 'DOC-DERM-103',
        name: 'Dr. Sneha Patel',
        department: 'Dermatology',
        roomNumber: 'Room 103',
        avgConsultMinutes: 15,
        isAvailable: true,
        schedule: {
          days: ['Tuesday', 'Thursday', 'Saturday'],
          startTime: '10:00',
          endTime: '15:00'
        }
      }
    ]);
    console.log('[Bootstrap] Created 3 baseline doctor profiles.');

    const adminEmail = (env.SEED_ADMIN_EMAIL || 'admin@glbitm.ac.in').toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const adminPassword = env.SEED_ADMIN_PASSWORD || 'DemoStaff@2026!';
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: 'System Administrator (GL Bajaj)',
        email: adminEmail,
        passwordHash,
        role: ROLES.ADMIN,
        isActive: true
      });
      console.log(`[Bootstrap] Created administrator: ${adminEmail}`);
    }

    const receptionEmail = 'reception@glbitm.ac.in';
    const existingReception = await User.findOne({ email: receptionEmail });
    if (!existingReception) {
      const staffPassword = env.SEED_DEFAULT_PASSWORD || 'DemoStaff@2026!';
      const passwordHash = await bcrypt.hash(staffPassword, 10);
      await User.create({
        name: 'Front Desk Receptionist',
        email: receptionEmail,
        passwordHash,
        role: ROLES.RECEPTIONIST,
        isActive: true
      });
      console.log(`[Bootstrap] Created receptionist: ${receptionEmail}`);
    }

    console.log('[Bootstrap] Cloud database successfully seeded with baseline data!');
  } catch (error) {
    console.warn('[Bootstrap Notice] Non-blocking bootstrap check error:', error.message);
  }
};
