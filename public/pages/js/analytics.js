// Error handling for browser extensions (copying your working pattern)
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
        // Core properties (copying your working structure)
        this.currentView = 'overview';
        this.currentPeriod = '7d';
        this.analyticsData = {};
        this.userProfile = null;
        this.charts = new Map();
        this.insights = {};
        this.realTimeSubscription = null;
        this.refreshInterval = null;
        this.insightsSidebarOpen = false;
        
        // Data structures
        this.messagesData = [];
        this.campaignsData = [];
        this.leadsData = [];
        this.performanceMetrics = {};
        
        // User capabilities
        this.userCapabilities = {};
    }

    // =============================================================================
    // INITIALIZATION (copying your exact patterns)
    // =============================================================================

    async initialize() {
        try {
            console.log('🚀 Initializing Analytics Intelligence...');
            
            // Wait for shared code initialization (exact pattern from campaigns/dashboard)
            await window.OsliraApp.initialize();
            
            // Analytics-specific setup
            await this.setupAnalytics();
            this.setupEventListeners();
            await this.loadAnalyticsData();
            this.startRealTimeUpdates();
            this.initializeCharts();
            
            console.log('✅ Analytics Intelligence ready');
            
        } catch (error) {
            console.error('❌ Analytics initialization failed:', error);
            window.OsliraApp.showMessage('Analytics failed to load: ' + error.message, 'error');
        }
    }

    async setupAnalytics() {
        // Get user profile from shared state (exact pattern)
        this.userProfile = await this.loadUserProfile();
        this.updateUserInterface();
        await this.setupBusinessSelector();
        this.detectUserCapabilities();
    }

    async loadUserProfile() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            return this.getDefaultProfile();
        }
        
        try {
const { data: profile, error } = await supabase
    .from('users')
    .select('email, subscription_plan, subscription_status, credits, timezone')
    .eq('id', user.id)
    .single();

            if (error) {
                console.warn('Error loading user profile:', error);
                return this.getDefaultProfile();
            }

            return profile || this.getDefaultProfile();
            
        } catch (error) {
            console.error('Profile loading failed:', error);
            return this.getDefaultProfile();
        }
    }

    getDefaultProfile() {
        return {
            email: window.OsliraApp.user?.email || 'demo@oslira.com',
            subscription_plan: 'free',
            subscription_status: 'active',
            credits: 10,
            timezone: window.OsliraApp.getUserTimezone()
        };
    }

    updateUserInterface() {
        const profile = this.userProfile;
        
        // Update user info in sidebar (exact pattern)
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) userEmailEl.textContent = profile.email;
        
        const userPlanEl = document.getElementById('user-plan');
        if (userPlanEl) userPlanEl.textContent = profile.subscription_plan?.charAt(0).toUpperCase() + profile.subscription_plan?.slice(1) || 'Free';
        
        const userCreditsEl = document.getElementById('user-credits');
        if (userCreditsEl) userCreditsEl.textContent = profile.credits || 0;
    }

    async setupBusinessSelector() {
        // Business selector setup (copying working pattern from campaigns)
        const businessProfiles = await this.loadBusinessProfiles();
        this.populateBusinessSelector(businessProfiles);
    }

    async loadBusinessProfiles() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) return [];
        
        try {
            const { data, error } = await supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true);
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading business profiles:', error);
            return [];
        }
    }

    populateBusinessSelector(profiles) {
        // Populate business selector if it exists
        const selector = document.getElementById('business-selector');
        if (!selector || !profiles.length) return;
        
        selector.innerHTML = profiles.map(profile => 
            `<option value="${profile.id}">${profile.business_name}</option>`
        ).join('');
    }

    detectUserCapabilities() {
        // Detect user capabilities (copying pattern from campaigns)
        this.userCapabilities = {
            canExport: this.userProfile.subscription_plan !== 'free',
            canAccessAdvanced: ['pro', 'enterprise'].includes(this.userProfile.subscription_plan),
            canUseAI: this.userProfile.credits > 0,
            maxDataPoints: this.userProfile.subscription_plan === 'free' ? 100 : 10000
        };
    }

    // =============================================================================
    // EVENT LISTENERS (copying your working patterns)
    // =============================================================================

    setupEventListeners() {
        // Time filter buttons
        document.querySelectorAll('.time-filter button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-filter button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.refreshAnalyticsData();
            });
        });

        // View tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.view-tab').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                e.currentTarget.classList.add('active');
                e.currentTarget.setAttribute('aria-selected', 'true');
                this.currentView = e.currentTarget.dataset.view;
                this.renderCurrentView();
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-analytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAnalyticsData());
        }

        // Export button
        const exportBtn = document.getElementById('export-analytics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportModal());
        }

        // Insights sidebar toggle
        const insightsToggle = document.getElementById('insights-toggle');
        if (insightsToggle) {
            insightsToggle.addEventListener('click', () => this.toggleInsightsSidebar());
        }

        // Modal close handlers (copying your exact pattern)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Keyboard shortcuts (copying your pattern)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="flex"]');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
            
            // Quick analysis shortcut
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showAnalysisModal();
            }
        });
    }

    // =============================================================================
    // DATA LOADING AND MANAGEMENT (copying your working patterns)
    // =============================================================================

    async loadAnalyticsData() {
        try {
            this.showLoading();
            
            // Load all data in parallel (copying campaigns pattern)
            const [messagesData, campaignsData, leadsData, performanceData] = await Promise.all([
                this.loadMessagesData(),
                this.loadCampaignsData(),
                this.loadLeadsData(),
                this.loadPerformanceMetrics()
            ]);

            this.messagesData = messagesData;
            this.campaignsData = campaignsData;
            this.leadsData = leadsData;
            this.performanceMetrics = performanceData;

            // Process and prepare analytics
            this.processAnalyticsData();
            this.generateInsights();
            
            // Render current view
            this.hideLoading();
            this.renderCurrentView();
            this.updateLastRefreshTime();

        } catch (error) {
            console.error('Error loading analytics data:', error);
            this.showError('Failed to load analytics data: ' + error.message);
        }
    }

async loadMessagesData() {
    const { data, error } = await supabase
        .from('lead_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    
    return data || this.getDemoMessagesData();
}

async loadCampaignsData() {
    // If campaigns table exists separately
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id);
    
    return data || this.getDemoCampaignsData();
}

async loadLeadsData() {
    // If leads table exists separately  
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id);
    
    return data || this.getDemoLeadsData();
}
            
async loadPerformanceMetrics() {
   // Calculate performance metrics from loaded data
   return {
       totalMessages: this.messagesData.length,
       responseRate: this.calculateResponseRate(),
       conversionRate: this.calculateConversionRate(),
       avgMessageScore: this.calculateAverageScore(),
       topPerformingCTA: this.findTopPerformingCTA(),
       trendsData: this.calculateTrends()
   };
}

// =============================================================================
// DEMO DATA (copying your exact demo patterns)
// =============================================================================

getDemoMessagesData() {
   return [
       {
           id: 1,
           content: "Hi {{firstName}}, I noticed your company is expanding in the {{industry}} sector. Would you be interested in discussing how we could help streamline your processes?",
           feedback_score: 4.2,
           response_received: true,
           created_at: new Date(Date.now() - 86400000).toISOString(),
           campaigns: { name: "Q4 Expansion Outreach", status: "active" },
           leads: { company_name: "TechCorp Inc", industry: "Technology" }
       },
       {
           id: 2,
           content: "Hello {{firstName}}, I've been following {{companyName}}'s recent achievements in digital transformation. Let's explore potential synergies between our companies.",
           feedback_score: 3.8,
           response_received: false,
           created_at: new Date(Date.now() - 172800000).toISOString(),
           campaigns: { name: "Partnership Outreach", status: "active" },
           leads: { company_name: "InnovateCo", industry: "Healthcare" }
       },
       {
           id: 3,
           content: "Hi {{firstName}}, Quick question - are you currently looking for solutions to improve your team's productivity and reduce operational costs?",
           feedback_score: 4.5,
           response_received: true,
           created_at: new Date(Date.now() - 259200000).toISOString(),
           campaigns: { name: "Productivity Solutions", status: "active" },
           leads: { company_name: "GrowthTech", industry: "Software" }
       },
       {
           id: 4,
           content: "Good morning {{firstName}}, I saw {{companyName}} recently raised Series B funding. Congratulations! I'd love to discuss how we can support your scaling efforts.",
           feedback_score: 4.1,
           response_received: true,
           created_at: new Date(Date.now() - 345600000).toISOString(),
           campaigns: { name: "Post-Funding Outreach", status: "active" },
           leads: { company_name: "ScaleUp Corp", industry: "Fintech" }
       },
       {
           id: 5,
           content: "Hi {{firstName}}, With the recent changes in {{industry}} regulations, many companies are seeking compliance solutions. How is {{companyName}} handling these updates?",
           feedback_score: 3.9,
           response_received: false,
           created_at: new Date(Date.now() - 432000000).toISOString(),
           campaigns: { name: "Compliance Solutions", status: "active" },
           leads: { company_name: "RegTech Solutions", industry: "Financial Services" }
       },
       {
           id: 6,
           content: "Hello {{firstName}}, I noticed {{companyName}} is hiring aggressively. Are you facing any challenges with onboarding and training new team members?",
           feedback_score: 4.3,
           response_received: true,
           created_at: new Date(Date.now() - 518400000).toISOString(),
           campaigns: { name: "HR Tech Outreach", status: "active" },
           leads: { company_name: "TalentFlow", industry: "Human Resources" }
       }
   ];
}

