// ============================================================================
// METERING SERVICE - Complete implementation
// File: src/services/metering.ts
// ============================================================================

import { logger } from '../utils/logger.js';
import type { Env } from '../types/interfaces.js';

export interface UsageEvent {
  trace_id: string;
  request_id: string;
  user_id?: string;
  business_id?: string;
  provider: 'openai' | 'anthropic' | 'apify';
  model: string;
  purpose: 'analysis_light' | 'analysis_deep' | 'outreach' | 'summary';
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_per_input_token: number;
  cost_per_output_token: number;
  total_cost_usd: number;
  duration_ms: number;
  http_status: number;
  cache_hit: boolean;
  error_code?: string;
  error_message?: string;
  rate_limited: boolean;
  throttled: boolean;
  created_at: string;
  meta?: Record<string, any>;
}

export interface MeteringStats {
  provider: string;
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  avgLatency: number;
  errorRate: number;
  cacheHitRate: number;
}

export class MeteringContext {
  private events: UsageEvent[] = [];
  private startTime: number;
  public readonly requestId: string;
  public readonly traceId: string;

  constructor(requestId: string, traceId?: string) {
    this.requestId = requestId;
    this.traceId = traceId || crypto.randomUUID();
    this.startTime = Date.now();
  }

  recordEvent(event: Partial<UsageEvent>): void {
    const fullEvent: UsageEvent = {
      trace_id: this.traceId,
      request_id: this.requestId,
      provider: event.provider || 'openai',
      model: event.model || 'unknown',
      purpose: event.purpose || 'analysis_light',
      input_tokens: event.input_tokens || 0,
      output_tokens: event.output_tokens || 0,
      total_tokens: (event.input_tokens || 0) + (event.output_tokens || 0),
      cost_per_input_token: event.cost_per_input_token || 0,
      cost_per_output_token: event.cost_per_output_token || 0,
      total_cost_usd: event.total_cost_usd || 0,
      duration_ms: event.duration_ms || (Date.now() - this.startTime),
      http_status: event.http_status || 200,
      cache_hit: event.cache_hit || false,
      error_code: event.error_code,
      error_message: event.error_message,
      rate_limited: event.rate_limited || false,
      throttled: event.throttled || false,
      created_at: new Date().toISOString(),
      user_id: event.user_id,
      business_id: event.business_id,
      meta: event.meta
    };

    this.events.push(fullEvent);
    logger('info', 'Usage event recorded', {
      provider: fullEvent.provider,
      model: fullEvent.model,
      cost: fullEvent.total_cost_usd,
      tokens: fullEvent.total_tokens,
      cacheHit: fullEvent.cache_hit
    }, this.requestId);
  }

  getEvents(): UsageEvent[] {
    return [...this.events];
  }

  getTotalCost(): number {
    return this.events.reduce((sum, event) => sum + event.total_cost_usd, 0);
  }

  getTotalTokens(): number {
    return this.events.reduce((sum, event) => sum + event.total_tokens, 0);
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      // Batch log all events
      for (const event of this.events) {
        logger('info', 'Flushing usage event', event, this.requestId);
      }
      
      logger('info', 'Metering context flushed', {
        eventCount: this.events.length,
        totalCost: this.getTotalCost(),
        totalTokens: this.getTotalTokens()
      }, this.requestId);
    } catch (error) {
      logger('error', 'Failed to flush metering context', { error }, this.requestId);
    }
  }
}

export class PerformanceMonitor {
  private stats: Map<string, MeteringStats> = new Map();
  private readonly MAX_STATS_SIZE = 10000;

