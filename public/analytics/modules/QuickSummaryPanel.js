// ==========================================
// QUICK SUMMARY PANEL - HUD-Style Analytics Overview
// Enterprise-Grade Analytics Dashboard Component
// ==========================================

import { BaseSecureModule } from '../utils/baseSecureModule.js';
import { setCachedData, getCachedData } from '../utils/moduleCache.js';
import { createIcon, addTooltip, formatNumber } from '../utils/UIHelpers.js';

export class QuickSummaryPanel extends BaseSecureModule {
    constructor(container, secureAnalyticsService, secureCreditService) {
        // Call parent constructor with services
        super(container, secureAnalyticsService, null, secureCreditService);
        
        // Module-specific configuration
        this.config = {
            ...this.config, // Inherit base config
            cacheKey: 'summary',
            cacheTTL: 180000, // 3 minutes for frequently changing data
            refreshInterval: 120000, // 2 minutes
            maxRetries: 3,
            summaryMetrics: [
                'totalLeads',
                'highRiskPercentage', 
                'averageROI',
                'weeklyChange',
                'conversionRate',
                'activeOutreach'
            ],
            thresholds: {
                highRisk: 15, // % threshold for high risk warning
                lowROI: 2.0,  // ROI threshold for performance warning
                goodGrowth: 5, // % weekly growth threshold
                excellentGrowth: 15
            },
            comparisonPeriods: ['1w', '1m', '3m'],
            analyticsLogging: true,
            autoRefresh: true,
            sparklineEnabled: true,
            compactMode: false
        };
        
        // Module-specific state
        this.moduleState = {
            summaryData: {},
            trendData: {},
            sparklines: new Map(),
            lastUpdate: null,
            isVisible: true,
            comparisonPeriod: '1w'
        };
        
        // Animation and UI state
        this.animations = {
            countupDuration: 1500,
            sparklineDelay: 300,
            staggerDelay: 100
        };
        
        // Bound event handlers
        this.boundHandlers = {
            refresh: this.handleRefresh.bind(this),
            toggleCompact: this.handleToggleCompact.bind(this),
            changePeriod: this.handleChangePeriod.bind(this),
            exportData: this.handleExportData.bind(this)
        };
        
        console.log('📊 QuickSummaryPanel initialized with HUD-style analytics');
    }
    
    // ===== REQUIRED LIFECYCLE METHODS =====
    
    async render(filters = {}) {
        const startTime = performance.now();
        this.setState('rendering');
        
        try {
            // Show loading state
            this.showLoading('Loading summary metrics...');
            
            // Fetch summary data
            const summaryData = await this.fetchSummaryData(filters);
            
            // Render summary UI
            await this.renderSummaryUI(summaryData);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start animations
            await this.startAnimations();
            
            // Update performance metrics
            const renderTime = performance.now() - startTime;
            this.updatePerformanceMetrics('renderTime', renderTime);
            this.performanceMetrics.totalRenders++;
            
            console.log(`✅ QuickSummaryPanel rendered in ${renderTime.toFixed(2)}ms`);
            
        } catch (error) {
            await this.onError(error, { operation: 'render', filters });
            throw error;
        }
    }
    
    async cleanup() {
        console.log('🧹 QuickSummaryPanel cleanup starting...');
        
        // Stop any running animations
        this.stopAnimations();
        
        // Clear sparklines
        this.moduleState.sparklines.clear();
        
        // Clear summary data
        this.moduleState.summaryData = {};
        this.moduleState.trendData = {};
        
        // Call base cleanup
        await this.baseCleanup();
        
        console.log('✅ QuickSummaryPanel cleanup completed');
    }
    
