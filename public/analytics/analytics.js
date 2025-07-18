/*
===============================================================================
                        ANALYTICS DASHBOARD CORE SYSTEM
===============================================================================
Main orchestrator class that initializes and manages the entire analytics platform.
Handles startup sequence, component coordination, and global state management.
*/

// ===== ANALYTICS DASHBOARD CORE CLASS =====
class AnalyticsDashboard {
    constructor() {
        // Initialize dashboard state, config, and core dependencies
        this.initialized = false;
        this.modules = new Map();
        this.dataLayer = null;
        this.claudeService = null;
        this.filterManager = null;
        this.chartFactory = null;
        
        // Fix 5: Debounced refresh to prevent performance spikes
        this.debouncedRefresh = this.debounce(this.applyFiltersAndRefresh.bind(this), ANALYTICS_CONFIG.performance.debounceDelay);
    }

    async init() {
        // Main initialization sequence
        try {
            // Validate configuration - Fix 3 & 4: Ensure endpoints are configured
            this.validateConfig();
            
            // Setup Supabase connection
            this.dataLayer = new DataLayer();
            await this.dataLayer.init();
            
            // Initialize Claude API - Fix 1: Remove unnecessary await for non-async method
            this.claudeService = new ClaudeService();
            // Only validate connection if needed, don't await empty initialize()
            
            // Setup event listeners with debounced handlers
            this.setupEventListeners();
            
            // Initialize other core services - Fix 6: Remove empty initialize calls
            this.filterManager = new FilterManager();
            this.chartFactory = new ChartFactory();
            
            // Load initial data
            await this.loadInitialData();
            
            // Render dashboard layout
            this.renderDashboardLayout();
            
            this.initialized = true;
            console.log('Analytics Dashboard initialized successfully');
            
        } catch (error) {
            ErrorHandler.handleAPIError(error, 'Dashboard Initialization');
            throw error;
        }
    }

    validateConfig() {
        // Fix 3 & 4: Ensure worker URL fallback and endpoint configuration
        if (!ANALYTICS_CONFIG.endpoints.aiRiskAssessment) {
            throw new Error('Claude worker endpoint not configured');
        }
        
        if (!window.OsliraApp?.config?.workerUrl) {
            console.warn('Worker URL not found, using fallback endpoint');
        }
    }

    setupEventListeners() {
        // Setup global event listeners for dashboard interactions
        // Fix 5: Use debounced refresh for filter changes
        document.addEventListener('filterChange', (event) => {
            this.debouncedRefresh(event.detail.filters);
        });
        
        document.addEventListener('dataRefresh', () => {
            this.refreshAllModules();
        });
        
        document.addEventListener('exportRequest', (event) => {
            this.handleExportRequest(event.detail.type);
        });
    }

    async loadInitialData() {
        // Load initial data for dashboard
        try {
            const initialFilters = this.filterManager.getDefaultFilters();
            await this.dataLayer.fetchAnalyticsData(initialFilters);
        } catch (error) {
            ErrorHandler.handleAPIError(error, 'Initial Data Load');
        }
    }

    renderDashboardLayout() {
        // Render dashboard layout and initialize modules
        this.initializeAnalyticsModules();
        this.renderFilterPanel();
        this.renderExportControls();
    }

    initializeAnalyticsModules() {
        // Initialize all analytics modules
        const moduleConfigs = [
            { name: 'messageStyleMatrix', class: MessageStyleMatrix, container: '#message-style-container' },
            { name: 'leadConversionHeatmap', class: LeadConversionHeatmap, container: '#lead-conversion-container' },
            { name: 'ctaTracker', class: CTAEffectivenessTracker, container: '#cta-tracker-container' },
            { name: 'feedbackExplorer', class: FeedbackSignalExplorer, container: '#feedback-explorer-container' },
            { name: 'crmComparator', class: CRMPerformanceComparator, container: '#crm-comparator-container' },
            { name: 'timelineOverlay', class: OutreachTimelineOverlay, container: '#timeline-overlay-container' },
            { name: 'roiTracker', class: MessageIterationROITracker, container: '#roi-tracker-container' },
            { name: 'teamDashboard', class: TeamImpactDashboard, container: '#team-dashboard-container' },
            { name: 'claudeHistory', class: ClaudeGuidanceHistory, container: '#claude-history-container' },
            { name: 'riskClassifier', class: MessageRiskClassifier, container: '#risk-classifier-container' }
        ];

        moduleConfigs.forEach(config => {
            const container = document.querySelector(config.container);
            if (container) {
                const module = new config.class(container, this.dataLayer, this.claudeService);
                this.modules.set(config.name, module);
            }
        });
    }

    renderFilterPanel() {
        // Render filter panel interface
        const filterContainer = document.querySelector('#filter-panel');
        if (filterContainer) {
            this.filterManager.render(filterContainer);
        }
    }

    renderExportControls() {
        // Render export and sharing controls
        const exportContainer = document.querySelector('#export-controls');
        if (exportContainer) {
            this.setupExportControls(exportContainer);
        }
    }

    async applyFiltersAndRefresh(filters) {
        // Apply filters and refresh all modules
        try {
            UIHelpers.showLoading(document.querySelector('#dashboard-container'));
            
            // Update data layer with new filters
            await this.dataLayer.fetchAnalyticsData(filters);
            
            // Refresh all modules
            await this.refreshAllModules();
            
            UIHelpers.hideLoading(document.querySelector('#dashboard-container'));
            
        } catch (error) {
            ErrorHandler.handleAPIError(error, 'Filter Application');
        }
    }