  recordMetric(provider: string, event: UsageEvent): void {
    const key = `${provider}:${event.model}`;
    const existing = this.stats.get(key) || {
      provider,
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      avgLatency: 0,
      errorRate: 0,
      cacheHitRate: 0
    };

    existing.totalRequests += 1;
    existing.totalCost += event.total_cost_usd;
    existing.totalTokens += event.total_tokens;
    existing.avgLatency = (existing.avgLatency * (existing.totalRequests - 1) + event.duration_ms) / existing.totalRequests;
    existing.errorRate = existing.errorRate; // Will be calculated based on error events
    existing.cacheHitRate = existing.cacheHitRate; // Will be calculated based on cache hits

    this.stats.set(key, existing);

    // Prevent memory growth
    if (this.stats.size > this.MAX_STATS_SIZE) {
      const firstKey = this.stats.keys().next().value;
      this.stats.delete(firstKey);
    }
  }

  getStats(provider?: string, purpose?: string): MeteringStats | Record<string, MeteringStats> {
    if (provider) {
      const filtered = new Map();
      for (const [key, stats] of this.stats.entries()) {
        if (key.startsWith(provider)) {
          filtered.set(key, stats);
        }
      }
      return Object.fromEntries(filtered);
    }

    return Object.fromEntries(this.stats);
  }

  clearStats(): void {
    this.stats.clear();
    logger('info', 'Performance monitor stats cleared');
  }
}

export async function meteredCall<T>(
  ctx: MeteringContext,
  provider: 'openai' | 'anthropic' | 'apify',
  model: string,
  purpose: UsageEvent['purpose'],
  operation: () => Promise<T>,
  costCalculator?: (result: T) => { inputTokens: number; outputTokens: number; cost: number }
): Promise<T> {
  const startTime = Date.now();
  let result: T;
  let error: Error | null = null;
  let httpStatus = 200;

  try {
    result = await operation();
    logger('info', 'Metered call completed successfully', { provider, model, purpose }, ctx.requestId);
  } catch (err: any) {
    error = err;
    httpStatus = err.status || 500;
    logger('error', 'Metered call failed', { provider, model, purpose, error: err.message }, ctx.requestId);
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    
    let tokens = { inputTokens: 0, outputTokens: 0, cost: 0 };
    if (result && costCalculator) {
      try {
        tokens = costCalculator(result);
      } catch (calcError) {
        logger('warn', 'Cost calculation failed', { error: calcError }, ctx.requestId);
      }
    }

    ctx.recordEvent({
      provider,
      model,
      purpose,
      input_tokens: tokens.inputTokens,
      output_tokens: tokens.outputTokens,
      total_cost_usd: tokens.cost,
      duration_ms: duration,
      http_status: httpStatus,
      cache_hit: false, // Will be overridden by caching layer
      error_code: error ? (error as any).code : undefined,
      error_message: error?.message,
      rate_limited: httpStatus === 429,
      throttled: false // Will be overridden by rate limiting layer
    });
  }

  return result!;
}

// Cost calculation helpers for different providers
export const CostCalculators = {
  openai: {
    'gpt-4': (inputTokens: number, outputTokens: number) => ({
      inputTokens,
      outputTokens,
      cost: (inputTokens * 0.00003) + (outputTokens * 0.00006)
    }),
    'gpt-3.5-turbo': (inputTokens: number, outputTokens: number) => ({
      inputTokens,
      outputTokens,
      cost: (inputTokens * 0.0000015) + (outputTokens * 0.000002)
    })
  },
  anthropic: {
    'claude-3-sonnet': (inputTokens: number, outputTokens: number) => ({
      inputTokens,
      outputTokens,
      cost: (inputTokens * 0.000003) + (outputTokens * 0.000015)
    }),
    'claude-3-haiku': (inputTokens: number, outputTokens: number) => ({
      inputTokens,
      outputTokens,
      cost: (inputTokens * 0.00000025) + (outputTokens * 0.00000125)
    })
  }
};

export async function logUsageToSupabase(env: Env, event: UsageEvent, requestId: string): Promise<void> {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/ai_usage_logs`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new Error(`Supabase logging failed: ${response.status}`);
    }

    logger('info', 'Usage logged to Supabase successfully', { 
      provider: event.provider, 
      cost: event.total_cost_usd 
    }, requestId);
  } catch (error: any) {
    logger('error', 'Failed to log usage to Supabase', { 
      error: error.message,
      event: event
    }, requestId);
  }
}
