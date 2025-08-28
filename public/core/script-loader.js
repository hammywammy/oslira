// =============================================================================
// SCRIPT-LOADER.JS - Modern Dependency Management System
// =============================================================================

class OsliraScriptLoader {
    constructor() { 
        this.loadedScripts = new Set();
        this.loadingScripts = new Map(); // Track in-progress loads
        this.config = this.detectEnvironment();
        this.currentPage = this.detectCurrentPage();
        this.dependencies = this.defineDependencies();
        
        console.log(`📚 [ScriptLoader] Initialized for page: ${this.currentPage}, env: ${this.config.environment}`);
    }
    
    detectEnvironment() {
        const hostname = window.location.hostname;
        const isStaging = hostname.includes('test') || hostname.includes('staging') || hostname.includes('netlify');
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        
        return {
            environment: isLocal ? 'development' : (isStaging ? 'staging' : 'production'),
            hostname,
            isLocal,
            isStaging
        };
    }

    detectCurrentPage() {
    const pathname = window.location.pathname;
    console.log('🔍 [ScriptLoader] Detecting page for pathname:', pathname);
    
    const pageMap = {
        '/': 'home',
        '/index.html': 'home',
        '/home': 'home',
        '/home.html': 'home',
        
        '/auth': 'auth',
        '/auth.html': 'auth',
        '/auth/': 'auth',
        '/auth/index.html': 'auth',
        '/pages/auth/': 'auth',
        '/pages/auth/index.html': 'auth',
        
        '/auth/callback': 'auth-callback',
        '/auth/callback.html': 'auth-callback',
        '/pages/auth/callback.html': 'auth-callback',
            '/dashboard.html': 'dashboard',
'/dashboard/': 'dashboard',
'/dashboard': 'dashboard',
'/pages/dashboard/': 'dashboard',
'/pages/dashboard/index.html': 'dashboard',
            '/onboarding.html': 'onboarding',
            '/subscription.html': 'subscription',
            '/settings.html': 'settings',
            '/analytics.html': 'analytics',
            '/admin.html': 'admin'
        };
        
        // Exact matches first
       if (pageMap[pathname]) {
        console.log('🔍 [ScriptLoader] Exact match found:', pageMap[pathname]);
        return pageMap[pathname];
    }
    
    // Partial matches for nested paths
    for (const [path, page] of Object.entries(pageMap)) {
        if (pathname.startsWith(path) && path !== '/') {
            console.log('🔍 [ScriptLoader] Partial match found:', page);
            return page;
        }
    }
    
    // Check for known page patterns
    if (pathname.includes('/auth/callback')) {
        console.log('🔍 [ScriptLoader] Pattern match: auth-callback');
        return 'auth-callback';
    }
    if (pathname.includes('/auth')) {
        console.log('🔍 [ScriptLoader] Pattern match: auth');
        return 'auth';
    }
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/onboarding')) return 'onboarding';
    
    console.log('🔍 [ScriptLoader] No match found, using generic');
    return 'generic';
}
    
