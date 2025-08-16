// ============================================================================
// COMPLETELY REWRITTEN METERING SERVICE - 2025 PRICING & PROPER LOGIC
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
    logger('debug', 'Usage event recorded', {
      provider: fullEvent.provider,
      model: fullEvent.model,
      inputTokens: fullEvent.input_tokens,
      outputTokens: fullEvent.output_tokens,
      cost: fullEvent.total_cost_usd
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
}

// ============================================================================
// 2025 CURRENT PRICING - Based on your document
// ============================================================================

const PRICING_2025 = {
  openai: {
    // GPT-5 models (latest)
    'gpt-5': { input: 0.00000125, output: 0.00001 }, // $1.25/1M input, $10/1M output
    'gpt-5-mini': { input: 0.00000025, output: 0.000002 }, // $0.25/1M input, $2/1M output
    'gpt-5-nano': { input: 0.00000005, output: 0.0000004 }, // $0.05/1M input, $0.40/1M output
    
    // GPT-4 models (current GPT-4o pricing)
    'gpt-4o-2024-08-06': { input: 0.000005, output: 0.00002 }, // $5/1M input, $20/1M output
    'gpt-4o': { input: 0.000005, output: 0.00002 },
    'gpt-4': { input: 0.000005, output: 0.00002 },
    
    // GPT-4 Mini (YOUR ACTUAL MODEL from logs)
    'gpt-4o-mini-2024-07-18': { input: 0.0000006, output: 0.0000024 }, // $0.60/1M input, $2.40/1M output
    'gpt-4o-mini': { input: 0.0000006, output: 0.0000024 },
    'gpt-4-mini': { input: 0.0000006, output: 0.0000024 }
  },
  
  anthropic: {
    // Claude 4.x models (latest)
    'claude-opus-4.1': { input: 0.000015, output: 0.000075 }, // $15/1M input, $75/1M output
    'claude-opus-4.0': { input: 0.000015, output: 0.000075 },
    'claude-sonnet-4': { input: 0.000003, output: 0.000015 }, // $3/1M input, $15/1M output
    'claude-sonnet-3.7': { input: 0.000003, output: 0.000015 },
    
    // Claude 3.x models
    'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 }, // $0.25/1M input, $1.25/1M output (YOUR MODEL)
    'claude-3-haiku': { input: 0.00000025, output: 0.00000125 },
    'claude-haiku-3.5': { input: 0.0000008, output: 0.000004 }, // $0.80/1M input, $4/1M output
    'claude-3-sonnet': { input: 0.000003, output: 0.000015 }
  },
  
  apify: {
    // Instagram scrapers (based on typical CU usage and $0.30/CU average)
    'dSCLg0C3YEZ83HzYX': 0.0001, // Light scraper: ~0.0003 CU = $0.0001
    'instagram-light-scraper': 0.0001,
    'shu8hvrXbJbY3Eb9W': 0.0005, // Deep scraper: ~0.0017 CU = $0.0005
    'instagram-deep-scraper': 0.0005,
    'instagram-scraper': 0.0003 // Generic fallback
  }
};

// ============================================================================
// USAGE EXTRACTION FUNCTIONS - Based on API response formats
// ============================================================================

function extractOpenAIUsage(response: any, model: string): { inputTokens: number; outputTokens: number; cost: number } {
  try {
    // OpenAI response format: { usage: { prompt_tokens, completion_tokens, total_tokens } }
    const usage = response?.usage;
    if (!usage) {
      logger('warn', 'No usage data in OpenAI response', { model, responseKeys: Object.keys(response || {}) });
      return { inputTokens: 0, outputTokens: 0, cost: 0 };
    }

    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    
    // Get pricing for this model
    const pricing = PRICING_2025.openai[model] || PRICING_2025.openai['gpt-4o-mini']; // Default to mini
    const cost = (inputTokens * pricing.input) + (outputTokens * pricing.output);

    logger('debug', 'OpenAI usage extracted', {
      model,
      inputTokens,
      outputTokens,
      inputCost: pricing.input,
      outputCost: pricing.output,
      totalCost: cost
    });

    return {
      inputTokens,
      outputTokens,
      cost: parseFloat(cost.toFixed(8)) // High precision for small costs
    };
  } catch (error) {
    logger('error', 'Failed to extract OpenAI usage', { error: error.message, model, response });
    return { inputTokens: 0, outputTokens: 0, cost: 0 };
  }
}

function extractAnthropicUsage(response: any, model: string): { inputTokens: number; outputTokens: number; cost: number } {
  try {
    // Anthropic response format: { usage: { input_tokens, output_tokens } }
    const usage = response?.usage;
    if (!usage) {
      logger('warn', 'No usage data in Anthropic response', { model, responseKeys: Object.keys(response || {}) });
      return { inputTokens: 0, outputTokens: 0, cost: 0 };
    }

    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    
    // Get pricing for this model
    const pricing = PRICING_2025.anthropic[model] || PRICING_2025.anthropic['claude-3-haiku']; // Default to haiku
    const cost = (inputTokens * pricing.input) + (outputTokens * pricing.output);

    logger('debug', 'Anthropic usage extracted', {
      model,
      inputTokens,
      outputTokens,
      inputCost: pricing.input,
      outputCost: pricing.output,
      totalCost: cost
    });

    return {
      inputTokens,
      outputTokens,
      cost: parseFloat(cost.toFixed(8)) // High precision for small costs
    };
  } catch (error) {
    logger('error', 'Failed to extract Anthropic usage', { error: error.message, model, response });
    return { inputTokens: 0, outputTokens: 0, cost: 0 };
  }
}

function extractApifyUsage(response: any, actorId: string): { inputTokens: number; outputTokens: number; cost: number } {
  try {
    // Apify returns array of results OR run object with stats
    let cost = 0;
    let resultsCount = 0;
    
    if (Array.isArray(response)) {
      // Direct results from run-sync-get-dataset-items
      resultsCount = response.length;
      const fixedCost = PRICING_2025.apify[actorId] || PRICING_2025.apify['instagram-scraper'];
      cost = fixedCost;
      
      logger('debug', 'Apify usage extracted (results array)', {
        actorId,
        resultsCount,
        fixedCost,
        totalCost: cost
      });
    } else if (response?.stats || response?.usageTotalUsd !== undefined) {
      // Run object with usage stats
      cost = response.usageTotalUsd || 0;
      resultsCount = response.stats?.outputRecords || 1;
      
      logger('debug', 'Apify usage extracted (run stats)', {
        actorId,
        computeUnits: response.stats?.computeUnits,
        usageTotalUsd: response.usageTotalUsd,
        resultsCount,
        totalCost: cost
      });
    } else {
      // Fallback to fixed cost
      resultsCount = 1;
      const fixedCost = PRICING_2025.apify[actorId] || PRICING_2025.apify['instagram-scraper'];
      cost = fixedCost;
      
      logger('debug', 'Apify usage extracted (fallback)', {
        actorId,
        fixedCost,
        totalCost: cost
      });
    }

    return {
      inputTokens: 0, // Apify doesn't use input tokens
      outputTokens: resultsCount, // Track results count as "output tokens"
      cost: parseFloat(cost.toFixed(6))
    };
  } catch (error) {
    logger('error', 'Failed to extract Apify usage', { error: error.message, actorId, response });
    return { inputTokens: 0, outputTokens: 0, cost: 0 };
  }
}

// ============================================================================
// DYNAMIC COST CALCULATORS - Auto-select based on provider and model
// ============================================================================

export const CostCalculators = {
  openai: (response: any, model: string) => extractOpenAIUsage(response, model),
  anthropic: (response: any, model: string) => extractAnthropicUsage(response, model),
  apify: (response: any, actorId: string) => extractApifyUsage(response, actorId)
};

// ============================================================================
// REWRITTEN METERED CALL FUNCTION - Proper cost calculation
// ============================================================================

export async function meteredCall<T>(
  ctx: MeteringContext,
  provider: 'openai' | 'anthropic' | 'apify',
  model: string,
  purpose: UsageEvent['purpose'],
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let result: T;
  let error: Error | null = null;
  let httpStatus = 200;

  try {
    result = await operation();
    logger('info', 'Metered call completed successfully', { 
      provider, 
      model, 
      purpose,
      hasResponse: !!result
    }, ctx.requestId);
  } catch (err: any) {
    error = err;
    httpStatus = err.status || 500;
    logger('error', 'Metered call failed', { 
      provider, 
      model, 
      purpose, 
      error: err.message,
      httpStatus 
    }, ctx.requestId);
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    
    // Extract usage information using the appropriate calculator
    let usage = { inputTokens: 0, outputTokens: 0, cost: 0 };
    
    if (result && !error) {
      try {
        const calculator = CostCalculators[provider];
        if (calculator) {
          usage = calculator(result, model);
          logger('debug', 'Cost calculation successful', { 
            provider, 
            model, 
            usage,
            responseType: typeof result 
          });
        } else {
          logger('warn', 'No cost calculator found for provider', { provider, model });
        }
      } catch (calcError) {
        logger('error', 'Cost calculation failed', { 
          error: calcError.message, 
          provider, 
          model,
          responseStructure: typeof result === 'object' ? Object.keys(result as any) : typeof result
        }, ctx.requestId);
        // Don't fail the entire request due to cost calculation errors
        usage = { inputTokens: 0, outputTokens: 0, cost: 0 };
      }
    }

    // Calculate cost per token for detailed logging
    const totalTokens = usage.inputTokens + usage.outputTokens;
    let costPerInputToken = 0;
    let costPerOutputToken = 0;
    
    if (provider !== 'apify' && totalTokens > 0) {
      // For AI providers, calculate actual cost per token
      if (provider === 'openai' && PRICING_2025.openai[model]) {
        costPerInputToken = PRICING_2025.openai[model].input;
        costPerOutputToken = PRICING_2025.openai[model].output;
      } else if (provider === 'anthropic' && PRICING_2025.anthropic[model]) {
        costPerInputToken = PRICING_2025.anthropic[model].input;
        costPerOutputToken = PRICING_2025.anthropic[model].output;
      }
    } else if (provider === 'apify') {
      // For Apify, cost per "output token" (result)
      costPerOutputToken = usage.outputTokens > 0 ? usage.cost / usage.outputTokens : 0;
    }

    // Record the metering event with all details
    ctx.recordEvent({
      provider,
      model,
      purpose,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: totalTokens,
      cost_per_input_token: costPerInputToken,
      cost_per_output_token: costPerOutputToken,
      total_cost_usd: usage.cost,
      duration_ms: duration,
      http_status: httpStatus,
      cache_hit: false, // Will be overridden by caching layer
      error_code: error ? (error as any).code : undefined,
      error_message: error?.message,
      rate_limited: httpStatus === 429,
      throttled: false // Will be overridden by rate limiting layer
    });

    // Log final usage summary
    logger('info', 'Metered call completed', {
      provider,
      model,
      purpose,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalCost: usage.cost,
      duration,
      success: !error
    }, ctx.requestId);
  }

  return result!;
}

// ============================================================================
// ENHANCED SUPABASE LOGGING WITH PROPER ERROR HANDLING
// ============================================================================

export async function logUsageToSupabase(events: UsageEvent[], env: Env): Promise<void> {
  try {
    if (!env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL not found in environment');
    }

    if (!env.SUPABASE_SERVICE_ROLE) {
      throw new Error('SUPABASE_SERVICE_ROLE not found in environment');
    }

    if (events.length === 0) {
      logger('debug', 'No events to log to Supabase');
      return;
    }

    // Filter out events with zero cost AND zero tokens (likely errors)
    const validEvents = events.filter(event => 
      event.total_cost_usd > 0 || event.total_tokens > 0 || event.error_code
    );

    if (validEvents.length === 0) {
      logger('warn', 'No valid events to log (all events had zero cost and tokens)');
      return;
    }

    // Log each event with detailed debugging
    for (const event of validEvents) {
      logger('debug', 'Logging event to Supabase', {
        provider: event.provider,
        model: event.model,
        inputTokens: event.input_tokens,
        outputTokens: event.output_tokens,
        cost: event.total_cost_usd,
        duration: event.duration_ms,
        hasError: !!event.error_code
      });

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
        const errorText = await response.text();
        logger('error', 'Supabase logging failed for individual event', {
          status: response.status,
          error: errorText,
          event: {
            provider: event.provider,
            model: event.model,
            tokens: event.total_tokens,
            cost: event.total_cost_usd
          }
        });
        throw new Error(`Supabase logging failed: ${response.status} - ${errorText}`);
      }
    }

    logger('info', 'Usage logged to Supabase successfully', { 
      eventCount: validEvents.length,
      totalCost: validEvents.reduce((sum, e) => sum + e.total_cost_usd, 0),
      totalTokens: validEvents.reduce((sum, e) => sum + e.total_tokens, 0),
      skippedEvents: events.length - validEvents.length
    });
    
  } catch (error: any) {
    logger('error', 'Failed to log usage to Supabase', { 
      error: error.message,
      eventCount: events.length
    });
    // Don't throw - logging failure shouldn't break the request
  }
}

// ============================================================================
// PERFORMANCE MONITORING CLASS
// ============================================================================

export class PerformanceMonitor {
  private stats = new Map<string, MeteringStats>();

  addRequest(provider: string, cost: number, tokens: number, latency: number, error: boolean, cacheHit: boolean): void {
    const key = provider;
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
    existing.totalCost += cost;
    existing.totalTokens += tokens;
    existing.avgLatency = (existing.avgLatency * (existing.totalRequests - 1) + latency) / existing.totalRequests;
    existing.errorRate = existing.errorRate + (error ? 1 : 0) / existing.totalRequests;
    existing.cacheHitRate = existing.cacheHitRate + (cacheHit ? 1 : 0) / existing.totalRequests;

    this.stats.set(key, existing);
  }

  getStats(provider?: string): MeteringStats | Record<string, MeteringStats> {
    if (provider) {
      return this.stats.get(provider) || {
        provider,
        totalRequests: 0,
        totalCost: 0,
        totalTokens: 0,
        avgLatency: 0,
        errorRate: 0,
        cacheHitRate: 0
      };
    }

    return Object.fromEntries(this.stats);
  }

  clearStats(): void {
    this.stats.clear();
    logger('info', 'Performance monitor stats cleared');
  }
}
