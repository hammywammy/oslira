// =============================================================================
// APP.JS - Master Application Initializer - FIXED VERSION
// =============================================================================

// ONLY declare OsliraApp once and ensure proper initialization order
if (!window.OsliraApp) {

class OsliraApp {
    static instance = null;
    
    static async init() {
        if (this.instance) return this.instance;
        
        console.log('🚀 [App] Starting Oslira application initialization...');
        
        try {
            this.instance = new OsliraApp();
            await this.instance.initialize();
            return this.instance;
        } catch (error) {
            console.error('❌ [App] Application initialization failed:', error);
            this.showInitializationError(error);
            throw error;
        }
    }
    
    constructor() {
        this.config = null;
        this.auth = null;
        this.api = null;
        this.ui = null;
        this.store = null;
        this.initialized = false;
        this.authFormManager = null; // Legacy form manager reference
    }
    
    async initialize() {
        if (this.initialized) return this;
        
        const startTime = performance.now();
        
        try {
            // Step 1: Load configuration (CRITICAL FIRST STEP)
            console.log('🔧 [App] Loading configuration...');
            this.config = await this.loadConfiguration();
            
            // Step 2: Wait for required libraries
            console.log('📚 [App] Waiting for required libraries...');
            await this.waitForLibraries();
            
            // Step 3: Initialize authentication system
            console.log('🔐 [App] Initializing authentication...');
            this.auth = await this.initializeAuth();
            
            // Step 4: Initialize API client
            console.log('🌐 [App] Initializing API client...');
            this.api = await this.initializeApiClient();
            
            // Step 5: Initialize UI manager
            console.log('🎨 [App] Initializing UI components...');
            this.ui = await this.initializeUI();
            
            // Step 6: Initialize data store
            console.log('💾 [App] Initializing data store...');
            this.store = await this.initializeDataStore();
            
            // Step 7: Set up page-specific features
            console.log('⚙️ [App] Setting up page-specific features...');
            await this.setupPageSpecificFeatures();
            
            // Step 8: Set up global event listeners
            console.log('🎧 [App] Setting up global event listeners...');
            await this.setupGlobalEventListeners();
            
            this.initialized = true;
            
            const endTime = performance.now();
            console.log(`✅ [App] Application initialized successfully in ${Math.round(endTime - startTime)}ms`);
            
            // Emit app ready event
            window.dispatchEvent(new CustomEvent('app:ready', { detail: this }));
            
            return this;
            
        } catch (error) {
            console.error('❌ [App] Application initialization failed:', error);
            this.showInitializationError(error);
            throw error;
        }
    }
    
    async loadConfiguration() {
        if (!window.OsliraConfig?.load) {
            throw new Error('OsliraConfig not available');
        }
        
        await window.OsliraConfig.load();
        return window.OsliraConfig.get();
    }
    
    async waitForLibraries() {
        const requiredLibraries = ['supabase'];
        const timeout = 10000; // 10 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const allLoaded = requiredLibraries.every(lib => window[lib]);
            if (allLoaded) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const missing = requiredLibraries.filter(lib => !window[lib]);
        throw new Error(`Required libraries not loaded: ${missing.join(', ')}`);
    }
    
    async initializeAuth() {
        if (!window.OsliraAuth?.initialize) {
            throw new Error('OsliraAuth not available');
        }
        
        return await window.OsliraAuth.initialize();
    }
    
    async initializeApiClient() {
        if (!window.OsliraApiClient) {
            console.warn('⚠️ [App] OsliraApiClient not available, creating basic client');
            return new BasicApiClient(this.config, this.auth);
        }
        return new window.OsliraApiClient(this.config, this.auth);
    }
    
    async initializeUI() {
        if (!window.OsliraUIManager) {
            console.warn('⚠️ [App] OsliraUIManager not available, creating basic manager');
            return new BasicUIManager();
        }
        return new window.OsliraUIManager();
    }
    
    async initializeDataStore() {
        if (!window.OsliraDataStore) {
            console.warn('⚠️ [App] OsliraDataStore not available, creating basic store');
            return new BasicDataStore();
        }
        return new window.OsliraDataStore();
    }
    
    async setupPageSpecificFeatures() {
        // Initialize page-specific components based on current page
        const currentPage = window.OsliraScriptLoader?.currentPage || 'unknown';
        console.log('🔧 [App] Setting up features for page:', currentPage);
        
        switch (currentPage) {
            case 'dashboard':
                await this.initDashboardFeatures();
                break;
            case 'auth':
                await this.initAuthPageFeatures();
                break;
            case 'onboarding':
                await this.initOnboardingFeatures();
                break;
            // Add other pages as needed
        }
    }
    
    async initAuthPageFeatures() {
        // Auth page specific setup - NEW AUTH FORMS ARE SELF-CONTAINED
        console.log('🔐 [App] Auth page detected - new auth system is self-contained');
        
        // The new auth forms handle everything internally, no app.js setup needed
        // This is here for legacy compatibility only
        
        // Ensure auth system is ready for page navigation
        if (!this.auth) {
            console.warn('⚠️ [App] Auth system not ready');
            return;
        }
        
        // Handle any legacy auth form if it exists (backward compatibility)
        const legacyAuthForm = document.getElementById('auth-form');
        if (legacyAuthForm && legacyAuthForm.textContent.includes('under maintenance')) {
            console.log('📝 [App] Legacy auth form detected (maintenance mode)');
            // Legacy form is in maintenance mode, new forms handle everything
        }
    }
    
    async initDashboardFeatures() {
        console.log('📊 [App] Setting up dashboard features...');
        
        // Dashboard-specific initialization
        if (window.OsliraDashboard?.initialize) {
            await window.OsliraDashboard.initialize(this);
        }
    }
    
    async initOnboardingFeatures() {
        console.log('👋 [App] Setting up onboarding features...');
        
        // Onboarding-specific initialization
        if (window.OsliraOnboarding?.initialize) {
            await window.OsliraOnboarding.initialize(this);
        }
    }
    
    async setupGlobalEventListeners() {
        // Global keyboard shortcuts
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
        
        // Handle auth state changes globally
        window.addEventListener('auth:change', (event) => {
            const { session, user } = event.detail;
            console.log('🔐 [App] Auth state changed:', {
                authenticated: !!session,
                userId: user?.id
            });
            
            // Update global state
            this.store?.setState('auth.session', session);
            this.store?.setState('auth.user', user);
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Refresh session when page becomes visible
                if (this.auth?.refreshSession) {
                    this.auth.refreshSession().catch(console.error);
                }
            }
        });
    }
    
    static showInitializationError(error) {
        // Show a user-friendly error message
        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #fee;
            border: 1px solid #fcc;
            color: #c00;
            padding: 16px 24px;
            border-radius: 8px;
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            max-width: 500px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        errorContainer.innerHTML = `
            <strong>Application Error</strong><br>
            ${error.message}<br>
            <small style="opacity: 0.7;">Please refresh the page or contact support if this persists.</small>
        `;
        
        document.body.appendChild(errorContainer);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.parentNode.removeChild(errorContainer);
            }
        }, 10000);
    }
}

