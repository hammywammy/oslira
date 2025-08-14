// ============================================================================
// PROVIDER ADAPTERS - Complete implementation
// File: src/adapters/provider-adapters.ts
// ============================================================================

import { logger } from '../utils/logger.js';
import type { Env } from '../types/interfaces.js';

export interface ProviderResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  headers: Headers;
  rawResponse?: any;
}

export class OpenAIAdapter {
  constructor(private apiKey: string) {}

  async chat(messages: any[], model: string = 'gpt-3.5-turbo', options: any = {}): Promise<ProviderResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
        ...options
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
      model: data.model,
      headers: response.headers,
      rawResponse: data
    };
  }

  async stream(messages: any[], model: string = 'gpt-3.5-turbo', options: any = {}): Promise<ReadableStream> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
        stream: true,
        ...options
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI streaming error: ${response.status} - ${errorBody}`);
    }

    return response.body!;
  }
}

export class AnthropicAdapter {
  constructor(private apiKey: string) {}

  async messages(messages: any[], model: string = 'claude-3-haiku-20240307', options: any = {}): Promise<ProviderResponse> {
    // Convert OpenAI format to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: options.max_tokens || 2000,
        system: systemMessage?.content || '',
        messages: userMessages,
        ...options
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0]?.text || '',
      usage: data.usage,
      model: data.model,
      headers: response.headers,
      rawResponse: data
    };
  }

  async stream(messages: any[], model: string = 'claude-3-haiku-20240307', options: any = {}): Promise<ReadableStream> {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: options.max_tokens || 2000,
        system: systemMessage?.content || '',
        messages: userMessages,
        stream: true,
        ...options
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic streaming error: ${response.status} - ${errorBody}`);
    }

    return response.body!;
  }
}

export class ApifyAdapter {
  constructor(private apiToken: string) {}

  async runActor(actorId: string, input: any, options: any = {}): Promise<any> {
    const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${this.apiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Apify API error: ${response.status} - ${errorBody}`);
    }

    return await response.json();
  }

  async getRunStatus(runId: string): Promise<any> {
    const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${this.apiToken}`);
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Apify status error: ${response.status} - ${errorBody}`);
    }

    return await response.json();
  }
}

export class RetryHandler {
  constructor(
    private maxRetries: number = 3,
    private baseDelay: number = 1000,
    private maxDelay: number = 10000
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (attempt === this.maxRetries || !shouldRetry(error)) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          this.maxDelay
        );

        logger('warn', `Retry attempt ${attempt + 1}/${this.maxRetries} in ${delay}ms`, {
          error: error.message,
          attempt: attempt + 1
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

export class CostAnomalyDetector {
  private readonly costHistory: number[] = [];
  private readonly maxHistorySize = 1000;
  
  detectAnomaly(cost: number, threshold: number = 3.0): boolean {
    if (this.costHistory.length < 10) {
      this.addCost(cost);
      return false;
    }

    const mean = this.costHistory.reduce((a, b) => a + b) / this.costHistory.length;
    const variance = this.costHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.costHistory.length;
    const stdDev = Math.sqrt(variance);
    
    const zScore = Math.abs(cost - mean) / stdDev;
    const isAnomaly = zScore > threshold;
    
    this.addCost(cost);
    
    if (isAnomaly) {
      logger('warn', 'Cost anomaly detected', {
        cost,
        mean,
        stdDev,
        zScore,
        threshold
      });
    }
    
    return isAnomaly;
  }

  private addCost(cost: number): void {
    this.costHistory.push(cost);
    if (this.costHistory.length > this.maxHistorySize) {
      this.costHistory.shift();
    }
  }

  getStatistics(): any {
    if (this.costHistory.length === 0) {
      return { mean: 0, stdDev: 0, count: 0 };
    }

    const mean = this.costHistory.reduce((a, b) => a + b) / this.costHistory.length;
    const variance = this.costHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.costHistory.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      stdDev,
      count: this.costHistory.length,
      min: Math.min(...this.costHistory),
      max: Math.max(...this.costHistory)
    };
  }
}

export class StreamingMetricsCollector {
  private chunks: string[] = [];
  private tokenCount = 0;
  private startTime = Date.now();

  onChunk(chunk: string): void {
    this.chunks.push(chunk);
    // Rough token estimation (1 token ≈ 4 characters)
    this.tokenCount += Math.ceil(chunk.length / 4);
  }

  getMetrics(): {
    content: string;
    estimatedTokens: number;
    durationMs: number;
    chunksReceived: number;
  } {
    return {
      content: this.chunks.join(''),
      estimatedTokens: this.tokenCount,
      durationMs: Date.now() - this.startTime,
      chunksReceived: this.chunks.length
    };
  }

  reset(): void {
    this.chunks = [];
    this.tokenCount = 0;
    this.startTime = Date.now();
  }
}

// Factory functions for easy instantiation
export function createOpenAIAdapter(apiKey: string): OpenAIAdapter {
  return new OpenAIAdapter(apiKey);
}

export function createAnthropicAdapter(apiKey: string): AnthropicAdapter {
  return new AnthropicAdapter(apiKey);
}

export function createApifyAdapter(apiToken: string): ApifyAdapter {
  return new ApifyAdapter(apiToken);
}

export function createRetryHandler(maxRetries?: number, baseDelay?: number, maxDelay?: number): RetryHandler {
  return new RetryHandler(maxRetries, baseDelay, maxDelay);
}
