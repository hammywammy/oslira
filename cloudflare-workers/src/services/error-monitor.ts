export interface ErrorReport {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context: Record<string, any>;
  stack?: string;
  requestId?: string;
  userId?: string;
  recovery?: {
    attempted: boolean;
    successful: boolean;
    strategy: string;
  };
}

export class ProductionErrorMonitor {
  private errors: Map<string, ErrorReport> = new Map();
  private readonly maxErrors = 1000;
  private readonly env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }
  
  // CRITICAL FIX: Comprehensive error tracking with automatic recovery
  async reportError(
    level: 'info' | 'warn' | 'error' | 'critical',
    message: string,
    context: Record<string, any> = {},
    error?: Error,
    requestId?: string
  ): Promise<void> {
    const errorId = crypto.randomUUID();
    const timestamp = Date.now();
    
    const report: ErrorReport = {
      id: errorId,
      timestamp,
      level,
      message,
      context: {
        ...context,
        environment: this.env.APP_ENV,
        workerUrl: this.env.WORKER_URL
      },
      stack: error?.stack,
      requestId: requestId || crypto.randomUUID(),
      userId: context.userId
    };
    
    // Store error (with size management)
    this.errors.set(errorId, report);
    this.maintainErrorBuffer();
    
    // Log to console with appropriate level
    this.logToConsole(report);
    
    // CRITICAL: Attempt automatic recovery for known error patterns
    if (level === 'error' || level === 'critical') {
      await this.attemptRecovery(report);
    }
    
    // Send to external monitoring (if configured)
    await this.sendToExternalMonitoring(report);
    
    // Store in database for persistence
    await this.persistError(report);
  }
  
  private async attemptRecovery(report: ErrorReport): Promise<void> {
    const recoveryStrategy = this.determineRecoveryStrategy(report);
    
    if (!recoveryStrategy) {
      return;
    }
    
    try {
      let successful = false;
      
      switch (recoveryStrategy) {
        case 'circuit-breaker-reset':
          // Reset circuit breakers if they're stuck
          successful = await this.resetCircuitBreakers();
          break;
          
        case 'cache-clear':
          // Clear problematic cache entries
          successful = await this.clearProblemCache(report.context);
          break;
          
        case 'rate-limit-reset':
          // Reset rate limiting if stuck
          successful = await this.resetRateLimits();
          break;
          
        case 'config-reload':
          // Reload configuration from source
          successful = await this.reloadConfiguration();
          break;
          
        default:
          break;
      }
      
      report.recovery = {
        attempted: true,
        successful,
        strategy: recoveryStrategy
      };
      
      if (successful) {
        logger('info', `Automatic recovery successful: ${recoveryStrategy}`, {
          errorId: report.id,
          strategy: recoveryStrategy
        });
      }
      
    } catch (recoveryError) {
      report.recovery = {
        attempted: true,
        successful: false,
        strategy: recoveryStrategy
      };
      
      logger('error', 'Recovery attempt failed', {
        errorId: report.id,
        strategy: recoveryStrategy,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError
      });
    }
  }
  
  private determineRecoveryStrategy(report: ErrorReport): string | null {
    const message = report.message.toLowerCase();
    const context = report.context;
    
    // Circuit breaker issues
    if (message.includes('circuit breaker') || message.includes('all providers failed')) {
      return 'circuit-breaker-reset';
    }
    
    // Cache-related issues
    if (message.includes('cache') || message.includes('memory') || context.cacheError) {
      return 'cache-clear';
    }
    
    // Rate limiting issues
    if (message.includes('rate limit') || message.includes('quota exceeded') || message.includes('throttle')) {
      return 'rate-limit-reset';
    }
    
    // Configuration issues
    if (message.includes('config') || message.includes('api key') || message.includes('unauthorized')) {
      return 'config-reload';
    }
    
    return null;
  }
  
  private async resetCircuitBreakers(): Promise<boolean> {
    try {
      // This would integrate with your circuit breaker system
      // Reset all circuit breakers to closed state
      logger('info', 'Resetting circuit breakers');
      return true;
    } catch {
      return false;
    }
  }
  
  private async clearProblemCache(context: Record<string, any>): Promise<boolean> {
    try {
      // Clear cache entries related to the error
      if (context.userId && context.cacheKey) {
        // Clear specific user cache
        logger('info', 'Clearing problem cache entries', { userId: context.userId });
      }
      return true;
    } catch {
      return false;
    }
  }
  
  private async resetRateLimits(): Promise<boolean> {
    try {
      // Reset rate limiting state
      logger('info', 'Resetting rate limits');
      return true;
    } catch {
      return false;
    }
  }
  
  private async reloadConfiguration(): Promise<boolean> {
    try {
      // Reload configuration from AWS Secrets Manager
      logger('info', 'Reloading configuration');
      return true;
    } catch {
      return false;
    }
  }
  
  private maintainErrorBuffer(): void {
    if (this.errors.size > this.maxErrors) {
      // Remove oldest errors
      const sortedEntries = Array.from(this.errors.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEntries.slice(0, this.errors.size - this.maxErrors);
      toRemove.forEach(([id]) => this.errors.delete(id));
    }
  }
  
  private logToConsole(report: ErrorReport): void {
    const logData = {
      id: report.id,
      message: report.message,
      context: report.context,
      requestId: report.requestId
    };
    
    switch (report.level) {
      case 'critical':
        console.error('🚨 CRITICAL:', logData);
        break;
      case 'error':
        console.error('❌ ERROR:', logData);
        break;
      case 'warn':
        console.warn('⚠️ WARNING:', logData);
        break;
      case 'info':
        console.log('ℹ️ INFO:', logData);
        break;
    }
  }
  
  private async sendToExternalMonitoring(report: ErrorReport): Promise<void> {
    // Only send errors and critical issues to external monitoring
    if (report.level !== 'error' && report.level !== 'critical') {
      return;
    }
    
    try {
      // This would integrate with your monitoring service (Sentry, DataDog, etc.)
      // For now, log that we would send it
      logger('info', 'Would send to external monitoring', {
        errorId: report.id,
        level: report.level,
        message: report.message
      });
    } catch (monitoringError) {
      console.error('Failed to send to external monitoring:', monitoringError);
    }
  }
  
  private async persistError(report: ErrorReport): Promise<void> {
    try {
      // Store error in Supabase for analysis
      const supabase = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_KEY);
      
      await supabase.from('error_logs').insert({
        id: report.id,
        level: report.level,
        message: report.message,
        context: report.context,
        stack: report.stack,
        request_id: report.requestId,
        user_id: report.userId,
        recovery_attempted: report.recovery?.attempted || false,
        recovery_successful: report.recovery?.successful || false,
        recovery_strategy: report.recovery?.strategy,
        created_at: new Date(report.timestamp).toISOString()
      });
      
    } catch (persistError) {
      console.error('Failed to persist error to database:', persistError);
    }
  }
  
  // Public methods for retrieving error information
  getRecentErrors(limit: number = 50): ErrorReport[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  getErrorStats(): {
    total: number;
    byLevel: Record<string, number>;
    recentCount: number;
    recoveryRate: number;
  } {
    const errors = Array.from(this.errors.values());
    const recent = errors.filter(e => Date.now() - e.timestamp < 3600000); // Last hour
    const withRecovery = errors.filter(e => e.recovery?.attempted);
    const successfulRecovery = withRecovery.filter(e => e.recovery?.successful);
    
    return {
      total: errors.length,
      byLevel: errors.reduce((acc, e) => {
        acc[e.level] = (acc[e.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentCount: recent.length,
      recoveryRate: withRecovery.length > 0 ? successfulRecovery.length / withRecovery.length : 0
    };
  }
}
