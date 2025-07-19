// ==========================================
// QUICK SUMMARY PANEL - HUD-Style Analytics Overview
// Enterprise-Grade Analytics Dashboard Component
// ==========================================

import { setCachedData, getCachedData } from '../utils/moduleCache.js';
import { createIcon, addTooltip, formatNumber } from '../utils/UIHelpers.js';

export class QuickSummaryPanel {
    constructor(container, secureAnalyticsService, secureCreditService) {
        // Initialize with secure services
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        this.creditService = secureCreditService;
        
        // Module configuration
        this.config = {
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
            analyticsLogging: true
        };
        
        // State management
        this.state = {
            isLoading: false,
            lastUpdate: null,
            summaryData: {},
            trendData: {},
            error: null,
            refreshTimer: null,
            loadingProgress: 0,
            isVisible: true
        };
        
        // Performance tracking
        this.performanceMetrics = {
            renderTime: 0,
            dataFetchTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalRequests: 0,
            errorCount: 0,
            averageLoadTime: 0
        };
        
        // Animation and UI state
        this.animations = {
            countupDuration: 1500,
            slideInDelay: 100,
            pulseIntensity: 0.9,
            enableTransitions: true
        };
        
        // Event handlers
        this.boundHandlers = {
            refresh: this.handleRefresh.bind(this),
            viewDetails: this.handleViewDetails.bind(this),
            exportSummary: this.handleExportSummary.bind(this),
            toggleCompactMode: this.handleToggleCompactMode.bind(this)
        };
        
        // Intersection observer for performance optimization
        this.setupVisibilityObserver();
        
        // Initialize auto-refresh
        this.initializeAutoRefresh();
        
        console.log('📊 QuickSummaryPanel initialized with secure services');
    }

    async render(options = {}) {
        const renderStartTime = performance.now();
        
        try {
            this.state.isLoading = true;
            this.state.error = null;
            
            // Create container structure
            this.createContainerStructure();
            
            // Show loading state
            this.showLoadingState();
            
            // Try to load cached data first for instant display
            const cachedSummary = this.loadCachedSummary();
            if (cachedSummary && !options.forceRefresh) {
                console.log('📋 Loading cached summary for instant display');
                this.renderSummaryData(cachedSummary, true);
            }
            
            // Fetch fresh data in background
            if (!cachedSummary || options.forceRefresh || this.shouldRefreshData()) {
                await this.fetchAndRenderFreshSummary(options);
            }
            
            this.performanceMetrics.renderTime = performance.now() - renderStartTime;
            this.logPerformanceMetrics();
            
        } catch (error) {
            console.error('❌ QuickSummaryPanel render failed:', error);
            this.handleRenderError(error);
        } finally {
            this.state.isLoading = false;
        }
    }

    createContainerStructure() {
        this.container.innerHTML = `
            <div class="summary-panel-wrapper" data-module="summary">
                <div class="summary-header">
                    <div class="summary-title-section">
                        <h3 class="summary-title">
                            ${createIcon('activity')}
                            <span>Analytics Summary</span>
                            <span class="summary-status" id="summary-status">Live</span>
                        </h3>
                        <div class="summary-metadata" id="summary-metadata">
                            <span class="last-updated">Loading...</span>
                        </div>
                    </div>
                    <div class="summary-controls">
                        <button class="btn-compact" id="toggle-compact" title="Toggle Compact Mode">
                            ${createIcon('minimize')}
                        </button>
                        <button class="btn-refresh" id="refresh-summary" title="Refresh Data">
                            ${createIcon('refresh')}
                        </button>
                        <button class="btn-details" id="view-details" title="View Detailed Analytics">
                            ${createIcon('bar-chart')}
                        </button>
                        <button class="btn-export" id="export-summary" title="Export Summary">
                            ${createIcon('download')}
                        </button>
                    </div>
                </div>
                <div class="summary-content" id="summary-content">
                    <!-- Summary metrics will be rendered here -->
                </div>
                <div class="summary-footer" id="summary-footer">
                    <div class="summary-progress" id="summary-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%;"></div>
                        </div>
                        <span class="progress-text">Loading...</span>
                    </div>
                </div>
            </div>
        `;
        
        // Attach event handlers
        this.attachEventHandlers();
        
        // Apply enterprise styling
        this.applyEnterpriseStyles();
    }

    attachEventHandlers() {
        const refreshBtn = this.container.querySelector('#refresh-summary');
        const detailsBtn = this.container.querySelector('#view-details');
        const exportBtn = this.container.querySelector('#export-summary');
        const compactBtn = this.container.querySelector('#toggle-compact');
        
        if (refreshBtn) refreshBtn.addEventListener('click', this.boundHandlers.refresh);
        if (detailsBtn) detailsBtn.addEventListener('click', this.boundHandlers.viewDetails);
        if (exportBtn) exportBtn.addEventListener('click', this.boundHandlers.exportSummary);
        if (compactBtn) compactBtn.addEventListener('click', this.boundHandlers.toggleCompactMode);
        
        // Add tooltips for better UX
        if (refreshBtn) addTooltip(refreshBtn, 'Refresh analytics summary');
        if (detailsBtn) addTooltip(detailsBtn, 'Open detailed analytics dashboard');
        if (exportBtn) addTooltip(exportBtn, 'Export summary data to CSV or JSON');
        if (compactBtn) addTooltip(compactBtn, 'Switch between compact and expanded view');
    }

