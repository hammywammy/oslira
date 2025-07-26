class SecureMessageIterationROITracker {
    constructor(container, secureAnalyticsService) {
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        this.chartInstance = null;
        this.currentData = null;
        this.filters = {};
        
        // Initialize tracking state
        this.iterationCache = new Map();
        this.performanceMetrics = {
            responseRate: 0,
            conversionRate: 0,
            engagementScore: 0,
            totalIterations: 0
        };
        
        // Setup container structure
        this.initializeContainer();
        
        console.log('🔄 SecureMessageIterationROITracker initialized');
    }

    initializeContainer() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="roi-tracker-header">
                <div class="roi-controls">
                    <select id="roi-sort-by" class="control-select">
                        <option value="roi_desc">Highest ROI</option>
                        <option value="roi_asc">Lowest ROI</option>
                        <option value="recent">Most Recent</option>
                        <option value="improvement">Best Improvement</option>
                    </select>
                    <select id="roi-timeframe" class="control-select">
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
                <div class="roi-summary">
                    <div class="roi-metric">
                        <span class="metric-value" id="total-iterations">0</span>
                        <span class="metric-label">Total Iterations</span>
                    </div>
                    <div class="roi-metric">
                        <span class="metric-value" id="avg-improvement">0%</span>
                        <span class="metric-label">Avg Improvement</span>
                    </div>
                    <div class="roi-metric">
                        <span class="metric-value" id="total-roi">0%</span>
                        <span class="metric-label">Total ROI</span>
                    </div>
                </div>
            </div>
            
            <div class="roi-content">
                <div class="roi-visualization">
                    <div class="chart-container">
                        <canvas id="roi-chart"></canvas>
                    </div>
                    <div class="roi-loading" id="roi-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Calculating ROI metrics...</p>
                    </div>
                </div>
                
                <div class="iteration-list" id="iteration-list">
                    <!-- Iteration items populate here -->
                </div>
            </div>
            
            <div class="roi-insights" id="roi-insights">
                <h4>📊 ROI Insights & Recommendations</h4>
                <div class="insights-content">
                    <!-- AI-generated insights populate here -->
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Filter controls
        const sortSelect = this.container.querySelector('#roi-sort-by');
        const timeframeSelect = this.container.querySelector('#roi-timeframe');
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sortBy = e.target.value;
                this.applyFilters();
            });
        }
        
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.filters.timeframe = e.target.value;
                this.render(this.filters);
            });
        }
    }

    async render(filters = {}) {
        try {
            this.filters = { ...this.filters, ...filters };
            this.showLoading(true);
            
            // Check credits before expensive ROI calculation
            const creditCheck = await window.OsliraApp.creditService?.checkBalance();
            if (creditCheck && creditCheck.balance < 1) {
                throw new Error('Insufficient credits for ROI analysis');
            }
            
            // Fetch iteration data via Worker endpoints
            const iterationData = await this.analyticsService.getIterationROI(this.filters);
            
            if (!iterationData || !iterationData.iterations) {
                this.displayNoData();
                return;
            }
            
            this.currentData = iterationData;
            
            // Calculate ROI metrics server-side
            const roiMetrics = this.calculateIterationROI(iterationData);
            
            // Update summary metrics
            this.updateSummaryMetrics(roiMetrics);
            
            // Render ROI chart
            this.renderROIChart(iterationData.iterations);
            
            // Render iteration list
            this.renderIterationList(iterationData.iterations);
            
            // Generate insights via Claude Worker
            await this.generateROIInsights(roiMetrics);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ ROI tracker render failed:', error);
            this.showError(error.message);
            this.showLoading(false);
        }
    }

    async updateROIData(newData) {
        if (!newData) return;
        
        try {
            // Process Worker-calculated ROI metrics
            const processedData = this.validateWorkerData(newData);
            
            // Update cached data
            this.currentData = processedData;
            
            // Update improvement calculations
            const roiMetrics = this.calculateIterationROI(processedData);
            this.updateSummaryMetrics(roiMetrics);
            
            // Refresh ROI visualizations
            if (this.chartInstance) {
                this.updateChart(processedData.iterations);
            }
            
            // Refresh iteration list
            this.renderIterationList(processedData.iterations);
            
            console.log('✅ ROI data updated successfully');
            
        } catch (error) {
            console.error('❌ ROI data update failed:', error);
            this.showError('Failed to update ROI data');
        }
    }

    calculateIterationROI(data) {
        if (!data || !data.iterations) {
            return { totalROI: 0, avgImprovement: 0, bestPerformer: null };
        }
        
        // Use Worker-validated performance data
        const iterations = data.iterations;
        let totalROI = 0;
        let totalImprovement = 0;
        let bestPerformer = null;
        let bestROI = -Infinity;
        
        iterations.forEach(iteration => {
            // Calculate improvement percentages
            const beforeScore = iteration.before_score || 0;
            const afterScore = iteration.after_score || 0;
            
            if (beforeScore > 0) {
                const improvement = ((afterScore - beforeScore) / beforeScore) * 100;
                iteration.improvement_percent = Math.round(improvement * 100) / 100;
                totalImprovement += improvement;
                
                // Include cost-benefit analysis
                const timeCost = iteration.time_invested || 5; // minutes
                const creditCost = iteration.credits_used || 2;
                const benefitScore = improvement * (afterScore / 100);
                
                const roi = (benefitScore / (timeCost * 0.1 + creditCost)) * 100;
                iteration.roi_score = Math.round(roi * 100) / 100;
                totalROI += roi;
                
                if (roi > bestROI) {
                    bestROI = roi;
                    bestPerformer = iteration;
                }
            } else {
                iteration.improvement_percent = 0;
                iteration.roi_score = 0;
            }
        });
        
        const avgImprovement = iterations.length > 0 ? totalImprovement / iterations.length : 0;
        const avgROI = iterations.length > 0 ? totalROI / iterations.length : 0;
        
        return {
            totalROI: Math.round(avgROI * 100) / 100,
            avgImprovement: Math.round(avgImprovement * 100) / 100,
            bestPerformer,
            totalIterations: iterations.length,
            successfulIterations: iterations.filter(i => i.improvement_percent > 0).length
        };
    }

    updateSummaryMetrics(roiMetrics) {
        const totalIterationsEl = this.container.querySelector('#total-iterations');
        const avgImprovementEl = this.container.querySelector('#avg-improvement');
        const totalROIEl = this.container.querySelector('#total-roi');
        
        if (totalIterationsEl) {
            totalIterationsEl.textContent = roiMetrics.totalIterations || 0;
        }
        
        if (avgImprovementEl) {
            const improvement = roiMetrics.avgImprovement || 0;
            avgImprovementEl.textContent = `${improvement > 0 ? '+' : ''}${improvement}%`;
            avgImprovementEl.className = `metric-value ${improvement > 0 ? 'positive' : improvement < 0 ? 'negative' : 'neutral'}`;
        }
        
        if (totalROIEl) {
            const roi = roiMetrics.totalROI || 0;
            totalROIEl.textContent = `${roi > 0 ? '+' : ''}${roi}%`;
            totalROIEl.className = `metric-value ${roi > 0 ? 'positive' : roi < 0 ? 'negative' : 'neutral'}`;
        }
    }

    renderROIChart(iterations) {
        const chartContainer = this.container.querySelector('#roi-chart');
        if (!chartContainer) return;
        
        const ctx = chartContainer.getContext('2d');
        
        // Destroy existing chart
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        // Prepare chart data
        const chartData = iterations.slice(0, 20).map((iteration, index) => ({
            x: index + 1,
            y: iteration.roi_score || 0,
            improvement: iteration.improvement_percent || 0,
            message: iteration.message_preview || `Iteration ${index + 1}`,
            date: iteration.created_at
        }));
        
        this.chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'ROI Score',
                    data: chartData,
                    backgroundColor: chartData.map(point => 
                        point.y > 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
                    ),
                    borderColor: chartData.map(point => 
                        point.y > 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'
                    ),
                    pointRadius: 8,
                    pointHoverRadius: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Iteration Number'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'ROI Score (%)'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const point = context.raw;
                                return [
                                    `ROI: ${point.y}%`,
                                    `Improvement: ${point.improvement}%`,
                                    `Message: ${point.message.substring(0, 50)}...`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    renderIterationList(iterations) {
        const listContainer = this.container.querySelector('#iteration-list');
        if (!listContainer) return;
        
        if (!iterations || iterations.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔄</div>
                    <h3>No Message Iterations Found</h3>
                    <p>Start iterating on your messages to see ROI analysis here.</p>
                </div>
            `;
            return;
        }
        
        // Apply current sorting
        const sortedIterations = this.applySorting(iterations);
        
        listContainer.innerHTML = sortedIterations.map(iteration => {
            const improvementClass = iteration.improvement_percent > 0 ? 'positive' : 
                                   iteration.improvement_percent < 0 ? 'negative' : 'neutral';
            const roiClass = iteration.roi_score > 0 ? 'positive' : 
                           iteration.roi_score < 0 ? 'negative' : 'neutral';
            
            return `
                <div class="iteration-item" data-iteration-id="${iteration.id}">
                    <div class="iteration-header">
                        <div class="iteration-info">
                            <h4>${iteration.message_preview || 'Message Iteration'}</h4>
                            <span class="iteration-date">${this.formatDate(iteration.created_at)}</span>
                        </div>
                        <div class="iteration-metrics">
                            <div class="metric improvement ${improvementClass}">
                                <span class="metric-value">${iteration.improvement_percent > 0 ? '+' : ''}${iteration.improvement_percent}%</span>
                                <span class="metric-label">Improvement</span>
                            </div>
                            <div class="metric roi ${roiClass}">
                                <span class="metric-value">${iteration.roi_score > 0 ? '+' : ''}${iteration.roi_score}%</span>
                                <span class="metric-label">ROI</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="iteration-details">
                        <div class="before-after">
                            <div class="before">
                                <h5>Before</h5>
                                <div class="score">${iteration.before_score || 0}/100</div>
                                <div class="metrics">
                                    <span>Response: ${iteration.before_response_rate || 0}%</span>
                                    <span>Conversion: ${iteration.before_conversion_rate || 0}%</span>
                                </div>
                            </div>
                            <div class="arrow">→</div>
                            <div class="after">
                                <h5>After</h5>
                                <div class="score">${iteration.after_score || 0}/100</div>
                                <div class="metrics">
                                    <span>Response: ${iteration.after_response_rate || 0}%</span>
                                    <span>Conversion: ${iteration.after_conversion_rate || 0}%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="iteration-actions">
                            <button class="btn-small" onclick="dashboard.viewIterationDetails('${iteration.id}')">
                                📊 View Details
                            </button>
                            <button class="btn-small" onclick="dashboard.rerunIteration('${iteration.id}')">
                                🔄 Re-run Analysis
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    applySorting(iterations) {
        const sortBy = this.filters.sortBy || 'roi_desc';
        
        return [...iterations].sort((a, b) => {
            switch (sortBy) {
                case 'roi_desc':
                    return (b.roi_score || 0) - (a.roi_score || 0);
                case 'roi_asc':
                    return (a.roi_score || 0) - (b.roi_score || 0);
                case 'improvement':
                    return (b.improvement_percent || 0) - (a.improvement_percent || 0);
                case 'recent':
                    return new Date(b.created_at) - new Date(a.created_at);
                default:
                    return 0;
            }
        });
    }

    async generateROIInsights(roiMetrics) {
        try {
            const insightsContainer = this.container.querySelector('#roi-insights .insights-content');
            if (!insightsContainer) return;
            
            // Generate insights via Claude Worker
            const insights = await window.OsliraApp.claudeService?.generateInsights({
                type: 'roi_analysis',
                metrics: roiMetrics,
                iterations: this.currentData?.iterations || []
            });
            
            if (insights && insights.recommendations) {
                insightsContainer.innerHTML = `
                    <div class="insight-grid">
                        ${insights.recommendations.map(rec => `
                            <div class="insight-card ${rec.priority || 'medium'}">
                                <h5>${rec.title}</h5>
                                <p>${rec.description}</p>
                                ${rec.action ? `<button class="insight-action" onclick="dashboard.applyRecommendation('${rec.id}')">${rec.action}</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                this.displayDefaultInsights(roiMetrics);
            }
            
        } catch (error) {
            console.error('❌ Failed to generate ROI insights:', error);
            this.displayDefaultInsights(roiMetrics);
        }
    }

    displayDefaultInsights(roiMetrics) {
        const insightsContainer = this.container.querySelector('#roi-insights .insights-content');
        if (!insightsContainer) return;
        
        let insights = [];
        
        if (roiMetrics.avgImprovement > 10) {
            insights.push({
                type: 'success',
                title: 'Strong Iteration Performance',
                message: `Your iterations show an average improvement of ${roiMetrics.avgImprovement}%. Keep focusing on high-impact changes.`
            });
        }
        
        if (roiMetrics.totalROI > 50) {
            insights.push({
                type: 'success',
                title: 'Excellent ROI',
                message: `Your iteration ROI of ${roiMetrics.totalROI}% indicates efficient optimization efforts.`
            });
        }
        
        if (roiMetrics.totalIterations < 5) {
            insights.push({
                type: 'info',
                title: 'Build Iteration History',
                message: 'Try more message iterations to identify patterns and improve optimization strategies.'
            });
        }
        
        insightsContainer.innerHTML = insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <h5>${insight.title}</h5>
                <p>${insight.message}</p>
            </div>
        `).join('') || '<p>Continue iterating to generate insights.</p>';
    }

    applyFilters() {
        if (this.currentData && this.currentData.iterations) {
            this.renderIterationList(this.currentData.iterations);
        }
    }

    validateWorkerData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format from Worker');
        }
        
        if (!Array.isArray(data.iterations)) {
            throw new Error('Missing iterations array in Worker response');
        }
        
        return data;
    }

    showLoading(show) {
        const loadingEl = this.container.querySelector('#roi-loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const chartContainer = this.container.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Error Loading ROI Data</h3>
                    <p>${message}</p>
                    <button class="btn-small" onclick="this.render()">Retry</button>
                </div>
            `;
        }
    }

    displayNoData() {
        const chartContainer = this.container.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>No ROI Data Available</h3>
                    <p>Start iterating on messages to see ROI analysis.</p>
                </div>
            `;
        }
    }

    formatDate(dateString) {
        return window.OsliraApp.formatDateInUserTimezone ? 
            window.OsliraApp.formatDateInUserTimezone(dateString, { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 
            new Date(dateString).toLocaleDateString();
    }

    updateChart(iterations) {
        if (!this.chartInstance || !iterations) return;
        
        const chartData = iterations.slice(0, 20).map((iteration, index) => ({
            x: index + 1,
            y: iteration.roi_score || 0,
            improvement: iteration.improvement_percent || 0,
            message: iteration.message_preview || `Iteration ${index + 1}`,
            date: iteration.created_at
        }));
        
        this.chartInstance.data.datasets[0].data = chartData;
        this.chartInstance.data.datasets[0].backgroundColor = chartData.map(point => 
            point.y > 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        );
        this.chartInstance.data.datasets[0].borderColor = chartData.map(point => 
            point.y > 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'
        );
        
        this.chartInstance.update();
    }

    // Add to each failing module class
async cleanup() {
    console.log(`🧹 ${this.constructor.name} cleanup starting...`);
    
    // Clear any timers
    if (this.updateTimer) {
        clearInterval(this.updateTimer);
        this.updateTimer = null;
    }
    
    // Clear any event listeners
    if (this.container) {
        this.container.removeEventListener('click', this.handleClick);
    }
    
    // Clear any cached data
    if (this.moduleState) {
        Object.keys(this.moduleState).forEach(key => {
            if (this.moduleState[key] instanceof Map) {
                this.moduleState[key].clear();
            }
        });
    }
    
    console.log(`✅ ${this.constructor.name} cleanup completed`);
}

getModuleInfo() {
    return {
        name: this.constructor.name,
        version: '1.0.0',
        description: `${this.constructor.name} analytics module`,
        author: 'Oslira Analytics Team',
        dependencies: ['SecureAnalyticsService'],
        capabilities: [],
        configuration: Object.keys(this.config || {}),
        state: {
            isLoading: this.state === 'loading',
            hasError: this.state === 'error',
            lastUpdate: this.lastUpdate || null
        }
    };
}

    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        this.iterationCache.clear();
        this.currentData = null;
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🗑️ SecureMessageIterationROITracker destroyed');
    }
}
export { SecureMessageIterationROITracker };
