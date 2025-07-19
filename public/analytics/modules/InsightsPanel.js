// ==========================================
// INSIGHTS PANEL - AI-Powered Strategic Insights Module
// Enterprise-Grade Analytics Dashboard Component
// ==========================================

import { BaseSecureModule } from './baseSecureModule.js';
import { setCachedData, getCachedData } from '../utils/moduleCache.js';
import { createIcon, addTooltip, formatNumber } from '../utils/UIHelpers.js';

export class InsightsPanel extends BaseSecureModule {
    constructor(container, secureAnalyticsService, secureClaudeService, secureCreditService) {
        // Call parent constructor with services
        super(container, secureAnalyticsService, secureClaudeService, secureCreditService);
        
        // Module-specific configuration
        this.config = {
            ...this.config, // Inherit base config
            cacheKey: 'insights',
            cacheTTL: 300000, // 5 minutes
            maxInsights: 5,
            minConfidenceThreshold: 0.6,
            refreshInterval: 600000, // 10 minutes
            priorityInsights: ['risk_patterns', 'performance_opportunities', 'lead_optimization'],
            fallbackMode: true,
            analyticsLogging: true,
            autoRefresh: true
        };
        
        // Module-specific state
        this.moduleState = {
            insights: [],
            metadata: {},
            lastUpdate: null,
            loadingProgress: 0,
            expandedInsights: new Set()
        };
        
        // Event handlers for module-specific events
        this.boundHandlers = {
            refresh: this.handleRefresh.bind(this),
            expand: this.handleExpand.bind(this),
            exportInsights: this.handleExportInsights.bind(this),
            toggleInsight: this.handleToggleInsight.bind(this)
        };
        
        console.log('🧠 InsightsPanel initialized with AI capabilities');
    }
    
    // ===== REQUIRED LIFECYCLE METHODS =====
    
    async render(filters = {}) {
        const startTime = performance.now();
        this.setState('rendering');
        
        try {
            // Show loading state
            this.showLoading('Generating AI insights...');
            
            // Fetch insights data
            const insightsData = await this.fetchInsightsData(filters);
            
            // Render insights UI
            await this.renderInsightsUI(insightsData);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Update performance metrics
            const renderTime = performance.now() - startTime;
            this.updatePerformanceMetrics('renderTime', renderTime);
            this.performanceMetrics.totalRenders++;
            
            console.log(`✅ InsightsPanel rendered in ${renderTime.toFixed(2)}ms`);
            
        } catch (error) {
            await this.onError(error, { operation: 'render', filters });
            throw error;
        }
    }
    
    async cleanup() {
        console.log('🧹 InsightsPanel cleanup starting...');
        
        // Clear module-specific timers
        if (this.insightUpdateTimer) {
            clearInterval(this.insightUpdateTimer);
            this.insightUpdateTimer = null;
        }
        
        // Clear expanded insights
        this.moduleState.expandedInsights.clear();
        
        // Call base cleanup
        await this.baseCleanup();
        
        console.log('✅ InsightsPanel cleanup completed');
    }
    
    getModuleInfo() {
        return {
            name: 'InsightsPanel',
            version: '2.0.0',
            description: 'AI-powered strategic insights module for enterprise analytics',
            author: 'Oslira Analytics Team',
            dependencies: [
                'SecureClaudeService',
                'SecureAnalyticsService', 
                'SecureCreditService',
                'UIHelpers',
                'moduleCache'
            ],
            capabilities: [
                'AI insights generation',
                'Performance analytics',
                'Caching and offline support',
                'Auto-refresh functionality',
                'Export capabilities',
                'Mobile responsive design',
                'Error recovery'
            ],
            endpoints: [
                '/ai/generate-insights'
            ],
            configuration: Object.keys(this.config),
            state: {
                isLoading: this.state === 'loading',
                insightsCount: this.moduleState.insights.length,
                lastUpdate: this.moduleState.lastUpdate,
                hasError: this.state === 'error',
                expandedCount: this.moduleState.expandedInsights.size
            },
            performance: this.getPerformanceMetrics()
        };
    }
    
