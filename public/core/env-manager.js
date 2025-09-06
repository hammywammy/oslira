// =============================================================================
// CENTRALIZED ENVIRONMENT & PAGE MANAGER
// Single source of truth for environment detection AND page detection
// =============================================================================

class OsliraEnvManager {
    constructor() {
        this.hostname = window.location.hostname;
        this.origin = window.location.origin;
        this.pathname = window.location.pathname;
        
        // DOMAIN CONFIGURATION - Single place to update
        this.domains = {
            production: 'oslira.com',
            staging: 'oslira.org', 
            netlifyStaging: 'osliratest.netlify.app'
        };
        
        // Initialize both environment and page detection
        this.initEnvironment();
        this.initPageDetection();
        
console.log('🌍 [Env] Environment & Page Setup:', {
    environment: this.environment,
    hostname: this.hostname,
    currentPage: this._currentPage,
    pageType: this._pageType,
    workerUrl: this.workerUrl,
    authCallback: this.authCallbackUrl
});
    }
    
    // =============================================================================
    // ENVIRONMENT DETECTION
    // =============================================================================
    
    initEnvironment() {
        // Environment detection
        this.isProduction = this.hostname === this.domains.production;
        this.isStaging = this.hostname === this.domains.staging || 
                        this.hostname === this.domains.netlifyStaging;
        this.isDevelopment = this.hostname === 'localhost' || 
                           this.hostname === '127.0.0.1';
        
        // Environment string
        this.environment = this.isProduction ? 'production' : 
                          (this.isStaging ? 'staging' : 'development');
        
        // Worker URLs
        this.workerUrl = this.isProduction ? 'https://api.oslira.com' : 
                        'https://api-staging.oslira.com';
        
        // Auth callback URL (dynamic based on current domain)
        this.authCallbackUrl = `${this.origin}/auth/callback`;
    }
    
    // =============================================================================
    // CENTRALIZED PAGE DETECTION - SINGLE SOURCE OF TRUTH
    // =============================================================================
    
    initPageDetection() {
        // PAGE MAPPING - matches your Netlify redirects exactly
        this.pageMap = {
            // Root and home pages
            '/': 'home',
            '/index.html': 'home',
            '/home': 'home',
            
            // Auth pages
            '/auth': 'auth',
            '/auth/': 'auth', 
            '/auth/callback': 'auth-callback',
            
            // Main app pages
            '/dashboard': 'dashboard',
            '/onboarding': 'onboarding', 
            '/settings': 'settings',
            '/subscription': 'subscription',
            '/analytics': 'analytics',
            '/campaigns': 'campaigns',
            '/leads': 'leads',
            '/messages': 'messages',
            '/integrations': 'integrations',
            '/admin': 'admin',
            
            // Footer pages (public)
            '/footer/about': 'about',
            '/footer/api': 'api-docs',
            '/footer/case-studies': 'case-studies',
            '/footer/guides': 'guides', 
            '/footer/help': 'help',
            '/footer/pricing': 'pricing',
            '/footer/security': 'security-page',
            '/footer/status': 'status',
            
            // Legal pages (public)
            '/footer/legal/privacy': 'privacy',
            '/footer/legal/terms': 'terms',
            '/footer/legal/refund': 'refund',
            '/footer/legal/disclaimer': 'disclaimer'
        };
        
        // PAGE TYPE CLASSIFICATION
        this.pageTypes = {
            PUBLIC: [
                'home', 'about', 'api-docs', 'case-studies', 'guides', 'help', 
                'pricing', 'security-page', 'status', 'privacy', 'terms', 
                'refund', 'disclaimer'
            ],
            AUTH_ONLY: ['auth', 'auth-callback'], 
            AUTH_REQUIRED: [
                'dashboard', 'settings', 'analytics', 'campaigns', 
                'leads', 'messages', 'integrations', 'subscription'
            ],
            ONBOARDING_REQUIRED: ['onboarding'],
            ADMIN_REQUIRED: ['admin']
        };
        
// Detect current page - use private properties for storage
this._currentPage = this.detectCurrentPage();
this._pageType = this.classifyPage(this._currentPage);
    }
    
