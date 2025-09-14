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