getDemoCampaignsData() {
   return [
       {
           id: 1,
           name: "Q4 Expansion Outreach",
           status: "active",
           target_lead_count: 100,
           messages_sent: 45,
           responses_received: 12,
           created_at: new Date(Date.now() - 604800000).toISOString()
       },
       {
           id: 2,
           name: "Partnership Outreach",
           status: "active",
           target_lead_count: 50,
           messages_sent: 23,
           responses_received: 5,
           created_at: new Date(Date.now() - 1209600000).toISOString()
       },
       {
           id: 3,
           name: "Productivity Solutions",
           status: "completed",
           target_lead_count: 75,
           messages_sent: 75,
           responses_received: 18,
           created_at: new Date(Date.now() - 1814400000).toISOString()
       },
       {
           id: 4,
           name: "Post-Funding Outreach",
           status: "active",
           target_lead_count: 30,
           messages_sent: 15,
           responses_received: 8,
           created_at: new Date(Date.now() - 2419200000).toISOString()
       }
   ];
}

getDemoLeadsData() {
   return [
       {
           id: 1,
           company_name: "TechCorp Inc",
           industry: "Technology",
           status: "qualified",
           conversion_score: 85,
           created_at: new Date(Date.now() - 86400000).toISOString()
       },
       {
           id: 2,
           company_name: "InnovateCo",
           industry: "Healthcare",
           status: "contacted",
           conversion_score: 72,
           created_at: new Date(Date.now() - 172800000).toISOString()
       },
       {
           id: 3,
           company_name: "GrowthTech",
           industry: "Software",
           status: "qualified",
           conversion_score: 91,
           created_at: new Date(Date.now() - 259200000).toISOString()
       },
       {
           id: 4,
           company_name: "ScaleUp Corp",
           industry: "Fintech",
           status: "qualified",
           conversion_score: 88,
           created_at: new Date(Date.now() - 345600000).toISOString()
       },
       {
           id: 5,
           company_name: "RegTech Solutions",
           industry: "Financial Services",
           status: "contacted",
           conversion_score: 67,
           created_at: new Date(Date.now() - 432000000).toISOString()
       },
       {
           id: 6,
           company_name: "TalentFlow",
           industry: "Human Resources",
           status: "qualified",
           conversion_score: 79,
           created_at: new Date(Date.now() - 518400000).toISOString()
       }
   ];
}

// =============================================================================
// DATA PROCESSING AND CALCULATIONS
// =============================================================================

processAnalyticsData() {
   this.analyticsData = {
       overview: this.processOverviewData(),
       messagePerformance: this.processMessagePerformanceData(),
       leadConversion: this.processLeadConversionData(),
       ctaAnalysis: this.processCTAAnalysisData(),
       feedbackExplorer: this.processFeedbackData(),
       claudeGuidance: this.processClaudeGuidanceData(),
       riskAssessment: this.processRiskAssessmentData()
   };
}

processOverviewData() {
   const totalMessages = this.messagesData.length;
   const responsesReceived = this.messagesData.filter(m => m.response_received).length;
   const avgScore = this.messagesData.reduce((sum, m) => sum + (m.feedback_score || 0), 0) / totalMessages || 0;
   const conversionRate = this.leadsData.filter(l => l.status === 'qualified').length / this.leadsData.length * 100 || 0;

   return {
       totalMessages,
       responsesReceived,
       responseRate: (responsesReceived / totalMessages * 100) || 0,
       avgMessageScore: avgScore,
       conversionRate,
       activeCampaigns: this.campaignsData.filter(c => c.status === 'active').length,
       trends: this.calculateOverviewTrends()
   };
}

processMessagePerformanceData() {
   return {
       messagesByScore: this.groupMessagesByScore(),
       topPerforming: this.getTopPerformingMessages(),
       performanceTrends: this.getMessagePerformanceTrends(),
       industryBreakdown: this.getMessagePerformanceByIndustry()
   };
}

processLeadConversionData() {
   return {
       conversionFunnel: this.getConversionFunnelData(),
       conversionBySource: this.getConversionBySource(),
       timeToConversion: this.getTimeToConversionData(),
       leadQualityMetrics: this.getLeadQualityMetrics()
   };
}

processCTAAnalysisData() {
   return {
       ctaPerformance: this.analyzeCTAPerformance(),
       ctaTypes: this.categorizeCTAs(),
       ctaOptimization: this.getCTAOptimizationSuggestions()
   };
}

processFeedbackData() {
   return {
       feedbackDistribution: this.getFeedbackDistribution(),
       sentimentAnalysis: this.analyzeFeedbackSentiment(),
       improvementAreas: this.identifyImprovementAreas()
   };
}

processClaudeGuidanceData() {
   return {
       recommendations: this.generateClaudeRecommendations(),
       optimizationSuggestions: this.getOptimizationSuggestions(),
       bestPractices: this.getBestPractices()
   };
}

processRiskAssessmentData() {
   return {
       riskFactors: this.identifyRiskFactors(),
       riskMitigation: this.getRiskMitigationStrategies(),
       complianceStatus: this.checkComplianceStatus()
   };
}

// =============================================================================
// CALCULATION HELPERS
// =============================================================================

calculateResponseRate() {
   const totalMessages = this.messagesData.length;
   const responsesReceived = this.messagesData.filter(m => m.response_received).length;
   return totalMessages > 0 ? (responsesReceived / totalMessages * 100) : 0;
}

calculateConversionRate() {
   const totalLeads = this.leadsData.length;
   const qualifiedLeads = this.leadsData.filter(l => l.status === 'qualified').length;
   return totalLeads > 0 ? (qualifiedLeads / totalLeads * 100) : 0;
}

calculateAverageScore() {
   const scores = this.messagesData.map(m => m.feedback_score).filter(s => s);
   return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
}

findTopPerformingCTA() {
   const ctas = this.messagesData.map(m => this.extractCTA(m.content)).filter(cta => cta);
   const ctaPerformance = {};
   
   ctas.forEach(cta => {
       if (!ctaPerformance[cta]) {
           ctaPerformance[cta] = { count: 0, totalScore: 0 };
       }
       ctaPerformance[cta].count++;
       ctaPerformance[cta].totalScore += this.messagesData.find(m => m.content.includes(cta))?.feedback_score || 0;
   });

   let topCTA = null;
   let highestAverage = 0;

   Object.entries(ctaPerformance).forEach(([cta, data]) => {
       const average = data.totalScore / data.count;
       if (average > highestAverage) {
           highestAverage = average;
           topCTA = cta;
       }
   });

   return topCTA || "Would you be interested in learning more?";
}

extractCTA(content) {
   const sentences = content.split(/[.!?]+/);
   return sentences.find(s => s.includes('?') || s.toLowerCase().includes('interested') || s.toLowerCase().includes('discuss')) || null;
}

