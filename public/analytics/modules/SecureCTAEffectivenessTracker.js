// ===== SECURE CTA EFFECTIVENESS TRACKER =====
class SecureCTAEffectivenessTracker {
    constructor(container, secureAnalyticsService) {
        // Initialize secure CTA tracker
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        
        // CTA tracker configuration
        this.config = {
            maxCTAsDisplayed: 50,
            refreshInterval: 60000, // 1 minute
            animationDuration: 600,
            debounceDelay: 300,
            creditCost: 1,
            minUsageThreshold: 5, // Minimum usage for statistical significance
            maxCTALength: 200 // Maximum CTA text length for display
        };
        
        // Chart and state management
        this.chartInstance = null;
        this.currentData = null;
        this.currentFilters = {};
        this.sortBy = 'effectiveness'; // Default sort
        this.sortDirection = 'desc';
        this.selectedCTA = null;
        
        // Performance optimization
        this.isLoading = false;
        this.lastDataFetch = null;
        this.refreshTimer = null;
        this.updateDebounced = this.debounce(this._updateInternal.bind(this), this.config.debounceDelay);
        
        // Interaction state
        this.interactionState = {
            hoveredCTA: null,
            expandedDetails: new Set(),
            selectedCategory: 'all',
            viewMode: 'chart' // 'chart', 'table', 'grid'
        };
        
        // Security and audit
        this.securitySettings = {
            sanitizeContent: true,
            logInteractions: true,
            validateMetrics: true,
            encryptSensitive: true
        };
        this.auditLog = [];
        
        // CTA categories for filtering
        this.ctaCategories = {
            'meeting': 'Schedule Meeting',
            'demo': 'Request Demo',
            'contact': 'Contact Us',
            'follow': 'Follow Up',
            'collaboration': 'Collaborate',
            'partnership': 'Partnership',
            'consultation': 'Consultation',
            'other': 'Other'
        };
        
        // Effectiveness thresholds
        this.effectivenessThresholds = {
            excellent: 85,
            good: 70,
            average: 50,
            poor: 30,
            veryPoor: 0
        };
        
        // Connect to secure analytics endpoints
        this.setupAnalyticsConnection();
        
        // Setup CTA performance monitoring
        this.setupPerformanceMonitoring();
        
        // Configure tracking visualizations
        this.setupVisualizationConfig();
        
        // Setup container
        this.setupContainer();
        
        console.log('SecureCTAEffectivenessTracker initialized');
    }
    // ADD THESE METHODS after the constructor:

getModuleInfo() {
    return {
        name: 'Message Style Matrix',
        version: '1.0.0',
        description: 'AI-powered message style performance analysis',
        dependencies: ['claudeService', 'analyticsService'],
        status: this.state || 'uninitialized',
        container: this.container?.id || 'unknown'
    };
}

cleanup() {
    console.log('🧹 Cleaning up SecureMessageStyleMatrix');
    
    if (this.updateInterval) {
        clearInterval(this.updateInterval);
    }
    
    if (this.container) {
        this.container.innerHTML = '';
    }
    
    this.state = 'cleaned';
}

onError(error, context = {}) {
    console.error(`❌ SecureMessageStyleMatrix error:`, error);
    this.fallbackRender(error);
}

async fallbackRender(error) {
    if (this.container) {
        this.container.innerHTML = `
            <div style="padding:20px;background:#f8f9fa;border-radius:8px;text-align:center;">
                <h4>⚠️ Message Style Matrix Unavailable</h4>
                <p>This feature requires credits or has a temporary issue.</p>
                <button onclick="location.reload()" style="background:#3b82f6;color:white;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;">
                    Reload Dashboard
                </button>
            </div>
        `;
    }
    this.state = 'fallback';
}

    setupAnalyticsConnection() {
        // Connect to secure analytics endpoints
        if (!this.analyticsService) {
            throw new Error('SecureAnalyticsService is required for CTA tracking');
        }
        
        // Validate required methods
        if (typeof this.analyticsService.getCTAEffectiveness !== 'function') {
            throw new Error('Analytics service missing getCTAEffectiveness method');
        }
        
        // Test connection
        this.testAnalyticsConnection();
    }

    async testAnalyticsConnection() {
        // Test analytics service connection
        try {
            await this.analyticsService.getCTAEffectiveness({ 
                test: true, 
                limit: 1 
            });
            console.log('CTA analytics service connection verified');
        } catch (error) {
            console.warn('CTA analytics service test failed:', error.message);
        }
    }

