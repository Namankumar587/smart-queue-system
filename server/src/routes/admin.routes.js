import { Router } from 'express';
import {
  getAnalytics,
  listDoctors,
  createDoctor,
  updateDoctor,
  listStaff,
  createStaff,
  updateStaffStatus,
  handleResetStaffPassword,
  getSettings,
  updateSettings,
  listAuditLogs,
  getSmsDiagnostics,
  testSmsDispatch
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Publicly readable doctor list for public booking form dropdown
router.get('/doctors/public', listDoctors);

// Protected Admin routes (require valid JWT and ADMIN role)
router.use(authenticate);
router.use(requireRole(ROLES.ADMIN));

// Real Clinic Analytics
router.get('/analytics', getAnalytics);

// Doctor Management (CRUD & Availability/Deactivation)
router.get('/doctors', listDoctors);
router.post('/doctors', createDoctor);
router.patch('/doctors/:doctorId', updateDoctor);

// Staff Account Management
router.get('/staff', listStaff);
router.post('/staff', createStaff);
router.patch('/staff/:userId/status', updateStaffStatus);
router.patch('/staff/:userId/reset-password', handleResetStaffPassword);

// Clinic Operating Hours & Settings
router.get('/settings', getSettings);
router.patch('/settings', updateSettings);

// Paginated & Filterable Audit Logs
router.get('/audit-logs', listAuditLogs);

// SMS Provider Status Diagnostics & Test Dispatch
router.get('/sms/diagnostics', getSmsDiagnostics);
router.post('/sms/test', testSmsDispatch);

export default router;
