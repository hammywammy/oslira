// ==========================================
// OSLIRA ANALYTICS DASHBOARD - ENTERPRISE GRADE v4.0.0
// Complete Worker-First Architecture with Zero API Exposure
// ==========================================

// ===== PERFORMANCE TRACKING =====
performance.mark('analytics-start');
console.log('🚀 [Analytics] Starting enterprise analytics engine...');
 
// ===== CRITICAL IMPORTS (ES MODULES) =====

// Core Services (Worker-First Architecture)
import { SecureAnalyticsService } from './services/secureAnalyticsService.js';
import { SecureClaudeService } from './services/secureClaudeService.js';
import { SecureCreditService } from './services/secureCreditService.js';
import { SecureDataWriteService } from './services/secureDataWriteService.js';
import { SecureIntegrationService } from './services/secureIntegrationService.js';

// Analytics Modules (Secure & Lifecycle Compliant)
import { SecureChartFactory, CHART_THEMES } from './modules/secureChartFactory.js';
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

// New Priority Modules
import { InsightsPanel } from './modules/InsightsPanel.js';
import { QuickSummaryPanel } from './modules/QuickSummaryPanel.js';
import { ModuleNavSidebar } from './modules/ModuleNavSidebar.js';

// Configuration & Utilities
import { SECURE_ANALYTICS_CONFIG, SecureAnalyticsConfigManager } from './config/secureAnalyticsConfig.js';
import { CACHE_KEYS } from './config/cacheKeys.js';
import { setCachedData, getCachedData, clearAllCachedData, getCacheStats } from './utils/moduleCache.js';
import { createIcon, addTooltip, formatNumber, formatDuration, debounce } from './utils/UIHelpers.js';

// ===== CONSTANTS & CONFIGURATION =====
const ANALYTICS_VERSION = '4.0.0';
const MODULE_LIFECYCLE_VERSION = '3.0.0';
const CRITICAL_LOAD_TIMEOUT = 15000; // 15 seconds for critical modules
const STANDARD_LOAD_TIMEOUT = 30000; // 30 seconds for standard modules

// ===== GLOBAL STATE INITIALIZATION =====

// Initialize Oslira namespace with enterprise structure
if (!window.OsliraApp) {
    window.OsliraApp = {
        version: ANALYTICS_VERSION,
        moduleLifecycleVersion: MODULE_LIFECYCLE_VERSION,
        modules: new Map(),
        services: new Map(),
        config: {},
        performance: new Map(),
        errors: [],
        loadingErrors: [],
        initialized: false,
        startTime: performance.now()
    };
}

// ===== ENTERPRISE ERROR BOUNDARY SYSTEM =====

class EnterpriseErrorBoundary {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 10;
        this.errorReports = [];
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        window.addEventListener('error', (event) => {
            this.handleError(event.error, { 
                type: 'javascript', 
                filename: event.filename, 
                lineno: event.lineno, 
                colno: event.colno 
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, { 
                type: 'promise', 
                promise: event.promise 
            });
        });
    }

   handleError(error, context = {}) {
    this.errorCount++;
    const errorReport = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        error: {
            name: error?.name || 'Unknown',
            message: error?.message || String(error),
            stack: error?.stack || 'No stack trace available'
        },
        context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        version: ANALYTICS_VERSION
    };

    this.errorReports.push(errorReport);
    
    // FIX: Check if window.OsliraApp.errors exists before pushing
    if (window.OsliraApp && window.OsliraApp.errors) {
        window.OsliraApp.errors.push(errorReport);
    } else {
        // Initialize if it doesn't exist
        if (!window.OsliraApp) {
        window.OsliraApp = {};
     }
     if (!window.OsliraApp.modules) {
       window.OsliraApp.modules = new Map();
     }
        if (!window.OsliraApp.errors) window.OsliraApp.errors = [];
        window.OsliraApp.errors.push(errorReport);
    }