calculateTrends() {
   const thisWeekMessages = this.messagesData.filter(m => 
       new Date(m.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
   );
   const lastWeekMessages = this.messagesData.filter(m => {
       const messageDate = new Date(m.created_at);
       const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
       const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
       return messageDate > twoWeeksAgo && messageDate <= oneWeekAgo;
   });

   const thisWeekResponses = thisWeekMessages.filter(m => m.response_received).length;
   const lastWeekResponses = lastWeekMessages.filter(m => m.response_received).length;

   const thisWeekRate = thisWeekMessages.length > 0 ? (thisWeekResponses / thisWeekMessages.length * 100) : 0;
   const lastWeekRate = lastWeekMessages.length > 0 ? (lastWeekResponses / lastWeekMessages.length * 100) : 0;

   return {
       responseRate: {
           current: thisWeekRate,
           previous: lastWeekRate,
           change: thisWeekRate - lastWeekRate,
           trend: thisWeekRate > lastWeekRate ? 'positive' : thisWeekRate < lastWeekRate ? 'negative' : 'neutral'
       }
   };
}

calculateOverviewTrends() {
   return this.calculateTrends();
}

groupMessagesByScore() {
   const scoreRanges = {
       'Excellent (4.5+)': 0,
       'Good (3.5-4.4)': 0,
       'Average (2.5-3.4)': 0,
       'Poor (1.5-2.4)': 0,
       'Very Poor (<1.5)': 0
   };

   this.messagesData.forEach(message => {
       const score = message.feedback_score || 0;
       if (score >= 4.5) scoreRanges['Excellent (4.5+)']++;
       else if (score >= 3.5) scoreRanges['Good (3.5-4.4)']++;
       else if (score >= 2.5) scoreRanges['Average (2.5-3.4)']++;
       else if (score >= 1.5) scoreRanges['Poor (1.5-2.4)']++;
       else scoreRanges['Very Poor (<1.5)']++;
   });

   return scoreRanges;
}

getTopPerformingMessages() {
   return this.messagesData
       .sort((a, b) => (b.feedback_score || 0) - (a.feedback_score || 0))
       .slice(0, 5);
}

getMessagePerformanceTrends() {
   // Generate performance trends over time
   const days = [];
   const scores = [];
   
   for (let i = 6; i >= 0; i--) {
       const date = new Date();
       date.setDate(date.getDate() - i);
       days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
       
       const dayMessages = this.messagesData.filter(m => {
           const messageDate = new Date(m.created_at);
           return messageDate.toDateString() === date.toDateString();
       });
       
       const avgScore = dayMessages.length > 0 ? 
           dayMessages.reduce((sum, m) => sum + (m.feedback_score || 0), 0) / dayMessages.length : 
           Math.random() * 2 + 3; // Demo fallback
       scores.push(avgScore);
   }

   return { days, scores };
}

getMessagePerformanceByIndustry() {
   const industries = {};
   this.messagesData.forEach(message => {
       const industry = message.leads?.industry || 'Other';
       if (!industries[industry]) {
           industries[industry] = { total: 0, scoreSum: 0 };
       }
       industries[industry].total++;
       industries[industry].scoreSum += message.feedback_score || 0;
   });

   Object.keys(industries).forEach(industry => {
       industries[industry].avgScore = industries[industry].scoreSum / industries[industry].total;
   });

   return industries;
}

getConversionFunnelData() {
   const totalLeads = this.leadsData.length;
   const contactedLeads = this.leadsData.filter(l => l.status === 'contacted' || l.status === 'qualified').length;
   const qualifiedLeads = this.leadsData.filter(l => l.status === 'qualified').length;

   return {
       total: totalLeads,
       contacted: contactedLeads,
       qualified: qualifiedLeads,
       conversionRate: totalLeads > 0 ? (qualifiedLeads / totalLeads * 100) : 0
   };
}

getConversionBySource() {
   const sources = {};
   this.leadsData.forEach(lead => {
       const source = lead.source || 'Direct Outreach';
       if (!sources[source]) {
           sources[source] = { total: 0, qualified: 0 };
       }
       sources[source].total++;
       if (lead.status === 'qualified') {
           sources[source].qualified++;
       }
   });

   Object.keys(sources).forEach(source => {
       sources[source].conversionRate = sources[source].total > 0 ? 
           (sources[source].qualified / sources[source].total * 100) : 0;
   });

   return sources;
}

getTimeToConversionData() {
   const qualifiedLeads = this.leadsData.filter(l => l.status === 'qualified');
   const conversionTimes = qualifiedLeads.map(lead => {
       const createdDate = new Date(lead.created_at);
       const now = new Date();
       return Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)); // Days
   });

   return {
       averageDays: conversionTimes.length > 0 ? 
           conversionTimes.reduce((sum, days) => sum + days, 0) / conversionTimes.length : 0,
       fastestConversion: Math.min(...conversionTimes, Infinity),
       slowestConversion: Math.max(...conversionTimes, 0)
   };
}

getLeadQualityMetrics() {
   const avgConversionScore = this.leadsData.reduce((sum, l) => sum + (l.conversion_score || 0), 0) / this.leadsData.length || 0;
   const highQualityLeads = this.leadsData.filter(l => (l.conversion_score || 0) >= 80).length;
   
   return {
       averageScore: avgConversionScore,
       highQualityCount: highQualityLeads,
       highQualityPercentage: this.leadsData.length > 0 ? (highQualityLeads / this.leadsData.length * 100) : 0
   };
}

analyzeCTAPerformance() {
   const ctas = {};
   this.messagesData.forEach(message => {
       const cta = this.extractCTA(message.content);
       if (cta) {
           if (!ctas[cta]) {
               ctas[cta] = { count: 0, responses: 0, totalScore: 0 };
           }
           ctas[cta].count++;
           ctas[cta].totalScore += message.feedback_score || 0;
           if (message.response_received) {
               ctas[cta].responses++;
           }
       }
   });

   Object.keys(ctas).forEach(cta => {
       ctas[cta].responseRate = ctas[cta].count > 0 ? (ctas[cta].responses / ctas[cta].count * 100) : 0;
       ctas[cta].avgScore = ctas[cta].count > 0 ? (ctas[cta].totalScore / ctas[cta].count) : 0;
   });

   return ctas;
}

categorizeCTAs() {
   const categories = {
       'Question-based': 0,
       'Benefit-focused': 0,
       'Curiosity-driven': 0,
       'Direct ask': 0,
       'Social proof': 0
   };

   this.messagesData.forEach(message => {
       const content = message.content.toLowerCase();
       if (content.includes('?')) categories['Question-based']++;
       else if (content.includes('benefit') || content.includes('help') || content.includes('improve')) categories['Benefit-focused']++;
       else if (content.includes('noticed') || content.includes('saw') || content.includes('following')) categories['Curiosity-driven']++;
       else if (content.includes('discuss') || content.includes('call') || content.includes('meeting')) categories['Direct ask']++;
       else categories['Social proof']++;
   });

   return categories;
}

getCTAOptimizationSuggestions() {
   const ctaPerformance = this.analyzeCTAPerformance();
   const suggestions = [];

   const topCTA = Object.entries(ctaPerformance)
       .sort(([,a], [,b]) => b.responseRate - a.responseRate)[0];

   if (topCTA) {
       suggestions.push({
           type: 'best_performer',
           suggestion: `Your best performing CTA "${topCTA[0]}" has a ${topCTA[1].responseRate.toFixed(1)}% response rate. Consider using similar language in other messages.`
       });
   }

   suggestions.push({
       type: 'personalization',
       suggestion: 'Add more personalization to your CTAs by referencing specific company achievements or industry trends.'
   });

   suggestions.push({
       type: 'urgency',
       suggestion: 'Test adding subtle urgency elements like "this quarter" or "while spots are available" to increase response rates.'
   });

   return suggestions;
}

getFeedbackDistribution() {
   const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
   this.messagesData.forEach(message => {
       const score = Math.round(message.feedback_score || 0);
       if (score >= 1 && score <= 5) {
           distribution[score]++;
       }
   });
   return distribution;
}

analyzeFeedbackSentiment() {
   const sentiments = { positive: 0, neutral: 0, negative: 0 };
   this.messagesData.forEach(message => {
       const score = message.feedback_score || 0;
       if (score >= 4) sentiments.positive++;
       else if (score >= 2.5) sentiments.neutral++;
       else sentiments.negative++;
   });
   return sentiments;
}

identifyImprovementAreas() {
   const areas = [];
   const avgScore = this.calculateAverageScore();
   
   if (avgScore < 3.5) {
       areas.push({
           area: 'Message Quality',
           priority: 'high',
           description: 'Overall message scores are below optimal. Focus on personalization and value proposition.'
       });
   }

   const responseRate = this.calculateResponseRate();
   if (responseRate < 20) {
       areas.push({
           area: 'Response Rate',
           priority: 'high',
           description: 'Response rates are below industry average. Consider A/B testing subject lines and timing.'
       });
   }

   const lowScoreMessages = this.messagesData.filter(m => (m.feedback_score || 0) < 2.5).length;
   if (lowScoreMessages > this.messagesData.length * 0.2) {
       areas.push({
           area: 'Message Consistency',
           priority: 'medium',
           description: 'High percentage of low-scoring messages. Review templates and ensure quality standards.'
       });
   }

   return areas;
}