    async refreshAllModules() {
        // Refresh all analytics modules with current data
        const refreshPromises = Array.from(this.modules.values()).map(module => {
            if (module.render && typeof module.render === 'function') {
                return module.render();
            }
        });
        
        await Promise.allSettled(refreshPromises);
    }

    setupExportControls(container) {
        // Setup export functionality
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export Dashboard';
        exportButton.className = 'bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600';
        exportButton.addEventListener('click', () => {
            this.handleExportRequest('pdf');
        });
        
        container.appendChild(exportButton);
    }

    async handleExportRequest(type) {
        // Handle export requests
        try {
            const exportManager = new ExportManager();
            await exportManager.exportToPDF('dashboard-container', { type });
        } catch (error) {
            ErrorHandler.handleAPIError(error, 'Export');
        }
    }

    debounce(func, delay) {
        // Utility method for debouncing function calls
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    destroy() {
        // Clean up dashboard resources
        this.modules.forEach(module => {
            if (module.destroy && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        
        this.modules.clear();
        this.initialized = false;
    }
}

/*
===============================================================================
                           CONFIGURATION & CONSTANTS
===============================================================================
Central configuration hub containing all system settings, API endpoints,
chart themes, data classifications, and performance thresholds.
*/

// ===== CONFIGURATION & CONSTANTS =====
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

// Chart themes with feature flag support
const CHART_THEMES = {
    // Color palette matching dashboard.css CSS variables
    colors: {
        primary: '#2D6CDF',
        secondary: '#8A6DF1',
        accent: '#53E1C5',
        warning: '#F59E0B',
        error: '#EF4444',
        success: '#10B981',
        info: '#3B82F6',
        neutral: '#6B7280'
    },
    
    // Chart color schemes
    schemes: {
        performance: ['#EF4444', '#F59E0B', '#10B981'],
        categorical: ['#2D6CDF', '#8A6DF1', '#53E1C5', '#FF6B35', '#10B981', '#F59E0B', '#EF4444', '#6366F1'],
        heatmap: ['#F3F4F6', '#E5E7EB', '#9CA3AF', '#6B7280', '#374151'],
        sequential: ['#E8F3FF', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'],
        diverging: ['#DC2626', '#F87171', '#FEF3C7', '#86EFAC', '#10B981'],
        
        // High contrast themes for accessibility
        highContrast: {
            primary: '#000000',
            secondary: '#FFFFFF', 
            accent: '#FFD700',
            warning: '#FF0000',
            error: '#FF0000',
            success: '#00FF00',
            info: '#0000FF',
            neutral: '#808080'
        }
    },
    
    // Font configuration matching dashboard typography
    fonts: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        sizes: {
            title: 16,
            subtitle: 14,
            body: 12,
            caption: 10,
            legend: 11
        },
        weights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
        }
    },
    
    // Animation configurations with accessibility support
    animations: {
        standard: { 
            duration: () => isFeatureEnabled('enableReducedMotion') ? 0 : 750, 
            easing: 'easeInOutQuart' 
        },
        realTime: { 
            duration: () => isFeatureEnabled('enableReducedMotion') ? 0 : 300, 
            easing: 'easeOutQuart' 
        },
        complex: { 
            duration: () => isFeatureEnabled('enableReducedMotion') ? 0 : 1200, 
            easing: 'easeInOutCubic' 
        },
        none: { duration: 0 }
    },
    
    // Responsive breakpoints
    responsive: {
        mobile: 480,
        tablet: 768,
        desktop: 1024,
        wide: 1400
    },
    
    // Theme selection based on feature flags
    getActiveTheme: () => {
        if (isFeatureEnabled('enableHighContrastMode')) {
            return {
                ...CHART_THEMES,
                colors: CHART_THEMES.schemes.highContrast
            };
        }
        return CHART_THEMES;
    }
};

const LEAD_TYPES = {
    personal_brand: {
        name: 'Personal Brand',
        description: 'Individual influencers and thought leaders',
        characteristics: ['Personal storytelling', 'Authentic voice', 'Direct engagement', 'Expertise sharing'],
        typicalFollowers: '1K-100K',
        engagementRate: '3-8%',
        conversionPotential: 'High'
    },
    
    business_page: {
        name: 'Business Page', 
        description: 'Company accounts and brand pages',
        characteristics: ['Professional content', 'Brand messaging', 'Product/service focus', 'Corporate voice'],
        typicalFollowers: '5K-500K',
        engagementRate: '1-4%',
        conversionPotential: 'Medium'
    },
    
    creator: {
        name: 'Creator',
        description: 'Content creators and digital artists',
        characteristics: ['Creative content', 'Visual storytelling', 'Community building', 'Trend participation'],
        typicalFollowers: '10K-1M',
        engagementRate: '4-10%',
        conversionPotential: 'High'
    },
    
    meme_page: {
        name: 'Meme Page',
        description: 'Entertainment and humor-focused accounts',
        characteristics: ['Viral content', 'Humor-based', 'High engagement', 'Trend-following'],
        typicalFollowers: '50K-5M',
        engagementRate: '5-15%',
        conversionPotential: 'Low'
    }
};

const MESSAGE_STYLES = {
    // Tone categories with performance metrics
    tones: {
        formal: {
            name: 'Formal',
            description: 'Professional and structured communication',
            avgResponseRate: 0.15,
            conversionRate: 0.08,
            bestFor: ['business_page']
        },
        
        casual: {
            name: 'Casual',
            description: 'Relaxed and conversational style',
            avgResponseRate: 0.22,
            conversionRate: 0.12,
            bestFor: ['personal_brand', 'creator']
        },
        
        friendly: {
            name: 'Friendly',
            description: 'Warm and personable communication',
            avgResponseRate: 0.28,
            conversionRate: 0.15,
            bestFor: ['personal_brand', 'creator']
        },
        
        professional: {
            name: 'Professional',
            description: 'Business-focused with expertise emphasis',
            avgResponseRate: 0.18,
            conversionRate: 0.10,
            bestFor: ['business_page']
        },
        
        humorous: {
            name: 'Humorous',
            description: 'Light-hearted with appropriate humor',
            avgResponseRate: 0.35,
            conversionRate: 0.08,
            bestFor: ['meme_page', 'creator']
        }
    },
    
    // Structure types for message organization
    structures: {
        short: {
            name: 'Short Form',
            description: 'Concise, direct messages',
            wordRange: '20-50',
            avgEngagement: 0.25
        },
        
        medium: {
            name: 'Medium Form',
            description: 'Balanced detail and brevity',
            wordRange: '50-150',
            avgEngagement: 0.20
        },
        
        long: {
            name: 'Long Form',
            description: 'Detailed, comprehensive messages',
            wordRange: '150-400',
            avgEngagement: 0.12
        },
        
        bullet: {
            name: 'Bullet Points',
            description: 'Structured, scannable format',
            avgEngagement: 0.18
        },
        
        question: {
            name: 'Question-Based',
            description: 'Engagement through inquiry',
            avgEngagement: 0.30
        }
    }
};

// Performance benchmarks and scoring thresholds
const PERFORMANCE_THRESHOLDS = {
    responseRates: {
        excellent: 0.30,
        good: 0.20,
        average: 0.10,
        poor: 0.05,
        veryPoor: 0.02
    },
    
    conversionRates: {
        excellent: 0.15,
        good: 0.10,
        average: 0.05,
        poor: 0.02,
        veryPoor: 0.01
    },
    
    engagementScores: {
        excellent: 80,
        good: 60,
        average: 40,
        poor: 20,
        veryPoor: 0
    },
    
    riskScores: {
        low: 20,
        moderate: 50,
        high: 80,
        veryHigh: 100
    },
    
    leadQuality: {
        highValue: 80,
        mediumValue: 60,
        lowValue: 40,
        veryLow: 0
    }
};

// Data refresh and cache management constants
const CACHE_KEYS = {
    MESSAGE_MATRIX: 'analytics_message_matrix',
    CONVERSION_HEATMAP: 'analytics_conversion_heatmap',
    CTA_TRACKER: 'analytics_cta_tracker',
    FEEDBACK_EXPLORER: 'analytics_feedback_explorer',
    CRM_COMPARATOR: 'analytics_crm_comparator',
    TIMELINE_OVERLAY: 'analytics_timeline_overlay',
    ITERATION_TRACKER: 'analytics_iteration_tracker',
    TEAM_DASHBOARD: 'analytics_team_dashboard',
    CLAUDE_GUIDANCE: 'analytics_claude_guidance',
    RISK_CLASSIFIER: 'analytics_risk_classifier',
    USER_PROFILE: 'analytics_user_profile',
    BUSINESS_DATA: 'analytics_business_data',
    FILTER_STATE: 'analytics_filter_state',
    EXPORT_CONFIG: 'analytics_export_config',
    FEATURE_FLAGS: 'analytics_feature_flags'
};

// Export and reporting configuration
const EXPORT_CONFIG = {
    formats: {
        pdf: {
            name: 'PDF Report',
            mimeType: 'application/pdf',
            extension: '.pdf',
            features: ['charts', 'tables', 'insights', 'branding']
        },
        csv: {
            name: 'CSV Data',
            mimeType: 'text/csv',
            extension: '.csv',
            features: ['raw_data', 'processed_data']
        },
        json: {
            name: 'JSON Data',
            mimeType: 'application/json',
            extension: '.json',
            features: ['raw_data', 'metadata', 'structure']
        },
        xlsx: {
            name: 'Excel Workbook',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            extension: '.xlsx',
            features: ['multiple_sheets', 'charts', 'formatting', 'formulas']
        }
    },
    
    defaults: {
        format: 'pdf',
        includeCharts: true,
        includeTables: true,
        includeInsights: true,
        dateRange: '30d',
        compression: true
    }
};

// Initialize configuration when DOM is ready or OsliraApp is available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicConfig);
} else {
    loadDynamicConfig();
}

// Also listen for OsliraApp initialization
if (window.OsliraApp?.events) {
    window.OsliraApp.events.addEventListener('appInitialized', loadDynamicConfig);
}

// Export helper functions globally
window.AnalyticsConfig = {
    isFeatureEnabled,
    enableFeature,
    disableFeature,
    getFeatureFlags,
    loadDynamicConfig
};

const CHART_THEMES = {
    // Color schemes for different chart types
    // Font settings
    // Animation configs
};

const LEAD_TYPES = {
    // Personal Brand, Business Page, Creator, Meme Page definitions
};

const MESSAGE_STYLES = {
    // Tone categories
    // Structure types
    // CTA classifications
};

/*
===============================================================================
                         DATA LAYER & API SERVICES
===============================================================================
Core data management system handling all database interactions, API calls,
caching, and data transformation. This is the foundation that feeds all
analytics modules with clean, processed data.
*/

// ===== DATA LAYER & API SERVICES =====
class DataLayer {
    constructor() {
        // Initialize data layer with caching
    }

    async fetchAnalyticsData(filters = {}) {
        // Main data fetching orchestrator
        // - Apply filters
        // - Check cache first
        // - Fetch from Supabase
        // - Process and format data
        // - Update cache
    }

    async getMessageStyleData(filters) {
        // Fetch message style performance data
        // - Group by tone, structure, engagement
        // - Calculate performance metrics
        // - Apply time range filters
    }

    async getLeadConversionData(filters) {
        // Fetch lead type conversion data
        // - Group by lead archetype
        // - Calculate conversion rates
        // - Include engagement metrics
    }

    async getCTAEffectivenessData(filters) {
        // Fetch CTA performance data
        // - Track CTA usage frequency
        // - Calculate success rates
        // - Sort by effectiveness
    }

    async getFeedbackSignalData(filters) {
        // Fetch feedback and sentiment data
        // - Process freeform comments
        // - Aggregate tags and votes
        // - Track trend changes
    }

    async getCRMPerformanceData(filters) {
        // Fetch CRM comparison data
        // - Win rates by CRM
        // - Quality scores
        // - Style consistency metrics
    }

    async getTimelineData(filters) {
        // Fetch timeline events and correlations
        // - Campaign launches
        // - Performance changes
        // - Strategy adjustments
    }

    async getIterationROIData(filters) {
        // Fetch message iteration tracking
        // - Before/after performance
        // - Regeneration impact
        // - ROI calculations
    }

    async getTeamImpactData(filters) {
        // Fetch team performance data
        // - Individual contributor metrics
        // - Claude feedback utilization
        // - Performance improvements
    }

    async getClaudeGuidanceData(filters) {
        // Fetch Claude advice history
        // - Historical recommendations
        // - Implementation tracking
        // - Success correlation
    }

    async getMessageRiskData(filters) {
        // Fetch message risk analysis
        // - Risk score calculations
        // - Flag frequency
        // - Risk trend analysis
    }
}

class SupabaseService {
    constructor() {
        // Initialize Supabase client
    }

    async executeQuery(query, params = {}) {
        // Execute Supabase queries with error handling
        // - Query validation
        // - Error handling
        // - Response formatting
    }

    async getMessages(filters) {
        // Query messages table with filters
    }

    async getFeedback(messageIds) {
        // Query feedback table for specific messages
    }

    async getLeads(filters) {
        // Query leads table with classification
    }

    async getCRMs() {
        // Query CRM performance data
    }

    async getPerformanceSnapshots(dateRange) {
        // Query cached performance data
    }

    async updatePerformanceCache(data) {
        // Update performance cache tables
    }
}

class ClaudeService {
    constructor() {
        // Initialize Claude API connection
    }

    async analyzeMessageRisk(message) {
        // Send message to Claude for risk analysis
        // - Format message for Claude
        // - Send API request
        // - Parse risk assessment
        // - Return structured response
    }

    async generateInsights(analyticsData) {
        // Generate strategic insights from data
        // - Format data for Claude
        // - Request pattern analysis
        // - Parse recommendations
        // - Return actionable insights
    }

    async classifyFeedback(feedbackText) {
        // Classify feedback sentiment and themes
        // - Process text through Claude
        // - Extract themes and sentiment
        // - Return classification
    }

    async suggestOptimizations(performanceData) {
        // Get Claude's optimization suggestions
        // - Analyze performance patterns
        // - Generate recommendations
        // - Return structured suggestions
    }
}

/*
===============================================================================
                        PERFORMANCE & CACHING SYSTEM
===============================================================================
High-performance caching layer and optimization utilities to ensure
sub-second load times and smooth user experience with large datasets.
*/

// ===== PERFORMANCE & CACHING =====
class PerformanceOptimizer {
    constructor() {
        // Initialize performance monitoring
    }

    async cacheData(key, data, ttl = 3600) {
        // Cache data with TTL
        // - Validate data
        // - Set expiration
        // - Store in memory cache
    }

    async getCachedData(key) {
        // Retrieve cached data
        // - Check cache existence
        // - Validate TTL
        // - Return data or null
    }

    async invalidateCache(pattern) {
        // Invalidate cache entries
        // - Match pattern
        // - Clear entries
        // - Log invalidation
    }

    debounce(func, delay) {
        // Debounce function for frequent calls
    }

    throttle(func, limit) {
        // Throttle function for rate limiting
    }
}

class RealTimeSync {
    constructor() {
        // Initialize real-time data sync
    }

    async startSync() {
        // Start real-time data synchronization
        // - Setup intervals
        // - Monitor data changes
        // - Update UI automatically
    }

    async stopSync() {
        // Stop real-time synchronization
    }

    async handleDataUpdate(updateType, data) {
        // Process incoming data updates
        // - Validate update
        // - Update local cache
        // - Trigger UI refresh
    }
}

/*
===============================================================================
                              ANALYTICS MODULES
===============================================================================
The 10 core analytics modules that transform raw outreach data into
strategic insights. Each module focuses on a specific aspect of
performance analysis and optimization.
*/

// ===== ANALYTICS MODULES =====

// ===== MESSAGE STYLE PERFORMANCE MATRIX =====
class MessageStyleMatrix {
    constructor(container, dataLayer) {
        // Initialize matrix component
    }

    async render(filters = {}) {
        // Render 3D performance matrix
        // - Fetch style performance data
        // - Create matrix visualization
        // - Setup interaction handlers
        // - Apply filters
    }

    async updateMatrix(newData) {
        // Update matrix with new data
        // - Validate data format
        // - Update chart data
        // - Animate transitions
    }

    createMatrixChart(data) {
        // Create 3D matrix chart
        // - Setup Chart.js 3D configuration
        // - Format data for visualization
        // - Add interaction capabilities
    }

    handleMatrixClick(event) {
        // Handle matrix cell interactions
        // - Identify clicked cell
        // - Show detailed metrics
        // - Filter other components
    }

    exportMatrixData() {
        // Export matrix data
        // - Format for export
        // - Generate CSV/JSON
        // - Trigger download
    }
}

// ===== LEAD CONVERSION HEATMAP =====
class LeadConversionHeatmap {
    constructor(container, dataLayer) {
        // Initialize heatmap component
    }

    async render(filters = {}) {
        // Render lead conversion heatmap
        // - Fetch conversion data by lead type
        // - Create heatmap visualization
        // - Setup tooltips and interactions
    }

    async updateHeatmap(newData) {
        // Update heatmap with new data
    }

    createHeatmapChart(data) {
        // Create heatmap chart
        // - Setup Chart.js heatmap
        // - Calculate color intensity
        // - Add hover effects
    }

    calculateConversionRates(data) {
        // Calculate conversion rates by lead type
        // - Group by lead archetype
        // - Calculate percentages
        // - Apply statistical significance
    }

    handleHeatmapHover(event) {
        // Handle heatmap hover interactions
    }
}

// ===== CTA EFFECTIVENESS TRACKER =====
class CTAEffectivenessTracker {
    constructor(container, dataLayer) {
        // Initialize CTA tracker
    }

    async render(filters = {}) {
        // Render CTA effectiveness chart
        // - Fetch CTA performance data
        // - Create bar/line chart
        // - Show trend analysis
    }

    async updateCTAData(newData) {
        // Update CTA tracking data
    }

    createCTAChart(data) {
        // Create CTA performance chart
        // - Setup multi-metric chart
        // - Show usage vs effectiveness
        // - Add trend lines
    }

    calculateCTAMetrics(data) {
        // Calculate CTA performance metrics
        // - Usage frequency
        // - Success rates
        // - Engagement impact
    }

    identifyTopCTAs(data) {
        // Identify highest performing CTAs
    }
}

// ===== FEEDBACK SIGNAL EXPLORER =====
class FeedbackSignalExplorer {
    constructor(container, dataLayer, claudeService) {
        // Initialize feedback explorer
    }

    async render(filters = {}) {
        // Render feedback signal analysis
        // - Fetch feedback data
        // - Process with Claude for themes
        // - Create sentiment visualization
        // - Show trend analysis
    }

    async updateFeedbackData(newData) {
        // Update feedback analysis
    }

    async processFeedbackWithClaude(feedbackData) {
        // Process feedback through Claude
        // - Extract themes
        // - Classify sentiment
        // - Identify patterns
    }

    createSentimentChart(data) {
        // Create sentiment analysis chart
    }

    createThemeCloud(themes) {
        // Create theme word cloud
    }

    trackResolutionTrends(data) {
        // Track issue resolution over time
    }
}

// ===== CRM PERFORMANCE COMPARATOR =====
class CRMPerformanceComparator {
    constructor(container, dataLayer) {
        // Initialize CRM comparator
    }

    async render(filters = {}) {
        // Render CRM performance comparison
        // - Fetch CRM performance data
        // - Create comparison charts
        // - Show ranking and metrics
    }

    async updateCRMData(newData) {
        // Update CRM comparison data
    }

    createComparisonChart(data) {
        // Create CRM comparison visualization
        // - Multi-metric radar chart
        // - Bar chart rankings
        // - Trend comparisons
    }

    calculateCRMRankings(data) {
        // Calculate CRM performance rankings
    }

    generateCRMInsights(data) {
        // Generate insights about CRM performance
    }
}

// ===== OUTREACH TIMELINE OVERLAY =====
class OutreachTimelineOverlay {
    constructor(container, dataLayer) {
        // Initialize timeline component
    }

    async render(filters = {}) {
        // Render outreach timeline
        // - Fetch timeline events
        // - Create timeline visualization
        // - Overlay performance data
        // - Show correlations
    }

    async updateTimeline(newData) {
        // Update timeline with new events
    }

    createTimelineChart(data) {
        // Create timeline visualization
        // - Timeline with events
        // - Performance overlay
        // - Interactive zoom/pan
    }

    correlateEventsWithPerformance(events, performance) {
        // Analyze event-performance correlations
    }

    addTimelineEvent(event) {
        // Add new event to timeline
    }
}

// ===== MESSAGE ITERATION ROI TRACKER =====
class MessageIterationROITracker {
    constructor(container, dataLayer) {
        // Initialize ROI tracker
    }

    async render(filters = {}) {
        // Render iteration ROI analysis
        // - Fetch iteration data
        // - Calculate ROI metrics
        // - Show before/after comparisons
    }

    async updateROIData(newData) {
        // Update ROI tracking data
    }

    calculateIterationROI(data) {
        // Calculate ROI for message iterations
        // - Performance improvements
        // - Time investment
        // - Success rate changes
    }

    createROIChart(data) {
        // Create ROI visualization
    }

    trackRegenerationImpact(data) {
        // Track Claude regeneration impact
    }
}

// ===== TEAM IMPACT DASHBOARD =====
class TeamImpactDashboard {
    constructor(container, dataLayer) {
        // Initialize team dashboard
    }

    async render(filters = {}) {
        // Render team performance analysis
        // - Fetch team metrics
        // - Show individual performance
        // - Track Claude feedback usage
    }

    async updateTeamData(newData) {
        // Update team performance data
    }

    createTeamChart(data) {
        // Create team performance visualization
    }

    calculateTeamMetrics(data) {
        // Calculate team performance metrics
    }

    identifyTopPerformers(data) {
        // Identify highest performing team members
    }
}

// ===== CLAUDE GUIDANCE HISTORY =====
class ClaudeGuidanceHistory {
    constructor(container, dataLayer, claudeService) {
        // Initialize guidance history
    }

    async render(filters = {}) {
        // Render Claude guidance analysis
        // - Fetch guidance history
        // - Track implementation success
        // - Show advice correlation with results
    }

    async updateGuidanceData(newData) {
        // Update guidance tracking
    }

    trackAdviceImplementation(advice, outcomes) {
        // Track which advice was implemented and results
    }

    calculateAdviceROI(data) {
        // Calculate ROI of Claude's advice
    }

    suggestNewExperiments(data) {
        // Use Claude to suggest new experiments
    }
}

// ===== MESSAGE RISK CLASSIFIER =====
class MessageRiskClassifier {
    constructor(container, dataLayer, claudeService) {
        // Initialize risk classifier
    }

    async render(filters = {}) {
        // Render risk analysis dashboard
        // - Fetch risk data
        // - Show risk distribution
        // - Track risk trends
    }

    async classifyMessage(message) {
        // Classify individual message risk
        // - Send to Claude for analysis
        // - Return risk score and factors
    }

    async updateRiskData(newData) {
        // Update risk analysis data
    }

    createRiskChart(data) {
        // Create risk distribution chart
    }

    trackRiskTrends(data) {
        // Track risk patterns over time
    }

    generateRiskAlerts(data) {
        // Generate alerts for high-risk messages
    }
}

/*
===============================================================================
                           CHART RENDERING SYSTEM
===============================================================================
Universal chart creation and management system using Chart.js.
Handles all visualization types with consistent theming and interactions.
*/

// ===== CHART RENDERING SYSTEM =====
class ChartFactory {
    constructor() {
        // Initialize chart factory
    }

    createChart(type, container, data, options = {}) {
        // Universal chart creation method
        // - Validate chart type
        // - Setup Chart.js instance
        // - Apply theme and styling
        // - Return chart instance
    }

    updateChart(chartInstance, newData) {
        // Update existing chart with new data
    }

    destroyChart(chartInstance) {
        // Properly destroy chart instance
    }

    createHeatmap(container, data, options) {
        // Create heatmap visualization
    }

    createMatrix(container, data, options) {
        // Create 3D matrix visualization
    }

    createTimeline(container, data, options) {
        // Create timeline visualization
    }

    createComparison(container, data, options) {
        // Create comparison chart
    }

    createTrend(container, data, options) {
        // Create trend analysis chart
    }
}

/*
===============================================================================
                              FILTER SYSTEM
===============================================================================
Comprehensive filtering system allowing users to slice and dice analytics
data by date range, CRM, lead type, campaign, and custom parameters.
*/

// ===== FILTER SYSTEM =====
class FilterManager {
    constructor() {
        // Initialize filter system
    }

    initializeFilters() {
        // Setup all filter components
        // - Date range filters
        // - CRM filters
        // - Lead type filters
        // - Message style filters
    }

    applyFilters(filters) {
        // Apply filters across all components
        // - Validate filter values
        // - Update all chart components
        // - Save filter state
    }

    resetFilters() {
        // Reset all filters to default
    }

    saveFilterPreset(name, filters) {
        // Save filter combination as preset
    }

    loadFilterPreset(name) {
        // Load saved filter preset
    }
}

class DateRangeFilter {
    constructor(container) {
        // Initialize date range filter
    }

    render() {
        // Render date picker component
    }

    handleDateChange(startDate, endDate) {
        // Handle date range changes
    }

    getDateRange() {
        // Get current date range selection
    }
}

class CRMFilter {
    constructor(container) {
        // Initialize CRM filter
    }

    render(crms) {
        // Render CRM selection component
    }

    handleCRMSelection(selectedCRMs) {
        // Handle CRM filter changes
    }

    getSelectedCRMs() {
        // Get current CRM selection
    }
}

class LeadTypeFilter {
    constructor(container) {
        // Initialize lead type filter
    }

    render(leadTypes) {
        // Render lead type selection
    }

    handleLeadTypeSelection(selectedTypes) {
        // Handle lead type filter changes
    }

    getSelectedLeadTypes() {
        // Get current lead type selection
    }
}

/*
===============================================================================
                        UTILITIES & ERROR HANDLING
===============================================================================
Essential utility functions for data processing, validation, error handling,
and UI helpers that support the entire analytics platform.
*/

// ===== UTILITIES & ERROR HANDLING =====
class DataProcessor {
    static formatChartData(rawData, chartType) {
        // Format raw data for specific chart types
        // - Validate data structure
        // - Transform for chart requirements
        // - Handle missing data
    }

    static aggregateData(data, groupBy, aggregateFields) {
        // Aggregate data by specified fields
    }

    static calculatePercentages(data, totalField) {
        // Calculate percentage distributions
    }

    static sortData(data, sortField, direction = 'desc') {
        // Sort data by specified field
    }

    static filterData(data, filters) {
        // Apply filters to dataset
    }
}

class ValidationService {
    static validateFilters(filters) {
        // Validate filter parameters
        // - Check required fields
        // - Validate data types
        // - Check value ranges
    }

    static validateChartData(data, chartType) {
        // Validate data for chart rendering
    }

    static validateAPIResponse(response, expectedStructure) {
        // Validate API response structure
    }

    static sanitizeInput(input) {
        // Sanitize user input
    }
}

class ErrorHandler {
    static handleAPIError(error, context) {
        // Handle API errors gracefully
        // - Log error details
        // - Show user-friendly message
        // - Attempt recovery if possible
    }

    static handleChartError(error, chartType) {
        // Handle chart rendering errors
    }

    static handleDataError(error, dataSource) {
        // Handle data processing errors
    }

    static showErrorToUser(message, type = 'error') {
        // Display error message to user
    }

    static logError(error, context) {
        // Log error for debugging
    }
}

class UIHelpers {
    static showLoading(container) {
        // Show loading spinner
    }

    static hideLoading(container) {
        // Hide loading spinner
    }

    static showToast(message, type = 'info') {
        // Show toast notification
    }

    static formatNumber(number, decimals = 2) {
        // Format numbers for display
    }

    static formatPercentage(value) {
        // Format percentage values
    }

    static formatDate(date, format = 'YYYY-MM-DD') {
        // Format dates for display
    }

    static createModal(content, options = {}) {
        // Create modal dialog
    }

    static updateProgress(container, percentage) {
        // Update progress bar
    }
}

/*
===============================================================================
                            EXPORT & REPORTING
===============================================================================
Data export capabilities and report generation for sharing insights
with stakeholders and creating automated reports.
*/

// ===== EXPORT & REPORTING SYSTEM =====
class ExportManager {
    constructor() {
        // Initialize export system
    }

    async exportToPDF(componentId, options = {}) {
        // Export component or dashboard to PDF
        // - Capture component visuals
        // - Format for PDF
        // - Include data tables
        // - Add branding and headers
    }

    async exportToExcel(data, sheetName = 'Analytics') {
        // Export data to Excel format
        // - Format data for Excel
        // - Multiple sheets support
        // - Chart embeddings
        // - Data validation
    }

    async exportToCSV(data, filename) {
        // Export data to CSV format
    }

    async generateAutomatedReport(reportConfig) {
        // Generate automated weekly/monthly reports
        // - Compile data from multiple modules
        // - Generate insights summary
        // - Create executive summary
        // - Schedule delivery
    }

    async shareReport(reportData, recipients) {
        // Share reports via email or links
    }
}

/*
===============================================================================
                           NOTIFICATION SYSTEM
===============================================================================
Real-time notifications and alerts for performance changes, anomalies,
and important insights that require immediate attention.
*/

// ===== NOTIFICATION & ALERT SYSTEM =====
class NotificationSystem {
    constructor() {
        // Initialize notification system
    }

    async createAlert(alertConfig) {
        // Create performance alerts
        // - Threshold monitoring
        // - Anomaly detection
        // - Custom trigger conditions
    }

    async sendNotification(notification) {
        // Send real-time notifications
        // - Browser notifications
        // - Email alerts
        // - Slack integration
        // - Dashboard badges
    }

    async trackAnomalies(data) {
        // Detect and alert on data anomalies
        // - Statistical outliers
        // - Performance drops
        // - Unusual patterns
    }
}

/*
===============================================================================
                              SECURITY LAYER
===============================================================================
Security utilities for data protection, user authentication,
and secure API communications.
*/

// ===== SECURITY & AUTHENTICATION =====
class SecurityManager {
    constructor() {
        // Initialize security layer
    }

    async validateUser(credentials) {
        // Validate user permissions
        // - Role-based access
        // - Feature permissions
        // - Data access levels
    }

    encryptSensitiveData(data) {
        // Encrypt sensitive data before storage
    }

    sanitizeData(rawData) {
        // Sanitize data for XSS protection
    }

    async auditLog(action, userId, data) {
        // Log user actions for audit trail
    }
}

/*
===============================================================================
                        MOBILE & RESPONSIVE UTILITIES
===============================================================================
Utilities for ensuring optimal mobile experience and responsive
design across all device types.
*/

// ===== MOBILE & RESPONSIVE SUPPORT =====
class ResponsiveManager {
    constructor() {
        // Initialize responsive behavior
    }

    detectDevice() {
        // Detect device type and capabilities
    }

    optimizeForMobile(componentId) {
        // Optimize charts and UI for mobile
        // - Simplify complex visualizations
        // - Touch-friendly interactions
        // - Compressed data views
    }

    createMobileDashboard(components) {
        // Create mobile-optimized dashboard layout
    }
}

/*
===============================================================================
                            INTEGRATION APIS
===============================================================================
APIs for integrating with external systems like CRMs, email platforms,
and business intelligence tools.
*/

// ===== EXTERNAL INTEGRATIONS =====
class IntegrationManager {
    constructor() {
        // Initialize integration system
    }

    async syncWithCRM(crmType, credentials) {
        // Sync data with external CRMs
        // - Salesforce integration
        // - HubSpot integration  
        // - Pipedrive integration
        // - Custom CRM APIs
    }

    async pushToBI(data, biPlatform) {
        // Push data to BI platforms
        // - Tableau integration
        // - PowerBI integration
        // - Looker integration
    }

    async webhookHandler(payload, source) {
        // Handle incoming webhooks
        // - Validate payload
        // - Process updates
        // - Trigger refreshes
    }
}

/*
===============================================================================
                            SYSTEM INITIALIZATION
===============================================================================
Main initialization sequence and global event management.
*/

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize analytics dashboard when DOM is ready
    const dashboard = new AnalyticsDashboard();
    dashboard.init().catch(error => {
        ErrorHandler.handleAPIError(error, 'Dashboard Initialization');
    });
});

