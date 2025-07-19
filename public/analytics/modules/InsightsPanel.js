// ==========================================
// INSIGHTS PANEL - AI-Powered Strategic Insights Module
// Enterprise-Grade Analytics Dashboard Component
// ==========================================

import { setCachedData, getCachedData } from '../utils/moduleCache.js';
import { createIcon, addTooltip, formatNumber } from '../utils/UIHelpers.js';

export class InsightsPanel {
    constructor(container, secureAnalyticsService, secureClaudeService, secureCreditService) {
        // Initialize with secure services
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        this.claudeService = secureClaudeService;
        this.creditService = secureCreditService;
        
        // Module configuration
        this.config = {
            cacheKey: 'insights',
            cacheTTL: 300000, // 5 minutes
            maxInsights: 5,
            minConfidenceThreshold: 0.6,
            refreshInterval: 600000, // 10 minutes
            priorityInsights: ['risk_patterns', 'performance_opportunities', 'lead_optimization'],
            fallbackMode: false,
            analyticsLogging: true
        };
        
        // State management
        this.state = {
            isLoading: false,
            lastUpdate: null,
            insights: [],
            metadata: {},
            error: null,
            refreshTimer: null,
            loadingProgress: 0
        };
        
        // Performance tracking
        this.performanceMetrics = {
            renderTime: 0,
            dataFetchTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalRequests: 0,
            errorCount: 0
        };
        
        // Event handlers
        this.boundHandlers = {
            refresh: this.handleRefresh.bind(this),
            expand: this.handleExpand.bind(this),
            exportInsights: this.handleExportInsights.bind(this)
        };
        
        // Initialize auto-refresh if enabled
        this.initializeAutoRefresh();
        
        console.log('🧠 InsightsPanel initialized with secure services');
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
            const cachedInsights = this.loadCachedInsights();
            if (cachedInsights && !options.forceRefresh) {
                console.log('📋 Loading cached insights for instant display');
                this.renderInsights(cachedInsights, true);
            }
            
            // Fetch fresh insights in background
            if (!cachedInsights || options.forceRefresh || this.shouldRefreshData()) {
                await this.fetchAndRenderFreshInsights(options);
            }
            
            this.performanceMetrics.renderTime = performance.now() - renderStartTime;
            this.logPerformanceMetrics();
            
        } catch (error) {
            console.error('❌ InsightsPanel render failed:', error);
            this.handleRenderError(error);
        } finally {
            this.state.isLoading = false;
        }
    }

    createContainerStructure() {
        this.container.innerHTML = `
            <div class="insights-panel-wrapper" data-module="insights">
                <div class="insights-header">
                    <div class="insights-title-section">
                        <h3 class="insights-title">
                            ${createIcon('brain')}
                            <span>AI Insights</span>
                            <span class="insights-badge" id="insights-count">0</span>
                        </h3>
                        <div class="insights-metadata" id="insights-metadata">
                            <span class="last-updated">Loading...</span>
                        </div>
                    </div>
                    <div class="insights-controls">
                        <button class="btn-refresh" id="refresh-insights" title="Refresh Insights">
                            ${createIcon('refresh')}
                        </button>
                        <button class="btn-expand" id="expand-insights" title="View All Insights">
                            ${createIcon('expand')}
                        </button>
                        <button class="btn-export" id="export-insights" title="Export Insights">
                            ${createIcon('download')}
                        </button>
                    </div>
                </div>
                <div class="insights-content" id="insights-content">
                    <!-- Insights will be rendered here -->
                </div>
                <div class="insights-footer" id="insights-footer">
                    <div class="insights-progress" id="insights-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%;"></div>
                        </div>
                        <span class="progress-text">Analyzing data...</span>
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
        const refreshBtn = this.container.querySelector('#refresh-insights');
        const expandBtn = this.container.querySelector('#expand-insights');
        const exportBtn = this.container.querySelector('#export-insights');
        
        if (refreshBtn) refreshBtn.addEventListener('click', this.boundHandlers.refresh);
        if (expandBtn) expandBtn.addEventListener('click', this.boundHandlers.expand);
        if (exportBtn) exportBtn.addEventListener('click', this.boundHandlers.exportInsights);
        
        // Add tooltips for better UX
        if (refreshBtn) addTooltip(refreshBtn, 'Refresh AI insights with latest data');
        if (expandBtn) addTooltip(expandBtn, 'View detailed insights analysis');
        if (exportBtn) addTooltip(exportBtn, 'Export insights to PDF or JSON');
    }

    async fetchAndRenderFreshInsights(options = {}) {
        const fetchStartTime = performance.now();
        
        try {
            this.updateLoadingProgress(20, 'Checking credits...');
            
            // Check credits before expensive AI operation
            const creditCheck = await this.creditService.checkBalance();
            if (!creditCheck.success || creditCheck.balance < 10) {
                throw new Error('Insufficient credits for AI insights generation');
            }
            
            this.updateLoadingProgress(40, 'Fetching analytics data...');
            
            // Prepare analytics data for Claude analysis
            const analyticsData = await this.prepareAnalyticsData(options);
            
            this.updateLoadingProgress(60, 'Generating AI insights...');
            
            // Generate insights via secure Claude service
            const insightsResponse = await this.generateInsights(analyticsData);
            
            this.updateLoadingProgress(80, 'Processing insights...');
            
            // Process and validate insights
            const processedInsights = this.processInsights(insightsResponse);
            
            this.updateLoadingProgress(90, 'Caching results...');
            
            // Cache the results
            this.cacheInsights(processedInsights);
            
            this.updateLoadingProgress(100, 'Complete!');
            
            // Render fresh insights
            this.renderInsights(processedInsights, false);
            
            this.performanceMetrics.dataFetchTime = performance.now() - fetchStartTime;
            this.performanceMetrics.totalRequests++;
            
        } catch (error) {
            console.error('❌ Failed to fetch fresh insights:', error);
            this.performanceMetrics.errorCount++;
            
            // Try to fall back to cached data
            const cachedInsights = this.loadCachedInsights();
            if (cachedInsights) {
                console.log('📋 Falling back to cached insights due to error');
                this.renderInsights(cachedInsights, true);
                this.showErrorBanner('Using cached insights - ' + error.message);
            } else {
                this.showErrorState(error);
            }
        } finally {
            this.hideLoadingProgress();
        }
    }

    async prepareAnalyticsData(options = {}) {
        try {
            // Gather comprehensive analytics data for Claude analysis
            const timeframe = options.timeframe || '7d';
            const includeComparison = options.includeComparison !== false;
            
            const analyticsPromises = [
                this.analyticsService.getLeadMetrics({ timeframe }),
                this.analyticsService.getConversionRates({ timeframe }),
                this.analyticsService.getMessagePerformance({ timeframe }),
                this.analyticsService.getCTAEffectiveness({ timeframe })
            ];
            
            if (includeComparison) {
                analyticsPromises.push(
                    this.analyticsService.getHistoricalComparison({ 
                        timeframe, 
                        compareToFrames: ['14d', '30d'] 
                    })
                );
            }
            
            const [leadMetrics, conversionRates, messagePerformance, ctaData, comparison] = 
                await Promise.allSettled(analyticsPromises);
            
            // Compile analytics summary for Claude
            const analyticsData = {
                summary: {
                    totalLeads: leadMetrics.value?.total || 0,
                    conversionRate: conversionRates.value?.overall || 0,
                    averageROI: messagePerformance.value?.avgROI || 0,
                    timeframe: timeframe,
                    generatedAt: new Date().toISOString()
                },
                performance: {
                    leads: leadMetrics.status === 'fulfilled' ? leadMetrics.value : null,
                    conversions: conversionRates.status === 'fulfilled' ? conversionRates.value : null,
                    messages: messagePerformance.status === 'fulfilled' ? messagePerformance.value : null,
                    cta: ctaData.status === 'fulfilled' ? ctaData.value : null
                },
                trends: comparison.status === 'fulfilled' ? comparison.value : null,
                requestId: this.generateRequestId(),
                userContext: {
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    preferences: options.preferences || {}
                }
            };
            
            return analyticsData;
            
        } catch (error) {
            console.error('❌ Failed to prepare analytics data:', error);
            throw new Error(`Analytics data preparation failed: ${error.message}`);
        }
    }

    async generateInsights(analyticsData) {
        try {
            // Prepare payload for Claude Worker endpoint
            const payload = {
                requestType: 'generate_insights',
                requestId: this.generateRequestId(),
                timestamp: Date.now(),
                analyticsData: analyticsData,
                options: {
                    maxInsights: this.config.maxInsights,
                    confidenceThreshold: this.config.minConfidenceThreshold,
                    priorityTypes: this.config.priorityInsights,
                    includeRecommendations: true,
                    includeMetrics: true,
                    analysisDepth: 'comprehensive'
                },
                userPreferences: {
                    format: 'structured',
                    includeConfidence: true,
                    includeActionItems: true
                }
            };
            
            // Call secure Claude service via Worker
            const response = await this.claudeService.makeSecureRequest('/ai/generate-insights', payload);
            
            if (!response.success) {
                throw new Error(response.message || 'Insights generation failed');
            }
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Claude insights generation failed:', error);
            throw new Error(`AI insights generation failed: ${error.message}`);
        }
    }

    processInsights(rawInsights) {
        try {
            // Validate and process Claude response
            if (!rawInsights || !rawInsights.insights) {
                throw new Error('Invalid insights response structure');
            }
            
            const processedInsights = {
                insights: rawInsights.insights.map((insight, index) => ({
                    id: insight.id || `insight_${index}`,
                    type: insight.type || 'general',
                    title: insight.title || 'Insight',
                    description: insight.description || '',
                    confidence: insight.confidence || 0.5,
                    priority: insight.priority || 'medium',
                    category: insight.category || 'performance',
                    actionItems: insight.actionItems || [],
                    metrics: insight.metrics || {},
                    tags: insight.tags || [],
                    impact: insight.impact || 'unknown',
                    implementationDifficulty: insight.implementationDifficulty || 'medium',
                    timeToImplement: insight.timeToImplement || 'unknown',
                    expectedROI: insight.expectedROI || null
                })).filter(insight => insight.confidence >= this.config.minConfidenceThreshold),
                
                metadata: {
                    generatedAt: new Date().toISOString(),
                    model: rawInsights.metadata?.model || 'Claude Sonnet 4',
                    analysisTime: rawInsights.metadata?.analysisTime || 0,
                    tokensUsed: rawInsights.metadata?.tokensUsed || 0,
                    confidence: rawInsights.metadata?.overallConfidence || 0.7,
                    dataQuality: rawInsights.metadata?.dataQuality || 'good',
                    requestId: rawInsights.metadata?.requestId || this.generateRequestId()
                },
                
                summary: {
                    totalInsights: rawInsights.insights.length,
                    highConfidenceCount: rawInsights.insights.filter(i => i.confidence > 0.8).length,
                    actionableCount: rawInsights.insights.filter(i => i.actionItems?.length > 0).length,
                    categories: [...new Set(rawInsights.insights.map(i => i.category))],
                    averageConfidence: rawInsights.insights.reduce((sum, i) => sum + i.confidence, 0) / rawInsights.insights.length
                }
            };
            
            // Sort insights by priority and confidence
            processedInsights.insights.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const aPriority = priorityOrder[a.priority] || 2;
                const bPriority = priorityOrder[b.priority] || 2;
                
                if (aPriority !== bPriority) {
                    return bPriority - aPriority; // Higher priority first
                }
                
                return b.confidence - a.confidence; // Higher confidence first
            });
            
            // Limit to max insights
            if (processedInsights.insights.length > this.config.maxInsights) {
                processedInsights.insights = processedInsights.insights.slice(0, this.config.maxInsights);
            }
            
            return processedInsights;
            
        } catch (error) {
            console.error('❌ Insights processing failed:', error);
            throw new Error(`Insights processing failed: ${error.message}`);
        }
    }

    renderInsights(insightsData, isFromCache = false) {
        try {
            const contentContainer = this.container.querySelector('#insights-content');
            const countBadge = this.container.querySelector('#insights-count');
            const metadataContainer = this.container.querySelector('#insights-metadata');
            
            if (!contentContainer) {
                console.error('❌ Insights content container not found');
                return;
            }
            
            // Update metadata
            this.updateMetadata(insightsData.metadata, isFromCache);
            
            // Update count badge
            if (countBadge) {
                countBadge.textContent = insightsData.insights.length;
                countBadge.className = `insights-badge ${this.getBadgeClass(insightsData.insights.length)}`;
            }
            
            // Render insights
            if (insightsData.insights.length === 0) {
                this.showEmptyState();
                return;
            }
            
            const insightsHTML = insightsData.insights.map(insight => this.renderInsightCard(insight)).join('');
            
            contentContainer.innerHTML = `
                <div class="insights-grid">
                    ${insightsHTML}
                </div>
                ${isFromCache ? '<div class="cache-indicator">📋 Showing cached insights</div>' : ''}
            `;
            
            // Update state
            this.state.insights = insightsData.insights;
            this.state.metadata = insightsData.metadata;
            this.state.lastUpdate = new Date().toISOString();
            
            console.log(`✅ Rendered ${insightsData.insights.length} insights (${isFromCache ? 'cached' : 'fresh'})`);
            
        } catch (error) {
            console.error('❌ Insights rendering failed:', error);
            this.showErrorState(error);
        }
    }

    renderInsightCard(insight) {
        const priorityClass = `priority-${insight.priority}`;
        const confidencePercent = Math.round(insight.confidence * 100);
        const confidenceClass = confidencePercent >= 80 ? 'high' : confidencePercent >= 60 ? 'medium' : 'low';
        
        const actionItemsHTML = insight.actionItems.length > 0 ? `
            <div class="insight-actions">
                <h5>Action Items:</h5>
                <ul>
                    ${insight.actionItems.slice(0, 3).map(action => `<li>${action}</li>`).join('')}
                    ${insight.actionItems.length > 3 ? `<li class="more-actions">+${insight.actionItems.length - 3} more...</li>` : ''}
                </ul>
            </div>
        ` : '';
        
        const metricsHTML = Object.keys(insight.metrics).length > 0 ? `
            <div class="insight-metrics">
                ${Object.entries(insight.metrics).slice(0, 2).map(([key, value]) => 
                    `<span class="metric"><strong>${key}:</strong> ${formatNumber(value)}</span>`
                ).join('')}
            </div>
        ` : '';
        
        return `
            <div class="insight-card ${priorityClass}" data-insight-id="${insight.id}">
                <div class="insight-header">
                    <div class="insight-type-icon">
                        ${this.getInsightIcon(insight.type)}
                    </div>
                    <div class="insight-title-section">
                        <h4 class="insight-title">${insight.title}</h4>
                        <div class="insight-meta">
                            <span class="confidence ${confidenceClass}">${confidencePercent}% confidence</span>
                            <span class="category">${insight.category}</span>
                            ${insight.impact !== 'unknown' ? `<span class="impact">${insight.impact} impact</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="insight-content">
                    <p class="insight-description">${insight.description}</p>
                    ${metricsHTML}
                    ${actionItemsHTML}
                </div>
                <div class="insight-footer">
                    <div class="insight-tags">
                        ${insight.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div class="insight-controls">
                        <button class="btn-detail" data-insight-id="${insight.id}" title="View Details">
                            ${createIcon('info')}
                        </button>
                        <button class="btn-implement" data-insight-id="${insight.id}" title="Implement">
                            ${createIcon('check')}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getInsightIcon(type) {
        const iconMap = {
            risk_patterns: createIcon('warning'),
            performance_opportunities: createIcon('trending-up'),
            lead_optimization: createIcon('target'),
            conversion_improvement: createIcon('funnel'),
            cost_reduction: createIcon('dollar-sign'),
            automation_suggestion: createIcon('zap'),
            quality_improvement: createIcon('star'),
            general: createIcon('lightbulb')
        };
        
        return iconMap[type] || iconMap.general;
    }

    getBadgeClass(count) {
        if (count === 0) return 'empty';
        if (count <= 2) return 'low';
        if (count <= 4) return 'medium';
        return 'high';
    }

    updateMetadata(metadata, isFromCache) {
        const metadataContainer = this.container.querySelector('#insights-metadata');
        if (!metadataContainer) return;
        
        const timeAgo = this.getTimeAgo(new Date(metadata.generatedAt));
        const cacheIndicator = isFromCache ? ' (cached)' : '';
        
        metadataContainer.innerHTML = `
            <span class="last-updated">Updated ${timeAgo}${cacheIndicator}</span>
            <span class="model-info">by ${metadata.model}</span>
            ${metadata.confidence ? `<span class="overall-confidence">${Math.round(metadata.confidence * 100)}% avg confidence</span>` : ''}
        `;
    }

    showLoadingState() {
        const contentContainer = this.container.querySelector('#insights-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Generating AI insights...</p>
                    <small>This may take a few moments</small>
                </div>
            `;
        }
    }

    updateLoadingProgress(percent, message) {
        const progressContainer = this.container.querySelector('#insights-progress');
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
        const progressContainer = this.container.querySelector('#insights-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    showEmptyState() {
        const contentContainer = this.container.querySelector('#insights-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${createIcon('brain')}</div>
                    <h4>No Insights Available</h4>
                    <p>We need more data to generate meaningful insights. Try again after some activity.</p>
                    <button class="btn-retry" onclick="this.closest('.insights-panel-wrapper').querySelector('#refresh-insights').click()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    showErrorState(error) {
        const contentContainer = this.container.querySelector('#insights-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">${createIcon('alert-circle')}</div>
                    <h4>Unable to Load Insights</h4>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button class="btn-retry" onclick="this.closest('.insights-panel-wrapper').querySelector('#refresh-insights').click()">
                        Retry
                    </button>
                </div>
            `;
        }
        
        this.state.error = error;
    }

    showErrorBanner(message) {
        const header = this.container.querySelector('.insights-header');
        if (header) {
            const banner = document.createElement('div');
            banner.className = 'error-banner';
            banner.innerHTML = `
                <span>${createIcon('alert-triangle')} ${message}</span>
                <button onclick="this.parentElement.remove()">${createIcon('x')}</button>
            `;
            header.appendChild(banner);
            
            // Auto-remove after 10 seconds
            setTimeout(() => banner.remove(), 10000);
        }
    }

    // Event Handlers
    async handleRefresh(event) {
        event.preventDefault();
        console.log('🔄 Refreshing insights...');
        
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

    handleExpand(event) {
        event.preventDefault();
        console.log('📖 Expanding insights view...');
        
        // Create modal or navigate to detailed insights page
        this.showDetailedInsightsModal();
    }

    async handleExportInsights(event) {
        event.preventDefault();
        console.log('📄 Exporting insights...');
        
        try {
            const exportData = {
                insights: this.state.insights,
                metadata: this.state.metadata,
                exportedAt: new Date().toISOString(),
                format: 'json'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `insights-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showErrorBanner('Export failed: ' + error.message);
        }
    }

    // Cache Management
    loadCachedInsights() {
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

    cacheInsights(insightsData) {
        try {
            const cacheData = {
                ...insightsData,
                cachedAt: Date.now(),
                ttl: this.config.cacheTTL
            };
            
            setCachedData(this.config.cacheKey, cacheData);
            console.log('💾 Insights cached successfully');
            
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
                if (!this.state.isLoading && this.shouldRefreshData()) {
                    console.log('⏰ Auto-refreshing insights...');
                    this.render({ forceRefresh: false });
                }
            }, this.config.refreshInterval);
        }
    }

    destroy() {
        // Cleanup when module is destroyed
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
            this.state.refreshTimer = null;
        }
        
        // Remove event listeners
        Object.values(this.boundHandlers).forEach(handler => {
            // Event listeners will be garbage collected when container is removed
        });
        
        console.log('🧠 InsightsPanel destroyed');
    }

    // Utility Methods
    generateRequestId() {
        return `insights_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    logPerformanceMetrics() {
        if (this.config.analyticsLogging) {
            console.log('📊 InsightsPanel Performance:', {
                renderTime: `${this.performanceMetrics.renderTime.toFixed(2)}ms`,
                dataFetchTime: `${this.performanceMetrics.dataFetchTime.toFixed(2)}ms`,
                cacheHitRate: `${((this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100 || 0).toFixed(1)}%`,
                totalRequests: this.performanceMetrics.totalRequests,
                errorRate: `${((this.performanceMetrics.errorCount / this.performanceMetrics.totalRequests) * 100 || 0).toFixed(1)}%`,
                insightsCount: this.state.insights.length
            });
        }
    }

    showDetailedInsightsModal() {
        // Create detailed insights modal
        const modal = document.createElement('div');
        modal.className = 'insights-modal-overlay';
        modal.innerHTML = `
            <div class="insights-modal">
                <div class="modal-header">
                    <h3>${createIcon('brain')} Detailed AI Insights</h3>
                    <button class="modal-close" onclick="this.closest('.insights-modal-overlay').remove()">
                        ${createIcon('x')}
                    </button>
                </div>
                <div class="modal-content">
                    <div class="insights-summary">
                        <div class="summary-stats">
                            <div class="stat">
                                <span class="stat-value">${this.state.insights.length}</span>
                                <span class="stat-label">Total Insights</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${this.state.insights.filter(i => i.priority === 'high').length}</span>
                                <span class="stat-label">High Priority</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${this.state.insights.filter(i => i.actionItems.length > 0).length}</span>
                                <span class="stat-label">Actionable</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${Math.round((this.state.insights.reduce((sum, i) => sum + i.confidence, 0) / this.state.insights.length) * 100)}%</span>
                                <span class="stat-label">Avg Confidence</span>
                            </div>
                        </div>
                    </div>
                    <div class="detailed-insights">
                        ${this.state.insights.map(insight => this.renderDetailedInsightCard(insight)).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-export-all" onclick="document.querySelector('#export-insights').click()">
                        ${createIcon('download')} Export All
                    </button>
                    <button class="btn-close" onclick="this.closest('.insights-modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    renderDetailedInsightCard(insight) {
        const priorityClass = `priority-${insight.priority}`;
        const confidencePercent = Math.round(insight.confidence * 100);
        const confidenceClass = confidencePercent >= 80 ? 'high' : confidencePercent >= 60 ? 'medium' : 'low';
        
        const allActionItemsHTML = insight.actionItems.length > 0 ? `
            <div class="detailed-actions">
                <h5>Action Items:</h5>
                <ol>
                    ${insight.actionItems.map(action => `<li>${action}</li>`).join('')}
                </ol>
            </div>
        ` : '';
        
        const allMetricsHTML = Object.keys(insight.metrics).length > 0 ? `
            <div class="detailed-metrics">
                <h5>Key Metrics:</h5>
                <div class="metrics-grid">
                    ${Object.entries(insight.metrics).map(([key, value]) => 
                        `<div class="metric-item">
                            <span class="metric-label">${key}:</span>
                            <span class="metric-value">${formatNumber(value)}</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
        ` : '';
        
        const implementationInfoHTML = `
            <div class="implementation-info">
                <div class="implementation-detail">
                    <span class="label">Difficulty:</span>
                    <span class="value ${insight.implementationDifficulty}">${insight.implementationDifficulty}</span>
                </div>
                <div class="implementation-detail">
                    <span class="label">Time to Implement:</span>
                    <span class="value">${insight.timeToImplement}</span>
                </div>
                ${insight.expectedROI ? `
                    <div class="implementation-detail">
                        <span class="label">Expected ROI:</span>
                        <span class="value">${formatNumber(insight.expectedROI)}</span>
                    </div>
                ` : ''}
            </div>
        `;
        
        return `
            <div class="detailed-insight-card ${priorityClass}" data-insight-id="${insight.id}">
                <div class="detailed-header">
                    <div class="insight-type-icon">
                        ${this.getInsightIcon(insight.type)}
                    </div>
                    <div class="detailed-title-section">
                        <h4 class="detailed-title">${insight.title}</h4>
                        <div class="detailed-meta">
                            <span class="confidence ${confidenceClass}">${confidencePercent}% confidence</span>
                            <span class="category">${insight.category}</span>
                            <span class="priority priority-${insight.priority}">${insight.priority} priority</span>
                            <span class="impact">${insight.impact} impact</span>
                        </div>
                    </div>
                </div>
                <div class="detailed-content">
                    <div class="description-section">
                        <h5>Analysis:</h5>
                        <p class="detailed-description">${insight.description}</p>
                    </div>
                    ${allMetricsHTML}
                    ${allActionItemsHTML}
                    ${implementationInfoHTML}
                </div>
                <div class="detailed-footer">
                    <div class="all-tags">
                        ${insight.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div class="detailed-controls">
                        <button class="btn-implement" data-insight-id="${insight.id}" title="Mark as Implemented">
                            ${createIcon('check')} Implement
                        </button>
                        <button class="btn-dismiss" data-insight-id="${insight.id}" title="Dismiss Insight">
                            ${createIcon('x')} Dismiss
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    applyEnterpriseStyles() {
        // Inject enterprise-grade styles for the insights panel
        const styleId = 'insights-panel-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Insights Panel Enterprise Styles */
            .insights-panel-wrapper {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                position: relative;
                overflow: hidden;
            }
            
            .insights-panel-wrapper::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
            }
            
            .insights-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 16px;
            }
            
            .insights-title-section {
                flex: 1;
            }
            
            .insights-title {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 0 0 8px 0;
                font-size: 1.25rem;
                font-weight: 700;
                color: #1e293b;
            }
            
            .insights-title svg {
                width: 24px;
                height: 24px;
                color: #3b82f6;
            }
            
            .insights-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 24px;
                height: 24px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                color: white;
                padding: 0 8px;
            }
            
            .insights-badge.empty { background-color: #64748b; }
            .insights-badge.low { background-color: #f59e0b; }
            .insights-badge.medium { background-color: #3b82f6; }
            .insights-badge.high { background-color: #10b981; }
            
            .insights-metadata {
                display: flex;
                gap: 16px;
                font-size: 0.875rem;
                color: #64748b;
            }
            
            .insights-controls {
                display: flex;
                gap: 8px;
            }
            
            .insights-controls button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                background: white;
                color: #64748b;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .insights-controls button:hover {
                background: #f1f5f9;
                color: #3b82f6;
                border-color: #3b82f6;
            }
            
            .insights-controls button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .insights-controls button svg {
                width: 16px;
                height: 16px;
            }
            
            .insights-grid {
                display: grid;
                gap: 16px;
            }
            
            .insight-card {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 20px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .insight-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                transition: all 0.3s ease;
            }
            
            .insight-card.priority-high::before { background-color: #dc2626; }
            .insight-card.priority-medium::before { background-color: #f59e0b; }
            .insight-card.priority-low::before { background-color: #64748b; }
            
            .insight-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border-color: #3b82f6;
            }
            
            .insight-header {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 16px;
            }
            
            .insight-type-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: white;
                flex-shrink: 0;
            }
            
            .insight-type-icon svg {
                width: 20px;
                height: 20px;
            }
            
            .insight-title-section {
                flex: 1;
            }
            
            .insight-title {
                margin: 0 0 8px 0;
                font-size: 1.1rem;
                font-weight: 600;
                color: #1e293b;
                line-height: 1.4;
            }
            
            .insight-meta {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }
            
            .insight-meta span {
                font-size: 0.75rem;
                padding: 2px 8px;
                border-radius: 12px;
                font-weight: 500;
            }
            
            .confidence.high { background: #dcfce7; color: #166534; }
            .confidence.medium { background: #fef3c7; color: #92400e; }
            .confidence.low { background: #fee2e2; color: #991b1b; }
            
            .category { background: #dbeafe; color: #1e40af; }
            .impact { background: #f3e8ff; color: #7c3aed; }
            
            .insight-description {
                margin: 0 0 16px 0;
                color: #374151;
                line-height: 1.6;
                font-size: 0.95rem;
            }
            
            .insight-metrics {
                display: flex;
                gap: 16px;
                margin-bottom: 16px;
                flex-wrap: wrap;
            }
            
            .metric {
                font-size: 0.875rem;
                color: #4b5563;
            }
            
            .metric strong {
                color: #1f2937;
            }
            
            .insight-actions h5 {
                margin: 0 0 8px 0;
                font-size: 0.875rem;
                font-weight: 600;
                color: #374151;
            }
            
            .insight-actions ul {
                margin: 0;
                padding-left: 16px;
                color: #4b5563;
                font-size: 0.875rem;
            }
            
            .insight-actions li {
                margin-bottom: 4px;
            }
            
            .more-actions {
                color: #3b82f6;
                font-style: italic;
            }
            
            .insight-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid #f1f5f9;
            }
            
            .insight-tags {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }
            
            .tag {
                font-size: 0.75rem;
                padding: 2px 8px;
                background: #f1f5f9;
                color: #475569;
                border-radius: 12px;
                font-weight: 500;
            }
            
            .insight-controls {
                display: flex;
                gap: 8px;
            }
            
            .insight-controls button {
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
            }
            
            .insight-controls button:hover {
                background: #f8fafc;
                color: #3b82f6;
                border-color: #3b82f6;
            }
            
            .insight-controls button svg {
                width: 14px;
                height: 14px;
            }
            
            .loading-state, .empty-state, .error-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                text-align: center;
                color: #64748b;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #e2e8f0;
                border-top: 3px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 16px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .empty-icon, .error-icon {
                width: 48px;
                height: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            
            .empty-state h4, .error-state h4 {
                margin: 0 0 8px 0;
                color: #374151;
            }
            
            .empty-state p, .error-state p {
                margin: 0 0 16px 0;
                max-width: 300px;
            }
            
            .btn-retry {
                padding: 8px 16px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.875rem;
                font-weight: 500;
                transition: background-color 0.2s ease;
            }
            
            .btn-retry:hover {
                background: #2563eb;
            }
            
            .cache-indicator {
                text-align: center;
                padding: 12px;
                background: #f0f9ff;
                color: #0369a1;
                border-radius: 6px;
                font-size: 0.875rem;
                margin-top: 16px;
                border: 1px solid #e0f2fe;
            }
            
            .error-banner {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: #fef2f2;
                color: #991b1b;
                border: 1px solid #fecaca;
                border-radius: 6px;
                margin-top: 12px;
                font-size: 0.875rem;
            }
            
            .error-banner button {
                background: none;
                border: none;
                color: #991b1b;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
            }
            
            .error-banner button:hover {
                background: #fee2e2;
            }
            
            .insights-progress {
                padding: 16px 0;
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #f1f5f9;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            .progress-text {
                font-size: 0.875rem;
                color: #64748b;
                text-align: center;
                display: block;
            }
            
            /* Modal Styles */
            .insights-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
            }
            
            .insights-modal {
                background: white;
                border-radius: 12px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            
            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 24px 24px 16px 24px;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .modal-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 1.25rem;
                font-weight: 700;
                color: #1e293b;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: #64748b;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
            }
            
            .modal-close:hover {
                background: #f1f5f9;
                color: #374151;
            }
            
            .modal-content {
                flex: 1;
                overflow-y: auto;
                padding: 24px;
            }
            
            .insights-summary {
                margin-bottom: 24px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
            }
            
            .summary-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 16px;
            }
            
            .stat {
                text-align: center;
            }
            
            .stat-value {
                display: block;
                font-size: 1.5rem;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 4px;
            }
            
            .stat-label {
                font-size: 0.875rem;
                color: #64748b;
                font-weight: 500;
            }
            
            .detailed-insights {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .detailed-insight-card {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 24px;
            }
            
            .detailed-header {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                margin-bottom: 20px;
            }
            
            .detailed-title {
                margin: 0 0 12px 0;
                font-size: 1.1rem;
                font-weight: 600;
                color: #1e293b;
            }
            
            .detailed-meta {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .detailed-content h5 {
                margin: 0 0 8px 0;
                font-size: 0.875rem;
                font-weight: 600;
                color: #374151;
            }
            
            .detailed-description {
                margin: 0 0 20px 0;
                color: #374151;
                line-height: 1.6;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .metric-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 12px;
                background: #f8fafc;
                border-radius: 6px;
            }
            
            .metric-label {
                font-weight: 500;
                color: #64748b;
            }
            
            .metric-value {
                font-weight: 600;
                color: #1e293b;
            }
            
            .detailed-actions {
                margin-bottom: 20px;
            }
            
            .detailed-actions ol {
                margin: 0;
                padding-left: 20px;
                color: #4b5563;
            }
            
            .detailed-actions li {
                margin-bottom: 8px;
                line-height: 1.5;
            }
            
            .implementation-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 12px;
                padding: 16px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .implementation-detail {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .implementation-detail .label {
                font-size: 0.875rem;
                font-weight: 500;
                color: #64748b;
            }
            
            .implementation-detail .value {
                font-size: 0.875rem;
                font-weight: 600;
                color: #1e293b;
                padding: 2px 8px;
                border-radius: 12px;
            }
            
            .implementation-detail .value.easy { background: #dcfce7; color: #166534; }
            .implementation-detail .value.medium { background: #fef3c7; color: #92400e; }
            .implementation-detail .value.hard { background: #fee2e2; color: #991b1b; }
            
            .detailed-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 16px;
                border-top: 1px solid #f1f5f9;
            }
            
            .all-tags {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }
            
            .detailed-controls {
                display: flex;
                gap: 8px;
            }
            
            .detailed-controls button {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background: white;
                color: #64748b;
                cursor: pointer;
                font-size: 0.875rem;
                transition: all 0.2s ease;
            }
            
            .btn-implement:hover {
                background: #dcfce7;
                color: #166534;
                border-color: #16a34a;
            }
            
            .btn-dismiss:hover {
                background: #fee2e2;
                color: #991b1b;
                border-color: #dc2626;
            }
            
            .modal-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px 24px 24px;
                border-top: 1px solid #e2e8f0;
            }
            
            .btn-export-all, .btn-close {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .btn-export-all {
                background: #3b82f6;
                color: white;
                border: none;
            }
            
            .btn-export-all:hover {
                background: #2563eb;
            }
            
            .btn-close {
                background: #f8fafc;
                color: #64748b;
                border: 1px solid #e2e8f0;
            }
            
            .btn-close:hover {
                background: #f1f5f9;
                color: #374151;
            }
            
            @media (max-width: 768px) {
                .insights-header {
                    flex-direction: column;
                    gap: 12px;
                    align-items: stretch;
                }
                
                .insights-controls {
                    justify-content: center;
                }
                
                .insight-meta {
                    flex-direction: column;
                    gap: 6px;
                }
                
                .insight-footer {
                    flex-direction: column;
                    gap: 12px;
                    align-items: stretch;
                }
                
                .insights-modal {
                    margin: 10px;
                    max-height: calc(100vh - 20px);
                }
                
                .summary-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .metrics-grid {
                    grid-template-columns: 1fr;
                }
                
                .implementation-info {
                    grid-template-columns: 1fr;
                }
            }
.summary-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .metrics-grid {
                    grid-template-columns: 1fr;
                }
                
                .implementation-info {
                    grid-template-columns: 1fr;
                }
                
                .detailed-footer {
                    flex-direction: column;
                    gap: 12px;
                    align-items: stretch;
                }
                
                .modal-footer {
                    flex-direction: column;
                    gap: 12px;
                }
                
                .btn-export-all, .btn-close {
                    justify-content: center;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Public API Methods for Integration
    updateData(newData) {
        // Update insights with new data from external source
        if (newData && newData.insights) {
            this.state.insights = newData.insights;
            this.state.metadata = newData.metadata || this.state.metadata;
            this.renderInsights(newData, false);
            this.cacheInsights(newData);
        }
    }

    getInsightsData() {
        // Return current insights data for external consumption
        return {
            insights: this.state.insights,
            metadata: this.state.metadata,
            lastUpdate: this.state.lastUpdate,
            performanceMetrics: { ...this.performanceMetrics }
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
                module: 'InsightsPanel',
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

    // Error Recovery and Fallback
    async handleCriticalError(error) {
        console.error('🚨 Critical InsightsPanel error:', error);
        
        // Attempt recovery strategies
        const recoveryStrategies = [
            () => this.loadCachedInsights(),
            () => this.loadFallbackInsights(),
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

    loadFallbackInsights() {
        // Provide static fallback insights when all else fails
        const fallbackInsights = {
            insights: [
                {
                    id: 'fallback_1',
                    type: 'general',
                    title: 'Regular Review Recommended',
                    description: 'Consider reviewing your analytics dashboard regularly to identify trends and opportunities.',
                    confidence: 0.7,
                    priority: 'medium',
                    category: 'best_practice',
                    actionItems: [
                        'Schedule weekly analytics reviews',
                        'Set up automated reports',
                        'Create performance benchmarks'
                    ],
                    metrics: {},
                    tags: ['best-practice', 'regular-review'],
                    impact: 'medium',
                    implementationDifficulty: 'easy',
                    timeToImplement: '1-2 hours',
                    expectedROI: null
                }
            ],
            metadata: {
                generatedAt: new Date().toISOString(),
                model: 'Fallback System',
                analysisTime: 0,
                tokensUsed: 0,
                confidence: 0.7,
                dataQuality: 'limited',
                requestId: 'fallback_' + Date.now()
            },
            summary: {
                totalInsights: 1,
                highConfidenceCount: 0,
                actionableCount: 1,
                categories: ['best_practice'],
                averageConfidence: 0.7
            }
        };
        
        this.renderInsights(fallbackInsights, true);
        return fallbackInsights;
    }

    showGracefulDegradation() {
        // Show a helpful message when insights can't be loaded
        const contentContainer = this.container.querySelector('#insights-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="graceful-degradation">
                    <div class="degradation-icon">${createIcon('info')}</div>
                    <h4>Insights Temporarily Unavailable</h4>
                    <p>We're experiencing technical difficulties generating AI insights. Please try again later.</p>
                    <div class="degradation-actions">
                        <button class="btn-retry" onclick="this.closest('.insights-panel-wrapper').querySelector('#refresh-insights').click()">
                            ${createIcon('refresh')} Try Again
                        </button>
                        <button class="btn-help" onclick="window.open('/help/insights', '_blank')">
                            ${createIcon('help-circle')} Get Help
                        </button>
                    </div>
                    <div class="degradation-tips">
                        <h5>In the meantime:</h5>
                        <ul>
                            <li>Check your other analytics modules</li>
                            <li>Review recent performance data</li>
                            <li>Consider manual analysis of trends</li>
                        </ul>
                    </div>
                </div>
            `;
        }
        
        // Add graceful degradation styles
        this.addGracefulDegradationStyles();
    }

    addGracefulDegradationStyles() {
        const styleId = 'insights-degradation-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .graceful-degradation {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 40px 20px;
                text-align: center;
                background: linear-gradient(135deg, #fef7ed 0%, #fff7ed 100%);
                border: 1px solid #fed7aa;
                border-radius: 8px;
                margin: 20px 0;
            }
            
            .degradation-icon {
                width: 48px;
                height: 48px;
                color: #ea580c;
                margin-bottom: 16px;
            }
            
            .graceful-degradation h4 {
                margin: 0 0 8px 0;
                color: #9a3412;
                font-size: 1.1rem;
            }
            
            .graceful-degradation p {
                margin: 0 0 20px 0;
                color: #c2410c;
                max-width: 400px;
            }
            
            .degradation-actions {
                display: flex;
                gap: 12px;
                margin-bottom: 24px;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .degradation-actions button {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
            }
            
            .btn-help {
                background: #ea580c;
                color: white;
                border: none;
            }
            
            .btn-help:hover {
                background: #dc2626;
            }
            
            .degradation-tips {
                text-align: left;
                max-width: 300px;
                padding: 16px;
                background: white;
                border-radius: 6px;
                border: 1px solid #fed7aa;
            }
            
            .degradation-tips h5 {
                margin: 0 0 8px 0;
                color: #9a3412;
                font-size: 0.875rem;
            }
            
            .degradation-tips ul {
                margin: 0;
                padding-left: 16px;
                color: #c2410c;
                font-size: 0.875rem;
            }
            
            .degradation-tips li {
                margin-bottom: 4px;
            }
        `;
        
        document.head.appendChild(style);
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
                name: 'claudeService',
                status: this.claudeService ? 'pass' : 'fail',
                message: this.claudeService ? 'Claude service available' : 'Claude service missing'
            });
            
            health.checks.push({
                name: 'analyticsService',
                status: this.analyticsService ? 'pass' : 'fail',
                message: this.analyticsService ? 'Analytics service available' : 'Analytics service missing'
            });
            
            // Check cache
            const cachedData = this.loadCachedInsights();
            health.checks.push({
                name: 'cache',
                status: cachedData ? 'pass' : 'warn',
                message: cachedData ? 'Cache data available' : 'No cached data'
            });
            
            // Check performance
            const avgRenderTime = this.performanceMetrics.renderTime;
            health.checks.push({
                name: 'performance',
                status: avgRenderTime < 2000 ? 'pass' : 'warn',
                message: `Render time: ${avgRenderTime.toFixed(2)}ms`
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

    // Module Information
    getModuleInfo() {
        return {
            name: 'InsightsPanel',
            version: '1.0.0',
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
                'Mobile responsive design'
            ],
            endpoints: [
                '/ai/generate-insights'
            ],
            configuration: Object.keys(this.config),
            state: {
                isLoading: this.state.isLoading,
                insightsCount: this.state.insights.length,
                lastUpdate: this.state.lastUpdate,
                hasError: !!this.state.error
            },
            performance: this.performanceMetrics
        };
    }
}

// Export for ES6 modules
export { InsightsPanel };

// Also make available globally for dynamic loading
window.InsightsPanel = InsightsPanel;

// Module registration for analytics dashboard
if (window.OsliraApp && window.OsliraApp.modules) {
    window.OsliraApp.modules.InsightsPanel = InsightsPanel;
}

console.log('🧠 InsightsPanel module loaded successfully');
