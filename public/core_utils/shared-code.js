// ==========================================
// SHARED-CORE.JS - Universal app foundation
// Include this FIRST in every page: <script src="/core_utils/shared-code.js"></script>
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
        
        const config = window.OsliraApp.config;
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error('Supabase configuration missing');
        }
        
        const { createClient } = supabase;
        window.OsliraApp.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
        
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
    try {
        console.log('🔐 Checking authentication...');
        
        const supabase = window.OsliraApp.supabase;
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            throw error;
        }
        
        if (!session) {
            console.log('❌ No active session');
            redirectToLogin();
            return null;
        }
        
        window.OsliraApp.session = session;
        window.OsliraApp.user = session.user;
        
        console.log('✅ User authenticated');
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
    const protectedPages = ['dashboard', 'leads', 'analytics', 'subscription', 'settings', 'admin', 'campaigns'];
    const currentPage = getCurrentPageName();
    
    if (protectedPages.includes(currentPage)) {
        window.location.href = '/auth.html';
    }
}

// =============================================================================
// 5. TIMEZONE HANDLING
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

function formatDateInUserTimezone(dateInput, options = {}) {
    try {
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        const timezone = getUserTimezone();
        
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
        return dateInput?.toString() || 'Invalid Date';
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
            .from('businesses')
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
        
        console.log('🏢 Active business changed:', business.name);
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
    
    const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl || ''}${endpoint}`;
    
    try {
        console.log(`🌐 API Request: ${requestOptions.method || 'GET'} ${url}`);
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('❌ API Request failed:', error);
        throw error;
    }
}

// =============================================================================
// 8. UI HELPERS
// =============================================================================

function showMessage(message, type = 'info', duration = 5000) {
    const messageContainer = document.getElementById('message-container') || createMessageContainer();
    
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <span class="message-icon">${getMessageIcon(type)}</span>
            <span class="message-text">${message}</span>
            <button class="message-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    messageContainer.appendChild(messageElement);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (messageElement.parentElement) {
                messageElement.remove();
            }
        }, duration);
    }
    
    return messageElement;
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    document.body.appendChild(container);
    return container;
}

function getMessageIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

function showLoadingOverlay(message = 'Loading...') {
    let overlay = document.getElementById('loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.querySelector('.loading-message').textContent = message;
    overlay.style.display = 'flex';
    window.OsliraApp.loading = true;
}

function removeLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    window.OsliraApp.loading = false;
}

function updateLoadingMessage(message) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        const messageElement = overlay.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
}

// =============================================================================
// 9. UTILITY FUNCTIONS
// =============================================================================

function getCurrentPageName() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    return filename.replace('.html', '') || 'index';
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

// =============================================================================
// 10. LOGOUT FUNCTIONALITY
// =============================================================================

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
        showMessage('Logout failed. Please try again.', 'error');
    }
}

// =============================================================================
// 11. PAGE INITIALIZER CLASS
// =============================================================================

class OsliraPageInitializer {
    constructor() {
        this.initializationSteps = [
            { name: 'Configuration', fn: this.initConfig.bind(this) },
            { name: 'Supabase', fn: this.initSupabase.bind(this) },
            { name: 'Authentication', fn: this.initAuth.bind(this) },
            { name: 'Timezone', fn: this.initTimezone.bind(this) },
            { name: 'Business Context', fn: this.initBusinessContext.bind(this) },
            { name: 'UI Setup', fn: this.initUI.bind(this) }
        ];
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ [Initializer] Already initialized');
            return;
        }

        try {
            console.log('🚀 [Initializer] Starting Oslira page initialization...');
            showLoadingOverlay('Initializing Oslira...');

            for (const [index, step] of this.initializationSteps.entries()) {
                const progress = Math.round(((index + 1) / this.initializationSteps.length) * 100);
                updateLoadingMessage(`${step.name}... (${progress}%)`);
                
                console.log(`🔧 [Initializer] Step ${index + 1}: ${step.name}`);
                await step.fn();
                console.log(`✅ [Initializer] ${step.name} completed`);
            }

            this.isInitialized = true;
            console.log('🎯 [Initializer] Oslira initialization completed successfully');
            
            // Emit initialization complete event
            window.dispatchEvent(new CustomEvent('oslira:initialized', {
                detail: { timestamp: Date.now() }
            }));

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
        const publicPages = ['auth', 'index', 'landing'];
        
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
                option.textContent = business.name;
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

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.OsliraApp.initialize().catch(console.error);
    });
} else {
    // DOM already ready
    window.OsliraApp.initialize().catch(console.error);
}

console.log('📦 Oslira shared core loaded successfully');
