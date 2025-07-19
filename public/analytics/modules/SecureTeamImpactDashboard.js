class SecureTeamImpactDashboard {
    constructor(container, secureAnalyticsService) {
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        this.chartInstance = null;
        this.currentData = null;
        this.filters = {};
        
        // Initialize team tracking state
        this.teamMembers = new Map();
        this.performanceCache = new Map();
        this.coachingInsights = [];
        
        // Team metrics
        this.teamMetrics = {
            totalMembers: 0,
            avgPerformance: 0,
            topPerformer: null,
            improvementRate: 0
        };
        
        // Setup container structure
        this.initializeContainer();
        
        console.log('👥 SecureTeamImpactDashboard initialized');
    }

    initializeContainer() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="team-dashboard-header">
                <div class="team-controls">
                    <select id="team-metric" class="control-select">
                        <option value="overall">Overall Performance</option>
                        <option value="response_rate">Response Rate</option>
                        <option value="conversion_rate">Conversion Rate</option>
                        <option value="claude_usage">Claude Utilization</option>
                        <option value="improvement">Improvement Rate</option>
                    </select>
                    <select id="team-timeframe" class="control-select">
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </select>
                    <select id="team-sort" class="control-select">
                        <option value="performance_desc">Top Performers</option>
                        <option value="improvement_desc">Most Improved</option>
                        <option value="claude_usage_desc">Claude Power Users</option>
                        <option value="alphabetical">Alphabetical</option>
                    </select>
                </div>
                
                <div class="team-summary">
                    <div class="team-metric">
                        <span class="metric-value" id="total-members">0</span>
                        <span class="metric-label">Team Members</span>
                    </div>
                    <div class="team-metric">
                        <span class="metric-value" id="avg-performance">0%</span>
                        <span class="metric-label">Avg Performance</span>
                    </div>
                    <div class="team-metric">
                        <span class="metric-value" id="improvement-rate">0%</span>
                        <span class="metric-label">Improvement Rate</span>
                    </div>
                </div>
            </div>
            
            <div class="team-content">
                <div class="team-visualization">
                    <div class="chart-container">
                        <canvas id="team-performance-chart"></canvas>
                    </div>
                    <div class="team-loading" id="team-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Loading team performance data...</p>
                    </div>
                </div>
                
                <div class="team-leaderboard">
                    <h4>🏆 Team Leaderboard</h4>
                    <div class="leaderboard-list" id="leaderboard-list">
                        <!-- Team member rankings populate here -->
                    </div>
                </div>
            </div>
            
            <div class="team-details">
                <div class="team-members-grid" id="team-members-grid">
                    <!-- Individual team member cards populate here -->
                </div>
            </div>
            
            <div class="coaching-insights" id="coaching-insights">
                <h4>🎯 AI Coaching Insights</h4>
                <div class="insights-content">
                    <!-- AI-generated coaching recommendations populate here -->
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Metric selector
        const metricSelect = this.container.querySelector('#team-metric');
        const timeframeSelect = this.container.querySelector('#team-timeframe');
        const sortSelect = this.container.querySelector('#team-sort');
        
        if (metricSelect) {
            metricSelect.addEventListener('change', (e) => {
                this.filters.metric = e.target.value;
                this.updateVisualization();
            });
        }
        
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.filters.timeframe = e.target.value;
                this.render(this.filters);
            });
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sortBy = e.target.value;
                this.updateTeamDisplay();
            });
        }
    }

    async render(filters = {}) {
        try {
            this.filters = { ...this.filters, ...filters };
            this.showLoading(true);
            
            // Check credits before expensive team analysis
            const creditCheck = await window.OsliraApp.creditService?.checkBalance();
            if (creditCheck && creditCheck.balance < 2) {
                throw new Error('Insufficient credits for team performance analysis');
            }
            
            // Fetch team data via Worker processing
            const teamData = await this.analyticsService.getTeamImpact(this.filters);
            
            if (!teamData || !teamData.members) {
                this.displayNoData();
                return;
            }
            
            this.currentData = teamData;
            
            // Calculate team metrics server-side
            const teamMetrics = this.processTeamMetrics(teamData);
            this.teamMetrics = teamMetrics;
            
            // Update summary display
            this.updateTeamSummary(teamMetrics);
            
            // Create team performance visualization
            this.createTeamChart(teamData);
            
            // Render team leaderboard
            this.renderTeamLeaderboard(teamData.members);
            
            // Render individual member cards
            this.renderTeamMembersGrid(teamData.members);
            
            // Generate coaching insights via Claude Worker
            await this.generateCoachingInsights(teamData);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ Team dashboard render failed:', error);
            this.showError(error.message);
            this.showLoading(false);
        }
    }

    async updateTeamData(newData) {
        if (!newData) return;
        
        try {
            // Process Worker-validated team metrics
            const validatedData = this.validateWorkerData(newData);
            
            // Update cached data
            this.currentData = validatedData;
            
            // Update ranking calculations
            const teamMetrics = this.processTeamMetrics(validatedData);
            this.teamMetrics = teamMetrics;
            
            // Update summary display
            this.updateTeamSummary(teamMetrics);
            
            // Refresh coaching recommendations
            await this.generateCoachingInsights(validatedData);
            
            // Update visualizations
            if (this.chartInstance) {
                this.updateChart(validatedData);
            }
            
            // Refresh team displays
            this.updateTeamDisplay();
            
            console.log('✅ Team data updated successfully');
            
        } catch (error) {
            console.error('❌ Team data update failed:', error);
            this.showError('Failed to update team data');
        }
    }

    createTeamChart(data) {
        const chartContainer = this.container.querySelector('#team-performance-chart');
        if (!chartContainer) return;
        
        const ctx = chartContainer.getContext('2d');
        
        // Destroy existing chart
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        // Use Worker-calculated team metrics
        const members = data.members || [];
        const selectedMetric = this.filters.metric || 'overall';
        
        // Display performance rankings
        const chartData = members.slice(0, 10).map(member => ({
            name: member.name || member.email?.split('@')[0] || 'Unknown',
            value: this.getMemberMetricValue(member, selectedMetric),
            improvement: member.improvement_rate || 0,
            claudeUsage: member.claude_utilization || 0
        }));
        
        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(item => item.name),
                datasets: [{
                    label: this.getMetricLabel(selectedMetric),
                    data: chartData.map(item => item.value),
                    backgroundColor: chartData.map(item => this.getPerformanceColor(item.value)),
                    borderColor: chartData.map(item => this.getPerformanceColor(item.value, 0.8)),
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        max: selectedMetric === 'claude_usage' ? 100 : 
                             selectedMetric.includes('rate') ? 100 : undefined,
                        title: {
                            display: true,
                            text: this.getMetricUnit(selectedMetric)
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const member = chartData[context.dataIndex];
                                return [
                                    `${this.getMetricLabel(selectedMetric)}: ${member.value}${this.getMetricUnit(selectedMetric)}`,
                                    `Improvement: ${member.improvement > 0 ? '+' : ''}${member.improvement}%`,
                                    `Claude Usage: ${member.claudeUsage}%`
                                ];
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const member = members[index];
                        this.showMemberDetails(member);
                    }
                }
            }
        });
    }

    renderTeamLeaderboard(members) {
        const leaderboardList = this.container.querySelector('#leaderboard-list');
        if (!leaderboardList) return;
        
        if (!members || members.length === 0) {
            leaderboardList.innerHTML = '<p>No team members found</p>';
            return;
        }
        
        // Sort by current metric
        const sortedMembers = this.sortTeamMembers(members).slice(0, 5);
        
        leaderboardList.innerHTML = sortedMembers.map((member, index) => {
            const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const selectedMetric = this.filters.metric || 'overall';
            const value = this.getMemberMetricValue(member, selectedMetric);
            
            return `
                <div class="leaderboard-item rank-${index + 1}" data-member-id="${member.id}">
                    <div class="rank-icon">${rankIcon}</div>
                    <div class="member-info">
                        <div class="member-name">${member.name || member.email?.split('@')[0] || 'Unknown'}</div>
                        <div class="member-score">${value}${this.getMetricUnit(selectedMetric)}</div>
                    </div>
                    <div class="member-trend ${member.improvement_rate > 0 ? 'up' : member.improvement_rate < 0 ? 'down' : 'stable'}">
                        ${member.improvement_rate > 0 ? '📈' : member.improvement_rate < 0 ? '📉' : '➡️'}
                        ${Math.abs(member.improvement_rate || 0)}%
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTeamMembersGrid(members) {
        const membersGrid = this.container.querySelector('#team-members-grid');
        if (!membersGrid) return;
        
        if (!members || members.length === 0) {
            membersGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>No Team Members Found</h3>
                    <p>Add team members to see performance analytics.</p>
                </div>
            `;
            return;
        }
        
        const sortedMembers = this.sortTeamMembers(members);
        
        membersGrid.innerHTML = sortedMembers.map(member => {
            const performanceScore = member.overall_score || 0;
            const performanceClass = performanceScore >= 80 ? 'high' : 
                                   performanceScore >= 60 ? 'medium' : 'low';
            
            const claudeUsage = member.claude_utilization || 0;
            const usageClass = claudeUsage >= 70 ? 'high' : 
                              claudeUsage >= 40 ? 'medium' : 'low';
            
            return `
                <div class="team-member-card" data-member-id="${member.id}">
                    <div class="member-header">
                        <div class="member-avatar">
                            ${(member.name || member.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div class="member-info">
                            <h4>${member.name || member.email?.split('@')[0] || 'Unknown'}</h4>
                            <span class="member-role">${member.role || 'Team Member'}</span>
                        </div>
                        <div class="member-status ${member.status || 'active'}">
                            ${member.status === 'active' ? '🟢' : '🔴'}
                        </div>
                    </div>
                    
                    <div class="member-metrics">
                        <div class="metric-row">
                            <span class="metric-label">Performance</span>
                            <div class="metric-bar">
                                <div class="bar-fill ${performanceClass}" style="width: ${performanceScore}%"></div>
                                <span class="metric-value">${performanceScore}/100</span>
                            </div>
                        </div>
                        
                        <div class="metric-row">
                            <span class="metric-label">Claude Usage</span>
                            <div class="metric-bar">
                                <div class="bar-fill ${usageClass}" style="width: ${claudeUsage}%"></div>
                                <span class="metric-value">${claudeUsage}%</span>
                            </div>
                        </div>
                        
                        <div class="metric-row">
                            <span class="metric-label">Response Rate</span>
                            <span class="metric-value">${member.response_rate || 0}%</span>
                        </div>
                        
                        <div class="metric-row">
                            <span class="metric-label">Conversion Rate</span>
                            <span class="metric-value">${member.conversion_rate || 0}%</span>
                        </div>
                    </div>
                    
                    <div class="member-insights">
                        <div class="insight-item ${member.improvement_rate > 0 ? 'positive' : member.improvement_rate < 0 ? 'negative' : 'neutral'}">
                            <span class="insight-icon">
                                ${member.improvement_rate > 0 ? '📈' : member.improvement_rate < 0 ? '📉' : '➡️'}
                            </span>
                            <span class="insight-text">
                                ${member.improvement_rate > 0 ? '+' : ''}${member.improvement_rate || 0}% this period
                            </span>
                        </div>
                        
                        ${member.coaching_priority ? `
                            <div class="coaching-flag ${member.coaching_priority}">
                                <span class="flag-icon">🎯</span>
                                <span class="flag-text">${this.getCoachingPriorityText(member.coaching_priority)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="member-actions">
                        <button class="btn-small" onclick="dashboard.viewMemberDetails('${member.id}')">
                            📊 View Details
                        </button>
                        <button class="btn-small" onclick="dashboard.generateCoaching('${member.id}')">
                            🎯 Get Coaching
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async generateCoachingInsights(teamData) {
        try {
            const insightsContainer = this.container.querySelector('#coaching-insights .insights-content');
            if (!insightsContainer) return;
            
            insightsContainer.innerHTML = '<div class="loading-insights">Generating coaching insights...</div>';
            
            // Generate coaching insights via Claude Worker
            const insights = await window.OsliraApp.claudeService?.generateInsights({
                type: 'team_coaching',
                team_metrics: this.teamMetrics,
                members: teamData.members,
                timeframe: this.filters.timeframe || '30d'
            });
            
            if (insights && insights.coaching_recommendations) {
                this.renderCoachingInsights(insights.coaching_recommendations);
            } else {
                this.renderDefaultCoachingInsights(teamData);
            }
            
        } catch (error) {
            console.error('❌ Failed to generate coaching insights:', error);
            this.renderDefaultCoachingInsights(teamData);
        }
    }

    renderCoachingInsights(recommendations) {
        const insightsContainer = this.container.querySelector('#coaching-insights .insights-content');
        if (!insightsContainer) return;
        
        insightsContainer.innerHTML = `
            <div class="coaching-grid">
                ${recommendations.map(rec => `
                    <div class="coaching-card ${rec.priority || 'medium'}">
                        <div class="coaching-header">
                            <h5>${rec.title}</h5>
                            <span class="priority-badge ${rec.priority}">${rec.priority}</span>
                        </div>
                        <div class="coaching-content">
                            <p>${rec.description}</p>
                            ${rec.target_members ? `
                                <div class="target-members">
                                    <strong>Focus on:</strong> ${rec.target_members.join(', ')}
                                </div>
                            ` : ''}
                            ${rec.expected_impact ? `
                                <div class="expected-impact">
                                    <strong>Expected Impact:</strong> +${rec.expected_impact}% improvement
                                </div>
                            ` : ''}
                        </div>
                        ${rec.action ? `
                            <div class="coaching-action">
                                <button class="insight-action" onclick="dashboard.applyCoaching('${rec.id}')">
                                    ${rec.action}
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDefaultCoachingInsights(teamData) {
        const insightsContainer = this.container.querySelector('#coaching-insights .insights-content');
        if (!insightsContainer) return;
        
        const insights = this.generateBasicInsights(teamData);
        
        insightsContainer.innerHTML = `
            <div class="coaching-grid">
                ${insights.map(insight => `
                    <div class="coaching-card ${insight.priority}">
                        <div class="coaching-header">
                            <h5>${insight.title}</h5>
                            <span class="priority-badge ${insight.priority}">${insight.priority}</span>
                        </div>
                        <div class="coaching-content">
                            <p>${insight.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` || '<p>Continue team activities to generate coaching insights.</p>';
    }

    generateBasicInsights(teamData) {
        const insights = [];
        const members = teamData.members || [];
        
        // Low Claude usage insight
        const lowUsageMembers = members.filter(m => (m.claude_utilization || 0) < 30);
        if (lowUsageMembers.length > 0) {
            insights.push({
                priority: 'high',
                title: 'Increase Claude Utilization',
                description: `${lowUsageMembers.length} team members have low Claude usage. Provide training to maximize AI assistance benefits.`
            });
        }
        
        // Performance variation insight
        const scores = members.map(m => m.overall_score || 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variation = Math.max(...scores) - Math.min(...scores);
        
        if (variation > 40) {
            insights.push({
                priority: 'medium',
                title: 'Address Performance Gaps',
                description: `Large performance variation detected (${variation} points). Consider peer mentoring or additional training.`
            });
        }
        
        // Top performer insight
        const topPerformer = members.reduce((top, member) => 
            (member.overall_score || 0) > (top.overall_score || 0) ? member : top, 
            members[0]
        );
        
        if (topPerformer && (topPerformer.overall_score || 0) > 80) {
            insights.push({
                priority: 'low',
                title: 'Leverage Top Performer',
                description: `${topPerformer.name || 'Top performer'} shows excellent results. Consider having them mentor other team members.`
            });
        }
        
        return insights;
    }

    processTeamMetrics(teamData) {
        const members = teamData.members || [];
        
        if (members.length === 0) {
            return {
                totalMembers: 0,
                avgPerformance: 0,
                topPerformer: null,
                improvementRate: 0
            };
        }
        
        const totalPerformance = members.reduce((sum, member) => sum + (member.overall_score || 0), 0);
        const avgPerformance = totalPerformance / members.length;
        
        const totalImprovement = members.reduce((sum, member) => sum + (member.improvement_rate || 0), 0);
        const improvementRate = totalImprovement / members.length;
        
        const topPerformer = members.reduce((top, member) => 
            (member.overall_score || 0) > (top.overall_score || 0) ? member : top
        );
        
        return {
            totalMembers: members.length,
            avgPerformance: Math.round(avgPerformance * 100) / 100,
            topPerformer,
            improvementRate: Math.round(improvementRate * 100) / 100
        };
    }

    updateTeamSummary(metrics) {
        const totalMembersEl = this.container.querySelector('#total-members');
        const avgPerformanceEl = this.container.querySelector('#avg-performance');
        const improvementRateEl = this.container.querySelector('#improvement-rate');
        
        if (totalMembersEl) {
            totalMembersEl.textContent = metrics.totalMembers;
        }
        
        if (avgPerformanceEl) {
            avgPerformanceEl.textContent = `${metrics.avgPerformance}%`;
            avgPerformanceEl.className = `metric-value ${metrics.avgPerformance >= 70 ? 'high' : metrics.avgPerformance >= 50 ? 'medium' : 'low'}`;
        }
        
        if (improvementRateEl) {
            const improvement = metrics.improvementRate;
            improvementRateEl.textContent = `${improvement > 0 ? '+' : ''}${improvement}%`;
            improvementRateEl.className = `metric-value ${improvement > 0 ? 'positive' : improvement < 0 ? 'negative' : 'neutral'}`;
        }
    }

    updateVisualization() {
        if (this.currentData && this.chartInstance) {
            this.createTeamChart(this.currentData);
        }
    }

    updateTeamDisplay() {
        if (this.currentData && this.currentData.members) {
            this.renderTeamLeaderboard(this.currentData.members);
            this.renderTeamMembersGrid(this.currentData.members);
        }
    }

    sortTeamMembers(members) {
        const sortBy = this.filters.sortBy || 'performance_desc';
        
        return [...members].sort((a, b) => {
            switch (sortBy) {
                case 'performance_desc':
                    return (b.overall_score || 0) - (a.overall_score || 0);
                case 'improvement_desc':
                    return (b.improvement_rate || 0) - (a.improvement_rate || 0);
                case 'claude_usage_desc':
                    return (b.claude_utilization || 0) - (a.claude_utilization || 0);
                case 'alphabetical':
                    return (a.name || a.email || '').localeCompare(b.name || b.email || '');
                default:
                    return 0;
            }
        });
    }

    getMemberMetricValue(member, metric) {
        switch (metric) {
            case 'response_rate':
                return member.response_rate || 0;
            case 'conversion_rate':
                return member.conversion_rate || 0;
            case 'claude_usage':
                return member.claude_utilization || 0;
            case 'improvement':
                return member.improvement_rate || 0;
            case 'overall':
            default:
                return member.overall_score || 0;
        }
    }

    getMetricLabel(metric) {
        const labels = {
            overall: 'Overall Performance',
            response_rate: 'Response Rate',
            conversion_rate: 'Conversion Rate',
            claude_usage: 'Claude Utilization',
            improvement: 'Improvement Rate'
        };
        return labels[metric] || 'Performance';
    }

    getMetricUnit(metric) {
        return metric === 'overall' ? '/100' : '%';
    }

    getPerformanceColor(value, alpha = 0.6) {
        if (value >= 80) return `rgba(16, 185, 129, ${alpha})`;
        if (value >= 60) return `rgba(245, 158, 11, ${alpha})`;
        return `rgba(239, 68, 68, ${alpha})`;
    }

    getCoachingPriorityText(priority) {
        const texts = {
            high: 'Needs Support',
            medium: 'Monitor Progress',
            low: 'Performing Well'
        };
        return texts[priority] || 'Review Needed';
    }

    showMemberDetails(member) {
        // Implement member detail modal/view
        console.log('Show details for member:', member);
    }

    validateWorkerData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format from Worker');
        }
        
        if (!Array.isArray(data.members)) {
            throw new Error('Missing members array in Worker response');
        }
        
        return data;
    }

    showLoading(show) {
        const loadingEl = this.container.querySelector('#team-loading');
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
                    <h3>Error Loading Team Data</h3>
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
                    <div class="empty-icon">👥</div>
                    <h3>No Team Data Available</h3>
                    <p>Add team members to see performance analytics.</p>
                </div>
            `;
        }
    }

    updateChart(data) {
        if (!this.chartInstance || !data.members) return;
        
        const selectedMetric = this.filters.metric || 'overall';
        const chartData = data.members.slice(0, 10).map(member => ({
            name: member.name || member.email?.split('@')[0] || 'Unknown',
            value: this.getMemberMetricValue(member, selectedMetric),
            improvement: member.improvement_rate || 0,
            claudeUsage: member.claude_utilization || 0
        }));
        
        this.chartInstance.data.labels = chartData.map(item => item.name);
        this.chartInstance.data.datasets[0].data = chartData.map(item => item.value);
        this.chartInstance.data.datasets[0].backgroundColor = chartData.map(item => this.getPerformanceColor(item.value));
        this.chartInstance.data.datasets[0].borderColor = chartData.map(item => this.getPerformanceColor(item.value, 0.8));
        this.chartInstance.data.datasets[0].label = this.getMetricLabel(selectedMetric);
        
        this.chartInstance.options.scales.x.title.text = this.getMetricUnit(selectedMetric);
        this.chartInstance.update();
    }

    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        this.teamMembers.clear();
        this.performanceCache.clear();
        this.coachingInsights = [];
        this.currentData = null;
        
        // Clear team metrics
        this.teamMetrics = {
            totalMembers: 0,
            avgPerformance: 0,
            topPerformer: null,
            improvementRate: 0
        };
        
        // Remove event listeners
        const controls = this.container?.querySelectorAll('select, button');
        controls?.forEach(control => {
            control.replaceWith(control.cloneNode(true));
        });
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🗑️ SecureTeamImpactDashboard destroyed');
    }
}
export { SecureTeamImpactDashboard };