// ===== EXPERIMENTAL MODULES =====

// ===== ICP DRIFT DETECTION =====
class ICPDriftDetector {
    constructor(container, dataLayer, claudeService) {
        // Initialize ICP drift detection
    }

    async render(filters = {}) {
        // Render ICP drift analysis
        // - Track feedback trends vs original ICP
        // - Identify performance pattern changes
        // - Suggest ICP updates
    }

    async detectDrift(currentICP, feedbackTrends) {
        // Analyze ICP drift patterns
        // - Compare current vs historical performance
        // - Identify new high-performing patterns
        // - Calculate drift significance
    }

    async suggestICPUpdate(driftData) {
        // Use Claude to suggest ICP updates
        // - Analyze drift patterns
        // - Generate new ICP recommendations
        // - Provide implementation guidance
    }

    createDriftVisualization(data) {
        // Create drift trend visualization
    }
}

// ===== CLAUDE PATTERN ANALYST =====
class ClaudePatternAnalyst {
    constructor(container, dataLayer, claudeService) {
        // Initialize pattern analyst
    }

    async render(filters = {}) {
        // Render Claude pattern analysis
        // - Weekly pattern analysis
        // - Success theme identification
        // - Drop suggestions
        // - Experimental ideas
    }

    async generateWeeklyAnalysis(data) {
        // Generate Claude's weekly analysis
        // - Identify working patterns
        // - Suggest what to drop
        // - Propose new experiments
    }

