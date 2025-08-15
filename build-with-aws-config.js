// build-with-aws-config.js - Simplified build script for Netlify
// Fetches config from AWS via Cloudflare Worker API

async function buildWithAWSConfig() {
  try {
    console.log('🚀 Building Oslira with AWS configuration...');
    
    // Required environment variables for build
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'WORKER_URL',
      'ADMIN_TOKEN'
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing.join(', '));
      console.log('💡 These must be set in Netlify Site Settings → Environment Variables');
      process.exit(1);
    }
    
    console.log('✅ Required environment variables found');
    
    // Get SUPABASE_SERVICE_ROLE from AWS via worker
    const workerUrl = process.env.WORKER_URL;
    const adminToken = process.env.ADMIN_TOKEN;

    console.log('🔄 Fetching SUPABASE_SERVICE_ROLE from AWS Secrets Manager...');

    const serviceRoleResponse = await fetch(`${workerUrl}/admin/get-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        keyName: 'SUPABASE_SERVICE_ROLE'
      })
    });

    if (!serviceRoleResponse.ok) {
      throw new Error(`Failed to fetch SUPABASE_SERVICE_ROLE: ${serviceRoleResponse.status} ${serviceRoleResponse.statusText}`);
    }

    const serviceRoleData = await serviceRoleResponse.json();
    
    if (!serviceRoleData.success) {
      throw new Error(`AWS config error: ${serviceRoleData.error}`);
    }

    const supabaseServiceRole = serviceRoleData.data?.value;
    if (!supabaseServiceRole) {
      throw new Error('SUPABASE_SERVICE_ROLE not found in AWS Secrets Manager');
    }

    console.log('✅ Retrieved SUPABASE_SERVICE_ROLE from AWS');

    // Build base configuration
    const config = {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      workerUrl: process.env.WORKER_URL
    };

    // Optional: Load additional config from Supabase if needed
    try {
      console.log('🔄 Loading additional config from Supabase...');
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, supabaseServiceRole);
      
      const { data: configs, error } = await supabase
        .from('app_config')
        .select('key_name, key_value')
        .eq('environment', 'production');

      if (error) {
        console.warn('⚠️ Failed to load additional config from Supabase:', error.message);
        console.log('🔄 Continuing with minimal config...');
      } else if (configs && configs.length > 0) {
        console.log(`✅ Loaded ${configs.length} additional config items from Supabase`);
        
        configs.forEach(item => {
          config[item.key_name] = item.key_value;
        });
      }
    } catch (supabaseError) {
      console.warn('⚠️ Supabase additional config failed:', supabaseError.message);
      console.log('🔄 Continuing with minimal config...');
    }

    // Generate env-config.js for frontend
    const configContent = `// Auto-generated configuration - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}
window.CONFIG = ${JSON.stringify(config, null, 2)};

console.log('✅ Configuration loaded successfully');
console.log('📊 Config source: AWS Secrets Manager + Supabase');
`;

    // Write configuration file
    console.log('📝 Writing configuration file...');
    
    const fs = await import('fs');
    const path = await import('path');
    
    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const configPath = path.join(publicDir, 'env-config.js');

    try {
      fs.writeFileSync(configPath, configContent);
      console.log('✅ Configuration file written successfully');
      console.log('📁 File location:', configPath);
    } catch (writeError) {
      console.error('❌ Failed to write configuration file:', writeError.message);
      process.exit(1);
    }
    
    console.log('');
    console.log('====================================================================');
    console.log('🎉 Build completed successfully!');
    console.log('====================================================================');
    console.log('📊 Configuration source: AWS Secrets Manager + Supabase');
    console.log('🔧 SUPABASE_SERVICE_ROLE: Retrieved from AWS');
    console.log(`📄 Config keys loaded: ${Object.keys(config).length}`);
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('====================================================================');
    console.error('❌ Build failed:', error.message);
    console.error('====================================================================');
    console.error('');
    console.error('🔧 Debug steps:');
    console.error('1. Verify ADMIN_TOKEN is correct in Netlify settings');
    console.error('2. Check WORKER_URL is accessible');
    console.error('3. Ensure SUPABASE_SERVICE_ROLE exists in AWS Secrets Manager');
    console.error('4. Test worker endpoint manually:');
    console.error(`   curl -X POST ${process.env.WORKER_URL}/admin/get-config \\`);
    console.error(`   -H "Authorization: Bearer ${process.env.ADMIN_TOKEN}" \\`);
    console.error('   -H "Content-Type: application/json" \\');
    console.error('   -d \'{"keyName": "SUPABASE_SERVICE_ROLE"}\'');
    console.error('');
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildWithAWSConfig();
}

export { buildWithAWSConfig };
