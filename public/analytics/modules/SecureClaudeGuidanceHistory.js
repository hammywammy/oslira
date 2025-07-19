class SecureClaudeGuidanceHistory {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        this.claudeService = secureClaudeService;
        this.currentData = null;
        this.filters = {};
        
        // Initialize guidance tracking state
        this.guidanceCache = new Map();
        this.implementationTracking = new Map();
        this.adviceEffectiveness = new Map();
        
        // Guidance metrics
        this.guidanceMetrics = {
            totalAdvice: 0,
            implementedAdvice: 0,
            avgEffectiveness: 0,
            bestPerformingAdvice: null
        };
        
        // Setup container structure
        this.initializeContainer();
        
        console.log('🤖 SecureClaudeGuidanceHistory initialized');
    }

    initializeContainer() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="guidance-header">
                <div class="guidance-controls">
                    <select id="guidance-filter" class="control-select">
                        <option value="all">All Guidance</option>
                        <option value="implemented">Implemented</option>
                        <option value="pending">Pending</option>
                        <option value="high_impact">High Impact</option>
                        <option value="recent">Recent</option>
                    </select>
                    <select id="guidance-timeframe" class="control-select">
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </select>
                    <select id="guidance-category" class="control-select">
                        <option value="all">All Categories</option>
                        <option value="message_optimization">Message Optimization</option>
                        <option value="strategy">Strategy</option>
                        <option value="targeting">Targeting</option>
                        <option value="risk_mitigation">Risk Mitigation</option>
                    </select>
                </div>
                
                <div class="guidance-summary">
                    <div class="guidance-metric">
                        <span class="metric-value" id="total-advice">0</span>
                        <span class="metric-label">Total Advice</span>
                    </div>
                    <div class="guidance-metric">
                        <span class="metric-value" id="implementation-rate">0%</span>
                        <span class="metric-label">Implementation Rate</span>
                    </div>
                    <div class="guidance-metric">
                        <span class="metric-value" id="avg-effectiveness">0%</span>
                        <span class="metric-label">Avg Effectiveness</span>
                    </div>
                </div>
            </div>
            
            <div class="guidance-content">
                <div class="guidance-timeline" id="guidance-timeline">
                    <h4>📅 Guidance Timeline</h4>
                    <div class="timeline-container">
                        <div class="timeline-loading" id="timeline-loading" style="display: none;">
                            <div class="loading-spinner"></div>
                            <p>Loading guidance history...</p>
                        </div>
                        <div class="timeline-list" id="timeline-list">
                            <!-- Timeline items populate here -->
                        </div>
                    </div>
                </div>
                
                <div class="implementation-tracking" id="implementation-tracking">
                    <h4>🎯 Implementation Tracking</h4>
                    <div class="tracking-container">
                        <div class="implementation-chart">
                            <canvas id="implementation-chart"></canvas>
                        </div>
                        <div class="implementation-stats" id="implementation-stats">
                            <!-- Implementation statistics -->
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="advice-effectiveness" id="advice-effectiveness">
                <h4>📊 Advice Effectiveness Analysis</h4>
                <div class="effectiveness-grid" id="effectiveness-grid">
                    <!-- Effectiveness analysis cards -->
                </div>
            </div>
            
            <div class="new-guidance" id="new-guidance">
                <h4>💡 New Experiment Suggestions</h4>
                <div class="suggestions-container">
                    <button class="btn-primary" id="generate-suggestions">
                        🤖 Generate New Suggestions
                    </button>
                    <div class="suggestions-list" id="suggestions-list">
                        <!-- New suggestions populate here -->
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Filter controls
        const guidanceFilter = this.container.querySelector('#guidance-filter');
        const timeframeSelect = this.container.querySelector('#guidance-timeframe');
        const categorySelect = this.container.querySelector('#guidance-category');
        
        if (guidanceFilter) {
            guidanceFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }
        
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.filters.timeframe = e.target.value;
                this.render(this.filters);
            });
        }
        
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }
        
        // Generate suggestions button
        const generateBtn = this.container.querySelector('#generate-suggestions');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateNewSuggestions());
        }
    }

    async render(filters = {}) {
        try {
            this.filters = { ...this.filters, ...filters };
            this.showLoading(true);
            
            // Check credits before expensive guidance analysis
            const creditCheck = await window.OsliraApp.creditService?.checkBalance();
            if (creditCheck && creditCheck.balance < 1) {
                throw new Error('Insufficient credits for guidance analysis');
            }
            
            // Fetch guidance data via Worker endpoints
            const guidanceData = await this.analyticsService.getClaudeGuidanceHistory(this.filters);
            
            if (!guidanceData || !guidanceData.guidance_items) {
                this.displayNoData();
                return;
            }
            
            this.currentData = guidanceData;
            
            // Track implementation success server-side
            const implementationStats = this.processImplementationData(guidanceData);
            this.guidanceMetrics = implementationStats;
            
            // Update summary metrics
            this.updateGuidanceSummary(implementationStats);
            
            // Render guidance timeline
            this.renderGuidanceTimeline(guidanceData.guidance_items);
            
            // Render implementation tracking chart
            this.renderImplementationChart(guidanceData.guidance_items);
            
            // Display advice correlation with results
            this.renderAdviceEffectiveness(guidanceData.guidance_items);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ Guidance history render failed:', error);
            this.showError(error.message);
            this.showLoading(false);
        }
    }

    async updateGuidanceData(newData) {
        if (!newData) return;
        
        try {
            // Process Worker-validated guidance metrics
            const validatedData = this.validateWorkerData(newData);
            
            // Update cached data
            this.currentData = validatedData;
            
            // Update implementation tracking
            const implementationStats = this.processImplementationData(validatedData);
            this.guidanceMetrics = implementationStats;
            
            // Update summary display
            this.updateGuidanceSummary(implementationStats);
            
            // Refresh advice effectiveness displays
            this.renderAdviceEffectiveness(validatedData.guidance_items);
            
            // Update timeline and charts
            this.renderGuidanceTimeline(validatedData.guidance_items);
            this.renderImplementationChart(validatedData.guidance_items);
            
            console.log('✅ Guidance data updated successfully');
            
        } catch (error) {
            console.error('❌ Guidance data update failed:', error);
            this.showError('Failed to update guidance data');
        }
    }

    trackAdviceImplementation(advice, outcomes) {
        if (!advice || !advice.id) return;
        
        try {
            // Log implementation status securely
            const implementationRecord = {
                advice_id: advice.id,
                implemented_at: new Date().toISOString(),
                implementation_status: 'completed',
                outcomes: outcomes,
                user_id: window.OsliraApp.user?.id
            };
            
            // Calculate outcome correlations
            const correlation = this.calculateOutcomeCorrelation(advice, outcomes);
            implementationRecord.correlation_score = correlation;
            
            // Update advice effectiveness scores
            this.updateAdviceEffectiveness(advice.id, correlation);
            
            // Store in tracking map
            this.implementationTracking.set(advice.id, implementationRecord);
            
            // Log via secure Worker endpoint
            this.logImplementationSecurely(implementationRecord);
            
            console.log('✅ Advice implementation tracked:', advice.id);
            
        } catch (error) {
            console.error('❌ Failed to track advice implementation:', error);
        }
    }

    processImplementationData(guidanceData) {
        const items = guidanceData.guidance_items || [];
        
        if (items.length === 0) {
            return {
                totalAdvice: 0,
                implementedAdvice: 0,
                implementationRate: 0,
                avgEffectiveness: 0,
                bestPerformingAdvice: null
            };
        }
        
        const implementedItems = items.filter(item => item.implementation_status === 'implemented');
        const implementationRate = (implementedItems.length / items.length) * 100;
        
        const effectivenessScores = implementedItems
            .map(item => item.effectiveness_score || 0)
            .filter(score => score > 0);
        
        const avgEffectiveness = effectivenessScores.length > 0 
            ? effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length 
            : 0;
        
        const bestPerformingAdvice = implementedItems.reduce((best, item) => 
            (item.effectiveness_score || 0) > (best.effectiveness_score || 0) ? item : best,
            implementedItems[0]
        );
        
        return {
            totalAdvice: items.length,
            implementedAdvice: implementedItems.length,
            implementationRate: Math.round(implementationRate * 100) / 100,
            avgEffectiveness: Math.round(avgEffectiveness * 100) / 100,
            bestPerformingAdvice
        };
    }

    updateGuidanceSummary(metrics) {
        const totalAdviceEl = this.container.querySelector('#total-advice');
        const implementationRateEl = this.container.querySelector('#implementation-rate');
        const avgEffectivenessEl = this.container.querySelector('#avg-effectiveness');
        
        if (totalAdviceEl) {
            totalAdviceEl.textContent = metrics.totalAdvice;
        }
        
        if (implementationRateEl) {
            const rate = metrics.implementationRate;
            implementationRateEl.textContent = `${rate}%`;
            implementationRateEl.className = `metric-value ${rate >= 70 ? 'high' : rate >= 40 ? 'medium' : 'low'}`;
        }
        
        if (avgEffectivenessEl) {
            const effectiveness = metrics.avgEffectiveness;
            avgEffectivenessEl.textContent = `${effectiveness}%`;
            avgEffectivenessEl.className = `metric-value ${effectiveness >= 70 ? 'high' : effectiveness >= 40 ? 'medium' : 'low'}`;
        }
    }

    renderGuidanceTimeline(guidanceItems) {
        const timelineList = this.container.querySelector('#timeline-list');
        if (!timelineList) return;
        
        if (!guidanceItems || guidanceItems.length === 0) {
            timelineList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🤖</div>
                    <h3>No Claude Guidance Found</h3>
                    <p>Start using Claude to see guidance history here.</p>
                </div>
            `;
            return;
        }
        
        // Sort by date, most recent first
        const sortedItems = [...guidanceItems].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        timelineList.innerHTML = sortedItems.map(item => {
            const statusClass = item.implementation_status || 'pending';
            const effectivenessClass = this.getEffectivenessClass(item.effectiveness_score);
            
            return `
                <div class="timeline-item ${statusClass}" data-guidance-id="${item.id}">
                    <div class="timeline-marker">
                        <div class="marker-icon ${statusClass}">
                            ${this.getStatusIcon(item.implementation_status)}
                        </div>
                        <div class="timeline-date">${this.formatDate(item.created_at)}</div>
                    </div>
                    
                    <div class="timeline-content">
                        <div class="guidance-header">
                            <h5>${item.title || 'Claude Guidance'}</h5>
                            <div class="guidance-badges">
                                <span class="category-badge">${item.category || 'general'}</span>
                                <span class="status-badge ${statusClass}">${this.getStatusText(item.implementation_status)}</span>
                                ${item.effectiveness_score ? `
                                    <span class="effectiveness-badge ${effectivenessClass}">
                                        ${item.effectiveness_score}% effective
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="guidance-content">
                            <p>${item.advice_text || item.description}</p>
                            
                            ${item.recommendations && item.recommendations.length > 0 ? `
                                <div class="recommendations">
                                    <h6>Recommendations:</h6>
                                    <ul>
                                        ${item.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            
                            ${item.expected_impact ? `
                                <div class="expected-impact">
                                    <strong>Expected Impact:</strong> +${item.expected_impact}% improvement
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="guidance-actions">
                            ${item.implementation_status === 'pending' ? `
                                <button class="btn-small implement-btn" onclick="dashboard.implementAdvice('${item.id}')">
                                    ✅ Mark Implemented
                                </button>
                            ` : ''}
                            <button class="btn-small" onclick="dashboard.viewGuidanceDetails('${item.id}')">
                                📊 View Details
                            </button>
                            <button class="btn-small" onclick="dashboard.getFollowUpAdvice('${item.id}')">
                                🔄 Get Follow-up
                            </button>
                        </div>
                        
                        ${item.implementation_notes ? `
                            <div class="implementation-notes">
                                <h6>Implementation Notes:</h6>
                                <p>${item.implementation_notes}</p>
                            </div>
                        ` : ''}
                        
                        ${item.results && item.results.length > 0 ? `
                            <div class="implementation-results">
                                <h6>Results:</h6>
                                <div class="results-grid">
                                    ${item.results.map(result => `
                                        <div class="result-item">
                                            <span class="result-metric">${result.metric}</span>
                                            <span class="result-value ${result.change > 0 ? 'positive' : result.change < 0 ? 'negative' : 'neutral'}">
                                                ${result.change > 0 ? '+' : ''}${result.change}%
                                            </span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderImplementationChart(guidanceItems) {
        const chartContainer = this.container.querySelector('#implementation-chart');
        if (!chartContainer) return;
        
        const ctx = chartContainer.getContext('2d');
        
        // Destroy existing chart
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        // Prepare chart data - implementation over time
        const monthlyData = this.aggregateByMonth(guidanceItems);
        
        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Advice Given',
                    data: monthlyData.given,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Advice Implemented',
                    data: monthlyData.implemented,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Items'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterBody: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                const effectiveness = monthlyData.effectiveness[index];
                                return effectiveness ? `Avg Effectiveness: ${effectiveness}%` : '';
                            }
                        }
                    }
                }
            }
        });
        
        // Update implementation stats
        this.updateImplementationStats(guidanceItems);
    }

    renderAdviceEffectiveness(guidanceItems) {
        const effectivenessGrid = this.container.querySelector('#effectiveness-grid');
        if (!effectivenessGrid) return;
        
        // Group by category and calculate effectiveness
        const categoryEffectiveness = this.calculateCategoryEffectiveness(guidanceItems);
        
        if (Object.keys(categoryEffectiveness).length === 0) {
            effectivenessGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>No Effectiveness Data</h3>
                    <p>Implement advice to see effectiveness analysis.</p>
                </div>
            `;
            return;
        }
        
        effectivenessGrid.innerHTML = Object.entries(categoryEffectiveness).map(([category, data]) => `
            <div class="effectiveness-card">
                <div class="card-header">
                    <h5>${this.formatCategoryName(category)}</h5>
                    <span class="effectiveness-score ${this.getEffectivenessClass(data.avgEffectiveness)}">
                        ${data.avgEffectiveness}%
                    </span>
                </div>
                
                <div class="card-content">
                    <div class="effectiveness-metrics">
                        <div class="metric">
                            <span class="metric-label">Total Advice:</span>
                            <span class="metric-value">${data.totalAdvice}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Implemented:</span>
                            <span class="metric-value">${data.implemented}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Success Rate:</span>
                            <span class="metric-value">${Math.round((data.implemented / data.totalAdvice) * 100)}%</span>
                        </div>
                    </div>
                    
                    ${data.bestAdvice ? `
                        <div class="best-advice">
                            <h6>Top Performing:</h6>
                            <p>"${data.bestAdvice.advice_text?.substring(0, 100)}..."</p>
                            <span class="performance-score">+${data.bestAdvice.effectiveness_score}% improvement</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    async generateNewSuggestions() {
        try {
            const generateBtn = this.container.querySelector('#generate-suggestions');
            const suggestionsContainer = this.container.querySelector('#suggestions-list');
            
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = '🤖 Generating...';
            }
            
            // Generate new suggestions via Claude Worker
            const suggestions = await this.claudeService.suggestExperiments({
                guidance_history: this.currentData?.guidance_items || [],
                current_performance: this.guidanceMetrics,
                user_context: {
                    timeframe: this.filters.timeframe || '30d',
                    focus_areas: this.filters.category || 'all'
                }
            });
            
            if (suggestions && suggestions.experiments) {
                this.renderNewSuggestions(suggestions.experiments);
            } else {
                this.renderDefaultSuggestions();
            }
            
        } catch (error) {
            console.error('❌ Failed to generate suggestions:', error);
            this.showError('Failed to generate new suggestions');
        } finally {
            const generateBtn = this.container.querySelector('#generate-suggestions');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = '🤖 Generate New Suggestions';
            }
        }
    }

    renderNewSuggestions(experiments) {
        const suggestionsContainer = this.container.querySelector('#suggestions-list');
        if (!suggestionsContainer) return;
        
        suggestionsContainer.innerHTML = experiments.map(exp => `
            <div class="suggestion-card ${exp.priority || 'medium'}">
                <div class="suggestion-header">
                    <h5>${exp.title}</h5>
                    <span class="priority-badge ${exp.priority}">${exp.priority}</span>
                </div>
                
                <div class="suggestion-content">
                    <p>${exp.description}</p>
                    
                    ${exp.expected_outcomes ? `
                        <div class="expected-outcomes">
                            <h6>Expected Outcomes:</h6>
                            <ul>
                                ${exp.expected_outcomes.map(outcome => `<li>${outcome}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${exp.implementation_steps ? `
                        <div class="implementation-steps">
                            <h6>Implementation:</h6>
                            <ol>
                                ${exp.implementation_steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                        </div>
                    ` : ''}
                </div>
                
                <div class="suggestion-actions">
                    <button class="btn-small" onclick="dashboard.implementExperiment('${exp.id}')">
                        🚀 Start Experiment
                    </button>
                    <button class="btn-small" onclick="dashboard.saveForLater('${exp.id}')">
                        📌 Save for Later
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderDefaultSuggestions() {
        const suggestionsContainer = this.container.querySelector('#suggestions-list');
        if (!suggestionsContainer) return;
        
        const defaultSuggestions = [
            {
                title: 'A/B Test Message Structures',
                description: 'Test different message structures to find optimal formats for your audience.',
                priority: 'high'
            },
            {
                title: 'Optimize Send Timing',
                description: 'Experiment with different send times to maximize response rates.',
                priority: 'medium'
            },
            {
                title: 'Personalization Deep Dive',
                description: 'Increase personalization depth based on lead profile data.',
                priority: 'medium'
            }
        ];
        
        suggestionsContainer.innerHTML = defaultSuggestions.map(suggestion => `
            <div class="suggestion-card ${suggestion.priority}">
                <div class="suggestion-header">
                    <h5>${suggestion.title}</h5>
                    <span class="priority-badge ${suggestion.priority}">${suggestion.priority}</span>
                </div>
                <div class="suggestion-content">
                    <p>${suggestion.description}</p>
                </div>
            </div>
        `).join('');
    }

    calculateOutcomeCorrelation(advice, outcomes) {
        if (!outcomes || !outcomes.metrics) return 0;
        
        // Simple correlation calculation based on improvement metrics
        const improvements = outcomes.metrics.filter(m => m.change > 0);
        const totalMetrics = outcomes.metrics.length;
        
        if (totalMetrics === 0) return 0;
        
        const successRate = improvements.length / totalMetrics;
        const avgImprovement = improvements.reduce((sum, m) => sum + m.change, 0) / improvements.length || 0;
        
        return Math.round((successRate * 50 + avgImprovement * 0.5) * 100) / 100;
    }

    updateAdviceEffectiveness(adviceId, effectivenessScore) {
        this.adviceEffectiveness.set(adviceId, {
            score: effectivenessScore,
            updated_at: new Date().toISOString()
        });
    }

    async logImplementationSecurely(implementationRecord) {
        try {
            await window.OsliraApp.dataWriteService?.logAuditTrail('guidance_implementation', implementationRecord);
        } catch (error) {
            console.error('❌ Failed to log implementation securely:', error);
        }
    }

    aggregateByMonth(items) {
        const monthlyAgg = {};
        
        items.forEach(item => {
            const month = new Date(item.created_at).toISOString().substring(0, 7);
            if (!monthlyAgg[month]) {
                monthlyAgg[month] = { given: 0, implemented: 0, effectiveness: [] };
            }
            monthlyAgg[month].given++;
            
            if (item.implementation_status === 'implemented') {
                monthlyAgg[month].implemented++;
                if (item.effectiveness_score) {
                    monthlyAgg[month].effectiveness.push(item.effectiveness_score);
                }
            }
        });
        
        const sortedMonths = Object.keys(monthlyAgg).sort();
        
        return {
            labels: sortedMonths.map(month => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
            given: sortedMonths.map(month => monthlyAgg[month].given),
            implemented: sortedMonths.map(month => monthlyAgg[month].implemented),
            effectiveness: sortedMonths.map(month => {
                const scores = monthlyAgg[month].effectiveness;
                return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            })
        };
    }

    calculateCategoryEffectiveness(items) {
        const categories = {};
        
        items.forEach(item => {
            const category = item.category || 'general';
            if (!categories[category]) {
                categories[category] = {
                    totalAdvice: 0,
                    implemented: 0,
                    effectivenessScores: [],
                    bestAdvice: null
                };
            }
            
            categories[category].totalAdvice++;
            
            if (item.implementation_status === 'implemented') {
                categories[category].implemented++;
                
                if (item.effectiveness_score) {
                    categories[category].effectivenessScores.push(item.effectiveness_score);
                    
                    if (!categories[category].bestAdvice || 
                        item.effectiveness_score > categories[category].bestAdvice.effectiveness_score) {
                        categories[category].bestAdvice = item;
                    }
                }
            }
        });
        
        // Calculate averages
        Object.keys(categories).forEach(category => {
            const scores = categories[category].effectivenessScores;
            categories[category].avgEffectiveness = scores.length > 0 
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : 0;
        });
        
        return categories;
    }

    updateImplementationStats(items) {
        const statsContainer = this.container.querySelector('#implementation-stats');
        if (!statsContainer) return;
        
        const implemented = items.filter(item => item.implementation_status === 'implemented');
        const pending = items.filter(item => item.implementation_status === 'pending');
        const highImpact = implemented.filter(item => (item.effectiveness_score || 0) >= 70);
        
        statsContainer.innerHTML = `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-value">${implemented.length}</span>
                    <span class="stat-label">Implemented</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${pending.length}</span>
                    <span class="stat-label">Pending</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${highImpact.length}</span>
                    <span class="stat-label">High Impact</span>
                </div>
            </div>
        `;
    }

    applyFilters() {
        if (this.currentData && this.currentData.guidance_items) {
            const filteredItems = this.filterGuidanceItems(this.currentData.guidance_items);
            this.renderGuidanceTimeline(filteredItems);
            this.renderAdviceEffectiveness(filteredItems);
        }
    }

    filterGuidanceItems(items) {
        let filtered = [...items];
        
        // Filter by status
        if (this.filters.status && this.filters.status !== 'all') {
            switch (this.filters.status) {
                case 'implemented':
                    filtered = filtered.filter(item => item.implementation_status === 'implemented');
                    break;
                case 'pending':
                    filtered = filtered.filter(item => item.implementation_status === 'pending');
                    break;
                case 'high_impact':
                    filtered = filtered.filter(item => (item.effectiveness_score || 0) >= 70);
                    break;
                case 'recent':
                    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    filtered = filtered.filter(item => new Date(item.created_at) > oneWeekAgo);
                    break;
            }
        }
        
        // Filter by category
        if (this.filters.category && this.filters.category !== 'all') {
            filtered = filtered.filter(item => item.category === this.filters.category);
        }
        
        return filtered;
    }

    getStatusIcon(status) {
        const icons = {
            implemented: '✅',
            pending: '⏳',
            rejected: '❌',
            in_progress: '🔄'
        };
        return icons[status] || '📝';
    }

    getStatusText(status) {
        const texts = {
            implemented: 'Implemented',
            pending: 'Pending',
            rejected: 'Not Implemented',
            in_progress: 'In Progress'
        };
        return texts[status] || 'Unknown';
    }

    getEffectivenessClass(score) {
        if (!score) return 'neutral';
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    formatCategoryName(category) {
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
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

    validateWorkerData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format from Worker');
        }
        
        if (!Array.isArray(data.guidance_items)) {
            throw new Error('Missing guidance_items array in Worker response');
        }
        
        return data;
    }

    showLoading(show) {
        const loadingEl = this.container.querySelector('#timeline-loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const timelineList = this.container.querySelector('#timeline-list');
        if (timelineList) {
            timelineList.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Error Loading Guidance Data</h3>
                    <p>${message}</p>
                    <button class="btn-small" onclick="this.render()">Retry</button>
                </div>
            `;
        }
    }

    displayNoData() {
        const timelineList = this.container.querySelector('#timeline-list');
        if (timelineList) {
            timelineList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🤖</div>
                    <h3>No Claude Guidance Available</h3>
                    <p>Start using Claude to get personalized guidance and track implementation.</p>
                </div>
            `;
        }
    }

    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        this.guidanceCache.clear();
        this.implementationTracking.clear();
        this.adviceEffectiveness.clear();
        this.currentData = null;
        
        // Clear guidance metrics
        this.guidanceMetrics = {
            totalAdvice: 0,
            implementedAdvice: 0,
            avgEffectiveness: 0,
            bestPerformingAdvice: null
        };
        
        // Remove event listeners
        const controls = this.container?.querySelectorAll('select, button');
        controls?.forEach(control => {
            control.replaceWith(control.cloneNode(true));
        });
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🗑️ SecureClaudeGuidanceHistory destroyed');
    }
}

export { SecureClaudeGuidanceHistory };