    async fetchAndRenderFreshSummary(options = {}) {
        const fetchStartTime = performance.now();
        
        try {
            this.updateLoadingProgress(20, 'Gathering analytics data...');
            
            // Prepare analytics request with comprehensive filters
            const analyticsData = await this.prepareSummaryRequest(options);
            
            this.updateLoadingProgress(60, 'Processing metrics...');
            
            // Fetch summary data via secure analytics service
            const summaryResponse = await this.fetchSummaryData(analyticsData);
            
            this.updateLoadingProgress(80, 'Calculating trends...');
            
            // Process and enhance summary data
            const processedSummary = this.processSummaryData(summaryResponse);
            
            this.updateLoadingProgress(90, 'Caching results...');
            
            // Cache the results
            this.cacheSummary(processedSummary);
            
            this.updateLoadingProgress(100, 'Complete!');
            
            // Render fresh summary
            this.renderSummaryData(processedSummary, false);
            
            this.performanceMetrics.dataFetchTime = performance.now() - fetchStartTime;
            this.performanceMetrics.totalRequests++;
            
        } catch (error) {
            console.error('❌ Failed to fetch fresh summary:', error);
            this.performanceMetrics.errorCount++;
            
            // Try to fall back to cached data
            const cachedSummary = this.loadCachedSummary();
            if (cachedSummary) {
                console.log('📋 Falling back to cached summary due to error');
                this.renderSummaryData(cachedSummary, true);
                this.showErrorBanner('Using cached data - ' + error.message);
            } else {
                this.showErrorState(error);
            }
        } finally {
            this.hideLoadingProgress();
        }
    }

    async prepareSummaryRequest(options = {}) {
        try {
            // Prepare comprehensive analytics request
            const timeframe = options.timeframe || '7d';
            const includeComparisons = options.includeComparisons !== false;
            const includeBreakdowns = options.includeBreakdowns !== false;
            
            const requestData = {
                timeframe: timeframe,
                metrics: this.config.summaryMetrics,
                requestId: this.generateRequestId(),
                options: {
                    includeComparisons: includeComparisons,
                    includeBreakdowns: includeBreakdowns,
                    comparisonPeriods: this.config.comparisonPeriods,
                    includeTrends: true,
                    includeProjections: true,
                    granularity: 'daily'
                },
                filters: {
                    excludeTestData: true,
                    minimumConfidence: 0.8,
                    ...options.filters
                }
            };
            
            return requestData;
            
        } catch (error) {
            console.error('❌ Failed to prepare summary request:', error);
            throw new Error(`Summary request preparation failed: ${error.message}`);
        }
    }

    async fetchSummaryData(requestData) {
        try {
            // Call secure analytics service via Worker endpoint
            const response = await this.analyticsService.makeAnalyticsRequest('/analytics/summary', requestData);
            
            if (!response.success) {
                throw new Error(response.message || 'Summary data fetch failed');
            }
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Analytics summary fetch failed:', error);
            throw new Error(`Analytics summary fetch failed: ${error.message}`);
        }
    }

    processSummaryData(rawSummary) {
        try {
            // Validate and process analytics response
            if (!rawSummary || !rawSummary.metrics) {
                throw new Error('Invalid summary response structure');
            }
            
            const processedSummary = {
                metrics: {
                    totalLeads: {
                        value: rawSummary.metrics.totalLeads || 0,
                        change: rawSummary.metrics.totalLeadsChange || 0,
                        trend: this.calculateTrendDirection(rawSummary.metrics.totalLeadsChange),
                        status: this.getMetricStatus('totalLeads', rawSummary.metrics.totalLeads, rawSummary.metrics.totalLeadsChange)
                    },
                    highRiskPercentage: {
                        value: rawSummary.metrics.highRiskPercentage || 0,
                        change: rawSummary.metrics.highRiskPercentageChange || 0,
                        trend: this.calculateTrendDirection(rawSummary.metrics.highRiskPercentageChange, true), // inverted for risk
                        status: this.getMetricStatus('highRisk', rawSummary.metrics.highRiskPercentage)
                    },
                    averageROI: {
                        value: rawSummary.metrics.averageROI || 0,
                        change: rawSummary.metrics.averageROIChange || 0,
                        trend: this.calculateTrendDirection(rawSummary.metrics.averageROIChange),
                        status: this.getMetricStatus('averageROI', rawSummary.metrics.averageROI, rawSummary.metrics.averageROIChange)
                    },
                    weeklyChange: {
                        value: rawSummary.metrics.weeklyChange || 0,
                        previousValue: rawSummary.metrics.previousWeeklyChange || 0,
                        trend: this.calculateTrendDirection(rawSummary.metrics.weeklyChange),
                        status: this.getMetricStatus('weeklyChange', rawSummary.metrics.weeklyChange)
                    },
                    conversionRate: {
                        value: rawSummary.metrics.conversionRate || 0,
                        change: rawSummary.metrics.conversionRateChange || 0,
                        trend: this.calculateTrendDirection(rawSummary.metrics.conversionRateChange),
                        status: this.getMetricStatus('conversionRate', rawSummary.metrics.conversionRate, rawSummary.metrics.conversionRateChange)
                    },
                    activeOutreach: {
                        value: rawSummary.metrics.activeOutreach || 0,
                        change: rawSummary.metrics.activeOutreachChange || 0,
                        trend: this.calculateTrendDirection(rawSummary.metrics.activeOutreachChange),
                        status: this.getMetricStatus('activeOutreach', rawSummary.metrics.activeOutreach, rawSummary.metrics.activeOutreachChange)
                    }
                },
                
                metadata: {
                    generatedAt: new Date().toISOString(),
                    timeframe: rawSummary.metadata?.timeframe || '7d',
                    dataQuality: rawSummary.metadata?.dataQuality || 'good',
                    confidence: rawSummary.metadata?.confidence || 0.85,
                    requestId: rawSummary.metadata?.requestId || this.generateRequestId(),
                    version: rawSummary.metadata?.version || '1.0'
                },
                
                trends: {
                    overall: this.calculateOverallTrend(rawSummary.metrics),
                    performance: this.calculatePerformanceTrend(rawSummary.metrics),
                    risk: this.calculateRiskTrend(rawSummary.metrics),
                    growth: this.calculateGrowthTrend(rawSummary.metrics)
                },
                
                summary: {
                    totalMetrics: Object.keys(rawSummary.metrics).length,
                    positiveMetrics: this.countPositiveMetrics(rawSummary.metrics),
                    alertMetrics: this.countAlertMetrics(rawSummary.metrics),
                    overallHealth: this.calculateOverallHealth(rawSummary.metrics)
                }
            };
            
            return processedSummary;
            
        } catch (error) {
            console.error('❌ Summary processing failed:', error);
            throw new Error(`Summary processing failed: ${error.message}`);
        }
    }

