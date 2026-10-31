import { LlmGateway } from './llm.gateway.js';
import { buildSmsIntentPromptV1 } from './prompts/smsIntent.v1.js';
import { validateSmsIntentSchema } from './schemas/smsIntent.schema.js';
import {
  enforceSmsGuardrails,
  DETERMINISTIC_FALLBACK_MENU,
  CONFIRMATION_PROMPT_TEMPLATE
} from './guardrails.js';
import { getActiveDoctorList, getClinicRulesContext } from './tools.js';
import { PendingBookingRequest } from '../../models/PendingBookingRequest.js';
import { LlmInteraction } from '../../models/LlmInteraction.js';
import { createToken, normalizePhoneNumber } from '../queue.service.js';

// Singleton default gateway instance
export const defaultLlmGateway = new LlmGateway();

/**
 * Deterministic keywords for Phase-2 Confirmation
 */
const CONFIRM_KEYWORDS = /^(yes|y|haan|ha|confirm|1)$/i;
const CANCEL_KEYWORDS = /^(no|n|nahi|nah|cancel|2)$/i;

/**
 * SMS Inbound Intent Parser (UC-1)
 * Enforces two-phase deterministic booking, trusted context, schema validation,
 * and deterministic fallback menus.
 *
 * @param {string} rawMessage - Inbound SMS text from patient
 * @param {string} senderPhone - Sender phone number
 * @param {Object} [gatewayInstance] - Optional gateway instance (for dependency injection in tests)
 * @returns {Promise<{ replyText: string, intent: string, actionExecuted: string|null, metadata: Object }>}
 */