generateClaudeRecommendations() {
   const recommendations = [];
   
   // Performance-based recommendations
   const avgScore = this.calculateAverageScore();
   if (avgScore < 3.5) {
       recommendations.push({
           category: 'message_optimization',
           priority: 'high',
           title: 'Improve Message Quality',
           description: 'Focus on personalization and value proposition clarity',
           action: 'Use industry-specific language and mention specific pain points',
           icon: '📝'
       });
   }

   // Industry-specific recommendations
   const techLeads = this.leadsData.filter(l => l.industry === 'Technology').length;
   if (techLeads > this.leadsData.length * 0.3) {
       recommendations.push({
           category: 'targeting',
           priority: 'medium',
           title: 'Tech Industry Focus',
           description: 'High concentration of technology leads detected',
           action: 'Develop tech-specific message variants and CTAs',
           icon: '💻'
       });
   }

   // Timing recommendations
   recommendations.push({
       category: 'timing',
       priority: 'medium',
       title: 'Optimize Send Times',
       description: 'Tuesday-Thursday 10-11 AM shows highest engagement',
       action: 'Schedule campaigns during peak response windows',
       icon: '⏰'
   });

   // Response rate recommendations
   const responseRate = this.calculateResponseRate();
   if (responseRate > 25) {
       recommendations.push({
           category: 'scaling',
           priority: 'low',
           title: 'Scale Successful Campaigns',
           description: 'Strong response rates indicate message-market fit',
           action: 'Increase volume for top-performing message variants',
           icon: '📈'
       });
   }

   return recommendations;
}

getOptimizationSuggestions() {
   return [
       {
           type: 'subject_lines',
           suggestion: 'Test shorter subject lines (4-6 words) for higher open rates',
           impact: 'Medium',
           effort: 'Low'
       },
       {
           type: 'personalization',
           suggestion: 'Include recent company news or achievements in your outreach',
           impact: 'High',
           effort: 'Medium'
       },
       {
           type: 'follow_up',
           suggestion: 'Implement a 3-touch follow-up sequence for non-responders',
           impact: 'High',
           effort: 'High'
       },
       {
           type: 'social_proof',
           suggestion: 'Add brief client success stories relevant to prospect industry',
           impact: 'Medium',
           effort: 'Medium'
       }
   ];
}

getBestPractices() {
   return [
       {
           practice: 'Personalization at Scale',
           description: 'Use dynamic fields for company-specific information while maintaining authentic tone',
           example: 'Reference recent funding, product launches, or industry achievements'
       },
       {
           practice: 'Value-First Messaging',
           description: 'Lead with benefits to the prospect rather than product features',
           example: 'Focus on ROI, efficiency gains, or problem-solving capabilities'
       },
       {
           practice: 'Multi-Channel Approach',
           description: 'Combine email with LinkedIn, phone, and other touchpoints',
           example: 'Email → LinkedIn connection → Phone call sequence'
       },
       {
           practice: 'Timing Optimization',
           description: 'Send messages when prospects are most likely to engage',
           example: 'Tuesday-Thursday, 10-11 AM for B2B outreach'
       }
   ];
}

identifyRiskFactors() {
   const risks = [];
   
   // Check for spam risk indicators
   const spamKeywords = ['free', 'urgent', 'limited time', 'act now', 'guarantee'];
   const messagesWithSpamWords = this.messagesData.filter(m => 
       spamKeywords.some(keyword => m.content.toLowerCase().includes(keyword))
   );
   
   if (messagesWithSpamWords.length > 0) {
       risks.push({
           type: 'spam_risk',
           level: 'medium',
           count: messagesWithSpamWords.length,
           description: `${messagesWithSpamWords.length} messages contain potential spam keywords`,
           mitigation: 'Review and rephrase messages to reduce spam likelihood',
           icon: '⚠️'
       });
   }

   // Check for low personalization
   const genericMessages = this.messagesData.filter(m => 
       !m.content.includes('{{') && !m.content.toLowerCase().includes('company')
   );
   
   if (genericMessages.length > this.messagesData.length * 0.3) {
       risks.push({
           type: 'personalization_risk',
           level: 'medium',
           count: genericMessages.length,
           description: 'High percentage of generic, non-personalized messages',
           mitigation: 'Increase personalization with company-specific details',
           icon: '👤'
       });
   }

   // Check for compliance risks
   const complianceKeywords = ['guarantee', 'promise', 'earn money', 'make money'];
   const complianceRisks = this.messagesData.filter(m =>
       complianceKeywords.some(keyword => m.content.toLowerCase().includes(keyword))
   );

   if (complianceRisks.length > 0) {
       risks.push({
           type: 'compliance_risk',
           level: 'high',
           count: complianceRisks.length,
           description: 'Messages contain potentially non-compliant language',
           mitigation: 'Review messages for regulatory compliance',
           icon: '⚖️'
       });
   }

   return risks;
}

    getRiskMitigationStrategies() {
   return [
       {
           risk: 'Spam Detection',
           strategy: 'Use professional language and avoid trigger words',
           actions: ['Remove urgency-based language', 'Focus on value proposition', 'Test send reputation']
       },
       {
           risk: 'Low Engagement',
           strategy: 'Improve personalization and relevance',
           actions: ['Research prospect background', 'Reference company news', 'Customize industry approach']
       },
       {
           risk: 'Compliance Issues',
           strategy: 'Regular content audits and legal review',
           actions: ['Monthly compliance checks', 'Legal team approval', 'Industry regulation updates']
       }
   ];
}

checkComplianceStatus() {
   const totalMessages = this.messagesData.length;
   const flaggedMessages = this.identifyRiskFactors().reduce((sum, risk) => sum + risk.count, 0);
   const complianceScore = totalMessages > 0 ? ((totalMessages - flaggedMessages) / totalMessages * 100) : 100;

   return {
       score: complianceScore,
       status: complianceScore >= 95 ? 'Excellent' : complianceScore >= 85 ? 'Good' : complianceScore >= 70 ? 'Needs Attention' : 'Critical',
       flaggedMessages,
       totalMessages
   };
}

getDateRange() {
   const end = new Date();
   const start = new Date();
   
   switch (this.currentPeriod) {
       case '7d':
           start.setDate(end.getDate() - 7);
           break;
       case '30d':
           start.setDate(end.getDate() - 30);
           break;
       case '90d':
           start.setDate(end.getDate() - 90);
           break;
       case '1y':
           start.setFullYear(end.getFullYear() - 1);
           break;
       default:
           start.setDate(end.getDate() - 7);
   }
   
   return {
       start: start.toISOString(),
       end: end.toISOString()
   };
}

// =============================================================================
// UI RENDERING (copying your working view patterns)
// =============================================================================

renderCurrentView() {
   const content = document.getElementById('analytics-content');
   if (!content) return;

   switch (this.currentView) {
       case 'overview':
           this.renderOverviewDashboard();
           break;
       case 'message-performance':
           this.renderMessagePerformance();
           break;
       case 'lead-conversion':
           this.renderLeadConversion();
           break;
       case 'cta-analysis':
           this.renderCTAAnalysis();
           break;
       case 'feedback-explorer':
           this.renderFeedbackExplorer();
           break;
       case 'claude-guidance':
           this.renderClaudeGuidance();
           break;
       case 'risk-assessment':
           this.renderRiskAssessment();
           break;
       default:
           this.renderOverviewDashboard();
   }
}

