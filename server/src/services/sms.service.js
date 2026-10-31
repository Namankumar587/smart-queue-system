import { env } from '../config/env.js';
import { SMS_CONFIG } from '../config/smsTemplates.js';

/**
 * Masks phone numbers to protect patient PII in server logs and telemetry.
 * E.g., "+91-9876543210" -> "+91-******3210"
 */
export const maskPhoneNumber = (phone) => {
  if (!phone) return '—';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length < 4) return '******';
  const last4 = digits.slice(-4);
  const prefix = str.startsWith('+91') ? '+91-' : str.startsWith('+') ? '+' : '';
  return `${prefix}******${last4}`;
};

/**
 * Transmits an SMS message with automated masking, DLT metadata, and simulation mode.
 *
 * Trai DLT Mandate (India):
 * All promotional/transactional communications require registered Header ID and DLT template.
 * In local and evaluation environments (SMS_ENABLED=false), notifications execute in
 * simulated mode with zero carrier cost and masked PII.
 */
export const sendSMS = async (recipientPhone, messageBody, dltTemplateId = null) => {
  if (!recipientPhone || !messageBody) {
    return {
      sent: false,
      simulated: false,
      status: 'FAILED',
      error: 'Missing recipient phone number or message body'
    };
  }

  const masked = maskPhoneNumber(recipientPhone);

  // 1. Simulated Mode (Default for evaluation / development)
  if (!env.SMS_ENABLED) {
    console.log(`[SMS Simulation (SMS_ENABLED=false)] To: ${masked}${dltTemplateId ? ` [DLT: ${dltTemplateId}]` : ''}`);
    console.log(`[SMS Simulation Content]:\n"${messageBody}"\n`);
    return {
      sent: true,
      simulated: true,
      status: 'SIMULATED',
      sid: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      error: null
    };
  }

  // 2. Live SMS Integration (Fast2SMS India or Twilio Global)
  try {
    // Branch A: Fast2SMS India Gateway
    if (env.SMS_PROVIDER === 'FAST2SMS' || (env.FAST2SMS_API_KEY && !env.TWILIO_ACCOUNT_SID)) {
      if (!env.FAST2SMS_API_KEY) {
        console.warn(`[SMS Warning] Fast2SMS API key missing despite SMS_ENABLED=true. Simulating output to ${masked}.`);
        return {
          sent: true,
          simulated: true,
          status: 'SIMULATED',
          sid: null,
          error: 'Fast2SMS API key not configured'
        };
      }

      const clean10Digits = String(recipientPhone).replace(/\D/g, '').slice(-10);
      const fast2smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: messageBody,
          language: 'english',
          flash: 0,
          numbers: clean10Digits
        })
      });

      const fast2smsJson = await fast2smsRes.json();
      if (fast2smsJson.return) {
        console.log(`[SMS Fast2SMS Delivered] To: ${masked}, ReqID: ${fast2smsJson.request_id}`);
        return {
          sent: true,
          simulated: false,
          status: 'SENT',
          sid: fast2smsJson.request_id || `f2s_${Date.now()}`,
          error: null
        };
      } else {
        throw new Error(fast2smsJson.message || 'Fast2SMS delivery rejected');
      }
    }

    // Branch B: Twilio Global SMS Gateway
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      console.warn(`[SMS Warning] Live credentials missing despite SMS_ENABLED=true. Simulating output to ${masked}.`);
      return {
        sent: true,
        simulated: true,
        status: 'SIMULATED',
        sid: null,
        error: 'Live SMS credentials not configured'
      };
    }

    const twilioModule = await import('twilio');
    const twilioClient = twilioModule.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    const message = await twilioClient.messages.create({
      body: messageBody,
      from: env.TWILIO_PHONE_NUMBER || SMS_CONFIG.SENDER_ID,
      to: recipientPhone
    });

    console.log(`[SMS Live Delivered] To: ${masked}, SID: ${message.sid}`);
    return {
      sent: true,
      simulated: false,
      status: 'SENT',
      sid: message.sid,
      error: null
    };
  } catch (error) {
    // Non-blocking: SMS failure must never crash or undo transactions
    console.error(`[SMS Error] Failed to send message to ${masked}: ${error.message}`);
    return {
      sent: false,
      simulated: false,
      status: 'FAILED',
      sid: null,
      error: error.message
    };
  }
};

/**
 * Returns diagnostic metadata about active notification dispatch providers.
 */
export const getSmsProviderDiagnostics = () => {
  return {
    provider: env.SMS_PROVIDER,
    liveEnabled: env.SMS_ENABLED,
    hasTwilio: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
    hasFast2Sms: Boolean(env.FAST2SMS_API_KEY),
    senderId: env.TWILIO_PHONE_NUMBER || env.FAST2SMS_SENDER_ID || SMS_CONFIG.SENDER_ID
  };
};