    getModuleInfo() {
        return {
            name: 'QuickSummaryPanel',
            version: '2.0.0',
            description: 'HUD-style analytics summary panel for enterprise dashboard',
            author: 'Oslira Analytics Team',
            dependencies: [
                'SecureAnalyticsService',
                'SecureCreditService',
                'UIHelpers',
                'moduleCache'
            ],
            capabilities: [
                'Real-time metrics display',
                'Trend analysis and indicators',
                'Caching and offline support',
                'Auto-refresh functionality',
                'Responsive design',
                'Performance optimization',
                'Compact mode toggle',
                'Sparkline visualizations',
                'Data export'
            ],
            endpoints: [
                '/analytics/summary'
            ],
            configuration: Object.keys(this.config),
            state: {
                isLoading: this.state === 'loading',
                metricsCount: Object.keys(this.moduleState.summaryData?.metrics || {}).length,
                lastUpdate: this.moduleState.lastUpdate,
                hasError: this.state === 'error',
                compactMode: this.config.compactMode,
                comparisonPeriod: this.moduleState.comparisonPeriod
            },
            performance: this.getPerformanceMetrics()
        };
    }
    
    // ===== OPTIONAL LIFECYCLE METHODS =====
    
    async ready() {
        await super.ready();
        
        // Setup visibility change handler
        this.setupVisibilityHandler();
        
        // Setup resize observer
        this.setupResizeObserver();
        
        console.log('📊 QuickSummaryPanel ready for real-time updates');
    }
    
    async onResize() {
        const containerWidth = this.container.offsetWidth;
        
        // Auto-switch to compact mode on small screens
        if (containerWidth < 500 && !this.config.compactMode) {
            this.enableCompactMode();
        } else if (containerWidth >= 500 && this.config.compactMode) {
            this.disableCompactMode();
        }
        
        // Redraw sparklines for new dimensions
        this.redrawSparklines();
    }
    
    // ===== DATA FETCHING METHODS =====
    
