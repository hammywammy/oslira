import { logger } from './logger.js';

export interface FeatureFlags {
  USE_DIRECT_ANALYSIS: boolean;
  USE_SMART_BATCHING: boolean;
  ENABLE_PRE_SCREENING: boolean;
  USE_COMPRESSED_PROMPTS: boolean;
  ROLLOUT_PERCENTAGE: number;
}

export class FeatureFlagManager {
  private flags: FeatureFlags;
  private env: any;

  constructor(env: any) {
    this.env = env;
    this.flags = this.loadFlags();
  }

  private loadFlags(): FeatureFlags {
    return {
      USE_DIRECT_ANALYSIS: this.getBooleanFlag('USE_DIRECT_ANALYSIS', false),
      USE_SMART_BATCHING: this.getBooleanFlag('USE_SMART_BATCHING', false),
      ENABLE_PRE_SCREENING: this.getBooleanFlag('ENABLE_PRE_SCREENING', false),
      USE_COMPRESSED_PROMPTS: this.getBooleanFlag('USE_COMPRESSED_PROMPTS', false),
      ROLLOUT_PERCENTAGE: this.getNumberFlag('ROLLOUT_PERCENTAGE', 0)
    };
  }

  private getBooleanFlag(key: string, defaultValue: boolean): boolean {
    const value = this.env[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === true;
  }

  private getNumberFlag(key: string, defaultValue: number): number {
    const value = this.env[key];
    if (value === undefined) return defaultValue;
    return parseInt(String(value)) || defaultValue;
  }

  isEnabled(flagName: keyof FeatureFlags): boolean {
    return this.flags[flagName] as boolean;
  }

  getPercentage(): number {
    return this.flags.ROLLOUT_PERCENTAGE;
  }

  shouldUseOptimizedSystem(requestId: string): boolean {
    const percentage = this.getPercentage();
    if (percentage === 0) return false;
    if (percentage >= 100) return true;

    // Use request ID hash for consistent user experience
    const hash = this.hashString(requestId);
    const bucket = hash % 100;
    
    return bucket < percentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  logFlagStatus(requestId: string): void {
    logger('info', 'Feature flags status', {
      flags: this.flags,
      shouldUseOptimized: this.shouldUseOptimizedSystem(requestId),
      requestId
    });
  }
}