    defineDependencies() {
        return {
            // =============================================================================
            // CORE DEPENDENCIES (Always loaded first)
            // =============================================================================
            core: {
                // External libraries
                'supabase': {
                    url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
                    global: 'supabase',
                    critical: true
                },
                'sentry': {
                    url: 'https://js.sentry-cdn.com/7b59f19d521441c8aec15ac32ff07da8.min.js',
                    global: 'Sentry',
                    critical: false,
                    attributes: { crossorigin: 'anonymous' }
                },
                
                // Utilities (load first)
                'staging-guard': {
                    url: '/utils/staging-guard.js',
                    critical: true,
                    environments: ['staging', 'development']
                },
                'security-guard': {
                    url: '/core/security-guard.js',
                    critical: true,
                    dependsOn: ['supabase']
                },
                'alert-system': {
                    url: '/utils/alert-system.js',
                    critical: false
                },
                
                // Core systems (load in order)
                'ui-manager': {
                    url: '/core/ui-manager.js',
                    global: 'OsliraUI',
                    critical: true
                },
                'data-store': {
                    url: '/core/data-store.js',
                    global: 'OsliraDataStore',
                    critical: true
                },
                'form-manager': {
                    url: '/core/form-manager.js',
                    global: 'OsliraFormManager',
                    critical: true
                },
                'api-client': {
                    url: '/core/api-client.js',
                    global: 'OsliraApiClient',
                    critical: true
                },
                'auth-manager': {
                    url: '/core/auth-manager.js',
                    global: 'OsliraAuth',
                    critical: true
                },
                // REMOVED: shared-legacy dependency
                'app-initializer': {
                    url: '/core/app.js',
                    global: 'OsliraAppInitializer',
                    critical: true,
                    dependsOn: ['ui-manager', 'data-store', 'api-client', 'auth-manager']
                }
            },
            
            // =============================================================================
            // PAGE-SPECIFIC DEPENDENCIES
            // =============================================================================
            pages: {
                'home': {
        scripts: ['/pages/home/home.js'],
        styles: ['/pages/home/home.css'],
        requiresAuth: false
    },
    'auth': {
        scripts: [],
        styles: ['/pages/auth/auth.css'],
        requiresAuth: false
    },
    'auth-callback': {
        scripts: [],
        styles: ['/pages/auth/auth.css'],
        requiresAuth: false
    },
    'generic': {
        scripts: [],
        styles: [],
        requiresAuth: false
    },
                'dashboard': {
    scripts: [
        // Core modules first
        '/pages/dashboard/modules/core/event-bus.js',
        '/pages/dashboard/modules/core/state-manager.js', 
        '/pages/dashboard/modules/core/dependency-container.js',
        '/pages/dashboard/modules/core/dashboard-app.js',
        
        // Feature modules
        '/pages/dashboard/modules/leads/lead-manager.js',
        '/pages/dashboard/modules/leads/lead-renderer.js',
        '/pages/dashboard/modules/analysis/analysis-queue.js',
        '/pages/dashboard/modules/realtime/realtime-manager.js',
        '/pages/dashboard/modules/stats/stats-calculator.js',
        '/pages/dashboard/modules/business/business-manager.js',
        '/pages/dashboard/modules/ui/modal-manager.js',
        
        // Main orchestrator last
        '/pages/dashboard/dashboard.js'
    ],
    styles: ['/pages/dashboard/dashboard.css'],
    requiresAuth: true,
    requiresBusiness: true
},
                'admin': {
                    scripts: ['/pages/admin/admin.js'],
                    styles: ['/pages/admin/admin.css'],
                    requiresAuth: true,
                    requiresAdmin: true
                },
                'onboarding': {
                    scripts: ['/pages/onboarding/onboarding.js'],
                    styles: ['/pages/onboarding/onboarding.css'],
                    requiresAuth: true
                },
                'analytics': {
                    scripts: ['/pages/analytics/analytics.js'],
                    styles: ['/pages/analytics/analytics.css'],
                    requiresAuth: true,
                    requiresBusiness: true,
                    additionalLibraries: ['chart-js']
                },
                'settings': {
                    scripts: ['/pages/settings/settings.js'],
                    styles: ['/pages/settings/settings.css'],
                    requiresAuth: true
                },
                'subscription': {
                    scripts: ['/pages/subscription/subscription.js'],
                    styles: ['/pages/subscription/subscription.css'],
                    requiresAuth: true
                },
                'generic': {
                    scripts: [],
                    requiresAuth: false
                }
            },
            
            // =============================================================================
            // OPTIONAL LIBRARIES (Loaded on demand)
            // =============================================================================
            libraries: {
                'chart-js': {
                    url: 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
                    global: 'Chart'
                },
                'stripe': {
                    url: 'https://js.stripe.com/v3/',
                    global: 'Stripe'
                }
            }
        };
    }
    
    // =============================================================================
    // MAIN LOADING METHODS
    // =============================================================================
    
    async loadAll() {
        try {
            console.log('📚 [ScriptLoader] Starting universal script loading...');
            const startTime = performance.now();
            
            // Step 1: Load core dependencies in order
            await this.loadCoreDependencies();
            
            // Step 2: Load page-specific dependencies
            await this.loadPageDependencies();
            
            // Step 3: Initialize application (handled by app.js auto-init)
            // No manual initialization needed - app.js handles this
            
            const duration = performance.now() - startTime;
            console.log(`✅ [ScriptLoader] All scripts loaded successfully in ${duration.toFixed(2)}ms`);
            
            // Emit ready event
            window.dispatchEvent(new CustomEvent('oslira:scripts:loaded', {
                detail: { 
                    page: this.currentPage,
                    loadTime: duration,
                    environment: this.config.environment
                }
            }));
            
            return true;
            
        } catch (error) {
            console.error('❌ [ScriptLoader] Script loading failed:', error);
            this.handleLoadingError(error);
            throw error;
        }
    }
    