    // Log to console with structured data
    console.error('🚨 [ErrorBoundary] Enterprise Error Captured:', errorReport);

        // Show user-friendly error if too many errors
        if (this.errorCount >= this.maxErrors) {
            this.showCriticalErrorUI();
        }

        // In production, send to monitoring service
        this.reportToMonitoring(errorReport);
    }

    showCriticalErrorUI() {
        const errorBoundary = document.getElementById('global-error-boundary');
        if (errorBoundary) {
            errorBoundary.style.display = 'block';
        }
    }

    async reportToMonitoring(errorReport) {
        try {
            // In production environment, send to monitoring service
            if (window.OsliraApp.config.environment === 'production') {
                await fetch('/api/errors/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(errorReport)
                });
            }
        } catch (reportingError) {
            console.warn('Failed to report error to monitoring service:', reportingError);
        }
    }
}

// ===== ENTERPRISE SERVICE MANAGER =====

class EnterpriseServiceManager {
    constructor() {
        this.services = new Map();
        this.serviceHealth = new Map();
        this.healthCheckInterval = null;
        this.initializationPromises = new Map();
    }

    async initializeServices() {
        performance.mark('services-init-start');
        console.log('🔧 [ServiceManager] Initializing enterprise services...');

        const serviceConfigs = [
            { name: 'analytics', class: SecureAnalyticsService, critical: true },
            { name: 'claude', class: SecureClaudeService, critical: false },
            { name: 'credit', class: SecureCreditService, critical: true },
            { name: 'dataWrite', class: SecureDataWriteService, critical: false },
            { name: 'integration', class: SecureIntegrationService, critical: false }
        ];

        // Initialize critical services first
        const criticalServices = serviceConfigs.filter(config => config.critical);
        const standardServices = serviceConfigs.filter(config => !config.critical);

        try {
            // Initialize critical services with timeout
            await Promise.race([
                this.initializeServiceBatch(criticalServices),
                this.createTimeout(CRITICAL_LOAD_TIMEOUT, 'Critical services timeout')
            ]);

            // Initialize standard services in background
            this.initializeServiceBatch(standardServices).catch(error => {
                console.warn('⚠️ [ServiceManager] Non-critical service initialization failed:', error);
            });

            performance.mark('services-init-end');
            performance.measure('services-init-duration', 'services-init-start', 'services-init-end');
            
            console.log('✅ [ServiceManager] Critical services initialized successfully');
            this.startHealthMonitoring();

        } catch (error) {
            console.error('❌ [ServiceManager] Critical service initialization failed:', error);
            throw new Error(`Failed to initialize critical services: ${error.message}`);
        }
    }

    async initializeServiceBatch(serviceConfigs) {
        const promises = serviceConfigs.map(async (config) => {
            try {
                console.log(`🔧 [ServiceManager] Initializing ${config.name} service...`);
                
                const serviceInstance = new config.class();
                
                // Initialize with health check
                if (typeof serviceInstance.initialize === 'function') {
                    await serviceInstance.initialize();
                }

                this.services.set(config.name, serviceInstance);
                this.serviceHealth.set(config.name, { status: 'healthy', lastCheck: Date.now() });
                
                console.log(`✅ [ServiceManager] ${config.name} service initialized`);
                
                return { name: config.name, success: true };
            } catch (error) {
                console.error(`❌ [ServiceManager] Failed to initialize ${config.name}:`, error);
                this.serviceHealth.set(config.name, { status: 'failed', lastCheck: Date.now(), error });
                
                if (config.critical) {
                    throw error;
                }
                
                return { name: config.name, success: false, error };
            }
        });

        return Promise.all(promises);
    }

