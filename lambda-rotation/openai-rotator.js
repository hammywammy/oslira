const AWS = require('aws-sdk');
const https = require('https');

const secretsManager = new AWS.SecretsManager();

// Environment variables from Lambda
const WORKER_URL = process.env.WORKER_URL;
const OSLIRA_ADMIN_TOKEN = process.env.OSLIRA_ADMIN_TOKEN;

exports.handler = async (event) => {
    console.log('OpenAI Key Rotation Started', { event });
    
    try {
        const secretId = event.SecretId || 'Oslira/OPENAI_API_KEY';
        
        // Step 1: Generate new OpenAI API key
        const newApiKey = await generateNewOpenAIKey();
        
        // Step 2: Test the new key
        await testOpenAIKey(newApiKey);
        
        // Step 3: Store in AWS Secrets Manager
        await storeNewSecret(secretId, newApiKey);
        
        // Step 4: Update Oslira systems
        await updateOsliraSystems('OPENAI_API_KEY', newApiKey);
        
        // Step 5: Send notifications
        await sendRotationNotification('OpenAI API Key', 'success');
        
        console.log('OpenAI Key Rotation Completed Successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'OpenAI API key rotated successfully',
                secretId: secretId,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('OpenAI Key Rotation Failed:', error);
        
        await sendRotationNotification('OpenAI API Key', 'failed', error.message);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Key rotation failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

async function generateNewOpenAIKey() {
    // Note: OpenAI doesn't have an API to generate new keys programmatically
    // This is a placeholder - you'll need to implement based on your setup
    
    // Option 1: Use a pool of pre-generated keys
    const keyPool = process.env.OPENAI_KEY_POOL ? JSON.parse(process.env.OPENAI_KEY_POOL) : [];
    if (keyPool.length > 0) {
        const newKey = keyPool.shift();
        
        // Update the pool
        await updateKeyPool('OPENAI_KEY_POOL', keyPool);
        
        return newKey;
    }
    
    // Option 2: Generate via OpenAI dashboard automation (requires additional setup)
    // Option 3: Manual intervention required
    
    throw new Error('No new OpenAI keys available. Manual intervention required.');
}

async function testOpenAIKey(apiKey) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
        });
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 400) {
                // 400 is expected for minimal test request
                resolve(true);
            } else if (res.statusCode === 401 || res.statusCode === 403) {
                reject(new Error('OpenAI API key is invalid'));
            } else {
                reject(new Error(`OpenAI API test failed with status ${res.statusCode}`));
            }
        });
        
        req.on('error', (error) => {
            reject(new Error(`OpenAI API test failed: ${error.message}`));
        });
        
        req.write(postData);
        req.end();
    });
}

async function storeNewSecret(secretId, newValue) {
    const secretString = JSON.stringify({
        apiKey: newValue,
        createdAt: new Date().toISOString(),
        version: `v${Date.now()}`,
        rotatedBy: 'lambda_auto_rotation'
    });
    
    const params = {
        SecretId: secretId,
        SecretString: secretString
    };
    
    await secretsManager.putSecretValue(params).promise();
    console.log(`Secret stored successfully: ${secretId}`);
}

