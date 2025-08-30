// =============================================================================
// CONFIG MANAGER - FIXED AUTO-LOADING
// =============================================================================

class OsliraConfigManager {
    static config = null;
    static loading = false;
    static loadPromise = null;
    
    static async load() {
        if (this.config) return this.config;
        if (this.loadPromise) return this.loadPromise;
        
        this.loadPromise = this.performLoad();
        return this.loadPromise;
    }
    
    static async performLoad() {
        if (this.loading) return this.config;
        this.loading = true;
        
        console.log('🔧 [Config] Starting configuration load...');
        
        try {
            // Ensure environment manager is loaded
            if (!window.OsliraEnv) {
                throw new Error('Environment manager not loaded');
            }
            
            let rawConfig = {};
            
            // Try to load from Netlify edge function first (production/staging)
            if (window.OsliraEnv.IS_PRODUCTION || window.OsliraEnv.IS_STAGING) {
                try {
                    console.log('🌐 [Config] Loading from Netlify edge function...');
                    const response = await fetch('/api/config');
                    
                    if (response.ok) {
                        rawConfig = await response.json();
                        console.log('✅ [Config] Loaded from Netlify edge function');
                    } else {
                        console.warn('⚠️ [Config] Edge function failed, falling back to env config');
                    }
                } catch (error) {
                    console.warn('⚠️ [Config] Edge function error:', error.message);
                }
            }
            
            // Fallback to env-config.js (development)
            if (!rawConfig.supabaseUrl && window.ENV_CONFIG) {
                console.log('🔧 [Config] Using env-config.js fallback');
                rawConfig = window.ENV_CONFIG;
            }
            
            // Final validation
            if (!rawConfig.supabaseUrl) {
                throw new Error('No configuration source available');
            }
            
            // Build final config
            this.config = this.buildConfig(rawConfig);
            
            console.log('✅ [Config] Configuration loaded successfully');
            return this.config;
            
        } catch (error) {
            console.error('❌ [Config] Failed to load configuration:', error);
            throw error;
        } finally {
            this.loading = false;
        }
    }
    
    static buildConfig(rawConfig) {
        const baseUrl = window.OsliraEnv.BASE_URL;
        const environment = window.OsliraEnv.IS_PRODUCTION ? 'prod' : 
                          (window.OsliraEnv.IS_STAGING ? 'staging' : 'dev');
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
            AUTH_LOGIN_URL: `${baseUrl}/auth`,
            DASHBOARD_URL: `${baseUrl}/dashboard`,
            
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
        // Use centralized detection
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

// AUTO-LOAD IMMEDIATELY when this script loads
// This ensures config is ready before auth-manager tries to use it
if (window.OsliraEnv) {
    // Environment already loaded, load config immediately
    OsliraConfigManager.load().catch(error => {
        console.error('❌ [Config] Auto-load failed:', error);
    });
} else {
    // Wait for environment, then load config
    const checkEnv = () => {
        if (window.OsliraEnv) {
            OsliraConfigManager.load().catch(error => {
                console.error('❌ [Config] Auto-load failed:', error);
            });
        } else {
            setTimeout(checkEnv, 50);
        }
    };
    checkEnv();
}