    renderSummaryData(summaryData, isFromCache = false) {
        try {
            const contentContainer = this.container.querySelector('#summary-content');
            const statusElement = this.container.querySelector('#summary-status');
            
            if (!contentContainer) {
                console.error('❌ Summary content container not found');
                return;
            }
            
            // Update metadata
            this.updateMetadata(summaryData.metadata, isFromCache);
            
            // Update status indicator
            if (statusElement) {
                statusElement.textContent = isFromCache ? 'Cached' : 'Live';
                statusElement.className = `summary-status ${isFromCache ? 'cached' : 'live'}`;
            }
            
            // Render metrics grid
            const metricsHTML = this.renderMetricsGrid(summaryData.metrics);
            
            contentContainer.innerHTML = `
                <div class="summary-grid">
                    ${metricsHTML}
                </div>
                <div class="summary-insights">
                    ${this.renderSummaryInsights(summaryData)}
                </div>
                ${isFromCache ? '<div class="cache-indicator">📋 Showing cached data</div>' : ''}
            `;
            
            // Animate metric cards if transitions are enabled
            if (this.animations.enableTransitions) {
                this.animateMetricCards();
            }
            
            // Update state
            this.state.summaryData = summaryData;
            this.state.lastUpdate = new Date().toISOString();
            
            console.log(`✅ Rendered summary with ${Object.keys(summaryData.metrics).length} metrics (${isFromCache ? 'cached' : 'fresh'})`);
            
        } catch (error) {
            console.error('❌ Summary rendering failed:', error);
            this.showErrorState(error);
        }
    }

