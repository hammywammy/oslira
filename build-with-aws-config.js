async function buildWithAWSConfig() {
  try {
    console.log('🚀 Building Oslira with AWS + Supabase configuration...');
    
    // Bootstrap variables that must be in Netlify environment
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'WORKER_URL',
      'ADMIN_TOKEN'
    ];
    
    // Variables that can come from either Netlify env OR AWS
    const flexibleVars = [
      'SUPABASE_SERVICE_ROLE'
    ];
    
    // Check required Netlify environment variables
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing.join(', '));
      console.log('💡 These must be set in Netlify Site Settings → Environment Variables');
      process.exit(1);
    }
    
    console.log('✅ Bootstrap environment variables found');
    
    // Get SUPABASE_SERVICE_ROLE - try Netlify env first, then AWS
    let supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
    
    if (supabaseServiceRole) {
      console.log('✅ Using SUPABASE_SERVICE_ROLE from Netlify environment');
    } else {
      console.log('🔄 SUPABASE_SERVICE_ROLE not in Netlify env, trying AWS...');
      
      const workerUrl = process.env.WORKER_URL;
      const adminToken = process.env.ADMIN_TOKEN;

      const serviceRoleResponse = await fetch(`${workerUrl}/admin/get-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          keyName: 'SUPABASE_SERVICE_ROLE',
          adminToken
        })
      });

      if (!serviceRoleResponse.ok) {
        throw new Error(`Failed to fetch SUPABASE_SERVICE_ROLE from AWS: ${serviceRoleResponse.status}`);
      }

      const serviceRoleData = await serviceRoleResponse.json();
      if (!serviceRoleData.success) {
        throw new Error(`AWS config error: ${serviceRoleData.error}`);
      }

      supabaseServiceRole = serviceRoleData.data?.value;
      if (!supabaseServiceRole) {
        throw new Error('SUPABASE_SERVICE_ROLE not found in AWS Secrets Manager or Netlify env');
      }
      
      console.log('✅ Retrieved SUPABASE_SERVICE_ROLE from AWS');
    }

    console.log('🔄 Loading additional config from Supabase...');

    // Create Supabase client with service role (from env or AWS)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, supabaseServiceRole);
    
    const { data: configs, error } = await supabase
      .from('app_config')
      .select('key_name, key_value')
      .eq('environment', 'production');

    if (error) {
      console.warn('⚠️ Failed to load additional config from Supabase:', error.message);
      console.log('🔄 Using minimal config...');
    }

    // Build config object
    const config = {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      workerUrl: process.env.WORKER_URL
    };

    // Add Supabase configs if available
    if (configs) {
      configs.forEach(item => {
        try {
          // Decrypt base64 values
          config[item.key_name] = atob(item.key_value);
        } catch (e) {
          config[item.key_name] = item.key_value;
        }
      });
    }

    // Generate env-config.js
    const configContent = `// Auto-generated from AWS + Supabase - DO NOT EDIT MANUALLY
window.CONFIG = ${JSON.stringify(config, null, 2)};

console.log('✅ Configuration loaded from AWS + Supabase');
`;

    // Write to public directory
    const fs = await import('fs');
    const path = await import('path');
    
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const configPath = path.join(publicDir, 'env-config.js');
    fs.writeFileSync(configPath, configContent);
    
    console.log('✅ Build completed successfully');
    console.log('📁 Created:', configPath);
    console.log('📊 Configuration sources:');
    console.log('   - SUPABASE_SERVICE_ROLE:', supabaseServiceRole === process.env.SUPABASE_SERVICE_ROLE ? 'Netlify env' : 'AWS Secrets Manager');
    console.log('   - Additional config: Supabase app_config table');
    console.log('🔄 To update keys: Use AWS console, admin panel, or Netlify env vars');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.log('🔧 Debug steps:');
    console.log('1. Check ADMIN_TOKEN is correct');
    console.log('2. Verify SUPABASE_SERVICE_ROLE is in Netlify env OR AWS Secrets Manager'); 
    console.log('3. Test admin API: POST /admin/get-config');
    process.exit(1);
  }
}

buildWithAWSConfig();
