import { CHART_THEMES } from '../utils/chartThemes.js';
import { LEAD_TYPES } from '../utils/leadTypes.js';
import { MESSAGE_STYLES } from '../utils/messageStyles.js';
import { PERFORMANCE_THRESHOLDS } from '../utils/performanceThresholds.js';
import { CACHE_KEYS } from '../utils/cacheKeys.js';
import { EXPORT_CONFIG } from '../utils/exportConfig.js';

const ANALYTICS_CONFIG = {
    // Supabase configuration - dynamically loaded from env
    supabase: {
        projectUrl: window.OsliraApp?.config?.supabaseUrl,
        anonKey: window.OsliraApp?.config?.supabaseAnonKey,
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        batchSize: 100,
        maxQueryResults: 1000
    },
    
    // Cloudflare Worker API endpoints - dynamically configured
    api: {
        baseUrl: window.OsliraApp?.config?.workerUrl,
        analyticsEndpoint: window.OsliraApp?.config?.workerUrl + '/analytics',
        aiRiskEndpoint: window.OsliraApp?.config?.workerUrl + '/ai-risk',
        aiInsightsEndpoint: window.OsliraApp?.config?.workerUrl + '/ai-insights',
        aiAnalyzeEndpoint: window.OsliraApp?.config?.workerUrl + '/ai-analyze',
        aiFeedbackEndpoint: window.OsliraApp?.config?.workerUrl + '/ai-feedback',
        exportEndpoint: window.OsliraApp?.config?.workerUrl + '/analytics/export',
        timeout: 45000,
        retryAttempts: 2,
        retryDelay: 2000,
        requestsPerMinute: 60,
        requestInterval: 1000
    },
    
    // Feature flags for gradual rollout and testing
    featureFlags: {
        // Core analytics features
        enableRealTimeUpdates: true,
        enableAdvancedCharts: true,
        enableExportFeatures: true,
        
        // AI/Claude integration features
        enableClaudeV2: false,
        enableAdvancedRiskScoring: true,
        enableAIInsightGeneration: true,
        enableSmartRecommendations: false,
        
        // Chart and visualization features
        useAdvancedHeatmap: true,
        enableInteractiveTimeline: true,
        enable3DMatrix: false,
        enableAnimatedTransitions: true,
        
        // Performance and optimization features
        enableVirtualScrolling: true,
        enableDataPreloading: true,
        enableIntelligentCaching: true,
        enableProgressiveLoading: false,
        
        // Team and collaboration features
        enableTeamAnalytics: true,
        enableCollaborativeInsights: false,
        enableRealTimeCollaboration: false,
        
        // Experimental features
        enablePredictiveAnalytics: false,
        enableCompetitiveIntelligence: false,
        enableRevenueAttribution: false,
        enableICPDriftDetection: false,
        enableSmartSplitTesting: false,
        enableCustomDashboards: false,
        
        // Mobile and accessibility features
        enableMobileOptimizations: true,
        enableAccessibilityMode: false,
        enableHighContrastMode: false,
        enableReducedMotion: false,
        
        // Data and privacy features
        enableDataAnonymization: true,
        enableGDPRCompliance: true,
        enableAuditLogging: false
    },
    
    // Chart default settings
    charts: {
        defaultWidth: 800,
        defaultHeight: 400,
        animationDuration: 750,
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: window.devicePixelRatio || 1,
        
        matrix: {
            cellSize: 40,
            padding: 10,
            heatmapIntensity: 0.8,
            enable3D: false // Controlled by featureFlags.enable3DMatrix
        },
        
        heatmap: {
            colorSteps: 5,
            minOpacity: 0.2,
            maxOpacity: 1.0,
            useAdvanced: true // Controlled by featureFlags.useAdvancedHeatmap
        },
        
        timeline: {
            pointRadius: 6,
            lineWidth: 3,
            eventMarkerSize: 12,
            enableInteractivity: true // Controlled by featureFlags.enableInteractiveTimeline
        },
        
        comparison: {
            barThickness: 20,
            categoryPercentage: 0.8,
            barPercentage: 0.9
        }
    },
    
    // Performance thresholds and optimization settings
    performance: {
        maxDataPoints: 10000,
        batchLoadSize: 500,
        virtualScrollThreshold: 100,
        cacheTimeout: 3600000, // 1 hour
        maxCacheSize: 50,
        preloadDataDays: 7,
        maxChartDataPoints: 1000,
        chartUpdateDebounce: 300,
        resizeDebounce: 250,
        memoryCleanupInterval: 600000, // 10 minutes
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        maxRealTimeUpdates: 10,
        realTimeThrottle: 5000, // 5 seconds
        
        // Feature-dependent settings
        enableVirtualScrolling: true, // Controlled by featureFlags.enableVirtualScrolling
        enableDataPreloading: true,   // Controlled by featureFlags.enableDataPreloading
        enableIntelligentCaching: true // Controlled by featureFlags.enableIntelligentCaching
    },
    
    // Update intervals for real-time data
    updateIntervals: {
        dashboard: 30000, // 30 seconds
        messageMatrix: 60000, // 1 minute
        conversionHeatmap: 120000, // 2 minutes
        ctaTracker: 180000, // 3 minutes
        feedbackExplorer: 300000, // 5 minutes
        crmComparator: 600000, // 10 minutes
        timeline: 300000, // 5 minutes
        iterationTracker: 180000, // 3 minutes
        teamDashboard: 300000, // 5 minutes
        claudeGuidance: 600000, // 10 minutes
        riskClassifier: 120000, // 2 minutes
        cacheRefresh: 1800000, // 30 minutes
        dataCleanup: 3600000, // 1 hour
        performanceCheck: 300000 // 5 minutes
    },
    
    // Environment-specific settings
    environment: {
        isDevelopment: window.location.hostname === 'localhost' || window.location.hostname.includes('netlify'),
        isProduction: window.location.hostname.includes('oslira.com'),
        enableDebugLogging: window.location.hostname === 'localhost',
        enablePerformanceMonitoring: true,
        enableErrorReporting: true
    },
    
    // Security and privacy settings
    security: {
        enableDataEncryption: true,
        enableAuditLogging: false, // Controlled by featureFlags.enableAuditLogging
        sessionTimeout: 7200000, // 2 hours
        maxLoginAttempts: 3,
        enableCSRFProtection: true,
        enableRateLimiting: true
    },
    
    // Accessibility settings
    accessibility: {
        enableHighContrast: false, // Controlled by featureFlags.enableHighContrastMode
        enableReducedMotion: false, // Controlled by featureFlags.enableReducedMotion
        enableScreenReaderSupport: true,
        enableKeyboardNavigation: true,
        enableFocusIndicators: true
    },

    chartThemes: CHART_THEMES,
    leadTypes: LEAD_TYPES,
    messageStyles: MESSAGE_STYLES,
    performanceThresholds: PERFORMANCE_THRESHOLDS,
    cacheKeys: CACHE_KEYS,
    exportConfig: EXPORT_CONFIG,


    versioning: {
      version: 'v1.3.0',
      buildDate: '2025-07-18',
      buildHash: 'a1f5c2b',
      environment: window.location.hostname.includes('oslira.com') ? 'production' : 'development'
    },

    telemetry: {
      enableErrorReporting: true,
      sendUsageMetrics: false,
      logFeatureFlags: true,
      capturePerformanceStats: true,
      anonymizeData: true
    }

};

