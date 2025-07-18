import { SecureCreditService } from '/services/creditService.js';
window.OsliraApp.creditService = creditService;

/*
===============================================================================
                        SECURE ANALYTICS DASHBOARD ARCHITECTURE
===============================================================================
🔐 All AI calls, billing operations, and secure writes routed through Cloudflare Workers
🔐 Frontend acts as thin HTTP client with no direct Claude/OpenAI access
🔐 Credit verification and deduction handled server-side with service role key
*/

/*
===============================================================================
                           CLOUDFLARE WORKER ENDPOINTS
===============================================================================
Modular worker architecture with named endpoints and clear responsibilities
*/

// ===== WORKER ENDPOINT STRUCTURE =====
const WORKER_ENDPOINTS = {
    // AI & Claude Services - All AI processing moved to Worker
    ai: {
        risk: '/ai/risk-analysis',           // Message risk classification with Claude
        insights: '/ai/generate-insights',   // Strategic insights generation
        feedback: '/ai/classify-feedback',   // Sentiment & theme analysis
        optimize: '/ai/suggest-optimizations', // Performance recommendations
        experiments: '/ai/suggest-experiments', // A/B test suggestions
        patterns: '/ai/analyze-patterns',    // Weekly pattern analysis
        icp_drift: '/ai/detect-icp-drift'   // ICP drift detection
    },
    
    // Analytics Data Processing - Server-side data aggregation
    analytics: {
        matrix: '/analytics/message-matrix',      // Message style performance
        heatmap: '/analytics/lead-conversion',    // Lead conversion heatmap
        cta: '/analytics/cta-effectiveness',      // CTA performance tracking
        timeline: '/analytics/timeline-overlay', // Outreach timeline
        roi: '/analytics/iteration-roi',          // Message iteration ROI
        team: '/analytics/team-impact',           // Team performance
        crm: '/analytics/crm-comparison',         // CRM performance
        guidance: '/analytics/claude-history'    // Claude guidance tracking
    },
    
    // Credit & Billing Management - Server-side credit operations
    credits: {
        check: '/credits/check-balance',     // Verify user credits with service role
        deduct: '/credits/deduct-usage',     // Deduct credits with audit logging
        history: '/credits/usage-history',   // Credit usage analytics
        predict: '/credits/predict-usage'    // Predict credit consumption
    },
    
    // External Integrations - Server-side API calls
    integrations: {
        scrape: '/integrations/apify-scrape',    // Apify lead scraping
        crm_sync: '/integrations/crm-sync',      // CRM data synchronization
        bi_push: '/integrations/bi-export',      // BI platform export
        webhooks: '/integrations/webhooks'       // Webhook handlers
    },
    
    // Data Writes & Logging - Server-side writes with service role
    data: {
        write_analysis: '/data/write-analysis',  // Write AI analysis results
        log_audit: '/data/audit-log',           // Audit trail logging
        cache_performance: '/data/cache-perf',   // Performance cache updates
        batch_write: '/data/batch-operations'   // Batch data operations
    },
    
    // Export & Reporting - Server-side report generation
    export: {
        pdf: '/export/generate-pdf',         // PDF report generation
        csv: '/export/generate-csv',         // CSV data export
        excel: '/export/generate-excel',     // Excel workbook export
        scheduled: '/export/scheduled-reports' // Automated report scheduling
    }
};

/*
===============================================================================
                        FRONTEND HTTP CLIENT SERVICES
===============================================================================
Thin client services that act as secure proxies to Worker endpoints
*/

// ===== SECURE ANALYTICS SERVICE (HTTP CLIENT) =====
class SecureAnalyticsService {
    constructor() {
        // Initialize secure analytics data client
        // - Setup Worker endpoint connections
        // - Configure caching strategies
        // - Initialize request management
    }

    async getMessageMatrix(filters = {}) {
        // 🔐 Fetch message style performance matrix via Worker
        // - Send filter parameters to Worker
        // - Process data aggregation server-side
        // - Return formatted matrix data for visualization
    }

    async getLeadConversionHeatmap(filters = {}) {
        // 🔐 Fetch lead conversion heatmap via Worker
        // - Apply filters server-side for security
        // - Calculate conversion rates and confidence intervals
        // - Return heatmap data with statistical significance
    }

