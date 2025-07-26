// ==========================================
// BASE SECURE MODULE - Enterprise Module Foundation
// Standardized base class for all Oslira analytics modules
// ==========================================

import { setCachedData, getCachedData } from '../utils/moduleCache.js';
import { createIcon, addTooltip } from '../utils/UIHelpers.js';

/**
 * Base class for all secure analytics modules
 * Provides standardized lifecycle, error handling, and security features
 */
export class BaseSecureModule {
    constructor(container, ...services) {
        // Validate container
        if (!container) {
            throw new Error('Container element is required for module initialization');
        }
        
        // Core properties
        this.container = container;
        this.services = new Map();
        this.moduleId = container.id || this.generateModuleId();
        this.state = 'uninitialized';
        this.lastError = null;
        this.initialized = false;
        
        // Performance tracking
        this.performanceMetrics = {
            renderTime: 0,
            lastRenderTime: 0,
            totalRenders: 0,
            dataFetchTime: 0,
            totalDataFetches: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errorCount: 0
        };
        
        // Configuration with secure defaults
        this.config = {
            autoRefresh: false,
            refreshInterval: 300000, // 5 minutes
            cacheEnabled: true,
            cacheTTL: 180000, // 3 minutes
            fallbackEnabled: true,
            errorRetryAttempts: 3,
            errorRetryDelay: 2000,
            debugMode: false
        };
        
        // Event handlers for cleanup
        this.eventHandlers = new Map();
        this.timers = new Set();
        this.observers = new Set();
        
        // Security context
        this.securityContext = {
            moduleId: this.moduleId,
            containerId: container.id,
            permissions: [],
            sanitizeData: true,
            logAccess: true
        };
        
        // Register services
        this.registerServices(services);
        
        // Setup base event listeners
        this.setupBaseEventListeners();
        
        console.log(`🏗️ [${this.constructor.name}] Module initialized with ID: ${this.moduleId}`);
    }
    
    // ===== REQUIRED LIFECYCLE METHODS =====
    
    /**
     * Render the module - MUST be implemented by subclasses
     */
    async render(filters = {}) {
        throw new Error(`render() method must be implemented by ${this.constructor.name}`);
    }
    
    /**
     * Cleanup resources - MUST be implemented by subclasses
     */
    async cleanup() {
        throw new Error(`cleanup() method must be implemented by ${this.constructor.name}`);
    }
    
    /**
     * Get module information - MUST be implemented by subclasses
     */
    getModuleInfo() {
        throw new Error(`getModuleInfo() method must be implemented by ${this.constructor.name}`);
    }
    
    // ===== OPTIONAL LIFECYCLE METHODS =====
    
    /**
     * Called after successful render
     */
    async ready() {
        this.state = 'ready';
        this.initialized = true;
        console.log(`✅ [${this.constructor.name}] Module ready`);
    }
    
    /**
     * Fallback rendering when main render fails
     */
    async fallbackRender(error) {
        if (!this.config.fallbackEnabled) {
            throw error;
        }
        
        const fallbackHtml = this.generateFallbackUI(error);
        this.container.innerHTML = fallbackHtml;
        this.state = 'fallback';
        
        console.warn(`⚠️ [${this.constructor.name}] Using fallback render due to:`, error.message);
    }
    
    /**
     * Handle errors gracefully
     */
    async onError(error, context = {}) {
        this.lastError = error;
        this.performanceMetrics.errorCount++;
        this.state = 'error';
        
        // Log error with context
        this.logError(error, context);
        
        // Attempt recovery if configured
        if (this.config.errorRetryAttempts > 0) {
            await this.attemptRecovery(error, context);
        }
    }
    
    /**
     * Handle window resize events
     */
    async onResize() {
        // Default implementation - can be overridden
        if (typeof this.handleResize === 'function') {
            await this.handleResize();
        }
    }
    
    /**
     * Refresh module data
     */
    async refresh() {
        if (this.state === 'error' || !this.initialized) {
            console.warn(`⚠️ [${this.constructor.name}] Cannot refresh module in ${this.state} state`);
            return;
        }
        
        try {
            await this.render();
            console.log(`🔄 [${this.constructor.name}] Module refreshed`);
        } catch (error) {
            await this.onError(error, { operation: 'refresh' });
        }
    }
    
    // ===== SERVICE MANAGEMENT =====
    
    registerServices(services) {
        const serviceNames = ['analytics', 'claude', 'credit', 'dataWrite', 'integration'];
        
        services.forEach((service, index) => {
            if (service && index < serviceNames.length) {
                this.services.set(serviceNames[index], service);
            }
        });
    }
    
