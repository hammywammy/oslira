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
import { SecureMessageRiskClassifier } from './modules/SecureMessageRiskClassifier.js';
import { SecureChartFactory } from './modules/SecureChartFactory.js';
import { SECURE_ANALYTICS_CONFIG, SecureAnalyticsConfigManager } from './config/secureAnalyticsConfig.js'; 


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
window.OsliraApp.riskClassifier = riskClassifier;
window.OsliraApp.chartFactory = new SecureChartFactory();
window.OsliraApp.analyticsConfig = new SecureAnalyticsConfigManager();



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

//message risk clasifier
import { SecureMessageRiskClassifier } from './modules/SecureMessageRiskClassifier.js'; // adjust path

const container = document.getElementById('message-risk-dashboard');
const riskClassifier = new SecureMessageRiskClassifier(container, window.OsliraApp.analyticsService, window.OsliraApp.claudeService);

window.dashboard = riskClassifier; // optional global exposure
riskClassifier.render();

import { SecureChartFactory } from './modules/SecureChartFactory.js'; // adjust path

window.OsliraApp.chartFactory = new SecureChartFactory();

const container = document.getElementById('lead-performance-chart');
const chartType = 'bar';

const sampleData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{
        label: 'Lead Volume',
        data: [12, 19, 30, 25]
    }]
};

const chartOptions = {
    plugins: {
        title: {
            display: true,
            text: 'Lead Performance'
        }
    }
};

const leadChart = window.OsliraApp.chartFactory.createChart(chartType, container, sampleData, chartOptions);

window.leadPerformanceChart = leadChart;
//end


//analytics config
document.addEventListener('DOMContentLoaded', () => {
    // Access full config object
    const config = window.OsliraApp.analyticsConfig.getConfig();

    // Example: Access AI prompt version
    const promptVersion = window.OsliraApp.analyticsConfig.getConfig('ai.promptVersion');

    // Example: Check if a feature flag is enabled
    if (window.OsliraApp.analyticsConfig.isFeatureEnabled('enableAdvancedCharts')) {
        console.log('📊 Advanced charts are enabled');
    }

    // Example: Get module-specific config
    const riskConfig = window.OsliraApp.analyticsConfig.getModuleConfig('riskClassifier');
    if (riskConfig?.enabled) {
        console.log('🛡️ Risk classifier module loaded:', riskConfig);
    }

    // Example: Validate security compliance
    const meetsSecurity = window.OsliraApp.analyticsConfig.validateSecurityRequirements();
    console.log('🔐 Security compliance met:', meetsSecurity);
});
//end



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
