import type { ProfileData, BusinessProfile, AnalysisResult, Env } from '../types/interfaces.js';
import { callWithRetry } from '../utils/helpers.js';
import { calculateConfidenceLevel } from '../utils/validation.js';
import { getApiKey } from './enhanced-config-manager.js';

// Import all prompts and schemas from centralized file
import {
  getLightAnalysisJsonSchema,
  getDeepAnalysisJsonSchema,
  getXRayAnalysisJsonSchema,
  buildLightAnalysisPrompt,
  buildDeepAnalysisPrompt,
  buildXRayAnalysisPrompt,
  buildOutreachMessagePrompt,
  buildQuickSummaryPrompt,
  buildDeepSummaryPrompt
} from './prompts.js';

import { MODEL_CONFIG, calculateCost } from '../config/models.js';
import { UniversalAIAdapter, selectModel } from './universal-ai-adapter.js';
// ===============================================================================
// HELPER FUNCTIONS
// ===============================================================================

const isGPT5 = (m: string) => /^gpt-5/i.test(m);

type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };

export async function performAIAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep' | 'xray',
  env: Env,
  requestId: string,
  context?: {
    triage?: any;
    preprocessor?: any;
  },
  modelTier: 'premium' | 'balanced' | 'economy' = 'balanced' // NEW: Support tier selection
): Promise<{
  result: AnalysisResult;
  costDetails: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    model_used: string;
    block_type: string;
  };
}> {
  
  console.log(`🤖 [AI Analysis] Starting ${analysisType} analysis with ${modelTier} tier`);

  try {
    // Select model based on analysis type and tier
    const modelName = selectModel(analysisType, modelTier, context);
    console.log(`🤖 [AI Analysis] Selected model: ${modelName}`);

    // Get appropriate prompt and schema
    let prompt: string;
    let jsonSchema: any;
    
    switch (analysisType) {
      case 'light':
        prompt = buildLightAnalysisPrompt(profile, business, context);
        jsonSchema = getLightAnalysisJsonSchema();
        break;
      case 'deep':
        prompt = buildDeepAnalysisPrompt(profile, business, context);
        jsonSchema = getDeepAnalysisJsonSchema();
        break;
      case 'xray':
        prompt = buildXRayAnalysisPrompt(profile, business, context);
        jsonSchema = getXRayAnalysisJsonSchema();
        break;
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }

    // Execute via universal adapter
    const aiAdapter = new UniversalAIAdapter(env, requestId);
    const response = await aiAdapter.executeRequest({
      model_name: modelName,
      system_prompt: getSystemPrompt(analysisType),
      user_prompt: prompt,
      max_tokens: getMaxTokens(analysisType),
      json_schema: jsonSchema,
      response_format: 'json'
    });

    // Parse and transform result
    const rawResult = JSON.parse(response.content);
    const transformedResult = transformAnalysisResult(rawResult, analysisType, profile);

    console.log(`🤖 [AI Analysis] Completed with model: ${response.model_used}, cost: $${response.usage.total_cost.toFixed(4)}`);

    return {
      result: transformedResult,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: analysisType
      }
    };

  } catch (error: any) {
    console.error(`🤖 [AI Analysis] Failed:`, error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

function getSystemPrompt(analysisType: string): string {
  const prompts = {
    light: 'You are an expert business analyst specializing in influencer partnerships. Return ONLY valid JSON matching the exact schema provided.',
    deep: 'You are an expert business analyst specializing in influencer partnerships. Provide comprehensive analysis. Return ONLY valid JSON matching the exact schema provided.',
    xray: 'You are an expert business analyst and psychological profiler specializing in influencer partnerships. Provide deep psychological insights. Return ONLY valid JSON matching the exact schema provided.'
  };
  
  return prompts[analysisType] || prompts.light;
}

function getMaxTokens(analysisType: string): number {
  const limits = {
    light: 500,
    deep: 800,
    xray: 1200
  };
  
  return limits[analysisType] || 500;
}

function transformAnalysisResult(
  rawResult: any,
  analysisType: 'light' | 'deep' | 'xray',
  profile: ProfileData
): AnalysisResult {
  // Extract core scores and metadata
  const baseResult: AnalysisResult = {
    score: rawResult.score || 0,
    engagement_score: rawResult.engagement_score || 0,
    niche_fit: rawResult.niche_fit || 0,
    quick_summary: rawResult.quick_summary || '',
    confidence_level: rawResult.confidence_level || calculateConfidenceLevel(profile, analysisType),
    audience_quality: 'Medium',
    engagement_insights: '',
    selling_points: [],
    reasons: []
  };

  // Transform payload-specific data
  switch (analysisType) {
    case 'light':
      if (rawResult.light_payload) {
        baseResult.audience_quality = rawResult.light_payload.audience_quality || 'Medium';
        baseResult.engagement_insights = rawResult.light_payload.engagement_summary || '';
        baseResult.selling_points = rawResult.light_payload.insights || [];
        baseResult.reasons = rawResult.light_payload.insights || [];
      }
      break;

    case 'deep':
      if (rawResult.deep_payload) {
        baseResult.deep_summary = rawResult.deep_payload.deep_summary;
        baseResult.selling_points = rawResult.deep_payload.selling_points || [];
        baseResult.reasons = rawResult.deep_payload.reasons || [];
        baseResult.outreach_message = rawResult.deep_payload.outreach_message;
        baseResult.audience_quality = 'High';
        baseResult.engagement_insights = rawResult.deep_payload.audience_insights || '';
        
        if (rawResult.deep_payload.engagement_breakdown) {
          baseResult.avg_likes = rawResult.deep_payload.engagement_breakdown.avg_likes;
          baseResult.avg_comments = rawResult.deep_payload.engagement_breakdown.avg_comments;
          baseResult.engagement_rate = rawResult.deep_payload.engagement_breakdown.engagement_rate;
        }
      }
      break;

    case 'xray':
      if (rawResult.xray_payload) {
        baseResult.audience_quality = 'Premium';
        baseResult.engagement_insights = `Commercial Intelligence: ${rawResult.xray_payload.commercial_intelligence?.budget_tier || 'Unknown'} budget tier`;
        
        baseResult.selling_points = [
          ...(rawResult.xray_payload.copywriter_profile?.pain_points || []),
          ...(rawResult.xray_payload.copywriter_profile?.dreams_desires || [])
        ];
        baseResult.reasons = rawResult.xray_payload.persuasion_strategy?.key_messages || [];
        
        // Store X-ray specific data
        baseResult.copywriter_profile = rawResult.xray_payload.copywriter_profile;
        baseResult.commercial_intelligence = rawResult.xray_payload.commercial_intelligence;
        baseResult.persuasion_strategy = rawResult.xray_payload.persuasion_strategy;
      }
      break;
  }

  return baseResult;
}
function buildOpenAIChatBody(opts: {
  model: string;
  messages: ChatMsg[];
  maxTokens: number;
  temperature?: number;
  responseFormatJSON?: boolean;
  jsonSchema?: any;
}) {
  const { model, messages, maxTokens, temperature, responseFormatJSON, jsonSchema } = opts;

  if (isGPT5(model)) {
    const body: any = {
      model,
      messages,
      max_completion_tokens: maxTokens,
    };
    if (jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: jsonSchema
      };
    } else if (responseFormatJSON) {
      body.response_format = { type: 'json_object' };
    }
    return body;
  }

  const body: any = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: (typeof temperature === 'number' ? temperature : 0.7),
  };
  if (jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: jsonSchema
    };
  } else if (responseFormatJSON) {
    body.response_format = { type: 'json_object' };
  }
  return body;
}

