import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Clinic } from '../models/Clinic.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { Token } from '../models/Token.js';
import { Counter } from '../models/Counter.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { ROLES, TOKEN_STATUS } from '../config/constants.js';

const seed = async () => {
  console.log('[Seed] Starting comprehensive database seed for GL Bajaj Smart Queue System...');

  // Production data wipe safety guard
  if (env.NODE_ENV === 'production' && !process.argv.includes('--force-production-wipe')) {
    console.error(
      '\n[CAUTION] Destructive database wipe prevented in PRODUCTION environment!\n' +
      'To seed administrative accounts safely without losing queue data, run:\n' +
      '  npm run seed:safe\n' +
      'To forcefully wipe production data, re-run with --force-production-wipe flag.\n'
    );
    process.exit(1);
  }

  await connectDB();

  try {
    // 1. Wipe all collections cleanly
    await Promise.all([
      Clinic.deleteMany({}),
      Doctor.deleteMany({}),
      Patient.deleteMany({}),
      User.deleteMany({}),
      Token.deleteMany({}),
      Counter.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log('[Seed] Purged existing database collections.');

    // 2. Seed Model Clinic
    const clinic = await Clinic.create({
      name: 'GL Bajaj Community Health Center (Model Demo)',
      code: 'GLB-CLINIC-DEMO',
      address: 'Plot No. 2, Knowledge Park III, Greater Noida, UP 201306',
      phone: '+91-120-2323818',
      operatingHours: { open: '08:30', close: '17:30' },
      timezone: 'Asia/Kolkata',
      isActive: true
    });
    console.log(`[Seed] Seeded Clinic: ${clinic.name}`);

    // 3. Seed Obviously Fake Demo Doctors
    const doctorsData = [
      {
        clinicId: clinic._id,
        doctorCode: 'DOC-GEN-101',
        name: 'Dr. Priya Sharma (Demo)',
        department: 'General Medicine',
        roomNumber: 'Room 101',
        avgConsultMinutes: 10,
        isAvailable: true,
        schedule: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '09:00',
          endTime: '17:00'
        },
        consultationStats: { totalConsultations: 142, avgWaitMinutes: 9, lastConsultationAt: new Date() }
      },
      {
        clinicId: clinic._id,
        doctorCode: 'DOC-PED-102',
        name: 'Dr. Amit Verma (Demo)',
        department: 'Pediatrics',
        roomNumber: 'Room 102',
        avgConsultMinutes: 12,
        isAvailable: true,
        schedule: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          startTime: '09:30',
          endTime: '16:30'
        },
        consultationStats: { totalConsultations: 98, avgWaitMinutes: 11, lastConsultationAt: new Date() }
      },
      {
        clinicId: clinic._id,
        doctorCode: 'DOC-DERM-103',
        name: 'Dr. Sneha Patel (Demo)',
        department: 'Dermatology',
        roomNumber: 'Room 103',
        avgConsultMinutes: 15,
        isAvailable: true,
        schedule: {
          days: ['Tuesday', 'Thursday', 'Saturday'],
          startTime: '10:00',
          endTime: '15:00'
        },
        consultationStats: { totalConsultations: 64, avgWaitMinutes: 14, lastConsultationAt: new Date() }
      }
    ];

    const doctors = await Doctor.insertMany(doctorsData);
    console.log(`[Seed] Seeded ${doctors.length} demo doctors.`);

    // 4. Seed Obviously Fake Demo Patients
    const patientsData = [
      {
        name: 'Aarav Patel (Fake Demo Patient)',
        phone: '+91 99999 00001',
        normalizedPhone: '+919999900001',
        gender: 'MALE',
        age: 28
      },
      {
        name: 'Sunita Rao (Fake Demo Senior Citizen)',
        phone: '+91 99999 00002',
        normalizedPhone: '+919999900002',
        gender: 'FEMALE',
        age: 68
      },
      {
        name: 'Kabir Mehta (Fake Demo Emergency Walkin)',
        phone: '+91 99999 00003',
        normalizedPhone: '+919999900003',
        gender: 'MALE',
        age: 34
      }
    ];

    const patients = await Patient.insertMany(patientsData);
    console.log(`[Seed] Seeded ${patients.length} fake demo patients.`);

    // 5. Hash Safe Demonstration Staff Password
    const demoPassword = env.SEED_DEFAULT_PASSWORD;
    const passwordHash = await bcrypt.hash(demoPassword, 10);

    // 6. Seed Staff User Accounts
    const usersData = [
      {
        name: 'System Administrator (GL Bajaj)',
        email: 'admin@glbitm.ac.in',
        passwordHash,
        role: ROLES.ADMIN
      },
      {
        name: 'Front Desk Receptionist',
        email: 'reception@glbitm.ac.in',
        passwordHash,
        role: ROLES.RECEPTIONIST
      },
      {
        name: 'Dr. Priya Sharma (Demo)',
        email: 'priya.sharma@glbitm.ac.in',
        passwordHash,
        role: ROLES.DOCTOR,
        doctorProfileId: doctors[0]._id
      },
      {
        name: 'Dr. Amit Verma (Demo)',
        email: 'amit.verma@glbitm.ac.in',
        passwordHash,
        role: ROLES.DOCTOR,
        doctorProfileId: doctors[1]._id
      },
      {
        name: 'Dr. Sneha Patel (Demo)',
        email: 'sneha.patel@glbitm.ac.in',
        passwordHash,
        role: ROLES.DOCTOR,
        doctorProfileId: doctors[2]._id
      }
    ];

    const users = await User.insertMany(usersData);
    console.log(`[Seed] Seeded ${users.length} staff accounts.`);

    // 7. Seed Initial Active Tokens
    const todayStr = new Date().toISOString().split('T')[0];

    const token1 = await Token.create({
      clinicId: clinic._id,
      doctorId: doctors[0]._id,
      patientId: patients[1]._id,
      patientName: patients[1].name,
      patientPhone: patients[1].phone,
      normalizedPhone: patients[1].normalizedPhone,
      date: todayStr,
      sequenceNumber: 1,
      tokenNumber: 'T-001',
      displayCode: `${doctors[0].doctorCode}-001`,
      trackingUuid: '11111111-1111-4111-8111-111111111111',
      activeBookingKey: `${doctors[0]._id}_${todayStr}_${patients[1].normalizedPhone}`,
      priority: 'ELDERLY',
      priorityRank: 5,
      source: 'WALKIN',
      status: TOKEN_STATUS.WAITING,
      estimatedWaitMinutes: 0,
      notes: 'Demo: Senior citizen walk-in'
    });

    const token2 = await Token.create({
      clinicId: clinic._id,
      doctorId: doctors[0]._id,
      patientId: patients[0]._id,
      patientName: patients[0].name,
      patientPhone: patients[0].phone,
      normalizedPhone: patients[0].normalizedPhone,
      date: todayStr,
      sequenceNumber: 2,
      tokenNumber: 'T-002',
      displayCode: `${doctors[0].doctorCode}-002`,
      trackingUuid: '22222222-2222-4222-8222-222222222222',
      activeBookingKey: `${doctors[0]._id}_${todayStr}_${patients[0].normalizedPhone}`,
      priority: 'STANDARD',
      priorityRank: 1,
      source: 'ONLINE',
      status: TOKEN_STATUS.WAITING,
      estimatedWaitMinutes: 10,
      notes: 'Demo: Routine checkup'
    });

    // Initialize daily counter for Doctor 1
    await Counter.create({
      key: `doc_${doctors[0]._id}_${todayStr}`,
      sequenceDate: todayStr,
      currentSeq: 2
    });

    // 8. Seed Sample Audit Log and Notification
    await AuditLog.create({
      action: 'SYSTEM_INITIALIZED',
      performedBy: users[0]._id,
      performedByRole: 'ADMIN',
      targetType: 'SYSTEM',
      targetId: null,
      details: { environment: 'development', seededClinic: clinic.name }
    });

    await Notification.create({
      tokenId: token1._id,
      recipientPhone: patients[1].normalizedPhone,
      channel: 'SMS',
      type: 'BOOKING_CONFIRMATION',
      message: `[GL Bajaj Demo] Token ${token1.displayCode} confirmed for ${doctors[0].name}. Track: ${token1.trackingUuid}`,
      status: 'SIMULATED'
    });

    console.log(`[Seed] Seeded ${2} demo tokens with counters, notification, and audit trail.`);

    console.log('\n=============================================================');
    console.log('  GL BAJAJ SMART QUEUE SYSTEM - SEED COMPLETED SAFELY');
    console.log('=============================================================');
    console.log(`  Staff Demo Password: ${demoPassword}`);
    console.log('  Admin User:          admin@glbitm.ac.in');
    console.log('  Receptionist:        reception@glbitm.ac.in');
    console.log('  Doctor 1:            priya.sharma@glbitm.ac.in (DOC-GEN-101)');
    console.log('  Doctor 2:            amit.verma@glbitm.ac.in (DOC-PED-102)');
    console.log('  Doctor 3:            sneha.patel@glbitm.ac.in (DOC-DERM-103)');
    console.log('  Active Tracking ID:  11111111-1111-4111-8111-111111111111 (T-001)');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
  } finally {
    await disconnectDB();
    console.log('[Seed] Process finished.');
    process.exit(0);
  }
};

seed();
