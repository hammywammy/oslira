// =============================================================================
// ENVIRONMENT MANAGER - UPDATED FOR PRODUCTION/STAGING SETUP
// =============================================================================

class OsliraEnvManager {
    constructor() {
        this.hostname = window.location.hostname;
        this.origin = window.location.origin;
        
        // SINGLE PLACE TO UPDATE DOMAINS
        this.config = {
            production: 'oslira.com',          // Main production domain
            staging: 'oslira.org',             // Staging domain
            netlifyStaging: 'osliratest.netlify.app'  // Netlify preview
        };
        
        this.init();
    }
    
    init() {
        // Environment detection
        this.isProduction = this.hostname === this.config.production;
        this.isStaging = this.hostname === this.config.staging || 
                        this.hostname === this.config.netlifyStaging;
        this.isDevelopment = this.hostname === 'localhost' || 
                           this.hostname === '127.0.0.1';
        
        // Environment string
        this.environment = this.isProduction ? 'production' : 
                          (this.isStaging ? 'staging' : 'development');
        
        // Worker URLs (both point to same backend, but different endpoints)
        this.workerUrl = this.isProduction ? 'https://api.oslira.com' : 
                        'https://api-staging.oslira.com';
        
        // Auth callback URL (dynamic based on current domain)
        this.authCallbackUrl = `${this.origin}/auth/callback`;
        
        console.log('🌍 [Env] Environment Setup:', {
            environment: this.environment,
            hostname: this.hostname,
            workerUrl: this.workerUrl,
            authCallback: this.authCallbackUrl
        });
    }
    
    // Public getters - used everywhere
    get ENV() { return this.environment; }
    get IS_PRODUCTION() { return this.isProduction; }
    get IS_STAGING() { return this.isStaging; }
    get IS_DEVELOPMENT() { return this.isDevelopment; }
    get WORKER_URL() { return this.workerUrl; }
    get BASE_URL() { return this.origin; }
    get AUTH_CALLBACK_URL() { return this.authCallbackUrl; }
    
    // Helper methods
    isPrimaryDomain() {
        return this.isProduction; // oslira.com is primary
    }
    
    getEnvironmentColor() {
        if (this.isProduction) return '#10b981'; // green
        if (this.isStaging) return '#f59e0b';    // amber  
        return '#6b7280';                        // gray for dev
    }
}

// Global singleton - available immediately
window.OsliraEnv = new OsliraEnvManager();
