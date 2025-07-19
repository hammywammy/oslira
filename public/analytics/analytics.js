// ==========================================
// ENHANCED ANALYTICS DASHBOARD - ENTERPRISE GRADE v3.3.0
// Secure Worker-First Architecture with AI-Powered Diagnostics
// ==========================================

// ===== IMPORT STATEMENTS (GROUPED & ALPHABETIZED) =====

// Core Services
import { SecureAnalyticsService } from './services/secureAnalyticsService.js';
import { SecureClaudeService } from './services/secureClaudeService.js';
import { SecureCreditService } from './services/secureCreditService.js';
import { SecureDataWriteService } from './services/secureDataWriteService.js';
import { SecureIntegrationService } from './services/secureIntegrationService.js';

// Analytics Modules
import { SecureCTAEffectivenessTracker } from './modules/secureCTAEffectivenessTracker.js';
import { SecureClaudeGuidanceHistory } from './modules/secureClaudeGuidanceHistory.js';
import { SecureCRMPerformanceComparator } from './modules/secureCRMPerformanceComparator.js';
import { SecureFeedbackSignalExplorer } from './modules/secureFeedbackSignalExplorer.js';
import { SecureLeadConversionHeatmap } from './modules/secureLeadConversionHeatmap.js';
import { SecureMessageIterationROITracker } from './modules/secureMessageIterationROITracker.js';
import { SecureMessageRiskClassifier } from './modules/secureMessageRiskClassifier.js';
import { SecureMessageStyleMatrix } from './modules/secureMessageStyleMatrix.js';
import { SecureOutreachTimelineOverlay } from './modules/secureOutreachTimelineOverlay.js';
import { SecureTeamImpactDashboard } from './modules/secureTeamImpactDashboard.js';
import { InsightsPanel } from './modules/InsightsPanel.js';
import { QuickSummaryPanel } from './modules/QuickSummaryPanel.js';
import { ModuleNavSidebar } from './modules/ModuleNavSidebar.js';

// Configuration & Constants
import { SECURE_ANALYTICS_CONFIG, SecureAnalyticsConfigManager } from './config/secureAnalyticsConfig.js';
import { setCachedData, getCachedData, clearAllCachedData } from './utils/moduleCache.js';
import { createIcon, addTooltip, formatNumber } from './utils/UIHelpers.js';

// ===== GLOBAL STATE INITIALIZATION =====

const APP_VERSION = '3.3.0';
const MODULE_LIFECYCLE_VERSION = '2.0.0';

// Initialize global Oslira namespace with proper structure
if (!window.OsliraApp) window.OsliraApp = {};
if (!window.OsliraApp.modules) window.OsliraApp.modules = new Map();
if (!window.OsliraApp.services) window.OsliraApp.services = new Map();
if (!window.OsliraApp.config) window.OsliraApp.config = {};
if (!window.OsliraApp.performance) window.OsliraApp.performance = new Map();
if (!window.OsliraApp.errors) window.OsliraApp.errors = [];

// Version tracking
window.OsliraApp.version = APP_VERSION;
window.OsliraApp.moduleLifecycleVersion = MODULE_LIFECYCLE_VERSION;

// Initialization state
let isInitialized = false;
let initializationPromise = null;

// ===== STANDARDIZED MODULE LIFECYCLE INTERFACE =====

class StandardModuleLifecycle {
    constructor() {
        this.requiredMethods = ['render', 'cleanup', 'getModuleInfo'];
        this.optionalMethods = ['ready', 'fallbackRender', 'onError', 'onResize'];
        this.lifecycleStates = ['uninitialized', 'initializing', 'ready', 'error', 'cleanup'];
    }

    validateModule(moduleInstance, moduleName) {
        const errors = [];
        
        // Check required methods
        for (const method of this.requiredMethods) {
            if (typeof moduleInstance[method] !== 'function') {
                errors.push(`Missing required method: ${method}`);
            }
        }
        
        // Check if module has proper constructor signature
        if (!moduleInstance.container) {
            errors.push('Module must have container property');
        }
        
        if (errors.length > 0) {
            throw new Error(`Module ${moduleName} validation failed: ${errors.join(', ')}`);
        }
        
        return true;
    }

