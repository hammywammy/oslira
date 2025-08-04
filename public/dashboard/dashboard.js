// ===============================================================================
// OSLIRA ENTERPRISE DASHBOARD.JS - COMPLETE POST-MIGRATION VERSION
// leads table: Basic profile info only (username, score, analysis_type, followers_count)
// lead_analyses table: ALL engagement data, insights, outreach, selling points
// ===============================================================================

class Dashboard {
    constructor() {
        this.allLeads = [];
        this.selectedLeads = new Set();
        this.currentFilter = 'all';
        this.isLoading = false;
        this.dateFormatCache = new Map();
        
        // Bind methods to maintain context
        this.init = this.init.bind(this);
        this.loadDashboardData = this.loadDashboardData.bind(this);
        this.viewLead = this.viewLead.bind(this);
        this.displayLeads = this.displayLeads.bind(this);
        this.toggleLeadSelection = this.toggleLeadSelection.bind(this);
        this.copyText = this.copyText.bind(this);
        this.editMessage = this.editMessage.bind(this);
        this.saveEditedMessage = this.saveEditedMessage.bind(this);
    }

    // ===============================================================================
    // INITIALIZATION AND SETUP
    // ===============================================================================

async init() {
    try {
        console.log('🚀 Initializing dashboard...');
        
        // Setup event listeners first
        this.setupEventListeners();
        
        // Setup dashboard functionality
        await this.setupDashboard();
        
        // Load dashboard data
        await this.loadDashboardData();
        
        // ✅ Load business profiles early
        setTimeout(() => {
            this.loadBusinessProfilesForModal();
        }, 1000);
        
        console.log('✅ Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        this.displayErrorState('Failed to initialize dashboard: ' + error.message);
    }
}

   setupEventListeners() {
    console.log('🔧 Setting up ALL event listeners...');
    
    // ✅ CRITICAL: Analysis modal buttons (multiple entry points)
    const researchBtns = [
        'research-lead-btn',           // Header button
        'research-action-card',        // Action card
        'welcome-cta-btn'              // Welcome insight button
    ];
    
    researchBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', (e) => {
                console.log(`🎯 Analysis modal triggered by: ${btnId}`);
                e.preventDefault();
                e.stopPropagation();
                this.showAnalysisModal();
            });
            console.log(`✅ Event listener added to: ${btnId}`);
        } else {
            console.warn(`⚠️ Button not found: ${btnId}`);
        }
    });

    // ✅ CRITICAL: Analysis form handlers
    const analysisForm = document.getElementById('analysisForm');
    if (analysisForm) {
        analysisForm.addEventListener('submit', (e) => {
            console.log('📝 Analysis form submitted');
            e.preventDefault();
            this.submitAnalysis(e);
        });
        console.log('✅ Analysis form submit listener added');
    }
    
    const analysisTypeSelect = document.getElementById('analysis-type');
    if (analysisTypeSelect) {
        analysisTypeSelect.addEventListener('change', (e) => {
            console.log('🔄 Analysis type changed to:', e.target.value);
            this.updateInputField();
        });
        console.log('✅ Analysis type change listener added');
    }
    
    // ✅ Modal close handlers
    document.getElementById('analysis-modal-close')?.addEventListener('click', () => {
        console.log('❌ Analysis modal close clicked');
        this.closeModal('analysisModal');
    });
    
    // ✅ ALL OTHER EVENT LISTENERS (inline to avoid missing method error)
    
    // Bulk upload
    document.getElementById('bulk-upload-btn')?.addEventListener('click', () => this.showBulkUpload());
    document.getElementById('csv-import-action-card')?.addEventListener('click', () => this.showBulkUpload());
    
    // Filters and activity
    document.getElementById('timeframe-filter')?.addEventListener('change', () => this.loadRecentActivity());
    document.getElementById('activity-filter')?.addEventListener('change', () => this.applyActivityFilter());
    document.getElementById('refresh-activity-btn')?.addEventListener('click', () => this.refreshActivity());
    
    // Bulk actions
    document.getElementById('select-all-btn')?.addEventListener('click', () => this.selectAllLeads(true));
    document.getElementById('bulk-delete-btn')?.addEventListener('click', () => this.bulkDeleteLeads());
    document.getElementById('clear-selection-btn')?.addEventListener('click', () => this.clearSelection());
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchLeads(e.target.value);
            }, 300);
        });
    }

    // Select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            this.selectAllLeads(e.target.checked);
        });
    }

    // Support and other modals
    document.getElementById('support-btn')?.addEventListener('click', () => this.showSupportModal());
    document.getElementById('lead-modal-close')?.addEventListener('click', () => this.closeModal('leadModal'));
    document.getElementById('bulk-modal-close')?.addEventListener('click', () => this.closeModal('bulkModal'));
    
    // Export functionality
    document.getElementById('export-action-card')?.addEventListener('click', () => this.exportLeads());
    document.getElementById('generate-insights-btn')?.addEventListener('click', () => this.generateInsights());
    
    // Global modal click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal.id);
            }
        });
    });
    
    console.log('✅ All event listeners setup complete');
}

    setupFilterHandlers() {
        // Activity filter handler
        const activityFilter = document.getElementById('activity-filter');
        if (activityFilter) {
            activityFilter.addEventListener('change', () => {
                this.applyActivityFilter();
            });
        }
    }

    setupBulkActions() {
        // Bulk delete button
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                this.bulkDeleteLeads();
            });
        }

        // Bulk export button
        const bulkExportBtn = document.getElementById('bulk-export-btn');
        if (bulkExportBtn) {
            bulkExportBtn.addEventListener('click', () => {
                this.bulkExportLeads();
            });
        }
    }

    // ===============================================================================
    // DATA LOADING AND MANAGEMENT
    // ===============================================================================