async function updateOsliraSystems(keyName, newValue) {
    if (!WORKER_URL || !OSLIRA_ADMIN_TOKEN) {
        console.warn('Worker URL or admin token not configured, skipping system update');
        return;
    }
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            keyName: keyName,
            newValue: newValue
        });
        
        const url = new URL(`${WORKER_URL}/admin/update-key`);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OSLIRA_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('Successfully updated Oslira systems', { keyName });
                    resolve(data);
                } else {
                    reject(new Error(`Failed to update Oslira systems: ${res.statusCode} - ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`Failed to contact Oslira systems: ${error.message}`));
        });
        
        req.write(postData);
        req.end();
    });
}

async function updateKeyPool(poolName, newPool) {
    // Update the key pool in parameter store or secrets manager
    const ssm = new AWS.SSM();
    
    try {
        await ssm.putParameter({
            Name: poolName,
            Value: JSON.stringify(newPool),
            Type: 'SecureString',
            Overwrite: true
        }).promise();
        
        console.log(`Updated key pool: ${poolName}`);
    } catch (error) {
        console.error(`Failed to update key pool: ${error.message}`);
    }
}

async function sendRotationNotification(serviceName, status, errorMessage = null) {
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    
    if (!slackWebhook) {
        console.log('No Slack webhook configured, skipping notification');
        return;
    }
    
    const message = {
        text: status === 'success' 
            ? `🔄 ✅ ${serviceName} rotated successfully`
            : `🔄 ❌ ${serviceName} rotation failed: ${errorMessage}`,
        channel: '#alerts'
    };
    
    return new Promise((resolve) => {
        const postData = JSON.stringify(message);
        const url = new URL(slackWebhook);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, () => {
            resolve();
        });
        
        req.on('error', () => {
            resolve(); // Don't fail rotation for notification issues
        });
        
        req.write(postData);
        req.end();
    });
}

// ==========================================
// CLAUDE API KEY ROTATOR
// ==========================================

// lambda-rotation/claude-rotator.js
const AWS = require('aws-sdk');
const https = require('https');

const secretsManager = new AWS.SecretsManager();
const WORKER_URL = process.env.WORKER_URL;
const OSLIRA_ADMIN_TOKEN = process.env.OSLIRA_ADMIN_TOKEN;

exports.handler = async (event) => {
    console.log('Claude Key Rotation Started', { event });
    
    try {
        const secretId = event.SecretId || 'Oslira/CLAUDE_API_KEY';
        
        // Claude also doesn't have programmatic key generation
        // Using key pool approach
        const newApiKey = await getNewClaudeKey();
        
        // Test the new key
        await testClaudeKey(newApiKey);
        
        // Store in AWS Secrets Manager
        await storeNewSecret(secretId, newApiKey);
        
        // Update Oslira systems
        await updateOsliraSystems('CLAUDE_API_KEY', newApiKey);
        
        // Send notifications
        await sendRotationNotification('Claude API Key', 'success');
        
        console.log('Claude Key Rotation Completed Successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Claude API key rotated successfully',
                secretId: secretId,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Claude Key Rotation Failed:', error);
        await sendRotationNotification('Claude API Key', 'failed', error.message);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Key rotation failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

async function getNewClaudeKey() {
    const keyPool = process.env.CLAUDE_KEY_POOL ? JSON.parse(process.env.CLAUDE_KEY_POOL) : [];
    if (keyPool.length > 0) {
        const newKey = keyPool.shift();
        await updateKeyPool('CLAUDE_KEY_POOL', keyPool);
        return newKey;
    }
    
    throw new Error('No new Claude keys available. Manual intervention required.');
}

async function testClaudeKey(apiKey) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
        });
        
        const options = {
            hostname: 'api.anthropic.com',
            port: 443,
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode !== 401 && res.statusCode !== 403) {
                resolve(true);
            } else {
                reject(new Error('Claude API key is invalid'));
            }
        });
        
        req.on('error', (error) => {
            reject(new Error(`Claude API test failed: ${error.message}`));
        });
        
        req.write(postData);
        req.end();
    });
}

// ==========================================
// STRIPE KEY ROTATOR
// ==========================================

// lambda-rotation/stripe-rotator.js
exports.handler = async (event) => {
    console.log('Stripe Key Rotation Started', { event });
    
    try {
        const secretId = event.SecretId || 'Oslira/STRIPE_SECRET_KEY';
        
        // Stripe keys typically don't need rotation unless compromised
        // This function can be used for manual rotation when needed
        
        const newApiKey = await getNewStripeKey();
        await testStripeKey(newApiKey);
        await storeNewSecret(secretId, newApiKey);
        await updateOsliraSystems('STRIPE_SECRET_KEY', newApiKey);
        await sendRotationNotification('Stripe Secret Key', 'success');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Stripe secret key rotated successfully',
                secretId: secretId,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Stripe Key Rotation Failed:', error);
        await sendRotationNotification('Stripe Secret Key', 'failed', error.message);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Key rotation failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

async function getNewStripeKey() {
    const keyPool = process.env.STRIPE_KEY_POOL ? JSON.parse(process.env.STRIPE_KEY_POOL) : [];
    if (keyPool.length > 0) {
        const newKey = keyPool.shift();
        await updateKeyPool('STRIPE_KEY_POOL', keyPool);
        return newKey;
    }
    
    throw new Error('No new Stripe keys available. Manual intervention required.');
}

async function testStripeKey(apiKey) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.stripe.com',
            port: 443,
            path: '/v1/charges?limit=1',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve(true);
            } else if (res.statusCode === 401) {
                reject(new Error('Stripe API key is invalid'));
            } else {
                reject(new Error(`Stripe API test failed with status ${res.statusCode}`));
            }
        });
        
        req.on('error', (error) => {
            reject(new Error(`Stripe API test failed: ${error.message}`));
        });
        
        req.end();
    });
}

// ==========================================
// APIFY TOKEN ROTATOR
// ==========================================

// lambda-rotation/apify-rotator.js
exports.handler = async (event) => {
    console.log('Apify Token Rotation Started', { event });
    
    try {
        const secretId = event.SecretId || 'Oslira/APIFY_API_TOKEN';
        
        const newApiToken = await getNewApifyToken();
        await testApifyToken(newApiToken);
        await storeNewSecret(secretId, newApiToken);
        await updateOsliraSystems('APIFY_API_TOKEN', newApiToken);
        await sendRotationNotification('Apify API Token', 'success');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Apify API token rotated successfully',
                secretId: secretId,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Apify Token Rotation Failed:', error);
        await sendRotationNotification('Apify API Token', 'failed', error.message);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Token rotation failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

async function getNewApifyToken() {
    const tokenPool = process.env.APIFY_TOKEN_POOL ? JSON.parse(process.env.APIFY_TOKEN_POOL) : [];
    if (tokenPool.length > 0) {
        const newToken = tokenPool.shift();
        await updateKeyPool('APIFY_TOKEN_POOL', tokenPool);
        return newToken;
    }
    
    throw new Error('No new Apify tokens available. Manual intervention required.');
}

async function testApifyToken(apiToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.apify.com',
            port: 443,
            path: `/v2/key-value-stores?token=${apiToken}&limit=1`,
            method: 'GET'
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve(true);
            } else if (res.statusCode === 401) {
                reject(new Error('Apify API token is invalid'));
            } else {
                reject(new Error(`Apify API test failed with status ${res.statusCode}`));
            }
        });
        
        req.on('error', (error) => {
            reject(new Error(`Apify API test failed: ${error.message}`));
        });
        
        req.end();
    });
}

// ==========================================
// SHARED FUNCTIONS (used by all rotators)
// ==========================================

async function storeNewSecret(secretId, newValue) {
    const secretString = JSON.stringify({
        apiKey: newValue,
        createdAt: new Date().toISOString(),
        version: `v${Date.now()}`,
        rotatedBy: 'lambda_auto_rotation'
    });
    
    const params = {
        SecretId: secretId,
        SecretString: secretString
    };
    
    await secretsManager.putSecretValue(params).promise();
    console.log(`Secret stored successfully: ${secretId}`);
}

async function updateOsliraSystems(keyName, newValue) {
    if (!WORKER_URL || !OSLIRA_ADMIN_TOKEN) {
        console.warn('Worker URL or admin token not configured, skipping system update');
        return;
    }
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            keyName: keyName,
            newValue: newValue
        });
        
        const url = new URL(`${WORKER_URL}/admin/update-key`);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OSLIRA_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('Successfully updated Oslira systems', { keyName });
                    resolve(data);
                } else {
                    reject(new Error(`Failed to update Oslira systems: ${res.statusCode} - ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`Failed to contact Oslira systems: ${error.message}`));
        });
        
        req.write(postData);
        req.end();
    });
}

async function updateKeyPool(poolName, newPool) {
    const ssm = new AWS.SSM();
    
    try {
        await ssm.putParameter({
            Name: poolName,
            Value: JSON.stringify(newPool),
            Type: 'SecureString',
            Overwrite: true
        }).promise();
        
        console.log(`Updated key pool: ${poolName}`);
    } catch (error) {
        console.error(`Failed to update key pool: ${error.message}`);
    }
}

async function sendRotationNotification(serviceName, status, errorMessage = null) {
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    
    if (!slackWebhook) {
        console.log('No Slack webhook configured, skipping notification');
        return;
    }
    
    const message = {
        text: status === 'success' 
            ? `🔄 ✅ ${serviceName} rotated successfully`
            : `🔄 ❌ ${serviceName} rotation failed: ${errorMessage}`,
        channel: '#alerts'
    };
    
    return new Promise((resolve) => {
        const postData = JSON.stringify(message);
        const url = new URL(slackWebhook);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, () => {
            resolve();
        });
        
        req.on('error', () => {
            resolve(); // Don't fail rotation for notification issues
        });
        
        req.write(postData);
        req.end();
    });
}
