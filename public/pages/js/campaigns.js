// ==========================================
// CAMPAIGNS.JS - Campaign Management System
// Depends on: shared-core.js (must be loaded first)
// ==========================================

class OsliraCampaigns {
    constructor() {
        this.selectedCampaign = null;
        this.campaigns = [];
        this.currentStep = 1;
        this.campaignData = {};
        this.userProfile = null;
        this.realTimeSubscription = null;
        this.liveMetricsInterval = null;
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.searchTerm = '';
        this.activeFilters = new Set(['all']);
    }

    // =============================================================================
    // EXPORT AND UTILITIES
    // =============================================================================

    async exportCampaigns() {
        try {
            const campaigns = this.campaigns;
            if (campaigns.length === 0) {
                window.OsliraApp.showMessage('No campaigns to export', 'error');
                return;
            }
            
            const csvContent = this.generateCampaignsCSV(campaigns);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `campaigns_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            window.OsliraApp.showMessage(`Exported ${campaigns.length} campaigns successfully`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            window.OsliraApp.showMessage('Export failed: ' + error.message, 'error');
        }
    }

    generateCampaignsCSV(campaigns) {
        const headers = [
            'Name', 'Status', 'Objective', 'Outreach Mode', 'Target Count',
            'Messages Sent', 'Responses', 'Conversions', 'Response Rate',
            'Created Date', 'Updated Date'
        ];
        
        const rows = campaigns.map(campaign => [
            campaign.name,
            campaign.status,
            campaign.objective,
            campaign.outreach_mode,
            campaign.target_lead_count || 0,
            campaign.messages_sent || 0,
            campaign.responses_received || 0,
            campaign.conversions || 0,
            this.calculateResponseRate(campaign).toFixed(1) + '%',
            new Date(campaign.created_at).toLocaleDateString(),
            new Date(campaign.updated_at).toLocaleDateString()
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    selectCampaign(campaignId) {
        document.querySelectorAll('.campaign-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const selectedCard = document.querySelector(`[data-campaign-id="${campaignId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            this.selectedCampaign = campaignId;
            this.loadCampaignDetails(campaignId);
        }
    }

    async loadCampaignDetails(campaignId) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        const detailsPanel = document.getElementById('campaign-details-panel');
        if (detailsPanel) {
            detailsPanel.innerHTML = this.renderCampaignDetails(campaign);
        }
    }

    renderCampaignDetails(campaign) {
        const responseRate = this.calculateResponseRate(campaign);
        
        return `
            <div class="campaign-details-content">
                <div class="campaign-details-header">
                    <h3>${campaign.name}</h3>
                    <div class="campaign-actions">
                        <button class="action-btn" onclick="campaigns.${campaign.status === 'live' ? 'pauseCampaign' : 'resumeCampaign'}('${campaign.id}')">
                            ${campaign.status === 'live' ? '⏸️ Pause' : '▶️ Resume'}
                        </button>
                        <button class="action-btn" onclick="campaigns.cloneCampaign('${campaign.id}')">
                            📋 Clone
                        </button>
                        <button class="action-btn danger" onclick="campaigns.stopCampaign('${campaign.id}')">
                            🛑 Stop
                        </button>
                    </div>
                </div>
                
                <div class="campaign-metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${campaign.messages_sent || 0}</div>
                        <div class="metric-label">Messages Sent</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${campaign.responses_received || 0}</div>
                        <div class="metric-label">Responses</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${responseRate.toFixed(1)}%</div>
                        <div class="metric-label">Response Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${campaign.conversions || 0}</div>
                        <div class="metric-label">Conversions</div>
                    </div>
                </div>
                
                <div class="campaign-info">
                    <div class="info-row">
                        <span class="info-label">Objective:</span>
                        <span class="info-value">${campaign.objective}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Platform:</span>
                        <span class="info-value">${campaign.outreach_mode}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Target Leads:</span>
                        <span class="info-value">${campaign.target_lead_count || 0}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Created:</span>
                        <span class="info-value">${window.OsliraApp.formatDateInUserTimezone(campaign.created_at)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    showUpgradeModal(reason, data) {
        const modal = document.createElement('div');
        modal.className = 'modal upgrade-modal';
        
        let content = '';
        
        switch (reason) {
            case 'campaign_limit':
                content = `
                    <h3>🚀 Upgrade Required</h3>
                    <p>You've reached your campaign limit (${data.current}/${data.limit})</p>
                    <p>Upgrade to create more campaigns and unlock advanced features:</p>
                    <ul>
                        <li>✅ More active campaigns</li>
                        <li>✅ Advanced A/B testing</li>
                        <li>✅ Priority support</li>
                        <li>✅ Advanced analytics</li>
                    </ul>
                `;
                break;
            default:
                content = `
                    <h3>🚀 Upgrade Your Plan</h3>
                    <p>Unlock more features and capabilities with a premium plan.</p>
                `;
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    ${content}
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                        Maybe Later
                    </button>
                    <button class="primary-btn" onclick="window.location.href='/subscription.html'">
                        🚀 Upgrade Now
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showCampaignMenu(campaignId, event) {
        event.stopPropagation();
        
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        const menu = document.createElement('div');
        menu.className = 'campaign-context-menu';
        menu.innerHTML = `
            <div class="menu-item" onclick="campaigns.selectCampaign('${campaignId}')">
                👁️ View Details
            </div>
            <div class="menu-item" onclick="campaigns.${campaign.status === 'live' ? 'pauseCampaign' : 'resumeCampaign'}('${campaignId}')">
                ${campaign.status === 'live' ? '⏸️ Pause' : '▶️ Resume'}
            </div>
            <div class="menu-item" onclick="campaigns.cloneCampaign('${campaignId}')">
                📋 Clone
            </div>
            <div class="menu-separator"></div>
            <div class="menu-item danger" onclick="campaigns.stopCampaign('${campaignId}')">
                🛑 Stop Campaign
            </div>
        `;
        
        // Position menu
        const rect = event.target.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left - 150}px`;
        menu.style.zIndex = '10000';
        
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    // =============================================================================
    // REAL-TIME UPDATES
    // =============================================================================

    startRealTimeUpdates() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user || !this.userCapabilities.hasRealTimeUpdates) {
            console.log('Real-time updates skipped');
            return;
        }
        
        this.realTimeSubscription = supabase
            .channel('campaigns_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'campaigns',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                this.handleRealTimeUpdate(payload);
            })
            .subscribe();

        this.liveMetricsInterval = setInterval(() => {
            if (this.selectedCampaign) {
                this.updateLiveMetrics();
            }
        }, 30000);
        
        console.log('✅ Real-time updates started');
    }

    handleRealTimeUpdate(payload) {
        console.log('📡 Real-time campaign update:', payload);
        
        if (payload.eventType === 'INSERT') {
            this.loadCampaigns();
            window.OsliraApp.showMessage('New campaign detected', 'info');
        } else if (payload.eventType === 'UPDATE') {
            this.updateCampaignInList(payload.new);
            if (payload.new.id === this.selectedCampaign) {
                this.loadCampaignDetails(this.selectedCampaign);
            }
        } else if (payload.eventType === 'DELETE') {
            this.removeCampaignFromList(payload.old.id);
            if (payload.old.id === this.selectedCampaign) {
                this.selectedCampaign = null;
            }
        }
    }

    updateCampaignInList(updatedCampaign) {
        const index = this.campaigns.findIndex(c => c.id === updatedCampaign.id);
        if (index !== -1) {
            this.campaigns[index] = { ...this.campaigns[index], ...updatedCampaign };
            this.applyFiltersAndSearch();
        }
    }

    removeCampaignFromList(campaignId) {
        this.campaigns = this.campaigns.filter(c => c.id !== campaignId);
        this.applyFiltersAndSearch();
    }

    updateLiveMetrics() {
        if (!this.selectedCampaign) return;
        
        const campaign = this.campaigns.find(c => c.id === this.selectedCampaign);
        if (!campaign) return;
        
        const metricsElements = {
            'live-messages-sent': campaign.messages_sent || 0,
            'live-responses': campaign.responses_received || 0,
            'live-response-rate': this.calculateResponseRate(campaign).toFixed(1) + '%',
            'live-conversions': campaign.conversions || 0
        };
        
        Object.entries(metricsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    stopRealTimeUpdates() {
        if (this.realTimeSubscription) {
            this.realTimeSubscription.unsubscribe();
            this.realTimeSubscription = null;
        }
        
        if (this.liveMetricsInterval) {
            clearInterval(this.liveMetricsInterval);
            this.liveMetricsInterval = null;
        }
    }

    // =============================================================================
    // KEYBOARD SHORTCUTS AND EVENT HANDLERS
    // =============================================================================

    handleKeyboardShortcuts(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showWizard();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isWizardActive()) {
            e.preventDefault();
            this.saveDraft();
        }
        
        if (e.key === 'Escape') {
            this.handleEscapeKey();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && this.isWizardActive()) {
            e.preventDefault();
            if (this.currentStep === 4) {
                this.launchCampaign();
            } else {
                this.nextStep();
            }
        }
    }

    handleEscapeKey() {
        if (this.isWizardActive()) {
            this.cancelWizard();
        } else {
            const openModal = document.querySelector('.modal[style*="flex"], .modal[style*="block"]');
            if (openModal) {
                openModal.style.display = 'none';
            }
        }
    }

    handleModalClick(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }

    isWizardActive() {
        return document.getElementById('wizard-view')?.classList.contains('active') || false;
    }

    // =============================================================================
    // CLEANUP AND FINALIZATION
    // =============================================================================

    refreshData() {
        window.OsliraApp.showLoadingOverlay('Refreshing data...');
        this.loadCampaignsData().finally(() => {
            window.OsliraApp.removeLoadingOverlay();
            window.OsliraApp.showMessage('Data refreshed successfully', 'success');
        });
    }

    destroy() {
        this.stopRealTimeUpdates();
        
        if (this.liveMetricsInterval) {
            clearInterval(this.liveMetricsInterval);
        }
        
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        localStorage.removeItem('campaign_draft');
        
        console.log('🧹 Campaigns instance cleaned up');
    }
}

// =============================================================================
// INITIALIZE CAMPAIGNS
// =============================================================================

// Create global campaigns instance
const campaigns = new OsliraCampaigns();