    async trackPatternEvolution(historicalData) {
        // Track how patterns evolve over time
    }

    createPatternChart(data) {
        // Create pattern analysis visualization
    }
}

// ===== MESSAGE-LEAD ARCHETYPE LINK MAP =====
class MessageLeadLinkMap {
    constructor(container, dataLayer) {
        // Initialize link map component
    }

    async render(filters = {}) {
        // Render message-lead archetype connections
        // - Map message patterns to lead types
        // - Show conversion rates by combination
        // - Identify optimal pairings
    }

    createLinkVisualization(data) {
        // Create network/connection visualization
        // - Show message-lead relationships
        // - Color code by performance
        // - Interactive exploration
    }

    identifyOptimalPairings(data) {
        // Identify best message-lead combinations
    }
}

// ===== SMART SPLIT-TEST ENGINE =====
class SmartSplitTestEngine {
    constructor(container, dataLayer, claudeService) {
        // Initialize A/B test engine
    }

    async render(filters = {}) {
        // Render split test management
        // - Show active tests
        // - Display results
        // - Suggest new tests
    }

    async suggestABTests(performanceData) {
        // Use Claude to suggest A/B tests
        // - Analyze performance gaps
        // - Propose test hypotheses
        // - Estimate required sample sizes
    }

    async monitorTestResults(testId) {
        // Monitor ongoing test performance
        // - Track statistical significance
        // - Alert when results are conclusive
        // - Generate insights
    }