    async executeLifecycleMethod(moduleInstance, methodName, ...args) {
        const startTime = performance.now();
        
        try {
            if (typeof moduleInstance[methodName] === 'function') {
                const result = await moduleInstance[methodName](...args);
                const duration = performance.now() - startTime;
                
                this.logPerformance(moduleInstance.constructor.name, methodName, duration);
                return result;
            }
        } catch (error) {
            const duration = performance.now() - startTime;
            this.logError(moduleInstance.constructor.name, methodName, error, duration);
            throw error;
        }
    }

    logPerformance(moduleName, method, duration) {
        if (!window.OsliraApp.performance.has(moduleName)) {
            window.OsliraApp.performance.set(moduleName, {});
        }
        
        const modulePerf = window.OsliraApp.performance.get(moduleName);
        if (!modulePerf[method]) {
            modulePerf[method] = { calls: 0, totalTime: 0, avgTime: 0 };
        }
        
        modulePerf[method].calls++;
        modulePerf[method].totalTime += duration;
        modulePerf[method].avgTime = modulePerf[method].totalTime / modulePerf[method].calls;
        
        if (duration > 1000) {
            console.warn(`⚠️ Slow ${method} in ${moduleName}: ${duration.toFixed(2)}ms`);
        }
    }

    logError(moduleName, method, error, duration) {
        const errorData = {
            module: moduleName,
            method: method,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            duration: duration
        };
        
        window.OsliraApp.errors.push(errorData);
        console.error(`❌ Error in ${moduleName}.${method}:`, error);
        
        // Keep only last 100 errors to prevent memory bloat
        if (window.OsliraApp.errors.length > 100) {
            window.OsliraApp.errors = window.OsliraApp.errors.slice(-100);
        }
    }
}

// ===== SECURE SERVICE INITIALIZATION SYSTEM =====

class SecureServiceManager {
    constructor() {
        this.services = new Map();
        this.initializationOrder = [
            'config',
            'analytics',
            'credit', 
            'claude',
            'dataWrite',
            'integration'
        ];
        this.retryAttempts = 3;
        this.retryDelay = 2000;
    }

    async initializeAllServices() {
        console.log('🔧 [Services] Starting secure service initialization...');
        
        const startTime = performance.now();
        const results = new Map();
        
        for (const serviceName of this.initializationOrder) {
            try {
                const service = await this.initializeServiceWithRetry(serviceName);
                this.services.set(serviceName, service);
                results.set(serviceName, { status: 'success', service });
                console.log(`✅ [Services] ${serviceName} initialized successfully`);
            } catch (error) {
                results.set(serviceName, { status: 'failed', error });
                console.error(`❌ [Services] ${serviceName} failed:`, error);
                
                // For critical services, halt initialization
                if (['config', 'analytics'].includes(serviceName)) {
                    throw new Error(`Critical service ${serviceName} failed: ${error.message}`);
                }
            }
        }
        
        // Store services globally for module access
        window.OsliraApp.services = this.services;
        
        const totalTime = performance.now() - startTime;
        console.log(`🎯 [Services] Initialization complete in ${totalTime.toFixed(2)}ms`);
        
        return results;
    }

    async initializeServiceWithRetry(serviceName) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await this.createService(serviceName);
            } catch (error) {
                lastError = error;
                
                if (attempt < this.retryAttempts) {
                    console.warn(`⚠️ [Services] ${serviceName} attempt ${attempt} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }
        
        throw new Error(`Service ${serviceName} failed after ${this.retryAttempts} attempts: ${lastError.message}`);
    }

    async createService(serviceName) {
        const serviceConfig = window.OsliraApp.config;
        
        switch (serviceName) {
            case 'config':
                return new SecureAnalyticsConfigManager();
                
            case 'analytics':
                const analyticsService = new SecureAnalyticsService();
                // Add health check method
                analyticsService.healthCheck = async () => {
                    try {
                        const startTime = Date.now();
                        await analyticsService.makeSecureRequest('/health', {});
                        const responseTime = Date.now() - startTime;
                        return { healthy: true, responseTime };
                    } catch (error) {
                        return { healthy: false, error: error.message };
                    }
                };
                return analyticsService;
                
            case 'claude':
                const claudeService = new SecureClaudeService();
                // Add AI analysis methods
                claudeService.analyzeError = async (diagnosticPayload) => {
                    return await claudeService.makeSecureRequest('/ai/error-analysis', diagnosticPayload);
                };
                claudeService.summarizeInsights = async (insights) => {
                    return await claudeService.makeSecureRequest('/ai/insight-summary', insights);
                };
                return claudeService;
                
            case 'credit':
                return new SecureCreditService();
                
            case 'dataWrite':
                return new SecureDataWriteService();
                
            case 'integration':
                return new SecureIntegrationService();
                
            default:
                throw new Error(`Unknown service: ${serviceName}`);
        }
    }

    getService(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Service ${serviceName} not found or not initialized`);
        }
        return service;
    }

    async healthCheckAll() {
        const results = new Map();
        
        for (const [serviceName, service] of this.services) {
            try {
                if (typeof service.healthCheck === 'function') {
                    results.set(serviceName, await service.healthCheck());
                } else {
                    results.set(serviceName, { healthy: true, message: 'No health check available' });
                }
            } catch (error) {
                results.set(serviceName, { healthy: false, error: error.message });
            }
        }
        
        return results;
    }
}

