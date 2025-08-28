// =============================================================================
// APP.JS - Unified Application Initializer 
// =============================================================================

class OsliraAppInitializer {
    static instance = null;
    
    constructor() {
        this.config = {};
        this.supabase = null;
        this.user = null;
        this.session = null;
        this.business = null;
        this.businesses = [];
        this.initializationPromise = null;
        
        // Feature flags
        this.features = {
            bulkUpload: true,
            analytics: true,
            campaigns: false,
            integrations: false
        };
        
        // UI state
        this.modals = new Set();
        this.loading = false;
        
        // Cache
        this.cache = {
            leads: [],
            stats: null,
            lastRefresh: null
        };
        
        // Event system
        this.events = new EventTarget();
        
        // Performance tracking
        this.performance = {
            marks: new Map(),
            measures: new Map(),
            mark: (name) => {
                this.performance.marks.set(name, performance.now());
                performance.mark(name);
            },
            measure: (name, startMark, endMark) => {
                const startTime = this.performance.marks.get(startMark);
                const endTime = this.performance.marks.get(endMark);
                const duration = endTime - startTime;
                this.performance.measures.set(name, duration);
                performance.measure(name, startMark, endMark);
                return duration;
            },
            getReport: () => {
                const report = {};
                for (const [name, duration] of this.performance.measures) {
                    report[name] = `${duration.toFixed(2)}ms`;
                }
                return report;
            }
        };
        
        // Error handling
        this.errorHandler = {
            errors: [],
            logError: (error, context = {}) => {
                const errorEntry = {
                    message: error.message,
                    stack: error.stack,
                    context,
                    timestamp: new Date().toISOString()
                };
                this.errorHandler.errors.push(errorEntry);
                console.error('🚨 [App] Error logged:', errorEntry);
            },
            getErrorReport: () => this.errorHandler.errors
        };
    }
    
    // =============================================================================
    // SINGLETON INITIALIZATION - FIXED STATIC METHODS
    // =============================================================================
    
    static async initialize() {
        if (this.instance) {
            return this.instance.initializationPromise;
        }
        
        this.instance = new OsliraAppInitializer();
        this.instance.initializationPromise = this.instance.performInitialization();
        return this.instance.initializationPromise;
    }
    
    static getInstance() {
        return this.instance;
    }
    
    // =============================================================================
    // CORE INITIALIZATION SEQUENCE
    // =============================================================================
    
    async performInitialization() {
        try {
            console.log('🚀 [App] Starting Oslira application initialization...');
            this.performance.mark('initialization-start');
            
            this.showLoadingOverlay('Initializing application...');
            
            // Core initialization steps
            await this.initConfig();
            await this.initSupabase();
            await this.initTimezone();
            await this.initAuth();
            await this.initBusinessContext();
            await this.initUI();
            await this.setupGlobalErrorHandling();
            await this.setupKeyboardShortcuts();
            await this.setupPageSpecificFeatures();
            await this.attachToWindow();
            
            this.performance.mark('initialization-end');
            const duration = this.performance.measure('total-initialization', 'initialization-start', 'initialization-end');
            
            console.log(`✅ [App] Application initialized successfully in ${duration.toFixed(2)}ms`);
            this.removeLoadingOverlay();
            
            // Emit ready event
            window.dispatchEvent(new CustomEvent('oslira:ready', {
                detail: {
                    app: this,
                    initTime: duration,
                    config: this.config,
                    user: this.auth?.user
                }
            }));
            
            return this;
            
        } catch (error) {
            console.error('❌ [App] Initialization failed:', error);
            this.showError('Application initialization failed. Please refresh the page.');
            throw error;
        }
    }
    
    async initConfig() {
        try {
            // Wait for config manager
            let attempts = 0;
            const maxAttempts = 50;
            
            while (!window.OsliraConfig && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.OsliraConfig) {
                throw new Error('OsliraConfig not available');
            }
            
            this.config = await window.OsliraConfig.load();
            console.log('✅ [App] Configuration loaded');
            
        } catch (error) {
            console.error('❌ [App] Config initialization failed:', error);
            throw error;
        }
    }
    
    async initSupabase() {
        try {
            // Wait for Supabase library
            let attempts = 0;
            const maxAttempts = 100;
            
            while (!window.supabase && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.supabase) {
                throw new Error('Supabase library not available');
            }
            
           // Get supabase config with multiple fallback patterns
const supabaseUrl = this.config.supabaseUrl || this.config.SUPABASE_URL || window.CONFIG?.SUPABASE_URL;
const supabaseKey = this.config.supabaseKey || this.config.supabaseAnonKey || this.config.SUPABASE_ANON_KEY || window.CONFIG?.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ [App] Missing Supabase config:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey,
        configKeys: Object.keys(this.config),
        windowConfig: !!window.CONFIG 
    });
    throw new Error('Supabase configuration missing');
}
            
            // Make globally available (preserve library)
window.supabaseClient = this.supabase;
// Keep library available for other components
if (!window.supabase.createClient) {
    window.supabase = this.supabase;
}