    async loadCoreDependencies() {
        console.log('🔧 [ScriptLoader] Loading core dependencies...');
        
        const coreScripts = this.dependencies.core;
        const loadOrder = [
    // External libraries first
    'supabase', 'sentry',
    
    // Security utilities
    'staging-guard', 'alert-system',
    
    // Core systems in dependency order
    'ui-manager', 'data-store', 'form-manager', 'api-client',
    'auth-manager', 'app-initializer'
];

console.log('🔍 [ScriptLoader] Core load order:', loadOrder);
        
        for (const scriptName of loadOrder) {
    console.log(`🔍 [ScriptLoader] Attempting to load: ${scriptName}`);
    const script = coreScripts[scriptName];
    if (!script) {
        console.log(`🚫 [ScriptLoader] Script config not found for: ${scriptName}`);
        continue;
    }
    
    // Check environment requirements
    if (script.environments && !script.environments.includes(this.config.environment)) {
        console.log(`⏭️ [ScriptLoader] Skipping ${scriptName} (not required for ${this.config.environment})`);
        continue;
    }
            
            // Load dependencies first
            if (script.dependsOn) {
                for (const dep of script.dependsOn) {
                    if (!this.loadedScripts.has(dep)) {
                        await this.loadScript(coreScripts[dep], dep);
                    }
                }
            }
            
            // Load the script
            await this.loadScript(script, scriptName);
        }
        
        console.log('✅ [ScriptLoader] Core dependencies loaded');
    }
    
    async loadPageDependencies() {
        console.log(`📄 [ScriptLoader] Loading dependencies for page: ${this.currentPage}`);
        
        const pageDeps = this.dependencies.pages[this.currentPage];
        if (!pageDeps) {
            console.log('⏭️ [ScriptLoader] No page-specific dependencies');
            return;
        }
        
        // Load additional libraries first
        if (pageDeps.additionalLibraries) {
            for (const libName of pageDeps.additionalLibraries) {
                const lib = this.dependencies.libraries[libName];
                if (lib) {
                    await this.loadScript(lib, libName);
                }
            }
        }
        
        // Load page styles
        if (pageDeps.styles) {
            await Promise.all(
                pageDeps.styles.map(styleUrl => this.loadStylesheet(styleUrl))
            );
        }
        
        // Load page scripts
        if (pageDeps.scripts) {
            for (const scriptUrl of pageDeps.scripts) {
                await this.loadScript({ url: scriptUrl }, `page-${scriptUrl}`);
            }
        }
        
        console.log(`✅ [ScriptLoader] Page dependencies loaded for: ${this.currentPage}`);
    }
    
    // =============================================================================
    // SCRIPT LOADING UTILITIES
    // =============================================================================
    
    async loadScript(scriptConfig, scriptName) {
        if (this.loadedScripts.has(scriptName)) {
            console.log(`⚡ [ScriptLoader] ${scriptName} already loaded`);
            return;
        }
        
        // Check if already loading
        if (this.loadingScripts.has(scriptName)) {
            console.log(`⏳ [ScriptLoader] Waiting for ${scriptName} to finish loading...`);
            return await this.loadingScripts.get(scriptName);
        }
        
        // Start loading
        const loadPromise = this.performScriptLoad(scriptConfig, scriptName);
        this.loadingScripts.set(scriptName, loadPromise);
        
        try {
            await loadPromise;
            this.loadedScripts.add(scriptName);
            this.loadingScripts.delete(scriptName);
            console.log(`✅ [ScriptLoader] ${scriptName} loaded successfully`);
        } catch (error) {
            this.loadingScripts.delete(scriptName);
            console.error(`❌ [ScriptLoader] Failed to load ${scriptName}:`, error);
            if (scriptConfig.critical) {
                throw new Error(`Critical script failed to load: ${scriptName}`);
            }
        }
    }
    