async loadDashboardData() {
    try {
        const supabase = window.OsliraApp?.supabase;
        const user = window.OsliraApp?.user;

        if (!supabase || !user) {
            console.log('📋 Loading demo data (no auth)');
            this.displayDemoLeads();
            return;
        }

        console.log('🔄 Loading dashboard data...');

        // ✅ CORRECT: Load leads with analysis data using proper JOIN
        const { data: leadsData, error } = await supabase
            .from('leads')
            .select(`
                id,
                username, 
                score,
                platform,
                analysis_type, 
                created_at,
                followers_count,
                profile_pic_url,
                profile_url,
                business_id,
                lead_analyses!inner(
                    engagement_score,
                    selling_points,
                    outreach_message,
                    reasons,
                    summary,
                    niche_fit,
                    analyzed_at,
                    avg_likes,
                    avg_comments,
                    engagement_rate,
                    audience_quality,
                    engagement_insights,
                    analysis_data,
                    latest_posts,
                    engagement_data
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }

        this.allLeads = leadsData || [];
        this.selectedLeads.clear();
        
        console.log(`✅ Loaded ${this.allLeads.length} leads`);
        
        // Update UI
        this.displayLeads(this.allLeads);
        this.updateDashboardStats();
        this.generateInsights();
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        this.displayErrorState('Failed to load leads: ' + error.message);
    }
}


async waitForAuth(timeoutMs = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
        if (window.OsliraApp?.user && window.OsliraApp?.supabase) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
}

// ===============================================================================
// ALSO UPDATE viewLead() WITH THE SAME WAIT LOGIC
// ===============================================================================

async viewLead(leadId) {
    if (!leadId) {
        console.error('viewLead: leadId is required');
        return;
    }

    const modal = document.getElementById('leadModal');
    const detailsContainer = document.getElementById('leadDetails');

    if (!modal || !detailsContainer) {
        console.error('viewLead: Required DOM elements not found');
        return;
    }

    // Show loading state
    detailsContainer.innerHTML = `
        <div style="text-align: center; padding: 60px;">
            <div style="font-size: 32px; margin-bottom: 16px;">🔄</div>
            <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">Loading Lead Details</h3>
            <p style="margin: 0; color: var(--text-secondary);">Fetching analysis data...</p>
        </div>
    `;
    modal.style.display = 'flex';

    try {
        // ✅ WAIT for user to be loaded (same logic as loadDashboardData)
        let retries = 0;
        const maxRetries = 10;
        
        while ((!window.OsliraApp?.user || !window.OsliraApp?.supabase) && retries < maxRetries) {
            console.log(`⏳ Waiting for authentication for viewLead... (${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            throw new Error('Authentication system not ready');
        }

        // ✅ STEP 1: Get basic lead data from leads table
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select(`
                id,
                username,
                profile_pic_url,
                platform,
                score,
                analysis_type,
                business_id,
                created_at,
                followers_count
            `)
            .eq('id', leadId)
            .eq('user_id', user.id)
            .single();

        if (leadError) {
            throw new Error(`Database error: ${leadError.message}`);
        }

        if (!lead) {
            throw new Error('Lead not found or access denied');
        }

        console.log('📋 Lead data loaded:', lead);

        // ✅ STEP 2: Get deep analysis data if it's a deep analysis
        let analysisData = null;
        if (lead.analysis_type === 'deep') {
            console.log('🔍 Loading deep analysis data...');

            const { data: deepAnalysis, error: analysisError } = await supabase
                .from('lead_analyses')
                .select(`
                    engagement_score,
                    score_niche_fit,
                    score_total,
                    outreach_message,
                    selling_points,
                    audience_quality,
                    engagement_insights,
                    avg_likes,
                    avg_comments,
                    engagement_rate,
                    latest_posts,
                    username
                `)
                .eq('lead_id', leadId)
                .single();

            if (analysisError) {
                console.warn('⚠️ Deep analysis data not found:', analysisError.message);
            } else {
                analysisData = deepAnalysis;
                console.log('📈 Analysis data loaded:', analysisData);
            }
        }

        // ✅ STEP 3: Build and display the HTML
        const detailsHtml = this.buildLeadDetailsHTML(lead, analysisData);
        detailsContainer.innerHTML = detailsHtml;

        console.log('✅ Lead details rendered successfully');

    } catch (error) {
        console.error('❌ Error loading lead details:', error);
        detailsContainer.innerHTML = `
            <div style="text-align: center; padding: 60px;">
                <div style="font-size: 32px; margin-bottom: 16px;">❌</div>
                <h3 style="margin: 0 0 8px 0; color: var(--error);">Error Loading Lead</h3>
                <p style="margin: 0; color: var(--text-secondary);">${error.message}</p>
                <button onclick="dashboard.viewLead('${leadId}')" 
                        style="margin-top: 16px; background: var(--primary-blue); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
}

    // ===============================================================================
    // BUILD FUNCTIONS - ENTERPRISE LEAD DETAILS HTML
    // ===============================================================================

    buildLeadDetailsHTML(lead, analysisData = null) {
        const analysisType = lead.analysis_type || 'light';
        const isDeepAnalysis = analysisType === 'deep';
        const score = lead.score || 0;
        const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';

        console.log(`🔄 Building lead details for ${lead.username} (${analysisType} analysis)`);
        console.log('📊 Lead data (basic):', lead);
        console.log('📈 Analysis data (deep):', analysisData);

        // Enhanced profile picture with fallback
        const profilePicUrl = lead.profile_pic_url;
        const profilePicHtml = profilePicUrl 
            ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=120&h=120&fit=cover&a=attention" 
                    alt="@${lead.username}" 
                    style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary-blue); box-shadow: 0 8px 24px rgba(0,0,0,0.1);"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : '';

        const fallbackAvatar = `<div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; display: ${profilePicUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; font-weight: 700; font-size: 48px; border: 4px solid var(--primary-blue); box-shadow: 0 8px 24px rgba(0,0,0,0.1);">
            ${lead.username ? lead.username.charAt(0).toUpperCase() : '?'}
        </div>`;

        // Build complete HTML structure
        let html = `
            <div style="padding: 32px; background: linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%); min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                
                <!-- Header Section with Profile -->
                <div style="background: white; padding: 32px; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid var(--border-light);">
                    <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 24px;">
                        ${profilePicHtml}
                        ${fallbackAvatar}
                        
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
                                <h2 style="margin: 0; color: var(--text-primary); font-size: 32px; font-weight: 700;">
                                    @${lead.username}
                                </h2>
                                <span class="score-badge ${scoreClass}" style="padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 16px;">
                                    ${score}/100
                                </span>
                                <span class="analysis-badge ${analysisType}" style="padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                                    ${isDeepAnalysis ? '🔥 Deep Analysis' : '⚡ Light Analysis'}
                                </span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 16px;">
                                <div style="text-align: center; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 12px;">
                                    <div style="font-size: 20px; font-weight: 700; color: var(--primary-blue);">
                                        ${lead.followers_count ? lead.followers_count.toLocaleString() : 'N/A'}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">Followers</div>
                                </div>
                                <div style="text-align: center; padding: 12px; background: rgba(168, 85, 247, 0.1); border-radius: 12px;">
                                    <div style="font-size: 20px; font-weight: 700; color: var(--secondary-purple);">
                                        ${lead.platform || 'Instagram'}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">Platform</div>
                                </div>
                                <div style="text-align: center; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 12px;">
                                    <div style="font-size: 20px; font-weight: 700; color: var(--success);">
                                        ${new Date(lead.created_at).toLocaleDateString()}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">Analyzed</div>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 12px;">
                                <button onclick="window.open('https://instagram.com/${lead.username}', '_blank')" 
                                        style="background: linear-gradient(135deg, #E1306C, #C13584); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                                    📱 View Profile
                                </button>
                                <button onclick="dashboard.exportLeadData('${lead.id}')" 
                                        style="background: var(--primary-blue); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                                    📄 Export Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Analysis Status -->
                ${this.buildAnalysisStatusSection(lead, analysisType)}
        `;

        // Deep Analysis: Show rich data from lead_analyses table
        if (isDeepAnalysis && analysisData) {
            html += `
                <!-- Advanced AI Metrics -->
                ${this.buildAdvancedMetricsSection(analysisData)}
                
                <!-- Engagement Analysis -->
                ${this.buildEngagementSection(analysisData)}
                
                <!-- AI-Generated Selling Points -->
                ${this.buildSellingPointsSection(analysisData)}
                
                <!-- AI Insights Summary -->
                ${this.buildAIInsightsSection(analysisData)}
                
                <!-- Personalized Outreach Message -->
                ${analysisData.outreach_message ? this.buildOutreachMessageSection(analysisData.outreach_message) : ''}
            `;
        } else if (isDeepAnalysis && !analysisData) {
            // Deep analysis but no data found - show error
            html += `
                <div style="background: linear-gradient(135deg, #FEF2F2, #FECACA); padding: 24px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #F87171; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
                    <h4 style="color: #DC2626; margin-bottom: 12px;">Deep Analysis Data Missing</h4>
                    <p style="color: #7F1D1D; margin-bottom: 16px;">
                        This lead was marked as deep analysis but detailed data couldn't be found. This might be due to a processing error.
                    </p>
                    <button onclick="dashboard.rerunAnalysis('${lead.id}')" 
                            style="background: #DC2626; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        🔄 Rerun Analysis
                    </button>
                </div>
            `;
        } else {
            // Light Analysis: Show upgrade prompt
            html += this.buildUpgradePromptSection(lead);
        }

        html += `</div>`;
        return html;
    }

    buildAnalysisStatusSection(lead, analysisType) {
        return `
            <div style="background: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
                <h4 style="color: var(--text-primary); margin-bottom: 16px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    🎯 Analysis Status & Details
                </h4>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div style="padding: 16px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border-left: 4px solid var(--success);">
                        <div style="font-size: 12px; color: var(--success); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                            Analysis Status
                        </div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--success);">
                            ✅ Complete
                        </div>
                    </div>
                    
                    <div style="padding: 16px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border-left: 4px solid var(--primary-blue);">
                        <div style="font-size: 12px; color: var(--primary-blue); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                            Analysis Type
                        </div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--primary-blue);">
                            ${analysisType === 'deep' ? '🔥 Deep Analysis' : '⚡ Light Analysis'}
                        </div>
                    </div>
                    
                    <div style="padding: 16px; background: rgba(168, 85, 247, 0.1); border-radius: 12px; border-left: 4px solid var(--secondary-purple);">
                        <div style="font-size: 12px; color: var(--secondary-purple); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                            Business Profile
                        </div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--secondary-purple);">
                            ${lead.business_id || 'Default'}
                        </div>
                    </div>
                    
                    <div style="padding: 16px; background: rgba(245, 158, 11, 0.1); border-radius: 12px; border-left: 4px solid var(--warning);">
                        <div style="font-size: 12px; color: var(--warning); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                            Processed
                        </div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--warning);">
                            ${new Date(lead.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                
                ${analysisType === 'light' ? `
                    <div style="margin-top: 16px; padding: 16px; background: rgba(245, 158, 11, 0.1); border-radius: 12px; border: 1px dashed var(--warning);">
                        <p style="margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5;">
                            💡 <strong>Light Analysis includes:</strong> Basic profile scoring and core metrics. 
                            Upgrade to Deep Analysis for engagement insights, personalized outreach messages, and detailed selling points.
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    buildAdvancedMetricsSection(analysisData) {
        const engagementScore = analysisData.engagement_score || 0;
        const nicheFitScore = analysisData.score_niche_fit || 0;
        const totalScore = analysisData.score_total || 0;

        return `
            <div style="background: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
                <h4 style="color: var(--text-primary); margin-bottom: 20px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    📊 Advanced AI Scoring
                    <span style="background: var(--primary-blue); color: white; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600;">
                        GPT-4o Powered
                    </span>
                </h4>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 24px;">
                    <!-- Engagement Score -->
                    <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.05)); padding: 20px; border-radius: 12px; border-left: 4px solid var(--success); position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -10px; right: -10px; font-size: 60px; opacity: 0.1;">📈</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 12px; color: var(--success); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                    Engagement Score
                                </div>
                                <div style="font-size: 28px; font-weight: 800; color: var(--success);">
                                    ${engagementScore}
                                </div>
                            </div>
                            <div style="font-size: 24px;">📈</div>
                        </div>
                        <div style="width: 100%; background: rgba(16, 185, 129, 0.2); border-radius: 10px; height: 8px; margin-bottom: 8px;">
                            <div style="width: ${engagementScore}%; background: var(--success); border-radius: 10px; height: 100%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            Based on post interactions and audience quality metrics
                        </div>
                    </div>
                    
                    <!-- Niche Fit Score -->
                    <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.05)); padding: 20px; border-radius: 12px; border-left: 4px solid var(--primary-blue); position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -10px; right: -10px; font-size: 60px; opacity: 0.1;">🎯</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 12px; color: var(--primary-blue); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                    Niche‑Fit Score
                                </div>
                                <div style="font-size: 28px; font-weight: 800; color: var(--primary-blue);">
                                    ${nicheFitScore}
                                </div>
                            </div>
                            <div style="font-size: 24px;">🎯</div>
                        </div>
                        <div style="width: 100%; background: rgba(59, 130, 246, 0.2); border-radius: 10px; height: 8px; margin-bottom: 8px;">
                            <div style="width: ${nicheFitScore}%; background: var(--primary-blue); border-radius: 10px; height: 100%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            How well this lead matches your business profile
                        </div>
                    </div>
                </div>
                
                <!-- AI Composite Score -->
                <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.05)); padding: 24px; border-radius: 12px; border-left: 4px solid var(--secondary-purple); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; font-size: 80px; opacity: 0.1;">🤖</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 14px; color: var(--secondary-purple); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                AI Composite Score
                            </div>
                            <div style="font-size: 36px; font-weight: 800; color: var(--secondary-purple); margin-bottom: 8px;">
                                ${totalScore}/100
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                Overall lead quality combining all AI analysis factors
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; background: conic-gradient(var(--secondary-purple) ${totalScore * 3.6}deg, rgba(168, 85, 247, 0.2) 0deg); display: flex; align-items: center; justify-content: center; position: relative;">
                                <div style="width: 60px; height: 60px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; color: var(--secondary-purple);">
                                    ${totalScore}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    buildEngagementSection(analysisData) {
        const avgLikes = analysisData.avg_likes || 0;
        const avgComments = analysisData.avg_comments || 0;
        const engagementRate = analysisData.engagement_rate || 0;
        const audienceQuality = analysisData.audience_quality || 'Unknown';
        
        // Parse engagement insights
        const engagementInsights = this.parseEngagementInsights(analysisData);
        
        const insightsHtml = engagementInsights.length > 0 ? engagementInsights.map((insight, index) => `
            <div style="margin-bottom: 12px; padding: 16px; background: rgba(6, 182, 212, 0.05); border-radius: 10px; border: 1px solid rgba(6, 182, 212, 0.15); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(6, 182, 212, 0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="background: var(--accent-teal); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">
                        ${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <div style="color: var(--text-primary); line-height: 1.6; font-size: 14px; font-weight: 500;">
                            ${this.escapeHtml(insight)}
                        </div>
                    </div>
                    <button onclick="dashboard.copyText('${this.escapeHtml(insight).replace(/'/g, "\\'")}'); this.innerHTML='✅'; setTimeout(() => this.innerHTML='📋', 2000)" 
                            style="background: none; border: 1px solid var(--accent-teal); color: var(--accent-teal); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;"
                            onmouseover="this.style.background='var(--accent-teal)'; this.style.color='white'"
                            onmouseout="this.style.background='none'; this.style.color='var(--accent-teal)'">
                        📋
                    </button>
                </div>
            </div>
        `).join('') : `
            <div style="padding: 20px; background: rgba(6, 182, 212, 0.05); border-radius: 10px; border: 1px solid rgba(6, 182, 212, 0.15); text-align: center; color: var(--text-secondary);">
                <div style="font-size: 28px; margin-bottom: 12px;">🔍</div>
                <div style="font-size: 14px; line-height: 1.5;">
                    This profile shows consistent engagement patterns with their audience, indicating genuine influence and potential for effective collaboration.
                </div>
            </div>
        `;

        return `
            <div style="background: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
                <h4 style="color: var(--text-primary); margin-bottom: 20px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    🔥 Engagement Analysis
                    <span style="background: var(--accent-teal); color: white; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600;">
                        ${engagementInsights.length} insights
                    </span>
                    ${engagementInsights.length > 0 ? `
                    <button onclick="dashboard.copyAllInsights(${JSON.stringify(engagementInsights).replace(/"/g, '&quot;')})"
                            style="background: var(--accent-teal); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; margin-left: auto; font-weight: 600;">
                        📋 Copy All
                    </button>
                    ` : ''}
                </h4>
                
                <!-- Engagement Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.05)); border-radius: 12px; border: 1px solid rgba(236, 72, 153, 0.2);">
                        <div style="font-size: 32px; margin-bottom: 8px;">💗</div>
                        <div style="font-size: 24px; font-weight: 800; color: #EC4899; margin-bottom: 4px;">
                            ${avgLikes.toLocaleString()}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">
                            Avg Likes
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05)); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.2);">
                        <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
                        <div style="font-size: 24px; font-weight: 800; color: #22C55E; margin-bottom: 4px;">
                            ${avgComments.toLocaleString()}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">
                            Avg Comments
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.05)); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.2);">
                        <div style="font-size: 32px; margin-bottom: 8px;">📈</div>
                        <div style="font-size: 24px; font-weight: 800; color: #6366F1; margin-bottom: 4px;">
                            ${(engagementRate * 100).toFixed(1)}%
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">
                            Engagement Rate
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)); border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
                        <div style="font-size: 20px; font-weight: 800; color: #F59E0B; margin-bottom: 4px;">
                            ${audienceQuality}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">
                            Audience Quality
                        </div>
                    </div>
                </div>
                
                <!-- AI Insights Display -->
                <div style="background: rgba(255, 255, 255, 0.9); padding: 20px; border-radius: 12px; border: 1px solid var(--border-light);">
                    <h5 style="margin: 0 0 16px 0; color: var(--accent-teal); font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        🎯 Detailed Engagement Analysis
                    </h5>
                    ${insightsHtml}
                </div>
            </div>
        `;
    }

    buildSellingPointsSection(analysisData) {
        if (!analysisData || !analysisData.selling_points) return '';
        
        let sellingPoints = [];
        if (Array.isArray(analysisData.selling_points)) {
            sellingPoints = analysisData.selling_points;
        } else if (typeof analysisData.selling_points === 'string') {
            try {
                sellingPoints = JSON.parse(analysisData.selling_points);
            } catch (e) {
                sellingPoints = analysisData.selling_points.includes('|') 
                    ? analysisData.selling_points.split('|') 
                    : [analysisData.selling_points];
            }
        }
        
        sellingPoints = sellingPoints.filter(point => point && point.trim());
        
        if (sellingPoints.length === 0) return '';
        
        const sellingPointsHtml = sellingPoints.map((point, index) => `
            <div style="margin-bottom: 14px; padding: 18px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.04)); border-radius: 12px; border-left: 4px solid var(--primary-blue); box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">
                <div style="display: flex; align-items: flex-start; gap: 14px;">
                    <div style="background: var(--primary-blue); color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
                        ${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <div style="color: var(--text-primary); line-height: 1.6; font-size: 15px; font-weight: 500;">
                            ${this.escapeHtml(point.trim())}
                        </div>
                    </div>
                    <button onclick="dashboard.copyText('${this.escapeHtml(point.trim()).replace(/'/g, "\\'")}'); this.innerHTML='✅ Copied!'; this.style.background='var(--success)'; setTimeout(() => { this.innerHTML='📋'; this.style.background='none'; }, 2000)" 
                            style="background: none; border: 1px solid var(--primary-blue); color: var(--primary-blue); padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;"
                            onmouseover="this.style.background='var(--primary-blue)'; this.style.color='white'"
                            onmouseout="if(!this.innerHTML.includes('✅')) { this.style.background='none'; this.style.color='var(--primary-blue)'; }">
                        📋
                    </button>
                </div>
            </div>
        `).join('');
        
        return `
            <div style="background: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
                <h4 style="color: var(--text-primary); margin-bottom: 20px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    💡 AI-Generated Selling Points
                    <span style="background: var(--primary-blue); color: white; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600;">
                        ${sellingPoints.length} insights
                    </span>
                    <button onclick="dashboard.copyAllSellingPoints(${JSON.stringify(sellingPoints).replace(/"/g, '&quot;')})"
                            style="background: var(--success); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; margin-left: auto; font-weight: 600; transition: all 0.2s;">
                        📋 Copy All
                    </button>
                </h4>
                
                <!-- Usage Tips Header -->
                <div style="margin-bottom: 20px; padding: 16px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border-left: 4px solid var(--primary-blue);">
                    <h5 style="margin: 0 0 10px 0; color: var(--primary-blue); font-size: 14px; font-weight: 700;">
                        🎯 How to Use These Selling Points
                    </h5>
                    <ul style="margin: 0; padding-left: 16px; color: var(--text-secondary); font-size: 13px; line-height: 1.6;">
                        <li><strong>Initial Outreach:</strong> Use 1-2 points in your opening message to show research</li>
                        <li><strong>Value Proposition:</strong> Reference specific achievements to build credibility</li>
                        <li><strong>Conversation Starters:</strong> Perfect for building rapport and showing genuine interest</li>
                        <li><strong>Follow-up Messages:</strong> Use different points for subsequent touchpoints</li>
                    </ul>
                </div>
                
                <!-- Selling Points List -->
                <div class="selling-points-container">
                    ${sellingPointsHtml}
                </div>
                
                <!-- Pro Tip Footer -->
                <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.05)); border-radius: 10px; text-align: center; border: 1px solid rgba(16, 185, 129, 0.2);">
                    <p style="margin: 0; font-size: 13px; color: var(--success); font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        💡 <span>Pro Tip: Combine 2-3 of these points in your outreach for maximum impact and personalization</span>
                    </p>
                </div>
            </div>
        `;
    }

    buildAIInsightsSection(analysisData) {
        if (!analysisData) return '';
        
        return `
            <div style="background: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
                <h4 style="color: var(--text-primary); margin-bottom: 20px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    🤖 AI Analysis Summary
                    <span style="background: var(--secondary-purple); color: white; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600;">
                        GPT-4o Powered
                    </span>
                </h4>
                
                <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.05)); padding: 24px; border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.2);">
                    <!-- Analysis Breakdown Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                        <div>
                            <h5 style="margin: 0 0 12px 0; color: var(--secondary-purple); font-size: 15px; font-weight: 700;">
                                🎯 Lead Quality Assessment
                            </h5>
                            <div style="background: rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 10px; border: 1px solid rgba(168, 85, 247, 0.1);">
                                <div style="color: var(--text-primary); line-height: 1.6; font-size: 14px;">
                                    ${this.generateQualityAssessment(analysisData)}
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h5 style="margin: 0 0 12px 0; color: var(--secondary-purple); font-size: 15px; font-weight: 700;">
                                💼 Business Relevance
                            </h5>
                            <div style="background: rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 10px; border: 1px solid rgba(168, 85, 247, 0.1);">
                                <div style="color: var(--text-primary); line-height: 1.6; font-size: 14px;">
                                    ${this.generateRelevanceAssessment(analysisData)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- AI Recommendation -->
                    <div style="background: rgba(255, 255, 255, 0.9); padding: 20px; border-radius: 12px; border-left: 4px solid var(--secondary-purple);">
                        <h5 style="margin: 0 0 12px 0; color: var(--secondary-purple); font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            📋 AI Recommendation
                            <span style="font-size: 20px;">🎯</span>
                        </h5>
                        <div style="color: var(--text-primary); line-height: 1.7; font-size: 14px; font-weight: 500;">
                            ${this.generateAIRecommendation(analysisData)}
                        </div>
                    </div>
                    
                    <!-- Additional Insights -->
                    ${analysisData.audience_quality || analysisData.latest_posts ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px;">
                        ${analysisData.audience_quality ? `
                        <div style="background: rgba(255, 255, 255, 0.7); padding: 16px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                            <div style="font-weight: 700; color: var(--secondary-purple); margin-bottom: 4px;">
                                ${analysisData.audience_quality}
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">
                                Audience Quality
                            </div>
                        </div>
                        ` : ''}
                        
                        ${analysisData.latest_posts ? `
                        <div style="background: rgba(255, 255, 255, 0.7); padding: 16px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 8px;">📱</div>
                            <div style="font-weight: 700; color: var(--secondary-purple); margin-bottom: 4px;">
                                ${this.getPostsCount(analysisData.latest_posts)} Posts
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">
                                Analyzed
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    buildOutreachMessageSection(outreachMessage) {
        if (!outreachMessage) return '';
        
        const escapedMessage = this.escapeHtml(outreachMessage);
        
        return `
            <div style="background: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
                <h4 style="color: var(--text-primary); margin-bottom: 20px; font-size: 18px; display: flex; align-items: center; justify-content: space-between;">
                    💬 AI-Crafted Outreach Message
                    <div style="display: flex; gap: 10px;">
                        <button onclick="dashboard.copyOutreachMessage('${outreachMessage.replace(/'/g, "\\'")}', this)" 
                                style="background: var(--primary-blue); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
                            📋 Copy Message
                        </button>
                        <button onclick="dashboard.editMessage('${outreachMessage.replace(/'/g, "\\'")}')"
                                style="background: var(--secondary-purple); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s;">
                            ✏️ Edit
                        </button>
                    </div>
                </h4>
                
                <!-- Message Content -->
                <div style="background: linear-gradient(135deg, #F0FDF9, #ECFDF5); padding: 24px; border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.2); margin-bottom: 20px; position: relative;">
                    <div style="position: absolute; top: 16px; right: 16px; font-size: 24px; opacity: 0.3;">💬</div>
                    <div id="message-content" style="color: var(--text-primary); line-height: 1.8; font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative; z-index: 1;">
                        "${escapedMessage}"
                    </div>
                </div>
                
                <!-- Message Analysis Metrics -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
                    <div style="background: rgba(34, 197, 94, 0.1); padding: 14px; border-radius: 10px; text-align: center; border: 1px solid rgba(34, 197, 94, 0.2);">
                        <div style="font-size: 18px; font-weight: 700; color: var(--success);">
                            ${this.calculateMessageLength(outreachMessage)}
                        </div>
                        <div style="font-size: 11px; color: var(--success); font-weight: 600; text-transform: uppercase;">
                            Characters
                        </div>
                    </div>
                    <div style="background: rgba(59, 130, 246, 0.1); padding: 14px; border-radius: 10px; text-align: center; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <div style="font-size: 18px; font-weight: 700; color: var(--primary-blue);">
                            ${this.calculatePersonalizationScore(outreachMessage)}%
                        </div>
                        <div style="font-size: 11px; color: var(--primary-blue); font-weight: 600; text-transform: uppercase;">
                            Personalization
                        </div>
                    </div>
                    <div style="background: rgba(168, 85, 247, 0.1); padding: 14px; border-radius: 10px; text-align: center; border: 1px solid rgba(168, 85, 247, 0.2);">
                        <div style="font-size: 18px; font-weight: 700; color: var(--secondary-purple);">
                            High
                        </div>
                        <div style="font-size: 11px; color: var(--secondary-purple); font-weight: 600; text-transform: uppercase;">
                            AI Quality
                        </div>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.1); padding: 14px; border-radius: 10px; text-align: center; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="font-size: 18px; font-weight: 700; color: var(--warning);">
                            ${this.calculateReadabilityScore(outreachMessage)}%
                        </div>
                        <div style="font-size: 11px; color: var(--warning); font-weight: 600; text-transform: uppercase;">
                            Readability
                        </div>
                    </div>
                </div>
                
                <!-- Usage Guidelines -->
                <div style="background: rgba(255, 255, 255, 0.8); padding: 20px; border-radius: 12px; border: 1px dashed rgba(59, 130, 246, 0.3);">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="font-size: 24px;">💡</div>
                        <div style="flex: 1;">
                            <p style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-primary); font-weight: 600;">
                                Best Practices for This Message:
                            </p>
                            <ul style="margin: 0; padding-left: 16px; color: var(--text-secondary); font-size: 13px; line-height: 1.6;">
                                <li><strong>Timing:</strong> Send during business hours (9 AM - 5 PM) in their timezone for better response rates</li>
                                <li><strong>Platform Adaptation:</strong> Shorten for Instagram DMs, expand for LinkedIn or email</li>
                                <li><strong>Follow-up Strategy:</strong> Wait 3-5 business days before following up if no response</li>
                                <li><strong>Personalization:</strong> Add 1-2 recent post references for extra relevance</li>
                                <li><strong>Call to Action:</strong> Be clear about next steps and make it easy to respond</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    buildUpgradePromptSection(lead) {
        return `
            <div style="background: linear-gradient(135deg, #FFF7ED, #FED7AA); padding: 32px; border-radius: 16px; margin-bottom: 24px; text-align: center; box-shadow: 0 6px 24px rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3);">
                <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
                <h4 style="color: var(--text-primary); margin-bottom: 16px; font-size: 24px; font-weight: 700;">
                    Unlock Premium Insights for @${lead.username}
                </h4>
                <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6; max-width: 500px; margin-left: auto; margin-right: auto; font-size: 15px;">
                    Deep analysis provides detailed engagement metrics, niche-fit scoring, personalized outreach messages, and actionable selling points to maximize your conversion potential with this lead.
                </p>
                
                <!-- Feature Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    <div style="background: rgba(255, 255, 255, 0.7); padding: 16px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Engagement Analysis</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">Real metrics & insights</div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.7); padding: 16px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="font-size: 24px; margin-bottom: 8px;">🎯</div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Niche Scoring</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">AI-powered fit analysis</div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.7); padding: 16px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="font-size: 24px; margin-bottom: 8px;">💬</div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Custom Messages</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">Personalized outreach</div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.7); padding: 16px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="font-size: 24px; margin-bottom: 8px;">💡</div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Selling Points</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">Strategic advantages</div>
                    </div>
                </div>
                
                <button onclick="dashboard.showAnalysisModal('${lead.username}')" 
                        style="background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 16px; transition: all 0.3s; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); text-transform: uppercase; letter-spacing: 0.5px;"
                        onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(59, 130, 246, 0.5)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.4)'">
                    🔍 Run Deep Analysis Now
                </button>
                
                <div style="margin-top: 16px; font-size: 12px; color: var(--text-secondary);">
                    ⚡ Results in 30-60 seconds • 💳 2 credits
                </div>
            </div>
        `;
    }

    // ===============================================================================
    // HELPER FUNCTIONS AND UTILITIES
    // ===============================================================================

    parseEngagementInsights(analysisData) {
        let insights = [];
        
        if (analysisData.engagement_insights) {
            try {
                if (typeof analysisData.engagement_insights === 'string') {
                    if (analysisData.engagement_insights.startsWith('[')) {
                        insights = JSON.parse(analysisData.engagement_insights);
                    } else if (analysisData.engagement_insights.includes('|')) {
                        insights = analysisData.engagement_insights.split('|').map(s => s.trim());
                    } else {
                        insights = analysisData.engagement_insights
                            .split(/[.!]\s+/)
                            .filter(s => s.trim().length > 10)
                            .map(s => s.trim());
                    }
                } else if (Array.isArray(analysisData.engagement_insights)) {
                    insights = analysisData.engagement_insights;
                }
            } catch (e) {
                console.warn('Failed to parse engagement insights:', e);
                insights = [analysisData.engagement_insights];
            }
        }
        
        return insights.filter(insight => insight && insight.length > 5);
    }

    generateQualityAssessment(analysisData) {
        const engagementScore = analysisData.engagement_score || 0;
        const totalScore = analysisData.score_total || 0;
        
        if (totalScore >= 80) {
            return `<strong>Exceptional Lead Quality:</strong> This profile demonstrates outstanding engagement patterns, authentic audience interaction, and strong alignment with business objectives. High conversion probability with immediate outreach recommended.`;
        } else if (totalScore >= 60) {
            return `<strong>Good Lead Potential:</strong> Solid engagement metrics and reasonable audience quality indicate good collaboration potential. Consider for priority outreach with personalized approach.`;
        } else {
            return `<strong>Moderate Lead Quality:</strong> Basic engagement levels with room for improvement. Suitable for nurturing campaigns or strategic long-term relationship building.`;
        }
    }

    generateRelevanceAssessment(analysisData) {
        const nicheFitScore = analysisData.score_niche_fit || 0;
        
        if (nicheFitScore >= 80) {
            return `<strong>Perfect Business Fit:</strong> This lead's content, audience, and brand alignment match your business profile exceptionally well. Prime candidate for partnership or collaboration.`;
        } else if (nicheFitScore >= 60) {
            return `<strong>Good Business Alignment:</strong> Strong overlap in target audience and content themes. Good potential for mutually beneficial partnerships with proper approach.`;
        } else {
            return `<strong>Moderate Business Fit:</strong> Some alignment present but may require more strategic approach to establish relevance and value proposition.`;
        }
    }

    generateAIRecommendation(analysisData) {
        const totalScore = analysisData.score_total || 0;
        const engagementScore = analysisData.engagement_score || 0;
        const nicheFitScore = analysisData.score_niche_fit || 0;
        
        if (totalScore >= 80 && engagementScore >= 75) {
            return `<strong>🚀 Immediate Action Recommended:</strong> This is a high-value lead with excellent engagement and strong business fit. Prioritize outreach within 24-48 hours using the personalized message above. Consider offering premium collaboration opportunities or exclusive partnerships.`;
        } else if (totalScore >= 60 && nicheFitScore >= 70) {
            return `<strong>📈 Qualified Lead - Schedule Outreach:</strong> Good potential for conversion with strategic approach. Schedule outreach within the next week. Focus on value proposition and consider starting with smaller collaboration to build relationship and trust.`;
        } else if (engagementScore >= 60) {
            return `<strong>💬 Engagement-First Strategy:</strong> Strong audience engagement indicates influence potential. Start with organic engagement on their content, build relationship through comments and interactions before direct outreach.`;
        } else {
            return `<strong>🌱 Long-term Nurturing Approach:</strong> Consider adding to nurturing sequence for future opportunities. Monitor their content growth and engagement improvements. Focus on building organic relationship through value-first interactions.`;
        }
    }

    calculateMessageLength(message) {
        return message ? message.length : 0;
    }

    calculatePersonalizationScore(message) {
        if (!message) return 0;
        
        let score = 40; // Base score
        
        // Check for personal elements
        if (message.includes('your') || message.includes('you')) score += 15;
        if (message.includes('content') || message.includes('posts')) score += 10;
        if (message.includes('audience') || message.includes('followers')) score += 10;
        if (message.includes('brand') || message.includes('business')) score += 8;
        if (/\b(love|enjoy|appreciate|impressed)\b/i.test(message)) score += 7;
        if (message.length > 100 && message.length < 250) score += 5;
        if (message.length > 250 && message.length < 400) score += 3;
        
        return Math.min(score, 95);
    }

    calculateReadabilityScore(message) {
        if (!message) return 0;
        
        const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = message.split(/\s+/).filter(w => w.length > 0);
        const avgWordsPerSentence = words.length / sentences.length;
        
        let score = 50; // Base readability score
        
        // Optimal sentence length (10-20 words)
        if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
            score += 20;
        } else if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 25) {
            score += 10;
        } else {
            score -= 10;
        }
        
        // Check for complex words (3+ syllables)
        const complexWords = words.filter(word => this.countSyllables(word) >= 3);
        const complexWordRatio = complexWords.length / words.length;
        
        if (complexWordRatio < 0.1) score += 15;
        else if (complexWordRatio < 0.2) score += 5;
        else score -= 10;
        
        // Sentence variety bonus
        if (sentences.length >= 3) score += 10;
        
        // Conversational tone indicators
        if (/\b(you|your|we|our|let's)\b/i.test(message)) score += 5;
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    countSyllables(word) {
        if (!word) return 0;
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        
        const vowels = 'aeiouy';
        let syllableCount = 0;
        let previousWasVowel = false;
        
        for (let i = 0; i < word.length; i++) {
            const isVowel = vowels.includes(word[i]);
            if (isVowel && !previousWasVowel) {
                syllableCount++;
            }
            previousWasVowel = isVowel;
        }
        
        // Handle silent 'e'
        if (word.endsWith('e')) syllableCount--;
        
        return Math.max(1, syllableCount);
    }

    getPostsCount(latestPosts) {
        if (!latestPosts) return 0;
        
        try {
            if (typeof latestPosts === 'string') {
                const parsed = JSON.parse(latestPosts);
                return Array.isArray(parsed) ? parsed.length : 0;
            } else if (Array.isArray(latestPosts)) {
                return latestPosts.length;
            }
        } catch (error) {
            console.warn('Could not parse latest_posts:', error);
        }
        
        return 0;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Business profile loading
async loadBusinessProfilesNow() {
    console.log('🏢 Loading business profiles NOW...');
    
    const businessSelect = document.getElementById('business-id');
    if (!businessSelect) {
        console.error('❌ Business dropdown not found');
        return;
    }

    businessSelect.innerHTML = '<option value="">Loading...</option>';
    businessSelect.disabled = true;

    try {
        let retries = 0;
        const maxRetries = 5;
        
        while ((!window.OsliraApp?.user || !window.OsliraApp?.supabase) && retries < maxRetries) {
            console.log(`⏳ Waiting for auth... (${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        
        const supabase = window.OsliraApp?.supabase;
        const user = window.OsliraApp?.user;

        if (!supabase || !user) {
            businessSelect.innerHTML = '<option value="">Please log in first</option>';
            businessSelect.disabled = false;
            return;
        }

        const { data: profiles, error } = await supabase
            .from('business_profiles')
            .select('id, business_name, is_active')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Business profiles error:', error);
            businessSelect.innerHTML = `<option value="">Error: ${error.message}</option>`;
            businessSelect.disabled = false;
            return;
        }

        if (profiles && profiles.length > 0) {
            const activeProfiles = profiles.filter(p => p.is_active !== false);
            
            if (activeProfiles.length > 0) {
                businessSelect.innerHTML = [
                    '<option value="">Select business profile...</option>',
                    ...activeProfiles.map(profile => 
                        `<option value="${profile.id}">${profile.business_name || 'Unnamed Business'}</option>`
                    )
                ].join('');
                console.log(`✅ Loaded ${activeProfiles.length} business profiles`);
            } else {
                businessSelect.innerHTML = '<option value="">No active business profiles</option>';
            }
        } else {
            businessSelect.innerHTML = '<option value="">No business profiles - create one first</option>';
        }

        businessSelect.disabled = false;

    } catch (error) {
        console.error('❌ Business profiles loading failed:', error);
        businessSelect.innerHTML = '<option value="">Failed to load profiles</option>';
        businessSelect.disabled = false;
    }
}

// Form submission
async submitAnalysis(event) {
    event.preventDefault();
    console.log('📝 Analysis form submission started');
    
    const analysisType = document.getElementById('analysis-type')?.value;
    const profileInput = document.getElementById('profile-input')?.value?.trim();
    const businessId = document.getElementById('business-id')?.value;
    
    if (!analysisType) {
        window.OsliraApp?.showMessage('Please select an analysis type', 'error');
        return;
    }
    
    if (!profileInput) {
        window.OsliraApp?.showMessage('Please enter an Instagram username', 'error');
        return;
    }
    
    if (!businessId) {
        window.OsliraApp?.showMessage('Please select a business profile', 'error');
        return;
    }
    
    const cleanUsername = profileInput.replace(/^@/, '');
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.innerHTML = '🔄 Analyzing...';
        submitBtn.disabled = true;
    }
    
    try {
        this.closeModal('analysisModal');
        window.OsliraApp?.showMessage('Starting analysis... This may take a moment.', 'info');
        
        // TODO: Replace with your actual worker URL
        const response = await fetch(`${window.CONFIG?.workerUrl || 'https://your-worker.workers.dev'}/analytics/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.OsliraApp?.user?.access_token}`
            },
            body: JSON.stringify({
                username: cleanUsername,
                analysis_type: analysisType,
                business_id: businessId,
                platform: 'instagram'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.OsliraApp?.showMessage('Analysis completed successfully!', 'success');
            await this.loadDashboardData();
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
        
    } catch (error) {
        console.error('❌ Analysis failed:', error);
        window.OsliraApp?.showMessage(`Analysis failed: ${error.message}`, 'error');
    } finally {
        if (submitBtn && originalText) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Missing utility methods
showBulkUpload() {
    const modal = document.getElementById('bulkModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        window.OsliraApp?.showMessage('Bulk upload feature coming soon!', 'info');
    }
}

async loadRecentActivity() {
    await this.loadDashboardData();
}

async refreshActivity() {
    await this.loadDashboardData();
    window.OsliraApp?.showMessage('Activity refreshed!', 'success');
}

selectAllLeads(isChecked) {
    const visibleLeads = this.allLeads.filter(lead => {
        const row = document.querySelector(`tr[data-lead-id="${lead.id}"]`);
        return row && row.style.display !== 'none';
    });
    
    if (isChecked) {
        visibleLeads.forEach(lead => this.selectedLeads.add(lead.id));
    } else {
        this.selectedLeads.clear();
    }
    
    document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
        const leadId = checkbox.dataset.leadId;
        checkbox.checked = this.selectedLeads.has(leadId);
    });
    
    this.updateBulkActionsVisibility();
}

async bulkDeleteLeads() {
    if (this.selectedLeads.size === 0) {
        window.OsliraApp?.showMessage('No leads selected', 'warning');
        return;
    }
    
    if (!confirm(`Delete ${this.selectedLeads.size} selected leads?`)) {
        return;
    }
    
    // TODO: Implement bulk delete
    window.OsliraApp?.showMessage('Bulk delete functionality coming soon!', 'info');
}

clearSelection() {
    this.selectedLeads.clear();
    document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    this.updateBulkActionsVisibility();
}

updateBulkActionsVisibility() {
    const bulkActions = document.querySelector('.bulk-actions');
    const selectedCount = document.getElementById('selected-count');
    
    if (bulkActions) {
        bulkActions.style.display = this.selectedLeads.size > 0 ? 'flex' : 'none';
    }
    
    if (selectedCount) {
        selectedCount.textContent = this.selectedLeads.size;
    }
}

searchLeads(searchTerm) {
    if (!searchTerm.trim()) {
        this.displayLeads(this.allLeads);
        return;
    }
    
    const filteredLeads = this.allLeads.filter(lead => 
        lead.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    this.displayLeads(filteredLeads);
}

showSupportModal() {
    const modal = document.getElementById('supportModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

exportLeads() {
    window.OsliraApp?.showMessage('Export functionality coming soon!', 'info');
}

    // ===============================================================================
    // INTERACTION METHODS FOR BUTTONS AND ACTIONS
    // ===============================================================================

    copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (window.OsliraApp && window.OsliraApp.showMessage) {
                    window.OsliraApp.showMessage('Copied to clipboard!', 'success');
                }
            }).catch(err => {
                console.error('Failed to copy text:', err);
                this.fallbackCopyText(text);
            });
        } else {
            this.fallbackCopyText(text);
        }
    }

    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            if (window.OsliraApp && window.OsliraApp.showMessage) {
                window.OsliraApp.showMessage('Copied to clipboard!', 'success');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            if (window.OsliraApp && window.OsliraApp.showMessage) {
                window.OsliraApp.showMessage('Copy failed. Please select and copy manually.', 'error');
            }
        }
        
        document.body.removeChild(textArea);
    }

    copyAllInsights(insights) {
        const formattedText = insights.map((insight, index) => `${index + 1}. ${insight}`).join('\n\n');
        this.copyText(formattedText);
    }

    copyAllSellingPoints(points) {
        const formattedText = points.map((point, index) => `${index + 1}. ${point}`).join('\n\n');
        this.copyText(formattedText);
    }

    copyOutreachMessage(message, button) {
        this.copyText(message);
        
        if (button) {
            const originalText = button.innerHTML;
            const originalBackground = button.style.background;
            
            button.innerHTML = '✅ Copied!';
            button.style.background = 'var(--success)';
            button.disabled = true;
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = originalBackground;
                button.disabled = false;
            }, 2500);
        }
    }

    editMessage(originalMessage) {
        // Create a modal for editing the message
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 32px; border-radius: 16px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 20px 0; color: var(--text-primary); font-size: 20px;">
                    ✏️ Edit Outreach Message
                </h3>
                
                <textarea id="edit-message-textarea" 
                          style="width: 100%; height: 200px; padding: 16px; border: 2px solid var(--border-light); border-radius: 8px; font-size: 14px; line-height: 1.6; resize: vertical; font-family: inherit;"
                          placeholder="Enter your personalized message...">${originalMessage}</textarea>
                
                <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: var(--text-secondary); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cancel
                    </button>
                    <button onclick="dashboard.saveEditedMessage()" 
                            style="background: var(--primary-blue); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Save Changes
                    </button>
                </div>
                
                <div style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; font-size: 12px; color: var(--text-secondary);">
                    💡 <strong>Tip:</strong> Personalize further by mentioning specific posts, achievements, or recent activities from their profile.
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus the textarea
        setTimeout(() => {
            const textarea = document.getElementById('edit-message-textarea');
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
        }, 100);
    }

   updateInputField() {
    console.log('📝 Input field update triggered');
    
    const analysisType = document.getElementById('analysis-type');
    const inputContainer = document.getElementById('input-field-container');
    const inputField = document.getElementById('profile-input');
    const inputLabel = document.getElementById('input-label');
    const inputHelp = document.getElementById('input-help');
    
    if (!analysisType || !inputContainer || !inputField || !inputLabel || !inputHelp) {
        console.error('❌ Missing form elements for updateInputField');
        return;
    }
    
    const selectedType = analysisType.value;
    console.log('🎯 Selected analysis type:', selectedType);
    
    inputField.value = '';
    
    if (selectedType && (selectedType === 'light' || selectedType === 'deep')) {
        console.log('✅ Showing input container');
        
        inputContainer.style.display = 'block';
        
        if (selectedType === 'light') {
            inputLabel.textContent = 'Instagram Username *';
            inputField.placeholder = 'username';
            inputHelp.innerHTML = 'Enter just the username (without @) - <span style="color: var(--primary-blue); font-weight: 600;">1 credit</span>';
        } else if (selectedType === 'deep') {
            inputLabel.textContent = 'Instagram Username *';
            inputField.placeholder = 'username';  
            inputHelp.innerHTML = 'Enter just the username (without @) - <span style="color: var(--accent-teal); font-weight: 600;">2 credits - Full analysis</span>';
        }
        
        setTimeout(() => {
            inputField.focus();
            console.log('🎯 Input field focused');
        }, 100);
        
    } else {
        console.log('📋 Hiding input container');
        inputContainer.style.display = 'none';
    }
}
    saveEditedMessage() {
        const textarea = document.getElementById('edit-message-textarea');
        if (!textarea) return;
        
        const newMessage = textarea.value.trim();
        if (!newMessage) {
            if (window.OsliraApp && window.OsliraApp.showMessage) {
                window.OsliraApp.showMessage('Message cannot be empty', 'error');
            }
            return;
        }
        
        // Update the message content in the DOM
        const messageContent = document.getElementById('message-content');
        if (messageContent) {
            messageContent.innerHTML = `"${this.escapeHtml(newMessage)}"`;
        }
        
        // Remove the modal
        const modal = textarea.closest('div[style*="position: fixed"]');
        if (modal) {
            modal.remove();
        }
        
        if (window.OsliraApp && window.OsliraApp.showMessage) {
            window.OsliraApp.showMessage('Message updated successfully!', 'success');
        }
    }

    // ===============================================================================
    // DASHBOARD DATA MANAGEMENT
    // ===============================================================================

  displayLeads(leads) {
    const tableBody = document.getElementById('activity-table');
    
    if (!tableBody) {
        console.error('displayLeads: activity-table element not found');
        return;
    }
    
    if (leads && leads.length > 0) {
        // Show leads normally
        tableBody.innerHTML = leads.map(lead => {
            const analysisType = lead.analysis_type || 'light';
            const scoreClass = lead.score >= 80 ? 'score-high' : lead.score >= 60 ? 'score-medium' : 'score-low';
            
            const profilePicUrl = lead.profile_pic_url;
            const profilePicHtml = profilePicUrl 
                ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=40&h=40&fit=cover&a=attention" 
                        alt="@${lead.username}" 
                        style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                : '';
            
            const fallbackAvatar = `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; display: ${profilePicUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">
                ${lead.username.charAt(0).toUpperCase()}
            </div>`;
            
            return `
                <tr data-lead-id="${lead.id}" style="border-bottom: 1px solid var(--border-light); transition: all 0.2s ease;">
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-light);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <input type="checkbox" class="lead-checkbox" data-lead-id="${lead.id}" 
                                   onchange="dashboard.toggleLeadSelection('${lead.id}', this.checked)"
                                   style="margin: 0;">
                            <div style="position: relative;">
                                ${profilePicHtml}
                                ${fallbackAvatar}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
                                    @${lead.username}
                                </div>
                                <div style="font-size: 12px; color: var(--text-secondary);">
                                    ${lead.platform || 'Instagram'}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-light); text-align: center;">
                        <span class="score-badge ${scoreClass}" style="padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 14px;">
                            ${lead.score || 0}
                        </span>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-light); text-align: center;">
                        <span style="font-size: 14px; color: var(--text-secondary);">${lead.followers_count ? lead.followers_count.toLocaleString() : 'N/A'}</span>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-light); text-align: center;">
                        <span class="analysis-type-badge ${analysisType}" style="padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                            ${analysisType === 'deep' ? 'Deep' : 'Light'}
                        </span>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-light); text-align: center;">
                        <span style="font-size: 12px; color: var(--text-secondary);">${new Date(lead.created_at).toLocaleDateString()}</span>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-light); text-align: center;">
                        <button onclick="dashboard.viewLead('${lead.id}')" 
                                style="background: var(--primary-blue); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            View Details
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        // ✅ CLEAN EMPTY STATE - No demo data
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 24px; opacity: 0.6;">🎯</div>
                    <h3 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 24px;">Ready to Find Your First Lead?</h3>
                    <p style="margin: 0 0 24px 0; color: var(--text-secondary); font-size: 16px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                        Use our AI-powered analysis to discover high-quality prospects and generate personalized outreach messages.
                    </p>
                    <button onclick="dashboard.showAnalysisModal()" 
                            style="background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; border: none; padding: 16px 32px; border-radius: 12px; cursor: pointer; font-size: 16px; font-weight: 600; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
                        🚀 Research Your First Lead
                    </button>
                </td>
            </tr>
        `;
    }
}
    toggleLeadSelection(leadId, isChecked) {
        if (isChecked) {
            this.selectedLeads.add(leadId);
        } else {
            this.selectedLeads.delete(leadId);
        }
        
        this.updateBulkActionsVisibility();
        this.updateSelectAllButton();
        
        const row = document.querySelector(`tr[data-lead-id="${leadId}"]`);
        if (row) {
            row.classList.toggle('selected', isChecked);
        }
    }

    selectAllLeads(isChecked) {
        const visibleLeads = this.allLeads.filter(lead => {
            const row = document.querySelector(`tr[data-lead-id="${lead.id}"]`);
            return row && row.style.display !== 'none';
        });
        
        if (isChecked) {
            visibleLeads.forEach(lead => this.selectedLeads.add(lead.id));
        } else {
            this.selectedLeads.clear();
        }
        
        document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
            const leadId = checkbox.dataset.leadId;
            checkbox.checked = this.selectedLeads.has(leadId);
        });
        
        this.updateBulkActionsVisibility();
    }

    updateBulkActionsVisibility() {
        const bulkActions = document.querySelector('.bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (bulkActions) {
            bulkActions.style.display = this.selectedLeads.size > 0 ? 'flex' : 'none';
        }
        
        if (selectedCount) {
            selectedCount.textContent = this.selectedLeads.size;
        }
    }

    updateSelectAllButton() {
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (!selectAllCheckbox) return;
        
        const visibleLeads = this.allLeads.filter(lead => {
            const row = document.querySelector(`tr[data-lead-id="${lead.id}"]`);
            return row && row.style.display !== 'none';
        });
        
        const allSelected = visibleLeads.length > 0 && visibleLeads.every(lead => this.selectedLeads.has(lead.id));
        const someSelected = visibleLeads.some(lead => this.selectedLeads.has(lead.id));
        
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
    }

    applyActivityFilter() {
        const filter = document.getElementById('activity-filter')?.value || 'all';
        let filteredLeads = [...this.allLeads];

        switch (filter) {
            case 'light':
                filteredLeads = filteredLeads.filter(lead => 
                    lead.analysis_type === 'light' || !lead.analysis_type
                );
                break;
            case 'deep':
                filteredLeads = filteredLeads.filter(lead => 
                    lead.analysis_type === 'deep'
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
        
        // Update filter results count
        const filterCount = document.getElementById('filter-results-count');
        if (filterCount) {
            filterCount.textContent = `${filteredLeads.length} results`;
        }
    }

    searchLeads(searchTerm) {
        if (!searchTerm.trim()) {
            this.displayLeads(this.allLeads);
            return;
        }
        
        const filteredLeads = this.allLeads.filter(lead => 
            lead.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.displayLeads(filteredLeads);
    }

   updateDashboardStats() {
    try {
        const totalLeads = this.allLeads.length;
        const avgScore = totalLeads > 0 
            ? Math.round(this.allLeads.reduce((sum, lead) => sum + (lead.score || 0), 0) / totalLeads)
            : 0;

        // Update stats in the UI - show zeros when no leads
        const statsElements = {
            'total-leads': totalLeads.toLocaleString(),
            'avg-score': totalLeads > 0 ? avgScore.toString() : '-',
            'high-quality-leads': totalLeads > 0 ? this.allLeads.filter(lead => (lead.score || 0) >= 80).length.toString() : '-',
            'this-month': totalLeads > 0 ? totalLeads.toString() : '-'
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        console.log(`📊 Stats updated: ${totalLeads} leads, avg score ${avgScore || 'N/A'}`);

    } catch (error) {
        console.warn('⚠️ Stats update failed:', error);
    }
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
            leadsTrend.textContent = `${totalLeads} total analyzed`;
            leadsTrend.className = 'trend up';
        }
        
        if (scoreTrend && avgScore > 0) {
            scoreTrend.textContent = `${avgScore}/100 average quality`;
            scoreTrend.className = avgScore >= 70 ? 'trend up' : avgScore >= 50 ? 'trend stable' : 'trend down';
        }
        
        if (highValueTrend && highValueLeads > 0) {
            const percentage = totalLeads > 0 ? Math.round((highValueLeads / totalLeads) * 100) : 0;
            highValueTrend.textContent = `${percentage}% high-value leads`;
            highValueTrend.className = percentage >= 20 ? 'trend up' : 'trend stable';
        }
    }

    showLoadingState() {
        const tableBody = document.getElementById('activity-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <div style="font-size: 32px; margin-bottom: 16px;">🔄</div>
                        <h3 style="margin: 0 0 8px 0;">Loading Dashboard</h3>
                        <p style="margin: 0; color: var(--text-secondary);">Fetching your leads...</p>
                    </td>
                </tr>
            `;
        }
    }

    hideLoadingState() {
        // Loading state is automatically replaced by displayLeads()
    }

    displayErrorState(message) {
        const tableBody = document.getElementById('activity-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--error);">
                        <div style="font-size: 32px; margin-bottom: 16px;">⚠️</div>
                        <h3 style="margin: 0 0 8px 0;">Error Loading Data</h3>
                        <p style="margin: 0;">${message}</p>
                        <button onclick="dashboard.loadDashboardData()" 
                                style="margin-top: 16px; background: var(--primary-blue); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    // ===============================================================================
    // MODAL AND UI MANAGEMENT
    // ===============================================================================

   closeModal(modalId) {
    console.log('❌ Closing modal:', modalId);
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Reset form if it's the analysis modal
        if (modalId === 'analysisModal') {
            const form = document.getElementById('analysisForm');
            if (form) {
                form.reset();
            }
            
            const inputContainer = document.getElementById('input-field-container');
            if (inputContainer) {
                inputContainer.style.display = 'none';
            }
        }
        
        console.log('✅ Modal closed:', modalId);
    } else {
        console.error('❌ Modal not found:', modalId);
    }
}

    async debugBusinessProfiles() {
    console.log('🔍 DEBUG: Testing business profiles...');
    
    const supabase = window.OsliraApp?.supabase;
    const user = window.OsliraApp?.user;
    
    console.log('Auth status:', {
        hasSupabase: !!supabase,
        hasUser: !!user,
        userId: user?.id
    });
    
    if (!supabase || !user) {
        console.log('❌ No auth available');
        return;
    }
    
    try {
        // Test query
        const { data, error, count } = await supabase
            .from('business_profiles')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id);
            
        console.log('📊 Business profiles debug result:', {
            data,
            error,
            count,
            query: `business_profiles where user_id = ${user.id}`
        });
        
        if (error) {
            console.error('❌ Query error:', error);
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}



   showAnalysisModal() {
    console.log('🔍 Opening analysis modal...');
    
    const modal = document.getElementById('analysisModal');
    if (!modal) {
        console.error('❌ Analysis modal not found in DOM');
        return;
    }
    
    // Reset form completely
    const form = document.getElementById('analysisForm');
    if (form) {
        form.reset();
    }
    
    // Reset all form elements
    const analysisType = document.getElementById('analysis-type');
    const profileInput = document.getElementById('profile-input');
    const inputContainer = document.getElementById('input-field-container');
    
    if (analysisType) {
        analysisType.value = '';
    }
    if (profileInput) {
        profileInput.value = '';
    }
    if (inputContainer) {
        inputContainer.style.display = 'none';
    }
    
    // Load business profiles when modal opens
    this.loadBusinessProfilesNow();
    
    // Show the modal
    modal.style.display = 'flex';
    console.log('✅ Analysis modal shown');
    
    // Focus on analysis type dropdown
    setTimeout(() => {
        if (analysisType) {
            analysisType.focus();
        }
    }, 200);
}
    // ===============================================================================
    // BULK OPERATIONS
    // ===============================================================================

    async bulkDeleteLeads() {
        if (this.selectedLeads.size === 0) {
            window.OsliraApp.showMessage('No leads selected', 'warning');
            return;
        }

        const confirmMessage = `Are you sure you want to delete ${this.selectedLeads.size} lead${this.selectedLeads.size > 1 ? 's' : ''}? This action cannot be undone.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        if (!bulkDeleteBtn) return;

        const originalText = bulkDeleteBtn.innerHTML;
        bulkDeleteBtn.innerHTML = '🔄 Deleting...';
        bulkDeleteBtn.disabled = true;

        try {
            const supabase = window.OsliraApp.supabase;
            const user = window.OsliraApp.user;

            if (!supabase || !user) {
                throw new Error('Database connection not available');
            }

            // Convert Set to Array for database query
            const leadIds = Array.from(this.selectedLeads);

            // Delete from lead_analyses first (foreign key constraint)
            const { error: analysisError } = await supabase
                .from('lead_analyses')
                .delete()
                .in('lead_id', leadIds);

            if (analysisError) {
                console.warn('Some analysis records could not be deleted:', analysisError.message);
            }

            // Delete from leads table
            const { error: leadsError } = await supabase
                .from('leads')
                .delete()
                .in('id', leadIds)
                .eq('user_id', user.id); // Security: only delete user's own leads

            if (leadsError) {
                throw leadsError;
            }

            window.OsliraApp.showMessage(
                `Successfully deleted ${leadIds.length} lead${leadIds.length > 1 ? 's' : ''}`, 
                'success'
            );

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

    async bulkExportLeads() {
        if (this.selectedLeads.size === 0) {
            window.OsliraApp.showMessage('No leads selected for export', 'warning');
            return;
        }

        try {
            const selectedLeadData = this.allLeads.filter(lead => this.selectedLeads.has(lead.id));
            
            // Create CSV content
            const headers = ['Username', 'Platform', 'Score', 'Analysis Type', 'Followers', 'Date Analyzed'];
            const csvContent = [
                headers.join(','),
                ...selectedLeadData.map(lead => [
                    lead.username,
                    lead.platform || 'Instagram',
                    lead.score || 0,
                    lead.analysis_type || 'light',
                    lead.followers_count || 0,
                    new Date(lead.created_at).toLocaleDateString()
                ].join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `oslira-leads-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            window.OsliraApp.showMessage(`Exported ${this.selectedLeads.size} leads successfully`, 'success');

        } catch (error) {
            console.error('Export failed:', error);
            window.OsliraApp.showMessage('Export failed: ' + error.message, 'error');
        }
    }

    exportLeadData(leadId) {
        const lead = this.allLeads.find(l => l.id === leadId);
        if (!lead) {
            window.OsliraApp.showMessage('Lead not found', 'error');
            return;
        }

        // For individual lead export, we'd need to fetch the full analysis data
        window.OsliraApp.showMessage('Individual lead export coming soon!', 'info');
    }

    rerunAnalysis(leadId) {
        console.log('Rerunning analysis for lead:', leadId);
        window.OsliraApp.showMessage('Rerun analysis functionality coming soon!', 'info');
    }

    // ===============================================================================
    // UTILITY METHODS
    // ===============================================================================

    formatDateCached(dateString) {
        if (this.dateFormatCache.has(dateString)) {
            return this.dateFormatCache.get(dateString);
        }
        
        const formatted = new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        this.dateFormatCache.set(dateString, formatted);
        return formatted;
    }

    // ===============================================================================
    // EVENT HANDLERS AND CLEANUP
    // ===============================================================================

    handleVisibilityChange() {
        if (document.visibilityState === 'visible' && this.allLeads.length === 0) {
            // Reload data when user returns to tab if no data is loaded
            this.loadDashboardData();
        }
    }

    setupRealtimeSubscription() {
    // Only set up if CSP allows WebSocket connections
    if (!this.canUseRealtime()) {
        console.log('⚠️ Real-time disabled: WebSocket connections blocked by CSP');
        this.setupPollingFallback();
        return;
    }

    try {
        const supabase = window.OsliraApp?.supabase;
        const user = window.OsliraApp?.user;
        
        if (!supabase || !user) {
            console.warn('⚠️ Supabase or user not available for real-time subscription');
            return;
        }

        console.log('🔄 Setting up real-time subscription...');

        this.realtimeSubscription = supabase
            .channel(`leads-${user.id}`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'leads',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('📡 Real-time lead update:', payload.eventType);
                    this.handleRealtimeUpdate(payload);
                }
            )
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public', 
                    table: 'lead_analyses',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('📡 Real-time analysis update:', payload.eventType);
                    this.handleRealtimeUpdate(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time subscription active');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Real-time subscription failed, falling back to polling');
                    this.setupPollingFallback();
                }
            });

    } catch (error) {
        console.error('❌ Real-time setup failed:', error);
        this.setupPollingFallback();
    }
}

    // ✅ ADD THIS MISSING METHOD:
    displayDemoLeads() {
    console.log('📋 No authentication - showing empty state');
    
    // Set empty leads array
    this.allLeads = [];
    this.selectedLeads.clear();
    
    // Show empty state
    this.displayLeads([]);
    this.updateDashboardStats();
    this.generateInsights();
    
    console.log('✅ Empty state displayed - ready for first lead research');
}

    // ✅ ADD THIS MISSING METHOD:
    displayErrorState(errorMessage) {
        console.error('🚨 Dashboard error state:', errorMessage);
        
        const tableBody = document.getElementById('activity-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--error);">
                        <div style="font-size: 32px; margin-bottom: 16px;">⚠️</div>
                        <h3 style="margin: 0 0 8px 0; color: var(--error);">Error Loading Data</h3>
                        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">${errorMessage}</p>
                        <button onclick="dashboard.loadDashboardData()" 
                                style="background: var(--primary-blue); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            🔄 Try Again
                        </button>
                    </td>
                </tr>
            `;
        }

        // Also show error in insights section
        const insightsContainer = document.getElementById('insights-container');
        if (insightsContainer) {
            insightsContainer.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 24px; text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 12px;">⚠️</div>
                    <h4 style="color: var(--error); margin: 0 0 8px 0;">Unable to load insights</h4>
                    <p style="color: var(--text-secondary); margin: 0;">${errorMessage}</p>
                </div>
            `;
        }
    }

    // ✅ FIXED canUseRealtime() method - Remove external WebSocket test:
   canUseRealtime() {
    // ✅ BETTER APPROACH: Test if WebSocket is available without external connection
    try {
        // Just check if WebSocket constructor exists
        return typeof WebSocket !== 'undefined' && 
               typeof window !== 'undefined' && 
               'WebSocket' in window;
    } catch (error) {
        console.warn('WebSocket availability check failed:', error);
        return false;
    }
}
    // ✅ ADD THIS MISSING METHOD:
    updateDashboardStats() {
        try {
            const totalLeads = this.allLeads.length;
            const avgScore = totalLeads > 0 
                ? Math.round(this.allLeads.reduce((sum, lead) => sum + (lead.score || 0), 0) / totalLeads)
                : 0;

            // Update stats in the UI
            const statsElements = {
                'total-leads': totalLeads.toLocaleString(),
                'avg-score': avgScore.toString(),
                'active-campaigns': '0', // Placeholder
                'conversion-rate': '0%'  // Placeholder
            };

            Object.entries(statsElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });

            console.log(`📊 Stats updated: ${totalLeads} leads, avg score ${avgScore}`);

        } catch (error) {
            console.warn('⚠️ Stats update failed:', error);
        }
    }

    showGettingStartedGuide() {
    // Create a simple getting started modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 32px; max-width: 500px; margin: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
                <h2 style="margin: 0 0 8px 0; color: var(--text-primary);">Getting Started with Oslira</h2>
                <p style="margin: 0; color: var(--text-secondary);">Your AI-powered lead research companion</p>
            </div>
            
            <div style="margin-bottom: 24px;">
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="width: 32px; height: 32px; background: var(--primary-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">1</div>
                        <h4 style="margin: 0; color: var(--text-primary);">Enter Instagram Username</h4>
                    </div>
                    <p style="margin: 0; color: var(--text-secondary); margin-left: 44px;">Simply paste an Instagram username or profile URL</p>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="width: 32px; height: 32px; background: var(--secondary-purple); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">2</div>
                        <h4 style="margin: 0; color: var(--text-primary);">AI Analysis</h4>
                    </div>
                    <p style="margin: 0; color: var(--text-secondary); margin-left: 44px;">Our AI analyzes engagement, audience quality, and business fit</p>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="width: 32px; height: 32px; background: var(--accent-teal); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">3</div>
                        <h4 style="margin: 0; color: var(--text-primary);">Personalized Outreach</h4>
                    </div>
                    <p style="margin: 0; color: var(--text-secondary); margin-left: 44px;">Get AI-generated, personalized messages ready to send</p>
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="background: var(--border-light); color: var(--text-secondary); border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Close
                </button>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove(); dashboard.showAnalysisModal();" 
                        style="background: var(--primary-blue); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Start Research
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}


    // ✅ ADD THIS MISSING METHOD:
   async generateInsights() {
    const container = document.getElementById('insights-container');
    const loading = document.getElementById('loading-insights');
    
    if (!container) {
        console.warn('Insights container not found');
        return;
    }
    
    if (loading) {
        loading.style.display = 'block';
    }
    
    try {
        // Wait a moment to simulate loading
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let insights = [];
        
        // Always show welcome message when no leads exist
        if (this.allLeads.length === 0) {
            insights = [
                {
                    type: 'welcome',
                    icon: '🚀',
                    title: 'Welcome to Oslira!',
                    content: 'Start researching leads to unlock AI-powered insights and recommendations tailored to your data.',
                    cta: 'Research Your First Lead',
                    actionType: 'function',
                    actionValue: 'showAnalysisModal'
                },
                {
                    type: 'getting-started',
                    icon: '📚',
                    title: 'Getting Started Guide',
                    content: 'Learn how to maximize your lead research with our AI-powered analysis tools and outreach generation.',
                    cta: 'View Guide',
                    actionType: 'function', 
                    actionValue: 'showGettingStartedGuide'
                },
                {
                    type: 'features',
                    icon: '⚡',
                    title: 'Powerful Features',
                    content: 'Deep Instagram analysis, AI-generated outreach messages, lead scoring, and audience quality assessment.',
                    cta: 'Start Analyzing',
                    actionType: 'function',
                    actionValue: 'showAnalysisModal'
                }
            ];
        } else {
            // Show performance insights when leads exist
            const avgScore = this.allLeads.reduce((sum, lead) => sum + (lead.score || 0), 0) / this.allLeads.length;
            const highScoreLeads = this.allLeads.filter(lead => (lead.score || 0) >= 80).length;
            
            insights.push({
                type: 'performance',
                icon: '📈',
                title: 'Lead Quality Analysis',
                content: `Your average lead score is ${Math.round(avgScore)}. You have ${highScoreLeads} high-quality leads (80+ score).`,
                cta: 'View Top Leads',
                actionType: 'filter',
                actionValue: 'score_high'
            });

            if (this.allLeads.length >= 10) {
                insights.push({
                    type: 'optimization',
                    icon: '🎯',
                    title: 'Targeting Optimization', 
                    content: 'With 10+ leads analyzed, consider refining your targeting criteria for better results.',
                    cta: 'Analyze Patterns',
                    actionType: 'function',
                    actionValue: 'showPatternAnalysis'
                });
            }
        }

        this.renderInsights(insights);
        
        if (loading) {
            loading.style.display = 'none';
        }
        
        if (container) {
            container.style.display = 'grid';
        }

    } catch (error) {
        console.error('Error generating insights:', error);
        
        if (loading) {
            loading.style.display = 'none';
        }
        
        if (container) {
            container.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 24px; text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 12px;">⚠️</div>
                    <h4 style="color: var(--error); margin: 0 0 8px 0;">Insights Unavailable</h4>
                    <p style="color: var(--text-secondary); margin: 0;">Unable to generate insights at this time.</p>
                </div>
            `;
            container.style.display = 'block';
        }
    }
}

    // ✅ ADD THIS MISSING METHOD:
    renderInsights(insights) {
        const container = document.getElementById('insights-container');
        if (!container || !insights.length) return;

        const html = insights.map(insight => `
            <div class="insight-card" style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
                <div style="font-size: 32px; margin-bottom: 16px;">${insight.icon}</div>
                <h4 style="color: var(--text-primary); margin: 0 0 12px 0; font-size: 18px;">${insight.title}</h4>
                <p style="color: var(--text-secondary); margin: 0 0 20px 0; line-height: 1.5;">${insight.content}</p>
                ${insight.cta ? `
                    <button onclick="dashboard.handleInsightAction('${insight.actionType}', '${insight.actionValue}')"
                            style="background: var(--primary-blue); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s;">
                        ${insight.cta}
                    </button>
                ` : ''}
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // ✅ ADD THIS MISSING METHOD:
    handleInsightAction(actionType, actionValue) {
    console.log('🎯 Insight action triggered:', actionType, actionValue);
    
    switch (actionType) {
        case 'function':
            if (actionValue === 'showAnalysisModal') {
                this.showAnalysisModal();
            } else if (actionValue === 'showPatternAnalysis') {
                window.OsliraApp?.showMessage('Pattern analysis coming soon!', 'info');
            } else if (actionValue === 'showGettingStartedGuide') {
                this.showGettingStartedGuide();
            }
            break;
            
        case 'filter':
            if (actionValue === 'score_high') {
                const filterSelect = document.getElementById('activity-filter');
                if (filterSelect) {
                    filterSelect.value = 'score_high';
                    this.applyActivityFilter();
                }
            }
            break;
            
        default:
            console.warn('Unknown insight action:', actionType, actionValue);
    }
}
    // ✅ ADD THIS MISSING METHOD:
    showAnalysisModal() {
    console.log('🔍 Opening analysis modal...');
    
    const modal = document.getElementById('analysisModal');
    if (!modal) {
        console.error('❌ Analysis modal not found in DOM');
        window.OsliraApp?.showMessage('Analysis modal not available', 'error');
        return;
    }
    
    // Reset form
    const form = document.getElementById('analysisForm');
    if (form) {
        form.reset();
    }
    
    // Reset form fields
    const analysisType = document.getElementById('analysis-type');
    const profileInput = document.getElementById('profile-input');
    const inputContainer = document.getElementById('input-field-container');
    
    if (analysisType) {
        analysisType.value = '';
    }
    if (profileInput) {
        profileInput.value = '';
    }
    if (inputContainer) {
        inputContainer.style.display = 'none';
    }
    
    // Load business profiles IMMEDIATELY when modal opens
    this.loadBusinessProfilesForModal();
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Focus on analysis type dropdown
    setTimeout(() => {
        if (analysisType) {
            analysisType.focus();
        }
    }, 100);
    
    console.log('✅ Analysis modal opened');
}

setupPollingFallback() {
    console.log('🔄 Setting up polling fallback for real-time updates');
    
    // Poll for updates every 30 seconds when tab is visible
    this.pollingInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            this.checkForUpdates();
        }
    }, 30000);
}

