/**
 * ENTERPRISE SECURITY GUARD SYSTEM
 * Implements A-D from enterprise checklist:
 * A. Page Guards with role enforcement 
 * B. Token Security with rotation
 * C. RBAC Authorization 
 * D. CSRF Protection
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
        
        console.log('🛡️ [SecurityGuard] Initializing enterprise security...');
        
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
        
        // Enforce page access rules
        const accessGranted = await this.enforcePageAccess();
        
        if (accessGranted) {
            // Setup security features
            await this.setupTokenSecurity();
            this.setupCSRFProtection();
            this.setupSecurityEventListeners();
            
            // Release page for rendering
            this.allowPageRendering();
            
            console.log('✅ [SecurityGuard] Security initialized, page access granted');
        }
        
        this.initialized = true;
    }
    
    // =============================================================================
    // A. PAGE GUARD SYSTEM
    // =============================================================================
    
    blockPageRendering() {
        // Hide entire page immediately
        document.documentElement.style.visibility = 'hidden';
        document.documentElement.style.opacity = '0';
        
        // Show loading state
        this.showSecurityLoadingState();
    }
    
    allowPageRendering() {
        // Remove security loading state
        this.hideSecurityLoadingState();
        
        // Show page
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        document.documentElement.style.transition = 'opacity 0.3s ease';
    }
    
    showSecurityLoadingState() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'security-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255,255,255,0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <h2 style="margin: 0 0 8px 0;">Verifying Access</h2>
                <p style="margin: 0; opacity: 0.9;">Checking authentication...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(loadingDiv);
    }
    
    hideSecurityLoadingState() {
        const loadingDiv = document.getElementById('security-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    async enforcePageAccess() {
        try {
            // Check if auth manager is available
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            if (!authManager) {
                if (this.pageClassification === 'PUBLIC') {
                    return true; // Allow public pages without auth
                }
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
            
            // Enforce access rules based on page classification
            switch (this.pageClassification) {
                case 'PUBLIC':
                    return true;
                    
                case 'AUTH_ONLY':
                    // Auth pages - redirect if already authenticated
                    if (isAuthenticated) {
                        const redirectUrl = isOnboardingComplete ? '/dashboard' : '/onboarding';
                        console.log('🛡️ [SecurityGuard] Already authenticated, redirecting to:', redirectUrl);
                        window.location.href = redirectUrl;
                        return false;
                    }
                    return true;
                    
                case 'AUTH_REQUIRED':
                    if (!isAuthenticated) {
                        this.redirectToAuth('Authentication required');
                        return false;
                    }
                    if (!isOnboardingComplete) {
                        console.log('🛡️ [SecurityGuard] Onboarding required');
                        window.location.href = '/onboarding';
                        return false;
                    }
                    if (!hasBusinessProfile) {
                        console.log('🛡️ [SecurityGuard] Business profile required');
                        window.location.href = '/onboarding';
                        return false;
                    }
                    return true;
                    
                case 'ONBOARDING_REQUIRED':
                    if (!isAuthenticated) {
                        this.redirectToAuth('Authentication required for onboarding');
                        return false;
                    }
                    if (isOnboardingComplete && hasBusinessProfile) {
                        console.log('🛡️ [SecurityGuard] Onboarding already complete, redirecting to dashboard');
                        window.location.href = '/dashboard';
                        return false;
                    }
                    return true;
                    
                case 'ADMIN_REQUIRED':
                    if (!isAuthenticated) {
                        this.redirectToAuth('Authentication required');
                        return false;
                    }
                    if (!isAdmin) {
                        console.log('🛡️ [SecurityGuard] Admin access required');
                        window.location.href = '/dashboard';
                        return false;
                    }
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
        window.location.href = `/auth?return=${currentUrl}&reason=${encodeURIComponent(reason)}`;
    }
    
    // =============================================================================
    // B. TOKEN SECURITY WITH ROTATION  
    // =============================================================================
    
    async setupTokenSecurity() {
        if (!this.currentSession) return;
        
        console.log('🔐 [SecurityGuard] Setting up token security...');
        
        // Check token expiration
        const expiresAt = this.currentSession.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        // Refresh token when 75% of lifetime has passed (15 min = 11.25 min)
        const refreshAt = Math.max(timeUntilExpiry * 0.25 * 1000, 60000); // Min 1 minute
        
        console.log('🔐 [SecurityGuard] Token expires in:', timeUntilExpiry, 'seconds, refreshing in:', refreshAt/1000, 'seconds');
        
        // Set up auto-refresh
        this.refreshTokenTimer = setTimeout(() => {
            this.refreshAccessToken();
        }, refreshAt);
    }
    
    async refreshAccessToken() {
        try {
            console.log('🔄 [SecurityGuard] Refreshing access token...');
            
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            if (!authManager || !authManager.supabase) {
                console.error('🔄 [SecurityGuard] Auth manager not available for refresh');
                return;
            }
            
            const { data, error } = await authManager.supabase.auth.refreshSession();
            
            if (error) {
                console.error('🔄 [SecurityGuard] Token refresh failed:', error);
                this.handleTokenRefreshFailure();
                return;
            }
            
            if (data.session) {
                console.log('✅ [SecurityGuard] Token refreshed successfully');
                this.currentSession = data.session;
                
                // Setup next refresh
                await this.setupTokenSecurity();
                
                // Emit token refresh event
                window.dispatchEvent(new CustomEvent('security:token-refreshed', {
                    detail: { session: data.session }
                }));
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
    
    setupSecurityEventListeners() {
        // Listen for auth state changes
        window.addEventListener('auth:change', (event) => {
            const { session, user } = event.detail;
            this.currentSession = session;
            this.currentUser = user;
            
            if (session) {
                this.setupTokenSecurity();
            }
        });
        
        // Handle tab visibility for session management
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentSession) {
                // Tab became visible, check if session is still valid
                this.validateSession();
            }
        });
        
        console.log('🛡️ [SecurityGuard] Security event listeners setup');
    }
    
    async validateSession() {
        try {
            const authManager = window.OsliraApp?.auth || window.OsliraAuth?.instance;
            if (!authManager) return;
            
            const { data, error } = await authManager.supabase.auth.getSession();
            
            if (error || !data.session) {
                console.log('🚨 [SecurityGuard] Session validation failed, forcing re-auth');
                this.handleTokenRefreshFailure();
            }
        } catch (error) {
            console.error('🚨 [SecurityGuard] Session validation error:', error);
        }
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
}

// Auto-initialize security guard as early as possible
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

console.log('🛡️ Enterprise Security Guard loaded - will initialize when DOM ready');
