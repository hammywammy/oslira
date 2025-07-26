// ===== SECURE CRM PERFORMANCE COMPARATOR =====
class SecureCRMPerformanceComparator {
    constructor(container, secureAnalyticsService) {
        // Initialize secure CRM comparator
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        
        // CRM comparator configuration
        this.config = {
            maxCRMs: 10,
            refreshInterval: 60000, // 1 minute
            animationDuration: 800,
            debounceDelay: 300,
            minDataPoints: 5,
            confidenceThreshold: 0.8,
            rankingMetrics: ['conversion_rate', 'response_rate', 'quality_score', 'consistency_score']
        };
        
        // Chart and state management
        this.comparisonChart = null;
        this.rankingChart = null;
        this.trendChart = null;
        this.currentData = null;
        this.currentFilters = {};
        this.selectedCRM = null;
        this.sortBy = 'overall_score';
        this.sortDirection = 'desc';
        
        // CRM metrics and calculations
        this.metricsConfig = {
            conversion_rate: {
                label: 'Conversion Rate',
                description: 'Percentage of leads that convert to customers',
                format: 'percentage',
                weight: 0.30,
                color: '#10B981',
                icon: '📈'
            },
            response_rate: {
                label: 'Response Rate', 
                description: 'Percentage of outreach that receives responses',
                format: 'percentage',
                weight: 0.25,
                color: '#3B82F6',
                icon: '💬'
            },
            quality_score: {
                label: 'Lead Quality',
                description: 'Average quality score of leads from this CRM',
                format: 'score',
                weight: 0.25,
                color: '#8B5CF6',
                icon: '⭐'
            },
            consistency_score: {
                label: 'Data Consistency',
                description: 'Reliability and accuracy of CRM data',
                format: 'score',
                weight: 0.20,
                color: '#F59E0B',
                icon: '🎯'
            }
        };
        
        // Performance optimization
        this.isLoading = false;
        this.refreshTimer = null;
        this.updateDebounced = this.debounce(this._updateInternal.bind(this), this.config.debounceDelay);
        
        // Security and audit
        this.securitySettings = {
            sanitizeCRMNames: true,
            anonymizeMetrics: false,
            logComparisons: true,
            validateData: true
        };
        this.auditLog = [];
        
        // Setup secure analytics service connection
        this.setupServiceConnection();
        
        // Configure CRM comparison displays
        this.setupComparisonDisplays();
        
        // Initialize ranking visualizations
        this.setupRankingVisualizations();
        
        // Setup container
        this.setupContainer();
        
        console.log('SecureCRMPerformanceComparator initialized');
    }

    setupServiceConnection() {
        // Setup secure analytics service connection
        if (!this.analyticsService) {
            throw new Error('SecureAnalyticsService is required for CRM comparison');
        }
        
        // Validate required methods
        if (typeof this.analyticsService.getCRMPerformanceData !== 'function') {
            throw new Error('Analytics service missing getCRMPerformanceData method');
        }
        
        // Test connection
        this.testServiceConnection();
    }

    async testServiceConnection() {
        // Test service connection
        try {
            await this.analyticsService.getCRMPerformanceData({ 
                test: true, 
                limit: 1 
            });
            console.log('CRM comparator service connection verified');
        } catch (error) {
            console.warn('CRM service connection test failed:', error.message);
        }
    }

    setupComparisonDisplays() {
        // Configure CRM comparison displays
        this.comparisonConfig = {
            chartTypes: {
                radar: {
                    label: 'Multi-Metric Radar',
                    enabled: true,
                    responsive: true,
                    maintainAspectRatio: false
                },
                bar: {
                    label: 'Performance Bars',
                    enabled: true,
                    horizontal: true
                },
                scatter: {
                    label: 'Quality vs Volume',
                    enabled: true,
                    showTrendlines: true
                }
            },
            
            displayOptions: {
                showConfidence: true,
                showTrends: true,
                showDetails: true,
                animateTransitions: true,
                enableInteractions: true
            }
        };
    }

    setupRankingVisualizations() {
        // Initialize ranking visualizations
        this.rankingConfig = {
            displayModes: {
                table: {
                    label: 'Ranking Table',
                    sortable: true,
                    filterable: true,
                    expandable: true
                },
                leaderboard: {
                    label: 'Leaderboard',
                    showMedals: true,
                    showScores: true,
                    animated: true
                },
                grid: {
                    label: 'Performance Grid',
                    showThumbnails: true,
                    showMetrics: true
                }
            },
            
            sortingOptions: {
                overall_score: 'Overall Performance',
                conversion_rate: 'Conversion Rate',
                response_rate: 'Response Rate',
                quality_score: 'Lead Quality',
                consistency_score: 'Data Consistency',
                total_leads: 'Total Leads',
                revenue_impact: 'Revenue Impact'
            }
        };
    }

