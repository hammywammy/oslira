// =============================================================================
// SIMPLE-APP.JS - Basic access control only
// =============================================================================

class OsliraSimpleApp {
    constructor() {
        this.initialized = false;
        this.currentPage = null;
        this.auth = null;
    }
    
    async initialize() {
        if (this.initialized) return this;
        
        try {
            console.log('🚀 [SimpleApp] Initializing...');
            
            // Wait for auth system
            this.auth = await this.waitForAuth();
            await this.auth.initialize();
            
            // Get current page
            this.currentPage = window.OsliraEnv.CURRENT_PAGE;
            
            // Apply access control
            await this.applyAccessControl();
            
            this.initialized = true;
            console.log('✅ [SimpleApp] Initialized successfully');
            
            return this;
            
        } catch (error) {
            console.error('❌ [SimpleApp] Initialization failed:', error);
            throw error;
        }
    }
    
    async waitForAuth() {
        for (let i = 0; i < 50; i++) {
            if (window.SimpleAuth?.initialize) {
                return window.SimpleAuth;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('SimpleAuth not available');
    }
    
    async applyAccessControl() {
        const isAuthenticated = this.auth.isAuthenticated();
        
        console.log(`🔐 [SimpleApp] Page: ${this.currentPage}, Authenticated: ${isAuthenticated}`);
        
        // Define page requirements
        const authRequiredPages = ['dashboard', 'onboarding', 'analytics', 'settings', 'subscription'];
        const authOnlyPages = ['auth'];
        
        if (authRequiredPages.includes(this.currentPage) && !isAuthenticated) {
            console.log('🚫 [SimpleApp] Redirecting to auth - login required');
            window.location.href = '/auth';
            return;
        }
        
        if (authOnlyPages.includes(this.currentPage) && isAuthenticated) {
            console.log('✅ [SimpleApp] Redirecting to dashboard - already logged in');
            window.location.href = '/dashboard';
            return;
        }
        
        console.log('✅ [SimpleApp] Access control passed');
    }
    
    isInitialized() {
        return this.initialized;
    }
}

// Create global instance
window.OsliraSimpleApp = new OsliraSimpleApp();

// Auto-initialize when scripts are loaded
window.addEventListener('oslira:scripts:loaded', async () => {
    try {
        await window.OsliraSimpleApp.initialize();
    } catch (error) {
        console.error('❌ [SimpleApp] Auto-initialization failed:', error);
    }
});

console.log('📱 SimpleApp ready for initialization');
