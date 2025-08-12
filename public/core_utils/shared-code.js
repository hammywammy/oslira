// ==========================================
// SHARED-CORE.JS - Universal app foundation
// Include this FIRST in every page: <script src="/core_utils/shared-code.js"></script>
// ==========================================

// =============================================================================
// 1. GLOBAL STATE & CONFIGURATION
// =============================================================================
const DISABLE_LOGS_IN_PRODUCTION = true; // Change to false to re-enable
const DISABLE_LOGS_IN_STAGING  = true; 

if (DISABLE_LOGS_IN_PRODUCTION && window.location.hostname === 'oslira.com') {
    console.log = console.warn = console.info = () => {};
    console.debug = () => {};
}

if (DISABLE_LOGS_IN_STAGING && window.location.hostname === 'osliratest.netlify.app') {
    console.log = console.warn = console.info = () => {};
    console.debug = () => {};
}

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

            // Ensure workerUrl is set for analytics services
            if (!window.OsliraApp.config.workerUrl) {
                window.OsliraApp.config.workerUrl = window.CONFIG.WORKER_URL || 
                                                   window.CONFIG.workerUrl || 
                                                   'https://oslira-worker.oslira-worker.workers.dev';
            }

            console.log('✅ Configuration loaded from window.CONFIG', {
                workerUrl: window.OsliraApp.config.workerUrl,
                hasSupabase: !!window.OsliraApp.config.supabaseUrl
            });
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
        console.log('🔧 Initializing Supabase...');
        
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase library not loaded. Include the Supabase CDN script.');
        }
        
        const config = window.OsliraApp.config;
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error('Supabase configuration missing. Check your environment variables.');
        }
        
        window.OsliraApp.supabase = supabase.createClient(
            config.supabaseUrl,
            config.supabaseAnonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        );
        
        console.log('✅ Supabase initialized successfully');
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
    try {
        console.log('🔐 Checking authentication with enhanced session restoration...');
        
        const supabase = window.OsliraApp.supabase;
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        // ✅ STEP 1: Get current session (this will restore from localStorage automatically)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Session retrieval error:', error);
            throw error;
        }

        // ✅ STEP 2: If no session, check if we're on a protected page
        if (!session) {
            console.log('❌ No active session found');
            return null;
        }

        console.log('🔍 Session found, validating...', {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: new Date(session.expires_at * 1000).toISOString()
        });

        // ✅ STEP 3: Check if session is close to expiring (refresh if needed)
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at;
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry < 300) { // Refresh if expires in less than 5 minutes
            console.log('🔄 Session close to expiry, refreshing...');
            
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
                console.error('❌ Session refresh failed:', refreshError);
                throw refreshError;
            }
            
            if (refreshedSession) {
                console.log('✅ Session refreshed successfully');
                window.OsliraApp.session = refreshedSession;
                window.OsliraApp.user = refreshedSession.user;
            }
        } else {
            // ✅ STEP 4: Session is valid, store in global state
            window.OsliraApp.session = session;
            window.OsliraApp.user = session.user;
        }
        
        // ✅ STEP 5: Verify user email is confirmed
        if (!session.user.email_confirmed_at) {
            console.warn('⚠️ Email not confirmed');
            // Don't throw error, just warn - some users might not have confirmed email yet
        }
        
        // ✅ STEP 6: Setup auth state listener for future changes
        setupAuthListener();
        
        console.log('✅ Authentication check completed successfully');
        console.log(`👤 User: ${session.user.email} (${session.user.id})`);
        
        return session.user;
        
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        
        // ✅ Clear any stale session data
        window.OsliraApp.session = null;
        window.OsliraApp.user = null;
        
        // Only redirect to login if we're on a protected page
        const currentPage = getCurrentPageName();
        const protectedPages = ['dashboard', 'leads', 'analytics', 'subscription', 'settings', 'admin', 'campaigns'];
        
        if (protectedPages.includes(currentPage)) {
            redirectToLogin();
        }
        
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
    
    // Remove any existing listeners first
    if (window.OsliraApp.authListener) {
        window.OsliraApp.authListener.subscription.unsubscribe();
    }
    
    window.OsliraApp.authListener = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔐 Auth state changed: ${event}`, {
            hasSession: !!session,
            userId: session?.user?.id,
            timestamp: new Date().toISOString()
        });
        
        switch (event) {
            case 'SIGNED_OUT':
                console.log('👋 User signed out');
                window.OsliraApp.user = null;
                window.OsliraApp.session = null;
                window.OsliraApp.business = null;
                window.OsliraApp.businesses = [];
                
                // Clear any cached data
                if (window.OsliraApp.cache) {
                    window.OsliraApp.cache.leads = [];
                    window.OsliraApp.cache.stats = null;
                }
                
                redirectToLogin();
                break;
                
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
                console.log(`✅ Session ${event.toLowerCase()}`);
                
                // ✅ Always sync session on auth events
                window.OsliraApp.session = session;
                window.OsliraApp.user = session?.user || null;
                
                // Emit auth event for pages to listen to
                window.OsliraApp.events?.dispatchEvent(new CustomEvent('userAuthenticated', {
                    detail: { 
                        user: session?.user,
                        event: event
                    }
                }));
                
                // ✅ Reload user context after sign in
                if (event === 'SIGNED_IN') {
                    try {
                        await loadBusinesses();
                        console.log('🏢 Business context reloaded after sign in');
                    } catch (error) {
                        console.warn('⚠️ Failed to reload business context:', error);
                    }
                }
                break;
                
            case 'PASSWORD_RECOVERY':
                console.log('🔑 Password recovery event');
                break;
                
            case 'USER_UPDATED':
                console.log('👤 User updated');
                if (session?.user) {
                    window.OsliraApp.user = session.user;
                }
                break;
                
            default:
                console.log(`🔄 Unhandled auth event: ${event}`);
        }
    });
}

    async function refreshSessionSync() {
    try {
        const supabase = window.OsliraApp.supabase;
        if (!supabase) return false;
        
        console.log('🔄 Manually refreshing session...');
        
        const { data: { session }, error } = await supabase.auth.refreshSession();
        
        if (error || !session) {
            console.log('⚠️ Session refresh failed:', error?.message);
            return false;
        }
        
        window.OsliraApp.session = session;
        window.OsliraApp.user = session.user;
        
        console.log('✅ Session manually refreshed and synced');
        return true;
        
    } catch (error) {
        console.error('❌ Session refresh failed:', error);
        return false;
    }
}

// ✅ NEW: Wait for authentication to be ready
async function waitForAuth(timeoutMs = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
        if (window.OsliraApp?.user && window.OsliraApp?.session) {
            return true;
        }
        
        // Check if we have a valid session but user isn't set
        const supabase = window.OsliraApp?.supabase;
        if (supabase) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    window.OsliraApp.session = session;
                    window.OsliraApp.user = session.user;
                    return true;
                }
            } catch (error) {
                console.warn('⚠️ Session check during wait failed:', error);
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
}

function redirectToLogin() {
    const protectedPages = ['dashboard', 'leads', 'analytics', 'subscription', 'settings', 'admin', 'campaigns'];
    const currentPage = getCurrentPageName();
    
    if (protectedPages.includes(currentPage)) {
        window.location.href = '/auth.html';
    }
}

// =============================================================================
// 5. TIMEZONE DETECTION
// =============================================================================

function initializeTimezone() {
    try {
        let timezone = localStorage.getItem('userTimezone');
        
        if (!timezone) {
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            localStorage.setItem('userTimezone', timezone);
        }
        
        window.OsliraApp.timezone = timezone;
        console.log('🌍 Timezone detected:', timezone);
        
        return timezone;
    } catch (error) {
        console.warn('⚠️ Timezone detection failed:', error);
        const fallback = 'UTC';
        localStorage.setItem('userTimezone', fallback);
        window.OsliraApp.timezone = fallback;
        return fallback;
    }
}

function getUserTimezone() {
    return window.OsliraApp.timezone || initializeTimezone();
}

function formatDateInUserTimezone(dateString, options = {}) {
    try {
        const timezone = getUserTimezone();
        const date = new Date(dateString);
        
        const defaultOptions = {
            timeZone: timezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
    } catch (error) {
        console.warn('Date formatting failed:', error);
        return new Date(dateString).toLocaleDateString();
    }
}

// =============================================================================
// 6. BUSINESS CONTEXT MANAGEMENT
// =============================================================================

async function loadBusinesses() {
    try {
        console.log('🏢 Loading businesses...');
        
        const supabase = window.OsliraApp.supabase;
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }
        
        const { data: businesses, error } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', window.OsliraApp.user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        window.OsliraApp.businesses = businesses || [];
        
        // Set default business if none selected
        const savedBusinessId = localStorage.getItem('selectedBusinessId');
        if (savedBusinessId && businesses.find(b => b.id === savedBusinessId)) {
            window.OsliraApp.business = businesses.find(b => b.id === savedBusinessId);
        } else if (businesses.length > 0) {
            window.OsliraApp.business = businesses[0];
            localStorage.setItem('selectedBusinessId', businesses[0].id);
        }
        
        console.log(`✅ Loaded ${businesses.length} businesses`);
        return businesses;
        
    } catch (error) {
        console.error('❌ Failed to load businesses:', error);
        return [];
    }
}

function setActiveBusiness(businessId) {
    const business = window.OsliraApp.businesses.find(b => b.id === businessId);
    if (business) {
        window.OsliraApp.business = business;
        localStorage.setItem('selectedBusinessId', businessId);
        
        // Emit business change event
        window.OsliraApp.events.dispatchEvent(new CustomEvent('businessChanged', {
            detail: { business }
        }));
        
        console.log('🏢 Active business changed:', business.business_name);
    }
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
    
    const requestOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    // Get worker URL from environment configuration
    let workerUrl;
    try {
        const envConfig = window.getEnvConfig ? window.getEnvConfig() : null;
        workerUrl = envConfig ? envConfig.WORKER_URL : config.workerUrl;
    } catch (error) {
        // Fallback to legacy config
        workerUrl = config.workerUrl;
    }
    
    // Fallback URL if still not found
    if (!workerUrl) {
        workerUrl = 'https://ai-outreach-api.hamzawilliamsbusiness.workers.dev';
        console.warn('⚠️ No worker URL found, using fallback:', workerUrl);
    }
    
    // Build URL based on endpoint
    let url;
    if (endpoint.startsWith('http')) {
        url = endpoint;
    } else if (endpoint.startsWith('/v1/')) {
        url = `${workerUrl}${endpoint}`;
    } else if (endpoint.startsWith('/analyze') || endpoint.startsWith('/bulk-analyze')) {
        // Convert legacy endpoints to v1 format
        url = `${workerUrl}/v1${endpoint}`;
    } else {
        url = `${workerUrl}${endpoint}`;
    }
    
    try {
        console.log(`🌐 API Request: ${requestOptions.method || 'GET'} ${url}`);
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error: ${response.status}`, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ API Response:', data);
        return data;
        
    } catch (error) {
        console.error('❌ API Request failed:', error);
        throw error;
    }
}
// =============================================================================
// 8. UI UTILITY FUNCTIONS
// =============================================================================

