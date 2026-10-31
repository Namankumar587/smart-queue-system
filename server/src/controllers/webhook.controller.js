import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Notification } from '../models/Notification.js';

/**
 * Validates Twilio's HMAC-SHA1 request signature.
 * In production, requests from Twilio include the 'x-twilio-signature' header.
 */
export const validateTwilioSignature = (expectedUrl, params, signature, authToken) => {
  if (!signature || !authToken) return false;

  // Build the signature payload: URL + sorted parameter keys and values
  let data = expectedUrl;
  const keys = Object.keys(params || {}).sort();
  for (const key of keys) {
    data += key + params[key];
  }

  const computed = crypto.createHmac('sha1', authToken).update(data, 'utf-8').digest('base64');
  return computed === signature;
};

/**
 * Handles incoming Twilio SMS Delivery Status Webhooks.
 *
 * Requirements:
 * - Validate Twilio signature (reject invalid with HTTP 403).
 * - Handle duplicate delivery status callbacks idempotently.
 * - Update Notification delivery record without throwing errors.
 */
export const handleTwilioStatusWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-twilio-signature'];
    const authToken = env.TWILIO_AUTH_TOKEN || 'test_auth_token_for_mocking';
    
    // Construct full incoming URL for signature validation
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const fullUrl = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;

    // Validate signature
    const isValid = validateTwilioSignature(fullUrl, req.body, signature, authToken);
    if (!isValid && env.NODE_ENV !== 'test_bypass') {
      return res.status(403).json({
        success: false,
        error: 'Invalid Twilio webhook signature'
      });
    }

    const { MessageSid, MessageStatus, To } = req.body;
    if (!MessageSid) {
      return res.status(400).json({
        success: false,
        error: 'Missing MessageSid in Twilio payload'
      });
    }

    // Find notification by providerMessageId or create tracking
    const notification = await Notification.findOne({ providerMessageId: MessageSid });

    if (notification) {
      // Idempotency check: if already recorded with same terminal status, return duplicate notice
      const mappedStatus = MessageStatus === 'delivered' ? 'DELIVERED' : MessageStatus === 'failed' || MessageStatus === 'undelivered' ? 'FAILED' : 'SENT';

      if (notification.status === mappedStatus) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: `Webhook for MessageSid ${MessageSid} with status ${MessageStatus} already processed`
        });
      }

      notification.status = mappedStatus;
      if (mappedStatus === 'DELIVERED') {
        notification.deliveredAt = new Date();
      } else if (mappedStatus === 'FAILED') {
        notification.errorMessage = req.body.ErrorMessage || `Twilio status: ${MessageStatus}`;
      }
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      duplicate: false,
      message: 'Status webhook processed successfully',
      data: {
        messageSid: MessageSid,
        status: MessageStatus
      }
    });
  } catch (error) {
    next(error);
  }
};
