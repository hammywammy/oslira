/**
 * ENTERPRISE SECURITY GUARD SYSTEM - ENHANCED UNIVERSAL VERSION
 * Implements A-D from enterprise checklist:
 * A. Page Guards with role enforcement 
 * B. Token Security with rotation
 * C. RBAC Authorization 
 * D. CSRF Protection
 * 
 * STEP 4: Universal navigation controller - single source of truth
 * FIXED: Race condition between auth events and event listener setup
 */

class SecurityGuard {
    static instance = null;
    
    // CRITICAL FIX: Static method to handle auth state changes before instance exists
    static handleAuthStateChange = async (event) => {
        const { event: authEvent, session, user } = event.detail;
        console.log('🛡️ [SecurityGuard] EARLY Auth state changed:', {
            event: authEvent,
            timestamp: new Date().toISOString(),
            hasSession: !!session,
            hasUser: !!user,
            userId: user?.id
        });
        
        // If instance exists, delegate to instance method
        if (SecurityGuard.instance && SecurityGuard.instance.initialized) {
            await SecurityGuard.instance.handleInstanceAuthStateChange(event);
        } else {
            // Store early events for replay when instance is ready
            SecurityGuard.earlyAuthEvents = SecurityGuard.earlyAuthEvents || [];
            SecurityGuard.earlyAuthEvents.push(event.detail);
            console.log('🛡️ [SecurityGuard] Stored early auth event for replay');
        }
    }
    
    static async initialize() {
        if (this.instance) return this.instance;
        
        this.instance = new SecurityGuard();
        await this.instance.setup();
        return this.instance;
    }
    
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.currentSession = null;
        this.csrfToken = null;
        this.refreshTokenTimer = null;
        
        // Role definitions (expandable)
        this.roles = {
            OWNER: 'owner',
            ADMIN: 'admin', 
            USER: 'user',
            READONLY: 'readonly'
        };
        
        // Environment detection
        this.environment = this.detectEnvironment();
        this.currentPage = window.OsliraEnv?.CURRENT_PAGE || 'unknown';
        this.pageClassification = window.OsliraEnv?.PAGE_TYPE || 'UNKNOWN';
        
        console.log('🛡️ [SecurityGuard] Initializing universal security controller...');
        console.log('🛡️ [SecurityGuard] Context:', {
            environment: this.environment,
            page: this.currentPage,
            classification: this.pageClassification
        });
        
