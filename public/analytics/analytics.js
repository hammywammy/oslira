// ==========================================
// ENHANCED ANALYTICS DASHBOARD - ENTERPRISE GRADE v3.3.0
// Secure Worker-First Architecture with AI-Powered Diagnostics
// ==========================================

// ===== IMPORT STATEMENTS (GROUPED & ALPHABETIZED) =====

// Core Services
import { SecureAnalyticsService } from './services/secureAnalyticsService.js';
import { SecureClaudeService } from './services/secureClaudeService.js';
import { SecureCreditService } from './services/secureCreditService.js';
import { SecureDataWriteService } from './services/secureDataWriteService.js';
import { SecureIntegrationService } from './services/secureIntegrationService.js';

// Analytics Modules
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
import { InsightsPanel } from './modules/InsightsPanel.js';
import { QuickSummaryPanel } from './modules/QuickSummaryPanel.js';
import { ModuleNavSidebar } from './modules/ModuleNavSidebar.js';

// Configuration & Constants
import { ANALYTICS_CONFIG, isFeatureEnabled, loadDynamicConfig } from './config/analytics-config.js';
import { CACHE_KEYS } from './config/cacheKeys.js';
import { CHART_THEMES } from './config/chartThemes.js';
import { EXPORT_CONFIG } from './config/exportConfig.js';
import { LEAD_TYPES } from './config/leadTypes.js';
import { MESSAGE_STYLES } from './config/messageStyles.js';
import { PERFORMANCE_THRESHOLDS } from './config/performanceThresholds.js';
import { SECURE_ANALYTICS_CONFIG } from './config/secureDashboardConfig.js';
import { WORKER_ENDPOINTS } from './config/endpoints.js';

// Utilities & Error Handling
import { BaseSecureModule } from './utils/baseSecureModule.js';
import { ErrorHandler } from './utils/errorHandler.js';
import { ExportManager } from './utils/exportManager.js';
import { SecureChartFactory } from './utils/secureChartFactory.js';
import { UIHelpers } from './utils/uiHelpers.js';

// ===== GLOBAL STATE INITIALIZATION =====

// Single source of truth for version
const APP_VERSION = '3.3.0';

// Initialize global modules registry once
if (!window.OsliraApp.modules) window.OsliraApp.modules = {};
if (!window.OsliraApp.modulesById) window.OsliraApp.modulesById = {};
if (!window.OsliraApp.failedModules) window.OsliraApp.failedModules = [];
if (!window.OsliraApp.performanceHistory) window.OsliraApp.performanceHistory = {};
if (!window.OsliraApp.memoryFootprints) window.OsliraApp.memoryFootprints = new Map();

// Set analytics version for auditing and support
window.OsliraApp.version = `analytics-v${APP_VERSION}`;

// Debug mode support via query string with live toggle
let debugMode = new URLSearchParams(location.search).get('debug') === 'true';

// Initialization guard to prevent double-booting
let isInitialized = false;

// Boot type tracking for telemetry
window.OsliraApp.bootType = performance.navigation?.type === 1 ? 'warm' : 'cold';

// Memory tracking for trend analysis
let lastUsedMB = 0;
let lastMemoryCheck = 0;
let memoryTrend = [];

// Module restart cooldown tracking
const moduleRestartCooldowns = new Map();
const MODULE_RESTART_COOLDOWN = 5000; // 5 seconds

// Dependency resolution cache
const dependencyCache = new WeakMap();

// Security and governance state
let isLockedDown = false;
let auditingEnabled = true;
let consentBasedLogging = localStorage.getItem('analytics_consent_logging') !== 'false';

// FPS monitoring for critical modules
const fpsMonitors = new Map();

// Module priority weights (higher = render first)
const MODULE_PRIORITIES = {
    messageRisk: 100,
    heatmap: 90,
    messageMatrix: 80,
    ctaTracker: 70,
    teamDashboard: 60,
    crmComparator: 50,
    feedbackExplorer: 40,
    claudeGuidance: 30,
    iterationROI: 20,
    outreachTimeline: 10
};

if (debugMode) console.debug('🐛 [Debug] Debug mode enabled for analytics dashboard');

// Parse disabled modules from URL
const disabledModules = new Set(
    new URLSearchParams(location.search).get('disable')?.split(',').filter(Boolean) || []
);

// ===== CONFIGURATION & UTILITIES =====

const CONTAINER_REGISTRY = {
    cta: '#cta-effectiveness-container',
    claudeGuidance: '#claude-guidance-container',
    crmComparator: '#crm-performance-container',
    feedbackExplorer: '#feedback-explorer-container',
    heatmap: '#lead-conversion-container',
    iterationROI: '#roi-tracker-container',
    messageRisk: '#risk-classifier-container',
    messageMatrix: '#message-style-container',
    outreachTimeline: '#timeline-overlay-container',
    teamDashboard: '#team-dashboard-container'
};

// Module dependencies mapping with categorization
const MODULE_DEPENDENCIES = {
    // Core Data Dependencies
    messageMatrix: ['heatmap'],
    iterationROI: ['messageMatrix'],
    
    // Advanced Analytics Dependencies
    teamDashboard: ['heatmap', 'messageMatrix'],
    
    // CRM Integration Dependencies
    crmComparator: ['heatmap'],
    
    // AI/Claude Dependencies
    claudeGuidance: ['messageRisk'],
    feedbackExplorer: ['claudeGuidance']
};

// ===== UTILITY FUNCTIONS =====

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return String(unsafe);
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const getService = (serviceName, customServices = null) => {
    // Allow dependency injection override
    if (customServices && customServices[`secure${serviceName}Service`]) {
        return customServices[`secure${serviceName}Service`];
    }
    return window.OsliraApp?.services?.[`secure${serviceName}Service`];
};

const getContainer = (containerKey) => {
    const selector = CONTAINER_REGISTRY[containerKey];
    const element = document.querySelector(selector);
    if (!element && debugMode) {
        console.warn(`⚠️ [Container] Module "${containerKey}" skipped - container ${selector} not found.`);
    }
    return element;
};

// ===== PERFORMANCE MONITORING ENHANCEMENTS =====

function storePerformanceHistory(moduleName, renderTime) {
    const key = `analytics_perf_${moduleName}`;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Keep last 10 render times
    history.push({ time: renderTime, timestamp: Date.now() });
    if (history.length > 10) history.shift();
    
    localStorage.setItem(key, JSON.stringify(history));
    
    // Check for performance regression (2x slower than average)
    if (history.length >= 3) {
        const average = history.slice(0, -1).reduce((sum, entry) => sum + entry.time, 0) / (history.length - 1);
        if (renderTime > average * 2) {
            console.warn(`📉 [Performance] Regression detected in ${moduleName}: ${renderTime.toFixed(2)}ms vs ${average.toFixed(2)}ms avg`);
        }
    }
    
    window.OsliraApp.performanceHistory[moduleName] = history;
}

//i have no idea where to put these i think in DOM
const insightsContainer = document.querySelector('#insights-panel');
if (insightsContainer) {
  const insights = new InsightsPanel(insightsContainer, window.OsliraApp.services.secureClaudeService);
  insights.render();
  window.OsliraApp.modules.insights = insights;
}

const summaryContainer = document.querySelector('#summary-panel');
if (summaryContainer) {
  const summary = new QuickSummaryPanel(summaryContainer, window.OsliraApp.services.secureAnalyticsService);
  summary.render();
  window.OsliraApp.modules.summary = summary;
}

const navSidebar = new ModuleNavSidebar(document.body, window.OsliraApp.modules);
navSidebar.render();

//this is for fallback init
const cachedSummary = getCachedData('summary');
if (cachedSummary) {
  // optionally render cached summary content
}

function measureModuleMemoryFootprint(moduleName, beforeCallback, afterCallback) {
    let memoryBefore = 0;
    let memoryAfter = 0;
    
    if ('memory' in performance) {
        memoryBefore = performance.memory.usedJSHeapSize;
    }
    
    return async function(...args) {
        const result = await beforeCallback.apply(this, args);
        
        if ('memory' in performance) {
            // Allow GC to settle
            await new Promise(resolve => setTimeout(resolve, 100));
            memoryAfter = performance.memory.usedJSHeapSize;
            
            const footprint = Math.round((memoryAfter - memoryBefore) / 1024); // KB
            window.OsliraApp.memoryFootprints.set(moduleName, footprint);
            
            if (debugMode) {
                console.log(`💾 [Memory] ${moduleName} footprint: ${footprint}KB`);
            }
            
            if (footprint > 1024) { // > 1MB
                console.warn(`⚠️ [Memory] Heavy module detected: ${moduleName} uses ${footprint}KB`);
            }
        }
        
        if (afterCallback) {
            await afterCallback.apply(this, args);
        }
        
        return result;
    };
}

