// ============================================================================
// FIXED build-with-aws-config.js - SUPABASE_SERVICE_ROLE handling
// ============================================================================

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
    
    // Build base configuration
    const config = {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      workerUrl: process.env.WORKER_URL
    };

    // Try to get SUPABASE_SERVICE_ROLE from AWS first, then fallback to env var
    const workerUrl = process.env.WORKER_URL;
    const adminToken = process.env.ADMIN_TOKEN;

    console.log('🔄 Attempting to fetch SUPABASE_SERVICE_ROLE from AWS...');

    let supabaseServiceRole = null;

    try {
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

      if (serviceRoleResponse.ok) {
        const serviceRoleData = await serviceRoleResponse.json();
        
        if (serviceRoleData.success && serviceRoleData.data?.value) {
          supabaseServiceRole = serviceRoleData.data.value;
          console.log('✅ Retrieved SUPABASE_SERVICE_ROLE from AWS Secrets Manager');
        } else {
          console.warn('⚠️ SUPABASE_SERVICE_ROLE not found in AWS:', serviceRoleData.error);
        }
      } else {
        console.warn('⚠️ AWS fetch failed:', serviceRoleResponse.status, serviceRoleResponse.statusText);
      }
    } catch (awsError) {
      console.warn('⚠️ AWS fetch error:', awsError.message);
    }

    // Fallback to environment variable if AWS failed
    if (!supabaseServiceRole) {
      console.log('🔄 Falling back to SUPABASE_SERVICE_ROLE environment variable...');
      supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
      
      if (supabaseServiceRole) {
        console.log('✅ Using SUPABASE_SERVICE_ROLE from environment variable');
      } else {
        console.error('❌ SUPABASE_SERVICE_ROLE not found in AWS or environment variables');
        console.error('💡 Add SUPABASE_SERVICE_ROLE to Netlify environment variables as fallback');
        process.exit(1);
      }
    }

    // Optional: Load additional config from Supabase if we have service role
    if (supabaseServiceRole) {
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
        } else if (configs && configs.length > 0) {
          console.log(`✅ Loaded ${configs.length} additional config items from Supabase`);
          
          configs.forEach(item => {
            config[item.key_name] = item.key_value;
          });
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase additional config failed:', supabaseError.message);
      }
    }

    // Generate env-config.js for frontend
    const configContent = `// Auto-generated configuration - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}
window.CONFIG = ${JSON.stringify(config, null, 2)};

console.log('✅ Configuration loaded successfully');
console.log('📊 Config source: AWS Secrets Manager + Environment Variables + Supabase');
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
    console.log('📊 Configuration sources used:');
    console.log('   - AWS Secrets Manager (attempted)');
    console.log('   - Environment Variables (fallback)');
    console.log('   - Supabase app_config (additional)');
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
    console.error('3. Add SUPABASE_SERVICE_ROLE to Netlify environment variables as fallback');
    console.error('4. Ensure AWS Secrets Manager contains Oslira/SUPABASE_SERVICE_ROLE');
    console.error('5. Test worker endpoint manually:');
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
