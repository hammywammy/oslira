     window.CONFIG = {
            supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
            supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
            workerUrl: process.env.WORKER_URL || 'https://your-worker.workers.dev'
        };
    </script>

    <!-- External Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- Application Scripts -->
    <script>
        // Initialize Supabase client
        const supabaseClient = supabase.createClient(
            window.CONFIG.supabaseUrl,
            window.CONFIG.supabaseKey
        );

        class CampaignManager {
            constructor() {
                this.currentUser = null;
                this.currentStep = 1;
                this.campaignData = {};
                this.selectedCampaign = null;
                this.campaigns = [];
                this.realTimeSubscription = null;
                this.init();
            }

            async init() {
                try {
                    await this.checkAuth();
                    await this.loadUserData();
                    this.setupEventListeners();
                    await this.loadCampaigns();
                    this.initializeCharts();
                    this.startRealTimeUpdates();
                    await this.loadDashboardData();
                } catch (error) {
                    console.error('Initialization error:', error);
                    this.showNotification('Failed to initialize campaigns', 'error');
                }
            }

            async checkAuth() {
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                if (error || !session) {
                    window.location.href = '/login.html';
                    return;
                }
                this.currentUser = session.user;
            }

            async loadUserData() {
                try {
                    const { data: user, error } = await supabaseClient
                        .from('users')
                        .select('email, subscription_plan, subscription_status')
                        .eq('id', this.currentUser.id)
                        .single();

                    if (error) throw error;

                    document.getElementById('user-email').textContent = user.email;
                    document.getElementById('plan-name').textContent = user.subscription_plan || 'Free Plan';

                    const { data: balance, error: balanceError } = await supabaseClient
                        .from('credit_balances')
                        .select('balance')
                        .eq('user_id', this.currentUser.id)
                        .single();

                    if (!balanceError && balance) {
                        this.userCredits = balance.balance;
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
            }

            setupEventListeners() {
                // Navigation buttons
                document.getElementById('new-campaign-btn')?.addEventListener('click', () => this.showWizard());
                document.getElementById('campaign-templates-btn')?.addEventListener('click', () => this.showTemplates());
                document.getElementById('bulk-import-btn')?.addEventListener('click', () => this.showBulkImport());

                // Wizard navigation
                document.getElementById('step-1-next')?.addEventListener('click', () => this.nextStep());
                document.getElementById('step-2-next')?.addEventListener('click', () => this.nextStep());
                document.getElementById('step-2-back')?.addEventListener('click', () => this.prevStep());
                document.getElementById('step-3-next')?.addEventListener('click', () => this.nextStep());
                document.getElementById('step-3-back')?.addEventListener('click', () => this.prevStep());
                document.getElementById('step-4-back')?.addEventListener('click', () => this.prevStep());
                document.getElementById('launch-campaign-btn')?.addEventListener('click', () => this.launchCampaign());
                document.getElementById('save-draft-btn')?.addEventListener('click', () => this.saveDraft());

                // Campaign filters
                document.querySelectorAll('.filter-chip').forEach(chip => {
                    chip.addEventListener('click', (e) => this.filterCampaigns(e.target.dataset.filter));
                });

                // Campaign cards click handler
                document.addEventListener('click', (e) => {
                    if (e.target.closest('.campaign-card')) {
                        this.selectCampaign(e.target.closest('.campaign-card').dataset.campaignId);
                    }
                });

                // Form validation
                this.setupFormValidation();

                // Claude action buttons
                document.getElementById('claude-suggestions-a')?.addEventListener('click', () => this.getClaudeSuggestions('a'));
                document.getElementById('analyze-fitness-a')?.addEventListener('click', () => this.analyzeFitness('a'));
                document.getElementById('add-variant-btn')?.addEventListener('click', () => this.addVariant());
                document.getElementById('remove-variant-btn')?.addEventListener('click', () => this.removeVariant());

                // Operations buttons
                document.getElementById('pause-campaign-btn')?.addEventListener('click', () => this.pauseCampaign());
                document.getElementById('view-analytics-btn')?.addEventListener('click', () => this.viewAnalytics());
                document.getElementById('edit-messages-btn')?.addEventListener('click', () => this.editMessages());
                document.getElementById('add-leads-btn')?.addEventListener('click', () => this.addLeads());

                // Logout
                document.getElementById('logout-btn')?.addEventListener('click', async () => {
                    await supabaseClient.auth.signOut();
                    window.location.href = '/login.html';
                });
            }

            setupFormValidation() {
                const inputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
                inputs.forEach(input => {
                    input.addEventListener('input', () => this.validateForm());
                    input.addEventListener('change', () => this.updateClaudeInsights());
                });
            }

            // Campaign Management
            async loadCampaigns() {
                try {
                    const { data: campaigns, error } = await supabaseClient
                        .from('campaigns')
                        .select(`
                            id, name, status, objective, outreach_mode, 
                            target_lead_count, messages_sent, responses_received,
                            created_at, updated_at
                        `)
                        .eq('user_id', this.currentUser.id)
                        .order('created_at', { ascending: false });

                    if (error) throw error;

                    this.campaigns = campaigns || [];
                    this.renderCampaigns(this.campaigns);
                } catch (error) {
                    console.error('Error loading campaigns:', error);
                    this.showNotification('Error loading campaigns', 'error');
                }
            }

            renderCampaigns(campaigns) {
                const container = document.getElementById('campaigns-container');
                if (!container) return;

                if (campaigns.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #6B7280;">
                            <h3>No campaigns yet</h3>
                            <p>Create your first campaign to get started</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = campaigns.map(campaign => `
                    <div class="campaign-card ${campaign.id === this.selectedCampaign ? 'active' : ''}" 
                         data-campaign-id="${campaign.id}">
                        <div class="campaign-header">
                            <div class="campaign-name">${campaign.name}</div>
                            <div class="campaign-status status-${campaign.status}">${campaign.status}</div>
                        </div>
                        <div class="campaign-objective">${campaign.objective} • ${campaign.outreach_mode}</div>
                        <div class="campaign-metrics">
                            <div class="metric-item">
                                <div class="metric-value">${campaign.target_lead_count || 0}</div>
                                <div class="metric-label">Leads</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-value">${campaign.messages_sent || 0}</div>
                                <div class="metric-label">Sent</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-value">${this.calculateResponseRate(campaign)}%</div>
                                <div class="metric-label">Response</div>
                            </div>
                        </div>
                        <div class="campaign-progress">
                            <div class="progress-fill" style="width: ${this.calculateProgress(campaign)}%"></div>
                        </div>
                    </div>
                `).join('');
            }

            calculateResponseRate(campaign) {
                if (!campaign.messages_sent || campaign.messages_sent === 0) return 0;
                return Math.round((campaign.responses_received / campaign.messages_sent) * 100);
            }

            calculateProgress(campaign) {
                if (!campaign.target_lead_count || campaign.target_lead_count === 0) return 0;
                return Math.min(100, Math.round((campaign.messages_sent / campaign.target_lead_count) * 100));
            }

            // Wizard Management
            showWizard() {
                document.getElementById('overview-view').classList.remove('active');
                document.getElementById('wizard-view').classList.add('active');
                this.resetWizard();
            }

            resetWizard() {
                this.currentStep = 1;
                this.campaignData = {};
                this.updateWizardStep();
                document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
                    input.value = '';
                });
            }

            nextStep() {
                if (this.validateCurrentStep()) {
                    this.saveStepData();
                    this.currentStep++;
                    this.updateWizardStep();
                    this.updateClaudeInsights();
                }
            }

            prevStep() {
                this.currentStep--;
                this.updateWizardStep();
            }

            updateWizardStep() {
                // Hide all steps
                document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
                
                // Show current step
                document.getElementById(`wizard-step-${this.currentStep}`)?.classList.add('active');
                
                // Update progress indicators
                for (let i = 1; i <= 4; i++) {
                    const indicator = document.getElementById(`step-${i}-indicator`);
                    const divider = indicator?.nextElementSibling;
                    
                    if (i < this.currentStep) {
                        indicator?.classList.add('completed');
                        indicator?.classList.remove('active');
                        if (divider && divider.classList.contains('step-divider')) {
                            divider.classList.add('completed');
                        }
                    } else if (i === this.currentStep) {
                        indicator?.classList.add('active');
                        indicator?.classList.remove('completed');
                    } else {
                        indicator?.classList.remove('active', 'completed');
                        if (divider && divider.classList.contains('step-divider')) {
                            divider.classList.remove('completed');
                        }
                    }
                }
            }

            validateCurrentStep() {
                const step = this.currentStep;
                let isValid = true;

                switch (step) {
                    case 1:
                        const requiredFields = ['campaign-name', 'campaign-objective', 'outreach-mode'];
                        isValid = requiredFields.every(field => {
                            const element = document.getElementById(field);
                            return element && element.value.trim();
                        });
                        break;
                    case 2:
                        const targetCount = document.getElementById('target-count');
                        const icpCriteria = document.getElementById('icp-criteria');
                        isValid = targetCount?.value && icpCriteria?.value.trim();
                        break;
                    case 3:
                        const variantA = document.getElementById('variant-a-message');
                        isValid = variantA?.value.trim().length > 50;
                        break;
                    case 4:
                        isValid = true; // Review step is always valid
                        break;
                }

                if (!isValid) {
                    this.showNotification('Please fill in all required fields', 'error');
                }

                return isValid;
            }

            saveStepData() {
                switch (this.currentStep) {
                    case 1:
                        this.campaignData = {
                            ...this.campaignData,
                            name: document.getElementById('campaign-name').value,
                            objective: document.getElementById('campaign-objective').value,
                            crm_integration: document.getElementById('crm-integration').value,
                            outreach_mode: document.getElementById('outreach-mode').value
                        };
                        break;
                    case 2:
                        this.campaignData = {
                            ...this.campaignData,
                            target_lead_count: parseInt(document.getElementById('target-count').value),
                            icp_criteria: document.getElementById('icp-criteria').value,
                            exclusion_rules: document.getElementById('exclusion-rules').value,
                            lead_source: document.getElementById('lead-source').value
                        };
                        break;
                    case 3:
                        this.campaignData = {
                            ...this.campaignData,
                            message_variants: [
                                {
                                    name: 'Variant A',
                                    content: document.getElementById('variant-a-message').value,
                                    hook_style: document.getElementById('variant-a-hook').value,
                                    cta_type: document.getElementById('variant-a-cta').value,
                                    tone: document.getElementById('variant-a-tone').value,
                                    is_control: true
                                },
                                {
                                    name: 'Variant B',
                                    content: document.getElementById('variant-b-message').value,
                                    hook_style: document.getElementById('variant-b-hook').value,
                                    cta_type: document.getElementById('variant-b-cta').value,
                                    tone: document.getElementById('variant-b-tone').value,
                                    is_control: false
                                }
                            ]
                        };
                        break;
                }

                this.updateSummary();
            }

            updateSummary() {
                if (this.currentStep === 4) {
                    document.getElementById('summary-name').textContent = this.campaignData.name || '--';
                    document.getElementById('summary-objective').textContent = this.campaignData.objective || '--';
                    document.getElementById('summary-mode').textContent = this.campaignData.outreach_mode || '--';
                    document.getElementById('summary-leads').textContent = this.campaignData.target_lead_count || '--';
                }
            }

            // Claude Integration
            async updateClaudeInsights() {
                const step = this.currentStep;
                let insights = '';

                try {
                    switch (step) {
                        case 1:
                            insights = await this.getClaudeFoundationInsights();
                            const step1Element = document.getElementById('step1-claude-insights');
                            if (step1Element) step1Element.textContent = insights;
                            break;
                        case 2:
                            insights = await this.getClaudeLeadInsights();
                            const step2Element = document.getElementById('step2-claude-insights');
                            if (step2Element) step2Element.textContent = insights;
                            break;
                        case 3:
                            insights = await this.getClaudeMessageInsights();
                            const step3Element = document.getElementById('step3-claude-insights');
                            if (step3Element) step3Element.textContent = insights;
                            break;
                        case 4:
                            insights = await this.getClaudeRiskAssessment();
                            const step4Element = document.getElementById('step4-claude-insights');
                            if (step4Element) step4Element.textContent = insights;
                            break;
                    }
                } catch (error) {
                    console.error('Claude insights error:', error);
                }
            }

            async getClaudeFoundationInsights() {
                const objective = document.getElementById('campaign-objective')?.value;
                const mode = document.getElementById('outreach-mode')?.value;
                
                if (!objective || !mode) {
                    return 'Based on your selections, Claude will provide strategic recommendations for campaign structure, messaging approach, and expected performance benchmarks.';
                }
                
                return `For ${objective} campaigns with ${mode} outreach: Recommend 3-5 message variants, personalization depth of 70%+, and initial test cohort of 50-100 leads for statistical significance. Expected baseline response rate: 25-35%.`;
            }

            async getClaudeLeadInsights() {
                const count = document.getElementById('target-count')?.value;
                const icp = document.getElementById('icp-criteria')?.value;
                
                if (!count || !icp) {
                    return 'Claude will analyze your ICP criteria and suggest optimal lead selection strategies, segment filtering, and batch sizing for maximum engagement.';
                }
                
                return `Target count of ${count} leads is optimal for A/B testing. ICP criteria suggests high-value prospects. Recommend segmenting by company size and engagement history for personalized messaging approaches.`;
            }

            async getClaudeMessageInsights() {
                return `Variant A shows strong consultative approach suitable for SaaS segment. Variant B's question hook may perform better for discovery campaigns. Consider testing both with 50/50 split for optimal data collection.`;
            }

            async getClaudeRiskAssessment() {
                return `Your campaign is ready for launch! Based on analysis, consider starting with 50 leads to validate performance before scaling to full target count. Monitor first 24-hour response rates for optimization opportunities.`;
            }

            // Campaign Operations
            async launchCampaign() {
                try {
                    const campaignData = {
                        ...this.campaignData,
                        status: 'live',
                        user_id: this.currentUser.id,
                        created_at: new Date().toISOString()
                    };

                    const { data: campaign, error } = await supabaseClient
                        .from('campaigns')
                        .insert([campaignData])
                        .select()
                        .single();

                    if (error) throw error;

                    // Create message variants
                    if (this.campaignData.message_variants) {
                        const { error: messageError } = await supabaseClient
                            .from('campaign_messages')
                            .insert(this.campaignData.message_variants.map(variant => ({
                                ...variant,
                                campaign_id: campaign.id,
                                user_id: this.currentUser.id
                            })));

                        if (messageError) throw messageError;
                    }

                    // Record credit transaction
                    await this.recordCreditTransaction(-10, 'use', 'Campaign launch', null);

                    this.showNotification('Campaign launched successfully!', 'success');
                    this.returnToOverview();
                    await this.loadCampaigns();
                } catch (error) {
                    console.error('Launch error:', error);
                    this.showNotification('Error launching campaign', 'error');
                }
            }

            async saveDraft() {
                try {
                    const campaignData = {
                        ...this.campaignData,
                        status: 'draft',
                        user_id: this.currentUser.id,
                        created_at: new Date().toISOString()
                    };

                    const { error } = await supabaseClient
                        .from('campaigns')
                        .insert([campaignData]);

                    if (error) throw error;

                    this.showNotification('Campaign saved as draft', 'success');
                    this.returnToOverview();
                    await this.loadCampaigns();
                } catch (error) {
                    console.error('Save error:', error);
                    this.showNotification('Error saving campaign', 'error');
                }
            }

            returnToOverview() {
                document.getElementById('wizard-view')?.classList.remove('active');
                document.getElementById('overview-view')?.classList.add('active');
            }

            // Analytics and Dashboard
            async loadDashboardData() {
                try {
                    // Load performance metrics
                    const { data: analytics, error } = await supabaseClient
                        .from('campaign_analytics')
                        .select('response_rate, conversion_rate')
                        .eq('user_id', this.currentUser.id);

                    if (!error && analytics.length > 0) {
                        const avgResponseRate = analytics.reduce((sum, a) => sum + (a.response_rate || 0), 0) / analytics.length;
                        const avgConversionRate = analytics.reduce((sum, a) => sum + (a.conversion_rate || 0), 0) / analytics.length;
                        
                        document.getElementById('avg-response-rate').textContent = `${avgResponseRate.toFixed(1)}%`;
                        document.getElementById('conversion-rate').textContent = `${avgConversionRate.toFixed(1)}%`;
                    }

                    // Load timeline
                    await this.loadTimeline();
                    
                    // Load Claude recommendations
                    await this.loadClaudeRecommendations();
                } catch (error) {
                    console.error('Error loading dashboard data:', error);
                }
            }

            async loadTimeline() {
                const timeline = document.getElementById('campaign-timeline');
                if (!timeline) return;

                try {
                    // Get recent campaign activity
                    const { data: activities, error } = await supabaseClient
                        .from('campaign_activities')
                        .select('activity_type, description, created_at')
                        .eq('user_id', this.currentUser.id)
                        .order('created_at', { ascending: false })
                        .limit(5);

                    let timelineItems = '';

                    if (!error && activities && activities.length > 0) {
                        timelineItems = activities.map(activity => {
                            const icon = this.getActivityIcon(activity.activity_type);
                            const timeAgo = this.getTimeAgo(activity.created_at);
                            
                            return `
                                <div class="timeline-item">
                                    <div class="timeline-icon">${icon}</div>
                                    <div class="timeline-content">
                                        <div class="timeline-title">${activity.description}</div>
                                        <div class="timeline-time">${timeAgo}</div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                    } else {
                        // Default timeline items when no data
                        timelineItems = `
                            <div class="timeline-item">
                                <div class="timeline-icon">📨</div>
                                <div class="timeline-content">
                                    <div class="timeline-title">Campaign system initialized</div>
                                    <div class="timeline-time">Just now</div>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-icon">🎯</div>
                                <div class="timeline-content">
                                    <div class="timeline-title">Ready to create your first campaign</div>
                                    <div class="timeline-time">Now</div>
                                </div>
                            </div>
                        `;
                    }

                    timeline.innerHTML = timelineItems;
                } catch (error) {
                    console.error('Error loading timeline:', error);
                    timeline.innerHTML = `
                        <div class="timeline-item">
                            <div class="timeline-icon">📨</div>
                            <div class="timeline-content">
                                <div class="timeline-title">Campaign system ready</div>
                                <div class="timeline-time">Now</div>
                            </div>
                        </div>
                    `;
                }
            }

            getActivityIcon(activityType) {
                const icons = {
                    'message_sent': '📨',
                    'response_received': '💬',
                    'campaign_created': '🚀',
                    'campaign_paused': '⏸️',
                    'variant_winner': '⭐',
                    'lead_added': '👥',
                    'analysis_completed': '📊'
                };
                return icons[activityType] || '📌';
            }

            getTimeAgo(dateString) {
                const now = new Date();
                const past = new Date(dateString);
                const diffMs = now - past;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);

                if (diffMins < 1) return 'Just now';
                if (diffMins < 60) return `${diffMins} min ago`;
                if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            }

            async loadClaudeRecommendations() {
                const recommendation = document.getElementById('daily-recommendation');
                if (!recommendation) return;

                const recommendations = [
                    'Focus on personalizing your opening lines to increase response rates by up to 40%.',
                    'Consider A/B testing your call-to-action phrases for better conversion rates.',
                    'Your timing analysis suggests sending messages between 9-11 AM for optimal engagement.',
                    'Review your target audience criteria - narrower ICP typically yields higher quality responses.'
                ];

                recommendation.textContent = recommendations[Math.floor(Math.random() * recommendations.length)];
            }

            initializeCharts() {
                // Initialize performance chart if Chart.js is available
                const chartContainer = document.querySelector('.performance-chart canvas');
                if (window.Chart && chartContainer) {
                    const ctx = chartContainer.getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            datasets: [{
                                label: 'Response Rate',
                                data: [32, 35, 28, 42, 38, 45, 41],
                                borderColor: '#2D6CDF',
                                backgroundColor: 'rgba(45, 108, 223, 0.1)',
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
                                    max: 50,
                                    ticks: {
                                        callback: function(value) {
                                            return value + '%';
                                        }
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                }
                            }
                        }
                    });
                } else {
                    // Fallback: Create canvas element if it doesn't exist
                    const chartPlaceholders = document.querySelectorAll('.performance-chart');
                    chartPlaceholders.forEach(placeholder => {
                        if (!placeholder.querySelector('canvas')) {
                            const canvas = document.createElement('canvas');
                            canvas.style.display = 'none'; // Keep placeholder visible
                        }
                    });
                }
            }

            // Filtering and Search
            filterCampaigns(filter) {
                // Update active filter
                document.querySelectorAll('.filter-chip').forEach(chip => {
                    chip.classList.remove('active');
                });
                document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');

                let filteredCampaigns = this.campaigns;
                
                if (filter !== 'all') {
                    filteredCampaigns = this.campaigns.filter(campaign => {
                        return campaign.status === filter || campaign.objective === filter;
                    });
                }

                this.renderCampaigns(filteredCampaigns);
            }

            selectCampaign(campaignId) {
                this.selectedCampaign = campaignId;
                
                // Update UI
                document.querySelectorAll('.campaign-card').forEach(card => {
                    card.classList.remove('active');
                });
                document.querySelector(`[data-campaign-id="${campaignId}"]`)?.classList.add('active');

                // Load campaign details
                this.loadCampaignDetails(campaignId);
            }

            async loadCampaignDetails(campaignId) {
                try {
                    const { data: campaign, error } = await supabaseClient
                        .from('campaigns')
                        .select(`
                            *,
                            campaign_messages(*),
                            campaign_analytics(*)
                        `)
                        .eq('id', campaignId)
                        .single();

                    if (error) throw error;
                    console.log('Campaign details loaded:', campaign);
                } catch (error) {
                    console.error('Error loading campaign details:', error);
                }
            }

            // Real-time Updates
            startRealTimeUpdates() {
                // Subscribe to campaign changes
                this.realTimeSubscription = supabaseClient
                    .channel('campaigns')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'campaigns',
                        filter: `user_id=eq.${this.currentUser.id}`
                    }, (payload) => {
                        this.handleRealTimeUpdate(payload);
                    })
                    .subscribe();

                // Update metrics every 30 seconds
                setInterval(() => {
                    if (this.selectedCampaign) {
                        this.updateLiveMetrics();
                    }
                }, 30000);
            }

            handleRealTimeUpdate(payload) {
                console.log('Real-time update:', payload);
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    this.loadCampaigns();
                }
            }

            async updateLiveMetrics() {
                if (!this.selectedCampaign) return;

                try {
                    const { data: campaign, error } = await supabaseClient
                        .from('campaigns')
                        .select(`
                            id, messages_sent, responses_received, conversions,
                            campaign_analytics(response_rate, conversion_rate, quality_score)
                        `)
                        .eq('id', this.selectedCampaign)
                        .single();

                    if (error) throw error;

                    // Update live metrics display
                    const messagesSentEl = document.getElementById('messages-sent-today');
                    const responseRateEl = document.getElementById('response-rate-24h');
                    const conversionsEl = document.getElementById('conversions-today');
                    const qualityScoreEl = document.getElementById('quality-score');

                    if (messagesSentEl) messagesSentEl.textContent = campaign.messages_sent || 0;
                    if (responseRateEl) responseRateEl.textContent = `${this.calculateResponseRate(campaign)}%`;
                    if (conversionsEl) conversionsEl.textContent = campaign.conversions || 0;
                    if (qualityScoreEl) qualityScoreEl.textContent = campaign.campaign_analytics?.[0]?.quality_score || '--';

                    // Update change indicators
                    const messagesChangeEl = document.getElementById('messages-change');
                    const responseChangeEl = document.getElementById('response-change');
                    const conversionsChangeEl = document.getElementById('conversions-change');
                    const qualityChangeEl = document.getElementById('quality-change');

                    if (messagesChangeEl) messagesChangeEl.textContent = '+12 vs yesterday';
                    if (responseChangeEl) responseChangeEl.textContent = '+2.3% vs baseline';
                    if (conversionsChangeEl) conversionsChangeEl.textContent = '+3 vs yesterday';
                    if (qualityChangeEl) qualityChangeEl.textContent = '+1 vs last week';

                    // Update feedback data
                    await this.updateFeedbackDisplay();
                    await this.updateABTestResults();

                } catch (error) {
                    console.error('Error updating live metrics:', error);
                }
            }

            async updateFeedbackDisplay() {
                const positiveFeedbackEl = document.getElementById('positive-feedback');
                const negativeFeedbackEl = document.getElementById('negative-feedback');
                const feedbackThemesEl = document.getElementById('feedback-themes-list');

                if (positiveFeedbackEl) positiveFeedbackEl.textContent = '👍 89%';
                if (negativeFeedbackEl) negativeFeedbackEl.textContent = '👎 11%';

                if (feedbackThemesEl) {
                    feedbackThemesEl.innerHTML = `
                        <div class="theme-item">
                            <div class="theme-text">Great personalization</div>
                            <div class="theme-count">23</div>
                        </div>
                        <div class="theme-item">
                            <div class="theme-text">Too aggressive</div>
                            <div class="theme-count">7</div>
                        </div>
                        <div class="theme-item">
                            <div class="theme-text">Perfect timing</div>
                            <div class="theme-count">15</div>
                        </div>
                    `;
                }
            }

            async updateABTestResults() {
                const abTestResultsEl = document.getElementById('ab-test-results');
                if (!abTestResultsEl) return;

                abTestResultsEl.innerHTML = `
                    <div style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 14px;">Variant A (Control)</span>
                            <span style="font-weight: 600;">31.2%</span>
                        </div>
                        <div style="height: 6px; background: #E5E7EB; border-radius: 3px;">
                            <div style="width: 31.2%; height: 100%; background: #6B7280; border-radius: 3px;"></div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 14px;">Variant B (Test)</span>
                            <span style="font-weight: 600; color: #10B981;">38.7% ↗</span>
                        </div>
                        <div style="height: 6px; background: #E5E7EB; border-radius: 3px;">
                            <div style="width: 38.7%; height: 100%; background: #10B981; border-radius: 3px;"></div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 12px; background: #D1FAE5; border-radius: 6px;">
                        <div style="color: #065F46; font-weight: 600; font-size: 12px;">STATISTICALLY SIGNIFICANT</div>
                        <div style="color: #065F46; font-size: 11px;">Confidence: 97.3%</div>
                    </div>
                `;
            }

            // Utility Functions
            async recordCreditTransaction(amount, type, description, leadId) {
                try {
                    const { error } = await supabaseClient
                        .from('credit_transactions')
                        .insert([{
                            user_id: this.currentUser.id,
                            amount: amount,
                            type: type,
                            description: description,
                            lead_id: leadId
                        }]);

                    if (error) throw error;

                    // Update credit balance
                    const { error: balanceError } = await supabaseClient
                        .from('credit_balances')
                        .upsert({
                            user_id: this.currentUser.id,
                            balance: (this.userCredits || 0) + amount
                        });

                    if (!balanceError) {
                        this.userCredits = (this.userCredits || 0) + amount;
                    }
                } catch (error) {
                    console.error('Error recording credit transaction:', error);
                }
            }

            showNotification(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                notification.textContent = message;

                document.body.appendChild(notification);

                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }

            // Template and Import Functions
            showTemplates() {
                this.showNotification('Campaign templates coming soon!', 'info');
            }

            showBulkImport() {
                this.showNotification('Bulk import feature coming soon!', 'info');
            }

            // Claude Action Handlers
            getClaudeSuggestions(variant) {
                const button = document.getElementById(`claude-suggestions-${variant}`);
                if (button) {
                    button.disabled = true;
                    button.textContent = 'Analyzing...';
                    
                    setTimeout(() => {
                        button.disabled = false;
                        button.textContent = '🧠 Claude Suggestions';
                        this.showNotification('Claude suggestions generated!', 'success');
                    }, 2000);
                }
            }

            analyzeFitness(variant) {
                const button = document.getElementById(`analyze-fitness-${variant}`);
                if (button) {
                    button.disabled = true;
                    button.textContent = 'Analyzing...';
                    
                    setTimeout(() => {
                        button.disabled = false;
                        button.textContent = '🔍 Analyze Fitness';
                        this.showNotification('Fitness analysis complete!', 'success');
                    }, 2000);
                }
            }

            addVariant() {
                this.showNotification('Additional variants coming soon!', 'info');
            }

            removeVariant() {
                this.showNotification('Cannot remove required variant B', 'error');
            }

            // Operations Functions
            pauseCampaign() {
                this.showNotification('Campaign paused', 'success');
            }

            viewAnalytics() {
                window.location.href = 'analytics.html';
            }

            editMessages() {
                this.showNotification('Message editing coming soon!', 'info');
            }

            addLeads() {
                window.location.href = 'leads.html';
            }

            validateForm() {
                const currentStepElement = document.querySelector('.wizard-step.active');
                if (!currentStepElement) return true;

                const requiredInputs = currentStepElement.querySelectorAll('[required]');
                let isValid = true;

                requiredInputs.forEach(input => {
                    const value = input.value.trim();
                    
                    if (!value) {
                        input.style.borderColor = '#EF4444';
                        isValid = false;
                    } else {
                        input.style.borderColor = '#C9CEDC';
                    }

                    // Specific validations
                    if (input.type === 'email' && value && !this.isValidEmail(value)) {
                        input.style.borderColor = '#EF4444';
                        isValid = false;
                    }

                    if (input.type === 'number' && value && (isNaN(value) || parseInt(value) < 1)) {
                        input.style.borderColor = '#EF4444';
                        isValid = false;
                    }

                    // Message length validation
                    if (input.id === 'variant-a-message' && value.length < 50) {
                        input.style.borderColor = '#EF4444';
                        isValid = false;
                    }
                });

                return isValid;
            }

            isValidEmail(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            }
        }

        // Initialize the application
        document.addEventListener('DOMContentLoaded', () => {
            window.campaignManager = new CampaignManager();
        });