    getService(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) {
            console.warn(`⚠️ [ServiceManager] Service '${serviceName}' not found or not initialized`);
            return null;
        }
        return service;
    }

    createTimeout(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }

    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthChecks();
        }, 60000); // Check every minute
    }

    async performHealthChecks() {
        for (const [serviceName, service] of this.services) {
            try {
                if (typeof service.healthCheck === 'function') {
                    const isHealthy = await service.healthCheck();
                    this.serviceHealth.set(serviceName, {
                        status: isHealthy ? 'healthy' : 'degraded',
                        lastCheck: Date.now()
                    });
                }
            } catch (error) {
                this.serviceHealth.set(serviceName, {
                    status: 'failed',
                    lastCheck: Date.now(),
                    error
                });
            }
        }
    }

    getServiceHealth() {
        return Object.fromEntries(this.serviceHealth);
    }
}

// ===== ENTERPRISE MODULE LIFECYCLE MANAGER =====

class EnterpriseModuleLifecycle {
    constructor() {
        this.modules = new Map();
        this.moduleStates = new Map();
        this.loadingQueue = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.moduleMetrics = new Map();
    }

    async initializeModule(containerId, moduleConfig) {
        const startTime = performance.now();
        console.log(`🔧 [ModuleLifecycle] Initializing module: ${containerId}`);

        try {
            // Get container element
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container element not found: ${containerId}`);
            }

            // Get module class
            const ModuleClass = this.getModuleClass(moduleConfig.moduleName);
            if (!ModuleClass) {
                throw new Error(`Module class not found: ${moduleConfig.moduleName}`);
            }

            // Get required services
            const services = this.getRequiredServices(moduleConfig.services || []);

            // Create module instance
            const moduleInstance = new ModuleClass(container, ...services);

            // Validate module compliance
            this.validateModuleCompliance(moduleInstance, moduleConfig.moduleName);

            // Set initial state
            this.moduleStates.set(containerId, 'initializing');

            // Execute lifecycle: initialize → render → ready
            await this.executeModuleLifecycle(moduleInstance, containerId);

            // Store module
            this.modules.set(containerId, moduleInstance);
            window.OsliraApp.modules.set(containerId, moduleInstance);

            // Record metrics
            const duration = performance.now() - startTime;
            this.moduleMetrics.set(containerId, {
                loadTime: duration,
                status: 'success',
                retries: this.retryAttempts.get(containerId) || 0
            });

            console.log(`✅ [ModuleLifecycle] Module ${containerId} initialized in ${duration.toFixed(2)}ms`);
            return moduleInstance;

        } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`❌ [ModuleLifecycle] Module ${containerId} failed to initialize:`, error);

            // Record failure metrics
            this.moduleMetrics.set(containerId, {
                loadTime: duration,
                status: 'failed',
                error: error.message,
                retries: this.retryAttempts.get(containerId) || 0
            });

            // Attempt retry if under limit
            const retries = this.retryAttempts.get(containerId) || 0;
if (retries < this.maxRetries) {
    this.retryAttempts.set(containerId, retries + 1);
    console.log(`🔄 [ModuleLifecycle] Retrying ${containerId} (attempt ${retries + 1})`);
    
    // Exponential backoff
    const delay = Math.pow(2, retries) * 1000;
    setTimeout(() => {
        this.initializeModule(containerId, moduleConfig);
    }, delay);
    return null; // ADD THIS LINE
} // ADD THIS CLOSING BRACE

// All retries exhausted - render fallback
this.renderModuleFallback(containerId, error);
throw error;
        }
    }

    async executeModuleLifecycle(moduleInstance, containerId) {
        try {
            // 1. Initialize (if method exists)
            if (typeof moduleInstance.initialize === 'function') {
                await moduleInstance.initialize();
            }

            // 2. Render
            this.moduleStates.set(containerId, 'rendering');
            await moduleInstance.render();

            // 3. Ready
            this.moduleStates.set(containerId, 'ready');
            if (typeof moduleInstance.ready === 'function') {
                await moduleInstance.ready();
            }

        } catch (error) {
            this.moduleStates.set(containerId, 'error');
            
            // Try fallback render
            if (typeof moduleInstance.fallbackRender === 'function') {
                try {
                    await moduleInstance.fallbackRender(error);
                    this.moduleStates.set(containerId, 'fallback');
                } catch (fallbackError) {
                    console.error(`❌ [ModuleLifecycle] Fallback render failed for ${containerId}:`, fallbackError);
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }

    validateModuleCompliance(moduleInstance, moduleName) {
        const requiredMethods = ['render', 'cleanup', 'getModuleInfo'];
        const missing = requiredMethods.filter(method => typeof moduleInstance[method] !== 'function');
        
        if (missing.length > 0) {
            throw new Error(`Module ${moduleName} missing required methods: ${missing.join(', ')}`);
        }

        if (!moduleInstance.container) {
            throw new Error(`Module ${moduleName} missing container property`);
        }
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
        console.warn('⚠️ [ModuleLifecycle] Service manager not available, creating mock services');
        return serviceNames.map(name => this.createMockService(name));
    }
    
    return serviceNames.map(serviceName => {
        const service = serviceManager.getService(serviceName);
        if (!service) {
            console.warn(`⚠️ [ModuleLifecycle] Service ${serviceName} not available, using mock`);
            return this.createMockService(serviceName);
        }
        return service;
    }).filter(Boolean);
}

createMockService(serviceName) {
    return {
        healthCheck: () => Promise.resolve(false),
        makeSecureRequest: () => Promise.reject(new Error(`${serviceName} service not available`)),
        generateInsights: () => Promise.resolve([]),
        getInsightData: () => Promise.resolve({}),
        initialize: () => Promise.resolve(),
        [serviceName]: 'mock',
        isMock: true
    };
}

    renderModuleFallback(containerId, error) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="module-fallback">
                <div class="fallback-icon">⚠️</div>
                <h3>Module Unavailable</h3>
                <p>This module encountered an error and couldn't load.</p>
                <button onclick="location.reload()">Reload Dashboard</button>
                <details>
                    <summary>Error Details</summary>
                    <pre>${error.message}</pre>
                </details>
            </div>
        `;
    }

    async cleanupAll() {
        console.log('🧹 [ModuleLifecycle] Cleaning up all modules...');
        
        for (const [containerId, moduleInstance] of this.modules) {
            try {
                if (typeof moduleInstance.cleanup === 'function') {
                    await moduleInstance.cleanup();
                }
                this.moduleStates.set(containerId, 'cleaned');
            } catch (error) {
                console.error(`❌ [ModuleLifecycle] Cleanup failed for ${containerId}:`, error);
            }
        }
    }

    getModuleMetrics() {
        return Object.fromEntries(this.moduleMetrics);
    }
}

// ===== ENTERPRISE CONTAINER REGISTRY =====

class EnterpriseContainerRegistry {
    constructor() {
        this.containers = new Map();
        this.loadPriorities = new Map();
        this.setupPredefinedContainers();
    }