export const handleInboundSms = async (rawMessage = '', senderPhone = '', gatewayInstance = defaultLlmGateway) => {
  const cleanMessage = String(rawMessage || '').trim();
  const normalizedPhone = normalizePhoneNumber(senderPhone);

  // =========================================================================
  // STEP 1: Two-Phase Deterministic Keyword Handler (Bypasses LLM entirely)
  // =========================================================================
  const pendingBooking = await PendingBookingRequest.findOne({
    phone: normalizedPhone,
    status: 'PENDING',
    expiresAt: { $gt: new Date() }
  });

  if (pendingBooking) {
    if (CONFIRM_KEYWORDS.test(cleanMessage)) {
      // Create real Token ONLY after patient's explicit deterministic YES
      pendingBooking.status = 'CONFIRMED';
      await pendingBooking.save();

      const createdToken = await createToken({
        doctorId: pendingBooking.doctorId,
        patientName: pendingBooking.patientName,
        patientPhone: pendingBooking.phone,
        priority: pendingBooking.priority,
        source: 'SMS'
      });

      const replyText =
        `[GL Bajaj Clinic] Token ${createdToken.tokenNumber} confirmed for ${pendingBooking.doctorName}. ` +
        `Est wait: ${createdToken.estimatedWaitMinutes} mins. ` +
        `Track live: ${process.env.CLIENT_URL || 'http://localhost:5173'}/track/${createdToken.trackingUuid}`;

      return {
        replyText,
        intent: 'BOOK_CONFIRMED',
        actionExecuted: 'TOKEN_CREATED',
        metadata: { tokenNumber: createdToken.tokenNumber, trackingUuid: createdToken.trackingUuid }
      };
    }

    if (CANCEL_KEYWORDS.test(cleanMessage)) {
      pendingBooking.status = 'CANCELLED';
      await pendingBooking.save();

      return {
        replyText: `[GL Bajaj Clinic] Your booking request for ${pendingBooking.doctorName} has been cancelled.`,
        intent: 'BOOK_CANCELLED',
        actionExecuted: 'PENDING_REQUEST_CANCELLED',
        metadata: {}
      };
    }
  }

  // =========================================================================
  // STEP 2: Fetch Trusted Server Context (Active Doctors & Clinic Rules)
  // =========================================================================
  const [activeDoctors, clinicRules] = await Promise.all([
    getActiveDoctorList(),
    getClinicRulesContext()
  ]);

  // =========================================================================
  // STEP 3: Execute LLM Gateway Pipeline
  // =========================================================================
  const pipelineResult = await gatewayInstance.executePipeline({
    rawMessage: cleanMessage,
    promptBuilder: (sanitizedText) =>
      buildSmsIntentPromptV1({
        message: sanitizedText,
        activeDoctors,
        clinicRules
      }),
    useCase: 'SMS_INTENT_PARSER',
    sessionId: normalizedPhone,
    promptVersion: 'v1.0'
  });

  // 3A. Handle Emergency Keyword Intercept (Zero LLM cost, strictly no diagnosis/triage)
  if (pipelineResult.isEmergency) {
    return {
      replyText: pipelineResult.emergencyResponse,
      intent: 'HELP',
      actionExecuted: null,
      metadata: { source: 'PREFILTER_EMERGENCY', reason: pipelineResult.reason, requestId: pipelineResult.requestId }
    };
  }

  // 3B. Handle Medical Advice / Prescription Intercept (Zero LLM cost, medical disclaimer)
  if (pipelineResult.isMedicalAdvice) {
    return {
      replyText: pipelineResult.medicalAdviceResponse,
      intent: 'HELP',
      actionExecuted: null,
      metadata: { source: 'PREFILTER_MEDICAL_ADVICE', reason: pipelineResult.reason, requestId: pipelineResult.requestId }
    };
  }

  // 3C. Handle Direct FAQ match from prefilter (Zero LLM cost)
  if (pipelineResult.isDirectFaq) {
    return {
      replyText: pipelineResult.faqResponse,
      intent: 'HELP',
      actionExecuted: null,
      metadata: { source: 'PREFILTER_FAQ', requestId: pipelineResult.requestId }
    };
  }

  // 3D. Handle Pipeline Fallback (Kill switch, prompt injection, timeout, rate limit, circuit breaker)
  if (!pipelineResult.success) {
    let replyText = DETERMINISTIC_FALLBACK_MENU;
    if (pipelineResult.reason === 'RATE_LIMIT_EXCEEDED') {
      replyText =
        '[GL Bajaj Clinic] Too many requests received in a short period. Please wait 1 minute before sending another message.\n\n' +
        DETERMINISTIC_FALLBACK_MENU;
    }

    return {
      replyText,
      intent: 'UNKNOWN',
      actionExecuted: null,
      metadata: {
        fallbackReason: pipelineResult.reason,
        fallbackTriggered: true,
        requestId: pipelineResult.requestId
      }
    };
  }

  // =========================================================================
  // STEP 4: Strict JSON Schema Validation
  // =========================================================================
  let parsedRaw;
  try {
    parsedRaw = JSON.parse(pipelineResult.rawOutput);
  } catch (err) {
    LlmInteraction.create({
      requestId: pipelineResult.requestId,
      sessionId: normalizedPhone,
      useCase: 'SMS_INTENT_PARSER',
      promptVersion: 'v1.0',
      provider: gatewayInstance.adapter.name,
      model: gatewayInstance.adapter.model,
      redactedPromptHash: pipelineResult.redactedPromptHash,
      detectedIntent: 'ERROR_FALLBACK',
      confidence: 0,
      outcome: 'FALLBACK_MENU',
      latencyMs: pipelineResult.latencyMs,
      promptTokens: pipelineResult.usage?.promptTokens || 0,
      completionTokens: pipelineResult.usage?.completionTokens || 0,
      totalTokens: pipelineResult.usage?.totalTokens || 0,
      shortLivedRedactedExcerpt: pipelineResult.shortLivedRedactedExcerpt,
      fallbackTriggered: true,
      fallbackReason: 'MALFORMED_JSON_OUTPUT'
    }).catch(() => {});

    return {
      replyText: DETERMINISTIC_FALLBACK_MENU,
      intent: 'UNKNOWN',
      actionExecuted: null,
      metadata: { fallbackReason: 'MALFORMED_JSON_OUTPUT', fallbackTriggered: true, requestId: pipelineResult.requestId }
    };
  }

  const schemaValidation = validateSmsIntentSchema(parsedRaw);
  if (!schemaValidation.isValid) {
    await LlmInteraction.create({
      requestId: pipelineResult.requestId,
      sessionId: normalizedPhone,
      useCase: 'SMS_INTENT_PARSER',
      promptVersion: 'v1.0',
      provider: gatewayInstance.adapter.name,
      model: gatewayInstance.adapter.model,
      redactedPromptHash: pipelineResult.redactedPromptHash,
      detectedIntent: 'ERROR_FALLBACK',
      confidence: 0,
      outcome: 'FALLBACK_MENU',
      latencyMs: pipelineResult.latencyMs,
      promptTokens: pipelineResult.usage?.promptTokens || 0,
      completionTokens: pipelineResult.usage?.completionTokens || 0,
      totalTokens: pipelineResult.usage?.totalTokens || 0,
      shortLivedRedactedExcerpt: pipelineResult.shortLivedRedactedExcerpt,
      fallbackTriggered: true,
      fallbackReason: `SCHEMA_VALIDATION_FAILED: ${schemaValidation.errors.join('; ')}`
    }).catch(() => {});

    return {
      replyText: DETERMINISTIC_FALLBACK_MENU,
      intent: 'UNKNOWN',
      actionExecuted: null,
      metadata: {
        fallbackReason: `SCHEMA_VALIDATION_FAILED: ${schemaValidation.errors.join('; ')}`,
        fallbackTriggered: true,
        requestId: pipelineResult.requestId
      }
    };
  }

  // =========================================================================
  // STEP 5: Guardrails Verification & Doctor/Date Sanity Checks
  // =========================================================================
  const guardrails = enforceSmsGuardrails(schemaValidation.sanitized, activeDoctors, clinicRules);

  if (!guardrails.isSafe || guardrails.routing === 'MENU') {
    await LlmInteraction.create({
      requestId: pipelineResult.requestId,
      sessionId: normalizedPhone,
      useCase: 'SMS_INTENT_PARSER',
      promptVersion: 'v1.0',
      provider: gatewayInstance.adapter.name,
      model: gatewayInstance.adapter.model,
      redactedPromptHash: pipelineResult.redactedPromptHash,
      detectedIntent: schemaValidation.sanitized?.intent || 'UNKNOWN',
      confidence: schemaValidation.sanitized?.confidence || 0,
      outcome: 'FALLBACK_MENU',
      latencyMs: pipelineResult.latencyMs,
      promptTokens: pipelineResult.usage?.promptTokens || 0,
      completionTokens: pipelineResult.usage?.completionTokens || 0,
      totalTokens: pipelineResult.usage?.totalTokens || 0,
      shortLivedRedactedExcerpt: pipelineResult.shortLivedRedactedExcerpt,
      fallbackTriggered: true,
      fallbackReason: guardrails.errorReason
    }).catch(() => {});

    return {
      replyText: DETERMINISTIC_FALLBACK_MENU,
      intent: schemaValidation.sanitized.intent || 'UNKNOWN',
      actionExecuted: null,
      metadata: {
        fallbackReason: guardrails.errorReason,
        fallbackTriggered: true,
        confidence: schemaValidation.sanitized.confidence,
        requestId: pipelineResult.requestId
      }
    };
  }

  const { validatedData } = guardrails;

  // =========================================================================
  // STEP 6: Execute Deterministic Actions
  // =========================================================================
  if (validatedData.intent === 'BOOK') {
    // Create PENDING request only — NEVER create token directly from LLM output!
    await PendingBookingRequest.create({
      phone: normalizedPhone,
      doctorId: validatedData.doctor.id,
      doctorName: validatedData.doctor.name,
      targetDate: validatedData.targetDate,
      patientName: 'SMS Patient',
      status: 'PENDING'
    });

    const replyText = CONFIRMATION_PROMPT_TEMPLATE(validatedData.doctor.name, validatedData.targetDate);

    // Audit Interaction
    await LlmInteraction.create({
      requestId: pipelineResult.requestId,
      sessionId: normalizedPhone,
      useCase: 'SMS_INTENT_PARSER',
      promptVersion: 'v1.0',
      provider: gatewayInstance.adapter.name,
      model: gatewayInstance.adapter.model,
      redactedPromptHash: pipelineResult.redactedPromptHash,
      detectedIntent: 'BOOK',
      confidence: validatedData.confidence,
      language: validatedData.language,
      outcome: 'SUCCESS',
      latencyMs: pipelineResult.latencyMs,
      promptTokens: pipelineResult.usage?.promptTokens || 0,
      completionTokens: pipelineResult.usage?.completionTokens || 0,
      totalTokens: pipelineResult.usage?.totalTokens || 0,
      estimatedCostUSD: pipelineResult.estimatedCostUSD || 0,
      shortLivedRedactedExcerpt: pipelineResult.shortLivedRedactedExcerpt,
      fallbackTriggered: false
    }).catch(() => {});

    return {
      replyText,
      intent: 'BOOK',
      actionExecuted: 'PENDING_REQUEST_CREATED',
      metadata: { doctor: validatedData.doctor.name, date: validatedData.targetDate, requestId: pipelineResult.requestId }
    };
  }

  if (validatedData.intent === 'STATUS') {
    const replyText =
      `[GL Bajaj Clinic] Live Tracking: You can check your real-time position and estimated wait ` +
      `at ${process.env.CLIENT_URL || 'http://localhost:5173'}/track/search or text STATUS <TOKEN-CODE>.`;

    await LlmInteraction.create({
      requestId: pipelineResult.requestId,
      sessionId: normalizedPhone,
      useCase: 'SMS_INTENT_PARSER',
      promptVersion: 'v1.0',
      provider: gatewayInstance.adapter.name,
      model: gatewayInstance.adapter.model,
      redactedPromptHash: pipelineResult.redactedPromptHash,
      detectedIntent: 'STATUS',
      confidence: validatedData.confidence,
      language: validatedData.language,
      outcome: 'SUCCESS',
      latencyMs: pipelineResult.latencyMs,
      promptTokens: pipelineResult.usage?.promptTokens || 0,
      completionTokens: pipelineResult.usage?.completionTokens || 0,
      totalTokens: pipelineResult.usage?.totalTokens || 0,
      estimatedCostUSD: pipelineResult.estimatedCostUSD || 0,
      shortLivedRedactedExcerpt: pipelineResult.shortLivedRedactedExcerpt,
      fallbackTriggered: false
    }).catch(() => {});

    return {
      replyText,
      intent: 'STATUS',
      actionExecuted: null,
      metadata: { requestId: pipelineResult.requestId }
    };
  }

  if (validatedData.intent === 'CANCEL') {
    const replyText =
      `[GL Bajaj Clinic] To cancel your active appointment, please provide your token number: reply CANCEL <TOKEN-CODE>.`;

    await LlmInteraction.create({
      requestId: pipelineResult.requestId,
      sessionId: normalizedPhone,
      useCase: 'SMS_INTENT_PARSER',
      promptVersion: 'v1.0',
      provider: gatewayInstance.adapter.name,
      model: gatewayInstance.adapter.model,
      redactedPromptHash: pipelineResult.redactedPromptHash,
      detectedIntent: 'CANCEL',
      confidence: validatedData.confidence,
      language: validatedData.language,
      outcome: 'SUCCESS',
      latencyMs: pipelineResult.latencyMs,
      promptTokens: pipelineResult.usage?.promptTokens || 0,
      completionTokens: pipelineResult.usage?.completionTokens || 0,
      totalTokens: pipelineResult.usage?.totalTokens || 0,
      estimatedCostUSD: pipelineResult.estimatedCostUSD || 0,
      shortLivedRedactedExcerpt: pipelineResult.shortLivedRedactedExcerpt,
      fallbackTriggered: false
    }).catch(() => {});

    return {
      replyText,
      intent: 'CANCEL',
      actionExecuted: null,
      metadata: { requestId: pipelineResult.requestId }
    };
  }

  // HELP / General
  return {
    replyText: DETERMINISTIC_FALLBACK_MENU,
    intent: 'HELP',
    actionExecuted: null,
    metadata: { requestId: pipelineResult.requestId }
  };
};