    detectCurrentPage() {
        console.log('🔍 [Env] Detecting page for pathname:', this.pathname);
        
        // Exact match first (most reliable)
        if (this.pageMap[this.pathname]) {
            console.log('🔍 [Env] Exact match found:', this.pageMap[this.pathname]);
            return this.pageMap[this.pathname];
        }
        
        // Pattern matching for dynamic paths
        if (this.pathname.startsWith('/auth/callback')) {
            console.log('🔍 [Env] Pattern match: auth-callback');
            return 'auth-callback';
        }
        
        if (this.pathname.startsWith('/footer/legal/')) {
            console.log('🔍 [Env] Pattern match: legal page');
            return 'privacy'; // Default legal page
        }
        
        if (this.pathname.startsWith('/footer/')) {
            console.log('🔍 [Env] Pattern match: footer page');
            return 'about'; // Default footer page
        }
        
        // Root level detection
        if (this.pathname === '/' || this.pathname === '' || this.pathname === '/index.html') {
            console.log('🔍 [Env] Root path detected, returning home');
            return 'home';
        }
        
        console.log('🔍 [Env] No match found, defaulting to home');
        return 'home';
    }
    
classifyPage(pageName) {
    for (const [classification, pages] of Object.entries(this.pageTypes)) {
        if (pages.includes(pageName)) {
            console.log('🔍 [Env] Page classification:', classification);
            return classification;
        }
    }
    console.log('🔍 [Env] Unknown page, defaulting to PUBLIC');
    return 'PUBLIC';
}
    
    // =============================================================================
    // PUBLIC API - Used by all other components
    // =============================================================================
    
    // Environment getters
    get ENV() { return this.environment; }
    get IS_PRODUCTION() { return this.isProduction; }
    get IS_STAGING() { return this.isStaging; }
    get IS_DEVELOPMENT() { return this.isDevelopment; }
    get WORKER_URL() { return this.workerUrl; }
    get BASE_URL() { return this.origin; }
    get AUTH_CALLBACK_URL() { return this.authCallbackUrl; }
    
// Page getters - NEW CENTRALIZED  
get CURRENT_PAGE() { return this._currentPage; }
get PAGE_TYPE() { return this._pageType; }
get PATHNAME() { return this.pathname; }

// Direct property access (for backward compatibility)
get currentPage() { return this._currentPage; }
get pageType() { return this._pageType; }
    // Helper methods
    isPrimaryDomain() {
        return this.isProduction;
    }
    
isPublicPage() {
    return this._pageType === 'PUBLIC';
}

isAuthPage() {
    return this._pageType === 'AUTH_ONLY';
}

requiresAuth() {
    return ['AUTH_REQUIRED', 'ONBOARDING_REQUIRED', 'ADMIN_REQUIRED'].includes(this._pageType);
}

requiresOnboarding() {
    return this._pageType === 'ONBOARDING_REQUIRED';
}

requiresAdmin() {
    return this._pageType === 'ADMIN_REQUIRED';
}
    
    getEnvironmentColor() {
        if (this.isProduction) return '#10b981'; // green
        if (this.isStaging) return '#f59e0b';    // amber  
        return '#6b7280';                        // gray for dev
    }
    
    // Debug method
debug() {
    console.group('🌍 [Env] Debug Information');
    console.log('Environment:', this.environment);
    console.log('Hostname:', this.hostname);
    console.log('Pathname:', this.pathname);
    console.log('Current Page:', this._currentPage);
    console.log('Page Type:', this._pageType);
    console.log('Worker URL:', this.workerUrl);
    console.log('Auth Callback:', this.authCallbackUrl);
    console.groupEnd();
}
}

// =============================================================================
// GLOBAL SINGLETON - Available everywhere immediately
// =============================================================================

window.OsliraEnv = new OsliraEnvManager();
