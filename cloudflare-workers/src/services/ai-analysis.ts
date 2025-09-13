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

// ===============================================================================
// HELPER FUNCTIONS
// ===============================================================================

const isGPT5 = (m: string) => /^gpt-5/i.test(m);

type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };

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

// ===============================================================================
// MAIN ANALYSIS FUNCTION (UPDATED FOR NEW PAYLOAD STRUCTURE)
// ===============================================================================

export async function performAIAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep' | 'xray',
  env: Env,
  requestId: string
): Promise<AnalysisResult> {
  
  // Import logger locally to ensure it's available in this function
  const { logger } = await import('../utils/logger.js');
  
  logger('info', `Starting AI analysis with new payload structure`, {
    username: profile.username,
    dataQuality: profile.dataQuality,
    scraperUsed: profile.scraperUsed,
    hasRealEngagement: (profile.engagement?.postsAnalyzed || 0) > 0,
    analysisType
  }, requestId);

  try {
    // Get the appropriate prompt and schema based on analysis type
    let prompt: string;
    let jsonSchema: any;
    
    switch (analysisType) {
      case 'light':
        prompt = buildLightAnalysisPrompt(profile, business);
        jsonSchema = getLightAnalysisJsonSchema();
        break;
      case 'deep':
        prompt = buildDeepAnalysisPrompt(profile, business);
        jsonSchema = getDeepAnalysisJsonSchema();
        break;
      case 'xray':
        prompt = buildXRayAnalysisPrompt(profile, business);
        jsonSchema = getXRayAnalysisJsonSchema();
        break;
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }

    // Execute the analysis
    const rawResult = await executeAnalysisWithRetry(prompt, jsonSchema, env, requestId);
    
    // Transform the result to match our AnalysisResult interface
    const transformedResult = transformAnalysisResult(rawResult, analysisType, profile);
    
    logger('info', `AI analysis completed with new payload structure`, {
      username: profile.username,
      score: transformedResult.score,
      engagementScore: transformedResult.engagement_score,
      nicheFit: transformedResult.niche_fit,
      confidence: transformedResult.confidence_level,
      payloadType: analysisType,
      usedRealData: (profile.engagement?.postsAnalyzed || 0) > 0
    }, requestId);

    return transformedResult;

} catch (error: any) {
    // Import logger for error handling
    const { logger } = await import('../utils/logger.js');
    logger('error', 'AI analysis failed', { error: error.message, requestId });
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

// ===============================================================================
// ANALYSIS EXECUTION WITH RETRY LOGIC
// ===============================================================================

async function executeAnalysisWithRetry(
  prompt: string,
  jsonSchema: any,
  env: Env,
  requestId: string,
  maxRetries: number = 3
): Promise<any> {
  
  // Import logger locally to ensure it's available throughout this function
  const { logger } = await import('../utils/logger.js');
  
  const openaiKey = await getApiKey('OPENAI_API_KEY', env);
  if (!openaiKey) throw new Error('OpenAI API key not available');

  const model = 'gpt-4o'; // Using GPT-4o for consistent results
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger('info', `Analysis attempt ${attempt}/${maxRetries}`, { requestId });

          const body = buildOpenAIChatBody({
            model,
            messages: [
              { 
                role: 'system', 
                content: 'You are an expert business analyst specializing in influencer partnerships. Return ONLY valid JSON matching the exact schema provided. No additional text, explanations, or markdown formatting.' 
              },
              { role: 'user', content: prompt }
            ],
            maxTokens: 4000,
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

          // Parse and validate JSON
          let parsedResult;
          try {
            parsedResult = JSON.parse(content);
          } catch (parseError) {
            throw new Error(`Invalid JSON response (attempt ${attempt}): ${parseError}`);
          }

          // Validate required fields exist
          if (!parsedResult.score || !parsedResult.engagement_score || !parsedResult.niche_fit) {
            throw new Error(`Missing required score fields (attempt ${attempt})`);
          }

          logger('info', 'Analysis completed successfully', { 
            attempt, 
            score: parsedResult.score,
            requestId 
          });

          return parsedResult;

        } catch (error: any) {
          logger('warn', `Analysis attempt ${attempt} failed`, { 
            error: error.message, 
            requestId 
          });

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
          `Psychographic Profile: ${psychographics}`,
          `Primary Persuasion Angle: ${persuasionAngle}`,
          ...(rawResult.xray_payload.copywriter_profile?.dreams_desires || [])
        ];
        
        baseResult.reasons = [
          `Decision Role: ${rawResult.xray_payload.commercial_intelligence?.decision_role || 'Unknown'}`,
          `Communication Style: ${rawResult.xray_payload.persuasion_strategy?.communication_style || 'Unknown'}`,
          ...(rawResult.xray_payload.copywriter_profile?.pain_points || [])
        ];

        // Store X-ray specific data for database payload
        baseResult.copywriter_profile = rawResult.xray_payload.copywriter_profile;
        baseResult.commercial_intelligence = rawResult.xray_payload.commercial_intelligence;
        baseResult.persuasion_strategy = rawResult.xray_payload.persuasion_strategy;
      }
      break;
  }

  // Store the raw payload for database insertion
  baseResult.payload_data = rawResult[`${analysisType}_payload`];
  baseResult.analysis_type = analysisType;

  return baseResult;
}

// ===============================================================================
// OUTREACH MESSAGE GENERATION (UPDATED)
// ===============================================================================

export async function generateOutreachMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId?: string
): Promise<string> {
  
  try {
    logger('info', 'Starting outreach message generation', { 
      username: profile.username, 
      requestId 
    });

    const prompt = buildOutreachMessagePrompt(profile, business, analysis);
    
    // Try Claude first for better creative writing
    const claudeKey = await getApiKey('CLAUDE_API_KEY', env);
    if (claudeKey) {
      try {
        const claudeResponse = await callWithRetry(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'x-api-key': claudeKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1000,
              messages: [
                { role: 'user', content: prompt }
              ]
            })
          },
          2, 1500, 20000
        );

        if (claudeResponse?.content?.[0]?.text) {
          const message = claudeResponse.content[0].text.trim();
          logger('info', 'Outreach message generated via Claude', { requestId });
          return message;
        }
      } catch (claudeError: any) {
        logger('warn', 'Claude outreach generation failed, trying OpenAI', { 
          error: claudeError.message, 
          requestId 
        });
      }
    }

    // Fallback to OpenAI
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    if (openaiKey) {
      const body = buildOpenAIChatBody({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'Write a personalized outreach message. Be professional but friendly. No markdown formatting.' 
          },
          { role: 'user', content: prompt }
        ],
        maxTokens: 1000
      });

      const openaiResponse = await callWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        },
        2, 1500, 20000
      );

      const content = parseChoiceSafe(openaiResponse?.choices?.[0]);
      if (content) {
        logger('info', 'Outreach message generated via OpenAI', { requestId });
        return content.trim();
      }
    }

    throw new Error('No AI service available for message generation');

  } catch (error: any) {
    logger('error', 'Outreach message generation failed, using fallback', { 
      error: error.message, 
      requestId 
    });

    // Intelligent fallback based on profile data
    return `Hi ${profile.displayName || profile.username},

I came across your profile and was impressed by your content and engagement with your ${profile.followersCount.toLocaleString()} followers.

I'm reaching out from ${business.name}, and I think there could be a great opportunity for collaboration given your audience and our ${business.value_proposition || 'offering'}.

Would you be interested in exploring a potential partnership? I'd love to share more details about what we have in mind.

Best regards`;
  }
}