function showMessage(message, type = 'info', duration = 5000) {
    // Create message container if it doesn't exist
    let container = document.getElementById('message-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'message-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.style.cssText = `
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
        font-size: 14px;
        line-height: 1.4;
    `;
    
    messageEl.textContent = message;
    
    // Add click to dismiss
    messageEl.addEventListener('click', () => {
        messageEl.remove();
    });
    
    container.appendChild(messageEl);
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => messageEl.remove(), 300);
            }
        }, duration);
    }
    
    // Add CSS animations if not already added
    if (!document.getElementById('message-animations')) {
        const style = document.createElement('style');
        style.id = 'message-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function showLoadingOverlay(message = 'Loading...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(2px);
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                <div style="color: #374151; font-weight: 500;">${message}</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add spin animation
        if (!document.getElementById('loading-animations')) {
            const style = document.createElement('style');
            style.id = 'loading-animations';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    overlay.style.display = 'flex';
}

function removeLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

async function logout() {
    try {
        console.log('🚪 Logging out...');
        
        const supabase = window.OsliraApp.supabase;
        if (supabase) {
            await supabase.auth.signOut();
        }
        
        // Clear local storage
        localStorage.removeItem('selectedBusinessId');
        localStorage.removeItem('userTimezone');
        
        // Clear app state
        window.OsliraApp.user = null;
        window.OsliraApp.session = null;
        window.OsliraApp.business = null;
        window.OsliraApp.businesses = [];
        
        console.log('✅ Logout successful');
        window.location.href = '/auth.html';
        
    } catch (error) {
        console.error('❌ Logout failed:', error);
        // Force redirect anyway
        window.location.href = '/auth.html';
    }
}

// =============================================================================
// 9. MODAL MANAGEMENT
// =============================================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        window.OsliraApp.modals.add(modalId);
        
        // Add click outside to close
        modal.addEventListener('click', function closeOnOutsideClick(e) {
            if (e.target === modal) {
                closeModal(modalId);
                modal.removeEventListener('click', closeOnOutsideClick);
            }
        });
        
        // Add escape key to close
        document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
                closeModal(modalId);
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        window.OsliraApp.modals.delete(modalId);
        
        // Restore body scroll if no modals are open
        if (window.OsliraApp.modals.size === 0) {
            document.body.style.overflow = '';
        }
    }
}

