#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Environment variables to inject
const envVars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  WORKER_URL: process.env.WORKER_URL
};

// Validate required environment variables
const missing = Object.entries(envVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('WORKER')));
  process.exit(1);
}

// Create environment config file
const configContent = `// Auto-generated environment configuration
window.SUPABASE_URL = '${envVars.SUPABASE_URL}';
window.SUPABASE_ANON_KEY = '${envVars.SUPABASE_ANON_KEY}';
window.WORKER_URL = '${envVars.WORKER_URL}';

console.log('✅ Environment variables loaded');`;

// Write to public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const configPath = path.join(publicDir, 'env-config.js');
fs.writeFileSync(configPath, configContent);

console.log('✅ Environment variables injected successfully');
console.log('📁 Created:', configPath);

// Also create a copy in root for local development
const rootConfigPath = path.join(__dirname, 'env-config.js');
fs.writeFileSync(rootConfigPath, configContent);
console.log('📁 Created:', rootConfigPath);
