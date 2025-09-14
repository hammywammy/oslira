import { MODEL_CONFIG, calculateCost } from '../config/models.js';
import { getApiKey } from './enhanced-config-manager.js';
import { callWithRetry } from '../utils/helpers.js';
import type { MicroSnapshot } from './micro-snapshot.js';
import { UniversalAIAdapter, selectModel } from './universal-ai-adapter.js';
import { getTriageJsonSchema, buildTriagePrompt } from './prompts.js';

export interface TriageResult {
  lead_score: number;
  data_richness: number;
  confidence: number;
  early_exit: boolean;
  focus_points: string[];
}

export async function runTriage(
  snapshot: MicroSnapshot,
  businessOneLiner: string,
  env: any,
  requestId: string
): Promise<{
  result: TriageResult;
  costDetails: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    model_used: string;
    block_type: string;
  };
}> {
  
  console.log(`🔍 [Triage] Starting for @${snapshot.username}`);
  
  try {
    // Use economy tier for triage (always GPT-5 nano)
    const modelName = selectModel('triage', 'economy');
    
    const aiAdapter = new UniversalAIAdapter(env, requestId);
    const response = await aiAdapter.executeRequest({
      model_name: modelName,
      system_prompt: 'You are a lead qualification expert. Analyze Instagram profiles quickly and return ONLY valid JSON.',
      user_prompt: buildTriagePrompt(snapshot, businessOneLiner),
      max_tokens: 200,
      json_schema: getTriageJsonSchema(),
      response_format: 'json',
      temperature: 0.1
    });

    const result = JSON.parse(response.content) as TriageResult;
    result.early_exit = false; // Always continue to full analysis

    console.log(`🔍 [Triage] Result: Score ${result.lead_score}, Data ${result.data_richness}, Model: ${response.model_used}`);

    return {
      result,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: 'triage'
      }
    };

  } catch (error: any) {
    console.error(`🔍 [Triage] Failed:`, error.message);
    throw new Error(`Triage failed: ${error.message}`);
  }
}
  
  const openaiKey = await getApiKey('OPENAI_API_KEY', env);
  if (!openaiKey) throw new Error('OpenAI API key not available');

  const modelConfig = MODEL_CONFIG.triage;
if (!modelConfig) throw new Error('Triage model config not found');
  
  const prompt = buildTriagePrompt(snapshot, businessOneLiner);
  
  console.log(`🔍 [Triage] Starting for @${snapshot.username} (${snapshot.followers.toLocaleString()} followers)`);
  
  try {
    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a lead qualification expert. Analyze Instagram profiles quickly and return ONLY valid JSON. Be decisive - most profiles should get clear pass/fail verdicts.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: modelConfig.max_out,
          temperature: 0.1, // Low temperature for consistent triage
          response_format: { type: 'json_object' }
        })
      },
      2, 2000, 15000
    );

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty triage response');

    // Calculate cost
    const usage = response?.usage;
    const tokensIn = usage?.prompt_tokens || 0;
    const tokensOut = usage?.completion_tokens || 0;
    const actualCost = calculateCost(tokensIn, tokensOut, 'triage');

    // Parse result
    const result = JSON.parse(content) as TriageResult;
    
// Remove early exit logic - always continue to full analysis
    result.early_exit = false;

    console.log(`🔍 [Triage] Result: Score ${result.lead_score}, Data ${result.data_richness}, Exit: ${result.early_exit}`);

    return {
      result,
      costDetails: {
        actual_cost: actualCost,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        model_used: modelConfig.model,
        block_type: 'triage'
      }
    };

  } catch (error: any) {
    console.error(`🔍 [Triage] Failed for @${snapshot.username}:`, error.message);
    throw new Error(`Triage failed: ${error.message}`);
  }
}

function buildTriagePrompt(snapshot: MicroSnapshot, businessOneLiner: string): string {
  return `# LEAD TRIAGE: Quick Pass/Fail Decision

## YOUR BUSINESS
${businessOneLiner}

## PROFILE SNAPSHOT
- **Username**: @${snapshot.username}
- **Followers**: ${snapshot.followers.toLocaleString()}
- **Status**: ${snapshot.verified ? 'Verified ✓' : 'Unverified'} | ${snapshot.private ? 'Private ⚠️' : 'Public'}
- **Bio**: "${snapshot.bio_short || 'No bio'}"
- **External Links**: ${snapshot.external_domains.length > 0 ? snapshot.external_domains.join(', ') : 'None'}
- **Recent Activity**: ~${snapshot.posts_30d} posts estimated
- **Sample Content**: ${snapshot.top_captions.length > 0 ? 
    snapshot.top_captions.map(cap => `"${cap}..."`).join(' | ') : 
    'No captions available'}
- **Engagement Data**: ${snapshot.engagement_signals ? 
    `${snapshot.engagement_signals.avg_likes.toLocaleString()} avg likes, ${snapshot.engagement_signals.avg_comments} comments (${snapshot.engagement_signals.posts_analyzed} posts)` : 
    'Not available'}

## TASK: 10-Second Lead Decision

Score this profile on two dimensions:

**lead_score (0-100)**: Business fit potential
- 80-100: Clear target match, obvious collaboration potential
- 60-79: Good fit signals, worth deeper analysis  
- 40-59: Possible fit but unclear value
- 20-39: Weak signals, probably wrong audience
- 0-19: Obviously wrong fit, different niche entirely

**data_richness (0-100)**: Available information quality
- 80-100: Rich content, engagement data, clear patterns
- 60-79: Good content samples, some engagement signals
- 40-59: Basic profile info, limited content visibility
- 20-39: Minimal data, private account or sparse content
- 0-19: Almost no usable information

**confidence (0-1)**: How certain are you about these scores?

**focus_points**: 2-4 specific observations that drove your scores

## EARLY EXIT RULES
- If lead_score < 25 OR data_richness < 20 → Set early_exit: true
- Otherwise → Set early_exit: false

Return ONLY JSON:
{
  "lead_score": 0-100,
  "data_richness": 0-100, 
  "confidence": 0-1,
  "early_exit": true|false,
  "focus_points": ["observation 1", "observation 2", "..."]
}`;
}