    async fetchSummaryData(filters = {}) {
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey('/analytics/summary', filters);
            const cachedData = getCachedData(cacheKey);
            
            if (cachedData && this.config.cacheEnabled) {
                this.performanceMetrics.cacheHits++;
                console.log('📊 QuickSummaryPanel using cached data');
                return cachedData;
            }
            
            this.performanceMetrics.cacheMisses++;
            
            // Prepare summary request payload
            const payload = {
                moduleType: 'summary',
                metrics: this.config.summaryMetrics,
                comparisonPeriod: this.moduleState.comparisonPeriod,
                thresholds: this.config.thresholds,
                includeTrends: true,
                includeSparklines: this.config.sparklineEnabled,
                filters: filters
            };
            
            // Fetch data using secure method from base class
            const summaryData = await this.fetchSecureData('/analytics/summary', payload);
            
            // Validate and process summary data
            const processedData = this.processSummaryData(summaryData);
            
            // Update module state
            this.moduleState.summaryData = processedData.summary || {};
            this.moduleState.trendData = processedData.trends || {};
            this.moduleState.lastUpdate = Date.now();
            
            return processedData;
            
        } catch (error) {
            console.error('❌ QuickSummaryPanel data fetch failed:', error);
            
            // Return fallback data if available
            if (this.config.fallbackMode) {
                return this.getFallbackSummary();
            }
            
            throw error;
        }
    }
    
    processSummaryData(rawData) {
        if (!rawData) {
            throw new Error('No summary data received');
        }
        
        const summary = {
            metrics: {},
            insights: [],
            alerts: []
        };
        
        // Process metrics
        this.config.summaryMetrics.forEach(metricName => {
            const metricData = rawData.metrics?.[metricName];
            if (metricData) {
                summary.metrics[metricName] = {
                    value: metricData.value || 0,
                    change: metricData.change || 0,
                    trend: metricData.trend || 'stable',
                    status: this.calculateMetricStatus(metricName, metricData),
                    sparkline: metricData.sparkline || [],
                    lastUpdated: metricData.lastUpdated || new Date().toISOString()
                };
            }
        });
        
        // Process insights
        if (rawData.insights) {
            summary.insights = rawData.insights.filter(insight => insight.type === 'summary');
        }
        
        // Process alerts
        if (rawData.alerts) {
            summary.alerts = rawData.alerts.filter(alert => alert.priority === 'high');
        }
        
        return {
            summary: summary,
            trends: rawData.trends || {},
            metadata: {
                generatedAt: new Date().toISOString(),
                comparisonPeriod: this.moduleState.comparisonPeriod,
                metricsCount: Object.keys(summary.metrics).length
            }
        };
    }
    
    calculateMetricStatus(metricName, metricData) {
        const value = metricData.value || 0;
        const change = metricData.change || 0;
        
        switch (metricName) {
            case 'highRiskPercentage':
                if (value > this.config.thresholds.highRisk) return 'danger';
                if (value > this.config.thresholds.highRisk * 0.7) return 'warning';
                return 'success';
                
            case 'averageROI':
                if (value < this.config.thresholds.lowROI) return 'danger';
                if (value < this.config.thresholds.lowROI * 1.5) return 'warning';
                return 'success';
                
            case 'weeklyChange':
                if (change < -this.config.thresholds.goodGrowth) return 'danger';
                if (change < 0) return 'warning';
                if (change > this.config.thresholds.excellentGrowth) return 'excellent';
                return 'success';
                
            default:
                if (change > 0) return 'success';
                if (change < 0) return 'warning';
                return 'neutral';
        }
    }
    
    getFallbackSummary() {
        return {
            summary: {
                metrics: {
                    totalLeads: {
                        value: '--',
                        change: 0,
                        trend: 'stable',
                        status: 'neutral',
                        sparkline: [],
                        lastUpdated: new Date().toISOString()
                    }
                },
                insights: [{
                    type: 'summary',
                    message: 'Summary data temporarily unavailable',
                    priority: 'low'
                }],
                alerts: []
            },
            trends: {},
            metadata: {
                generatedAt: new Date().toISOString(),
                comparisonPeriod: this.moduleState.comparisonPeriod,
                metricsCount: 1,
                fallbackMode: true
            }
        };
    }
    
    // ===== UI RENDERING METHODS =====
    
    async renderSummaryUI(data) {
        const summary = data.summary || {};
        const metadata = data.metadata || {};
        
        const summaryHtml = `
            <div class="summary-panel-wrapper ${this.config.compactMode ? 'compact-mode' : ''}">
                <!-- Header Section -->
                <div class="summary-header">
                    <div class="summary-title">
                        <h3>
                            ${createIcon('activity', { size: '20px' })}
                            Quick Summary
                        </h3>
                        <div class="summary-meta">
                            <span class="period-selector">
                                <select class="period-select" data-action="changePeriod">
                                    <option value="1w" ${this.moduleState.comparisonPeriod === '1w' ? 'selected' : ''}>1 Week</option>
                                    <option value="1m" ${this.moduleState.comparisonPeriod === '1m' ? 'selected' : ''}>1 Month</option>
                                    <option value="3m" ${this.moduleState.comparisonPeriod === '3m' ? 'selected' : ''}>3 Months</option>
                                </select>
                            </span>
                        </div>
                    </div>
                    
                    <div class="summary-controls">
                        <button class="summary-btn compact-toggle" data-action="toggleCompact" title="Toggle compact mode">
                            ${createIcon(this.config.compactMode ? 'maximize' : 'minimize', { size: '16px' })}
                        </button>
                        <button class="summary-btn summary-refresh" data-action="refresh" title="Refresh data">
                            ${createIcon('refresh', { size: '16px' })}
                        </button>
                        <button class="summary-btn summary-export" data-action="export" title="Export data">
                            ${createIcon('download', { size: '16px' })}
                        </button>
                    </div>
                </div>
                
                <!-- Metrics Grid -->
                <div class="summary-grid">
                    ${Object.entries(summary.metrics || {}).map(([key, metric], index) => 
                        this.renderMetricCard(key, metric, index)
                    ).join('')}
                </div>
                
                <!-- Insights Section -->
                ${summary.insights && summary.insights.length > 0 ? `
                    <div class="summary-insights">
                        <h4>Key Insights</h4>
                        <div class="insights-list">
                            ${summary.insights.map(insight => this.renderInsight(insight)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Alerts Section -->
                ${summary.alerts && summary.alerts.length > 0 ? `
                    <div class="summary-alerts">
                        <h4>Alerts</h4>
                        <div class="alerts-list">
                            ${summary.alerts.map(alert => this.renderAlert(alert)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Footer -->
                <div class="summary-footer">
                    <div class="summary-metadata">
                        <span class="last-update">
                            ${metadata.fallbackMode ? '⚠️ Fallback Mode' : `Updated ${this.formatLastUpdate(this.moduleState.lastUpdate)}`}
                        </span>
                        <span class="metrics-count">
                            ${metadata.metricsCount || 0} metrics
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = summaryHtml;
        
        // Inject styles
        this.injectStyles();
        
        // Store sparkline data for animations
        Object.entries(summary.metrics || {}).forEach(([key, metric]) => {
            if (metric.sparkline && metric.sparkline.length > 0) {
                this.moduleState.sparklines.set(key, metric.sparkline);
            }
        });
    }
    
    renderMetricCard(key, metric, index) {
        const statusClass = `status-${metric.status}`;
        const trendIcon = this.getTrendIcon(metric.trend);
        const formattedValue = this.formatMetricValue(key, metric.value);
        const changeFormatted = this.formatChange(metric.change);
        
        return `
            <div class="metric-card ${statusClass}" data-metric="${key}" style="animation-delay: ${index * this.animations.staggerDelay}ms">
                <div class="metric-header">
                    <div class="metric-label">
                        ${this.getMetricLabel(key)}
                        ${trendIcon}
                    </div>
                    <div class="metric-status">
                        <span class="status-indicator"></span>
                    </div>
                </div>
                
                <div class="metric-content">
                    <div class="metric-value" data-value="${metric.value}">
                        ${formattedValue}
                    </div>
                    
                    <div class="metric-change ${metric.change >= 0 ? 'positive' : 'negative'}">
                        ${changeFormatted}
                        <span class="change-period">vs ${this.moduleState.comparisonPeriod}</span>
                    </div>
                    
                    ${this.config.sparklineEnabled && metric.sparkline && metric.sparkline.length > 0 ? `
                        <div class="metric-sparkline" data-sparkline="${key}">
                            <canvas width="80" height="20"></canvas>
                        </div>
                    ` : ''}
                </div>
                
                <div class="metric-footer">
                    <span class="last-updated">
                        ${this.formatTimestamp(metric.lastUpdated)}
                    </span>
                </div>
            </div>
        `;
    }
    
    renderInsight(insight) {
        return `
            <div class="summary-insight priority-${insight.priority}">
                <span class="insight-icon">💡</span>
                <span class="insight-text">${insight.message}</span>
            </div>
        `;
    }
    
    renderAlert(alert) {
        return `
            <div class="summary-alert priority-${alert.priority}">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text">${alert.message}</span>
            </div>
        `;
    }
    
    // ===== EVENT HANDLING =====
    
    setupEventListeners() {
        this.removeAllEventListeners();
        
        // Refresh button
        const refreshBtn = this.container.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', this.boundHandlers.refresh);
        }
        
        // Compact toggle
        const compactBtn = this.container.querySelector('[data-action="toggleCompact"]');
        if (compactBtn) {
            this.addEventListener(compactBtn, 'click', this.boundHandlers.toggleCompact);
        }
        
        // Period selector
        const periodSelect = this.container.querySelector('[data-action="changePeriod"]');
        if (periodSelect) {
            this.addEventListener(periodSelect, 'change', this.boundHandlers.changePeriod);
        }
        
        // Export button
        const exportBtn = this.container.querySelector('[data-action="export"]');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', this.boundHandlers.exportData);
        }
        
        // Setup tooltips
        this.setupTooltips();
    }
    
    setupTooltips() {
        const metricCards = this.container.querySelectorAll('.metric-card');
        metricCards.forEach(card => {
            const metricKey = card.dataset.metric;
            const tooltip = this.getMetricTooltip(metricKey);
            if (tooltip) {
                addTooltip(card, tooltip, { placement: 'top' });
            }
        });
    }
    
    // ===== EVENT HANDLERS =====
    
    async handleRefresh(event) {
        event.preventDefault();
        
        try {
            console.log('🔄 QuickSummaryPanel refresh requested');
            await this.refresh();
        } catch (error) {
            console.error('❌ QuickSummaryPanel refresh failed:', error);
            await this.onError(error, { operation: 'manual_refresh' });
        }
    }
    
    handleToggleCompact(event) {
        event.preventDefault();
        
        this.config.compactMode = !this.config.compactMode;
        
        if (this.config.compactMode) {
            this.enableCompactMode();
        } else {
            this.disableCompactMode();
        }
    }
    
    async handleChangePeriod(event) {
        event.preventDefault();
        
        const newPeriod = event.target.value;
        if (newPeriod !== this.moduleState.comparisonPeriod) {
            this.moduleState.comparisonPeriod = newPeriod;
            
            try {
                await this.refresh();
                console.log(`📊 QuickSummaryPanel period changed to ${newPeriod}`);
            } catch (error) {
                console.error('❌ Period change failed:', error);
                await this.onError(error, { operation: 'period_change', period: newPeriod });
            }
        }
    }
    
    handleExportData(event) {
    event.preventDefault();
    
    try {
        const exportData = {
            summary: this.moduleState.summaryData,
            trends: this.moduleState.trendData,
            metadata: {
                exportTime: new Date().toISOString(),
                comparisonPeriod: this.moduleState.comparisonPeriod,
                moduleInfo: this.getModuleInfo()
            }
        };
        
        this.downloadJSON(exportData, 'oslira-summary');
        console.log('📄 QuickSummaryPanel data exported');
        
    } catch (error) {
        console.error('❌ QuickSummaryPanel export failed:', error);
        await this.onError(error, { operation: 'export_operation' });
    }
}
    
    // ===== ANIMATIONS & VISUAL EFFECTS =====
    
    async startAnimations() {
        // Animate metric cards
        const metricCards = this.container.querySelectorAll('.metric-card');
        metricCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-in');
                this.animateCountUp(card);
            }, index * this.animations.staggerDelay);
        });
        
        // Draw sparklines
        if (this.config.sparklineEnabled) {
            setTimeout(() => {
                this.drawAllSparklines();
            }, this.animations.sparklineDelay);
        }
    }
    
    stopAnimations() {
        // Clear any animation timers
        const metricCards = this.container.querySelectorAll('.metric-card');
        metricCards.forEach(card => {
            card.classList.remove('animate-in');
        });
    }
    
    animateCountUp(card) {
        const valueElement = card.querySelector('.metric-value');
        const targetValue = parseFloat(valueElement.dataset.value) || 0;
        
        if (isNaN(targetValue) || targetValue === 0) return;
        
        const duration = this.animations.countupDuration;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = targetValue * easeOut;
            
            valueElement.textContent = this.formatAnimatedValue(currentValue, targetValue);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    drawAllSparklines() {
        this.moduleState.sparklines.forEach((data, key) => {
            this.drawSparkline(key, data);
        });
    }
    
    drawSparkline(metricKey, data) {
        const sparklineElement = this.container.querySelector(`[data-sparkline="${metricKey}"] canvas`);
        if (!sparklineElement || !data || data.length < 2) return;
        
        const ctx = sparklineElement.getContext('2d');
        const width = sparklineElement.width;
        const height = sparklineElement.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Find min/max for scaling
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        
        // Draw line
        ctx.strokeStyle = this.getSparklineColor(metricKey);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - ((value - min) / range) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Add gradient fill
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = this.getSparklineColor(metricKey);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    redrawSparklines() {
        if (this.config.sparklineEnabled) {
            setTimeout(() => {
                this.drawAllSparklines();
            }, 100);
        }
    }
    
    // ===== UTILITY METHODS =====
    
    getMetricLabel(key) {
        const labels = {
            totalLeads: 'Total Leads',
            highRiskPercentage: 'High Risk %',
            averageROI: 'Average ROI',
            weeklyChange: 'Weekly Change',
            conversionRate: 'Conversion Rate',
            activeOutreach: 'Active Outreach'
        };
        
        return labels[key] || key;
    }
    
    getMetricTooltip(key) {
        const tooltips = {
            totalLeads: 'Total number of leads in your database',
            highRiskPercentage: 'Percentage of leads flagged as high risk',
            averageROI: 'Average return on investment across all campaigns',
            weeklyChange: 'Change in performance compared to previous week',
            conversionRate: 'Percentage of leads that convert to customers',
            activeOutreach: 'Number of active outreach campaigns'
        };
        
        return tooltips[key];
    }
    
    getTrendIcon(trend) {
        const icons = {
            'up': createIcon('trending-up', { size: '14px', className: 'trend-up' }),
            'down': createIcon('trending-down', { size: '14px', className: 'trend-down' }),
            'stable': createIcon('minus', { size: '14px', className: 'trend-stable' })
        };
        
        return icons[trend] || icons['stable'];
    }
    
    formatMetricValue(key, value) {
        if (value === '--' || value === null || value === undefined) {
            return '--';
        }
        
        switch (key) {
            case 'highRiskPercentage':
            case 'conversionRate':
                return `${formatNumber(value, { decimals: 1 })}%`;
            case 'averageROI':
                return formatNumber(value, { decimals: 2, prefix: '$' });
            case 'weeklyChange':
                return `${formatNumber(value, { decimals: 1, suffix: '%' })}`;
            default:
                return formatNumber(value);
        }
    }
    
    formatChange(change) {
        if (change === 0) return '0%';
        
        const prefix = change > 0 ? '+' : '';
        return `${prefix}${formatNumber(change, { decimals: 1 })}%`;
    }
    
    formatAnimatedValue(current, target) {
        // Determine format based on target value structure
        if (typeof target === 'string' && target.includes('%')) {
            return `${Math.round(current)}%`;
        }
        
        if (typeof target === 'string' && target.includes('$')) {
            return `$${Math.round(current)}`;
        }
        
        return Math.round(current).toLocaleString();
    }
    
    formatLastUpdate(timestamp) {
        if (!timestamp) return 'Never';
        
        const now = new Date();
        const updated = new Date(timestamp);
        const diffMs = now - updated;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        return `${Math.floor(diffMins / 60)}h ago`;
    }
    
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }
    
    getSparklineColor(metricKey) {
        const colors = {
            totalLeads: '#3b82f6',      // Blue
            highRiskPercentage: '#dc2626',  // Red
            averageROI: '#10b981',      // Green
            weeklyChange: '#f59e0b',    // Orange
            conversionRate: '#8b5cf6',  // Purple
            activeOutreach: '#06b6d4'   // Cyan
        };
        
        return colors[metricKey] || '#6b7280';
    }
    
    enableCompactMode() {
        this.config.compactMode = true;
        this.container.querySelector('.summary-panel-wrapper')?.classList.add('compact-mode');
        
        // Update toggle button icon
        const toggleBtn = this.container.querySelector('.compact-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = createIcon('maximize', { size: '16px' });
            toggleBtn.title = 'Exit compact mode';
        }
        
        console.log('📊 QuickSummaryPanel compact mode enabled');
    }
    
    disableCompactMode() {
        this.config.compactMode = false;
        this.container.querySelector('.summary-panel-wrapper')?.classList.remove('compact-mode');
        
        // Update toggle button icon
        const toggleBtn = this.container.querySelector('.compact-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = createIcon('minimize', { size: '16px' });
            toggleBtn.title = 'Enable compact mode';
        }
        
        console.log('📊 QuickSummaryPanel compact mode disabled');
    }
    
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            this.moduleState.isVisible = !document.hidden;
            
            if (this.moduleState.isVisible && this.config.autoRefresh) {
                // Resume refresh when page becomes visible
                console.log('📊 QuickSummaryPanel resuming updates');
            }
        });
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
    
    // ===== STYLES INJECTION =====
    
    injectStyles() {
        if (document.getElementById('quick-summary-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'quick-summary-panel-styles';
        style.textContent = `
            .summary-panel-wrapper {
                background: var(--bg-primary, #ffffff);
                border-radius: 12px;
                padding: 1.5rem;
                border: 1px solid var(--border-light, #e5e7eb);
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
            }
            
            .summary-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--border-light, #e5e7eb);
            }
            
            .summary-title h3 {
                margin: 0 0 0.5rem 0;
                color: var(--text-primary, #1f2937);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.25rem;
                font-weight: 700;
            }
            
            .summary-meta {
                margin-top: 0.5rem;
            }
            
            .period-select {
                padding: 0.25rem 0.5rem;
                border: 1px solid var(--border-light, #e5e7eb);
                border-radius: 4px;
                background: var(--bg-secondary, #f9fafb);
                color: var(--text-primary, #1f2937);
                font-size: 0.875rem;
                cursor: pointer;
            }
            
            .period-select:focus {
                outline: none;
                border-color: var(--primary-blue, #3b82f6);
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
            }
            
            .summary-controls {
                display: flex;
                gap: 0.5rem;
            }
            
            .summary-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                background: var(--bg-secondary, #f9fafb);
                border: 1px solid var(--border-light, #e5e7eb);
                border-radius: 6px;
                color: var(--text-primary, #1f2937);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .summary-btn:hover {
                background: var(--primary-blue, #3b82f6);
                color: white;
                border-color: var(--primary-blue, #3b82f6);
                transform: translateY(-1px);
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                flex: 1;
                margin-bottom: 1rem;
            }
            
            .metric-card {
                background: var(--bg-secondary, #f9fafb);
                border-radius: 8px;
                padding: 1rem;
                border: 1px solid var(--border-light, #e5e7eb);
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(20px);
                position: relative;
                overflow: hidden;
            }
            
            .metric-card.animate-in {
                opacity: 1;
                transform: translateY(0);
            }
            
            .metric-card:hover {
                border-color: var(--primary-blue, #3b82f6);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
                transform: translateY(-2px);
            }
            
            .metric-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: var(--status-color, #6b7280);
                opacity: 0.7;
            }
            
            .metric-card.status-success::before {
                background: var(--success, #10b981);
            }
            
            .metric-card.status-warning::before {
                background: var(--warning, #f59e0b);
            }
            
            .metric-card.status-danger::before {
                background: var(--error, #dc2626);
            }
            
            .metric-card.status-excellent::before {
                background: var(--primary-blue, #3b82f6);
            }
            
            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 0.75rem;
            }
            
            .metric-label {
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            
            .metric-label .trend-up {
                color: var(--success, #10b981);
            }
            
            .metric-label .trend-down {
                color: var(--error, #dc2626);
            }
            
            .metric-label .trend-stable {
                color: var(--text-secondary, #6b7280);
            }
            
            .metric-status {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--status-color, #6b7280);
            }
            
            .status-success .status-indicator {
                background: var(--success, #10b981);
            }
            
            .status-warning .status-indicator {
                background: var(--warning, #f59e0b);
            }
            
            .status-danger .status-indicator {
                background: var(--error, #dc2626);
            }
            
            .status-excellent .status-indicator {
                background: var(--primary-blue, #3b82f6);
            }
            
            .metric-content {
                margin-bottom: 0.75rem;
            }
            
            .metric-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--text-primary, #1f2937);
                margin-bottom: 0.25rem;
                line-height: 1.2;
            }
            
            .metric-change {
                font-size: 0.875rem;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 0.25rem;
                margin-bottom: 0.5rem;
            }
            
            .metric-change.positive {
                color: var(--success, #10b981);
            }
            
            .metric-change.negative {
                color: var(--error, #dc2626);
            }
            
            .change-period {
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 400;
            }
            
            .metric-sparkline {
                margin-top: 0.5rem;
                display: flex;
                justify-content: center;
            }
            
            .metric-sparkline canvas {
                opacity: 0.8;
            }
            
            .metric-footer {
                margin-top: auto;
                padding-top: 0.5rem;
                border-top: 1px solid var(--border-light, #e5e7eb);
            }
            
            .last-updated {
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
            }
            
            .summary-insights {
                margin-bottom: 1rem;
                padding: 1rem;
                background: rgba(59, 130, 246, 0.05);
                border-radius: 8px;
                border: 1px solid rgba(59, 130, 246, 0.1);
            }
            
            .summary-insights h4 {
                margin: 0 0 0.75rem 0;
                font-size: 1rem;
                color: var(--text-primary, #1f2937);
                font-weight: 600;
            }
            
            .insights-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .summary-insight {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
                line-height: 1.4;
            }
            
            .insight-icon {
                flex-shrink: 0;
            }
            
            .summary-alerts {
                margin-bottom: 1rem;
                padding: 1rem;
                background: rgba(220, 38, 38, 0.05);
                border-radius: 8px;
                border: 1px solid rgba(220, 38, 38, 0.1);
            }
            
            .summary-alerts h4 {
                margin: 0 0 0.75rem 0;
                font-size: 1rem;
                color: var(--error, #dc2626);
                font-weight: 600;
            }
            
            .alerts-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .summary-alert {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: var(--error, #dc2626);
                line-height: 1.4;
            }
            
            .alert-icon {
                flex-shrink: 0;
            }
            
            .summary-footer {
                margin-top: auto;
                padding-top: 1rem;
                border-top: 1px solid var(--border-light, #e5e7eb);
            }
            
            .summary-metadata {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
            }
            
            /* Compact Mode Styles */
            .summary-panel-wrapper.compact-mode {
                padding: 1rem;
            }
            
            .summary-panel-wrapper.compact-mode .summary-header {
                margin-bottom: 1rem;
                padding-bottom: 0.75rem;
            }
            
            .summary-panel-wrapper.compact-mode .summary-title h3 {
                font-size: 1.125rem;
            }
            
            .summary-panel-wrapper.compact-mode .summary-grid {
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 0.75rem;
            }
            
            .summary-panel-wrapper.compact-mode .metric-card {
                padding: 0.75rem;
            }
            
            .summary-panel-wrapper.compact-mode .metric-value {
                font-size: 1.25rem;
            }
            
            .summary-panel-wrapper.compact-mode .metric-change,
            .summary-panel-wrapper.compact-mode .metric-label {
                font-size: 0.75rem;
            }
            
            .summary-panel-wrapper.compact-mode .summary-insights,
            .summary-panel-wrapper.compact-mode .summary-alerts {
                padding: 0.75rem;
            }
            
            .summary-panel-wrapper.compact-mode .summary-metadata {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25rem;
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .summary-panel-wrapper {
                    padding: 1rem;
                }
                
                .summary-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 1rem;
                }
                
                .summary-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .summary-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                }
                
                .metric-card {
                    padding: 0.75rem;
                }
                
                .metric-value {
                    font-size: 1.25rem;
                }
                
                .summary-metadata {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.25rem;
                }
            }
            
            @media (max-width: 480px) {
                .summary-panel-wrapper {
                    padding: 0.75rem;
                }
                
                .summary-grid {
                    grid-template-columns: 1fr;
                    gap: 0.5rem;
                }
                
                .metric-card {
                    padding: 0.75rem;
                }
                
                .metric-value {
                    font-size: 1.125rem;
                }
                
                .summary-controls {
                    justify-content: stretch;
                }
                
                .summary-btn {
                    flex: 1;
                    width: auto;
                }
            }
            
            /* Animation Keyframes */
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .metric-card.animate-in {
                animation: fadeInUp 0.5s ease forwards;
            }
            
            /* Loading States */
            .metric-card.loading {
                opacity: 0.6;
                pointer-events: none;
            }
            
            .metric-card.loading::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
                animation: shimmer 1.5s infinite;
            }
            
            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Global registration for dynamic loading
if (window.OsliraApp && window.OsliraApp.modules) {
    window.OsliraApp.modules.set('QuickSummaryPanel', QuickSummaryPanel);
}

console.log('📊 QuickSummaryPanel module loaded successfully with BaseSecureModule integration');