    getService(serviceName) {
    // Try multiple sources for service access
    const serviceManager = window.OsliraApp?.serviceManager;
    
    if (serviceManager && serviceManager.services) {
        const service = serviceManager.services.get(serviceName);
        if (service) {
            return service;
        }
    }
    
    // Fallback: try global services
    if (window.OsliraApp?.services?.[serviceName]) {
        return window.OsliraApp.services[serviceName];
    }
    
    console.warn(`⚠️ [${this.constructor.name}] Service ${serviceName} not found in registry`);
    throw new Error(`Service ${serviceName} not available in ${this.constructor.name}`);
}
    
    hasService(serviceName) {
        return this.services.has(serviceName);
    }
    
    // ===== SECURE DATA OPERATIONS =====
    
    async fetchSecureData(endpoint, payload = {}, options = {}) {
        const startTime = performance.now();
        
        try {
            // Check cache first if enabled
            if (this.config.cacheEnabled && !options.skipCache) {
                const cacheKey = this.generateCacheKey(endpoint, payload);
                const cachedData = getCachedData(cacheKey);
                
                if (cachedData) {
                    this.performanceMetrics.cacheHits++;
                    return cachedData;
                }
                this.performanceMetrics.cacheMisses++;
            }
            
            // Get analytics service
            const analyticsService = this.getService('analytics');
            
            // Add security context to payload
            const securePayload = {
                ...payload,
                moduleId: this.moduleId,
                securityContext: this.securityContext
            };
            
            // Make secure request
            const data = await analyticsService.makeSecureRequest(endpoint, securePayload);
            
            // Cache successful response if enabled
            if (this.config.cacheEnabled && data) {
                const cacheKey = this.generateCacheKey(endpoint, payload);
                setCachedData(cacheKey, data, this.config.cacheTTL);
            }
            
            // Update performance metrics
            const fetchTime = performance.now() - startTime;
            this.performanceMetrics.dataFetchTime = fetchTime;
            this.performanceMetrics.totalDataFetches++;
            
            return data;
            
        } catch (error) {
            const fetchTime = performance.now() - startTime;
            this.performanceMetrics.dataFetchTime = fetchTime;
            
            console.error(`❌ [${this.constructor.name}] Data fetch failed:`, error);
            throw error;
        }
    }
    
    generateCacheKey(endpoint, payload) {
        const keyData = {
            module: this.constructor.name,
            endpoint: endpoint,
            payload: this.sanitizeForCacheKey(payload)
        };
        
        return `${this.moduleId}_${btoa(JSON.stringify(keyData)).slice(0, 32)}`;
    }
    
    sanitizeForCacheKey(data) {
        // Remove sensitive data from cache key generation
        const sanitized = { ...data };
        delete sanitized.securityContext;
        delete sanitized.moduleId;
        delete sanitized.sessionToken;
        return sanitized;
    }
    
    // ===== ERROR HANDLING & RECOVERY =====
    
    logError(error, context = {}) {
        const errorData = {
            module: this.constructor.name,
            moduleId: this.moduleId,
            error: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            state: this.state
        };
        
        // Add to global error log
        if (window.OsliraApp?.errors) {
            window.OsliraApp.errors.push(errorData);
        }
        
        console.error(`❌ [${this.constructor.name}] Error:`, errorData);
    }
    
