// =============================================================================
// OSLIRA AUTH MANAGER - UPDATED WITH NEW AUTH METHODS
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
        throw new Error('Config not available after timeout');
    }
    
    // =============================================================================
    // NEW AUTHENTICATION METHODS
    // =============================================================================
    
    // Google OAuth Sign In
    async signInWithGoogle() {
        console.log('🔐 [Auth] Starting Google OAuth sign in');
        
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.OsliraEnv.AUTH_CALLBACK_URL, // Dynamic callback
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });
            
            if (error) {
                console.error('❌ [Auth] Google OAuth error:', error);
                throw error;
            }
            
            // OAuth will redirect, so this won't be reached immediately
            return data;
            
        } catch (error) {
            console.error('❌ [Auth] Google sign in failed:', error);
            throw new Error(`Google sign in failed: ${error.message}`);
        }
    }
    
    // Email + Password Sign Up
    async signUpWithPassword(email, password, userData = {}) {
        console.log('🔐 [Auth] Starting email/password sign up');
        
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email.toLowerCase().trim(),
                password,
                options: {
                    data: {
                        full_name: userData.fullName || '',
                        username: userData.username || null,
                        created_via: 'email'
                    }
                }
            });
            
            if (error) {
                console.error('❌ [Auth] Sign up error:', error);
                throw error;
            }
            
            // Create user record in database
            if (data.user && !data.user.email_confirmed_at) {
                console.log('📧 [Auth] Email confirmation required');
                return {
                    needsEmailConfirmation: true,
                    user: data.user
                };
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ [Auth] Sign up failed:', error);
            throw new Error(`Sign up failed: ${error.message}`);
        }
    }
    
    // Email + Password Sign In
    async signInWithPassword(email, password) {
        console.log('🔐 [Auth] Starting email/password sign in');
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password
            });
            
            if (error) {
                console.error('❌ [Auth] Sign in error:', error);
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ [Auth] Sign in failed:', error);
            throw new Error(`Sign in failed: ${error.message}`);
        }
    }
    
    // Username + Password Sign In
    async signInWithUsername(username, password) {
        console.log('🔐 [Auth] Starting username/password sign in');
        
        try {
            // Get user by username
            const { data: userData, error: userError } = await this.supabase
                .rpc('get_user_by_username', { lookup_username: username });
                
            if (userError || !userData || userData.length === 0) {
                throw new Error('Username not found');
            }
            
            const user = userData[0];
            
            // Sign in with email/password
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: user.email,
                password
            });
            
            if (error) {
                console.error('❌ [Auth] Username sign in error:', error);
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ [Auth] Username sign in failed:', error);
            throw new Error(`Username sign in failed: ${error.message}`);
        }
    }
    
    // Phone SMS OTP Sign In
    async signInWithPhone(phone) {
        console.log('🔐 [Auth] Starting phone OTP sign in');
        
        try {
            // Format phone to E.164
            const formattedPhone = this.formatPhoneE164(phone);
            
            const { data, error } = await this.supabase.auth.signInWithOtp({
                phone: formattedPhone,
                options: {
                    data: {
                        created_via: 'phone'
                    }
                }
            });
            
            if (error) {
                console.error('❌ [Auth] Phone OTP error:', error);
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ [Auth] Phone sign in failed:', error);
            throw new Error(`Phone sign in failed: ${error.message}`);
        }
    }
    
    // Verify Phone OTP
    async verifyPhoneOtp(phone, otp) {
        console.log('🔐 [Auth] Verifying phone OTP');
        
        try {
            const formattedPhone = this.formatPhoneE164(phone);
            
            const { data, error } = await this.supabase.auth.verifyOtp({
                phone: formattedPhone,
                token: otp,
                type: 'sms'
            });
            
            if (error) {
                console.error('❌ [Auth] OTP verification error:', error);
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ [Auth] OTP verification failed:', error);
            throw new Error(`OTP verification failed: ${error.message}`);
        }
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    formatPhoneE164(phone) {
        // Basic E.164 formatting - add country code if missing
        let formatted = phone.replace(/\D/g, ''); // Remove non-digits
        
        if (formatted.length === 10 && !formatted.startsWith('1')) {
            formatted = '1' + formatted; // Add US country code
        }
        
        return '+' + formatted;
    }
    
    // Check username availability
    async checkUsernameAvailable(username) {
        try {
            const { data, error } = await this.supabase
                .rpc('get_user_by_username', { lookup_username: username });
                
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            return !data || data.length === 0;
            
        } catch (error) {
            console.error('❌ [Auth] Username check failed:', error);
            return false;
        }
    }
    
    // =============================================================================
    // SIGN OUT
    // =============================================================================
    
    async signOut() {
        console.log('🚪 [Auth] Signing out');
        
        try {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error('❌ [Auth] Sign out error:', error);
            }
            
            // Clear local state
            this.session = null;
            this.user = null;
            this.businesses = [];
            this.selectedBusiness = null;
            
            // Clear local storage
            localStorage.removeItem('selectedBusinessId');
            
            console.log('✅ [Auth] Signed out successfully');
            
        } catch (error) {
            console.error('❌ [Auth] Sign out failed:', error);
        }
    }
    
    // =============================================================================
    // SESSION MANAGEMENT
    // =============================================================================
    
    async handleAuthStateChange(event, session) {
        console.log(`🔐 [Auth] Processing ${event} event`);
        
        const oldSession = this.session;
        
        if (session) {
            await this.loadUserContext(session);
        } else {
            this.session = null;
            this.user = null;
            this.businesses = [];
            this.selectedBusiness = null;
        }
        
        this.notifyAuthChange(event, session, oldSession);
    }
    
    async loadUserContext(session) {
        console.log('📊 [Auth] Loading user context');
        this.session = session;
        
        try {
            // Load user data with retry logic
            let userData = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (!userData && attempts < maxAttempts) {
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
    
    async requireAuth(redirectUrl = '/auth') {
        if (!this.isAuthenticated()) {
            console.log('🚫 [Auth] Authentication required, redirecting...');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    async requireOnboarding(redirectUrl = '/onboarding') {
        if (!await this.requireAuth()) return false;
        
        if (!this.isOnboardingComplete()) {
            console.log('🚫 [Auth] Onboarding required, redirecting...');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    async requireBusiness(redirectUrl = '/onboarding') {
        if (!await this.requireOnboarding()) return false;
        
        if (!this.hasBusinessProfile()) {
            console.log('🚫 [Auth] Business profile required, redirecting...');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    // =============================================================================
    // PAGE-SPECIFIC AUTH HANDLING
    // =============================================================================
    
    // File: public/core/auth-manager.js
// Lines: 460-480 (handleAuthPage method)

async handleAuthPage() {
    console.log('🔐 [Auth] Checking auth page access...');
    
    // If already authenticated, redirect appropriately
    if (this.isAuthenticated()) {
        console.log('🔐 [Auth] User is authenticated, checking user context...');
        
        // CRITICAL FIX: Ensure user context is fully loaded before checking onboarding status
        if (!this.user) {
            console.log('🔐 [Auth] User context still loading, waiting...');
            let attempts = 0;
            while (!this.user && attempts < 30) { // 3 seconds max
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!this.user) {
                console.warn('🔐 [Auth] User context failed to load, staying on auth page');
                return true; // Show auth form as fallback
            }
        }
        
        console.log('🔐 [Auth] User context loaded, user:', {
            id: this.user.id,
            email: this.user.email,
            onboardingComplete: this.user.onboarding_completed
        });
        
        // Determine redirect destination
        if (!this.isOnboardingComplete()) {
            console.log('🔐 [Auth] User needs onboarding, redirecting...');
            window.location.href = '/onboarding';
        } else {
            console.log('🔐 [Auth] User onboarded, redirecting to dashboard...');
            window.location.href = '/dashboard';
        }
        
        return false; // Don't show auth form
    }
    
    console.log('🔐 [Auth] User not authenticated, showing auth form');
    return true; // Show auth form
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
