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
            console.log('🎨 [App] Initializing UI manager...');
            this.ui = await this.initializeUI();
            
            // Step 6: Initialize data store
            console.log('📊 [App] Initializing data store...');
            this.store = await this.initializeDataStore();
            
            // Step 7: Setup page-specific features
            console.log('🔧 [App] Setting up page-specific features...');
            await this.setupPageSpecificFeatures();
            
            // Step 8: Setup global event listeners
            console.log('🎧 [App] Setting up global event listeners...');
            await this.setupGlobalEventListeners();
            
            const duration = performance.now() - startTime;
            this.initialized = true;
            
            console.log(`✅ [App] Application initialized successfully in ${duration.toFixed(2)}ms`);
            return this;
            
        } catch (error) {
            console.error('❌ [App] Application initialization failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // INITIALIZATION METHODS
    // =============================================================================
    
    async loadConfiguration() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        
        while (attempts < maxAttempts) {
            if (window.OsliraConfig?.get) {
                const config = window.OsliraConfig.get();
                console.log('✅ [App] Configuration loaded');
                return config;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Configuration not available after timeout');
    }
    
    async waitForLibraries() {
        const requiredLibraries = [
            { name: 'supabase', global: 'supabase' },
            { name: 'OsliraAuth', global: 'OsliraAuth' }
        ];
        
        for (const lib of requiredLibraries) {
            let attempts = 0;
            const maxAttempts = 50;
            
            while (attempts < maxAttempts) {
                if (window[lib.global]) {
                    console.log(`✅ [App] ${lib.name} library available`);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window[lib.global]) {
                throw new Error(`${lib.name} library not available after timeout`);
            }
        }
        
        console.log('✅ [App] All required libraries loaded');
    }
    
    async initializeAuth() {
        if (!window.OsliraAuth?.initialize) {
            throw new Error('OsliraAuth not available');
        }
        
        const auth = await window.OsliraAuth.initialize();
        console.log('✅ [App] Authentication manager initialized');
        return auth;
    }
    
    async initializeApiClient() {
        if (!window.OsliraApiClient) {
            console.warn('⚠️ [App] OsliraApiClient not available, creating basic client');
            return new BasicApiClient(this.config, this.auth);
        }
        
        const api = new window.OsliraApiClient(this.config, this.auth);
        console.log('✅ [App] API client initialized');
        return api;
    }
    
    async initializeUI() {
        if (!window.OsliraUIManager) {
            console.warn('⚠️ [App] OsliraUIManager not available, creating basic manager');
            return new BasicUIManager();
        }
        
        const ui = new window.OsliraUIManager();
        console.log('✅ [App] UI manager initialized');
        return ui;
    }
    
    async initializeDataStore() {
        if (!window.OsliraDataStore) {
            console.warn('⚠️ [App] OsliraDataStore not available, creating basic store');
            return new BasicDataStore();
        }
        
        const store = new window.OsliraDataStore();
        console.log('✅ [App] Data store initialized');
        return store;
    }
    
    async setupPageSpecificFeatures() {
        // Initialize page-specific components based on current page
        const currentPage = window.OsliraEnv?.CURRENT_PAGE || 'unknown';
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
        });
        
        // Handle business changes
        window.addEventListener('auth:business-change', (event) => {
            const { business } = event.detail;
            console.log('🏢 [App] Business changed:', business?.name || 'None selected');
        });
        
        console.log('🎧 [App] Global event listeners setup complete');
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    static showInitializationError(error) {
        console.error('❌ [App] Initialization Error:', error);
        
        // Create error display
        const errorDiv = document.createElement('div');
        errorDiv.className = 'app-init-error';
        errorDiv.innerHTML = `
            <h3>Application Error</h3>
            <p>Failed to initialize: ${error.message}</p>
            <button onclick="window.location.reload()">Reload Page</button>
        `;
        
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; border: 2px solid #ef4444; border-radius: 8px;
            padding: 20px; text-align: center; z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    showMessage(message, type = 'info', duration = 3000) {
        if (window.OsliraAlertSystem?.show) {
            window.OsliraAlertSystem.show(message, type, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    
    getConfig() {
        return this.config;
    }
    
    getAuth() {
        return this.auth;
    }
    
    getApi() {
        return this.api;
    }
    
    getUI() {
        return this.ui;
    }
    
    getStore() {
        return this.store;
    }
    
    isInitialized() {
        return this.initialized;
    }
}

// =============================================================================
// BASIC FALLBACK CLASSES
// =============================================================================

class BasicApiClient {
    constructor(config, auth) {
        this.config = config;
        this.auth = auth;
    }
    
    async request(endpoint, options = {}) {
        const session = this.auth?.getCurrentSession();
        return fetch(`${this.config.WORKER_URL}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': session ? `Bearer ${session.access_token}` : '',
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    }
}

class BasicUIManager {
    showLoading() {
        console.log('Loading...');
    }
    
    hideLoading() {
        console.log('Loading complete');
    }
    
    showError(message) {
        console.error('UI Error:', message);
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
// PROPER INITIALIZATION SEQUENCE
// =============================================================================

// Primary: Initialize after script-loader completes ALL dependencies
window.addEventListener('oslira:scripts:loaded', async (event) => {
    console.log('🚀 [App] Script loader completed, starting app initialization...');
    
    try {
        if (!OsliraApp.instance) {
            const app = await OsliraApp.init();
            console.log('✅ [App] Application ready for', event.detail.page);
            
            // Emit app ready event for other systems
            window.dispatchEvent(new CustomEvent('oslira:app:ready', {
                detail: { 
                    app: app,
                    page: event.detail.page,
                    environment: event.detail.environment
                }
            }));
        }
    } catch (error) {
        console.error('❌ [App] Initialization failed:', error);
        OsliraApp.showInitializationError(error);
    }
});

// Fallback: If script-loader event missed or manual script loading
document.addEventListener('DOMContentLoaded', () => {
    // Give script-loader time to emit its event first
    setTimeout(async () => {
        if (!OsliraApp.instance && !window.OsliraScriptLoader) {
            console.log('🔄 [App] Fallback initialization (no script-loader detected)...');
            try {
                await OsliraApp.init();
            } catch (error) {
                console.error('❌ [App] Fallback initialization failed:', error);
            }
        } else if (!OsliraApp.instance) {
            console.log('🔄 [App] Late initialization trigger...');
            try {
                await OsliraApp.init();
            } catch (error) {
                console.error('❌ [App] Late initialization failed:', error);
            }
        }
    }, 2000); // Wait 2 seconds for script-loader
});

// Make app globally available
window.OsliraApp = OsliraApp;

} // End of if (!window.OsliraApp) check

// CRITICAL: Export for script loader (must be outside conditional)
if (window.OsliraApp) {
    window.OsliraAppInitializer = window.OsliraApp;
    console.log('🏗️ [App] Application initializer exported for script loader');
}

console.log('🏗️ [App] Application initializer loaded, waiting for script-loader completion...');
