// ==========================================
// SECURE ANALYTICS CONFIGURATION - Enterprise Configuration Management
// Comprehensive configuration system with validation and runtime management
// ==========================================

/**
 * Enterprise-grade configuration system for Oslira Analytics Dashboard
 * Features: Validation, runtime updates, environment detection, security controls
 * Version 2.0.0 - Enhanced validation and error handling
 */
// Helper function to safely access environment variables in browser
function getEnvVar(name, defaultValue = null) {
    // Check if we're in a build environment with injected variables
    if (typeof window !== 'undefined' && window.__ENV__) {
        return window.__ENV__[name] || defaultValue;
    }
    
    // Check for Vite/Webpack environment variables
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[name] || defaultValue;
    }
    
    // Fallback for development
    return defaultValue;
}

// Helper function to detect environment
function detectEnvironment() {
    if (typeof window === 'undefined') return 'server';
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('dev')) {
        return 'development';
    }
    
    if (hostname.includes('staging')) {
        return 'staging';
    }
    
    if (hostname.includes('oslira.com')) {
        return 'production';
    }
    
    return 'development'; // Default fallback
}

const SECURE_ANALYTICS_CONFIG = {
    // Worker Configuration - Cloudflare Worker endpoints and settings
    worker: {
        baseUrl: window.OsliraApp?.config?.workerUrl || 'https://oslira-worker.workers.dev',
        timeout: 60000, // 60 seconds for complex analytics operations
        retryAttempts: 3,
        retryDelay: 2000, // 2 second delay between retries
        batchSize: 10, // Maximum items per batch request
        enableCompression: true,
        enableKeepAlive: true,
        maxConcurrentRequests: 5,
        healthCheckInterval: 300000, // 5 minutes
        requestQueue: {
            maxSize: 100,
            processingDelay: 100,
            priorityLevels: ['critical', 'high', 'normal', 'low'],
            timeoutMultiplier: 1.5
        },
        fallbackUrls: [
            'https://oslira-worker-backup.workers.dev',
            'https://oslira-worker-eu.workers.dev'
        ]
    },
    
    // Security Configuration - Enterprise-grade security settings
    security: {
        enableRequestSigning: true, // Sign requests with session token
        enableDataSanitization: true, // Sanitize all input/output data
        enableAuditLogging: true, // Log all security-relevant actions
        maxRequestSize: 10485760, // 10MB maximum request size
        rateLimitRequests: 100, // Requests per minute per user
        enableCSRFProtection: true,
        enableInputValidation: true,
        enableOutputFiltering: true,
        sessionTimeout: 3600000, // 1 hour session timeout
        maxConcurrentSessions: 3,
        allowedOrigins: [
            'https://oslira.com',
            'https://app.oslira.com',
            'https://analytics.oslira.com',
            'https://localhost:3000', // Development
            'https://127.0.0.1:3000'  // Development
        ],
        sensitiveDataPatterns: [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
            /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
            /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
            /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP addresses
            /\b[A-Za-z0-9]{20,}\b/g // Long tokens
        ],
        encryption: {
            algorithm: 'AES-GCM',
            keyLength: 256,
            ivLength: 96,
            tagLength: 128
        }
    },
    
    // Cache Configuration - Advanced caching strategy
    cache: {
        enableCaching: true,
        defaultTTL: 300000, // 5 minutes
        maxSize: 52428800, // 50MB
        compressionThreshold: 1024, // 1KB
        enableCompression: true,
        cleanupInterval: 60000, // 1 minute
        emergencyCleanupThreshold: 0.9, // 90% of max size
        strategies: {
            analytics: { ttl: 180000, priority: 'high' }, // 3 minutes
            insights: { ttl: 300000, priority: 'medium' }, // 5 minutes
            summary: { ttl: 120000, priority: 'high' }, // 2 minutes
            reports: { ttl: 600000, priority: 'low' }, // 10 minutes
            static: { ttl: 3600000, priority: 'low' } // 1 hour
        },
        versioning: {
            enabled: true,
            maxVersions: 3,
            strategy: 'timestamp' // 'timestamp' or 'hash'
        }
    },
    
    // Performance Configuration - Optimization settings
    performance: {
        enableLazyLoading: true,
        enableVirtualization: true,
        batchRequestSize: 50,
        renderingBudget: 16, // 16ms per frame
        memoryLimit: 134217728, // 128MB
        enableWebWorkers: true,
        debounceDelay: 300,
        throttleDelay: 100,
        preloadCriticalData: true,
        enableServiceWorker: false, // Disabled by default
        resourceHints: {
            preconnect: ['https://oslira-worker.workers.dev'],
            prefetch: ['/analytics/summary', '/ai/generate-insights'],
            preload: []
        },
        bundleOptimization: {
            enableCodeSplitting: true,
            enableTreeShaking: true,
            chunkStrategy: 'vendor-app-page'
        }
    },
    
    // Module Configuration - Individual module settings
    modules: {
        insightsPanel: {
            enabled: true,
            refreshInterval: 600000, // 10 minutes
            maxInsights: 5,
            minConfidenceThreshold: 0.6,
            priorityInsights: ['risk_patterns', 'performance_opportunities', 'lead_optimization'],
            fallbackMode: true,
            autoRefresh: true
        },
        summaryPanel: {
            enabled: true,
            refreshInterval: 120000, // 2 minutes
            metrics: ['totalLeads', 'highRiskPercentage', 'averageROI', 'weeklyChange'],
            sparklines: true,
            compactMode: false,
            autoRefresh: true
        },
        navigationSidebar: {
            enabled: true,
            position: 'left',
            autoHide: true,
            hideTimeout: 3000,
            compactMode: false,
            persistState: true
        },
        moduleContainers: {
            'summary-panel': { priority: 1, lazyLoad: false },
            'insights-panel': { priority: 2, lazyLoad: false },
            'module-nav-sidebar': { priority: 3, lazyLoad: false },
            'message-style-matrix-container': { priority: 4, lazyLoad: true },
            'heatmap-container': { priority: 5, lazyLoad: true },
            'cta-effectiveness-container': { priority: 6, lazyLoad: true }
        }
    },
    
    // API Configuration - External service integration
        api: {
            endpoints: {
                analytics: '/analytics/data',
                summary: '/analytics/summary',
                insights: '/ai/generate-insights',
                health: '/health',
                credits: '/credits/check',
                export: '/analytics/export',
                import: '/analytics/import',
                user: '/user/profile',
                audit: '/audit/log'
            },
            versions: {
                analytics: 'v2',
                ai: 'v1',
                auth: 'v1'
            },
            authentication: {
                type: 'bearer', // 'bearer', 'api-key', 'oauth'
                headerName: 'Authorization',
                tokenPrefix: 'Bearer ',
                refreshEndpoint: '/auth/refresh',
                refreshThreshold: 300000 // 5 minutes before expiry
            },
            rateLimit: {
                enabled: true,
                requestsPerMinute: 100,
                burstLimit: 20,
                strategy: 'sliding-window'
            }
        },
        
        // Credit System Configuration
        credits: {
            enabled: true,
            checkInterval: 300000, // 5 minutes
            minimumBalance: 10,
            warningThreshold: 50,
            autoRecharge: false,
            operations: {
                light_analysis: 1,
                deep_analysis: 2,
                bulk_analysis: 5,
                export_data: 1,
                ai_insights: 3
            },
            quotas: {
                daily: 1000,
                monthly: 25000,
                burst: 100
            }
        },
        
        // UI/UX Configuration
        ui: {
            theme: 'auto', // 'light', 'dark', 'auto'
            animations: true,
            reducedMotion: false,
            compactMode: false,
            language: 'en',
            timezone: 'auto',
            dateFormat: 'ISO',
            numberFormat: 'US',
            accessibility: {
                enableScreenReader: true,
                highContrast: false,
                largeFonts: false,
                keyboardNavigation: true
            },
            notifications: {
                enabled: true,
                position: 'top-right',
                duration: 5000,
                enableSound: false,
                types: ['success', 'error', 'warning', 'info']
            },
            layout: {
                sidebarWidth: 280,
                headerHeight: 64,
                footerHeight: 48,
                contentPadding: 24,
                responsive: true
            }
        },
        
        // Data Export Configuration
        export: {
            enabled: true,
            formats: ['json', 'csv', 'xlsx', 'pdf'],
            maxFileSize: 104857600, // 100MB
            compression: true,
            includeMetadata: true,
            batchSize: 1000,
            scheduling: {
                enabled: false,
                maxScheduledExports: 10,
                retentionDays: 30
            },
            security: {
                encryptSensitiveData: true,
                includeAuditTrail: true,
                watermark: true
            }
        },
        
        // Monitoring and Error Handling
        monitoring: {
            enableErrorTracking: true,
            enablePerformanceMonitoring: true,
            enableUsageAnalytics: true,
            errorReportingEndpoint: '/api/errors',
            performanceEndpoint: '/api/performance',
            sampleRate: 0.1, // 10% sampling
            performanceThresholds: {
                loadTime: 3000, // 3 seconds
                renderTime: 1000, // 1 second
                apiResponseTime: 5000, // 5 seconds
                memoryUsage: 134217728, // 128MB
                bundleSize: 2097152 // 2MB
            },
            alerting: {
                enableEmailAlerts: false,
                enableSlackAlerts: false,
                enableWebhookAlerts: true,
                criticalErrorThreshold: 5, // errors per minute
                performanceDegradationThreshold: 10000, // ms
                webhookUrls: []
            },
            retention: {
                errorLogs: 30, // days
                performanceLogs: 7, // days
                auditLogs: 90 // days
            }
        },
        
        // Feature Flags and A/B Testing
        featureFlags: {
            enableAdvancedCharts: true,
            enablePredictiveAnalytics: false,
            enableRealtimeCollaboration: false,
            enableCustomDashboards: false,
            enableAdvancedFiltering: true,
            enableDataExport: true,
            enableMobileOptimizations: true,
            enableAccessibilityMode: true,
            enableDarkMode: true,
            enableHighContrastMode: false,
            enableExperimentalFeatures: false,
            enableBetaFeatures: false
        },
        
        // Compliance and Privacy
        compliance: {
            enableGDPRCompliance: true,
            enableCCPACompliance: true,
            enableSOCCompliance: true,
            dataRetentionPeriod: 31536000000, // 1 year in milliseconds
            enableDataAnonymization: true,
            enableRightToForgotten: true,
            privacyPolicyVersion: '2.1',
            termsOfServiceVersion: '1.3',
            consentManagement: {
                requiredForAnalytics: true,
                requiredForPersonalization: true,
                granularConsent: true,
                consentExpiry: 31536000000 // 1 year
            },
            dataProcessing: {
                enablePseudonymization: true,
                enableDataMinimization: true,
                purposeLimitation: true,
                storageMinimization: true
            }
        },
        
        // Development and Debug Settings
        debug: {
            enableConsoleLogging: window.location.hostname === 'localhost',
            enablePerformanceProfiling: false,
            enableNetworkDebugging: false,
            enableStateDebugging: false,
            enableVerboseLogging: false,
            logLevel: 'info', // 'debug', 'info', 'warn', 'error'
            enableMockData: false,
            enableTestMode: false,
            bypassCache: false,
            showConfigPanel: false,
            enableSourceMaps: window.location.hostname === 'localhost'
        },
        
        // Version and Build Information
        version: {
    app: '1.3.0',
    config: '2.1.0',
    api: '1.2.0',
    build: getEnvVar('BUILD_NUMBER', 'development'),
    buildDate: new Date().toISOString(),
    gitCommit: getEnvVar('GIT_COMMIT', 'unknown'),
    environment: getEnvVar('NODE_ENV', detectEnvironment())
},
        
        // Environment Detection
        environment: {
            isDevelopment: window.location.hostname === 'localhost' || window.location.hostname.includes('dev'),
            isProduction: window.location.hostname.includes('oslira.com'),
            isStaging: window.location.hostname.includes('staging'),
            isTesting: window.location.href.includes('test=true'),
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    };
    
    // Enhanced Configuration validation and management
    class SecureAnalyticsConfigManager {
        constructor() {
            this.config = SECURE_ANALYTICS_CONFIG;
            this.initialized = false;
            this.validationRules = new Map();
            this.validators = new Map();
            this.watchers = new Map();
            this.history = [];
            this.maxHistoryLength = 50;
            
            this.setupValidationRules();
            this.setupCustomValidators();
            this.validateConfiguration();
            this.initializeRuntimeConfig();
            this.setupConfigWatchers();
        }
        
        setupValidationRules() {
            // Worker configuration validation
            this.validationRules.set('worker.baseUrl', {
                type: 'string',
                required: true,
                pattern: /^https:\/\/.+/,
                message: 'Worker base URL must be a valid HTTPS URL'
            });
            
            this.validationRules.set('worker.timeout', {
                type: 'number',
                required: true,
                min: 1000,
                max: 300000,
                message: 'Worker timeout must be between 1 second and 5 minutes'
            });
            
            this.validationRules.set('worker.retryAttempts', {
                type: 'number',
                required: true,
                min: 0,
                max: 10,
                message: 'Retry attempts must be between 0 and 10'
            });
            
            // Security configuration validation
            this.validationRules.set('security.maxRequestSize', {
                type: 'number',
                required: true,
                min: 1024,
                max: 104857600, // Max 100MB
                message: 'Max request size must be between 1KB and 100MB'
            });
            
            this.validationRules.set('security.rateLimitRequests', {
                type: 'number',
                required: true,
                min: 1,
                max: 10000,
                message: 'Rate limit must be between 1 and 10000 requests'
            });
            
            this.validationRules.set('security.sessionTimeout', {
                type: 'number',
                required: true,
                min: 300000, // 5 minutes
                max: 86400000, // 24 hours
                message: 'Session timeout must be between 5 minutes and 24 hours'
            });
            
            // Cache configuration validation
            this.validationRules.set('cache.maxSize', {
                type: 'number',
                required: true,
                min: 1048576, // 1MB
                max: 536870912, // 512MB
                message: 'Cache max size must be between 1MB and 512MB'
            });
            
            this.validationRules.set('cache.defaultTTL', {
                type: 'number',
                required: true,
                min: 1000,
                max: 3600000,
                message: 'Cache TTL must be between 1 second and 1 hour'
            });
            
            // Credits configuration validation
            this.validationRules.set('credits.minimumBalance', {
                type: 'number',
                required: true,
                min: 0,
                max: 10000,
                message: 'Minimum balance must be between 0 and 10000'
            });
            
            // Performance thresholds validation
            this.validationRules.set('monitoring.performanceThresholds.loadTime', {
                type: 'number',
                required: true,
                min: 100,
                max: 30000,
                message: 'Load time threshold must be between 100ms and 30 seconds'
            });
        }
        
        setupCustomValidators() {
            // Custom validator for URLs
            this.validators.set('url', (value) => {
                try {
                    new URL(value);
                    return { valid: true };
                } catch {
                    return { valid: false, message: 'Invalid URL format' };
                }
            });
            
            // Custom validator for email patterns
            this.validators.set('email-pattern', (value) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return {
                    valid: emailRegex.test(value),
                    message: 'Invalid email pattern'
                };
            });
            
            // Custom validator for allowed origins
            this.validators.set('origin-list', (origins) => {
                if (!Array.isArray(origins)) {
                    return { valid: false, message: 'Origins must be an array' };
                }
                
                for (const origin of origins) {
                    const urlValidation = this.validators.get('url')(origin);
                    if (!urlValidation.valid) {
                        return { valid: false, message: `Invalid origin URL: ${origin}` };
                    }
                }
                
                return { valid: true };
            });
            
            // Custom validator for feature flags
            this.validators.set('feature-flags', (flags) => {
                if (typeof flags !== 'object' || flags === null) {
                    return { valid: false, message: 'Feature flags must be an object' };
                }
                
                for (const [key, value] of Object.entries(flags)) {
                    if (typeof value !== 'boolean') {
                        return { valid: false, message: `Feature flag ${key} must be boolean` };
                    }
                }
                
                return { valid: true };
            });
        }
        
        validateConfiguration() {
            const errors = [];
            
            // Validate against rules
            for (const [path, rule] of this.validationRules) {
                try {
                    const value = this.getNestedValue(this.config, path);
                    const validation = this.validateValue(value, rule);
                    
                    if (!validation.valid) {
                        errors.push(`${path}: ${validation.message || rule.message}`);
                    }
                } catch (error) {
                    errors.push(`${path}: Failed to validate - ${error.message}`);
                }
            }
            
            // Custom validations
            const customValidations = [
                {
                    path: 'security.allowedOrigins',
                    validator: 'origin-list'
                },
                {
                    path: 'featureFlags',
                    validator: 'feature-flags'
                }
            ];
            
            for (const { path, validator } of customValidations) {
                try {
                    const value = this.getNestedValue(this.config, path);
                    const validation = this.validators.get(validator)(value);
                    
                    if (!validation.valid) {
                        errors.push(`${path}: ${validation.message}`);
                    }
                } catch (error) {
                    errors.push(`${path}: Custom validation failed - ${error.message}`);
                }
            }
            
            if (errors.length > 0) {
                console.error('❌ Configuration validation failed:', errors);
                throw new Error(`Invalid analytics configuration: ${errors.join('; ')}`);
            }
            
            console.log('✅ Analytics configuration validated successfully');
        }
        
        validateValue(value, rule) {
            // Check if required
            if (rule.required && (value === undefined || value === null)) {
                return { valid: false, message: 'Required value is missing' };
            }
            
            // Skip validation if value is undefined/null and not required
            if (!rule.required && (value === undefined || value === null)) {
                return { valid: true };
            }
            
            // Type validation
            if (rule.type && typeof value !== rule.type) {
                return { valid: false, message: `Expected ${rule.type}, got ${typeof value}` };
            }
            
            // Pattern validation
            if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
                return { valid: false, message: 'Value does not match required pattern' };
            }
            
            // Range validation for numbers
            if (rule.type === 'number') {
                if (rule.min !== undefined && value < rule.min) {
                    return { valid: false, message: `Value must be at least ${rule.min}` };
                }
                if (rule.max !== undefined && value > rule.max) {
                    return { valid: false, message: `Value must be at most ${rule.max}` };
                }
            }
            
            // Array validation
            if (rule.type === 'array' && !Array.isArray(value)) {
                return { valid: false, message: 'Value must be an array' };
            }
            
            return { valid: true };
        }
        
        initializeRuntimeConfig() {
            // Update configuration with runtime values
            this.config.worker.baseUrl = window.OsliraApp?.config?.workerUrl || this.config.worker.baseUrl;
            this.config.debug.enableConsoleLogging = this.config.environment.isDevelopment;
            this.config.debug.enableSourceMaps = this.config.environment.isDevelopment;
            
            // Apply feature flags from OsliraApp if available
            if (window.OsliraApp?.featureFlags) {
                Object.assign(this.config.featureFlags, window.OsliraApp.featureFlags);
            }
            
            // Detect user preferences
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.config.ui.reducedMotion = true;
                this.config.ui.animations = false;
            }
            
            if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
                this.config.ui.accessibility.highContrast = true;
            }
            
            // Auto-detect timezone and language
            this.config.ui.timezone = this.config.environment.timezone;
            this.config.ui.language = this.config.environment.language.split('-')[0];
            
            // Performance-based adjustments
            if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
                this.config.performance.enableWebWorkers = false;
                this.config.ui.animations = false;
            }
            
            this.initialized = true;
            console.log('🔧 Analytics configuration initialized with runtime values');
        }
        
        setupConfigWatchers() {
            // Watch for theme changes
            if (window.matchMedia) {
                const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
                const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
                const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
                
                darkModeQuery.addEventListener('change', (e) => {
                    if (this.config.ui.theme === 'auto') {
                        this.updateConfig('ui.theme', e.matches ? 'dark' : 'light');
                    }
                });
                
                reducedMotionQuery.addEventListener('change', (e) => {
                    this.updateConfig('ui.reducedMotion', e.matches);
                    this.updateConfig('ui.animations', !e.matches);
                });
                
                highContrastQuery.addEventListener('change', (e) => {
                    this.updateConfig('ui.accessibility.highContrast', e.matches);
                });
            }
        }
        
        getNestedValue(obj, path) {
            return path.split('.').reduce((current, key) => current?.[key], obj);
        }
        
        setNestedValue(obj, path, value) {
            const keys = path.split('.');
            let current = obj;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            const oldValue = current[keys[keys.length - 1]];
            current[keys[keys.length - 1]] = value;
            
            return oldValue;
        }
        
        updateConfig(path, value) {
            const oldValue = this.setNestedValue(this.config, path, value);
            
            // Add to history
            this.history.push({
                timestamp: Date.now(),
                path: path,
                oldValue: oldValue,
                newValue: value,
                source: 'runtime'
            });
            
            // Limit history length
            if (this.history.length > this.maxHistoryLength) {
                this.history = this.history.slice(-this.maxHistoryLength);
            }
            
            // Trigger watchers
            this.triggerWatchers(path, value, oldValue);
            
            console.log(`📝 Configuration updated: ${path} = ${JSON.stringify(value)}`);
        }
        
        triggerWatchers(path, newValue, oldValue) {
            for (const [watchPath, callback] of this.watchers) {
                if (path.startsWith(watchPath)) {
                    try {
                        callback(newValue, oldValue, path);
                    } catch (error) {
                        console.error(`Watcher error for ${watchPath}:`, error);
                    }
                }
            }
        }
        
        watch(path, callback) {
            if (typeof callback !== 'function') {
                throw new Error('Watcher callback must be a function');
            }
            
            const watcherId = `${path}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.watchers.set(watcherId, callback);
            
            return () => {
                this.watchers.delete(watcherId);
            };
        }
        
        getConfig(path) {
            if (path) {
                return this.getNestedValue(this.config, path);
            }
            return { ...this.config };
        }
        
        isFeatureEnabled(featureName) {
            return this.config.featureFlags[featureName] === true;
        }
        
        getModuleConfig(moduleName) {
            return this.config.modules[moduleName] || null;
        }
        
        validateSecurityRequirements() {
            const requirements = [
                'security.enableRequestSigning',
                'security.enableDataSanitization',
                'security.enableAuditLogging',
                'security.enableInputValidation'
            ];
            
            return requirements.every(req => this.getNestedValue(this.config, req) === true);
        }
        
        getEnvironmentInfo() {
            return {
                ...this.config.environment,
                configVersion: this.config.version.config,
                initialized: this.initialized,
                securityCompliant: this.validateSecurityRequirements()
            };
        }
        
        exportConfig(options = {}) {
            const {
                includeSecrets = false,
                format = 'json',
                includeMeta = true
            } = options;
            
            let configToExport = { ...this.config };
            
            // Remove sensitive data if not including secrets
            if (!includeSecrets) {
                configToExport = this.sanitizeConfig(configToExport);
            }
            
            const exportData = {
                config: configToExport,
                meta: includeMeta ? {
                    exportedAt: new Date().toISOString(),
                    version: this.config.version,
                    environment: this.config.environment.environment,
                    includeSecrets: includeSecrets
                } : undefined
            };
            
            if (format === 'json') {
                return JSON.stringify(exportData, null, 2);
            }
            
            return exportData;
        }
        
        sanitizeConfig(config) {
            const sanitized = JSON.parse(JSON.stringify(config));
            
            // Remove sensitive paths
            const sensitivePaths = [
                'api.authentication',
                'security.sensitiveDataPatterns',
                'monitoring.alerting.webhookUrls'
            ];
            
            sensitivePaths.forEach(path => {
                this.setNestedValue(sanitized, path, '[REDACTED]');
            });
            
            return sanitized;
        }
        
        reset() {
            this.config = JSON.parse(JSON.stringify(SECURE_ANALYTICS_CONFIG));
            this.history = [];
            this.watchers.clear();
            this.initializeRuntimeConfig();
            console.log('🔄 Configuration reset to defaults');
        }
        
        getValidationHistory() {
            return this.history.slice();
        }
        
        getHealthStatus() {
            return {
                initialized: this.initialized,
                configValid: true,
                securityCompliant: this.validateSecurityRequirements(),
                lastValidation: Date.now(),
                watchers: this.watchers.size,
                historyEntries: this.history.length
            };
        }
    }
    
    // Create global configuration manager instance
    window.OsliraApp = window.OsliraApp || {};
    window.OsliraApp.analyticsConfig = new SecureAnalyticsConfigManager();
    
    // Export configuration utilities
    export function getConfig(path) {
        return window.OsliraApp.analyticsConfig.getConfig(path);
    }
    
    export function updateConfig(path, value) {
        return window.OsliraApp.analyticsConfig.updateConfig(path, value);
    }
    
    export function isFeatureEnabled(featureName) {
        return window.OsliraApp.analyticsConfig.isFeatureEnabled(featureName);
    }
    
    export function getModuleConfig(moduleName) {
        return window.OsliraApp.analyticsConfig.getModuleConfig(moduleName);
    }
    
    export function watchConfig(path, callback) {
        return window.OsliraApp.analyticsConfig.watch(path, callback);
    }
    
    // Export for use in modules
    export { SECURE_ANALYTICS_CONFIG, SecureAnalyticsConfigManager };
    
    console.log('🔧 Secure Analytics Configuration loaded with enhanced validation and management');
