// =============================================================================
// SCRIPT-LOADER.JS - Universal Script Loading System
// ONE SCRIPT TO RULE THEM ALL - Handles all dependencies and loading order
// =============================================================================

(function() {
    'use strict';
    
    class OsliraScriptLoader {
        constructor() {
            this.loadedScripts = new Set();
            this.loadingPromises = new Map();
            this.config = {
                basePath: '',
                version: '1.0.0',
                environment: this.detectEnvironment(),
                retryAttempts: 3,
                retryDelay: 1000
            };
            
            this.dependencies = this.defineDependencies();
            this.currentPage = this.detectCurrentPage();
            
            console.log(`🚀 [ScriptLoader] Initializing for ${this.currentPage} page in ${this.config.environment} environment`);
        }
        
        detectEnvironment() {
            const hostname = window.location.hostname;
            if (hostname.includes('oslira.com')) return 'production';
            if (hostname.includes('osliratest') || hostname.includes('staging')) return 'staging';
            return 'development';
        }
        
        detectCurrentPage() {
            const pathname = window.location.pathname;
            
            // Map paths to page identifiers
            const pathMap = {
                '/': 'home',
                '/home': 'home',
                '/auth': 'auth',
                '/auth/': 'auth',
                '/auth/callback': 'auth-callback',
                '/dashboard': 'dashboard',
                '/dashboard/': 'dashboard',
                '/admin': 'admin',
                '/admin/': 'admin',
                '/onboarding': 'onboarding',
                '/onboarding/': 'onboarding',
                '/analytics': 'analytics',
                '/analytics/': 'analytics',
                '/settings': 'settings',
                '/settings/': 'settings',
                '/subscription': 'subscription',
                '/subscription/': 'subscription'
            };
            
            // Check exact matches first
            if (pathMap[pathname]) {
                return pathMap[pathname];
            }
            
            // Check partial matches
            for (const [path, page] of Object.entries(pathMap)) {
                if (pathname.startsWith(path) && path !== '/') {
                    return page;
                }
            }
            
            // Default fallback
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
                    'shared-legacy': {
                        url: '/core/shared-legacy.js',
                        global: 'OsliraApp',
                        critical: true
                    },
                    'app-initializer': {
                        url: '/core/app.js',
                        global: 'OsliraAppInitializer',
                        critical: true,
                        dependsOn: ['ui-manager', 'data-store', 'api-client', 'auth-manager', 'shared-legacy']
                    }
                },
                
                // =============================================================================
                // PAGE-SPECIFIC DEPENDENCIES
                // =============================================================================
                pages: {
                    'home': {
                        scripts: ['/home/home.js'],
                        styles: ['/home/home.css'],
                        requiresAuth: false
                    },
                    'auth': {
                        scripts: ['/auth/auth.js'],
                        styles: ['/auth/auth.css'],
                        requiresAuth: false
                    },
                    'auth-callback': {
                        scripts: ['/auth/callback.js'],
                        requiresAuth: false
                    },
                    'dashboard': {
                        scripts: ['/dashboard/dashboard.js'],
                        styles: ['/dashboard/dashboard.css'],
                        requiresAuth: true,
                        requiresBusiness: true
                    },
                    'admin': {
                        scripts: ['/admin/admin.js'],
                        styles: ['/admin/admin.css'],
                        requiresAuth: true,
                        requiresAdmin: true
                    },
                    'onboarding': {
                        scripts: ['/onboarding/onboarding.js'],
                        styles: ['/onboarding/onboarding.css'],
                        requiresAuth: true
                    },
                    'analytics': {
                        scripts: ['/analytics/analytics.js'],
                        styles: ['/analytics/analytics.css'],
                        requiresAuth: true,
                        requiresBusiness: true,
                        additionalLibraries: ['chart-js']
                    },
                    'settings': {
                        scripts: ['/settings/settings.js'],
                        styles: ['/settings/settings.css'],
                        requiresAuth: true
                    },
                    'subscription': {
                        scripts: ['/subscription/subscription.js'],
                        styles: ['/subscription/subscription.css'],
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
                
                // Step 3: Initialize application
                await this.initializeApplication();
                
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
                'auth-manager', 'shared-legacy', 'app-initializer'
            ];
            
            for (const scriptName of loadOrder) {
                const script = coreScripts[scriptName];
                if (!script) continue;
                
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
        }
        
        async loadPageDependencies() {
            const pageConfig = this.dependencies.pages[this.currentPage];
            if (!pageConfig) {
                console.log(`ℹ️ [ScriptLoader] No specific dependencies for page: ${this.currentPage}`);
                return;
            }
            
            console.log(`📄 [ScriptLoader] Loading dependencies for page: ${this.currentPage}`);
            
            // Load additional libraries if needed
            if (pageConfig.additionalLibraries) {
                for (const libName of pageConfig.additionalLibraries) {
                    const lib = this.dependencies.libraries[libName];
                    if (lib) {
                        await this.loadScript(lib, libName);
                    }
                }
            }
            
            // Load page styles
            if (pageConfig.styles) {
                for (const styleUrl of pageConfig.styles) {
                    await this.loadStylesheet(styleUrl);
                }
            }
            
            // Load page scripts
            if (pageConfig.scripts) {
                for (const scriptUrl of pageConfig.scripts) {
                    await this.loadScript({ url: scriptUrl }, `page-${scriptUrl}`);
                }
            }
        }
        
        // =============================================================================
        // SCRIPT LOADING UTILITIES
        // =============================================================================
        
        async loadScript(scriptConfig, name) {
            // Return existing promise if already loading
            if (this.loadingPromises.has(name)) {
                return this.loadingPromises.get(name);
            }
            
            // Return immediately if already loaded
            if (this.loadedScripts.has(name)) {
                return Promise.resolve();
            }
            
            const promise = this.doLoadScript(scriptConfig, name);
            this.loadingPromises.set(name, promise);
            
            try {
                await promise;
                this.loadedScripts.add(name);
                this.loadingPromises.delete(name);
                console.log(`✅ [ScriptLoader] Loaded: ${name}`);
            } catch (error) {
                this.loadingPromises.delete(name);
                throw error;
            }
            
            return promise;
        }
        
        async doLoadScript(scriptConfig, name) {
            return new Promise((resolve, reject) => {
                // Check if global already exists
                if (scriptConfig.global && window[scriptConfig.global]) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = scriptConfig.url;
                script.defer = true;
                
                // Add attributes
                if (scriptConfig.attributes) {
                    Object.entries(scriptConfig.attributes).forEach(([key, value]) => {
                        script.setAttribute(key, value);
                    });
                }
                
                script.onload = () => {
                    // Wait for global to be available if specified
                    if (scriptConfig.global) {
                        this.waitForGlobal(scriptConfig.global, 5000)
                            .then(resolve)
                            .catch(reject);
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
        
        async waitForGlobal(globalName, timeout = 5000) {
            const startTime = Date.now();
            
            return new Promise((resolve, reject) => {
                const check = () => {
                    if (window[globalName]) {
                        resolve();
                    } else if (Date.now() - startTime > timeout) {
                        reject(new Error(`Timeout waiting for global: ${globalName}`));
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }
        
        // =============================================================================
        // APPLICATION INITIALIZATION
        // =============================================================================
        
        async initializeApplication() {
            console.log('🎬 [ScriptLoader] Initializing application...');
            
            // Wait for DOM to be ready
            if (document.readyState !== 'complete') {
                await new Promise(resolve => {
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', resolve);
                    } else {
                        resolve();
                    }
                });
            }
            
            // Initialize app if available
            if (window.OsliraAppInitializer) {
                try {
                    const app = await window.OsliraAppInitializer.init();
                    
                    // Handle page-specific auth requirements
                    const pageConfig = this.dependencies.pages[this.currentPage];
                    if (pageConfig) {
                        if (pageConfig.requiresAuth && !await app.requireAuth()) return;
                        if (pageConfig.requiresBusiness && !await app.requireBusiness()) return;
                        if (pageConfig.requiresAdmin && !await app.requireAdmin()) return;
                    }
                    
                    console.log('✅ [ScriptLoader] Application initialized successfully');
                    
                } catch (error) {
                    console.error('❌ [ScriptLoader] Application initialization failed:', error);
                    throw error;
                }
            } else {
                console.warn('⚠️ [ScriptLoader] OsliraAppInitializer not available');
            }
        }
        
        // =============================================================================
        // ERROR HANDLING
        // =============================================================================
        
        handleLoadingError(error) {
            console.error('💥 [ScriptLoader] Critical loading error:', error);
            
            // Show user-friendly error
            this.showLoadingError(error);
            
            // Log to external service if available
            if (window.Sentry) {
                window.Sentry.captureException(error, {
                    tags: {
                        component: 'script-loader',
                        page: this.currentPage,
                        environment: this.config.environment
                    }
                });
            }
        }
        
        showLoadingError(error) {
            // Create error overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            const errorBox = document.createElement('div');
            errorBox.style.cssText = `
                background: white;
                padding: 32px;
                border-radius: 12px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            `;
            
            errorBox.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h2 style="margin-bottom: 16px; color: #1f2937;">Loading Failed</h2>
                <p style="color: #6b7280; margin-bottom: 24px;">
                    The application failed to load properly. This might be due to network issues or browser compatibility.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="window.location.reload()" style="
                        background: #2D6CDF;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Retry</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                        background: #6B7280;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Dismiss</button>
                </div>
                <details style="margin-top: 24px; text-align: left;">
                    <summary style="cursor: pointer; color: #6b7280;">Technical Details</summary>
                    <pre style="
                        background: #f3f4f6;
                        padding: 12px;
                        border-radius: 6px;
                        margin-top: 8px;
                        font-size: 12px;
                        overflow: auto;
                        max-height: 200px;
                    ">${error.message}\n${error.stack || ''}</pre>
                </details>
            `;
            
            overlay.appendChild(errorBox);
            document.body.appendChild(overlay);
        }
    }
    
    // =============================================================================
    // AUTO-INITIALIZATION
    // =============================================================================
    
    // Create and start the loader immediately
    const loader = new OsliraScriptLoader();
    
    // Start loading process
    loader.loadAll().catch(error => {
        console.error('💥 [ScriptLoader] Fatal error during initialization:', error);
    });
    
    // Make loader available globally for debugging
    window.OsliraScriptLoader = loader;
    
})();
