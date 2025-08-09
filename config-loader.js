import { createClient } from '@supabase/supabase-js';

class ConfigLoader {
  constructor() {
    // These are the only env vars you need to set manually (bootstrap values)
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async loadFromSupabase() {
    try {
      console.log('🔄 Loading configuration from Supabase...');
      
      if (!this.supabaseUrl || !this.supabaseServiceRole) {
        throw new Error('Bootstrap environment variables missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE)');
      }

      const supabase = createClient(this.supabaseUrl, this.supabaseServiceRole);
      
      const { data: configs, error } = await supabase
        .from('app_config')
        .select('key_name, key_value')
        .eq('environment', 'production');

      if (error) throw error;

      const config = {};
      configs.forEach(item => {
        // Decrypt the value (base64 decode)
        try {
          config[item.key_name] = atob(item.key_value);
        } catch (e) {
          // If not base64, use as-is
          config[item.key_name] = item.key_value;
        }
      });

      // Add required frontend values
      config.supabaseUrl = this.supabaseUrl;
      config.supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // This one stays in env
      config.workerUrl = config.WORKER_URL || process.env.WORKER_URL;
      config.stripePublishableKey = config.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;

      console.log('✅ Configuration loaded from Supabase');
      console.log('📊 Available services:', Object.keys(config));

      return config;

    } catch (error) {
      console.error('❌ Failed to load from Supabase:', error);
      
      // Fallback to environment variables
      console.log('🔄 Falling back to environment variables...');
      return {
        supabaseUrl: this.supabaseUrl,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        workerUrl: process.env.WORKER_URL,
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      };
    }
  }

  async getConfig(key) {
    const cacheKey = `config_${key}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceRole);
      
      const { data, error } = await supabase
        .from('app_config')
        .select('key_value')
        .eq('key_name', key)
        .eq('environment', 'production')
        .single();

      if (error) throw error;

      const value = data ? atob(data.key_value) : null;
      
      // Cache the result
      this.cache.set(cacheKey, {
        value,
        expires: Date.now() + this.cacheExpiry
      });

      return value;

    } catch (error) {
      console.warn(`Failed to get config for ${key}:`, error);
      return process.env[key] || null;
    }
  }
}

// Export both for different use cases
export const configLoader = new ConfigLoader();

// For build-time usage (replaces inject-env.js)
export async function generateConfigFile() {
  const config = await configLoader.loadFromSupabase();
  
  const configContent = `// Auto-generated from Supabase - DO NOT EDIT MANUALLY
window.CONFIG = ${JSON.stringify(config, null, 2)};

console.log('✅ Configuration loaded from Supabase');
console.log('🔧 Available services:', Object.keys(window.CONFIG));`;

  // Write to public directory (same as before)
  const fs = await import('fs');
  const path = await import('path');
  
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const configPath = path.join(publicDir, 'env-config.js');
  fs.writeFileSync(configPath, configContent);

  console.log('✅ Configuration file generated from Supabase');
  console.log('📁 Created:', configPath);
}

// For runtime usage in frontend
export async function loadRuntimeConfig() {
  return await configLoader.loadFromSupabase();
}
