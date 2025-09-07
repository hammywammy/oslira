// =============================================================================
// SCRIPT LOADER - CLEAN CSS-FREE VERSION
// Handles JS loading only, CSS handled by Tailwind build process
// =============================================================================

class ScriptLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.currentPage = null;
        this.environment = null;
        this.isInitialized = false;
        
        // Core system scripts that must load first
        this.coreScripts = {
            'env-manager': {
                url: '/core/env-manager.js',
                global: 'OsliraEnv',
                critical: true
            },
            
            'config-manager': {
                url: '/core/config-manager.js', 
                global: 'ConfigManager',
                critical: true
            },
            
            'api-client': {
                url: '/core/api-client.js',
                global: 'APIClient',
                critical: true
            },
            
            'auth-manager': {
                url: '/core/auth-manager.js',
                global: 'SimpleAuth',
                critical: true
            },
            
            'simple-app': {
                url: '/core/simple-app.js',
                global: 'OsliraApp',
                critical: true
            }
        };
        
        // Page-specific script configurations
        this.pages = {
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
                requiresAuth: true,
                enableTailwind: true
            },
            
            'home': {
                scripts: ['/pages/home/home.js', '/core/footer/footer-manager.js'],
                requiresAuth: false,
                enableTailwind: true
            },
            
            'onboarding': {
                scripts: ['/pages/onboarding/onboarding.js'],
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
            }
        };
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ [ScriptLoader] Already initialized');
            return;
        }

        console.log('🚀 [ScriptLoader] Initializing...');

        try {
            // Load core system scripts first
            await this.loadCoreScripts();
            
            // Detect current page
            this.currentPage = this.detectCurrentPage();
            console.log(`📄 [ScriptLoader] Current page: ${this.currentPage}`);
            
            // Load Tailwind CSS first for pages that need it
            await this.loadTailwindCSS();
            
            // Load page-specific scripts
            await this.loadPageScripts();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Dispatch loaded event
            this.dispatchLoadedEvent();
            
            console.log('✅ [ScriptLoader] Initialization complete');
            
        } catch (error) {
            console.error('❌ [ScriptLoader] Initialization failed:', error);
            throw error;
        }
    }

    // =============================================================================
    // CORE SCRIPT LOADING
    // =============================================================================
    
    async loadCoreScripts() {
        console.log('🔧 [ScriptLoader] Loading core scripts...');
        
        // Load core scripts in dependency order
        const coreOrder = ['env-manager', 'config-manager', 'api-client', 'auth-manager', 'simple-app'];
        
        for (const scriptName of coreOrder) {
            const script = this.coreScripts[scriptName];
            if (script) {
                await this.loadScript(script, scriptName);
                
                // Verify global is available
                if (script.global && !window[script.global]) {
                    throw new Error(`Critical script ${scriptName} failed to expose global ${script.global}`);
                }
            }
        }
        
        console.log('✅ [ScriptLoader] Core scripts loaded');
    }

    // =============================================================================
    // PAGE DETECTION
    // =============================================================================
    
    detectCurrentPage() {
        // Use env manager if available
        if (window.OsliraEnv && window.OsliraEnv.getCurrentPage) {
            return window.OsliraEnv.getCurrentPage();
        }
        
        // Fallback detection
        const path = window.location.pathname;
        
        // Page mapping
        const pageMap = {
            '/': 'home',
            '/index.html': 'home',
            '/home': 'home',
            '/auth': 'auth',
            '/auth/': 'auth',
            '/dashboard': 'dashboard',
            '/onboarding': 'onboarding',
            '/analytics': 'analytics',
            '/campaigns': 'campaigns',
            '/leads': 'leads',
            '/settings': 'settings',
            '/subscription': 'subscription'
        };
        
        return pageMap[path] || 'home';
    }

    // =============================================================================
    // TAILWIND CSS LOADING
    // =============================================================================
    
    async loadTailwindCSS() {
        const pageConfig = this.pages[this.currentPage];
        
        if (!pageConfig || !pageConfig.enableTailwind) {
            console.log(`📄 [ScriptLoader] Page ${this.currentPage} does not use Tailwind`);
            return;
        }
        
        console.log('🎨 [ScriptLoader] Loading Tailwind CSS...');
        
        // Check if Tailwind CSS is already loaded
        const existingLink = document.querySelector('link[href="/assets/css/tailwind.css"]');
        if (existingLink) {
            console.log('✅ [ScriptLoader] Tailwind CSS already loaded');
            return;
        }
        
        // Load Tailwind CSS
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/assets/css/tailwind.css';
            link.id = 'tailwind-css';
            
            link.onload = () => {
                console.log('✅ [ScriptLoader] Tailwind CSS loaded successfully');
                resolve();
            };
            
            link.onerror = (error) => {
                console.error('❌ [ScriptLoader] Failed to load Tailwind CSS:', error);
                reject(new Error('Tailwind CSS failed to load'));
            };
            
            document.head.appendChild(link);
        });
    }

    // =============================================================================
    // PAGE SCRIPT LOADING
    // =============================================================================
    
    async loadPageScripts() {
        const pageConfig = this.pages[this.currentPage];
        
        if (!pageConfig) {
            console.log(`📄 [ScriptLoader] No configuration for page: ${this.currentPage}`);
            return;
        }
        
        console.log(`📄 [ScriptLoader] Loading scripts for page: ${this.currentPage}`);
        
        // Check authentication requirements
        if (pageConfig.requiresAuth && window.OsliraAuth && !window.OsliraAuth.isAuthenticated()) {
            console.log('🔒 [ScriptLoader] Page requires authentication, redirecting...');
            window.location.href = '/auth';
            return;
        }
        
        // Load page scripts
        const scripts = pageConfig.scripts || [];
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
        
        console.log(`✅ [ScriptLoader] Page scripts loaded: ${this.currentPage}`);
    }

    // =============================================================================
    // SCRIPT LOADING UTILITIES
    // =============================================================================
    
    async loadScript(script, name) {
        return new Promise((resolve, reject) => {
            // Skip if already loaded
            if (this.loadedScripts.has(name)) {
                console.log(`⚠️ [ScriptLoader] Script already loaded: ${name}`);
                resolve();
                return;
            }
            
            // Handle script URL
            const scriptUrl = script.src || script.url || script;
            const scriptId = script.id || name;
            const normalizedUrl = scriptUrl.startsWith('/') ? scriptUrl : `/${scriptUrl}`;
            
            console.log(`📦 [ScriptLoader] Loading script: ${name} from ${normalizedUrl}`);
            
            // Create script element
            const scriptElement = document.createElement('script');
            scriptElement.src = normalizedUrl;
            scriptElement.id = scriptId;
            scriptElement.async = true;
            
            // Handle load success
            scriptElement.onload = () => {
                console.log(`✅ [ScriptLoader] ${name} loaded successfully`);
                this.loadedScripts.add(name);
                resolve();
            };
            
            // Handle load error
            scriptElement.onerror = (error) => {
                console.error(`❌ [ScriptLoader] Failed to load script ${name}:`, error);
                if (script.critical) {
                    reject(new Error(`Critical script failed: ${name}`));
                } else {
                    console.warn(`⚠️ [ScriptLoader] Non-critical script failed, continuing: ${name}`);
                    resolve();
                }
            };
            
            // Add to document
            document.head.appendChild(scriptElement);
        });
    }

    // =============================================================================
    // EVENT DISPATCHING
    // =============================================================================
    
    dispatchLoadedEvent() {
        const event = new CustomEvent('oslira:scripts:loaded', {
            detail: {
                page: this.currentPage,
                loadedScripts: Array.from(this.loadedScripts),
                timestamp: Date.now()
            }
        });
        
        window.dispatchEvent(event);
        console.log('📡 [ScriptLoader] Dispatched scripts loaded event');
    }

    // =============================================================================
    // PUBLIC API
    // =============================================================================
    
    isScriptLoaded(name) {
        return this.loadedScripts.has(name);
    }
    
    getCurrentPage() {
        return this.currentPage;
    }
    
    getLoadedScripts() {
        return Array.from(this.loadedScripts);
    }
    
    async reloadPageScripts() {
        console.log('🔄 [ScriptLoader] Reloading page scripts...');
        await this.loadPageScripts();
    }
}

// =============================================================================
// GLOBAL INITIALIZATION
// =============================================================================

// Create global script loader instance
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

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScriptLoader;
}
