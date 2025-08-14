// ============================================================================
// COMPLETE ADMIN MONITORING HANDLERS
// File: src/handlers/admin-monitoring.ts
// ============================================================================

import type { Context } from 'hono';
import type { Env } from '../types/interfaces.js';
import { 
  getSystemHealthStatus, 
  getCostBreakdown, 
  getAnalysisPerformanceStats, 
  optimizeCache,
  clearUserCache,
  getEnhancedCacheStats,
  getRateLimitStatus
} from '../services/ai-analysis.js';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { getAdminContext } from '../middleware/admin-auth.js';

// ============================================================================
// ADMIN ENDPOINT: /admin/usage-stats
// ============================================================================
export async function handleUsageStats(c: Context<{ Bindings: Env }>) {
  const { requestId, clientIP } = getAdminContext(c as any);
  
  try {
    logger('info', 'Admin usage stats requested', { clientIP }, requestId);
    
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE);
    
    // Get usage statistics from ai_usage_logs table
    const { data: usageData, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      logger('error', 'Failed to fetch usage stats', { error: error.message }, requestId);
      throw error;
    }

    // Calculate summary statistics
    const totalRequests = usageData.length;
    const totalCost = usageData.reduce((sum, log) => sum + (log.total_cost_usd || 0), 0);
    const totalTokens = usageData.reduce((sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0);
    
    // Provider breakdown
    const providerStats = usageData.reduce((acc, log) => {
      const provider = log.provider;
      if (!acc[provider]) {
        acc[provider] = { requests: 0, cost: 0, tokens: 0, cacheHits: 0 };
      }
      acc[provider].requests += 1;
      acc[provider].cost += log.total_cost_usd || 0;
      acc[provider].tokens += (log.input_tokens || 0) + (log.output_tokens || 0);
      if (log.cache_hit) acc[provider].cacheHits += 1;
      return acc;
    }, {} as Record<string, { requests: number; cost: number; tokens: number; cacheHits: number }>);

    // Top users by cost
    const userStats = usageData
      .filter(log => log.meta?.user_id)
      .reduce((acc, log) => {
        const userId = log.meta.user_id;
        if (!acc[userId]) {
          acc[userId] = { requests: 0, cost: 0, tokens: 0 };
        }
        acc[userId].requests += 1;
        acc[userId].cost += log.total_cost_usd || 0;
        acc[userId].tokens += (log.input_tokens || 0) + (log.output_tokens || 0);
        return acc;
      }, {} as Record<string, { requests: number; cost: number; tokens: number }>);

    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([userId, stats]) => ({ userId, ...stats }));

    // Time-based analysis (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUsage = usageData.filter(log => new Date(log.created_at) > last24h);
    
    const response = {
      success: true,
      data: {
        summary: {
          totalRequests,
          totalCost: parseFloat(totalCost.toFixed(6)),
          totalTokens,
          avgCostPerRequest: totalRequests > 0 ? parseFloat((totalCost / totalRequests).toFixed(6)) : 0,
          avgTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0
        },
        providers: providerStats,
        topUsers,
        last24Hours: {
          requests: recentUsage.length,
          cost: parseFloat(recentUsage.reduce((sum, log) => sum + (log.total_cost_usd || 0), 0).toFixed(6)),
          avgLatency: recentUsage.length > 0 
            ? Math.round(recentUsage.reduce((sum, log) => sum + (log.meta?.duration_ms || 0), 0) / recentUsage.length)
            : 0
        },
        cachePerformance: getEnhancedCacheStats(),
        rateLimits: getRateLimitStatus()
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    return c.json(response);
    
  } catch (error: any) {
    logger('error', 'Failed to get usage stats', { error: error.message, clientIP }, requestId);
    return c.json({
      success: false,
      error: 'Failed to retrieve usage statistics',
      requestId
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/cost-breakdown
// ============================================================================
export async function handleCostBreakdown(c: Context<{ Bindings: Env }>) {
  const { requestId, clientIP } = getAdminContext(c as any);
  
  try {
    logger('info', 'Admin cost breakdown requested', { clientIP }, requestId);
    
    const costData = getCostBreakdown();
    const performanceStats = getAnalysisPerformanceStats();
    
    return c.json({
      success: true,
      data: {
        costs: costData,
        performance: {
          totalAnalyses: performanceStats.openai.count + performanceStats.anthropic.count,
          avgLatency: Math.round((performanceStats.openai.avgLatency + performanceStats.anthropic.avgLatency) / 2),
          errorRate: ((performanceStats.openai.errorRate + performanceStats.anthropic.errorRate) / 2 * 100).toFixed(2) + '%'
        },
        predictions: {
          dailyCost: costData.total.cost * 24, // Rough estimate
          monthlyCost: costData.total.cost * 24 * 30,
          costPerUser: costData.total.calls > 0 ? costData.total.cost / costData.total.calls : 0
        }
      },
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger('error', 'Failed to get cost breakdown', { error: error.message, clientIP }, requestId);
    return c.json({
      success: false,
      error: 'Failed to retrieve cost breakdown',
      requestId
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/system-health
// ============================================================================
export async function handleSystemHealth(c: Context<{ Bindings: Env }>) {
  const { requestId, clientIP } = getAdminContext(c as any);
  
  try {
    logger('info', 'Admin system health requested', { clientIP }, requestId);
    
    const healthStatus = getSystemHealthStatus();
    
    return c.json({
      success: true,
      data: healthStatus,
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger('error', 'Failed to get system health', { error: error.message, clientIP }, requestId);
    return c.json({
      success: false,
      error: 'Failed to retrieve system health',
      requestId
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/top-users
// ============================================================================
export async function handleTopUsers(c: Context<{ Bindings: Env }>) {
  const { requestId, clientIP } = getAdminContext(c as any);
  
  try {
    logger('info', 'Admin top users requested', { clientIP }, requestId);
    
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE);
    
    // Get top users by usage and cost
    const { data: usageData, error } = await supabase
      .from('ai_usage_logs')
      .select('meta, total_cost_usd, input_tokens, output_tokens, created_at')
      .not('meta->user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5000); // Larger sample for better analysis

    if (error) {
      logger('error', 'Failed to fetch user data', { error: error.message }, requestId);
      throw error;
    }

    // Aggregate user statistics
    const userAggregates = usageData.reduce((acc, log) => {
      const userId = log.meta?.user_id;
      if (!userId) return acc;
      
      if (!acc[userId]) {
        acc[userId] = {
          requests: 0,
          totalCost: 0,
          totalTokens: 0,
          lastActive: log.created_at,
          avgCostPerRequest: 0
        };
      }
      
      acc[userId].requests += 1;
      acc[userId].totalCost += log.total_cost_usd || 0;
      acc[userId].totalTokens += (log.input_tokens || 0) + (log.output_tokens || 0);
      
      // Update last active if this log is more recent
      if (new Date(log.created_at) > new Date(acc[userId].lastActive)) {
        acc[userId].lastActive = log.created_at;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and sort
    const topUsers = Object.entries(userAggregates)
      .map(([userId, stats]) => ({
        userId,
        requests: stats.requests,
        totalCost: parseFloat(stats.totalCost.toFixed(6)),
        totalTokens: stats.totalTokens,
        avgCostPerRequest: parseFloat((stats.totalCost / stats.requests).toFixed(6)),
        avgTokensPerRequest: Math.round(stats.totalTokens / stats.requests),
        lastActive: stats.lastActive,
        daysSinceActive: Math.round((Date.now() - new Date(stats.lastActive).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 20);

    return c.json({
      success: true,
      data: {
        topUsersByCost: topUsers.slice(0, 10),
        topUsersByUsage: [...topUsers].sort((a, b) => b.requests - a.requests).slice(0, 10),
        recentlyActive: topUsers.filter(u => u.daysSinceActive <= 7).slice(0, 10),
        totalUniqueUsers: Object.keys(userAggregates).length,
        avgRequestsPerUser: topUsers.length > 0 
          ? Math.round(topUsers.reduce((sum, u) => sum + u.requests, 0) / topUsers.length)
          : 0
      },
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger('error', 'Failed to get top users', { error: error.message, clientIP }, requestId);
    return c.json({
      success: false,
      error: 'Failed to retrieve top users',
      requestId
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/cache-optimize
// ============================================================================
export async function handleCacheOptimize(c: Context<{ Bindings: Env }>) {
  const { requestId, clientIP } = getAdminContext(c as any);
  
  try {
    logger('info', 'Admin cache optimization requested', { clientIP }, requestId);
    
    const optimizationResult = optimizeCache();
    
    return c.json({
      success: true,
      data: optimizationResult,
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger('error', 'Failed to optimize cache', { error: error.message, clientIP }, requestId);
    return c.json({
      success: false,
      error: 'Failed to optimize cache',
      requestId
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/clear-user-cache
// ============================================================================
export async function handleClearUserCache(c: Context<{ Bindings: Env }>) {
  const { requestId, clientIP } = getAdminContext(c as any);
  
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({
        success: false,
        error: 'userId required',
        requestId
      }, 400);
    }
    
    logger('info', 'Admin user cache clear requested', { userId, clientIP }, requestId);
    
    const clearResult = clearUserCache(userId);
    
    return c.json({
      success: true,
      data: clearResult,
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger('error', 'Failed to clear user cache', { error: error.message, clientIP }, requestId);
    return c.json({
      success: false,
      error: 'Failed to clear user cache',
      requestId
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/performance-stats
// ============================================================================
export async function handlePerformanceStats(c: Context<{ Bindings: Env }>) {
  const { requestId, clientIP } = getAdminContext(c as any);
  
  try {
    logger('info', 'Admin performance stats requested', { clientIP }, requestId);
    
    const performanceData = getAnalysisPerformanceStats();
    
    return c.json({
      success: true,
      data: performanceData,
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger('error', 'Failed to get performance stats', { error: error.message, clientIP }, requestId);
    return c.json({
      success: false,
      error: 'Failed to retrieve performance statistics',
      requestId
    }, 500);
  }
}