    async getCTAEffectiveness(filters = {}) {
        // 🔐 Fetch CTA performance tracking via Worker
        // - Analyze CTA usage patterns server-side
        // - Calculate effectiveness scores and rankings
        // - Return actionable CTA insights
    }

    async getTimelineOverlay(filters = {}) {
        // 🔐 Fetch outreach timeline with performance overlay
        // - Correlate events with performance changes
        // - Calculate impact scores for timeline events
        // - Return timeline with correlation analysis
    }

    async getIterationROI(filters = {}) {
        // 🔐 Fetch message iteration ROI analysis
        // - Calculate improvement metrics server-side
        // - Track regeneration impact and costs
        // - Return ROI analysis with recommendations
    }

    async getTeamImpact(filters = {}) {
        // 🔐 Fetch team performance analytics
        // - Analyze individual contributor metrics
        // - Track Claude utilization and improvements
        // - Return team rankings and coaching insights
    }

    async getCRMComparison(filters = {}) {
        // 🔐 Fetch CRM performance comparison
        // - Compare win rates across CRM systems
        // - Calculate quality and consistency scores
        // - Return CRM rankings with insights
    }

    async getClaudeGuidanceHistory(filters = {}) {
        // 🔐 Fetch Claude guidance tracking
        // - Track advice implementation and outcomes
        // - Calculate guidance ROI and effectiveness
        // - Return guidance history with impact analysis
    }

    async makeAnalyticsRequest(endpoint, payload) {
        // Execute secure analytics data request
        // - Cache responses for performance
        // - Handle large datasets efficiently
        // - Return formatted analytics data
    }
}

// ===== SECURE DATA WRITE SERVICE (HTTP CLIENT) =====
class SecureDataWriteService {
    constructor() {
        // Initialize secure data write client
        // - Setup Worker write endpoints
        // - Configure write queue for batching
        // - Initialize audit logging
    }

    async writeAnalysisResult(analysisData) {
        // 🔐 Write AI analysis results via Worker
        // - Queue analysis data for secure write
        // - Include metadata and timestamps
        // - Log write operations for audit
    }

    async logAuditTrail(action, metadata = {}) {
        // 🔐 Log user actions for audit trail
        // - Capture user actions and context
        // - Include session and security metadata
        // - Store audit logs securely server-side
    }

    async cachePerformanceData(data, cacheKey) {
        // 🔐 Cache performance data via Worker
        // - Store processed analytics server-side
        // - Set appropriate TTL values
        // - Enable cache invalidation strategies
    }

    async queueWrite(endpoint, payload) {
        // Queue write operation for batch processing
        // - Add to write queue with priority
        // - Handle write conflicts and retries
        // - Return promise for completion tracking
    }

    async processWriteQueue() {
        // Process queued write operations in batches
        // - Execute writes in optimal batch sizes
        // - Handle errors and retries gracefully
        // - Maintain write order when required
    }
}

// ===== SECURE INTEGRATION SERVICE (HTTP CLIENT) =====
class SecureIntegrationService {
    constructor() {
        // Initialize secure integration client
        // - Setup Worker integration endpoints
        // - Configure extended timeouts for external APIs
        // - Initialize integration monitoring
    }

    async triggerApifyScrape(scrapeConfig) {
        // 🔐 Trigger Apify lead scraping via Worker
        // - Send scraping configuration to Worker
        // - Handle long-running scrape operations
        // - Return scrape job ID and status tracking
    }

    async syncWithCRM(crmConfig) {
        // 🔐 Synchronize data with external CRM
        // - Execute CRM API calls server-side
        // - Handle authentication and rate limiting
        // - Return sync status and results
    }

    async exportToBI(exportConfig) {
        // 🔐 Export analytics to BI platforms
        // - Format data for target BI system
        // - Handle large dataset exports
        // - Return export status and access links
    }

    async makeIntegrationRequest(endpoint, payload) {
        // Execute secure integration request
        // - Handle extended timeouts for external APIs
        // - Include integration-specific error handling
        // - Return formatted integration responses
    }
}

/*
===============================================================================
                        UPDATED ANALYTICS MODULES
===============================================================================
Analytics modules updated to use secure Worker-based services
*/

