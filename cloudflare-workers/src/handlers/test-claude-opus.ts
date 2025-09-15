import type { Context } from 'hono';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { getApiKey } from '../services/enhanced-config-manager.js';

export async function handleTestClaudeOpus(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Testing Claude Opus 4.1', { requestId });

    // Get Claude API key
    const claudeKey = await getApiKey('CLAUDE_API_KEY', c.env);
    if (!claudeKey) {
      return c.json(createStandardResponse(false, undefined, 'Claude API key not configured', requestId), 500);
    }

    // Test basic Claude Opus 4.1 call
    const testPrompt = `You are Claude Opus 4.1. Please respond with:
1. Your model name and version
2. Current timestamp
3. A simple JSON object showing you're working

Be concise and return valid JSON.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: testPrompt
          }
        ]
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

    logger('info', 'Claude Opus 4.1 test successful', { 
      model: claudeData.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      requestId 
    });

    return c.json(createStandardResponse(true, {
      message: 'Claude Opus 4.1 test successful',
      model_used: claudeData.model,
      response_content: content,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens
      },
      api_status: 'working',
      test_timestamp: new Date().toISOString()
    }, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Claude Opus 4.1 test failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, `Test failed: ${error.message}`, requestId), 500);
  }
}

export async function handleTestClaudeOpusThinking(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Testing Claude Opus 4.1 with extended thinking', { requestId });

    const claudeKey = await getApiKey('CLAUDE_API_KEY', c.env);
    if (!claudeKey) {
      return c.json(createStandardResponse(false, undefined, 'Claude API key not configured', requestId), 500);
    }

    // Test extended thinking capability
    const complexPrompt = `Analyze this complex scenario and show your reasoning:

A software company has 3 microservices: Auth, API, Database. 
- Auth service is failing 15% of requests
- API service depends on Auth and Database  
- Database is healthy but slow (500ms average)

What's the likely root cause and solution priority? Think through this step by step.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1-20250805-thinking',
        max_tokens: 2000,
        thinking_budget: 1024,
        messages: [
          {
            role: 'user',
            content: complexPrompt
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      return c.json(createStandardResponse(false, undefined, `Claude thinking test failed: ${claudeResponse.status} - ${errorText}`, requestId), 500);
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text || 'No response content';
    const thinking = claudeData.content?.find(block => block.type === 'thinking')?.text || 'No thinking content';
    const usage = claudeData.usage || {};

    return c.json(createStandardResponse(true, {
      message: 'Claude Opus 4.1 extended thinking test successful',
      model_used: claudeData.model,
      response_content: content,
      thinking_content: thinking,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        thinking_tokens: usage.thinking_tokens
      },
      test_timestamp: new Date().toISOString()
    }, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Claude Opus 4.1 thinking test failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, `Thinking test failed: ${error.message}`, requestId), 500);
  }
}