// Dynamic configuration loader
const loadDynamicConfig = () => {
    // Wait for OsliraApp to be available
    if (!window.OsliraApp?.config) {
        console.warn('OsliraApp config not available, using defaults');
        return;
    }
    
    // Update API endpoints with actual worker URL
    const workerUrl = window.OsliraApp.config.workerUrl;
    if (workerUrl) {
        ANALYTICS_CONFIG.api.baseUrl = workerUrl;
        ANALYTICS_CONFIG.api.analyticsEndpoint = `${workerUrl}/analytics`;
        ANALYTICS_CONFIG.api.aiRiskEndpoint = `${workerUrl}/ai-risk`;
        ANALYTICS_CONFIG.api.aiInsightsEndpoint = `${workerUrl}/ai-insights`;
        ANALYTICS_CONFIG.api.aiAnalyzeEndpoint = `${workerUrl}/ai-analyze`;
        ANALYTICS_CONFIG.api.aiFeedbackEndpoint = `${workerUrl}/ai-feedback`;
        ANALYTICS_CONFIG.api.exportEndpoint = `${workerUrl}/analytics/export`;
    }
    
    // Update Supabase config
    if (window.OsliraApp.config.supabaseUrl) {
        ANALYTICS_CONFIG.supabase.projectUrl = window.OsliraApp.config.supabaseUrl;
    }
    if (window.OsliraApp.config.supabaseAnonKey) {
        ANALYTICS_CONFIG.supabase.anonKey = window.OsliraApp.config.supabaseAnonKey;
    }
    
    // Environment detection
    ANALYTICS_CONFIG.environment.isDevelopment = window.location.hostname === 'localhost' || 
                                                 window.location.hostname.includes('netlify');
    ANALYTICS_CONFIG.environment.isProduction = window.location.hostname.includes('oslira.com');
    ANALYTICS_CONFIG.environment.enableDebugLogging = ANALYTICS_CONFIG.environment.isDevelopment;
    
    console.log('🔧 Analytics config dynamically loaded:', ANALYTICS_CONFIG);

    if (ANALYTICS_CONFIG.environment.isDevelopment) {
      console.log(`📦 Analytics v${ANALYTICS_CONFIG.versioning.version} | Build: ${ANALYTICS_CONFIG.versioning.buildDate}`);
      if (ANALYTICS_CONFIG.telemetry.logFeatureFlags) {
          console.table(getFeatureFlags());
      }
  }

};

// Feature flag helper functions
const isFeatureEnabled = (flagName) => {
    return ANALYTICS_CONFIG.featureFlags[flagName] === true;
};

const enableFeature = (flagName) => {
    ANALYTICS_CONFIG.featureFlags[flagName] = true;
    console.log(`✅ Feature enabled: ${flagName}`);
};

const disableFeature = (flagName) => {
    ANALYTICS_CONFIG.featureFlags[flagName] = false;
    console.log(`❌ Feature disabled: ${flagName}`);
};

const getFeatureFlags = () => {
    return { ...ANALYTICS_CONFIG.featureFlags };
};

export {
  ANALYTICS_CONFIG,
  isFeatureEnabled,
  enableFeature,
  disableFeature,
  getFeatureFlags,
  loadDynamicConfig
};

