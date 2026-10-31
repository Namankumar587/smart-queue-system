import { Router } from 'express';
import { handleTwilioStatusWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// POST /api/v1/webhooks/twilio
router.post('/twilio', handleTwilioStatusWebhook);

export default router;