async checkForUpdates() {
    try {
        const supabase = window.OsliraApp?.supabase;
        const user = window.OsliraApp?.user;
        
        if (!supabase || !user) return;

        const lastUpdate = this.lastUpdateTimestamp || new Date(Date.now() - 60000).toISOString();
        
        // ✅ FIXED: Only use created_at (leads table has NO updated_at column)
        const { data: newLeads, error } = await supabase
            .from('leads')
            .select('id, created_at')
            .eq('user_id', user.id)
            .gt('created_at', lastUpdate)
            .limit(1);

        if (error) throw error;

        if (newLeads && newLeads.length > 0) {
            console.log('📊 New data detected, refreshing dashboard');
            await this.loadDashboardData();
            this.lastUpdateTimestamp = new Date().toISOString();
        }

    } catch (error) {
        console.warn('⚠️ Polling update check failed:', error);
    }
}

handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
        case 'INSERT':
            console.log('➕ New lead added');
            this.addLeadToUI(newRecord);
            this.updateDashboardStats();
            break;
            
        case 'UPDATE':
            console.log('✏️ Lead updated');
            this.updateLeadInUI(newRecord);
            break;
            
        case 'DELETE':
            console.log('🗑️ Lead deleted');
            this.removeLeadFromUI(oldRecord);
            this.updateDashboardStats();
            break;
    }
}


   cleanup() {
    console.log('🧹 Cleaning up dashboard resources...');
    
    // Clean up real-time subscription
    if (this.realtimeSubscription) {
        try {
            this.realtimeSubscription.unsubscribe();
            console.log('✅ Real-time subscription cleaned up');
        } catch (error) {
            console.warn('⚠️ Real-time cleanup warning:', error);
        }
        this.realtimeSubscription = null;
    }
    
    // Clean up polling interval
    if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
        console.log('✅ Polling interval cleaned up');
    }
    
    // Clean up event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Clear any pending timeouts
    if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = null;
    }
    
    console.log('✅ Dashboard cleanup completed');
}

    // ===============================================================================
    // INITIALIZATION COMPLETION
    // ===============================================================================

    async setupDashboard() {
        // Additional setup that happens after initial load
        try {
            // Set up real-time subscriptions
            this.setupRealtimeSubscription();
            
            // Set up visibility change handler
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            
            // Load user's business profiles for analysis modal
            await this.loadBusinessProfiles();
            
            console.log('✅ Dashboard setup completed');
            
        } catch (error) {
            console.warn('⚠️ Dashboard setup partially failed:', error);
        }
    }