function closeAllModals() {
    window.OsliraApp.modals.forEach(modalId => {
        closeModal(modalId);
    });
}

// =============================================================================
// 10. UTILITY FUNCTIONS
// =============================================================================

function getCurrentPageName() {
    const pathname = window.location.pathname;
    
    // Handle directory-style paths like /analytics/
    if (pathname.startsWith('/analytics')) {
        return 'analytics';
    }
    
    if (pathname.startsWith('/auth')) {
        return 'auth';
    }
    
    if (pathname.startsWith('/dashboard')) {
        return 'dashboard';
    }
    
    if (pathname.startsWith('/leads')) {
        return 'leads';
    }
    
    if (pathname.startsWith('/subscription')) {
        return 'subscription';
    }
    
    if (pathname.startsWith('/settings')) {
        return 'settings';
    }
    
    if (pathname.startsWith('/admin')) {
        return 'admin';
    }
    
    if (pathname.startsWith('/campaigns')) {
        return 'campaigns';
    }
    
    if (pathname.startsWith('/onboarding')) {
        return 'onboarding';
    }
    
    if (pathname.startsWith('/home')) {
        return 'home';
    }
    
    // Handle file-based paths like /analytics.html
    const filename = pathname.split('/').pop();
    if (filename && filename.includes('.')) {
        return filename.split('.')[0];
    }
    
    // Handle root paths
    if (pathname === '/' || pathname === '') {
        return 'index';
    }
    
    // Extract page name from path segments
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
        return segments[0];
    }
    
    return 'index';
}