function parseChoiceSafe(choice: any): string {
  if (!choice) return '';
  const msg = choice?.message;
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((c: any) => (typeof c === 'string' ? c : (c?.text ?? ''))).join(' ').trim();
  }
  return '';
}

// Simple logging function to avoid import issues
function log(level: string, message: string, data?: any, requestId?: string) {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, level, message, requestId, ...data };
  console.log(JSON.stringify(logData));
}

// ===============================================================================
// ANALYSIS EXECUTION WITH RETRY LOGIC
// ===============================================================================

async function executeAnalysisWithRetry(
  prompt: string,
  jsonSchema: any,
  env: Env,
  requestId: string,
  blockType: string,
  maxRetries: number = 3
): Promise<{
  result: any;
  costDetails: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    model_used: string;
    block_type: string;
  };
}> {
  
  const openaiKey = await getApiKey('OPENAI_API_KEY', env);
  if (!openaiKey) throw new Error('OpenAI API key not available');

  const modelConfig = MODEL_CONFIG[blockType];
  const model = modelConfig.model;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log('info', `Analysis attempt ${attempt}/${maxRetries}`, { blockType, model }, requestId);

      const body = buildOpenAIChatBody({
        model,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert business analyst specializing in influencer partnerships. Return ONLY valid JSON matching the exact schema provided. No additional text, explanations, or markdown formatting.' 
          },
          { role: 'user', content: prompt }
        ],
        maxTokens: modelConfig.max_out,
        jsonSchema: jsonSchema
      });

      const response = await callWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        },
        2, // 2 retries for API call
        2000, // 2 second delay
        30000 // 30 second timeout
      );

      const content = parseChoiceSafe(response?.choices?.[0]);
      if (!content) {
        throw new Error(`Empty response from model (attempt ${attempt})`);
      }

      // Calculate actual cost
      const usage = response?.usage;
      const tokensIn = usage?.prompt_tokens || 0;
      const tokensOut = usage?.completion_tokens || 0;
      const actualCost = calculateCost(tokensIn, tokensOut, blockType);

      // Parse and validate JSON
      let parsedResult;
      try {
        parsedResult = JSON.parse(content);
      } catch (parseError) {
        throw new Error(`Invalid JSON response (attempt ${attempt}): ${parseError}`);
      }

      log('info', 'Analysis completed successfully', { 
        attempt, 
        tokensIn,
        tokensOut,
        actualCost,
        blockType
      }, requestId);

      return {
        result: parsedResult,
        costDetails: {
          actual_cost: actualCost,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          model_used: model,
          block_type: blockType
        }
      };

    } catch (error: any) {
      log('warn', `Analysis attempt ${attempt} failed`, { 
        error: error.message,
        blockType
      }, requestId);

      if (attempt === maxRetries) {
        throw new Error(`All ${maxRetries} analysis attempts failed. Last error: ${error.message}`);
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}

// ===============================================================================
// RESULT TRANSFORMATION (MAPS NEW PAYLOAD TO OLD INTERFACE)
// ===============================================================================

function transformAnalysisResult(
  rawResult: any, 
  analysisType: 'light' | 'deep' | 'xray',
  profile: ProfileData
): AnalysisResult {
  
  // Extract core scores and metadata
  const baseResult: AnalysisResult = {
    score: rawResult.score || 0,
    engagement_score: rawResult.engagement_score || 0,
    niche_fit: rawResult.niche_fit || 0,
    quick_summary: rawResult.quick_summary || '',
    confidence_level: rawResult.confidence_level || calculateConfidenceLevel(profile, analysisType),
    audience_quality: 'Medium', // Default fallback
    engagement_insights: '',
    selling_points: [],
    reasons: []
  };

  // Extract payload-specific data based on analysis type
  switch (analysisType) {
    case 'light':
      if (rawResult.light_payload) {
        baseResult.audience_quality = rawResult.light_payload.audience_quality || 'Medium';
        baseResult.engagement_insights = rawResult.light_payload.engagement_summary || '';
        baseResult.selling_points = rawResult.light_payload.insights || [];
        baseResult.reasons = rawResult.light_payload.insights || [];
      }
      break;

    case 'deep':
      if (rawResult.deep_payload) {
        baseResult.deep_summary = rawResult.deep_payload.deep_summary;
        baseResult.selling_points = rawResult.deep_payload.selling_points || [];
        baseResult.reasons = rawResult.deep_payload.reasons || [];
        baseResult.outreach_message = rawResult.deep_payload.outreach_message;
        baseResult.audience_quality = 'High'; // Deep analysis implies higher quality
        baseResult.engagement_insights = rawResult.deep_payload.audience_insights || '';
        
        // Store engagement breakdown for database
        if (rawResult.deep_payload.engagement_breakdown) {
          baseResult.avg_likes = rawResult.deep_payload.engagement_breakdown.avg_likes;
          baseResult.avg_comments = rawResult.deep_payload.engagement_breakdown.avg_comments;
          baseResult.engagement_rate = rawResult.deep_payload.engagement_breakdown.engagement_rate;
        }
      }
      break;

    case 'xray':
      if (rawResult.xray_payload) {
        baseResult.audience_quality = 'Premium'; // X-ray analysis implies premium quality
        baseResult.engagement_insights = `Commercial Intelligence: ${rawResult.xray_payload.commercial_intelligence?.budget_tier || 'Unknown'} budget tier, ${rawResult.xray_payload.commercial_intelligence?.buying_stage || 'Unknown'} stage`;
        
        // Combine insights from different X-ray sections
        const psychographics = rawResult.xray_payload.copywriter_profile?.psychographics || '';
        const persuasionAngle = rawResult.xray_payload.persuasion_strategy?.primary_angle || '';
        
        baseResult.selling_points = [
          ...(rawResult.xray_payload.copywriter_profile?.pain_points || []),
          ...(rawResult.xray_payload.copywriter_profile?.dreams_desires || [])
        ];
        baseResult.reasons = rawResult.xray_payload.persuasion_strategy?.key_messages || [];
        
        // Store X-ray specific data
        baseResult.copywriter_profile = rawResult.xray_payload.copywriter_profile;
        baseResult.commercial_intelligence = rawResult.xray_payload.commercial_intelligence;
        baseResult.persuasion_strategy = rawResult.xray_payload.persuasion_strategy;
      }
      break;

    default:
      break;
  }

  return baseResult;
}

// ===============================================================================
// LEGACY OUTREACH MESSAGE GENERATION
// ===============================================================================

export async function generateOutreachMessage(
  profile: ProfileData,
  analysis: AnalysisResult,
  business: BusinessProfile,
  env: Env
): Promise<string> {
  
  try {
    const prompt = buildOutreachMessagePrompt(profile, analysis, business);
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    
    if (!openaiKey) throw new Error('OpenAI API key not available');

    const body = buildOpenAIChatBody({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a professional copywriter specializing in influencer outreach. Write personalized, compelling messages that feel human and authentic.' },
        { role: 'user', content: prompt }
      ],
      maxTokens: 500
    });

    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      },
      2, // 2 retries
      2000, // 2 second delay
      15000 // 15 second timeout
    );

    const content = parseChoiceSafe(response?.choices?.[0]);
    if (!content) throw new Error('Empty outreach message response');

    log('info', 'Outreach message generated successfully', { 
      username: profile.username,
      messageLength: content.length
    });

    return content;

  } catch (error: any) {
    log('error', 'Outreach message generation failed', { 
      error: error.message,
      username: profile.username
    });
    
    // Return fallback message
    return `Hi @${profile.username}! I came across your ${profile.isVerified ? 'verified' : 'amazing'} profile and was impressed by your content. I think there could be a great partnership opportunity between you and ${business.name}. Would love to chat about how we can work together! 🤝`;
  }
}