// ===== ENHANCED CONTAINER REGISTRY SYSTEM =====

class ContainerRegistry {
    constructor() {
        this.containers = new Map();
        this.moduleDefinitions = new Map();
        this.initializationQueue = [];
        this.observer = null;
    }

    registerContainer(containerId, moduleConfig) {
        if (!containerId || !moduleConfig) {
            throw new Error('Container ID and module config are required');
        }
        
        this.containers.set(containerId, {
            config: moduleConfig,
            element: null,
            module: null,
            state: 'registered',
            lastError: null,
            retryCount: 0
        });
        
        console.log(`📦 [Registry] Container registered: ${containerId}`);
    }

    async discoverContainers() {
        // Auto-discover containers with data-module attributes
        const elements = document.querySelectorAll('[data-module]');
        
        for (const element of elements) {
            const moduleName = element.dataset.module;
            const containerId = element.id || `auto-${moduleName}-${Date.now()}`;
            
            if (!element.id) {
                element.id = containerId;
            }
            
            if (!this.containers.has(containerId)) {
                this.registerContainer(containerId, {
                    moduleName: moduleName,
                    autoDiscovered: true
                });
            }
        }
        
        console.log(`🔍 [Registry] Discovered ${elements.length} containers`);
    }

    async initializeAllContainers() {
        console.log('🏗️ [Registry] Initializing all containers...');
        
        const results = new Map();
        
        for (const [containerId, containerData] of this.containers) {
            try {
                await this.initializeContainer(containerId);
                results.set(containerId, { status: 'success' });
            } catch (error) {
                results.set(containerId, { status: 'failed', error });
                console.error(`❌ [Registry] Container ${containerId} failed:`, error);
            }
        }
        
        return results;
    }

    async initializeContainer(containerId) {
        const containerData = this.containers.get(containerId);
        if (!containerData) {
            throw new Error(`Container ${containerId} not found`);
        }
        
        // Find DOM element
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`DOM element not found for container ${containerId}`);
        }
        
        containerData.element = element;
        containerData.state = 'initializing';
        
        // Get module definition
        const moduleConfig = containerData.config;
        const ModuleClass = this.getModuleClass(moduleConfig.moduleName);
        
        if (!ModuleClass) {
            throw new Error(`Module class not found: ${moduleConfig.moduleName}`);
        }
        
        // Get required services
        const services = this.getRequiredServices(moduleConfig.services || []);
        
        // Create module instance
        const moduleInstance = new ModuleClass(element, ...services);
        
        // Validate module lifecycle compliance
        const lifecycle = new StandardModuleLifecycle();
        lifecycle.validateModule(moduleInstance, moduleConfig.moduleName);
        
        // Store module instance
        containerData.module = moduleInstance;
        containerData.state = 'initialized';
        
        // Add to global registry
        window.OsliraApp.modules.set(containerId, moduleInstance);
        
        console.log(`✅ [Registry] Container ${containerId} initialized with ${moduleConfig.moduleName}`);
        
        return moduleInstance;
    }

    getModuleClass(moduleName) {
        const moduleMap = {
            'InsightsPanel': InsightsPanel,
            'QuickSummaryPanel': QuickSummaryPanel,
            'ModuleNavSidebar': ModuleNavSidebar,
            'SecureCTAEffectivenessTracker': SecureCTAEffectivenessTracker,
            'SecureClaudeGuidanceHistory': SecureClaudeGuidanceHistory,
            'SecureCRMPerformanceComparator': SecureCRMPerformanceComparator,
            'SecureFeedbackSignalExplorer': SecureFeedbackSignalExplorer,
            'SecureLeadConversionHeatmap': SecureLeadConversionHeatmap,
            'SecureMessageIterationROITracker': SecureMessageIterationROITracker,
            'SecureMessageRiskClassifier': SecureMessageRiskClassifier,
            'SecureMessageStyleMatrix': SecureMessageStyleMatrix,
            'SecureOutreachTimelineOverlay': SecureOutreachTimelineOverlay,
            'SecureTeamImpactDashboard': SecureTeamImpactDashboard
        };
        
        return moduleMap[moduleName];
    }

    getRequiredServices(serviceNames) {
        const serviceManager = window.OsliraApp.serviceManager;
        if (!serviceManager) {
            throw new Error('Service manager not initialized');
        }
        
        return serviceNames.map(serviceName => {
            try {
                return serviceManager.getService(serviceName);
            } catch (error) {
                console.warn(`⚠️ Service ${serviceName} not available, using fallback`);
                return null;
            }
        }).filter(Boolean);
    }
}