    // ===== OPTIONAL LIFECYCLE METHODS =====
    
    async ready() {
        await super.ready();
        
        // Start periodic insight updates if configured
        if (this.config.autoRefresh) {
            this.startPeriodicUpdates();
        }
        
        // Setup resize observer for responsive behavior
        this.setupResizeObserver();
        
        console.log('🧠 InsightsPanel ready for AI operations');
    }
    
    async onResize() {
        // Handle responsive behavior
        const containerWidth = this.container.offsetWidth;
        
        if (containerWidth < 600) {
            this.container.classList.add('insights-panel-compact');
        } else {
            this.container.classList.remove('insights-panel-compact');
        }
        
        // Recalculate insight card layouts
        this.recalculateInsightLayouts();
    }
    
    // ===== DATA FETCHING METHODS =====
    
    async fetchInsightsData(filters = {}) {
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey('/ai/generate-insights', filters);
            const cachedData = getCachedData(cacheKey);
            
            if (cachedData && this.config.cacheEnabled) {
                this.performanceMetrics.cacheHits++;
                console.log('🎯 InsightsPanel using cached data');
                return cachedData;
            }
            
            this.performanceMetrics.cacheMisses++;
            
            // Prepare insights request payload
            const payload = {
                moduleType: 'insights',
                filters: filters,
                maxInsights: this.config.maxInsights,
                minConfidence: this.config.minConfidenceThreshold,
                priorityTypes: this.config.priorityInsights,
                includeRecommendations: true,
                includeMetrics: true
            };
            
            // Fetch data using secure method from base class
            const insightsData = await this.fetchSecureData('/ai/generate-insights', payload);
            
            // Validate and process insights
            const processedData = this.processInsightsData(insightsData);
            
            // Update module state
            this.moduleState.insights = processedData.insights || [];
            this.moduleState.metadata = processedData.metadata || {};
            this.moduleState.lastUpdate = Date.now();
            
            return processedData;
            
        } catch (error) {
            console.error('❌ InsightsPanel data fetch failed:', error);
            
            // Return fallback data if available
            if (this.config.fallbackMode) {
                return this.getFallbackInsights();
            }
            
            throw error;
        }
    }
    
    processInsightsData(rawData) {
        if (!rawData || !rawData.insights) {
            throw new Error('Invalid insights data received');
        }
        
        const processedInsights = rawData.insights
            .filter(insight => insight.confidence >= this.config.minConfidenceThreshold)
            .slice(0, this.config.maxInsights)
            .map(insight => ({
                id: insight.id || this.generateInsightId(),
                type: insight.type || 'general',
                title: insight.title || 'Insight',
                description: insight.description || '',
                confidence: Math.round((insight.confidence || 0) * 100),
                priority: insight.priority || 'medium',
                category: insight.category || 'performance',
                metrics: insight.metrics || {},
                recommendations: insight.recommendations || [],
                timestamp: insight.timestamp || new Date().toISOString(),
                expanded: false
            }));
        
        return {
            insights: processedInsights,
            metadata: {
                totalGenerated: rawData.totalGenerated || processedInsights.length,
                averageConfidence: this.calculateAverageConfidence(processedInsights),
                categoryBreakdown: this.categorizeInsights(processedInsights),
                lastUpdate: new Date().toISOString()
            }
        };
    }
    
    getFallbackInsights() {
        return {
            insights: [
                {
                    id: 'fallback_1',
                    type: 'performance',
                    title: 'System Running in Fallback Mode',
                    description: 'AI insights are temporarily unavailable. The system is using cached recommendations.',
                    confidence: 85,
                    priority: 'medium',
                    category: 'system',
                    metrics: {},
                    recommendations: ['Check network connectivity', 'Retry insight generation'],
                    timestamp: new Date().toISOString(),
                    expanded: false
                }
            ],
            metadata: {
                totalGenerated: 1,
                averageConfidence: 85,
                categoryBreakdown: { system: 1 },
                lastUpdate: new Date().toISOString(),
                fallbackMode: true
            }
        };
    }
    
    // ===== UI RENDERING METHODS =====
    
    async renderInsightsUI(data) {
        const insights = data.insights || [];
        const metadata = data.metadata || {};
        
        const insightsHtml = `
            <div class="insights-panel-wrapper">
                <!-- Header Section -->
                <div class="insights-header">
                    <div class="insights-title">
                        <h3>
                            ${createIcon('brain', { size: '20px' })}
                            AI Strategic Insights
                        </h3>
                        <div class="insights-meta">
                            <span class="insight-count">${insights.length} insights</span>
                            <span class="confidence-avg">
                                Avg: ${metadata.averageConfidence || 0}% confidence
                            </span>
                        </div>
                    </div>
                    
                    <div class="insights-controls">
                        <button class="insights-btn insights-refresh" data-action="refresh">
                            ${createIcon('refresh', { size: '16px' })}
                            Refresh
                        </button>
                        <button class="insights-btn insights-export" data-action="export">
                            ${createIcon('download', { size: '16px' })}
                            Export
                        </button>
                    </div>
                </div>
                
                <!-- Insights Grid -->
                <div class="insights-grid">
                    ${insights.map(insight => this.renderInsightCard(insight)).join('')}
                </div>
                
                <!-- Footer -->
                <div class="insights-footer">
                    <div class="insights-status">
                        <span class="status-indicator ${metadata.fallbackMode ? 'status-warning' : 'status-success'}">
                            ${metadata.fallbackMode ? '⚠️ Fallback Mode' : '✅ AI Active'}
                        </span>
                        <span class="last-update">
                            Updated ${this.formatLastUpdate(metadata.lastUpdate)}
                        </span>
                    </div>
                    
                    ${metadata.categoryBreakdown ? this.renderCategoryBreakdown(metadata.categoryBreakdown) : ''}
                </div>
            </div>
        `;
        
        this.container.innerHTML = insightsHtml;
        
        // Add module-specific styles
        this.injectStyles();
    }
    
    renderInsightCard(insight) {
        const priorityClass = `priority-${insight.priority}`;
        const confidenceClass = this.getConfidenceClass(insight.confidence);
        
        return `
            <div class="insight-card ${priorityClass} ${confidenceClass}" data-insight-id="${insight.id}">
                <div class="insight-header">
                    <div class="insight-type">
                        ${this.getInsightIcon(insight.type)}
                        <span>${insight.category}</span>
                    </div>
                    <div class="insight-confidence">
                        <span class="confidence-score">${insight.confidence}%</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${insight.confidence}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="insight-content">
                    <h4 class="insight-title">${insight.title}</h4>
                    <p class="insight-description">${insight.description}</p>
                    
                    ${insight.metrics && Object.keys(insight.metrics).length > 0 ? `
                        <div class="insight-metrics">
                            ${Object.entries(insight.metrics).map(([key, value]) => `
                                <div class="metric-item">
                                    <span class="metric-label">${key}:</span>
                                    <span class="metric-value">${formatNumber(value)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${insight.recommendations && insight.recommendations.length > 0 ? `
                        <div class="insight-recommendations ${this.moduleState.expandedInsights.has(insight.id) ? 'expanded' : 'collapsed'}">
                            <h5>Recommendations:</h5>
                            <ul>
                                ${insight.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <div class="insight-actions">
                    ${insight.recommendations && insight.recommendations.length > 0 ? `
                        <button class="insight-toggle" data-action="toggle" data-insight-id="${insight.id}">
                            ${this.moduleState.expandedInsights.has(insight.id) ? 'Show Less' : 'Show More'}
                        </button>
                    ` : ''}
                    <span class="insight-timestamp">${this.formatTimestamp(insight.timestamp)}</span>
                </div>
            </div>
        `;
    }
    
    renderCategoryBreakdown(breakdown) {
        const categories = Object.entries(breakdown);
        if (categories.length === 0) return '';
        
        return `
            <div class="category-breakdown">
                <h5>Categories:</h5>
                <div class="category-tags">
                    ${categories.map(([category, count]) => `
                        <span class="category-tag">
                            ${category} (${count})
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // ===== EVENT HANDLING =====
    
    setupEventListeners() {
        // Remove existing listeners first
        this.removeEventListeners();
        
        // Refresh button
        const refreshBtn = this.container.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', this.boundHandlers.refresh);
        }
        
        // Export button
        const exportBtn = this.container.querySelector('[data-action="export"]');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', this.boundHandlers.exportInsights);
        }
        
        // Toggle buttons
        const toggleBtns = this.container.querySelectorAll('[data-action="toggle"]');
        toggleBtns.forEach(btn => {
            this.addEventListener(btn, 'click', this.boundHandlers.toggleInsight);
        });
        
        // Add tooltips
        this.setupTooltips();
    }
    
    setupTooltips() {
        // Confidence scores
        const confidenceScores = this.container.querySelectorAll('.confidence-score');
        confidenceScores.forEach(score => {
            addTooltip(score, 'AI confidence level for this insight', { placement: 'top' });
        });
        
        // Category icons
        const categoryIcons = this.container.querySelectorAll('.insight-type');
        categoryIcons.forEach(icon => {
            const category = icon.querySelector('span').textContent;
            addTooltip(icon, `Category: ${category}`, { placement: 'top' });
        });
    }
    
    removeEventListeners() {
        // This is handled by the base class removeAllEventListeners method
        this.removeAllEventListeners();
    }
    
    // ===== EVENT HANDLERS =====
    
    async handleRefresh(event) {
        event.preventDefault();
        
        try {
            console.log('🔄 InsightsPanel refresh requested');
            await this.refresh();
        } catch (error) {
            console.error('❌ InsightsPanel refresh failed:', error);
            await this.onError(error, { operation: 'manual_refresh' });
        }
    }
    
    async handleExportInsights(event) {
        event.preventDefault();
        
        try {
            const exportData = {
                insights: this.moduleState.insights,
                metadata: this.moduleState.metadata,
                exportTime: new Date().toISOString(),
                moduleInfo: this.getModuleInfo()
            };
            
            this.downloadJSON(exportData, 'oslira-insights');
            
            console.log('📄 InsightsPanel data exported');
            
        } catch (error) {
            console.error('❌ InsightsPanel export failed:', error);
            await this.onError(error, { operation: 'export' });
        }
    }
    
    handleToggleInsight(event) {
        event.preventDefault();
        
        const insightId = event.target.dataset.insightId;
        if (!insightId) return;
        
        const isExpanded = this.moduleState.expandedInsights.has(insightId);
        
        if (isExpanded) {
            this.moduleState.expandedInsights.delete(insightId);
        } else {
            this.moduleState.expandedInsights.add(insightId);
        }
        
        // Update UI
        const recommendationsEl = this.container.querySelector(`[data-insight-id="${insightId}"] .insight-recommendations`);
        const toggleBtn = event.target;
        
        if (recommendationsEl) {
            if (isExpanded) {
                recommendationsEl.classList.remove('expanded');
                recommendationsEl.classList.add('collapsed');
                toggleBtn.textContent = 'Show More';
            } else {
                recommendationsEl.classList.remove('collapsed');
                recommendationsEl.classList.add('expanded');
                toggleBtn.textContent = 'Show Less';
            }
        }
    }
    
    // ===== UTILITY METHODS =====
    
    generateInsightId() {
        return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    calculateAverageConfidence(insights) {
        if (insights.length === 0) return 0;
        const total = insights.reduce((sum, insight) => sum + insight.confidence, 0);
        return Math.round(total / insights.length);
    }
    
    categorizeInsights(insights) {
        const breakdown = {};
        insights.forEach(insight => {
            const category = insight.category || 'general';
            breakdown[category] = (breakdown[category] || 0) + 1;
        });
        return breakdown;
    }
    
    getConfidenceClass(confidence) {
        if (confidence >= 80) return 'confidence-high';
        if (confidence >= 60) return 'confidence-medium';
        return 'confidence-low';
    }
    
    getInsightIcon(type) {
        const iconMap = {
            'risk_patterns': 'shield-alert',
            'performance_opportunities': 'trending-up',
            'lead_optimization': 'target',
            'general': 'lightbulb',
            'system': 'cpu'
        };
        
        return createIcon(iconMap[type] || 'lightbulb', { size: '16px' });
    }
    
    formatLastUpdate(timestamp) {
        if (!timestamp) return 'Never';
        
        const now = new Date();
        const updated = new Date(timestamp);
        const diffMs = now - updated;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    }
    
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }
    
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    recalculateInsightLayouts() {
        // Recalculate grid layouts for responsive behavior
        const grid = this.container.querySelector('.insights-grid');
        if (!grid) return;
        
        const containerWidth = this.container.offsetWidth;
        let columns = 1;
        
        if (containerWidth >= 1200) columns = 3;
        else if (containerWidth >= 800) columns = 2;
        
        grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }
    
    setupResizeObserver() {
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(() => {
                this.onResize();
            });
            
            resizeObserver.observe(this.container);
            this.observers.add(resizeObserver);
        }
    }
    
    startPeriodicUpdates() {
        if (this.insightUpdateTimer) {
            clearInterval(this.insightUpdateTimer);
        }
        
        this.insightUpdateTimer = setInterval(() => {
            if (this.state === 'ready' && document.visibilityState === 'visible') {
                this.refresh().catch(error => {
                    console.error('❌ InsightsPanel periodic update failed:', error);
                });
            }
        }, this.config.refreshInterval);
        
        this.timers.add(this.insightUpdateTimer);
    }
    
    // ===== STYLES INJECTION =====
    
    injectStyles() {
        if (document.getElementById('insights-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'insights-panel-styles';
        style.textContent = `
            .insights-panel-wrapper {
                background: var(--bg-primary, #ffffff);
                border-radius: 12px;
                padding: 1.5rem;
                border: 1px solid var(--border-light, #e5e7eb);
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            .insights-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--border-light, #e5e7eb);
            }
            
            .insights-title h3 {
                margin: 0 0 0.5rem 0;
                color: var(--text-primary, #1f2937);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.25rem;
                font-weight: 700;
            }
            
            .insights-meta {
                display: flex;
                gap: 1rem;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
            }
            
            .insights-controls {
                display: flex;
                gap: 0.5rem;
            }
            
            .insights-btn {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.5rem 1rem;
                background: var(--bg-secondary, #f9fafb);
                border: 1px solid var(--border-light, #e5e7eb);
                border-radius: 6px;
                color: var(--text-primary, #1f2937);
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .insights-btn:hover {
                background: var(--primary-blue, #3b82f6);
                color: white;
                border-color: var(--primary-blue, #3b82f6);
            }
            
            .insights-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1rem;
                flex: 1;
                overflow-y: auto;
                margin-bottom: 1rem;
            }
            
            .insight-card {
                background: var(--bg-secondary, #f9fafb);
                border-radius: 8px;
                padding: 1rem;
                border: 1px solid var(--border-light, #e5e7eb);
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
            }
            
            .insight-card:hover {
                border-color: var(--primary-blue, #3b82f6);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
            }
            
            .insight-card.priority-high {
                border-left: 4px solid var(--error, #dc2626);
            }
            
            .insight-card.priority-medium {
                border-left: 4px solid var(--warning, #f59e0b);
            }
            
            .insight-card.priority-low {
                border-left: 4px solid var(--success, #10b981);
            }
            
            .insight-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .insight-type {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
            }
            
            .insight-confidence {
                text-align: right;
            }
            
            .confidence-score {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }
            
            .confidence-bar {
                width: 60px;
                height: 4px;
                background: var(--border-light, #e5e7eb);
                border-radius: 2px;
                margin-top: 2px;
                overflow: hidden;
            }
            
            .confidence-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--error, #dc2626), var(--warning, #f59e0b), var(--success, #10b981));
                border-radius: 2px;
                transition: width 0.3s ease;
            }
            
            .insight-content {
                flex: 1;
                margin-bottom: 1rem;
            }
            
            .insight-title {
                margin: 0 0 0.5rem 0;
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-primary, #1f2937);
                line-height: 1.4;
            }
            
            .insight-description {
                margin: 0 0 1rem 0;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
                line-height: 1.5;
            }
            
            .insight-metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 0.5rem;
                margin-bottom: 1rem;
            }
            
            .metric-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.875rem;
            }
            
            .metric-label {
                color: var(--text-secondary, #6b7280);
            }
            
            .metric-value {
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }
            
            .insight-recommendations {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border-light, #e5e7eb);
                transition: all 0.3s ease;
            }
            
            .insight-recommendations.collapsed {
                max-height: 0;
                overflow: hidden;
                padding-top: 0;
                margin-top: 0;
                border-top: none;
            }
            
            .insight-recommendations.expanded {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .insight-recommendations h5 {
                margin: 0 0 0.5rem 0;
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }
            
            .insight-recommendations ul {
                margin: 0;
                padding-left: 1rem;
                list-style-type: disc;
            }
            
            .insight-recommendations li {
                margin-bottom: 0.25rem;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
                line-height: 1.4;
            }
            
            .insight-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: auto;
            }
            
            .insight-toggle {
                background: none;
                border: none;
                color: var(--primary-blue, #3b82f6);
                font-size: 0.875rem;
                cursor: pointer;
                padding: 0;
                text-decoration: underline;
            }
            
            .insight-toggle:hover {
                color: var(--primary-blue-dark, #2563eb);
            }
            
            .insight-timestamp {
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
            }
            
            .insights-footer {
                margin-top: auto;
                padding-top: 1rem;
                border-top: 1px solid var(--border-light, #e5e7eb);
            }
            
            .insights-status {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                font-size: 0.875rem;
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                font-weight: 500;
            }
            
            .status-success {
                color: var(--success, #10b981);
            }
            
            .status-warning {
                color: var(--warning, #f59e0b);
            }
            
            .last-update {
                color: var(--text-secondary, #6b7280);
            }
            
            .category-breakdown h5 {
                margin: 0 0 0.5rem 0;
                font-size: 0.875rem;
                color: var(--text-primary, #1f2937);
                font-weight: 500;
            }
            
            .category-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }
            
            .category-tag {
                background: var(--bg-primary, #ffffff);
                border: 1px solid var(--border-light, #e5e7eb);
                border-radius: 12px;
                padding: 0.25rem 0.75rem;
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
            }
            
            /* Responsive Design */
            .insights-panel-compact .insights-header {
                flex-direction: column;
                align-items: stretch;
                gap: 1rem;
            }
            
            .insights-panel-compact .insights-meta {
                justify-content: space-between;
            }
            
            .insights-panel-compact .insights-grid {
                grid-template-columns: 1fr;
            }
            
            .insights-panel-compact .insights-status {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }
            
            @media (max-width: 640px) {
                .insights-panel-wrapper {
                    padding: 1rem;
                }
                
                .insights-controls {
                    width: 100%;
                    justify-content: stretch;
                }
                
                .insights-btn {
                    flex: 1;
                    justify-content: center;
                }
                
                .insight-metrics {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Export for ES6 modules
export { InsightsPanel };

// Global registration for dynamic loading
if (window.OsliraApp && window.OsliraApp.modules) {
    window.OsliraApp.modules.set('InsightsPanel', InsightsPanel);
}

console.log('🧠 InsightsPanel module loaded successfully with BaseSecureModule integration');