// ===============================================================================
// SUMMARY GENERATION FUNCTIONS (UPDATED)
// ===============================================================================

export async function generateQuickSummary(
  profile: ProfileData,
  env: Env,
  requestId?: string
): Promise<string> {
  
  try {
    const prompt = buildQuickSummaryPrompt(profile);
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);

    const body = buildOpenAIChatBody({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Generate a concise profile summary. Maximum 150 characters.' },
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
      }
    );

    const content = parseChoiceSafe(response?.choices?.[0]);
    return content?.trim() || `@${profile.username} - ${profile.followersCount.toLocaleString()} followers, ${profile.isVerified ? 'verified' : 'unverified'} ${profile.isBusinessAccount ? 'business' : 'personal'} account`;

  } catch (error) {
    logger('warn', 'Quick summary generation failed, using fallback', { error }, requestId);
    return `@${profile.username} - ${profile.followersCount.toLocaleString()} followers, ${profile.isVerified ? 'verified' : 'unverified'} account`;
  }
}

export async function generateDeepSummary(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId?: string
): Promise<string> {
  
  try {
    const prompt = buildDeepSummaryPrompt(profile, business, analysis);
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);

    const body = buildOpenAIChatBody({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Write a 5-7 sentence executive analysis summary. No preface.' },
        { role: 'user', content: prompt }
      ],
      maxTokens: 600
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
      }
    );

    const content = parseChoiceSafe(response?.choices?.[0]);
    return content?.trim() || `Comprehensive analysis of @${profile.username}: ${profile.isVerified ? 'Verified' : 'Unverified'} profile with ${profile.followersCount.toLocaleString()} followers and ${analysis.score}/100 business compatibility score.`;

  } catch (error) {
    logger('warn', 'Deep summary generation failed, using fallback', { error }, requestId);
    return `Comprehensive analysis of @${profile.username}: ${profile.isVerified ? 'Verified' : 'Unverified'} profile with ${profile.followersCount.toLocaleString()} followers and ${analysis.score}/100 business compatibility score. Engagement rate of ${profile.engagement?.engagementRate || 'unknown'}% indicates ${analysis.audience_quality ? String(analysis.audience_quality).toLowerCase() : 'unknown'} audience quality.`;
  }
}