    async performScriptLoad(scriptConfig, scriptName) {
        return new Promise((resolve, reject) => {
            // Check if global is already available
            if (scriptConfig.global && window[scriptConfig.global]) {
                console.log(`⚡ [ScriptLoader] ${scriptName} global already available`);
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = scriptConfig.url;
            script.async = true;
            
            // Add custom attributes
            if (scriptConfig.attributes) {
                Object.entries(scriptConfig.attributes).forEach(([key, value]) => {
                    script.setAttribute(key, value);
                });
            }
            
            script.onload = () => {
                // Wait a bit for global to be available
                if (scriptConfig.global) {
                    const checkGlobal = () => {
                        if (window[scriptConfig.global]) {
                            resolve();
                        } else {
                            setTimeout(checkGlobal, 10);
                        }
                    };
                    checkGlobal();
                } else {
                    resolve();
                }
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${scriptConfig.url}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    async loadStylesheet(url) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            const existingLink = document.querySelector(`link[href="${url}"]`);
            if (existingLink) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
            
            document.head.appendChild(link);
        });
    }
    
    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    
    handleLoadingError(error) {
        console.error('🚨 [ScriptLoader] Critical loading error:', error);
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ef4444;
            color: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 400px;
            text-align: center;
            z-index: 10000;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        `;
        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 12px 0; font-size: 18px;">Loading Error</h3>
            <p style="margin: 0 0 16px 0;">The application failed to load properly.</p>
            <button onclick="window.location.reload()" style="
                background: white;
                color: #ef4444;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            ">Reload Page</button>
        `;
        document.body.appendChild(errorDiv);
        
        // Send error to monitoring if available
        if (window.Sentry) {
            window.Sentry.captureException(error);
        }
    }
    
    // =============================================================================
    // DEBUGGING UTILITIES
    // =============================================================================
    
    getLoadedScripts() {
        return Array.from(this.loadedScripts);
    }
    
    getLoadingScripts() {
        return Array.from(this.loadingScripts.keys());
    }
    
    isScriptLoaded(scriptName) {
        return this.loadedScripts.has(scriptName);
    }
    
    async reloadScript(scriptName) {
        this.loadedScripts.delete(scriptName);
        this.loadingScripts.delete(scriptName);
        
        const scriptConfig = this.dependencies.core[scriptName] || 
                           this.dependencies.libraries[scriptName];
        
        if (scriptConfig) {
            await this.loadScript(scriptConfig, scriptName);
        } else {
            throw new Error(`Script configuration not found: ${scriptName}`);
        }
    }
    
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    
    async loadLibrary(libraryName) {
        const lib = this.dependencies.libraries[libraryName];
        if (!lib) {
            throw new Error(`Library not found: ${libraryName}`);
        }
        
        await this.loadScript(lib, libraryName);
        return window[lib.global];
    }
    
    // Check if all critical scripts are loaded
    areAllCriticalScriptsLoaded() {
        const criticalScripts = Object.entries(this.dependencies.core)
            .filter(([name, config]) => config.critical)
            .map(([name]) => name);
        
        return criticalScripts.every(scriptName => this.loadedScripts.has(scriptName));
    }
}

// =============================================================================
// GLOBAL INITIALIZATION
// =============================================================================

// Create global instance
window.OsliraScriptLoader = new OsliraScriptLoader();

// Auto-load all dependencies when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.OsliraScriptLoader.loadAll();
        } catch (error) {
            console.error('❌ Script loading failed:', error);
        }
    });
} else {
    // DOM already ready
    setTimeout(async () => {
        try {
            await window.OsliraScriptLoader.loadAll();
        } catch (error) {
            console.error('❌ Script loading failed:', error);
        }
    }, 50);
}

// Debug utilities in development
if (window.location.hostname.includes('localhost') || window.location.hostname.includes('netlify')) {
    window.debugScriptLoader = {
        getLoaded: () => window.OsliraScriptLoader.getLoadedScripts(),
        getLoading: () => window.OsliraScriptLoader.getLoadingScripts(),
        isLoaded: (name) => window.OsliraScriptLoader.isScriptLoaded(name),
        reload: (name) => window.OsliraScriptLoader.reloadScript(name),
        loadLibrary: (name) => window.OsliraScriptLoader.loadLibrary(name),
        checkCritical: () => window.OsliraScriptLoader.areAllCriticalScriptsLoaded()
    };
    
    console.log('🛠️ Debug utilities available at window.debugScriptLoader');
}

console.log('📚 Modern script loader initialized');
console.log('🚀 Will auto-load dependencies when DOM is ready');
