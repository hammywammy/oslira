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
        requestQueue: {
            maxSize: 100,
            processingDelay: 100,
            priorityLevels: ['critical', 'high', 'normal', 'low']
        }
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
        allowedOrigins: [
            'https://oslira.com',
            'https://app.oslira.com',
            'https://analytics.oslira.com'
        ],
        sensitiveDataPatterns: [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
            /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
            /\b\d{3}-\d{2}-\d{4}\b/ // SSN
        ],
        encryption: {
            algorithm: 'AES-256-GCM',
            keyRotationInterval: 86400000, // 24 hours
            enableAtRest: true,
            enableInTransit: true
        }
    },
    
    // Credit Configuration - Server-side credit management
    credits: {
        checkBalanceBeforeOperation: true, // Always verify credits before expensive ops
        enableUsagePrediction: true, // Predict credit consumption
        enableCostOptimization: true, // Optimize operations for credit efficiency
        logAllTransactions: true, // Audit trail for all credit operations
        minimumBalance: 1, // Minimum credits required for operations
        warningThreshold: 5, // Show warning when credits are low
        operationCosts: {
            lightAnalysis: 1,
            deepAnalysis: 2,
            riskAssessment: 1,
            insightGeneration: 3,
            bulkProcessing: 5,
            advancedAnalytics: 4,
            realTimeMonitoring: 2,
            exportOperations: 1
        },
        refundPolicies: {
            failedOperation: 'full_refund',
            partialCompletion: 'partial_refund',
            userCancellation: 'no_refund'
        }
    },
    
    // AI Configuration - Claude and AI service settings
    ai: {
        enableAdvancedRiskScoring: true, // Advanced risk analysis via Claude
        enableInsightGeneration: true, // AI-powered insights and recommendations
        enableFeedbackClassification: true, // Sentiment and theme analysis
        enableExperimentSuggestions: false, // A/B test suggestions (beta feature)
        enablePatternAnalysis: true, // Pattern recognition and trends
        enablePredictiveAnalytics: false, // Predictive modeling (enterprise feature)
        promptVersion: 'v2.1', // Claude prompt template version
        modelSettings: {
            temperature: 0.3, // Lower temperature for consistent analytics
            maxTokens: 4000, // Maximum response length
            topP: 0.9, // Nucleus sampling parameter
            frequencyPenalty: 0.1,
            presencePenalty: 0.1
        },
        rateLimits: {
            requestsPerMinute: 60,
            tokensPerDay: 100000,
            concurrentRequests: 3
        },
        fallbackStrategies: {
            onRateLimit: 'queue_request',
            onError: 'retry_with_backoff',
            onTimeout: 'return_cached_result'
        }
    },
    
    // Analytics Modules Configuration
    modules: {
        messageStyleMatrix: {
            enabled: true,
            refreshInterval: 300000, // 5 minutes
            cacheTimeout: 1800000, // 30 minutes
            maxDataPoints: 1000,
            enableRealTime: false
        },
        leadConversionHeatmap: {
            enabled: true,
            refreshInterval: 600000, // 10 minutes
            cacheTimeout: 3600000, // 1 hour
            maxDataPoints: 500,
            enableRealTime: false
        },
        ctaEffectiveness: {
            enabled: true,
            refreshInterval: 900000, // 15 minutes
            cacheTimeout: 1800000, // 30 minutes
            maxDataPoints: 200,
            enableRealTime: true
        },
        feedbackExplorer: {
            enabled: true,
            refreshInterval: 1800000, // 30 minutes
            cacheTimeout: 3600000, // 1 hour
            maxDataPoints: 1000,
            enableRealTime: false,
            requiresAI: true
        },
        crmComparator: {
            enabled: true,
            refreshInterval: 3600000, // 1 hour
            cacheTimeout: 7200000, // 2 hours
            maxDataPoints: 100,
            enableRealTime: false
        },
        timelineOverlay: {
            enabled: true,
            refreshInterval: 600000, // 10 minutes
            cacheTimeout: 1800000, // 30 minutes
            maxDataPoints: 2000,
            enableRealTime: true
        },
        iterationTracker: {
            enabled: true,
            refreshInterval: 300000, // 5 minutes
            cacheTimeout: 900000, // 15 minutes
            maxDataPoints: 500,
            enableRealTime: true
        },
        teamDashboard: {
            enabled: true,
            refreshInterval: 900000, // 15 minutes
            cacheTimeout: 1800000, // 30 minutes
            maxDataPoints: 50,
            enableRealTime: false
        },
        claudeGuidance: {
            enabled: true,
            refreshInterval: 1800000, // 30 minutes
            cacheTimeout: 3600000, // 1 hour
            maxDataPoints: 200,
            enableRealTime: false,
            requiresAI: true
        },
        riskClassifier: {
            enabled: true,
            refreshInterval: 300000, // 5 minutes
            cacheTimeout: 600000, // 10 minutes
            maxDataPoints: 1000,
            enableRealTime: true,
            requiresAI: true
        }
    },
    
    // Performance and Optimization Settings
    performance: {
        enableCaching: true,
        enableCompression: true,
        enableLazyLoading: true,
        enableVirtualScrolling: true,
        maxMemoryUsage: 134217728, // 128MB
        garbageCollectionInterval: 300000, // 5 minutes
        preloadStrategy: 'critical_modules_only',
        batchProcessing: {
            enabled: true,
            batchSize: 50,
            processingDelay: 100,
            maxBatchWait: 5000
        },
        chartOptimization: {
            maxDataPoints: 1000,
            enableDecimation: true,
            enableAnimation: true,
            animationDuration: 750
        }
    },
    
    // Real-time Features Configuration
    realTime: {
        enableWebSockets: false, // Disabled for security
        enablePolling: true,
        pollingInterval: 30000, // 30 seconds
        enableNotifications: true,
        maxConcurrentConnections: 1,
        heartbeatInterval: 60000, // 1 minute
        reconnectAttempts: 5,
        reconnectDelay: 5000
    },
    
    // Export and Reporting Configuration
    export: {
        enablePDFExport: true,
        enableCSVExport: true,
        enableExcelExport: true,
        enableJSONExport: true,
        maxExportSize: 52428800, // 50MB
        enableScheduledReports: false, // Enterprise feature
        reportFormats: {
            pdf: {
                orientation: 'landscape',
                format: 'A4',
                includeCharts: true,
                includeMetadata: true
            },
            csv: {
                delimiter: ',',
                encoding: 'utf-8',
                includeHeaders: true
            },
            excel: {
                includeCharts: true,
                multipleSheets: true,
                formatting: true
            }
        }
    },
    
    // Error Handling and Monitoring
    monitoring: {
        enableErrorTracking: true,
        enablePerformanceMonitoring: true,
        enableUsageAnalytics: true,
        errorReportingEndpoint: '/api/errors',
        performanceThresholds: {
            loadTime: 3000, // 3 seconds
            renderTime: 1000, // 1 second
            apiResponseTime: 5000, // 5 seconds
            memoryUsage: 134217728 // 128MB
        },
        alerting: {
            enableEmailAlerts: false,
            enableSlackAlerts: false,
            enableWebhookAlerts: true,
            criticalErrorThreshold: 5, // errors per minute
            performanceDegradationThreshold: 10000 // ms
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
        enableHighContrastMode: false
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
        consentManagement: {
            requiredForAnalytics: true,
            requiredForPersonalization: true,
            granularConsent: true
        }
    },
    
    // Development and Debug Settings
    debug: {
        enableConsoleLogging: window.location.hostname === 'localhost',
        enablePerformanceProfiling: false,
        enableNetworkDebugging: false,
        enableStateDebugging: false,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        enableMockData: false,
        enableTestMode: false
    },
    
    // Version and Build Information
    version: {
        app: '1.3.0',
        config: '2.1.0',
        api: '1.2.0',
        build: process.env.BUILD_NUMBER || 'development',
        buildDate: new Date().toISOString(),
        gitCommit: process.env.GIT_COMMIT || 'unknown'
    }
};