// ===== SECURE MESSAGE STYLE PERFORMANCE MATRIX =====
class SecureMessageStyleMatrix {
    constructor(container, secureAnalyticsService, secureCreditService) {
        // Initialize secure matrix component
        // - Connect to secure analytics and credit services
        // - Setup visualization container
        // - Configure chart rendering options
    }

    async render(filters = {}) {
        // Render secure message style performance matrix
        // - Verify user credits before expensive operations
        // - Fetch matrix data via secure Worker endpoint
        // - Create interactive 3D matrix visualization
        // - Handle loading states and error scenarios
    }

    async updateMatrix(newData) {
        // Update matrix with new secure data
        // - Validate data format from Worker response
        // - Animate transitions between data states
        // - Maintain user interaction state
    }

    createMatrixChart(data) {
        // Create secure matrix visualization
        // - Process Worker-supplied matrix data
        // - Apply security-conscious chart configurations
        // - Enable secure interaction capabilities
    }

    handleMatrixClick(event) {
        // Handle secure matrix interactions
        // - Validate user permissions for detailed views
        // - Log interaction events for audit
        // - Trigger secure detail data fetches
    }
}

// ===== SECURE LEAD CONVERSION HEATMAP =====
class SecureLeadConversionHeatmap {
    constructor(container, secureAnalyticsService) {
        // Initialize secure heatmap component
        // - Setup secure analytics service connection
        // - Configure heatmap visualization options
        // - Initialize interaction handlers
    }

    async render(filters = {}) {
        // Render secure lead conversion heatmap
        // - Fetch conversion data via Worker endpoints
        // - Apply server-side filtering for security
        // - Create interactive heatmap visualization
    }

    async updateHeatmap(newData) {
        // Update heatmap with secure data
        // - Process Worker-validated conversion data
        // - Update color intensity calculations
        // - Refresh tooltips and interactions
    }

    createHeatmapChart(data) {
        // Create secure heatmap visualization
        // - Use Worker-processed conversion rates
        // - Apply security-conscious color schemes
        // - Enable secure hover interactions
    }
}

// ===== SECURE CTA EFFECTIVENESS TRACKER =====
class SecureCTAEffectivenessTracker {
    constructor(container, secureAnalyticsService) {
        // Initialize secure CTA tracker
        // - Connect to secure analytics endpoints
        // - Setup CTA performance monitoring
        // - Configure tracking visualizations
    }

    async render(filters = {}) {
        // Render secure CTA effectiveness analysis
        // - Fetch CTA data via Worker processing
        // - Calculate effectiveness scores server-side
        // - Display ranked CTA performance
    }

    async updateCTAData(newData) {
        // Update CTA tracking with secure data
        // - Process Worker-validated CTA metrics
        // - Update ranking and trend calculations
        // - Refresh recommendation displays
    }

    createCTAChart(data) {
        // Create secure CTA performance visualization
        // - Use Worker-calculated effectiveness scores
        // - Display usage patterns and trends
        // - Enable secure drill-down capabilities
    }
}

// ===== SECURE FEEDBACK SIGNAL EXPLORER =====
class SecureFeedbackSignalExplorer {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        // Initialize secure feedback explorer
        // - Connect to secure analytics and Claude services
        // - Setup sentiment analysis components
        // - Configure theme extraction displays
    }

    async render(filters = {}) {
        // Render secure feedback analysis
        // - Fetch feedback data via Worker endpoints
        // - Process sentiment analysis via secure Claude service
        // - Display theme clusters and sentiment trends
    }

    async processFeedbackWithClaude(feedbackData) {
        // Process feedback via secure Claude service
        // - Send feedback to Worker for Claude analysis
        // - Extract themes and sentiment server-side
        // - Return structured classification results
    }

    createSentimentChart(data) {
        // Create secure sentiment visualization
        // - Use Worker-processed sentiment data
        // - Display sentiment distribution and trends
        // - Enable secure sentiment drill-down
    }
}

// ===== SECURE CRM PERFORMANCE COMPARATOR =====
class SecureCRMPerformanceComparator {
    constructor(container, secureAnalyticsService) {
        // Initialize secure CRM comparator
        // - Setup secure analytics service connection
        // - Configure CRM comparison displays
        // - Initialize ranking visualizations
    }

    async render(filters = {}) {
        // Render secure CRM performance comparison
        // - Fetch CRM data via Worker endpoints
        // - Calculate rankings and scores server-side
        // - Display interactive comparison charts
    }