// ===============================================================================
// SUMMARY GENERATION FUNCTIONS
// ===============================================================================

export async function generateQuickSummary(
  profile: ProfileData,
  analysis: AnalysisResult,
  env: Env
): Promise<string> {
  
  try {
    const prompt = buildQuickSummaryPrompt(profile, analysis);
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    
    if (!openaiKey) {
      // Return fallback summary if no API key
      return `${profile.isVerified ? 'Verified' : 'Unverified'} profile with ${profile.followersCount.toLocaleString()} followers and ${analysis.score}/100 business compatibility score. Engagement rate of ${profile.engagement?.engagementRate || 'unknown'}% indicates ${analysis.audience_quality ? String(analysis.audience_quality).toLowerCase() : 'unknown'} audience quality.`;
    }

    const body = buildOpenAIChatBody({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a business analyst. Provide concise, professional summaries of influencer profiles.' },
        { role: 'user', content: prompt }
      ],
      maxTokens: 200
    });

    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      },
      2, // 2 retries
      2000, // 2 second delay
      10000 // 10 second timeout
    );

    const content = parseChoiceSafe(response?.choices?.[0]);
    return content || `${profile.username} analysis summary generated successfully.`;

  } catch (error: any) {
    log('warn', 'Quick summary generation failed, using fallback', { 
      error: error.message,
      username: profile.username
    });
    
    // Return fallback summary
    return `${profile.isVerified ? 'Verified' : 'Unverified'} profile with ${profile.followersCount.toLocaleString()} followers and ${analysis.score}/100 business compatibility score. Engagement rate of ${profile.engagement?.engagementRate || 'unknown'}% indicates ${analysis.audience_quality ? String(analysis.audience_quality).toLowerCase() : 'unknown'} audience quality.`;
  }
}
