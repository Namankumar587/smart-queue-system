import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Skip rate limiting during standard tests unless explicit test header is provided
const shouldSkip = (req) => env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'];

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 login attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.'
  }
});

export const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Max 30 token bookings per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    error: 'Too many token requests. Please wait before booking again.'
  }
});

export const phoneBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 booking attempts per phone number per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  keyGenerator: (req) => {
    const raw = req.body?.patientPhone || '';
    const digits = String(raw).replace(/\D/g, '');
    return digits ? `phone_${digits}` : `ip_${req.ip || 'unknown'}`;
  },
  message: {
    success: false,
    error: 'Too many booking requests for this phone number. Please wait before attempting again.'
  }
});

export const statusSmsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 status SMS triggers per 10 minutes per IP/UUID
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  keyGenerator: (req) => {
    return req.params?.trackingUuid || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: 'Too many status notification requests. Please wait a few minutes before checking again.'
  }
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    error: 'Rate limit exceeded. Please slow down your requests.'
  }
});
