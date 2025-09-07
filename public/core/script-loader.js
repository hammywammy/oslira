// =============================================================================
// SIMPLE-SCRIPT-LOADER.js - Minimal Google OAuth System
// =============================================================================

class OsliraScriptLoader {
    constructor() { 
        this.loadedScripts = new Set(); 
        this.loadingScripts = new Map();
        
        // Don't call detectEnvironment() in constructor - OsliraEnv not loaded yet
        this.config = null;
        this.currentPage = null; // Will be set after OsliraEnv loads
        this.dependencies = this.getDependencies();
        
        console.log('📚 [ScriptLoader] Simple loader initialized');
    }

    // =============================================================================
    // MAIN LOADING METHOD
    // =============================================================================
    
    async loadAll() {
        try {
            console.log('📚 [ScriptLoader] Starting simple script loading...');
            const startTime = performance.now();
            
            // Step 1: Load pre-core first (environment detection)
            await this.loadPreCoreDependencies();
            
            // Step 2: Load core dependencies in simplified order
            await this.loadCoreDependencies();
            
            // Step 3: Load page-specific dependencies
            await this.loadPageDependencies();
            
            const duration = performance.now() - startTime;
            console.log(`✅ [ScriptLoader] All scripts loaded in ${duration.toFixed(2)}ms`);

            // Emit ready event for simple app
            console.log('🚀 [ScriptLoader] Emitting scripts loaded event...');
            
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

    // =============================================================================
    // SIMPLIFIED DEPENDENCY DEFINITIONS
    // =============================================================================
    
    // File: public/core/script-loader.js
// Update the core dependencies section around line 50-80

getDependencies() {
    return {
'pre-core': [
    '/core/env-manager.js',
    '/env-config.js'  // ADD THIS - all pages need environment config
],
        
        'core': {
            // External Libraries FIRST
            'supabase': {
                url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js',
                global: 'supabase',
                critical: true
            },
            
            'sentry': {
                url: 'https://browser.sentry-cdn.com/7.100.1/bundle.tracing.min.js',
                global: 'Sentry',
                critical: false,
                environments: ['production', 'staging']
            },
            
            // Security & Utilities
            'staging-guard': {
                url: '../utils/staging-guard.js',
                critical: false,
                environments: ['staging']
            },
            
            'alert-system': {
                url: '/../utils/alert-system.js',
                global: 'Alert',
                critical: false
            },
            
            // Core Systems
            'config-manager': {
                url: '/../core/config-manager.js',
                global: 'OsliraConfig',
                critical: true
            },
            
            'ui-manager': {
                url: '/../core/ui-manager.js',
                global: 'UIManager',
                critical: false
            },
            
            'data-store': {
                url: '/../core/data-store.js',
                global: 'DataStore',
                critical: false
            },
            
            'form-manager': {
                url: '/../core/form-form-manager.js',
                global: 'FormManager',
                critical: false
            },
            
            'api-client': {
                url: '/../core/api-client.js',
                global: 'APIClient',
                critical: true
            },
            
            'auth-manager': {
                url: '/../core/auth-manager.js',
                global: 'SimpleAuth',
                critical: true
            },
            
            'simple-app': {
                url: '/../core/simple-app.js',
                global: 'OsliraApp',
                critical: true
            }
        },
        

    pages: {
    'dashboard': {
        scripts: [
            '/pages/dashboard/modules/core/event-bus.js',
            '/pages/dashboard/modules/core/state-manager.js', 
            '/pages/dashboard/modules/core/dependency-container.js',
            '/pages/dashboard/modules/core/dashboard-app.js',
            '/core/sidebar/sidebar-manager.js',
            '/pages/dashboard/modules/analysis/analysis-queue.js',
            '/pages/dashboard/modules/business/business-manager.js',
            '/pages/dashboard/modules/leads/lead-manager.js',
            '/pages/dashboard/modules/leads/lead-renderer.js',
            '/pages/dashboard/modules/realtime/realtime-manager.js',
            '/pages/dashboard/modules/stats/stats-calculator.js',
            '/pages/dashboard/modules/ui/modal-manager.js'
        ],
        styles: [
            '/pages/dashboard/dashboard.css',
            '/pages/dashboard/dashboard-tailwind-extensions.css'
        ],
        requiresAuth: true,
        enableTailwind: true
    },
    
'home': {
    scripts: ['/pages/home/home.js', '/core/footer/footer-manager.js'],
    styles: [
        '/assets/css/tailwind.css',
        '/pages/home/home.css',
        '/core/footer/footer.css'
    ],
    requiresAuth: false,
    enableTailwind: true
},
    
    'onboarding': {
        scripts: ['/pages/onboarding/onboarding.js'],
        styles: ['/pages/onboarding/onboarding.css'],
        requiresAuth: true,
        enableTailwind: true
    },        
            // Other pages...
            'analytics': {
                scripts: ['/pages/analytics/analytics.js'],
                styles: ['/pages/analytics/analytics.css'],
                additionalLibraries: ['chart-js'],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'settings': {
                scripts: ['/pages/settings/settings.js'],
                styles: ['/pages/settings/settings.css'],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'subscription': {
                scripts: ['/pages/subscription/subscription.js'],
                styles: ['/pages/subscription/subscription.css'],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'generic': {
                scripts: [],
                requiresAuth: false
                // No Tailwind for generic pages
            }
        },
        
        // Optional libraries (loaded on demand)
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
    // LOADING METHODS
    // =============================================================================

    async loadPreCoreDependencies() {
        console.log('🔧 [ScriptLoader] Loading pre-core dependencies...');
        
        if (this.dependencies['pre-core']) {
            for (const scriptUrl of this.dependencies['pre-core']) {
                await this.loadScript({ url: scriptUrl }, `pre-core-${scriptUrl}`);
            }
            
// Use centralized environment detection from OsliraEnv with error handling
if (!window.OsliraEnv) {
    throw new Error('OsliraEnv not available - env-manager.js failed to load');
}

this.config = {
    environment: window.OsliraEnv.ENV,
    isProduction: window.OsliraEnv.IS_PRODUCTION,
    isStaging: window.OsliraEnv.IS_STAGING,
    workerUrl: window.OsliraEnv.WORKER_URL
};

            

// Set current page from centralized detection with validation
this.currentPage = window.OsliraEnv.currentPage || window.OsliraEnv.CURRENT_PAGE;

// Validate critical properties
if (!this.config.environment) {
    console.error('❌ [ScriptLoader] Environment detection failed');
    this.config.environment = 'development'; // Fallback
}

if (!this.currentPage) {
    console.warn('⚠️ [ScriptLoader] Page detection failed, using fallback');
    this.currentPage = this.detectPageFallback();
}

console.log(`📚 [ScriptLoader] Environment: ${this.config.environment}`);
console.log(`📚 [ScriptLoader] Page: ${this.currentPage}`);
        }
    }
    
    async loadCoreDependencies() {
        console.log('🔧 [ScriptLoader] Loading core dependencies...');
        
        const coreScripts = this.dependencies.core;


const independentScripts = ['supabase', 'sentry', 'alert-system'];
const dependentScripts = [
    'staging-guard', 'config-manager', 'auth-manager', 'simple-app'
];
        
        // Load independent scripts in parallel
        console.log('🔧 [ScriptLoader] Loading independent scripts...');
        await Promise.all(
            independentScripts.map(async (scriptName) => {
                const script = coreScripts[scriptName];
                if (script && (!script.environments || script.environments.includes(this.config.environment))) {
                    console.log(`🔄 [ScriptLoader] Loading ${scriptName}...`);
                    await this.loadScript(script, scriptName);
                    console.log(`✅ [ScriptLoader] ${scriptName} loaded`);
                }
            })
        );
        
        // Load dependent scripts sequentially (simplified chain)
        console.log('🔧 [ScriptLoader] Loading dependent scripts...');
        for (const scriptName of dependentScripts) {
            const script = coreScripts[scriptName];
            if (!script) continue;
            
            if (script.environments && !script.environments.includes(this.config.environment)) {
                console.log(`⏭️ [ScriptLoader] Skipping ${scriptName} (not for ${this.config.environment})`);
                continue;
            }
            
            try {
                console.log(`🔄 [ScriptLoader] Loading ${scriptName}...`);
                await this.loadScript(script, scriptName);
                console.log(`✅ [ScriptLoader] ${scriptName} loaded`);
            } catch (error) {
                console.error(`❌ [ScriptLoader] Failed to load ${scriptName}:`, error);
                if (script.critical) {
                    throw new Error(`Critical script failed: ${scriptName}`);
                }
            }
        }
        
        console.log('✅ [ScriptLoader] Core dependencies loaded');
    }

    // =============================================================================
// FALLBACK PAGE DETECTION
// =============================================================================

detectPageFallback() {
    const pathname = window.location.pathname;
    console.log('🔍 [ScriptLoader] Fallback page detection for:', pathname);
    
    // Simple fallback detection
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/auth')) return 'auth';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/subscription')) return 'subscription';
    if (pathname === '/' || pathname === '/index.html') return 'home';
    
    console.log('🔍 [ScriptLoader] No match in fallback, defaulting to home');
    return 'home';
}
    
// File: public/core/script-loader.js
// Add this method after loadPageDependencies() around line 150-200

// =============================================================================
// PAGE-SPECIFIC LOADING
// =============================================================================

async loadPageDependencies() {
    console.log(`📄 [ScriptLoader] Loading page dependencies: ${this.currentPage}`);
    
const pageConfig = this.dependencies.pages[this.currentPage] || {
    scripts: [],
    styles: [],
    additionalLibraries: []
};

// CRITICAL: Add dashboard-specific script loading
if (this.currentPage === 'dashboard') {
    console.log('🔧 [ScriptLoader] Loading dashboard dependencies...');
    
    // Ensure DashboardApp is available before dashboard.js
    const dashboardScripts = [
        '/pages/dashboard/modules/core/event-bus.js',
        '/pages/dashboard/modules/core/dashboard-app.js', // MUST load before dashboard.js
        '/pages/dashboard/modules/ui/modal-manager.js',
        '/pages/dashboard/dashboard.js' // This depends on DashboardApp
    ];
    
    for (const script of dashboardScripts) {
        try {
            await this.loadScript({ url: script }, script);
            console.log(`✅ [ScriptLoader] Dashboard script loaded: ${script}`);
        } catch (error) {
            console.error(`❌ [ScriptLoader] Failed to load dashboard script: ${script}`, error);
        }
    }
}
    if (!pageConfig || !pageConfig.scripts) {
        console.log(`📄 [ScriptLoader] No page-specific dependencies for: ${this.currentPage}`);
        return;
    }

    // Prevent duplicate dashboard.js loading
    const scripts = pageConfig.scripts.filter(script => {
        const scriptName = script.src || script;
        if (scriptName.includes('dashboard.js') && window.DashboardInitializer) {
            console.log(`⚠️ [ScriptLoader] Skipping duplicate dashboard.js - already loaded`);
            return false;
        }
        return true;
    });
    
    // Load page stylesheets
    if (pageConfig.styles) {
        for (const styleUrl of pageConfig.styles) {
            try {
                await this.loadStylesheet(styleUrl);
            } catch (error) {
                console.warn(`⚠️ [ScriptLoader] Failed to load stylesheet: ${styleUrl}`, error);
            }
        }
    }
    
    // Load additional libraries
    if (pageConfig.additionalLibraries) {
        for (const libName of pageConfig.additionalLibraries) {
            const lib = this.dependencies.libraries[libName];
            if (lib) {
                try {
                    await this.loadScript(lib, libName);
                    console.log(`✅ [ScriptLoader] Library loaded: ${libName}`);
                } catch (error) {
                    console.warn(`⚠️ [ScriptLoader] Failed to load library: ${libName}`, error);
                }
            }
        }
    }
    
    // Load page scripts sequentially
    for (const script of scripts) {
        try {
            const scriptConfig = typeof script === 'string' ? { url: script } : script;
            const scriptName = `page-${scriptConfig.url}`;
            await this.loadScript(scriptConfig, scriptName);
        } catch (error) {
            console.error(`❌ [ScriptLoader] Failed to load page script:`, script, error);
            // Don't throw - continue loading other scripts
        }
    }
    
    console.log(`✅ [ScriptLoader] Page dependencies loaded: ${this.currentPage}`);

// Load Tailwind CSS for pages that need it
if (pageConfig.enableTailwind) {
    console.log('🎨 [ScriptLoader] Loading Tailwind CSS...');
    await this.loadStylesheet('/assets/css/tailwind.css');
}
}

applyPageTailwindCustomizations(pageName) {
    console.log(`🎨 [ScriptLoader] Applying ${pageName} Tailwind customizations`);
    
    switch (pageName) {
        case 'dashboard':
            // Dashboard-specific Tailwind customizations
            if (window.TailwindManager?.addCustomStyles) {
                window.TailwindManager.addCustomStyles(`
                    .dashboard-grid { 
                        @apply grid grid-cols-1 lg:grid-cols-4 gap-6; 
                    }
                    .dashboard-card { 
                        @apply bg-white rounded-lg shadow-sm border p-6; 
                    }
                    .leads-table { 
                        @apply w-full border-collapse; 
                    }
                    .lead-row { 
                        @apply hover:bg-slate-50 transition-colors; 
                    }
                    .lead-row.selected { 
                        @apply bg-blue-50 border-blue-200; 
                    }
                `);
            }
            break;
            
        case 'analytics':
            if (window.TailwindManager?.addCustomStyles) {
                window.TailwindManager.addCustomStyles(`
                    .chart-container { 
                        @apply bg-white p-4 rounded-lg shadow-sm; 
                    }
                    .metric-card { 
                        @apply bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg; 
                    }
                `);
            }
            break;
            
        default:
            // No specific customizations
            break;
    }
    
    console.log(`✅ [ScriptLoader] ${pageName} Tailwind customizations applied`);
}

    // =============================================================================
    // SCRIPT LOADING UTILITIES
    // =============================================================================
    
async loadScript(script, name) {
    return new Promise((resolve, reject) => {
        // Handle CSS files differently from JS files
        if (script.type === 'stylesheet' || name.includes('tailwind') || script.url?.endsWith('.css')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = script.url || script;
            link.id = script.id || name;
            
            link.onload = () => {
                console.log(`✅ [ScriptLoader] ${name} stylesheet loaded successfully`);
                this.loadedScripts.add(name);
                resolve();
            };
            
            link.onerror = (error) => {
                console.error(`❌ [ScriptLoader] Failed to load stylesheet ${name}:`, error);
                if (script.critical) {
                    reject(new Error(`Critical stylesheet failed: ${name}`));
                } else {
                    console.warn(`⚠️ [ScriptLoader] Non-critical stylesheet failed, continuing: ${name}`);
                    resolve();
                }
            };
            
            document.head.appendChild(link);
            return;
        }
        
        // Original script loading logic for JS files
        const scriptUrl = script.src || script.url || script;
        const scriptId = script.id || name;
        const normalizedUrl = scriptUrl.startsWith('/') ? 
            scriptUrl : `/${scriptUrl}`;
        
        // Multiple deduplication checks
        const isDuplicate = 
            this.loadedScripts.has(name) || 
            this.loadedScripts.has(scriptUrl) || 
            this.loadedScripts.has(normalizedUrl) ||
            document.querySelector(`script[src="${scriptUrl}"]`) ||
            document.querySelector(`script[src="${normalizedUrl}"]`) ||
            (scriptId && document.querySelector(`script[data-script-id="${scriptId}"]`));
            
        if (isDuplicate) {
            console.log(`⚠️ [ScriptLoader] Script already loaded: ${name} (${scriptUrl})`);
            resolve();
            return;
        }

        // Handle different script types
        if (typeof script === 'string') {
            script = { url: script };
        }

        // Skip if environment doesn't match
        if (script.environments && !script.environments.includes(this.config.environment)) {
            console.log(`⏭️ [ScriptLoader] Skipping ${name} (not for ${this.config.environment})`);
            resolve();
            return;
        }

        console.log(`🔄 [ScriptLoader] Loading ${name}...`);

        const scriptElement = document.createElement('script');
        scriptElement.src = scriptUrl;
        
        // Set attributes
        if (script.defer) scriptElement.defer = true;
        if (script.async) scriptElement.async = true;
        if (script.type) scriptElement.type = script.type;
        if (scriptId) scriptElement.setAttribute('data-script-id', scriptId);
        
        // Add crossorigin for external scripts
        if (scriptUrl.startsWith('http')) {
            scriptElement.crossOrigin = 'anonymous';
        }

        // Success handler
        scriptElement.onload = () => {
            // Track all possible identifiers
            this.loadedScripts.add(name);
            this.loadedScripts.add(scriptUrl);
            this.loadedScripts.add(normalizedUrl);
            if (scriptId) this.loadedScripts.add(scriptId);
            
            console.log(`✅ [ScriptLoader] ${name} script loaded successfully`);
            
            // Check for global availability
            if (script.global && !window[script.global]) {
                console.warn(`⚠️ [ScriptLoader] Global ${script.global} not found after loading ${name}`);
            }
            
            resolve();
        };

        // Error handler
        scriptElement.onerror = (error) => {
            console.error(`❌ [ScriptLoader] Failed to load ${name}:`, error);
            
            // Mark as failed but don't fail completely unless critical
            this.loadedScripts.add(`${name}-FAILED`);
            
            if (script.critical) {
                reject(new Error(`Critical script failed: ${name}`));
            } else {
                console.warn(`⚠️ [ScriptLoader] Non-critical script failed, continuing: ${name}`);
                resolve(); // Continue execution for non-critical scripts
            }
        };

        // Timeout handler for hung scripts
        const timeout = setTimeout(() => {
            console.error(`⏰ [ScriptLoader] Timeout loading ${name} after 30 seconds`);
            scriptElement.remove();
            
            if (script.critical) {
                reject(new Error(`Script timeout: ${name}`));
            } else {
                resolve();
            }
        }, 30000);

        // Clean up timeout on success/error
        const originalOnload = scriptElement.onload;
        const originalOnerror = scriptElement.onerror;
        
        scriptElement.onload = (e) => {
            clearTimeout(timeout);
            originalOnload(e);
        };
        
        scriptElement.onerror = (e) => {
            clearTimeout(timeout);
            originalOnerror(e);
        };

        // Add to DOM
        document.head.appendChild(scriptElement);
    });
}
    
    async performScriptLoad(scriptConfig, scriptName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptConfig.url;
            script.defer = true;
            
            // Add additional attributes
            if (scriptConfig.attributes) {
                Object.entries(scriptConfig.attributes).forEach(([key, value]) => {
                    script.setAttribute(key, value);
                });
            }
            
            script.onload = () => {
                console.log(`✅ [ScriptLoader] ${scriptName} script loaded successfully`);
                resolve();
            };
            
            script.onerror = (error) => {
                reject(new Error(`Script load failed: ${scriptConfig.url}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    async loadStylesheet(stylesheetUrl) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`link[href="${stylesheetUrl}"]`)) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = stylesheetUrl;
            
            link.onload = resolve;
            link.onerror = () => reject(new Error(`Stylesheet failed to load: ${stylesheetUrl}`));
            
            document.head.appendChild(link);
        });
    }
    
    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    
    handleLoadingError(error) {
        console.error('📚 [ScriptLoader] Critical loading error:', error);
        
        // Show user-friendly error if possible
        if (window.Alert?.error) {
            window.Alert.error('Failed to load application components', {
                actions: [{ label: 'Refresh Page', action: 'reload' }]
            });
        }
    }
    
    // =============================================================================
    // UTILITY METHODS
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
        reload: (name) => window.OsliraScriptLoader.reloadScript(name)
    };
    
    console.log('🛠️ Debug utilities available at window.debugScriptLoader');
}

console.log('📚 Simple script loader initialized');
console.log('🚀 Will auto-load: env-manager → config-manager → auth-manager → simple-app');
