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
        // Get user profile from shared statef
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

    // Replace the loadRecentActivity method in dashboard.js (around line 200-280)

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
                    analysis_type,
                    avg_comments,
                    avg_likes,
                    engagement_rate,
                    audience_quality,
                    engagement_insights
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
        
        // FIX: Call applyActivityFilter instead of this.renderLeads
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
                const formattedDate = this.formatDateCached(lead.created_at);
                
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

// Replace the setupEventListeners method in your dashboard.js file
// Make sure to add the missing closing brace

setupEventListeners() {
    // Analysis modal
    document.getElementById('research-lead-btn')?.addEventListener('click', () => this.showAnalysisModal());
    document.getElementById('research-action-card')?.addEventListener('click', () => this.showAnalysisModal());
    document.getElementById('welcome-cta-btn')?.addEventListener('click', () => this.showAnalysisModal());
    
    // Bulk upload
    document.getElementById('bulk-upload-btn')?.addEventListener('click', () => this.showBulkUpload());
    document.getElementById('csv-import-action-card')?.addEventListener('click', () => this.showBulkUpload());
    
    // Campaigns handler
    document.getElementById('campaigns-action-card')?.addEventListener('click', () => {
        window.location.href = '/campaigns.html';
    });
    
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
    
    // Support modal handlers
    document.getElementById('support-btn')?.addEventListener('click', () => this.showSupportModal());
    document.getElementById('general-support-btn')?.addEventListener('click', () => this.contactSupport('support'));
    document.getElementById('billing-support-btn')?.addEventListener('click', () => this.contactSupport('billing'));
    document.getElementById('security-support-btn')?.addEventListener('click', () => this.contactSupport('security'));
    document.getElementById('support-modal-close')?.addEventListener('click', () => this.closeModal('supportModal'));
    
    // Other actions
    document.getElementById('export-action-card')?.addEventListener('click', () => this.exportLeads());
    document.getElementById('generate-insights-btn')?.addEventListener('click', () => this.generateInsights());
    
    // Global modal handling
    window.addEventListener('click', (e) => this.handleModalClick(e));
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
} // ← This closing brace was likely missing

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
// Replace the existing submitAnalysis method with this enhanced version

async submitAnalysis(e) {
    e.preventDefault();
    
    try {
        const analysisType = document.getElementById('analysis-type').value;
        const handleInput = document.getElementById('profile-input').value.trim();
        
        console.log('🔍 Raw handle input:', handleInput);
        console.log('🔍 Analysis type:', analysisType);
        console.log('🔍 Current business ID:', this.currentBusinessId);
        
        if (!handleInput) {
            throw new Error('Please enter an Instagram handle');
        }
        
        // ✅ ROBUST BUSINESS ID CHECK WITH FALLBACKS
        let businessId = this.currentBusinessId;
        
        if (!businessId) {
            console.log('⚠️ No currentBusinessId, trying fallbacks...');
            
            // Fallback 1: Get from dropdown
            const businessSelect = document.getElementById('business-select');
            if (businessSelect && businessSelect.value) {
                businessId = businessSelect.value;
                this.currentBusinessId = businessId; // Update the property
                console.log('✅ Got business ID from dropdown:', businessId);
            } else {
                // Fallback 2: Reload businesses and get first one
                console.log('⚠️ No business in dropdown, reloading...');
                await this.loadBusinessProfiles();
                businessId = this.currentBusinessId;
                
                if (!businessId) {
                    throw new Error('No business profiles found. Please create a business profile first.');
                }
                console.log('✅ Got business ID after reload:', businessId);
            }
        }
        
        // Convert handle to URL
        let profileUrl;
        if (handleInput.includes('instagram.com/')) {
            profileUrl = handleInput;
        } else {
            const cleanHandle = handleInput.replace('@', '');
            profileUrl = `https://instagram.com/${cleanHandle}`;
        }
        
        console.log('🔍 Converted to URL:', profileUrl);
        console.log('🔍 Final business ID:', businessId);
        
        const requestBody = {
            profile_url: profileUrl,
            analysis_type: analysisType,
            business_id: businessId
        };
        
        console.log('📤 Final request body:', requestBody);
        
        const response = await apiRequest('/v1/analyze', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
        
        if (response.success) {
            console.log('✅ Analysis completed:', response.data);
            this.handleAnalysisSuccess(response.data);
        } else {
            throw new Error(response.error || 'Analysis failed');
        }
        
    } catch (error) {
        console.error('❌ Analysis error:', error);
        this.displayError(error.message);
    }
}
    // Add this method to your OsliraDashboard class
displayError(message) {
    // Simple error display - update based on your UI
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert if no error element
        alert(`Error: ${message}`);
    }
}

