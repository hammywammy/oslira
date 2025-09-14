import { getApiKey } from '../services/enhanced-config-manager.js';

export async function testGPT5Direct(env: any, requestId: string) {
  console.log('🧪 Testing GPT-5 direct API call');
  
  try {
    const apiKey = await getApiKey('OPENAI_API_KEY', env);
    if (!apiKey) throw new Error('OpenAI API key not available');

    // Test 1: Try gpt-5-nano
    console.log('Testing gpt-5-nano...');
    const response1 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in JSON format with a "message" field.' }
        ],
        max_tokens: 50,
        response_format: { type: 'json_object' }
      })
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ gpt-5-nano works:', data1);
      return { success: true, model: 'gpt-5-nano', data: data1 };
    } else {
      const error1 = await response1.text();
      console.log('❌ gpt-5-nano failed:', response1.status, error1);
    }

    // Test 2: Try gpt-5-mini
    console.log('Testing gpt-5-mini...');
    const response2 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in JSON format with a "message" field.' }
        ],
        max_tokens: 50,
        response_format: { type: 'json_object' }
      })
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ gpt-5-mini works:', data2);
      return { success: true, model: 'gpt-5-mini', data: data2 };
    } else {
      const error2 = await response2.text();
      console.log('❌ gpt-5-mini failed:', response2.status, error2);
    }

    // Test 3: Try gpt-5
    console.log('Testing gpt-5...');
    const response3 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in JSON format with a "message" field.' }
        ],
        max_tokens: 50,
        response_format: { type: 'json_object' }
      })
    });

    if (response3.ok) {
      const data3 = await response3.json();
      console.log('✅ gpt-5 works:', data3);
      return { success: true, model: 'gpt-5', data: data3 };
    } else {
      const error3 = await response3.text();
      console.log('❌ gpt-5 failed:', response3.status, error3);
    }

    // Fallback: Test working model
    console.log('Testing fallback gpt-4o-mini...');
    const response4 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in JSON format with a "message" field.' }
        ],
        max_tokens: 50,
        response_format: { type: 'json_object' }
      })
    });

    if (response4.ok) {
      const data4 = await response4.json();
      console.log('✅ gpt-4o-mini works as fallback:', data4);
      return { success: true, model: 'gpt-4o-mini', data: data4, note: 'fallback' };
    } else {
      const error4 = await response4.text();
      console.log('❌ gpt-4o-mini also failed:', response4.status, error4);
      return { success: false, error: 'All models failed' };
    }

  } catch (error: any) {
    console.error('🧪 GPT-5 test failed:', error.message);
    return { success: false, error: error.message };
  }
}