// ===== ENHANCED ERROR BOUNDARY SYSTEM =====

class ErrorBoundary {
    constructor() {
        this.setupGlobalErrorHandlers();
        this.errorCount = 0;
        this.maxErrors = 10;
        this.errorResetTime = 300000; // 5 minutes
    }

    setupGlobalErrorHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, {
                type: 'javascript',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: 'promise',
                promise: event.promise
            });
            event.preventDefault(); // Prevent console error
        });

        // Handle CSP violations
        document.addEventListener('securitypolicyviolation', (event) => {
            this.handleError(new Error('CSP Violation'), {
                type: 'security',
                violatedDirective: event.violatedDirective,
                sourceFile: event.sourceFile
            });
        });
    }

    handleError(error, context = {}) {
        this.errorCount++;
        
        const errorData = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorCount: this.errorCount
        };

        // Log to console with details
        console.error('🚨 [ErrorBoundary] Error caught:', errorData);

        // Store in global error log
        window.OsliraApp.errors.push(errorData);

        // Check if we've exceeded error threshold
        if (this.errorCount >= this.maxErrors) {
            this.handleCriticalFailure();
        }

        // Reset error count after timeout
        setTimeout(() => {
            if (this.errorCount > 0) this.errorCount--;
        }, this.errorResetTime);

        // Try to recover gracefully
        this.attemptRecovery(error, context);
    }

    handleCriticalFailure() {
        console.error('🚨 [ErrorBoundary] Critical failure threshold reached');
        
        // Show user-friendly error message
        this.showCriticalErrorUI();
        
        // Attempt system reset
        setTimeout(() => {
            if (confirm('The application has encountered multiple errors. Would you like to reset?')) {
                this.resetApplication();
            }
        }, 2000);
    }

    showCriticalErrorUI() {
        const errorOverlay = document.createElement('div');
        errorOverlay.id = 'critical-error-overlay';
        errorOverlay.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; text-align: center;">
                    <h2 style="color: #dc2626; margin-bottom: 1rem;">⚠️ System Error</h2>
                    <p style="margin-bottom: 1.5rem;">The analytics dashboard has encountered multiple errors. This may be due to a temporary connectivity issue.</p>
                    <button onclick="window.OsliraApp.errorBoundary.resetApplication()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; margin-right: 1rem;">
                        Reset Dashboard
                    </button>
                    <button onclick="document.getElementById('critical-error-overlay').remove()" style="background: #6b7280; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer;">
                        Continue Anyway
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorOverlay);
    }

    attemptRecovery(error, context) {
        // Module-specific recovery strategies
        if (context.module) {
            this.recoverModule(context.module, error);
        }
        
        // Service-specific recovery
        if (context.service) {
            this.recoverService(context.service, error);
        }
    }

    recoverModule(moduleName, error) {
        console.log(`🔄 [ErrorBoundary] Attempting module recovery: ${moduleName}`);
        
        const moduleInstance = window.OsliraApp.modules.get(moduleName);
        if (moduleInstance && typeof moduleInstance.fallbackRender === 'function') {
            try {
                moduleInstance.fallbackRender(error);
                console.log(`✅ [ErrorBoundary] Module ${moduleName} recovered with fallback`);
            } catch (fallbackError) {
                console.error(`❌ [ErrorBoundary] Module ${moduleName} fallback failed:`, fallbackError);
            }
        }
    }

    resetApplication() {
        console.log('🔄 [ErrorBoundary] Resetting application...');
        
        // Clear caches
        clearAllCachedData();
        
        // Clear error overlay
        const overlay = document.getElementById('critical-error-overlay');
        if (overlay) overlay.remove();
        
        // Reset error count
        this.errorCount = 0;
        
        // Reload page
        window.location.reload();
    }
}

