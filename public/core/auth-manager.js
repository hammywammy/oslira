// =============================================================================
// AUTH-MANAGER.JS - Centralized Authentication System
// Replaces all scattered auth logic across pages
// =============================================================================

class OsliraAuthManager {
    static instance = null;
    
    static async initialize(config) {
        if (this.instance) return this.instance;
        
        this.instance = new OsliraAuthManager(config);
        await this.instance.setup();
        return this.instance;
    }
    
    static getInstance() {
        return this.instance;
    }
    
    constructor(config) {
        this.config = config;
        this.supabase = null;
        this.session = null;
        this.user = null;
        this.businesses = [];
        this.selectedBusiness = null;
        this.initialized = false;
        this.authChangeListeners = new Set();
    }
    
    async setup() {
        if (this.initialized) return this;
        
        console.log('🔐 [Auth] Initializing authentication system...');
        
        // Wait for Supabase library
        await this.waitForSupabase();
        
        // Initialize single Supabase client
        this.supabase = window.supabase.createClient(
            this.config.SUPABASE_URL,
            this.config.SUPABASE_ANON_KEY,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    storage: window.localStorage
                }
            }
        );
        
        // Make globally available
        window.supabase = this.supabase;
        
        // Get current session
        await this.refreshSession();
        
        // Setup auth state change listener
        this.setupAuthStateListener();
        
        // Load user context if authenticated
        if (this.session) {
            await this.loadUserContext();
        }
        
        // Setup token security features
        this.setupTokenRotation();
        this.setupSecurityEventHandlers();
        
        this.initialized = true;
        console.log('✅ [Auth] Authentication system ready');
        
        return this;
    }
    
    async waitForSupabase() {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!window.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.supabase) {
            throw new Error('Supabase library not available after 10 seconds');
        }
    }
    
    async refreshSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ [Auth] Session refresh failed:', error);
                throw error;
            }
            
            this.session = session;
            
            if (session) {
                this.user = session.user;
                console.log('✅ [Auth] Session refreshed for user:', this.user.email);
            } else {
                this.user = null;
                console.log('ℹ️ [Auth] No active session');
            }
            
            return session;
            
        } catch (error) {
            console.error('❌ [Auth] Failed to refresh session:', error);
            this.session = null;
            this.user = null;
            throw error;
        }
    }
    
    setupAuthStateListener() {
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 [Auth] Auth state changed:', event);
            
            const oldSession = this.session;
            this.session = session;
            
            if (session) {
                this.user = session.user;
                await this.loadUserContext();
                console.log('✅ [Auth] User authenticated:', this.user.email);
            } else {
                this.user = null;
                this.businesses = [];
                this.selectedBusiness = null;
                console.log('ℹ️ [Auth] User signed out');
            }
            
            // Notify listeners
            this.notifyAuthChange(event, session, oldSession);
        });
    }
    
    async loadUserContext() {
        if (!this.session?.user) return;
        
        try {
            console.log('👤 [Auth] Loading user context...');
            
            // Load user profile with retries
            let userData = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (!userData && attempts < maxAttempts) {
                const { data, error } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('id', this.session.user.id)
                    .single();
                
                if (error && error.code !== 'PGRST116') {
                    console.warn(`⚠️ [Auth] User profile load attempt ${attempts + 1} failed:`, error);
                    attempts++;
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                } else {
                    userData = data;
                    break;
                }
            }
            
            this.user = { ...this.session.user, ...userData };
            
            // Load business profiles
            const { data: businessData, error: businessError } = await this.supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', this.session.user.id)
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
                email: this.user.email,
                businesses: this.businesses.length,
                selectedBusiness: this.selectedBusiness?.business_name
            });
            
        } catch (error) {
            console.error('❌ [Auth] Failed to load user context:', error);
        }
    }
    
    // =============================================================================
    // AUTHENTICATION METHODS
    // =============================================================================
    
    async signInWithEmail(email) {
        try {
            console.log('📧 [Auth] Sending magic link to:', email);
            
            const { data, error } = await this.supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback.html`
                }
            });
            
            if (error) throw error;
            
            console.log('✅ [Auth] Magic link sent successfully');
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ [Auth] Magic link failed:', error);
            throw error;
        }
    }
    
    async handleMagicLinkCallback() {
        try {
            console.log('🔗 [Auth] Processing magic link callback...');
            
            // Get session from URL or storage
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) throw error;
            
            if (session) {
                console.log('✅ [Auth] Magic link authentication successful');
                
                // Clean URL
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', window.location.pathname);
                }
                
                return session;
            } else {
                throw new Error('No session found after magic link');
            }
            
        } catch (error) {
            console.error('❌ [Auth] Magic link callback failed:', error);
            throw error;
        }
    }
    
    async signOut() {
        try {
            console.log('👋 [Auth] Signing out...');
            
            await this.supabase.auth.signOut();
            
            // Clear local data
            localStorage.removeItem('selectedBusinessId');
            
            console.log('✅ [Auth] Sign out successful');
            
            // Redirect to home
            window.location.href = '/';
            
        } catch (error) {
            console.error('❌ [Auth] Sign out failed:', error);
            // Force redirect anyway
            window.location.href = '/';
        }
    }
    
    // =============================================================================
    // BUSINESS MANAGEMENT
    // =============================================================================
    
    setSelectedBusiness(businessId) {
        const business = this.businesses.find(b => b.id === businessId);
        if (business) {
            this.selectedBusiness = business;
            localStorage.setItem('selectedBusinessId', businessId);
            
            // Notify listeners
            this.notifyBusinessChange(business);
            
            console.log('🏢 [Auth] Selected business changed:', business.business_name);
            return business;
        }
        return null;
    }
    
    getSelectedBusiness() {
        return this.selectedBusiness;
    }
    
    getBusinesses() {
        return this.businesses;
    }
    
    // =============================================================================
    // ACCESS CONTROL & GUARDS
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
    
    async requireAuth(redirectUrl = '/auth.html') {
        if (!this.isAuthenticated()) {
            console.log('🚫 [Auth] Authentication required, redirecting...');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    async requireOnboarding(redirectUrl = '/onboarding.html') {
        if (!await this.requireAuth()) return false;
        
        if (!this.isOnboardingComplete()) {
            console.log('🚫 [Auth] Onboarding required, redirecting...');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    async requireBusiness(redirectUrl = '/onboarding.html') {
        if (!await this.requireOnboarding()) return false;
        
        if (!this.hasBusinessProfile()) {
            console.log('🚫 [Auth] Business profile required, redirecting...');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    async requireAdmin(redirectUrl = '/dashboard.html') {
        if (!await this.requireAuth()) return false;
        
        if (!this.isAdmin()) {
            console.log('🚫 [Auth] Admin access required, redirecting...');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    // =============================================================================
    // PAGE-SPECIFIC AUTH HANDLING
    // =============================================================================
    
    async handleAuthPage() {
        // If already authenticated, redirect appropriately
        if (this.isAuthenticated()) {
            if (!this.isOnboardingComplete()) {
                window.location.href = '/onboarding.html';
            } else {
                window.location.href = '/dashboard.html';
            }
            return false; // Don't show auth form
        }
        return true; // Show auth form
    }
    
    async handleOnboardingPage() {
        if (!await this.requireAuth()) return false;
        
        if (this.isOnboardingComplete()) {
            window.location.href = '/dashboard.html';
            return false;
        }
        return true;
    }
    
    async handleDashboardPage() {
        return await this.requireBusiness();
    }
    
    async handleAdminPage() {
        return await this.requireAdmin();
    }
    
    // =============================================================================
    // CALLBACK & REDIRECT LOGIC
    // =============================================================================
    
    async handleCallback() {
        try {
            const session = await this.handleMagicLinkCallback();
            
            if (session) {
                // Determine where to redirect
                if (!this.isOnboardingComplete()) {
                    window.location.href = '/onboarding.html';
                } else {
                    window.location.href = '/dashboard.html';
                }
            } else {
                // No session, redirect to auth
                window.location.href = '/auth.html';
            }
            
        } catch (error) {
            console.error('❌ [Auth] Callback handling failed:', error);
            window.location.href = '/auth.html';
        }
    }
    
    getRedirectAfterAuth() {
        if (!this.isOnboardingComplete()) {
            return '/onboarding.html';
        }
        return '/dashboard.html';
    }
    
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
    
    notifyBusinessChange(business) {
        window.dispatchEvent(new CustomEvent('auth:business-change', {
            detail: { business }
        }));
    }
    
    // =============================================================================
    // API INTEGRATION
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
    // UTILITY METHODS
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
    
    // For backward compatibility
    async getSession() {
        return this.session;
    }
    
    async getUser() {
        return this.user;
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

    // =============================================================================
    // TOKEN SECURITY & ROTATION
    // =============================================================================
    
    setupTokenRotation() {
        if (!this.session) return;
        
        // Refresh tokens every 15 minutes (Supabase default is 1 hour)
        const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
        
        setInterval(async () => {
            try {
                const { data, error } = await this.supabase.auth.refreshSession();
                if (error) {
                    console.error('❌ [Auth] Token refresh failed:', error);
                    await this.signOut();
                } else {
                    console.log('🔄 [Auth] Token refreshed successfully');
                    this.session = data.session;
                    this.notifyAuthChange('TOKEN_REFRESHED', data.session, null);
                }
            } catch (error) {
                console.error('❌ [Auth] Token refresh error:', error);
            }
        }, REFRESH_INTERVAL);
    }
    
    setupSecurityEventHandlers() {
        // Force logout on multiple tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'supabase.auth.token' && !event.newValue && event.oldValue) {
                console.log('🔒 [Auth] Session cleared in another tab, logging out');
                this.signOut();
            }
        });
        
        // Detect suspicious activity
        this.lastActivityTime = Date.now();
        document.addEventListener('click', () => {
            this.lastActivityTime = Date.now();
        });
        
        // Auto-logout after 4 hours of inactivity
        setInterval(() => {
            const inactiveTime = Date.now() - this.lastActivityTime;
            const MAX_INACTIVE_TIME = 4 * 60 * 60 * 1000; // 4 hours
            
            if (inactiveTime > MAX_INACTIVE_TIME && this.session) {
                console.log('⏰ [Auth] Auto-logout due to inactivity');
                this.signOut();
            }
        }, 60000); // Check every minute
    }
    
    // =============================================================================
    
    // =============================================================================
    // CLEANUP
    // =============================================================================
    
    destroy() {
        this.authChangeListeners.clear();
        this.session = null;
        this.user = null;
        this.businesses = [];
        this.selectedBusiness = null;
        this.initialized = false;
        
        console.log('🗑️ [Auth] Auth manager destroyed');
    }
}

// Export for global use
window.OsliraAuth = OsliraAuthManager;

// Backward compatibility exports
window.OsliraAuthManager = OsliraAuthManager;

console.log('🔐 Auth Manager class loaded');