function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

function formatNumber(number, options = {}) {
    if (typeof number !== 'number') return number;
    
    const defaults = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    };
    
    return new Intl.NumberFormat('en-US', { ...defaults, ...options }).format(number);
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        return navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return Promise.resolve();
    }
}

function safeObjectKeys(obj) {
    return obj && typeof obj === 'object' && obj !== null ? Object.keys(obj) : [];
}

function safeJsonParse(str, fallback = {}) {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.warn('JSON parse failed:', error);
        return fallback;
    }
}

function truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function unescapeHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return new Date(date).toLocaleDateString();
}

function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function scrollToElement(element, options = {}) {
    const defaultOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
    };
    
    element.scrollIntoView({ ...defaultOptions, ...options });
}

// =============================================================================
// 11. MAIN PAGE INITIALIZER CLASS
// =============================================================================

class OsliraPageInitializer {
    constructor() {
        this.initializationPromise = null;
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    async performInitialization() {
        try {
            console.log('🚀 [Initializer] Starting app initialization...');
            showLoadingOverlay('Initializing application...');

            // Core initialization steps
            await this.initConfig();
            await this.initSupabase();
            await this.initTimezone();
            await this.initAuth();
            await this.initBusinessContext();
            await this.initUI();

            console.log('✅ [Initializer] App initialization completed successfully');
            removeLoadingOverlay();

        } catch (error) {
            console.error('❌ [Initializer] Initialization failed:', error);
            showMessage(`Initialization failed: ${error.message}`, 'error');
            removeLoadingOverlay();
            throw error;
        }
    }

    async initConfig() {
        await loadAppConfig();
    }

    async initSupabase() {
        await initializeSupabase();
    }

    async initAuth() {
        const currentPage = getCurrentPageName();
        const publicPages = ['auth', 'index', 'landing', 'home'];
        
        if (publicPages.includes(currentPage)) {
            console.log('📖 [Initializer] Public page - skipping auth');
            return;
        }

        const user = await checkAuthentication();
        if (!user) {
            throw new Error('Authentication required');
        }
    }

    async initTimezone() {
        initializeTimezone();
    }

    async initBusinessContext() {
        if (window.OsliraApp.user) {
            await loadBusinesses();
        }
    }

    async initUI() {
        this.setupGlobalUIHandlers();
        this.populateUIElements();
    }

    setupGlobalUIHandlers() {
        // Logout links
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="logout"]')) {
                e.preventDefault();
                logout();
            }
        });

        // Business selector
        const businessSelect = document.getElementById('business-select');
        if (businessSelect) {
            businessSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    setActiveBusiness(e.target.value);
                }
            });
        }

        // Modal handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-modal-open]')) {
                e.preventDefault();
                const modalId = e.target.getAttribute('data-modal-open');
                openModal(modalId);
            }
            
            if (e.target.matches('[data-modal-close]')) {
                e.preventDefault();
                const modalId = e.target.getAttribute('data-modal-close');
                closeModal(modalId);
            }
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
    }

    populateUIElements() {
        // Populate business selector
        this.populateBusinessSelector();
        
        // Update user info
        this.updateUserInfo();
        
        // Update subscription info
        this.updateSubscriptionInfo();
    }

    populateBusinessSelector() {
        const selectors = document.querySelectorAll('#business-select, #business-filter');
        
        selectors.forEach(select => {
            // Clear existing options except the first one
            const firstOption = select.firstElementChild;
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);
            
            // Add business options
            window.OsliraApp.businesses.forEach(business => {
                const option = document.createElement('option');
                option.value = business.id;
                option.textContent = business.business_name;
                option.selected = window.OsliraApp.business?.id === business.id;
                select.appendChild(option);
            });
        });
    }

    updateUserInfo() {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement && window.OsliraApp.user) {
            userEmailElement.textContent = window.OsliraApp.user.email;
        }
    }

    updateSubscriptionInfo() {
        // Update plan info
        const planElement = document.getElementById('sidebar-plan');
        if (planElement) {
            planElement.textContent = 'Pro Plan'; // Default for now
        }

        // Update billing info
        const billingElement = document.getElementById('sidebar-billing');
        if (billingElement) {
            billingElement.textContent = 'Active'; // Default for now
        }
    }
}

