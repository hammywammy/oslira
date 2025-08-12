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
            const ENV = BASE_URL.includes('oslira.com') ? 'prod' : 'staging';
            
            // Build complete configuration
            this.config = {
                // Core URLs
                BASE_URL,
                WORKER_URL: apiConfig.workerUrl,
                
                // Environment
                ENV,
                IS_PRODUCTION: ENV === 'prod',
                IS_STAGING: ENV === 'staging',
                
                // Supabase
                SUPABASE_URL: apiConfig.supabaseUrl,
                SUPABASE_ANON_KEY: apiConfig.supabaseAnonKey,
                
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
                    DEBUG_MODE: ENV === 'staging',
                    ANALYTICS_ENABLED: true,
                    BULK_UPLOAD: true,
                    CAMPAIGNS: ENV === 'prod', // Only in production
                    INTEGRATIONS: false
                }
            };

            if (ENV === 'staging') {
            // Load staging protection
            const script = document.createElement('script');
            script.src = '/core_utils/staging-protection.js';
            script.async = true;
            script.onload = () => console.log('🔒 Staging protection loaded');
            document.head.appendChild(script);
            }

            this.isLoaded = true;
            console.log(`✅ [EnvConfig] Configuration loaded for ${ENV} environment`);
            console.log(`🌐 [EnvConfig] Base URL: ${BASE_URL}`);
            console.log(`⚡ [EnvConfig] Worker URL: ${this.config.WORKER_URL}`);
            
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

    getEnvironment() {
        return this.getConfig().ENV;
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

    getAuthCallbackUrl() {
        return this.getConfig().AUTH_CALLBACK_URL;
    }

    getSupabaseConfig() {
        const config = this.getConfig();
        return {
            url: config.SUPABASE_URL,
            anonKey: config.SUPABASE_ANON_KEY
        };
    }
}

// Create global instance
window.EnvConfig = new EnvironmentConfig();

// Convenience functions for global access
window.getEnvConfig = () => window.EnvConfig.getConfig();
window.loadEnvConfig = () => window.EnvConfig.loadConfig();

console.log('🔧 [EnvConfig] Environment configuration system loaded');