function startFPSMonitoring(moduleName, element) {
    if (!element || fpsMonitors.has(moduleName)) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    
    function countFrames() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) { // Every second
            const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
            
            if (fps < 30 && debugMode) {
                console.warn(`🎬 [FPS] Low FPS detected in ${moduleName}: ${fps}fps`);
            }
            
            frameCount = 0;
            lastTime = currentTime;
        }
        
        if (fpsMonitors.has(moduleName)) {
            requestAnimationFrame(countFrames);
        }
    }
    
    fpsMonitors.set(moduleName, true);
    requestAnimationFrame(countFrames);
}

function stopFPSMonitoring(moduleName) {
    fpsMonitors.delete(moduleName);
}

// ===== THEME SELECTION SYSTEM =====

function getChartTheme() {
    if (isFeatureEnabled('enableHighContrastMode')) {
        return CHART_THEMES.schemes.highContrast;
    } else if (isFeatureEnabled('enableDarkMode')) {
        return CHART_THEMES.schemes.dark || CHART_THEMES.schemes.categorical;
    }
    return CHART_THEMES.schemes.categorical;
}

// ===== AI-POWERED DIAGNOSTICS =====

async function claudeRootCauseAnalysis(error, context = {}) {
    try {
        const claudeService = getService('Claude');
        if (!claudeService) return null;
        
        const diagnosticPayload = {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context: {
                version: window.OsliraApp.version,
                bootType: window.OsliraApp.bootType,
                moduleCount: Object.keys(window.OsliraApp.modules).length,
                failedModules: window.OsliraApp.failedModules,
                memoryFootprints: Array.from(window.OsliraApp.memoryFootprints.entries()),
                ...context
            },
            prompt: `Analyze this JavaScript error in an analytics dashboard and provide:
1. Root cause analysis
2. Potential fixes
3. Prevention strategies
4. Risk assessment (1-10)
5. Urgency level (low/medium/high/critical)`
        };
        
        const analysis = await claudeService.analyzeError(diagnosticPayload);
        
        console.log('🤖 [Claude] Root cause analysis:', analysis);
        return analysis;
        
    } catch (analysisError) {
        console.error('❌ [Claude] Failed to analyze error:', analysisError);
        return null;
    }
}

async function claudeInsightSummarization() {
    try {
        const claudeService = getService('Claude');
        if (!claudeService) return null;
        
        const insights = {
            memoryTrend: memoryTrend.slice(-10),
            performanceHistory: window.OsliraApp.performanceHistory,
            failedModules: window.OsliraApp.failedModules,
            moduleFootprints: Array.from(window.OsliraApp.memoryFootprints.entries()),
            bootType: window.OsliraApp.bootType,
            systemHealth: await window.AnalyticsConfig.checkServiceHealth?.()
        };
        
        const summary = await claudeService.summarizeInsights(insights);
        
        console.log('📊 [Claude] System insights:', summary);
        return summary;
        
    } catch (error) {
        console.error('❌ [Claude] Failed to generate insights:', error);
        return null;
    }
}

async function claudeFeedbackBasedImprovements() {
    try {
        const feedbackModule = window.OsliraApp.modules.feedbackExplorer;
        if (!feedbackModule || !feedbackModule.ready) return null;
        
        const claudeService = getService('Claude');
        if (!claudeService) return null;
        
        // Get feedback data from explorer module
        const feedbackData = await feedbackModule.getAggregatedFeedback?.();
        if (!feedbackData) return null;
        
        const improvements = await claudeService.suggestModuleImprovements({
            feedback: feedbackData,
            moduleStats: window.OsliraApp.moduleStats,
            performanceHistory: window.OsliraApp.performanceHistory
        });
        
        console.log('💡 [Claude] Suggested improvements:', improvements);
        return improvements;
        
    } catch (error) {
        console.error('❌ [Claude] Failed to suggest improvements:', error);
        return null;
    }
}

// ===== CONFIGURATION MANAGEMENT =====

async function loadDynamicConfigWithFallback() {
    try {
        // Primary: Use loadDynamicConfig
        await loadDynamicConfig();
    } catch (error) {
        console.warn('⚠️ [Config] Primary config failed, trying CDN fallback:', error);
        
        try {
            // Fallback: Load from CDN
            const response = await fetch('https://cdn.oslira.com/config/analytics-fallback.json');
            if (response.ok) {
                const fallbackConfig = await response.json();
                Object.assign(window.OsliraApp.config, fallbackConfig);
                console.log('✅ [Config] Loaded from CDN fallback');
            } else {
                throw new Error(`CDN returned ${response.status}`);
            }
        } catch (fallbackError) {
            console.error('❌ [Config] CDN fallback also failed:', fallbackError);
            throw new Error('All configuration sources failed');
        }
    }
}

// ===== SECURITY VALIDATION =====

function validateConfiguration() {
    console.log('🔐 [Security] Validating analytics configuration...');
    
    // Validate worker URL
    const workerUrl = window.OsliraApp?.config?.workerUrl;
    if (!workerUrl || !workerUrl.startsWith('https://')) {
        throw new Error('Invalid or missing secure worker URL in configuration');
    }
    
    // Validate required config
    if (!window.OsliraApp?.config?.supabaseUrl || !window.OsliraApp?.config?.supabaseAnonKey) {
        console.warn('⚠️ [Security] Supabase configuration missing - some features may be limited');
    }
    
    console.log('✅ [Security] Configuration validation passed');
}

// ===== ENHANCED AUDIT LOGGING WITH CONSENT =====