    setupContainer() {
        // Setup CRM comparator container structure
        if (!this.container) {
            throw new Error('Container element is required for SecureCRMPerformanceComparator');
        }
        
        this.container.innerHTML = `
            <div class="crm-comparator-wrapper">
                <div class="comparator-header">
                    <div class="comparator-title">
                        <h3>🏆 CRM Performance Comparator</h3>
                        <span class="comparator-subtitle">Compare performance across CRM systems</span>
                    </div>
                    <div class="comparator-controls">
                        <select class="crm-filter" aria-label="Filter CRMs">
                            <option value="all">All CRMs</option>
                            <option value="active">Active Only</option>
                            <option value="high_volume">High Volume</option>
                        </select>
                        <select class="sort-selector" aria-label="Sort by metric">
                            <option value="overall_score">Overall Score</option>
                            <option value="conversion_rate">Conversion Rate</option>
                            <option value="response_rate">Response Rate</option>
                            <option value="quality_score">Quality Score</option>
                        </select>
                        <select class="view-selector" aria-label="Select view type">
                            <option value="radar">Radar Chart</option>
                            <option value="table">Ranking Table</option>
                            <option value="comparison">Side by Side</option>
                        </select>
                        <button class="comparator-refresh" title="Refresh Data" aria-label="Refresh CRM data">
                            🔄
                        </button>
                        <button class="comparator-export" title="Export Analysis" aria-label="Export CRM analysis">
                            📥
                        </button>
                        <button class="comparator-settings" title="Settings" aria-label="Comparator settings">
                            ⚙️
                        </button>
                    </div>
                </div>
                
                <div class="comparator-content">
                    <div class="comparator-loading" style="display: none;" role="status" aria-live="polite">
                        <div class="loading-spinner" aria-hidden="true"></div>
                        <span class="loading-text">Loading CRM performance data...</span>
                    </div>
                    
                    <div class="comparator-error" style="display: none;" role="alert">
                        <div class="error-icon" aria-hidden="true">⚠️</div>
                        <div class="error-content">
                            <h4>Unable to Load CRM Data</h4>
                            <p class="error-message"></p>
                            <button class="retry-btn">Retry</button>
                        </div>
                    </div>
                    
                    <div class="comparator-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="total-crms">--</div>
                            <div class="stat-label">Connected CRMs</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="top-performer">--</div>
                            <div class="stat-label">Top Performer</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="avg-conversion">--</div>
                            <div class="stat-label">Avg Conversion</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="performance-gap">--</div>
                            <div class="stat-label">Performance Gap</div>
                        </div>
                    </div>
                    
                    <div class="comparator-visualization">
                        <div class="radar-view" id="radar-view">
                            <div class="radar-container">
                                <canvas class="radar-chart" role="img" aria-label="CRM performance radar chart"></canvas>
                            </div>
                            <div class="radar-legend" id="radar-legend"></div>
                        </div>
                        
                        <div class="table-view" id="table-view" style="display: none;">
                            <div class="ranking-table-container">
                                <table class="ranking-table" role="table">
                                    <thead>
                                        <tr>
                                            <th class="sortable" data-sort="rank" role="columnheader">Rank</th>
                                            <th class="sortable" data-sort="name" role="columnheader">CRM System</th>
                                            <th class="sortable" data-sort="conversion_rate" role="columnheader">Conversion</th>
                                            <th class="sortable" data-sort="response_rate" role="columnheader">Response</th>
                                            <th class="sortable" data-sort="quality_score" role="columnheader">Quality</th>
                                            <th class="sortable" data-sort="overall_score" role="columnheader">Overall</th>
                                            <th role="columnheader">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="ranking-table-body">
                                        <!-- Rankings populated here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="comparison-view" id="comparison-view" style="display: none;">
                            <div class="comparison-grid" id="comparison-grid">
                                <!-- Side-by-side comparison -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="crm-insights" id="crm-insights">
                        <h4>📊 Performance Insights</h4>
                        <div class="insights-content" id="insights-content"></div>
                    </div>
                </div>
                
                <div class="crm-details-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h4>CRM Performance Details</h4>
                            <button class="modal-close" aria-label="Close details">×</button>
                        </div>
                        <div class="modal-body" id="crm-details-body"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Setup event listeners for comparator controls
        const refreshBtn = this.container.querySelector('.comparator-refresh');
        const exportBtn = this.container.querySelector('.comparator-export');
        const settingsBtn = this.container.querySelector('.comparator-settings');
        const retryBtn = this.container.querySelector('.retry-btn');
        const crmFilter = this.container.querySelector('.crm-filter');
        const sortSelector = this.container.querySelector('.sort-selector');
        const viewSelector = this.container.querySelector('.view-selector');
        const modalClose = this.container.querySelector('.modal-close');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportComparison());
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }
        
        if (crmFilter) {
            crmFilter.addEventListener('change', (e) => {
                this.applyFilter(e.target.value);
            });
        }
        
        if (sortSelector) {
            sortSelector.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applySorting();
            });
        }
        
        if (viewSelector) {
            viewSelector.addEventListener('change', (e) => {
                this.switchView(e.target.value);
            });
        }
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideCRMDetailsModal());
        }
        
        // Setup table sorting
        this.setupTableSorting();
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup resize observer
        this.setupResizeObserver();
    }

    setupTableSorting() {
        // Setup sortable table headers
        const sortableHeaders = this.container.querySelectorAll('.sortable');
        
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sort;
                
                if (this.sortBy === sortKey) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = sortKey;
                    this.sortDirection = 'desc';
                }
                
                this.applySorting();
                this.updateSortIndicators();
            });
        });
    }

    setupKeyboardNavigation() {
        // Setup keyboard navigation for accessibility
        this.container.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'Escape':
                    this.hideCRMDetailsModal();
                    this.clearSelection();
                    break;
                case 'Enter':
                case ' ':
                    if (this.selectedCRM) {
                        this.showCRMDetails(this.selectedCRM);
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
                if (this.comparisonChart) this.comparisonChart.resize();
                if (this.rankingChart) this.rankingChart.resize();
                if (this.trendChart) this.trendChart.resize();
            });
            
            this.resizeObserver.observe(this.container);
        }
    }

    async render(filters = {}) {
        // Render secure CRM performance comparison
        try {
            performance.mark('crm-comparator-render-start');
            
            this.currentFilters = { ...filters };
            this.showLoading();
            this.clearError();
            
            // Fetch CRM data via Worker endpoints
            const crmData = await this.fetchCRMData(filters);
            
            // Validate and process data
            this.validateCRMData(crmData);
            
            // Calculate rankings and scores server-side
            const processedData = await this.processCRMData(crmData);
            
            // Display interactive comparison charts
            await this.displayCRMComparison(processedData);
            
            // Update statistics
            this.updateStatistics(processedData);
            
            // Generate insights
            this.generateCRMInsights(processedData);
            
            // Update current data
            this.currentData = processedData;
            
            // Setup auto-refresh
            this.setupAutoRefresh();
            
            // Hide loading state
            this.hideLoading();
            
            performance.mark('crm-comparator-render-end');
            performance.measure('crm-comparator-render', 'crm-comparator-render-start', 'crm-comparator-render-end');
            
            // Log successful render
            this.logAuditEvent('crm_comparator_rendered', {
                filters,
                crmCount: processedData.crms?.length || 0,
                renderTime: Date.now()
            });
            
        } catch (error) {
            console.error('CRM comparator render failed:', error);
            this.showError(error.message);
            this.hideLoading();
            this.logAuditEvent('render_failed', { error: error.message, filters });
        }
    }

    async fetchCRMData(filters) {
        // Fetch CRM data via Worker endpoints
        try {
            const response = await this.analyticsService.getCRMPerformanceData({
                ...filters,
                includeMetrics: true,
                includeHistorical: true,
                includeBenchmarks: true,
                maxResults: this.config.maxCRMs,
                minDataPoints: this.config.minDataPoints
            });
            
            if (!response || !response.success) {
                throw new Error(response?.message || 'Invalid response from CRM analytics service');
            }
            
            return response.data;
            
        } catch (error) {
            console.error('CRM data fetch failed:', error);
            throw new Error(`Failed to fetch CRM data: ${error.message}`);
        }
    }

    validateCRMData(data) {
        // Validate CRM data structure
        if (!data || typeof data !== 'object') {
            throw new Error('CRM data must be an object');
        }
        
        if (!Array.isArray(data.crms)) {
            throw new Error('CRM data must contain a crms array');
        }
        
        // Validate CRM items
        data.crms.forEach((crm, index) => {
            if (!crm || typeof crm !== 'object') {
                throw new Error(`Invalid CRM item at index ${index}: must be an object`);
            }
            
            if (typeof crm.name !== 'string' || crm.name.length === 0) {
                throw new Error(`Invalid CRM name at index ${index}: must be a non-empty string`);
            }
            
            if (!crm.metrics || typeof crm.metrics !== 'object') {
                throw new Error(`Invalid CRM metrics at index ${index}: must be an object`);
            }
            
            // Validate required metrics
            Object.keys(this.metricsConfig).forEach(metric => {
                if (typeof crm.metrics[metric] !== 'number') {
                    console.warn(`Missing or invalid ${metric} for CRM ${crm.name}`);
                }
            });
        });
    }

    async processCRMData(data) {
        // Process and enrich CRM data
        const processedCRMs = data.crms.map(crm => ({
            ...crm,
            // Sanitize name if enabled
            name: this.securitySettings.sanitizeCRMNames ? this.sanitizeCRMName(crm.name) : crm.name,
            // Calculate overall score
            overallScore: this.calculateOverallScore(crm.metrics),
            // Calculate performance grades
            grades: this.calculatePerformanceGrades(crm.metrics),
            // Add confidence scores
            confidence: this.calculateConfidence(crm),
            // Add trend indicators
            trend: this.calculateTrend(crm.historical || []),
            // Add benchmark comparisons
            benchmarks: this.calculateBenchmarks(crm.metrics, data.benchmarks),
            // Add rank (will be calculated after sorting)
            rank: 0,
            // Add processed timestamp
            processedAt: new Date().toISOString()
        }));
        
        // Sort by overall score and assign ranks
        const rankedCRMs = this.assignRanks(processedCRMs);
        
        return {
            ...data,
            crms: rankedCRMs,
            summary: this.calculateSummaryStatistics(rankedCRMs),
            processedAt: new Date().toISOString()
        };
    }

    sanitizeCRMName(name) {
        // Sanitize CRM name for security
        return name.replace(/[<>\"'&]/g, '').trim().substring(0, 50);
    }

    calculateOverallScore(metrics) {
        // Calculate weighted overall score
        let totalScore = 0;
        let totalWeight = 0;
        
        Object.entries(this.metricsConfig).forEach(([metric, config]) => {
            const value = metrics[metric];
            if (typeof value === 'number' && !isNaN(value)) {
                // Normalize score to 0-100 scale
                const normalizedScore = Math.min(Math.max(value * 100, 0), 100);
                totalScore += normalizedScore * config.weight;
                totalWeight += config.weight;
            }
        });
        
        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }

    calculatePerformanceGrades(metrics) {
        // Calculate letter grades for each metric
        const grades = {};
        
        Object.entries(this.metricsConfig).forEach(([metric, config]) => {
            const value = metrics[metric] || 0;
            const normalizedValue = value * 100; // Convert to percentage
            
            if (normalizedValue >= 90) grades[metric] = 'A+';
            else if (normalizedValue >= 85) grades[metric] = 'A';
            else if (normalizedValue >= 80) grades[metric] = 'A-';
            else if (normalizedValue >= 75) grades[metric] = 'B+';
            else if (normalizedValue >= 70) grades[metric] = 'B';
            else if (normalizedValue >= 65) grades[metric] = 'B-';
            else if (normalizedValue >= 60) grades[metric] = 'C+';
            else if (normalizedValue >= 55) grades[metric] = 'C';
            else if (normalizedValue >= 50) grades[metric] = 'C-';
            else if (normalizedValue >= 40) grades[metric] = 'D';
            else grades[metric] = 'F';
        });
        
        return grades;
    }

    calculateConfidence(crm) {
        // Calculate confidence score based on data quality
        let confidenceFactors = [];
        
        // Data completeness
        const completeness = Object.keys(this.metricsConfig).filter(metric => 
            typeof crm.metrics[metric] === 'number'
        ).length / Object.keys(this.metricsConfig).length;
        confidenceFactors.push(completeness);
        
        // Data volume (if available)
        if (crm.dataPoints && crm.dataPoints > 0) {
            const volumeScore = Math.min(crm.dataPoints / this.config.minDataPoints, 1);
            confidenceFactors.push(volumeScore);
        }
        
        // Historical data availability
        if (crm.historical && crm.historical.length > 0) {
            confidenceFactors.push(0.9);
        } else {
            confidenceFactors.push(0.5);
        }
        
        return confidenceFactors.reduce((sum, factor) => sum + factor, 0) / confidenceFactors.length;
    }

    calculateTrend(historical) {
        // Calculate trend direction from historical data
        if (!historical || historical.length < 2) {
            return { direction: 'neutral', change: 0 };
        }
        
        const recent = historical.slice(-3); // Last 3 data points
        const older = historical.slice(0, -3);
        
        if (older.length === 0) {
            return { direction: 'neutral', change: 0 };
        }
        
        const recentAvg = recent.reduce((sum, val) => sum + val.overallScore, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val.overallScore, 0) / older.length;
        
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        return {
            direction: change > 2 ? 'up' : change < -2 ? 'down' : 'neutral',
            change: Math.round(change * 10) / 10
        };
    }

    calculateBenchmarks(metrics, benchmarks) {
        // Calculate benchmark comparisons
        if (!benchmarks) return {};
        
        const comparisons = {};
        
        Object.entries(this.metricsConfig).forEach(([metric, config]) => {
            const value = metrics[metric];
            const benchmark = benchmarks[metric];
            
            if (typeof value === 'number' && typeof benchmark === 'number') {
                const difference = ((value - benchmark) / benchmark) * 100;
                comparisons[metric] = {
                    benchmark: benchmark,
                    difference: Math.round(difference * 10) / 10,
                    performance: difference > 5 ? 'above' : difference < -5 ? 'below' : 'at'
                };
            }
        });
        
        return comparisons;
    }

    assignRanks(crms) {
        // Sort CRMs and assign ranks
        const sortedCRMs = [...crms].sort((a, b) => b.overallScore - a.overallScore);
        
        return sortedCRMs.map((crm, index) => ({
            ...crm,
            rank: index + 1
        }));
    }

    calculateSummaryStatistics(crms) {
        // Calculate summary statistics
        if (crms.length === 0) {
            return {
                totalCRMs: 0,
                avgConversion: 0,
                topPerformer: null,
                performanceGap: 0
            };
        }
        
        const conversionRates = crms.map(crm => crm.metrics.conversion_rate || 0);
        const avgConversion = conversionRates.reduce((sum, rate) => sum + rate, 0) / conversionRates.length;
        
        const topPerformer = crms[0]; // Already sorted
        const bottomPerformer = crms[crms.length - 1];
        const performanceGap = topPerformer.overallScore - bottomPerformer.overallScore;
        
        return {
            totalCRMs: crms.length,
            avgConversion: Math.round(avgConversion * 1000) / 10, // Convert to percentage
            topPerformer: topPerformer.name,
            performanceGap: Math.round(performanceGap)
        };
    }

    async updateCRMData(newData) {
        // Update CRM comparison with secure data
        try {
            // Process Worker-validated CRM metrics
            const processedData = await this.processCRMData(newData);
            
            // Update ranking calculations
            this.currentData = processedData;
            
            // Refresh comparison visualizations
            await this.displayCRMComparison(processedData);
            this.updateStatistics(processedData);
            this.generateCRMInsights(processedData);
            
            this.logAuditEvent('crm_data_updated', {
                crmCount: processedData.crms.length,
                updateTime: Date.now()
            });
            
        } catch (error) {
            console.error('CRM data update failed:', error);
            this.showError(`Failed to update CRM data: ${error.message}`);
        }
    }

    async displayCRMComparison(data) {
        // Display CRM comparison based on current view
        const viewSelector = this.container.querySelector('.view-selector');
        const currentView = viewSelector?.value || 'radar';
        
        switch (currentView) {
            case 'radar':
                await this.displayRadarView(data);
                break;
            case 'table':
                await this.displayTableView(data);
                break;
            case 'comparison':
                await this.displayComparisonView(data);
                break;
            default:
                await this.displayRadarView(data);
        }
    }

    async displayRadarView(data) {
        // Display radar chart view
        this.showView('radar-view');
        await this.createComparisonChart(data);
        this.updateRadarLegend(data);
    }

    async displayTableView(data) {
        // Display table ranking view
        this.showView('table-view');
        this.renderRankingTable(data);
    }

    async displayComparisonView(data) {
        // Display side-by-side comparison view
        this.showView('comparison-view');
        this.renderComparisonGrid(data);
    }

    showView(viewId) {
        // Show specific view and hide others
        const views = ['radar-view', 'table-view', 'comparison-view'];
        views.forEach(id => {
            const view = this.container.querySelector(`#${id}`);
            if (view) {
                view.style.display = id === viewId ? 'block' : 'none';
            }
        });
    }

    createComparisonChart(data) {
        // Create secure CRM comparison visualization
        try {
            const canvas = this.container.querySelector('.radar-chart');
            if (!canvas) {
                throw new Error('Radar chart canvas not found');
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart
            if (this.comparisonChart) {
                this.comparisonChart.destroy();
            }
            
            // Use Worker-calculated performance metrics
            const chartData = this.prepareRadarChartData(data);
            
            // Create Chart.js radar chart
            this.comparisonChart = new Chart(ctx, {
                type: 'radar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: this.config.animationDuration,
                        easing: 'easeInOutQuart'
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            min: 0,
                            ticks: {
                                stepSize: 20,
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: 'rgba(107, 114, 128, 0.3)'
                            },
                            angleLines: {
                                color: 'rgba(107, 114, 128, 0.3)'
                            },
                            pointLabels: {
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                },
                                color: '#374151'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: '600'
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: this.formatRadarTooltip.bind(this)
                            }
                        }
                    },
                    onClick: this.handleRadarChartClick.bind(this),
                    onHover: this.handleRadarChartHover.bind(this)
                }
            });
            
            // Display multi-metric radar charts
            this.addRadarInteractions();
            
            // Enable secure CRM analysis drill-down
            this.enableSecureCRMDrillDown();
            
            console.log('CRM comparison radar chart created successfully');
            
        } catch (error) {
            console.error('CRM comparison chart creation failed:', error);
            throw new Error(`Chart creation failed: ${error.message}`);
        }
    }

    prepareRadarChartData(data) {
        // Prepare radar chart data for Chart.js
        const labels = Object.values(this.metricsConfig).map(config => config.label);
        const datasets = [];
        
        // Get top performing CRMs (limit to 5 for readability)
        const topCRMs = data.crms.slice(0, 5);
        
        topCRMs.forEach((crm, index) => {
            const dataPoints = Object.keys(this.metricsConfig).map(metric => {
                const value = crm.metrics[metric] || 0;
                return Math.round(value * 100); // Convert to percentage
            });
            
            const color = this.getCRMColor(index);
            
            datasets.push({
                label: crm.name,
                data: dataPoints,
                borderColor: color,
                backgroundColor: color + '20', // Add transparency
                borderWidth: 2,
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.1
            });
        });
        
        return {
            labels,
            datasets
        };
    }

    getCRMColor(index) {
        // Get color for CRM dataset
        const colors = [
            '#3B82F6', // Blue
            '#10B981', // Green
            '#F59E0B', // Orange
            '#8B5CF6', // Purple
            '#EF4444', // Red
            '#06B6D4', // Cyan
            '#84CC16', // Lime
            '#F97316'  // Orange-red
        ];
        
        return colors[index % colors.length];
    }

    addRadarInteractions() {
        // Add interactive features to radar chart
        if (!this.comparisonChart) return;
        
        // Add custom interactions based on chart segments
        this.comparisonChart.canvas.addEventListener('mousemove', (event) => {
            this.trackRadarInteraction(event);
        });
    }

    enableSecureCRMDrillDown() {
        // Enable secure CRM analysis drill-down
        if (!this.comparisonChart) return;
        
        // Add secure interaction tracking
        this.comparisonChart.canvas.addEventListener('click', (event) => {
            this.handleSecureDrillDown(event);
        });
    }

    formatRadarTooltip(context) {
        // Format radar chart tooltip
        const datasetLabel = context.dataset.label;
        const value = context.parsed.r;
        const metricIndex = context.dataIndex;
        const metricKey = Object.keys(this.metricsConfig)[metricIndex];
        const metricConfig = this.metricsConfig[metricKey];
        
        return `${datasetLabel} - ${metricConfig.label}: ${value}%`;
    }

    handleRadarChartClick(event, elements) {
        // Handle radar chart click interactions
        if (elements.length === 0) return;
        
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const dataset = this.comparisonChart.data.datasets[datasetIndex];
        const crmName = dataset.label;
        
        // Find CRM data
        const crm = this.currentData.crms.find(c => c.name === crmName);
        if (crm) {
            this.selectCRM(crm);
        }
    }

    handleRadarChartHover(event, elements) {
        // Handle radar chart hover
        const canvas = this.comparisonChart.canvas;
        canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    }

    trackRadarInteraction(event) {
        // Track radar chart interactions for analytics
        if (this.securitySettings.logComparisons) {
            this.logAuditEvent('radar_chart_interaction', {
                timestamp: Date.now(),
                interaction: 'hover',
                coordinates: { x: event.offsetX, y: event.offsetY }
            });
        }
    }

    handleSecureDrillDown(event) {
        // Handle secure drill-down interactions
        // Implementation would check permissions and log access
        this.logAuditEvent('crm_drilldown_attempt', {
            timestamp: Date.now(),
            user: window.OsliraApp?.user?.id || 'anonymous'
        });
    }

    updateRadarLegend(data) {
        // Update radar chart legend with additional info
        const legend = this.container.querySelector('#radar-legend');
        if (!legend) return;
        
        legend.innerHTML = `
            <div class="radar-legend-content">
                <h5>CRM Performance Overview</h5>
                <div class="legend-metrics">
                    ${Object.entries(this.metricsConfig).map(([key, config]) => `
                        <div class="legend-metric">
                            <span class="metric-icon">${config.icon}</span>
                            <span class="metric-label">${config.label}</span>
                            <span class="metric-weight">${(config.weight * 100).toFixed(0)}%</span>
                        </div>
                    `).join('')}
                </div>
                <div class="legend-note">
                    <small>Charts show normalized performance scores (0-100%). Click on CRM names to view detailed analysis.</small>
                </div>
            </div>
        `;
    }

    renderRankingTable(data) {
        // Render CRM ranking table
        const tableBody = this.container.querySelector('#ranking-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = data.crms.map((crm, index) => `
            <tr class="ranking-row" data-crm-id="${crm.id || crm.name}" tabindex="0">
                <td class="rank-cell">
                    <div class="rank-badge rank-${crm.rank}">
                        ${crm.rank === 1 ? '🥇' : crm.rank === 2 ? '🥈' : crm.rank === 3 ? '🥉' : crm.rank}
                    </div>
                </td>
                <td class="crm-cell">
                    <div class="crm-info">
                        <span class="crm-name">${this.sanitizeCRMName(crm.name)}</span>
                        <div class="crm-meta">
                            <span class="confidence-indicator">
                                Confidence: ${(crm.confidence * 100).toFixed(0)}%
                            </span>
                            ${crm.trend.direction !== 'neutral' ? `
                                <span class="trend-indicator trend-${crm.trend.direction}">
                                    ${crm.trend.direction === 'up' ? '↗' : '↘'} ${Math.abs(crm.trend.change)}%
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </td>
                <td class="metric-cell">
                    <div class="metric-value">
                        ${(crm.metrics.conversion_rate * 100).toFixed(1)}%
                    </div>
                    <div class="metric-grade grade-${crm.grades.conversion_rate}">
                        ${crm.grades.conversion_rate}
                    </div>
                </td>
                <td class="metric-cell">
                    <div class="metric-value">
                        ${(crm.metrics.response_rate * 100).toFixed(1)}%
                    </div>
                    <div class="metric-grade grade-${crm.grades.response_rate}">
                        ${crm.grades.response_rate}
                    </div>
                </td>
                <td class="metric-cell">
                    <div class="metric-value">
                        ${crm.metrics.quality_score?.toFixed(1) || 'N/A'}
                    </div>
                    <div class="metric-grade grade-${crm.grades.quality_score}">
                        ${crm.grades.quality_score}
                    </div>
                </td>
                <td class="overall-cell">
                    <div class="overall-score score-${this.getScoreClass(crm.overallScore)}">
                        ${crm.overallScore}
                    </div>
                </td>
                <td class="actions-cell">
                    <button class="btn-small view-details" data-crm-id="${crm.id || crm.name}">
                        👁️ Details
                    </button>
                    <button class="btn-small compare-crm" data-crm-id="${crm.id || crm.name}">
                        ⚖️ Compare
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Add row interaction listeners
        this.setupTableRowListeners();
    }

    getScoreClass(score) {
        // Get CSS class for score color coding
        if (score >= 80) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 60) return 'average';
        if (score >= 50) return 'below-average';
        return 'poor';
    }

    setupTableRowListeners() {
        // Setup interaction listeners for table rows
        const rows = this.container.querySelectorAll('.ranking-row');
        const detailButtons = this.container.querySelectorAll('.view-details');
        const compareButtons = this.container.querySelectorAll('.compare-crm');
        
        rows.forEach(row => {
            row.addEventListener('click', () => {
                const crmId = row.dataset.crmId;
                this.selectCRM(this.findCRMById(crmId));
            });
            
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const crmId = row.dataset.crmId;
                    this.showCRMDetails(crmId);
                    e.preventDefault();
                }
            });
        });
        
        detailButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const crmId = button.dataset.crmId;
                this.showCRMDetails(crmId);
            });
        });
        
        compareButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const crmId = button.dataset.crmId;
                this.addToComparison(crmId);
            });
        });
    }

    renderComparisonGrid(data) {
        // Render side-by-side comparison grid
        const grid = this.container.querySelector('#comparison-grid');
        if (!grid) return;
        
        // Get top 3 CRMs for comparison
        const topCRMs = data.crms.slice(0, 3);
        
        grid.innerHTML = `
            <div class="comparison-header">
                <h5>Top 3 CRM Performance Comparison</h5>
                <div class="comparison-controls">
                    <button class="add-crm-btn">+ Add CRM</button>
                    <button class="export-comparison-btn">📥 Export</button>
                </div>
            </div>
            <div class="comparison-cards">
                ${topCRMs.map((crm, index) => `
                    <div class="crm-comparison-card ${index === 0 ? 'winner' : ''}">
                        <div class="card-header">
                            <div class="crm-rank">
                                ${index === 0 ? '🏆' : `#${crm.rank}`}
                            </div>
                            <h6>${this.sanitizeCRMName(crm.name)}</h6>
                            <div class="overall-score">${crm.overallScore}/100</div>
                        </div>
                        
                        <div class="metrics-breakdown">
                            ${Object.entries(this.metricsConfig).map(([key, config]) => `
                                <div class="metric-row">
                                    <span class="metric-icon">${config.icon}</span>
                                    <span class="metric-label">${config.label}</span>
                                    <div class="metric-bar">
                                        <div class="metric-fill" style="width: ${(crm.metrics[key] * 100)}%; background: ${config.color}"></div>
                                    </div>
                                    <span class="metric-value">${(crm.metrics[key] * 100).toFixed(1)}%</span>
                                    <span class="metric-grade">${crm.grades[key]}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="card-footer">
                            <div class="confidence-score">
                                Confidence: ${(crm.confidence * 100).toFixed(0)}%
                            </div>
                            <div class="trend-info">
                                ${crm.trend.direction !== 'neutral' ? `
                                    <span class="trend-${crm.trend.direction}">
                                        ${crm.trend.direction === 'up' ? '📈' : '📉'} ${Math.abs(crm.trend.change)}%
                                    </span>
                                ` : '<span class="trend-neutral">➡️ Stable</span>'}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Setup comparison card interactions
        this.setupComparisonCardListeners();
    }

    setupComparisonCardListeners() {
        // Setup interaction listeners for comparison cards
        const cards = this.container.querySelectorAll('.crm-comparison-card');
        const addBtn = this.container.querySelector('.add-crm-btn');
        const exportBtn = this.container.querySelector('.export-comparison-btn');
        
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const crmName = card.querySelector('h6').textContent;
                const crm = this.currentData.crms.find(c => c.name === crmName);
                if (crm) {
                    this.showCRMDetails(crm.id || crm.name);
                }
            });
        });
        
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showCRMSelector());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportComparison());
        }
    }

    updateStatistics(data) {
        // Update statistics display
        const totalCRMsEl = this.container.querySelector('#total-crms');
        const topPerformerEl = this.container.querySelector('#top-performer');
        const avgConversionEl = this.container.querySelector('#avg-conversion');
        const performanceGapEl = this.container.querySelector('#performance-gap');
        
        if (totalCRMsEl) {
            totalCRMsEl.textContent = data.summary.totalCRMs;
        }
        
        if (topPerformerEl) {
            topPerformerEl.textContent = data.summary.topPerformer || 'N/A';
        }
        
        if (avgConversionEl) {
            avgConversionEl.textContent = data.summary.avgConversion.toFixed(1) + '%';
        }
        
        if (performanceGapEl) {
            performanceGapEl.textContent = data.summary.performanceGap + ' pts';
        }
    }

    generateCRMInsights(data) {
        // Generate insights from CRM performance data
        const insights = this.analyzeCRMPerformance(data);
        this.displayCRMInsights(insights);
    }

    analyzeCRMPerformance(data) {
        // Analyze CRM performance patterns
        const insights = [];
        
        // Performance gap analysis
        const topPerformer = data.crms[0];
        const bottomPerformer = data.crms[data.crms.length - 1];
        const gap = topPerformer.overallScore - bottomPerformer.overallScore;
        
        if (gap > 30) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Large Performance Gap',
                description: `${gap} point gap between top and bottom performers suggests optimization opportunities`,
                priority: 'high',
                actionable: true
            });
        }
        
        // Trend analysis
        const improvingCRMs = data.crms.filter(crm => crm.trend.direction === 'up').length;
        const decliningCRMs = data.crms.filter(crm => crm.trend.direction === 'down').length;
        
        if (improvingCRMs > decliningCRMs) {
            insights.push({
                type: 'positive',
                icon: '📈',
                title: 'Positive Performance Trends',
                description: `${improvingCRMs} CRMs showing improvement vs ${decliningCRMs} declining`,
                priority: 'medium',
                actionable: false
            });
        }
        
        // Quality vs conversion correlation
        const qualityScores = data.crms.map(crm => crm.metrics.quality_score || 0);
        const conversionRates = data.crms.map(crm => crm.metrics.conversion_rate || 0);
        const correlation = this.calculateCorrelation(qualityScores, conversionRates);
        
        if (correlation > 0.7) {
            insights.push({
                type: 'insight',
                icon: '🎯',
                title: 'Strong Quality-Conversion Link',
                description: 'Higher lead quality strongly correlates with conversion rates',
                priority: 'medium',
                actionable: true
            });
        }
        
        // Top performer analysis
        if (topPerformer.overallScore > 85) {
            insights.push({
                type: 'success',
                icon: '🏆',
                title: 'Exceptional Performance',
                description: `${topPerformer.name} demonstrates best-in-class performance across metrics`,
                priority: 'low',
                actionable: false
            });
        }
        
        return insights;
    }

    calculateCorrelation(x, y) {
        // Calculate Pearson correlation coefficient
        const n = x.length;
        if (n === 0) return 0;
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    displayCRMInsights(insights) {
        // Display CRM performance insights
        const insightsContent = this.container.querySelector('#insights-content');
        if (!insightsContent) return;
        
        insightsContent.innerHTML = insights.map(insight => `
            <div class="insight-item insight-${insight.type}">
                <div class="insight-header">
                    <span class="insight-icon">${insight.icon}</span>
                    <span class="insight-title">${insight.title}</span>
                    <span class="insight-priority priority-${insight.priority}">${insight.priority}</span>
                </div>
                <div class="insight-description">${insight.description}</div>
                ${insight.actionable ? '<div class="insight-badge">Actionable</div>' : ''}
            </div>
        `).join('');
    }

    selectCRM(crm) {
        // Select CRM for detailed analysis
        this.selectedCRM = crm;
        
        // Update visual selection
        const rows = this.container.querySelectorAll('.ranking-row');
        rows.forEach(row => {
            const isSelected = row.dataset.crmId === (crm.id || crm.name);
            row.classList.toggle('selected', isSelected);
        });
        
        this.logAuditEvent('crm_selected', {
            crmName: crm.name,
            rank: crm.rank,
            timestamp: Date.now()
        });
    }

    findCRMById(crmId) {
        // Find CRM by ID
        return this.currentData?.crms.find(crm => 
            (crm.id || crm.name) === crmId
        );
    }

    showCRMDetails(crmId) {
        // Show detailed CRM analysis modal
        const crm = this.findCRMById(crmId);
        if (!crm) return;
        
        const modal = this.container.querySelector('.crm-details-modal');
        const modalBody = this.container.querySelector('#crm-details-body');
        
        if (!modal || !modalBody) return;
        
        modalBody.innerHTML = this.generateCRMDetailsHTML(crm);
        modal.style.display = 'flex';
        
        this.logAuditEvent('crm_details_viewed', {
            crmName: crm.name,
            timestamp: Date.now()
        });
    }

    generateCRMDetailsHTML(crm) {
        // Generate detailed HTML for CRM analysis
        return `
            <div class="crm-full-details">
                <div class="crm-overview">
                    <div class="crm-header">
                        <h5>${this.sanitizeCRMName(crm.name)}</h5>
                        <div class="crm-rank-badge rank-${crm.rank}">
                            Rank #${crm.rank}
                        </div>
                    </div>
                    <div class="overall-score-large">
                        <span class="score-value">${crm.overallScore}</span>
                        <span class="score-label">Overall Score</span>
                    </div>
                </div>
                
                <div class="metrics-detailed">
                    <h6>Performance Breakdown</h6>
                    <div class="metrics-grid">
                        ${Object.entries(this.metricsConfig).map(([key, config]) => `
                            <div class="metric-detail-card">
                                <div class="metric-header">
                                    <span class="metric-icon">${config.icon}</span>
                                    <span class="metric-name">${config.label}</span>
                                </div>
                                <div class="metric-score">
                                    <span class="score">${(crm.metrics[key] * 100).toFixed(1)}%</span>
                                    <span class="grade grade-${crm.grades[key]}">${crm.grades[key]}</span>
                                </div>
                                <div class="metric-bar-container">
                                    <div class="metric-bar">
                                        <div class="metric-fill" style="width: ${(crm.metrics[key] * 100)}%; background: ${config.color}"></div>
                                    </div>
                                </div>
                                ${crm.benchmarks[key] ? `
                                    <div class="benchmark-comparison">
                                        <span class="benchmark-label">vs Benchmark:</span>
                                        <span class="benchmark-value ${crm.benchmarks[key].performance}">
                                            ${crm.benchmarks[key].difference > 0 ? '+' : ''}${crm.benchmarks[key].difference}%
                                        </span>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="confidence-analysis">
                    <h6>Data Quality & Confidence</h6>
                    <div class="confidence-meter">
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${crm.confidence * 100}%"></div>
                        </div>
                        <span class="confidence-value">${(crm.confidence * 100).toFixed(0)}% Confidence</span>
                    </div>
                    <div class="confidence-factors">
                        <span>Based on data completeness, volume, and historical consistency</span>
                    </div>
                </div>
                
                ${crm.trend.direction !== 'neutral' ? `
                    <div class="trend-analysis">
                        <h6>Performance Trend</h6>
                        <div class="trend-indicator-large trend-${crm.trend.direction}">
                            <span class="trend-arrow">
                                ${crm.trend.direction === 'up' ? '📈' : '📉'}
                            </span>
                            <span class="trend-text">
                                ${crm.trend.direction === 'up' ? 'Improving' : 'Declining'} by ${Math.abs(crm.trend.change)}%
                            </span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="recommendations">
                    <h6>Recommendations</h6>
                    <div class="recommendations-list">
                        ${this.generateCRMRecommendations(crm).map(rec => `
                            <div class="recommendation-item">
                                <span class="rec-icon">${rec.icon}</span>
                                <span class="rec-text">${rec.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    generateCRMRecommendations(crm) {
        // Generate actionable recommendations for CRM
        const recommendations = [];
        
        // Low conversion rate
        if (crm.metrics.conversion_rate < 0.15) {
            recommendations.push({
                icon: '🎯',
                text: 'Focus on lead qualification to improve conversion rates'
            });
        }
        
        // Low response rate
        if (crm.metrics.response_rate < 0.20) {
            recommendations.push({
                icon: '💬',
                text: 'Review outreach messaging and timing strategies'
            });
        }
        
        // Low quality score
        if (crm.metrics.quality_score < 60) {
            recommendations.push({
                icon: '⭐',
                text: 'Implement better lead scoring and filtering'
            });
        }
        
        // Declining trend
        if (crm.trend.direction === 'down') {
            recommendations.push({
                icon: '📉',
                text: 'Investigate recent changes causing performance decline'
            });
        }
        
        // Low confidence
        if (crm.confidence < 0.7) {
            recommendations.push({
                icon: '📊',
                text: 'Improve data collection and tracking accuracy'
            });
        }
        
        // Default recommendation if no issues
        if (recommendations.length === 0) {
            recommendations.push({
                icon: '🏆',
                text: 'Maintain current best practices and monitor for changes'
            });
        }
        
        return recommendations;
    }

    hideCRMDetailsModal() {
        // Hide CRM details modal
        const modal = this.container.querySelector('.crm-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    clearSelection() {
        // Clear current CRM selection
        this.selectedCRM = null;
        
        const selectedRows = this.container.querySelectorAll('.ranking-row.selected');
        selectedRows.forEach(row => row.classList.remove('selected'));
    }

    switchView(viewType) {
        // Switch between different view types
        this.currentView = viewType;
        
        if (this.currentData) {
            this.displayCRMComparison(this.currentData);
        }
        
        // Update view selector
        const viewSelector = this.container.querySelector('.view-selector');
        if (viewSelector) {
            viewSelector.value = viewType;
        }
        
        this.logAuditEvent('view_switched', {
            viewType: viewType,
            timestamp: Date.now()
        });
    }

    applyFilter(filterType) {
        // Apply filter to CRM data
        if (!this.currentData) return;
        
        let filteredCRMs = [...this.currentData.crms];
        
        switch (filterType) {
            case 'active':
                filteredCRMs = filteredCRMs.filter(crm => crm.status === 'active');
                break;
            case 'high_volume':
                filteredCRMs = filteredCRMs.filter(crm => crm.leadVolume > 100);
                break;
            case 'all':
            default:
                // No filtering
                break;
        }
        
        const filteredData = {
            ...this.currentData,
            crms: filteredCRMs
        };
        
        this.displayCRMComparison(filteredData);
        this.updateStatistics(filteredData);
    }

    applySorting() {
        // Apply sorting to current data
        if (!this.currentData) return;
        
        const sortedCRMs = [...this.currentData.crms].sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'conversion_rate':
                    aValue = a.metrics.conversion_rate || 0;
                    bValue = b.metrics.conversion_rate || 0;
                    break;
                case 'response_rate':
                    aValue = a.metrics.response_rate || 0;
                    bValue = b.metrics.response_rate || 0;
                    break;
                case 'quality_score':
                    aValue = a.metrics.quality_score || 0;
                    bValue = b.metrics.quality_score || 0;
                    break;
                case 'overall_score':
                default:
                    aValue = a.overallScore || 0;
                    bValue = b.overallScore || 0;
                    break;
            }
            
            if (this.sortDirection === 'asc') {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });
        
        // Reassign ranks after sorting
        const rerankedCRMs = sortedCRMs.map((crm, index) => ({
            ...crm,
            rank: index + 1
        }));
        
        const sortedData = {
            ...this.currentData,
            crms: rerankedCRMs
        };
        
        this.displayCRMComparison(sortedData);
    }

    updateSortIndicators() {
        // Update sort direction indicators in table headers
        const headers = this.container.querySelectorAll('.sortable');
        
        headers.forEach(header => {
            const sortKey = header.dataset.sort;
            header.classList.remove('sort-asc', 'sort-desc');
            
            if (sortKey === this.sortBy) {
                header.classList.add(`sort-${this.sortDirection}`);
            }
        });
    }

    addToComparison(crmId) {
        // Add CRM to comparison view
        // Implementation would manage comparison selection
        console.log(`Adding ${crmId} to comparison`);
        this.logAuditEvent('crm_added_to_comparison', {
            crmId: crmId,
            timestamp: Date.now()
        });
    }

    showCRMSelector() {
        // Show CRM selector for comparison
        // Implementation would show modal with available CRMs
        console.log('Showing CRM selector modal');
    }

    setupAutoRefresh() {
        // Setup auto-refresh for real-time updates
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (!this.isLoading) {
                this.refresh();
            }
        }, this.config.refreshInterval);
    }

    async refresh() {
        // Refresh CRM performance data
        try {
            await this.render(this.currentFilters);
        } catch (error) {
            console.error('CRM comparator refresh failed:', error);
        }
    }

    async retry() {
        // Retry failed operation
        this.clearError();
        await this.render(this.currentFilters);
    }

    async exportComparison() {
        // Export CRM comparison analysis
        try {
            if (!this.currentData) {
                throw new Error('No data available for export');
            }
            
            const exportData = {
                summary: {
                    exportedAt: new Date().toISOString(),
                    totalCRMs: this.currentData.crms.length,
                    analysisType: 'crm_performance_comparison'
                },
                rankings: this.currentData.crms.map(crm => ({
                    rank: crm.rank,
                    name: crm.name,
                    overallScore: crm.overallScore,
                    metrics: crm.metrics,
                    grades: crm.grades,
                    confidence: crm.confidence,
                    trend: crm.trend
                })),
                benchmarks: this.currentData.benchmarks,
                insights: this.analyzeCRMPerformance(this.currentData),
                metadata: {
                    metricsUsed: Object.keys(this.metricsConfig),
                    sortedBy: this.sortBy,
                    sortDirection: this.sortDirection,
                    confidenceThreshold: this.config.confidenceThreshold
                }
            };
            
            this.downloadJSON(exportData, 'crm-performance-comparison');
            
            this.logAuditEvent('comparison_exported', {
                crmCount: this.currentData.crms.length,
                exportSize: JSON.stringify(exportData).length,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError(`Export failed: ${error.message}`);
        }
    }

    downloadJSON(data, filename) {
        // Download data as JSON file
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

    showSettings() {
        // Show settings modal for comparator configuration
        // Implementation would show configuration options
        console.log('Settings modal not implemented');
    }

    showLoading() {
        // Show loading state
        const loading = this.container.querySelector('.comparator-loading');
        if (loading) {
            loading.style.display = 'flex';
        }
        this.isLoading = true;
    }

    hideLoading() {
        // Hide loading state
        const loading = this.container.querySelector('.comparator-loading');
        if (loading) {
            loading.style.display = 'none';
        }
        this.isLoading = false;
    }

    showError(message) {
        // Show error state
        const errorDiv = this.container.querySelector('.comparator-error');
        const errorMessage = this.container.querySelector('.error-message');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'flex';
        }
    }

    clearError() {
        // Clear error state
        const errorDiv = this.container.querySelector('.comparator-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    logAuditEvent(event, data) {
        // Log audit event for security and analytics
        if (this.securitySettings.logComparisons) {
            this.auditLog.push({
                event,
                data,
                timestamp: Date.now(),
                userId: window.OsliraApp?.user?.id || 'anonymous'
            });
            
            // Keep audit log size manageable
            if (this.auditLog.length > 100) {
                this.auditLog = this.auditLog.slice(-50);
            }
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

    async _updateInternal() {
        // Internal update method for debounced updates
        if (this.currentData) {
            await this.displayCRMComparison(this.currentData);
        }
    }

    destroy() {
        // Clean up CRM comparator resources
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }
        
        if (this.rankingChart) {
            this.rankingChart.destroy();
        }
        
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        // Clear data
        this.currentData = null;
        this.selectedCRM = null;
        this.auditLog = [];
        
        console.log('SecureCRMPerformanceComparator destroyed');
    }

    // ===== ADDITIONAL UTILITY METHODS =====

    formatMetricValue(value, format) {
        // Format metric value based on type
        if (typeof value !== 'number') return 'N/A';
        
        switch (format) {
            case 'percentage':
                return (value * 100).toFixed(1) + '%';
            case 'score':
                return value.toFixed(1);
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(value);
            case 'number':
                return new Intl.NumberFormat('en-US').format(value);
            default:
                return value.toString();
        }
    }

    getPerformanceClass(value, thresholds) {
        // Get CSS class based on performance thresholds
        if (value >= thresholds.excellent) return 'excellent';
        if (value >= thresholds.good) return 'good';
        if (value >= thresholds.average) return 'average';
        if (value >= thresholds.poor) return 'poor';
        return 'very-poor';
    }

    calculatePerformanceIndex(metrics) {
        // Calculate composite performance index
        const weights = Object.values(this.metricsConfig).map(config => config.weight);
        const values = Object.keys(this.metricsConfig).map(key => metrics[key] || 0);
        
        const weightedSum = values.reduce((sum, value, index) => sum + (value * weights[index]), 0);
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    validateMetricRanges(metrics) {
        // Validate that metrics are within expected ranges
        const validationResults = {};
        
        Object.entries(metrics).forEach(([key, value]) => {
            if (typeof value === 'number') {
                validationResults[key] = {
                    valid: value >= 0 && value <= 1, // Assuming normalized 0-1 range
                    value: value,
                    normalized: Math.max(0, Math.min(1, value))
                };
            } else {
                validationResults[key] = {
                    valid: false,
                    value: value,
                    normalized: 0
                };
            }
        });
        
        return validationResults;
    }

    generatePerformanceReport(crm) {
        // Generate detailed performance report for a CRM
        const report = {
            crmName: crm.name,
            overallAssessment: this.getOverallAssessment(crm.overallScore),
            strengthsAndWeaknesses: this.analyzeStrengthsWeaknesses(crm),
            benchmarkComparison: this.compareToBenchmarks(crm),
            trendAnalysis: this.analyzeTrendImplications(crm.trend),
            recommendations: this.generateCRMRecommendations(crm),
            confidenceLevel: this.interpretConfidence(crm.confidence),
            generatedAt: new Date().toISOString()
        };
        
        return report;
    }

    getOverallAssessment(score) {
        // Get overall performance assessment
        if (score >= 90) return 'Exceptional';
        if (score >= 80) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Average';
        if (score >= 50) return 'Below Average';
        return 'Needs Improvement';
    }

    analyzeStrengthsWeaknesses(crm) {
        // Analyze CRM strengths and weaknesses
        const analysis = {
            strengths: [],
            weaknesses: []
        };
        
        Object.entries(this.metricsConfig).forEach(([key, config]) => {
            const value = crm.metrics[key] * 100; // Convert to percentage
            
            if (value >= 80) {
                analysis.strengths.push({
                    metric: config.label,
                    value: value,
                    description: `Strong performance in ${config.label.toLowerCase()}`
                });
            } else if (value < 50) {
                analysis.weaknesses.push({
                    metric: config.label,
                    value: value,
                    description: `Opportunity for improvement in ${config.label.toLowerCase()}`
                });
            }
        });
        
        return analysis;
    }

    compareToBenchmarks(crm) {
        // Compare CRM performance to benchmarks
        if (!crm.benchmarks) return null;
        
        const comparison = {
            aboveBenchmark: [],
            belowBenchmark: [],
            atBenchmark: []
        };
        
        Object.entries(crm.benchmarks).forEach(([key, benchmark]) => {
            const item = {
                metric: this.metricsConfig[key]?.label || key,
                difference: benchmark.difference,
                performance: benchmark.performance
            };
            
            if (benchmark.performance === 'above') {
                comparison.aboveBenchmark.push(item);
            } else if (benchmark.performance === 'below') {
                comparison.belowBenchmark.push(item);
            } else {
                comparison.atBenchmark.push(item);
            }
        });
        
        return comparison;
    }

    analyzeTrendImplications(trend) {
        // Analyze trend implications
        if (trend.direction === 'neutral') {
            return {
                status: 'stable',
                message: 'Performance is stable with no significant trend',
                action: 'monitor'
            };
        }
        
        const changeDirection = trend.direction === 'up' ? 'improving' : 'declining';
        const urgency = Math.abs(trend.change) > 10 ? 'high' : Math.abs(trend.change) > 5 ? 'medium' : 'low';
        
        return {
            status: changeDirection,
            message: `Performance is ${changeDirection} by ${Math.abs(trend.change)}%`,
            urgency: urgency,
            action: trend.direction === 'up' ? 'maintain_momentum' : 'investigate_causes'
        };
    }

    interpretConfidence(confidence) {
        // Interpret confidence score
        if (confidence >= 0.9) return { level: 'Very High', description: 'Data is highly reliable' };
        if (confidence >= 0.8) return { level: 'High', description: 'Data is reliable' };
        if (confidence >= 0.7) return { level: 'Medium', description: 'Data is moderately reliable' };
        if (confidence >= 0.6) return { level: 'Low', description: 'Data has some reliability concerns' };
        return { level: 'Very Low', description: 'Data reliability is questionable' };
    }

    // ===== PERFORMANCE MONITORING =====

    measureRenderPerformance() {
        // Measure rendering performance
        if (performance.mark && performance.measure) {
            try {
                const measureName = 'crm-comparator-render';
                const measures = performance.getEntriesByName(measureName);
                
                if (measures.length > 0) {
                    const latestMeasure = measures[measures.length - 1];
                    
                    this.logAuditEvent('performance_measurement', {
                        renderTime: latestMeasure.duration,
                        timestamp: Date.now(),
                        crmCount: this.currentData?.crms?.length || 0
                    });
                    
                    // Warn if rendering is slow
                    if (latestMeasure.duration > 2000) { // 2 seconds
                        console.warn('CRM comparator rendering is slow:', latestMeasure.duration + 'ms');
                    }
                }
            } catch (error) {
                console.warn('Performance measurement failed:', error);
            }
        }
    }

    optimizeForLargeDatasets() {
        // Optimize display for large datasets
        if (this.currentData && this.currentData.crms.length > 20) {
            // Enable virtualization or pagination
            console.log('Large dataset detected, applying optimizations');
            
            // Limit radar chart to top 5 CRMs
            const optimizedData = {
                ...this.currentData,
                crms: this.currentData.crms.slice(0, 5)
            };
            
            return optimizedData;
        }
        
        return this.currentData;
    }

    // ===== ACCESSIBILITY HELPERS =====

    announceToScreenReader(message) {
        // Announce changes to screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    cleanup() {
    console.log('🧹 [SecureCRMPerformanceComparator] Cleaning up...');
    
    // Clear timers
    if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
    }
    
    // Clear charts
    if (this.performanceChart) {
        this.performanceChart.destroy();
        this.performanceChart = null;
    }
    
    if (this.comparisonChart) {
        this.comparisonChart.destroy();
        this.comparisonChart = null;
    }
    
    // Clear container
    if (this.container) {
        this.container.innerHTML = '';
    }
    
    // Clear data
    this.currentData = null;
    this.lastComparison = null;
}

getModuleInfo() {
    return {
        name: 'SecureCRMPerformanceComparator',
        version: '1.0.0',
        description: 'Secure CRM performance comparison and analysis',
        type: 'analytics',
        priority: 4,
        capabilities: ['crm_analysis', 'performance_comparison', 'trend_analysis'],
        status: this.isLoading ? 'loading' : 'ready',
        lastUpdate: this.lastDataFetch,
        comparisonCount: this.currentData ? this.currentData.comparisons?.length : 0
    };
}

    setupAccessibilityFeatures() {
        // Setup additional accessibility features
        const tableRows = this.container.querySelectorAll('.ranking-row');
        
        tableRows.forEach((row, index) => {
            row.setAttribute('role', 'row');
            row.setAttribute('tabindex', '0');
            row.setAttribute('aria-rowindex', index + 1);
            
            // Add keyboard navigation
            row.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'ArrowDown':
                        const nextRow = row.nextElementSibling;
                        if (nextRow) nextRow.focus();
                        e.preventDefault();
                        break;
                    case 'ArrowUp':
                        const prevRow = row.previousElementSibling;
                        if (prevRow) prevRow.focus();
                        e.preventDefault();
                        break;
                }
            });
        });
    }
}
export { SecureCRMPerformanceComparator };
