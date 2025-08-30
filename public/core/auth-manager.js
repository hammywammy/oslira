// =============================================================================
// OSLIRA AUTH MANAGER - UPDATED WITH NEW AUTH METHODS (SIMPLIFIED)
// =============================================================================

class OsliraAuthManager {
    constructor() {
        this.initialized = false;
        this.session = null;
        this.user = null;
        this.businesses = [];
        this.selectedBusiness = null;
        this.supabase = null;
        this.authChangeListeners = new Set();
    }
    
    async initialize() {
        if (this.initialized) return this;
        
        try {
            // Wait for config to be loaded
            const config = await this.waitForConfig();
            
            this.supabase = supabase.createClient(
                config.SUPABASE_URL,
                config.SUPABASE_ANON_KEY,
                {
                    auth: {
                        redirectTo: window.OsliraEnv.AUTH_CALLBACK_URL, // Dynamic callback
                        persistSession: true,
                        storageKey: 'oslira-auth',
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );
            
            // Set up auth state listener
            this.supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('🔐 [Auth] State change:', event, session?.user?.email);
                await this.handleAuthStateChange(event, session);
            });
            
            // Initial session load
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                await this.loadUserContext(session);
            }
            
            this.initialized = true;
            console.log('✅ [Auth] Manager initialized');
            return this;
            
        } catch (error) {
            console.error('❌ [Auth] Failed to initialize:', error);
            throw error;
        }
    }
    
    async waitForConfig() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.OsliraConfig?.get) {
                return window.OsliraConfig.get();
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Configuration not available after timeout');
    }
    
    async handleAuthStateChange(event, session) {
        const oldSession = this.session;
        this.session = session;
        
        switch (event) {
            case 'SIGNED_IN':
                console.log('🔐 [Auth] Processing SIGNED_IN event');
                if (session) {
                    await this.loadUserContext(session);
                }
                break;
                
            case 'SIGNED_OUT':
                console.log('🔐 [Auth] Processing SIGNED_OUT event');
                this.clearUserData();
                break;
                
            case 'TOKEN_REFRESHED':
                console.log('🔐 [Auth] Token refreshed');
                break;
                
            default:
                console.log('🔐 [Auth] Unknown auth event:', event);
        }
        
        // Notify listeners
        this.notifyAuthChange(event, session, oldSession);
    }
    
    clearUserData() {
        this.user = null;
        this.businesses = [];
        this.selectedBusiness = null;
        localStorage.removeItem('selectedBusinessId');
        console.log('🔐 [Auth] User data cleared');
    }
    
    async loadUserContext(session) {
        try {
            console.log('📊 [Auth] Loading user context');
            
            // Load user profile with retry logic
            let userData = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                const { data, error } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (error && error.code !== 'PGRST116') {
                    console.warn(`⚠️ [Auth] User load attempt ${attempts + 1} failed:`, error);
                    attempts++;
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                } else {
                    userData = data;
                    break;
                }
            }
            
            this.user = { ...session.user, ...userData };
            
            // Load business profiles
            const { data: businessData, error: businessError } = await this.supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: true });
            
            if (businessError) {
                console.warn('⚠️ [Auth] Failed to load business profiles:', businessError);
                this.businesses = [];
            } else {
                this.businesses = businessData || [];
            }
            
            // Set selected business
            const savedBusinessId = localStorage.getItem('selectedBusinessId');
            if (savedBusinessId && this.businesses.some(b => b.id === savedBusinessId)) {
                this.selectedBusiness = this.businesses.find(b => b.id === savedBusinessId);
            } else if (this.businesses.length > 0) {
                this.selectedBusiness = this.businesses[0];
                localStorage.setItem('selectedBusinessId', this.selectedBusiness.id);
            }
            
            console.log('✅ [Auth] User context loaded:', {
                userId: this.user.id,
                businesses: this.businesses.length
            });
            
        } catch (error) {
            console.error('❌ [Auth] Failed to load user context:', error);
        }
    }
    
    // =============================================================================
    // AUTH METHODS - SIMPLIFIED
    // =============================================================================
    
    async signInWithGoogle() {
        console.log('🔐 [Auth] Starting Google OAuth');
        
        try {
            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.OsliraEnv.AUTH_CALLBACK_URL
                }
            });
            
            if (error) throw error;
            
            // OAuth will redirect to callback page
            
        } catch (error) {
            console.error('❌ [Auth] Google OAuth failed:', error);
            throw error;
        }
    }
    
    async signUpWithPassword(email, password, userData = {}) {
        console.log('🔐 [Auth] Starting email/password signup');
        
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData
                }
            });
            
            if (error) throw error;
            
            console.log('✅ [Auth] Signup successful');
            return { session: data.session, user: data.user };
            
        } catch (error) {
            console.error('❌ [Auth] Signup failed:', error);
            throw error;
        }
    }
    
    async signInWithPassword(email, password) {
        console.log('🔐 [Auth] Starting email/password signin');
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            console.log('✅ [Auth] Signin successful');
            return { session: data.session, user: data.user };
            
        } catch (error) {
            console.error('❌ [Auth] Signin failed:', error);
            throw error;
        }
    }
    
    async signOut() {
        console.log('🔐 [Auth] Signing out');
        
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            console.log('✅ [Auth] Signout successful');
            
        } catch (error) {
            console.error('❌ [Auth] Signout failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // AUTH STATUS CHECKS
    // =============================================================================
    
    isAuthenticated() {
        return !!(this.session && this.user);
    }
    
    hasBusinessProfile() {
        return this.businesses.length > 0;
    }
    
    isOnboardingComplete() {
        return this.user?.onboarding_completed || false;
    }
    
    isAdmin() {
        return this.user?.is_admin || false;
    }
    
    // =============================================================================
    // SIMPLIFIED PAGE-SPECIFIC AUTH HANDLING - STEP 2 & 5 CHANGES
    // =============================================================================
    
    async handleAuthPage() {
        console.log('🔐 [Auth] Checking auth page access...');
        
        // SIMPLIFIED: Only return whether to show form - SecurityGuard handles all redirects
        if (this.isAuthenticated()) {
            console.log('🔐 [Auth] User is authenticated - SecurityGuard will handle redirect');
            return false; // Don't show auth form
        }
        
        console.log('🔐 [Auth] User not authenticated, showing auth form');
        return true; // Show auth form
    }
    
    // REMOVED ALL OTHER requireAuth, requireOnboarding, requireBusiness methods 
    // SecurityGuard now handles ALL page access control
    
    // =============================================================================
    // EVENT SYSTEM
    // =============================================================================
    
    onAuthChange(callback) {
        this.authChangeListeners.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.authChangeListeners.delete(callback);
        };
    }
    
    notifyAuthChange(event, session, oldSession) {
        this.authChangeListeners.forEach(callback => {
            try {
                callback(event, session, oldSession, this);
            } catch (error) {
                console.error('❌ [Auth] Error in auth change listener:', error);
            }
        });
        
        // Also emit global event
        window.dispatchEvent(new CustomEvent('auth:change', {
            detail: {
                event,
                session,
                user: this.user,
                businesses: this.businesses,
                selectedBusiness: this.selectedBusiness
            }
        }));
    }
    
    // =============================================================================
    // API INTEGRATION - SIMPLIFIED
    // =============================================================================
    
    getAuthHeaders() {
        if (!this.session?.access_token) {
            throw new Error('No access token available');
        }
        
        return {
            'Authorization': `Bearer ${this.session.access_token}`,
            'Content-Type': 'application/json'
        };
    }
    
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }
        
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers
        };
        
        return fetch(url, {
            ...options,
            headers
        });
    }
    
    // =============================================================================
    // GETTERS
    // =============================================================================
    
    getCurrentUser() {
        return this.user;
    }
    
    getCurrentSession() {
        return this.session;
    }
    
    getSupabaseClient() {
        return this.supabase;
    }
    
    // =============================================================================
    // DEBUG METHODS
    // =============================================================================
    
    debug() {
        console.group('🔐 [Auth] Debug Information');
        console.log('Initialized:', this.initialized);
        console.log('Session:', this.session);
        console.log('User:', this.user);
        console.log('Businesses:', this.businesses);
        console.log('Selected Business:', this.selectedBusiness);
        console.log('Auth Status:', {
            authenticated: this.isAuthenticated(),
            onboardingComplete: this.isOnboardingComplete(),
            hasBusinessProfile: this.hasBusinessProfile(),
            isAdmin: this.isAdmin()
        });
        console.groupEnd();
    }
}

// =============================================================================
// GLOBAL INITIALIZATION
// =============================================================================

// Create and initialize global instance
window.OsliraAuth = {
    instance: null,
    
    async initialize() {
        if (!this.instance) {
            this.instance = new OsliraAuthManager();
            await this.instance.initialize();
        }
        return this.instance;
    },
    
    // Legacy access
    async load() {
        return await this.initialize();
    }
};

// DO NOT auto-initialize - let app.js handle this
// The auth system will be initialized by the main app initialization sequence