    async updateCRMData(newData) {
        // Update CRM comparison with secure data
        // - Process Worker-validated CRM metrics
        // - Update ranking calculations
        // - Refresh comparison visualizations
    }

    createComparisonChart(data) {
        // Create secure CRM comparison visualization
        // - Use Worker-calculated performance metrics
        // - Display multi-metric radar charts
        // - Enable secure CRM analysis drill-down
    }
}

// ===== SECURE OUTREACH TIMELINE OVERLAY =====
class SecureOutreachTimelineOverlay {
    constructor(container, secureAnalyticsService) {
        // Initialize secure timeline component
        // - Connect to secure analytics endpoints
        // - Setup timeline visualization
        // - Configure event correlation analysis
    }

    async render(filters = {}) {
        // Render secure outreach timeline
        // - Fetch timeline data via Worker processing
        // - Correlate events with performance server-side
        // - Display interactive timeline with overlays
    }

    async updateTimeline(newData) {
        // Update timeline with secure event data
        // - Process Worker-validated timeline events
        // - Update correlation calculations
        // - Refresh timeline visualizations
    }

    createTimelineChart(data) {
        // Create secure timeline visualization
        // - Use Worker-processed event correlations
        // - Display performance overlay data
        // - Enable secure timeline interactions
    }
}

// ===== SECURE MESSAGE ITERATION ROI TRACKER =====
class SecureMessageIterationROITracker {
    constructor(container, secureAnalyticsService) {
        // Initialize secure ROI tracker
        // - Setup secure analytics service connection
        // - Configure ROI calculation displays
        // - Initialize iteration tracking
    }

    async render(filters = {}) {
        // Render secure iteration ROI analysis
        // - Fetch iteration data via Worker endpoints
        // - Calculate ROI metrics server-side
        // - Display before/after comparisons
    }

    async updateROIData(newData) {
        // Update ROI tracking with secure data
        // - Process Worker-calculated ROI metrics
        // - Update improvement calculations
        // - Refresh ROI visualizations
    }

    calculateIterationROI(data) {
        // Calculate secure iteration ROI
        // - Use Worker-validated performance data
        // - Calculate improvement percentages
        // - Include cost-benefit analysis
    }
}

// ===== SECURE TEAM IMPACT DASHBOARD =====
class SecureTeamImpactDashboard {
    constructor(container, secureAnalyticsService) {
        // Initialize secure team dashboard
        // - Connect to secure team analytics endpoints
        // - Setup team performance displays
        // - Configure coaching insights
    }

    async render(filters = {}) {
        // Render secure team performance analysis
        // - Fetch team data via Worker processing
        // - Calculate team metrics server-side
        // - Display individual and team performance
    }

    async updateTeamData(newData) {
        // Update team dashboard with secure data
        // - Process Worker-validated team metrics
        // - Update ranking calculations
        // - Refresh coaching recommendations
    }

    createTeamChart(data) {
        // Create secure team performance visualization
        // - Use Worker-calculated team metrics
        // - Display performance rankings
        // - Enable secure team member drill-down
    }
}

// ===== SECURE CLAUDE GUIDANCE HISTORY =====
class SecureClaudeGuidanceHistory {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        // Initialize secure guidance history
        // - Connect to secure analytics and Claude services
        // - Setup guidance tracking displays
        // - Configure implementation monitoring
    }

    async render(filters = {}) {
        // Render secure Claude guidance analysis
        // - Fetch guidance data via Worker endpoints
        // - Track implementation success server-side
        // - Display advice correlation with results
    }

    async updateGuidanceData(newData) {
        // Update guidance tracking with secure data
        // - Process Worker-validated guidance metrics
        // - Update implementation tracking
        // - Refresh advice effectiveness displays
    }

    trackAdviceImplementation(advice, outcomes) {
        // Track secure advice implementation
        // - Log implementation status securely
        // - Calculate outcome correlations
        // - Update advice effectiveness scores
    }
}

