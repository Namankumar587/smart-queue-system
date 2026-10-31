import { Router } from 'express';
import { login, signup, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateLoginInput } from '../validators/auth.validator.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', authLimiter, validateLoginInput, login);

// POST /api/v1/auth/signup & /register
router.post('/signup', authLimiter, signup);
router.post('/register', authLimiter, signup);

// GET /api/v1/auth/me
router.get('/me', authenticate, getMe);

export default router;
