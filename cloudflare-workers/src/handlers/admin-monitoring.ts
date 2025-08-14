// ============================================================================
// ADMIN MONITORING HANDLER
// File: cloudflare-workers/src/handlers/admin-monitoring.ts
// Complete admin endpoints for AI analysis monitoring dashboard
// ============================================================================

import { Context } from 'hono';
import { Env } from '../types/interfaces';
import { getSystemHealthStatus, getCostBreakdown, getAnalysisPerformanceStats, optimizeCache } from '../services/ai-analysis';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// ============================================================================
// ADMIN ENDPOINT: /admin/usage-stats
// ============================================================================
export async function handleUsageStats(c: Context<{ Bindings: Env }>) {
  const requestId = crypto.randomUUID();
  
  try {
    logger('info', 'Admin usage stats requested', {}, requestId);
    
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
        acc[provider] = { requests: 0, cost: 0, tokens: 0 };
      }
      acc[provider].requests += 1;
      acc[provider].cost += log.total_cost_usd || 0;
      acc[provider].tokens += (log.input_tokens || 0) + (log.output_tokens || 0);
      return acc;
    }, {} as Record<string, { requests: number; cost: number; tokens: number }>);

    // Top users by cost
    const userStats = usageData
      .filter(log => log.meta?.user_id)
      .reduce((acc, log) => {
        const userId = log.meta.user_id;
        if (!acc[userId]) {
          acc[userId] = { total_cost: 0, request_count: 0 };
        }
        acc[userId].total_cost += log.total_cost_usd || 0;
        acc[userId].request_count += 1;
        return acc;
      }, {} as Record<string, { total_cost: number; request_count: number }>);

    const topUsers = Object.entries(userStats)
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.total_cost - a.total_cost)
      .slice(0, 10);

    // Recent activity (last 10 requests)
    const recentActivity = usageData.slice(0, 10).map(log => ({
      id: log.id,
      provider: log.provider,
      model: log.model,
      cost: log.total_cost_usd,
      tokens: (log.input_tokens || 0) + (log.output_tokens || 0),
      cache_hit: log.cache_hit,
      created_at: log.created_at,
      user_id: log.meta?.user_id || 'unknown'
    }));

    const response = {
      success: true,
      data: {
        summary: {
          totalRequests,
          totalCost: Number(totalCost.toFixed(6)),
          totalTokens,
          avgCostPerRequest: totalRequests > 0 ? Number((totalCost / totalRequests).toFixed(6)) : 0,
          cacheHitRate: usageData.filter(log => log.cache_hit).length / Math.max(totalRequests, 1)
        },
        providerStats,
        topUsers,
        recentActivity,
        timeRange: '24 hours',
        timestamp: new Date().toISOString()
      }
    };

    logger('info', 'Usage stats generated successfully', { 
      totalRequests, 
      totalCost: response.data.summary.totalCost,
      providers: Object.keys(providerStats).length 
    }, requestId);

    return c.json(response);
    
  } catch (error: any) {
    logger('error', 'Usage stats handler failed', { error: error.message }, requestId);
    return c.json({ 
      success: false, 
      error: error.message,
      requestId 
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/cost-breakdown
// ============================================================================
export async function handleCostBreakdown(c: Context<{ Bindings: Env }>) {
  const requestId = crypto.randomUUID();
  
  try {
    logger('info', 'Admin cost breakdown requested', {}, requestId);
    
    // Get enhanced cost breakdown from AI analysis service
    const stats = getCostBreakdown();
    
    // Also get database summary for validation
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE);
    
    const { data: dbStats, error } = await supabase
      .from('ai_usage_logs')
      .select('provider, total_cost_usd, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      logger('warn', 'Database cost query failed, using service stats only', { error: error.message }, requestId);
    }

    // Calculate database totals for comparison
    let dbTotals = { total: 0, openai: 0, anthropic: 0 };
    if (dbStats) {
      dbTotals = dbStats.reduce((acc, log) => {
        const cost = log.total_cost_usd || 0;
        acc.total += cost;
        if (log.provider === 'openai') acc.openai += cost;
        if (log.provider === 'anthropic') acc.anthropic += cost;
        return acc;
      }, { total: 0, openai: 0, anthropic: 0 });
    }

    const response = {
      success: true,
      data: {
        enhancedStats: stats,
        databaseTotals: {
          total: Number(dbTotals.total.toFixed(6)),
          openai: Number(dbTotals.openai.toFixed(6)),
          anthropic: Number(dbTotals.anthropic.toFixed(6))
        },
        comparison: {
          dataSource: 'enhanced_ai_service',
          validated: dbStats ? 'database_verified' : 'service_only'
        },
        timestamp: new Date().toISOString()
      }
    };

    logger('info', 'Cost breakdown generated', { 
      serviceTotal: stats.total?.cost || 0,
      dbTotal: dbTotals.total 
    }, requestId);

    return c.json(response);
    
  } catch (error: any) {
    logger('error', 'Cost breakdown handler failed', { error: error.message }, requestId);
    return c.json({ 
      success: false, 
      error: error.message,
      requestId 
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/system-health
// ============================================================================
export async function handleSystemHealth(c: Context<{ Bindings: Env }>) {
  const requestId = crypto.randomUUID();
  
  try {
    logger('info', 'Admin system health requested', {}, requestId);
    
    // Get system health from AI analysis service
    const health = getSystemHealthStatus();
    
    // Get latest system snapshot from database
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE);
    
    const { data: latestSnapshot, error } = await supabase
      .from('system_health_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger('warn', 'Health snapshot query failed', { error: error.message }, requestId);
    }

    // Get recent error rates
    const { data: recentLogs, error: logsError } = await supabase
      .from('ai_usage_logs')
      .select('http_status, created_at')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false });

    let errorRate = 0;
    if (!logsError && recentLogs) {
      const totalRequests = recentLogs.length;
      const errorRequests = recentLogs.filter(log => log.http_status >= 400).length;
      errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
    }

    const response = {
      success: true,
      data: {
        serviceHealth: health,
        databaseSnapshot: latestSnapshot ? {
          cache_hit_rate: latestSnapshot.cache_hit_rate,
          total_active_users: latestSnapshot.total_active_users,
          avg_response_time_ms: latestSnapshot.avg_response_time_ms,
          memory_usage_mb: latestSnapshot.memory_usage_mb,
          openai_requests_remaining: latestSnapshot.openai_requests_remaining,
          anthropic_requests_remaining: latestSnapshot.anthropic_requests_remaining,
          snapshot_time: latestSnapshot.created_at
        } : null,
        metrics: {
          errorRate: Number(errorRate.toFixed(2)),
          totalRequestsLastHour: recentLogs?.length || 0,
          lastSnapshotAge: latestSnapshot 
            ? Math.round((Date.now() - new Date(latestSnapshot.created_at).getTime()) / 1000 / 60)
            : null
        },
        timestamp: new Date().toISOString()
      }
    };

    logger('info', 'System health generated', { 
      overallHealth: health.overallHealth,
      errorRate: errorRate,
      hasSnapshot: !!latestSnapshot
    }, requestId);

    return c.json(response);
    
  } catch (error: any) {
    logger('error', 'System health handler failed', { error: error.message }, requestId);
    return c.json({ 
      success: false, 
      error: error.message,
      requestId 
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/top-users
// ============================================================================
export async function handleTopUsers(c: Context<{ Bindings: Env }>) {
  const requestId = crypto.randomUUID();
  
  try {
    logger('info', 'Admin top users requested', {}, requestId);
    
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE);
    
    // Get usage data with user information
    const { data: usageData, error } = await supabase
      .from('ai_usage_logs')
      .select('meta, total_cost_usd, created_at')
      .not('meta->user_id', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (error) {
      logger('error', 'Failed to fetch user usage data', { error: error.message }, requestId);
      throw error;
    }

    // Group by user and calculate totals
    const userStats = usageData.reduce((acc, log) => {
      const userId = log.meta?.user_id;
      if (!userId) return acc;
      
      if (!acc[userId]) {
        acc[userId] = { 
          total_cost: 0, 
          request_count: 0, 
          last_activity: log.created_at,
          business_ids: new Set()
        };
      }
      
      acc[userId].total_cost += log.total_cost_usd || 0;
      acc[userId].request_count += 1;
      
      // Track most recent activity
      if (new Date(log.created_at) > new Date(acc[userId].last_activity)) {
        acc[userId].last_activity = log.created_at;
      }
      
      // Track business IDs for this user
      if (log.meta?.business_id) {
        acc[userId].business_ids.add(log.meta.business_id);
      }
      
      return acc;
    }, {} as Record<string, { 
      total_cost: number; 
      request_count: number; 
      last_activity: string;
      business_ids: Set<string>;
    }>);

    // Get user details for top users
    const topUserIds = Object.entries(userStats)
      .sort(([,a], [,b]) => b.total_cost - a.total_cost)
      .slice(0, 20)
      .map(([userId]) => userId);

    const { data: userDetails, error: userError } = await supabase
      .from('users')
      .select('id, email, created_at, subscription_status')
      .in('id', topUserIds);

    if (userError) {
      logger('warn', 'Failed to fetch user details', { error: userError.message }, requestId);
    }

    // Combine stats with user details
    const topUsers = Object.entries(userStats)
      .map(([userId, stats]) => {
        const userDetail = userDetails?.find(u => u.id === userId);
        return {
          userId,
          email: userDetail?.email || 'unknown',
          total_cost: Number(stats.total_cost.toFixed(6)),
          request_count: stats.request_count,
          avg_cost_per_request: Number((stats.total_cost / stats.request_count).toFixed(6)),
          last_activity: stats.last_activity,
          business_count: stats.business_ids.size,
          subscription_status: userDetail?.subscription_status || 'unknown',
          account_age_days: userDetail?.created_at 
            ? Math.round((Date.now() - new Date(userDetail.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : null
        };
      })
      .sort((a, b) => b.total_cost - a.total_cost)
      .slice(0, 10);

    const response = {
      success: true,
      data: {
        topUsers,
        summary: {
          totalUsers: Object.keys(userStats).length,
          totalCost: Number(Object.values(userStats).reduce((sum, stats) => sum + stats.total_cost, 0).toFixed(6)),
          totalRequests: Object.values(userStats).reduce((sum, stats) => sum + stats.request_count, 0),
          avgCostPerUser: Object.keys(userStats).length > 0 
            ? Number((Object.values(userStats).reduce((sum, stats) => sum + stats.total_cost, 0) / Object.keys(userStats).length).toFixed(6))
            : 0
        },
        timeRange: '7 days',
        timestamp: new Date().toISOString()
      }
    };

    logger('info', 'Top users generated', { 
      totalUsers: response.data.summary.totalUsers,
      topUserCost: topUsers[0]?.total_cost || 0
    }, requestId);

    return c.json(response);
    
  } catch (error: any) {
    logger('error', 'Top users handler failed', { error: error.message }, requestId);
    return c.json({ 
      success: false, 
      error: error.message,
      requestId 
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/cache-optimize
// ============================================================================
export async function handleCacheOptimize(c: Context<{ Bindings: Env }>) {
  const requestId = crypto.randomUUID();
  
  try {
    logger('info', 'Admin cache optimization requested', {}, requestId);
    
    const result = optimizeCache();
    
    const response = {
      success: true,
      data: {
        optimization: result,
        timestamp: new Date().toISOString()
      }
    };

    logger('info', 'Cache optimization completed', { 
      optimizations: result.optimizations.length,
      beforeHitRate: result.before.hitRate 
    }, requestId);

    return c.json(response);
    
  } catch (error: any) {
    logger('error', 'Cache optimization failed', { error: error.message }, requestId);
    return c.json({ 
      success: false, 
      error: error.message,
      requestId 
    }, 500);
  }
}

// ============================================================================
// ADMIN ENDPOINT: /admin/performance-stats
// ============================================================================
export async function handlePerformanceStats(c: Context<{ Bindings: Env }>) {
  const requestId = crypto.randomUUID();
  
  try {
    logger('info', 'Admin performance stats requested', {}, requestId);
    
    const stats = getAnalysisPerformanceStats();
    
    const response = {
      success: true,
      data: {
        performance: stats,
        timestamp: new Date().toISOString()
      }
    };

    logger('info', 'Performance stats generated', { 
      openaiCalls: stats.openai?.count || 0,
      anthropicCalls: stats.anthropic?.count || 0 
    }, requestId);

    return c.json(response);
    
  } catch (error: any) {
    logger('error', 'Performance stats handler failed', { error: error.message }, requestId);
    return c.json({ 
      success: false, 
      error: error.message,
      requestId 
    }, 500);
  }
}
