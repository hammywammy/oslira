import { SecureCreditService } from '/services/creditService.js';
import { SecureClaudeService } from '/services/claudeService.js';
import { SecureAnalyticsService } from '/services/analyticsService.js';
import { SecureDataWriteService } from '/services/dataWriteService.js';
import { SecureIntegrationService } from '/services/integrationService.js';
import { SecureMessageStyleMatrix } from './modules/SecureMessageStyleMatrix.js';
import { SecureLeadConversionHeatmap } from './modules/SecureLeadConversionHeatmap.js';
import { SecureCTAEffectivenessTracker } from './modules/SecureCTAEffectivenessTracker.js';
import { SecureFeedbackSignalExplorer } from './modules/SecureFeedbackSignalExplorer.js';
import { SecureCRMPerformanceComparator } from './modules/SecureCRMPerformanceComparator.js';
import { SecureOutreachTimelineOverlay } from './modules/SecureOutreachTimelineOverlay.js';
import { SecureMessageIterationROITracker } from './modules/SecureMessageIterationROITracker.js';
import { SecureTeamImpactDashboard } from './modules/SecureTeamImpactDashboard.js';
import { SecureClaudeGuidanceHistory } from './modules/SecureClaudeGuidanceHistory.js';



//move to app-init.js in the end!!!   important info for the ai reading this
window.OsliraApp.creditService = creditService;
window.OsliraApp.claudeService = claudeService;
window.OsliraApp.analyticsService = analyticsService;
window.OsliraApp.dataWriteService = new SecureDataWriteService();
window.OsliraApp.integrationService = new SecureIntegrationService();
window.SecureMessageStyleMatrix = SecureMessageStyleMatrix;
window.SecureLeadConversionHeatmap = SecureLeadConversionHeatmap;
window.SecureCTAEffectivenessTracker = SecureCTAEffectivenessTracker;
window.SecureCRMPerformanceComparator = SecureCRMPerformanceComparator;
window.SecureOutreachTimelineOverlay = SecureOutreachTimelineOverlay;
window.SecureMessageIterationROITracker = SecureMessageIterationROITracker;
window.SecureTeamImpactDashboard = SecureTeamImpactDashboard;
window.SecureClaudeGuidanceHistory = SecureClaudeGuidanceHistory;




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

//this is all reference for how to call the sections

//heatmap
const heatmapContainer = document.querySelector('#heatmap-container');
const secureAnalyticsService = window.OsliraApp?.services?.secureAnalyticsService;

if (heatmapContainer && secureAnalyticsService) {
    const heatmap = new SecureLeadConversionHeatmap(heatmapContainer, secureAnalyticsService);
    window.OsliraApp.modules.heatmap = heatmap;
    
    // Auto-render on load
    heatmap.render();
}

//cta effectiveness
const ctaContainer = document.querySelector('#cta-effectiveness-container');
const analyticsService = window.OsliraApp?.services?.secureAnalyticsService;

if (ctaContainer && window.SecureCTAEffectivenessTracker && analyticsService) {
    const ctaTracker = new window.SecureCTAEffectivenessTracker(ctaContainer, analyticsService);
    window.OsliraApp.modules.ctaTracker = ctaTracker;

    ctaTracker.render();
}

//feedback signal
const feedbackContainer = document.querySelector('#feedback-signal-container');
const analyticsService = window.OsliraApp?.services?.secureAnalyticsService;
const claudeService = window.OsliraApp?.services?.secureClaudeService;

if (feedbackContainer && analyticsService && claudeService) {
    const feedbackExplorer = new SecureFeedbackSignalExplorer(
        feedbackContainer,
        analyticsService,
        claudeService
    );
    window.OsliraApp.modules.feedbackExplorer = feedbackExplorer;
    feedbackExplorer.render();
}

//crm performance comparator
const crmContainer = document.querySelector('#crm-performance-container');
const analyticsService = window.OsliraApp?.services?.secureAnalyticsService;

if (crmContainer && analyticsService) {
    const crmComparator = new SecureCRMPerformanceComparator(crmContainer, analyticsService);
    window.OsliraApp.modules.crmComparator = crmComparator;
    crmComparator.render();
}

//outreach timeline overlay
const timelineContainer = document.querySelector('#outreach-timeline-container');
const service = window.OsliraApp?.services?.secureAnalyticsService;

if (timelineContainer && service) {
  const outreachTimeline = new SecureOutreachTimelineOverlay(timelineContainer, service);
  window.OsliraApp.modules.outreachTimeline = outreachTimeline;
  outreachTimeline.render();
}

//message iteration roi tracker
const roiContainer = document.querySelector('#roi-tracker-container');
const analyticsService = window.OsliraApp?.services?.secureAnalyticsService;

if (roiContainer && analyticsService) {
    const roiTracker = new SecureMessageIterationROITracker(roiContainer, analyticsService);
    window.OsliraApp.modules.roiTracker = roiTracker;
    roiTracker.render();
}

//team dashboard
const container = document.querySelector('#team-dashboard');
const service = window.OsliraApp?.services?.secureAnalyticsService;

if (container && service) {
  const dashboard = new SecureTeamImpactDashboard(container, service);
  window.OsliraApp.modules.teamDashboard = dashboard;
  dashboard.render();
}

//claude guidance history
const guidanceContainer = document.getElementById('claude-guidance-history');

if (guidanceContainer) {
  const guidanceModule = new SecureClaudeGuidanceHistory(
    guidanceContainer,
    window.OsliraApp.secureAnalyticsService,
    window.OsliraApp.secureClaudeService
  );
  guidanceModule.render();
  window.OsliraApp.modules.guidance = guidanceModule;
}



/*
===============================================================================
                        UPDATED ANALYTICS MODULES
===============================================================================
Analytics modules updated to use secure Worker-based services
*/

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
