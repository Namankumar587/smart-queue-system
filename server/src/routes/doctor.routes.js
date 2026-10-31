import { Router } from 'express';
import { getMyQueue, handleDoctorAction } from '../controllers/doctor.controller.js';
import { authenticate, requireRole, verifyDoctorOwnership } from '../middleware/auth.middleware.js';
import { validateTokenAction } from '../validators/token.validator.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Apply auth to all doctor routes
router.use(authenticate);
router.use(requireRole(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.ADMIN));

// GET /api/v1/doctor/queue
router.get('/queue', getMyQueue);

// PATCH /api/v1/doctor/tokens/:tokenId/action
router.patch('/tokens/:tokenId/action', validateTokenAction, handleDoctorAction);

export default router;
