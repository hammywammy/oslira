// ==========================================
// SHARED-CORE.JS - Universal app foundation
// Include this FIRST in every page: <script src="/js/shared-core.js"></script>
// ==========================================

// =============================================================================
// 1. GLOBAL STATE & CONFIGURATION
// =============================================================================

window.OsliraApp = {
    // Core state
    config: {},
    supabase: null,
    user: null,
    session: null,
    business: null,
    businesses: [],
    
    // Feature flags
    features: {
        bulkUpload: true,
        analytics: true,
        campaigns: false, // Coming soon
        integrations: false // Coming soon
    },
    
    // Navigation state
    currentPage: null,
    
    // UI state
    modals: new Set(),
    loading: false,
    
    // Cache
    cache: {
        leads: [],
        stats: null,
        lastRefresh: null
    },
    
    // Event emitter for app-wide communication
    events: new EventTarget()
};

// =============================================================================
// 2. CONFIGURATION LOADER - SIMPLIFIED
// =============================================================================

async function loadAppConfig() {
    try {
        console.log('🔧 Loading configuration...');
        
        // Primary: Use window.CONFIG from env-config.js
        if (window.CONFIG) {
            Object.assign(window.OsliraApp.config, window.CONFIG);
            console.log('✅ Configuration loaded from window.CONFIG');
            return window.CONFIG;
        }
        
        // Fallback: Use API endpoint
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`Config API returned ${response.status}`);
        }
        
        const config = await response.json();
        if (config.error) {
            throw new Error(config.error);
        }
        
        Object.assign(window.OsliraApp.config, config);
        console.log('✅ Configuration loaded from API');
        return config;
        
    } catch (error) {
        console.error('❌ Configuration failed:', error);
        throw error;
    }
}

// =============================================================================
// 3. SUPABASE INITIALIZATION
// =============================================================================

async function initializeSupabase() {
    try {
        if (!window.supabase) {
            throw new Error('Supabase library not loaded');
        }
        
        const config = window.OsliraApp.config;
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error('Supabase configuration missing');
        }
        
        // Initialize Supabase client
        window.OsliraApp.supabase = window.supabase.createClient(
            config.supabaseUrl,
            config.supabaseAnonKey
        );
        
        console.log('✅ Supabase initialized');
        return window.OsliraApp.supabase;
        
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        throw error;
    }
}

// =============================================================================
// 4. AUTHENTICATION SYSTEM
// =============================================================================

async function checkAuthentication() {
    const supabase = window.OsliraApp.supabase;
    
    console.log('🔐 Starting authentication check...');
    console.log('📊 Supabase available:', !!supabase);
    
    if (!supabase) {
        console.warn('🚧 Supabase not available - using fallback');
        return setupDemoUser();
    }
    
    try {
        console.log('🔍 Getting session from Supabase...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📋 Session data:', session);
        console.log('❌ Session error:', error);
        
        if (error) {
            console.error('Auth error:', error);
            redirectToLogin();
            return null;
        }
        
        if (!session) {
            console.log('❌ No active session found');
            redirectToLogin();
            return null;
        }
        
        // Store session and user
        window.OsliraApp.session = session;
        window.OsliraApp.user = session.user;
        
        console.log('✅ User authenticated successfully!');
        console.log('👤 User email:', session.user.email);
        console.log('🆔 User ID:', session.user.id);
        
        setupAuthListener();
        return session.user;
        
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        redirectToLogin();
        return null;
    }
}

function setupDemoUser() {
    window.OsliraApp.user = {
        id: 'demo-user',
        email: 'demo@oslira.com',
        user_metadata: { full_name: 'Demo User' }
    };
    
    window.OsliraApp.session = {
        access_token: 'demo-token',
        user: window.OsliraApp.user
    };
    
    return window.OsliraApp.user;
}

function setupAuthListener() {
    const supabase = window.OsliraApp.supabase;
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
            window.OsliraApp.user = null;
            window.OsliraApp.session = null;
            redirectToLogin();
        } else if (event === 'SIGNED_IN') {
            window.OsliraApp.session = session;
            window.OsliraApp.user = session.user;
            
            // Emit auth event for pages to listen to
            window.OsliraApp.events.dispatchEvent(new CustomEvent('userAuthenticated', {
                detail: { user: session.user }
            }));
        }
    });
}

function redirectToLogin() {
    const protectedPages = ['dashboard', 'leads', 'analytics', 'subscription', 'settings', 'admin', 'campaigns',];
    const currentPage = getCurrentPageName();
    
    if (protectedPages.includes(currentPage)) {
        window.location.href = '/auth.html';  // Also fix the URL
    }
}

