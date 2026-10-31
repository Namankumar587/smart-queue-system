import { Router } from 'express';
import {
  bookToken,
  trackToken,
  getQRCode,
  requestStatusNotification,
  cancelPatientToken,
  streamTokenStatus,
  getPublicDisplay,
  streamPublicDisplay
} from '../controllers/token.controller.js';
import { validateBookingInput } from '../validators/token.validator.js';
import { bookingLimiter, phoneBookingLimiter, statusSmsLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// POST /api/v1/tokens/book (Throttled per IP and per Phone number)
router.post('/book', bookingLimiter, phoneBookingLimiter, validateBookingInput, bookToken);

// GET /api/v1/tokens/track/:trackingUuid (Zero PII, no-store headers)
router.get('/track/:trackingUuid', trackToken);

// POST /api/v1/tokens/track/:trackingUuid/cancel (Patient voluntary cancellation)
router.post('/track/:trackingUuid/cancel', cancelPatientToken);

// GET /api/v1/tokens/stream/:trackingUuid (Real-time SSE push updates)
router.get('/stream/:trackingUuid', streamTokenStatus);

// GET /api/v1/tokens/display/public (Waiting room TV overview)
router.get('/display/public', getPublicDisplay);

// GET /api/v1/tokens/display/stream (Waiting room TV real-time SSE push updates)
router.get('/display/stream', streamPublicDisplay);

// POST /api/v1/tokens/track/:trackingUuid/status-sms (On-demand patient status SMS, rate-limited)
router.post('/track/:trackingUuid/status-sms', statusSmsLimiter, requestStatusNotification);

// GET /api/v1/tokens/qr/:trackingUuid
router.get('/qr/:trackingUuid', getQRCode);

export default router;