// =============================================================================
// BASIC FALLBACK CLASSES (for when full modules aren't available)
// =============================================================================

class BasicApiClient {
    constructor(config, auth) {
        this.config = config;
        this.auth = auth;
    }
    
    async makeRequest(url, options = {}) {
        if (this.auth?.getAuthHeaders) {
            options.headers = {
                ...this.auth.getAuthHeaders(),
                ...options.headers
            };
        }
        return fetch(url, options);
    }
}

class BasicUIManager {
    constructor() {
        this.components = new Map();
    }
    
    register(name, component) {
        this.components.set(name, component);
    }
    
    get(name) {
        return this.components.get(name);
    }
}

class BasicDataStore {
    constructor() {
        this.data = {};
        this.listeners = new Map();
    }
    
    setState(path, value) {
        this.data[path] = value;
        const listeners = this.listeners.get(path);
        if (listeners) {
            listeners.forEach(callback => callback(value));
        }
    }
    
    getState(path) {
        return this.data[path];
    }
    
    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);
        
        return () => {
            this.listeners.get(path)?.delete(callback);
        };
    }
}

    // =============================================================================
    // GLOBAL INITIALIZATION - ONLY IF NOT ALREADY DECLARED
    // =============================================================================

    // Initialize when DOM is ready, but wait for config to be loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Wait a bit for config to load first
            setTimeout(() => {
                OsliraApp.init().catch(console.error);
            }, 100);
        });
    } else {
        // DOM already ready, wait for config
        setTimeout(() => {
            OsliraApp.init().catch(console.error);
        }, 200);
    }

    // Make app globally available
    window.OsliraApp = OsliraApp;

} // End of if (!window.OsliraApp) check
