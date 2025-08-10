import { createClient } from '@supabase/supabase-js';

class ConfigLoader {
  constructor() {
    // Only these 2 bootstrap variables needed in Netlify env
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async loadFromSupabase() {
    try {
      console.log('🔄 Loading configuration from Supabase via Worker API...');
      
      if (!this.supabaseUrl || !this.supabaseAnonKey) {
        throw new Error('Bootstrap environment variables missing (SUPABASE_URL, SUPABASE_ANON_KEY)');
      }

      // Get SUPABASE_SERVICE_ROLE from worker API (which uses AWS)
      const workerUrl = process.env.WORKER_URL || 'https://ai-outreach-api.hamzawilliamsbusiness.workers.dev';
      const adminToken = process.env.ADMIN_TOKEN;

      if (!adminToken) {
        throw new Error('ADMIN_TOKEN required to fetch service role from AWS');
      }

      // Fetch SUPABASE_SERVICE_ROLE from AWS via worker
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
        throw new Error('Failed to fetch SUPABASE_SERVICE_ROLE from AWS');
      }

      const serviceRoleData = await serviceRoleResponse.json();
      const supabaseServiceRole = serviceRoleData.data?.value;

      if (!supabaseServiceRole) {
        throw new Error('SUPABASE_SERVICE_ROLE not found in AWS Secrets Manager');
      }

      console.log('✅ Retrieved SUPABASE_SERVICE_ROLE from AWS');

      // Now use it to connect to Supabase
      const supabase = createClient(this.supabaseUrl, supabaseServiceRole);
      
      const { data: configs, error } = await supabase
        .from('app_config')
        .select('key_name, key_value')
        .eq('environment', 'production');

      if (error) throw error;

      const config = {};
      configs.forEach(item => {
        try {
          config[item.key_name] = atob(item.key_value);
        } catch (e) {
          config[item.key_name] = item.key_value;
        }
      });

      // Add required frontend values
      config.supabaseUrl = this.supabaseUrl;
      config.supabaseAnonKey = this.supabaseAnonKey;
      config.workerUrl = config.WORKER_URL || process.env.WORKER_URL;
      config.stripePublishableKey = config.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;

      console.log('✅ Configuration loaded from Supabase via AWS');
      console.log('📊 Available services:', Object.keys(config));

      return config;

    } catch (error) {
      console.error('❌ Failed to load from Supabase via AWS:', error);
      
      // Fallback to environment variables
      console.log('🔄 Falling back to environment variables...');
      return {
        supabaseUrl: this.supabaseUrl,
        supabaseAnonKey: this.supabaseAnonKey,
        workerUrl: process.env.WORKER_URL,
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      };
    }
  }
}
