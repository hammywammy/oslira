class OsliraConfigManager {
    static instance = null;
    static config = null;
    
    static async load() {
        if (this.config) return this.config;
        
        console.log('🔧 [Config] Loading centralized configuration...');
        
        try {
            // Primary: Generated config from build process
            if (window.CONFIG) {
                this.config = this.processConfig(window.CONFIG);
                console.log('✅ [Config] Loaded from build-generated config');
                return this.config;
            }
            
            // Fallback: API endpoint
            const response = await fetch('/api/config');
            if (!response.ok) throw new Error(`API config failed: ${response.status}`);
            
            const apiConfig = await response.json();
            if (apiConfig.error) throw new Error(apiConfig.error);
            
            this.config = this.processConfig(apiConfig);
            console.log('✅ [Config] Loaded from API fallback');
            return this.config;
            
        } catch (error) {
            console.error('❌ [Config] Failed to load configuration:', error);
            throw new Error(`Configuration loading failed: ${error.message}`);
        }
    }
    
    static processConfig(rawConfig) {
        const baseUrl = window.location.origin;
        const isProduction = baseUrl.includes('oslira.com');
        const isStaging = baseUrl.includes('osliratest.netlify.app');
        
        return {
            // Core URLs
            BASE_URL: baseUrl,
            WORKER_URL: this.getWorkerUrl(baseUrl, rawConfig),
            
            // Environment
            ENV: isProduction ? 'prod' : (isStaging ? 'staging' : 'dev'),
            IS_PRODUCTION: isProduction,
            IS_STAGING: isStaging,
            
            // Supabase
            SUPABASE_URL: rawConfig.supabaseUrl || rawConfig.SUPABASE_URL,
            SUPABASE_ANON_KEY: rawConfig.supabaseAnonKey || rawConfig.SUPABASE_ANON_KEY,
            
            // Auth URLs
            AUTH_CALLBACK_URL: `${baseUrl}/auth/callback`,
            AUTH_LOGIN_URL: `${baseUrl}/auth.html`,
            DASHBOARD_URL: `${baseUrl}/dashboard.html`,
            
            // Feature flags
            FEATURES: {
                DEBUG_MODE: !isProduction,
                ANALYTICS: true,
                CAMPAIGNS: isProduction,
                BULK_UPLOAD: true
            }
        };
    }
    
    static getWorkerUrl(baseUrl, config) {
        if (baseUrl.includes('oslira.com')) {
            return 'https://api.oslira.com';
        } else if (baseUrl.includes('osliratest.netlify.app')) {
            return 'https://api-staging.oslira.com';
        }
        return config.workerUrl || config.WORKER_URL || 'https://api-staging.oslira.com';
    }
    
    static get() {
        if (!this.config) {
            throw new Error('Config not loaded. Call OsliraConfigManager.load() first');
        }
        return this.config;
    }
}

// Global access
window.OsliraConfig = OsliraConfigManager;
