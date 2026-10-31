import crypto from 'crypto';
import { LlmInteraction } from '../../models/LlmInteraction.js';
import { redactPII } from './redact.js';
import { prefilterCheck } from './prefilter.js';
import { MockProviderAdapter, GeminiProviderAdapter } from './provider.adapter.js';

export const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

export class LlmGateway {
  constructor(options = {}) {
    // 1. Kill Switch
    this.enabled = process.env.LLM_ENABLED === 'true' || options.enabled === true;

    // 2. Swappable Provider Adapter
    this.adapter = options.adapter || (process.env.GEMINI_API_KEY ? new GeminiProviderAdapter() : new MockProviderAdapter());

    // 3. Operational Limits
    this.timeoutMs = options.timeoutMs || 3500;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 1;
    this.dailyBudgetTokens = options.dailyBudgetTokens || 100000; // 100k tokens / day cap

    // 4. Circuit Breaker State
    this.circuitState = CIRCUIT_STATE.CLOSED;
    this.consecutiveFailures = 0;
    this.failureThreshold = 3;
    this.circuitResetTimeoutMs = 60000; // 60s
    this.lastStateChange = Date.now();

    // 5. Daily Usage Tracker
    this.tokensUsedToday = 0;
    this.lastBudgetResetDate = new Date().toISOString().split('T')[0];

    // 6. Sliding-Window Rate Limiting per session/phone
    this.sessionRequestTimestamps = new Map();
  }