// ===== MAIN INITIALIZATION SYSTEM =====

async function initializeAnalyticsDashboard() {
    if (isInitialized) {
        console.warn('⚠️ Analytics dashboard already initialized');
        return initializationPromise;
    }

    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = performInitialization();
    return initializationPromise;
}

async function performInitialization() {
    const startTime = performance.now();
    console.log('🚀 [Dashboard] Starting analytics dashboard initialization...');

    try {
        // 1. Initialize error boundary first
        window.OsliraApp.errorBoundary = new ErrorBoundary();
        console.log('✅ [Dashboard] Error boundary initialized');

        // 2. Initialize service manager
        window.OsliraApp.serviceManager = new SecureServiceManager();
        await window.OsliraApp.serviceManager.initializeAllServices();
        console.log('✅ [Dashboard] Services initialized');

        // 3. Initialize container registry
        window.OsliraApp.containerRegistry = new ContainerRegistry();
        
        // Auto-discover containers
        await window.OsliraApp.containerRegistry.discoverContainers();
        
        // Register predefined containers
        registerPredefinedContainers();
        
        // Initialize all containers
        await window.OsliraApp.containerRegistry.initializeAllContainers();
        console.log('✅ [Dashboard] Containers initialized');

        // 4. Initialize module lifecycle manager
        window.OsliraApp.moduleLifecycle = new StandardModuleLifecycle();
        console.log('✅ [Dashboard] Module lifecycle initialized');

        // 5. Setup global event listeners
        setupGlobalEventListeners();
        console.log('✅ [Dashboard] Event listeners setup');

        // 6. Render all modules
        await renderAllModules();
        console.log('✅ [Dashboard] Modules rendered');

        // 7. Setup auto-refresh and monitoring
        setupPeriodicTasks();
        console.log('✅ [Dashboard] Periodic tasks setup');

        isInitialized = true;
        const totalTime = performance.now() - startTime;
        
        console.log(`🎯 [Dashboard] Analytics dashboard initialized successfully in ${totalTime.toFixed(2)}ms`);
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('oslira:dashboard:ready', {
            detail: { 
                initTime: totalTime,
                moduleCount: window.OsliraApp.modules.size,
                serviceCount: window.OsliraApp.services.size
            }
        }));

        return true;

    } catch (error) {
        console.error('❌ [Dashboard] Initialization failed:', error);
        window.OsliraApp.errorBoundary?.handleError(error, { phase: 'initialization' });
        throw error;
    }
}

function registerPredefinedContainers() {
    const containerConfigs = [
        { id: 'summary-panel', moduleName: 'QuickSummaryPanel', services: ['analytics', 'credit'] },
        { id: 'insights-panel', moduleName: 'InsightsPanel', services: ['analytics', 'claude', 'credit'] },
        { id: 'module-nav-sidebar', moduleName: 'ModuleNavSidebar', services: [] },
        { id: 'message-style-matrix-container', moduleName: 'SecureMessageStyleMatrix', services: ['analytics'] },
        { id: 'heatmap-container', moduleName: 'SecureLeadConversionHeatmap', services: ['analytics'] },
        { id: 'cta-effectiveness-container', moduleName: 'SecureCTAEffectivenessTracker', services: ['analytics'] },
        { id: 'feedback-signal-container', moduleName: 'SecureFeedbackSignalExplorer', services: ['analytics', 'claude'] },
        { id: 'claude-guidance-history', moduleName: 'SecureClaudeGuidanceHistory', services: ['analytics', 'claude'] },
        { id: 'message-risk-dashboard', moduleName: 'SecureMessageRiskClassifier', services: ['analytics', 'claude'] },
        { id: 'crm-performance-container', moduleName: 'SecureCRMPerformanceComparator', services: ['analytics'] },
        { id: 'roi-tracker-container', moduleName: 'SecureMessageIterationROITracker', services: ['analytics'] },
        { id: 'team-dashboard-container', moduleName: 'SecureTeamImpactDashboard', services: ['analytics'] },
        { id: 'outreach-timeline-container', moduleName: 'SecureOutreachTimelineOverlay', services: ['analytics'] }
    ];

    for (const config of containerConfigs) {
        window.OsliraApp.containerRegistry.registerContainer(config.id, config);
    }
}

