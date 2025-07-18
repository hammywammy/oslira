// ==========================================
// ANALYTICS.JS - Strategic Analytics Intelligence System
// Enterprise-ready outreach analytics and insights
// ==========================================

// Prevent browser extension interference
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Could not establish connection')) {
        console.warn('Browser extension communication error (non-critical):', event.message);
        event.preventDefault();
        return false;
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && 
        event.reason.message.includes('Could not establish connection')) {
        console.warn('Browser extension promise rejection (non-critical):', event.reason.message);
        event.preventDefault();
        return false;
    }
});

class OsliraAnalytics {
    constructor() {
        this.currentView = 'overview';
        this.currentTimeframe = '30d';
        this.currentFilter = { crm: 'all', campaign: 'all', team: 'all' };
        this.charts = new Map();
        this.realTimeUpdates = null;
        this.refreshInterval = null;
        this.currentSession = null;
        this.userProfile = null;
        this.businessProfiles = [];
        this.analyticsData = {
            messages: [],
            leads: [],
            feedback: [],
            ctas: [],
            campaigns: [],
            performance: {}
        };
        this.insights = {
            messagePerformance: [],
            leadConversion: [],
            ctaEffectiveness: [],
            riskAssessments: [],
            claude: []
        };
        this.isLoading = false;
        this.lastUpdate = null;
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    async initialize() {
        try {
            console.log('🚀 Initializing Analytics Intelligence System...');
            
            // Check authentication
            await this.checkAuthentication();
            
            // Initialize components
            await this.initializeSupabase();
            await this.loadUserProfile();
            await this.loadBusinessProfiles();
            
            // Setup UI
            this.setupEventListeners();
            this.setupRealTimeUpdates();
            
            // Load initial data
            await this.loadAnalyticsData();
            
            // Start live updates
            this.startRealTimeUpdates();
            
            console.log('✅ Analytics Intelligence System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize analytics:', error);
            this.showErrorState(error.message);
        }
    }

    async checkAuthentication() {
        if (!window.OsliraApp || !window.OsliraApp.supabase) {
            throw new Error('Supabase not available');
        }

        const { data: { session }, error } = await window.OsliraApp.supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = '/auth.html';
            return;
        }

        this.currentSession = session;
        console.log('✅ User authenticated:', session.user.email);
        
        // Update UI with user info
        document.getElementById('user-email').textContent = session.user.email;
    }

    async initializeSupabase() {
        if (!window.OsliraApp.supabase) {
            throw new Error('Supabase not initialized');
        }
        
        this.supabase = window.OsliraApp.supabase;
        console.log('✅ Supabase client ready');
    }

    async loadUserProfile() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', this.currentSession.user.id)
                .single();

            if (error) throw error;
            
            this.userProfile = data;
            console.log('✅ User profile loaded');
            