  resetBudgetIfNewDay() {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastBudgetResetDate) {
      this.tokensUsedToday = 0;
      this.lastBudgetResetDate = today;
    }
  }

  checkRateLimit(sessionId, limit = 10, windowMs = 60000) {
    if (!sessionId || sessionId === 'anon') return true;
    const now = Date.now();
    const timestamps = this.sessionRequestTimestamps.get(sessionId) || [];
    const valid = timestamps.filter((ts) => now - ts < windowMs);
    if (valid.length >= limit) {
      return false;
    }
    valid.push(now);
    this.sessionRequestTimestamps.set(sessionId, valid);
    return true;
  }

  isCircuitOpen() {
    if (this.circuitState === CIRCUIT_STATE.OPEN) {
      if (Date.now() - this.lastStateChange > this.circuitResetTimeoutMs) {
        this.circuitState = CIRCUIT_STATE.HALF_OPEN;
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    this.circuitState = CIRCUIT_STATE.CLOSED;
  }

  recordFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.circuitState = CIRCUIT_STATE.OPEN;
      this.lastStateChange = Date.now();
      console.warn(`[LLM Gateway] Circuit breaker TRIPPED to OPEN (${this.consecutiveFailures} consecutive failures).`);
    }
  }

  /**
   * Core Pipeline Execution
   * pre-filter -> redact PII -> prompt -> adapter -> audit metadata
   */
  async executePipeline({ rawMessage, promptBuilder, useCase = 'SMS_INTENT_PARSER', sessionId = 'anon', promptVersion = 'v1.0' }) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    this.resetBudgetIfNewDay();

    // PHASE 0: Kill Switch Check
    if (!this.enabled) {
      return {
        requestId,
        success: false,
        fallbackTriggered: true,
        reason: 'LLM_DISABLED_KILL_SWITCH',
        rawOutput: null
      };
    }

    // PHASE 0.1: Overlong Input Check
    if (rawMessage && rawMessage.length > 500) {
      return {
        requestId,
        success: false,
        fallbackTriggered: true,
        reason: 'OVERLONG_INPUT_EXCEEDED',
        rawOutput: null
      };
    }

    // PHASE 0.2: Per-Sender Sliding-Window Rate Limit Check
    if (!this.checkRateLimit(sessionId)) {
      const latencyMs = Date.now() - startTime;
      LlmInteraction.create({
        requestId,
        sessionId,
        useCase,
        promptVersion,
        provider: this.adapter.name,
        model: this.adapter.model,
        outcome: 'RATE_LIMITED',
        detectedIntent: 'UNKNOWN',
        confidence: 0,
        latencyMs,
        redactedPromptHash: crypto.createHash('sha256').update(rawMessage || '').digest('hex'),
        fallbackTriggered: true,
        fallbackReason: 'RATE_LIMIT_EXCEEDED'
      }).catch(() => {});

      return {
        requestId,
        success: false,
        fallbackTriggered: true,
        reason: 'RATE_LIMIT_EXCEEDED',
        rawOutput: null
      };
    }

    // PHASE 1: Prefilter (Emergency, Medical Advice, Prompt Injection, Static FAQ)
    const prefilter = prefilterCheck(rawMessage);

    // 1A. Emergency Keyword Intercept — strictly BEFORE ANY model call
    if (prefilter.isEmergency) {
      const latencyMs = Date.now() - startTime;
      LlmInteraction.create({
        requestId,
        sessionId,
        useCase,
        promptVersion,
        provider: this.adapter.name,
        model: this.adapter.model,
        outcome: 'EMERGENCY_INTERCEPT',
        detectedIntent: 'HELP',
        confidence: 1.0,
        latencyMs,
        shortLivedRedactedExcerpt: '[EMERGENCY_INTERCEPT]',
        redactedPromptHash: crypto.createHash('sha256').update(rawMessage || '').digest('hex'),
        fallbackTriggered: false
      }).catch(() => {});

      return {
        requestId,
        success: false,
        isEmergency: true,
        emergencyResponse: prefilter.emergencyResponse,
        reason: 'EMERGENCY_KEYWORD_INTERCEPTED'
      };
    }

    // 1B. Medical Advice / Prescription Request Intercept
    if (prefilter.isMedicalAdvice) {
      const latencyMs = Date.now() - startTime;
      LlmInteraction.create({
        requestId,
        sessionId,
        useCase,
        promptVersion,
        provider: this.adapter.name,
        model: this.adapter.model,
        outcome: 'MEDICAL_ADVICE_REDIRECT',
        detectedIntent: 'HELP',
        confidence: 1.0,
        latencyMs,
        shortLivedRedactedExcerpt: '[MEDICAL_ADVICE_REDIRECT]',
        redactedPromptHash: crypto.createHash('sha256').update(rawMessage || '').digest('hex'),
        fallbackTriggered: false
      }).catch(() => {});

      return {
        requestId,
        success: false,
        isMedicalAdvice: true,
        medicalAdviceResponse: prefilter.medicalAdviceResponse,
        reason: 'MEDICAL_ADVICE_REQUEST_REDIRECTED'
      };
    }

    // 1C. Prompt Injection & Admin Write Action Check
    if (prefilter.isInjection) {
      const latencyMs = Date.now() - startTime;
      LlmInteraction.create({
        requestId,
        sessionId,
        useCase,
        promptVersion,
        provider: this.adapter.name,
        model: this.adapter.model,
        outcome: 'BLOCKED_INJECTION',
        detectedIntent: 'UNKNOWN',
        confidence: 0.0,
        latencyMs,
        shortLivedRedactedExcerpt: '[BLOCKED_INJECTION]',
        redactedPromptHash: crypto.createHash('sha256').update(rawMessage || '').digest('hex'),
        fallbackTriggered: true,
        fallbackReason: prefilter.reason
      }).catch(() => {});

      return {
        requestId,
        success: false,
        fallbackTriggered: true,
        reason: 'PROMPT_INJECTION_DETECTED',
        rawOutput: JSON.stringify({
          intent: 'UNKNOWN',
          confidence: 0.0,
          reason: prefilter.reason
        })
      };
    }

    // 1D. Static FAQ Match
    if (prefilter.isFaq) {
      return {
        requestId,
        success: true,
        isDirectFaq: true,
        faqResponse: prefilter.faqResponse,
        fallbackTriggered: false
      };
    }

    // PHASE 2: Privacy Scrubbing (PII Redaction)
    const { sanitizedText, redactionCount, tokenMap } = redactPII(rawMessage);
    const redactedPromptHash = crypto.createHash('sha256').update(sanitizedText).digest('hex');
    const shortLivedRedactedExcerpt = sanitizedText.slice(0, 60);

    // PHASE 3: Circuit Breaker & Budget Guard
    if (this.isCircuitOpen()) {
      return {
        requestId,
        success: false,
        fallbackTriggered: true,
        reason: 'CIRCUIT_BREAKER_OPEN',
        rawOutput: null
      };
    }

    if (this.tokensUsedToday >= this.dailyBudgetTokens) {
      return {
        requestId,
        success: false,
        fallbackTriggered: true,
        reason: 'DAILY_TOKEN_BUDGET_EXCEEDED',
        rawOutput: null
      };
    }

    // PHASE 4: Build Versioned Prompt
    const prompt = promptBuilder(sanitizedText);

    // PHASE 5: Bounded Execution with Timeout & Max 1 Retry
    let lastError = null;
    let completion = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const abortController = new AbortController();
      const timer = setTimeout(() => abortController.abort(), this.timeoutMs);

      try {
        completion = await this.adapter.generateCompletion(prompt, { signal: abortController.signal });
        clearTimeout(timer);
        this.recordSuccess();
        break;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        this.recordFailure();

        // If aborted by timeout or client, don't spin in retry loop
        if (err.name === 'AbortError') {
          break;
        }

        // Bounded retry backoff: 200ms
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    if (!completion) {
      // Async Audit of Failure
      LlmInteraction.create({
        requestId,
        sessionId,
        useCase,
        promptVersion,
        provider: this.adapter.name,
        model: this.adapter.model,
        redactedPromptHash,
        detectedIntent: 'ERROR_FALLBACK',
        confidence: 0,
        latencyMs,
        outcome: 'ERROR',
        fallbackTriggered: true,
        fallbackReason: lastError?.name === 'AbortError' ? 'TIMEOUT_EXCEEDED' : lastError?.message || 'PROVIDER_ERROR',
        shortLivedRedactedExcerpt,
        circuitBreakerState: this.circuitState
      }).catch((e) => console.error('[Audit] Failed to record LLM failure interaction:', e.message));

      return {
        requestId,
        success: false,
        fallbackTriggered: true,
        reason: lastError?.name === 'AbortError' ? 'TIMEOUT_EXCEEDED' : 'PROVIDER_ERROR',
        rawOutput: null
      };
    }

    // Track usage
    const totalTokens = completion.usage?.totalTokens || 0;
    this.tokensUsedToday += totalTokens;

    // Estimate cost ($0.075 per 1M tokens for Gemini Flash)
    const estimatedCostUSD = (totalTokens / 1000000) * 0.075;

    return {
      requestId,
      success: true,
      rawOutput: completion.rawOutput,
      usage: completion.usage,
      latencyMs,
      estimatedCostUSD,
      redactedPromptHash,
      shortLivedRedactedExcerpt,
      redactionCount,
      tokenMap
    };
  }
}