// =============================================================================
// 12. GLOBAL EXPORTS
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
window.OsliraApp.setActiveBusiness = setActiveBusiness;
window.OsliraApp.formatNumber = formatNumber;
window.OsliraApp.copyToClipboard = copyToClipboard;
window.OsliraApp.debounce = debounce;
window.OsliraApp.generateId = generateId;
window.OsliraApp.sanitizeHTML = sanitizeHTML;
window.OsliraApp.safeObjectKeys = safeObjectKeys;
window.OsliraApp.safeJsonParse = safeJsonParse;
window.OsliraApp.truncateText = truncateText;
window.OsliraApp.escapeHtml = escapeHtml;
window.OsliraApp.unescapeHtml = unescapeHtml;
window.OsliraApp.validateEmail = validateEmail;
window.OsliraApp.validateUrl = validateUrl;
window.OsliraApp.formatCurrency = formatCurrency;
window.OsliraApp.formatBytes = formatBytes;
window.OsliraApp.getRelativeTime = getRelativeTime;
window.OsliraApp.isElementInViewport = isElementInViewport;
window.OsliraApp.scrollToElement = scrollToElement;
window.OsliraApp.openModal = openModal;
window.OsliraApp.closeModal = closeModal;
window.OsliraApp.closeAllModals = closeAllModals;
window.OsliraApp.loadBusinesses = loadBusinesses;
window.OsliraApp.getCurrentPageName = getCurrentPageName;

// Additional helper functions for text handling
window.OsliraApp.copyText = function(text) {
    copyToClipboard(text).then(() => {
        showMessage('Copied to clipboard!', 'success', 2000);
    }).catch(() => {
        showMessage('Failed to copy to clipboard', 'error', 3000);
    });
};

window.OsliraApp.downloadAsFile = function(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

window.OsliraApp.parseCSV = function(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    
    return data;
};

window.OsliraApp.formatCsvData = function(data) {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
    ].join('\n');
    
    return csvContent;
};