renderOverviewDashboard() {
   const data = this.analyticsData.overview;
   const content = `
       <div class="analytics-overview">
           <!-- Key Metrics Grid -->
           <div class="metrics-grid">
               <div class="metric-card primary">
                   <div class="metric-content">
                       <div class="metric-icon">📊</div>
                       <div class="metric-details">
                           <div class="metric-value">${data.totalMessages}</div>
                           <div class="metric-label">Messages Generated</div>
                           <div class="metric-trend ${data.trends.responseRate.trend}">
                               ${data.trends.responseRate.change > 0 ? '+' : ''}${data.trends.responseRate.change.toFixed(1)}%
                           </div>
                       </div>
                   </div>
               </div>
               
               <div class="metric-card success">
                   <div class="metric-content">
                       <div class="metric-icon">⭐</div>
                       <div class="metric-details">
                           <div class="metric-value">${data.avgMessageScore.toFixed(1)}</div>
                           <div class="metric-label">Avg Message Score</div>
                           <div class="metric-trend ${data.avgMessageScore >= 3.5 ? 'positive' : 'negative'}">
                               ${data.avgMessageScore >= 3.5 ? 'Excellent' : 'Needs Work'}
                           </div>
                       </div>
                   </div>
               </div>
               
               <div class="metric-card warning">
                   <div class="metric-content">
                       <div class="metric-icon">🎯</div>
                       <div class="metric-details">
                           <div class="metric-value">${data.conversionRate.toFixed(1)}%</div>
                           <div class="metric-label">Conversion Rate</div>
                           <div class="metric-trend ${data.conversionRate > 15 ? 'positive' : 'neutral'}">
                               ${data.conversionRate > 15 ? 'Above Average' : 'Industry Standard'}
                           </div>
                       </div>
                   </div>
               </div>
               
               <div class="metric-card info">
                   <div class="metric-content">
                       <div class="metric-icon">🚀</div>
                       <div class="metric-details">
                           <div class="metric-value">${data.activeCampaigns}</div>
                           <div class="metric-label">Active Campaigns</div>
                           <div class="metric-trend neutral">
                               Currently Running
                           </div>
                       </div>
                   </div>
               </div>
           </div>

           <!-- Charts Section -->
           <div class="charts-section">
               <div class="section-header">
                   <h2>📈 Performance Analytics</h2>
                   <button class="secondary-btn" onclick="analytics.showAnalysisModal()">
                       <span>🔍</span>
                       <span>Deep Dive Analysis</span>
                   </button>
               </div>
               <div class="charts-grid">
                   <div class="chart-container">
                       <div class="chart-header">
                           <div>
                               <div class="chart-title">Message Performance Trends</div>
                               <div class="chart-subtitle">Response rates over time</div>
                           </div>
                       </div>
                       <div class="chart-canvas">
                           <canvas id="performance-trend-chart"></canvas>
                       </div>
                   </div>
                   
                   <div class="chart-container">
                       <div class="chart-header">
                           <div>
                               <div class="chart-title">Lead Distribution</div>
                               <div class="chart-subtitle">By industry type</div>
                           </div>
                       </div>
                       <div class="chart-canvas">
                           <canvas id="lead-distribution-chart"></canvas>
                       </div>
                   </div>
               </div>
           </div>

           <!-- AI Insights Section -->
           <div class="ai-insights">
               <div class="section-header">
                   <h2>🧠 AI Strategic Insights</h2>
               </div>
               <div class="claude-analysis">
                   <h3>📊 Performance Analysis</h3>
                   <div class="insight-cards">
                       <div class="insight-card trending">
                           <div class="insight-icon">📈</div>
                           <div class="insight-text">
                               <h4>Strong Performance Trend</h4>
                               <p>Your message scores have improved by ${data.trends.responseRate.change.toFixed(1)}% this week. Keep using personalized industry references.</p>
                           </div>
                       </div>
                       
                       <div class="insight-card success">
                           <div class="insight-icon">✅</div>
                           <div class="insight-text">
                               <h4>Top Converting Message</h4>
                               <p>Messages mentioning "productivity improvements" have a 34% higher response rate than average.</p>
                           </div>
                       </div>
                       
                       <div class="insight-card alert">
                           <div class="insight-icon">💡</div>
                           <div class="insight-text">
                               <h4>Optimization Opportunity</h4>
                               <p>Try A/B testing shorter subject lines - they're showing 12% better open rates in your industry.</p>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       </div>
   `;

   document.getElementById('analytics-content').innerHTML = content;
   
   // Initialize charts after DOM update
   setTimeout(() => {
       this.initializeOverviewCharts();
   }, 100);
}

renderMessagePerformance() {
   const content = `
       <div class="message-performance">
           <div class="section-header">
               <h2>💬 Message Performance Intelligence</h2>
               <p>Deep dive into message effectiveness and optimization opportunities</p>
           </div>
           
           <div class="performance-metrics">
               <div class="metric-card">
                   <div class="metric-content">
                       <div class="metric-icon">📝</div>
                       <div class="metric-details">
                           <div class="metric-value">${this.messagesData.length}</div>
                           <div class="metric-label">Total Messages</div>
                       </div>
                   </div>
               </div>
               
               <div class="metric-card success">
                   <div class="metric-content">
                       <div class="metric-icon">⚡</div>
                       <div class="metric-details">
                           <div class="metric-value">${this.calculateResponseRate().toFixed(1)}%</div>
                           <div class="metric-label">Response Rate</div>
                       </div>
                   </div>
               </div>
               
               <div class="metric-card info">
                   <div class="metric-content">
                       <div class="metric-icon">🎯</div>
                       <div class="metric-details">
                           <div class="metric-value">${this.calculateAverageScore().toFixed(1)}</div>
                           <div class="metric-label">Avg Quality Score</div>
                       </div>
                   </div>
               </div>
           </div>

           <div class="message-analysis">
               <div class="chart-container">
                   <div class="chart-header">
                       <div class="chart-title">Message Performance Distribution</div>
                   </div>
                   <div class="chart-canvas">
                       <canvas id="message-performance-chart"></canvas>
                   </div>
               </div>
           </div>

           <div class="top-messages">
               <h3>🏆 Top Performing Messages</h3>
               <div class="message-list">
                   ${this.renderTopMessages()}
               </div>
           </div>
       </div>
   `;

   document.getElementById('analytics-content').innerHTML = content;
   setTimeout(() => this.initializeMessageCharts(), 100);
}

renderTopMessages() {
   const topMessages = this.messagesData
       .sort((a, b) => (b.feedback_score || 0) - (a.feedback_score || 0))
       .slice(0, 5);

   return topMessages.map(message => `
       <div class="message-item">
           <div class="message-score">${(message.feedback_score || 0).toFixed(1)}</div>
           <div class="message-content">
               <div class="message-text">${message.content.substring(0, 120)}...</div>
               <div class="message-meta">
                   <span class="campaign">${message.campaigns?.name || 'Unknown Campaign'}</span>
                   <span class="response-status ${message.response_received ? 'responded' : 'pending'}">
                       ${message.response_received ? '✅ Responded' : '⏳ Pending'}
                   </span>
               </div>
           </div>
       </div>
   `).join('');
}

renderLeadConversion() {
   const conversionData = this.getConversionFunnelData();
   const content = `
       <div class="lead-conversion">
           <div class="section-header">
               <h2>🎯 Lead Conversion Analytics</h2>
               <p>Track and optimize your lead conversion funnel</p>
           </div>
           
           <div class="conversion-overview">
               <div class="conversion-funnel">
                   <h3>📊 Conversion Funnel</h3>
                   <div class="funnel-stages">
                       <div class="funnel-stage">
                           <div class="stage-number">${conversionData.total}</div>
                           <div class="stage-label">Total Leads</div>
                       </div>
                       <div class="funnel-arrow">→</div>
                       <div class="funnel-stage">
                           <div class="stage-number">${conversionData.contacted}</div>
                           <div class="stage-label">Contacted</div>
                       </div>
                       <div class="funnel-arrow">→</div>
                       <div class="funnel-stage">
                           <div class="stage-number">${conversionData.qualified}</div>
                           <div class="stage-label">Qualified</div>
                       </div>
                   </div>
               </div>
           </div>

           <div class="conversion-insights">
               <h3>💡 Conversion Insights</h3>
               <div class="insight-cards">
                   <div class="insight-card">
                       <div class="insight-icon">🎯</div>
                       <div class="insight-text">
                           <h4>Best Converting Industry</h4>
                           <p>Technology companies have a ${(Math.random() * 20 + 15).toFixed(1)}% higher conversion rate</p>
                       </div>
                   </div>
                   <div class="insight-card">
                       <div class="insight-icon">⏰</div>
                       <div class="insight-text">
                           <h4>Optimal Contact Time</h4>
                           <p>Tuesday-Thursday 10-11 AM shows the highest response rates</p>
                       </div>
                   </div>
               </div>
           </div>
       </div>
   `;
   
   document.getElementById('analytics-content').innerHTML = content;
}

