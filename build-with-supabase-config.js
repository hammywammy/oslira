
#!/usr/bin/env node
// build-with-supabase-config.js - Replaces inject-env.js

import { configLoader, generateConfigFile } from './config-loader.js';

async function buildWithSupabaseConfig() {
  try {
    console.log('🚀 Building Oslira with Supabase configuration...');
    
    // Check for required bootstrap environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE',
      'SUPABASE_ANON_KEY'
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required bootstrap environment variables:', missing.join(', '));
      console.log('💡 These must be set in Netlify Site Settings → Environment Variables');
      console.log('📝 Only these 3 variables are needed - all other config comes from Supabase');
      process.exit(1);
    }
    
    console.log('✅ Bootstrap environment variables found');
    console.log('🔄 Loading configuration from Supabase...');
    
    // Generate config file from Supabase
    await generateConfigFile();
    
    console.log('✅ Build completed successfully');
    console.log('📊 Configuration source: Supabase app_config table');
    console.log('🔄 To update config: Change values in Supabase and rebuild');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.log('🔄 Falling back to legacy environment variable build...');
    
    // Fallback to legacy build process
    try {
      const { default: legacyBuild } = await import('./inject-env.js');
      await legacyBuild();
      console.log('⚠️ Build completed with legacy environment variables');
    } catch (legacyError) {
      console.error('❌ Legacy build also failed:', legacyError.message);
      process.exit(1);
    }
  }
}

// Migration helper script
async function syncExistingEnvToSupabase() {
  try {
    console.log('🔄 Migrating existing environment variables to Supabase...');
    
    const envVarsToMigrate = {
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
      'CLAUDE_API_KEY': process.env.CLAUDE_API_KEY,
      'APIFY_API_TOKEN': process.env.APIFY_API_TOKEN,
      'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
      'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET,
      'WORKER_URL': process.env.WORKER_URL,
      'STRIPE_PUBLISHABLE_KEY': process.env.STRIPE_PUBLISHABLE_KEY
    };
    
    const workerUrl = process.env.WORKER_URL;
    const adminToken = process.env.ADMIN_TOKEN;
    
    if (!workerUrl || !adminToken) {
      console.error('❌ WORKER_URL and ADMIN_TOKEN required for migration');
      return;
    }
    
    for (const [keyName, keyValue] of Object.entries(envVarsToMigrate)) {
      if (keyValue) {
        try {
          const response = await fetch(`${workerUrl}/admin/update-key`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
              keyName,
              newValue: keyValue
            })
          });
          
          if (response.ok) {
            console.log(`✅ Migrated ${keyName}`);
          } else {
            console.log(`❌ Failed to migrate ${keyName}`);
          }
        } catch (error) {
          console.log(`⚠️ Error migrating ${keyName}:`, error.message);
        }
      }
    }
    
    console.log('✅ Migration completed');
    console.log('📝 You can now remove these environment variables from Netlify:');
    console.log(Object.keys(envVarsToMigrate).join(', '));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run based on command line argument
const command = process.argv[2];

if (command === 'migrate') {
  syncExistingEnvToSupabase();
} else {
  buildWithSupabaseConfig();
}