async loadBusinessProfilesForModal() {
    console.log('🏢 Loading business profiles for modal...');
    
    try {
        const supabase = window.OsliraApp?.supabase;
        const user = window.OsliraApp?.user;

        const businessSelect = document.getElementById('business-id');
        if (!businessSelect) {
            console.warn('❌ Business dropdown not found');
            return;
        }

        // Show loading state
        businessSelect.innerHTML = '<option value="">Loading business profiles...</option>';
        businessSelect.disabled = true;

        if (!supabase || !user) {
            console.log('📋 No auth - showing placeholder');
            businessSelect.innerHTML = '<option value="">Please log in to load business profiles</option>';
            businessSelect.disabled = false;
            return;
        }

        console.log('🔍 Querying business_profiles table...');

        const { data: profiles, error } = await supabase
            .from('business_profiles')
            .select('id, business_name, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('⚠️ Business profiles query failed:', error.message);
            console.warn('Error details:', error);
            
            // Check if it's a permission/RLS issue
            if (error.code === 'PGRST116' || error.message.includes('permission')) {
                businessSelect.innerHTML = '<option value="">No access to business profiles</option>';
            } else {
                businessSelect.innerHTML = '<option value="">Error loading profiles - check console</option>';
            }
            
            businessSelect.disabled = false;
            return;
        }

        console.log('📊 Business profiles result:', profiles);

        // Populate dropdown
        if (profiles && profiles.length > 0) {
            businessSelect.innerHTML = [
                '<option value="">Select business profile...</option>',
                ...profiles.map(profile => 
                    `<option value="${profile.id}">${profile.business_name}</option>`
                )
            ].join('');
            
            console.log(`✅ Loaded ${profiles.length} business profiles`);
        } else {
            businessSelect.innerHTML = '<option value="">No business profiles found - create one first</option>';
            console.log('📋 No business profiles found for user');
        }

        businessSelect.disabled = false;

    } catch (error) {
        console.error('❌ Business profiles loading failed:', error);
        
        const businessSelect = document.getElementById('business-id');
        if (businessSelect) {
            businessSelect.innerHTML = '<option value="">Failed to load profiles</option>';
            businessSelect.disabled = false;
        }
    }
}
    