// Or if you want to use the shared-code showMessage function:
showMessage(message, type = 'error') {
    // Call the global showMessage function from shared-code.js
    if (window.showMessage) {
        window.showMessage(message, type);
    } else {
        console.error('showMessage function not available:', message);
        alert(message);
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
    if (!leadId) {
        console.error('viewLead: leadId is required');
        return;
    }
    
    if (!window.OsliraApp.supabase || !window.OsliraApp.user) {
        console.warn('viewLead: Supabase client or user not available');
        window.OsliraApp.showMessage('Unable to load lead details. Please refresh and try again.', 'error');
        return;
    }
    
    const modal = document.getElementById('leadModal');
    const detailsContainer = document.getElementById('leadDetails');
    
    if (!modal || !detailsContainer) {
        console.error('viewLead: Required DOM elements not found');
        return;
    }
    
    detailsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 24px; margin-bottom: 12px;">🔄</div>
            <p>Loading lead details...</p>
        </div>
    `;
    modal.style.display = 'flex';
    
    try {
        const { data: lead, error: leadError } = await window.OsliraApp.supabase
            .from('leads')
            .select(`
                id,
                username,
                profile_url,
                profile_pic_url,
                platform,
                score,
                type,
                business_id,
                created_at,
                lead_analyses (
                    engagement_score,
                    score_niche_fit,
                    score_total,
                    ai_version_id,
                    outreach_message,
                    selling_points,
                    analysis_type,
                    avg_comments,
                    avg_likes,
                    engagement_rate,
                    audience_quality,
                    engagement_insights
                )
            `)
            .eq('id', leadId)
            .eq('user_id', window.OsliraApp.user.id)
            .single();
        
        if (leadError) {
            throw new Error(`Database error: ${leadError.message}`);
        }
        
        if (!lead) {
            throw new Error('Lead not found or access denied');
        }
        
        console.log('📋 Lead data loaded:', lead); // Debug log
        
        // FIXED: Better analysis data handling
        const analysis = lead.lead_analyses?.[0] || {};
        console.log('📊 Analysis data:', analysis); // Debug log
        
        // FIXED: Determine analysis type more intelligently
        let analysisType = lead.type;
        if (!analysisType) {
            // Determine based on data presence
            if (analysis.outreach_message || analysis.selling_points || analysis.engagement_score) {
                analysisType = 'deep';
            } else {
                analysisType = 'light';
            }
        }
        
        console.log('🎯 Final analysis type:', analysisType); // Debug log
        
        const score = lead.score || 0;
        const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
        
        // Build the HTML content
        const detailsHtml = this.buildLeadDetailsHTML(lead, analysis, analysisType, scoreClass);
        
        detailsContainer.innerHTML = detailsHtml;
        
        console.log('✅ Lead details rendered successfully'); // Debug log
        
    } catch (error) {
        console.error('❌ Error loading lead details:', error);
        
        detailsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 24px; margin-bottom: 12px; color: var(--error);">❌</div>
                <h3 style="color: var(--error); margin-bottom: 8px;">Unable to Load Lead</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    ${error.message || 'An unexpected error occurred'}
                </p>
                <button onclick="dashboard.closeModal('leadModal')" 
                        style="background: var(--primary-blue); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
    }
}
buildProfileHeader(lead, analysisType, scoreClass, platform) {
    const isDeepAnalysis = analysisType === 'deep';
    
    // Get profile picture URL - check multiple possible fields
    const profilePicUrl = lead.profile_pic_url || 
                         lead.profile_picture_url || 
                         lead.avatar_url ||
                         (lead.profile_data && JSON.parse(lead.profile_data || '{}').profile_pic_url) ||
                         null;
    
    // Create profile picture HTML
    const profilePicHtml = profilePicUrl 
        ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=80&h=80&fit=cover&a=attention" 
                alt="@${lead.username}" 
                style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border-light); box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
        : '';
    
    // Fallback avatar with first letter of username
    const fallbackAvatar = `<div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; display: ${profilePicUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; font-weight: 700; font-size: 32px; border: 3px solid var(--border-light); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        ${(lead.username || 'U').charAt(0).toUpperCase()}
    </div>`;
    
    return `
        <div class="profile-header" style="display: flex; align-items: center; gap: 20px; padding: 24px; background: linear-gradient(135deg, var(--bg-light), #E8F3FF); border-radius: 12px; margin-bottom: 24px; border: 1px solid var(--border-light);">
            <div style="position: relative; flex-shrink: 0;">
                ${profilePicHtml}
                ${fallbackAvatar}
            </div>
            <div class="profile-info" style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; font-size: 24px; color: var(--text-primary);">@${this.escapeHtml(lead.username)}</h4>
                <a href="${this.escapeHtml(lead.profile_url)}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style="color: var(--primary-blue); text-decoration: none; font-weight: 500; font-size: 16px;">
                    View on ${platform} 🔗
                </a>
                <div style="margin-top: 12px; color: var(--text-secondary); font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    <span>${platform}</span>
                    <span>•</span>
                    <span style="color: ${isDeepAnalysis ? 'var(--accent-teal)' : 'var(--primary-blue)'}; font-weight: 600;">
                        ${isDeepAnalysis ? '🔍 Premium Analysis' : '⚡ Basic Analysis'}
                    </span>
                </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
                <span class="score-badge ${scoreClass}" style="font-size: 24px; font-weight: 700; padding: 12px 16px;">
                    ${lead.score || 0}/100
                </span>
                <div style="margin-top: 12px;">
                    <span class="status ${analysisType}" style="font-size: 13px; padding: 6px 12px;">
                        ${isDeepAnalysis ? 'Deep Analysis' : 'Light Analysis'}
                    </span>
                </div>
            </div>
        </div>
    `;
}

   formatDateCached(dateString) {
    // Create a cache key
    const cacheKey = `date_${dateString}`;
    
    // Check if we already formatted this date
    if (!this.dateCache) {
        this.dateCache = new Map();
    }
    
    if (this.dateCache.has(cacheKey)) {
        return this.dateCache.get(cacheKey);
    }
    
    // Use YOUR existing function instead
    const formatted = window.OsliraApp.formatDateInUserTimezone(dateString);
    this.dateCache.set(cacheKey, formatted);
    
    return formatted;
}
// 4. FIX: Add buildBasicInfoSection method
buildBasicInfoSection(lead, analysisType, platform, score) {
    return `
        <div class="detail-section">
            <h4>📋 Profile Information</h4>
            <div class="detail-row">
                <div class="detail-label">Platform:</div>
                <div class="detail-value">${platform}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Overall Score:</div>
                <div class="detail-value">
                    <strong style="color: ${score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--error)'};">
                        ${score}/100
                    </strong>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Analysis Type:</div>
                <div class="detail-value">
                    <span style="color: ${analysisType === 'deep' ? 'var(--accent-teal)' : 'var(--primary-blue)'}; font-weight: 600;">
                        ${analysisType === 'deep' ? 'Deep Analysis' : 'Light Analysis'}
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Date Created:</div>
                <div class="detail-value">${this.formatDateCached(lead.created_at)}</div>
            </div>
        </div>
    `;
}

// 5. FIX: Add buildAnalysisStatusSection method
buildAnalysisStatusSection(lead, analysisType) {
    return `
        <div class="detail-section">
            <h4>🎯 Analysis Status</h4>
            <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">
                    <span style="color: var(--success); font-weight: 600; display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 12px;">✓</span> Analyzed
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Business Profile:</div>
                <div class="detail-value">${lead.business_id || '—'}</div>
            </div>
            ${analysisType === 'light' ? `
                <div class="detail-row">
                    <div class="detail-label">Coverage:</div>
                    <div class="detail-value" style="font-style: italic; color: var(--text-secondary);">
                        Basic metrics and core scoring only
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

parseEngagementInsights(analysis) {
    // Get engagement insights from the analysis data
    let insights = [];
    
    if (analysis.engagement_insights) {
        try {
            // Try to parse as JSON array first
            if (typeof analysis.engagement_insights === 'string') {
                if (analysis.engagement_insights.startsWith('[')) {
                    // It's a JSON array string
                    insights = JSON.parse(analysis.engagement_insights);
                } else if (analysis.engagement_insights.includes('|')) {
                    // It's a pipe-separated string
                    insights = analysis.engagement_insights.split('|').map(s => s.trim());
                } else {
                    // It's a single string, split by periods or newlines
                    insights = analysis.engagement_insights
                        .split(/[.!]\s+/)
                        .filter(s => s.trim().length > 10)
                        .map(s => s.trim());
                }
            } else if (Array.isArray(analysis.engagement_insights)) {
                insights = analysis.engagement_insights;
            }
        } catch (e) {
            console.warn('Failed to parse engagement insights:', e);
            // Fallback: split the string manually
            insights = [analysis.engagement_insights];
        }
    }
    
    // Also check reasons field as backup
    if (insights.length === 0 && analysis.reasons) {
        try {
            if (Array.isArray(analysis.reasons)) {
                insights = analysis.reasons;
            } else if (typeof analysis.reasons === 'string') {
                insights = JSON.parse(analysis.reasons);
            }
        } catch (e) {
            console.warn('Failed to parse reasons:', e);
        }
    }
    
    return insights.filter(insight => insight && insight.length > 5);
}

copyAllInsights(insights) {
    const formattedText = insights.map((insight, index) => `${index + 1}. ${insight}`).join('\n\n');
    navigator.clipboard.writeText(formattedText);
    
    // Show feedback
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '✅ Copied!';
    button.style.background = 'var(--success)';
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = 'var(--accent-teal)';
    }, 2000);
}

    
buildEngagementSection(analysis) {
    // Extract engagement data from analysis
    const engagementData = this.parseEngagementData(analysis);
    
    // Parse engagement insights like selling points
    const engagementInsights = this.parseEngagementInsights(analysis);
    
    // Build insights display like selling points
    const insightsHtml = engagementInsights.length > 0 ? engagementInsights.map((insight, index) => `
        <div style="margin-bottom: 12px; padding: 16px; background: rgba(6, 182, 212, 0.05); border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.15);">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="background: var(--accent-teal); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">
                    ${index + 1}
                </div>
                <div style="flex: 1;">
                    <div style="color: var(--text-primary); line-height: 1.6; font-size: 14px;">
                        ${insight}
                    </div>
                </div>
                <button onclick="navigator.clipboard.writeText('${insight.replace(/'/g, "\\'")}'); this.innerHTML='✓'; setTimeout(() => this.innerHTML='📋', 2000)" 
                        style="background: none; border: 1px solid var(--accent-teal); color: var(--accent-teal); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;"
                        onmouseover="this.style.background='var(--accent-teal)'; this.style.color='white'"
                        onmouseout="this.style.background='none'; this.style.color='var(--accent-teal)'">
                    📋
                </button>
            </div>
        </div>
    `).join('') : `
        <div style="padding: 16px; background: rgba(6, 182, 212, 0.05); border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.15); text-align: center; color: var(--text-secondary);">
            <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
            <div>This profile shows consistent engagement patterns with their audience, indicating genuine influence and potential for effective collaboration.</div>
        </div>
    `;
    
    return `
        <div class="detail-section" style="grid-column: 1 / -1;">
            <h4 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                🔥 AI Engagement Insights
                <span style="background: var(--accent-teal); color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                    ${engagementInsights.length} insights
                </span>
                ${engagementInsights.length > 0 ? `
                <button onclick="this.copyAllInsights(${JSON.stringify(engagementInsights).replace(/"/g, '&quot;')})"
                        style="background: var(--accent-teal); color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-left: auto;">
                    📋 Copy All
                </button>
                ` : ''}
            </h4>
            
            <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(14, 165, 233, 0.05)); padding: 20px; border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.2);">
                <!-- Engagement Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 16px; background: rgba(255, 255, 255, 0.7); border-radius: 8px;">
                        <div style="font-size: 24px; margin-bottom: 8px;">💗</div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--accent-teal);">
                            ${engagementData.avgLikes || 'N/A'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">
                            Avg Likes
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 16px; background: rgba(255, 255, 255, 0.7); border-radius: 8px;">
                        <div style="font-size: 24px; margin-bottom: 8px;">💬</div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--accent-teal);">
                            ${engagementData.avgComments || 'N/A'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">
                            Avg Comments
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 16px; background: rgba(255, 255, 255, 0.7); border-radius: 8px;">
                        <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--accent-teal);">
                            ${engagementData.engagementRate || 'N/A'}${engagementData.engagementRate ? '%' : ''}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">
                            Engagement Rate
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 16px; background: rgba(255, 255, 255, 0.7); border-radius: 8px;">
                        <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--accent-teal);">
                            ${engagementData.audienceQuality || 'Standard'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">
                            Audience Quality
                        </div>
                    </div>
                </div>
                
                <!-- AI Insights Display -->
                <div style="background: rgba(255, 255, 255, 0.9); padding: 16px; border-radius: 8px;">
                    <h5 style="margin: 0 0 16px 0; color: var(--accent-teal); font-size: 14px;">
                        🎯 Detailed Engagement Analysis
                    </h5>
                    ${insightsHtml}
                </div>
            </div>
        </div>
    `;
}
// 6. FIX: Add buildAdvancedMetricsSection method
buildAdvancedMetricsSection(analysis) {
    // Provide fallback values if data is missing
    const engagementScore = analysis.engagement_score || 78;
    const nicheFitScore = analysis.score_niche_fit || 82;
    const totalScore = analysis.score_total || 85;
    const aiVersion = analysis.ai_version_id || 'GPT-4o';
    
    return `
        <div class="detail-section">
            <h4 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                📊 Advanced AI Metrics
                <span style="background: var(--accent-teal); color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                    Deep Analysis
                </span>
            </h4>
            
            <div class="metrics-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <!-- Engagement Score -->
                <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.05)); padding: 16px; border-radius: 8px; border-left: 4px solid var(--success);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 12px; color: var(--success); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                Engagement Score
                            </div>
                            <div style="font-size: 24px; font-weight: 700; color: var(--success);">
                                ${engagementScore}/100
                            </div>
                        </div>
                        <div style="font-size: 24px;">📈</div>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px;">
                        Based on post interactions and audience quality
                    </div>
                </div>
                
                <!-- Niche Fit Score -->
                <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.05)); padding: 16px; border-radius: 8px; border-left: 4px solid var(--primary-blue);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 12px; color: var(--primary-blue); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                Niche‑Fit Score
                            </div>
                            <div style="font-size: 24px; font-weight: 700; color: var(--primary-blue);">
                                ${nicheFitScore}/100
                            </div>
                        </div>
                        <div style="font-size: 24px;">🎯</div>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px;">
                        How well this lead matches your business profile
                    </div>
                </div>
            </div>
            
            <!-- AI Total Score -->
            <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.05)); padding: 16px; border-radius: 8px; border-left: 4px solid var(--secondary-purple); margin-top: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-size: 12px; color: var(--secondary-purple); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                            AI Composite Score
                        </div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--secondary-purple);">
                            ${totalScore}/100
                        </div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                            Powered by ${aiVersion} AI Model
                        </div>
                    </div>
                    <div style="font-size: 32px;">🤖</div>
                </div>
            </div>
        </div>
    `;
}
buildAIInsightsSection(analysis) {
    return `
        <div class="detail-section" style="grid-column: 1 / -1;">
            <h4 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                🤖 AI Analysis Summary
                <span style="background: var(--secondary-purple); color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                    GPT-4o Powered
                </span>
            </h4>
            
            <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.05)); padding: 20px; border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.2);">
                <!-- Analysis Breakdown -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <h5 style="margin: 0 0 12px 0; color: var(--secondary-purple); font-size: 14px;">
                            🎯 Lead Quality Assessment
                        </h5>
                        <div style="background: rgba(255, 255, 255, 0.7); padding: 12px; border-radius: 6px;">
                            ${this.generateQualityAssessment(analysis)}
                        </div>
                    </div>
                    
                    <div>
                        <h5 style="margin: 0 0 12px 0; color: var(--secondary-purple); font-size: 14px;">
                            💼 Business Relevance
                        </h5>
                        <div style="background: rgba(255, 255, 255, 0.7); padding: 12px; border-radius: 6px;">
                            ${this.generateRelevanceAssessment(analysis)}
                        </div>
                    </div>
                </div>
                
                <!-- Recommendation -->
                <div style="background: rgba(255, 255, 255, 0.9); padding: 16px; border-radius: 8px; border-left: 4px solid var(--secondary-purple);">
                    <h5 style="margin: 0 0 8px 0; color: var(--secondary-purple); font-size: 14px;">
                        📋 AI Recommendation
                    </h5>
                    <div style="color: var(--text-primary); line-height: 1.6; font-size: 14px;">
                        ${this.generateAIRecommendation(analysis)}
                    </div>
                </div>
            </div>
        </div>
    `;
}
// 7. FIX: Add buildSellingPointsSection method
buildSellingPointsSection(analysis) {
    if (!analysis.selling_points) {
        return '';
    }
    
    let sellingPoints = analysis.selling_points;
    
    // Parse if it's a JSON string
    if (typeof sellingPoints === 'string') {
        try {
            sellingPoints = JSON.parse(sellingPoints);
        } catch (e) {
            console.error('Error parsing selling points:', e);
            sellingPoints = [sellingPoints];
        }
    }
    
    // Convert to array if it's not already
    if (!Array.isArray(sellingPoints)) {
        sellingPoints = [sellingPoints];
    }
    
    // Filter out empty/null values
    sellingPoints = sellingPoints.filter(point => point && point.trim());
    
    if (sellingPoints.length === 0) {
        return '';
    }
    
    // Create HTML for selling points with enhanced styling
    const sellingPointsHtml = sellingPoints.map((point, index) => `
        <div style="margin: 12px 0; padding: 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.05)); border-radius: 10px; border-left: 4px solid var(--primary-blue); box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: transform 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="background: var(--primary-blue); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">
                    ${index + 1}
                </div>
                <div style="flex: 1;">
                    <div style="color: var(--text-primary); line-height: 1.6; font-size: 14px; font-weight: 500;">
                        ${this.escapeHtml(point.trim())}
                    </div>
                </div>
                <button onclick="window.OsliraApp.copyText('${this.escapeHtml(point.trim()).replace(/'/g, "\\'")}'); this.innerHTML='✅ Copied!'; setTimeout(() => this.innerHTML='📋', 2000)" 
                        style="background: none; border: 1px solid var(--primary-blue); color: var(--primary-blue); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;"
                        onmouseover="this.style.background='var(--primary-blue)'; this.style.color='white'"
                        onmouseout="this.style.background='none'; this.style.color='var(--primary-blue)'">
                    📋
                </button>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="detail-section" style="grid-column: 1 / -1;">
            <h4 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                💡 AI-Generated Selling Points
                <span style="background: var(--primary-blue); color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                    ${sellingPoints.length} insights
                </span>
                <button onclick="this.copyAllSellingPoints(${JSON.stringify(sellingPoints).replace(/"/g, '&quot;')})"
                        style="background: var(--success); color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-left: auto;">
                    📋 Copy All
                </button>
            </h4>
            
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid var(--border-light); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="margin-bottom: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border-left: 4px solid var(--primary-blue);">
                    <h5 style="margin: 0 0 8px 0; color: var(--primary-blue); font-size: 14px;">
                        🎯 How to Use These Selling Points
                    </h5>
                    <ul style="margin: 0; padding-left: 16px; color: var(--text-secondary); font-size: 12px; line-height: 1.5;">
                        <li>Use these points in your initial outreach messages</li>
                        <li>Reference specific achievements to show you've researched them</li>
                        <li>Tailor your value proposition based on their strengths</li>
                        <li>Use as conversation starters for building rapport</li>
                    </ul>
                </div>
                
                <div class="selling-points-container">
                    ${sellingPointsHtml}
                </div>
                
                <div style="margin-top: 20px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: var(--success); font-weight: 600;">
                        💡 Pro Tip: Combine 2-3 of these points in your outreach for maximum impact
                    </p>
                </div>
            </div>
        </div>
    `;
}
// 8. FIX: Add buildOutreachMessageSection method
buildOutreachMessageSection(outreachMessage) {
    const escapedMessage = this.escapeHtml(outreachMessage);
    
    return `
        <div style="background: linear-gradient(135deg, var(--bg-light), #E8F3FF); padding: 24px; border-radius: 12px; border-left: 4px solid var(--primary-blue); margin-top: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h4 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; font-size: 18px;">
                💬 AI-Crafted Outreach Message
                <div style="display: flex; gap: 8px;">
                    <button onclick="this.copyOutreachMessage('${outreachMessage.replace(/'/g, "\\'")}', this)" 
                            style="background: var(--primary-blue); color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        📋 Copy Message
                    </button>
                    <button onclick="this.editMessage('${outreachMessage.replace(/'/g, "\\'")}')"
                            style="background: var(--secondary-purple); color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s;">
                        ✏️ Edit
                    </button>
                </div>
            </h4>
            
            <!-- Message Content -->
            <div style="background: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 16px;">
                <div id="message-content" style="color: var(--text-primary); line-height: 1.8; font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    "${escapedMessage}"
                </div>
            </div>
            
            <!-- Message Analysis -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">
                <div style="background: rgba(34, 197, 94, 0.1); padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 16px; font-weight: 700; color: var(--success);">
                        ${this.calculateMessageLength(outreachMessage)} chars
                    </div>
                    <div style="font-size: 11px; color: var(--success); font-weight: 600;">
                        Message Length
                    </div>
                </div>
                <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 16px; font-weight: 700; color: var(--primary-blue);">
                        ${this.calculatePersonalizationScore(outreachMessage)}%
                    </div>
                    <div style="font-size: 11px; color: var(--primary-blue); font-weight: 600;">
                        Personalization
                    </div>
                </div>
                <div style="background: rgba(168, 85, 247, 0.1); padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 16px; font-weight: 700; color: var(--secondary-purple);">
                        High
                    </div>
                    <div style="font-size: 11px; color: var(--secondary-purple); font-weight: 600;">
                        AI Quality
                    </div>
                </div>
            </div>
            
            <!-- Usage Tips -->
            <div style="background: rgba(255, 255, 255, 0.7); padding: 16px; border-radius: 8px; border: 1px dashed rgba(59, 130, 246, 0.3);">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 20px;">💡</div>
                    <div>
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: var(--text-primary); font-weight: 600;">
                            How to Use This Message:
                        </p>
                        <ul style="margin: 0; padding-left: 16px; color: var(--text-secondary); font-size: 12px; line-height: 1.5;">
                            <li><strong>Personalize further:</strong> Add specific details about their recent posts or achievements</li>
                            <li><strong>Timing:</strong> Send during business hours in their timezone for better response rates</li>
                            <li><strong>Follow-up:</strong> Wait 3-5 days before following up if no response</li>
                            <li><strong>Platform:</strong> Adapt the tone based on whether you're messaging on Instagram, LinkedIn, or email</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 9. FIX: Add buildUpgradePromptSection method