// Configuration validation and initialization
class SecureAnalyticsConfigManager {
    constructor() {
        this.config = SECURE_ANALYTICS_CONFIG;
        this.initialized = false;
        this.validationRules = new Map();
        
        this.setupValidationRules();
        this.validateConfiguration();
        this.initializeRuntimeConfig();
    }
    
    setupValidationRules() {
        this.validationRules.set('worker.baseUrl', (value) => {
            return typeof value === 'string' && value.startsWith('https://');
        });
        
        this.validationRules.set('security.maxRequestSize', (value) => {
            return typeof value === 'number' && value > 0 && value <= 104857600; // Max 100MB
        });
        
        this.validationRules.set('credits.minimumBalance', (value) => {
            return typeof value === 'number' && value >= 0;
        });
    }
    
    validateConfiguration() {
        const errors = [];
        
        for (const [path, validator] of this.validationRules) {
            const value = this.getNestedValue(this.config, path);
            if (!validator(value)) {
                errors.push(`Invalid configuration at ${path}: ${value}`);
            }
        }
        
        if (errors.length > 0) {
            console.error('❌ Configuration validation failed:', errors);
            throw new Error('Invalid analytics configuration');
        }
        
        console.log('✅ Analytics configuration validated successfully');
    }
    
    initializeRuntimeConfig() {
        // Update configuration with runtime values
        this.config.worker.baseUrl = window.OsliraApp?.config?.workerUrl || this.config.worker.baseUrl;
        this.config.debug.enableConsoleLogging = window.location.hostname === 'localhost';
        
        // Apply feature flags from OsliraApp if available
        if (window.OsliraApp?.featureFlags) {
            Object.assign(this.config.featureFlags, window.OsliraApp.featureFlags);
        }
        
        this.initialized = true;
        console.log('🔧 Analytics configuration initialized');
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    updateConfig(path, value) {
        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        console.log(`📝 Configuration updated: ${path} = ${value}`);
    }
    
    getConfig(path) {
        if (path) {
            return this.getNestedValue(this.config, path);
        }
        return this.config;
    }
    
    isFeatureEnabled(featureName) {
        return this.config.featureFlags[featureName] === true;
    }
    
    getModuleConfig(moduleName) {
        return this.config.modules[moduleName] || null;
    }
    
    validateSecurityRequirements() {
        const requirements = [
            'enableRequestSigning',
            'enableDataSanitization',
            'enableAuditLogging'
        ];
        
        return requirements.every(req => this.config.security[req] === true);
    }
}

// Create global configuration manager instance
window.OsliraApp = window.OsliraApp || {};
window.OsliraApp.analyticsConfig = new SecureAnalyticsConfigManager();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SECURE_ANALYTICS_CONFIG, SecureAnalyticsConfigManager };
}

console.log('🔧 Secure Analytics Configuration loaded');
export { SECURE_ANALYTICS_CONFIG, SecureAnalyticsConfigManager };