window.OsliraApp.validateInstagramUsername = function(username) {
    if (!username) return false;
    const cleaned = username.replace('@', '').trim();
    const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
    return usernameRegex.test(cleaned) && 
           !cleaned.includes('..') && 
           !cleaned.startsWith('.') && 
           !cleaned.endsWith('.');
};

window.OsliraApp.extractInstagramUsername = function(input) {
    if (!input) return '';
    
    const cleaned = input.trim().replace(/^@/, '').toLowerCase();
    
    // Handle Instagram URLs
    if (cleaned.includes('instagram.com')) {
        try {
            const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
            const pathSegments = url.pathname.split('/').filter(Boolean);
            return pathSegments[0] || '';
        } catch {
            return '';
        }
    }
    
    // Handle plain usernames
    return cleaned.replace(/[^a-z0-9._]/g, '');
};

window.OsliraApp.formatScore = function(score) {
    if (typeof score !== 'number') return '0';
    return Math.round(score).toString();
};

window.OsliraApp.getScoreColor = function(score) {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#3b82f6'; // Blue
    if (score >= 40) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
};

window.OsliraApp.getScoreClass = function(score) {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
};

window.OsliraApp.formatFollowerCount = function(count) {
    if (typeof count !== 'number') return '0';
    
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
};

window.OsliraApp.capitalizeFirst = function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

window.OsliraApp.slugify = function(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

window.OsliraApp.randomId = function() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

window.OsliraApp.sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

window.OsliraApp.retry = async function(fn, maxAttempts = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts) {
                break;
            }
            
            console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
            await window.OsliraApp.sleep(delay);
            delay *= 2; // Exponential backoff
        }
    }
    
    throw lastError;
};

window.OsliraApp.isOnline = function() {
    return navigator.onLine;
};

window.OsliraApp.waitForOnline = function() {
    return new Promise(resolve => {
        if (navigator.onLine) {
            resolve();
        } else {
            const handler = () => {
                window.removeEventListener('online', handler);
                resolve();
            };
            window.addEventListener('online', handler);
        }
    });
};

window.OsliraApp.getDeviceInfo = function() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenWidth: screen.width,
        screenHeight: screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        timezone: getUserTimezone()
    };
};

window.OsliraApp.isMobileDevice = function() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

window.OsliraApp.isTabletDevice = function() {
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
};

window.OsliraApp.isDesktopDevice = function() {
    return !window.OsliraApp.isMobileDevice() && !window.OsliraApp.isTabletDevice();
};

window.OsliraApp.getOS = function() {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    
    return 'Unknown';
};

window.OsliraApp.getBrowser = function() {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
};

// =============================================================================
// 13. PERFORMANCE MONITORING
// =============================================================================

window.OsliraApp.performance = {
    marks: new Map(),
    measures: new Map(),
    
    mark: function(name) {
        const timestamp = performance.now();
        this.marks.set(name, timestamp);
        console.log(`🔍 Performance mark: ${name} at ${timestamp.toFixed(2)}ms`);
    },
    
    measure: function(name, startMark, endMark) {
        const startTime = this.marks.get(startMark);
        const endTime = endMark ? this.marks.get(endMark) : performance.now();
        
        if (startTime === undefined) {
            console.warn(`Start mark "${startMark}" not found`);
            return;
        }
        
        const duration = endTime - startTime;
        this.measures.set(name, duration);
        console.log(`⏱️ Performance measure: ${name} took ${duration.toFixed(2)}ms`);
        return duration;
    },
    
    getReport: function() {
        return {
            marks: Object.fromEntries(this.marks),
            measures: Object.fromEntries(this.measures),
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null,
            navigation: performance.getEntriesByType('navigation')[0],
            timing: performance.timing
        };
    }
};

// =============================================================================
// 14. ERROR HANDLING & LOGGING
// =============================================================================

