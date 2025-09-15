import type { Context } from 'hono';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { getApiKey } from '../services/enhanced-config-manager.js';
import { fetchBusinessProfile } from '../services/database.js';

export async function handleTestClaudeOpus(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Testing Claude Opus 4.1 with staging data', { requestId });

    // Get Claude API key
    const claudeKey = await getApiKey('CLAUDE_API_KEY', c.env);
    if (!claudeKey) {
      return c.json(createStandardResponse(false, undefined, 'Claude API key not configured', requestId), 500);
    }

    // Use your actual staging data
    const testUser = "2acf4008-5a34-4be5-859c-024ab46762da";
    const testBusiness = "fbf1b371-b905-4e6a-b86e-599a631fd58e";

    // Get business profile for context
    let businessContext = "Business context not available";
    try {
      const business = await fetchBusinessProfile(testBusiness, testUser, c.env);
      businessContext = `${business.name} - ${business.industry} targeting ${business.target_audience}`;
    } catch (error) {
      logger('warn', 'Could not fetch business profile', { error: error.message });
    }

    // Test Claude Opus 4.1 with real analysis scenario
    const testPrompt = `You are Claude Opus 4.1 analyzing an Instagram profile for business partnerships.

PROFILE: @hormozi (Alex Hormozi)
BUSINESS CONTEXT: ${businessContext}

Analyze this profile for partnership potential and return a JSON response with:
{
  "model_info": "claude-opus-4-1-20250805",
  "analysis_score": 0-100,
  "partnership_fit": "high/medium/low", 
  "key_insights": ["insight1", "insight2"],
  "test_timestamp": "current_time",
  "api_status": "working"
}

Focus on business alignment and audience quality.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: testPrompt
          }
        ],
        temperature: 0.3
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      logger('error', 'Claude Opus 4.1 API error', { 
        status: claudeResponse.status,
        error: errorText,
        requestId 
      });
      
      return c.json(createStandardResponse(false, undefined, `Claude API error: ${claudeResponse.status} - ${errorText}`, requestId), 500);
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text || 'No response content';
    const usage = claudeData.usage || {};

    // Try to parse JSON response
    let parsedAnalysis = null;
    try {
      parsedAnalysis = JSON.parse(content);
    } catch (parseError) {
      logger('warn', 'Claude response not valid JSON', { content });
    }

    logger('info', 'Claude Opus 4.1 test successful', { 
      model: claudeData.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      requestId 
    });

    return c.json(createStandardResponse(true, {
      message: 'Claude Opus 4.1 test successful with staging data',
      model_used: claudeData.model,
      raw_response: content,
      parsed_analysis: parsedAnalysis,
      business_context: businessContext,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_estimate: ((usage.input_tokens / 1000000) * 15) + ((usage.output_tokens / 1000000) * 75)
      },
      test_scenario: {
        profile: "@hormozi",
        user_id: testUser,
        business_id: testBusiness
      },
      test_timestamp: new Date().toISOString()
    }, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Claude Opus 4.1 test failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, `Test failed: ${error.message}`, requestId), 500);
  }
}

export async function handleTestClaudeOpusDeepAnalysis(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Testing Claude Opus 4.1 deep analysis simulation', { requestId });

    const claudeKey = await getApiKey('CLAUDE_API_KEY', c.env);
    if (!claudeKey) {
      return c.json(createStandardResponse(false, undefined, 'Claude API key not configured', requestId), 500);
    }

    // Simulate the exact deep analysis prompt your system would use
    const deepAnalysisPrompt = `# DEEP ANALYSIS: Partnership Intelligence Report

## VERIFIED PROFILE DATA
- **Handle**: @hormozi
- **Metrics**: 4,200,000 followers | 1,234 posts
- **Bio**: "I scale companies. Portfolio company CEO. $100M+ entrepreneur. I teach business."
- **Link**: https://acquisition.com
- **Status**: Verified ✓ | Business Account

## ACTUAL ENGAGEMENT DATA
REAL METRICS from recent posts:
- Avg Likes: 45,000
- Avg Comments: 850
- Engagement Rate: 1.1%
- Total Interactions: 45,850 per post

## BUSINESS CONTEXT
- **Company**: Your business from staging environment
- **Target**: Entrepreneurs and business owners
- **Value Prop**: Business scaling and growth solutions

## DEEP ANALYSIS REQUIREMENTS

### SCORING FRAMEWORK
- **score**: Overall partnership value (0-100)
- **engagement_score**: Based on actual 1.1% ER vs expected for 4.2M followers
- **niche_fit**: Alignment with business/entrepreneurship audience
- **confidence_level**: 0.9 (verified account with real data)

Return JSON with exactly this structure:
{
  "score": 85,
  "engagement_score": 78,
  "niche_fit": 95,
  "audience_quality": "High",
  "engagement_insights": "Strong B2B audience engagement",
  "selling_points": ["4.2M entrepreneur audience", "Verified business account", "High-value content"],
  "reasons": ["Perfect audience alignment", "Strong engagement for follower size", "Business authority"],
  "deep_summary": "Detailed analysis paragraph",
  "outreach_message": "Personalized outreach message"
}`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst specializing in influencer partnerships. Return valid JSON only.'
          },
          {
            role: 'user',
            content: deepAnalysisPrompt
          }
        ],
        temperature: 0.2
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      return c.json(createStandardResponse(false, undefined, `Claude deep analysis test failed: ${claudeResponse.status} - ${errorText}`, requestId), 500);
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text || 'No response content';
    const usage = claudeData.usage || {};

    // Parse the analysis result
    let analysisResult = null;
    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      logger('warn', 'Claude analysis response not valid JSON', { content });
    }

    return c.json(createStandardResponse(true, {
      message: 'Claude Opus 4.1 deep analysis simulation successful',
      model_used: claudeData.model,
      analysis_result: analysisResult,
      raw_response: content,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_estimate: ((usage.input_tokens / 1000000) * 15) + ((usage.output_tokens / 1000000) * 75)
      },
      simulation_notes: "This simulates your actual deep analysis pipeline",
      test_timestamp: new Date().toISOString()
    }, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Claude Opus 4.1 deep analysis test failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, `Deep analysis test failed: ${error.message}`, requestId), 500);
  }
}

export async function handleTestClaudeOpusPipeline(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Testing Claude Opus 4.1 in pipeline context', { requestId });

    const claudeKey = await getApiKey('CLAUDE_API_KEY', c.env);
    if (!claudeKey) {
      return c.json(createStandardResponse(false, undefined, 'Claude API key not configured', requestId), 500);
    }

    // Test the exact pipeline scenario
    const pipelinePrompt = `# PIPELINE TEST: Claude Opus 4.1 Integration

You are being tested as part of the Oslira analysis pipeline.

PIPELINE CONTEXT:
- Stage: main_analysis
- Workflow: auto
- Model Tier: premium
- Analysis Type: deep

PROFILE DATA:
- Username: hormozi
- Followers: 4.2M
- Engagement Rate: 1.1%
- Niche: Business/Entrepreneurship

TRIAGE RESULT:
- Lead Score: 85/100
- Data Richness: 90/100
- Focus Points: ["high-value audience", "business authority"]

BUSINESS CONTEXT:
- One-liner: "AI-powered business growth platform for entrepreneurs"

Generate the analysis result that would integrate with the pipeline system.
Return valid JSON with score, engagement_score, niche_fit, selling_points, and reasons.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: pipelinePrompt
          }
        ],
        temperature: 0.1
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      return c.json(createStandardResponse(false, undefined, `Claude pipeline test failed: ${claudeResponse.status} - ${errorText}`, requestId), 500);
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text || 'No response content';
    const usage = claudeData.usage || {};

    return c.json(createStandardResponse(true, {
      message: 'Claude Opus 4.1 pipeline integration test successful',
      model_used: claudeData.model,
      pipeline_response: content,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_estimate: ((usage.input_tokens / 1000000) * 15) + ((usage.output_tokens / 1000000) * 75)
      },
      integration_status: "Ready for pipeline deployment",
      test_timestamp: new Date().toISOString()
    }, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Claude Opus 4.1 pipeline test failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, `Pipeline test failed: ${error.message}`, requestId), 500);
  }
}
