class SecureMessageRiskClassifier {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        this.claudeService = secureClaudeService;
        this.currentData = null;
        this.filters = {};
        
        // Initialize risk tracking state
        this.riskCache = new Map();
        this.alertSystem = new Map();
        this.riskTrends = [];
        
        // Risk metrics
        this.riskMetrics = {
            totalMessages: 0,
            highRiskMessages: 0,
            averageRisk: 0,
            riskTrend: 0,
            activeAlerts: 0
        };
        
        // Risk categories and thresholds
        this.riskCategories = {
            spam: { threshold: 70, weight: 0.3 },
            inappropriate: { threshold: 80, weight: 0.4 },
            compliance: { threshold: 60, weight: 0.2 },
            reputation: { threshold: 75, weight: 0.1 }
        };
        
        // Setup container structure
        this.initializeContainer();
        
        console.log('⚠️ SecureMessageRiskClassifier initialized');
    }

    initializeContainer() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="risk-dashboard-header">
                <div class="risk-controls">
                    <select id="risk-timeframe" class="control-select">
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                    <select id="risk-level-filter" class="control-select">
                        <option value="all">All Risk Levels</option>
                        <option value="high">High Risk (80+)</option>
                        <option value="medium">Medium Risk (50-79)</option>
                        <option value="low">Low Risk (<50)</option>
                    </select>
                    <select id="risk-category-filter" class="control-select">
                        <option value="all">All Categories</option>
                        <option value="spam">Spam Risk</option>
                        <option value="inappropriate">Inappropriate Content</option>
                        <option value="compliance">Compliance Issues</option>
                        <option value="reputation">Reputation Risk</option>
                    </select>
                    <button id="scan-messages-btn" class="control-btn primary">
                        🔍 Scan Recent Messages
                    </button>
                </div>
                
                <div class="risk-summary">
                    <div class="risk-metric">
                        <span class="metric-value" id="total-messages">0</span>
                        <span class="metric-label">Messages Analyzed</span>
                    </div>
                    <div class="risk-metric">
                        <span class="metric-value" id="high-risk-count">0</span>
                        <span class="metric-label">High Risk</span>
                    </div>
                    <div class="risk-metric">
                        <span class="metric-value" id="avg-risk-score">0</span>
                        <span class="metric-label">Avg Risk Score</span>
                    </div>
                    <div class="risk-metric">
                        <span class="metric-value" id="active-alerts">0</span>
                        <span class="metric-label">Active Alerts</span>
                    </div>
                </div>
            </div>
            
            <div class="risk-content">
                <div class="risk-overview" id="risk-overview">
                    <div class="risk-score-display">
                        <div class="overall-risk-gauge">
                            <canvas id="risk-gauge-chart"></canvas>
                            <div class="gauge-center">
                                <span class="gauge-value" id="overall-risk-value">0</span>
                                <span class="gauge-label">Overall Risk</span>
                            </div>
                        </div>
                        
                        <div class="risk-breakdown">
                            <div class="risk-category" id="spam-risk">
                                <div class="category-header">
                                    <span class="category-icon">🚫</span>
                                    <span class="category-name">Spam Risk</span>
                                </div>
                                <div class="category-score">0</div>
                            </div>
                            <div class="risk-category" id="inappropriate-risk">
                                <div class="category-header">
                                    <span class="category-icon">⚠️</span>
                                    <span class="category-name">Content Risk</span>
                                </div>
                                <div class="category-score">0</div>
                            </div>
                            <div class="risk-category" id="compliance-risk">
                                <div class="category-header">
                                    <span class="category-icon">📋</span>
                                    <span class="category-name">Compliance</span>
                                </div>
                                <div class="category-score">0</div>
                            </div>
                            <div class="risk-category" id="reputation-risk">
                                <div class="category-header">
                                    <span class="category-icon">🏛️</span>
                                    <span class="category-name">Reputation</span>
                                </div>
                                <div class="category-score">0</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="risk-loading" id="risk-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Analyzing message risks...</p>
                    </div>
                </div>
                
                <div class="risk-alerts" id="risk-alerts">
                    <h4>🚨 Active Risk Alerts</h4>
                    <div class="alerts-container" id="alerts-container">
                        <!-- Risk alerts populate here -->
                    </div>
                </div>
            </div>
            
            <div class="risk-analysis">
                <div class="risk-trend-chart">
                    <h4>📈 Risk Trends</h4>
                    <canvas id="risk-trend-chart"></canvas>
                </div>
                
                <div class="high-risk-messages" id="high-risk-messages">
                    <h4>⚠️ High Risk Messages</h4>
                    <div class="messages-list" id="messages-list">
                        <!-- High risk messages populate here -->
                    </div>
                </div>
            </div>
            
            <div class="risk-mitigation" id="risk-mitigation">
                <h4>🛡️ Mitigation Recommendations</h4>
                <div class="mitigation-content">
                    <!-- AI-generated mitigation strategies populate here -->
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Filter controls
        const timeframeSelect = this.container.querySelector('#risk-timeframe');
        const levelFilter = this.container.querySelector('#risk-level-filter');
        const categoryFilter = this.container.querySelector('#risk-category-filter');
        const scanBtn = this.container.querySelector('#scan-messages-btn');
        
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.filters.timeframe = e.target.value;
                this.render(this.filters);
            });
        }
        
        if (levelFilter) {
            levelFilter.addEventListener('change', (e) => {
                this.filters.riskLevel = e.target.value;
                this.applyFilters();
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }
        
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.scanRecentMessages());
        }
    }

    async render(filters = {}) {
        try {
            this.filters = { ...this.filters, ...filters };
            this.showLoading(true);
            
            // Check credits before expensive risk analysis
            const creditCheck = await window.OsliraApp.creditService?.checkBalance();
            if (creditCheck && creditCheck.balance < 2) {
                throw new Error('Insufficient credits for risk analysis');
            }
            
            // Fetch risk data via Worker endpoints
            const riskData = await this.analyticsService.getMessageRiskData(this.filters);
            
            if (!riskData || !riskData.risk_assessments) {
                this.displayNoData();
                return;
            }
            
            this.currentData = riskData;
            
            // Process risk classification via secure Claude service
            const riskMetrics = this.processRiskMetrics(riskData);
            this.riskMetrics = riskMetrics;
            
            // Update risk summary
            this.updateRiskSummary(riskMetrics);
            
            // Display risk distribution and alerts
            this.renderRiskOverview(riskData);
            this.renderRiskAlerts(riskData.risk_assessments);
            this.renderRiskTrends(riskData.risk_assessments);
            this.renderHighRiskMessages(riskData.risk_assessments);
            
            // Generate mitigation recommendations
            await this.generateMitigationRecommendations(riskData);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ Risk classifier render failed:', error);
            this.showError(error.message);
            this.showLoading(false);
        }
    }

    async classifyMessage(message) {
        if (!message || typeof message !== 'string') {
            throw new Error('Invalid message format');
        }
        
        try {
            // Send message to Worker for Claude analysis
            const riskAssessment = await this.claudeService.analyzeMessageRisk({
                message_content: message,
                analysis_type: 'comprehensive',
                include_recommendations: true
            });
            
            if (!riskAssessment) {
                throw new Error('Risk analysis failed');
            }
            
            // Return structured risk assessment
            const structuredRisk = {
                overall_score: riskAssessment.overall_risk_score || 0,
                category_scores: {
                    spam: riskAssessment.spam_score || 0,
                    inappropriate: riskAssessment.inappropriate_score || 0,
                    compliance: riskAssessment.compliance_score || 0,
                    reputation: riskAssessment.reputation_score || 0
                },
                risk_factors: riskAssessment.risk_factors || [],
                recommendations: riskAssessment.recommendations || [],
                confidence: riskAssessment.confidence || 0,
                analyzed_at: new Date().toISOString()
            };
            
            // Log risk classification for audit
            await this.logRiskClassification(message, structuredRisk);
            
            // Cache the result
            this.riskCache.set(this.generateMessageHash(message), structuredRisk);
            
            return structuredRisk;
            
        } catch (error) {
            console.error('❌ Message risk classification failed:', error);
            throw error;
        }
    }

    async updateRiskData(newData) {
        if (!newData) return;
        
        try {
            // Process Worker-validated risk metrics
            const validatedData = this.validateWorkerData(newData);
            
            // Update cached data
            this.currentData = validatedData;
            
            // Update risk trend calculations
            const riskMetrics = this.processRiskMetrics(validatedData);
            this.riskMetrics = riskMetrics;
            
            // Update summary display
            this.updateRiskSummary(riskMetrics);
            
            // Refresh alert configurations
            this.updateRiskAlerts(validatedData.risk_assessments);
            
            // Update visualizations
            this.renderRiskOverview(validatedData);
            this.renderRiskTrends(validatedData.risk_assessments);
            
            console.log('✅ Risk data updated successfully');
            
        } catch (error) {
            console.error('❌ Risk data update failed:', error);
            this.showError('Failed to update risk data');
        }
    }

    processRiskMetrics(riskData) {
        const assessments = riskData.risk_assessments || [];
        
        if (assessments.length === 0) {
            return {
                totalMessages: 0,
                highRiskMessages: 0,
                averageRisk: 0,
                riskTrend: 0,
                activeAlerts: 0
            };
        }
        
        const totalMessages = assessments.length;
        const highRiskMessages = assessments.filter(a => (a.overall_score || 0) >= 80).length;
        const totalRisk = assessments.reduce((sum, a) => sum + (a.overall_score || 0), 0);
        const averageRisk = totalRisk / totalMessages;
        
        // Calculate trend (compare with previous period)
        const currentPeriodAvg = averageRisk;
        const previousPeriodAvg = riskData.previous_period_avg || averageRisk;
        const riskTrend = currentPeriodAvg - previousPeriodAvg;
        
        // Count active alerts
        const activeAlerts = assessments.filter(a => (a.overall_score || 0) >= 70).length;
        
        return {
            totalMessages,
            highRiskMessages,
            averageRisk: Math.round(averageRisk * 100) / 100,
            riskTrend: Math.round(riskTrend * 100) / 100,
            activeAlerts
        };
    }

    updateRiskSummary(metrics) {
        const totalMessagesEl = this.container.querySelector('#total-messages');
        const highRiskEl = this.container.querySelector('#high-risk-count');
        const avgRiskEl = this.container.querySelector('#avg-risk-score');
        const activeAlertsEl = this.container.querySelector('#active-alerts');
        
        if (totalMessagesEl) {
            totalMessagesEl.textContent = metrics.totalMessages;
        }
        
        if (highRiskEl) {
            highRiskEl.textContent = metrics.highRiskMessages;
            highRiskEl.className = `metric-value ${metrics.highRiskMessages > 0 ? 'high-risk' : 'low-risk'}`;
        }
        
        if (avgRiskEl) {
            const avgRisk = metrics.averageRisk;
            avgRiskEl.textContent = Math.round(avgRisk);
            avgRiskEl.className = `metric-value ${this.getRiskClass(avgRisk)}`;
        }
        
        if (activeAlertsEl) {
            activeAlertsEl.textContent = metrics.activeAlerts;
            activeAlertsEl.className = `metric-value ${metrics.activeAlerts > 0 ? 'has-alerts' : 'no-alerts'}`;
        }
    }

    renderRiskOverview(riskData) {
        const assessments = riskData.risk_assessments || [];
        
        // Calculate category averages
        const categoryAverages = this.calculateCategoryAverages(assessments);
        
        // Update overall risk gauge
        this.renderRiskGauge(categoryAverages.overall);
        
        // Update category scores
        this.updateCategoryScores(categoryAverages);
    }

    renderRiskGauge(overallRisk) {
        const gaugeCanvas = this.container.querySelector('#risk-gauge-chart');
        const gaugeValue = this.container.querySelector('#overall-risk-value');
        
        if (gaugeValue) {
            gaugeValue.textContent = Math.round(overallRisk);
            gaugeValue.className = `gauge-value ${this.getRiskClass(overallRisk)}`;
        }
        
        if (!gaugeCanvas) return;
        
        const ctx = gaugeCanvas.getContext('2d');
        
        // Destroy existing chart
        if (this.gaugeChart) {
            this.gaugeChart.destroy();
        }
        
        this.gaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [overallRisk, 100 - overallRisk],
                    backgroundColor: [
                        this.getRiskColor(overallRisk),
                        '#E5E7EB'
                    ],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    updateCategoryScores(categoryAverages) {
        Object.entries(categoryAverages).forEach(([category, score]) => {
            if (category === 'overall') return;
            
            const categoryEl = this.container.querySelector(`#${category}-risk .category-score`);
            if (categoryEl) {
                categoryEl.textContent = Math.round(score);
                categoryEl.className = `category-score ${this.getRiskClass(score)}`;
            }
        });
    }

    renderRiskAlerts(assessments) {
        const alertsContainer = this.container.querySelector('#alerts-container');
        if (!alertsContainer) return;
        
        const highRiskAssessments = assessments.filter(a => (a.overall_score || 0) >= 70);
        
        if (highRiskAssessments.length === 0) {
            alertsContainer.innerHTML = `
                <div class="no-alerts">
                    <div class="no-alerts-icon">✅</div>
                    <h4>No Active Alerts</h4>
                    <p>All messages are within acceptable risk levels.</p>
                </div>
            `;
            return;
        }
        
        alertsContainer.innerHTML = highRiskAssessments.slice(0, 10).map(assessment => {
            const riskLevel = this.getRiskLevel(assessment.overall_score);
            
            return `
                <div class="risk-alert ${riskLevel}" data-message-id="${assessment.message_id}">
                    <div class="alert-header">
                        <div class="alert-icon">${this.getRiskIcon(assessment.overall_score)}</div>
                        <div class="alert-info">
                            <h5>${riskLevel.toUpperCase()} RISK DETECTED</h5>
                            <span class="alert-score">Risk Score: ${Math.round(assessment.overall_score || 0)}/100</span>
                        </div>
                        <div class="alert-time">${this.formatDate(assessment.analyzed_at)}</div>
                    </div>
                    
                    <div class="alert-content">
                        <div class="message-preview">
                            "${(assessment.message_preview || assessment.message_content || 'Message content').substring(0, 150)}..."
                        </div>
                        
                        ${assessment.risk_factors && assessment.risk_factors.length > 0 ? `
                            <div class="risk-factors">
                                <h6>Risk Factors:</h6>
                                <ul>
                                    ${assessment.risk_factors.slice(0, 3).map(factor => `<li>${factor}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="alert-actions">
                        <button class="btn-small" onclick="dashboard.reviewMessage('${assessment.message_id}')">
                            📝 Review
                        </button>
                        <button class="btn-small" onclick="dashboard.approveMessage('${assessment.message_id}')">
                            ✅ Approve
                        </button>
                        <button class="btn-small risk-btn" onclick="dashboard.blockMessage('${assessment.message_id}')">
                            🚫 Block
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRiskTrends(assessments) {
        const trendCanvas = this.container.querySelector('#risk-trend-chart');
        if (!trendCanvas) return;
        
        const ctx = trendCanvas.getContext('2d');
        
        // Destroy existing chart
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        // Aggregate by day
        const dailyRisk = this.aggregateRiskByDay(assessments);
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyRisk.labels,
                datasets: [{
                    label: 'Average Risk Score',
                    data: dailyRisk.values,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'High Risk Count',
                    data: dailyRisk.highRiskCounts,
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Risk Score'
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'High Risk Count'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterBody: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                return `Total Messages: ${dailyRisk.totalCounts[index]}`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderHighRiskMessages(assessments) {
        const messagesList = this.container.querySelector('#messages-list');
        if (!messagesList) return;
        
        const highRiskMessages = assessments
            .filter(a => (a.overall_score || 0) >= 80)
            .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
            .slice(0, 5);
        
        if (highRiskMessages.length === 0) {
            messagesList.innerHTML = `
                <div class="no-high-risk">
                    <div class="success-icon">✅</div>
                    <h4>No High Risk Messages</h4>
                    <p>All recent messages are within acceptable risk levels.</p>
                </div>
            `;
            return;
        }
        
        messagesList.innerHTML = highRiskMessages.map(assessment => `
            <div class="high-risk-message" data-message-id="${assessment.message_id}">
                <div class="message-header">
                    <div class="risk-score ${this.getRiskClass(assessment.overall_score)}">
                        ${Math.round(assessment.overall_score || 0)}
                    </div>
                    <div class="message-info">
                        <span class="message-date">${this.formatDate(assessment.analyzed_at)}</span>
                        <span class="message-platform">${assessment.platform || 'Instagram'}</span>
                    </div>
                </div>
                
                <div class="message-content">
                    <p>"${(assessment.message_content || assessment.message_preview || 'Message content').substring(0, 200)}..."</p>
                </div>
                
                <div class="risk-details">
                    <div class="category-breakdown">
                        ${Object.entries(assessment.category_scores || {}).map(([category, score]) => `
                            <div class="category-item">
                                <span class="category-label">${this.formatCategoryName(category)}:</span>
                                <span class="category-value ${this.getRiskClass(score)}">${Math.round(score)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="message-actions">
                    <button class="btn-small" onclick="dashboard.viewFullMessage('${assessment.message_id}')">
                        👁️ View Full
                    </button>
                    <button class="btn-small" onclick="dashboard.editMessage('${assessment.message_id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn-small risk-btn" onclick="dashboard.deleteMessage('${assessment.message_id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async generateMitigationRecommendations(riskData) {
        try {
            const mitigationContainer = this.container.querySelector('#risk-mitigation .mitigation-content');
            if (!mitigationContainer) return;
            
            mitigationContainer.innerHTML = '<div class="loading-mitigation">Generating mitigation strategies...</div>';
            
            // Generate recommendations via Claude Worker
            const recommendations = await this.claudeService.generateInsights({
                type: 'risk_mitigation',
                risk_data: riskData,
                risk_metrics: this.riskMetrics,
                timeframe: this.filters.timeframe || '7d'
            });
            
            if (recommendations && recommendations.mitigation_strategies) {
                this.renderMitigationStrategies(recommendations.mitigation_strategies);
            } else {
                this.renderDefaultMitigation(riskData);
            }
            
        } catch (error) {
            console.error('❌ Failed to generate mitigation recommendations:', error);
            this.renderDefaultMitigation(riskData);
        }
    }

    renderMitigationStrategies(strategies) {
        const mitigationContainer = this.container.querySelector('#risk-mitigation .mitigation-content');
        if (!mitigationContainer) return;
        
        mitigationContainer.innerHTML = `
            <div class="mitigation-grid">
                ${strategies.map(strategy => `
                    <div class="mitigation-card ${strategy.priority || 'medium'}">
                        <div class="mitigation-header">
                            <h5>${strategy.title}</h5>
                            <span class="priority-badge ${strategy.priority}">${strategy.priority}</span>
                        </div>
                        
                        <div class="mitigation-content">
                            <p>${strategy.description}</p>
                            
                            ${strategy.implementation_steps ? `
                                <div class="implementation-steps">
                                    <h6>Implementation:</h6>
                                    <ol>
                                        ${strategy.implementation_steps.map(step => `<li>${step}</li>`).join('')}
                                    </ol>
                                </div>
                            ` : ''}
                            
                            ${strategy.expected_impact ? `
                                <div class="expected-impact">
                                    <strong>Expected Impact:</strong> ${strategy.expected_impact}% risk reduction
                                </div>
                            ` : ''}
                        </div>
                        
                        ${strategy.action ? `
                            <div class="mitigation-action">
                                <button class="mitigation-btn" onclick="dashboard.implementMitigation('${strategy.id}')">
                                    ${strategy.action}
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDefaultMitigation(riskData) {
        const mitigationContainer = this.container.querySelector('#risk-mitigation .mitigation-content');
        if (!mitigationContainer) return;
        
        const strategies = this.generateBasicMitigation(riskData);
        
        mitigationContainer.innerHTML = `
            <div class="mitigation-grid">
                ${strategies.map(strategy => `
                    <div class="mitigation-card ${strategy.priority}">
                        <div class="mitigation-header">
                            <h5>${strategy.title}</h5>
                            <span class="priority-badge ${strategy.priority}">${strategy.priority}</span>
                        </div>
                        <div class="mitigation-content">
                            <p>${strategy.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateBasicMitigation(riskData) {
        const strategies = [];
        const avgRisk = this.riskMetrics.averageRisk;
        
        if (avgRisk > 70) {
            strategies.push({
                priority: 'high',
                title: 'Review Message Templates',
                description: 'High average risk detected. Review and update message templates to reduce risk factors.'
            });
        }
        
        if (this.riskMetrics.highRiskMessages > 5) {
            strategies.push({
                priority: 'high',
                title: 'Implement Content Approval',
                description: 'Multiple high-risk messages detected. Implement a content approval workflow.'
            });
        }
        
        strategies.push({
            priority: 'medium',
            title: 'Training and Guidelines',
            description: 'Provide team training on message compliance and risk factors to prevent future issues.'
        });
        
        return strategies;
    }

    async scanRecentMessages() {
        try {
            const scanBtn = this.container.querySelector('#scan-messages-btn');
            if (scanBtn) {
                scanBtn.disabled = true;
                scanBtn.textContent = '🔍 Scanning...';
            }
            
            // Trigger immediate scan via Worker
            const scanResults = await this.analyticsService.scanRecentMessages({
                timeframe: this.filters.timeframe || '24h',
                include_analysis: true
            });
            
            if (scanResults) {
                await this.updateRiskData(scanResults);
                window.OsliraApp.showMessage('Message scan completed', 'success');
            }
            
        } catch (error) {
            console.error('❌ Message scan failed:', error);
            window.OsliraApp.showMessage('Message scan failed: ' + error.message, 'error');
        } finally {
            const scanBtn = this.container.querySelector('#scan-messages-btn');
            if (scanBtn) {
                scanBtn.disabled = false;
                scanBtn.textContent = '🔍 Scan Recent Messages';
            }
        }
    }

    calculateCategoryAverages(assessments) {
        if (assessments.length === 0) {
            return {
                overall: 0,
                spam: 0,
                inappropriate: 0,
                compliance: 0,
                reputation: 0
            };
        }
        
        const totals = {
            overall: 0,
            spam: 0,
            inappropriate: 0,
            compliance: 0,
            reputation: 0
        };
        
        assessments.forEach(assessment => {
            totals.overall += assessment.overall_score || 0;
            if (assessment.category_scores) {
                totals.spam += assessment.category_scores.spam || 0;
                totals.inappropriate += assessment.category_scores.inappropriate || 0;
                totals.compliance += assessment.category_scores.compliance || 0;
                totals.reputation += assessment.category_scores.reputation || 0;
            }
        });
        
        const count = assessments.length;
        return {
            overall: totals.overall / count,
            spam: totals.spam / count,
            inappropriate: totals.inappropriate / count,
            compliance: totals.compliance / count,
            reputation: totals.reputation / count
        };
    }

    aggregateRiskByDay(assessments) {
        const dailyAgg = {};
        
        assessments.forEach(assessment => {
            const day = new Date(assessment.analyzed_at).toISOString().split('T')[0];
            if (!dailyAgg[day]) {
                dailyAgg[day] = { scores: [], highRiskCount: 0, totalCount: 0 };
            }
            
            dailyAgg[day].scores.push(assessment.overall_score || 0);
            dailyAgg[day].totalCount++;
            
            if ((assessment.overall_score || 0) >= 80) {
                dailyAgg[day].highRiskCount++;
            }
        });
        
        const sortedDays = Object.keys(dailyAgg).sort();
        
        return {
            labels: sortedDays.map(day => new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            values: sortedDays.map(day => {
                const scores = dailyAgg[day].scores;
                return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            }),
            highRiskCounts: sortedDays.map(day => dailyAgg[day].highRiskCount),
            totalCounts: sortedDays.map(day => dailyAgg[day].totalCount)
        };
    }

    updateRiskAlerts(assessments) {
        // Update alert system with new data
        this.alertSystem.clear();
        
        assessments.forEach(assessment => {
            if ((assessment.overall_score || 0) >= 70) {
                this.alertSystem.set(assessment.message_id, {
                    level: this.getRiskLevel(assessment.overall_score),
                    score: assessment.overall_score,
                    factors: assessment.risk_factors || [],
                    created_at: assessment.analyzed_at
                });
            }
        });
    }

    applyFilters() {
        if (this.currentData && this.currentData.risk_assessments) {
            const filteredAssessments = this.filterRiskAssessments(this.currentData.risk_assessments);
            this.renderRiskAlerts(filteredAssessments);
            this.renderHighRiskMessages(filteredAssessments);
        }
    }

    filterRiskAssessments(assessments) {
        let filtered = [...assessments];
        
        // Filter by risk level
        if (this.filters.riskLevel && this.filters.riskLevel !== 'all') {
            switch (this.filters.riskLevel) {
                case 'high':
                    filtered = filtered.filter(a => (a.overall_score || 0) >= 80);
                    break;
                case 'medium':
                    filtered = filtered.filter(a => (a.overall_score || 0) >= 50 && (a.overall_score || 0) < 80);
                    break;
                case 'low':
                    filtered = filtered.filter(a => (a.overall_score || 0) < 50);
                    break;
            }
        }
        
        // Filter by category
        if (this.filters.category && this.filters.category !== 'all') {
            filtered = filtered.filter(a => {
                const categoryScore = a.category_scores?.[this.filters.category] || 0;
                return categoryScore >= 50; // Show items with significant risk in this category
            });
        }
        
        return filtered;
    }

    async logRiskClassification(message, riskAssessment) {
        try {
            const logData = {
                message_hash: this.generateMessageHash(message),
                risk_assessment: riskAssessment,
                user_id: window.OsliraApp.user?.id,
                timestamp: new Date().toISOString()
            };
            
            await window.OsliraApp.dataWriteService?.logAuditTrail('risk_classification', logData);
        } catch (error) {
            console.error('❌ Failed to log risk classification:', error);
        }
    }

    generateMessageHash(message) {
        // Simple hash function for message identification
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    getRiskLevel(score) {
        if (score >= 80) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    }

    getRiskClass(score) {
        if (score >= 80) return 'high-risk';
        if (score >= 50) return 'medium-risk';
        return 'low-risk';
    }

    getRiskColor(score) {
        if (score >= 80) return '#EF4444';
        if (score >= 50) return '#F59E0B';
        return '#10B981';
    }

    getRiskIcon(score) {
        if (score >= 80) return '🚨';
        if (score >= 50) return '⚠️';
        return '✅';
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
        
        if (!Array.isArray(data.risk_assessments)) {
            throw new Error('Missing risk_assessments array in Worker response');
        }
        
        return data;
    }

    showLoading(show) {
        const loadingEl = this.container.querySelector('#risk-loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const overviewContainer = this.container.querySelector('#risk-overview');
        if (overviewContainer) {
            overviewContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Error Loading Risk Data</h3>
                    <p>${message}</p>
                    <button class="btn-small" onclick="this.render()">Retry</button>
                </div>
            `;
        }
    }

    displayNoData() {
        const overviewContainer = this.container.querySelector('#risk-overview');
        if (overviewContainer) {
            overviewContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🛡️</div>
                    <h3>No Risk Data Available</h3>
                    <p>Start analyzing messages to see risk assessments.</p>
                    <button class="btn-primary" onclick="this.scanRecentMessages()">
                        🔍 Scan Messages
                    </button>
                </div>
            `;
        }
    }

    destroy() {
        if (this.gaugeChart) {
            this.gaugeChart.destroy();
            this.gaugeChart = null;
        }
        
        if (this.trendChart) {
            this.trendChart.destroy();
            this.trendChart = null;
        }
        
        this.riskCache.clear();
        this.alertSystem.clear();
        this.riskTrends = [];
        this.currentData = null;
        
        // Clear risk metrics
        this.riskMetrics = {
            totalMessages: 0,
            highRiskMessages: 0,
            averageRisk: 0,
            riskTrend: 0,
            activeAlerts: 0
        };
        
        // Remove event listeners
        const controls = this.container?.querySelectorAll('select, button');
        controls?.forEach(control => {
            control.replaceWith(control.cloneNode(true));
        });
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🗑️ SecureMessageRiskClassifier destroyed');
    }
}
export { SecureMessageRiskClassifier };