    setupPredefinedContainers() {
        const containerConfigs = [
            // Priority 1: Critical Overview Modules
            { id: 'summary-panel', moduleName: 'QuickSummaryPanel', services: ['analytics', 'credit'], priority: 1 },
            { id: 'insights-panel', moduleName: 'InsightsPanel', services: ['analytics', 'claude', 'credit'], priority: 1 },
            { id: 'module-nav-sidebar', moduleName: 'ModuleNavSidebar', services: [], priority: 1 },
            
            // Priority 2: Core Analytics
            { id: 'message-style-matrix-container', moduleName: 'SecureMessageStyleMatrix', services: ['analytics'], priority: 2 },
            { id: 'heatmap-container', moduleName: 'SecureLeadConversionHeatmap', services: ['analytics'], priority: 2 },
            { id: 'cta-effectiveness-container', moduleName: 'SecureCTAEffectivenessTracker', services: ['analytics'], priority: 2 },
            
            // Priority 3: Intelligence Modules
            { id: 'feedback-signal-container', moduleName: 'SecureFeedbackSignalExplorer', services: ['analytics', 'claude'], priority: 3 },
            { id: 'claude-guidance-history', moduleName: 'SecureClaudeGuidanceHistory', services: ['analytics', 'claude'], priority: 3 },
            { id: 'message-risk-dashboard', moduleName: 'SecureMessageRiskClassifier', services: ['analytics', 'claude'], priority: 3 },
            
            // Priority 4: Performance Modules
            { id: 'crm-performance-container', moduleName: 'SecureCRMPerformanceComparator', services: ['analytics'], priority: 4 },
            { id: 'roi-tracker-container', moduleName: 'SecureMessageIterationROITracker', services: ['analytics'], priority: 4 },
            { id: 'team-dashboard-container', moduleName: 'SecureTeamImpactDashboard', services: ['analytics'], priority: 4 },
            
            // Priority 5: Timeline & Historical
            { id: 'outreach-timeline-container', moduleName: 'SecureOutreachTimelineOverlay', services: ['analytics'], priority: 5 }
        ];

        containerConfigs.forEach(config => {
            this.containers.set(config.id, config);
            this.loadPriorities.set(config.priority, 
                (this.loadPriorities.get(config.priority) || []).concat(config)
            );
        });

        console.log(`📦 [ContainerRegistry] Registered ${containerConfigs.length} containers across ${this.loadPriorities.size} priority levels`);
    }