// =============================================================================
// 5. USER DATA MANAGEMENT
// =============================================================================

async function loadUserProfile() {
    const supabase = window.OsliraApp.supabase;
    const user = window.OsliraApp.user;
    
    if (!supabase || !user) {
        return setupDemoProfile();
    }
    
    try {
        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') { // Not found is ok for new users
            console.warn('Error loading user profile:', error);
            return setupDemoProfile();
        }
        
        return profile || setupDemoProfile();
        
    } catch (error) {
        console.error('Profile loading failed:', error);
        return setupDemoProfile();
    }
}

function setupDemoProfile() {
    return {
        id: window.OsliraApp.user?.id || 'demo-user',
        email: window.OsliraApp.user?.email || 'demo@oslira.com',
        subscription_plan: 'free',
        subscription_status: 'active',
        credits: 10,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
}

async function loadBusinessProfiles() {
    const supabase = window.OsliraApp.supabase;
    const user = window.OsliraApp.user;
    
    if (!supabase || !user) {
        return setupDemoBusinesses();
    }
    
    try {
        const { data: businesses, error } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', user.id);
        
        if (error) {
            console.warn('Error loading businesses:', error);
            return setupDemoBusinesses();
        }
        
        window.OsliraApp.businesses = businesses || [];
        
        if (businesses && businesses.length > 0) {
            window.OsliraApp.business = businesses[0];
        }
        
        return businesses || [];
        
    } catch (error) {
        console.error('Business loading failed:', error);
        return setupDemoBusinesses();
    }
}

function setupDemoBusinesses() {
    const demoBusiness = {
        id: 'demo-business',
        business_name: 'Demo Business',
        business_type: 'SaaS',
        target_audience: 'Entrepreneurs'
    };
    
    window.OsliraApp.businesses = [demoBusiness];
    window.OsliraApp.business = demoBusiness;
    
    return [demoBusiness];
}

// =============================================================================
// 6. TIMEZONE HANDLING
// =============================================================================

function initializeTimezone() {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        localStorage.setItem('userTimezone', timezone);
        
        console.log('🌍 Timezone detected:', timezone);
        return timezone;
        
    } catch (error) {
        console.warn('Timezone detection failed:', error);
        const fallback = 'UTC';
        localStorage.setItem('userTimezone', fallback);
        return fallback;
    }
}

function getUserTimezone() {
    return localStorage.getItem('userTimezone') || 'UTC';
}


// =============================================================================
// 7. API HELPERS
// =============================================================================

async function apiRequest(endpoint, options = {}) {
    const config = window.OsliraApp.config;
    const session = window.OsliraApp.session;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    };
    
    try {
        const response = await fetch(config.workerUrl + endpoint, finalOptions);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: `HTTP ${response.status}` };
            }
            throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error(`API request failed [${endpoint}]:`, error);
        throw error;
    }
}
function formatDateInUserTimezone(dateString, options) {
    // Set default options if not provided
    if (!options) {
        options = {};
    }
    
    // Add caching to prevent excessive calls
    if (!this.dateFormatCache) {
        this.dateFormatCache = new Map();
    }
    
    const cacheKey = dateString + '_' + JSON.stringify(options);
    if (this.dateFormatCache.has(cacheKey)) {
        return this.dateFormatCache.get(cacheKey);
    }
    
    if (!dateString) {
        return 'Invalid date';
    }
    
    try {
        const date = new Date(dateString);
        const timezone = this.getUserTimezone();
        
        // Build options object manually instead of using spread operator
        const defaultOptions = {
            year: 'numeric',
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone
        };
        
        // Merge options manually
        for (const key in options) {
            if (options.hasOwnProperty(key)) {
                defaultOptions[key] = options[key];
            }
        }
        
        const formatted = date.toLocaleString('en-US', defaultOptions);
        
        // Cache the result
        this.dateFormatCache.set(cacheKey, formatted);
        
        // Limit cache size to prevent memory issues
        if (this.dateFormatCache.size > 100) {
            const firstKey = this.dateFormatCache.keys().next().value;
            this.dateFormatCache.delete(firstKey);
        }
        
        return formatted;
        
    } catch (error) {
        console.error('Date formatting error:', error);
        const errorResult = 'Invalid date';
        this.dateFormatCache.set(cacheKey, errorResult);
        return errorResult;
    }
}
// =============================================================================
// 8. UI UTILITIES
// =============================================================================