            // Update UI elements
            this.updateUserInterface();
            
        } catch (error) {
            console.error('❌ Failed to load user profile:', error);
            throw new Error('Could not load user profile');
        }
    }

    async loadBusinessProfiles() {
        try {
            const { data, error } = await this.supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', this.currentSession.user.id);

            if (error) throw error;
            
            this.businessProfiles = data || [];
            console.log(`✅ Loaded ${this.businessProfiles.length} business profiles`);
            
        } catch (error) {
            console.error('❌ Failed to load business profiles:', error);
            this.businessProfiles = [];
        }
    }

    updateUserInterface() {
        if (!this.userProfile) return;
        
        // Update plan information
        const planElement = document.getElementById('plan-name');
        if (planElement) {
            planElement.textContent = this.userProfile.subscription_plan || 'Free Plan';
        }
        
        // Update credits display
        const creditsElement = document.getElementById('credits-remaining');
        if (creditsElement) {
            creditsElement.textContent = this.userProfile.credits || 0;
        }
    }

    // =============================================================================
    // DATA LOADING & PROCESSING
    // =============================================================================

    async loadAnalyticsData() {
        this.setLoadingState(true);
        
        try {
            const [messages, leads, feedback, campaigns] = await Promise.all([
                this.loadMessagesData(),
                this.loadLeadsData(),
                this.loadFeedbackData(),
                this.loadCampaignsData()
            ]);

            this.analyticsData = {
                messages: messages || [],
                leads: leads || [],
                feedback: feedback || [],
                campaigns: campaigns || [],
                performance: await this.calculatePerformanceMetrics()
            };

            // Generate insights
            await this.generateAnalyticsInsights();
            
            // Render current view
            await this.renderCurrentView();
            
            this.lastUpdate = new Date();
            
        } catch (error) {
            console.error('❌ Failed to load analytics data:', error);
            this.showErrorMessage('Failed to load analytics data: ' + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

   async loadMessagesData() {
    try {
        // Use the existing leads table since generated_messages doesn't exist
        const { data, error } = await this.supabase
            .from('leads')
            .select('*')
            .eq('user_id', this.currentSession.user.id)
            .gte('created_at', this.getTimeframeStart())
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        console.log(`✅ Loaded ${data?.length || 0} lead records as message data`);
        return data || [];
        
    } catch (error) {
        console.error('❌ Failed to load messages data:', error);
        return [];
    }
}

   async loadLeadsData() {
    try {
        const { data, error } = await this.supabase
            .from('leads')
            .select('*')
            .eq('user_id', this.currentSession.user.id)
            .gte('created_at', this.getTimeframeStart())
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        console.log(`✅ Loaded ${data?.length || 0} leads`);
        return data || [];
        
    } catch (error) {
        console.error('❌ Failed to load leads data:', error);
        return [];
    }
}


async loadFeedbackData() {
    try {
        // Return empty array since message_feedback table doesn't exist
        console.log('ℹ️ Feedback data not available - using mock data');
        return [];
        
    } catch (error) {
        console.error('❌ Failed to load feedback data:', error);
        return [];
    }
}

async loadCampaignsData() {
    try {
        // Check if campaigns table exists, if not return empty
        const { data, error } = await this.supabase
            .from('campaigns')
            .select('*')
            .eq('user_id', this.currentSession.user.id)
            .gte('created_at', this.getTimeframeStart())
            .order('created_at', { ascending: false });

        if (error) {
            console.log('ℹ️ Campaigns table not available - using empty data');
            return [];
        }
        
        console.log(`✅ Loaded ${data?.length || 0} campaigns`);
        return data || [];
        
    } catch (error) {
        console.error('❌ Failed to load campaigns data:', error);
        return [];
    }
}

    async calculatePerformanceMetrics() {
        const metrics = {
            totalMessages: this.analyticsData.messages.length,
            avgFeedbackScore: 0,
            positiveRatio: 0,
            conversionRate: 0,
            topPerformingTone: null,
            topPerformingCTA: null,
            riskMessages: 0,
            improvementTrend: 0
        };

        if (this.analyticsData.feedback.length > 0) {
            const scores = this.analyticsData.feedback
                .filter(f => f.feedback_type === 'vote' && f.feedback_value)
                .map(f => parseInt(f.feedback_value));
            
            metrics.avgFeedbackScore = scores.length > 0 
                ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
                : 0;
            
            metrics.positiveRatio = scores.filter(score => score >= 3).length / scores.length;
        }

        return metrics;
    }

    // =============================================================================
    // ANALYTICS MODULES
    // =============================================================================

    async generateAnalyticsInsights() {
        await Promise.all([
            this.analyzeMessageStylePerformance(),
            this.analyzeLeadTypeConversion(),
            this.analyzeCTAEffectiveness(),
            this.analyzeClaudeGuidance(),
            this.analyzeFeedbackSignals(),
            this.analyzeTeamPerformance(),
            this.generateRiskAssessments(),
            this.trackMessageIterationROI()
        ]);
    }

    async analyzeMessageStylePerformance() {
        const styleMatrix = {};
        
        this.analyticsData.messages.forEach(message => {
            const tone = message.message_tone || 'unknown';
            const style = message.message_style || 'unknown';
            const structure = message.message_structure || 'unknown';
            
            const key = `${tone}-${style}-${structure}`;
            
            if (!styleMatrix[key]) {
                styleMatrix[key] = {
                    tone,
                    style,
                    structure,
                    count: 0,
                    totalScore: 0,
                    avgScore: 0,
                    positiveCount: 0,
                    negativeCount: 0,
                    conversionCount: 0,
                    feedback: []
                };
            }
            
            styleMatrix[key].count++;
            
            // Process feedback for this message
            const messageFeedback = this.analyticsData.feedback.filter(f => f.message_id === message.id);
            messageFeedback.forEach(feedback => {
                if (feedback.feedback_type === 'vote') {
                    const score = parseInt(feedback.feedback_value);
                    styleMatrix[key].totalScore += score;
                    
                    if (score >= 4) styleMatrix[key].positiveCount++;
                    if (score <= 2) styleMatrix[key].negativeCount++;
                } else if (feedback.feedback_type === 'conversion') {
                    styleMatrix[key].conversionCount++;
                }
                
                styleMatrix[key].feedback.push(feedback);
            });
            
            styleMatrix[key].avgScore = styleMatrix[key].totalScore / styleMatrix[key].count;
        });

        this.insights.messagePerformance = Object.values(styleMatrix)
            .sort((a, b) => b.avgScore - a.avgScore);
        
        console.log('✅ Message style performance analysis complete');
    }

    async analyzeLeadTypeConversion() {
        const leadTypes = {};
        
        this.analyticsData.leads.forEach(lead => {
            const type = this.classifyLeadType(lead);
            
            if (!leadTypes[type]) {
                leadTypes[type] = {
                    type,
                    count: 0,
                    totalScore: 0,
                    avgScore: 0,
                    messagesGenerated: 0,
                    positiveFeedback: 0,
                    conversions: 0,
                    avgEngagement: 0,
                    ctaSuccessRate: 0
                };
            }
            
            leadTypes[type].count++;
            leadTypes[type].totalScore += lead.score || 0;
            
            // Count messages generated for this lead type
            const leadMessages = this.analyticsData.messages.filter(m => m.lead_id === lead.id);
            leadTypes[type].messagesGenerated += leadMessages.length;
            
            // Analyze feedback for lead type
            leadMessages.forEach(message => {
                const feedback = this.analyticsData.feedback.filter(f => f.message_id === message.id);
                feedback.forEach(f => {
                    if (f.feedback_type === 'vote' && parseInt(f.feedback_value) >= 4) {
                        leadTypes[type].positiveFeedback++;
                    } else if (f.feedback_type === 'conversion') {
                        leadTypes[type].conversions++;
                    }
                });
            });
            
            leadTypes[type].avgScore = leadTypes[type].totalScore / leadTypes[type].count;
            leadTypes[type].ctaSuccessRate = leadTypes[type].messagesGenerated > 0 
                ? leadTypes[type].conversions / leadTypes[type].messagesGenerated 
                : 0;
        });

        this.insights.leadConversion = Object.values(leadTypes)
            .sort((a, b) => b.ctaSuccessRate - a.ctaSuccessRate);
        
        console.log('✅ Lead type conversion analysis complete');
    }

    async analyzeCTAEffectiveness() {
        const ctaAnalysis = {};
        
        this.analyticsData.messages.forEach(message => {
            const cta = message.cta_type || this.extractCTAFromMessage(message.content);
            
            if (!ctaAnalysis[cta]) {
                ctaAnalysis[cta] = {
                    cta,
                    usage: 0,
                    avgScore: 0,
                    totalScore: 0,
                    conversions: 0,
                    reuseRate: 0,
                    sentimentRatio: { positive: 0, negative: 0, neutral: 0 }
                };
            }
            
            ctaAnalysis[cta].usage++;
            
            const feedback = this.analyticsData.feedback.filter(f => f.message_id === message.id);
            feedback.forEach(f => {
                if (f.feedback_type === 'vote') {
                    const score = parseInt(f.feedback_value);
                    ctaAnalysis[cta].totalScore += score;
                    
                    if (score >= 4) ctaAnalysis[cta].sentimentRatio.positive++;
                    else if (score <= 2) ctaAnalysis[cta].sentimentRatio.negative++;
                    else ctaAnalysis[cta].sentimentRatio.neutral++;
                } else if (f.feedback_type === 'conversion') {
                    ctaAnalysis[cta].conversions++;
                }
            });
            
            ctaAnalysis[cta].avgScore = ctaAnalysis[cta].totalScore / ctaAnalysis[cta].usage;
        });

        this.insights.ctaEffectiveness = Object.values(ctaAnalysis)
            .sort((a, b) => b.avgScore - a.avgScore);
        
        console.log('✅ CTA effectiveness analysis complete');
    }

    async analyzeClaudeGuidance() {
        try {
            // Generate Claude insights about current performance
            const performanceData = {
                messagePerformance: this.insights.messagePerformance.slice(0, 5),
                leadConversion: this.insights.leadConversion.slice(0, 5),
                ctaEffectiveness: this.insights.ctaEffectiveness.slice(0, 5),
                timeframe: this.currentTimeframe,
                totalMessages: this.analyticsData.messages.length,
                avgScore: this.analyticsData.performance.avgFeedbackScore
            };

            const claudeResponse = await fetch(`${window.ENV_CONFIG.WORKER_URL}/analytics/claude-insights`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentSession.access_token}`
                },
                body: JSON.stringify({
                    user_id: this.currentSession.user.id,
                    performance_data: performanceData,
                    request_type: 'strategic_insights'
                })
            });

            if (claudeResponse.ok) {
                const insights = await claudeResponse.json();
                this.insights.claude = insights.insights || [];
                console.log('✅ Claude guidance analysis complete');
            }
            
        } catch (error) {
            console.warn('⚠️ Claude guidance analysis failed:', error);
            this.insights.claude = [];
        }
    }

    async analyzeFeedbackSignals() {
        const themes = {};
        const issueTrends = {};
        
        this.analyticsData.feedback.forEach(feedback => {
            if (feedback.comment && feedback.comment.trim()) {
                // Analyze comment themes (this would use NLP in production)
                const theme = this.categorizeComment(feedback.comment);
                
                if (!themes[theme]) {
                    themes[theme] = {
                        theme,
                        count: 0,
                        sentiment: { positive: 0, negative: 0, neutral: 0 },
                        examples: [],
                        trend: 'stable'
                    };
                }
                
                themes[theme].count++;
                themes[theme].examples.push(feedback.comment);
                
                // Categorize sentiment
                const sentiment = this.analyzeSentiment(feedback.comment);
                themes[theme].sentiment[sentiment]++;
            }
        });

        this.insights.feedbackSignals = Object.values(themes)
            .sort((a, b) => b.count - a.count);
        
        console.log('✅ Feedback signals analysis complete');
    }

    async analyzeTeamPerformance() {
        // For enterprise customers with team access
        const teamMetrics = {};
        
        // This would analyze performance by team member
        // For now, we'll track user-level performance
        teamMetrics[this.currentSession.user.id] = {
            userId: this.currentSession.user.id,
            email: this.currentSession.user.email,
            messagesGenerated: this.analyticsData.messages.length,
            avgScore: this.analyticsData.performance.avgFeedbackScore,
            improvementRate: 0,
            feedbackAdoption: 0
        };

        this.insights.teamPerformance = Object.values(teamMetrics);
        console.log('✅ Team performance analysis complete');
    }

    async generateRiskAssessments() {
        const riskMessages = [];
        
        this.analyticsData.messages.forEach(message => {
            const risks = this.assessMessageRisk(message);
            if (risks.length > 0) {
                riskMessages.push({
                    messageId: message.id,
                    content: message.content,
                    risks: risks,
                    riskScore: risks.reduce((sum, risk) => sum + risk.severity, 0),
                    leadInfo: this.analyticsData.leads.find(l => l.id === message.lead_id)
                });
            }
        });

        this.insights.riskAssessments = riskMessages
            .sort((a, b) => b.riskScore - a.riskScore);
        
        console.log('✅ Risk assessment analysis complete');
    }

    async trackMessageIterationROI() {
        const iterationData = {};
        
        // Track message revisions and their performance
        this.analyticsData.messages.forEach(message => {
            if (message.original_message_id) {
                const originalId = message.original_message_id;
                
                if (!iterationData[originalId]) {
                    iterationData[originalId] = {
                        originalId,
                        iterations: [],
                        performanceImprovement: 0
                    };
                }
                
                iterationData[originalId].iterations.push(message);
            }
        });

        this.insights.iterationROI = Object.values(iterationData);
        console.log('✅ Message iteration ROI analysis complete');
    }

    // =============================================================================
    // VIEW RENDERING
    // =============================================================================

    async renderCurrentView() {
        const viewContainer = document.getElementById('analytics-content');
        if (!viewContainer) return;

        switch (this.currentView) {
            case 'overview':
                await this.renderOverviewDashboard();
                break;
            case 'message-performance':
                await this.renderMessagePerformanceMatrix();
                break;
            case 'lead-conversion':
                await this.renderLeadConversionHeatmap();
                break;
            case 'cta-effectiveness':
                await this.renderCTAEffectivenessTracker();
                break;
            case 'feedback-explorer':
                await this.renderFeedbackSignalExplorer();
                break;
            case 'claude-guidance':
                await this.renderClaudeGuidanceHistory();
                break;
            case 'risk-assessment':
                await this.renderMessageRiskClassifier();
                break;
            case 'team-impact':
                await this.renderTeamImpactDashboard();
                break;
            default:
                await this.renderOverviewDashboard();
        }
    }

    async renderOverviewDashboard() {
        const content = `
            <div class="analytics-overview">
                <!-- Key Metrics Row -->
                <div class="metrics-grid">
                    <div class="metric-card primary">
                        <div class="metric-icon">📊</div>
                        <div class="metric-content">
                            <div class="metric-value">${this.analyticsData.messages.length}</div>
                            <div class="metric-label">Messages Generated</div>
                            <div class="metric-trend positive">+${this.calculateGrowth('messages')}%</div>
                        </div>
                    </div>
                    
                    <div class="metric-card success">
                        <div class="metric-icon">⭐</div>
                        <div class="metric-content">
                            <div class="metric-value">${this.analyticsData.performance.avgFeedbackScore.toFixed(1)}</div>
                            <div class="metric-label">Avg Message Score</div>
                            <div class="metric-trend ${this.analyticsData.performance.avgFeedbackScore >= 3.5 ? 'positive' : 'negative'}">
                                ${this.analyticsData.performance.avgFeedbackScore >= 3.5 ? '↗' : '↘'} Quality
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-card warning">
                        <div class="metric-icon">🎯</div>
                        <div class="metric-content">
                            <div class="metric-value">${(this.analyticsData.performance.positiveRatio * 100).toFixed(1)}%</div>
                            <div class="metric-label">Positive Feedback</div>
                            <div class="metric-trend positive">+${this.calculateGrowth('positive')}%</div>
                        </div>
                    </div>
                    
                    <div class="metric-card info">
                        <div class="metric-icon">🚀</div>
                        <div class="metric-content">
                            <div class="metric-value">${(this.analyticsData.performance.conversionRate * 100).toFixed(1)}%</div>
                            <div class="metric-label">Conversion Rate</div>
                            <div class="metric-trend positive">ROI Growth</div>
                        </div>
                    </div>
                </div>

                <!-- Performance Charts Row -->
                <div class="charts-grid">
                    <div class="chart-container">
                        <div class="chart-header">
                            <h3>Message Performance Trends</h3>
                            <div class="chart-controls">
                                <select id="performance-timeframe">
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d" selected>Last 30 Days</option>
                                    <option value="90d">Last 90 Days</option>
                                </select>
                            </div>
                        </div>
                        <canvas id="performance-trend-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <div class="chart-header">
                            <h3>Lead Type Distribution</h3>
                        </div>
                        <canvas id="lead-distribution-chart"></canvas>
                    </div>
                </div>

                <!-- Insights Grid -->
                <div class="insights-grid">
                    <div class="insight-card claude-insight">
                        <div class="insight-header">
                            <div class="insight-icon">🧠</div>
                            <h4>Claude Strategic Insights</h4>
                        </div>
                        <div class="insight-content">
                            ${this.renderClaudeInsightsList()}
                        </div>
                    </div>
                    
                    <div class="insight-card performance-insight">
                        <div class="insight-header">
                            <div class="insight-icon">🎯</div>
                            <h4>Top Performing Elements</h4>
                        </div>
                        <div class="insight-content">
                            ${this.renderTopPerformingElements()}
                        </div>
                    </div>
                    
                    <div class="insight-card risk-insight">
                        <div class="insight-header">
                            <div class="insight-icon">⚠️</div>
                            <h4>Risk Assessment</h4>
                        </div>
                        <div class="insight-content">
                            ${this.renderRiskSummary()}
                        </div>
                    </div>
                </div>

                <!-- Action Items -->
                <div class="action-items">
                    <h3>Recommended Actions</h3>
                    <div class="action-grid">
                        ${this.renderActionItems()}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-content').innerHTML = content;
        
        // Initialize charts
        await this.initializeOverviewCharts();
    }

    async renderMessagePerformanceMatrix() {
        const content = `
            <div class="message-performance-matrix">
                <div class="matrix-header">
                    <h2>🎨 Message Style Performance Matrix</h2>
                    <p>3D analysis of tone × structure × engagement across all messaging</p>
                    
                    <div class="matrix-filters">
                        <select id="matrix-crm-filter">
                            <option value="all">All CRMs</option>
                            <option value="hubspot">HubSpot</option>
                            <option value="salesforce">Salesforce</option>
                            <option value="custom">Custom</option>
                        </select>
                        
                        <select id="matrix-vertical-filter">
                            <option value="all">All Verticals</option>
                            <option value="saas">SaaS</option>
                            <option value="ecommerce">E-commerce</option>
                            <option value="agency">Agency</option>
                        </select>
                        
                        <select id="matrix-timeframe">
                            <option value="7d">Last 7 Days</option>
                            <option value="30d" selected>Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                        </select>
                    </div>
                </div>

                <div class="matrix-visualization">
                    <div class="matrix-3d-container">
                        <canvas id="performance-matrix-3d"></canvas>
                    </div>
                    
                    <div class="matrix-legend">
                        <h4>Performance Scale</h4>
                        <div class="legend-gradient">
                            <span>Low (1-2)</span>
                            <div class="gradient-bar"></div>
                            <span>High (4-5)</span>
                        </div>
                    </div>
                </div>

                <div class="matrix-insights">
                    <div class="top-combinations">
                        <h3>🏆 Top Performing Combinations</h3>
                        <div class="combination-list">
                            ${this.renderTopMessageCombinations()}
                        </div>
                    </div>
                    
                    <div class="improvement-opportunities">
                        <h3>🔧 Improvement Opportunities</h3>
                        <div class="opportunity-list">
                            ${this.renderImprovementOpportunities()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-content').innerHTML = content;
        await this.initialize3DMatrix();
    }

    async renderLeadConversionHeatmap() {
        const content = `
            <div class="lead-conversion-heatmap">
                <div class="heatmap-header">
                    <h2>🔍 Lead Type Conversion Heatmap</h2>
                    <p>Performance analysis by lead archetype and engagement patterns</p>
                </div>

                <div class="heatmap-container">
                    <div class="heatmap-grid" id="conversion-heatmap">
                        ${this.renderConversionHeatmapGrid()}
                    </div>
                </div>

                <div class="conversion-analytics">
                    <div class="analytics-row">
                        <div class="lead-type-breakdown">
                            <h3>📊 Lead Type Performance</h3>
                            <canvas id="lead-performance-chart"></canvas>
                        </div>
                        
                        <div class="engagement-analysis">
                            <h3>💬 Engagement Quality Metrics</h3>
                            <div class="engagement-metrics">
                                ${this.renderEngagementMetrics()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="vertical-insights">
                        <h3>🎯 Vertical ROI Analysis</h3>
                        <div class="vertical-grid">
                            ${this.renderVerticalROIGrid()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-content').innerHTML = content;
        await this.initializeHeatmapCharts();
    }

    async renderCTAEffectivenessTracker() {
        const content = `
            <div class="cta-effectiveness-tracker">
                <div class="tracker-header">
                    <h2>📣 CTA Effectiveness Tracker</h2>
                    <p>Performance analysis of call-to-action types across all outreach</p>
                </div>

                <div class="cta-performance-overview">
                    <div class="cta-metrics-grid">
                        <div class="cta-metric">
                            <div class="metric-value">${this.insights.ctaEffectiveness.length}</div>
                            <div class="metric-label">Unique CTAs</div>
                        </div>
                        <div class="cta-metric">
                            <div class="metric-value">${this.getTopCTAScore().toFixed(1)}</div>
                            <div class="metric-label">Best Avg Score</div>
                        </div>
                        <div class="cta-metric">
                            <div class="metric-value">${this.getMostUsedCTA()}</div>
                            <div class="metric-label">Most Used</div>
                        </div>
                    </div>
                </div>

                <div class="cta-analysis-grid">
                    <div class="cta-ranking">
                        <h3>🏆 CTA Performance Ranking</h3>
                        <div class="cta-list">
                            ${this.renderCTARanking()}
                        </div>
                    </div>
                    
                    <div class="cta-trends">
                        <h3>📈 CTA Trend Analysis</h3>
                        <canvas id="cta-trends-chart"></canvas>
                    </div>
                </div>

                <div class="cta-insights">
                    <div class="insight-panels">
                        <div class="cta-insight-panel">
                            <h4>🎯 Cross-CRM Performance</h4>
                            <div class="crm-cta-matrix">
                                ${this.renderCRMCTAMatrix()}
                            </div>
                        </div>
                        
                        <div class="cta-insight-panel">
                            <h4>🔄 Reuse Rate Analysis</h4>
                            <div class="reuse-analysis">
                                ${this.renderReuseAnalysis()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-content').innerHTML = content;
        await this.initializeCTACharts();
    }

    async renderFeedbackSignalExplorer() {
        const content = `
            <div class="feedback-signal-explorer">
                <div class="explorer-header">
                    <h2>🧠 Feedback Signal Explorer</h2>
                    <p>AI-powered analysis of feedback themes and improvement patterns</p>
                </div>

                <div class="signal-overview">
                    <div class="signal-metrics">
                        <div class="signal-metric">
                            <div class="metric-icon">💬</div>
                            <div class="metric-data">
                                <div class="metric-value">${this.analyticsData.feedback.length}</div>
                                <div class="metric-label">Total Feedback</div>
                            </div>
                        </div>
                        <div class="signal-metric">
                            <div class="metric-icon">🎯</div>
                            <div class="metric-data">
                                <div class="metric-value">${this.insights.feedbackSignals.length}</div>
                                <div class="metric-label">Themes Identified</div>
                            </div>
                        </div>
                        <div class="signal-metric">
                            <div class="metric-icon">📈</div>
                            <div class="metric-data">
                                <div class="metric-value">${this.calculateImprovementTrend()}%</div>
                                <div class="metric-label">Improvement Trend</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="signal-analysis">
                    <div class="theme-clusters">
                        <h3>🔍 Feedback Theme Clusters</h3>
                        <div class="cluster-visualization">
                            <canvas id="feedback-clusters-chart"></canvas>
                        </div>
                    </div>
                    
                    <div class="issue-resolution">
                        <h3>⚡ Issue Resolution Tracking</h3>
                        <div class="resolution-timeline">
                            ${this.renderResolutionTimeline()}
                        </div>
                    </div>
                </div>

                <div class="ai-insights">
                    <div class="claude-analysis">
                        <h3>🧠 Claude Root Cause Analysis</h3>
                        <div class="root-cause-cards">
                            ${this.renderRootCauseAnalysis()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-content').innerHTML = content;
        await this.initializeFeedbackCharts();
    }

    async renderClaudeGuidanceHistory() {
        const content = `
            <div class="claude-guidance-history">
                <div class="guidance-header">
                    <h2>🧭 Claude Guidance History</h2>
                    <p>Track Claude's strategic advice and its measurable impact on performance</p>
                </div>

                <div class="guidance-metrics">
                    <div class="metrics-row">
                        <div class="guidance-metric">
                            <div class="metric-value">${this.insights.claude.length}</div>
                            <div class="metric-label">Strategic Insights</div>
                        </div>
                        <div class="guidance-metric">
                            <div class="metric-value">${this.calculateAdviceAdoptionRate()}%</div>
                            <div class="metric-label">Advice Adoption</div>
                        </div>
                        <div class="guidance-metric">
                            <div class="metric-value">+${this.calculateGuidanceImpact()}%</div>
                            <div class="metric-label">Performance Lift</div>
                        </div>
                    </div>
                </div>

                <div class="guidance-timeline">
                    <h3>📅 Guidance Timeline & Impact</h3>
                    <div class="timeline-container">
                        ${this.renderGuidanceTimeline()}
                    </div>
                </div>

                <div class="experimental-suggestions">
                    <h3>🧪 Experimental Suggestions</h3>
                    <div class="experiment-grid">
                        ${this.renderExperimentalSuggestions()}
                    </div>
                </div>

                <div class="pattern-analysis">
                    <h3>🔄 Claude Pattern Analysis</h3>
                    <div class="pattern-insights">
                        ${this.renderPatternAnalysis()}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-content').innerHTML = content;
    }

    async renderMessageRiskClassifier() {
        const content = `
            <div class="message-risk-classifier">
                <div class="risk-header">
                    <h2>🚦 Message Risk Classifier</h2>
                    <p>AI-powered risk assessment for message tone, effectiveness, and potential issues</p>
                </div>

                <div class="risk-overview">
                    <div class="risk-metrics">
                        <div class="risk-metric high-risk">
                            <div class="metric-value">${this.countRiskLevel('high')}</div>
                            <div class="metric-label">High Risk</div>
                        </div>
                        <div class="risk-metric medium-risk">
                            <div class="metric-value">${this.countRiskLevel('medium')}</div>
                            <div class="metric-label">Medium Risk</div>
                        </div>
                        <div class="risk-metric low-risk">
                            <div class="metric-value">${this.countRiskLevel('low')}</div>
                            <div class="metric-label">Low Risk</div>
                        </div>
                    </div>
                </div>

                <div class="risk-analysis">
                    <div class="risk-categories">
                        <h3>⚠️ Risk Category Breakdown</h3>
                        <canvas id="risk-categories-chart"></canvas>
                    </div>
                    
                    <div class="flagged-messages">
                        <h3>🚨 Flagged Messages</h3>
                        <div class="flagged-list">
                            ${this.renderFlaggedMessages()}
                        </div>
                    </div>
                </div>

                <div class="risk-mitigation">
                    <h3>🛡️ Risk Mitigation Recommendations</h3>
                    <div class="mitigation-cards">
                        ${this.renderMitigationRecommendations()}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-content').innerHTML = content;
        await this.initializeRiskCharts();
    }

    async renderTeamImpactDashboard() {
        const content = `
            <div class="team-impact-dashboard">
                <div class="team-header">
                    <h2>👥 Team-Level Impact Dashboard</h2>
                    <p>Performance breakdown by team members and contribution analysis</p>
                </div>

                <div class="team-overview">
                    <div class="team-metrics">
                        <div class="team-metric">
                            <div class="metric-value">${this.insights.teamPerformance.length}</div>
                            <div class="metric-label">Team Members</div>
                        </div>
                        <div class="team-metric">
                            <div class="metric-value">${this.getTopPerformerScore()}</div>
                            <div class="metric-label">Top Performer Score</div>
                        </div>
                        <div class="team-metric">
                            <div class="metric-value">${this.getTeamAverageScore()}</div>
                            <div class="metric-label">Team Average</div>
                        </div>
                    </div>
                </div>

                <div class="performance-comparison">
                    <h3>📊 Individual Performance Comparison</h3>
                    <canvas id="team-performance-chart"></canvas>
                </div>

                <div class="coaching-insights">
                    <h3>🎯 Coaching Opportunities</h3>
                    <div class="coaching-grid">
                        ${this.renderCoachingInsights()}
                    </div>
                </div>

                <div class="feedback-adoption">
                    <h3>📈 Feedback Adoption Rates</h3>
                    <div class="adoption-analysis">
                        ${this.renderFeedbackAdoption()}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-content').innerHTML = content;
        await this.initializeTeamCharts();
    }

    // =============================================================================
    // CHART INITIALIZATION
    // =============================================================================

    async initializeOverviewCharts() {
        // Performance trend chart
        const performanceCtx = document.getElementById('performance-trend-chart');
        if (performanceCtx) {
            this.charts.set('performance-trend', new Chart(performanceCtx, {
                type: 'line',
                data: this.getPerformanceTrendData(),
                options: this.getChartOptions('Performance Trends')
            }));
        }

        // Lead distribution chart
        const distributionCtx = document.getElementById('lead-distribution-chart');
        if (distributionCtx) {
            this.charts.set('lead-distribution', new Chart(distributionCtx, {
                type: 'doughnut',
                data: this.getLeadDistributionData(),
                options: this.getDoughnutOptions('Lead Types')
            }));
        }
    }

    async initialize3DMatrix() {
        // 3D matrix visualization using Three.js or similar
        const container = document.getElementById('performance-matrix-3d');
        if (container) {
            this.create3DMatrix(container);
        }
    }

    async initializeHeatmapCharts() {
        const ctx = document.getElementById('lead-performance-chart');
        if (ctx) {
            this.charts.set('lead-performance', new Chart(ctx, {
                type: 'bar',
                data: this.getLeadPerformanceData(),
                options: this.getChartOptions('Lead Performance by Type')
            }));
        }
    }

    async initializeCTACharts() {
        const ctx = document.getElementById('cta-trends-chart');
        if (ctx) {
            this.charts.set('cta-trends', new Chart(ctx, {
                type: 'line',
                data: this.getCTATrendsData(),
                options: this.getChartOptions('CTA Performance Trends')
            }));
        }
    }

    async initializeFeedbackCharts() {
        const ctx = document.getElementById('feedback-clusters-chart');
        if (ctx) {
            this.charts.set('feedback-clusters', new Chart(ctx, {
                type: 'scatter',
                data: this.getFeedbackClustersData(),
                options: this.getScatterOptions('Feedback Theme Clusters')
            }));
        }
    }

    async initializeRiskCharts() {
        const ctx = document.getElementById('risk-categories-chart');
        if (ctx) {
            this.charts.set('risk-categories', new Chart(ctx, {
                type: 'radar',
                data: this.getRiskCategoriesData(),
                options: this.getRadarOptions('Risk Categories')
            }));
        }
    }

    async initializeTeamCharts() {
        const ctx = document.getElementById('team-performance-chart');
        if (ctx) {
            this.charts.set('team-performance', new Chart(ctx, {
                type: 'horizontalBar',
                data: this.getTeamPerformanceData(),
                options: this.getChartOptions('Team Performance Comparison')
            }));
        }
    }

    // =============================================================================
    // HELPER FUNCTIONS & UTILITIES
    // =============================================================================

    classifyLeadType(lead) {
        // Classify leads based on profile characteristics
        if (lead.verified) return 'Verified Creator';
        if (lead.followers_count > 100000) return 'Macro Influencer';
        if (lead.followers_count > 10000) return 'Micro Influencer';
        if (lead.business_account) return 'Business Profile';
        if (lead.bio && lead.bio.includes('CEO')) return 'Executive';
        if (lead.bio && lead.bio.includes('founder')) return 'Founder';
        return 'Personal Brand';
    }

    extractCTAFromMessage(content) {
        // Extract CTA from message content using patterns
        const ctaPatterns = [
            /worth a chat\?/i,
            /interested in learning more\?/i,
            /quick call\?/i,
            /demo\?/i,
            /coffee\?/i,
            /connect\?/i
        ];
        
        for (const pattern of ctaPatterns) {
            if (pattern.test(content)) {
                return content.match(pattern)[0];
            }
        }
        
        return 'Custom CTA';
    }
    // ADD THESE FUNCTIONS BEFORE assessMessageRisk:

detectToneMismatch(content, targetTone) {
    // Simple tone detection - in production this would use NLP
    const tones = {
        professional: ['please', 'thank you', 'appreciate', 'regarding', 'sincerely'],
        casual: ['hey', 'awesome', 'cool', 'thanks', 'cheers'],
        friendly: ['hope', 'excited', 'love', 'happy', 'wonderful'],
        direct: ['need', 'must', 'require', 'urgent', 'immediately']
    };
    
    if (!targetTone || !tones[targetTone.toLowerCase()]) return false;
    
    const contentLower = content.toLowerCase();
    const targetWords = tones[targetTone.toLowerCase()];
    const matches = targetWords.filter(word => contentLower.includes(word));
    
    // If less than 10% of target tone words are present, it's a mismatch
    return matches.length < (targetWords.length * 0.1);
}

detectWeakCTA(content) {
    // Detect weak call-to-actions
    const strongCTAs = [
        'let\'s chat', 'worth a call', 'quick chat', 'worth discussing',
        'interested in learning', 'would love to show', 'schedule a call'
    ];
    
    const weakCTAs = [
        'let me know', 'if interested', 'feel free', 'maybe we could',
        'perhaps', 'might be worth', 'could be interesting'
    ];
    
    const contentLower = content.toLowerCase();
    
    // Check for weak CTAs
    const hasWeakCTA = weakCTAs.some(weak => contentLower.includes(weak));
    const hasStrongCTA = strongCTAs.some(strong => contentLower.includes(strong));
    
    return hasWeakCTA && !hasStrongCTA;
}

detectPotentialOffensiveness(content) {
    // Basic offensive content detection
    const offensivePatterns = [
        'cheap', 'discount', 'free money', 'get rich quick',
        'guarantee', 'no risk', 'limited time', 'act now',
        'urgent', 'exclusive deal', 'secret'
    ];
    
    const contentLower = content.toLowerCase();
    return offensivePatterns.some(pattern => contentLower.includes(pattern));
}

// NOW the existing assessMessageRisk function follows...
assessMessageRisk(message) {
    const risks = [];
    const content = message.content || '';
    
    // Tone mismatch detection
    if (this.detectToneMismatch(content, message.target_tone)) {
        risks.push({ type: 'tone_mismatch', severity: 3, description: 'Message tone doesn\'t match target' });
    }
    
    // Weak CTA detection
    if (this.detectWeakCTA(content)) {
        risks.push({ type: 'weak_cta', severity: 2, description: 'Call-to-action could be stronger' });
    }
    
    // Potential offensiveness
    if (this.detectPotentialOffensiveness(content)) {
        risks.push({ type: 'potential_offensive', severity: 4, description: 'Content may be perceived negatively' });
    }
    
    return risks;
}
    assessMessageRisk(message) {
        const risks = [];
        const content = message.content || '';
        
        // Tone mismatch detection
        if (this.detectToneMismatch(content, message.target_tone)) {
            risks.push({ type: 'tone_mismatch', severity: 3, description: 'Message tone doesn\'t match target' });
        }
        
        // Weak CTA detection
        if (this.detectWeakCTA(content)) {
            risks.push({ type: 'weak_cta', severity: 2, description: 'Call-to-action could be stronger' });
        }
        
        // Potential offensiveness
        if (this.detectPotentialOffensiveness(content)) {
            risks.push({ type: 'potential_offensive', severity: 4, description: 'Content may be perceived negatively' });
        }
        
        return risks;
    }

    categorizeComment(comment) {
        // Categorize feedback comments into themes
        const themes = {
            'tone': ['tone', 'sound', 'feel', 'voice'],
            'clarity': ['clear', 'confusing', 'understand', 'unclear'],
            'length': ['long', 'short', 'brief', 'lengthy'],
            'relevance': ['relevant', 'personal', 'generic', 'specific'],
            'cta': ['action', 'call', 'ask', 'request']
        };
        
        const lowerComment = comment.toLowerCase();
        
        for (const [theme, keywords] of Object.entries(themes)) {
            if (keywords.some(keyword => lowerComment.includes(keyword))) {
                return theme;
            }
        }
        
        return 'general';
    }

    analyzeSentiment(text) {
        // Simple sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'perfect', 'love', 'amazing'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'poor'];
        
        const words = text.toLowerCase().split(' ');
        const positiveCount = words.filter(word => positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => negativeWords.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    // =============================================================================
    // RENDER HELPER FUNCTIONS
    // =============================================================================

    renderClaudeInsightsList() {
        if (this.insights.claude.length === 0) {
            return '<p class="empty-state">Generating strategic insights...</p>';
        }
        
        return this.insights.claude.slice(0, 3).map(insight => `
            <div class="claude-insight-item">
                <div class="insight-type">${insight.type}</div>
                <div class="insight-text">${insight.content}</div>
                ${insight.action ? `<button class="insight-action" onclick="window.analytics.${insight.action}">${insight.actionText}</button>` : ''}
            </div>
        `).join('');
    }

    renderTopPerformingElements() {
        const topTone = this.insights.messagePerformance[0]?.tone || 'Professional';
        const topCTA = this.insights.ctaEffectiveness[0]?.cta || 'Quick chat?';
        const topLeadType = this.insights.leadConversion[0]?.type || 'Business Profile';
        
        return `
            <div class="performance-elements">
                <div class="element-item">
                    <span class="element-label">Best Tone:</span>
                    <span class="element-value">${topTone}</span>
                </div>
                <div class="element-item">
                    <span class="element-label">Best CTA:</span>
                    <span class="element-value">${topCTA}</span>
                </div>
                <div class="element-item">
                    <span class="element-label">Best Lead Type:</span>
                    <span class="element-value">${topLeadType}</span>
                </div>
            </div>
        `;
    }

    renderRiskSummary() {
        const highRisk = this.countRiskLevel('high');
        const totalMessages = this.analyticsData.messages.length;
        const riskPercentage = totalMessages > 0 ? (highRisk / totalMessages * 100).toFixed(1) : 0;
        
        return `
            <div class="risk-summary">
                <div class="risk-stat">
                    <span class="risk-number ${highRisk === 0 ? 'safe' : 'warning'}">${highRisk}</span>
                    <span class="risk-label">High Risk Messages</span>
                </div>
                <div class="risk-percentage">
                    <span class="percentage">${riskPercentage}%</span>
                    <span class="percentage-label">of total messages</span>
                </div>
                ${highRisk > 0 ? `<button class="review-risks-btn" onclick="window.analytics.switchView('risk-assessment')">Review Risks</button>` : ''}
            </div>
        `;
    }

    renderActionItems() {
        const actions = this.generateActionItems();
        
        return actions.map(action => `
            <div class="action-item ${action.priority}">
                <div class="action-icon">${action.icon}</div>
                <div class="action-content">
                    <h4>${action.title}</h4>
                    <p>${action.description}</p>
                    <button class="action-btn" onclick="${action.action}">${action.buttonText}</button>
                </div>
            </div>
        `).join('');
    }

    renderTopMessageCombinations() {
        return this.insights.messagePerformance.slice(0, 5).map((combo, index) => `
            <div class="combination-item">
                <div class="combo-rank">#${index + 1}</div>
                <div class="combo-details">
                    <div class="combo-style">
                        <span class="tone-tag">${combo.tone}</span>
                        <span class="style-tag">${combo.style}</span>
                        <span class="structure-tag">${combo.structure}</span>
                    </div>
                    <div class="combo-metrics">
                        <span class="score">${combo.avgScore.toFixed(1)}/5</span>
                        <span class="usage">${combo.count} uses</span>
                        <span class="conversion">${((combo.conversionCount / combo.count) * 100).toFixed(1)}% conversion</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderImprovementOpportunities() {
        const lowPerforming = this.insights.messagePerformance
            .filter(combo => combo.avgScore < 3.0 && combo.count >= 3)
            .slice(0, 3);
        
        return lowPerforming.map(combo => `
            <div class="opportunity-item">
                <div class="opportunity-combo">
                    <span class="tone-tag low">${combo.tone}</span>
                    <span class="style-tag low">${combo.style}</span>
                </div>
                <div class="opportunity-issue">
                    Score: ${combo.avgScore.toFixed(1)}/5 (${combo.count} messages)
                </div>
                <div class="opportunity-suggestion">
                    Try adjusting tone to "Professional" or structure to "Problem-Solution"
                </div>
            </div>
        `).join('');
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    setupEventListeners() {
        // Navigation menu
        document.querySelectorAll('nav a[data-page]').forEach(link => {
            link.addEventListener('click', this.handleNavigation.bind(this));
        });

        // View switchers
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Filter controls
        document.getElementById('timeframe-select')?.addEventListener('change', (e) => {
            this.currentTimeframe = e.target.value;
            this.loadAnalyticsData();
        });

        // Refresh button
        document.getElementById('refresh-analytics')?.addEventListener('click', () => {
            this.loadAnalyticsData();
        });

        // Export button
        document.getElementById('export-analytics')?.addEventListener('click', () => {
            this.exportAnalytics();
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
    }

    switchView(view) {
        this.currentView = view;
        
        // Update active tab
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });
        
        // Render new view
        this.renderCurrentView();
    }

    async handleNavigation(event) {
        event.preventDefault();
        const page = event.currentTarget.dataset.page;
        
        switch (page) {
            case 'dashboard':
                window.location.href = '/dashboard.html';
                break;
            case 'leads':
                window.location.href = '/leads.html';
                break;
            case 'analytics':
                // Already on analytics page
                break;
            case 'campaigns':
                window.location.href = '/campaigns.html';
                break;
            case 'messages':
                window.location.href = '/messages.html';
                break;
            case 'settings':
                window.location.href = '/settings.html';
                break;
            case 'subscription':
                window.location.href = '/subscription.html';
                break;
            default:
                console.log('Navigation to', page);
        }
    }

    // =============================================================================
    // REAL-TIME UPDATES
    // =============================================================================

    setupRealTimeUpdates() {
        if (!this.supabase) return;
        
        try {
            // Subscribe to feedback changes
            this.realTimeUpdates = this.supabase
                .channel('analytics_updates')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'message_feedback',
                    filter: `user_id=eq.${this.currentSession.user.id}`
                }, () => {
                    this.handleRealTimeUpdate();
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'generated_messages',
                    filter: `user_id=eq.${this.currentSession.user.id}`
                }, () => {
                    this.handleRealTimeUpdate();
                })
                .subscribe();
                
            console.log('✅ Real-time analytics updates enabled');
            
        } catch (error) {
            console.warn('⚠️ Real-time updates setup failed:', error);
        }
    }

    startRealTimeUpdates() {
        this.refreshInterval = setInterval(() => {
            this.loadAnalyticsData();
        }, 300000); // Refresh every 5 minutes
    }

    handleRealTimeUpdate() {
        // Debounce updates to avoid too frequent refreshes
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.loadAnalyticsData();
        }, 2000);
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    getTimeframeStart() {
        const now = new Date();
        const days = parseInt(this.currentTimeframe.replace('d', ''));
        return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000)).toISOString();
    }

    calculateGrowth(metric) {
        // Calculate growth percentage for metrics
        return Math.floor(Math.random() * 20) + 5; // Placeholder
    }

    countRiskLevel(level) {
        return this.insights.riskAssessments.filter(risk => 
            this.getRiskLevel(risk.riskScore) === level
        ).length;
    }

    getRiskLevel(score) {
        if (score >= 8) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
    }

    generateActionItems() {
        const actions = [];
        
        // Based on analytics insights
        if (this.insights.messagePerformance.length > 0) {
            const topPerformer = this.insights.messagePerformance[0];
            actions.push({
                icon: '🎯',
                title: 'Optimize Message Style',
                description: `Your best performing combination is ${topPerformer.tone} + ${topPerformer.style}. Apply this to more messages.`,
                action: 'window.analytics.applyTopStyle()',
                buttonText: 'Apply Style',
                priority: 'high'
            });
        }
        
        if (this.countRiskLevel('high') > 0) {
            actions.push({
                icon: '⚠️',
                title: 'Review High-Risk Messages',
                description: `You have ${this.countRiskLevel('high')} high-risk messages that need review.`,
                action: 'window.analytics.switchView("risk-assessment")',
                buttonText: 'Review Risks',
                priority: 'high'
            });
        }
        
        return actions;
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const loadingElement = document.getElementById('analytics-loading');
        if (loadingElement) {
            loadingElement.style.display = loading ? 'block' : 'none';
        }
    }

    showErrorMessage(message) {
        const errorElement = document.getElementById('analytics-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    showErrorState(message) {
        const errorHTML = `
            <div class="error-state">
                <h3>⚠️ Analytics Error</h3>
                <p>${message}</p>
                <button class="primary-btn" onclick="window.location.reload()">
                    🔄 Reload Analytics
                </button>
                <p class="error-help">If this problem persists, please contact support.</p>
            </div>
        `;
        
        const content = document.getElementById('analytics-content');
        if (content) {
            content.innerHTML = errorHTML;
        }
    }

    async exportAnalytics() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                timeframe: this.currentTimeframe,
                metrics: this.analyticsData.performance,
                insights: {
                    messagePerformance: this.insights.messagePerformance,
                    leadConversion: this.insights.leadConversion,
                    ctaEffectiveness: this.insights.ctaEffectiveness,
                    riskAssessments: this.insights.riskAssessments
                },
                summary: {
                    totalMessages: this.analyticsData.messages.length,
                    avgScore: this.analyticsData.performance.avgFeedbackScore,
                    positiveRatio: this.analyticsData.performance.positiveRatio,
                    topPerformingTone: this.insights.messagePerformance[0]?.tone,
                    topPerformingCTA: this.insights.ctaEffectiveness[0]?.cta
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `oslira-analytics-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccessMessage('Analytics exported successfully!');
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showErrorMessage('Export failed: ' + error.message);
        }
    }

    async logout() {
        try {
            await this.supabase.auth.signOut();
            window.location.href = '/auth.html';
        } catch (error) {
            console.error('❌ Logout failed:', error);
            window.location.href = '/auth.html';
        }
    }

    // =============================================================================
    // CHART DATA GENERATORS
    // =============================================================================

    getPerformanceTrendData() {
        const days = 30;
        const data = [];
        const now = new Date();
        
        for (let i = days; i >= 0; i--) {
            const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const messagesOnDay = this.analyticsData.messages.filter(m => 
                new Date(m.created_at).toDateString() === date.toDateString()
            );
            
            const avgScore = messagesOnDay.length > 0 
                ? messagesOnDay.reduce((sum, m) => {
                    const feedback = this.analyticsData.feedback.filter(f => f.message_id === m.id);
                    const scores = feedback.filter(f => f.feedback_type === 'vote').map(f => parseInt(f.feedback_value));
                    return sum + (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
                }, 0) / messagesOnDay.length
                : 0;
            
            data.push({
                x: date.toISOString().split('T')[0],
                y: avgScore
            });
        }
        
        return {
            labels: data.map(d => d.x),
            datasets: [{
                label: 'Average Message Score',
                data: data.map(d => d.y),
                borderColor: '#2D6CDF',
                backgroundColor: 'rgba(45, 108, 223, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };
    }

    getLeadDistributionData() {
        const distribution = {};
        
        this.analyticsData.leads.forEach(lead => {
            const type = this.classifyLeadType(lead);
            distribution[type] = (distribution[type] || 0) + 1;
        });
        
        return {
            labels: Object.keys(distribution),
            datasets: [{
                data: Object.values(distribution),
                backgroundColor: [
                    '#2D6CDF', '#8A6DF1', '#06B6D4', '#10B981', 
                    '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'
                ]
            }]
        };
    }

    getChartOptions(title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        };
    }

    getDoughnutOptions(title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            }
        };
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    destroy() {
        // Clean up subscriptions
        if (this.realTimeUpdates) {
            this.realTimeUpdates.unsubscribe();
        }
        
        // Clear intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Destroy charts
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
        
        console.log('🧹 OsliraAnalytics cleaned up');
    }
}

// =============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// =============================================================================

// Chart.js setup for analytics
function setupChartLibrary() {
    return new Promise((resolve) => {
        if (typeof Chart !== 'undefined') {
            resolve();
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            document.head.appendChild(script);
        }
    });
}

// =============================================================================
// INITIALIZE APPLICATION
// =============================================================================

// Global instance
let osliraAnalytics;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for shared code to be available
        if (typeof window.OsliraApp === 'undefined') {
            console.log('⏳ Waiting for shared code...');
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (typeof window.OsliraApp !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }
        
        // Setup Chart.js
        // Setup Chart.js
if (typeof setupChartLibrary === 'function') {
    await setupChartLibrary();
}
        
        // Create and initialize the application
        osliraAnalytics = new OsliraAnalytics();
        window.analytics = osliraAnalytics; // Make globally available
        
        await osliraAnalytics.initialize();
        
    } catch (error) {
        console.error('❌ Failed to initialize analytics:', error);
        
        // Show user-friendly error
        const errorHTML = `
            <div class="error-state">
                <h3>⚠️ Analytics System Error</h3>
                <p>Failed to initialize the Analytics Intelligence system.</p>
                <p class="error-details">${error.message}</p>
                <button class="primary-btn" onclick="window.location.reload()">
                    🔄 Reload Analytics
                </button>
                <p class="error-help">If this problem persists, please contact support.</p>
            </div>
        `;
        
        const content = document.getElementById('analytics-content');
        if (content) {
            content.innerHTML = errorHTML;
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (osliraAnalytics) {
        osliraAnalytics.destroy();
    }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OsliraAnalytics;
}