// Make campaigns available globally for onclick handlers
window.campaigns = campaigns;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    campaigns.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    campaigns.destroy();
});

console.log('📊 Campaigns module loaded - uses shared-core.js');
        this.userCapabilities = {};
    }

    async initialize() {
        try {
            console.log('🚀 Initializing campaigns...');
            
            // Wait for shared core initialization
            await window.OsliraApp.initialize();
            
            // Campaigns-specific setup
            await this.setupCampaigns();
            this.setupEventListeners();
            await this.loadCampaignsData();
            this.startRealTimeUpdates();
            this.initializeSearch();
            
            console.log('✅ Campaigns ready');
            
        } catch (error) {
            console.error('❌ Campaigns initialization failed:', error);
            window.OsliraApp.showMessage('Campaigns failed to load: ' + error.message, 'error');
        }
    }

    // =============================================================================
    // SETUP AND INITIALIZATION
    // =============================================================================

    async setupCampaigns() {
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
                .select('email, subscription_plan, subscription_status, credits, timezone, preferences')
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
            email: window.OsliraApp.user?.email || 'user@example.com',
            subscription_plan: 'free',
            subscription_status: 'active',
            credits: 10,
            timezone: window.OsliraApp.getUserTimezone(),
            preferences: {
                default_outreach_mode: 'Instagram DM',
                auto_pause_low_performance: true
            }
        };
    }

    updateUserInterface() {
        const profile = this.userProfile;
        
        // Update user email
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) userEmailEl.textContent = profile.email;
        
        // Update plan display
        const planNameEl = document.getElementById('plan-name');
        if (planNameEl) {
            const planFeatures = this.getPlanFeatures(profile.subscription_plan);
            planNameEl.innerHTML = `
                <div>${planFeatures.name}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                    ${planFeatures.campaigns} campaigns • ${planFeatures.leads} leads/month
                </div>
            `;
        }

        // Update credits display
        const creditsEl = document.getElementById('user-credits');
        if (creditsEl) {
            const creditsColor = profile.credits <= 5 ? 'var(--error)' : 
                                profile.credits <= 20 ? 'var(--warning)' : 'var(--success)';
            creditsEl.innerHTML = `
                <span style="color: ${creditsColor}; font-weight: 600;">${profile.credits}</span>
                <span style="font-size: 11px; color: var(--text-secondary);">credits</span>
            `;
        }
    }

    getPlanFeatures(plan) {
        const features = {
            free: { name: 'Free Plan', campaigns: 2, leads: 100 },
            starter: { name: 'Starter Plan', campaigns: 10, leads: 500 },
            growth: { name: 'Growth Plan', campaigns: 25, leads: 2000 },
            professional: { name: 'Professional Plan', campaigns: 100, leads: 10000 },
            enterprise: { name: 'Enterprise Plan', campaigns: 'Unlimited', leads: 'Unlimited' }
        };
        return features[plan] || features.free;
    }

    async setupBusinessSelector() {
        const businesses = window.OsliraApp.businesses;
        const businessSelects = document.querySelectorAll('#business-select, #campaign-business-id');
        
        businessSelects.forEach(select => {
            if (!select) return;
            
            select.innerHTML = '<option value="">Select business profile...</option>';
            businesses.forEach(business => {
                const option = new Option(business.business_name, business.id);
                select.add(option);
            });
            
            if (businesses.length > 0) {
                select.value = businesses[0].id;
                window.OsliraApp.business = businesses[0];
            }
        });
    }

    detectUserCapabilities() {
        const plan = this.userProfile.subscription_plan;
        const features = this.getPlanFeatures(plan);
        
        this.userCapabilities = {
            maxCampaigns: features.campaigns,
            maxLeadsPerMonth: features.leads,
            hasAdvancedFeatures: ['growth', 'professional', 'enterprise'].includes(plan),
            hasABTesting: ['professional', 'enterprise'].includes(plan),
            hasAdvancedAnalytics: ['professional', 'enterprise'].includes(plan),
            hasRealTimeUpdates: plan !== 'free'
        };
    }

    // =============================================================================
    // EVENT LISTENERS
    // =============================================================================

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('new-campaign-btn')?.addEventListener('click', () => this.showWizard());
        document.getElementById('bulk-import-btn')?.addEventListener('click', () => this.showBulkImport());
        document.getElementById('export-campaigns-btn')?.addEventListener('click', () => this.exportCampaigns());

        // Wizard navigation
        document.getElementById('step-1-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('step-2-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('step-2-back')?.addEventListener('click', () => this.prevStep());
        document.getElementById('step-3-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('step-3-back')?.addEventListener('click', () => this.prevStep());
        document.getElementById('step-4-back')?.addEventListener('click', () => this.prevStep());
        document.getElementById('launch-campaign-btn')?.addEventListener('click', () => this.launchCampaign());
        document.getElementById('save-draft-btn')?.addEventListener('click', () => this.saveDraft());
        document.getElementById('cancel-wizard-btn')?.addEventListener('click', () => this.cancelWizard());

        // Search and filters
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => this.toggleFilter(e.target.dataset.filter));
        });
        
        document.getElementById('campaign-search')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('clear-search-btn')?.addEventListener('click', () => this.clearSearch());

        // Campaign cards
        document.addEventListener('click', (e) => {
            if (e.target.closest('.campaign-card')) {
                this.selectCampaign(e.target.closest('.campaign-card').dataset.campaignId);
            }
        });

        // Bulk operations
        document.getElementById('select-all-campaigns')?.addEventListener('click', () => this.selectAllCampaigns());
        document.getElementById('bulk-delete-campaigns')?.addEventListener('click', () => this.bulkDeleteCampaigns());
        document.getElementById('bulk-pause-campaigns')?.addEventListener('click', () => this.bulkPauseCampaigns());
        document.getElementById('bulk-resume-campaigns')?.addEventListener('click', () => this.bulkResumeCampaigns());

        // Campaign operations
        document.getElementById('pause-campaign-btn')?.addEventListener('click', () => this.pauseCampaign());
        document.getElementById('resume-campaign-btn')?.addEventListener('click', () => this.resumeCampaign());
        document.getElementById('stop-campaign-btn')?.addEventListener('click', () => this.stopCampaign());
        document.getElementById('clone-campaign-btn')?.addEventListener('click', () => this.cloneCampaign());

        // Form validation
        this.setupFormValidation();
        this.setupDynamicFormUpdates();

        // Pagination
        document.getElementById('prev-page-btn')?.addEventListener('click', () => this.previousPage());
        document.getElementById('next-page-btn')?.addEventListener('click', () => this.nextPage());
        document.getElementById('page-size-select')?.addEventListener('change', (e) => this.changePageSize(e.target.value));

        // Global handlers
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        document.addEventListener('click', (e) => this.handleModalClick(e));
    }

    setupFormValidation() {
        const inputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateField(input));
            input.addEventListener('blur', () => this.validateField(input));
        });
    }

    setupDynamicFormUpdates() {
        // Campaign objective changes
        document.getElementById('campaign-objective')?.addEventListener('change', () => {
            this.updateOutreachModeOptions();
            this.updateTargetingRecommendations();
        });

        // Target count changes
        document.getElementById('target-count')?.addEventListener('input', (e) => {
            this.updateCreditEstimate(e.target.value);
        });

        // Message content changes
        document.querySelectorAll('[id^="variant-"][id$="-message"]').forEach(textarea => {
            textarea.addEventListener('input', () => {
                this.updateCharacterCount(textarea.id);
                this.updateMessageAnalysis(textarea.id);
            });
        });
    }

    // =============================================================================
    // DATA LOADING
    // =============================================================================

    async loadCampaignsData() {
        window.OsliraApp.showLoadingOverlay('Loading campaigns...');
        
        try {
            await Promise.all([
                this.loadCampaigns(),
                this.loadUserStats()
            ]);
        } finally {
            window.OsliraApp.removeLoadingOverlay();
        }
    }

    async loadCampaigns() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.campaigns = [];
            this.applyFiltersAndSearch();
            return;
        }
        
        try {
            const { data: campaigns, error } = await supabase
                .from('campaigns')
                .select(`
                    id, name, status, objective, outreach_mode, 
                    target_lead_count, messages_sent, responses_received, conversions,
                    created_at, updated_at, scheduled_start, scheduled_end,
                    budget_limit, current_spend, priority, tags
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.campaigns = campaigns || [];
            this.applyFiltersAndSearch();
            
        } catch (error) {
            console.error('Error loading campaigns:', error);
            this.campaigns = [];
            this.applyFiltersAndSearch();
            window.OsliraApp.showMessage('Error loading campaigns: ' + error.message, 'error');
        }
    }

    async loadUserStats() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) return;
        
        try {
            const { count: totalCampaigns } = await supabase
                .from('campaigns')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id);

            const { count: activeCampaigns } = await supabase
                .from('campaigns')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .eq('status', 'live');

            this.updateStatsDisplay(totalCampaigns || 0, activeCampaigns || 0);
            
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    updateStatsDisplay(total, active) {
        const totalEl = document.getElementById('total-campaigns');
        const activeEl = document.getElementById('active-campaigns');
        
        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
    }

    // =============================================================================
    // SEARCH AND FILTERING
    // =============================================================================

    initializeSearch() {
        const searchInput = document.getElementById('campaign-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.trim();
        this.currentPage = 1;
        this.applyFiltersAndSearch();
        
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) {
            clearBtn.style.display = this.searchTerm ? 'block' : 'none';
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('campaign-search');
        if (searchInput) searchInput.value = '';
        
        this.searchTerm = '';
        this.applyFiltersAndSearch();
        
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) clearBtn.style.display = 'none';
    }

    toggleFilter(filter) {
        if (filter === 'all') {
            this.activeFilters.clear();
            this.activeFilters.add('all');
        } else {
            this.activeFilters.delete('all');
            if (this.activeFilters.has(filter)) {
                this.activeFilters.delete(filter);
            } else {
                this.activeFilters.add(filter);
            }
            
            if (this.activeFilters.size === 0) {
                this.activeFilters.add('all');
            }
        }
        
        this.currentPage = 1;
        this.applyFiltersAndSearch();
    }

    applyFiltersAndSearch() {
        let filteredCampaigns = [...this.campaigns];
        
        // Apply search filter
        if (this.searchTerm) {
            filteredCampaigns = filteredCampaigns.filter(campaign =>
                campaign.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                campaign.objective.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                campaign.outreach_mode.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (campaign.tags && campaign.tags.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase())))
            );
        }
        
        // Apply status filters
        if (!this.activeFilters.has('all')) {
            filteredCampaigns = filteredCampaigns.filter(campaign =>
                this.activeFilters.has(campaign.status) ||
                this.activeFilters.has(campaign.objective.toLowerCase()) ||
                this.activeFilters.has(campaign.priority)
            );
        }
        
        // Apply sorting
        this.sortCampaigns(filteredCampaigns);
        
        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + this.itemsPerPage);
        
        this.renderCampaigns(paginatedCampaigns);
        this.updatePagination(filteredCampaigns.length);
        this.updateFiltersUI();
    }

    sortCampaigns(campaigns) {
        campaigns.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority] || 1;
            const bPriority = priorityOrder[b.priority] || 1;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            return new Date(b.updated_at) - new Date(a.updated_at);
        });
    }

    updateFiltersUI() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            const filter = chip.dataset.filter;
            if (this.activeFilters.has(filter)) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    // =============================================================================
    // CAMPAIGN RENDERING
    // =============================================================================

    renderCampaigns(campaigns) {
        const container = document.getElementById('campaigns-container');
        if (!container) return;

        if (campaigns.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = campaigns.map(campaign => this.renderCampaignCard(campaign)).join('');
        this.attachCampaignCardEvents();
    }

    renderEmptyState() {
        const hasFilters = this.searchTerm || this.activeFilters.size > 1;
        
        if (hasFilters) {
            return `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <h3 style="margin-bottom: 8px;">No campaigns found</h3>
                    <p style="margin-bottom: 24px;">Try adjusting your search or filters</p>
                    <button onclick="campaigns.clearAllFilters()" class="secondary-btn">
                        Clear Filters
                    </button>
                </div>
            `;
        } else {
            return `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
                    <h3 style="margin-bottom: 8px;">No campaigns yet</h3>
                    <p style="margin-bottom: 24px;">Create your first campaign to get started with AI-powered outreach</p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="campaigns.showWizard()" class="primary-btn">
                            🚀 Create Campaign
                        </button>
                        <button onclick="campaigns.showBulkImport()" class="secondary-btn">
                            📤 Import CSV
                        </button>
                    </div>
                </div>
            `;
        }
    }

    renderCampaignCard(campaign) {
        const responseRate = this.calculateResponseRate(campaign);
        const progress = this.calculateProgress(campaign);
        const statusColor = this.getStatusColor(campaign.status);
        const priorityIcon = this.getPriorityIcon(campaign.priority);
        
        return `
            <div class="campaign-card ${campaign.id === this.selectedCampaign ? 'active' : ''}" 
                 data-campaign-id="${campaign.id}">
                <div class="campaign-header">
                    <div class="campaign-title-section">
                        <div class="campaign-name">${campaign.name}</div>
                        <div class="campaign-meta">
                            <span class="campaign-objective">${campaign.objective}</span>
                            <span class="campaign-separator">•</span>
                            <span class="campaign-mode">${campaign.outreach_mode}</span>
                            ${priorityIcon ? `<span class="priority-icon">${priorityIcon}</span>` : ''}
                        </div>
                    </div>
                    <div class="campaign-actions">
                        <span class="campaign-status status-${campaign.status}" style="background-color: ${statusColor}">
                            ${campaign.status}
                        </span>
                        <div class="campaign-menu">
                            <button class="menu-btn" onclick="campaigns.showCampaignMenu('${campaign.id}', event)">⋮</button>
                        </div>
                    </div>
                </div>
                
                <div class="campaign-metrics">
                    <div class="metric-item">
                        <div class="metric-value">${campaign.target_lead_count || 0}</div>
                        <div class="metric-label">Target</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${campaign.messages_sent || 0}</div>
                        <div class="metric-label">Sent</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${campaign.responses_received || 0}</div>
                        <div class="metric-label">Responses</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${responseRate.toFixed(1)}%</div>
                        <div class="metric-label">Response Rate</div>
                    </div>
                </div>
                
                <div class="campaign-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>${progress.toFixed(1)}% complete</span>
                        <span>${this.getTimeRemaining(campaign)}</span>
                    </div>
                </div>
                
                ${campaign.tags ? `
                    <div class="campaign-tags">
                        ${campaign.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="campaign-footer">
                    <span class="campaign-date">
                        Updated ${window.OsliraApp.formatDateInUserTimezone(campaign.updated_at, { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>
            </div>
        `;
    }

    attachCampaignCardEvents() {
        document.querySelectorAll('.campaign-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.campaign-menu') && !e.target.closest('.menu-btn')) {
                    this.selectCampaign(card.dataset.campaignId);
                }
            });
        });
    }

    calculateResponseRate(campaign) {
        if (!campaign.messages_sent || campaign.messages_sent === 0) return 0;
        return (campaign.responses_received / campaign.messages_sent) * 100;
    }

    calculateProgress(campaign) {
        if (!campaign.target_lead_count || campaign.target_lead_count === 0) return 0;
        return Math.min(100, (campaign.messages_sent / campaign.target_lead_count) * 100);
    }

    getStatusColor(status) {
        const colors = {
            live: '#10B981',
            draft: '#6B7280',
            paused: '#F59E0B',
            completed: '#3B82F6',
            stopped: '#EF4444'
        };
        return colors[status] || '#6B7280';
    }

    getPriorityIcon(priority) {
        const icons = {
            high: '🔥',
            medium: '⚡',
            low: '📋'
        };
        return icons[priority] || '';
    }

    getTimeRemaining(campaign) {
        if (campaign.scheduled_end) {
            const endDate = new Date(campaign.scheduled_end);
            const now = new Date();
            const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
                return `${diffDays} days left`;
            } else if (diffDays === 0) {
                return 'Ends today';
            } else {
                return 'Overdue';
            }
        }
        
        return '';
    }

    // =============================================================================
    // CAMPAIGN WIZARD
    // =============================================================================

    showWizard() {
        if (!this.checkCampaignLimits()) return;
        
        document.getElementById('overview-view')?.classList.remove('active');
        document.getElementById('wizard-view')?.classList.add('active');
        this.resetWizard();
    }

    checkCampaignLimits() {
        const features = this.getPlanFeatures(this.userProfile.subscription_plan);
        const activeCampaigns = this.campaigns.filter(c => ['live', 'paused'].includes(c.status)).length;
        
        if (features.campaigns !== 'Unlimited' && activeCampaigns >= features.campaigns) {
            this.showUpgradeModal('campaign_limit', {
                current: activeCampaigns,
                limit: features.campaigns
            });
            return false;
        }
        
        return true;
    }

    resetWizard() {
        this.currentStep = 1;
        this.campaignData = {
            message_variants: [
                { name: 'Variant A', is_control: true },
                { name: 'Variant B', is_control: false }
            ]
        };
        this.updateWizardStep();
        this.clearFormFields();
        this.initializeFormDefaults();
    }

    clearFormFields() {
        document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
            input.value = '';
            input.classList.remove('error', 'valid');
        });
    }

    initializeFormDefaults() {
        const preferences = this.userProfile.preferences || {};
        
        if (preferences.default_outreach_mode) {
            const outreachModeEl = document.getElementById('outreach-mode');
            if (outreachModeEl) outreachModeEl.value = preferences.default_outreach_mode;
        }
        
        if (window.OsliraApp.business) {
            const businessEl = document.getElementById('campaign-business-id');
            if (businessEl) businessEl.value = window.OsliraApp.business.id;
        }
        
        const features = this.getPlanFeatures(this.userProfile.subscription_plan);
        const targetCountEl = document.getElementById('target-count');
        if (targetCountEl) {
            const defaultTarget = Math.min(100, features.leads / 10);
            targetCountEl.value = defaultTarget;
        }
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveStepData();
            this.currentStep++;
            this.updateWizardStep();
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
        const currentStepEl = document.getElementById(`wizard-step-${this.currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
            const firstInput = currentStepEl.querySelector('.form-input, .form-select, .form-textarea');
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        }
        
        this.updateWizardProgress();
        this.updateWizardNavigation();
        this.loadStepContent();
    }

    updateWizardProgress() {
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
        
        const progressEl = document.getElementById('wizard-progress-bar');
        if (progressEl) {
            const percentage = ((this.currentStep - 1) / 3) * 100;
            progressEl.style.width = `${percentage}%`;
        }
    }

    updateWizardNavigation() {
        const backBtn = document.getElementById(`step-${this.currentStep}-back`);
        const nextBtn = document.getElementById(`step-${this.currentStep}-next`);
        const launchBtn = document.getElementById('launch-campaign-btn');
        const saveBtn = document.getElementById('save-draft-btn');
        
        if (backBtn) backBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
        
        if (this.currentStep === 4) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (launchBtn) launchBtn.style.display = 'block';
            if (saveBtn) saveBtn.style.display = 'block';
        } else {
            if (nextBtn) nextBtn.style.display = 'block';
            if (launchBtn) launchBtn.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'block';
        }
    }

    loadStepContent() {
        switch (this.currentStep) {
            case 1:
                this.loadCampaignObjectives();
                this.loadOutreachModes();
                break;
            case 2:
                this.updateTargetingRecommendations();
                break;
            case 3:
                this.updateMessageVariants();
                break;
            case 4:
                this.updateCampaignSummary();
                break;
        }
    }

    validateCurrentStep() {
        const step = this.currentStep;
        let isValid = true;
        let errors = [];

        switch (step) {
            case 1:
                const requiredFields = ['campaign-name', 'campaign-objective', 'outreach-mode'];
                requiredFields.forEach(field => {
                    const element = document.getElementById(field);
                    if (!element || !element.value.trim()) {
                        isValid = false;
                        errors.push(`${field.replace('-', ' ')} is required`);
                        element?.classList.add('error');
                    } else {
                        element?.classList.remove('error');
                        element?.classList.add('valid');
                    }
                });
                
                const nameEl = document.getElementById('campaign-name');
                if (nameEl && nameEl.value.trim()) {
                    const isDuplicate = this.campaigns.some(c => 
                        c.name.toLowerCase() === nameEl.value.trim().toLowerCase()
                    );
                    if (isDuplicate) {
                        isValid = false;
                        errors.push('Campaign name already exists');
                        nameEl.classList.add('error');
                    }
                }
                break;
                
            case 2:
                const targetCount = document.getElementById('target-count');
                const icpCriteria = document.getElementById('icp-criteria');
                
                if (!targetCount?.value || parseInt(targetCount.value) < 1) {
                    isValid = false;
                    errors.push('Target count must be at least 1');
                    targetCount?.classList.add('error');
                } else if (parseInt(targetCount.value) > 10000) {
                    isValid = false;
                    errors.push('Target count cannot exceed 10,000');
                    targetCount?.classList.add('error');
                } else {
                    targetCount?.classList.remove('error');
                    targetCount?.classList.add('valid');
                }
                
                if (!icpCriteria?.value.trim()) {
                    isValid = false;
                    errors.push('ICP criteria is required');
                    icpCriteria?.classList.add('error');
                } else {
                    icpCriteria?.classList.remove('error');
                    icpCriteria?.classList.add('valid');
                }
                
                const creditRequired = this.calculateCreditRequirement();
                if (creditRequired > this.userProfile.credits) {
                    isValid = false;
                    errors.push(`Insufficient credits. Need ${creditRequired}, have ${this.userProfile.credits}`);
                }
                break;
                
            case 3:
                const variantA = document.getElementById('variant-a-message');
                
                if (!variantA?.value.trim() || variantA.value.trim().length < 50) {
                    isValid = false;
                    errors.push('Variant A message must be at least 50 characters');
                    variantA?.classList.add('error');
                } else {
                    variantA?.classList.remove('error');
                    variantA?.classList.add('valid');
                }
                break;
                
            case 4:
                isValid = this.validateAllSteps();
                break;
        }

        if (!isValid) {
            this.showValidationErrors(errors);
        } else {
            this.clearValidationErrors();
        }

        return isValid;
    }

    showValidationErrors(errors) {
        const errorContainer = document.getElementById('validation-errors');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="validation-error-list">
                    ${errors.map(error => `<div class="error-item">⚠️ ${error}</div>`).join('')}
                </div>
            `;
            errorContainer.style.display = 'block';
        } else {
            window.OsliraApp.showMessage(errors[0], 'error');
        }
    }

    clearValidationErrors() {
        const errorContainer = document.getElementById('validation-errors');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }

    validateAllSteps() {
        return this.campaignData.name && 
               this.campaignData.objective && 
               this.campaignData.outreach_mode &&
               this.campaignData.target_lead_count > 0 &&
               this.campaignData.icp_criteria &&
               this.campaignData.message_variants?.length > 0;
    }

    saveStepData() {
        switch (this.currentStep) {
            case 1:
                this.campaignData = {
                    ...this.campaignData,
                    name: document.getElementById('campaign-name')?.value.trim(),
                    objective: document.getElementById('campaign-objective')?.value,
                    outreach_mode: document.getElementById('outreach-mode')?.value,
                    business_id: document.getElementById('campaign-business-id')?.value,
                    priority: document.getElementById('campaign-priority')?.value || 'medium',
                    tags: this.parseTagsInput(document.getElementById('campaign-tags')?.value)
                };
                break;
                
            case 2:
                this.campaignData = {
                    ...this.campaignData,
                    target_lead_count: parseInt(document.getElementById('target-count')?.value),
                    icp_criteria: document.getElementById('icp-criteria')?.value.trim(),
                    exclusion_rules: document.getElementById('exclusion-rules')?.value.trim(),
                    lead_source: document.getElementById('lead-source')?.value,
                    daily_limit: parseInt(document.getElementById('daily-limit')?.value) || null
                };
                break;
                
            case 3:
                this.campaignData = {
                    ...this.campaignData,
                    message_variants: this.collectMessageVariants()
                };
                break;
        }

        this.updateSummary();
        this.saveDraftToStorage();
    }

    parseTagsInput(tagsInput) {
        if (!tagsInput) return [];
        return tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    collectMessageVariants() {
        const variants = [];
        
        const variantAMessage = document.getElementById('variant-a-message')?.value.trim();
        if (variantAMessage) {
            variants.push({
                name: 'Variant A',
                content: variantAMessage,
                hook_style: document.getElementById('variant-a-hook')?.value,
                cta_type: document.getElementById('variant-a-cta')?.value,
                tone: document.getElementById('variant-a-tone')?.value,
                is_control: true,
                weight: 50
            });
        }
        
        const variantBMessage = document.getElementById('variant-b-message')?.value.trim();
        if (variantBMessage) {
            variants.push({
                name: 'Variant B',
                content: variantBMessage,
                hook_style: document.getElementById('variant-b-hook')?.value,
                cta_type: document.getElementById('variant-b-cta')?.value,
                tone: document.getElementById('variant-b-tone')?.value,
                is_control: false,
                weight: 50
            });
        }
        
        return variants;
    }

    updateSummary() {
        if (this.currentStep === 4) {
            const summaryElements = {
                'summary-name': this.campaignData.name || '--',
                'summary-objective': this.campaignData.objective || '--',
                'summary-mode': this.campaignData.outreach_mode || '--',
                'summary-leads': this.campaignData.target_lead_count || '--',
                'summary-variants': this.campaignData.message_variants?.length || 0,
                'summary-credits': this.calculateCreditRequirement()
            };
            
            Object.entries(summaryElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });
        }
    }

    calculateCreditRequirement() {
        const targetCount = this.campaignData.target_lead_count || 0;
        const creditsPerLead = this.getCreditsPerLead();
        return targetCount * creditsPerLead;
    }

    getCreditsPerLead() {
        const baseCredits = {
            'Instagram DM': 2,
            'Email': 1,
            'LinkedIn Message': 3,
            'Twitter DM': 1
        };
        
        const mode = this.campaignData.outreach_mode || 'Instagram DM';
        return baseCredits[mode] || 2;
    }

    saveDraftToStorage() {
        try {
            localStorage.setItem('campaign_draft', JSON.stringify({
                ...this.campaignData,
                lastSaved: new Date().toISOString(),
                currentStep: this.currentStep
            }));
        } catch (error) {
            console.warn('Failed to save draft to localStorage:', error);
        }
    }

    // =============================================================================
    // FORM HELPERS
    // =============================================================================

    loadCampaignObjectives() {
        const objectives = [
            { value: 'Lead Generation', label: 'Lead Generation' },
            { value: 'Brand Awareness', label: 'Brand Awareness' },
            { value: 'Sales', label: 'Direct Sales' },
            { value: 'Partnership', label: 'Partnerships' },
            { value: 'Content Promotion', label: 'Content Promotion' }
        ];
        
        const select = document.getElementById('campaign-objective');
        if (select && select.children.length <= 1) {
            objectives.forEach(obj => {
                const option = new Option(obj.label, obj.value);
                select.add(option);
            });
        }
    }

    loadOutreachModes() {
        const modes = [
            { value: 'Instagram DM', label: 'Instagram DM (2 credits)' },
            { value: 'Email', label: 'Email (1 credit)' },
            { value: 'LinkedIn Message', label: 'LinkedIn Message (3 credits)' },
            { value: 'Twitter DM', label: 'Twitter DM (1 credit)' }
        ];
        
        const select = document.getElementById('outreach-mode');
        if (select && select.children.length <= 1) {
            modes.forEach(mode => {
                const option = new Option(mode.label, mode.value);
                select.add(option);
            });
        }
    }

    updateOutreachModeOptions() {
        const objective = document.getElementById('campaign-objective')?.value;
        const modeSelect = document.getElementById('outreach-mode');
        
        if (!objective || !modeSelect) return;
        
        const recommendations = {
            'Lead Generation': ['Email', 'LinkedIn Message', 'Instagram DM'],
            'Brand Awareness': ['Instagram DM', 'Twitter DM', 'Email'],
            'Sales': ['Email', 'LinkedIn Message', 'Instagram DM'],
            'Partnership': ['LinkedIn Message', 'Email'],
            'Content Promotion': ['Twitter DM', 'Instagram DM', 'Email']
        };
        
        const recommended = recommendations[objective] || [];
        
        Array.from(modeSelect.options).forEach(option => {
            if (recommended.includes(option.value)) {
                option.style.fontWeight = 'bold';
                if (!option.textContent.includes('⭐')) {
                    option.textContent = `⭐ ${option.textContent}`;
                }
            }
        });
    }

    updateTargetingRecommendations() {
        const objective = document.getElementById('campaign-objective')?.value;
        const recommendationsEl = document.getElementById('targeting-recommendations');
        
        if (!recommendationsEl) return;
        
        const recommendations = {
            'Lead Generation': 'Focus on decision-makers and influencers in your target industry. Recommend 50-200 highly qualified leads over 500-1000 broader leads.',
            'Brand Awareness': 'Cast a wider net with industry professionals and potential customers. Higher volume (500-2000 leads) with broader criteria works well.',
            'Sales': 'Target prospects showing buying intent signals. Focus on company size, role seniority, and recent activity. 100-500 leads recommended.',
            'Partnership': 'Target specific companies and key decision-makers. Lower volume (20-100 leads) with very specific criteria.',
            'Content Promotion': 'Target industry thought leaders, content creators, and engaged professionals. Medium volume (200-800 leads).'
        };
        
        if (objective && recommendations[objective]) {
            recommendationsEl.innerHTML = `
                <div class="recommendation-box">
                    <h5>💡 Targeting Recommendation for ${objective}:</h5>
                    <p>${recommendations[objective]}</p>
                </div>
            `;
        }
    }

    updateMessageVariants() {
        // Initialize message variant controls if needed
        const variantAContainer = document.getElementById('variant-a-container');
        const variantBContainer = document.getElementById('variant-b-container');
        
        if (variantAContainer && !variantAContainer.querySelector('textarea')) {
            this.initializeVariantContainer('a');
        }
        
        if (variantBContainer && !variantBContainer.querySelector('textarea')) {
            this.initializeVariantContainer('b');
        }
    }

    initializeVariantContainer(variant) {
        const container = document.getElementById(`variant-${variant}-container`);
        if (!container) return;
        
        container.innerHTML = `
            <div class="variant-section">
                <h4>Variant ${variant.toUpperCase()}</h4>
                <div class="form-group">
                    <label for="variant-${variant}-message">Message Content *</label>
                    <textarea id="variant-${variant}-message" 
                              class="form-textarea" 
                              rows="6" 
                              placeholder="Write your outreach message..."></textarea>
                    <div class="character-count" id="variant-${variant}-char-count">0 characters</div>
                </div>
                
                <div class="variant-settings">
                    <div class="form-group">
                        <label for="variant-${variant}-hook">Hook Style</label>
                        <select id="variant-${variant}-hook" class="form-select">
                            <option value="">Select hook style...</option>
                            <option value="question">Question Hook</option>
                            <option value="compliment">Compliment Hook</option>
                            <option value="curiosity">Curiosity Hook</option>
                            <option value="problem">Problem Hook</option>
                            <option value="social_proof">Social Proof Hook</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="variant-${variant}-cta">Call to Action</label>
                        <select id="variant-${variant}-cta" class="form-select">
                            <option value="">Select CTA type...</option>
                            <option value="meeting">Schedule Meeting</option>
                            <option value="demo">Request Demo</option>
                            <option value="content">Download Content</option>
                            <option value="response">General Response</option>
                            <option value="link">Visit Link</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="variant-${variant}-tone">Tone</label>
                        <select id="variant-${variant}-tone" class="form-select">
                            <option value="">Select tone...</option>
                            <option value="professional">Professional</option>
                            <option value="casual">Casual</option>
                            <option value="friendly">Friendly</option>
                            <option value="formal">Formal</option>
                            <option value="direct">Direct</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        // Attach event listeners
        const messageField = document.getElementById(`variant-${variant}-message`);
        if (messageField) {
            messageField.addEventListener('input', () => {
                this.updateCharacterCount(`variant-${variant}-message`);
                this.updateMessageAnalysis(`variant-${variant}-message`);
            });
        }
    }

    updateCharacterCount(fieldId) {
        const field = document.getElementById(fieldId);
        const countElement = document.getElementById(fieldId.replace('-message', '-char-count'));
        
        if (field && countElement) {
            const count = field.value.length;
            countElement.textContent = `${count} characters`;
            
            if (count < 50) {
                countElement.style.color = 'var(--error)';
            } else if (count > 500) {
                countElement.style.color = 'var(--warning)';
            } else {
                countElement.style.color = 'var(--success)';
            }
        }
    }

    updateMessageAnalysis(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const message = field.value.trim();
        if (!message) return;
        
        const score = this.analyzeMessageQuality(message);
        
        // Update field styling based on score
        field.classList.remove('score-low', 'score-medium', 'score-high');
        if (score >= 80) {
            field.classList.add('score-high');
        } else if (score >= 60) {
            field.classList.add('score-medium');
        } else {
            field.classList.add('score-low');
        }
    }

    analyzeMessageQuality(message) {
        let score = 50;
        
        // Length optimization
        if (message.length >= 100 && message.length <= 300) score += 15;
        else if (message.length < 50) score -= 20;
        else if (message.length > 500) score -= 10;
        
        // Structure analysis
        const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length >= 2 && sentences.length <= 4) score += 10;
        
        // Personalization tokens
        const personalTokens = this.countPersonalizationTokens(message);
        score += personalTokens * 5;
        
        // Question presence
        if (message.includes('?')) score += 10;
        
        return Math.min(100, Math.max(0, score));
    }

    countPersonalizationTokens(message) {
        const tokens = ['{name}', '{company}', '{title}', '{industry}', '{recent_post}'];
        return tokens.reduce((count, token) => count + (message.includes(token) ? 1 : 0), 0);
    }

    updateCreditEstimate(targetCount) {
        const estimateEl = document.getElementById('credit-estimate');
        if (!estimateEl) return;
        
        const count = parseInt(targetCount) || 0;
        const creditsPerLead = this.getCreditsPerLead();
        const totalCredits = count * creditsPerLead;
        const currentCredits = this.userProfile.credits || 0;
        
        const hasEnoughCredits = totalCredits <= currentCredits;
        const color = hasEnoughCredits ? 'var(--success)' : 'var(--error)';
        
        estimateEl.innerHTML = `
            <div class="credit-estimate-box" style="border-color: ${color}">
                <h5 style="color: ${color}">💳 Credit Estimate</h5>
                <div class="estimate-breakdown">
                    <div>Leads: ${count} × ${creditsPerLead} credits = <strong>${totalCredits} credits</strong></div>
                    <div>Available: <strong>${currentCredits} credits</strong></div>
                    <div style="color: ${color}">
                        ${hasEnoughCredits ? '✅ Sufficient credits' : `❌ Need ${totalCredits - currentCredits} more credits`}
                    </div>
                </div>
                ${!hasEnoughCredits ? `
                    <a href="/subscription.html" style="color: ${color}; font-weight: 600; text-decoration: none;">
                        🚀 Upgrade Plan →
                    </a>
                ` : ''}
            </div>
        `;
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldId = field.id;
        let isValid = true;
        let message = '';
        
        switch (fieldId) {
            case 'campaign-name':
                if (!value) {
                    isValid = false;
                    message = 'Campaign name is required';
                } else if (value.length < 3) {
                    isValid = false;
                    message = 'Campaign name must be at least 3 characters';
                } else if (this.campaigns.some(c => c.name.toLowerCase() === value.toLowerCase())) {
                    isValid = false;
                    message = 'Campaign name already exists';
                }
                break;
                
            case 'target-count':
                const count = parseInt(value);
                if (!value || count < 1) {
                    isValid = false;
                    message = 'Target count must be at least 1';
                } else if (count > 10000) {
                    isValid = false;
                    message = 'Target count cannot exceed 10,000';
                }
                break;
                
            case 'icp-criteria':
                if (!value) {
                    isValid = false;
                    message = 'ICP criteria is required';
                } else if (value.length < 20) {
                    isValid = false;
                    message = 'Please provide more detailed ICP criteria (minimum 20 characters)';
                }
                break;
                
            case 'variant-a-message':
            case 'variant-b-message':
                if (value && value.length < 50) {
                    isValid = false;
                    message = 'Message must be at least 50 characters';
                } else if (value.length > 1000) {
                    isValid = false;
                    message = 'Message is too long (maximum 1000 characters)';
                }
                break;
        }
        
        // Update field styling
        if (isValid) {
            field.classList.remove('error');
            field.classList.add('valid');
            this.clearFieldError(fieldId);
        } else {
            field.classList.remove('valid');
            field.classList.add('error');
            this.showFieldError(fieldId, message);
        }
        
        return isValid;
    }

    showFieldError(fieldId, message) {
        this.clearFieldError(fieldId);
        
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error-message';
        errorEl.id = `${fieldId}-error`;
        errorEl.textContent = message;
        
        field.parentNode.insertBefore(errorEl, field.nextSibling);
    }

    clearFieldError(fieldId) {
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (errorEl) errorEl.remove();
    }

    // =============================================================================
    // CAMPAIGN OPERATIONS
    // =============================================================================

    async launchCampaign() {
        if (!this.validateAllSteps()) {
            window.OsliraApp.showMessage('Please complete all required fields before launching', 'error');
            return;
        }
        
        const requiredCredits = this.calculateCreditRequirement();
        if (requiredCredits > this.userProfile.credits) {
            this.showInsufficientCreditsModal(requiredCredits);
            return;
        }
        
        if (!await this.confirmCampaignLaunch()) return;
        
        const launchBtn = document.getElementById('launch-campaign-btn');
        const originalText = launchBtn?.textContent || 'Launch Campaign';
        
        try {
            if (launchBtn) {
                launchBtn.disabled = true;
                launchBtn.textContent = '🚀 Launching...';
            }
            
            window.OsliraApp.showLoadingOverlay('Launching your campaign...');
            
            await this.processCampaignLaunch();
            
            window.OsliraApp.showMessage('Campaign launched successfully! 🎉', 'success');
            this.returnToOverview();
            await this.loadCampaigns();
            
        } catch (error) {
            console.error('Campaign launch error:', error);
            window.OsliraApp.showMessage('Failed to launch campaign: ' + error.message, 'error');
        } finally {
            window.OsliraApp.removeLoadingOverlay();
            if (launchBtn) {
                launchBtn.disabled = false;
                launchBtn.textContent = originalText;
            }
        }
    }

    async confirmCampaignLaunch() {
        return new Promise((resolve) => {
            const modal = this.createConfirmationModal({
                title: 'Launch Campaign',
                message: `
                    <div style="margin-bottom: 16px;">
                        <strong>Campaign:</strong> ${this.campaignData.name}<br>
                        <strong>Target Leads:</strong> ${this.campaignData.target_lead_count}<br>
                        <strong>Credits Required:</strong> ${this.calculateCreditRequirement()}<br>
                    </div>
                    <p>Are you ready to launch this campaign?</p>
                `,
                confirmText: '🚀 Launch Campaign',
                cancelText: 'Cancel',
                onConfirm: () => {
                    modal.remove();
                    resolve(true);
                },
                onCancel: () => {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }

    createConfirmationModal({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
        const modal = document.createElement('div');
        modal.className = 'modal confirmation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    ${message}
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn cancel-btn">${cancelText}</button>
                    <button class="primary-btn confirm-btn">${confirmText}</button>
                </div>
            </div>
        `;
        
        modal.querySelector('.cancel-btn').addEventListener('click', onCancel);
        modal.querySelector('.confirm-btn').addEventListener('click', onConfirm);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) onCancel();
        });
        
        document.body.appendChild(modal);
        return modal;
    }

    async processCampaignLaunch() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            throw new Error('Database connection not available');
        }
        
        try {
            const campaignData = {
                ...this.campaignData,
                status: 'live',
                user_id: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                current_spend: 0
            };

            const { data: campaign, error: campaignError } = await supabase
                .from('campaigns')
                .insert([campaignData])
                .select()
                .single();

            if (campaignError) throw campaignError;

            if (this.campaignData.message_variants?.length > 0) {
                const variants = this.campaignData.message_variants.map(variant => ({
                    ...variant,
                    campaign_id: campaign.id,
                    user_id: user.id,
                    created_at: new Date().toISOString()
                }));

                const { error: messageError } = await supabase
                    .from('campaign_messages')
                    .insert(variants);

                if (messageError) throw messageError;
            }

            await this.deductCredits(this.calculateCreditRequirement(), campaign.id);
            this.campaignData.id = campaign.id;
            
        } catch (error) {
            console.error('Database campaign launch error:', error);
            throw new Error('Failed to save campaign: ' + error.message);
        }
    }

    async deductCredits(amount, campaignId) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) return;
        
        try {
            const { error: transactionError } = await supabase
                .from('credit_transactions')
                .insert([{
                    user_id: user.id,
                    amount: -amount,
                    type: 'campaign_launch',
                    description: `Campaign launch: ${this.campaignData.name}`,
                    campaign_id: campaignId,
                    created_at: new Date().toISOString()
                }]);

            if (transactionError) throw transactionError;

            const newCredits = this.userProfile.credits - amount;
            const { error: updateError } = await supabase
                .from('users')
                .update({ credits: newCredits })
                .eq('id', user.id);

            if (updateError) throw updateError;

            this.userProfile.credits = newCredits;
            this.updateUserInterface();
            
        } catch (error) {
            console.error('Credit deduction error:', error);
            throw new Error('Failed to process credit transaction');
        }
    }

    showInsufficientCreditsModal(required) {
        const modal = this.createConfirmationModal({
            title: 'Insufficient Credits',
            message: `
                <div style="margin-bottom: 16px;">
                    <p>You need ${required} credits to launch this campaign.</p>
                    <p>Current balance: ${this.userProfile.credits} credits</p>
                    <p>Required: ${required} credits</p>
                    <p><strong>Shortfall: ${required - this.userProfile.credits} credits</strong></p>
                </div>
                <p>Would you like to upgrade your plan or reduce the campaign size?</p>
            `,
            confirmText: '🚀 Upgrade Plan',
            cancelText: 'Reduce Campaign Size',
            onConfirm: () => {
                modal.remove();
                window.location.href = '/subscription.html';
            },
            onCancel: () => {
                modal.remove();
                this.suggestCampaignReduction(required);
            }
        });
    }

    suggestCampaignReduction(required) {
        const available = this.userProfile.credits;
        const creditsPerLead = this.getCreditsPerLead();
        const maxLeads = Math.floor(available / creditsPerLead);
        
        const targetCountEl = document.getElementById('target-count');
        if (targetCountEl && maxLeads > 0) {
            targetCountEl.value = maxLeads;
            this.campaignData.target_lead_count = maxLeads;
            this.updateSummary();
            
            window.OsliraApp.showMessage(`Campaign size reduced to ${maxLeads} leads to fit your credit balance`, 'info');
        } else {
            window.OsliraApp.showMessage('Insufficient credits for any campaign size. Please upgrade your plan.', 'error');
        }
    }

    async saveDraft() {
        if (!this.campaignData.name) {
            window.OsliraApp.showMessage('Please enter a campaign name before saving', 'error');
            return;
        }
        
        const saveBtn = document.getElementById('save-draft-btn');
        const originalText = saveBtn?.textContent || 'Save Draft';
        
        try {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = '💾 Saving...';
            }
            
            this.saveStepData();
            
            const supabase = window.OsliraApp.supabase;
            const user = window.OsliraApp.user;
            
            if (!supabase || !user) {
                this.saveDraftToStorage();
                window.OsliraApp.showMessage('Draft saved locally!', 'success');
                return;
            }
            
            const draftData = {
                ...this.campaignData,
                status: 'draft',
                user_id: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (this.campaignData.id) {
                const { error } = await supabase
                    .from('campaigns')
                    .update(draftData)
                    .eq('id', this.campaignData.id);
                    
                if (error) throw error;
            } else {
                const { data: campaign, error } = await supabase
                    .from('campaigns')
                    .insert([draftData])
                    .select()
                    .single();
                    
                if (error) throw error;
                this.campaignData.id = campaign.id;
            }

            window.OsliraApp.showMessage('Draft saved successfully!', 'success');
            
        } catch (error) {
            console.error('Save draft error:', error);
            window.OsliraApp.showMessage('Failed to save draft: ' + error.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
    }

    cancelWizard() {
        const hasUnsavedChanges = this.checkUnsavedChanges();
        
        if (hasUnsavedChanges) {
            const modal = this.createConfirmationModal({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Do you want to save as draft before leaving?',
                confirmText: '💾 Save & Exit',
                cancelText: '🗑️ Discard Changes',
                onConfirm: async () => {
                    modal.remove();
                    await this.saveDraft();
                    this.returnToOverview();
                },
                onCancel: () => {
                    modal.remove();
                    this.returnToOverview();
                }
            });
        } else {
            this.returnToOverview();
        }
    }

    checkUnsavedChanges() {
        return this.campaignData.name || 
               this.campaignData.objective || 
               this.campaignData.target_lead_count ||
               (this.campaignData.message_variants && this.campaignData.message_variants.length > 0);
    }

    returnToOverview() {
        document.getElementById('wizard-view')?.classList.remove('active');
        document.getElementById('overview-view')?.classList.add('active');
        
        this.currentStep = 1;
        this.campaignData = {};
        this.clearFormFields();
        localStorage.removeItem('campaign_draft');
    }

    async pauseCampaign(campaignId = this.selectedCampaign) {
        if (!campaignId) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        try {
            await this.updateCampaignStatus(campaignId, 'paused', 'Campaign paused by user');
            window.OsliraApp.showMessage('Campaign paused successfully', 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Pause campaign error:', error);
            window.OsliraApp.showMessage('Failed to pause campaign', 'error');
        }
    }

    async resumeCampaign(campaignId = this.selectedCampaign) {
        if (!campaignId) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        try {
            await this.updateCampaignStatus(campaignId, 'live', 'Campaign resumed by user');
            window.OsliraApp.showMessage('Campaign resumed successfully', 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Resume campaign error:', error);
            window.OsliraApp.showMessage('Failed to resume campaign', 'error');
        }
    }

    async stopCampaign(campaignId = this.selectedCampaign) {
        if (!campaignId) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        const confirmed = await this.confirmAction(`
            <p>Are you sure you want to stop the campaign "${campaign.name}"?</p>
            <p><strong>This action cannot be undone.</strong></p>
        `, 'Stop Campaign', '🛑 Stop Campaign');
        
        if (!confirmed) return;
        
        try {
            await this.updateCampaignStatus(campaignId, 'stopped', 'Campaign stopped by user');
            window.OsliraApp.showMessage('Campaign stopped successfully', 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Stop campaign error:', error);
            window.OsliraApp.showMessage('Failed to stop campaign', 'error');
        }
    }

    async cloneCampaign(campaignId = this.selectedCampaign) {
        if (!campaignId) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        try {
            const fullCampaign = await this.loadFullCampaignData(campaignId);
            
            this.campaignData = {
                ...fullCampaign,
                name: `${fullCampaign.name} (Copy)`,
                status: 'draft',
                id: null,
                messages_sent: 0,
                responses_received: 0,
                conversions: 0
            };
            
            this.showWizard();
            this.populateWizardFromData();
            
            window.OsliraApp.showMessage('Campaign cloned successfully! Review and launch when ready.', 'success');
            
        } catch (error) {
            console.error('Clone campaign error:', error);
            window.OsliraApp.showMessage('Failed to clone campaign', 'error');
        }
    }

    async loadFullCampaignData(campaignId) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            return this.campaigns.find(c => c.id === campaignId) || {};
        }
        
        try {
            const { data: campaign, error } = await supabase
                .from('campaigns')
                .select(`
                    *,
                    campaign_messages(*)
                `)
                .eq('id', campaignId)
                .eq('user_id', user.id)
                .single();
                
            if (error) throw error;
            
            if (campaign.campaign_messages) {
                campaign.message_variants = campaign.campaign_messages;
            }
            
            return campaign;
            
        } catch (error) {
            console.error('Load full campaign data error:', error);
            throw error;
        }
    }

    populateWizardFromData() {
        const fieldMappings = {
            'campaign-name': 'name',
            'campaign-objective': 'objective',
            'outreach-mode': 'outreach_mode',
            'campaign-business-id': 'business_id',
            'campaign-priority': 'priority',
            'target-count': 'target_lead_count',
            'icp-criteria': 'icp_criteria',
            'exclusion-rules': 'exclusion_rules',
            'daily-limit': 'daily_limit'
        };
        
        Object.entries(fieldMappings).forEach(([fieldId, dataKey]) => {
            const field = document.getElementById(fieldId);
            const value = this.campaignData[dataKey];
            if (field && value !== undefined) {
                field.value = value;
            }
        });
        
        if (this.campaignData.message_variants) {
            this.campaignData.message_variants.forEach((variant, index) => {
                const variantLetter = String.fromCharCode(97 + index);
                const messageField = document.getElementById(`variant-${variantLetter}-message`);
                const hookField = document.getElementById(`variant-${variantLetter}-hook`);
                const ctaField = document.getElementById(`variant-${variantLetter}-cta`);
                const toneField = document.getElementById(`variant-${variantLetter}-tone`);
                
                if (messageField) messageField.value = variant.content || '';
                if (hookField) hookField.value = variant.hook_style || '';
                if (ctaField) ctaField.value = variant.cta_type || '';
                if (toneField) toneField.value = variant.tone || '';
            });
        }
        
        if (this.campaignData.tags) {
            const tagsField = document.getElementById('campaign-tags');
            if (tagsField) tagsField.value = this.campaignData.tags.join(', ');
        }
    }

    async updateCampaignStatus(campaignId, status, reason) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (campaign) {
                campaign.status = status;
                campaign.updated_at = new Date().toISOString();
            }
            return;
        }
        
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ 
                    status: status, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', campaignId)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
        } catch (error) {
            console.error('Update campaign status error:', error);
            throw error;
        }
    }

    async confirmAction(message, title, confirmText) {
        return new Promise((resolve) => {
            const modal = this.createConfirmationModal({
                title: title,
                message: message,
                confirmText: confirmText,
                cancelText: 'Cancel',
                onConfirm: () => {
                    modal.remove();
                    resolve(true);
                },
                onCancel: () => {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }

    // =============================================================================
    // BULK OPERATIONS
    // =============================================================================

    selectAllCampaigns() {
        const checkboxes = document.querySelectorAll('.campaign-checkbox');
        const selectAllBtn = document.getElementById('select-all-campaigns');
        const isSelectingAll = !selectAllBtn.classList.contains('all-selected');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isSelectingAll;
        });
        
        if (isSelectingAll) {
            selectAllBtn.classList.add('all-selected');
            selectAllBtn.textContent = '☑️ Deselect All';
        } else {
            selectAllBtn.classList.remove('all-selected');
            selectAllBtn.textContent = '☐ Select All';
        }
        
        this.updateBulkActionButtons();
    }

    updateBulkActionButtons() {
        const checkedBoxes = document.querySelectorAll('.campaign-checkbox:checked');
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (checkedBoxes.length > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = checkedBoxes.length;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    async bulkDeleteCampaigns() {
        const checkedBoxes = document.querySelectorAll('.campaign-checkbox:checked');
        const campaignIds = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (campaignIds.length === 0) {
            window.OsliraApp.showMessage('No campaigns selected', 'error');
            return;
        }
        
        const confirmed = await this.confirmAction(
            `<p>Are you sure you want to delete ${campaignIds.length} campaign(s)?</p><p><strong>This action cannot be undone.</strong></p>`,
            'Delete Campaigns',
            '🗑️ Delete Campaigns'
        );
        
        if (!confirmed) return;
        
        try {
            await this.performBulkDelete(campaignIds);
            window.OsliraApp.showMessage(`${campaignIds.length} campaign(s) deleted successfully`, 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Bulk delete error:', error);
            window.OsliraApp.showMessage('Failed to delete campaigns', 'error');
        }
    }

    async bulkPauseCampaigns() {
        const checkedBoxes = document.querySelectorAll('.campaign-checkbox:checked');
        const campaignIds = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (campaignIds.length === 0) {
            window.OsliraApp.showMessage('No campaigns selected', 'error');
            return;
        }
        
        try {
            await this.performBulkStatusUpdate(campaignIds, 'paused');
            window.OsliraApp.showMessage(`${campaignIds.length} campaign(s) paused successfully`, 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Bulk pause error:', error);
            window.OsliraApp.showMessage('Failed to pause campaigns', 'error');
        }
    }

    async bulkResumeCampaigns() {
        const checkedBoxes = document.querySelectorAll('.campaign-checkbox:checked');
        const campaignIds = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (campaignIds.length === 0) {
            window.OsliraApp.showMessage('No campaigns selected', 'error');
            return;
        }
        
        try {
            await this.performBulkStatusUpdate(campaignIds, 'live');
            window.OsliraApp.showMessage(`${campaignIds.length} campaign(s) resumed successfully`, 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Bulk resume error:', error);
            window.OsliraApp.showMessage('Failed to resume campaigns', 'error');
        }
    }

    async performBulkDelete(campaignIds) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.campaigns = this.campaigns.filter(c => !campaignIds.includes(c.id));
            return;
        }
        
        try {
            await supabase.from('campaign_messages').delete().in('campaign_id', campaignIds);
            
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .in('id', campaignIds)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
        } catch (error) {
            console.error('Bulk delete database error:', error);
            throw error;
        }
    }

    async performBulkStatusUpdate(campaignIds, status) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.campaigns.forEach(campaign => {
                if (campaignIds.includes(campaign.id)) {
                    campaign.status = status;
                    campaign.updated_at = new Date().toISOString();
                }
            });
            return;
        }
        
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ 
                    status: status, 
                    updated_at: new Date().toISOString() 
                })
                .in('id', campaignIds)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
        } catch (error) {
            console.error('Bulk status update error:', error);
            throw error;
        }
    }

    // =============================================================================
    // PAGINATION
    // =============================================================================

    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const paginationContainer = document.getElementById('pagination-container');
        
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        const pageInfo = document.getElementById('page-info');
        
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
        if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        
        const pageSizeSelect = document.getElementById('page-size-select');
        if (pageSizeSelect && pageSizeSelect.value != this.itemsPerPage) {
            pageSizeSelect.value = this.itemsPerPage;
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.applyFiltersAndSearch();
        }
    }

    nextPage() {
        this.currentPage++;
        this.applyFiltersAndSearch();
    }

    changePageSize(newSize) {
        this.itemsPerPage = parseInt(newSize);
        this.currentPage = 1;
        this.applyFiltersAndSearch();
    }

    clearAllFilters() {
        this.activeFilters.clear();
        this.activeFilters.add('all');
        this.searchTerm = '';
        this.currentPage = 1;
        
        const searchInput = document.getElementById('campaign-search');
        if (searchInput) searchInput.value = '';
        
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) clearBtn.style.display = 'none';
        
        this.applyFiltersAndSearch();
    }

    // =============================================================================
    // CSV BULK IMPORT
    // =============================================================================

    showBulkImport() {
        const modal = document.getElementById('bulk-import-modal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            this.createBulkImportModal();
        }
    }

    createBulkImportModal() {
        const modal = document.createElement('div');
        modal.id = 'bulk-import-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content bulk-import-content">
                <div class="modal-header">
                    <h3>📤 Bulk Import Leads</h3>
                    <button class="modal-close" onclick="campaigns.closeBulkImportModal()">×</button>
                </div>
                
                <div class="import-content">
                    <div class="upload-zone" onclick="document.getElementById('csv-file-input').click()">
                        <div class="upload-icon">📁</div>
                        <div class="upload-text">
                            <div>Click to select CSV file</div>
                            <div class="upload-subtext">Maximum 1000 leads per import</div>
                        </div>
                    </div>
                    <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
                    
                    <div class="csv-requirements">
                        <h5>CSV Format:</h5>
                        <p>Upload a CSV file with Instagram usernames, one per line:</p>
                        <div style="background: var(--bg-light); padding: 12px; border-radius: 6px; font-family: monospace; margin: 12px 0;">
                            techstartup<br>
                            digitalagency<br>
                            marketingpro
                        </div>
                        <button class="secondary-btn" onclick="campaigns.downloadCSVTemplate()">
                            📥 Download Template
                        </button>
                    </div>
                    
                    <div id="csv-preview" style="display: none; margin-top: 16px;"></div>
                    
                    <div class="import-actions">
                        <button class="secondary-btn" onclick="campaigns.closeBulkImportModal()">Cancel</button>
                        <button id="process-csv-btn" class="primary-btn" onclick="campaigns.processBulkCSV()" disabled>
                            Start Import
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.setupBulkImportListeners();
    }

    setupBulkImportListeners() {
        const fileInput = document.getElementById('csv-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleCSVUpload(e));
        }
    }

    async handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.csv')) {
            window.OsliraApp.showMessage('Please upload a CSV file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            window.OsliraApp.showMessage('File too large. Maximum size is 5MB.', 'error');
            return;
        }
        
        try {
            const text = await file.text();
            this.csvData = this.parseCSV(text);
            
            if (this.csvData.length === 0) {
                window.OsliraApp.showMessage('CSV file appears to be empty', 'error');
                return;
            }
            
            if (this.csvData.length > 1000) {
                window.OsliraApp.showMessage('Too many rows. Maximum 1000 leads per import.', 'error');
                return;
            }
            
            this.renderCSVPreview();
            
            const processBtn = document.getElementById('process-csv-btn');
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.textContent = `Import ${this.csvData.length} Leads`;
            }
            
            window.OsliraApp.showMessage(`CSV loaded successfully! Found ${this.csvData.length} usernames.`, 'success');
            
        } catch (error) {
            console.error('CSV upload error:', error);
            window.OsliraApp.showMessage('Error reading CSV file: ' + error.message, 'error');
        }
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const data = [];
        
        lines.forEach((line, index) => {
            const username = line.split(',')[0].trim().replace(/"/g, '').replace('@', '');
            if (username && this.validateUsername(username)) {
                data.push({
                    username: username,
                    lineNumber: index + 1
                });
            }
        });
        
        return data;
    }

    validateUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
        const hasConsecutivePeriods = /\.{2,}/.test(username);
        const startsOrEndsWithPeriod = /^\./.test(username) || /\.$/.test(username);
        
        return usernameRegex.test(username) && !hasConsecutivePeriods && !startsOrEndsWithPeriod;
    }

    renderCSVPreview() {
        const previewDiv = document.getElementById('csv-preview');
        if (!previewDiv) return;
        
        const validUsernames = this.csvData.slice(0, 20);
        
        previewDiv.innerHTML = `
            <div style="background: white; border: 1px solid var(--border-light); border-radius: 8px; padding: 16px;">
                <h4 style="margin: 0 0 12px 0;">Preview (showing first ${Math.min(20, this.csvData.length)} of ${this.csvData.length})</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
                    ${validUsernames.map(row => `
                        <div style="padding: 6px 10px; background: var(--bg-light); border-radius: 4px; font-size: 13px; text-align: center;">
                            @${row.username}
                        </div>
                    `).join('')}
                </div>
                ${this.csvData.length > 20 ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: var(--text-secondary);">... and ${this.csvData.length - 20} more</p>` : ''}
            </div>
        `;
        
        previewDiv.style.display = 'block';
    }

    async processBulkCSV() {
        if (!this.csvData || this.csvData.length === 0) {
            window.OsliraApp.showMessage('No data to import', 'error');
            return;
        }
        
        const processBtn = document.getElementById('process-csv-btn');
        if (processBtn) {
            processBtn.disabled = true;
            processBtn.textContent = '⏳ Processing...';
        }
        
        try {
            await this.performBulkImport();
            window.OsliraApp.showMessage(`Successfully imported ${this.csvData.length} leads!`, 'success');
            this.closeBulkImportModal();
            
            // Refresh data
            await this.loadCampaigns();
            
        } catch (error) {
            console.error('Bulk import error:', error);
            window.OsliraApp.showMessage('Import failed: ' + error.message, 'error');
        } finally {
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.textContent = `Import ${this.csvData.length} Leads`;
            }
        }
    }

    async performBulkImport() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            // Simulate import delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            return;
        }
        
        try {
            const leadsData = this.csvData.map(lead => ({
                username: lead.username,
                profile_url: `https://instagram.com/${lead.username}`,
                platform: 'Instagram',
                user_id: user.id,
                created_at: new Date().toISOString(),
                status: 'imported'
            }));
            
            const batchSize = 100;
            for (let i = 0; i < leadsData.length; i += batchSize) {
                const batch = leadsData.slice(i, i + batchSize);
                
                const { error } = await supabase
                    .from('leads')
                    .insert(batch);
                    
                if (error) throw error;
            }
            
        } catch (error) {
            console.error('Bulk import database error:', error);
            throw error;
        }
    }

    downloadCSVTemplate() {
        const template = `techstartup
digitalagency
marketingpro
brandstudio
creativehub`;
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leads_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

closeBulkImportModal() {
        const modal = document.getElementById('bulk-import-modal');
        if (modal) modal.remove();
        
        this.csvData = [];
        this.mappedData = [];
    }

    // =============================================================================
    // EXPORT AND UTILITIES
    // =============================================================================

    async exportCampaigns() {
        try {
            const campaigns = this.campaigns;
            if (campaigns.length === 0) {
                window.OsliraApp.showMessage('No campaigns to export', 'error');
                return;
            }
            
            const csvContent = this.generateCampaignsCSV(campaigns);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `campaigns_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            window.OsliraApp.showMessage(`Exported ${campaigns.length} campaigns successfully`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            window.OsliraApp.showMessage('Export failed: ' + error.message, 'error');
        }
    }

    generateCampaignsCSV(campaigns) {
        const headers = [
            'Name', 'Status', 'Objective', 'Outreach Mode', 'Target Count',
            'Messages Sent', 'Responses', 'Conversions', 'Response Rate',
            'Created Date', 'Updated Date'
        ];
        
        const rows = campaigns.map(campaign => [
            campaign.name,
            campaign.status,
            campaign.objective,
            campaign.outreach_mode,
            campaign.target_lead_count || 0,
            campaign.messages_sent || 0,
            campaign.responses_received || 0,
            campaign.conversions || 0,
            this.calculateResponseRate(campaign).toFixed(1) + '%',
            new Date(campaign.created_at).toLocaleDateString(),
            new Date(campaign.updated_at).toLocaleDateString()
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    selectCampaign(campaignId) {
        document.querySelectorAll('.campaign-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const selectedCard = document.querySelector(`[data-campaign-id="${campaignId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            this.selectedCampaign = campaignId;
            this.loadCampaignDetails(campaignId);
        }
    }

    async loadCampaignDetails(campaignId) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        const detailsPanel = document.getElementById('campaign-details-panel');
        if (detailsPanel) {
            detailsPanel.innerHTML = this.renderCampaignDetails(campaign);
        }
    }

    renderCampaignDetails(campaign) {
        const responseRate = this.calculateResponseRate(campaign);
        
        return `
            <div class="campaign-details-content">
                <div class="campaign-details-header">
                    <h3>${campaign.name}</h3>
                    <div class="campaign-actions">
                        <button class="action-btn" onclick="campaigns.${campaign.status === 'live' ? 'pauseCampaign' : 'resumeCampaign'}('${campaign.id}')">
                            ${campaign.status === 'live' ? '⏸️ Pause' : '▶️ Resume'}
                        </button>
                        <button class="action-btn" onclick="campaigns.cloneCampaign('${campaign.id}')">
                            📋 Clone
                        </button>
                        <button class="action-btn danger" onclick="campaigns.stopCampaign('${campaign.id}')">
                            🛑 Stop
                        </button>
                    </div>
                </div>
                
                <div class="campaign-metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${campaign.messages_sent || 0}</div>
                        <div class="metric-label">Messages Sent</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${campaign.responses_received || 0}</div>
                        <div class="metric-label">Responses</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${responseRate.toFixed(1)}%</div>
                        <div class="metric-label">Response Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${campaign.conversions || 0}</div>
                        <div class="metric-label">Conversions</div>
                    </div>
                </div>
                
                <div class="campaign-info">
                    <div class="info-row">
                        <span class="info-label">Objective:</span>
                        <span class="info-value">${campaign.objective}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Platform:</span>
                        <span class="info-value">${campaign.outreach_mode}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Target Leads:</span>
                        <span class="info-value">${campaign.target_lead_count || 0}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Created:</span>
                        <span class="info-value">${window.OsliraApp.formatDateInUserTimezone(campaign.created_at)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    showUpgradeModal(reason, data) {
        const modal = document.createElement('div');
        modal.className = 'modal upgrade-modal';
        
        let content = '';
        
        switch (reason) {
            case 'campaign_limit':
                content = `
                    <h3>🚀 Upgrade Required</h3>
                    <p>You've reached your campaign limit (${data.current}/${data.limit})</p>
                    <p>Upgrade to create more campaigns and unlock advanced features:</p>
                    <ul>
                        <li>✅ More active campaigns</li>
                        <li>✅ Advanced A/B testing</li>
                        <li>✅ Priority support</li>
                        <li>✅ Advanced analytics</li>
                    </ul>
                `;
                break;
            default:
                content = `
                    <h3>🚀 Upgrade Your Plan</h3>
                    <p>Unlock more features and capabilities with a premium plan.</p>
                `;
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    ${content}
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                        Maybe Later
                    </button>
                    <button class="primary-btn" onclick="window.location.href='/subscription.html'">
                        🚀 Upgrade Now
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showCampaignMenu(campaignId, event) {
        event.stopPropagation();
        
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        const menu = document.createElement('div');
        menu.className = 'campaign-context-menu';
        menu.innerHTML = `
            <div class="menu-item" onclick="campaigns.selectCampaign('${campaignId}')">
                👁️ View Details
            </div>
            <div class="menu-item" onclick="campaigns.${campaign.status === 'live' ? 'pauseCampaign' : 'resumeCampaign'}('${campaignId}')">
                ${campaign.status === 'live' ? '⏸️ Pause' : '▶️ Resume'}
            </div>
            <div class="menu-item" onclick="campaigns.cloneCampaign('${campaignId}')">
                📋 Clone
            </div>
            <div class="menu-separator"></div>
            <div class="menu-item danger" onclick="campaigns.stopCampaign('${campaignId}')">
                🛑 Stop Campaign
            </div>
        `;
        
        // Position menu
        const rect = event.target.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left - 150}px`;
        menu.style.zIndex = '10000';
        
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    // =============================================================================
    // REAL-TIME UPDATES
    // =============================================================================

    startRealTimeUpdates() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user || !this.userCapabilities.hasRealTimeUpdates) {
            console.log('Real-time updates skipped');
            return;
        }
        
        this.realTimeSubscription = supabase
            .channel('campaigns_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'campaigns',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                this.handleRealTimeUpdate(payload);
            })
            .subscribe();

        this.liveMetricsInterval = setInterval(() => {
            if (this.selectedCampaign) {
                this.updateLiveMetrics();
            }
        }, 30000);
        
        console.log('✅ Real-time updates started');
    }

    handleRealTimeUpdate(payload) {
        console.log('📡 Real-time campaign update:', payload);
        
        if (payload.eventType === 'INSERT') {
            this.loadCampaigns();
            window.OsliraApp.showMessage('New campaign detected', 'info');
        } else if (payload.eventType === 'UPDATE') {
            this.updateCampaignInList(payload.new);
            if (payload.new.id === this.selectedCampaign) {
                this.loadCampaignDetails(this.selectedCampaign);
            }
        } else if (payload.eventType === 'DELETE') {
            this.removeCampaignFromList(payload.old.id);
            if (payload.old.id === this.selectedCampaign) {
                this.selectedCampaign = null;
            }
        }
    }

    updateCampaignInList(updatedCampaign) {
        const index = this.campaigns.findIndex(c => c.id === updatedCampaign.id);
        if (index !== -1) {
            this.campaigns[index] = { ...this.campaigns[index], ...updatedCampaign };
            this.applyFiltersAndSearch();
        }
    }

    removeCampaignFromList(campaignId) {
        this.campaigns = this.campaigns.filter(c => c.id !== campaignId);
        this.applyFiltersAndSearch();
    }

    updateLiveMetrics() {
        if (!this.selectedCampaign) return;
        
        const campaign = this.campaigns.find(c => c.id === this.selectedCampaign);
        if (!campaign) return;
        
        const metricsElements = {
            'live-messages-sent': campaign.messages_sent || 0,
            'live-responses': campaign.responses_received || 0,
            'live-response-rate': this.calculateResponseRate(campaign).toFixed(1) + '%',
            'live-conversions': campaign.conversions || 0
        };
        
        Object.entries(metricsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    stopRealTimeUpdates() {
        if (this.realTimeSubscription) {
            this.realTimeSubscription.unsubscribe();
            this.realTimeSubscription = null;
        }
        
        if (this.liveMetricsInterval) {
            clearInterval(this.liveMetricsInterval);
            this.liveMetricsInterval = null;
        }
    }

    // =============================================================================
    // KEYBOARD SHORTCUTS AND EVENT HANDLERS
    // =============================================================================

    handleKeyboardShortcuts(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showWizard();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isWizardActive()) {
            e.preventDefault();
            this.saveDraft();
        }
        
        if (e.key === 'Escape') {
            this.handleEscapeKey();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && this.isWizardActive()) {
            e.preventDefault();
            if (this.currentStep === 4) {
                this.launchCampaign();
            } else {
                this.nextStep();
            }
        }
    }

    handleEscapeKey() {
        if (this.isWizardActive()) {
            this.cancelWizard();
        } else {
            const openModal = document.querySelector('.modal[style*="flex"], .modal[style*="block"]');
            if (openModal) {
                openModal.style.display = 'none';
            }
        }
    }

    handleModalClick(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }

    isWizardActive() {
        return document.getElementById('wizard-view')?.classList.contains('active') || false;
    }

    // =============================================================================
    // CLEANUP AND FINALIZATION
    // =============================================================================

    refreshData() {
        window.OsliraApp.showLoadingOverlay('Refreshing data...');
        this.loadCampaignsData().finally(() => {
            window.OsliraApp.removeLoadingOverlay();
            window.OsliraApp.showMessage('Data refreshed successfully', 'success');
        });
    }

    destroy() {
        this.stopRealTimeUpdates();
        
        if (this.liveMetricsInterval) {
            clearInterval(this.liveMetricsInterval);
        }
        
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        localStorage.removeItem('campaign_draft');
        
        console.log('🧹 Campaigns instance cleaned up');
    }
}

// =============================================================================
// INITIALIZE CAMPAIGNS
// =============================================================================

// Create global campaigns instance
const campaigns = new OsliraCampaigns();

// Make campaigns available globally for onclick handlers
window.campaigns = campaigns;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    campaigns.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    campaigns.destroy();
});

console.log('📊 Campaigns module loaded - uses shared-core.js');