window.OsliraApp.errorHandler = {
    errors: [],
    maxErrors: 50,
    
    logError: function(error, context = {}) {
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            context: context,
            user: window.OsliraApp.user?.id || 'anonymous'
        };
        
        this.errors.push(errorInfo);
        
        // Keep only recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }
        
        console.error('🚨 Error logged:', errorInfo);
        
        // Send to error reporting service in production
        if (window.location.hostname !== 'localhost') {
            this.reportError(errorInfo);
        }
    },
    
    reportError: function(errorInfo) {
        // This would integrate with your error reporting service
        // For now, just log to console
        console.log('📊 Would report error to service:', errorInfo);
    },
    
    getErrorReport: function() {
        return {
            errorCount: this.errors.length,
            recentErrors: this.errors.slice(-10),
            errorsByType: this.errors.reduce((acc, error) => {
                const type = error.message.split(':')[0] || 'Unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {})
        };
    }
};

// Global error handler
window.addEventListener('error', (event) => {
    window.OsliraApp.errorHandler.logError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    window.OsliraApp.errorHandler.logError(new Error(event.reason), {
        type: 'unhandledRejection'
    });
});

// =============================================================================
// 15. AUTO-INITIALIZATION WITH ERROR HANDLING
// =============================================================================

// Auto-initialize when DOM is ready with comprehensive error handling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            window.OsliraApp.performance.mark('initialization-start');
            await window.OsliraApp.initialize();
            window.OsliraApp.performance.mark('initialization-end');
            window.OsliraApp.performance.measure('total-initialization', 'initialization-start', 'initialization-end');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            window.OsliraApp.errorHandler.logError(error, { phase: 'initialization' });
            
            // Show user-friendly error message
            if (typeof showMessage === 'function') {
                showMessage('App failed to load. Please refresh the page.', 'error', 10000);
            } else {
                // Fallback error display
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #ef4444;
                    color: white;
                    padding: 16px;
                    border-radius: 8px;
                    z-index: 10000;
                    max-width: 400px;
                `;
                errorDiv.textContent = 'App failed to load. Please refresh the page.';
                document.body.appendChild(errorDiv);
            }
        }
    });
} else {
    // DOM already ready
    setTimeout(async () => {
        try {
            window.OsliraApp.performance.mark('initialization-start');
            await window.OsliraApp.initialize();
            window.OsliraApp.performance.mark('initialization-end');
            window.OsliraApp.performance.measure('total-initialization', 'initialization-start', 'initialization-end');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            window.OsliraApp.errorHandler.logError(error, { phase: 'initialization' });
            
            if (typeof showMessage === 'function') {
                showMessage('App failed to load. Please refresh the page.', 'error', 10000);
            }
        }
    }, 100); // Small delay to ensure all scripts load
}

// =============================================================================
// 16. DEBUG UTILITIES (Development only)
// =============================================================================

if (window.location.hostname === 'localhost' || window.location.hostname.includes('netlify')) {
    window.OsliraApp.debug = {
        logState: function() {
            console.group('🔍 Oslira App State');
            console.log('Config:', window.OsliraApp.config);
            console.log('User:', window.OsliraApp.user);
            console.log('Session:', window.OsliraApp.session);
            console.log('Business:', window.OsliraApp.business);
            console.log('Businesses:', window.OsliraApp.businesses);
            console.log('Features:', window.OsliraApp.features);
            console.log('Cache:', window.OsliraApp.cache);
            console.groupEnd();
        },
        
        logPerformance: function() {
            console.group('⏱️ Performance Report');
            console.log(window.OsliraApp.performance.getReport());
            console.groupEnd();
        },
        
        logErrors: function() {
            console.group('🚨 Error Report');
            console.log(window.OsliraApp.errorHandler.getErrorReport());
            console.groupEnd();
        },
        
        clearCache: function() {
            window.OsliraApp.cache = {
                leads: [],
                stats: null,
                lastRefresh: null
            };
            localStorage.removeItem('selectedBusinessId');
            console.log('🧹 Cache cleared');
        },
        
        simulateError: function() {
            throw new Error('Simulated error for testing');
        },
        
        testApi: async function() {
            try {
                const response = await window.OsliraApp.apiRequest('/health');
                console.log('✅ API test successful:', response);
            } catch (error) {
                console.error('❌ API test failed:', error);
            }
        }
    };
    
    console.log('🛠️ Debug utilities available at window.OsliraApp.debug');
}

console.log('📦 Oslira shared core loaded successfully');
console.log('🚀 Available at window.OsliraApp');
console.log('📊 App will initialize automatically when DOM is ready');

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.OsliraApp;
}
    
