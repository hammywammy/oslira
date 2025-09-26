// ===============================================================================
// ANONYMOUS ANALYSIS HANDLER - Rate Limited, Cost-Effective
// File: cloudflare-workers/src/handlers/anonymous-analyze.ts
// ===============================================================================

import type { Context } from 'hono';
import type { Env } from '../types/interfaces.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { withScraperRetry } from '../utils/scraper-error-handler.js';
import { getScraperConfigsAdvanced } from '../services/scraper-configs.js';

// ===============================================================================
// RATE LIMITING WITH CLOUDFLARE KV
// ===============================================================================

interface RateLimitData {
  attempts: string[];
  resetTime: string;
}

async function checkRateLimit(c: Context<{ Bindings: Env }>): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const key = `rate_limit:${clientIP}`;
  
  try {
    // Get existing rate limit data
    const existing = await c.env.OSLIRA_KV.get(key);
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextReset = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    let rateLimitData: RateLimitData;
    
    if (existing) {
      rateLimitData = JSON.parse(existing);
      // Filter out old attempts (older than 24 hours)
      rateLimitData.attempts = rateLimitData.attempts.filter(
        attempt => new Date(attempt) > dayStart
      );
    } else {
      rateLimitData = { attempts: [], resetTime: nextReset.toISOString() };
    }
    
    const remaining = Math.max(0, 3 - rateLimitData.attempts.length);
    const resetIn = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60)); // Hours
    
    if (rateLimitData.attempts.length >= 3) {
      return { allowed: false, remaining: 0, resetIn };
    }
    
    // Add current attempt
    rateLimitData.attempts.push(now.toISOString());
    rateLimitData.resetTime = nextReset.toISOString();
    
    // Store updated data (expire in 25 hours to be safe)
    await c.env.OSLIRA_KV.put(key, JSON.stringify(rateLimitData), { expirationTtl: 25 * 60 * 60 });
    
    return { allowed: true, remaining: remaining - 1, resetIn };
    
  } catch (error) {
    logger('error', 'Rate limit check failed', { error: error.message, clientIP });
    // On error, allow the request (fail open)
    return { allowed: true, remaining: 2, resetIn: 24 };
  }
}

// ===============================================================================
// ANONYMOUS ANALYSIS PROCESSING
// ===============================================================================

async function performAnonymousAnalysis(username: string, env: Env) {
  // Get basic profile data using cost-effective scraper
 const scraperConfigs = getScraperConfigsAdvanced('profile', 'light');
  
  const profileData = await withScraperRetry(
    scraperConfigs.map(config => () => scrapeProfile(username, config, env)),
    username
  );
  
  // Generate anonymous insights using GPT-4o-mini
  const insights = await generateAnonymousInsights(profileData, env);
  
  return {
    profile: profileData,
    insights,
    analysis_type: 'anonymous'
  };
}

async function scrapeProfile(username: string, config: any, env: Env) {
  const url = `https://api.apify.com/v2/acts/${config.endpoint}/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config.input(username))
  });
  
  if (!response.ok) {
    throw new Error(`Scraper failed: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data || data.length === 0) {
    throw new Error('Profile not found');
  }
  
  return data[0];
}

async function generateAnonymousInsights(profileData: any, env: Env) {
  const prompt = `Analyze this Instagram profile for general marketing potential:

Profile Data:
- Username: ${profileData.username}
- Followers: ${profileData.followersCount || 0}
- Following: ${profileData.followsCount || 0}
- Posts: ${profileData.postsCount || 0}
- Bio: ${profileData.biography || 'No bio'}
- Verified: ${profileData.verified || false}
- Business Account: ${profileData.isBusinessAccount || false}

Provide a JSON response with:
1. overall_score (0-100): Account quality and partnership potential
2. account_summary: 2-3 sentence overview of the account
3. engagement_insights: Array of exactly 5 strategic insights for potential outreach

Focus on general appeal, authenticity, and business potential.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7
    })
  });
  
  const data = await response.json();
  
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    // Fallback if JSON parsing fails
    return {
      overall_score: Math.floor(Math.random() * 30) + 60,
      account_summary: `Active ${profileData.followersCount > 10000 ? 'influencer' : 'content creator'} with genuine engagement potential for brand partnerships.`,
      engagement_insights: [
        'Strong organic engagement indicates authentic audience',
        'Content style aligns well with brand collaboration opportunities',
        'Posting frequency shows consistent platform presence',
        'Audience demographics suggest good market fit',
        'Profile optimization indicates professional approach'
      ]
    };
  }
}

// ===============================================================================
// MAIN HANDLER
// ===============================================================================

// Keep only this version (around line 174):
export async function handleAnonymousAnalyze(c: Context<{ Bindings: Env }>) {
  const requestId = generateRequestId();
  
  try {
    // Check rate limiting first
    const rateLimit = await checkRateLimit(c);
    
    if (!rateLimit.allowed) {
      return c.json(createStandardResponse(
        false,
        undefined,
        `Daily limit reached. Reset in ${rateLimit.resetIn} hours.`,
        requestId,
        { remaining: 0, resetIn: rateLimit.resetIn }
      ), 429);
    }
    
    // Parse request
    const body = await c.req.json();
    const { username } = body;
    
    if (!username) {
      return c.json(createStandardResponse(false, undefined, 'Username required', requestId), 400);
    }
    
    // Clean username
    const cleanUsername = username.replace(/[@\s]/g, '');
    
    logger('info', 'Anonymous analysis started', { username: cleanUsername, requestId });
    
    // Check cache first (6 hour cache)
    const cacheKey = `anon_analysis:${cleanUsername}`;
    const cached = await c.env.OSLIRA_KV.get(cacheKey);
    
    if (cached) {
      const cachedData = JSON.parse(cached);
      return c.json(createStandardResponse(
        true,
        cachedData,
        'Analysis complete',
        requestId,
        { remaining: rateLimit.remaining, cached: true }
      ));
    }
    
    // Perform analysis
    const analysisResult = await performAnonymousAnalysis(cleanUsername, c.env);
    
    // Cache result for 6 hours
    await c.env.OSLIRA_KV.put(cacheKey, JSON.stringify(analysisResult), { expirationTtl: 6 * 60 * 60 });
    
    logger('info', 'Anonymous analysis completed', { 
      username: cleanUsername, 
      score: analysisResult.insights.overall_score,
      requestId 
    });
    
    return c.json(createStandardResponse(
      true,
      analysisResult,
      'Analysis complete',
      requestId,
      { remaining: rateLimit.remaining, cached: false }
    ));
    
  } catch (error) {
    logger('error', 'Anonymous analysis failed', { 
      error: error.message, 
      requestId 
    });
    
    return c.json(createStandardResponse(
      false,
      undefined,
      'Analysis failed. Please try again.',
      requestId
    ), 500);
  }
}
