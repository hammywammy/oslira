// =============================================================================
// SIMPLE-APP.JS - Centralized Access Control with Onboarding Check
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
            
            // Apply access control with onboarding check
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
        const authOnlyPages = ['auth', 'auth-callback'];
        
        // If user needs auth but isn't authenticated
        if (authRequiredPages.includes(this.currentPage) && !isAuthenticated) {
            console.log('🚫 [SimpleApp] Redirecting to auth - login required');
            window.location.href = '/auth';
            return;
        }
        
        // If user is on auth page but already authenticated
        if (authOnlyPages.includes(this.currentPage) && isAuthenticated) {
            console.log('✅ [SimpleApp] User authenticated, checking onboarding status...');
            
            // Check onboarding status from database
            const redirectUrl = await this.determinePostAuthRedirect();
            console.log(`🚀 [SimpleApp] Redirecting to: ${redirectUrl}`);
            window.location.href = redirectUrl;
            return;
        }
        
        console.log('✅ [SimpleApp] Access control passed');
    }
    
    async determinePostAuthRedirect() {
        try {
            // Get current user session
            const session = this.auth.getCurrentSession();
            if (!session || !session.user) {
                console.log('❌ [SimpleApp] No session found');
                return '/auth';
            }
            
            console.log('🔍 [SimpleApp] Checking onboarding status for user:', session.user.id);
            
            // Check onboarding_completed status from users table
            const { data: userData, error } = await this.auth.supabase
                .from('users')
                .select('onboarding_completed')
                .eq('id', session.user.id)
                .single();
            
            if (error) {
                console.error('❌ [SimpleApp] Error fetching user data:', error);
                // Default to onboarding if we can't check
                return '/onboarding';
            }
            
            if (!userData) {
                console.log('⚠️ [SimpleApp] No user data found, sending to onboarding');
                return '/onboarding';
            }
            
            // Check onboarding status
            const isOnboardingComplete = userData.onboarding_completed;
            console.log('🔍 [SimpleApp] Onboarding completed:', isOnboardingComplete);
            
            if (isOnboardingComplete) {
                return '/dashboard';
            } else {
                return '/onboarding';
            }
            
        } catch (error) {
            console.error('❌ [SimpleApp] Error determining redirect:', error);
            // Default to onboarding on error
            return '/onboarding';
        }
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    // Utility method for other pages to check auth status
    async requireAuth() {
        if (!this.auth || !this.auth.isAuthenticated()) {
            console.log('🚫 [SimpleApp] Auth required, redirecting...');
            window.location.href = '/auth';
            return false;
        }
        return true;
    }
    
    // Utility method to get current user data
    async getCurrentUserData() {
        try {
            const session = this.auth.getCurrentSession();
            if (!session || !session.user) {
                return null;
            }
            
            const { data: userData, error } = await this.auth.supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
            if (error) {
                console.error('❌ [SimpleApp] Error fetching user data:', error);
                return null;
            }
            
            return userData;
        } catch (error) {
            console.error('❌ [SimpleApp] Error getting user data:', error);
            return null;
        }
    }
}

// Create global instance
window.OsliraSimpleApp = new OsliraSimpleApp();

// Auto-initialize when scripts are loaded
window.addEventListener('oslira:scripts:loaded', async () => {
    try {
        console.log('🚀 [SimpleApp] Scripts loaded, initializing access control...');
        await window.OsliraSimpleApp.initialize();
    } catch (error) {
        console.error('❌ [SimpleApp] Auto-initialization failed:', error);
        
        // Show user-friendly error if possible
        if (window.location.pathname !== '/auth') {
            console.log('🚫 [SimpleApp] Redirecting to auth due to initialization failure');
            window.location.href = '/auth';
        }
    }
});

console.log('📱 SimpleApp ready for initialization');
