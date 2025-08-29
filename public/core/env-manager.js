// =============================================================================
// ENVIRONMENT MANAGER - SINGLE SOURCE OF TRUTH
// =============================================================================

class OsliraEnvManager {
    constructor() {
        this.hostname = window.location.hostname;
        this.origin = window.location.origin;
        
        // SINGLE PLACE TO UPDATE DOMAINS
        this.config = {
            production: 'oslira.com',
            staging: 'oslira.org',
            netlifyStaging: 'osliratest.netlify.app'
        };
        
        this.init();
    }
    
    init() {
        this.isProduction = this.hostname === this.config.production;
        this.isStaging = this.hostname === this.config.staging || 
                        this.hostname === this.config.netlifyStaging;
        this.isDevelopment = this.hostname === 'localhost' || 
                           this.hostname === '127.0.0.1';
        
        this.environment = this.isProduction ? 'production' : 
                          (this.isStaging ? 'staging' : 'development');
        
        // Worker URLs
        this.workerUrl = this.isProduction ? 'https://api.oslira.com' : 
                        'https://api-staging.oslira.com';
        
        console.log('🌍 [Env] Environment:', this.environment, 
                   'Host:', this.hostname);
    }
    
    // Public getters - used everywhere
    get ENV() { return this.environment; }
    get IS_PRODUCTION() { return this.isProduction; }
    get IS_STAGING() { return this.isStaging; }
    get IS_DEVELOPMENT() { return this.isDevelopment; }
    get WORKER_URL() { return this.workerUrl; }
    get BASE_URL() { return this.origin; }
}

// Global singleton - available immediately
window.OsliraEnv = new OsliraEnvManager();
