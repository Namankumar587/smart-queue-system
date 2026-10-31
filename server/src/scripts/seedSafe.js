import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Clinic } from '../models/Clinic.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';

/**
 * Safe Production & Staging Seed Procedure
 * Idempotent: Never drops collections, never deletes active tokens or queues.
 * Only provisions baseline administrative user, default clinic, and doctor profiles if absent.
 */
export const seedSafe = async () => {
  console.log('[Safe Seed] Checking database baseline without wiping existing data...');
  await connectDB();

  try {
    // 1. Ensure baseline Clinic exists
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
      console.log(`[Safe Seed] Initialized default clinic: ${clinic.name}`);
    } else {
      console.log(`[Safe Seed] Clinic profile already present: ${clinic.name}`);
    }

    // 2. Ensure baseline Doctors exist
    const doctorCount = await Doctor.countDocuments();
    let initialDoctors = [];
    if (doctorCount === 0) {
      initialDoctors = await Doctor.insertMany([
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
      console.log(`[Safe Seed] Initialized ${initialDoctors.length} baseline doctor profiles.`);
    } else {
      console.log(`[Safe Seed] Doctor profiles already exist (${doctorCount} present).`);
    }

    // 3. Ensure System Administrator exists
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
      console.log(`[Safe Seed] Successfully created initial administrator account: ${adminEmail}`);
    } else {
      console.log(`[Safe Seed] Administrator account already exists: ${existingAdmin.email}. Preserving credentials.`);
    }

    // 4. Ensure Front Desk Receptionist exists
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
      console.log(`[Safe Seed] Initialized front desk receptionist account: ${receptionEmail}`);
    } else {
      console.log(`[Safe Seed] Receptionist account already exists: ${existingReception.email}`);
    }

    console.log('[Safe Seed] Safe seed completed successfully. Active tokens and audit logs untouched.');
  } catch (error) {
    console.error('[Safe Seed] Seed failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('seedSafe.js')) {
  seedSafe().then(() => {
    process.exit(0);
  });
}