    async createTest(testConfig) {
        // Create new A/B test
        // - Setup test parameters
        // - Initialize tracking
        // - Begin execution
    }

    calculateStatisticalSignificance(testData) {
        // Calculate test significance
    }
}

// ===== ENTERPRISE ADD-ONS =====

// ===== CAMPAIGN FILTERING LAYER =====
class CampaignFilterLayer {
    constructor() {
        // Initialize campaign filtering
    }

    addCampaignFilters(filterManager) {
        // Add campaign-specific filters
        // - Campaign launches
        // - Outreach batches
        // - Strategic initiatives
    }

    filterByCampaign(data, campaignId) {
        // Filter analytics by campaign
    }

    createCampaignTimeline(campaigns) {
        // Create campaign timeline view
    }
}

// ===== CONVERSION UPLOAD BRIDGE =====
class ConversionUploadBridge {
    constructor(dataLayer) {
        // Initialize conversion tracking
    }

    async uploadConversionData(conversionFile) {
        // Upload external conversion data
        // - Parse conversion file
        // - Match to messages/CTAs/leads
        // - Update analytics
    }

    async linkConversionsToMessages(conversions, messages) {
        // Link external conversions to platform data
    }

    createConversionChart(data) {
        // Create conversion analysis chart
    }
}

// ===== CUSTOM INSIGHT BOARD =====
class CustomInsightBoard {
    constructor(container, dataLayer) {
        // Initialize custom dashboard builder
    }