    getContainersByPriority(priority) {
        return this.loadPriorities.get(priority) || [];
    }

    getAllContainers() {
        return Array.from(this.containers.values());
    }

    getContainer(containerId) {
        return this.containers.get(containerId);
    }
}

// ===== SYSTEM STATUS MONITOR =====

class SystemStatusMonitor {
    constructor() {
        this.statusElements = {
            worker: document.getElementById('worker-status'),
            cache: document.getElementById('cache-status'),
            ai: document.getElementById('ai-status')
        };
        this.updateInterval = null;
    }

    startMonitoring() {
        this.updateStatus();
        this.updateInterval = setInterval(() => {
            this.updateStatus();
        }, 5000); // Update every 5 seconds
    }

    updateStatus() {
        this.updateWorkerStatus();
        this.updateCacheStatus();
        this.updateAIStatus();
    }

    updateWorkerStatus() {
        const serviceManager = window.OsliraApp.serviceManager;
        const health = serviceManager?.getServiceHealth() || {};
        
        const analyticsHealthy = health.analytics?.status === 'healthy';
        this.setStatus('worker', analyticsHealthy, analyticsHealthy ? 'Connected' : 'Disconnected');
    }

    updateCacheStatus() {
        try {
            const stats = getCacheStats();
            const hitRate = stats.hitRate || 0;
            const status = hitRate > 50 ? 'good' : hitRate > 20 ? 'warning' : 'error';
            this.setStatus('cache', status === 'good', `${hitRate}% hit rate`);
        } catch (error) {
            this.setStatus('cache', false, 'Error');
        }
    }

    updateAIStatus() {
        const serviceManager = window.OsliraApp.serviceManager;
        const health = serviceManager?.getServiceHealth() || {};
        
        const claudeHealthy = health.claude?.status === 'healthy';
        this.setStatus('ai', claudeHealthy, claudeHealthy ? 'Available' : 'Limited');
    }