// ===== SECURE MESSAGE RISK CLASSIFIER =====
class SecureMessageRiskClassifier {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        // Initialize secure risk classifier
        // - Connect to secure Claude risk analysis service
        // - Setup risk monitoring displays
        // - Configure alert systems
    }

    async render(filters = {}) {
        // Render secure risk analysis dashboard
        // - Fetch risk data via Worker endpoints
        // - Process risk classification via secure Claude service
        // - Display risk distribution and alerts
    }

    async classifyMessage(message) {
        // Classify message risk via secure service
        // - Send message to Worker for Claude analysis
        // - Return structured risk assessment
        // - Log risk classification for audit
    }

    async updateRiskData(newData) {
        // Update risk analysis with secure data
        // - Process Worker-validated risk metrics
        // - Update risk trend calculations
        // - Refresh alert configurations
    }
}

/*
===============================================================================
                           CHART RENDERING SYSTEM
===============================================================================
Secure chart creation and management system using Chart.js with Worker data
*/

// ===== SECURE CHART FACTORY =====
class SecureChartFactory {
    constructor() {
        // Initialize secure chart factory
        // - Setup Chart.js with security configurations
        // - Configure data validation for Worker responses
        // - Initialize chart theming and styling
    }

    createChart(type, container, secureData, options = {}) {
        // Create secure chart with Worker-validated data
        // - Validate data structure from Worker responses
        // - Apply security-conscious chart configurations
        // - Setup secure interaction handlers
        // - Return chart instance with security context
    }

    updateChart(chartInstance, newSecureData) {
        // Update chart with new secure data
        // - Validate new data from Worker endpoints
        // - Update chart data securely
        // - Maintain chart state and interactions
    }

    destroyChart(chartInstance) {
        // Securely destroy chart instance
        // - Clean up chart resources
        // - Clear sensitive data from memory
        // - Log chart destruction for audit
    }
}

/*
===============================================================================
                        SECURE CONFIGURATION SYSTEM
===============================================================================
Updated configuration system for Worker-based architecture
*/

// ===== SECURE ANALYTICS CONFIG =====
const SECURE_ANALYTICS_CONFIG = {
    // Worker Configuration
    worker: {
        baseUrl: window.OsliraApp?.config?.workerUrl,
        timeout: 60000,
        retryAttempts: 3,
        retryDelay: 2000,
        batchSize: 10
    },
    
    // Security Configuration
    security: {
        enableRequestSigning: true,
        enableDataSanitization: true,
        enableAuditLogging: true,
        maxRequestSize: 10485760, // 10MB
        rateLimitRequests: 100
    },
    
    // Credit Configuration
    credits: {
        checkBalanceBeforeOperation: true,
        enableUsagePrediction: true,
        enableCostOptimization: true,
        logAllTransactions: true
    },
    
    // AI Configuration
    ai: {
        enableAdvancedRiskScoring: true,
        enableInsightGeneration: true,
        enableFeedbackClassification: true,
        enableExperimentSuggestions: false,
        promptVersion: 'v2.1'
    }
};

/*
===============================================================================
                        SECURE INITIALIZATION SYSTEM
===============================================================================
Updated initialization sequence for Worker-based architecture
*/

// ===== SECURE ANALYTICS DASHBOARD =====
class SecureAnalyticsDashboard {
    constructor() {
        // Initialize secure analytics dashboard
        // - Setup Worker-based service connections
        // - Configure security and authentication
        // - Initialize secure caching system
    }

    async init() {
        // Secure initialization sequence
        // - Validate Worker endpoint availability
        // - Initialize secure service clients
        // - Setup authenticated connections
        // - Load initial data via Workers
        // - Render secure dashboard layout
    }

    async initializeSecureServices() {
        // Initialize all secure Worker-based services
        // - Create SecureClaudeService instance
        // - Create SecureCreditService instance
        // - Create SecureAnalyticsService instance
        // - Create SecureDataWriteService instance
        // - Create SecureIntegrationService instance
    }

    async loadInitialData() {
        // Load initial dashboard data securely
        // - Check user credits via Worker
        // - Fetch analytics data via Workers
        // - Initialize real-time data connections
        // - Setup secure caching strategies
    }

    async renderSecureDashboard() {
        // Render dashboard with secure components
        // - Initialize secure analytics modules
        // - Setup Worker-based data flows
        // - Configure secure user interactions
        // - Enable secure real-time updates
    }
}

// ===== SECURE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize secure analytics dashboard when DOM is ready
    const secureDashboard = new SecureAnalyticsDashboard();
    secureDashboard.init().catch(error => {
        console.error('Secure dashboard initialization failed:', error);
        // Handle initialization errors securely
    });
});