async function renderAllModules() {
    console.log('🎨 [Dashboard] Rendering all modules...');
    
    const lifecycle = window.OsliraApp.moduleLifecycle;
    const renderPromises = [];

    for (const [containerId, moduleInstance] of window.OsliraApp.modules) {
        renderPromises.push(
            lifecycle.executeLifecycleMethod(moduleInstance, 'render')
                .then(() => {
                    console.log(`✅ [Dashboard] Module ${containerId} rendered`);
                    return lifecycle.executeLifecycleMethod(moduleInstance, 'ready');
                })
                .catch(error => {
                    console.error(`❌ [Dashboard] Module ${containerId} render failed:`, error);
                    return lifecycle.executeLifecycleMethod(moduleInstance, 'fallbackRender', error);
                })
        );
    }

    await Promise.allSettled(renderPromises);
}

function setupGlobalEventListeners() {
    // Window resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
            for (const [containerId, moduleInstance] of window.OsliraApp.modules) {
                if (typeof moduleInstance.onResize === 'function') {
                    try {
                        await moduleInstance.onResize();
                    } catch (error) {
                        console.error(`❌ Resize handler failed for ${containerId}:`, error);
                    }
                }
            }
        }, 250);
    });

    // Page visibility handler
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('📱 [Dashboard] Page hidden - pausing updates');
            pausePeriodicTasks();
        } else {
            console.log('📱 [Dashboard] Page visible - resuming updates');
            resumePeriodicTasks();
        }
    });

    // Beforeunload cleanup
    window.addEventListener('beforeunload', () => {
        console.log('🧹 [Dashboard] Cleaning up before unload');
        cleanupAllModules();
    });
}

function setupPeriodicTasks() {
    // Health check every 5 minutes
    setInterval(async () => {
        try {
            const healthResults = await window.OsliraApp.serviceManager.healthCheckAll();
            console.log('💚 [Dashboard] Health check completed:', healthResults);
        } catch (error) {
            console.error('❌ [Dashboard] Health check failed:', error);
        }
    }, 300000);

    // Performance monitoring every minute
    setInterval(() => {
        const memoryInfo = performance.memory;
        if (memoryInfo && memoryInfo.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
            console.warn('⚠️ [Dashboard] High memory usage detected:', memoryInfo);
        }
    }, 60000);
}

let periodicTasksPaused = false;

function pausePeriodicTasks() {
    periodicTasksPaused = true;
}

	function resumePeriodicTasks() {
    periodicTasksPaused = false;
}

async function cleanupAllModules() {
    const lifecycle = window.OsliraApp.moduleLifecycle;
    
    for (const [containerId, moduleInstance] of window.OsliraApp.modules) {
        try {
            await lifecycle.executeLifecycleMethod(moduleInstance, 'cleanup');
            console.log(`✅ [Dashboard] Module ${containerId} cleaned up`);
        } catch (error) {
            console.error(`❌ [Dashboard] Module ${containerId} cleanup failed:`, error);
        }
    }
    
    // Clear module registry
    window.OsliraApp.modules.clear();
    console.log('🧹 [Dashboard] All modules cleaned up');
}

// ===== UTILITY FUNCTIONS =====

function getModuleHealth() {
    const health = {
        modules: {},
        services: {},
        overall: 'healthy'
    };
    
    // Check module health
    for (const [containerId, moduleInstance] of window.OsliraApp.modules) {
        try {
            const moduleInfo = moduleInstance.getModuleInfo();
            health.modules[containerId] = {
                name: moduleInfo.name || containerId,
                version: moduleInfo.version || 'unknown',
                status: moduleInfo.status || 'unknown',
                lastError: moduleInfo.lastError || null
            };
        } catch (error) {
            health.modules[containerId] = {
                status: 'error',
                error: error.message
            };
            health.overall = 'degraded';
        }
    }
    
    // Check service health
    for (const [serviceName, service] of window.OsliraApp.services) {
        health.services[serviceName] = {
            initialized: true,
            hasHealthCheck: typeof service.healthCheck === 'function'
        };
    }
    
    return health;
}