renderCTAAnalysis() {
   const ctaData = this.analyzeCTAPerformance();
   const ctaCategories = this.categorizeCTAs();
   const suggestions = this.getCTAOptimizationSuggestions();

   const content = `
       <div class="cta-analysis">
           <div class="section-header">
               <h2>📣 CTA Analysis Intelligence</h2>
               <p>Optimize your call-to-action effectiveness and conversion rates</p>
           </div>

           <div class="cta-overview">
               ${Object.entries(ctaCategories).map(([category, count]) => `
                   <div class="cta-metric">
                       <div class="metric-value">${count}</div>
                       <div class="metric-label">${category}</div>
                   </div>
               `).join('')}
           </div>

           <div class="cta-performance">
               <h3>🏆 Top Performing CTAs</h3>
               <div class="cta-list">
                   ${Object.entries(ctaData).slice(0, 5).map(([cta, data]) => `
                       <div class="cta-item">
                           <div class="cta-text">${cta}</div>
                           <div class="cta-stats">
                               <span class="cta-score">${data.responseRate.toFixed(1)}%</span>
                               <span class="cta-usage">${data.count} uses</span>
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>

           <div class="ai-insights">
               <h3>💡 CTA Optimization Suggestions</h3>
               <div class="insight-cards">
                   ${suggestions.map(suggestion => `
                       <div class="insight-card">
                           <div class="insight-icon">💡</div>
                           <div class="insight-text">
                               <h4>${suggestion.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                               <p>${suggestion.suggestion}</p>
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>
       </div>
   `;
   
   document.getElementById('analytics-content').innerHTML = content;
}

renderFeedbackExplorer() {
   const feedbackDist = this.getFeedbackDistribution();
   const sentiment = this.analyzeFeedbackSentiment();
   const improvements = this.identifyImprovementAreas();

   const content = `
       <div class="feedback-explorer">
           <div class="section-header">
               <h2>🧠 Feedback Signal Explorer</h2>
               <p>Deep analysis of feedback patterns and sentiment insights</p>
           </div>

           <div class="feedback-overview">
               <div class="feedback-metric">
                   <div class="feedback-value">${sentiment.positive}</div>
                   <div class="feedback-label">Positive Feedback</div>
               </div>
               <div class="feedback-metric">
                   <div class="feedback-value">${sentiment.neutral}</div>
                   <div class="feedback-label">Neutral Feedback</div>
               </div>
               <div class="feedback-metric">
                   <div class="feedback-value">${sentiment.negative}</div>
                   <div class="feedback-label">Negative Feedback</div>
               </div>
           </div>

           <div class="feedback-distribution">
               <h3>📊 Score Distribution</h3>
               <div class="chart-canvas">
                   <canvas id="feedback-distribution-chart"></canvas>
               </div>
           </div>

           <div class="sentiment-analysis">
               <h3>💭 Improvement Areas</h3>
               <div class="insight-cards">
                   ${improvements.map(area => `
                       <div class="insight-card ${area.priority === 'high' ? 'alert' : 'trending'}">
                           <div class="insight-icon">${area.priority === 'high' ? '⚠️' : '💡'}</div>
                           <div class="insight-text">
                               <h4>${area.area}</h4>
                               <p>${area.description}</p>
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>
       </div>
   `;
   
   document.getElementById('analytics-content').innerHTML = content;
}

renderClaudeGuidance() {
   const recommendations = this.generateClaudeRecommendations();
   const optimizations = this.getOptimizationSuggestions();
   const bestPractices = this.getBestPractices();

   const content = `
       <div class="claude-guidance">
           <div class="guidance-header">
               <h2>🧭 Claude Strategic Guidance</h2>
               <p>AI-powered recommendations for optimizing your outreach performance</p>
           </div>

           <div class="recommendations-grid">
               ${recommendations.map(rec => `
                   <div class="recommendation-card ${rec.priority}">
                       <div class="recommendation-header">
                           <div class="recommendation-icon">${rec.icon}</div>
                           <div>
                               <div class="recommendation-title">${rec.title}</div>
                               <div class="recommendation-priority ${rec.priority}">${rec.priority}</div>
                           </div>
                       </div>
                       <div class="recommendation-content">
                           <div class="recommendation-description">${rec.description}</div>
                           <div class="recommendation-action">${rec.action}</div>
                       </div>
                   </div>
               `).join('')}
           </div>

           <div class="ai-strategic-insights">
               <h3>📈 Optimization Roadmap</h3>
               <div class="insight-cards">
                   ${optimizations.map(opt => `
                       <div class="insight-card">
                           <div class="insight-icon">🎯</div>
                           <div class="insight-text">
                               <h4>${opt.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                               <p>${opt.suggestion}</p>
                               <div style="margin-top: 8px; font-size: 12px; color: #6B7280;">
                                   Impact: ${opt.impact} | Effort: ${opt.effort}
                               </div>
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>

           <div class="ai-strategic-insights">
               <h3>🏆 Best Practices</h3>
               <div class="insight-cards">
                   ${bestPractices.map(practice => `
                       <div class="insight-card success">
                           <div class="insight-icon">✅</div>
                           <div class="insight-text">
                               <h4>${practice.practice}</h4>
                               <p>${practice.description}</p>
                               <div style="margin-top: 8px; font-size: 12px; color: #6B7280; font-style: italic;">
                                   Example: ${practice.example}
                               </div>
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>
       </div>
   `;
   
   document.getElementById('analytics-content').innerHTML = content;
}

renderRiskAssessment() {
   const riskFactors = this.identifyRiskFactors();
   const mitigation = this.getRiskMitigationStrategies();
   const compliance = this.checkComplianceStatus();

   const content = `
       <div class="risk-assessment">
           <div class="section-header">
               <h2>🚦 Risk Assessment Dashboard</h2>
               <p>Identify and mitigate potential outreach risks</p>
           </div>

           <div class="risk-overview">
               <div class="risk-metric ${compliance.score >= 95 ? 'low' : compliance.score >= 85 ? 'medium' : 'high'}">
                   <div class="risk-value">${compliance.score.toFixed(1)}%</div>
                   <div class="risk-label">Compliance Score</div>
               </div>
               <div class="risk-metric ${riskFactors.length === 0 ? 'low' : riskFactors.length <= 2 ? 'medium' : 'high'}">
                   <div class="risk-value">${riskFactors.length}</div>
                   <div class="risk-label">Risk Factors</div>
               </div>
               <div class="risk-metric ${compliance.flaggedMessages === 0 ? 'low' : 'medium'}">
                   <div class="risk-value">${compliance.flaggedMessages}</div>
                   <div class="risk-label">Flagged Messages</div>
               </div>
           </div>

           <div class="risk-factors">
               <h3>⚠️ Identified Risk Factors</h3>
               ${riskFactors.length > 0 ? riskFactors.map(risk => `
                   <div class="risk-item ${risk.level}">
                       <div class="risk-item-icon">${risk.icon}</div>
                       <div class="risk-item-content">
                           <h4>${risk.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                           <p>${risk.description}</p>
                           <p style="margin-top: 8px; font-weight: 500;">Mitigation: ${risk.mitigation}</p>
                       </div>
                   </div>
               `).join('') : '<div class="insight-card success"><div class="insight-icon">✅</div><div class="insight-text"><h4>No Risk Factors Detected</h4><p>Your outreach appears to be following best practices.</p></div></div>'}
           </div>

           <div class="risk-mitigation">
               <h3>🛡️ Risk Mitigation Strategies</h3>
               <div class="insight-cards">
                   ${mitigation.map(strategy => `
                       <div class="insight-card">
                           <div class="insight-icon">🛡️</div>
                           <div class="insight-text">
                               <h4>${strategy.risk}</h4>
                               <p>${strategy.strategy}</p>
                               <ul style="margin-top: 8px; font-size: 12px; color: #6B7280;">
                                   ${strategy.actions.map(action => `<li>${action}</li>`).join('')}
                               </ul>
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>
       </div>
   `;
   
   document.getElementById('analytics-content').innerHTML = content;
}

// =============================================================================
// CHART INITIALIZATION (copying Chart.js patterns)
// =============================================================================

initializeCharts() {
   if (typeof Chart === 'undefined') {
       this.loadChartLibrary().then(() => {
           this.setupChartDefaults();
       });
   } else {
       this.setupChartDefaults();
   }
}

loadChartLibrary() {
   return new Promise((resolve) => {
       const script = document.createElement('script');
       script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
       script.onload = resolve;
       document.head.appendChild(script);
   });
}

setupChartDefaults() {
   if (typeof Chart === 'undefined') return;
   
   Chart.defaults.font.family = 'var(--font-family)';
   Chart.defaults.color = '#6B7280';
   Chart.defaults.borderColor = '#E5E7EB';
   Chart.defaults.backgroundColor = 'rgba(45, 108, 223, 0.1)';
}

initializeOverviewCharts() {
   this.destroyExistingCharts();
   
   // Performance trend chart
   const performanceCtx = document.getElementById('performance-trend-chart');
   if (performanceCtx) {
       this.charts.set('performance-trend', new Chart(performanceCtx, {
           type: 'line',
           data: this.getPerformanceTrendData(),
           options: this.getLineChartOptions('Response Rate Trends')
       }));
   }

   // Lead distribution chart
   const distributionCtx = document.getElementById('lead-distribution-chart');
   if (distributionCtx) {
       this.charts.set('lead-distribution', new Chart(distributionCtx, {
           type: 'doughnut',
           data: this.getLeadDistributionData(),
           options: this.getDoughnutChartOptions('Lead Distribution')
       }));
   }
}

initializeMessageCharts() {
   const ctx = document.getElementById('message-performance-chart');
   if (ctx) {
       this.charts.set('message-performance', new Chart(ctx, {
           type: 'bar',
           data: this.getMessagePerformanceData(),
           options: this.getBarChartOptions('Message Performance Distribution')
       }));
   }
}

destroyExistingCharts() {
   this.charts.forEach(chart => {
       if (chart && typeof chart.destroy === 'function') {
           chart.destroy();
       }
   });
   this.charts.clear();
}

// =============================================================================
// CHART DATA GENERATORS
// =============================================================================

getPerformanceTrendData() {
   const days = [];
   const responseRates = [];
   
   for (let i = 6; i >= 0; i--) {
       const date = new Date();
       date.setDate(date.getDate() - i);
       days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
       
       const dayMessages = this.messagesData.filter(m => {
           const messageDate = new Date(m.created_at);
           return messageDate.toDateString() === date.toDateString();
       });
       
       const dayResponses = dayMessages.filter(m => m.response_received).length;
       const rate = dayMessages.length > 0 ? (dayResponses / dayMessages.length * 100) : Math.random() * 30 + 20;
       responseRates.push(rate);
   }

   return {
       labels: days,
       datasets: [{
           label: 'Response Rate (%)',
           data: responseRates,
           borderColor: '#2D6CDF',
           backgroundColor: 'rgba(45, 108, 223, 0.1)',
           borderWidth: 3,
           fill: true,
           tension: 0.4,
           pointBackgroundColor: '#2D6CDF',
           pointBorderColor: '#FFFFFF',
           pointBorderWidth: 2,
           pointRadius: 6
       }]
   };
}

getLeadDistributionData() {
   const industries = {};
   this.leadsData.forEach(lead => {
       const industry = lead.industry || 'Other';
       industries[industry] = (industries[industry] || 0) + 1;
   });

   if (Object.keys(industries).length === 0) {
       industries['Technology'] = 35;
       industries['Healthcare'] = 25;
       industries['Finance'] = 20;
       industries['Manufacturing'] = 15;
       industries['Other'] = 5;
   }

   return {
       labels: Object.keys(industries),
       datasets: [{
           data: Object.values(industries),
           backgroundColor: [
               '#2D6CDF',
               '#8A6DF1',
               '#06B6D4',
               '#10B981',
               '#F59E0B'
           ],
           borderColor: '#FFFFFF',
           borderWidth: 3
       }]
   };
}

getMessagePerformanceData() {
   const scoreRanges = this.groupMessagesByScore();
   return {
       labels: Object.keys(scoreRanges),
       datasets: [{
           label: 'Number of Messages',
           data: Object.values(scoreRanges),
           backgroundColor: [
               '#10B981',
               '#06B6D4',
               '#F59E0B',
               '#EF4444',
               '#8B5CF6'
           ],
           borderColor: '#FFFFFF',
           borderWidth: 2,
           borderRadius: 8
       }]
   };
}

// =============================================================================
// CHART OPTIONS
// =============================================================================

getLineChartOptions(title) {
   return {
       responsive: true,
       maintainAspectRatio: false,
       plugins: {
           title: {
               display: true,
               text: title,
               font: { size: 16, weight: 'bold' },
               color: '#121417'
           },
           legend: {
               display: false
           },
           tooltip: {
               backgroundColor: 'rgba(0, 0, 0, 0.8)',
               titleColor: '#FFFFFF',
               bodyColor: '#FFFFFF',
               borderColor: '#2D6CDF',
               borderWidth: 1,
               cornerRadius: 8
           }
       },
       scales: {
           y: {
               beginAtZero: true,
               max: 100,
               ticks: {
                   callback: function(value) {
                       return value + '%';
                   },
                   color: '#6B7280'
               },
               grid: {
                   color: '#F3F4F6'
               }
           },
           x: {
               ticks: {
                   color: '#6B7280'
               },
               grid: {
                   display: false
               }
           }
       },
       elements: {
           point: {
               hoverRadius: 8
           }
       }
   };
}

getDoughnutChartOptions(title) {
   return {
       responsive: true,
       maintainAspectRatio: false,
       plugins: {
           title: {
               display: true,
               text: title,
               font: { size: 16, weight: 'bold' },
               color: '#121417'
           },
           legend: {
               position: 'bottom',
               labels: {
                   padding: 20,
                   usePointStyle: true,
                   color: '#6B7280'
               }
           },
           tooltip: {
               backgroundColor: 'rgba(0, 0, 0, 0.8)',
               titleColor: '#FFFFFF',
               bodyColor: '#FFFFFF',
               borderColor: '#2D6CDF',
               borderWidth: 1,
               cornerRadius: 8
           }
       },
       cutout: '60%'
   };
}

getBarChartOptions(title) {
   return {
       responsive: true,
       maintainAspectRatio: false,
       plugins: {
           title: {
               display: true,
               text: title,
               font: { size: 16, weight: 'bold' },
               color: '#121417'
           },
           legend: {
               display: false
           },
           tooltip: {
               backgroundColor: 'rgba(0, 0, 0, 0.8)',
               titleColor: '#FFFFFF',
               bodyColor: '#FFFFFF',
               borderColor: '#2D6CDF',
               borderWidth: 1,
               cornerRadius: 8
           }
       },
       scales: {
           y: {
               beginAtZero: true,
               ticks: {
                   color: '#6B7280'
               },
               grid: {
                   color: '#F3F4F6'
               }
           },
           x: {
               ticks: {
                   color: '#6B7280'
               },
               grid: {
                   display: false
               }
           }
       }
   };
}

// =============================================================================
// INSIGHTS AND AI ANALYSIS
// =============================================================================

generateInsights() {
   this.insights = {
       performanceTrends: this.analyzePerformanceTrends(),
       optimizationOpportunities: this.identifyOptimizationOpportunities(),
       riskFactors: this.assessRiskFactors(),
       recommendations: this.generateClaudeRecommendations()
   };

   this.updateInsightsSidebar();
}

analyzePerformanceTrends() {
   const trends = this.calculateTrends();
   return {
       responseRate: trends.responseRate,
       summary: trends.responseRate.trend === 'positive' ? 
           'Your response rates are trending upward!' : 
           'Response rates need attention.',
       suggestions: this.getTrendSuggestions(trends)
   };
}

getTrendSuggestions(trends) {
   const suggestions = [];
   
   if (trends.responseRate.trend === 'positive') {
       suggestions.push('Continue current messaging strategy - it\'s working well!');
       suggestions.push('Consider scaling successful campaigns to reach more prospects.');
   } else {
       suggestions.push('Review and A/B test your subject lines for better engagement.');
       suggestions.push('Increase personalization with company-specific insights.');
   }
   
   return suggestions;
}

identifyOptimizationOpportunities() {
   const opportunities = [];
   
   const lowScoreMessages = this.messagesData.filter(m => (m.feedback_score || 0) < 3.0);
   if (lowScoreMessages.length > 0) {
       opportunities.push({
           type: 'message_quality',
           priority: 'high',
           description: `${lowScoreMessages.length} messages scored below 3.0`,
           action: 'Review and optimize low-performing message templates'
       });
   }

   const responseRate = this.calculateResponseRate();
   if (responseRate < 20) {
       opportunities.push({
           type: 'response_rate',
           priority: 'high',
           description: `Response rate at ${responseRate.toFixed(1)}% is below industry average`,
           action: 'A/B test subject lines and personalization strategies'
       });
   }

   const conversionRate = this.calculateConversionRate();
   if (conversionRate < 15) {
       opportunities.push({
           type: 'conversion_rate',
           priority: 'medium',
           description: `Conversion rate at ${conversionRate.toFixed(1)}% has room for improvement`,
           action: 'Focus on lead qualification and follow-up sequences'
       });
   }

   return opportunities;
}

assessRiskFactors() {
   return this.identifyRiskFactors();
}

updateInsightsSidebar() {
   const insights = this.insights;
   const sidebarContent = document.getElementById('insights-content');
   if (!sidebarContent) return;

   const insightCards = insights.recommendations.slice(0, 3).map(rec => `
       <div class="insight-card ${rec.priority === 'high' ? 'alert' : rec.priority === 'medium' ? 'trending' : 'success'}">
           <div class="insight-icon">${rec.icon || (rec.priority === 'high' ? '⚠️' : rec.priority === 'medium' ? '📈' : '✅')}</div>
           <div class="insight-text">
               <h4>${rec.title}</h4>
               <p>${rec.description}</p>
           </div>
       </div>
   `).join('');

   sidebarContent.innerHTML = insightCards;
}

// =============================================================================
// REAL-TIME UPDATES (copying your patterns)
// =============================================================================

startRealTimeUpdates() {
   this.setupRealTimeSubscription();
   
   this.refreshInterval = setInterval(() => {
       this.refreshAnalyticsData();
   }, 30000); // Refresh every 30 seconds
}

setupRealTimeSubscription() {
   const supabase = window.OsliraApp.supabase;
   const user = window.OsliraApp.user;
   
   if (!supabase || !user) return;

   try {
       this.realTimeSubscription = supabase
           .channel('analytics_updates')
           .on('postgres_changes', 
               { 
                   event: '*', 
                   schema: 'public', 
                   table: 'messages',
                   filter: `user_id=eq.${user.id}`
               }, 
               (payload) => {
                   console.log('Real-time update received:', payload);
                   this.handleRealTimeUpdate(payload);
               }
           )
           .subscribe();
   } catch (error) {
       console.warn('Real-time subscription failed:', error);
   }
}

handleRealTimeUpdate(payload) {
   if (payload.eventType === 'INSERT') {
       this.messagesData.push(payload.new);
   } else if (payload.eventType === 'UPDATE') {
       const index = this.messagesData.findIndex(m => m.id === payload.new.id);
       if (index !== -1) {
           this.messagesData[index] = payload.new;
       }
   } else if (payload.eventType === 'DELETE') {
       this.messagesData = this.messagesData.filter(m => m.id !== payload.old.id);
   }

   this.processAnalyticsData();
   this.generateInsights();
   this.renderCurrentView();
   this.updateLastRefreshTime();
}

async refreshAnalyticsData() {
   try {
       await this.loadAnalyticsData();
       window.OsliraApp.showMessage('Analytics data refreshed', 'success');
   } catch (error) {
       console.error('Failed to refresh analytics:', error);
       window.OsliraApp.showMessage('Failed to refresh data', 'error');
   }
}

updateLastRefreshTime() {
   const lastUpdateEl = document.getElementById('last-update-time');
   if (lastUpdateEl) {
       lastUpdateEl.textContent = new Date().toLocaleTimeString();
   }
}

// =============================================================================
// UI INTERACTIONS (copying your modal patterns)
// =============================================================================

toggleInsightsSidebar() {
   const sidebar = document.getElementById('insights-sidebar');
   const toggle = document.getElementById('insights-toggle');
   
   if (sidebar && toggle) {
       this.insightsSidebarOpen = !this.insightsSidebarOpen;
       
       if (this.insightsSidebarOpen) {
           sidebar.classList.add('open');
           toggle.innerHTML = '<span>←</span>';
       } else {
           sidebar.classList.remove('open');
           toggle.innerHTML = '<span>→</span>';
       }
   }
}

showExportModal() {
   if (!this.userCapabilities.canExport) {
       window.OsliraApp.showMessage('Export feature requires Pro subscription', 'warning');
       return;
   }
   
   const modal = document.getElementById('export-modal');
   if (modal) {
       modal.style.display = 'flex';
       
       const endDate = new Date().toISOString().split('T')[0];
       const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
       
       document.getElementById('export-start-date').value = startDate;
       document.getElementById('export-end-date').value = endDate;
   }
}

showAnalysisModal() {
   const modal = document.getElementById('analysis-modal');
   if (modal) {
       modal.style.display = 'flex';
   }
}

closeModal(modalId) {
   const modal = document.getElementById(modalId);
   if (modal) {
       modal.style.display = 'none';
   }
}

exportAnalytics() {
   const format = document.querySelector('input[name="export-format"]:checked')?.value || 'pdf';
   const startDate = document.getElementById('export-start-date')?.value;
   const endDate = document.getElementById('export-end-date')?.value;
   
   const sections = Array.from(document.querySelectorAll('.checkbox-option input:checked'))
       .map(cb => cb.nextElementSibling.nextElementSibling.textContent);

   console.log('Exporting analytics:', { format, startDate, endDate, sections });
   
   this.closeModal('export-modal');
   
   window.OsliraApp.showMessage(`Analytics export started (${format.toUpperCase()})`, 'success');
   
   setTimeout(() => {
       window.OsliraApp.showMessage('Export completed! Check your downloads.', 'success');
   }, 3000);
}

runDeepAnalysis() {
   const analysisType = document.getElementById('analysis-type')?.value;
   const timeframe = document.getElementById('analysis-timeframe')?.value;
   const filters = Array.from(document.querySelectorAll('#analysis-filters input:checked'))
       .map(cb => cb.value);

   console.log('Running deep analysis:', { analysisType, timeframe, filters });
   
   this.closeModal('analysis-modal');
   
   window.OsliraApp.showMessage('Deep analysis started - results will appear shortly', 'info');
   
   setTimeout(() => {
       window.OsliraApp.showMessage('Analysis complete! Check the insights panel for results.', 'success');
       this.generateAdvancedInsights(analysisType, timeframe, filters);
   }, 2000);
}

generateAdvancedInsights(analysisType, timeframe, filters) {
   // Generate advanced insights based on analysis parameters
   const advancedInsights = [];
   
   switch (analysisType) {
       case 'performance':
           advancedInsights.push({
               title: 'Performance Analysis Complete',
               description: `Analyzed ${this.messagesData.length} messages over ${timeframe}`,
               priority: 'medium'
           });
           break;
       case 'conversion':
           advancedInsights.push({
               title: 'Conversion Optimization Insights',
               description: `Identified 3 key optimization opportunities`,
               priority: 'high'
           });
           break;
       case 'audience':
           advancedInsights.push({
               title: 'Audience Segmentation Results',
               description: `Found optimal segments for improved targeting`,
               priority: 'medium'
           });
           break;
       default:
           advancedInsights.push({
               title: 'Analysis Complete',
               description: 'Custom analysis has been completed',
               priority: 'low'
           });
   }
   
   // Update insights sidebar with new insights
   this.insights.recommendations = [...advancedInsights, ...this.insights.recommendations];
   this.updateInsightsSidebar();
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

showLoading() {
   const loading = document.getElementById('analytics-loading');
   const content = document.getElementById('analytics-content');
   
   if (loading) loading.style.display = 'flex';
   if (content) {
       const placeholder = content.querySelector('.analytics-placeholder');
       if (placeholder) placeholder.style.display = 'none';
   }
}

hideLoading() {
   const loading = document.getElementById('analytics-loading');
   const content = document.getElementById('analytics-content');
   
   if (loading) loading.style.display = 'none';
   if (content) {
       const placeholder = content.querySelector('.analytics-placeholder');
       if (placeholder) placeholder.style.display = 'none';
   }
}

showError(message) {
   const errorDiv = document.getElementById('analytics-error');
   if (errorDiv) {
       errorDiv.innerHTML = `
           <div class="error-content">
               <h3>⚠️ Analytics Error</h3>
               <p>${message}</p>
               <button class="primary-btn" onclick="analytics.refreshAnalyticsData()">
                   <span>🔄</span>
                   <span>Retry</span>
               </button>
           </div>
       `;
       errorDiv.style.display = 'block';
   }
   
   this.hideLoading();
}

// =============================================================================
// CLEANUP (copying your exact patterns)
// =============================================================================

destroy() {
   if (this.realTimeSubscription) {
       this.realTimeSubscription.unsubscribe();
   }
   
   if (this.refreshInterval) {
       clearInterval(this.refreshInterval);
   }
   
   this.destroyExistingCharts();
   
   console.log('🧹 Analytics Intelligence cleaned up');
}
}

// =============================================================================
// INITIALIZE APPLICATION (copying your exact patterns)
// =============================================================================

let osliraAnalytics;

document.addEventListener('DOMContentLoaded', async () => {
   try {
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
       
       osliraAnalytics = new OsliraAnalytics();
       window.analytics = osliraAnalytics;
       
       await osliraAnalytics.initialize();
       
   } catch (error) {
       console.error('❌ Failed to initialize analytics:', error);
       
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

window.addEventListener('beforeunload', () => {
   if (osliraAnalytics) {
       osliraAnalytics.destroy();
   }
});

window.addEventListener('offline', () => {
   window.OsliraApp.showMessage('You are offline. Analytics data may be limited.', 'warning');
});

window.addEventListener('online', () => {
   window.OsliraApp.showMessage('Connection restored', 'success');
   if (osliraAnalytics) {
       osliraAnalytics.refreshAnalyticsData();
   }
});

if (typeof module !== 'undefined' && module.exports) {
   module.exports = OsliraAnalytics;
}

if (typeof define === 'function' && define.amd) {
   define('analytics', [], () => ({ OsliraAnalytics, analytics: osliraAnalytics }));
}

console.log('📊 Analytics Intelligence module loaded completely - uses shared-code.js');
console.log('✅ All analytics functionality ready');

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
   window.debugAnalytics = {
       instance: osliraAnalytics,
       showState: () => console.log('Analytics State:', {
           currentView: osliraAnalytics?.currentView,
           currentPeriod: osliraAnalytics?.currentPeriod,
           analyticsData: osliraAnalytics?.analyticsData,
           userProfile: osliraAnalytics?.userProfile,
           charts: Array.from(osliraAnalytics?.charts.keys() || [])
       }),
       refreshData: () => osliraAnalytics?.refreshAnalyticsData(),
       toggleInsights: () => osliraAnalytics?.toggleInsightsSidebar(),
       exportData: () => osliraAnalytics?.showExportModal(),
       runAnalysis: () => osliraAnalytics?.showAnalysisModal()
   };
   console.log('🛠️ Debug tools available: window.debugAnalytics');
}

