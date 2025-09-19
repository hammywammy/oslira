import { logger } from './logger.js';

export interface PerformanceMetrics {
  requestId: string;
  analysisType: string;
  systemUsed: 'optimized_direct' | 'legacy_pipeline';
  username: string;
  
  // Timing metrics
  totalDurationMs: number;
  scrapingDurationMs: number;
  analysisDurationMs: number;
  
  // Cost metrics
  actualCost: number;
  creditsUsed: number;
  marginPercentage: number;
  
  // Quality metrics
  overallScore: number;
  confidenceLevel: number;
  dataQuality: string;
  
  // System metrics
  blocksUsed: string[];
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private env: any;

  constructor(env: any) {
    this.env = env;
  }

  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    logger('info', 'Performance metrics recorded', {
      requestId: metrics.requestId,
      analysisType: metrics.analysisType,
      systemUsed: metrics.systemUsed,
      totalDurationMs: metrics.totalDurationMs,
      actualCost: metrics.actualCost,
      overallScore: metrics.overallScore,
      marginPercentage: metrics.marginPercentage
    });

    // Log to external monitoring if configured
    this.sendToExternalMonitoring(metrics);
  }

  private async sendToExternalMonitoring(metrics: PerformanceMetrics): Promise<void> {
    try {
      // Send to external monitoring service (e.g., DataDog, New Relic)
      if (this.env.MONITORING_ENDPOINT) {
        await fetch(this.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'oslira_worker',
            timestamp: new Date().toISOString(),
            metrics
          })
        });
      }
    } catch (error: any) {
      logger('warn', 'Failed to send metrics to external monitoring', { 
        error: error.message 
      });
    }
  }

  getSystemComparison(): any {
    const optimizedMetrics = this.metrics.filter(m => m.systemUsed === 'optimized_direct');
    const legacyMetrics = this.metrics.filter(m => m.systemUsed === 'legacy_pipeline');

    if (optimizedMetrics.length === 0 || legacyMetrics.length === 0) {
      return { status: 'insufficient_data' };
    }

    const avgOptimized = this.calculateAverages(optimizedMetrics);
    const avgLegacy = this.calculateAverages(legacyMetrics);

    return {
      optimized: avgOptimized,
      legacy: avgLegacy,
      improvements: {
        speedImprovement: `${Math.round((1 - avgOptimized.avgDuration / avgLegacy.avgDuration) * 100)}%`,
        costReduction: `${Math.round((1 - avgOptimized.avgCost / avgLegacy.avgCost) * 100)}%`,
        marginImprovement: `${Math.round(avgOptimized.avgMargin - avgLegacy.avgMargin)}pp`,
        qualityChange: `${Math.round(avgOptimized.avgScore - avgLegacy.avgScore)} points`
      }
    };
  }
}