    setStatus(type, isHealthy, text) {
        const element = this.statusElements[type];
        if (!element) return;

        const indicator = element.parentElement.querySelector('.status-indicator');
        const textSpan = element.parentElement.querySelector('span:last-child');

        if (indicator) {
            indicator.className = `status-indicator ${isHealthy ? 'connected' : 'error'}`;
        }

        if (textSpan) {
            textSpan.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${text}`;
        }
    }

    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// ===== MAIN DASHBOARD CONTROLLER =====

class OsliraDashboardController {
    constructor() {
        this.errorBoundary = new EnterpriseErrorBoundary();
        this.serviceManager = new EnterpriseServiceManager();
        this.moduleLifecycle = new EnterpriseModuleLifecycle();
        this.containerRegistry = new EnterpriseContainerRegistry();
        this.statusMonitor = new SystemStatusMonitor();
        this.configManager = new SecureAnalyticsConfigManager();
        
        this.initialized = false;
        this.loadingProgress = 0;
    }

    async initialize() {
        if (this.initialized) {
            console.log('⚠️ [Dashboard] Already initialized');
            return;
        }

        try {
            performance.mark('dashboard-init-start');
            console.log('🚀 [Dashboard] Starting enterprise initialization...');

            this.showLoadingOverlay();
            this.updateLoadingProgress(10, 'Initializing core systems...');

            // 1. Attach to global scope
            window.OsliraApp.errorBoundary = this.errorBoundary;
            window.OsliraApp.serviceManager = this.serviceManager;
            window.OsliraApp.moduleLifecycle = this.moduleLifecycle;
            window.OsliraApp.containerRegistry = this.containerRegistry;
            window.OsliraApp.statusMonitor = this.statusMonitor;

            // 2. Initialize configuration
            // 2. Initialize configuration
this.updateLoadingProgress(20, 'Loading configuration...');
// Configuration manager initializes automatically in constructor
window.OsliraApp.config = { ...this.configManager.getConfig() };

            // 3. Initialize services
            this.updateLoadingProgress(40, 'Starting enterprise services...');
            await this.serviceManager.initializeServices();

            // 4. Load modules by priority
            this.updateLoadingProgress(60, 'Loading analytics modules...');
            await this.loadModulesByPriority();

            // 5. Setup global event handlers
            this.updateLoadingProgress(80, 'Setting up event handlers...');
            this.setupGlobalEventHandlers();

            // 6. Start monitoring
            this.updateLoadingProgress(90, 'Starting system monitoring...');
            this.statusMonitor.startMonitoring();

            // 7. Setup periodic tasks
            this.setupPeriodicTasks();

            this.updateLoadingProgress(100, 'Dashboard ready!');
            
            performance.mark('dashboard-init-end');
            performance.measure('dashboard-init-duration', 'dashboard-init-start', 'dashboard-init-end');
            
            this.initialized = true;
            const totalTime = performance.now() - window.OsliraApp.startTime;
            
            console.log(`🎯 [Dashboard] Enterprise dashboard initialized in ${totalTime.toFixed(2)}ms`);
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('oslira:dashboard:ready', {
                detail: { 
                    initTime: totalTime,
                    moduleCount: window.OsliraApp.modules.size,
                    serviceCount: window.OsliraApp.serviceManager.services.size
                }
            }));

            // Hide loading after brief delay
            setTimeout(() => this.hideLoadingOverlay(), 500);

        } catch (error) {
            console.error('❌ [Dashboard] Critical initialization failure:', error);
            this.showCriticalError(error);
            throw error;
        }
    }

    async loadModulesByPriority() {
        const maxPriority = Math.max(...this.containerRegistry.loadPriorities.keys());
        
        for (let priority = 1; priority <= maxPriority; priority++) {
            const containers = this.containerRegistry.getContainersByPriority(priority);
            if (containers.length === 0) continue;

            console.log(`📦 [Dashboard] Loading priority ${priority} modules (${containers.length} modules)...`);
            
            const promises = containers.map(async (config) => {
                try {
                    // Check if container exists in DOM
                    const element = document.getElementById(config.id);
                    if (!element) {
                        console.warn(`⚠️ [Dashboard] Container ${config.id} not found in DOM`);
                        return null;
                    }

                    return await this.moduleLifecycle.initializeModule(config.id, config);
                } catch (error) {
                    console.error(`❌ [Dashboard] Failed to load ${config.id}:`, error);
                    return null;
                }
            });

            // Wait for current priority to complete before moving to next
            if (priority <= 2) {
                await Promise.all(promises);
            } else {
                // Load lower priority modules in background
                Promise.all(promises).catch(error => {
                    console.warn(`⚠️ [Dashboard] Background module loading failed:`, error);
                });
            }

            const progressBase = 60;
            const progressIncrement = 20 / maxPriority;
            this.updateLoadingProgress(progressBase + (priority * progressIncrement), 
                `Loaded priority ${priority} modules...`);
        }
    }

    setupGlobalEventHandlers() {
        // Resize handler with debouncing
        const debouncedResize = debounce(() => {
            window.OsliraApp.modules.forEach(moduleInstance => {
                if (typeof moduleInstance.onResize === 'function') {
                    moduleInstance.onResize().catch(error => {
                        console.warn('Module resize failed:', error);
                    });
                }
            });
        }, 250);

        window.addEventListener('resize', debouncedResize);

        // Visibility change handler for performance optimization
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('🔇 [Dashboard] Tab hidden - pausing updates');
                this.pausePeriodicUpdates();
            } else {
                console.log('🔊 [Dashboard] Tab visible - resuming updates');
                this.resumePeriodicUpdates();
            }
        });

        // Beforeunload cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Navigation controls
        this.setupNavigationHandlers();
    }

    setupNavigationHandlers() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAllModules());
        }

        // Export button
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportModal());
        }

        // Filter handlers
        const timeFilter = document.getElementById('time-filter');
        if (timeFilter) {
            timeFilter.addEventListener('change', (e) => this.handleFilterChange('time', e.target.value));
        }

        const businessFilter = document.getElementById('business-filter');
        if (businessFilter) {
            businessFilter.addEventListener('change', (e) => this.handleFilterChange('business', e.target.value));
        }
    }

    setupPeriodicTasks() {
        // Refresh data every 5 minutes
        this.dataRefreshInterval = setInterval(() => {
            if (!document.hidden) {
                this.refreshAllModules();
            }
        }, 300000);

        // Cache cleanup every hour
        this.cacheCleanupInterval = setInterval(() => {
            console.log('🧹 [Dashboard] Running periodic cache cleanup...');
            // Implement cache cleanup logic
        }, 3600000);

        // Performance metrics collection every 30 seconds
        this.metricsInterval = setInterval(() => {
            this.collectPerformanceMetrics();
        }, 30000);
    }

    pausePeriodicUpdates() {
        if (this.dataRefreshInterval) {
            clearInterval(this.dataRefreshInterval);
            this.dataRefreshInterval = null;
        }
    }

    resumePeriodicUpdates() {
        if (!this.dataRefreshInterval) {
            this.setupPeriodicTasks();
        }
    }

    async refreshAllModules() {
        console.log('🔄 [Dashboard] Refreshing all modules...');
        
        const refreshPromises = Array.from(window.OsliraApp.modules.entries()).map(async ([containerId, moduleInstance]) => {
            try {
                if (typeof moduleInstance.refresh === 'function') {
                    await moduleInstance.refresh();
                } else if (typeof moduleInstance.render === 'function') {
                    await moduleInstance.render();
                }
            } catch (error) {
                console.error(`❌ [Dashboard] Failed to refresh ${containerId}:`, error);
            }
        });

        await Promise.allSettled(refreshPromises);
        console.log('✅ [Dashboard] Module refresh completed');
    }

    async handleFilterChange(filterType, value) {
        console.log(`🔍 [Dashboard] Filter changed: ${filterType} = ${value}`);
        
        const filters = this.getCurrentFilters();
        filters[filterType] = value;
        
        // Apply filters to all modules
        const filterPromises = Array.from(window.OsliraApp.modules.values()).map(async (moduleInstance) => {
            try {
                if (typeof moduleInstance.applyFilters === 'function') {
                    await moduleInstance.applyFilters(filters);
                } else if (typeof moduleInstance.render === 'function') {
                    await moduleInstance.render(filters);
                }
            } catch (error) {
                console.error('❌ [Dashboard] Filter application failed:', error);
            }
        });

        await Promise.allSettled(filterPromises);
    }

    getCurrentFilters() {
        return {
            time: document.getElementById('time-filter')?.value || '30d',
            business: document.getElementById('business-filter')?.value || 'all'
        };
    }

    showExportModal() {
        const modal = document.getElementById('export-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    collectPerformanceMetrics() {
        const metrics = {
            timestamp: Date.now(),
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null,
            moduleMetrics: this.moduleLifecycle.getModuleMetrics(),
            serviceHealth: this.serviceManager.getServiceHealth(),
            cacheStats: getCacheStats()
        };

        window.OsliraApp.performance.set(Date.now(), metrics);

        // Keep only last 100 performance snapshots
        if (window.OsliraApp.performance.size > 100) {
            const oldestKey = Math.min(...window.OsliraApp.performance.keys());
            window.OsliraApp.performance.delete(oldestKey);
        }
    }

    showLoadingOverlay() {
        const overlay = document.getElementById('analytics-loading');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('analytics-loading');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    }

    updateLoadingProgress(percentage, message) {
        this.loadingProgress = percentage;
        
        const progressBar = document.getElementById('loading-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }

        const messageElement = document.getElementById('loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        console.log(`⏳ [Dashboard] Loading: ${percentage}% - ${message}`);
    }

    showCriticalError(error) {
        const errorBoundary = document.getElementById('global-error-boundary');
        if (errorBoundary) {
            errorBoundary.style.display = 'block';
        }

        this.hideLoadingOverlay();
    }

    async cleanup() {
        console.log('🧹 [Dashboard] Starting dashboard cleanup...');

        // Stop monitoring
        this.statusMonitor.stopMonitoring();

        // Clear intervals
        if (this.dataRefreshInterval) clearInterval(this.dataRefreshInterval);
        if (this.cacheCleanupInterval) clearInterval(this.cacheCleanupInterval);
        if (this.metricsInterval) clearInterval(this.metricsInterval);

        // Cleanup modules
        await this.moduleLifecycle.cleanupAll();

        console.log('✅ [Dashboard] Cleanup completed');
    }
}

// ===== INITIALIZATION & STARTUP =====

// Create dashboard controller instance
const dashboardController = new OsliraDashboardController();
window.OsliraApp.controller = dashboardController;

// Initialize when DOM is ready
async function initializeDashboard() {
    try {
        // Wait for core dependencies
        if (!window.OsliraApp.initialize) {
            console.log('⏳ [Dashboard] Waiting for shared-code.js to load...');
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.OsliraApp.initialize) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        // Initialize shared code first
        await window.OsliraApp.initialize();

        // Initialize dashboard
        await dashboardController.initialize();

    } catch (error) {
        console.error('❌ [Dashboard] Initialization failed:', error);
        throw error;
    }
}

// Start initialization based on DOM state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    // DOM already ready
    initializeDashboard().catch(console.error);
}

// ===== EXPORTS FOR DEBUGGING =====

// Expose key functions for debugging and external access
window.OsliraApp.dashboard = {
    controller: dashboardController,
    refreshAllModules: () => dashboardController.refreshAllModules(),
    getPerformanceMetrics: () => Object.fromEntries(window.OsliraApp.performance),
    getModuleMetrics: () => dashboardController.moduleLifecycle.getModuleMetrics(),
    getServiceHealth: () => dashboardController.serviceManager.getServiceHealth(),
    version: ANALYTICS_VERSION
};

console.log(`📊 [Analytics] Enterprise analytics engine v${ANALYTICS_VERSION} loaded successfully`);
performance.mark('analytics-loaded');

// ===== DEBUG LOGGING =====
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('🔍 [DEBUG] Analytics Dashboard Status:', {
            workerUrl: window.OsliraApp?.config?.workerUrl,
            modulesRegistry: window.OsliraApp?.modules?.size || 0,
            serviceManager: !!window.OsliraApp?.serviceManager,
            moduleStates: window.OsliraApp?.moduleLifecycle?.moduleStates || 'not available'
        });
    }, 2000);
});