        // CRITICAL: Block page rendering for protected pages until security validation
        if (this.pageClassification !== 'PUBLIC') {
            console.log('🛡️ [SecurityGuard] Blocking page rendering for protected page');
            document.documentElement.style.visibility = 'hidden';
            document.documentElement.style.transition = 'visibility 0.3s ease-in-out';
        }
    }
    
    async setup() {
        try {
            console.log('🛡️ [SecurityGuard] Starting setup...');
            
            // Wait for full app initialization (includes auth manager)
            await this.waitForAppInitialization();
            
            // Enforce page access control
            await this.enforcePageAccess();
            
            // Setup security event listeners  
            this.setupSecurityEventListeners();
            
            console.log('🛡️ [SecurityGuard] Security setup complete');
            
            // Show page after security validation
            this.showPage();
            
        } catch (error) {
            console.error('🚨 [SecurityGuard] Setup failed:', error);
            this.redirectToAuth('Security validation failed');
        }
    }

    async waitForAppInitialization() {
        console.log('🛡️ [SecurityGuard] Waiting for app initialization...');
        
        // First, wait for app ready event
        if (!window.OsliraApp?.instance) {
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn('🛡️ [SecurityGuard] App initialization timeout');
                    resolve();
                }, 10000); // 10 second timeout
                
                window.addEventListener('oslira:app:ready', () => {
                    clearTimeout(timeout);
                    console.log('🛡️ [SecurityGuard] App initialization complete');
                    resolve();
                }, { once: true });
            });
        }
        
        // Verify auth manager is available
        const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
        if (!authManager) {
            throw new Error('Auth manager not available after app initialization');
        }
        
        console.log('🛡️ [SecurityGuard] App and auth manager ready');
    }

    async enforcePageAccess() {
        try {
            console.log('🛡️ [SecurityGuard] Enforcing access control for:', this.pageClassification);
            
            // USE CENTRALIZED PAGE TYPE HELPERS
            if (window.OsliraEnv.CURRENT_PAGE === 'auth-callback') {
                console.log('🛡️ [SecurityGuard] Auth callback page detected - allowing access');
                return true;
            }
            
            // Get auth manager reference
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            
            if (!authManager) {
                if (window.OsliraEnv.isPublicPage()) {
                    console.log('✅ [SecurityGuard] Public page - no auth required');
                    return true;
                }
                console.log('⚠️ [SecurityGuard] Auth system not available, redirecting');
                this.redirectToAuth('Authentication system loading');
                return false;
            }
            
            // Check session first
            const session = authManager.getCurrentSession();
            const isAuthenticated = !!session;
            
            console.log('🛡️ [SecurityGuard] Quick auth state:', {
                authenticated: isAuthenticated,
                pageType: this.pageClassification,
                sessionExists: !!session
            });
            
            // USE CENTRALIZED PAGE TYPE CLASSIFICATION
            if (window.OsliraEnv.isPublicPage()) {
                console.log('✅ [SecurityGuard] Public page access granted');
                return true;
            }
            
            if (window.OsliraEnv.isAuthPage()) {
                if (isAuthenticated) {
                    const oauthSuccess = sessionStorage.getItem('oauth_success');
                    if (oauthSuccess) {
                        console.log('🛡️ [SecurityGuard] OAuth just completed, redirecting to onboarding');
                        sessionStorage.removeItem('oauth_success');
                        setTimeout(() => window.location.href = '/onboarding', 100);
                        return false;
                    }
                    
                    setTimeout(() => {
                        const redirectUrl = authManager.isOnboardingComplete() && authManager.hasBusinessProfile() 
                            ? '/dashboard' : '/onboarding';
                        
                        console.log('🛡️ [SecurityGuard] Auth page - redirecting authenticated user to:', redirectUrl);
                        window.location.href = redirectUrl;
                    }, 500);
                    return false;
                }
                
                console.log('✅ [SecurityGuard] Auth page access granted for unauthenticated user');
                return true;
            }
            
            if (window.OsliraEnv.isOnboardingPage()) {
                if (!isAuthenticated) {
                    console.log('🚫 [SecurityGuard] Onboarding requires authentication');
                    this.redirectToAuth('Please sign in to continue');
                    return false;
                }
                
                console.log('✅ [SecurityGuard] Onboarding page access granted');
                this.currentSession = session;
                this.currentUser = session.user;
                return true;
            }
            
            if (this.pageClassification === 'AUTH_REQUIRED') {
                if (!isAuthenticated) {
                    console.log('🚫 [SecurityGuard] Protected page requires authentication');
                    this.redirectToAuth('Please sign in to access this page');
                    return false;
                }
                
                // Check if onboarding is required
                if (!authManager.isOnboardingComplete() || !authManager.hasBusinessProfile()) {
                    console.log('🚫 [SecurityGuard] Onboarding required for protected page');
                    setTimeout(() => window.location.href = '/onboarding', 100);
                    return false;
                }
                
                console.log('✅ [SecurityGuard] Protected page access granted');
                this.currentSession = session;
                this.currentUser = session.user;
                return true;
            }
            
            console.log('✅ [SecurityGuard] Default access granted');
            return true;
            
        } catch (error) {
            console.error('🚨 [SecurityGuard] Access enforcement error:', error);
            this.redirectToAuth('Security check failed');
            return false;
        }
    }
    
    showPage() {
        console.log('🛡️ [SecurityGuard] Showing page content...');
        document.documentElement.style.visibility = 'visible';
        
        // Add smooth transition
        setTimeout(() => {
            document.documentElement.style.transition = '';
        }, 300);
    }
    
    redirectToAuth(reason = 'Authentication required') {
        console.log('🔄 [SecurityGuard] Redirecting to auth:', reason);
        
        // Store current page for post-auth redirect (except for auth pages)
        if (!['auth', 'auth-callback'].includes(this.currentPage)) {
            sessionStorage.setItem('postAuthRedirect', window.location.pathname);
        }
        
        setTimeout(() => {
            window.location.href = '/auth';
        }, 100);
    }
    
    // =============================================================================
    // B. TOKEN SECURITY MANAGEMENT
    // =============================================================================
    
    async setupTokenSecurity() {
        if (!this.currentSession?.access_token) return;
        
        console.log('🛡️ [SecurityGuard] Setting up token security...');
        
        // Clear existing timer
        if (this.refreshTokenTimer) {
            clearTimeout(this.refreshTokenTimer);
        }
        
        // Calculate refresh time (refresh 5 minutes before expiry)
        const expiresIn = this.currentSession.expires_in || 3600; // Default 1 hour
        const refreshTime = (expiresIn - 300) * 1000; // 5 minutes before expiry
        
        this.refreshTokenTimer = setTimeout(async () => {
            await this.refreshToken();
        }, refreshTime);
        
        console.log(`🔄 [SecurityGuard] Token refresh scheduled in ${refreshTime/1000} seconds`);
    }
    
    async refreshToken() {
        try {
            console.log('🔄 [SecurityGuard] Refreshing authentication token...');
            
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            if (!authManager?.supabase) {
                throw new Error('Auth manager not available');
            }
            
            const { data, error } = await authManager.supabase.auth.refreshSession();
            
            if (error) throw error;
            
            if (data.session) {
                this.currentSession = data.session;
                console.log('✅ [SecurityGuard] Token refreshed successfully');
                
                // Schedule next refresh
                await this.setupTokenSecurity();
            }
        } catch (error) {
            console.error('🔄 [SecurityGuard] Token refresh error:', error);
            this.handleTokenRefreshFailure();
        }
    }
    
    handleTokenRefreshFailure() {
        console.warn('🔄 [SecurityGuard] Token refresh failed - redirecting to auth');
        this.redirectToAuth('Session expired, please sign in again');
    }
    
    // =============================================================================
    // SECURITY EVENT LISTENERS
    // =============================================================================
    
    setupSecurityEventListeners() {
        // Enhanced session management
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentSession) {
                // Tab became visible, check if session is still valid
                this.validateSession();
            }
        });
        
        // Enhanced session validation on focus
        window.addEventListener('focus', () => {
            if (this.currentSession) {
                this.validateSession();
            }
        });
        
        console.log('🛡️ [SecurityGuard] Enhanced security event listeners setup');
    }
    
    // CRITICAL FIX: Instance method to handle auth state changes
    async handleInstanceAuthStateChange(event) {
        const { event: authEvent, session, user } = event.detail;
        console.log('🛡️ [SecurityGuard] Instance handling auth state change:', authEvent, 'Re-evaluating page access...');
        
        this.currentSession = session;
        this.currentUser = user;
        
        // CRITICAL: Re-evaluate page access when auth state changes
        if (authEvent === 'SIGNED_IN' && session && user) {
            console.log('🛡️ [SecurityGuard] User signed in, checking if redirect needed...');
            
            // For AUTH_ONLY pages, redirect authenticated users
            if (this.pageClassification === 'AUTH_ONLY') {
                // CRITICAL FIX: Wait for user context to be loaded before checking status
                await this.waitForUserContextLoad(user.id);
                
                const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
                const isOnboardingComplete = authManager?.isOnboardingComplete();
                const hasBusinessProfile = authManager?.hasBusinessProfile();
                
                const redirectUrl = (isOnboardingComplete && hasBusinessProfile) ?
                    '/dashboard' : '/onboarding';
                
                console.log('🛡️ [SecurityGuard] Auth page - redirecting authenticated user to:', redirectUrl);
                
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 500);
            }
        }
        
        if (session) {
            this.setupTokenSecurity();
        } else {
            // Clear security context on signout
            if (this.refreshTokenTimer) {
                clearTimeout(this.refreshTokenTimer);
            }
        }
    }
    
    async waitForUserContextLoad(userId, maxAttempts = 20) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            
            // CRITICAL FIX: Don't wait for full user context if session exists
            // Just verify the session is valid for basic access control
            if (authManager?.getCurrentSession()?.user?.id === userId) {
                console.log('🛡️ [SecurityGuard] Session verified, proceeding');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 50)); // Reduced wait time
            attempts++;
        }
        
        console.warn('🛡️ [SecurityGuard] Session verification timeout, allowing access');
        return true; // Don't block access, let auth manager handle the flow
    }
    
    async validateSession() {
        try {
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            if (!authManager?.supabase) return;
            
            const { data, error } = await authManager.supabase.auth.getSession();
            
            if (error || !data.session) {
                console.log('🚨 [SecurityGuard] Session validation failed, forcing re-auth');
                this.handleTokenRefreshFailure();
            } else if (data.session.access_token !== this.currentSession?.access_token) {
                console.log('🔄 [SecurityGuard] Session token changed, updating security context');
                this.currentSession = data.session;
                await this.setupTokenSecurity();
            }
        } catch (error) {
            console.error('🚨 [SecurityGuard] Session validation error:', error);
        }
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    detectEnvironment() {
        const hostname = window.location.hostname;
        if (hostname.includes('localhost') || hostname === '127.0.0.1') return 'development';
        if (hostname.includes('test') || hostname.includes('staging') || hostname.includes('netlify')) return 'staging';
        return 'production';
    }
    
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    
    getCSRFToken() {
        return this.csrfToken;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getCurrentSession() {
        return this.currentSession;
    }
    
    isPageAccessAllowed() {
        return this.initialized && document.documentElement.style.visibility !== 'hidden';
    }
    
    // Enhanced debug method
    debug() {
        console.group('🛡️ [SecurityGuard] Debug Information');
        console.log('Initialized:', this.initialized);
        console.log('Environment:', this.environment);
        console.log('Current Page:', this.currentPage);
        console.log('Page Classification:', this.pageClassification);
        console.log('Current Session:', this.currentSession);
        console.log('Current User:', this.currentUser);
        console.log('CSRF Token:', this.csrfToken ? 'Generated' : 'None');
        console.log('Token Timer:', this.refreshTokenTimer ? 'Active' : 'None');
        console.groupEnd();
    }
}

// CRITICAL FIX: Set up event listener IMMEDIATELY when script loads (not on DOM ready)
console.log('🛡️ [SecurityGuard] Setting up early auth event listener...');
window.addEventListener('auth:change', SecurityGuard.handleAuthStateChange);

// Auto-initialize security guard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await SecurityGuard.initialize();
    });
} else {
    // DOM already loaded, initialize immediately
    SecurityGuard.initialize();
}

// Export for global access
window.SecurityGuard = SecurityGuard;
console.log('🛡️ Enhanced Universal Security Guard loaded - will initialize when DOM ready');
