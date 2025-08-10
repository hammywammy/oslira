import { configLoader, generateConfigFile } from './config-loader.js';

async function buildWithSupabaseConfig() {
  try {
    console.log('🚀 Building Oslira with AWS + Supabase configuration...');
    
    // Only 2 bootstrap variables needed now
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required bootstrap environment variables:', missing.join(', '));
      console.log('💡 These must be set in Netlify Site Settings → Environment Variables');
      console.log('📝 SUPABASE_SERVICE_ROLE is now stored in AWS Secrets Manager');
      process.exit(1);
    }
    
    // Check for ADMIN_TOKEN and WORKER_URL
    if (!process.env.ADMIN_TOKEN || !process.env.WORKER_URL) {
      console.error('❌ ADMIN_TOKEN and WORKER_URL required to fetch SUPABASE_SERVICE_ROLE from AWS');
      process.exit(1);
    }
    
    console.log('✅ Bootstrap environment variables found');
    console.log('🔄 Loading configuration from AWS + Supabase...');
    
    // Generate config file from Supabase (via AWS)
    await generateConfigFile();
    
    console.log('✅ Build completed successfully');
    console.log('📊 Configuration source: AWS Secrets Manager + Supabase app_config table');
    console.log('🔄 To update config: Use admin panel or AWS console');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.log('🔄 Check that SUPABASE_SERVICE_ROLE is properly stored in AWS Secrets Manager');
    process.exit(1);
  }
}

buildWithSupabaseConfig();
