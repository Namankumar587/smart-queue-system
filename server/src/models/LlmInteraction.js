import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * LlmInteraction Audit Log Schema
 * CRITICAL PRIVACY INVARIANT: Zero raw patient text is stored in long-term logs.
 * Stores only request ID, use case, prompt version, model, latency, token counts,
 * outcome, and short-lived redacted excerpt if approved.
 */
const llmInteractionSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      default: () => crypto.randomUUID(),
      index: true
    },
    sessionId: {
      type: String,
      index: true
    },
    useCase: {
      type: String,
      required: true,
      enum: ['SMS_INTENT_PARSER', 'CHAT_ASSISTANT', 'WAIT_EXPLAINER', 'SAFETY_EVALUATION']
    },
    promptVersion: {
      type: String,
      required: true,
      default: 'v1.0'
    },
    provider: {
      type: String,
      required: true,
      default: 'MOCK'
    },
    model: {
      type: String,
      required: true,
      default: 'mock-llm-v1'
    },
    outcome: {
      type: String,
      required: true,
      enum: [
        'SUCCESS',
        'FALLBACK_MENU',
        'EMERGENCY_INTERCEPT',
        'MEDICAL_ADVICE_REDIRECT',
        'BLOCKED_INJECTION',
        'RATE_LIMITED',
        'ERROR'
      ],
      default: 'SUCCESS'
    },
    detectedIntent: {
      type: String,
      enum: ['BOOK', 'STATUS', 'CANCEL', 'HELP', 'UNKNOWN', 'ERROR_FALLBACK'],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    language: {
      type: String,
      default: 'en'
    },
    promptTokens: {
      type: Number,
      default: 0
    },
    completionTokens: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    estimatedCostUSD: {
      type: Number,
      default: 0
    },
    latencyMs: {
      type: Number,
      required: true
    },
    shortLivedRedactedExcerpt: {
      type: String,
      maxlength: 80,
      default: null
    },
    redactedPromptHash: {
      type: String,
      required: true
    },
    fallbackTriggered: {
      type: Boolean,
      default: false
    },
    fallbackReason: {
      type: String,
      default: null
    },
    circuitBreakerState: {
      type: String,
      enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
      default: 'CLOSED'
    }
  },
  {
    timestamps: true
  }
);

export const LlmInteraction = mongoose.model('LlmInteraction', llmInteractionSchema);