    async attemptRecovery(error, context) {
        let attempts = 0;
        const maxAttempts = this.config.errorRetryAttempts;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                console.log(`🔄 [${this.constructor.name}] Recovery attempt ${attempts}/${maxAttempts}`);
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, this.config.errorRetryDelay));
                
                // Attempt to re-render
                await this.render();
                
                console.log(`✅ [${this.constructor.name}] Recovery successful on attempt ${attempts}`);
                return true;
                
            } catch (retryError) {
                console.error(`❌ [${this.constructor.name}] Recovery attempt ${attempts} failed:`, retryError);
                
                if (attempts === maxAttempts) {
                    // Final attempt failed, try fallback
                    await this.fallbackRender(error);
                    return false;
                }
            }
        }
    }
    
    // ===== UI UTILITIES =====
    
    generateFallbackUI(error) {
        return `
            <div class="module-fallback" style="
                padding: 2rem;
                text-align: center;
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
                color: #dc2626;
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="margin-bottom: 1rem;">Module Temporarily Unavailable</h3>
                <p style="margin-bottom: 1rem; color: #6b7280;">
                    ${this.constructor.name} encountered an error and is running in fallback mode.
                </p>
                <button onclick="window.OsliraApp.analytics.getModule('${this.moduleId}')?.refresh()" 
                        style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 4px;
                            cursor: pointer;
                        ">
                    Retry
                </button>
                ${this.config.debugMode ? `
                    <details style="margin-top: 1rem; text-align: left;">
                        <summary style="cursor: pointer;">Debug Info</summary>
                        <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px; font-size: 0.875rem; overflow: auto;">
${error.message}
${error.stack}
                        </pre>
                    </details>
                ` : ''}
            </div>
        `;
    }
    
    showLoading(message = 'Loading...') {
        this.container.innerHTML = `
            <div class="module-loading" style="
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 3rem;
                color: #6b7280;
            ">
                <div style="text-align: center;">
                    <div class="spinner" style="
                        width: 2rem;
                        height: 2rem;
                        border: 2px solid #e5e7eb;
                        border-top: 2px solid #3b82f6;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1rem;
                    "></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        this.state = 'loading';
    }
    
    hideLoading() {
        const loading = this.container.querySelector('.module-loading');
        if (loading) {
            loading.remove();
        }
    }
    
    // ===== EVENT MANAGEMENT =====
    
    setupBaseEventListeners() {
        // Auto-refresh if enabled
        if (this.config.autoRefresh && this.config.refreshInterval > 0) {
            const refreshTimer = setInterval(() => {
                if (this.state === 'ready' && document.visibilityState === 'visible') {
                    this.refresh().catch(error => {
                        console.error(`❌ [${this.constructor.name}] Auto-refresh failed:`, error);
                    });
                }
            }, this.config.refreshInterval);
            
            this.timers.add(refreshTimer);
        }
    }
    
    addEventListener(element, event, handler, options = {}) {
        const boundHandler = handler.bind(this);
        element.addEventListener(event, boundHandler, options);
        
        // Store for cleanup
        const key = `${element}_${event}`;
        if (!this.eventHandlers.has(key)) {
            this.eventHandlers.set(key, []);
        }
        this.eventHandlers.get(key).push({ handler: boundHandler, options });
        
        return boundHandler;
    }
    
    removeAllEventListeners() {
        for (const [key, handlers] of this.eventHandlers) {
            const [element, event] = key.split('_');
            const elem = element === 'window' ? window : element === 'document' ? document : document.querySelector(element);
            
            if (elem) {
                handlers.forEach(({ handler, options }) => {
                    elem.removeEventListener(event, handler, options);
                });
            }
        }
        
        this.eventHandlers.clear();
    }
    
    // ===== CLEANUP & RESOURCE MANAGEMENT =====
    
    async baseCleanup() {
        console.log(`🧹 [${this.constructor.name}] Starting base cleanup...`);
        
        // Clear timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();
        
        // Clear event listeners
        this.removeAllEventListeners();
        
        // Clear observers
        this.observers.forEach(observer => {
            if (observer.disconnect) observer.disconnect();
        });
        this.observers.clear();
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Reset state
        this.state = 'cleanup';
        this.initialized = false;
        
        console.log(`✅ [${this.constructor.name}] Base cleanup completed`);
    }
    
    // ===== UTILITY METHODS =====
    
    generateModuleId() {
        return `module_${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    updatePerformanceMetrics(operation, duration) {
        if (!this.performanceMetrics[operation]) {
            this.performanceMetrics[operation] = 0;
        }
        this.performanceMetrics[operation] = duration;
    }
    
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        console.log(`🔄 [${this.constructor.name}] State changed: ${oldState} → ${newState}`);
        
        // Emit state change event
        this.container.dispatchEvent(new CustomEvent('moduleStateChange', {
            detail: { oldState, newState, moduleId: this.moduleId }
        }));
    }
    
    // ===== CONFIGURATION MANAGEMENT =====
    
    updateConfig(updates) {
        Object.assign(this.config, updates);
        console.log(`⚙️ [${this.constructor.name}] Configuration updated:`, updates);
    }
    
    getConfig(key) {
        return key ? this.config[key] : { ...this.config };
    }
}

// Add CSS for loading spinner if not already present
if (!document.getElementById('base-module-styles')) {
    const style = document.createElement('style');
    style.id = 'base-module-styles';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .module-fallback button:hover {
            background: #2563eb !important;
        }
        
        .module-loading .spinner {
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
}

console.log('🏗️ BaseSecureModule class loaded successfully');
