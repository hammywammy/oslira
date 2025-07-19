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
import { SecureAnalyticsDashboard } from './modules/SecureAnalyticsDashboard.js';

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
window.OsliraApp.dashboard = new SecureAnalyticsDashboard();


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

//analytics dashboard
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize and store globally
    const dashboard = new SecureAnalyticsDashboard();
    window.OsliraApp.dashboard = dashboard;

    // Start full secure init
    await dashboard.init();

    console.log('✅ SecureAnalyticsDashboard loaded and initialized');
  } catch (err) {
    console.error('❌ Failed to initialize SecureAnalyticsDashboard:', err);
  }
});

/*
===============================================================================
                        FINAL INITIALIZATION & BOOTSTRAP
===============================================================================
Complete initialization sequence for the secure analytics dashboard
*/

// Global initialization function
async function initializeSecureAnalytics() {
    try {
        console.log('🚀 Starting secure analytics initialization...');
        
        // Wait for OsliraApp to be available
        if (!window.OsliraApp) {
            console.warn('⏳ Waiting for OsliraApp initialization...');
            await waitForOsliraApp();
        }
        
        // Ensure all required services are available
        await ensureServicesAvailable();
        
        // Initialize configuration manager
        if (!window.OsliraApp.analyticsConfig) {
            window.OsliraApp.analyticsConfig = new SecureAnalyticsConfigManager();
        }
        
        // Create and initialize the secure dashboard
        const secureDashboard = new SecureAnalyticsDashboard();
        await secureDashboard.init();
        
        // Store dashboard instance globally
        window.OsliraApp.secureDashboard = secureDashboard;
        
        // Initialize individual modules if containers exist
        initializeIndividualModules();
        
        console.log('✅ Secure analytics dashboard fully initialized');
        
        // Emit ready event
        window.dispatchEvent(new CustomEvent('analyticsReady', {
            detail: { 
                dashboard: secureDashboard,
                timestamp: new Date().toISOString()
            }
        }));
        
    } catch (error) {
        console.error('❌ Secure analytics initialization failed:', error);
        handleInitializationFailure(error);
    }
}

// Wait for OsliraApp to be available
function waitForOsliraApp(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkOsliraApp = () => {
            if (window.OsliraApp && window.OsliraApp.initialize) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('OsliraApp initialization timeout'));
            } else {
                setTimeout(checkOsliraApp, 100);
            }
        };
        
        checkOsliraApp();
    });
}

// Ensure all required services are available
async function ensureServicesAvailable() {
    const requiredServices = [
        'creditService',
        'claudeService', 
        'analyticsService',
        'dataWriteService',
        'integrationService'
    ];
    
    const missingServices = requiredServices.filter(service => 
        !window.OsliraApp[service] && !window.OsliraApp.services?.[`secure${service.charAt(0).toUpperCase() + service.slice(1)}`]
    );
    
    if (missingServices.length > 0) {
        console.warn('⚠️ Missing services:', missingServices);
        // Services will be created by SecureAnalyticsDashboard if needed
    }
}