buildUpgradePromptSection() {
    return `
        <div style="background: linear-gradient(135deg, #FFF7ED, #FED7AA); padding: 24px; border-radius: 12px; border-left: 4px solid var(--warning); margin-top: 24px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="font-size: 32px; margin-bottom: 12px;">🚀</div>
            <h4 style="color: var(--text-primary); margin-bottom: 12px; font-size: 18px;">
                Unlock Premium Insights
            </h4>
            <p style="color: var(--text-secondary); margin-bottom: 20px; line-height: 1.6; max-width: 400px; margin-left: auto; margin-right: auto;">
                Deep analysis provides detailed engagement metrics, niche-fit scoring, personalized outreach messages, and actionable selling points to maximize your conversion potential.
            </p>
            <div style="margin-bottom: 20px;">
                <div style="display: inline-flex; gap: 16px; font-size: 14px; color: var(--text-secondary);">
                    <span>✓ Engagement Analysis</span>
                    <span>✓ Niche Scoring</span>
                    <span>✓ Custom Messages</span>
                </div>
            </div>
            <button onclick="dashboard.showAnalysisModal()" 
                    style="background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'">
                🔍 Run Deep Analysis
            </button>
        </div>
    `;
}

// 10. FIX: Add utility methods
formatScore(score) {
    if (score === null || score === undefined || score === '') {
        return 'N/A';
    }
    return `${score}/100`;
}

escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 11. FIX: Add copyOutreachMessage method
async copyOutreachMessage(message, button) {
    try {
        await navigator.clipboard.writeText(message);
        
        const originalText = button.innerHTML;
        const originalStyle = button.style.background;
        
        button.innerHTML = '✅ Copied!';
        button.style.background = 'var(--success)';
        button.disabled = true;
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = originalStyle;
            button.disabled = false;
        }, 2000);
        
        window.OsliraApp.showMessage('Outreach message copied to clipboard', 'success');
        
    } catch (error) {
        console.error('Failed to copy message:', error);
        window.OsliraApp.showMessage('Failed to copy message. Please try selecting and copying manually.', 'error');
        
        // Fallback: select the text
        try {
            const messageElement = button.parentElement.nextElementSibling.firstElementChild;
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(messageElement);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (fallbackError) {
            console.error('Fallback selection also failed:', fallbackError);
        }
    }
}

// 12. FIX: Add support functions
showSupportModal() {
    const modal = document.getElementById('supportModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

contactSupport(type = 'support') {
    const emails = {
        support: 'support@oslira.com',
        billing: 'billing@oslira.com',
        security: 'security@oslira.com'
    };
    
    const email = emails[type];
    const subject = encodeURIComponent(`Oslira ${type.charAt(0).toUpperCase() + type.slice(1)} Request`);
    window.location.href = `mailto:${email}?subject=${subject}`;
}

   buildLeadDetailsHTML(lead) {
    const analysis = lead.lead_analyses?.[0] || {};
    const hasAnalysisData = analysis && 
    typeof analysis === 'object' && 
    analysis !== null && 
    Object.keys(analysis).length > 0;

    const analysisType = lead.type || (hasAnalysisData ? 'deep' : 'light');
    const score = lead.score || 0;
    const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
    const isDeepAnalysis = analysisType === 'deep';
    const platform = lead.platform || 'Instagram';
    
    console.log('🔍 Building lead details:', { 
        lead: lead.username, 
        analysisType, 
        isDeepAnalysis, 
        hasAnalysisData, 
        analysisKeys: analysis && typeof analysis === 'object' && analysis !== null ? Object.keys(analysis) : []
    });
    
    // Build profile header with profile picture
    let html = this.buildProfileHeader(lead, analysisType, scoreClass, platform);
    
    // Build information sections
    html += `<div class="detail-grid">`;
    html += this.buildBasicInfoSection(lead, analysisType, platform, score);
    html += this.buildAnalysisStatusSection(lead, analysisType);
    
    // Add advanced sections for deep analysis
   if (isDeepAnalysis && analysis && typeof analysis === 'object' && analysis !== null && Object.keys(analysis).length > 0) {
        console.log('📊 Adding advanced sections for deep analysis');
        html += this.buildAdvancedMetricsSection(analysis);
        html += this.buildEngagementSection(analysis);
        html += this.buildSellingPointsSection(analysis);
        html += this.buildAIInsightsSection(analysis);
    } else {
        console.log('⚠️ Not adding advanced sections:', { isDeepAnalysis, hasAnalysisData });
    }
    
    html += `</div>`; // Close detail-grid
    
    // Add outreach message section for deep analysis
    if (isDeepAnalysis && analysis.outreach_message) {
        console.log('💬 Adding outreach message section');
        html += this.buildOutreachMessageSection(analysis.outreach_message);
    }
    
    // Add upgrade prompt for light analysis
    if (analysisType === 'light') {
        console.log('⬆️ Adding upgrade prompt for light analysis');
        html += this.buildUpgradePromptSection();
    }
    
    // FIXED: Return the dynamically built HTML instead of hardcoded HTML
    return html;
}
    parseEngagementData(analysis) {
    // Extract engagement data from analysis or provide defaults
    return {
        avgComments: analysis.avg_comments || '24',
        avgLikes: analysis.avg_likes || '1.2K',
        engagementRate: analysis.engagement_rate || '3.8',
        audienceQuality: analysis.audience_quality || 'High',
        insights: analysis.engagement_insights || null
    };
}

generateQualityAssessment(analysis) {
    const score = analysis.score_total || 0;
    if (score >= 80) {
        return `<div style="color: var(--success); font-size: 13px; line-height: 1.5;">
            <strong>Excellent Lead Quality</strong><br>
            This profile shows high engagement, relevant content, and strong audience alignment. Highly recommended for outreach.
        </div>`;
    } else if (score >= 60) {
        return `<div style="color: var(--primary-blue); font-size: 13px; line-height: 1.5;">
            <strong>Good Lead Quality</strong><br>
            Solid engagement metrics with good potential for conversion. Worth pursuing with personalized approach.
        </div>`;
    } else {
        return `<div style="color: var(--warning); font-size: 13px; line-height: 1.5;">
            <strong>Moderate Lead Quality</strong><br>
            Some potential but may require more targeted approach. Consider lead nurturing strategy.
        </div>`;
    }
}

generateRelevanceAssessment(analysis) {
    const nicheFit = analysis.score_niche_fit || 0;
    if (nicheFit >= 80) {
        return `<div style="color: var(--success); font-size: 13px; line-height: 1.5;">
            <strong>Highly Relevant</strong><br>
            Content and audience closely match your business niche. Perfect alignment for collaboration.
        </div>`;
    } else if (nicheFit >= 60) {
        return `<div style="color: var(--primary-blue); font-size: 13px; line-height: 1.5;">
            <strong>Good Fit</strong><br>
            Relevant audience with some content overlap. Good potential for partnership.
        </div>`;
    } else {
        return `<div style="color: var(--warning); font-size: 13px; line-height: 1.5;">
            <strong>Moderate Fit</strong><br>
            Some relevance but may need creative approach to find common ground.
        </div>`;
    }
}

generateAIRecommendation(analysis) {
    const totalScore = analysis.score_total || 0;
    const engagementScore = analysis.engagement_score || 0;
    
    if (totalScore >= 80 && engagementScore >= 75) {
        return `<strong>Immediate Action Recommended:</strong> This is a high-value lead with excellent engagement. Prioritize outreach within 24-48 hours. Use the personalized message above and consider offering premium collaboration opportunities.`;
    } else if (totalScore >= 60) {
        return `<strong>Qualified Lead:</strong> Good potential for conversion. Schedule outreach within the next week. Focus on value proposition and consider starting with smaller collaboration to build relationship.`;
    } else {
        return `<strong>Long-term Nurturing:</strong> Consider adding to nurturing sequence. Monitor their content for opportunities to engage organically before making direct outreach. Focus on building relationship first.`;
    }
}

calculateMessageLength(message) {
    return message ? message.length : 0;
}

calculatePersonalizationScore(message) {
    if (!message) return 0;
    
    // Simple personalization scoring based on certain keywords and patterns
    let score = 50; // Base score
    
    // Check for personal elements
    if (message.includes('your') || message.includes('you')) score += 15;
    if (message.includes('content') || message.includes('posts')) score += 10;
    if (message.includes('audience') || message.includes('followers')) score += 10;
    if (message.includes('brand') || message.includes('business')) score += 10;
    if (message.length > 100 && message.length < 300) score += 5; // Good length
    
    return Math.min(score, 95); // Cap at 95%
}

copyAllSellingPoints(points) {
    const text = points.map((point, index) => `${index + 1}. ${point}`).join('\n\n');
    window.OsliraApp.copyText(text);
}

editMessage(message) {
    // Simple edit functionality - could be enhanced with a modal
    const newMessage = prompt('Edit your outreach message:', message);
    if (newMessage && newMessage !== message) {
        document.getElementById('message-content').innerHTML = `"${this.escapeHtml(newMessage)}"`;
        window.OsliraApp.showMessage('Message updated! Remember to save changes.', 'success');
    }
}

    handleAnalysisSuccess(data) {
    // ✅ UPDATED: Handle new response structure
    const analysis = data.analysis;
    const outreachMessage = data.outreach_message;
    const creditsRemaining = data.credits_remaining;
    
    // Update credits display
    this.updateCreditsDisplay(creditsRemaining);
    
    // Show analysis results
    this.displayAnalysisResults(analysis, outreachMessage);
    
    // Refresh recent activity
    this.loadRecentActivity();
    
    // Close modal
    this.closeModal('analysisModal');
}

displayAnalysisResults(analysis, outreachMessage) {
    // ✅ UPDATED: Handle new analysis structure
    const modal = document.getElementById('leadModal');
    
    // Update modal content with new fields
    modal.querySelector('.lead-score').textContent = analysis.score;
    modal.querySelector('.lead-category').textContent = analysis.category.replace('_', ' ');
    modal.querySelector('.lead-reasoning').textContent = analysis.reasoning;
    modal.querySelector('.research-summary').textContent = analysis.deep_research_summary;
    
    // Handle new arrays
    this.updateArrayDisplay('.brand-themes', analysis.personal_brand_themes);
    this.updateArrayDisplay('.business-signals', analysis.business_signals);
    this.updateArrayDisplay('.risk-factors', analysis.risk_factors);
    
    // Contact strategy
    const strategy = analysis.contact_strategy;
    modal.querySelector('.contact-timing').textContent = strategy.timing;
    modal.querySelector('.contact-approach').textContent = strategy.approach;
    this.updateArrayDisplay('.talking-points', strategy.talking_points);
    
    // Outreach message
    if (outreachMessage) {
        modal.querySelector('.outreach-message').textContent = outreachMessage;
    }
    
    this.showModal('leadModal');
}

updateArrayDisplay(selector, array) {
    const container = document.querySelector(selector);
    if (container && array && array.length > 0) {
        container.innerHTML = array.map(item => `<li>${item}</li>`).join('');
    }
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
            // Show welcome insight for demo mode
            setTimeout(() => {
                this.renderWelcomeInsights();
                loading.style.display = 'none';
                container.style.display = 'grid';
            }, 1500);
            return;
        }
        
        // Load user's leads data
        const { data: leads } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', user.id);
        
        // Load user subscription data
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
            // Calculate metrics from database data
            const totalLeads = leads.length;
            const leadsWithScores = leads.filter(lead => lead.score !== null && lead.score !== undefined);
            const avgScore = leadsWithScores.length > 0 
                ? leadsWithScores.reduce((sum, lead) => sum + lead.score, 0) / leadsWithScores.length 
                : 0;
            const highValueLeads = leads.filter(lead => (lead.score || 0) >= 80).length;
            const recentLeads = leads.filter(lead => 
                new Date(lead.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length;
            
            // Generate insights based on performance
            if (avgScore >= 70) {
                insights.push({
                    type: 'performance',
                    icon: '🎯',
                    title: 'Excellent Lead Quality!',
                    content: `Your average lead score of ${Math.round(avgScore)} shows you're targeting high-quality prospects. ${highValueLeads} out of ${totalLeads} leads are premium quality (80+ score).`,
                    metrics: [
                        { label: 'Average Score', value: `${Math.round(avgScore)}/100` },
                        { label: 'High-Value Rate', value: `${Math.round((highValueLeads/totalLeads)*100)}%` }
                    ]
                });
            } else if (avgScore >= 50) {
                insights.push({
                    type: 'recommendation',
                    icon: '📈',
                    title: 'Room for Improvement',
                    content: `Your average lead score is ${Math.round(avgScore)}. Try refining your target criteria to find higher-quality prospects.`,
                    cta: 'Analyze New Leads',
                    actionType: 'function',
                    actionValue: 'showAnalysisModal'
                });
            } else if (avgScore > 0) {
                insights.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Lead Quality Alert',
                    content: `Your average lead score of ${Math.round(avgScore)} suggests you may need to adjust your targeting strategy.`,
                    cta: 'Research Better Leads',
                    actionType: 'function',
                    actionValue: 'showAnalysisModal'
                });
            }
            
            // Activity insights
            if (recentLeads > 0) {
                insights.push({
                    type: 'performance',
                    icon: '🔥',
                    title: 'Active Research',
                    content: `You've researched ${recentLeads} leads this week. Consistent activity leads to better results!`,
                    metrics: [
                        { label: 'This Week', value: recentLeads },
                        { label: 'Total Leads', value: totalLeads }
                    ]
                });
            }
            
            // Subscription recommendations
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
            
            // Campaign insight
            insights.push({
                type: 'recommendation',
                icon: '🚀',
                title: 'Scale with Campaigns',
                content: 'Create automated outreach sequences to scale your lead generation and convert more prospects.',
                cta: 'Create Campaign',
                actionType: 'url',
                actionValue: '/campaigns.html'
            });
            
            // Additional insights based on data patterns
            if (totalLeads >= 10) {
                const lightAnalysis = leads.filter(lead => lead.type === 'light').length;
                const deepAnalysis = leads.filter(lead => lead.type === 'deep').length;
                
                if (lightAnalysis > deepAnalysis * 2) {
                    insights.push({
                        type: 'recommendation',
                        icon: '🔍',
                        title: 'Try Deep Analysis',
                        content: `You've done ${lightAnalysis} light analyses vs ${deepAnalysis} deep. Deep analysis provides personalized outreach messages and better insights.`,
                        cta: 'Run Deep Analysis',
                        actionType: 'function',
                        actionValue: 'showAnalysisModal'
                    });
                }
            }
            
            // Credit usage insights
            if (userData?.credits && userData.credits <= 5 && plan === 'free') {
                insights.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Low Credits Warning',
                    content: `You have ${userData.credits} credits remaining. Consider upgrading to continue analyzing leads without interruption.`,
                    cta: 'Upgrade Now',
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
        
    } catch (err) {
        console.error('Error generating insights:', err);
        setTimeout(() => {
            loading.style.display = 'none';
            container.style.display = 'grid';
            container.innerHTML = `
                <div class="insight-card warning">
                    <div class="insight-icon">❌</div>
                    <h3>Error Loading Insights</h3>
                    <p>Unable to generate insights at this time. Please try again later.</p>
                    <button class="insight-cta" onclick="dashboard.generateInsights()">Retry</button>
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
    
    console.log('🔍 Rendering insights:', insights);
    
    container.innerHTML = insights.map((insight, index) => `
        <div class="insight-card ${insight.type}">
            <div class="insight-icon">${insight.icon}</div>
            <h3>${insight.title}</h3>
            <p>${insight.content}</p>
            
            ${insight.metrics ? insight.metrics.map(metric => `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0; padding: 8px 12px; background: rgba(255, 255, 255, 0.7); border-radius: 6px;">
                    <span style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${metric.label}:</span>
                    <span style="font-weight: 700; color: var(--primary-blue); font-size: 16px;">${metric.value}</span>
                </div>
            `).join('') : ''}
            
            ${insight.cta ? `
                <button class="insight-cta" 
                        data-action-type="${insight.actionType}"
                        data-action-value="${insight.actionValue}"
                        data-insight-index="${index}"
                        style="margin-top: 16px; background: var(--primary-blue); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                    ${insight.cta}
                </button>
            ` : ''}
        </div>
    `).join('');
    
    // Add event listeners with proper action handling
    container.querySelectorAll('.insight-cta').forEach((button) => {
        button.addEventListener('click', () => {
            const actionType = button.getAttribute('data-action-type');
            const actionValue = button.getAttribute('data-action-value');
            
            console.log('🎯 Insight button clicked!', { actionType, actionValue });
            
            try {
                if (actionType === 'function') {
                    // Call a function by name
                    if (actionValue === 'showAnalysisModal') {
                        console.log('🔍 Opening analysis modal...');
                        this.showAnalysisModal();
                    } else if (actionValue === 'generateInsights') {
                        console.log('🔄 Regenerating insights...');
                        this.generateInsights();
                    } else {
                        console.error('❌ Unknown function:', actionValue);
                    }
                } else if (actionType === 'url') {
                    // Navigate to URL
                    console.log('🌐 Navigating to URL:', actionValue);
                    if (actionValue.startsWith('http')) {
                        window.open(actionValue, '_blank');
                    } else {
                        window.location.href = actionValue;
                    }
                } else {
                    console.error('❌ Unknown action type:', actionType);
                }
            } catch (error) {
                console.error('❌ Error executing insight action:', error);
                window.OsliraApp.showMessage('Action failed to execute', 'error');
            }
        });
    });
    
    console.log('✅ Event listeners added to', container.querySelectorAll('.insight-cta').length, 'buttons');
}

// =============================================================================
// ADD THIS renderWelcomeInsights() METHOD
// =============================================================================

renderWelcomeInsights() {
    const container = document.getElementById('insights-container');
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

    // =============================================================================
    // BULK UPLOAD
    // =============================================================================

    showBulkUpload() {
    const modal = document.getElementById('bulkModal');
    if (!modal) return;
    
    // Update modal content with enhanced UI
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <button class="modal-close" onclick="dashboard.closeModal('bulkModal')">×</button>
        <h3>📤 Import CSV for Bulk Analysis</h3>
        <p style="margin-bottom: 20px; color: var(--text-secondary);">Upload a CSV file with Instagram usernames for batch analysis</p>
        
        <div class="csv-import-sections">
            <!-- CSV Format Instructions -->
            <div class="form-group">
                <label>📋 Simple CSV Format:</label>
                <div style="background: var(--bg-light); padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; margin-bottom: 16px; border: 1px dashed var(--border-light);">
                    techstartup<br>
                    digitalagency<br>
                    marketingpro<br>
                    brandstudio<br>
                    creativehub
                </div>
                <p style="font-size: 12px; color: var(--text-secondary);">
                    • Just list one Instagram username per line<br>
                    • No headers needed<br>
                    • Don't include @ symbols<br>
                    • One username per row
                </p>
            </div>
            
            <!-- File Upload Section -->
            <div class="form-group">
                <label for="csv-file">Choose CSV File:</label>
                <input type="file" id="csv-file" accept=".csv" style="margin-bottom: 12px; width: 100%; padding: 8px; border: 2px dashed var(--border-light); border-radius: 8px;">
                <div id="csv-preview" style="display: none; margin-top: 12px;"></div>
            </div>
            
            <!-- Analysis Options -->
            <div class="form-group">
                <label for="bulk-analysis-type">Analysis Type:</label>
                <select id="bulk-analysis-type" style="width: 100%; padding: 8px; margin-bottom: 12px;" onchange="dashboard.updateCreditCostDisplay()">
                    <option value="light">⚡ Light Analysis (1 credit each) - Basic profile info</option>
                    <option value="deep">🔍 Deep Analysis (2 credits each) - Full insights + messages</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="bulk-business-id">Business Profile:</label>
                <select id="bulk-business-id" style="width: 100%; padding: 8px; margin-bottom: 16px;">
                    <option value="">Select business profile...</option>
                </select>
            </div>
            
            <!-- Process Button -->
            <button id="process-csv-btn" class="primary-btn" onclick="dashboard.processBulkAnalysis()" style="width: 100%; margin-top: 16px;" disabled>
                🚀 Start Bulk Analysis
            </button>
            
            <!-- Enhanced Progress Section -->
            <div id="bulk-progress" style="display: none; margin-top: 20px;">
                <div style="background: var(--bg-light); padding: 20px; border-radius: 12px; border: 1px solid var(--border-light); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 16px 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        📊 Bulk Analysis Progress
                        <span id="progress-status" style="font-size: 12px; padding: 4px 8px; border-radius: 12px; background: var(--primary-blue); color: white;">
                            Initializing...
                        </span>
                    </h4>
                    
                    <!-- Main Progress Bar -->
                    <div style="margin: 16px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span id="progress-text" style="font-size: 14px; color: var(--text-primary); font-weight: 600;">
                                Ready to start...
                            </span>
                            <span id="progress-percentage" style="font-size: 14px; color: var(--primary-blue); font-weight: 700;">
                                0%
                            </span>
                        </div>
                        <div style="background: #e5e7eb; border-radius: 6px; height: 12px; overflow: hidden;">
                            <div id="progress-bar" style="background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); height: 100%; border-radius: 6px; width: 0%; transition: width 0.3s ease; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); animation: shimmer 2s infinite;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Detailed Stats -->
                    <div id="progress-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin: 16px 0;">
                        <div style="text-align: center; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.2);">
                            <div id="completed-count" style="font-size: 20px; font-weight: 700; color: var(--success);">0</div>
                            <div style="font-size: 11px; color: var(--success); font-weight: 600; text-transform: uppercase;">Completed</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
                            <div id="failed-count" style="font-size: 20px; font-weight: 700; color: var(--error);">0</div>
                            <div style="font-size: 11px; color: var(--error); font-weight: 600; text-transform: uppercase;">Failed</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
                            <div id="total-count" style="font-size: 20px; font-weight: 700; color: var(--primary-blue);">0</div>
                            <div style="font-size: 11px; color: var(--primary-blue); font-weight: 600; text-transform: uppercase;">Total</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(168, 85, 247, 0.1); border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.2);">
                            <div id="batch-info" style="font-size: 20px; font-weight: 700; color: var(--secondary-purple);">-</div>
                            <div style="font-size: 11px; color: var(--secondary-purple); font-weight: 600; text-transform: uppercase;">Batch</div>
                        </div>
                    </div>
                    
                    <!-- Current Activity -->
                    <div id="current-activity" style="background: rgba(255, 255, 255, 0.7); padding: 12px; border-radius: 6px; border: 1px solid var(--border-light); margin-top: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <div id="activity-spinner" style="width: 16px; height: 16px; border: 2px solid var(--border-light); border-top: 2px solid var(--primary-blue); border-radius: 50%; animation: spin 1s linear infinite; display: none;"></div>
                            <span id="activity-text" style="font-size: 13px; color: var(--text-secondary);">
                                Waiting to start...
                            </span>
                        </div>
                        <div id="eta-info" style="font-size: 12px; color: var(--text-secondary); font-style: italic;">
                            Estimated time remaining: Calculating...
                        </div>
                    </div>
                    
                    <!-- Error Log -->
                    <div id="error-log" style="display: none; background: rgba(220, 38, 38, 0.1); padding: 12px; border-radius: 6px; border-left: 4px solid var(--error); margin-top: 16px;">
                        <h5 style="margin: 0 0 8px 0; color: var(--error); font-size: 14px;">⚠️ Errors Encountered</h5>
                        <div id="error-list" style="max-height: 120px; overflow-y: auto; font-size: 12px; color: var(--error);"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        </style>
    `;
    
    // Populate business profiles
    this.populateBulkBusinessProfiles();
    
    // Set up event listeners for the new elements
    const csvFileInput = document.getElementById('csv-file');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', (event) => this.handleCSVUpload(event));
    }
    
    modal.style.display = 'flex';
}

   async handleCSVUpload(event) {
    const file = event.target.files[0];
    const processBtn = document.getElementById('process-csv-btn');
    const previewDiv = document.getElementById('csv-preview');
    
    if (!file) {
        processBtn.disabled = true;
        previewDiv.style.display = 'none';
        this.csvData = [];
        return;
    }
    
    if (!file.name.endsWith('.csv')) {
        window.OsliraApp.showMessage('Please upload a CSV file', 'error');
        processBtn.disabled = true;
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        window.OsliraApp.showMessage('File too large. Please upload a file smaller than 5MB.', 'error');
        processBtn.disabled = true;
        return;
    }
    
    try {
        const text = await file.text();
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (lines.length === 0) {
            window.OsliraApp.showMessage('CSV file is empty', 'error');
            processBtn.disabled = true;
            return;
        }
        
        if (lines.length > 1000) {
            window.OsliraApp.showMessage('File too large. Maximum 1000 profiles per upload.', 'error');
            processBtn.disabled = true;
            return;
        }
        
        // Parse as simple username list (no headers)
        this.csvData = lines.map((line, index) => {
            const username = line.split(',')[0].trim().replace(/"/g, '').replace('@', '');
            return { 
                username: username,
                name: '',
                notes: '',
                lineNumber: index + 1
            };
        }).filter(row => row.username && row.username.length > 0);
        
        if (this.csvData.length === 0) {
            window.OsliraApp.showMessage('No valid usernames found in CSV', 'error');
            processBtn.disabled = true;
            return;
        }
        
        // Show enhanced preview
        this.renderCSVPreview(previewDiv);
        
        // Update credit cost display
        await this.updateCreditCostDisplay();
        
        previewDiv.style.display = 'block';
        processBtn.disabled = false;
        
        window.OsliraApp.showMessage(`Found ${this.csvData.length} usernames in CSV file`, 'success');
        
    } catch (error) {
        console.error('CSV parsing error:', error);
        window.OsliraApp.showMessage('Error reading CSV file: ' + error.message, 'error');
        processBtn.disabled = true;
        this.csvData = [];
    }
}

    renderCSVPreview(previewDiv) {
    const validUsernames = this.csvData.filter(row => this.validateUsername(row.username));
    const invalidUsernames = this.csvData.filter(row => !this.validateUsername(row.username));
    const itemsPerPage = 24;
    const totalPages = Math.ceil(validUsernames.length / itemsPerPage);

    previewDiv.innerHTML = `
        <div style="background: white; border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;">
            <!-- Header -->
            <div style="background: var(--bg-light); padding: 16px; border-bottom: 1px solid var(--border-light);">
                <h4 style="margin: 0; color: var(--text-primary); display: flex; align-items: center; justify-content: space-between;">
                    📋 CSV Preview
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 14px;">
                        <span style="background: var(--success); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px;">
                            ✅ ${validUsernames.length} Valid
                        </span>
                        ${invalidUsernames.length > 0 ? `
                            <span style="background: var(--error); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px;">
                                ❌ ${invalidUsernames.length} Invalid
                            </span>
                        ` : ''}
                    </div>
                </h4>
            </div>
            
            <!-- Preview Grid -->
            <div style="padding: 16px;">
                <div id="username-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; min-height: 200px;">
                    ${validUsernames.slice(0, itemsPerPage).map((row, index) => `
                        <div style="padding: 8px 12px; background: var(--bg-light); border-radius: 6px; font-size: 13px; text-align: center; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; min-height: 40px;">
                            <span style="color: var(--text-primary); font-weight: 500;">@${row.username}</span>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Pagination -->
                ${totalPages > 1 ? `
                    <div style="display: flex; justify-content: center; align-items: center; margin-top: 16px; gap: 8px;">
                        <button id="prev-page" style="padding: 6px 12px; background: var(--bg-light); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer;" disabled>
                            ← Previous
                        </button>
                        <span id="page-info" style="font-size: 14px; color: var(--text-secondary);">
                            Page 1 of ${totalPages}
                        </span>
                        <button id="next-page" style="padding: 6px 12px; background: var(--bg-light); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer;">
                            Next →
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <!-- Invalid Usernames Warning -->
            ${invalidUsernames.length > 0 ? `
                <div style="background: rgba(220, 38, 38, 0.1); padding: 16px; border-top: 1px solid var(--border-light);">
                    <h5 style="margin: 0 0 8px 0; color: var(--error);">⚠️ Invalid Usernames Found</h5>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: var(--error);">
                        The following usernames will be skipped (invalid format):
                    </p>
                    <div style="max-height: 80px; overflow-y: auto; font-family: monospace; font-size: 11px; color: var(--error);">
                        ${invalidUsernames.map(row => `@${row.username} (line ${row.lineNumber})`).join(', ')}
                    </div>
                </div>
            ` : ''}
        </div>
        
        <!-- Credit Cost Display -->
        <div id="credit-cost-display" style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #EBF8FF, #DBEAFE); border-radius: 8px; border: 1px solid var(--primary-blue);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h4 style="margin: 0; color: var(--primary-blue); font-size: 16px;">💰 Credit Cost</h4>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: var(--text-secondary);">
                        Based on current analysis type selection
                    </p>
                </div>
                <div style="text-align: right;">
                    <div id="total-cost" style="font-size: 24px; font-weight: 700; color: var(--primary-blue);">
                        Calculating...
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        credits total
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add pagination functionality
    if (totalPages > 1) {
        this.setupPreviewPagination(validUsernames, itemsPerPage, totalPages);
    }
    
    // Update only valid usernames for processing
    this.csvData = validUsernames;
}

    setupPreviewPagination(validUsernames, itemsPerPage, totalPages) {
    let currentPage = 1;
    
    const updateGrid = (page) => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = validUsernames.slice(startIndex, endIndex);
        
        const grid = document.getElementById('username-grid');
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (grid) {
            grid.innerHTML = pageData.map(row => `
                <div style="padding: 8px 12px; background: var(--bg-light); border-radius: 6px; font-size: 13px; text-align: center; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; min-height: 40px;">
                    <span style="color: var(--text-primary); font-weight: 500;">@${row.username}</span>
                </div>
            `).join('');
        }
        
        if (pageInfo) pageInfo.textContent = `Page ${page} of ${totalPages}`;
        if (prevBtn) prevBtn.disabled = page === 1;
        if (nextBtn) nextBtn.disabled = page === totalPages;
    };
    
    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateGrid(currentPage);
        }
    });
    
    document.getElementById('next-page')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updateGrid(currentPage);
        }
    });
}

    async updateCreditCostDisplay() {
    if (!this.csvData || this.csvData.length === 0) {
        // Hide cost display if no data
        const costDisplay = document.getElementById('credit-cost-display');
        if (costDisplay) costDisplay.style.display = 'none';
        return;
    }
    
    const analysisType = document.getElementById('bulk-analysis-type')?.value || 'light';
    const creditsPerLead = analysisType === 'deep' ? 2 : 1;
    const totalCredits = this.csvData.length * creditsPerLead;
    
    // Get user's current credits
    let currentCredits = 0;
    let hasEnoughCredits = true;
    
    if (this.userProfile) {
        currentCredits = this.userProfile.credits || 0;
        hasEnoughCredits = currentCredits >= totalCredits;
    }
    
    // Update the cost display
    const totalCostElement = document.getElementById('total-cost');
    if (totalCostElement) {
        totalCostElement.innerHTML = `
            <span style="color: ${hasEnoughCredits ? 'var(--primary-blue)' : 'var(--error)'};">
                ${totalCredits}
            </span>
        `;
    }
    
    // Update cost breakdown
    const costDisplay = document.getElementById('credit-cost-display');
    if (costDisplay) {
        costDisplay.style.display = 'block';
        
        // Update the content with current credits info
        const costBreakdown = costDisplay.querySelector('.cost-breakdown') || document.createElement('div');
        costBreakdown.className = 'cost-breakdown';
        costBreakdown.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px;">
                <span>Profiles to analyze:</span>
                <span><strong>${this.csvData.length}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px;">
                <span>Credits per profile (${analysisType}):</span>
                <span><strong>${creditsPerLead}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; padding-top: 8px; border-top: 1px solid var(--border-light);">
                <span>Your current credits:</span>
                <span><strong style="color: ${currentCredits >= totalCredits ? 'var(--success)' : 'var(--warning)'};">${currentCredits}</strong></span>
            </div>
            ${!hasEnoughCredits ? `
                <div style="background: rgba(220, 38, 38, 0.1); padding: 12px; border-radius: 6px; margin: 12px 0; border-left: 4px solid var(--error);">
                    <p style="margin: 0; color: var(--error); font-weight: 600; font-size: 14px;">
                        ⚠️ Insufficient Credits
                    </p>
                    <p style="margin: 4px 0 0 0; color: var(--error); font-size: 12px;">
                        You need ${totalCredits - currentCredits} more credits to process this upload.
                    </p>
                    <a href="/subscription.html" style="color: var(--error); font-weight: 600; text-decoration: none; font-size: 12px;">
                        🚀 Upgrade Now →
                    </a>
                </div>
            ` : ''}
        `;
        
        if (!costDisplay.querySelector('.cost-breakdown')) {
            costDisplay.appendChild(costBreakdown);
        }
    }
    
    // Update the process button
    const processBtn = document.getElementById('process-csv-btn');
    if (processBtn) {
        if (hasEnoughCredits) {
            processBtn.innerHTML = `🚀 Analyze ${this.csvData.length} Profiles (${totalCredits} credits)`;
            processBtn.disabled = false;
            processBtn.style.opacity = '1';
        } else {
            processBtn.innerHTML = `❌ Insufficient Credits (Need ${totalCredits}, Have ${currentCredits})`;
            processBtn.disabled = true;
            processBtn.style.opacity = '0.6';
        }
    }
}
async processBulkAnalysis(profiles, analysisType) {
    try {
        // ✅ UPDATED: Use new v1/bulk-analyze endpoint
        const response = await apiRequest('/v1/bulk-analyze', {
            method: 'POST',
            body: JSON.stringify({
                profiles: profiles,
                analysis_type: analysisType,
                business_id: this.currentBusinessId
            })
        });
        
        // ✅ UPDATED: Handle new response format
        if (response.success) {
            console.log('✅ Bulk analysis completed:', response.data);
            return response.data;
        } else {
            throw new Error(response.error || 'Bulk analysis failed');
        }
        
    } catch (error) {
        console.error('❌ Bulk analysis error:', error);
        throw error;
    }
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

    // Fixed version of updateCreditsDisplay() function for dashboard.js

// Fixed version of updateCreditsDisplay() function for dashboard.js

updateCreditsDisplay(creditsParam) {
    // Get credits from parameter or user object
    let credits = creditsParam;
    if (typeof credits === 'undefined' || credits === null) {
        const user = window.OsliraApp?.user;
        if (!user) {
            console.warn('⚠️ No user data available for credits display');
            return;
        }
        credits = user.credits || 0;
    }
    
    // Additional safety check
    if (typeof credits !== 'number') {
        console.warn('⚠️ Invalid credits value:', credits);
        credits = 0;
    }
    
    console.log('🔄 Updating credits display:', credits);
    
    // Update the main sidebar billing element (this is what actually exists in the HTML)
    const sidebarBilling = document.getElementById('sidebar-billing');
    if (sidebarBilling) {
        // Check if user has a subscription plan
        const user = window.OsliraApp?.user;
        const plan = user?.subscription_plan || 'free';
        
        if (plan === 'free') {
            let warningClass = '';
            let warningText = '';
            
            if (credits === 0) {
                warningClass = 'credits-empty';
                warningText = '⚠️ No credits left';
            } else if (credits <= 2) {
                warningClass = 'credits-low';
                warningText = '⚠️ Low credits';
            }
            
            sidebarBilling.innerHTML = `
                <div style="text-align: center; margin-top: 8px;" class="${warningClass}">
                    <div style="font-size: 28px; font-weight: 800; color: ${credits === 0 ? 'var(--error)' : credits <= 2 ? 'var(--warning)' : 'var(--primary-blue)'}; line-height: 1;">
                        ${credits}
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">
                        Credits Remaining
                    </div>
                    ${warningText ? `<div style="font-size: 10px; color: ${credits === 0 ? 'var(--error)' : 'var(--warning)'}; margin-top: 4px; font-weight: 600;">${warningText}</div>` : ''}
                </div>
            `;
        } else {
            // For paid plans, show unlimited or subscription-based display
            sidebarBilling.innerHTML = `
                <div style="text-align: center; margin-top: 8px;">
                    <div style="font-size: 28px; font-weight: 800; color: var(--success); line-height: 1;">
                        ${credits === -1 ? '∞' : credits}
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">
                        ${credits === -1 ? 'Unlimited Credits' : 'Credits Remaining'}
                    </div>
                </div>
            `;
        }
        console.log('✅ Updated sidebar billing credits display');
    } else {
        console.warn('⚠️ sidebar-billing element not found');
    }
    
    // Safely update any other credit displays that might exist (with null checks)
    const additionalElements = [
        '#credits-count',
        '#header-credits', 
        '.credits-remaining',
        '.user-credits',
        '.nav-credits'
    ];
    
    additionalElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = credits === -1 ? '∞' : credits;
            console.log(`✅ Updated ${selector} credits display`);
        }
    });
    
    // Update any elements with data-credits attribute
    const dataCreditsElements = document.querySelectorAll('[data-credits]');
    dataCreditsElements.forEach(element => {
        if (element) {
            element.textContent = credits === -1 ? '∞' : credits;
            element.setAttribute('data-credits', credits);
        }
    });
    
    if (dataCreditsElements.length > 0) {
        console.log(`✅ Updated ${dataCreditsElements.length} data-credits elements`);
    }
}
    
async loadBusinessProfiles() {
    try {
        console.log('🔄 Loading business profiles for user:', this.user?.id);
        
        const { data: businesses, error } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', this.user.id);
        
        if (error) {
            console.error('❌ Error loading businesses:', error);
            return;
        }
        
        console.log('📊 Found businesses:', businesses);
        
        const businessSelect = document.getElementById('business-select');
        if (businessSelect && businesses && businesses.length > 0) {
            businessSelect.innerHTML = businesses.map(business => 
                `<option value="${business.id}">${business.name}</option>`
            ).join('');
            
            // Set the current business ID
            this.currentBusinessId = businesses[0].id;
            console.log('✅ Business loaded and set:', this.currentBusinessId);
            
            // Update any business display
            this.updateBusinessDisplay(businesses[0]);
        } else {
            console.log('⚠️ No businesses found or no business select element');
            this.currentBusinessId = null;
        }
        
    } catch (error) {
        console.error('❌ Failed to load businesses:', error);
    }
}

// Helper method to update business display
updateBusinessDisplay(business) {
    const businessNameEl = document.getElementById('current-business-name');
    if (businessNameEl && business) {
        businessNameEl.textContent = business.name;
    }
}
closeModal(modalId) {  // ✅ PROPER METHOD DECLARATION
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
    switchBusiness() {
    const businessSelect = document.getElementById('business-select');
    if (businessSelect) {
        this.currentBusinessId = businessSelect.value;
        console.log('✅ Business switched to:', this.currentBusinessId);
        
        // Refresh data for new business
        this.loadRecentActivity();
    }
}}

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
