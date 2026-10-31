import { Router } from 'express';
import { registerWalkin, getReceptionOverview, checkInToken } from '../controllers/reception.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateBookingInput } from '../validators/token.validator.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Apply auth to all reception routes
router.use(authenticate);
router.use(requireRole(ROLES.RECEPTIONIST, ROLES.ADMIN));

// POST /api/v1/reception/walkin
router.post('/walkin', validateBookingInput, registerWalkin);

// POST /api/v1/reception/check-in
router.post('/check-in', checkInToken);

// GET /api/v1/reception/overview
router.get('/overview', getReceptionOverview);

export default router;