// Initialize individual modules for backwards compatibility
function initializeIndividualModules() {
    console.log('🔧 Initializing individual analytics modules...');
    
    // Message Style Matrix
    const matrixContainer = document.querySelector('#message-style-container');
    if (matrixContainer && window.SecureMessageStyleMatrix) {
        try {
            const matrix = new window.SecureMessageStyleMatrix(
                matrixContainer, 
                window.OsliraApp.services?.secureAnalyticsService,
                window.OsliraApp.services?.secureCreditService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.messageMatrix = matrix;
            matrix.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize message matrix:', error);
        }
    }
    
    // Lead Conversion Heatmap
    const heatmapContainer = document.querySelector('#lead-conversion-container');
    if (heatmapContainer && window.SecureLeadConversionHeatmap) {
        try {
            const heatmap = new window.SecureLeadConversionHeatmap(
                heatmapContainer, 
                window.OsliraApp.services?.secureAnalyticsService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.heatmap = heatmap;
            heatmap.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize heatmap:', error);
        }
    }
    
    // CTA Effectiveness Tracker
    const ctaContainer = document.querySelector('#cta-effectiveness-container');
    if (ctaContainer && window.SecureCTAEffectivenessTracker) {
        try {
            const ctaTracker = new window.SecureCTAEffectivenessTracker(
                ctaContainer,
                window.OsliraApp.services?.secureAnalyticsService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.ctaTracker = ctaTracker;
            ctaTracker.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize CTA tracker:', error);
        }
    }
    
    // Feedback Signal Explorer
    const feedbackContainer = document.querySelector('#feedback-explorer-container');
    if (feedbackContainer && window.SecureFeedbackSignalExplorer) {
        try {
            const feedbackExplorer = new window.SecureFeedbackSignalExplorer(
                feedbackContainer,
                window.OsliraApp.services?.secureAnalyticsService,
                window.OsliraApp.services?.secureClaudeService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.feedbackExplorer = feedbackExplorer;
            feedbackExplorer.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize feedback explorer:', error);
        }
    }
    
    // CRM Performance Comparator
    const crmContainer = document.querySelector('#crm-performance-container');
    if (crmContainer && window.SecureCRMPerformanceComparator) {
        try {
            const crmComparator = new window.SecureCRMPerformanceComparator(
                crmContainer,
                window.OsliraApp.services?.secureAnalyticsService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.crmComparator = crmComparator;
            crmComparator.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize CRM comparator:', error);
        }
    }
    
    // Outreach Timeline Overlay
    const timelineContainer = document.querySelector('#outreach-timeline-container');
    if (timelineContainer && window.SecureOutreachTimelineOverlay) {
        try {
            const timelineOverlay = new window.SecureOutreachTimelineOverlay(
                timelineContainer,
                window.OsliraApp.services?.secureAnalyticsService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.timelineOverlay = timelineOverlay;
            timelineOverlay.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize timeline overlay:', error);
        }
    }
    
    // Message Iteration ROI Tracker
    const roiContainer = document.querySelector('#roi-tracker-container');
    if (roiContainer && window.SecureMessageIterationROITracker) {
        try {
            const roiTracker = new window.SecureMessageIterationROITracker(
                roiContainer,
                window.OsliraApp.services?.secureAnalyticsService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.roiTracker = roiTracker;
            roiTracker.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize ROI tracker:', error);
        }
    }
    
    // Team Impact Dashboard
    const teamContainer = document.querySelector('#team-dashboard-container');
    if (teamContainer && window.SecureTeamImpactDashboard) {
        try {
            const teamDashboard = new window.SecureTeamImpactDashboard(
                teamContainer,
                window.OsliraApp.services?.secureAnalyticsService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.teamDashboard = teamDashboard;
            teamDashboard.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize team dashboard:', error);
        }
    }
    
    // Claude Guidance History
    const guidanceContainer = document.querySelector('#claude-guidance-container');
    if (guidanceContainer && window.SecureClaudeGuidanceHistory) {
        try {
            const guidanceHistory = new window.SecureClaudeGuidanceHistory(
                guidanceContainer,
                window.OsliraApp.services?.secureAnalyticsService,
                window.OsliraApp.services?.secureClaudeService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.guidanceHistory = guidanceHistory;
            guidanceHistory.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize guidance history:', error);
        }
    }
    
    // Message Risk Classifier
    const riskContainer = document.querySelector('#risk-classifier-container');
    if (riskContainer && window.SecureMessageRiskClassifier) {
        try {
            const riskClassifier = new window.SecureMessageRiskClassifier(
                riskContainer,
                window.OsliraApp.services?.secureAnalyticsService,
                window.OsliraApp.services?.secureClaudeService
            );
            window.OsliraApp.modules = window.OsliraApp.modules || {};
            window.OsliraApp.modules.riskClassifier = riskClassifier;
            riskClassifier.render().catch(console.warn);
        } catch (error) {
            console.warn('Failed to initialize risk classifier:', error);
        }
    }
    
    // Initialize Chart Factory
    if (!window.OsliraApp.chartFactory && window.SecureChartFactory) {
        try {
            window.OsliraApp.chartFactory = new window.SecureChartFactory();
            console.log('✅ Chart factory initialized');
        } catch (error) {
            console.warn('Failed to initialize chart factory:', error);
        }
    }
    
    console.log('✅ Individual modules initialization completed');
}

// Handle initialization failure
function handleInitializationFailure(error) {
    // Show user-friendly error message
    const errorHtml = `
        <div id="analytics-init-error" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        ">
            <div style="
                background: white;
                padding: 32px;
                border-radius: 12px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h2 style="color: #dc2626; margin-bottom: 12px;">Analytics Dashboard Error</h2>
                <p style="color: #6b7280; margin-bottom: 16px;">
                    Unable to initialize the analytics dashboard.
                </p>
                <p style="color: #6b7280; margin-bottom: 24px; font-size: 14px;">
                    ${error.message}
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="window.location.reload()" style="
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    ">
                        Reload Page
                    </button>
                    <button onclick="document.getElementById('analytics-init-error').remove()" style="
                        background: #6b7280;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    ">
                        Continue Without Analytics
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorHtml);
    
    // Also try to initialize basic functionality
    try {
        initializeBasicFallback();
    } catch (fallbackError) {
        console.error('Even fallback initialization failed:', fallbackError);
    }
}

// Basic fallback initialization
function initializeBasicFallback() {
    console.log('🔄 Attempting basic fallback initialization...');
    
    // Create minimal services if they don't exist
    window.OsliraApp = window.OsliraApp || {};
    window.OsliraApp.modules = window.OsliraApp.modules || {};
    window.OsliraApp.services = window.OsliraApp.services || {};
    
    // Initialize basic chart factory
    if (window.SecureChartFactory) {
        window.OsliraApp.chartFactory = new window.SecureChartFactory();
    }
    
    // Show message that analytics are disabled
    window.OsliraApp.showMessage?.('Analytics dashboard running in fallback mode', 'warning');
}

// Configuration initialization
function initializeAnalyticsConfig() {
    try {
        // Create analytics config if it doesn't exist
        if (!window.OsliraApp.analyticsConfig) {
            window.OsliraApp.analyticsConfig = new SecureAnalyticsConfigManager();
        }
        
        const config = window.OsliraApp.analyticsConfig.getConfig();
        
        // Validate security requirements
        const meetsSecurity = window.OsliraApp.analyticsConfig.validateSecurityRequirements();
        if (!meetsSecurity) {
            console.warn('⚠️ Analytics security requirements not met');
        }
        
        // Log configuration status
        console.log('🔧 Analytics configuration initialized:', {
            version: config.version?.app || 'unknown',
            securityCompliant: meetsSecurity,
            modulesEnabled: Object.keys(config.modules || {}).length
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize analytics config:', error);
    }
}

/*
===============================================================================
                              DOM READY INITIALIZATION
===============================================================================
Main entry point when DOM is ready
*/

// Primary initialization when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready - initializing secure analytics...');
    
    // Initialize configuration first
    initializeAnalyticsConfig();
    
    // Wait a bit for other scripts to load, then initialize
    setTimeout(() => {
        initializeSecureAnalytics();
    }, 100);
});

// Alternative initialization for cases where DOM is already ready
if (document.readyState === 'loading') {
    // DOM is still loading, event listener will handle it
} else {
    // DOM is already ready
    console.log('📄 DOM already ready - initializing secure analytics...');
    initializeAnalyticsConfig();
    setTimeout(() => {
        initializeSecureAnalytics();
    }, 100);
}

// Listen for OsliraApp ready event as backup
window.addEventListener('osliraAppReady', function() {
    console.log('🚀 OsliraApp ready event received');
    if (!window.OsliraApp.secureDashboard) {
        setTimeout(() => {
            initializeSecureAnalytics();
        }, 50);
    }
});

// Export for manual initialization if needed
window.initializeSecureAnalytics = initializeSecureAnalytics;

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.OsliraApp?.secureDashboard?.cleanup) {
        window.OsliraApp.secureDashboard.cleanup();
    }
});

console.log('🔒 Secure Analytics Dashboard initialization script loaded');
