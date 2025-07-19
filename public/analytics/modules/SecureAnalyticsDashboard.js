class SecureAnalyticsDashboard {
    constructor() {
        this.initialized = false;
        this.config = window.OsliraApp?.analyticsConfig?.getConfig() || {};
        this.modules = new Map();
        this.services = new Map();
        this.securityContext = null;
        this.cacheManager = null;
        this.errorHandler = null;
        
        // Initialize secure caching system
        this.initializeSecureCache();
        
        // Setup error handling
        this.initializeErrorHandling();
        
        // Setup performance monitoring
        this.initializePerformanceMonitoring();
        
        console.log('🔒 SecureAnalyticsDashboard constructor completed');
    }

    initializeSecureCache() {
        this.cacheManager = {
            cache: new Map(),
            ttl: new Map(),
            maxSize: 100,
            
            set(key, value, ttlMs = 300000) { // 5 minutes default
                if (this.cache.size >= this.maxSize) {
                    const firstKey = this.cache.keys().next().value;
                    this.delete(firstKey);
                }
                
                this.cache.set(key, value);
                this.ttl.set(key, Date.now() + ttlMs);
            },
            
            get(key) {
                if (!this.cache.has(key)) return null;
                
                const expiryTime = this.ttl.get(key);
                if (Date.now() > expiryTime) {
                    this.delete(key);
                    return null;
                }
                
                return this.cache.get(key);
            },
            
            delete(key) {
                this.cache.delete(key);
                this.ttl.delete(key);
            },
            
            clear() {
                this.cache.clear();
                this.ttl.clear();
            }
        };
    }

    initializeErrorHandling() {
        this.errorHandler = {
            errors: [],
            maxErrors: 50,
            
            logError(error, context = {}) {
                const errorEntry = {
                    message: error.message,
                    stack: error.stack,
                    context,
                    timestamp: new Date().toISOString(),
                    userId: window.OsliraApp.user?.id
                };
                
                this.errors.unshift(errorEntry);
                if (this.errors.length > this.maxErrors) {
                    this.errors.pop();
                }
                
                console.error('🚨 Dashboard Error:', errorEntry);
                
                // Send to monitoring service if available
                this.reportError(errorEntry);
            },
            
            reportError(errorEntry) {
                if (window.OsliraApp?.dataWriteService) {
                    window.OsliraApp.dataWriteService.logAuditTrail('dashboard_error', errorEntry)
                        .catch(e => console.warn('Error reporting failed:', e));
                }
            }
        };
    }

    initializePerformanceMonitoring() {
        this.performanceMonitor = {
            metrics: new Map(),
            
            startTimer(operation) {
                this.metrics.set(operation, performance.now());
            },
            
            endTimer(operation) {
                const startTime = this.metrics.get(operation);
                if (startTime) {
                    const duration = performance.now() - startTime;
                    console.log(`⏱️ ${operation}: ${Math.round(duration)}ms`);
                    this.metrics.delete(operation);
                    return duration;
                }
                return 0;
            }
        };
    }

    async init() {
        try {
            console.log('🚀 Starting secure analytics dashboard initialization...');
            this.performanceMonitor.startTimer('dashboard_init');
            
            // Validate Worker endpoint availability
            await this.validateWorkerEndpoints();
            
            // Configure security and authentication
            await this.setupSecurityContext();
            
            // Initialize secure service clients
            await this.initializeSecureServices();
            
            // Setup authenticated connections
            await this.setupAuthenticatedConnections();
            
            // Load initial data via Workers
            await this.loadInitialData();
            
            // Render secure dashboard layout
            await this.renderSecureDashboard();
            
            // Setup real-time updates
            await this.initializeRealTimeUpdates();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            this.initialized = true;
            const initTime = this.performanceMonitor.endTimer('dashboard_init');
            
            console.log(`✅ Secure analytics dashboard initialized successfully in ${Math.round(initTime)}ms`);
            
            // Emit initialization complete event
            window.dispatchEvent(new CustomEvent('secureAnalyticsDashboardReady', {
                detail: { initTime, moduleCount: this.modules.size }
            }));
            
        } catch (error) {
            this.errorHandler.logError(error, { phase: 'initialization' });
            this.handleInitializationError(error);
            throw error;
        }
    }

    async validateWorkerEndpoints() {
        const workerUrl = this.config.worker?.baseUrl;
        if (!workerUrl) {
            throw new Error('Worker base URL not configured');
        }
        
        try {
            // Test basic connectivity to Worker
            const response = await fetch(`${workerUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });
            
            if (!response.ok) {
                throw new Error(`Worker health check failed: ${response.status}`);
            }
            
            console.log('✅ Worker endpoints validated');
            
        } catch (error) {
            console.error('❌ Worker endpoint validation failed:', error);
            throw new Error('Cannot connect to analytics backend services');
        }
    }

    async setupSecurityContext() {
        this.securityContext = {
            userId: window.OsliraApp.user?.id,
            sessionToken: window.OsliraApp.session?.access_token,
            permissions: await this.loadUserPermissions(),
            encryptionEnabled: this.config.security?.enableDataSanitization || false,
            auditingEnabled: this.config.security?.enableAuditLogging || false,
            rateLimits: {
                requestsPerMinute: this.config.security?.rateLimitRequests || 100,
                currentCount: 0,
                resetTime: Date.now() + 60000
            }
        };
        
        console.log('🔐 Security context established');
    }

    async loadUserPermissions() {
        try {
            // Load user permissions from server
            const permissions = await window.OsliraApp.apiRequest('/user/permissions');
            return permissions || {
                analytics: ['read'],
                exports: ['read'],
                admin: []
            };
        } catch (error) {
            console.warn('Failed to load user permissions:', error);
            return { analytics: ['read'] }; // Default permissions
        }
    }

    async initializeSecureServices() {
        try {
            console.log('🔧 Initializing secure services...');
            
            // Create SecureClaudeService instance
            const { SecureClaudeService } = await import('./services/SecureClaudeService.js');
            this.services.set('claude', new SecureClaudeService(this.securityContext));
            
            // Create SecureCreditService instance
            const { SecureCreditService } = await import('./services/SecureCreditService.js');
            this.services.set('credit', new SecureCreditService(this.securityContext));
            
            // Create SecureAnalyticsService instance
            const { SecureAnalyticsService } = await import('./services/SecureAnalyticsService.js');
            this.services.set('analytics', new SecureAnalyticsService(this.securityContext));
            
            // Create SecureDataWriteService instance
            const { SecureDataWriteService } = await import('./services/SecureDataWriteService.js');
            this.services.set('dataWrite', new SecureDataWriteService(this.securityContext));
            
            // Create SecureIntegrationService instance
            const { SecureIntegrationService } = await import('./services/SecureIntegrationService.js');
            this.services.set('integration', new SecureIntegrationService(this.securityContext));
            
            // Create SecureChartFactory instance
            const { SecureChartFactory } = await import('./utils/SecureChartFactory.js');
            this.services.set('chartFactory', new SecureChartFactory());
            
            // Store services globally for module access
            window.OsliraApp.services = {
                secureClaudeService: this.services.get('claude'),
                secureCreditService: this.services.get('credit'),
                secureAnalyticsService: this.services.get('analytics'),
                secureDataWriteService: this.services.get('dataWrite'),
                secureIntegrationService: this.services.get('integration'),
                secureChartFactory: this.services.get('chartFactory')
            };
            
            console.log('✅ All secure services initialized');
            
        } catch (error) {
            this.errorHandler.logError(error, { phase: 'service_initialization' });
            throw new Error('Failed to initialize secure services: ' + error.message);
        }
    }

    async setupAuthenticatedConnections() {
        // Verify all services have valid authentication
        for (const [serviceName, service] of this.services) {
            if (service.validateAuthentication) {
                try {
                    await service.validateAuthentication();
                    console.log(`🔓 ${serviceName} authentication verified`);
                } catch (error) {
                    console.warn(`⚠️ ${serviceName} authentication issue:`, error);
                }
            }
        }
    }

    async loadInitialData() {
        try {
            console.log('📊 Loading initial dashboard data...');
            this.performanceMonitor.startTimer('initial_data_load');
            
            // Check user credits via Worker
            const creditService = this.services.get('credit');
            const creditStatus = await creditService.checkBalance();
            
            if (creditStatus.balance < this.config.credits?.minimumBalance || 1) {
                this.showLowCreditsWarning(creditStatus);
            }
            
            // Fetch analytics data via Workers (parallel loading)
            const analyticsService = this.services.get('analytics');
            const initialDataPromises = [];
            
            // Load core analytics data
            if (this.config.modules?.messageStyleMatrix?.enabled) {
                initialDataPromises.push(
                    analyticsService.getMessageMatrix({ timeframe: '30d' })
                        .then(data => this.cacheManager.set('messageMatrix', data))
                        .catch(error => console.warn('Failed to load message matrix:', error))
                );
            }
            
            if (this.config.modules?.leadConversionHeatmap?.enabled) {
                initialDataPromises.push(
                    analyticsService.getLeadConversionHeatmap({ timeframe: '30d' })
                        .then(data => this.cacheManager.set('leadConversion', data))
                        .catch(error => console.warn('Failed to load lead conversion data:', error))
                );
            }
            
            if (this.config.modules?.riskClassifier?.enabled) {
                initialDataPromises.push(
                    analyticsService.getMessageRiskData({ timeframe: '7d' })
                        .then(data => this.cacheManager.set('riskData', data))
                        .catch(error => console.warn('Failed to load risk data:', error))
                );
            }
            
            // Wait for all initial data to load (with timeout)
            await Promise.allSettled(initialDataPromises);
            
            const loadTime = this.performanceMonitor.endTimer('initial_data_load');
            console.log(`✅ Initial data loaded in ${Math.round(loadTime)}ms`);
            
        } catch (error) {
            this.errorHandler.logError(error, { phase: 'initial_data_load' });
            throw new Error('Failed to load initial dashboard data');
        }
    }

    async renderSecureDashboard() {
        try {
            console.log('🎨 Rendering secure dashboard layout...');
            this.performanceMonitor.startTimer('dashboard_render');
            
            // Initialize secure analytics modules
            await this.initializeAnalyticsModules();
            
            // Setup Worker-based data flows
            this.setupDataFlows();
            
            // Configure secure user interactions
            this.setupSecureUserInteractions();
            
            // Apply security policies to UI
            this.applySecurityPolicies();
            
            const renderTime = this.performanceMonitor.endTimer('dashboard_render');
            console.log(`✅ Dashboard rendered in ${Math.round(renderTime)}ms`);
            
        } catch (error) {
            this.errorHandler.logError(error, { phase: 'dashboard_render' });
            throw new Error('Failed to render secure dashboard');
        }
    }

    async initializeAnalyticsModules() {
        const modulePromises = [];
        
        // Initialize each enabled module
        const moduleConfigs = [
            { 
                name: 'messageStyleMatrix', 
                class: 'SecureMessageStyleMatrix', 
                container: '#message-style-container',
                services: ['analytics', 'credit']
            },
            { 
                name: 'leadConversionHeatmap', 
                class: 'SecureLeadConversionHeatmap', 
                container: '#lead-conversion-container',
                services: ['analytics']
            },
            { 
                name: 'ctaEffectiveness', 
                class: 'SecureCTAEffectivenessTracker', 
                container: '#cta-effectiveness-container',
                services: ['analytics']
            },
            { 
                name: 'feedbackExplorer', 
                class: 'SecureFeedbackSignalExplorer', 
                container: '#feedback-explorer-container',
                services: ['analytics', 'claude']
            },
            { 
                name: 'crmComparator', 
                class: 'SecureCRMPerformanceComparator', 
                container: '#crm-comparator-container',
                services: ['analytics']
            },
            { 
                name: 'timelineOverlay', 
                class: 'SecureOutreachTimelineOverlay', 
                container: '#timeline-overlay-container',
                services: ['analytics']
            },
            { 
                name: 'iterationTracker', 
                class: 'SecureMessageIterationROITracker', 
                container: '#iteration-tracker-container',
                services: ['analytics']
            },
            { 
                name: 'teamDashboard', 
                class: 'SecureTeamImpactDashboard', 
                container: '#team-dashboard-container',
                services: ['analytics']
            },
            { 
                name: 'claudeGuidance', 
                class: 'SecureClaudeGuidanceHistory', 
                container: '#claude-guidance-container',
                services: ['analytics', 'claude']
            },
            { 
                name: 'riskClassifier', 
                class: 'SecureMessageRiskClassifier', 
                container: '#risk-classifier-container',
                services: ['analytics', 'claude']
            }
        ];
        
        for (const moduleConfig of moduleConfigs) {
            if (this.config.modules?.[moduleConfig.name]?.enabled !== false) {
                modulePromises.push(this.initializeModule(moduleConfig));
            }
        }
        
        const results = await Promise.allSettled(modulePromises);
        
        // Log module initialization results
        results.forEach((result, index) => {
            const moduleName = moduleConfigs[index].name;
            if (result.status === 'fulfilled') {
                console.log(`✅ Module ${moduleName} initialized`);
            } else {
                console.error(`❌ Module ${moduleName} failed:`, result.reason);
            }
        });
        
        console.log(`📊 Analytics modules initialized: ${this.modules.size} active`);
    }

    async initializeModule(moduleConfig) {
        try {
            const container = document.querySelector(moduleConfig.container);
            if (!container) {
                console.warn(`Container not found for module ${moduleConfig.name}: ${moduleConfig.container}`);
                return;
            }
            
            // Get required services
            const services = moduleConfig.services.map(serviceName => this.services.get(serviceName));
            
            // Check if module class is available globally
            const ModuleClass = window[moduleConfig.class];
            if (!ModuleClass) {
                console.warn(`Module class not found: ${moduleConfig.class}`);
                return;
            }
            
            // Create module instance with required services
            const moduleInstance = new ModuleClass(container, ...services);
            
            // Store module instance
            this.modules.set(moduleConfig.name, {
                instance: moduleInstance,
                container: container,
                config: this.config.modules[moduleConfig.name] || {},
                lastUpdate: null
            });
            
            // Initialize module with cached data if available
            const cachedData = this.cacheManager.get(moduleConfig.name);
            if (cachedData) {
                await moduleInstance.render({ data: cachedData });
            }
            
        } catch (error) {
            this.errorHandler.logError(error, { 
                phase: 'module_initialization', 
                module: moduleConfig.name 
            });
            throw error;
        }
    }

    setupDataFlows() {
        // Setup data flow between modules and services
        this.dataFlows = {
            refreshInterval: null,
            
            startAutoRefresh() {
                if (this.refreshInterval) return;
                
                this.refreshInterval = setInterval(() => {
                    this.refreshModules();
                }, 60000); // Refresh every minute
            },
            
            stopAutoRefresh() {
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = null;
                }
            },
            
            async refreshModules() {
                for (const [moduleName, moduleData] of this.modules) {
                    const moduleConfig = this.config.modules[moduleName];
                    if (moduleConfig?.refreshInterval) {
                        const timeSinceUpdate = Date.now() - (moduleData.lastUpdate || 0);
                        if (timeSinceUpdate >= moduleConfig.refreshInterval) {
                            try {
                                await this.refreshModule(moduleName);
                            } catch (error) {
                                console.warn(`Module refresh failed: ${moduleName}`, error);
                            }
                        }
                    }
                }
            }
        };
        
        this.dataFlows.startAutoRefresh();
    }

    async refreshModule(moduleName) {
        const moduleData = this.modules.get(moduleName);
        if (!moduleData) return;
        
        try {
            // Get fresh data from analytics service
            const analyticsService = this.services.get('analytics');
            let freshData = null;
            
            switch (moduleName) {
                case 'messageStyleMatrix':
                    freshData = await analyticsService.getMessageMatrix({ timeframe: '30d' });
                    break;
                case 'leadConversionHeatmap':
                    freshData = await analyticsService.getLeadConversionHeatmap({ timeframe: '30d' });
                    break;
                case 'riskClassifier':
                    freshData = await analyticsService.getMessageRiskData({ timeframe: '7d' });
                    break;
                // Add other module data fetching as needed
            }
            
            if (freshData) {
                // Update cache
                this.cacheManager.set(moduleName, freshData);
                
                // Update module
                await moduleData.instance.updateData?.(freshData);
                moduleData.lastUpdate = Date.now();
            }
            
        } catch (error) {
            this.errorHandler.logError(error, { 
                phase: 'module_refresh', 
                module: moduleName 
            });
        }
    }

    setupSecureUserInteractions() {
        // Setup secure event handling for user interactions
        document.addEventListener('click', (event) => {
            this.handleSecureClick(event);
        });
        
        document.addEventListener('keydown', (event) => {
            this.handleSecureKeydown(event);
        });
        
        // Setup CSP violation reporting
        document.addEventListener('securitypolicyviolation', (event) => {
            this.errorHandler.logError(new Error('CSP Violation'), {
                type: 'security_violation',
                violatedDirective: event.violatedDirective,
                sourceFile: event.sourceFile
            });
        });
    }

    handleSecureClick(event) {
        // Validate click events for security
        const target = event.target;
        
        // Check for potentially malicious attributes
        if (target.hasAttribute('onclick') || target.hasAttribute('onmouseover')) {
            event.preventDefault();
            console.warn('🚨 Blocked potentially unsafe inline event handler');
            return;
        }
        
        // Log user interactions for audit if enabled
        if (this.securityContext?.auditingEnabled) {
            this.services.get('dataWrite')?.logAuditTrail('user_interaction', {
                type: 'click',
                target: target.tagName,
                className: target.className,
                timestamp: new Date().toISOString()
            });
        }
    }

    handleSecureKeydown(event) {
        // Handle keyboard shortcuts securely
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'r':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.refreshAllModules();
                    }
                    break;
                case 'e':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.exportDashboard();
                    }
                    break;
            }
        }
    }

    applySecurityPolicies() {
        // Apply Content Security Policy
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';";
        document.head.appendChild(meta);
        
        // Disable right-click context menu in production
        if (this.config.security?.enableRightClickDisable) {
            document.addEventListener('contextmenu', (e) => e.preventDefault());
        }
        
        // Disable text selection for sensitive data
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }

    async initializeRealTimeUpdates() {
        if (!this.config.realTime?.enablePolling) return;
        
        this.realTimeUpdater = {
            interval: null,
            
            start() {
                this.interval = setInterval(() => {
                    this.checkForUpdates();
                }, this.config.realTime.pollingInterval || 30000);
            },
            
            stop() {
                if (this.interval) {
                    clearInterval(this.interval);
                    this.interval = null;
                }
            },
            
            async checkForUpdates() {
                // Check for real-time updates from server
                try {
                    const analyticsService = this.services.get('analytics');
                    const updates = await analyticsService.checkForUpdates();
                    
                    if (updates && updates.length > 0) {
                        this.processRealTimeUpdates(updates);
                    }
                } catch (error) {
                    console.warn('Real-time update check failed:', error);
                }
            }
        };
        
        this.realTimeUpdater.start();
    }

    processRealTimeUpdates(updates) {
        updates.forEach(update => {
            const module = this.modules.get(update.module);
            if (module && module.instance.updateData) {
                module.instance.updateData(update.data);
            }
        });
    }

    setupGlobalEventListeners() {
        // Listen for app-wide events
        window.addEventListener('secureAnalyticsDashboardRefresh', () => {
            this.refreshAllModules();
        });
        
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Listen for user session changes
        window.addEventListener('userSessionChange', (event) => {
            if (event.detail.action === 'logout') {
                this.cleanup();
            }
        });
    }

    async refreshAllModules() {
        console.log('🔄 Refreshing all analytics modules...');
        
        const refreshPromises = Array.from(this.modules.keys()).map(moduleName => 
            this.refreshModule(moduleName)
        );
        
        await Promise.allSettled(refreshPromises);
        console.log('✅ All modules refreshed');
    }

    async exportDashboard() {
        try {
            const exportService = this.services.get('integration');
            await exportService.exportDashboard({
                format: 'pdf',
                includeCharts: true,
                includeData: true
            });
        } catch (error) {
            this.errorHandler.logError(error, { phase: 'export' });
        }
    }

    showLowCreditsWarning(creditStatus) {
        window.OsliraApp.showMessage(
            `Low credits remaining: ${creditStatus.balance}. Some features may be limited.`,
            'warning'
        );
    }

    handleInitializationError(error) {
        // Show user-friendly error message
        const errorContainer = document.getElementById('dashboard-error') || document.body;
        errorContainer.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f9fa;">
                <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="color: #dc2626; margin-bottom: 16px;">Dashboard Initialization Failed</h2>
                    <p style="color: #6b7280; margin-bottom: 16px;">
                        Unable to initialize the analytics dashboard. Please try refreshing the page.
                    </p>
                    <p style="color: #6b7280; margin-bottom: 24px; font-size: 14px;">
                        Error: ${error.message}
                    </p>
                    <button onclick="window.location.reload()" 
                            style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Reload Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    cleanup() {
        console.log('🧹 Cleaning up secure analytics dashboard...');
        
        // Stop real-time updates
        if (this.realTimeUpdater) {
            this.realTimeUpdater.stop();
        }
        
        // Stop data flows
        if (this.dataFlows) {
            this.dataFlows.stopAutoRefresh();
        }
        
        // Cleanup modules
        this.modules.forEach((moduleData) => {
            if (moduleData.instance.destroy) {
                moduleData.instance.destroy();
            }
        });
        this.modules.clear();
        
        // Cleanup services
        this.services.forEach((service) => {
            if (service.cleanup) {
                service.cleanup();
            }
        });
        this.services.clear();
        
        // Clear cache
        if (this.cacheManager) {
            this.cacheManager.clear();
        }
        
        this.initialized = false;
        console.log('✅ Dashboard cleanup completed');
    }

    // Public API methods
    getModule(moduleName) {
        return this.modules.get(moduleName)?.instance || null;
    }
    
    getService(serviceName) {
        return this.services.get(serviceName) || null;
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    getErrorLog() {
        return this.errorHandler.errors;
    }
    
    getCacheStats() {
        return {
            size: this.cacheManager.cache.size,
            maxSize: this.cacheManager.maxSize,
            keys: Array.from(this.cacheManager.cache.keys())
        };
    }
}
export { SecureAnalyticsDashboard };
