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
        
// Create global OsliraApp object for dashboard compatibility FIRST
if (isAuthenticated) {
    try {
        await this.createOsliraAppGlobal();
        
        // Verify user data is available
        if (!window.OsliraApp?.user) {
            console.error('❌ [SimpleApp] OsliraApp created but no user data available');
            throw new Error('User data not loaded in OsliraApp');
        }
        
        console.log('✅ [SimpleApp] OsliraApp ready with user data');
    } catch (error) {
        console.error('❌ [SimpleApp] Failed to create OsliraApp with user data:', error);
        // Redirect to auth if user data can't be loaded
        window.location.href = '/auth';
        return;
    }
}
        
// Define page requirements
        const authRequiredPages = ['dashboard', 'onboarding', 'analytics', 'settings', 'subscription'];
        const authOnlyPages = ['auth', 'auth-callback'];
        const publicPages = ['home']; // Pages where authenticated users can stay
        
        // Skip access control entirely for public pages
        if (publicPages.includes(this.currentPage)) {
            console.log('✅ [SimpleApp] Public page - no access control needed');
            return;
        }
        
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
    
async createOsliraAppGlobal() {
    try {
        const session = this.auth.getCurrentSession();
        if (!session || !session.user) {
            console.warn('⚠️ [SimpleApp] No session available for OsliraApp creation');
            return;
        }

        console.log('🔍 [SimpleApp] Fetching user data for OsliraApp...');
        
        // Fetch full user data from database with error handling
        let userData = null;
        try {
            userData = await this.getCurrentUserData();
            if (userData) {
                console.log('✅ [SimpleApp] User data loaded from database:', userData.email);
            } else {
                console.warn('⚠️ [SimpleApp] No user data returned from database, using session user');
                userData = session.user;
            }
        } catch (error) {
            console.error('❌ [SimpleApp] Error fetching user data, using session user:', error);
            userData = session.user;
        }
        
        // Ensure we have user data
        if (!userData) {
            console.error('❌ [SimpleApp] No user data available from session or database');
            throw new Error('No user data available');
        }
        
        // Create the global OsliraApp object that dashboard expects
        window.OsliraApp = {
            user: userData,
            session: session,
            isAuthenticated: true,
            events: new EventTarget(),
            
            // Legacy API methods dashboard might need
            showMessage: (message, type = 'info') => {
                if (window.Alert && window.Alert[type]) {
                    window.Alert[type](message);
                } else {
                    console.log(`[${type.toUpperCase()}] ${message}`);
                }
            },
            
            // Auth state helpers
            getCurrentUser: () => window.OsliraApp.user,
            getSession: () => window.OsliraApp.session,
            isAuth: () => window.OsliraApp.isAuthenticated
        };
        
        console.log('✅ [SimpleApp] OsliraApp global object created with user:', userData.email);
        
        // Emit authentication event for dashboard
        window.OsliraApp.events.dispatchEvent(new CustomEvent('userAuthenticated', {
            detail: window.OsliraApp.user
        }));
        
    } catch (error) {
        console.error('❌ [SimpleApp] Failed to create OsliraApp global:', error);
        throw error; // Let the caller handle this
    }
}
    
    async determinePostAuthRedirect() {
        try {
            const session = this.auth.getCurrentSession();
            if (!session || !session.user) {
                return '/auth';
            }
            
            // Check if user has completed onboarding
            const { data: userData, error } = await this.auth.supabase
                .from('users')
                .select('onboarding_completed')
                .eq('id', session.user.id)
                .single();
                
            if (error) {
                console.error('Error checking onboarding status:', error);
                return '/onboarding'; // Default to onboarding if error
            }
            
            // Force onboarding if not completed
            if (!userData.onboarding_completed) {
                console.log('🔄 [SimpleApp] User has not completed onboarding, redirecting...');
                return '/onboarding';
            }
            
            return '/dashboard';
            
        } catch (error) {
            console.error('Error determining redirect:', error);
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
    // Skip auto-initialization on public pages
    if (window.preventSimpleAppInit || window.location.pathname === '/' || window.location.pathname === '/index.html') {
        console.log('🏠 [SimpleApp] Skipping auto-initialization for public page');
        return;
    }
    
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
