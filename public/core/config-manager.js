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
    
    // Use centralized environment detection - NO MORE DUPLICATE LOGIC
    const environment = window.OsliraEnv.ENV === 'production' ? 'prod' : 
                       (window.OsliraEnv.ENV === 'staging' ? 'staging' : 'dev');
    const environmentString = window.OsliraEnv.ENV.toUpperCase();
    
    // Log environment detection from centralized source
    console.log('🌍 [Config] Environment Detection:', {
        hostname: window.OsliraEnv.hostname,
        origin: baseUrl,
        isProduction: window.OsliraEnv.IS_PRODUCTION,
        isStaging: window.OsliraEnv.IS_STAGING,
        environment: environmentString
    });
    
    return {
        // Core URLs
        BASE_URL: baseUrl,
        WORKER_URL: window.OsliraEnv.WORKER_URL,
        
        // Environment from centralized manager
        ENV: environment,
        IS_PRODUCTION: window.OsliraEnv.IS_PRODUCTION,
        IS_STAGING: window.OsliraEnv.IS_STAGING,
            
            // Supabase
            SUPABASE_URL: rawConfig.supabaseUrl || rawConfig.SUPABASE_URL,
            SUPABASE_ANON_KEY: rawConfig.supabaseAnonKey || rawConfig.SUPABASE_ANON_KEY,
            
            // Auth URLs
            AUTH_CALLBACK_URL: `${baseUrl}/auth/callback`,
            AUTH_LOGIN_URL: `${baseUrl}/auth.html`,
            DASHBOARD_URL: `${baseUrl}/dashboard.html`,
            
            // Feature flags
FEATURES: {
    DEBUG_MODE: !window.OsliraEnv.IS_PRODUCTION,
    ANALYTICS: true,
    CAMPAIGNS: window.OsliraEnv.IS_PRODUCTION,
    BULK_UPLOAD: true
}
        };
    }
    
    static getWorkerUrl(baseUrl, config) {
    // COMPLETELY REMOVE - Use centralized detection
    return window.OsliraEnv.WORKER_URL;
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
