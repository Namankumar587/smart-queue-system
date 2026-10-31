import { env } from '../../config/env.js';

/**
 * Base Abstract Provider Adapter
 */
export class BaseProviderAdapter {
  async generateCompletion(prompt, options = {}) {
    throw new Error('generateCompletion() must be implemented by concrete provider adapter');
  }
}

/**
 * Mock Provider Adapter (Offline Deterministic Simulator)
 * Enables 100% test coverage in CI/CD environments without external network egress or API billing.
 */
export class MockProviderAdapter extends BaseProviderAdapter {
  constructor(options = {}) {
    super();
    this.name = 'MOCK';
    this.model = 'mock-llm-v1';
    this.simulatedDelayMs = options.simulatedDelayMs || 0;
    this.forceFailure = options.forceFailure || false;
    this.customMockResponse = options.customMockResponse || null;
  }

  async generateCompletion(prompt, options = {}) {
    const { signal } = options;

    if (this.simulatedDelayMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, this.simulatedDelayMs);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    }

    if (this.forceFailure) {
      const error = new Error('Simulated upstream LLM provider 503 error');
      error.statusCode = 503;
      throw error;
    }

    if (this.customMockResponse) {
      return {
        rawOutput: typeof this.customMockResponse === 'string' ? this.customMockResponse : JSON.stringify(this.customMockResponse),
        usage: { promptTokens: 45, completionTokens: 18, totalTokens: 63 }
      };
    }

    // Extract the untrusted user message from between XML tags if present
    const parts = prompt.split('<untrusted_user_message>');
    const userMessage = (parts.length > 1
      ? parts[parts.length - 1].split('</untrusted_user_message>')[0]
      : prompt).trim().toLowerCase();

    // 1. Prompt Injection Detection in simulated model
    if (userMessage.includes('ignore previous instructions') || userMessage.includes('system override')) {
      return {
        rawOutput: JSON.stringify({
          intent: 'UNKNOWN',
          doctorId: null,
          date: null,
          language: 'en',
          confidence: 0.0
        }),
        usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 }
      };
    }

    // 2. Wrong Doctor Simulation (evaluated before generic booking)
    if (userMessage.includes('non_existent') || userMessage.includes('fake doctor')) {
      return {
        rawOutput: JSON.stringify({
          intent: 'BOOK',
          doctorId: 'DOC-NON-EXISTENT-999',
          date: new Date().toISOString().split('T')[0],
          language: 'en',
          confidence: 0.88
        }),
        usage: { promptTokens: 40, completionTokens: 18, totalTokens: 58 }
      };
    }

    // 3. Invalid Past Date Simulation (evaluated before generic booking)
    if (userMessage.includes('yesterday') || userMessage.includes('past date') || userMessage.includes('2020-01-01')) {
      return {
        rawOutput: JSON.stringify({
          intent: 'BOOK',
          doctorId: 'DOC-GEN-101',
          date: '2020-01-01',
          language: 'en',
          confidence: 0.85
        }),
        usage: { promptTokens: 40, completionTokens: 18, totalTokens: 58 }
      };
    }

    // 4. Ambiguous Message Simulation
    if (userMessage.includes('hello') || userMessage.includes('kya chal raha hai') || userMessage.includes('maybe')) {
      return {
        rawOutput: JSON.stringify({
          intent: 'UNKNOWN',
          doctorId: null,
          date: null,
          language: 'en',
          confidence: 0.35 // Below 0.70 threshold!
        }),
        usage: { promptTokens: 30, completionTokens: 12, totalTokens: 42 }
      };
    }

    // 5. Multilingual: Hindi / Hinglish booking
    if (
      userMessage.includes('doctor dikhana hai') ||
      userMessage.includes('appointment chahiye') ||
      userMessage.includes('dr. priya') ||
      userMessage.includes('book')
    ) {
      return {
        rawOutput: JSON.stringify({
          intent: 'BOOK',
          doctorId: 'DOC-GEN-101',
          date: new Date().toISOString().split('T')[0],
          language: userMessage.includes('dikhana') || userMessage.includes('chahiye') ? 'hi' : 'en',
          confidence: 0.95
        }),
        usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 }
      };
    }

    // 6. Status Query
    if (userMessage.includes('status') || userMessage.includes('mera number') || userMessage.includes('position')) {
      return {
        rawOutput: JSON.stringify({
          intent: 'STATUS',
          doctorId: null,
          date: null,
          language: 'en',
          confidence: 0.92
        }),
        usage: { promptTokens: 40, completionTokens: 15, totalTokens: 55 }
      };
    }

    // 7. Cancel Query
    if (userMessage.includes('cancel') || userMessage.includes('hata do')) {
      return {
        rawOutput: JSON.stringify({
          intent: 'CANCEL',
          doctorId: null,
          date: null,
          language: 'en',
          confidence: 0.91
        }),
        usage: { promptTokens: 35, completionTokens: 15, totalTokens: 50 }
      };
    }

    // Default fallback mock
    return {
      rawOutput: JSON.stringify({
        intent: 'HELP',
        doctorId: null,
        date: null,
        language: 'en',
        confidence: 0.88
      }),
      usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 }
    };
  }
}

/**
 * Google Gemini Provider Adapter (REST Native)
 * Calls official Google Gemini REST API using server-side GEMINI_API_KEY.
 */
export class GeminiProviderAdapter extends BaseProviderAdapter {
  constructor(apiKey = process.env.GEMINI_API_KEY, model = 'gemini-1.5-flash') {
    super();
    this.name = 'GEMINI';
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateCompletion(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server');
    }

    const { signal } = options;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.0,
        responseMimeType: 'application/json'
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) {
      const errText = await res.text();
      const error = new Error(`Gemini API error (${res.status}): ${errText}`);
      error.statusCode = res.status;
      throw error;
    }

    const json = await res.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const usageMetadata = json.usageMetadata || {};

    return {
      rawOutput: candidateText,
      usage: {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      }
    };
  }
}
