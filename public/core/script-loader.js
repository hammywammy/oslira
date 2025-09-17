// =============================================================================
// SCRIPT LOADER - CENTRALIZED DEPENDENCY MANAGEMENT
// =============================================================================

// Prevent multiple declarations
if (typeof window.ScriptLoader !== 'undefined') {
    console.log('🔄 [ScriptLoader] Already loaded, skipping redeclaration');
} else {

class ScriptLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.failedScripts = new Set();
        this.loadingPromises = new Map();
        
        // Core script loading order (must load in sequence)
this.coreScripts = [
            'env-manager',
            'timing-manager',  // Add this
            'supabase',
            'config-manager', 
            'auth-manager',
            'simple-app'
        ];
        // Page-specific script configurations
        this.pageConfigs = {
'dashboard': {
  scripts: [
    '/core/sidebar/sidebar-manager.js',

    // core
    '/pages/dashboard/modules/core/DashboardCore.js',
    '/pages/dashboard/modules/core/DashboardErrorSystem.js',
    '/pages/dashboard/modules/core/DashboardEventSystem.js',
    '/pages/dashboard/modules/core/dashboard-app.js',
    '/pages/dashboard/modules/core/dependency-container.js',
    '/pages/dashboard/modules/core/event-bus.js',
    '/pages/dashboard/modules/core/state-manager.js',

    // analysis
    '/pages/dashboard/modules/analysis/analysis-functions.js',
    '/pages/dashboard/modules/analysis/analysis-modal.js',
    '/pages/dashboard/modules/analysis/analysis-queue.js',

    // bulk
    '/pages/dashboard/modules/bulk/bulk-upload.js',

    // business
    '/pages/dashboard/modules/business/business-manager.js',

    // handlers
    '/pages/dashboard/modules/handlers/lead-analysis-handlers.js',
    '/pages/dashboard/modules/handlers/research-handlers.js',

    // leads
    '/pages/dashboard/modules/leads/lead-manager.js',
    '/pages/dashboard/modules/leads/lead-renderer.js',

    // modals
    '/pages/dashboard/modules/modals/lead-analysis-modal.js',
    '/pages/dashboard/modules/modals/research-modal.js',

    // realtime
    '/pages/dashboard/modules/realtime/realtime-manager.js',

    // stats
    '/pages/dashboard/modules/stats/stats-calculator.js',

    // ui
    '/pages/dashboard/modules/ui/dashboard-header.js',
    '/pages/dashboard/modules/ui/dashboard-styles.js',
    '/pages/dashboard/modules/ui/insights-panel.js',
    '/pages/dashboard/modules/ui/leads-table.js',
    '/pages/dashboard/modules/ui/modal-manager.js',
    '/pages/dashboard/modules/ui/stats-cards.js',

    // entrypoints
    '/pages/dashboard/modules/analysis/analysis-queue.js',
    '/pages/dashboard/dashboard.js'
  ],

                requiresAuth: true,
                enableTailwind: true
            },
            
            'home': {
                scripts: ['/pages/home/home.js', '/core/footer/footer-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'onboarding': {
                scripts: [
                    '/core/api-client.js',
                    '/core/form-manager.js',
                    '/pages/onboarding/onboarding-rules.js',
                    '/pages/onboarding/onboarding-validator.js', 
                    '/pages/onboarding/onboarding.js'
                ],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'auth': {
                scripts: ['/pages/auth/auth.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'analytics': {
                scripts: ['/pages/analytics/analytics.js'],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'campaigns': {
                scripts: ['/pages/campaigns/campaigns.js'],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'leads': {
                scripts: ['/pages/leads/leads.js'],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'settings': {
                scripts: ['/pages/settings/settings.js'],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'subscription': {
                scripts: ['/pages/subscription/subscription.js'],
                requiresAuth: true,
                enableTailwind: true
            },
            
            'about': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'pricing': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'case-studies': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'help': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'security-page': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'privacy': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'terms': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'refund': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'status': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'disclaimer': {
                scripts: ['/core/footer/footer-manager.js', '/core/header/header-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            }
        };
    }
    
    // =============================================================================
    // MAIN INITIALIZATION
    // =============================================================================
    
    async initialize() {
        try {
            console.log('🚀 [ScriptLoader] Initializing...');
            
            // Load core scripts first
            await this.loadCoreScripts();
            
            // Determine current page and load page-specific scripts
            const currentPage = window.OsliraEnv?.CURRENT_PAGE || 'home';
            console.log(`📄 [ScriptLoader] Loading scripts for page: ${currentPage}`);
            
            await this.loadPageScripts(currentPage);
            
            console.log('✅ [ScriptLoader] Initialization complete');
            
            // Ensure event dispatches after a minimal delay to allow all scripts to settle
            setTimeout(() => {
                const scriptsLoadedEvent = new CustomEvent('oslira:scripts:loaded', {
                    detail: {
                        page: currentPage,
                        loadedScripts: Array.from(this.loadedScripts),
                        timestamp: Date.now()
                    }
                });
                window.dispatchEvent(scriptsLoadedEvent);
                console.log('📡 [ScriptLoader] oslira:scripts:loaded event dispatched');
            }, 50);
            
        } catch (error) {
            console.error('❌ [ScriptLoader] Initialization failed:', error);
            this.handleInitializationError(error);
        }
    }
    
    // =============================================================================
    // CORE SCRIPT LOADING
    // =============================================================================
    
    async loadCoreScripts() {
        console.log('🔧 [ScriptLoader] Loading core scripts...');
        
        for (const scriptName of this.coreScripts) {
            let scriptPath;
            
            // Handle external CDN scripts
            if (scriptName === 'supabase') {
                scriptPath = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            } else {
                scriptPath = `/core/${scriptName}.js`;
            }
            
            try {
                await this.loadScript(scriptName, scriptPath);
                
                // Verify the script exposed its global object
                const globalName = this.getGlobalName(scriptName);
                if (globalName && !window[globalName]) {
                    throw new Error(`Critical script ${scriptName} failed to expose global ${globalName}`);
                } else if (scriptName === 'supabase' && !window.supabase?.createClient) {
                    throw new Error('Supabase CDN failed to expose createClient function');
                }
                
                // Give each core script time to initialize
                await this.wait(100);
                
            } catch (error) {
                console.error(`❌ [ScriptLoader] Core script ${scriptName} failed:`, error);
                throw error;
            }
        }
    }
    
    getGlobalName(scriptName) {
        const globalMap = {
            'env-manager': 'OsliraEnv',
            'supabase': null, // Supabase CDN doesn't expose a simple global - will check differently
            'config-manager': 'OsliraConfig', 
            'auth-manager': 'OsliraAuth'
        };
        return globalMap[scriptName];
    }
    
    // =============================================================================
    // PAGE SCRIPT LOADING
    // =============================================================================
    
async loadPageScripts(pageName) {
        console.log(`📄 [ScriptLoader] Loading scripts for page: ${pageName}`);
        
        const pageConfig = this.pageConfigs[pageName];
        if (!pageConfig) {
            console.warn(`⚠️ [ScriptLoader] No configuration found for page: ${pageName}`);
            return;
        }
        
        console.log(`📦 [ScriptLoader] Loading ${pageConfig.scripts.length} scripts for ${pageName}`);
        
        // Load timing manager first for centralized control
        await this.loadScript('timing-manager', 'public/core/timing-manager.js');
        
        // Load sidebar for authenticated pages
        if (pageConfig.requiresAuth && pageName !== 'auth' && pageName !== 'onboarding') {
            await this.loadScript('sidebar-manager', '/core/sidebar/sidebar-manager.js');
        }
        
        // Load stylesheets for this page FIRST
        if (pageConfig.stylesheets) {
            const stylesheetPromises = pageConfig.stylesheets.map(async (stylePath) => {
                const styleName = this.extractScriptName(stylePath);
                return this.loadStylesheet(styleName, stylePath).catch(error => {
                    console.warn(`⚠️ [ScriptLoader] Stylesheet ${styleName} failed, continuing without it`);
                });
            });
                
            try {
                await Promise.all(stylesheetPromises);
                console.log(`✅ [ScriptLoader] All stylesheets loaded for ${pageName}`);
            } catch (error) {
                console.error(`❌ [ScriptLoader] Failed to load stylesheets for ${pageName}:`, error);
            }
        }
        
        // Load page scripts in parallel
        const loadPromises = pageConfig.scripts.map(async (scriptPath) => {
            const scriptName = this.extractScriptName(scriptPath);
            return this.loadScript(scriptName, scriptPath);
        });
        
        try {
            await Promise.all(loadPromises);
            console.log(`✅ [ScriptLoader] All scripts loaded for ${pageName}`);
        } catch (error) {
            console.error(`❌ [ScriptLoader] Failed to load scripts for ${pageName}:`, error);
            throw error;
        }
        
// CRITICAL: Initialize API client after all scripts are loaded
if (pageConfig.scripts.includes('/core/api-client.js')) {
    await this.initializeApiClient();
}
    }
    
    // =============================================================================
    // API CLIENT INITIALIZATION  
    // =============================================================================
    
async initializeApiClient() {
    // Ensure dependencies are available
    if (!window.OsliraConfig || !window.OsliraAuth) {
        console.error('❌ [ScriptLoader] Cannot initialize API client - missing dependencies');
        return;
    }
    
    try {
        // Wait for config to be fully loaded
        const configObj = await window.OsliraConfig.getConfig();
        
        console.log('🔍 [ScriptLoader] Raw config object:', {
            configObj: configObj,
            keys: Object.keys(configObj),
            workerUrl: configObj.workerUrl,
            WORKER_URL: configObj.WORKER_URL
        });
        
        console.log('🔍 [ScriptLoader] Environment details:', {
            envWorkerUrl: window.OsliraEnv?.WORKER_URL,
            envConfig: window.OsliraEnv
        });
        
        // Create API client instance with proper dependencies
        window.OsliraApiClient = new window.OsliraApiClient(
            configObj, 
            window.OsliraAuth
        );
        
        console.log('✅ [ScriptLoader] API client initialized successfully');
        
    } catch (error) {
        console.error('❌ [ScriptLoader] API client initialization failed:', error);
    }
}
    
    extractScriptName(scriptPath) {
        return scriptPath.split('/').pop().replace('.js', '');
    }
    
    // =============================================================================
    // SCRIPT LOADING UTILITIES
    // =============================================================================
    
    async loadScript(name, src) {
        // Check if already loaded
        if (this.loadedScripts.has(name)) {
            return;
        }
        
        // Check if already loading
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        // Check if previously failed
        if (this.failedScripts.has(name)) {
            console.warn(`⚠️  [ScriptLoader] Skipping previously failed script: ${name}`);
            return;
        }
        
        console.log(`📦 [ScriptLoader] Loading script: ${name} from ${src}`);
        
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
                console.log(`✅ [ScriptLoader] ${name} loaded successfully`);
                this.loadedScripts.add(name);
                this.loadingPromises.delete(name);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`❌ [ScriptLoader] Failed to load ${name} from ${src}`);
                this.failedScripts.add(name);
                this.loadingPromises.delete(name);
                reject(new Error(`Failed to load script: ${name}`));
            };
            
            document.head.appendChild(script);
        });
        
        this.loadingPromises.set(name, promise);
        return promise;
    }
    
    async loadStylesheet(name, href) {
        // Check if already loaded
        if (this.loadedScripts.has(name)) {
            return;
        }
        
        console.log(`🎨 [ScriptLoader] Loading stylesheet: ${name} from ${href}`);
        
        const promise = new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            
            link.onload = () => {
                console.log(`✅ [ScriptLoader] ${name} stylesheet loaded`);
                this.loadedScripts.add(name);
                resolve();
            };
            
            link.onerror = () => {
                console.error(`❌ [ScriptLoader] Failed to load stylesheet ${name}`);
                reject(new Error(`Failed to load stylesheet: ${name}`));
            };
            
            document.head.appendChild(link);
        });
        
        return promise;
    }
    
    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    
    handleInitializationError(error) {
        console.error('🚨 [ScriptLoader] Critical initialization error:', error);
        
        // Show user-friendly error message
        this.showErrorMessage(
            'Application Loading Error',
            'There was a problem loading the application. Please refresh the page to try again.'
        );
    }
    
    showErrorMessage(title, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed inset-0 bg-red-50 flex items-center justify-center z-50';
        errorDiv.innerHTML = `
            <div class="text-center p-8 max-w-md">
                <div class="text-red-500 text-6xl mb-4">⚠️</div>
                <h2 class="text-xl font-semibold text-gray-900 mb-2">${title}</h2>
                <p class="text-gray-600 mb-6">${message}</p>
                <button onclick="window.location.reload()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Refresh Page
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
    
    // =============================================================================
    // UTILITIES
    // =============================================================================
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // =============================================================================
    // PUBLIC DEBUG API
    // =============================================================================
    
    getLoadedScripts() {
        return Array.from(this.loadedScripts);
    }
    
    getFailedScripts() {
        return Array.from(this.failedScripts);
    }
    
    async reloadScript(name) {
        this.loadedScripts.delete(name);
        this.failedScripts.delete(name);
        this.loadingPromises.delete(name);
        
        const pageConfig = this.pageConfigs[window.OsliraEnv?.CURRENT_PAGE];
        const scriptPath = pageConfig?.scripts.find(path => path.includes(name));
        
        if (scriptPath) {
            await this.loadScript(name, scriptPath);
        } else {
            console.error(`Script ${name} not found in current page configuration`);
        }
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Create global instance
window.ScriptLoader = new ScriptLoader();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.ScriptLoader.initialize();
        } catch (error) {
            console.error('❌ [ScriptLoader] Failed to initialize:', error);
        }
    });
} else {
    // DOM already loaded
    setTimeout(async () => {
        try {
            await window.ScriptLoader.initialize();
        } catch (error) {
            console.error('❌ [ScriptLoader] Failed to initialize:', error);
        }
    }, 0);
}

// Debug utilities for development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('staging')) {
    window.debugScriptLoader = {
        getLoaded: () => window.ScriptLoader.getLoadedScripts(),
        getFailed: () => window.ScriptLoader.getFailedScripts(),
        reload: (name) => window.ScriptLoader.reloadScript(name),
        instance: () => window.ScriptLoader
    };
}

} // End of ScriptLoader class declaration check
