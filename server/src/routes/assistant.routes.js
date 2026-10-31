import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  handleSmsInboundController,
  handleAssistantChatController,
  handlePatientFaqController,
  handleStaffCopilotController
} from '../controllers/assistant.controller.js';

const router = Router();

// Per-user rate limit for assistant endpoints (15 requests per minute per IP)
const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many assistant requests. Please wait a minute before asking again.'
  }
});

// POST /api/v1/assistant/sms-inbound (Inbound SMS intent parser)
router.post('/sms-inbound', assistantLimiter, handleSmsInboundController);

// POST /api/v1/assistant/chat (Web assistant interface)
router.post('/chat', assistantLimiter, handleAssistantChatController);

// POST /api/v1/assistant/patient-faq (PROMPT 27: Grounded patient FAQ)
router.post('/patient-faq', assistantLimiter, handlePatientFaqController);

// GET /api/v1/assistant/staff-copilot (PROMPT 27: Authenticated read-only staff copilot)
router.get('/staff-copilot', requireAuth, assistantLimiter, handleStaffCopilotController);

export default router;