    async render() {
        // Render custom insight board
        // - Widget library
        // - Drag-and-drop interface
        // - Custom chart builder
    }

    createCustomWidget(widgetType, config) {
        // Create custom dashboard widget
    }

    saveCustomDashboard(dashboardConfig) {
        // Save custom dashboard configuration
    }

    loadCustomDashboard(dashboardId) {
        // Load saved custom dashboard
    }
}

// ===== ADVANCED ANALYTICS FEATURES =====

// ===== PREDICTIVE ANALYTICS ENGINE =====
class PredictiveAnalyticsEngine {
    constructor(dataLayer, claudeService) {
        // Initialize predictive analytics
    }

    async predictMessagePerformance(messageContent, leadProfile) {
        // Predict message performance before sending
        // - Use historical patterns
        // - Claude analysis
        // - Machine learning models
    }

    async forecastCampaignResults(campaignConfig) {
        // Forecast campaign performance
    }

    async identifyHighValueLeads(leadData) {
        // Identify leads most likely to convert
    }
}

// ===== COMPETITIVE INTELLIGENCE =====
class CompetitiveIntelligence {
    constructor(container, dataLayer) {
        // Initialize competitive analysis
    }

    async render(filters = {}) {
        // Render competitive intelligence
        // - Industry benchmarks
        // - Performance comparisons
        // - Market positioning
    }

    async benchmarkPerformance(internalData, industryData) {
        // Benchmark against industry standards
    }
}

// ===== REVENUE ATTRIBUTION ENGINE =====
class RevenueAttributionEngine {
    constructor(dataLayer) {
        // Initialize revenue attribution
    }

    async calculateMessageROI(messageData, revenueData) {
        // Calculate ROI for individual messages
        // - Attribution modeling
        // - Multi-touch attribution
        // - Revenue impact analysis
    }

    async trackRevenueByChannel(data) {
        // Track revenue attribution by channel
    }

    createAttributionChart(data) {
        // Create revenue attribution visualization
    }
}

// ===== EVENT LISTENERS =====
// Global event listeners for dashboard interactions
// - Filter changes
// - Chart interactions  
// - Data refresh
// - Export functions
// - Real-time updates
// - Experimental module toggles
// - Custom dashboard management
// - Split test controls