    renderMetricsGrid(metrics) {
        return Object.entries(metrics).map(([key, metric]) => {
            const config = this.getMetricConfig(key);
            const changeIndicator = this.getChangeIndicator(metric.change, metric.trend);
            const statusClass = `metric-${metric.status}`;
            
            return `
                <div class="metric-card ${statusClass}" data-metric="${key}">
                    <div class="metric-header">
                        <div class="metric-icon">
                            ${config.icon}
                        </div>
                        <div class="metric-trend">
                            ${changeIndicator}
                        </div>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value" data-value="${metric.value}">
                            ${this.formatMetricValue(key, metric.value)}
                        </div>
                        <div class="metric-label">${config.label}</div>
                        <div class="metric-change">
                            ${this.formatMetricChange(key, metric.change)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getMetricConfig(metricKey) {
        const configs = {
            totalLeads: {
                label: 'Total Leads',
                icon: createIcon('users'),
                format: 'number'
            },
            highRiskPercentage: {
                label: '% High Risk',
                icon: createIcon('alert-triangle'),
                format: 'percentage'
            },
            averageROI: {
                label: 'Avg ROI',
                icon: createIcon('trending-up'),
                format: 'decimal'
            },
            weeklyChange: {
                label: 'Weekly Change',
                icon: createIcon('calendar'),
                format: 'percentage'
            },
            conversionRate: {
                label: 'Conversion Rate',
                icon: createIcon('target'),
                format: 'percentage'
            },
            activeOutreach: {
                label: 'Active Outreach',
                icon: createIcon('send'),
                format: 'number'
            }
        };
        
        return configs[metricKey] || {
            label: metricKey,
            icon: createIcon('bar-chart'),
            format: 'number'
        };
    }

    formatMetricValue(metricKey, value) {
        const config = this.getMetricConfig(metricKey);
        
        switch (config.format) {
            case 'percentage':
                return `${value.toFixed(1)}%`;
            case 'decimal':
                return `${value.toFixed(2)}x`;
            case 'currency':
                return `$${formatNumber(value)}`;
            case 'number':
            default:
                return formatNumber(value);
        }
    }

    formatMetricChange(metricKey, change) {
        if (Math.abs(change) < 0.01) return 'No change';
        
        const config = this.getMetricConfig(metricKey);
        const prefix = change > 0 ? '+' : '';
        
        switch (config.format) {
            case 'percentage':
                return `${prefix}${change.toFixed(1)}pp`;
            case 'decimal':
                return `${prefix}${change.toFixed(2)}`;
            default:
                return `${prefix}${formatNumber(change)}`;
        }
    }

    getChangeIndicator(change, trend) {
        if (Math.abs(change) < 0.01) {
            return `<span class="trend-neutral">${createIcon('minus')}</span>`;
        }
        
        switch (trend) {
            case 'up':
                return `<span class="trend-up">${createIcon('trending-up')}</span>`;
            case 'down':
                return `<span class="trend-down">${createIcon('trending-down')}</span>`;
            default:
                return `<span class="trend-neutral">${createIcon('minus')}</span>`;
        }
    }

    renderSummaryInsights(summaryData) {
        const insights = [];
        
        // Overall health insight
        const health = summaryData.summary.overallHealth;
        if (health >= 0.8) {
            insights.push({
                type: 'success',
                icon: createIcon('check-circle'),
                text: 'Strong performance across all metrics'
            });
        } else if (health >= 0.6) {
            insights.push({
                type: 'warning', 
                icon: createIcon('alert-circle'),
                text: 'Some metrics need attention'
            });
        } else {
            insights.push({
                type: 'error',
                icon: createIcon('x-circle'),
                text: 'Multiple performance issues detected'
            });
        }
        
        // Growth insight
        const weeklyChange = summaryData.metrics.weeklyChange.value;
        if (weeklyChange >= this.config.thresholds.excellentGrowth) {
            insights.push({
                type: 'success',
                icon: createIcon('arrow-up'),
                text: 'Excellent growth momentum'
            });
        } else if (weeklyChange >= this.config.thresholds.goodGrowth) {
            insights.push({
                type: 'info',
                icon: createIcon('arrow-up'),
                text: 'Steady growth trajectory'
            });
        } else if (weeklyChange < 0) {
            insights.push({
                type: 'warning',
                icon: createIcon('arrow-down'),
                text: 'Declining weekly performance'
            });
        }
        
        // Risk insight
        const riskPercentage = summaryData.metrics.highRiskPercentage.value;
        if (riskPercentage >= this.config.thresholds.highRisk) {
            insights.push({
                type: 'warning',
                icon: createIcon('shield-alert'),
                text: 'High risk percentage requires attention'
            });
        }
        
        return insights.map(insight => `
            <div class="summary-insight insight-${insight.type}">
                <span class="insight-icon">${insight.icon}</span>
                <span class="insight-text">${insight.text}</span>
            </div>
        `).join('');
    }

    // Utility Methods for Metric Processing
    calculateTrendDirection(change, inverted = false) {
        if (Math.abs(change) < 0.01) return 'neutral';
        
        const direction = change > 0 ? 'up' : 'down';
        return inverted ? (direction === 'up' ? 'down' : 'up') : direction;
    }

    getMetricStatus(metricKey, value, change = 0) {
        // Determine metric status based on value and thresholds
        switch (metricKey) {
            case 'highRisk':
                return value >= this.config.thresholds.highRisk ? 'warning' : 'good';
            case 'averageROI':
                return value >= this.config.thresholds.lowROI ? 'good' : 'warning';
            case 'weeklyChange':
                if (value >= this.config.thresholds.excellentGrowth) return 'excellent';
                if (value >= this.config.thresholds.goodGrowth) return 'good';
                if (value < 0) return 'warning';
                return 'neutral';
            default:
                if (change > 0) return 'good';
                if (change < 0) return 'warning';
                return 'neutral';
        }
    }

    calculateOverallTrend(metrics) {
        const trends = Object.values(metrics).map(m => m.change || 0);
        const avgChange = trends.reduce((sum, change) => sum + change, 0) / trends.length;
        return this.calculateTrendDirection(avgChange);
    }

    calculateOverallHealth(metrics) {
        const healthScores = Object.entries(metrics).map(([key, metric]) => {
            const status = this.getMetricStatus(key, metric.value, metric.change);
            switch (status) {
                case 'excellent': return 1.0;
                case 'good': return 0.8;
                case 'neutral': return 0.6;
                case 'warning': return 0.4;
                case 'error': return 0.2;
                default: return 0.6;
            }
        });
        
        return healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;
    }

    countPositiveMetrics(metrics) {
        return Object.values(metrics).filter(m => (m.change || 0) > 0).length;
    }

    countAlertMetrics(metrics) {
        return Object.entries(metrics).filter(([key, metric]) => {
            const status = this.getMetricStatus(key, metric.value, metric.change);
            return status === 'warning' || status === 'error';
        }).length;
    }

    // UI State Management
    showLoadingState() {
        const contentContainer = this.container.querySelector('#summary-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-skeleton">
                        ${Array(6).fill(0).map(() => `
                            <div class="skeleton-metric-card">
                                <div class="skeleton-header"></div>
                                <div class="skeleton-value"></div>
                                <div class="skeleton-label"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    updateLoadingProgress(percent, message) {
        const progressContainer = this.container.querySelector('#summary-progress');
        const progressFill = this.container.querySelector('.progress-fill');
        const progressText = this.container.querySelector('.progress-text');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressText) {
            progressText.textContent = message;
        }
        
        this.state.loadingProgress = percent;
    }

    hideLoadingProgress() {
        const progressContainer = this.container.querySelector('#summary-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    showErrorState(error) {
        const contentContainer = this.container.querySelector('#summary-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">${createIcon('alert-circle')}</div>
                    <h4>Unable to Load Summary</h4>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button class="btn-retry" onclick="this.closest('.summary-panel-wrapper').querySelector('#refresh-summary').click()">
                        Retry
                    </button>
                </div>
            `;
        }
        
        this.state.error = error;
    }

    showErrorBanner(message) {
        const header = this.container.querySelector('.summary-header');
        if (header) {
            const banner = document.createElement('div');
            banner.className = 'error-banner';
            banner.innerHTML = `
                <span>${createIcon('alert-triangle')} ${message}</span>
                <button onclick="this.parentElement.remove()">${createIcon('x')}</button>
            `;
            header.appendChild(banner);
            
            // Auto-remove after 8 seconds
            setTimeout(() => banner.remove(), 8000);
        }
    }

    updateMetadata(metadata, isFromCache) {
        const metadataContainer = this.container.querySelector('#summary-metadata');
        if (!metadataContainer) return;
        
        const timeAgo = this.getTimeAgo(new Date(metadata.generatedAt));
        const cacheIndicator = isFromCache ? ' (cached)' : '';
        
        metadataContainer.innerHTML = `
            <span class="last-updated">Updated ${timeAgo}${cacheIndicator}</span>
            <span class="confidence">Confidence: ${Math.round(metadata.confidence * 100)}%</span>
            <span class="timeframe">Period: ${metadata.timeframe}</span>
        `;
    }

    // Event Handlers
    async handleRefresh(event) {
        event.preventDefault();
        console.log('🔄 Refreshing summary...');
        
        const refreshBtn = event.target.closest('button');
        const originalHTML = refreshBtn.innerHTML;
        
        try {
            refreshBtn.innerHTML = createIcon('loader') + ' Refreshing...';
            refreshBtn.disabled = true;
            
            await this.render({ forceRefresh: true });
            
        } catch (error) {
            console.error('❌ Refresh failed:', error);
            this.showErrorBanner('Refresh failed: ' + error.message);
        } finally {
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.disabled = false;
        }
    }

    handleViewDetails(event) {
        event.preventDefault();
        console.log('📊 Opening detailed analytics...');
        
        // Navigate to full analytics dashboard or show modal
        if (window.OsliraApp?.router) {
            window.OsliraApp.router.navigate('/analytics/dashboard');
        } else {
            // Fallback: open in new window/tab
            window.open('/analytics/', '_blank');
        }
        
        // Track user interaction
        this.trackUserInteraction('view_details', {
            currentMetrics: Object.keys(this.state.summaryData?.metrics || {}),
            overallHealth: this.state.summaryData?.summary?.overallHealth
        });
    }

    async handleExportSummary(event) {
        event.preventDefault();
        console.log('📄 Exporting summary...');
        
        try {
            const exportData = {
                summary: this.state.summaryData,
                metadata: {
                    exportedAt: new Date().toISOString(),
                    exportedBy: window.OsliraApp?.user?.id || 'anonymous',
                    version: '1.0'
                },
                format: 'json'
            };
            
            // Create download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-summary-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Track export action
            this.trackUserInteraction('export_summary', {
                format: 'json',
                metricsCount: Object.keys(this.state.summaryData?.metrics || {}).length
            });
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showErrorBanner('Export failed: ' + error.message);
        }
    }

    handleToggleCompactMode(event) {
        event.preventDefault();
        console.log('🔄 Toggling compact mode...');
        
        const wrapper = this.container.querySelector('.summary-panel-wrapper');
        const compactBtn = event.target.closest('button');
        
        if (wrapper) {
            wrapper.classList.toggle('compact-mode');
            const isCompact = wrapper.classList.contains('compact-mode');
            
            // Update button icon and tooltip
            compactBtn.innerHTML = isCompact ? createIcon('maximize') : createIcon('minimize');
            compactBtn.title = isCompact ? 'Expand View' : 'Compact View';
            
            // Store preference
            localStorage.setItem('summaryCompactMode', isCompact.toString());
            
            // Track interaction
            this.trackUserInteraction('toggle_compact', { compact: isCompact });
        }
    }

    // Animation Methods
    animateMetricCards() {
        const cards = this.container.querySelectorAll('.metric-card');
        
        cards.forEach((card, index) => {
            // Stagger animation start times
            setTimeout(() => {
                card.style.animation = `slideInUp 0.6s ease-out forwards`;
                
                // Animate counter if it's a numeric value
                const valueElement = card.querySelector('.metric-value');
                if (valueElement) {
                    this.animateCounter(valueElement, index * this.animations.slideInDelay);
                }
            }, index * this.animations.slideInDelay);
        });
    }

    animateCounter(element, delay = 0) {
        const targetValue = parseFloat(element.dataset.value || '0');
        const isPercentage = element.textContent.includes('%');
        const isDecimal = element.textContent.includes('x');
        
        setTimeout(() => {
            let currentValue = 0;
            const increment = targetValue / (this.animations.countupDuration / 16); // 60fps
            
            const updateCounter = () => {
                currentValue += increment;
                
                if (currentValue >= targetValue) {
                    currentValue = targetValue;
                    element.textContent = this.formatAnimatedValue(currentValue, isPercentage, isDecimal);
                    return;
                }
                
                element.textContent = this.formatAnimatedValue(currentValue, isPercentage, isDecimal);
                requestAnimationFrame(updateCounter);
            };
            
            updateCounter();
        }, delay);
    }

    formatAnimatedValue(value, isPercentage, isDecimal) {
        if (isPercentage) {
            return `${value.toFixed(1)}%`;
        } else if (isDecimal) {
            return `${value.toFixed(2)}x`;
        } else {
            return formatNumber(Math.round(value));
        }
    }

    // Cache Management
    loadCachedSummary() {
        try {
            const cached = getCachedData(this.config.cacheKey);
            if (cached && this.isCacheValid(cached)) {
                this.performanceMetrics.cacheHits++;
                return cached;
            }
            
            this.performanceMetrics.cacheMisses++;
            return null;
            
        } catch (error) {
            console.warn('⚠️ Cache load failed:', error);
            return null;
        }
    }

    cacheSummary(summaryData) {
        try {
            const cacheData = {
                ...summaryData,
                cachedAt: Date.now(),
                ttl: this.config.cacheTTL
            };
            
            setCachedData(this.config.cacheKey, cacheData);
            console.log('💾 Summary cached successfully');
            
        } catch (error) {
            console.warn('⚠️ Cache save failed:', error);
        }
    }

    isCacheValid(cached) {
        if (!cached || !cached.cachedAt) return false;
        
        const age = Date.now() - cached.cachedAt;
        return age < (cached.ttl || this.config.cacheTTL);
    }

    shouldRefreshData() {
        if (!this.state.lastUpdate) return true;
        
        const age = Date.now() - new Date(this.state.lastUpdate).getTime();
        return age > this.config.refreshInterval;
    }

    // Auto-refresh Management
    initializeAutoRefresh() {
        if (this.config.refreshInterval > 0) {
            this.state.refreshTimer = setInterval(() => {
                if (!this.state.isLoading && this.shouldRefreshData() && this.state.isVisible) {
                    console.log('⏰ Auto-refreshing summary...');
                    this.render({ forceRefresh: false });
                }
            }, this.config.refreshInterval);
        }
    }

    setupVisibilityObserver() {
        // Optimize performance by pausing updates when not visible
        if ('IntersectionObserver' in window) {
            this.visibilityObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    this.state.isVisible = entry.isIntersecting;
                    if (this.state.isVisible && this.shouldRefreshData()) {
                        this.render({ forceRefresh: false });
                    }
                });
            }, { threshold: 0.1 });
            
            // Start observing when container is available
            if (this.container) {
                this.visibilityObserver.observe(this.container);
            }
        }
    }

    // Public API Methods
    updateData(newData) {
        // Update summary with new data from external source
        if (newData && newData.metrics) {
            this.state.summaryData = newData;
            this.renderSummaryData(newData, false);
            this.cacheSummary(newData);
        }
    }

    getSummaryData() {
        // Return current summary data for external consumption
        return {
            summary: this.state.summaryData,
            lastUpdate: this.state.lastUpdate,
            performanceMetrics: { ...this.performanceMetrics },
            isLoading: this.state.isLoading
        };
    }

    setConfig(newConfig) {
        // Update module configuration
        this.config = { ...this.config, ...newConfig };
        
        // Restart auto-refresh if interval changed
        if (newConfig.refreshInterval !== undefined) {
            if (this.state.refreshTimer) {
                clearInterval(this.state.refreshTimer);
            }
            this.initializeAutoRefresh();
        }
    }

    // Analytics and Telemetry
    trackUserInteraction(action, data = {}) {
        if (this.config.analyticsLogging) {
            const event = {
                module: 'QuickSummaryPanel',
                action: action,
                timestamp: new Date().toISOString(),
                data: data,
                userId: window.OsliraApp?.user?.id || 'anonymous',
                sessionId: window.OsliraApp?.session?.id || 'unknown'
            };
            
            console.log('📊 User Interaction:', event);
            
            // Send to analytics service if available
            if (window.OsliraApp?.analytics?.track) {
                window.OsliraApp.analytics.track(event);
            }
        }
    }

    logPerformanceMetrics() {
        if (this.config.analyticsLogging) {
            const avgLoadTime = this.performanceMetrics.totalRequests > 0 
                ? (this.performanceMetrics.renderTime + this.performanceMetrics.dataFetchTime) / this.performanceMetrics.totalRequests
                : 0;
                
            this.performanceMetrics.averageLoadTime = avgLoadTime;
            
            console.log('📊 QuickSummaryPanel Performance:', {
                renderTime: `${this.performanceMetrics.renderTime.toFixed(2)}ms`,
                dataFetchTime: `${this.performanceMetrics.dataFetchTime.toFixed(2)}ms`,
                averageLoadTime: `${avgLoadTime.toFixed(2)}ms`,
                cacheHitRate: `${((this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100 || 0).toFixed(1)}%`,
                totalRequests: this.performanceMetrics.totalRequests,
                errorRate: `${((this.performanceMetrics.errorCount / this.performanceMetrics.totalRequests) * 100 || 0).toFixed(1)}%`,
                metricsCount: Object.keys(this.state.summaryData?.metrics || {}).length
            });
        }
    }

    // Error Recovery and Health Monitoring
    async handleCriticalError(error) {
        console.error('🚨 Critical QuickSummaryPanel error:', error);
        
        // Attempt recovery strategies
        const recoveryStrategies = [
            () => this.loadCachedSummary(),
            () => this.loadFallbackSummary(),
            () => this.showGracefulDegradation()
        ];
        
        for (const strategy of recoveryStrategies) {
            try {
                const result = await strategy();
                if (result) {
                    console.log('✅ Recovery successful');
                    return result;
                }
            } catch (recoveryError) {
                console.warn('⚠️ Recovery strategy failed:', recoveryError);
            }
        }
        
        // Last resort: show error state
        this.showErrorState(error);
    }

    loadFallbackSummary() {
        // Provide static fallback summary when all else fails
        const fallbackSummary = {
            metrics: {
                totalLeads: { value: 0, change: 0, trend: 'neutral', status: 'neutral' },
                highRiskPercentage: { value: 0, change: 0, trend: 'neutral', status: 'good' },
                averageROI: { value: 0, change: 0, trend: 'neutral', status: 'neutral' },
                weeklyChange: { value: 0, change: 0, trend: 'neutral', status: 'neutral' },
                conversionRate: { value: 0, change: 0, trend: 'neutral', status: 'neutral' },
                activeOutreach: { value: 0, change: 0, trend: 'neutral', status: 'neutral' }
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                timeframe: '7d',
                dataQuality: 'fallback',
                confidence: 0.0,
                requestId: 'fallback_' + Date.now(),
                version: '1.0'
            },
            trends: {
                overall: 'neutral',
                performance: 'neutral',
                risk: 'neutral',
                growth: 'neutral'
            },
            summary: {
                totalMetrics: 6,
                positiveMetrics: 0,
                alertMetrics: 0,
                overallHealth: 0.5
            }
        };
        
        this.renderSummaryData(fallbackSummary, true);
        return fallbackSummary;
    }

    showGracefulDegradation() {
        // Show helpful message when summary can't be loaded
        const contentContainer = this.container.querySelector('#summary-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="graceful-degradation">
                    <div class="degradation-icon">${createIcon('info')}</div>
                    <h4>Summary Temporarily Unavailable</h4>
                    <p>We're experiencing technical difficulties loading your analytics summary.</p>
                    <div class="degradation-actions">
                        <button class="btn-retry" onclick="this.closest('.summary-panel-wrapper').querySelector('#refresh-summary').click()">
                            ${createIcon('refresh')} Try Again
                        </button>
                        <button class="btn-details" onclick="this.closest('.summary-panel-wrapper').querySelector('#view-details').click()">
                            ${createIcon('bar-chart')} View Full Analytics
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Module Health Check
    async healthCheck() {
        const health = {
            status: 'healthy',
            checks: [],
            timestamp: new Date().toISOString(),
            uptime: performance.now()
        };
        
        try {
            // Check container
            health.checks.push({
                name: 'container',
                status: this.container && this.container.isConnected ? 'pass' : 'fail',
                message: this.container ? 'Container available' : 'Container missing'
            });
            
            // Check services
            health.checks.push({
                name: 'analyticsService',
                status: this.analyticsService ? 'pass' : 'fail',
                message: this.analyticsService ? 'Analytics service available' : 'Analytics service missing'
            });
            
            // Check cache
            const cachedData = this.loadCachedSummary();
            health.checks.push({
                name: 'cache',
                status: cachedData ? 'pass' : 'warn',
                message: cachedData ? 'Cache data available' : 'No cached data'
            });
            
            // Check performance
            const avgLoadTime = this.performanceMetrics.averageLoadTime;
            health.checks.push({
                name: 'performance',
                status: avgLoadTime < 3000 ? 'pass' : 'warn',
                message: `Average load time: ${avgLoadTime.toFixed(2)}ms`
            });
            
            // Check auto-refresh
            health.checks.push({
                name: 'autoRefresh',
                status: this.state.refreshTimer ? 'pass' : 'warn',
                message: this.state.refreshTimer ? 'Auto-refresh active' : 'Auto-refresh disabled'
            });
            
            // Overall status
            const failCount = health.checks.filter(c => c.status === 'fail').length;
            const warnCount = health.checks.filter(c => c.status === 'warn').length;
            
            if (failCount > 0) {
                health.status = 'unhealthy';
            } else if (warnCount > 0) {
                health.status = 'degraded';
            }
            
        } catch (error) {
            health.status = 'error';
            health.error = error.message;
        }
        
        return health;
    }

    // Cleanup and Destruction
    destroy() {
        // Cleanup when module is destroyed
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
            this.state.refreshTimer = null;
        }
        
        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
            this.visibilityObserver = null;
        }
        
        // Remove event listeners
        Object.values(this.boundHandlers).forEach(handler => {
            // Event listeners will be garbage collected when container is removed
        });
        
        console.log('📊 QuickSummaryPanel destroyed');
    }

    // Utility Methods
    generateRequestId() {
        return `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    applyEnterpriseStyles() {
        // Inject enterprise-grade styles for the summary panel
        const styleId = 'summary-panel-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Quick Summary Panel Enterprise Styles */
            .summary-panel-wrapper {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .summary-panel-wrapper.compact-mode {
                padding: 12px;
            }
            
            .summary-panel-wrapper::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
            }
            
            .summary-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 12px;
            }
            
            .summary-panel-wrapper.compact-mode .summary-header {
                margin-bottom: 12px;
                padding-bottom: 8px;
            }
            
            .summary-title-section {
                flex: 1;
            }
            
            .summary-title {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 0 0 6px 0;
                font-size: 1.125rem;
                font-weight: 700;
                color: #1e293b;
            }
            
            .summary-panel-wrapper.compact-mode .summary-title {
                font-size: 1rem;
                gap: 8px;
                margin-bottom: 4px;
            }
            
            .summary-title svg {
                width: 20px;
                height: 20px;
                color: #10b981;
            }
            
            .summary-status {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }
            
            .summary-status.live {
                background: #dcfce7;
                color: #166534;
            }
            
            .summary-status.cached {
                background: #fef3c7;
                color: #92400e;
            }
            
            .summary-metadata {
                display: flex;
                gap: 12px;
                font-size: 0.8rem;
                color: #64748b;
                flex-wrap: wrap;
            }
            
            .summary-panel-wrapper.compact-mode .summary-metadata {
                font-size: 0.75rem;
                gap: 8px;
            }
            
            .summary-controls {
                display: flex;
                gap: 6px;
                flex-shrink: 0;
            }
            
            .summary-controls button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background: white;
                color: #64748b;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0;
            }
            
            .summary-panel-wrapper.compact-mode .summary-controls button {
                width: 28px;
                height: 28px;
            }
            
            .summary-controls button:hover {
                background: #f8fafc;
                color: #3b82f6;
                border-color: #3b82f6;
                transform: translateY(-1px);
            }
            
            .summary-controls button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .summary-controls button svg {
                width: 14px;
                height: 14px;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 16px;
                margin-bottom: 16px;
            }
            
            .summary-panel-wrapper.compact-mode .summary-grid {
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .metric-card {
                background: white;
                border: 1px solid #f1f5f9;
                border-radius: 8px;
                padding: 16px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .summary-panel-wrapper.compact-mode .metric-card {
                padding: 12px;
            }
            
            .metric-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                transition: all 0.3s ease;
            }
            
            .metric-card.metric-good::before { background: #10b981; }
            .metric-card.metric-excellent::before { background: #059669; }
            .metric-card.metric-warning::before { background: #f59e0b; }
            .metric-card.metric-error::before { background: #dc2626; }
            .metric-card.metric-neutral::before { background: #64748b; }
            
            .metric-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px -3px rgba(0, 0, 0, 0.1);
                border-color: #e2e8f0;
            }
            
            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .summary-panel-wrapper.compact-mode .metric-header {
                margin-bottom: 8px;
            }
            
            .metric-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: #f8fafc;
                color: #64748b;
            }
            
            .summary-panel-wrapper.compact-mode .metric-icon {
                width: 28px;
                height: 28px;
            }
            
            .metric-icon svg {
                width: 16px;
                height: 16px;
            }
            
            .metric-trend {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
            }
            
            .trend-up { color: #10b981; }
            .trend-down { color: #dc2626; }
            .trend-neutral { color: #64748b; }
            
            .trend-up svg, .trend-down svg, .trend-neutral svg {
                width: 14px;
                height: 14px;
            }
            
            .metric-content {
                text-align: left;
            }
            
            .metric-value {
                display: block;
                font-size: 1.5rem;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 4px;
                line-height: 1.2;
            }
            
            .summary-panel-wrapper.compact-mode .metric-value {
                font-size: 1.25rem;
                margin-bottom: 2px;
            }
            
            .metric-label {
                display: block;
                font-size: 0.875rem;
                font-weight: 500;
                color: #64748b;
                margin-bottom: 4px;
            }
            
            .summary-panel-wrapper.compact-mode .metric-label {
                font-size: 0.8rem;
                margin-bottom: 2px;
            }
            
            .metric-change {
                font-size: 0.75rem;
                font-weight: 500;
                color: #64748b;
            }
            
            .summary-panel-wrapper.compact-mode .metric-change {
                font-size: 0.7rem;
            }
            
            .summary-insights {
                padding: 12px;
                background: #f8fafc;
                border-radius: 6px;
                border: 1px solid #f1f5f9;
            }
            
            .summary-panel-wrapper.compact-mode .summary-insights {
                padding: 8px;
            }
            
            .summary-insight {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 0;
                font-size: 0.875rem;
            }
            
            .summary-panel-wrapper.compact-mode .summary-insight {
                font-size: 0.8rem;
                gap: 6px;
                padding: 2px 0;
            }
            
            .insight-icon svg {
                width: 14px;
                height: 14px;
            }
            
            .insight-success .insight-icon { color: #10b981; }
            .insight-warning .insight-icon { color: #f59e0b; }
            .insight-error .insight-icon { color: #dc2626; }
            .insight-info .insight-icon { color: #3b82f6; }
            
            .insight-text {
                flex: 1;
                color: #374151;
                font-weight: 500;
            }
            
            .loading-state {
                padding: 20px 0;
            }
            
            .loading-skeleton {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 16px;
            }
            
            .skeleton-metric-card {
                background: white;
                border: 1px solid #f1f5f9;
                border-radius: 8px;
                padding: 16px;
                animation: pulse 1.5s ease-in-out infinite;
            }
            
            .skeleton-header {
                width: 60%;
                height: 16px;
                background: #e2e8f0;
                border-radius: 4px;
                margin-bottom: 12px;
            }
            
            .skeleton-value {
                width: 80%;
                height: 24px;
                background: #e2e8f0;
                border-radius: 4px;
                margin-bottom: 8px;
            }
            
            .skeleton-label {
                width: 40%;
                height: 12px;
                background: #e2e8f0;
                border-radius: 4px;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .error-state, .graceful-degradation {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 30px 20px;
                text-align: center;
                color: #64748b;
            }
            
            .error-icon, .degradation-icon {
                width: 40px;
                height: 40px;
                margin-bottom: 12px;
                opacity: 0.6;
            }
            
            .error-state h4, .graceful-degradation h4 {
                margin: 0 0 6px 0;
                color: #374151;
                font-size: 1rem;
            }
            
            .error-state p, .graceful-degradation p {
                margin: 0 0 12px 0;
                max-width: 300px;
                font-size: 0.875rem;
            }
            
            .btn-retry, .degradation-actions button {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.875rem;
                font-weight: 500;
                transition: all 0.2s ease;
                text-decoration: none;
            }
            
            .btn-retry:hover, .degradation-actions button:hover {
                background: #2563eb;
                transform: translateY(-1px);
            }
            
            .degradation-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .cache-indicator {
                text-align: center;
                padding: 8px 12px;
                background: #f0f9ff;
                color: #0369a1;
                border-radius: 4px;
                font-size: 0.8rem;
                margin-top: 12px;
                border: 1px solid #e0f2fe;
            }
            
            .error-banner {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #fef2f2;
                color: #991b1b;
                border: 1px solid #fecaca;
                border-radius: 6px;
                margin-top: 8px;
                font-size: 0.8rem;
            }
            
            .error-banner button {
                background: none;
                border: none;
                color: #991b1b;
                cursor: pointer;
                padding: 2px;
                border-radius: 3px;
            }
            
            .error-banner button:hover {
                background: #fee2e2;
            }
            
            .summary-progress {
                padding: 12px 0;
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background: #f1f5f9;
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 6px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #10b981, #3b82f6);
                border-radius: 3px;
                transition: width 0.3s ease;
            }
            
            .progress-text {
                font-size: 0.8rem;
                color: #64748b;
                text-align: center;
                display: block;
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .summary-header {
                    flex-direction: column;
                    gap: 8px;
                    align-items: stretch;
                }
                
                .summary-controls {
                    justify-content: center;
                }
                
                .summary-grid {
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 12px;
                }
                
                .summary-metadata {
                    flex-direction: column;
                    gap: 4px;
                }
                
                .metric-value {
                    font-size: 1.25rem;
                }
                
                .summary-panel-wrapper.compact-mode .metric-value {
                    font-size: 1.125rem;
                }
                
                .degradation-actions {
                    flex-direction: column;
                    align-items: center;
                }
            }
            
            @media (max-width: 480px) {
                .summary-panel-wrapper {
                    padding: 12px;
                }
                
                .summary-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }
                
                .metric-card {
                    padding: 12px;
                }
                
                .metric-value {
                    font-size: 1.125rem;
                }
                
                .summary-insights {
                    padding: 8px;
                }
                
                .summary-insight {
                    font-size: 0.8rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Module Information
    getModuleInfo() {
        return {
            name: 'QuickSummaryPanel',
            version: '1.0.0',
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
                'Compact mode toggle'
            ],
            endpoints: [
                '/analytics/summary'
            ],
            configuration: Object.keys(this.config),
            state: {
                isLoading: this.state.isLoading,
                metricsCount: Object.keys(this.state.summaryData?.metrics || {}).length,
                lastUpdate: this.state.lastUpdate,
                hasError: !!this.state.error,
                isVisible: this.state.isVisible
            },
            performance: this.performanceMetrics
        };
    }
}

// Export for ES6 modules
export { QuickSummaryPanel };

// Also make available globally for dynamic loading
window.QuickSummaryPanel = QuickSummaryPanel;

// Module registration for analytics dashboard
if (window.OsliraApp && window.OsliraApp.modules) {
    window.OsliraApp.modules.QuickSummaryPanel = QuickSummaryPanel;
}

console.log('📊 QuickSummaryPanel module loaded successfully');

