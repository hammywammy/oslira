// =============================================================================
// ENVIRONMENT CONFIGURATION - DUAL ENV SYSTEM
// Single source of truth for environment detection and configuration
// =============================================================================

class EnvironmentConfig {
    constructor() {
        this.config = null;
        this.isLoaded = false;
    }

    async loadConfig() {
        if (this.isLoaded && this.config) {
            return this.config;
        }

        try {
            console.log('🔧 [EnvConfig] Loading environment configuration...');

            // Get config from Netlify edge function
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error(`Config API failed: ${response.status}`);
            }

            const apiConfig = await response.json();
            if (apiConfig.error) {
                throw new Error(apiConfig.error);
            }

            // Environment detection from current domain
            const BASE_URL = window.location.origin;
            const IS_STAGING = BASE_URL.includes('osliratest') || BASE_URL.includes('staging') || BASE_URL.includes('test');
            const IS_PRODUCTION = BASE_URL.includes('oslira.com') && !IS_STAGING;
            const ENV = IS_PRODUCTION ? 'prod' : 'staging';
            
            // Determine worker URL based on environment
            const WORKER_URL = IS_STAGING 
                ? 'https://api-staging.oslira.com'
                : 'https://api.oslira.com';
            
            // Build complete configuration
            this.config = {
                // Core URLs
                BASE_URL,
                WORKER_URL,
                
                // Environment
                ENV,
                IS_PRODUCTION,
                IS_STAGING,
                
                // Supabase
                SUPABASE_URL: apiConfig.supabaseUrl,
                SUPABASE_ANON_KEY: apiConfig.supabaseAnonKey,
                
                // Staging Protection
                stagingPassword: apiConfig.stagingPassword,
                
                // Auth URLs
                AUTH_CALLBACK_URL: `${BASE_URL}/auth/callback`,
                AUTH_LOGIN_URL: `${BASE_URL}/auth.html`,
                DASHBOARD_URL: `${BASE_URL}/dashboard.html`,
                ONBOARDING_URL: `${BASE_URL}/onboarding.html`,
                
                // API Configuration
                API_TIMEOUT: 30000,
                MAX_RETRIES: 3,
                
                // Feature flags by environment
                FEATURES: {
                    DEBUG_MODE: IS_STAGING,
                    ANALYTICS_ENABLED: true,
                    BULK_UPLOAD: true,
                    CAMPAIGNS: IS_PRODUCTION,
                    INTEGRATIONS: false,
                    VERBOSE_LOGGING: IS_STAGING,
                    ERROR_DETAILS: IS_STAGING,
                    TEST_ENDPOINTS: IS_STAGING
                }
            };

            this.isLoaded = true;
            console.log(`✅ [EnvConfig] Configuration loaded for ${ENV} environment`);
            console.log(`🌐 [EnvConfig] Base URL: ${BASE_URL}`);
            console.log(`⚡ [EnvConfig] Worker URL: ${WORKER_URL}`);
            
            return this.config;

        } catch (error) {
            console.error('❌ [EnvConfig] Failed to load configuration:', error);
            throw new Error(`Environment configuration failed: ${error.message}`);
        }
    }

    getConfig() {
        if (!this.isLoaded || !this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return this.config;
    }

    get(key) {
        const config = this.getConfig();
        return config[key];
    }

    isProduction() {
        return this.getConfig().IS_PRODUCTION;
    }

    isStaging() {
        return this.getConfig().IS_STAGING;
    }

    getWorkerUrl() {
        return this.getConfig().WORKER_URL;
    }

    getSupabaseConfig() {
        const config = this.getConfig();
        return {
            url: config.SUPABASE_URL,
            anonKey: config.SUPABASE_ANON_KEY
        };
    }

    getFeatureFlag(flag) {
        const config = this.getConfig();
        return config.FEATURES[flag] || false;
    }

    async makeApiCall(endpoint, options = {}) {
        const config = this.getConfig();
        const url = `${config.WORKER_URL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Environment': config.ENV,
                ...options.headers
            },
            timeout: config.API_TIMEOUT,
            ...options
        };

        if (config.FEATURES.DEBUG_MODE) {
            console.log(`🔄 [API Call] ${defaultOptions.method || 'GET'} ${url}`);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);
            
            const response = await fetch(url, {
                ...defaultOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (config.FEATURES.DEBUG_MODE) {
                console.log(`✅ [API Response]`, data);
            }
            
            return data;
            
        } catch (error) {
            if (config.FEATURES.ERROR_DETAILS) {
                console.error(`❌ [API Error] ${url}:`, error);
            }
            throw error;
        }
    }
}

// Create singleton instance
const envConfig = new EnvironmentConfig();

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        envConfig.loadConfig().catch(error => {
            console.error('Failed to initialize environment config:', error);
        });
    });
} else {
    envConfig.loadConfig().catch(error => {
        console.error('Failed to initialize environment config:', error);
    });
}

// Export for use in other scripts
window.EnvConfig = envConfig;
