// =============================================================================
// SCRIPT-LOADER.js - Fixed with proper app-initializer definition
// =============================================================================

class OsliraScriptLoader {
    constructor() { 
    this.loadedScripts = new Set(); 
    this.loadingScripts = new Map();
    
    // Don't call detectEnvironment() in constructor - OsliraEnv not loaded yet
    this.config = null;
    this.currentPage = this.detectCurrentPage();
    this.dependencies = this.defineDependencies();
    
    console.log(`📚 [ScriptLoader] Initialized for page: ${this.currentPage}`);
}

async loadAll() {
    try {
        console.log('📚 [ScriptLoader] Starting universal script loading...');
        const startTime = performance.now();
        
        // USE CENTRALIZED PAGE DETECTION
        this.currentPage = window.OsliraEnv.CURRENT_PAGE;
        console.log('📚 [ScriptLoader] Page detected:', this.currentPage);
        
        // Step 1: Load pre-core first (environment detection)
        await this.loadPreCoreDependencies();
        
        // Step 2: Load core dependencies in order  
        await this.loadCoreDependencies();
        
        // Step 3: Load page-specific dependencies
        await this.loadPageDependencies();
        
        const duration = performance.now() - startTime;
        console.log(`✅ [ScriptLoader] All scripts loaded successfully in ${duration.toFixed(2)}ms`);
        
        // Emit ready event with centralized page info
        window.dispatchEvent(new CustomEvent('oslira:scripts:loaded', {
            detail: { 
                page: this.currentPage,
                pageType: window.OsliraEnv.PAGE_TYPE,
                loadTime: duration,
                environment: window.OsliraEnv.ENV
            }
        }));
        
        return true;
        
    } catch (error) {
        console.error('❌ [ScriptLoader] Script loading failed:', error);
        this.handleLoadingError(error);
        throw error;
    }
}
    
