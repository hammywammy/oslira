// =============================================================================
// AUTH MANAGER - CENTRALIZED AUTHENTICATION SYSTEM
// =============================================================================

class AuthManager {
    constructor() {
        this.isLoaded = false;
        this.loadPromise = null;
        this.supabase = null;
        this.session = null;
        this.user = null;
        this.businesses = [];
        
        // Start loading immediately
        this.loadPromise = this.initialize();
    }
    
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    
    async initialize() {
        if (this.isLoaded) {
            return true;
        }
        
        console.log('🔐 [Auth] Initializing authentication system...');
        
        try {
            // Wait for configuration to be ready
            await this.waitForConfig();
            
            // Initialize Supabase
            await this.initializeSupabase();
            
            // Get current session
            await this.loadCurrentSession();
            
            // Set up auth state listener
            this.setupAuthListener();
            
            this.isLoaded = true;
            console.log('✅ [Auth] Authentication system initialized');
            
            return true;
            
        } catch (error) {
            console.error('❌ [Auth] Initialization failed:', error);
            this.isLoaded = true; // Mark as loaded even if failed, to prevent infinite retries
            return false;
        }
    }
    
    async waitForConfig() {
        // Wait for config to be available
        let retries = 0;
        const maxRetries = 50; // 5 seconds max wait
        
        while (!window.OsliraConfig && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.OsliraConfig) {
            throw new Error('Configuration not available after timeout');
        }
        
        // Wait for config to be actually loaded
        if (window.OsliraConfig.getConfig) {
            await window.OsliraConfig.getConfig();
        }
    }
    
    async initializeSupabase() {
        try {
            const config = await window.OsliraConfig.getSupabaseConfig();
            
            if (!config.url || !config.key) {
                throw new Error('Supabase configuration missing');
            }
            
            if (config.url.includes('placeholder') || config.key.includes('placeholder')) {
                console.warn('⚠️  [Auth] Using placeholder Supabase configuration');
                return; // Don't initialize with placeholder config
            }
            
            // Initialize Supabase (assuming it's loaded globally)
            if (typeof window.supabase !== 'undefined') {
                this.supabase = window.supabase.createClient(config.url, config.key);
            } else {
                console.warn('⚠️  [Auth] Supabase not available, auth features disabled');
            }
            
            console.log('✅ [Auth] Supabase initialized');
            
        } catch (error) {
            console.error('❌ [Auth] Supabase initialization failed:', error);
            throw error;
        }
    }
    
    async loadCurrentSession() {
        if (!this.supabase) {
            console.log('ℹ️  [Auth] No Supabase client, skipping session load');
            return;
        }
        
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ [Auth] Session load error:', error);
                return;
            }
            