function getPerformanceMetrics() {
    const metrics = {
        modules: {},
        memory: {},
        errors: window.OsliraApp.errors.slice(-10), // Last 10 errors
        timestamp: new Date().toISOString()
    };
    
    // Module performance
    for (const [moduleName, modulePerf] of window.OsliraApp.performance) {
        metrics.modules[moduleName] = { ...modulePerf };
    }
    
    // Memory info
    if (performance.memory) {
        metrics.memory = {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
    }
    
    return metrics;
}

async function refreshAllModules() {
    console.log('🔄 [Dashboard] Refreshing all modules...');
    
    const lifecycle = window.OsliraApp.moduleLifecycle;
    const refreshPromises = [];
    
    for (const [containerId, moduleInstance] of window.OsliraApp.modules) {
        if (typeof moduleInstance.refresh === 'function') {
            refreshPromises.push(
                lifecycle.executeLifecycleMethod(moduleInstance, 'refresh')
                    .catch(error => {
                        console.error(`❌ [Dashboard] Module ${containerId} refresh failed:`, error);
                    })
            );
        }
    }
    
    await Promise.allSettled(refreshPromises);
    console.log('✅ [Dashboard] Module refresh completed');
}

// ===== GLOBAL API EXPOSURE =====

// Expose key functions globally for debugging and external access
window.OsliraApp.analytics = {
    // Core functions
    initialize: initializeAnalyticsDashboard,
    refresh: refreshAllModules,
    cleanup: cleanupAllModules,
    
    // Diagnostics
    getHealth: getModuleHealth,
    getPerformance: getPerformanceMetrics,
    
    // Module management
    getModule: (containerId) => window.OsliraApp.modules.get(containerId),
    getAllModules: () => Array.from(window.OsliraApp.modules.entries()),
    
    // Service management
    getService: (serviceName) => window.OsliraApp.services.get(serviceName),
    getAllServices: () => Array.from(window.OsliraApp.services.entries()),
    
    // Cache management
    clearCache: clearAllCachedData,
    getCacheStats: () => {
        try {
            return JSON.parse(localStorage.getItem('oslira_cache_stats') || '{}');
        } catch {
            return {};
        }
    },
    
    // Error management
    getErrors: () => window.OsliraApp.errors.slice(),
    clearErrors: () => { window.OsliraApp.errors.length = 0; },
    
    // Configuration
    getConfig: () => window.OsliraApp.config,
    updateConfig: (path, value) => {
        const config = window.OsliraApp.services.get('config');
        if (config && typeof config.updateConfig === 'function') {
            config.updateConfig(path, value);
        }
    },
    
    // Version info
    version: APP_VERSION,
    moduleLifecycleVersion: MODULE_LIFECYCLE_VERSION
};

// ===== AUTO-INITIALIZATION =====

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await initializeAnalyticsDashboard();
        } catch (error) {
            console.error('❌ [Dashboard] Auto-initialization failed:', error);
        }
    });
} else {
    // DOM already ready, initialize immediately
    initializeAnalyticsDashboard().catch(error => {
        console.error('❌ [Dashboard] Auto-initialization failed:', error);
    });
}

// ===== MODULE EXPORTS =====

export {
    initializeAnalyticsDashboard,
    StandardModuleLifecycle,
    SecureServiceManager,
    ContainerRegistry,
    ErrorBoundary,
    refreshAllModules,
    cleanupAllModules,
    getModuleHealth,
    getPerformanceMetrics
};

// Legacy global export for backward compatibility
window.OsliraAnalytics = {
    initialize: initializeAnalyticsDashboard,
    version: APP_VERSION
};

console.log(`🎯 [Analytics] Dashboard system v${APP_VERSION} loaded successfully`);
console.log(`📊 [Analytics] Module lifecycle v${MODULE_LIFECYCLE_VERSION} ready`);
console.log('🚀 [Analytics] Ready for initialization...');