function showMessage(text, type = 'success', duration = 5000) {
    // Remove existing messages
    document.querySelectorAll('.oslira-message').forEach(msg => msg.remove());
    
    const message = document.createElement('div');
    message.className = `oslira-message oslira-message-${type}`;
    message.textContent = text;
    
    const colors = {
        success: 'linear-gradient(135deg, #10B981, #34D399)',
        error: 'linear-gradient(135deg, #EF4444, #F87171)',
        warning: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
        info: 'linear-gradient(135deg, #3B82F6, #60A5FA)'
    };
    
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
        background: ${colors[type] || colors.info};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.opacity = '1';
        message.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        message.style.opacity = '0';
        message.style.transform = 'translateX(100%)';
        setTimeout(() => message.remove(), 300);
    }, duration);
}

function showLoadingOverlay(text = 'Loading...') {
    removeLoadingOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'oslira-loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        backdrop-filter: blur(4px);
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
            <div style="width: 40px; height: 40px; border: 4px solid #E5E7EB; border-top: 4px solid #3B82F6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <p style="margin: 0; color: #374151; font-weight: 600;">${text}</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(overlay);
}

function removeLoadingOverlay() {
    const overlay = document.getElementById('oslira-loading-overlay');
    if (overlay) overlay.remove();
}

// =============================================================================
// 9. NAVIGATION & PAGE DETECTION
// =============================================================================

function getCurrentPageName() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '') || 'home';
    return page;
}

function setupGlobalNavigation() {
    // Add logout functionality to all pages
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-action="logout"]')) {
            e.preventDefault();
            logout();
        }
    });
}

async function logout() {
    const supabase = window.OsliraApp.supabase;
    
    try {
        if (supabase) {
            await supabase.auth.signOut();
        }
        
        // Clear app state
        window.OsliraApp.user = null;
        window.OsliraApp.session = null;
        window.OsliraApp.business = null;
        
        // Clear localStorage
        localStorage.removeItem('userTimezone');
        
        showMessage('Logged out successfully', 'success');
        
        setTimeout(() => {
    window.location.href = '/auth.html';   // ✅ Correct URL
}, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/auth.html';
    }
}

// =============================================================================
// 10. INITIALIZATION SYSTEM
// =============================================================================

class OsliraPageInitializer {
    constructor() {
        this.initialized = false;
        this.initPromise = null;
    }
    
    async initialize() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._doInitialize();
        return this.initPromise;
    }
    
    async _doInitialize() {
        try {
            console.log('🚀 Initializing Oslira App...');
            
            // Set current page
            window.OsliraApp.currentPage = getCurrentPageName();
            
            // Load configuration
            await loadAppConfig();
            
            // Initialize Supabase
            await initializeSupabase();
            
            // Initialize timezone
            initializeTimezone();
            
            // Check authentication for protected pages
            const protectedPages = ['dashboard', 'leads', 'analytics', 'subscription', 'settings'];
            if (protectedPages.includes(window.OsliraApp.currentPage)) {
                await checkAuthentication();
                
                if (window.OsliraApp.user) {
                    // Load user data
                    await Promise.all([
                        loadUserProfile(),
                        loadBusinessProfiles()
                    ]);
                }
            }
            
            // Set up global navigation
            setupGlobalNavigation();
            
            this.initialized = true;
            console.log('✅ Oslira App initialized successfully');
            
            // Emit initialization complete event
            window.OsliraApp.events.dispatchEvent(new CustomEvent('appInitialized'));
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this._showInitializationError(error);
            throw error;
        }
    }
    
    _showInitializationError(error) {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                    <h2 style="color: #dc2626; margin-bottom: 16px;">Initialization Error</h2>
                    <p style="color: #6b7280; margin-bottom: 16px;">
                        ${error.message || 'An unexpected error occurred'}
                    </p>
                    <button onclick="window.location.reload()" 
                            style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }
}

// =============================================================================
// 11. GLOBAL EXPORTS
// =============================================================================

// Create global initializer instance
window.OsliraApp.initializer = new OsliraPageInitializer();

// Export key functions globally
window.OsliraApp.initialize = () => window.OsliraApp.initializer.initialize();
window.OsliraApp.showMessage = showMessage;
window.OsliraApp.showLoadingOverlay = showLoadingOverlay;
window.OsliraApp.removeLoadingOverlay = removeLoadingOverlay;
window.OsliraApp.apiRequest = apiRequest;
window.OsliraApp.formatDate = formatDateInUserTimezone;
window.OsliraApp.getUserTimezone = getUserTimezone;
window.OsliraApp.logout = logout;
window.OsliraApp.formatDateInUserTimezone = formatDateInUserTimezone;


// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.OsliraApp.initialize().catch(console.error);
    });
} else {
    // DOM already ready
    window.OsliraApp.initialize().catch(console.error);
}

console.log('📦 Oslira shared core loaded');