            if (session) {
                await this.handleSessionChange(session);
                console.log('✅ [Auth] Current session loaded');
            } else {
                console.log('ℹ️  [Auth] No current session');
            }
            
        } catch (error) {
            console.error('❌ [Auth] Failed to load current session:', error);
        }
    }
    
    setupAuthListener() {
        if (!this.supabase) {
            return;
        }
        
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 [Auth] Auth state change:', event);
            
            switch (event) {
                case 'SIGNED_IN':
                    await this.handleSessionChange(session);
                    this.emitAuthEvent('signed-in', { session, user: this.user });
                    break;
                    
                case 'SIGNED_OUT':
                    await this.handleSignOut();
                    this.emitAuthEvent('signed-out', null);
                    break;
                    
                case 'TOKEN_REFRESHED':
                    await this.handleSessionChange(session);
                    this.emitAuthEvent('token-refreshed', { session, user: this.user });
                    break;
            }
        });
    }
    
    // =============================================================================
    // SESSION MANAGEMENT
    // =============================================================================
    
    async handleSessionChange(session) {
        this.session = session;
        this.user = session?.user || null;
        
        if (this.user) {
            console.log('👤 [Auth] User authenticated:', this.user.email);
            
            // Load user businesses if available
            await this.loadUserBusinesses();
        }
    }
    
    async handleSignOut() {
        this.session = null;
        this.user = null;
        this.businesses = [];
        
        console.log('🔐 [Auth] User signed out');
    }
    
    async loadUserBusinesses() {
        if (!this.supabase || !this.user) {
            return;
        }
        
        try {
            const { data: businesses, error } = await this.supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', this.user.id);
            
            if (error) {
                console.error('❌ [Auth] Failed to load businesses:', error);
                return;
            }
            
            this.businesses = businesses || [];
            console.log(`📊 [Auth] Loaded ${this.businesses.length} business profiles`);
            
        } catch (error) {
            console.error('❌ [Auth] Error loading businesses:', error);
        }
    }
    
    // =============================================================================
    // AUTHENTICATION METHODS
    // =============================================================================
    
    async signInWithGoogle() {
        if (!this.supabase) {
            throw new Error('Authentication not available');
        }
        
        const config = await window.OsliraConfig.getConfig();
        const redirectTo = config.authCallbackUrl || `${window.location.origin}/auth/callback`;
        
        console.log('🔐 [Auth] Starting Google OAuth, redirect:', redirectTo);
        
        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTo
            }
        });
        
        if (error) {
            console.error('❌ [Auth] Google OAuth error:', error);
            throw error;
        }
        
        return data;
    }
    
    async signInWithEmail(email, password) {
        if (!this.supabase) {
            throw new Error('Authentication not available');
        }
        
        console.log('🔐 [Auth] Signing in with email:', email);
        
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            console.error('❌ [Auth] Email sign-in error:', error);
            throw error;
        }
        
        return data;
    }
    
    async signUpWithEmail(email, password, username) {
        if (!this.supabase) {
            throw new Error('Authentication not available');
        }
        
        console.log('🔐 [Auth] Signing up with email:', email);
        
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username
                }
            }
        });
        
        if (error) {
            console.error('❌ [Auth] Email sign-up error:', error);
            throw error;
        }
        
        return data;
    }
    
    async signOut() {
        if (!this.supabase) {
            throw new Error('Authentication not available');
        }
        
        console.log('🔐 [Auth] Signing out...');
        
        const { error } = await this.supabase.auth.signOut();
        
        if (error) {
            console.error('❌ [Auth] Sign-out error:', error);
            throw error;
        }
        
        return true;
    }
    
    async resetPassword(email) {
        if (!this.supabase) {
            throw new Error('Authentication not available');
        }
        
        console.log('🔐 [Auth] Sending password reset to:', email);
        
        const { data, error } = await this.supabase.auth.resetPasswordForEmail(email);
        
        if (error) {
            console.error('❌ [Auth] Password reset error:', error);
            throw error;
        }
        
        return data;
    }
    
    // =============================================================================
    // OAUTH CALLBACK HANDLING
    // =============================================================================
    
    async handleCallback() {
        if (!this.supabase) {
            throw new Error('Authentication not available');
        }
        
        console.log('🔐 [Auth] Processing OAuth callback...');
        
        try {
            const { data, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ [Auth] Callback session error:', error);
                throw error;
            }
            
            if (data.session) {
                console.log('✅ [Auth] Callback successful, user authenticated');
                
                // Check if user needs onboarding
                const needsOnboarding = await this.checkOnboardingStatus();
                
                return {
                    session: data.session,
                    redirectTo: needsOnboarding ? '/onboarding' : '/dashboard'
                };
            } else {
                throw new Error('No session found in callback');
            }
            
        } catch (error) {
            console.error('❌ [Auth] Callback processing failed:', error);
            throw error;
        }
    }
    
    async checkOnboardingStatus() {
        if (!this.supabase || !this.user) {
            return true; // Default to onboarding needed
        }
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('onboarding_completed')
                .eq('id', this.user.id)
                .single();
            
            if (error) {
                console.warn('⚠️  [Auth] Could not check onboarding status:', error);
                return true; // Default to onboarding needed
            }
            
            return !data.onboarding_completed;
            
        } catch (error) {
            console.warn('⚠️  [Auth] Error checking onboarding:', error);
            return true;
        }
    }
    
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    
    isAuthenticated() {
        return !!(this.session && this.user);
    }
    
    getCurrentSession() {
        return this.session;
    }
    
    getCurrentUser() {
        return this.user;
    }
    
    getUserBusinesses() {
        return this.businesses;
    }
    
    async waitForAuth() {
        if (!this.isLoaded) {
            await this.loadPromise;
        }
        return this.isAuthenticated();
    }
    
    // =============================================================================
    // EVENT SYSTEM
    // =============================================================================
    
    emitAuthEvent(type, data) {
        const event = new CustomEvent(`auth:${type}`, {
            detail: data
        });
        
        window.dispatchEvent(event);
        console.log(`📡 [Auth] Emitted event: auth:${type}`);
    }
    
    // =============================================================================
    // PAGE SECURITY
    // =============================================================================
    
    async requireAuth() {
        await this.waitForAuth();
        
        if (!this.isAuthenticated()) {
            console.log('🚫 [Auth] Authentication required, redirecting...');
            window.location.href = '/auth';
            return false;
        }
        
        return true;
    }
    
    async requireOnboarding() {
        await this.requireAuth();
        
        const needsOnboarding = await this.checkOnboardingStatus();
        if (needsOnboarding) {
            console.log('📝 [Auth] Onboarding required, redirecting...');
            window.location.href = '/onboarding';
            return false;
        }
        
        return true;
    }
    
    // =============================================================================
    // DEBUG UTILITIES
    // =============================================================================
    
    getDebugInfo() {
        return {
            isLoaded: this.isLoaded,
            isAuthenticated: this.isAuthenticated(),
            userId: this.user?.id || null,
            userEmail: this.user?.email || null,
            businessCount: this.businesses.length,
            hasSupabase: !!this.supabase,
            sessionExists: !!this.session
        };
    }
}

// =============================================================================
// GLOBAL EXPORT & INITIALIZATION
// =============================================================================

// Create global instance
const authManager = new AuthManager();

// Export to window for global access
window.OsliraAuth = authManager;

// Also create a simplified global auth object for backward compatibility
window.SimpleAuth = {
    initialize: () => authManager.initialize(),
    isAuthenticated: () => authManager.isAuthenticated(),
    getCurrentSession: () => authManager.getCurrentSession(),
    getCurrentUser: () => authManager.getCurrentUser(),
    signOut: () => authManager.signOut(),
    supabase: () => authManager.supabase
};

console.log('🔐 [Auth] AuthManager initialized and exposed as window.OsliraAuth');