    defineDependencies() {
        return {
             // =============================================================================
        // PRE-CORE - Environment detection MUST load first
        // =============================================================================
        'pre-core': [
            '/core/env-manager.js'
        ],
            // =============================================================================
            // CORE DEPENDENCIES (Always loaded first)
            // =============================================================================
            core: {
    // Configuration first
    'env-config': {
        url: '/env-config.js',
        critical: true
    },
    // External libraries
    'supabase': {
    url: 'https://unpkg.com/@supabase/supabase-js@2',
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
                
                // Configuration system
                'config-manager': {
                    url: '/core/config-manager.js',
                    global: 'OsliraConfig',
                    critical: true
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
                    critical: true,
                    dependsOn: ['config-manager', 'supabase']
                },
                // FIXED: Add app-initializer configuration
                'app-initializer': {
                    url: '/core/app.js',
                    global: 'OsliraAppInitializer',
                    critical: true,
                    dependsOn: ['config-manager', 'supabase', 'ui-manager', 'data-store', 'api-client', 'auth-manager']
                }
            },
            
            // =============================================================================
            // PAGE-SPECIFIC DEPENDENCIES
            // =============================================================================
            pages: {
                'dashboard': {
                    scripts: ['/pages/dashboard/dashboard.js'],
                    styles: ['/pages/dashboard/dashboard.css'],
                    additionalLibraries: ['chart-js'],
                    requiresAuth: true
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
                'onboarding': {
                    scripts: ['/pages/onboarding/onboarding.js'],
                    styles: ['/pages/onboarding/onboarding.css'],
                    requiresAuth: true
                },
                'analytics': {
                    scripts: ['/pages/analytics/analytics.js'],
                    styles: ['/pages/analytics/analytics.css'],
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
        
        // Step 1: Load pre-core first (environment detection)
        await this.loadPreCoreDependencies();
        
        // Step 2: Load core dependencies in order
        await this.loadCoreDependencies();
        
        // Step 3: Load page-specific dependencies
        await this.loadPageDependencies();
        
        const duration = performance.now() - startTime;
        console.log(`✅ [ScriptLoader] All scripts loaded successfully in ${duration.toFixed(2)}ms`);
        
        // Emit ready event
        window.dispatchEvent(new CustomEvent('oslira:scripts:loaded', {
            detail: { 
                page: this.currentPage,
                loadTime: duration,
                environment: this.config?.environment || 'unknown'
            }
        }));
        
        return true;
        
    } catch (error) {
        console.error('❌ [ScriptLoader] Script loading failed:', error);
        this.handleLoadingError(error);
        throw error;
    }
}

    async loadPreCoreDependencies() {
    console.log('🔧 [ScriptLoader] Loading pre-core dependencies...');
    
    if (this.dependencies['pre-core']) {
        for (const scriptUrl of this.dependencies['pre-core']) {
            await this.loadScript({ url: scriptUrl }, `pre-core-${scriptUrl}`);
        }
        
        // Now detect environment after OsliraEnv is loaded
        this.config = this.detectEnvironment();
        console.log(`📚 [ScriptLoader] Environment detected: ${this.config.environment}`);
    }
}
    
   async loadCoreDependencies() {
    console.log('🔧 [ScriptLoader] Loading core dependencies...');
    
    const coreScripts = this.dependencies.core;
    
    // PERFORMANCE FIX: Load non-dependent scripts in parallel
    const independentScripts = ['supabase', 'sentry', 'alert-system'];
    const dependentScripts = [
        'staging-guard', 'config-manager', 'security-guard', 
        'ui-manager', 'data-store', 'form-manager', 'api-client',
        'auth-manager', 'app-initializer'
    ];
    
    // Load independent scripts in parallel
    console.log('🔧 [ScriptLoader] Loading independent scripts in parallel...');
    await Promise.all(
        independentScripts.map(async (scriptName) => {
            const script = coreScripts[scriptName];
            if (script && (!script.environments || script.environments.includes(this.config.environment))) {
                console.log(`🔄 [ScriptLoader] Loading ${scriptName}...`);
                await this.loadScript(script, scriptName);
                console.log(`✅ [ScriptLoader] ${scriptName} loaded successfully`);
            }
        })
    );
    
    // Load dependent scripts sequentially but with reduced wait times
    console.log('🔧 [ScriptLoader] Loading dependent scripts...');
    for (const scriptName of dependentScripts) {
        const script = coreScripts[scriptName];
        if (!script) continue;
        
        if (script.environments && !script.environments.includes(this.config.environment)) {
            console.log(`⏭️ [ScriptLoader] Skipping ${scriptName} (not required for ${this.config.environment})`);
            continue;
        }
        
        try {
            console.log(`🔄 [ScriptLoader] Loading ${scriptName}...`);
            await this.loadScript(script, scriptName);
            console.log(`✅ [ScriptLoader] ${scriptName} loaded successfully`);
        } catch (error) {
            console.error(`❌ [ScriptLoader] Failed to load ${scriptName}:`, error);
            if (script.critical) {
                throw new Error(`Critical script failed: ${scriptName} - ${error.message}`);
            }
        }
    }
    
    console.log('✅ [ScriptLoader] Core dependencies loaded');
}
    
async loadPageDependencies() {
    console.log(`📄 [ScriptLoader] Loading dependencies for page: ${this.currentPage}`);
    
    try {
        // Load page-specific dependencies
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
        
        console.log(`✅ [ScriptLoader] All dependencies loaded for: ${this.currentPage}`);
        
    } catch (error) {
        console.error(`❌ [ScriptLoader] Failed to load dependencies for ${this.currentPage}:`, error);
        throw error;
    }
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
        } catch (error) {
            this.loadingScripts.delete(scriptName);
            console.error(`❌ [ScriptLoader] Failed to load ${scriptName}:`, error);
            console.error(`❌ [ScriptLoader] Script URL was: ${scriptConfig.url}`);
            console.error(`❌ [ScriptLoader] Error details:`, error);
            if (scriptConfig.critical) {
                throw new Error(`Critical script failed to load: ${scriptName} - ${error.message}`);
            }
            throw error;
        }
    }
    
  async performScriptLoad(scriptConfig, scriptName) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptConfig.url;
        script.defer = true;
        
        // Add any additional attributes
        if (scriptConfig.attributes) {
            Object.entries(scriptConfig.attributes).forEach(([key, value]) => {
                script.setAttribute(key, value);
            });
        }
        
        script.onload = () => {
    // Special debugging for Supabase
    if (scriptName === 'supabase') {
        console.log('🔍 [ScriptLoader] Supabase script loaded, checking globals...');
        console.log('🔍 [ScriptLoader] window.supabase:', window.supabase);
        console.log('🔍 [ScriptLoader] window.createClient:', window.createClient);
        console.log('🔍 [ScriptLoader] window.Supabase:', window.Supabase);
        console.log('🔍 [ScriptLoader] window.SupabaseClient:', window.SupabaseClient);
        console.log('🔍 [ScriptLoader] All new window keys after load:', 
            Object.keys(window).filter(key => key.toLowerCase().includes('supa')));
    }
    
    // Validate global availability for critical libraries
    if (scriptConfig.global) {
        let maxAttempts = 50;
        let attempts = 0;
        
        const checkGlobal = () => {
            const globalObj = window[scriptConfig.global];
            
            // Special validation for Supabase
            if (scriptName === 'supabase') {
                if (globalObj && typeof globalObj.createClient === 'function') {
                    console.log(`✅ [ScriptLoader] Successfully loaded: ${scriptName}`);
                    resolve();
                    return;
                }
            } else if (globalObj) {
                console.log(`✅ [ScriptLoader] Successfully loaded: ${scriptName}`);
                resolve();
                return;
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(checkGlobal, 100);
            } else {
                reject(new Error(`Global object ${scriptConfig.global} not available after loading ${scriptName}`));
            }
        };
        
        setTimeout(checkGlobal, 50);
    } else {
        console.log(`✅ [ScriptLoader] Successfully loaded: ${scriptName}`);
        resolve();
    }
};
        
        script.onerror = (error) => {
            console.error(`❌ [ScriptLoader] Failed to load: ${scriptName}`, error);
            reject(new Error(`Failed to load script: ${scriptName}`));
        };
        
        document.head.appendChild(script);
    });
}
    
    async loadStylesheet(url) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`link[href="${url}"]`)) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            
            link.onload = resolve;
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