async createDefaultBusinessProfile() {
    try {
        const supabase = window.OsliraApp?.supabase;
        const user = window.OsliraApp?.user;
        
        if (!supabase || !user) return;

        const defaultProfile = {
            user_id: user.id,
            business_name: 'My Business',
            industry: 'General',
            target_audience: 'General Audience',
            value_proposition: 'Quality products and services',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('business_profiles')
            .insert([defaultProfile])
            .select()
            .single();

        if (error) {
            console.warn('⚠️ Could not create default business profile:', error);
            this.businessProfiles = [this.getDefaultBusinessProfile()];
        } else {
            this.businessProfiles = [data];
            console.log('✅ Created default business profile');
        }

    } catch (error) {
        console.warn('⚠️ Default business profile creation failed:', error);
        this.businessProfiles = [this.getDefaultBusinessProfile()];
    }
}

getDefaultBusinessProfile() {
    return {
        id: 'default',
        business_name: 'My Business',
        industry: 'General',
        target_audience: 'General Audience',
        value_proposition: 'Quality products and services'
    };
}
}

// ===============================================================================
// DASHBOARD INITIALIZATION AND EXPORT
// ===============================================================================

// Create global dashboard instance
const dashboard = new Dashboard();

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await dashboard.init();
        await dashboard.setupDashboard();
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
    }
});

// Handle page unload cleanup
window.addEventListener('beforeunload', () => {
    dashboard.cleanup();
});

// Export dashboard instance for global access
window.dashboard = dashboard;
