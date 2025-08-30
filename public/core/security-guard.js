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
        
        // Page classification system
        this.pageTypes = {
            PUBLIC: ['home', 'pricing', 'privacy', 'terms', 'disclaimer', 'refund', 'security'],
            AUTH_ONLY: ['auth', 'auth-callback'], 
            AUTH_REQUIRED: ['dashboard', 'settings', 'analytics', 'leads', 'messages'],
            ONBOARDING_REQUIRED: ['onboarding'],
            ADMIN_REQUIRED: ['admin']
        };
        
        // Role definitions (expandable)
        this.roles = {
            OWNER: 'owner',
            ADMIN: 'admin', 
            USER: 'user',
            READONLY: 'readonly'
        };
    }
    
    async setup() {
        if (this.initialized) return;
        
        console.log('🛡️ [SecurityGuard] Initializing universal security controller...');
        
        // IMMEDIATE: Block page rendering until auth verified
        this.blockPageRendering();
        
        // Detect current environment and page
        this.environment = this.detectEnvironment();
        this.currentPage = this.detectCurrentPage();
        this.pageClassification = this.classifyPage();
        
        console.log('🛡️ [SecurityGuard] Context:', {
            environment: this.environment,
            page: this.currentPage,
            classification: this.pageClassification
        });
        
        // Wait for auth manager to be available
        await this.waitForAuthManager();
        
        // Generate CSRF token
        this.generateCSRFToken();
        
        // Setup security event listeners (instance-level)
        this.setupSecurityEventListeners();
        
        // CRITICAL FIX: Replay any early auth events that occurred before initialization
        await this.replayEarlyAuthEvents();
        
        // Enforce page access rules (SINGLE SOURCE OF TRUTH)
        const accessGranted = await this.enforcePageAccess();
        
        if (accessGranted) {
            // Setup security features
            await this.setupTokenSecurity();
            this.setupCSRFProtection();
            
            // Release page for rendering
            this.allowPageRendering();
            
            console.log('✅ [SecurityGuard] Universal security initialized - page access granted');
        }
        
        this.initialized = true;
    }
    
    // CRITICAL FIX: Replay early auth events
    async replayEarlyAuthEvents() {
        if (SecurityGuard.earlyAuthEvents && SecurityGuard.earlyAuthEvents.length > 0) {
            console.log(`🛡️ [SecurityGuard] Replaying ${SecurityGuard.earlyAuthEvents.length} early auth events`);
            
            for (const eventDetail of SecurityGuard.earlyAuthEvents) {
                await this.handleInstanceAuthStateChange({ detail: eventDetail });
            }
            
            // Clear early events after replay
            SecurityGuard.earlyAuthEvents = [];
        }
    }
    
    // =============================================================================
    // A. PAGE ACCESS CONTROL - ENHANCED UNIVERSAL CONTROLLER
    // =============================================================================
    
    blockPageRendering() {
        // Hide entire page until security cleared
        document.documentElement.style.visibility = 'hidden';
        document.documentElement.style.opacity = '0';
        
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'security-loading';
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                text-align: center;
                z-index: 9999;
                font-family: system-ui, -apple-system, sans-serif;
            ">
                <div style="
                    width: 32px;
                    height: 32px;
                    border: 3px solid #f3f4f6;
                    border-top: 3px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                "></div>
                <div>Verifying access...</div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }
    
    allowPageRendering() {
        // Remove loading indicator
        const loadingDiv = document.getElementById('security-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        
        // Show page with smooth transition
        document.documentElement.style.transition = 'opacity 0.3s ease';
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        
        // Clean up transition after animation
        setTimeout(() => {
            document.documentElement.style.transition = '';
        }, 300);
    }
    
    async enforcePageAccess() {
    try {
        console.log('🛡️ [SecurityGuard] Enforcing access control for:', this.pageClassification);
        
        // Special handling for callback page
        if (this.currentPage === 'auth-callback') {
            console.log('🛡️ [SecurityGuard] Auth callback page detected - allowing temporary access');
            return true;
        }
        
        // Get auth manager reference
        const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
        
        if (!authManager) {
            console.log('⚠️ [SecurityGuard] Auth system not available');
            this.redirectToAuth('Authentication system unavailable');
            return false;
        }
        
        // CRITICAL FIX: If auth manager has a session but user context is still loading, wait for it
        const session = authManager.getCurrentSession();
        if (session && !authManager.user) {
            console.log('🛡️ [SecurityGuard] Session exists but user context loading, waiting...');
            await this.waitForUserContextLoad(session.user.id);
        }
        
        // Get current auth state
        const isAuthenticated = authManager.isAuthenticated();
            const isOnboardingComplete = authManager.isOnboardingComplete();
            const hasBusinessProfile = authManager.hasBusinessProfile();
            const isAdmin = authManager.isAdmin();
            
            console.log('🛡️ [SecurityGuard] Auth state:', {
                authenticated: isAuthenticated,
                onboardingComplete: isOnboardingComplete,
                businessProfile: hasBusinessProfile,
                admin: isAdmin,
                pageType: this.pageClassification
            });
            
            // Store current auth state
            this.currentSession = authManager.getCurrentSession();
            this.currentUser = authManager.getCurrentUser();
            
            // Apply access control rules
            switch (this.pageClassification) {
                case 'PUBLIC':
                    console.log('✅ [SecurityGuard] Public page access granted');
                    return true;
                    
                case 'AUTH_ONLY':
                    if (isAuthenticated) {
                        // User is authenticated, redirect away from auth page
                        const redirectUrl = (isOnboardingComplete && hasBusinessProfile) ?
                            '/dashboard' : '/onboarding';
                        console.log('🛡️ [SecurityGuard] User already authenticated, redirecting to:', redirectUrl);
                        
                        // ENHANCED: Add delay to prevent race conditions with callback processing
                        setTimeout(() => {
                            console.log('🛡️ [SecurityGuard] Executing delayed redirect to:', redirectUrl);
                            window.location.href = redirectUrl;
                        }, 500);
                        return false;
                    }
                    console.log('🛡️ [SecurityGuard] User not authenticated - showing auth page');
                    return true;
                    
                case 'AUTH_REQUIRED':
                    if (!isAuthenticated) {
                        console.log('🛡️ [SecurityGuard] Authentication required - redirecting to auth');
                        this.redirectToAuth('Authentication required');
                        return false;
                    }
                    if (!isOnboardingComplete) {
                        console.log('🛡️ [SecurityGuard] Onboarding required - redirecting');
                        setTimeout(() => {
                            window.location.href = '/onboarding';
                        }, 100);
                        return false;
                    }
                    if (!hasBusinessProfile) {
                        console.log('🛡️ [SecurityGuard] Business profile required - redirecting to onboarding');
                        setTimeout(() => {
                            window.location.href = '/onboarding';
                        }, 100);
                        return false;
                    }
                    console.log('✅ [SecurityGuard] Full access granted to authenticated page');
                    return true;
                    
                case 'ONBOARDING_REQUIRED':
                    if (!isAuthenticated) {
                        console.log('🛡️ [SecurityGuard] Authentication required for onboarding');
                        this.redirectToAuth('Authentication required for onboarding');
                        return false;
                    }
                    if (isOnboardingComplete && hasBusinessProfile) {
                        console.log('🛡️ [SecurityGuard] Onboarding already complete - redirecting to dashboard');
                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 100);
                        return false;
                    }
                    console.log('✅ [SecurityGuard] Onboarding page access granted');
                    return true;
                    
                case 'ADMIN_REQUIRED':
                    if (!isAuthenticated) {
                        console.log('🛡️ [SecurityGuard] Authentication required for admin');
                        this.redirectToAuth('Authentication required for admin access');
                        return false;
                    }
                    if (!isAdmin) {
                        console.log('🛡️ [SecurityGuard] Admin privileges required - access denied');
                        this.redirectToAuth('Admin privileges required');
                        return false;
                    }
                    console.log('✅ [SecurityGuard] Admin access granted');
                    return true;
                    
                default:
                    console.log('⚠️ [SecurityGuard] Unknown page classification - denying access');
                    this.redirectToAuth('Page access verification failed');
                    return false;
            }
            
        } catch (error) {
            console.error('❌ [SecurityGuard] Access control error:', error);
            this.redirectToAuth('Security verification failed');
            return false;
        }
    }
    
    redirectToAuth(reason = 'Authentication required') {
        console.log(`🔄 [SecurityGuard] Redirecting to auth: ${reason}`);
        
        // Store current page for post-auth redirect
        if (this.currentPage && !['auth', 'auth-callback'].includes(this.currentPage)) {
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
        console.log('🚨 [SecurityGuard] Token refresh failed, forcing re-authentication');
        
        // Clear all auth data
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear timer
        if (this.refreshTokenTimer) {
            clearTimeout(this.refreshTokenTimer);
        }
        
        // Redirect to auth
        this.redirectToAuth('Session expired');
    }
    
    // =============================================================================
    // C. RBAC AUTHORIZATION
    // =============================================================================
    
    hasRole(role) {
        if (!this.currentUser) return false;
        
        const userRoles = this.currentUser.app_metadata?.roles || [];
        return userRoles.includes(role);
    }
    
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const permissions = this.currentUser.app_metadata?.permissions || [];
        return permissions.includes(permission);
    }
    
    canAccess(resource, action = 'read') {
        // Implement resource-based access control
        const resourcePermissions = {
            'leads': ['read', 'write', 'delete'],
            'campaigns': ['read', 'write'],
            'settings': ['read', 'write'],
            'admin': ['admin']
        };
        
        const requiredPermission = `${resource}:${action}`;
        return this.hasPermission(requiredPermission) || this.hasRole(this.roles.ADMIN);
    }
    
    // =============================================================================
    // D. CSRF PROTECTION
    // =============================================================================
    
    generateCSRFToken() {
        this.csrfToken = this.generateRandomToken(32);
        
        // Store in meta tag for form access
        let metaTag = document.querySelector('meta[name="csrf-token"]');
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'csrf-token';
            document.head.appendChild(metaTag);
        }
        metaTag.content = this.csrfToken;
        
        console.log('🛡️ [SecurityGuard] CSRF token generated');
    }
    
    generateRandomToken(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    setupCSRFProtection() {
        if (!this.csrfToken) return;
        
        // Override fetch to include CSRF token
        const originalFetch = window.fetch;
        window.fetch = (url, options = {}) => {
            // Add CSRF token to POST/PUT/PATCH/DELETE requests
            if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
                options.headers = {
                    ...options.headers,
                    'X-CSRF-Token': this.csrfToken
                };
            }
            
            return originalFetch.apply(window, [url, options]);
        };
        
        console.log('🛡️ [SecurityGuard] CSRF protection enabled');
    }
    
    // =============================================================================
    // ENHANCED EVENT LISTENERS
    // =============================================================================
    
    setupSecurityEventListeners() {
        console.log('🛡️ [SecurityGuard] Setting up instance-level auth event listeners at:', new Date().toISOString());
        
        // Additional security listeners (not auth:change which is handled at class level)
        
        // Handle tab visibility for session management
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
    
    // CRITICAL FIX: Wait for user context to be loaded before making redirect decisions
    async waitForUserContextLoad(userId, maxAttempts = 50) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            
            // Check if user context has been loaded (user object populated with onboarding status)
            if (authManager?.user?.id === userId && 
                authManager.user.hasOwnProperty('onboarding_completed')) {
                console.log('🛡️ [SecurityGuard] User context loaded, proceeding with redirect logic');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('🛡️ [SecurityGuard] User context load timeout, proceeding with available data');
        return false;
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
    
    detectCurrentPage() {
        const pathname = window.location.pathname;
        console.log('🔍 [ScriptLoader] Detecting page for pathname:', pathname);
        
        const pathMap = {
            '/': 'home',
            '/index.html': 'home',
            '/pages/home/index.html': 'home',
            '/auth': 'auth',
            '/auth.html': 'auth', 
            '/pages/auth/index.html': 'auth',
            '/auth/callback': 'auth-callback',
            '/auth/callback.html': 'auth-callback',
            '/pages/auth/callback.html': 'auth-callback',
            '/dashboard': 'dashboard',
            '/dashboard.html': 'dashboard',
            '/pages/dashboard/index.html': 'dashboard',
            '/onboarding': 'onboarding',
            '/onboarding.html': 'onboarding',
            '/pages/onboarding/index.html': 'onboarding',
            '/admin': 'admin',
            '/admin.html': 'admin',
            '/pages/admin/index.html': 'admin'
        };
        
        // Exact match first
        if (pathMap[pathname]) {
            console.log('🔍 [ScriptLoader] Exact match found:', pathMap[pathname]);
            return pathMap[pathname];
        }
        
        // Partial match
        for (const [path, page] of Object.entries(pathMap)) {
            if (pathname.includes(path) && path !== '/') {
                console.log('🔍 [ScriptLoader] Partial match found:', page);
                return page;
            }
        }
        
        console.log('🔍 [ScriptLoader] No match found, defaulting to unknown');
        return 'unknown';
    }
    
    classifyPage() {
        for (const [classification, pages] of Object.entries(this.pageTypes)) {
            if (pages.includes(this.currentPage)) {
                return classification;
            }
        }
        return 'PUBLIC'; // Default to public for unknown pages
    }
    
    async waitForAuthManager() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds
        
        console.log('🛡️ [SecurityGuard] Waiting for auth manager...');
        
        while (attempts < maxAttempts) {
            if (window.OsliraApp?.auth || window.OsliraAuth?.instance) {
                console.log('🛡️ [SecurityGuard] Auth manager found');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('🛡️ [SecurityGuard] Auth manager not available after timeout');
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
