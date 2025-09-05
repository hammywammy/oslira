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
            '/core/env-manager.js'
        ],
        
        core: {
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
            
            // ADD TAILWIND CONFIG MANAGER
            'tailwind-config': {
                url: '/../core/tailwind-config.js',
                global: 'OsliraTailwind',
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
        
        // Page-specific dependencies
        pages: {
            'dashboard': {
                scripts: [
                    // Core infrastructure FIRST (dependency order critical)
                    '/pages/dashboard/modules/core/event-bus.js',
                    '/pages/dashboard/modules/core/state-manager.js', 
                    '/pages/dashboard/modules/core/dependency-container.js',
                    '/pages/dashboard/modules/core/dashboard-app.js',
                    
                    // UI Components (load before feature modules)
                    '/core/sidebar/sidebar-manager.js',
                    
                    // Feature modules (parallel loading safe)
                    '/pages/dashboard/modules/analysis/analysis-queue.js',
                    '/pages/dashboard/modules/business/business-manager.js',
                    '/pages/dashboard/modules/leads/lead-manager.js',
                    '/pages/dashboard/modules/leads/lead-renderer.js',
                    '/pages/dashboard/modules/realtime/realtime-manager.js',
                    '/pages/dashboard/modules/stats/stats-calculator.js',
                    '/pages/dashboard/modules/ui/modal-manager.js',
                    
                    // Main controller LAST
                    '/pages/dashboard/dashboard.js'
                ],
                styles: ['/pages/dashboard/dashboard.css'],
                requiresAuth: true,
                // ENABLE TAILWIND FOR DASHBOARD
                enableTailwind: true
            },
            
            'auth': {
                scripts: [],
                styles: ['/pages/auth/auth.css'],
                requiresAuth: false,
                enableTailwind: true  // Enable for auth pages too
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
            
            // Use centralized environment detection from OsliraEnv
            this.config = {
                environment: window.OsliraEnv.ENV,
                isProduction: window.OsliraEnv.IS_PRODUCTION,
                isStaging: window.OsliraEnv.IS_STAGING,
                workerUrl: window.OsliraEnv.WORKER_URL
            };
            
            // Set current page from centralized detection
            this.currentPage = window.OsliraEnv.CURRENT_PAGE;
            
            console.log(`📚 [ScriptLoader] Environment: ${this.config.environment}`);
            console.log(`📚 [ScriptLoader] Page: ${this.currentPage}`);
        }
    }
    
    async loadCoreDependencies() {
        console.log('🔧 [ScriptLoader] Loading core dependencies...');
        
        const coreScripts = this.dependencies.core;
        
// Load independent scripts in parallel
const independentScripts = ['supabase', 'sentry', 'alert-system', 'tailwind-manager'];
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
    
// File: public/core/script-loader.js
// Add this method after loadPageDependencies() around line 150-200

async loadPageDependencies() {
    console.log(`📄 [ScriptLoader] Loading page dependencies: ${this.currentPage}`);
    
    try {
        const pageDeps = this.dependencies.pages[this.currentPage];
        if (!pageDeps) {
            console.log('⏭️ [ScriptLoader] No page-specific dependencies');
            return;
        }
        
        // Load additional libraries
        if (pageDeps.additionalLibraries) {
            for (const libName of pageDeps.additionalLibraries) {
                const lib = this.dependencies.libraries[libName];
                if (lib) {
                    await this.loadScript(lib, libName);
                }
            }
        }
        
        // Initialize Tailwind if enabled for this page
        if (pageDeps.enableTailwind) {
            await this.initializeTailwind();
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
        
        console.log(`✅ [ScriptLoader] Page dependencies loaded: ${this.currentPage}`);
        
    } catch (error) {
        console.error(`❌ [ScriptLoader] Page dependencies failed for ${this.currentPage}:`, error);
        throw error;
    }
}

// =============================================================================
// TAILWIND INITIALIZATION
// =============================================================================

async initializeTailwind() {
    try {
        console.log('🎨 [ScriptLoader] Initializing Tailwind for page:', this.currentPage);
        
        // Ensure TailwindManager is loaded first
        if (!this.loadedScripts.has('tailwind-manager')) {
            console.log('🔄 [ScriptLoader] Loading TailwindManager first...');
            const tailwindConfig = this.dependencies.core['tailwind-manager'];
            if (tailwindConfig) {
                await this.loadScript(tailwindConfig, 'tailwind-manager');
            }
        }
        
        // Wait for TailwindManager to be available
        let attempts = 0;
        while (!window.OsliraTailwind && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.OsliraTailwind) {
            console.error('❌ [ScriptLoader] TailwindManager not available after loading, skipping Tailwind initialization');
            return;
        }
        
        // Initialize Tailwind
        await window.OsliraTailwind.init();
        
        // Add page-specific Tailwind utilities if needed
        this.addPageTailwindUtilities();
        
        console.log('✅ [ScriptLoader] Tailwind initialized for page:', this.currentPage);
        
    } catch (error) {
        console.error('❌ [ScriptLoader] Tailwind initialization failed:', error);
        // Don't throw - page should work without Tailwind
    }
}

addPageTailwindUtilities() {
    // Add any page-specific Tailwind customizations
    const pageCustomizations = {
        'dashboard': () => {
            // Dashboard-specific Tailwind utilities
            console.log('🎨 [ScriptLoader] Applying dashboard Tailwind customizations');
            
            // Add dashboard-specific CSS if needed
            const customCSS = `
                .dashboard-glow {
                    @apply shadow-lg shadow-blue-500/20;
                }
                .sidebar-item-active {
                    @apply bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg;
                }
            `;
            
            this.injectCustomCSS(customCSS, 'dashboard-tailwind-utils');
        },
        
        'auth': () => {
            console.log('🎨 [ScriptLoader] Applying auth Tailwind customizations');
            // Auth-specific utilities
        },
        
        'onboarding': () => {
            console.log('🎨 [ScriptLoader] Applying onboarding Tailwind customizations');
            // Onboarding-specific utilities
        }
    };
    
    const customization = pageCustomizations[this.currentPage];
    if (customization) {
        customization();
    }
}

injectCustomCSS(cssText, id) {
    // Remove existing if present
    const existing = document.getElementById(id);
    if (existing) {
        existing.remove();
    }
    
    // Inject new CSS
    const style = document.createElement('style');
    style.id = id;
    style.textContent = cssText;
    document.head.appendChild(style);
}

// =============================================================================
// UTILITY METHODS
// =============================================================================

// Add to existing utility methods section

getTailwindStatus() {
    return {
        managerLoaded: !!window.OsliraTailwind,
        tailwindLoaded: window.OsliraTailwind?.isLoaded?.() || false,
        currentPageEnabled: this.dependencies.pages[this.currentPage]?.enableTailwind || false
    };
}

async waitForTailwind(timeout = 5000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
        if (window.OsliraTailwind?.isLoaded?.()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
}

    // =============================================================================
    // SCRIPT LOADING UTILITIES
    // =============================================================================
    
    async loadScript(scriptConfig, scriptName) {
        if (this.loadedScripts.has(scriptName)) {
            console.log(`⚡ [ScriptLoader] ${scriptName} already loaded`);
            return;
        }
        
        if (this.loadingScripts.has(scriptName)) {
            console.log(`⏳ [ScriptLoader] Waiting for ${scriptName}...`);
            return await this.loadingScripts.get(scriptName);
        }
        
        const loadPromise = this.performScriptLoad(scriptConfig, scriptName);
        this.loadingScripts.set(scriptName, loadPromise);
        
        try {
            await loadPromise;
            this.loadedScripts.add(scriptName);
            this.loadingScripts.delete(scriptName);
        } catch (error) {
            this.loadingScripts.delete(scriptName);
            console.error(`❌ [ScriptLoader] Failed to load ${scriptName}:`, error);
            if (scriptConfig.critical) {
                throw new Error(`Critical script failed: ${scriptName}`);
            }
            throw error;
        }
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