async function auditLogWithRetry(action, metadata = {}, retryCount = 2) {
    if (!isFeatureEnabled('enableAuditLogging') || !consentBasedLogging || !auditingEnabled) return;
    
    for (let attempt = 1; attempt <= retryCount + 1; attempt++) {
        try {
            const auditData = {
                action,
                timestamp: new Date().toISOString(),
                version: window.OsliraApp.version,
                bootType: window.OsliraApp.bootType,
                userAgent: navigator.userAgent,
                url: window.location.href,
                consent: consentBasedLogging,
                attempt,
                ...metadata
            };
            
            // Include version diff if available
            if (window.OsliraApp.versionDiff) {
                auditData.versionDiff = window.OsliraApp.versionDiff;
            }
            
            // Send to worker for secure logging
            const writeService = getService('DataWrite');
            if (writeService) {
                await writeService.logAuditTrail(action, auditData);
                return; // Success, exit retry loop
            }
        } catch (error) {
            if (attempt <= retryCount) {
                console.warn(`⚠️ [Audit] Retry ${attempt} for ${action}: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            } else {
                console.error(`❌ [Audit] Failed to log ${action} after ${attempt} attempts:`, error);
            }
        }
    }
}

// ===== SERVICE INITIALIZATION WITH RETRY LOGIC =====

async function initializeServiceWithRetry(ServiceClass, serviceName, retryCount = 1) {
    for (let attempt = 1; attempt <= retryCount + 1; attempt++) {
        try {
            console.log(`🔧 [Services] Initializing ${serviceName} (attempt ${attempt})`);
            const service = new ServiceClass();
            
            // Add health check for Claude service
            if (serviceName === 'SecureClaudeService') {
                service.healthStatus = async () => {
                    try {
                        const startTime = Date.now();
                        await service.ping?.();
                        const responseTime = Date.now() - startTime;
                        return { healthy: true, responseTime };
                    } catch (error) {
                        return { healthy: false, error: error.message };
                    }
                };
                
                // Add AI analysis methods
                service.analyzeError = async (diagnosticPayload) => {
                    return await service.makeSecureRequest('/ai/error-analysis', diagnosticPayload);
                };
                
                service.summarizeInsights = async (insights) => {
                    return await service.makeSecureRequest('/ai/insight-summary', insights);
                };
                
                service.suggestModuleImprovements = async (feedbackData) => {
                    return await service.makeSecureRequest('/ai/module-improvements', feedbackData);
                };
            }
            
            return service;
        } catch (error) {
            if (attempt <= retryCount) {
                console.warn(`⚠️ [Services] Retrying ${serviceName} after failure... (${error.message})`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                console.error(`❌ [Services] ${serviceName} failed after ${attempt} attempts:`, error);
                throw error;
            }
        }
    }
}

async function initializeServices() {
    console.log('🔧 [Services] Initializing secure services...');
    
    const startTime = performance.now();
    
    try {
        // Initialize service registry
        if (!window.OsliraApp.services) window.OsliraApp.services = {};
        
        // Initialize all secure services with retry logic
        window.OsliraApp.services.secureAnalyticsService = await initializeServiceWithRetry(
            SecureAnalyticsService, 'SecureAnalyticsService'
        );
        
        window.OsliraApp.services.secureClaudeService = await initializeServiceWithRetry(
            SecureClaudeService, 'SecureClaudeService'
        );
        
        window.OsliraApp.services.secureCreditService = await initializeServiceWithRetry(
            SecureCreditService, 'SecureCreditService'
        );
        
        window.OsliraApp.services.secureDataWriteService = await initializeServiceWithRetry(
            SecureDataWriteService, 'SecureDataWriteService'
        );
        
        window.OsliraApp.services.secureIntegrationService = await initializeServiceWithRetry(
            SecureIntegrationService, 'SecureIntegrationService'
        );
        
        // Initialize chart factory with dynamic theming
        window.OsliraApp.chartFactory = new SecureChartFactory();
        window.OsliraApp.chartFactory.getTheme = getChartTheme;
        
        // Initialize export manager with format usage tracking
        window.OsliraApp.exportManager = new ExportManager();
        window.OsliraApp.exportManager.getFormatUsageStats = function() {
            return {
                totalExports: this.exportCount || 0,
                formatBreakdown: this.formatUsage || {},
                averageFileSize: this.averageSize || 0
            };
        };
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`✅ [Services] Services initialized in ${duration.toFixed(2)}ms`);
        
        // Audit log service initialization
        await auditLogWithRetry('services_initialized', { duration, serviceCount: 5 });
        
    } catch (error) {
        console.error('❌ [Services] Service initialization failed:', error);
        await auditLogWithRetry('services_failed', { error: error.message });
        throw error;
    }
}

// ===== CHART FACTORY INTEGRATION =====

function initializeStandardCharts() {
    console.log('📊 [Charts] Initializing standard charts...');
    
    const currentTheme = getChartTheme();
    
    const chartConfigs = [
        {
            id: 'lead-performance-chart',
            type: 'bar',
            chartData: { 
                labels: ['Personal Brand', 'Business Page', 'Creator', 'Meme Page'], 
                datasets: [{
                    label: 'Conversion Rate %',
                    data: [15, 8, 12, 5],
                    backgroundColor: currentTheme
                }]
            },
            options: { 
                plugins: { 
                    title: { display: true, text: 'Lead Performance by Type' } 
                },
                responsive: true,
                maintainAspectRatio: false
            }
        },
        {
            id: 'message-style-chart',
            type: 'doughnut',
            chartData: {
                labels: ['Formal', 'Casual', 'Friendly', 'Professional'],
                datasets: [{
                    data: [20, 35, 30, 15],
                    backgroundColor: currentTheme
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: 'Message Style Distribution' }
                },
                responsive: true
            }
        },
        {
            id: 'team-performance-chart',
            type: 'line',
            chartData: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Team Average',
                    data: [65, 72, 78, 82],
                    borderColor: CHART_THEMES.colors.primary,
                    tension: 0.4
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: 'Team Performance Trend' }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        }
    ];

    chartConfigs.forEach(({ id, type, chartData, options }) => {
        const element = document.getElementById(id);
        if (element) {
            try {
                const chart = window.OsliraApp.chartFactory.createChart(type, element, chartData, options);
                window.OsliraApp.modules[id] = chart;
                // Also expose by ID for direct access
                window.OsliraApp.modulesById[id] = chart;
                
                if (debugMode) console.log(`✅ [Charts] Chart "${id}" initialized successfully`);
            } catch (error) {
                console.error(`❌ [Charts] Failed to initialize chart "${id}":`, error);
            }
        } else if (debugMode) {
            console.warn(`⚠️ [Charts] Chart container "${id}" not found`);
        }
    });
}

// ===== ENHANCED MODULE DEPENDENCY VALIDATION =====

function validateModuleDependencies(moduleName) {
    // Check cache first
    if (dependencyCache.has(MODULE_DEPENDENCIES)) {
        const cached = dependencyCache.get(MODULE_DEPENDENCIES)[moduleName];
        if (cached !== undefined) return cached;
    }
    
    const dependencies = MODULE_DEPENDENCIES[moduleName];
    if (!dependencies) return { allReady: true, missingDependencies: [] };
    
    let allReady = true;
    const missingDependencies = [];
    
    for (const dependency of dependencies) {
        if (!window.OsliraApp.modules[dependency]?.ready) {
            console.warn(`⚠️ [Dependencies] ${dependency} not ready, ${moduleName} analytics may be degraded`);
            allReady = false;
            missingDependencies.push(dependency);
        }
    }
    
    // Cache result
    if (!dependencyCache.has(MODULE_DEPENDENCIES)) {
        dependencyCache.set(MODULE_DEPENDENCIES, {});
    }
    dependencyCache.get(MODULE_DEPENDENCIES)[moduleName] = { allReady, missingDependencies };
    
    return { allReady, missingDependencies };
}

// ===== ENHANCED MODULE MANAGEMENT =====

function handleDependencyFailure(moduleName, missingDependencies) {
    const module = window.OsliraApp.modules[moduleName];
    if (!module) return;
    
    // Provide degraded functionality instead of full failure
    module.degradedMode = true;
    module.missingDependencies = missingDependencies;
    
    // Override render method for degraded mode
    const originalRender = module.render;
    module.render = function() {
        console.warn(`⚠️ [Module] ${moduleName} running in degraded mode due to missing dependencies: ${missingDependencies.join(', ')}`);
        
        // Show degraded UI
        this.container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border: 1px solid #f59e0b;">
                <p style="margin: 0 0 10px 0; font-weight: 600;">📊 ${moduleName}</p>
                <p style="margin: 0 0 10px 0; font-size: 14px;">Limited functionality - missing dependencies</p>
                <p style="margin: 0; font-size: 12px; opacity: 0.8;">Missing: ${missingDependencies.join(', ')}</p>
            </div>
        `;
        
        this.ready = true;
    };
}

// ===== SECURE ANALYTICS MODULES WITH PRIORITY QUEUE =====

async function initializeAnalyticsModules(customServices = null) {
    console.log('🧩 [Modules] Initializing secure analytics modules...');
    
    const startTime = performance.now();
    let successCount = 0;
    let failureCount = 0;
    const moduleStats = new Map();
    
    // Get required services (with dependency injection support)
    const analyticsService = getService('Analytics', customServices);
    const claudeService = getService('Claude', customServices);
    const creditService = getService('Credit', customServices);
    
    if (!analyticsService || !claudeService || !creditService) {
        throw new Error('Required services not available for module initialization');
    }
    
    // Module configuration with performance tracking and priorities
    const moduleConfigs = [
        {
            name: 'ctaTracker',
            class: SecureCTAEffectivenessTracker,
            container: 'cta',
            displayName: 'CTA Effectiveness Tracker',
            category: 'conversion',
            priority: MODULE_PRIORITIES.ctaTracker || 50
        },
        {
            name: 'claudeGuidance',
            class: SecureClaudeGuidanceHistory,
            container: 'claudeGuidance',
            displayName: 'Claude Guidance History',
            category: 'ai',
            priority: MODULE_PRIORITIES.claudeGuidance || 50
        },
        {
            name: 'crmComparator',
            class: SecureCRMPerformanceComparator,
            container: 'crmComparator',
            displayName: 'CRM Performance Comparator',
            category: 'crm',
            priority: MODULE_PRIORITIES.crmComparator || 50
        },
        {
            name: 'feedbackExplorer',
            class: SecureFeedbackSignalExplorer,
            container: 'feedbackExplorer',
            displayName: 'Feedback Signal Explorer',
            category: 'feedback',
            priority: MODULE_PRIORITIES.feedbackExplorer || 50
        },
        {
            name: 'heatmap',
            class: SecureLeadConversionHeatmap,
            container: 'heatmap',
            displayName: 'Lead Conversion Heatmap',
            category: 'core',
            priority: MODULE_PRIORITIES.heatmap || 50
        },
        {
            name: 'iterationROI',
            class: SecureMessageIterationROITracker,
            container: 'iterationROI',
            displayName: 'Message Iteration ROI Tracker',
            category: 'optimization',
            priority: MODULE_PRIORITIES.iterationROI || 50
        },
       {
            name: 'messageRisk',
            class: SecureMessageRiskClassifier,
            container: 'messageRisk',
            displayName: 'Message Risk Classifier',
            category: 'ai',
            priority: MODULE_PRIORITIES.messageRisk || 50
        },
        {
            name: 'messageMatrix',
            class: SecureMessageStyleMatrix,
            container: 'messageMatrix',
            displayName: 'Message Style Matrix',
            category: 'core',
            priority: MODULE_PRIORITIES.messageMatrix || 50
        },
        {
            name: 'outreachTimeline',
            class: SecureOutreachTimelineOverlay,
            container: 'outreachTimeline',
            displayName: 'Outreach Timeline Overlay',
            category: 'timeline',
            priority: MODULE_PRIORITIES.outreachTimeline || 50
        },
        {
            name: 'teamDashboard',
            class: SecureTeamImpactDashboard,
            container: 'teamDashboard',
            displayName: 'Team Impact Dashboard',
            category: 'team',
            priority: MODULE_PRIORITIES.teamDashboard || 50
        }
    ];
    
    // Filter out disabled modules
    const enabledConfigs = moduleConfigs.filter(config => !disabledModules.has(config.name));
    
    // Sort by priority (higher priority first)
    enabledConfigs.sort((a, b) => b.priority - a.priority);
    
    console.log(`🎯 [Modules] Rendering ${enabledConfigs.length} modules in priority order:`, 
                enabledConfigs.map(c => `${c.name}(${c.priority})`).join(', '));
    
    // Initialize modules with performance tracking
    for (const config of enabledConfigs) {
        const moduleStartTime = performance.now();
        let memoryBefore = 0;
        
        try {
            const container = getContainer(config.container);
            if (!container) {
                console.warn(`⚠️ [Modules] Module "${config.name}" skipped - container not found`);
                continue;
            }
            
            // Measure memory before module creation
            if ('memory' in performance) {
                memoryBefore = performance.memory.usedJSHeapSize;
            }
            
            // Validate dependencies
            const dependencyResult = validateModuleDependencies(config.name);
            
            // Create module instance with memory measurement wrapper
            const moduleInstance = await measureModuleMemoryFootprint(
                config.name,
                async () => {
                    return new config.class(container, analyticsService, claudeService, creditService);
                }
            )();
            
            // Set display name for DevTools memory snapshots
            moduleInstance.constructor.displayName = config.displayName;
            
            // Add version and metadata
            moduleInstance.version = window.OsliraApp.version;
            moduleInstance.containerSelector = CONTAINER_REGISTRY[config.container];
            moduleInstance.moduleName = config.name;
            moduleInstance.category = config.category;
            moduleInstance.priority = config.priority;
            moduleInstance.ready = false;
            
            // Enhanced lifecycle methods
            moduleInstance.cleanup = function() {
                // Stop FPS monitoring
                stopFPSMonitoring(this.moduleName);
                
                // Strict memory purge
                if (this.chart) {
                    this.chart.destroy();
                    this.chart = null;
                }
                if (this.eventListeners) {
                    this.eventListeners.forEach(({ element, event, handler }) => {
                        element.removeEventListener(event, handler);
                    });
                    this.eventListeners = null;
                }
                if (this.intervals) {
                    this.intervals.forEach(clearInterval);
                    this.intervals = null;
                }
                if (this.timeouts) {
                    this.timeouts.forEach(clearTimeout);
                    this.timeouts = null;
                }
                if (this.data) {
                    this.data = null;
                }
                if (this.cache) {
                    this.cache.clear?.();
                    this.cache = null;
                }
                
                this.ready = false;
            };
            
            moduleInstance.restart = async function() {
                console.log(`🔄 [Module] Restarting ${this.moduleName}...`);
                this.cleanup();
                await this.render();
                this.ready = true;
            };
            
            // Force rerender without restart
            moduleInstance.forceRerender = async function() {
                console.log(`🎨 [Module] Force rerendering ${this.moduleName}...`);
                if (this.render) {
                    await this.render();
                    this.ready = true;
                }
            };
            
            // Enhanced fallback render method
            moduleInstance.fallbackRender = function() {
                console.warn(`⚠️ [Modules] Fallback render triggered for ${config.name}`);
                this.container.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #666; background: rgba(107, 114, 128, 0.1); border-radius: 8px; border: 1px solid #d1d5db;">
                        <p style="margin: 0 0 10px 0; font-weight: 600;">📊 ${config.displayName}</p>
                        <p style="margin: 0 0 10px 0; font-size: 14px;">Limited functionality mode</p>
                        <p style="margin: 0; font-size: 12px; opacity: 0.8;">Module timeout or dependency issue</p>
                        <button onclick="window.AnalyticsConfig.restartModule('${config.name}')" 
                                style="margin-top: 10px; padding: 6px 12px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Retry
                        </button>
                    </div>
                `;
                this.ready = true;
            };
            
            // Health check endpoint simulation
            moduleInstance.healthCheck = async function() {
                try {
                    const isHealthy = this.ready && this.container && !this.degradedMode;
                    const memoryFootprint = window.OsliraApp.memoryFootprints.get(this.moduleName) || 0;
                    const lastRenderTime = window.OsliraApp.performanceHistory[this.moduleName]?.slice(-1)[0]?.time || 0;
                    
                    return {
                        healthy: isHealthy,
                        moduleName: this.moduleName,
                        category: this.category,
                        ready: this.ready,
                        degradedMode: this.degradedMode || false,
                        memoryFootprint: `${memoryFootprint}KB`,
                        lastRenderTime: `${lastRenderTime.toFixed(2)}ms`,
                        dependencies: MODULE_DEPENDENCIES[this.moduleName] || [],
                        missingDependencies: this.missingDependencies || []
                    };
                } catch (error) {
                    return {
                        healthy: false,
                        error: error.message,
                        moduleName: this.moduleName
                    };
                }
            };
            
            // Handle dependency failures
            if (!dependencyResult.allReady) {
                handleDependencyFailure(config.name, dependencyResult.missingDependencies);
            }
            
            // Module timeout auto-fallback
            const timeoutId = setTimeout(() => {
                if (!moduleInstance.ready) {
                    moduleInstance.fallbackRender?.();
                    console.warn(`⚠️ [Modules] Module timeout - fallback render triggered for ${config.name}`);
                }
            }, SECURE_ANALYTICS_CONFIG.performance.moduleTimeoutDuration);
            
            // Store module
            window.OsliraApp.modules[config.name] = moduleInstance;
            // Also expose by container ID
            window.OsliraApp.modulesById[config.container] = moduleInstance;
            
            // Start FPS monitoring for critical modules
            if (['messageRisk', 'heatmap', 'messageMatrix'].includes(config.name)) {
                startFPSMonitoring(config.name, container);
            }
            
            // Mark as ready and clear timeout
            moduleInstance.ready = true;
            clearTimeout(timeoutId);
            
            const moduleEndTime = performance.now();
            const moduleDuration = moduleEndTime - moduleStartTime;
            
            // Store performance history
            storePerformanceHistory(config.name, moduleDuration);
            
            // Store stats for debug mode
            moduleStats.set(config.name, {
                renderTime: moduleDuration,
                category: config.category,
                priority: config.priority,
                dependencies: MODULE_DEPENDENCIES[config.name] || [],
                memoryFootprint: window.OsliraApp.memoryFootprints.get(config.name) || 0,
                ready: true
            });
            
            // Check for performance issues
            if (moduleDuration > SECURE_ANALYTICS_CONFIG.performance.maxModuleRenderTime) {
                console.warn(`⚠️ [Performance] Module "${config.name}" took ${moduleDuration.toFixed(2)}ms (exceeds threshold)`);
            }
            
            successCount++;
            
            if (debugMode) {
                console.log(`✅ [${config.displayName}] Rendered in ${moduleDuration.toFixed(2)}ms (Priority: ${config.priority})`);
            }
            
        } catch (error) {
            console.error(`❌ [Modules] Failed to initialize module "${config.name}":`, error);
            failureCount++;
            
            // Track failed modules with enhanced metadata
            window.OsliraApp.failedModules.push({
                name: config.name,
                displayName: config.displayName,
                category: config.category,
                priority: config.priority,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                memoryAtFailure: 'memory' in performance ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0
            });
            
            // AI-powered root cause analysis for critical failures
            if (['messageRisk', 'heatmap'].includes(config.name)) {
                claudeRootCauseAnalysis(error, {
                    moduleName: config.name,
                    category: config.category,
                    priority: config.priority
                });
            }
            
            // Audit log module failure
            await auditLogWithRetry('module_failed', { 
                moduleName: config.name,
                category: config.category,
                priority: config.priority,
                error: error.message 
            });
        }
    }
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    console.log(`✅ [Modules] Analytics modules initialized: ${successCount} success, ${failureCount} failed in ${totalDuration.toFixed(2)}ms`);
    
    // Store module stats for debug access
    if (debugMode) {
        window.OsliraApp.moduleStats = moduleStats;
    }
    
    // Generate AI insights if multiple failures
    if (failureCount > 2) {
        setTimeout(() => claudeInsightSummarization(), 2000);
    }
    
    // Generate feedback-based improvements periodically
    if (successCount > 5) {
        setTimeout(() => claudeFeedbackBasedImprovements(), 5000);
    }
    
    // Audit log module initialization
    await auditLogWithRetry('modules_initialized', { 
        successCount, 
        failureCount, 
        duration: totalDuration,
        disabledModules: Array.from(disabledModules),
        bootType: window.OsliraApp.bootType
    });
}

// ===== DYNAMIC MODULE INJECTION =====

window.OsliraApp.injectModule = async function(name, ModuleClass, containerSelector, customServices = null) {
    console.log(`🧩 [Injection] Injecting dynamic module: ${name}`);
    
    try {
        const container = document.querySelector(containerSelector);
        if (!container) {
            throw new Error(`Container ${containerSelector} not found`);
        }
        
        const analyticsService = getService('Analytics', customServices);
        const claudeService = getService('Claude', customServices);
        const creditService = getService('Credit', customServices);
        
        const moduleInstance = await measureModuleMemoryFootprint(
            name,
            async () => new ModuleClass(container, analyticsService, claudeService, creditService)
        )();
        
        moduleInstance.version = window.OsliraApp.version;
        moduleInstance.moduleName = name;
        moduleInstance.ready = false;
        moduleInstance.injected = true;
        
        // Add standard lifecycle methods
        moduleInstance.cleanup = function() {
            stopFPSMonitoring(this.moduleName);
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            if (this.eventListeners) {
                this.eventListeners.forEach(({ element, event, handler }) => {
                    element.removeEventListener(event, handler);
                });
                this.eventListeners = null;
            }
            if (this.intervals) this.intervals.forEach(clearInterval);
            if (this.timeouts) this.timeouts.forEach(clearTimeout);
            this.ready = false;
        };
        
        moduleInstance.restart = async function() {
            this.cleanup();
            await this.render();
            this.ready = true;
        };
        
        moduleInstance.forceRerender = async function() {
            if (this.render) {
                await this.render();
                this.ready = true;
            }
        };
        
        // Render and store
        const renderStartTime = performance.now();
        await moduleInstance.render();
        const renderTime = performance.now() - renderStartTime;
        
        moduleInstance.ready = true;
        
        window.OsliraApp.modules[name] = moduleInstance;
        window.OsliraApp.modulesById[containerSelector] = moduleInstance;
        
        // Store performance data
        storePerformanceHistory(name, renderTime);
        
        console.log(`✅ [Injection] Module ${name} injected successfully in ${renderTime.toFixed(2)}ms`);
        return moduleInstance;
        
    } catch (error) {
        console.error(`❌ [Injection] Failed to inject module ${name}:`, error);
        throw error;
    }
};

// ===== LEGACY MODULE SUPPORT =====

function initializeLegacyModules() {
    console.log('🔄 [Legacy] Initializing legacy analytics modules...');
    
    // Core Analytics Modules
    const coreModules = [
        'message-style-matrix',
        'lead-conversion-heatmap'
    ];
    
    // CTA & Conversion Modules
    const conversionModules = [
        'cta-effectiveness'
    ];
    
    // Feedback & Sentiment Modules
    const feedbackModules = [
        'feedback-explorer'
    ];
    
    // CRM Integration Modules
    const crmModules = [
        'crm-performance'
    ];
    
    // Timeline & Analytics Modules
    const timelineModules = [
        'outreach-timeline',
        'iteration-tracker'
    ];
    
    // Team & Management Modules
    const teamModules = [
        'team-impact'
    ];
    
    // AI & Risk Modules
    const aiModules = [
        'claude-guidance',
        'risk-classifier'
    ];
    
    const allLegacyModules = [
        ...coreModules,
        ...conversionModules, 
        ...feedbackModules,
        ...crmModules,
        ...timelineModules,
        ...teamModules,
        ...aiModules
    ];
    
    allLegacyModules.forEach(moduleId => {
        const element = document.getElementById(moduleId);
        if (element && !window.OsliraApp.modules[moduleId]) {
            // Create minimal legacy wrapper
            window.OsliraApp.modules[moduleId] = {
                element,
                legacy: true,
                ready: true,
                render: () => console.log(`🔄 [Legacy] Module ${moduleId} render called`),
                cleanup: () => console.log(`🧹 [Legacy] Module ${moduleId} cleanup called`)
            };
        }
    });
}

// ===== ERROR HANDLING & SANITIZED FALLBACK UI =====

function createErrorOverlay(error) {
    const overlay = document.createElement('div');
    overlay.id = 'analytics-error-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    // Sanitize error data to prevent injection
    const sanitizedMessage = escapeHtml(error.message || 'An unexpected error occurred while loading the analytics dashboard.');
    const sanitizedStack = escapeHtml(error.stack || error.message || 'No stack trace available');
    
    overlay.innerHTML = `
        <div style="text-align: center; padding: 40px; background: #1a1a1a; border-radius: 12px; max-width: 500px; margin: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h2 style="color: #ff6b6b; margin-bottom: 16px;">Analytics Dashboard Error</h2>
            <p style="color: #ccc; margin-bottom: 20px; line-height: 1.5;">
                ${sanitizedMessage}
            </p>
            <div style="margin-bottom: 20px;">
                <button onclick="this.parentElement.parentElement.parentElement.remove(); window.location.reload();" 
                        style="background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-right: 10px; font-weight: 600;">
                    Retry
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove();" 
                        style="background: #666; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Continue with Limited Features
                </button>
            </div>
            <details style="margin-top: 20px; text-align: left;">
                <summary style="cursor: pointer; color: #999; font-size: 14px;">Technical Details</summary>
                <pre style="background: #000; padding: 15px; border-radius: 6px; overflow: auto; margin-top: 10px; font-size: 12px; color: #0f0; word-wrap: break-word;">
Version: ${escapeHtml(window.OsliraApp.version)}
Boot Type: ${escapeHtml(window.OsliraApp.bootType)}
Timestamp: ${escapeHtml(new Date().toISOString())}
User Agent: ${escapeHtml(navigator.userAgent)}
URL: ${escapeHtml(window.location.href)}
Error: ${sanitizedStack}
                </pre>
            </details>
        </div>
    `;
    
    return overlay;
}

async function handleInitializationFailure(error) {
    console.error('❌ [Error] Analytics initialization failed:', error);
    
    // AI-powered root cause analysis
    const aiAnalysis = await claudeRootCauseAnalysis(error, {
        initializationPhase: 'main_init',
        bootType: window.OsliraApp.bootType,
        userAgent: navigator.userAgent
    });
    
    // Audit log fallback mode
    await auditLogWithRetry('fallback_mode_entered', { 
        reason: error.message,
        stack: error.stack,
        bootType: window.OsliraApp.bootType,
        userAgent: navigator.userAgent,
        aiAnalysis: aiAnalysis ? 'completed' : 'failed'
    });
    
    // Show error overlay
    const errorOverlay = createErrorOverlay(error);
    document.body.appendChild(errorOverlay);
    
    // Initialize basic fallback functionality
    try {
        initializeLegacyModules();
        initializeStandardCharts();
        console.log('✅ [Fallback] Mode initialized with limited functionality');
    } catch (fallbackError) {
        console.error('❌ [Fallback] Even fallback initialization failed:', fallbackError);
    }
}

// ===== PERFORMANCE MONITORING WITH MEMORY TRENDS & THROTTLING =====

function monitorPerformance() {
    if (!isFeatureEnabled('enableMemoryMonitoring')) return;
    
    const checkMemory = () => {
        const now = Date.now();
        
        if ('memory' in performance) {
            const memory = performance.memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
            const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
            
            // Add to memory trend
            memoryTrend.push({
                timestamp: now,
                used: usedMB,
                total: totalMB
            });
            
            // Keep only last 50 measurements
            if (memoryTrend.length > 50) {
                memoryTrend.shift();
            }
            
            // Throttle memory checks - only log if significant change (>5MB) or first check
            const memoryDelta = Math.abs(usedMB - lastUsedMB);
            const shouldLog = lastUsedMB === 0 || memoryDelta >= 5;
            
            if (shouldLog) {
                // Check for memory spikes
                if (lastUsedMB && usedMB - lastUsedMB > 50) {
                    console.warn(`📈 [Memory] Memory spike detected: ${usedMB - lastUsedMB}MB increase`);
                    
                    // Generate AI insights for significant memory spikes
                    setTimeout(() => claudeInsightSummarization(), 1000);
                }
                
                if (debugMode) {
                    console.log(`💾 [Memory] Memory usage: ${usedMB}MB / ${totalMB}MB (Δ${memoryDelta}MB)`);
                }
                
                // Warn if memory usage is high
                if (usedMB > 100) {
                    console.warn(`⚠️ [Memory] High memory usage detected: ${usedMB}MB`);
                }
                
                lastUsedMB = usedMB;
                lastMemoryCheck = now;
            }
        }
    };
    
    // Check memory every 5 minutes
    setInterval(checkMemory, 300000);
    
    // Initial check
    setTimeout(checkMemory, 5000);
}

// ===== ENHANCED DEBUG MODE WITH LIVE TOGGLE =====

function createDebugToggle() {
    if (document.getElementById('debug-toggle-btn')) return; // Already exists
    
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'debug-toggle-btn';
    toggleBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        background: ${debugMode ? '#4CAF50' : '#666'};
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        font-family: monospace;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    toggleBtn.textContent = `Debug: ${debugMode ? 'ON' : 'OFF'}`;
    
    toggleBtn.addEventListener('click', () => {
        debugMode = !debugMode;
        toggleBtn.style.background = debugMode ? '#4CAF50' : '#666';
        toggleBtn.textContent = `Debug: ${debugMode ? 'ON' : 'OFF'}`;
        
        console.log(`🐛 [Debug] Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
        
        if (debugMode) {
            console.log('🛠️ [Debug] Available console helpers:');
            console.log('  - AnalyticsConfig.getPerformanceStats() - Performance metrics');
            console.log('  - AnalyticsConfig.restartModule(name) - Restart specific module');
            console.log('  - AnalyticsConfig.snapshot() - Configuration snapshot');
            console.log('  - AnalyticsConfig.hotReload() - Hot reload dashboard');
            console.table(window.AnalyticsConfig.getFeatureFlags());
        }
    });
    
    document.body.appendChild(toggleBtn);
}

// ===== SECURITY & GOVERNANCE =====

window.OsliraApp.lockDown = function() {
    if (isLockedDown) {
        console.warn('⚠️ [Security] System already in lockdown mode');
        return;
    }
    
    console.warn('🔒 [Security] Entering lockdown mode - all interactions disabled');
    isLockedDown = true;
    
    // Disable all modules
    Object.values(window.OsliraApp.modules).forEach(module => {
        if (module.container) {
            module.container.style.pointerEvents = 'none';
            module.container.style.filter = 'grayscale(100%)';
        }
    });
    
    // Show lockdown overlay
    const lockdownOverlay = document.createElement('div');
    lockdownOverlay.id = 'lockdown-overlay';
    lockdownOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(220, 38, 38, 0.9);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20000;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    lockdownOverlay.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
            <h2 style="margin-bottom: 16px;">Security Lockdown Activated</h2>
            <p>All analytics interactions have been temporarily disabled for security reasons.</p>
        </div>
    `;
    
    document.body.appendChild(lockdownOverlay);
    
    auditLogWithRetry('security_lockdown', { timestamp: Date.now() });
};

window.OsliraApp.unlock = function() {
    if (!isLockedDown) return;
    
    console.log('🔓 [Security] Exiting lockdown mode');
    isLockedDown = false;
    
    // Re-enable modules
    Object.values(window.OsliraApp.modules).forEach(module => {
        if (module.container) {
            module.container.style.pointerEvents = 'auto';
            module.container.style.filter = 'none';
        }
    });
    
    // Remove lockdown overlay
    const overlay = document.getElementById('lockdown-overlay');
    if (overlay) overlay.remove();
    
    auditLogWithRetry('security_unlock', { timestamp: Date.now() });
};

// Consent-based logging controls
window.OsliraApp.setLoggingConsent = function(enabled) {
    consentBasedLogging = enabled;
    localStorage.setItem('analytics_consent_logging', enabled.toString());
    console.log(`📝 [Consent] Audit logging ${enabled ? 'enabled' : 'disabled'} by user consent`);
};

// ===== GLOBAL LIFECYCLE MANAGEMENT =====

window.OsliraApp.destroy = function() {
    console.log('🧹 [Lifecycle] Destroying analytics dashboard...');
    
    // Cleanup all modules with strict memory purge
    for (const [name, module] of Object.entries(window.OsliraApp.modules)) {
        try {
            if (module?.cleanup) {
                module.cleanup();
            }
        } catch (error) {
            console.error(`❌ [Cleanup] Error cleaning up module ${name}:`, error);
        }
    }
    
    // Stop all FPS monitoring
    fpsMonitors.clear();
    
    // Clear all registries with null assignment for GC
    window.OsliraApp.modules = {};
    window.OsliraApp.modulesById = {};
    window.OsliraApp.failedModules = [];
    window.OsliraApp.performanceHistory = {};
    window.OsliraApp.memoryFootprints = new Map();
    window.OsliraApp.moduleStats = null;
    
    // Clear services
    window.OsliraApp.services = {};
    
    // Reset state flags
    window.OsliraApp.analyticsReady = false;
    isInitialized = false;
    isLockedDown = false;
    
    // Clear memory trend
    memoryTrend = [];
    lastUsedMB = 0;
    
    console.log('✅ [Lifecycle] Analytics dashboard destroyed with memory purge');
};

window.OsliraApp.restart = async function() {
    console.log('🔄 [Lifecycle] Restarting analytics dashboard...');
    
    // Destroy current instance
    window.OsliraApp.destroy();
    
    // Wait for cleanup and GC
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Reinitialize
    await initializeSecureAnalytics();
    
    console.log('✅ [Lifecycle] Analytics dashboard restarted');
};

// Hot reload functionality
window.OsliraApp.hotReload = async function() {
    console.log('🔥 [HotReload] Performing hot reload...');
    
    const startTime = performance.now();
    
    // Destroy and restart
    await window.OsliraApp.restart();
    
    const duration = performance.now() - startTime;
    console.log(`✅ [HotReload] Completed in ${duration.toFixed(2)}ms`);
    
    return duration;
};

// ===== RATE-LIMITED MODULE RESTART =====

// ===== RATE-LIMITED MODULE RESTART =====

window.OsliraApp.restartModuleWithCooldown = async function(name) {
    if (isLockedDown) {
        console.warn('🔒 [Security] Module restart blocked - system in lockdown');
        return false;
    }
    
    const now = Date.now();
    const lastRestart = moduleRestartCooldowns.get(name);
    
    if (lastRestart && (now - lastRestart) < MODULE_RESTART_COOLDOWN) {
        const remainingTime = Math.ceil((MODULE_RESTART_COOLDOWN - (now - lastRestart)) / 1000);
        console.warn(`⚠️ [Cooldown] Module ${name} restart blocked. Try again in ${remainingTime}s`);
        return false;
    }
    
    const module = window.OsliraApp.modules[name];
    if (module?.restart) {
        console.log(`🔄 [Module] Restarting ${name}...`);
        moduleRestartCooldowns.set(name, now);
        
        try {
            const startTime = performance.now();
            await module.restart();
            const duration = performance.now() - startTime;
            
            // Store performance data
            storePerformanceHistory(name, duration);
            
            console.log(`✅ [Module] ${name} restarted successfully in ${duration.toFixed(2)}ms`);
            
            // Audit log successful restart
            await auditLogWithRetry('module_restarted', {
                moduleName: name,
                duration,
                triggeredBy: 'manual'
            });
            
            return true;
        } catch (error) {
            console.error(`❌ [Module] Failed to restart ${name}:`, error);
            
            // AI analysis for restart failures
            await claudeRootCauseAnalysis(error, {
                operation: 'module_restart',
                moduleName: name
            });
            
            return false;
        }
    } else {
        console.warn(`⚠️ [Module] Module ${name} not found or restart not supported`);
        return false;
    }
};

// Force rerender without restart
window.OsliraApp.rerenderModule = async function(name) {
    if (isLockedDown) {
        console.warn('🔒 [Security] Module rerender blocked - system in lockdown');
        return false;
    }
    
    const module = window.OsliraApp.modules[name];
    if (module?.forceRerender) {
        console.log(`🎨 [Module] Force rerendering ${name}...`);
        
        try {
            const startTime = performance.now();
            await module.forceRerender();
            const duration = performance.now() - startTime;
            
            console.log(`✅ [Module] ${name} rerendered in ${duration.toFixed(2)}ms`);
            return true;
        } catch (error) {
            console.error(`❌ [Module] Failed to rerender ${name}:`, error);
            return false;
        }
    } else {
        console.warn(`⚠️ [Module] Module ${name} not found or rerender not supported`);
        return false;
    }
};

// ===== MAIN INITIALIZATION FUNCTION =====

async function initializeSecureAnalytics() {
    // Guard against double initialization
    if (isInitialized) {
        console.warn('⚠️ [Init] Analytics already initialized, skipping...');
        return;
    }
    
    console.log(`🚀 [Init] Starting secure analytics dashboard initialization (${window.OsliraApp.bootType} boot)...`);
    
    const startTime = performance.now();
    
    try {
        // Mark as initializing
        isInitialized = true;
        
        // 1. Validate configuration and security
        validateConfiguration();
        
        // 2. Load dynamic configuration with CDN fallback
        await loadDynamicConfigWithFallback();
        
        // 3. Initialize secure services
        await initializeServices();
        
        // 4. Initialize analytics modules with priority queue
        await initializeAnalyticsModules();
        
        // 5. Initialize standard charts with dynamic theming
        initializeStandardCharts();
        
        // 6. Start performance monitoring
        monitorPerformance();
        
        // 7. Create debug toggle if in debug mode
        if (debugMode) {
            createDebugToggle();
        }
        
        // 8. Mark as ready
        window.OsliraApp.analyticsReady = true;
        
        const endTime = performance.now();
        const totalDuration = endTime - startTime;
        
        console.log(`✅ [Init] Secure analytics dashboard initialized successfully in ${totalDuration.toFixed(2)}ms`);
        
        // Dispatch ready event with enhanced metadata
        window.dispatchEvent(new CustomEvent('analyticsModulesReady', {
            detail: { 
                duration: totalDuration,
                moduleCount: Object.keys(window.OsliraApp.modules).length,
                failedCount: window.OsliraApp.failedModules.length,
                version: window.OsliraApp.version,
                bootType: window.OsliraApp.bootType,
                disabledModules: Array.from(disabledModules),
                memoryFootprint: 'memory' in performance ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0
            }
        }));
        
        // Audit log successful initialization
        await auditLogWithRetry('dashboard_initialized', { 
            duration: totalDuration,
            moduleCount: Object.keys(window.OsliraApp.modules).length,
            failedCount: window.OsliraApp.failedModules.length,
            bootType: window.OsliraApp.bootType,
            disabledModules: Array.from(disabledModules)
        });
        
        // Schedule periodic AI insights
        if (isFeatureEnabled('enableAIInsightGeneration')) {
            setInterval(() => claudeInsightSummarization(), 300000); // Every 5 minutes
        }
        
    } catch (error) {
        isInitialized = false; // Reset flag on failure
        await handleInitializationFailure(error);
        throw error;
    }
}

// ===== CLEANUP ON PAGE UNLOAD =====

window.addEventListener('beforeunload', () => {
    if (window.OsliraApp?.destroy) {
        window.OsliraApp.destroy();
    }
});

// ===== UNIFIED DOM LIFECYCLE HANDLER WITH DOUBLE-BOOT PROTECTION =====

function bootAnalytics() {
    if (isInitialized) {
        console.warn('⚠️ [Boot] Analytics already initialized, skipping boot...');
        return;
    }
    
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => initializeSecureAnalytics(), { timeout: 500 });
    } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => initializeSecureAnalytics(), 100);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAnalytics);
} else {
    bootAnalytics();
}

// Also listen for OsliraApp initialization (but guard against double-boot)
if (window.OsliraApp?.events) {
    window.OsliraApp.events.addEventListener('appInitialized', () => {
        if (!isInitialized) {
            bootAnalytics();
        }
    });
}

// ===== ENHANCED GLOBAL EXPORTS WITH COMPREHENSIVE API =====

window.AnalyticsConfig = {
    // Feature flag management
    isFeatureEnabled,
    enableFeature: async (flagName) => {
        const oldValue = ANALYTICS_CONFIG.featureFlags[flagName];
        ANALYTICS_CONFIG.featureFlags[flagName] = true;
        console.log(`✅ [Feature] Feature enabled: ${flagName}`);
        
        // Track version diff for feature changes
        window.OsliraApp.versionDiff = {
            old: oldValue,
            new: true,
            feature: flagName,
            timestamp: Date.now()
        };
        
        await auditLogWithRetry('feature_toggle', { flag: flagName, enabled: true, oldValue });
    },
    disableFeature: async (flagName) => {
        const oldValue = ANALYTICS_CONFIG.featureFlags[flagName];
        ANALYTICS_CONFIG.featureFlags[flagName] = false;
        console.log(`❌ [Feature] Feature disabled: ${flagName}`);
        
        // Track version diff for feature changes
        window.OsliraApp.versionDiff = {
            old: oldValue,
            new: false,
            feature: flagName,
            timestamp: Date.now()
        };
        
        await auditLogWithRetry('feature_toggle', { flag: flagName, enabled: false, oldValue });
    },
    getFeatureFlags: () => ({ ...ANALYTICS_CONFIG.featureFlags }),
    
    // Configuration management
    loadDynamicConfig,
    snapshot: () => {
        // Immutable configuration snapshot for audit/debug diffing
        return JSON.parse(JSON.stringify({
            version: window.OsliraApp.version,
            bootType: window.OsliraApp.bootType,
            featureFlags: ANALYTICS_CONFIG.featureFlags,
            moduleCount: Object.keys(window.OsliraApp.modules).length,
            failedModules: window.OsliraApp.failedModules,
            performanceHistory: window.OsliraApp.performanceHistory,
            memoryFootprints: Array.from(window.OsliraApp.memoryFootprints.entries()),
            memoryTrend: memoryTrend.slice(-10),
            timestamp: Date.now(),
            debugMode: debugMode,
            isLockedDown: isLockedDown,
            auditingEnabled: auditingEnabled,
            consentBasedLogging: consentBasedLogging
        }));
    },
    
    // System information
    version: window.OsliraApp.version,
    debugMode: () => debugMode,
    bootType: () => window.OsliraApp.bootType,
    
    // Module management
    getModuleById: (id) => window.OsliraApp.modulesById[id],
    getModuleByName: (name) => window.OsliraApp.modules[name],
    restartModule: window.OsliraApp.restartModuleWithCooldown,
    rerenderModule: window.OsliraApp.rerenderModule,
    injectModule: window.OsliraApp.injectModule,
    
    // System lifecycle
    hotReload: window.OsliraApp.hotReload,
    destroy: window.OsliraApp.destroy,
    restart: window.OsliraApp.restart,
    
    // Performance utilities
    getPerformanceStats: () => {
        const moduleCount = Object.keys(window.OsliraApp.modules).length;
        const readyModules = Object.values(window.OsliraApp.modules).filter(m => m.ready).length;
        const failedModules = window.OsliraApp.failedModules.length;
        const degradedModules = Object.values(window.OsliraApp.modules).filter(m => m.degradedMode).length;
        const injectedModules = Object.values(window.OsliraApp.modules).filter(m => m.injected).length;
        
        const memoryInfo = 'memory' in performance ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1048576),
            total: Math.round(performance.memory.totalJSHeapSize / 1048576),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        } : null;
        
        return {
            version: window.OsliraApp.version,
            bootType: window.OsliraApp.bootType,
            moduleCount,
            readyModules,
            failedModules,
            degradedModules,
            injectedModules,
            failedModulesList: window.OsliraApp.failedModules,
            memoryInfo,
            memoryTrend: memoryTrend.slice(-5), // Last 5 measurements
            analyticsReady: window.OsliraApp.analyticsReady,
            debugMode: debugMode,
            isLockedDown: isLockedDown,
            disabledModules: Array.from(disabledModules)
        };
    },
    
    // Module debugging utilities
    getModuleStats: () => debugMode ? window.OsliraApp.moduleStats : null,
    getModuleHealth: async () => {
        const healthChecks = {};
        
        for (const [name, module] of Object.entries(window.OsliraApp.modules)) {
            if (module.healthCheck) {
                try {
                    healthChecks[name] = await module.healthCheck();
                } catch (error) {
                    healthChecks[name] = {
                        healthy: false,
                        error: error.message,
                        moduleName: name
                    };
                }
            } else {
                healthChecks[name] = {
                    healthy: module.ready || false,
                    moduleName: name,
                    legacy: module.legacy || false
                };
            }
        }
        
        return healthChecks;
    },
    
    // Debug utilities
    toggleDebugMode: () => {
        debugMode = !debugMode;
        console.log(`🐛 [Debug] Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
        
        const toggleBtn = document.getElementById('debug-toggle-btn');
        if (toggleBtn) {
            toggleBtn.style.background = debugMode ? '#4CAF50' : '#666';
            toggleBtn.textContent = `Debug: ${debugMode ? 'ON' : 'OFF'}`;
        }
        
        return debugMode;
    },
    
    // Export utilities
    getExportStats: () => window.OsliraApp.exportManager?.getFormatUsageStats?.() || null,
    
    // Service health utilities
    checkServiceHealth: async () => {
        const health = {};
        
        // Check Claude service
        const claudeService = window.OsliraApp.services?.secureClaudeService;
        if (claudeService?.healthStatus) {
            health.claude = await claudeService.healthStatus();
        }
        
        // Check other services
        const services = Object.keys(window.OsliraApp.services || {});
        health.services = services;
        health.serviceCount = services.length;
        health.timestamp = new Date().toISOString();
        
        // Worker health endpoint simulation
        try {
            const response = await fetch(window.OsliraApp.config?.workerUrl + '/health');
            health.worker = {
                healthy: response.ok,
                status: response.status,
                responseTime: performance.now()
            };
        } catch (error) {
            health.worker = {
                healthy: false,
                error: error.message
            };
        }
        
        return health;
    },
    
    // Security utilities
    lockDown: window.OsliraApp.lockDown,
    unlock: window.OsliraApp.unlock,
    setLoggingConsent: window.OsliraApp.setLoggingConsent,
    
    // AI utilities
    generateInsights: claudeInsightSummarization,
    analyzeError: claudeRootCauseAnalysis,
    suggestImprovements: claudeFeedbackBasedImprovements,
    
    // Theme utilities
    getCurrentTheme: getChartTheme,
    setTheme: (themeName) => {
        // Toggle theme feature flags
        if (themeName === 'dark') {
            window.AnalyticsConfig.enableFeature('enableDarkMode');
        } else if (themeName === 'highContrast') {
            window.AnalyticsConfig.enableFeature('enableHighContrastMode');
        } else {
            window.AnalyticsConfig.disableFeature('enableDarkMode');
            window.AnalyticsConfig.disableFeature('enableHighContrastMode');
        }
        
        // Reinitialize charts with new theme
        initializeStandardCharts();
        console.log(`🎨 [Theme] Switched to ${themeName} theme`);
    }
};

// ===== DEVELOPER CONSOLE HELPERS =====

if (debugMode) {
    console.log(`📦 [Analytics] Dashboard v${window.OsliraApp.version} loaded successfully (${window.OsliraApp.bootType} boot)`);
    console.log('🛠️ [Debug] Available console helpers:');
    console.log('  - AnalyticsConfig.getPerformanceStats() - Performance metrics');
    console.log('  - AnalyticsConfig.getModuleHealth() - Module health checks');
    console.log('  - AnalyticsConfig.restartModule(name) - Restart specific module (rate limited)');
    console.log('  - AnalyticsConfig.rerenderModule(name) - Force rerender module');
    console.log('  - AnalyticsConfig.injectModule(name, class, selector) - Inject dynamic module');
    console.log('  - AnalyticsConfig.snapshot() - Configuration snapshot');
    console.log('  - AnalyticsConfig.hotReload() - Hot reload dashboard');
    console.log('  - AnalyticsConfig.getModuleStats() - Module performance statistics');
    console.log('  - AnalyticsConfig.checkServiceHealth() - Service health check');
    console.log('  - AnalyticsConfig.getExportStats() - Export usage statistics');
    console.log('  - AnalyticsConfig.toggleDebugMode() - Toggle debug mode');
    console.log('  - AnalyticsConfig.generateInsights() - AI insights generation');
    console.log('  - AnalyticsConfig.lockDown() / unlock() - Security controls');
    console.log('  - AnalyticsConfig.setTheme(name) - Change chart theme');
    console.table(window.AnalyticsConfig.getFeatureFlags());
}

// ===== ANALYTICS READY EVENT =====

window.addEventListener('analyticsModulesReady', (event) => {
    const { duration, moduleCount, failedCount, bootType, memoryFootprint } = event.detail;
    
    console.log(`🎉 [Ready] Analytics modules ready! ${moduleCount} modules, ${failedCount} failed in ${duration.toFixed(2)}ms (${bootType} boot, ${memoryFootprint}MB)`);
    
    if (debugMode) {
        console.log('📊 [Debug] Available modules:', Object.keys(window.OsliraApp.modules));
        console.log('🔍 [Debug] Modules by ID:', Object.keys(window.OsliraApp.modulesById));
        console.log('🎯 [Debug] Module priorities:', Object.entries(MODULE_PRIORITIES).sort(([,a], [,b]) => b - a));
        
        if (event.detail.failedCount > 0) {
            console.log('❌ [Debug] Failed modules:', window.OsliraApp.failedModules);
        }
        
        if (event.detail.disabledModules?.length > 0) {
            console.log('🚫 [Debug] Disabled modules:', event.detail.disabledModules);
        }
    }
    
    // Show success message for first-time users
    if (window.OsliraApp.bootType === 'cold' && Object.keys(window.OsliraApp.modules).length > 5) {
        setTimeout(() => {
            console.log('✨ [Welcome] Analytics dashboard fully loaded! Use AnalyticsConfig.getPerformanceStats() to see metrics.');
        }, 1000);
    }
});

console.log(`📦 [System] Analytics Dashboard v${window.OsliraApp.version} core loaded with ${Object.keys(window.AnalyticsConfig).length} API methods (${window.OsliraApp.bootType} boot)`);

// ===== AUTO PROMPT UPGRADES =====

// Schedule periodic prompt version checks
if (isFeatureEnabled('enableAutoPromptUpgrades')) {
    setInterval(async () => {
        try {
            const claudeService = window.OsliraApp.services?.secureClaudeService;
            if (claudeService) {
                const promptAnalysis = await claudeService.analyzePromptVersions?.();
                if (promptAnalysis?.recommendsUpgrade) {
                    console.log('🤖 [Claude] Prompt upgrade recommended:', promptAnalysis);
                    await auditLogWithRetry('prompt_upgrade_recommended', promptAnalysis);
                }
            }
        } catch (error) {
            console.warn('⚠️ [Claude] Prompt version check failed:', error);
        }
    }, 3600000); // Every hour
}
