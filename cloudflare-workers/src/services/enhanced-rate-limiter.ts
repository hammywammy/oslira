export interface RateLimitInfo {
  provider: string;
  requests_remaining?: number;
  tokens_remaining?: number;
  reset_time?: string;
  lastUpdated: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  throttleThresholds: {
    requests: number;
    tokens: number;
  };
  delays: {
    warning: number;
    critical: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeout: number;
  };
}

export class EnhancedRateLimitMonitor {
  private limits: Map<string, RateLimitInfo> = new Map();
  private throttleState: Map<string, number> = new Map(); // provider -> next allowed time
  private circuitStates: Map<string, { 
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
  }> = new Map();
  
  private readonly config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  // CRITICAL FIX: Advanced throttling with exponential backoff
  shouldThrottle(provider: 'openai' | 'anthropic'): { 
    throttle: boolean; 
    delay: number; 
    reason?: string;
    severity: 'none' | 'warning' | 'critical' | 'circuit-open';
  } {
    if (!this.config.enabled) {
      return { throttle: false, delay: 0, severity: 'none' };
    }
    
    // Check circuit breaker first
    const circuitState = this.circuitStates.get(provider);
    if (circuitState?.state === 'open') {
      const timeSinceLastFailure = Date.now() - circuitState.lastFailure;
      if (timeSinceLastFailure < this.config.circuitBreaker.recoveryTimeout) {
        return {
          throttle: true,
          delay: this.config.circuitBreaker.recoveryTimeout - timeSinceLastFailure,
          reason: 'Circuit breaker open',
          severity: 'circuit-open'
        };
      } else {
        // Try to recover
        circuitState.state = 'half-open';
      }
    }
    
    // Check manual throttle state
    const nextAllowedTime = this.throttleState.get(provider) || 0;
    if (Date.now() < nextAllowedTime) {
      return {
        throttle: true,
        delay: nextAllowedTime - Date.now(),
        reason: 'Throttled due to previous rate limit',
        severity: 'warning'
      };
    }
    
    const limits = this.limits.get(provider);
    if (!limits) {
      return { throttle: false, delay: 0, severity: 'none' };
    }
    
    // CRITICAL: Check for emergency throttling conditions
    if (limits.requests_remaining !== undefined && limits.requests_remaining <= 2) {
      const delay = this.config.delays.critical * 2; // Double delay for emergency
      this.setThrottleState(provider, delay);
      return { 
        throttle: true, 
        delay,
        reason: `Emergency: Only ${limits.requests_remaining} requests remaining`,
        severity: 'critical'
      };
    }
    
    if (limits.tokens_remaining !== undefined && limits.tokens_remaining <= this.config.throttleThresholds.tokens / 20) {
      const delay = this.config.delays.critical * 1.5;
      this.setThrottleState(provider, delay);
      return { 
        throttle: true, 
        delay,
        reason: `Emergency: Only ${limits.tokens_remaining} tokens remaining`,
        severity: 'critical'
      };
    }
    
    // WARNING: Check for warning-level throttling
    if (limits.requests_remaining !== undefined && limits.requests_remaining <= this.config.throttleThresholds.requests) {
      const delay = this.config.delays.warning;
      this.setThrottleState(provider, delay);
      return { 
        throttle: true, 
        delay,
        reason: `Warning: ${limits.requests_remaining} requests remaining`,
        severity: 'warning'
      };
    }
    
    if (limits.tokens_remaining !== undefined && limits.tokens_remaining <= this.config.throttleThresholds.tokens) {
      const delay = this.config.delays.warning;
      this.setThrottleState(provider, delay);
      return { 
        throttle: true, 
        delay,
        reason: `Warning: ${limits.tokens_remaining} tokens remaining`,
        severity: 'warning'
      };
    }
    
    return { throttle: false, delay: 0, severity: 'none' };
  }
  
  private setThrottleState(provider: string, delayMs: number): void {
    this.throttleState.set(provider, Date.now() + delayMs);
  }
  
  // CRITICAL FIX: Enhanced limit tracking with circuit breaker integration
  updateLimits(provider: 'openai' | 'anthropic', headers: Headers): RateLimitInfo {
    const limits: RateLimitInfo = {
      provider,
      lastUpdated: Date.now()
    };
    
    // Parse provider-specific headers
    if (provider === 'openai') {
      limits.requests_remaining = this.parseIntHeader(headers, 'x-ratelimit-remaining-requests');
      limits.tokens_remaining = this.parseIntHeader(headers, 'x-ratelimit-remaining-tokens');
      limits.reset_time = headers.get('x-ratelimit-reset-requests') || undefined;
    } else if (provider === 'anthropic') {
      limits.requests_remaining = this.parseIntHeader(headers, 'anthropic-ratelimit-requests-remaining');
      limits.tokens_remaining = this.parseIntHeader(headers, 'anthropic-ratelimit-tokens-remaining');
      limits.reset_time = headers.get('anthropic-ratelimit-requests-reset') || undefined;
    }
    
    this.limits.set(provider, limits);
    
    // Update circuit breaker on successful request
    this.recordSuccess(provider);
    
    // Log critical thresholds
    if (limits.requests_remaining !== undefined && limits.requests_remaining <= 10) {
      logger('warn', `${provider} approaching rate limits`, {
        requests_remaining: limits.requests_remaining,
        tokens_remaining: limits.tokens_remaining,
        reset_time: limits.reset_time
      });
    }
    
    return limits;
  }
  
  private parseIntHeader(headers: Headers, key: string): number | undefined {
    const value = headers.get(key);
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  // Circuit breaker methods
  recordFailure(provider: string): void {
    const state = this.circuitStates.get(provider) || { 
      state: 'closed', 
      failures: 0, 
      lastFailure: 0 
    };
    
    state.failures++;
    state.lastFailure = Date.now();
    
    if (state.failures >= this.config.circuitBreaker.failureThreshold) {
      state.state = 'open';
      logger('error', `Circuit breaker opened for ${provider}`, {
        failures: state.failures,
        threshold: this.config.circuitBreaker.failureThreshold
      });
    }
    
    this.circuitStates.set(provider, state);
  }
  
  recordSuccess(provider: string): void {
    const state = this.circuitStates.get(provider);
    if (state) {
      if (state.state === 'half-open') {
        state.state = 'closed';
        state.failures = 0;
        logger('info', `Circuit breaker closed for ${provider} after successful request`);
      } else if (state.state === 'closed') {
        state.failures = Math.max(0, state.failures - 1); // Gradually reduce failures
      }
      this.circuitStates.set(provider, state);
    }
  }
  
  getLimits(provider: 'openai' | 'anthropic'): RateLimitInfo | null {
    return this.limits.get(provider) || null;
  }
  
  getAllLimits(): Record<string, RateLimitInfo> {
    return Object.fromEntries(this.limits);
  }
  
  getCircuitStates(): Record<string, { state: string; failures: number; lastFailure: number }> {
    return Object.fromEntries(this.circuitStates);
  }
}
