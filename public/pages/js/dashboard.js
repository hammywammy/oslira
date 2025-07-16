// ==========================================
// DASHBOARD.JS - Enterprise Simplified Version
// Depends on: shared-core.js (must be loaded first)
// ==========================================

class OsliraDashboard {
    constructor() {
        this.selectedLeads = new Set();
        this.allLeads = [];
        this.csvData = [];
        this.userProfile = null;
    }

    async initialize() {
        try {
            console.log('🏠 Initializing dashboard...');
            
            // Wait for shared core to handle all the heavy lifting
            await window.OsliraApp.initialize();
            
            // Dashboard-specific setup
            await this.setupDashboard();
            await this.loadDashboardData();
            this.setupEventListeners();
            
            // Generate insights after everything loads
            setTimeout(() => this.generateInsights(), 1000);
            
            console.log('✅ Dashboard ready');
            
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            window.OsliraApp.showMessage('Dashboard failed to load: ' + error.message, 'error');
        }
    }

    async setupDashboard() {
        // Get user profile from shared state
        this.userProfile = await this.loadUserProfile();
        this.updateUserInterface();
        await this.setupBusinessSelector();
    }

    async loadUserProfile() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            return this.getDemoProfile();
        }
        
        try {
            const { data: profile, error } = await supabase
                .from('users')
                .select('email, subscription_plan, subscription_status, credits, timezone')
                .eq('id', user.id)
                .single();

            if (error) {
                console.warn('Error loading user profile:', error);
                return this.getDemoProfile();
            }

            return profile || this.getDemoProfile();
            
        } catch (error) {
            console.error('Profile loading failed:', error);
            return this.getDemoProfile();
        }
    }

    getDemoProfile() {
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
        
        // Update user email
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) userEmailEl.textContent = profile.email;
        
        // Update subscription display
        this.updateSubscriptionUI(profile.subscription_plan, profile.subscription_status, profile.credits);
    }

    updateSubscriptionUI(plan, status, credits) {
        const planNames = {
            free: 'Free Plan',
            starter: 'Starter Plan',
            growth: 'Growth Plan',
            professional: 'Professional Plan',
            enterprise: 'Enterprise Plan'
        };

        const planElement = document.getElementById('sidebar-plan');
        const billingElement = document.getElementById('sidebar-billing');
        
        if (planElement) planElement.textContent = planNames[plan] || 'Free Plan';
        
        if (billingElement) {
            const creditsCount = credits || 0;
            
            if (plan === 'free') {
                let warningClass = '';
                let warningText = '';
                
                if (creditsCount === 0) {
                    warningClass = 'credits-empty';
                    warningText = '⚠️ No credits left';
                } else if (creditsCount <= 2) {
                    warningClass = 'credits-low';
                    warningText = '⚠️ Low credits';
                }
                
                billingElement.innerHTML = `
                    <div style="text-align: center; margin-top: 8px;" class="${warningClass}">
                        <div style="font-size: 28px; font-weight: 800; color: ${creditsCount === 0 ? 'var(--error)' : creditsCount <= 2 ? 'var(--warning)' : 'var(--primary-blue)'}; line-height: 1;">
                            ${creditsCount}
                        </div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">
                            Credits Remaining
                        </div>
                        ${warningText ? `<div style="font-size: 10px; color: ${creditsCount === 0 ? 'var(--error)' : 'var(--warning)'}; margin-top: 4px; font-weight: 600;">${warningText}</div>` : ''}
                        ${creditsCount === 0 ? `<div style="margin-top: 8px;"><a href="subscription.html" style="font-size: 10px; color: var(--error); text-decoration: none; font-weight: 600; padding: 4px 8px; background: rgba(220, 38, 38, 0.1); border-radius: 4px;">🚀 Upgrade Now</a></div>` : ''}
                    </div>
                `;
            } else {
                billingElement.innerHTML = `
                    <div style="text-align: center; margin-top: 8px;">
                        <div style="font-size: 24px; font-weight: 700; color: var(--success); line-height: 1;">
                            ${creditsCount}
                        </div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">
                            Credits Available
                        </div>
                        <div style="font-size: 10px; color: var(--success); margin-top: 4px; font-weight: 600;">
                            ✅ Active subscription
                        </div>
                    </div>
                `;
            }
        }
    }

    async setupBusinessSelector() {
        const businesses = window.OsliraApp.businesses;
        const businessSelect = document.getElementById('business-select');
        const modalBusinessSelect = document.getElementById('business-id');
        
        if (businessSelect) {
            businessSelect.innerHTML = '<option value="">Select Business...</option>';
            businesses.forEach(business => {
                const option = new Option(business.business_name, business.id);
                businessSelect.add(option);
            });
            
            if (businesses.length > 0) {
                businessSelect.value = businesses[0].id;
                window.OsliraApp.business = businesses[0];
            }
        }
        
        if (modalBusinessSelect) {
            modalBusinessSelect.innerHTML = '<option value="">Select business profile...</option>';
            businesses.forEach(business => {
                const option = new Option(business.business_name, business.id);
                modalBusinessSelect.add(option);
            });
        }
    }

    // =============================================================================
    // DATA LOADING
    // =============================================================================

    async loadDashboardData() {
        await Promise.all([
            this.loadRecentActivity(),
            this.loadStats(),
            this.loadCreditUsage()
        ]);
    }

    async loadRecentActivity() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.displayDemoLeads();
            return;
        }
        
        try {
            let query = supabase
                .from('leads')
                .select(`
                    *,
                    profile_pic_url,
                    lead_analyses (
                        engagement_score,
                        score_niche_fit,
                        score_total,
                        ai_version_id,
                        outreach_message,
                        selling_points,
                        analysis_type
                    )
                `)
                .eq('user_id', user.id);

            // Apply timeframe filter
            const timeframe = document.getElementById('timeframe-filter')?.value || 'month';
            if (timeframe !== 'all') {
                const now = new Date();
                let startDate;
                
                switch (timeframe) {
                    case 'today':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                    case 'week':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                }
                
                if (startDate) {
                    query = query.gte('created_at', startDate.toISOString());
                }
            }

            const { data: leads, error } = await query
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            this.allLeads = leads || [];
            this.selectedLeads.clear();
            this.applyActivityFilter();
            
        } catch (error) {
            console.error('Error loading activity:', error);
            this.displayErrorState('Failed to load leads: ' + error.message);
        }
    }

    displayDemoLeads() {
        this.allLeads = [
            {
                id: 'demo-1',
                username: 'demo_user_1',
                platform: 'Instagram',
                score: 85,
                type: 'deep',
                created_at: new Date().toISOString(),
                profile_pic_url: null
            },
            {
                id: 'demo-2', 
                username: 'demo_user_2',
                platform: 'Instagram',
                score: 72,
                type: 'light',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                profile_pic_url: null
            }
        ];
        this.applyActivityFilter();
    }

    applyActivityFilter() {
        const filter = document.getElementById('activity-filter')?.value || 'all';
        let filteredLeads = [...this.allLeads];

        switch (filter) {
            case 'light':
                filteredLeads = filteredLeads.filter(lead => 
                    lead.type === 'light' || (!lead.type && (!lead.lead_analyses || lead.lead_analyses.length === 0))
                );
                break;
            case 'deep':
                filteredLeads = filteredLeads.filter(lead => 
                    lead.type === 'deep' || (!lead.type && lead.lead_analyses && lead.lead_analyses.length > 0)
                );
                break;
            case 'score_high':
                filteredLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
                break;
            case 'score_low':
                filteredLeads.sort((a, b) => (a.score || 0) - (b.score || 0));
                break;
            case 'recent':
                filteredLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                filteredLeads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
        }

        this.displayLeads(filteredLeads);
    }

    displayLeads(leads) {
        const tableBody = document.getElementById('activity-table');
        
        if (!tableBody) return;
        
        if (leads && leads.length > 0) {
            tableBody.innerHTML = leads.map(lead => {
                const analysisType = lead.type || (lead.lead_analyses && lead.lead_analyses.length > 0 ? 'deep' : 'light');
                const scoreClass = lead.score >= 80 ? 'score-high' : lead.score >= 60 ? 'score-medium' : 'score-low';
                
                const profilePicUrl = lead.profile_pic_url || lead.profile_picture_url || lead.avatar_url;
                const profilePicHtml = profilePicUrl 
                    ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=40&h=40&fit=cover&a=attention" 
                            alt="@${lead.username}" 
                            style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                    : '';
                
                const fallbackAvatar = `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; display: ${profilePicUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 2px solid var(--border-light);">
                    ${(lead.username || 'U').charAt(0).toUpperCase()}
                </div>`;
                
                const isSelected = this.selectedLeads.has(lead.id);
                const formattedDate = window.OsliraApp.formatDate(lead.created_at, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <tr class="lead-row ${isSelected ? 'selected' : ''}" data-lead-id="${lead.id}">
                        <td>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label class="checkbox-container" style="margin: 0;">
                                    <input type="checkbox" 
                                           class="lead-checkbox" 
                                           data-lead-id="${lead.id}" 
                                           ${isSelected ? 'checked' : ''}
                                           onchange="dashboard.toggleLeadSelection('${lead.id}')">
                                    <span class="checkmark"></span>
                                </label>
                                <div style="position: relative; flex-shrink: 0;">
                                    ${profilePicHtml}
                                    ${fallbackAvatar}
                                </div>
                                <div>
                                    <div style="font-weight: 600; color: var(--text-primary);">@${lead.username}</div>
                                    <div style="font-size: 12px; color: var(--border-light);">
                                        ${lead.platform || 'Instagram'}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>📷 ${lead.platform || 'Instagram'}</td>
                        <td><span class="score-badge ${scoreClass}">${lead.score || 0}</span></td>
                        <td><span class="status ${analysisType}">${analysisType}</span></td>
                        <td title="${window.OsliraApp.formatDate(lead.created_at)}">${formattedDate}</td>
                        <td style="text-align: center;">
                            <button class="btn-small" onclick="dashboard.viewLead('${lead.id}')">📝 View</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        No leads found for the selected filters.
                    </td>
                </tr>
            `;
        }
        
        this.updateBulkActionsVisibility();
    }

    displayErrorState(message) {
        const tableBody = document.getElementById('activity-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--warning);">
                        ${message}
                    </td>
                </tr>
            `;
        }
    }

    async loadStats() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.displayDemoStats();
            return;
        }
        
        try {
            const { count: totalLeads } = await supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id);
            
            const { data: leadsWithScores } = await supabase
                .from('leads')
                .select('score')
                .eq('user_id', user.id)
                .not('score', 'is', null);
            
            const avgScore = leadsWithScores?.length > 0 
                ? Math.round(leadsWithScores.reduce((sum, lead) => sum + (lead.score || 0), 0) / leadsWithScores.length)
                : 0;
            
            const { count: highValueLeads } = await supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .gte('score', 80);
            
            this.updateStatsUI(totalLeads || 0, avgScore, highValueLeads || 0);
            
        } catch (error) {
            console.error('Error loading stats:', error);
            this.displayDemoStats();
        }
    }

    displayDemoStats() {
        this.updateStatsUI(2, 78, 1);
    }

    updateStatsUI(totalLeads, avgScore, highValueLeads) {
        const totalLeadsEl = document.getElementById('total-leads');
        const avgScoreEl = document.getElementById('avg-score');
        const highValueEl = document.getElementById('high-value-leads');
        
        if (totalLeadsEl) totalLeadsEl.textContent = totalLeads;
        if (avgScoreEl) avgScoreEl.textContent = avgScore;
        if (highValueEl) highValueEl.textContent = highValueLeads;
        
        // Update trends
        const leadsTrend = document.getElementById('leads-trend');
        const scoreTrend = document.getElementById('score-trend');
        const highValueTrend = document.getElementById('high-value-trend');
        
        if (leadsTrend && totalLeads > 0) {
            leadsTrend.textContent = `${totalLeads} total researched`;
            leadsTrend.className = 'trend up';
        }
        
        if (scoreTrend && avgScore > 0) {
            scoreTrend.textContent = `${avgScore}% average quality`;
            scoreTrend.className = avgScore >= 70 ? 'trend up' : 'trend';
        }
        
        if (highValueTrend && highValueLeads > 0 && totalLeads > 0) {
            highValueTrend.textContent = `${Math.round((highValueLeads / totalLeads) * 100)}% high-value rate`;
        }
    }

    async loadCreditUsage() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.updateCreditUsageUI(5);
            return;
        }
        
        try {
            const { data: transactions } = await supabase
                .from('credit_transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'use')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
            
            const creditsUsed = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
            this.updateCreditUsageUI(creditsUsed);
            
        } catch (error) {
            console.error('Error loading credit usage:', error);
            this.updateCreditUsageUI(0);
        }
    }

    updateCreditUsageUI(creditsUsed) {
        const creditsUsedEl = document.getElementById('credits-used');
        const creditsTrendEl = document.getElementById('credits-trend');
        
        if (creditsUsedEl) creditsUsedEl.textContent = creditsUsed;
        if (creditsTrendEl) creditsTrendEl.textContent = 'Last 30 days';
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    setupEventListeners() {
        // Analysis modal
        document.getElementById('research-lead-btn')?.addEventListener('click', () => this.showAnalysisModal());
        document.getElementById('research-action-card')?.addEventListener('click', () => this.showAnalysisModal());
        document.getElementById('welcome-cta-btn')?.addEventListener('click', () => this.showAnalysisModal());
        
        // Bulk upload
        document.getElementById('bulk-upload-btn')?.addEventListener('click', () => this.showBulkUpload());
        document.getElementById('csv-import-action-card')?.addEventListener('click', () => this.showBulkUpload());
        
        // Filters
        document.getElementById('timeframe-filter')?.addEventListener('change', () => this.loadRecentActivity());
        document.getElementById('activity-filter')?.addEventListener('change', () => this.applyActivityFilter());
        document.getElementById('refresh-activity-btn')?.addEventListener('click', () => this.refreshActivity());
        
        // Bulk actions
        document.getElementById('select-all-btn')?.addEventListener('click', () => this.selectAllLeads());
        document.getElementById('bulk-delete-btn')?.addEventListener('click', () => this.bulkDeleteLeads());
        document.getElementById('clear-selection-btn')?.addEventListener('click', () => this.clearSelection());
        
        // Business selector
        document.getElementById('business-select')?.addEventListener('change', () => this.switchBusiness());
        
        // Forms
        document.getElementById('analysisForm')?.addEventListener('submit', (e) => this.submitAnalysis(e));
        document.getElementById('analysis-type')?.addEventListener('change', () => this.updateInputField());
        
        // Modal controls
        document.getElementById('analysis-modal-close')?.addEventListener('click', () => this.closeModal('analysisModal'));
        document.getElementById('lead-modal-close')?.addEventListener('click', () => this.closeModal('leadModal'));
        document.getElementById('bulk-modal-close')?.addEventListener('click', () => this.closeModal('bulkModal'));
        
        // Other actions
        document.getElementById('export-action-card')?.addEventListener('click', () => this.exportLeads());
        document.getElementById('generate-insights-btn')?.addEventListener('click', () => this.generateInsights());
        
        // Global modal handling
        window.addEventListener('click', (e) => this.handleModalClick(e));
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    // =============================================================================
    // ANALYSIS FUNCTIONALITY
    // =============================================================================

    showAnalysisModal() {
        const modal = document.getElementById('analysisModal');
        if (!modal) return;
        
        const form = document.getElementById('analysisForm');
        if (form) form.reset();
        
        const analysisType = document.getElementById('analysis-type');
        const profileInput = document.getElementById('profile-input');
        const inputContainer = document.getElementById('input-field-container');
        
        if (analysisType) analysisType.value = '';
        if (profileInput) profileInput.value = '';
        if (inputContainer) inputContainer.style.display = 'none';
        
        // Set current business
        const businessSelect = document.getElementById('business-id');
        if (businessSelect && window.OsliraApp.business) {
            businessSelect.value = window.OsliraApp.business.id;
        }
        
        modal.style.display = 'flex';
    }

    updateInputField() {
        const analysisType = document.getElementById('analysis-type').value;
        const inputContainer = document.getElementById('input-field-container');
        const inputField = document.getElementById('profile-input');
        const inputLabel = document.getElementById('input-label');
        const inputHelp = document.getElementById('input-help');
        
        if (!inputContainer || !inputField || !inputLabel || !inputHelp) return;
        
        inputField.value = '';
        inputField.placeholder = '';
        
        if (analysisType) {
            inputContainer.style.display = 'block';
            
            if (analysisType === 'light') {
                inputLabel.textContent = 'Instagram Username *';
                inputField.placeholder = 'username';
                inputHelp.textContent = 'Enter just the username (without @)';
                inputHelp.style.color = 'var(--primary-blue)';
            } else if (analysisType === 'deep') {
                inputLabel.textContent = 'Instagram Username *';
                inputField.placeholder = 'username';
                inputHelp.textContent = 'Enter just the username (without @) - we\'ll do the FULL DEEP analysis';
                inputHelp.style.color = 'var(--accent-teal)';
            }
            
            setTimeout(() => inputField.focus(), 50);
        } else {
            inputContainer.style.display = 'none';
        }
    }

    async submitAnalysis(event) {
        event.preventDefault();
        
        const analysisType = document.getElementById('analysis-type').value;
        const profileInput = document.getElementById('profile-input').value.trim();
        const businessId = document.getElementById('business-id').value;
        
        if (!analysisType || !profileInput) {
            window.OsliraApp.showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        const username = profileInput.replace('@', '');
        
        if (!this.validateUsername(username)) {
            window.OsliraApp.showMessage('Please enter a valid Instagram username', 'error');
            return;
        }
        
        const profileUrl = `https://instagram.com/${username}`;
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '🔄 Analyzing... <small style="display: block; font-size: 10px; margin-top: 4px;">This may take 30-60 seconds</small>';
        submitBtn.disabled = true;
        
        window.OsliraApp.showMessage('Starting analysis... This may take up to 60 seconds', 'info');
        
        try {
            const user = window.OsliraApp.user;
            const session = window.OsliraApp.session;
            
            if (!user || !session) {
                throw new Error('Please log in to continue');
            }

            const timezoneInfo = this.getCurrentTimestampWithTimezone();
            
            const requestBody = {
                profile_url: profileUrl,
                analysis_type: analysisType,
                business_id: businessId || null,
                user_id: user.id,
                platform: 'instagram',
                timezone: timezoneInfo.timezone,
                user_local_time: timezoneInfo.local_time,
                request_timestamp: timezoneInfo.timestamp
            };
            
            const result = await window.OsliraApp.apiRequest('/analyze', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });
            
            window.OsliraApp.showMessage('Analysis completed successfully!', 'success');
            this.closeModal('analysisModal');
            
            // Refresh dashboard data
            await this.loadDashboardData();
            await this.refreshCreditsDisplay();
            
        } catch (error) {
            console.error('Analysis error:', error);
            window.OsliraApp.showMessage(`Analysis failed: ${error.message}`, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validateUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
        const hasConsecutivePeriods = /\.{2,}/.test(username);
        const startsOrEndsWithPeriod = /^\./.test(username) || /\.$/.test(username);
        
        return usernameRegex.test(username) && !hasConsecutivePeriods && !startsOrEndsWithPeriod;
    }

    getCurrentTimestampWithTimezone() {
        const timezone = window.OsliraApp.getUserTimezone();
        const now = new Date();
        
        return {
            timestamp: now.toISOString(),
            timezone: timezone,
            local_time: now.toLocaleString('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };
    }

    // =============================================================================
    // LEAD MANAGEMENT
    // =============================================================================

    toggleLeadSelection(leadId) {
        if (this.selectedLeads.has(leadId)) {
            this.selectedLeads.delete(leadId);
        } else {
            this.selectedLeads.add(leadId);
        }
        
        this.updateBulkActionsVisibility();
        this.updateSelectAllButton();
        
        const row = document.querySelector(`tr[data-lead-id="${leadId}"]`);
        if (row) {
            row.classList.toggle('selected', this.selectedLeads.has(leadId));
        }
    }

    selectAllLeads() {
        const visibleLeads = this.allLeads.filter(lead => {
            const row = document.querySelector(`tr[data-lead-id="${lead.id}"]`);
            return row && row.style.display !== 'none';
        });
        
        if (this.selectedLeads.size === visibleLeads.length) {
            this.selectedLeads.clear();
        } else {
            this.selectedLeads.clear();
            visibleLeads.forEach(lead => this.selectedLeads.add(lead.id));
        }
        
        document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
            const leadId = checkbox.dataset.leadId;
            checkbox.checked = this.selectedLeads.has(leadId);
            
            const row = checkbox.closest('tr');
            if (row) {
                row.classList.toggle('selected', this.selectedLeads.has(leadId));
            }
        });
        
        this.updateBulkActionsVisibility();
        this.updateSelectAllButton();
    }

    clearSelection() {
        this.selectedLeads.clear();
        
        document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            const row = checkbox.closest('tr');
            if (row) {
                row.classList.remove('selected');
            }
        });
        
        this.updateBulkActionsVisibility();
        this.updateSelectAllButton();
    }

    updateBulkActionsVisibility() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (bulkActions && selectedCount) {
            if (this.selectedLeads.size > 0) {
                bulkActions.style.display = 'flex';
                selectedCount.textContent = this.selectedLeads.size;
            } else {
                bulkActions.style.display = 'none';
            }
        }
    }

    updateSelectAllButton() {
        const selectAllBtn = document.getElementById('select-all-btn');
        if (!selectAllBtn) return;
        
        const visibleLeads = document.querySelectorAll('.lead-checkbox').length;
        const selectedCount = this.selectedLeads.size;
        
        if (selectedCount === 0) {
            selectAllBtn.innerHTML = '☑️ Select All';
        } else if (selectedCount === visibleLeads && visibleLeads > 0) {
            selectAllBtn.innerHTML = '☐ Deselect All';
        } else {
            selectAllBtn.innerHTML = `☑️ Select All (${selectedCount}/${visibleLeads})`;
        }
    }

    async bulkDeleteLeads() {
        const selectedCount = this.selectedLeads.size;
        
        if (selectedCount === 0) {
            window.OsliraApp.showMessage('No leads selected for deletion', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete ${selectedCount} lead${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`)) {
            return;
        }
        
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            window.OsliraApp.showMessage('Database not available', 'error');
            return;
        }
        
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        const originalText = bulkDeleteBtn.innerHTML;
        bulkDeleteBtn.innerHTML = '🔄 Deleting...';
        bulkDeleteBtn.disabled = true;
        
        try {
            const leadIds = Array.from(this.selectedLeads);
            
            // Delete analyses first
            await supabase
                .from('lead_analyses')
                .delete()
                .in('lead_id', leadIds)
                .eq('user_id', user.id);
            
            // Delete leads
            const { error } = await supabase
                .from('leads')
                .delete()
                .in('id', leadIds)
                .eq('user_id', user.id);
            
            if (error) throw error;
            
            window.OsliraApp.showMessage(`Successfully deleted ${selectedCount} lead${selectedCount > 1 ? 's' : ''}`, 'success');
            
            // Clear selection and refresh
            this.selectedLeads.clear();
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Bulk deletion failed:', error);
            window.OsliraApp.showMessage(`Deletion failed: ${error.message}`, 'error');
        } finally {
            bulkDeleteBtn.innerHTML = originalText;
            bulkDeleteBtn.disabled = false;
        }
    }

    async viewLead(leadId) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            window.OsliraApp.showMessage('Unable to load lead details', 'error');
            return;
        }
        
        const modal = document.getElementById('leadModal');
        const detailsContainer = document.getElementById('leadDetails');
        
        if (!modal || !detailsContainer) return;
        
        detailsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 24px; margin-bottom: 12px;">🔄</div>
                <p>Loading lead details...</p>
            </div>
        `;
        modal.style.display = 'flex';
        
        try {
            const { data: lead, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    lead_analyses (*)
                `)
                .eq('id', leadId)
                .eq('user_id', user.id)
                .single();
            
            if (error) throw error;
            if (!lead) throw new Error('Lead not found');
            
            detailsContainer.innerHTML = this.buildLeadDetailsHTML(lead);
            
        } catch (error) {
            console.error('Error loading lead:', error);
            detailsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 24px; margin-bottom: 12px; color: var(--error);">❌</div>
                    <h3 style="color: var(--error);">Unable to Load Lead</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    buildLeadDetailsHTML(lead) {
        const analysis = lead.lead_analyses?.[0] || {};
        const hasAnalysisData = analysis && Object.keys(analysis).length > 0;
        const analysisType = lead.type || (hasAnalysisData ? 'deep' : 'light');
        const score = lead.score || 0;
        const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
        
        return `
            <div class="profile-header" style="display: flex; align-items: center; gap: 20px; padding: 24px; background: linear-gradient(135deg, var(--bg-light), #E8F3FF); border-radius: 12px; margin-bottom: 24px;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 32px;">
                    ${(lead.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; font-size: 24px;">@${lead.username}</h4>
                    <a href="${lead.profile_url}" target="_blank" style="color: var(--primary-blue); text-decoration: none; font-weight: 500;">
                        View on ${lead.platform || 'Instagram'} 🔗
                    </a>
                </div>
                <div style="text-align: right;">
                    <span class="score-badge ${scoreClass}" style="font-size: 24px; padding: 12px 16px;">
                        ${score}/100
                    </span>
                    <div style="margin-top: 12px;">
                        <span class="status ${analysisType}">${analysisType === 'deep' ? 'Deep Analysis' : 'Light Analysis'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-grid">
                <div class="detail-section">
                    <h4>📋 Profile Information</h4>
                    <div class="detail-row">
                        <div class="detail-label">Platform:</div>
                        <div class="detail-value">${lead.platform || 'Instagram'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Score:</div>
                        <div class="detail-value"><strong>${score}/100</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Created:</div>
                        <div class="detail-value">${window.OsliraApp.formatDate(lead.created_at)}</div>
                    </div>
                </div>
                
                ${hasAnalysisData ? `
                    <div class="detail-section">
                        <h4>📊 Analysis Results</h4>
                        <div class="detail-row">
                            <div class="detail-label">Engagement Score:</div>
                            <div class="detail-value">${analysis.engagement_score || 'N/A'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Niche Fit:</div>
                            <div class="detail-value">${analysis.score_niche_fit || 'N/A'}</div>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            ${analysis.outreach_message ? `
                <div style="background: linear-gradient(135deg, var(--bg-light), #E8F3FF); padding: 24px; border-radius: 12px; margin-top: 24px;">
                    <h4 style="margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
                        💬 Personalized Outreach Message
                        <button onclick="window.OsliraApp.copyText('${analysis.outreach_message.replace(/'/g, "\\'")}')" 
                                style="background: var(--primary-blue); color: white; border: none; padding: 10px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600;">
                            📋 Copy Message
                        </button>
                    </h4>
                    <div style="background: rgba(255, 255, 255, 0.9); padding: 18px; border-radius: 8px;">
                        "${analysis.outreach_message}"
                    </div>
                </div>
            ` : ''}
        `;
    }

    // =============================================================================
    // INSIGHTS & ANALYTICS
    // =============================================================================

    async generateInsights() {
        const container = document.getElementById('insights-container');
        const loading = document.getElementById('loading-insights');
        
        if (!container || !loading) return;
        
        container.style.display = 'none';
        loading.style.display = 'block';
        
        try {
            const supabase = window.OsliraApp.supabase;
            const user = window.OsliraApp.user;
            
            if (!supabase || !user) {
                setTimeout(() => {
                    this.renderWelcomeInsights();
                    loading.style.display = 'none';
                    container.style.display = 'grid';
                }, 1500);
                return;
            }
            
            // Load user's data
            const { data: leads } = await supabase
                .from('leads')
                .select('*')
                .eq('user_id', user.id);
            
            const { data: userData } = await supabase
                .from('users')
                .select('credits, subscription_plan')
                .eq('id', user.id)
                .single();
            
            let insights = [];
            
            if (!leads || leads.length === 0) {
                insights.push({
                    type: 'welcome',
                    icon: '🚀',
                    title: 'Welcome to Oslira!',
                    content: 'Start researching leads to unlock AI-powered insights and recommendations tailored to your data.',
                    cta: 'Research Your First Lead',
                    actionType: 'function',
                    actionValue: 'showAnalysisModal'
                });
            } else {
                // Calculate metrics
                const totalLeads = leads.length;
                const leadsWithScores = leads.filter(lead => lead.score !== null && lead.score !== undefined);
                const avgScore = leadsWithScores.length > 0 
                    ? leadsWithScores.reduce((sum, lead) => sum + lead.score, 0) / leadsWithScores.length 
                    : 0;
                const highValueLeads = leads.filter(lead => (lead.score || 0) >= 80).length;
                
                // Generate insights based on performance
                if (avgScore >= 70) {
                    insights.push({
                        type: 'performance',
                        icon: '🎯',
                        title: 'Excellent Lead Quality!',
                        content: `Your average lead score of ${Math.round(avgScore)} shows you're targeting high-quality prospects.`,
                        metrics: [
                            { label: 'Average Score', value: `${Math.round(avgScore)}/100` },
                            { label: 'High-Value Rate', value: `${Math.round((highValueLeads/totalLeads)*100)}%` }
                        ]
                    });
                }
                
                const plan = userData?.subscription_plan || 'free';
                if (plan === 'free') {
                    insights.push({
                        type: 'recommendation',
                        icon: '⬆️',
                        title: 'Upgrade Recommended',
                        content: 'Unlock unlimited monthly credits and advanced features with a paid subscription plan.',
                        cta: 'View Plans',
                        actionType: 'url',
                        actionValue: '/subscription.html'
                    });
                }
            }
            
            setTimeout(() => {
                this.renderInsights(insights);
                loading.style.display = 'none';
                container.style.display = 'grid';
            }, 1500);
            
        } catch (error) {
            console.error('Error generating insights:', error);
            setTimeout(() => {
                loading.style.display = 'none';
                container.style.display = 'grid';
                container.innerHTML = `
                    <div class="insight-card warning">
                        <div class="insight-icon">❌</div>
                        <h3>Error Loading Insights</h3>
                        <p>Unable to generate insights at this time. Please try again later.</p>
                    </div>
                `;
            }, 1500);
        }
    }

    renderWelcomeInsights() {
        const insights = [
            {
                type: 'welcome',
                icon: '🚀',
                title: 'Welcome to Oslira!',
                content: 'Start researching leads to unlock AI-powered insights and recommendations tailored to your data.',
                cta: 'Research Your First Lead',
                actionType: 'function',
                actionValue: 'showAnalysisModal'
            }
        ];
        this.renderInsights(insights);
    }

    renderInsights(insights) {
        const container = document.getElementById('insights-container');
        
        container.innerHTML = insights.map((insight, index) => `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">${insight.icon}</div>
                <h3>${insight.title}</h3>
                <p>${insight.content}</p>
                
                ${insight.metrics ? insight.metrics.map(metric => `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0; padding: 8px 12px; background: rgba(255, 255, 255, 0.7); border-radius: 6px;">
                        <span style="font-weight: 600; color: var(--text-primary);">${metric.label}:</span>
                        <span style="font-weight: 700; color: var(--primary-blue);">${metric.value}</span>
                    </div>
                `).join('') : ''}
                
                ${insight.cta ? `
                    <button class="insight-cta" 
                            data-action-type="${insight.actionType}"
                            data-action-value="${insight.actionValue}"
                            style="margin-top: 16px; background: var(--primary-blue); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        ${insight.cta}
                    </button>
                ` : ''}
            </div>
        `).join('');
        
        // Add event listeners
        container.querySelectorAll('.insight-cta').forEach((button) => {
            button.addEventListener('click', () => {
                const actionType = button.getAttribute('data-action-type');
                const actionValue = button.getAttribute('data-action-value');
                
                if (actionType === 'function' && actionValue === 'showAnalysisModal') {
                    this.showAnalysisModal();
                } else if (actionType === 'url') {
                    window.location.href = actionValue;
                }
            });
        });
    }

    // =============================================================================
    // BULK UPLOAD
    // =============================================================================

    showBulkUpload() {
        const modal = document.getElementById('bulkModal');
        if (!modal) return;
        
        // Update modal content
        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="modal-close" onclick="dashboard.closeModal('bulkModal')">×</button>
            <h3>📤 Import CSV for Bulk Analysis</h3>
            <p style="margin-bottom: 20px; color: var(--text-secondary);">Upload a CSV file with Instagram usernames for batch analysis</p>
            
            <div class="form-group">
                <label>📋 Simple CSV Format:</label>
                <div style="background: var(--bg-light); padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; margin-bottom: 16px;">
                    nasa<br>
                    instagram<br>
                    spacex
                </div>
            </div>
            
            <div class="form-group">
                <label for="csv-file">Choose CSV File:</label>
                <input type="file" id="csv-file" accept=".csv" onchange="dashboard.handleCSVUpload(event)">
                <div id="csv-preview" style="display: none; margin-top: 12px;"></div>
            </div>
            
            <div class="form-group">
                <label for="bulk-analysis-type">Analysis Type:</label>
                <select id="bulk-analysis-type" onchange="dashboard.updateCreditCostDisplay()">
                    <option value="light">⚡ Light Analysis (1 credit each)</option>
                    <option value="deep">🔍 Deep Analysis (2 credits each)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="bulk-business-id">Business Profile:</label>
                <select id="bulk-business-id">
                    <option value="">Select business profile...</option>
                </select>
            </div>
            
            <button id="process-csv-btn" class="primary-btn" onclick="dashboard.processBulkAnalysis()" disabled>
                🚀 Start Bulk Analysis
            </button>
        `;
        
        // Populate business profiles
        this.populateBulkBusinessProfiles();
        modal.style.display = 'flex';
    }

    handleCSVUpload(event) {
        const file = event.target.files[0];
        const processBtn = document.getElementById('process-csv-btn');
        const previewDiv = document.getElementById('csv-preview');
        
        if (!file) {
            processBtn.disabled = true;
            previewDiv.style.display = 'none';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            this.csvData = lines.map(line => ({
                username: line.split(',')[0].trim().replace(/"/g, '').replace('@', '')
            })).filter(row => row.username && row.username.length > 0);
            
            if (this.csvData.length > 0) {
                previewDiv.innerHTML = `<p>Found ${this.csvData.length} usernames</p>`;
                previewDiv.style.display = 'block';
                processBtn.disabled = false;
                this.updateCreditCostDisplay();
            }
        };
        reader.readAsText(file);
    }

    updateCreditCostDisplay() {
        const analysisType = document.getElementById('bulk-analysis-type').value;
        const creditsPerLead = analysisType === 'deep' ? 2 : 1;
        const totalCredits = this.csvData.length * creditsPerLead;
        
        const processBtn = document.getElementById('process-csv-btn');
        if (processBtn && this.csvData.length > 0) {
            processBtn.innerHTML = `🚀 Analyze ${this.csvData.length} Profiles (${totalCredits} credits)`;
        }
    }

    async processBulkAnalysis() {
        if (!this.csvData || this.csvData.length === 0) {
            window.OsliraApp.showMessage('No CSV data to process', 'error');
            return;
        }
        
        window.OsliraApp.showMessage('Bulk analysis starting... This feature will be enhanced in the next update.', 'info');
        this.closeModal('bulkModal');
    }

    populateBulkBusinessProfiles() {
        const select = document.getElementById('bulk-business-id');
        if (!select) return;
        
        const businesses = window.OsliraApp.businesses;
        select.innerHTML = '<option value="">Select business profile...</option>';
        businesses.forEach(business => {
            const option = document.createElement('option');
            option.value = business.id;
            option.textContent = business.business_name;
            select.appendChild(option);
        });
        
        if (window.OsliraApp.business) {
            select.value = window.OsliraApp.business.id;
        }
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    async exportLeads() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            window.OsliraApp.showMessage('Export not available in demo mode', 'error');
            return;
        }
        
        try {
            const { data: leads, error } = await supabase
                .from('leads')
                .select('*, lead_analyses (*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (!leads || leads.length === 0) {
                window.OsliraApp.showMessage('No leads to export', 'error');
                return;
            }
            
            const headers = ['Username', 'Profile URL', 'Score', 'Type', 'Platform', 'Created Date'];
            const csvContent = [
                headers.join(','),
                ...leads.map(lead => {
                    const analysisType = lead.type || 'light';
                    return [
                        lead.username,
                        lead.profile_url,
                        lead.score || 0,
                        analysisType,
                        lead.platform || 'Instagram',
                        new Date(lead.created_at).toLocaleDateString()
                    ].join(',');
                })
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `oslira-leads-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            window.OsliraApp.showMessage('Leads exported successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            window.OsliraApp.showMessage('Failed to export leads: ' + error.message, 'error');
        }
    }

    async refreshActivity() {
        const btn = document.getElementById('refresh-activity-btn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '🔄 Loading...';
            btn.disabled = true;
            
            try {
                await this.loadDashboardData();
                window.OsliraApp.showMessage('Data refreshed successfully', 'success');
            } catch (error) {
                console.error('Refresh failed:', error);
                window.OsliraApp.showMessage('Failed to refresh data', 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    }

    async refreshCreditsDisplay() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) return;
        
        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('subscription_plan, subscription_status, credits')
                .eq('id', user.id)
                .single();

            if (error) {
                console.warn('Error refreshing credits:', error);
                return;
            }

            this.updateSubscriptionUI(userData.subscription_plan, userData.subscription_status, userData.credits);
            
        } catch (error) {
            console.error('Error refreshing credits:', error);
        }
    }

    switchBusiness() {
        const businessSelect = document.getElementById('business-select');
        const selectedBusinessId = businessSelect.value;
        
        if (selectedBusinessId) {
            window.OsliraApp.business = window.OsliraApp.businesses.find(b => b.id === selectedBusinessId);
            this.loadDashboardData();
            
            const modalSelect = document.getElementById('business-id');
            if (modalSelect) modalSelect.value = selectedBusinessId;
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
        
        if (modalId === 'analysisModal') {
            const form = document.getElementById('analysisForm');
            if (form) form.reset();
            
            const inputContainer = document.getElementById('input-field-container');
            if (inputContainer) inputContainer.style.display = 'none';
        }
    }

    handleModalClick(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    handleKeyboardShortcuts(event) {
        if (event.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                openModal.style.display = 'none';
            }
        }
        
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.showAnalysisModal();
        }
    }
}

// =============================================================================
// INITIALIZE DASHBOARD
// =============================================================================

// Create global dashboard instance
const dashboard = new OsliraDashboard();

// Make dashboard available globally for onclick handlers
window.dashboard = dashboard;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    dashboard.initialize();
});

console.log('📊 Simplified Dashboard loaded - uses shared-core.js');