    setupPerformanceMonitoring() {
        // Setup CTA performance monitoring
        this.performanceMetrics = {
            renderCount: 0,
            updateCount: 0,
            errorCount: 0,
            averageRenderTime: 0,
            lastRenderTime: null,
            cacheHitRate: 0
        };
        
        // Setup performance tracking
        this.performanceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name.includes('cta-tracker')) {
                    this.updatePerformanceMetrics(entry);
                }
            }
        });
        
        if (window.PerformanceObserver) {
            this.performanceObserver.observe({ entryTypes: ['measure'] });
        }
    }

    setupVisualizationConfig() {
        // Configure tracking visualizations
        this.chartConfig = {
            type: 'bar',
            responsive: true,
            maintainAspectRatio: false,
            
            // Animation settings
            animation: {
                duration: this.config.animationDuration,
                easing: 'easeInOutQuart',
                animateRotate: false,
                animateScale: true
            },
            
            // Interaction settings
            interaction: {
                intersect: false,
                mode: 'index'
            },
            
            // Plugin configuration
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    enabled: false, // Using custom tooltip
                    external: this.customTooltipHandler.bind(this)
                }
            },
            
            // Scale configuration
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Call-to-Action Messages',
                        font: { size: 14, weight: 'bold' }
                    },
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        callback: (value, index, values) => {
                            const label = this.currentData?.ctas[index]?.text || '';
                            return this.truncateLabel(label, 30);
                        }
                    }
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Effectiveness Score (%)',
                        font: { size: 14, weight: 'bold' }
                    },
                    min: 0,
                    max: 100,
                    grid: { 
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        };
    }

    setupContainer() {
        // Setup CTA tracker container structure
        if (!this.container) {
            throw new Error('Container element is required for SecureCTAEffectivenessTracker');
        }
        
        this.container.innerHTML = `
            <div class="cta-tracker-wrapper">
                <div class="cta-tracker-header">
                    <div class="tracker-title">
                        <h3>CTA Effectiveness Tracker</h3>
                        <span class="tracker-subtitle">Performance analysis and optimization recommendations</span>
                    </div>
                    <div class="tracker-controls">
                        <select class="cta-category-filter" aria-label="Filter by CTA category">
                            <option value="all">All Categories</option>
                            ${Object.entries(this.ctaCategories).map(([key, label]) => 
                                `<option value="${key}">${label}</option>`
                            ).join('')}
                        </select>
                        <select class="cta-sort-selector" aria-label="Sort CTAs by">
                            <option value="effectiveness">Effectiveness</option>
                            <option value="usage">Usage Count</option>
                            <option value="response_rate">Response Rate</option>
                            <option value="conversion_rate">Conversion Rate</option>
                            <option value="recent">Most Recent</option>
                        </select>
                        <button class="view-toggle" data-view="chart" title="Chart View" aria-label="Switch to chart view">
                            📊
                        </button>
                        <button class="view-toggle" data-view="table" title="Table View" aria-label="Switch to table view">
                            📋
                        </button>
                        <button class="view-toggle" data-view="grid" title="Grid View" aria-label="Switch to grid view">
                            ⊞
                        </button>
                        <button class="cta-refresh" title="Refresh Data" aria-label="Refresh CTA data">
                            🔄
                        </button>
                        <button class="cta-export" title="Export Data" aria-label="Export CTA data">
                            📥
                        </button>
                        <button class="cta-settings" title="Settings" aria-label="CTA tracker settings">
                            ⚙️
                        </button>
                    </div>
                </div>
                
                <div class="cta-tracker-content">
                    <div class="tracker-loading" style="display: none;" role="status" aria-live="polite">
                        <div class="loading-spinner" aria-hidden="true"></div>
                        <span class="loading-text">Loading CTA performance data...</span>
                    </div>
                    
                    <div class="tracker-error" style="display: none;" role="alert">
                        <div class="error-icon" aria-hidden="true">⚠️</div>
                        <div class="error-content">
                            <h4>Unable to Load CTA Data</h4>
                            <p class="error-message"></p>
                            <button class="retry-btn">Retry</button>
                        </div>
                    </div>
                    
                    <div class="tracker-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="total-ctas">--</div>
                            <div class="stat-label">Total CTAs</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="avg-effectiveness">--</div>
                            <div class="stat-label">Avg Effectiveness</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="top-performer">--</div>
                            <div class="stat-label">Top Performer</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="improvement-opportunity">--</div>
                            <div class="stat-label">Improvement Potential</div>
                        </div>
                    </div>
                    
                    <div class="tracker-visualization">
                        <div class="chart-view" id="chart-view">
                            <canvas class="cta-chart" role="img" aria-label="CTA effectiveness chart"></canvas>
                        </div>
                        
                        <div class="table-view" id="table-view" style="display: none;">
                            <div class="table-container">
                                <table class="cta-table" role="table">
                                    <thead>
                                        <tr>
                                            <th>CTA Text</th>
                                            <th>Category</th>
                                            <th>Usage Count</th>
                                            <th>Response Rate</th>
                                            <th>Effectiveness</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="cta-table-body"></tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="grid-view" id="grid-view" style="display: none;">
                            <div class="cta-grid" id="cta-grid"></div>
                        </div>
                    </div>
                    
                    <div class="tracker-recommendations">
                        <h4>🎯 Optimization Recommendations</h4>
                        <div class="recommendations-list" id="recommendations-list">
                            <p class="no-recommendations">Load data to see recommendations</p>
                        </div>
                    </div>
                </div>
                
                <div class="cta-tooltip" style="display: none;" role="tooltip">
                    <div class="tooltip-content"></div>
                </div>
                
                <div class="cta-details-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h4>CTA Performance Details</h4>
                            <button class="modal-close" aria-label="Close details">×</button>
                        </div>
                        <div class="modal-body" id="cta-details-body"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Setup event listeners for tracker controls
        const refreshBtn = this.container.querySelector('.cta-refresh');
        const exportBtn = this.container.querySelector('.cta-export');
        const settingsBtn = this.container.querySelector('.cta-settings');
        const retryBtn = this.container.querySelector('.retry-btn');
        const categoryFilter = this.container.querySelector('.cta-category-filter');
        const sortSelector = this.container.querySelector('.cta-sort-selector');
        const viewToggleButtons = this.container.querySelectorAll('.view-toggle');
        const modalClose = this.container.querySelector('.modal-close');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCTAData());
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.interactionState.selectedCategory = e.target.value;
                this.applyFiltersAndSort();
            });
        }
        
        if (sortSelector) {
            sortSelector.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applyFiltersAndSort();
            });
        }
        
        viewToggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideDetailsModal());
        }
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup resize observer
        this.setupResizeObserver();
    }

    setupKeyboardNavigation() {
        // Setup keyboard navigation for accessibility
        this.container.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'Escape':
                    this.hideDetailsModal();
                    this.clearSelection();
                    break;
                case 'Enter':
                case ' ':
                    if (this.selectedCTA) {
                        this.showCTADetails(this.selectedCTA);
                    }
                    event.preventDefault();
                    break;
            }
        });
    }

    setupResizeObserver() {
        // Setup resize observer for responsive updates
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.chartInstance) {
                    this.chartInstance.resize();
                }
            });
            
            this.resizeObserver.observe(this.container);
        }
    }

    async render(filters = {}) {
        // Render secure CTA effectiveness analysis
        try {
            performance.mark('cta-tracker-render-start');
            
            this.currentFilters = { ...filters };
            this.showLoading();
            this.clearError();
            
            // Fetch CTA data via Worker processing
            const ctaData = await this.fetchCTAData(filters);
            
            // Validate and process data
            this.validateCTAData(ctaData);
            
            // Calculate effectiveness scores server-side (already done by Worker)
            const processedData = this.processCTAData(ctaData);
            
            // Display ranked CTA performance
            await this.displayCTAPerformance(processedData);
            
            // Update statistics
            this.updateStatistics(processedData);
            
            // Generate recommendations
            this.generateRecommendations(processedData);
            
            // Update current data
            this.currentData = processedData;
            this.lastDataFetch = Date.now();
            
            // Setup auto-refresh
            this.setupAutoRefresh();
            
            // Hide loading state
            this.hideLoading();
            
            performance.mark('cta-tracker-render-end');
            performance.measure('cta-tracker-render', 'cta-tracker-render-start', 'cta-tracker-render-end');
            
            // Log successful render
            this.logAuditEvent('cta_tracker_rendered', {
                filters,
                ctaCount: processedData.ctas?.length || 0,
                renderTime: Date.now()
            });
            
        } catch (error) {
            console.error('CTA tracker render failed:', error);
            this.showError(error.message);
            this.hideLoading();
            this.logAuditEvent('render_failed', { error: error.message, filters });
        }
    }

    async fetchCTAData(filters) {
        // Fetch CTA data via Worker processing
        try {
            const response = await this.analyticsService.getCTAEffectiveness({
                ...filters,
                includeMetrics: true,
                includeBreakdown: true,
                includeRecommendations: true,
                minUsage: this.config.minUsageThreshold,
                maxResults: this.config.maxCTAsDisplayed
            });
            
            if (!response || !response.success) {
                throw new Error(response?.message || 'Invalid response from CTA analytics service');
            }
            
            return response.data;
            
        } catch (error) {
            console.error('CTA data fetch failed:', error);
            throw new Error(`Failed to fetch CTA data: ${error.message}`);
        }
    }

    validateCTAData(data) {
        // Validate CTA data structure
        if (!data || typeof data !== 'object') {
            throw new Error('CTA data must be an object');
        }
        
        if (!Array.isArray(data.ctas)) {
            throw new Error('CTA data must contain a ctas array');
        }
        
        // Validate CTA structure
        data.ctas.forEach((cta, index) => {
            if (!cta || typeof cta !== 'object') {
                throw new Error(`Invalid CTA at index ${index}: must be an object`);
            }
            
            if (typeof cta.text !== 'string' || cta.text.length === 0) {
                throw new Error(`Invalid CTA text at index ${index}: must be a non-empty string`);
            }
            
            if (typeof cta.effectiveness !== 'number' || cta.effectiveness < 0 || cta.effectiveness > 100) {
                throw new Error(`Invalid effectiveness score at index ${index}: must be a number between 0 and 100`);
            }
            
            if (typeof cta.usageCount !== 'number' || cta.usageCount < 0) {
                throw new Error(`Invalid usage count at index ${index}: must be a non-negative number`);
            }
        });
        
        // Validate metrics if enabled
        if (this.securitySettings.validateMetrics) {
            this.validateMetricConsistency(data);
        }
    }

    validateMetricConsistency(data) {
        // Validate metric consistency
        data.ctas.forEach((cta, index) => {
            // Check for statistical significance
            if (cta.usageCount < this.config.minUsageThreshold) {
                console.warn(`CTA at index ${index} has insufficient usage data (${cta.usageCount} < ${this.config.minUsageThreshold})`);
            }
            
            // Validate rate calculations
            if (cta.responseRate && cta.responses && cta.usageCount) {
                const calculatedRate = (cta.responses / cta.usageCount) * 100;
                const difference = Math.abs(calculatedRate - cta.responseRate);
                
                if (difference > 1) { // Allow 1% tolerance for rounding
                    console.warn(`Response rate inconsistency for CTA ${index}: calculated ${calculatedRate.toFixed(2)}%, reported ${cta.responseRate}%`);
                }
            }
        });
    }

    processCTAData(data) {
        // Process and sanitize CTA data
        const processedCTAs = data.ctas.map(cta => ({
            ...cta,
            // Sanitize text content
            text: this.securitySettings.sanitizeContent ? this.sanitizeCTAText(cta.text) : cta.text,
            // Add derived metrics
            performanceCategory: this.categorizeCTAPerformance(cta.effectiveness),
            improvementPotential: this.calculateImprovementPotential(cta),
            // Add security metadata
            id: cta.id || this.generateCTAId(cta.text),
            lastUpdated: cta.lastUpdated || new Date().toISOString()
        }));
        
        return {
            ...data,
            ctas: processedCTAs,
            processedAt: new Date().toISOString(),
            totalCTAs: processedCTAs.length
        };
    }

    sanitizeCTAText(text) {
        // Sanitize CTA text for security
        if (typeof text !== 'string') {
            return String(text);
        }
        
        return text
            .replace(/[<>\"'&]/g, '') // Remove potential XSS characters
            .substring(0, this.config.maxCTALength) // Limit length
            .trim();
    }

    categorizeCTAPerformance(effectiveness) {
        // Categorize CTA performance
        if (effectiveness >= this.effectivenessThresholds.excellent) return 'excellent';
        if (effectiveness >= this.effectivenessThresholds.good) return 'good';
        if (effectiveness >= this.effectivenessThresholds.average) return 'average';
        if (effectiveness >= this.effectivenessThresholds.poor) return 'poor';
        return 'very-poor';
    }

    calculateImprovementPotential(cta) {
        // Calculate improvement potential based on various factors
        let potential = 0;
        
        // Usage volume factor
        if (cta.usageCount > 100) potential += 20;
        else if (cta.usageCount > 50) potential += 15;
        else if (cta.usageCount > 20) potential += 10;
        
        // Performance gap factor
        const performanceGap = 100 - cta.effectiveness;
        potential += performanceGap * 0.5;
        
        // Recent activity factor
        if (cta.recentUsage > cta.usageCount * 0.3) potential += 10;
        
        return Math.min(100, Math.max(0, potential));
    }

    generateCTAId(text) {
        // Generate unique ID for CTA
        return `cta_${text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}_${Date.now()}`;
    }

    async displayCTAPerformance(data) {
        // Display ranked CTA performance based on current view mode
        switch (this.interactionState.viewMode) {
            case 'chart':
                await this.createCTAChart(data);
                break;
            case 'table':
                this.createCTATable(data);
                break;
            case 'grid':
                this.createCTAGrid(data);
                break;
            default:
                await this.createCTAChart(data);
        }
    }

    async createCTAChart(data) {
        // Create secure CTA performance visualization
        try {
            // Use Worker-calculated effectiveness scores
            const chartData = this.prepareChartData(data);
            
            // Get canvas context
            const canvas = this.container.querySelector('.cta-chart');
            if (!canvas) {
                throw new Error('CTA chart canvas not found');
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart
            if (this.chartInstance) {
                this.chartInstance.destroy();
            }
            
            // Create Chart.js instance
            this.chartInstance = new Chart(ctx, {
                ...this.chartConfig,
                data: chartData,
                options: {
                    ...this.chartConfig.options,
                    onClick: this.handleChartClick.bind(this),
                    onHover: this.handleChartHover.bind(this)
                }
            });
            
            // Display usage patterns and trends
            this.addTrendIndicators();
            
            // Enable secure drill-down capabilities
            this.enableSecureDrillDown();
            
            console.log('CTA chart created successfully');
            
        } catch (error) {
            console.error('CTA chart creation failed:', error);
            throw new Error(`Chart creation failed: ${error.message}`);
        }
    }

    prepareChartData(data) {
        // Prepare data for Chart.js visualization
        const sortedCTAs = this.sortCTAs(data.ctas);
        const limitedCTAs = sortedCTAs.slice(0, 20); // Show top 20 for chart readability
        
        return {
            labels: limitedCTAs.map(cta => this.truncateLabel(cta.text, 25)),
            datasets: [
                {
                    label: 'Effectiveness Score',
                    data: limitedCTAs.map(cta => cta.effectiveness),
                    backgroundColor: limitedCTAs.map(cta => this.getCTAColor(cta.performanceCategory)),
                    borderColor: limitedCTAs.map(cta => this.getCTABorderColor(cta.performanceCategory)),
                    borderWidth: 2,
                    hoverBackgroundColor: limitedCTAs.map(cta => this.getCTAHoverColor(cta.performanceCategory)),
                    hoverBorderWidth: 3
                },
                {
                    label: 'Usage Count (scaled)',
                    data: limitedCTAs.map(cta => this.scaleUsageForChart(cta.usageCount, data.maxUsage)),
                    type: 'line',
                    borderColor: '#FF6B35',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        };
    }

    sortCTAs(ctas) {
        // Sort CTAs based on current sort criteria
        const sortedCTAs = [...ctas];
        
        sortedCTAs.sort((a, b) => {
            let comparison = 0;
            
            switch (this.sortBy) {
                case 'effectiveness':
                    comparison = b.effectiveness - a.effectiveness;
                    break;
                case 'usage':
                    comparison = b.usageCount - a.usageCount;
                    break;
                case 'response_rate':
                    comparison = (b.responseRate || 0) - (a.responseRate || 0);
                    break;
                case 'conversion_rate':
                    comparison = (b.conversionRate || 0) - (a.conversionRate || 0);
                    break;
                case 'recent':
                    comparison = new Date(b.lastUpdated) - new Date(a.lastUpdated);
                    break;
                default:
                    comparison = b.effectiveness - a.effectiveness;
            }
            
            return this.sortDirection === 'desc' ? comparison : -comparison;
        });
        
        return sortedCTAs;
    }

    getCTAColor(category) {
        // Get color based on performance category
        const colors = {
            'excellent': '#10B981',    // Green
            'good': '#3B82F6',         // Blue
            'average': '#F59E0B',      // Orange
            'poor': '#EF4444',         // Red
            'very-poor': '#991B1B'     // Dark red
        };
        
        return colors[category] || colors.average;
    }

    getCTABorderColor(category) {
        // Get border color based on performance category
        const colors = {
            'excellent': '#059669',
            'good': '#2563EB',
            'average': '#D97706',
            'poor': '#DC2626',
            'very-poor': '#7F1D1D'
        };
        
        return colors[category] || colors.average;
    }

    getCTAHoverColor(category) {
        // Get hover color based on performance category
        const colors = {
            'excellent': 'rgba(16, 185, 129, 0.8)',
            'good': 'rgba(59, 130, 246, 0.8)',
            'average': 'rgba(245, 158, 11, 0.8)',
            'poor': 'rgba(239, 68, 68, 0.8)',
            'very-poor': 'rgba(153, 27, 27, 0.8)'
        };
        
        return colors[category] || colors.average;
    }

    scaleUsageForChart(usage, maxUsage) {
        // Scale usage count to fit chart (0-100 range)
        if (!maxUsage || maxUsage === 0) return 0;
        return (usage / maxUsage) * 100;
    }

    truncateLabel(text, maxLength) {
        // Truncate labels for chart display
        if (typeof text !== 'string') return String(text);
        
        return text.length > maxLength 
            ? text.substring(0, maxLength) + '...'
            : text;
    }

    addTrendIndicators() {
        // Add trend indicators to chart
        if (!this.chartInstance) return;
        
        // Add custom plugin for trend indicators
        // This would be implemented based on specific Chart.js version
    }

    enableSecureDrillDown() {
        // Enable secure drill-down capabilities
        if (!this.chartInstance) return;
        
        // Add secure interaction tracking
        this.chartInstance.canvas.addEventListener('mousemove', (event) => {
            this.trackChartInteraction(event);
        });
    }

    createCTATable(data) {
        // Create table view of CTA data
        const tableBody = this.container.querySelector('#cta-table-body');
        if (!tableBody) return;
        
        const sortedCTAs = this.sortCTAs(data.ctas);
        const filteredCTAs = this.filterCTAsByCategory(sortedCTAs);
        
        tableBody.innerHTML = filteredCTAs.map((cta, index) => `
            <tr class="cta-row" data-cta-id="${cta.id}" tabindex="0">
                <td class="cta-text-cell">
                    <div class="cta-text" title="${this.sanitizeCTAText(cta.text)}">
                        ${this.truncateLabel(cta.text, 50)}
                    </div>
                    <div class="cta-metadata">
                        <span class="cta-id">ID: ${cta.id.substring(0, 8)}</span>
                        <span class="cta-updated">Updated: ${this.formatDate(cta.lastUpdated)}</span>
                    </div>
                </td>
                <td class="cta-category">
                    <span class="category-badge category-${cta.category || 'other'}">
                        ${this.ctaCategories[cta.category] || 'Other'}
                    </span>
                </td>
                <td class="cta-usage">
                    <div class="usage-info">
                        <span class="usage-count">${cta.usageCount.toLocaleString()}</span>
                        ${cta.recentUsage ? `
                            <span class="recent-usage">+${cta.recentUsage} recent</span>
                        ` : ''}
                    </div>
                </td>
                <td class="cta-response-rate">
                    <div class="rate-display">
                        <span class="rate-value">${(cta.responseRate || 0).toFixed(1)}%</span>
                        ${cta.responseRateTrend ? `
                            <span class="trend-indicator trend-${cta.responseRateTrend}">
                                ${cta.responseRateTrend === 'up' ? '↗' : cta.responseRateTrend === 'down' ? '↘' : '→'}
                            </span>
                        ` : ''}
                    </div>
                </td>
                <td class="cta-effectiveness">
                    <div class="effectiveness-display">
                        <div class="effectiveness-bar">
                            <div class="effectiveness-fill effectiveness-${cta.performanceCategory}" 
                                 style="width: ${cta.effectiveness}%"></div>
                        </div>
                        <span class="effectiveness-value">${cta.effectiveness.toFixed(1)}%</span>
                    </div>
                </td>
                <td class="cta-actions">
                    <button class="action-btn details-btn" 
                            onclick="ctaTracker.showCTADetails('${cta.id}')"
                            title="View Details" aria-label="View CTA details">
                        👁️
                    </button>
                    <button class="action-btn analyze-btn"
                            onclick="ctaTracker.analyzeCTA('${cta.id}')"
                            title="Analyze Trends" aria-label="Analyze CTA trends">
                        📈
                    </button>
                    <button class="action-btn optimize-btn"
                            onclick="ctaTracker.optimizeCTA('${cta.id}')"
                            title="Get Suggestions" aria-label="Get optimization suggestions">
                        🎯
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Add table row event listeners
        this.setupTableEventListeners();
    }

    createCTAGrid(data) {
        // Create grid view of CTA data
        const gridContainer = this.container.querySelector('#cta-grid');
        if (!gridContainer) return;
        
        const sortedCTAs = this.sortCTAs(data.ctas);
        const filteredCTAs = this.filterCTAsByCategory(sortedCTAs);
        
        gridContainer.innerHTML = filteredCTAs.map(cta => `
            <div class="cta-card" data-cta-id="${cta.id}" tabindex="0">
                <div class="card-header">
                    <div class="effectiveness-score effectiveness-${cta.performanceCategory}">
                        ${cta.effectiveness.toFixed(0)}%
                    </div>
                    <div class="card-actions">
                        <button class="card-action" onclick="ctaTracker.showCTADetails('${cta.id}')" 
                                title="View Details" aria-label="View details">
                            👁️
                        </button>
                        <button class="card-action" onclick="ctaTracker.optimizeCTA('${cta.id}')"
                                title="Optimize" aria-label="Get optimization suggestions">
                            🎯
                        </button>
                    </div>
                </div>
                
                <div class="card-content">
                    <div class="cta-text-preview">
                        "${this.truncateLabel(cta.text, 80)}"
                    </div>
                    
                    <div class="card-metrics">
                        <div class="metric">
                            <span class="metric-label">Usage:</span>
                            <span class="metric-value">${cta.usageCount.toLocaleString()}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Response:</span>
                            <span class="metric-value">${(cta.responseRate || 0).toFixed(1)}%</span>
                        </div>
                        ${cta.conversionRate ? `
                            <div class="metric">
                                <span class="metric-label">Conversion:</span>
                                <span class="metric-value">${cta.conversionRate.toFixed(1)}%</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-tags">
                        <span class="category-tag">${this.ctaCategories[cta.category] || 'Other'}</span>
                        ${cta.improvementPotential > 70 ? '<span class="improvement-tag">High Potential</span>' : ''}
                        ${cta.usageCount > 100 ? '<span class="volume-tag">High Volume</span>' : ''}
                    </div>
                </div>
                
                <div class="card-footer">
                    <div class="performance-indicator performance-${cta.performanceCategory}">
                        ${cta.performanceCategory.replace('-', ' ').toUpperCase()}
                    </div>
                    <div class="last-updated">
                        ${this.formatDate(cta.lastUpdated)}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add grid event listeners
        this.setupGridEventListeners();
    }

    filterCTAsByCategory(ctas) {
        // Filter CTAs by selected category
        if (this.interactionState.selectedCategory === 'all') {
            return ctas;
        }
        
        return ctas.filter(cta => cta.category === this.interactionState.selectedCategory);
    }

    setupTableEventListeners() {
        // Setup event listeners for table rows
        const rows = this.container.querySelectorAll('.cta-row');
        
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
                    const ctaId = row.dataset.ctaId;
                    this.selectCTA(ctaId);
                }
            });
            
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const ctaId = row.dataset.ctaId;
                    this.showCTADetails(ctaId);
                    e.preventDefault();
                }
            });
        });
    }

    setupGridEventListeners() {
        // Setup event listeners for grid cards
        const cards = this.container.querySelectorAll('.cta-card');
        
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.card-action')) {
                    const ctaId = card.dataset.ctaId;
                    this.selectCTA(ctaId);
                }
            });
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const ctaId = card.dataset.ctaId;
                    this.showCTADetails(ctaId);
                    e.preventDefault();
                }
            });
        });
    }

    async updateCTAData(newData) {
        // Update CTA tracking with secure data
        try {
            // Process Worker-validated CTA metrics
            this.validateCTAData(newData);
            
            const processedData = this.processCTAData(newData);
            
            // Update ranking and trend calculations
            await this.updateRankingsAndTrends(processedData);
            
            // Refresh current view
            await this.displayCTAPerformance(processedData);
            
            // Refresh recommendation displays
            this.generateRecommendations(processedData);
            
            // Update statistics
            this.updateStatistics(processedData);
            
            // Update current data
            this.currentData = processedData;
            this.lastDataFetch = Date.now();
            
            // Log update
            this.logAuditEvent('cta_data_updated', {
                ctaCount: processedData.ctas?.length || 0,
                updateTime: Date.now()
            });
            
        } catch (error) {
            console.error('CTA data update failed:', error);
            this.showError(`Update failed: ${error.message}`);
        }
    }

    async updateRankingsAndTrends(data) {
        // Update ranking and trend calculations
        const previousData = this.currentData;
        
        if (previousData && previousData.ctas) {
            // Calculate ranking changes
            data.ctas.forEach(cta => {
                const previousCTA = previousData.ctas.find(prev => prev.id === cta.id);
                if (previousCTA) {
                    cta.effectivenessChange = cta.effectiveness - previousCTA.effectiveness;
                    cta.usageChange = cta.usageCount - previousCTA.usageCount;
                    cta.rankingChange = this.calculateRankingChange(cta, previousCTA, data.ctas, previousData.ctas);
                }
            });
        }
        
        // Calculate trend indicators
        this.calculateTrendIndicators(data);
    }

    calculateRankingChange(currentCTA, previousCTA, currentCTAs, previousCTAs) {
        // Calculate ranking change for CTA
        const currentRank = this.sortCTAs(currentCTAs).findIndex(cta => cta.id === currentCTA.id) + 1;
        const previousRank = this.sortCTAs(previousCTAs).findIndex(cta => cta.id === previousCTA.id) + 1;
        
        return previousRank - currentRank; // Positive means rank improved
    }

    calculateTrendIndicators(data) {
        // Calculate trend indicators for CTAs
        data.ctas.forEach(cta => {
            // Response rate trend
            if (cta.effectivenessChange) {
                if (cta.effectivenessChange > 5) {
                    cta.responseRateTrend = 'up';
                } else if (cta.effectivenessChange < -5) {
                    cta.responseRateTrend = 'down';
                } else {
                    cta.responseRateTrend = 'stable';
                }
            }
            
            // Usage trend
            if (cta.usageChange) {
                cta.usageTrend = cta.usageChange > 0 ? 'increasing' : 'decreasing';
            }
        });
    }

    updateStatistics(data) {
        // Update CTA tracker statistics
        const totalCTAsEl = this.container.querySelector('#total-ctas');
        const avgEffectivenessEl = this.container.querySelector('#avg-effectiveness');
        const topPerformerEl = this.container.querySelector('#top-performer');
        const improvementOpportunityEl = this.container.querySelector('#improvement-opportunity');
        
        if (!data.ctas || data.ctas.length === 0) return;
        
        // Calculate statistics
        const totalCTAs = data.ctas.length;
        const avgEffectiveness = data.ctas.reduce((sum, cta) => sum + cta.effectiveness, 0) / totalCTAs;
        const topPerformer = data.ctas.reduce((best, cta) => 
            cta.effectiveness > best.effectiveness ? cta : best
        );
        const highPotentialCTAs = data.ctas.filter(cta => cta.improvementPotential > 70).length;
        
        // Update display
        if (totalCTAsEl) {
            totalCTAsEl.textContent = totalCTAs.toLocaleString();
        }
        
        if (avgEffectivenessEl) {
            avgEffectivenessEl.textContent = `${avgEffectiveness.toFixed(1)}%`;
        }
        
        if (topPerformerEl) {
            topPerformerEl.textContent = `${this.truncateLabel(topPerformer.text, 30)} (${topPerformer.effectiveness.toFixed(1)}%)`;
        }
        
        if (improvementOpportunityEl) {
            improvementOpportunityEl.textContent = `${highPotentialCTAs} CTAs`;
        }
    }

    generateRecommendations(data) {
        // Generate optimization recommendations
        const recommendationsContainer = this.container.querySelector('#recommendations-list');
        if (!recommendationsContainer) return;
        
        const recommendations = this.analyzeAndGenerateRecommendations(data);
        
        if (recommendations.length === 0) {
            recommendationsContainer.innerHTML = '<p class="no-recommendations">No specific recommendations at this time.</p>';
            return;
        }
        
        recommendationsContainer.innerHTML = recommendations.map((rec, index) => `
            <div class="recommendation-item" data-priority="${rec.priority}">
                <div class="recommendation-header">
                    <span class="recommendation-icon">${rec.icon}</span>
                    <span class="recommendation-title">${rec.title}</span>
                    <span class="recommendation-priority priority-${rec.priority}">${rec.priority}</span>
                </div>
                <div class="recommendation-content">
                    <p class="recommendation-description">${rec.description}</p>
                    ${rec.action ? `
                        <button class="recommendation-action" onclick="ctaTracker.executeRecommendation('${index}')">
                            ${rec.action.text}
                        </button>
                    ` : ''}
                </div>
                ${rec.impact ? `
                    <div class="recommendation-impact">
                        Expected impact: ${rec.impact}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    analyzeAndGenerateRecommendations(data) {
        // Analyze data and generate specific recommendations
        const recommendations = [];
        
        // Find underperforming high-usage CTAs
        const underperformingHighUsage = data.ctas.filter(cta => 
            cta.usageCount > 50 && cta.effectiveness < 40
        );
        
        if (underperformingHighUsage.length > 0) {
            recommendations.push({
                icon: '⚠️',
                title: 'Optimize High-Usage Underperformers',
                description: `${underperformingHighUsage.length} frequently used CTAs are performing below average. Consider A/B testing variations.`,
                priority: 'high',
                action: {
                    text: 'Review CTAs',
                    handler: () => this.reviewUnderperformers(underperformingHighUsage)
                },
                impact: '+15-25% effectiveness improvement'
            });
        }
        
        // Find top performers to replicate
        const topPerformers = data.ctas.filter(cta => cta.effectiveness > 80).slice(0, 3);
        
        if (topPerformers.length > 0) {
            recommendations.push({
                icon: '🎯',
                title: 'Replicate Top Performer Patterns',
                description: `Analyze common elements from your ${topPerformers.length} best-performing CTAs to improve others.`,
                priority: 'medium',
                action: {
                    text: 'Analyze Patterns',
                    handler: () => this.analyzeTopPerformerPatterns(topPerformers)
                },
                impact: '+10-20% overall effectiveness'
            });
        }
        
        // Find CTAs with high improvement potential
        const highPotential = data.ctas.filter(cta => cta.improvementPotential > 70);
        
        if (highPotential.length > 0) {
            recommendations.push({
                icon: '🚀',
                title: 'Focus on High-Potential CTAs',
                description: `${highPotential.length} CTAs show high improvement potential based on usage patterns and current performance.`,
                priority: 'medium',
                action: {
                    text: 'Prioritize Optimization',
                    handler: () => this.prioritizeHighPotential(highPotential)
                },
                impact: '+20-30% ROI on optimization efforts'
            });
        }
        
        // Check for category imbalances
        const categoryStats = this.analyzeCategoryPerformance(data.ctas);
        const underperformingCategories = Object.entries(categoryStats)
            .filter(([category, stats]) => stats.avgEffectiveness < 50)
            .map(([category]) => category);
        
        if (underperformingCategories.length > 0) {
            recommendations.push({
                icon: '📊',
                title: 'Address Category Weaknesses',
                description: `Categories ${underperformingCategories.join(', ')} are underperforming. Consider different approaches for these CTA types.`,
                priority: 'low',
                action: {
                    text: 'Review Categories',
                    handler: () => this.reviewCategories(underperformingCategories)
                },
                impact: '+5-15% category-specific improvement'
            });
        }
        
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    analyzeCategoryPerformance(ctas) {
        // Analyze performance by CTA category
        const categoryStats = {};
        
        ctas.forEach(cta => {
            const category = cta.category || 'other';
            if (!categoryStats[category]) {
                categoryStats[category] = {
                    count: 0,
                    totalEffectiveness: 0,
                    totalUsage: 0,
                    ctas: []
                };
            }
            
            categoryStats[category].count++;
            categoryStats[category].totalEffectiveness += cta.effectiveness;
            categoryStats[category].totalUsage += cta.usageCount;
            categoryStats[category].ctas.push(cta);
        });
        
        // Calculate averages
        Object.values(categoryStats).forEach(stats => {
            stats.avgEffectiveness = stats.totalEffectiveness / stats.count;
            stats.avgUsage = stats.totalUsage / stats.count;
        });
        
        return categoryStats;
    }

    switchView(viewMode) {
        // Switch between chart, table, and grid views
        this.interactionState.viewMode = viewMode;
        
        // Hide all views
        const views = ['chart-view', 'table-view', 'grid-view'];
        views.forEach(view => {
            const element = this.container.querySelector(`#${view}`);
            if (element) element.style.display = 'none';
        });
        
        // Show selected view
        const activeView = this.container.querySelector(`#${viewMode}-view`);
        if (activeView) activeView.style.display = 'block';
        
        // Update view toggle buttons
        const buttons = this.container.querySelectorAll('.view-toggle');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });
        
        // Re-render if we have data
        if (this.currentData) {
            this.displayCTAPerformance(this.currentData);
        }
        
        // Log view change
        this.logAuditEvent('view_changed', { viewMode });
    }

    applyFiltersAndSort() {
        // Apply filters and re-sort CTAs
        if (this.currentData) {
            this.updateDebounced(this.currentData);
        }
    }

    async _updateInternal(data) {
        // Internal update method (debounced)
        await this.displayCTAPerformance(data);
        this.updateStatistics(data);
        this.generateRecommendations(data);
    }

    handleChartClick(event, activeElements) {
        // Handle chart click interactions
        try {
            if (!activeElements || activeElements.length === 0) return;
            
            const element = activeElements[0];
            const ctaIndex = element.index;
            const cta = this.currentData?.ctas[ctaIndex];
            
            if (!cta) return;
            
            this.showCTADetails(cta.id);
            
            // Log interaction
            this.logAuditEvent('chart_cta_clicked', {
                ctaId: cta.id,
                ctaText: cta.text.substring(0, 50),
                effectiveness: cta.effectiveness
            });
            
        } catch (error) {
            console.error('Chart click handling failed:', error);
        }
    }

    handleChartHover(event, activeElements) {
        // Handle chart hover interactions
        try {
            if (!activeElements || activeElements.length === 0) {
                this.clearChartHover();
                return;
            }
            
            const element = activeElements[0];
            const ctaIndex = element.index;
            const cta = this.currentData?.ctas[ctaIndex];
            
            if (!cta) return;
            
            // Update hover state
            this.interactionState.hoveredCTA = cta;
            
            // Show custom tooltip
            this.showCTATooltip(event, cta);
            
        } catch (error) {
            console.error('Chart hover handling failed:', error);
        }
    }

    trackChartInteraction(event) {
        // Track chart interactions for analytics
        if (this.securitySettings.logInteractions) {
            // Throttled interaction tracking
            if (!this.interactionThrottle) {
                this.interactionThrottle = setTimeout(() => {
                    this.logAuditEvent('chart_interaction', {
                        x: event.offsetX,
                        y: event.offsetY,
                        timestamp: Date.now()
                    });
                    this.interactionThrottle = null;
                }, 2000);
            }
        }
    }

    showCTATooltip(event, cta) {
        // Show custom CTA tooltip
        const tooltip = this.container.querySelector('.cta-tooltip');
        const tooltipContent = tooltip?.querySelector('.tooltip-content');
        
        if (!tooltip || !tooltipContent) return;
        
        tooltipContent.innerHTML = `
            <div class="tooltip-header">
                <strong>CTA Performance</strong>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-text">"${this.truncateLabel(cta.text, 60)}"</div>
                <div class="tooltip-metrics">
                    <div class="metric">
                        <span>Effectiveness:</span>
                        <span class="effectiveness-${cta.performanceCategory}">${cta.effectiveness.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span>Usage Count:</span>
                        <span>${cta.usageCount.toLocaleString()}</span>
                    </div>
                    <div class="metric">
                        <span>Response Rate:</span>
                        <span>${(cta.responseRate || 0).toFixed(1)}%</span>
                    </div>
                    ${cta.conversionRate ? `
                        <div class="metric">
                            <span>Conversion Rate:</span>
                            <span>${cta.conversionRate.toFixed(1)}%</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Position and show tooltip
        this.positionTooltip(tooltip, event);
        tooltip.style.display = 'block';
        
        // Auto-hide timeout
        this.clearTooltipTimeout();
        this.tooltipTimeout = setTimeout(() => this.hideCTATooltip(), 4000);
    }

    positionTooltip(tooltip, event) {
        // Position tooltip near cursor
        const rect = this.container.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let x = event.clientX - rect.left + 15;
        let y = event.clientY - rect.top - tooltipRect.height - 15;
        
        // Keep tooltip within bounds
        if (x + tooltipRect.width > rect.width) {
            x = event.clientX - rect.left - tooltipRect.width - 15;
        }
        
        if (y < 0) {
            y = event.clientY - rect.top + 15;
        }
        
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    hideCTATooltip() {
        // Hide CTA tooltip
        const tooltip = this.container.querySelector('.cta-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        
        this.clearTooltipTimeout();
    }

    clearTooltipTimeout() {
        // Clear tooltip timeout
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }

    clearChartHover() {
        // Clear chart hover state
        this.interactionState.hoveredCTA = null;
        this.hideCTATooltip();
    }

    selectCTA(ctaId) {
        // Select a specific CTA
        const cta = this.currentData?.ctas.find(c => c.id === ctaId);
        if (!cta) return;
        
        this.selectedCTA = cta;
        
        // Update visual selection
        this.updateVisualSelection(ctaId);
        
        // Log selection
        this.logAuditEvent('cta_selected', {
            ctaId,
            ctaText: cta.text.substring(0, 50)
        });
    }

    updateVisualSelection(ctaId) {
        // Update visual selection indicators
        // Remove previous selections
        this.container.querySelectorAll('.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to current CTA
        const selectedElement = this.container.querySelector(`[data-cta-id="${ctaId}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
    }

    clearSelection() {
        // Clear CTA selection
        this.selectedCTA = null;
        this.container.querySelectorAll('.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    showCTADetails(ctaId) {
        // Show detailed CTA information
        const cta = this.currentData?.ctas.find(c => c.id === ctaId);
        if (!cta) return;
        
        const modal = this.container.querySelector('.cta-details-modal');
        const modalBody = this.container.querySelector('#cta-details-body');
        
        if (!modal || !modalBody) return;
        
        modalBody.innerHTML = `
            <div class="details-section">
                <h5>CTA Content</h5>
                <div class="cta-full-text">"${this.sanitizeCTAText(cta.text)}"</div>
                <div class="cta-metadata">
                    <span class="metadata-item">ID: ${cta.id}</span>
                    <span class="metadata-item">Category: ${this.ctaCategories[cta.category] || 'Other'}</span>
                    <span class="metadata-item">Last Updated: ${this.formatDate(cta.lastUpdated)}</span>
                </div>
            </div>
            
            <div class="details-section">
                <h5>Performance Metrics</h5>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value effectiveness-${cta.performanceCategory}">
                            ${cta.effectiveness.toFixed(1)}%
                        </div>
                        <div class="metric-label">Effectiveness Score</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${cta.usageCount.toLocaleString()}</div>
                        <div class="metric-label">Total Usage</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${(cta.responseRate || 0).toFixed(1)}%</div>
                        <div class="metric-label">Response Rate</div>
                    </div>
                    ${cta.conversionRate ? `
                        <div class="metric-card">
                            <div class="metric-value">${cta.conversionRate.toFixed(1)}%</div>
                            <div class="metric-label">Conversion Rate</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${cta.improvementPotential > 50 ? `
                <div class="details-section">
                    <h5>Improvement Opportunities</h5>
                    <div class="improvement-analysis">
                        <div class="improvement-score">
                            Improvement Potential: <strong>${cta.improvementPotential.toFixed(0)}%</strong>
                        </div>
                        <div class="improvement-suggestions">
                           ${this.generateCTAImprovementSuggestions(cta).map(suggestion => 
                                `<div class="suggestion-item">
                                    <span class="suggestion-icon">${suggestion.icon}</span>
                                    <span class="suggestion-text">${suggestion.text}</span>
                                </div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${cta.historicalData ? `
                <div class="details-section">
                    <h5>Performance Trends</h5>
                    <div class="trends-analysis">
                        ${cta.effectivenessChange ? `
                            <div class="trend-item">
                                <span class="trend-label">Effectiveness Change:</span>
                                <span class="trend-value trend-${cta.effectivenessChange > 0 ? 'positive' : 'negative'}">
                                    ${cta.effectivenessChange > 0 ? '+' : ''}${cta.effectivenessChange.toFixed(1)}%
                                </span>
                            </div>
                        ` : ''}
                        ${cta.usageChange ? `
                            <div class="trend-item">
                                <span class="trend-label">Usage Change:</span>
                                <span class="trend-value trend-${cta.usageChange > 0 ? 'positive' : 'negative'}">
                                    ${cta.usageChange > 0 ? '+' : ''}${cta.usageChange}
                                </span>
                            </div>
                        ` : ''}
                        ${cta.rankingChange ? `
                            <div class="trend-item">
                                <span class="trend-label">Ranking Change:</span>
                                <span class="trend-value trend-${cta.rankingChange > 0 ? 'positive' : 'negative'}">
                                    ${cta.rankingChange > 0 ? 'Up' : 'Down'} ${Math.abs(cta.rankingChange)} positions
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="details-actions">
                <button class="action-button primary" onclick="ctaTracker.optimizeCTA('${cta.id}')">
                    🎯 Get Optimization Suggestions
                </button>
                <button class="action-button secondary" onclick="ctaTracker.analyzeCTA('${cta.id}')">
                    📈 Analyze Trends
                </button>
                <button class="action-button secondary" onclick="ctaTracker.exportCTAData('${cta.id}')">
                    📥 Export Data
                </button>
            </div>
        `;
        
        // Show modal
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus management
        const closeButton = modal.querySelector('.modal-close');
        if (closeButton) {
            closeButton.focus();
        }
        
        // Log details view
        this.logAuditEvent('cta_details_viewed', {
            ctaId: cta.id,
            effectiveness: cta.effectiveness
        });
    }

    generateCTAImprovementSuggestions(cta) {
        // Generate specific improvement suggestions for CTA
        const suggestions = [];
        
        // Low effectiveness suggestions
        if (cta.effectiveness < 40) {
            suggestions.push({
                icon: '✏️',
                text: 'Consider rewriting with more action-oriented language'
            });
            suggestions.push({
                icon: '🎯',
                text: 'Add urgency or scarcity elements'
            });
        }
        
        // High usage, low performance suggestions
        if (cta.usageCount > 100 && cta.effectiveness < 60) {
            suggestions.push({
                icon: '🔄',
                text: 'A/B test variations of this high-traffic CTA'
            });
            suggestions.push({
                icon: '📊',
                text: 'Analyze response patterns by lead type'
            });
        }
        
        // Category-specific suggestions
        if (cta.category === 'meeting' && cta.responseRate < 30) {
            suggestions.push({
                icon: '📅',
                text: 'Try offering specific time slots or calendar links'
            });
        }
        
        if (cta.category === 'demo' && cta.effectiveness < 50) {
            suggestions.push({
                icon: '🎬',
                text: 'Emphasize the value and brevity of the demo'
            });
        }
        
        // Length-based suggestions
        if (cta.text.length > 100) {
            suggestions.push({
                icon: '✂️',
                text: 'Consider shortening the message for better impact'
            });
        }
        
        return suggestions.slice(0, 4); // Limit to 4 suggestions
    }

    hideDetailsModal() {
        // Hide CTA details modal
        const modal = this.container.querySelector('.cta-details-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    async optimizeCTA(ctaId) {
        // Get optimization suggestions for specific CTA
        try {
            const cta = this.currentData?.ctas.find(c => c.id === ctaId);
            if (!cta) return;
            
            // This would typically call a Worker endpoint for AI optimization suggestions
            const optimizationSuggestions = await this.getOptimizationSuggestions(cta);
            
            // Show optimization modal or inline suggestions
            this.showOptimizationSuggestions(cta, optimizationSuggestions);
            
            this.logAuditEvent('cta_optimization_requested', { ctaId });
            
        } catch (error) {
            console.error('CTA optimization failed:', error);
            this.showError(`Optimization failed: ${error.message}`);
        }
    }

    async getOptimizationSuggestions(cta) {
        // Get AI-powered optimization suggestions (placeholder)
        // In real implementation, this would call the secure Claude service
        return {
            suggestions: [
                {
                    type: 'rewrite',
                    title: 'Alternative Phrasing',
                    content: 'Try a more direct approach with stronger action words',
                    expectedImprovement: '15-25%'
                },
                {
                    type: 'timing',
                    title: 'Optimal Timing',
                    content: 'This CTA performs better when sent between 2-4 PM',
                    expectedImprovement: '10-15%'
                },
                {
                    type: 'personalization',
                    title: 'Personalization',
                    content: 'Add recipient-specific details for higher engagement',
                    expectedImprovement: '20-30%'
                }
            ]
        };
    }

    showOptimizationSuggestions(cta, suggestions) {
        // Show optimization suggestions (placeholder implementation)
        console.log('Optimization suggestions for CTA:', cta.text);
        console.log('Suggestions:', suggestions);
        
        // In real implementation, this would show a dedicated optimization modal
        alert(`Optimization suggestions generated for: "${cta.text.substring(0, 50)}..."`);
    }

    async analyzeCTA(ctaId) {
        // Analyze CTA trends and patterns
        try {
            const cta = this.currentData?.ctas.find(c => c.id === ctaId);
            if (!cta) return;
            
            // This would typically fetch detailed analytics from Worker
            const analyticsData = await this.getCTAAnalytics(cta);
            
            // Show analysis results
            this.showCTAAnalysis(cta, analyticsData);
            
            this.logAuditEvent('cta_analysis_requested', { ctaId });
            
        } catch (error) {
            console.error('CTA analysis failed:', error);
            this.showError(`Analysis failed: ${error.message}`);
        }
    }

    async getCTAAnalytics(cta) {
        // Get detailed CTA analytics (placeholder)
        return {
            timeSeriesData: [],
            segmentBreakdown: {},
            performanceFactors: []
        };
    }

    showCTAAnalysis(cta, analytics) {
        // Show CTA analysis results (placeholder implementation)
        console.log('Analysis for CTA:', cta.text);
        console.log('Analytics:', analytics);
        
        alert(`Detailed analysis generated for: "${cta.text.substring(0, 50)}..."`);
    }

    async exportCTAData(ctaId = null) {
        // Export CTA data
        try {
            let exportData;
            
            if (ctaId) {
                // Export single CTA
                const cta = this.currentData?.ctas.find(c => c.id === ctaId);
                if (!cta) throw new Error('CTA not found');
                
                exportData = {
                    type: 'single_cta',
                    cta: cta,
                    exportedAt: new Date().toISOString()
                };
            } else {
                // Export all CTAs
                exportData = {
                    type: 'all_ctas',
                    ctas: this.currentData?.ctas || [],
                    statistics: this.calculateExportStatistics(),
                    filters: this.currentFilters,
                    exportedAt: new Date().toISOString()
                };
            }
            
            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cta-effectiveness-${ctaId || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.logAuditEvent('cta_data_exported', {
                type: ctaId ? 'single' : 'all',
                ctaId: ctaId || null,
                recordCount: ctaId ? 1 : (this.currentData?.ctas?.length || 0)
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError(`Export failed: ${error.message}`);
        }
    }

    calculateExportStatistics() {
        // Calculate statistics for export
        if (!this.currentData || !this.currentData.ctas) {
            return {};
        }
        
        const ctas = this.currentData.ctas;
        const effectivenessScores = ctas.map(cta => cta.effectiveness);
        
        return {
            totalCTAs: ctas.length,
            averageEffectiveness: effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length,
            maxEffectiveness: Math.max(...effectivenessScores),
            minEffectiveness: Math.min(...effectivenessScores),
            totalUsage: ctas.reduce((sum, cta) => sum + cta.usageCount, 0),
            categoryBreakdown: this.analyzeCategoryPerformance(ctas),
            highPerformers: ctas.filter(cta => cta.effectiveness > 80).length,
            lowPerformers: ctas.filter(cta => cta.effectiveness < 40).length
        };
    }

    executeRecommendation(recommendationIndex) {
        // Execute a specific recommendation
        console.log(`Executing recommendation ${recommendationIndex}`);
        // Implementation would depend on the specific recommendation type
    }

    reviewUnderperformers(ctas) {
        // Review underperforming CTAs
        console.log('Reviewing underperforming CTAs:', ctas);
    }

    analyzeTopPerformerPatterns(ctas) {
        // Analyze patterns in top performing CTAs
        console.log('Analyzing top performer patterns:', ctas);
    }

    prioritizeHighPotential(ctas) {
        // Prioritize high potential CTAs
        console.log('Prioritizing high potential CTAs:', ctas);
    }

    reviewCategories(categories) {
        // Review underperforming categories
        console.log('Reviewing categories:', categories);
    }

    setupAutoRefresh() {
        // Setup automatic data refresh
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (this.isDataStale()) {
                this.refresh();
            }
        }, this.config.refreshInterval);
    }

    isDataStale() {
        // Check if data needs refresh
        if (!this.lastDataFetch) return true;
        
        const age = Date.now() - this.lastDataFetch;
        return age > this.config.refreshInterval;
    }

    async refresh() {
        // Refresh CTA data
        try {
            await this.render(this.currentFilters);
        } catch (error) {
            console.error('CTA tracker refresh failed:', error);
            this.showError(`Refresh failed: ${error.message}`);
        }
    }

    async retry() {
        // Retry after error
        this.clearError();
        await this.refresh();
    }

    showSettings() {
        // Show CTA tracker settings
        console.log('CTA tracker settings - to be implemented');
    }

    showLoading() {
        // Show loading state
        this.isLoading = true;
        const loadingEl = this.container.querySelector('.tracker-loading');
        const contentEl = this.container.querySelector('.tracker-visualization');
        
        if (loadingEl) {
            loadingEl.style.display = 'flex';
            loadingEl.setAttribute('aria-hidden', 'false');
        }
        
        if (contentEl) {
            contentEl.style.opacity = '0.5';
        }
    }

    hideLoading() {
        // Hide loading state
        this.isLoading = false;
        const loadingEl = this.container.querySelector('.tracker-loading');
        const contentEl = this.container.querySelector('.tracker-visualization');
        
        if (loadingEl) {
            loadingEl.style.display = 'none';
            loadingEl.setAttribute('aria-hidden', 'true');
        }
        
        if (contentEl) {
            contentEl.style.opacity = '1';
        }
    }

    showError(message) {
        // Show error state
        const errorEl = this.container.querySelector('.tracker-error');
        const messageEl = this.container.querySelector('.error-message');
        
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.setAttribute('aria-hidden', 'false');
        }
        
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    clearError() {
        // Clear error state
        const errorEl = this.container.querySelector('.tracker-error');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.setAttribute('aria-hidden', 'true');
        }
    }

    formatDate(dateString) {
        // Format date for display
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    customTooltipHandler(context) {
        // Custom tooltip handler for Chart.js
        const tooltipModel = context.tooltip;
        
        if (tooltipModel.opacity === 0) {
            this.hideCTATooltip();
            return;
        }
        
        // Custom tooltip is handled by hover events
    }

    updatePerformanceMetrics(entry) {
        // Update performance metrics
        this.performanceMetrics.renderCount++;
        
        if (entry.name.includes('render')) {
            const renderTime = entry.duration;
            this.performanceMetrics.averageRenderTime = 
                (this.performanceMetrics.averageRenderTime + renderTime) / 2;
            this.performanceMetrics.lastRenderTime = renderTime;
        }
    }

    logAuditEvent(eventType, metadata = {}) {
        // Log events for audit trail
        const auditEntry = {
            timestamp: new Date().toISOString(),
            eventType,
            userId: window.OsliraApp?.user?.id,
            sessionId: window.OsliraApp?.session?.access_token?.substr(-8),
            component: 'SecureCTAEffectivenessTracker',
            metadata: {
                ...metadata,
                userAgent: navigator.userAgent.substr(0, 100),
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }
        };
        
        this.auditLog.push(auditEntry);
        
        // Keep only last 500 entries
        if (this.auditLog.length > 500) {
            this.auditLog = this.auditLog.slice(-500);
        }
        
        // Log to console in development
        if (window.OsliraApp?.config?.enableDebugLogging) {
            console.log('CTA tracker audit event:', auditEntry);
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

    getMetrics() {
        // Get CTA tracker performance metrics
        return {
            ...this.performanceMetrics,
            auditEventCount: this.auditLog.length,
            currentDataAge: this.lastDataFetch ? Date.now() - this.lastDataFetch : null,
            ctaCount: this.currentData?.ctas?.length || 0,
            selectedView: this.interactionState.viewMode,
            selectedCategory: this.interactionState.selectedCategory,
            sortBy: this.sortBy,
            isLoading: this.isLoading,
            hasData: !!this.currentData
        };
    }
    destroy() {
        // Clean up CTA tracker component
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }
        
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        this.clearTooltipTimeout();
        
        if (this.interactionThrottle) {
            clearTimeout(this.interactionThrottle);
            this.interactionThrottle = null;
        }
        
        // Clear data and state
        this.currentData = null;
        this.selectedCTA = null;
        this.interactionState = {
            hoveredCTA: null,
            expandedDetails: new Set(),
            selectedCategory: 'all',
            viewMode: 'chart'
        };
        
        // Clear audit log
        this.auditLog = [];
        
        console.log('SecureCTAEffectivenessTracker destroyed');
    }
}

// Make tracker available globally for onclick handlers
window.ctaTracker = null;
export { SecureCTAEffectivenessTracker };