console.log('✅ [App] Supabase initialized');
            
        } catch (error) {
            console.error('❌ [App] Supabase initialization failed:', error);
            throw error;
        }
    }
    
    async initTimezone() {
        try {
            this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            console.log('🌍 [App] Timezone detected:', this.userTimezone);
        } catch (error) {
            this.userTimezone = 'UTC';
            console.warn('⚠️ [App] Timezone detection failed, using UTC');
        }
    }
    
    async initAuth() {
        console.log('🔐 [App] Initializing authentication system...');
        
        // Wait for auth manager to be available
        const maxAttempts = 50;
        let attempts = 0;
        
        while (!window.OsliraAuth && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.OsliraAuth) {
            throw new Error('OsliraAuth not available after timeout');
        }
        
        // Initialize the auth manager - use static initialize method, not instance method
this.auth = await window.OsliraAuth.initialize(this.config);
        
        // Also attach to window.OsliraApp for compatibility
        if (window.OsliraApp) {
            window.OsliraApp.auth = this.auth;
        }
        
        console.log('✅ [App] Authentication system initialized');
    }
    
    async initBusinessContext() {
        if (!this.user) return;
        
        try {
            console.log('🏢 [App] Loading business context...');
            await this.loadBusinesses();
            await this.loadDefaultBusiness();
            console.log('✅ [App] Business context loaded');
        } catch (error) {
            console.error('❌ [App] Business context failed:', error);
            // Non-critical, continue initialization
        }
    }
    
    async initUI() {
        try {
            // Wait for UI manager
            let attempts = 0;
            const maxAttempts = 50;
            
            while (!window.OsliraUI && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.OsliraUI) {
                this.ui = new window.OsliraUI();
                console.log('✅ [App] UI manager initialized');
            } else {
                console.warn('⚠️ [App] UI manager not available, skipping');
            }
            
        } catch (error) {
            console.error('❌ [App] UI initialization failed:', error);
            // Non-critical, continue
        }
    }
    
    async setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.errorHandler.logError(event.error, {
                type: 'javascript',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.errorHandler.logError(event.reason, {
                type: 'promise',
                promise: event.promise
            });
        });
    }
    
    async setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Global keyboard shortcuts
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case '/':
                        event.preventDefault();
                        // Focus search if available
                        const searchInput = document.querySelector('#search, [data-search]');
                        if (searchInput) searchInput.focus();
                        break;
                }
            }
        });
    }
    
    async setupPageSpecificFeatures() {
        // Initialize page-specific components based on current page
        const currentPage = this.detectCurrentPage();
        
        switch (currentPage) {
            case 'dashboard':
                await this.initDashboardFeatures();
                break;
            case 'auth':
                await this.initAuthPageFeatures();
                break;
            // Add other pages as needed
        }
    }
    
    async initAuthPageFeatures() {
        // Auth page specific setup
        console.log('🔐 [App] Setting up auth page features...');
        
        // Setup form handling if form exists
        const authForm = document.getElementById('auth-form');
        if (authForm && window.OsliraFormManager) {
            this.authFormManager = new window.OsliraFormManager(authForm, {
                apiEndpoint: '/auth/magic-link',
                onSuccess: (data) => {
                    this.showMessage('Check your email for the sign-in link!', 'success');
                },
                onError: (error) => {
                    this.showError(error.message || 'Authentication failed');
                }
            });
        }
    }
    
    async initDashboardFeatures() {
        console.log('📊 [App] Setting up dashboard features...');
        // Dashboard-specific initialization would go here
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    showLoadingOverlay(message = 'Loading...') {
        if (document.getElementById('loading-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(255,255,255,0.95); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                <p style="margin: 0; color: #6b7280;">${message}</p>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(overlay);
    }
    
    removeLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.remove();
    }
    
    showMessage(message, type = 'info') {
        console.log(`📢 [App] ${type.toUpperCase()}: ${message}`);
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            padding: 12px 16px; border-radius: 6px; color: white;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px; max-width: 300px;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => messageDiv.remove(), 5000);
    }
    
    showError(message) {
        this.showMessage(message, 'error');
        
        const errorDisplay = document.getElementById('error-display');
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
            errorDisplay.classList.add('show');
        }
    }
    
    clearError() {
        const errorDisplay = document.getElementById('error-display');
        if (errorDisplay) {
            errorDisplay.classList.remove('show');
            errorDisplay.style.display = 'none';
            errorDisplay.textContent = '';
        }
    }
    
    // =============================================================================
    // GLOBAL ATTACHMENT
    // =============================================================================
    
    attachToWindow() {
        // Attach instance to window for global access
        window.OsliraApp = this;
        
        // Provide commonly used methods directly
        window.OsliraApp.showMessage = this.showMessage.bind(this);
        window.OsliraApp.showError = this.showError.bind(this);
        window.OsliraApp.clearError = this.clearError.bind(this);
        
        // Auth property for compatibility
        if (this.auth) {
            window.OsliraApp.auth = this.auth;
        }
        
        // Logout function
        window.OsliraApp.logout = async () => {
            try {
                await this.supabase.auth.signOut();
                localStorage.clear();
                window.location.href = '/auth.html';
            } catch (error) {
                console.error('Logout failed:', error);
                window.location.href = '/auth.html';
            }
        };
        
        console.log('🌐 [App] Global window attachment completed');
    }
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Export the class to window
window.OsliraAppInitializer = OsliraAppInitializer;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 [App] DOM ready, starting initialization...');
        try {
            await OsliraAppInitializer.initialize();
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    });
} else {
    // DOM already ready
    console.log('🚀 [App] DOM already ready, starting initialization...');
    setTimeout(async () => {
        try {
            await OsliraAppInitializer.initialize();
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    }, 100);
}

// Also trigger after script loading completes
window.addEventListener('oslira:scripts:loaded', async (event) => {
    console.log('🚀 [App] Scripts loaded event received, ensuring initialization...');
    if (!OsliraAppInitializer.getInstance()) {
        try {
            await OsliraAppInitializer.initialize();
        } catch (error) {
            console.error('❌ App initialization failed after scripts loaded:', error);
        }
    }
});

console.log('📦 Unified Oslira app initializer loaded');
console.log('🚀 Will initialize automatically when DOM is ready');
