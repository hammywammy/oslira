/**
 * ENTERPRISE SECURITY GUARD SYSTEM - ENHANCED UNIVERSAL VERSION
 * Implements A-D from enterprise checklist:
 * A. Page Guards with role enforcement 
 * B. Token Security with rotation
 * C. RBAC Authorization 
 * D. CSRF Protection
 * 
 * STEP 4: Universal navigation controller - single source of truth
 */

class SecurityGuard {
    static instance = null;
    
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
        
        // Enforce page access rules (SINGLE SOURCE OF TRUTH)
        const accessGranted = await this.enforcePageAccess();
        
        if (accessGranted) {
            // Setup security features
            await this.setupTokenSecurity();
            this.setupCSRFProtection();
            this.setupSecurityEventListeners();
            
            // Release page for rendering
            this.allowPageRendering();
            
            console.log('✅ [SecurityGuard] Universal security initialized - page access granted');
        }
        
        this.initialized = true;
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
            
            // Get auth manager instance
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            
            if (!authManager) {
                // Allow public pages without auth system
                if (this.pageClassification === 'PUBLIC') {
                    console.log('🛡️ [SecurityGuard] Public page access granted without auth system');
                    return true;
                }
                console.log('🛡️ [SecurityGuard] Auth system not available, redirecting to home');
                this.redirectToAuth('Auth system not available');
                return false;
            }
            
            // Get current auth state
            this.currentSession = authManager.getCurrentSession();
            this.currentUser = authManager.getCurrentUser();
            
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
            
            // UNIVERSAL ACCESS CONTROL - SINGLE SOURCE OF TRUTH
            switch (this.pageClassification) {
                case 'PUBLIC':
                    console.log('🛡️ [SecurityGuard] Public page - access granted');
                    return true;
                    
                case 'AUTH_ONLY':
                    // Auth pages - redirect if already authenticated (ENHANCED LOGIC)
                    if (isAuthenticated) {
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
                        this.redirectToAuth('Authentication required');
                        return false;
                    }
                    if (!isAdmin) {
                        console.log('🛡️ [SecurityGuard] Admin access required - redirecting to dashboard');
                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 100);
                        return false;
                    }
                    console.log('✅ [SecurityGuard] Admin access granted');
                    return true;
                    
                default:
                    console.warn('🛡️ [SecurityGuard] Unknown page classification:', this.pageClassification);
                    return true;
            }
            
        } catch (error) {
            console.error('🛡️ [SecurityGuard] Access enforcement failed:', error);
            this.redirectToAuth('Security check failed');
            return false;
        }
    }
    
    redirectToAuth(reason) {
        console.log('🛡️ [SecurityGuard] Redirecting to auth:', reason);
        const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
        
        // Enhanced redirect with reason and return URL
        setTimeout(() => {
            window.location.href = `/auth?return=${currentUrl}&reason=${encodeURIComponent(reason)}`;
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
        // Generate cryptographically secure random token
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        this.csrfToken = btoa(String.fromCharCode.apply(null, array));
        
        // Store in meta tag for forms to access
        let metaTag = document.querySelector('meta[name="csrf-token"]');
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'csrf-token';
            document.head.appendChild(metaTag);
        }
        metaTag.content = this.csrfToken;
        
        console.log('🛡️ [SecurityGuard] CSRF token generated');
    }
    
    setupCSRFProtection() {
        // Intercept all form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (form.tagName !== 'FORM') return;
            
            // Skip forms that already have CSRF tokens
            if (form.querySelector('input[name="csrf_token"]')) return;
            
            // Add CSRF token to form
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = this.csrfToken;
            form.appendChild(csrfInput);
        });
        
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [url, options = {}] = args;
            
            // Add CSRF token to POST/PUT/PATCH requests
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
    // Listen for auth state changes and RE-EVALUATE PAGE ACCESS
    window.addEventListener('auth:change', async (event) => {
        const { event: authEvent, session, user } = event.detail;
        console.log('🛡️ [SecurityGuard] Auth state changed:', authEvent, 'Re-evaluating page access...');
        
        this.currentSession = session;
        this.currentUser = user;
        
        // CRITICAL: Re-evaluate page access when auth state changes
        if (authEvent === 'SIGNED_IN' && session && user) {
    console.log('🛡️ [SecurityGuard] User signed in, checking if redirect needed...');
    
    // For AUTH_ONLY pages, redirect authenticated users
    if (this.pageClassification === 'AUTH_ONLY') {
        // WAIT for AuthManager to finish loading user context before checking status
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
    });
        
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
        if (pathMap[pathname]) return pathMap[pathname];
        
        // Partial match
        for (const [path, page] of Object.entries(pathMap)) {
            if (pathname.includes(path) && path !== '/') return page;
        }
        
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

async waitForUserContextLoad(userId, maxAttempts = 50) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
        
        // Check if user context has been loaded (user object populated)
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

// Initialize security guard synchronously to catch early auth events
class SecurityGuardInitializer {
    static async earlyInitialize() {
        console.log('🛡️ [SecurityGuard] Early initialization starting...');
        
        // Set up event listeners IMMEDIATELY, before DOM ready
        window.addEventListener('auth:change', SecurityGuard.handleAuthStateChange.bind(SecurityGuard));
        
        // Set up basic security properties
        SecurityGuard.environment = window.location.hostname.includes('localhost') ? 'development' : 
                                   window.location.hostname.includes('oslira.org') ? 'production' : 'staging';
        SecurityGuard.currentPage = SecurityGuard.detectCurrentPage();
        SecurityGuard.pageClassification = SecurityGuard.getPageClassification();
        
        console.log('🛡️ [SecurityGuard] Event listeners ready BEFORE auth initialization');
        
        // Complete full initialization when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                await SecurityGuard.initialize();
            });
        } else {
            await SecurityGuard.initialize();
        }
    }
}

// Initialize immediately when script loads, not when DOM loads
SecurityGuardInitializer.earlyInitialize();

// Export for global access
window.SecurityGuard = SecurityGuard;

console.log('🛡️ Enhanced Universal Security Guard loaded - will initialize when DOM ready');
