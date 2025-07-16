// Global configuration and state
window.CONFIG = {};
// Replace your existing copyText function with this:
// Add this near the top of your dashboard.js file, after the global variables
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showMessage('Copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea'); 
        textArea.value = text;
        document.body.appendChild(textArea); 
        textArea.focus();
        textArea.select();
        try { 
            document.execCommand('copy');
            showMessage('Copied to clipboard!', 'success');
        } catch (err) {
            showMessage('Failed to copy text', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// Make it globally available
window.copyText = copyText;
async function loadConfig() {
  try {
    console.log('🔧 Loading configuration...');
    
    // Load from edge function at /config
    const res = await fetch('/config');
    if (!res.ok) {
      throw new Error(`Config edge function failed: ${res.status} ${res.statusText}`);
    }
    
    const config = await res.json();
    
    // Validate required fields
    if (!config.supabaseUrl || !config.supabaseAnonKey || !config.workerUrl) {
      throw new Error('Config validation failed: missing required fields');
    }
    
    Object.assign(window.CONFIG, config);
    console.log('✅ Configuration loaded successfully from edge function');
    
  } catch (err) {
    console.error('❌ Configuration loading failed:', err);
    throw new Error(`Unable to load application configuration: ${err.message}`);
  }
}

// Global state
let selectedLeads = new Set();
let supabaseClient;
let currentUser = null;
let currentSession = null;
let currentBusiness = null;
let businessProfiles = [];
let allLeads = [];

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Initializing dashboard...');
        
        // Load config first - this will throw if it fails
        await loadConfig();
        
        // Validate config before proceeding
        if (!window.CONFIG.supabaseUrl || !window.CONFIG.supabaseAnonKey) {
            throw new Error('Configuration validation failed');
        }
        
        // Initialize Supabase with loaded config
        supabaseClient = window.supabase.createClient(
            window.CONFIG.supabaseUrl,
            window.CONFIG.supabaseAnonKey
        );
        
        await initializePage();
        
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        
        // Show detailed error for debugging
        console.error('Config state:', window.CONFIG);
        
        // Show error UI
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f9fa;">
                <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                    <h2 style="color: #dc2626; margin-bottom: 16px;">Configuration Error</h2>
                    <p style="color: #6b7280; margin-bottom: 16px;">
                        ${error.message}
                    </p>
                    <details style="text-align: left; margin: 16px 0; padding: 12px; background: #f3f4f6; border-radius: 6px;">
                        <summary>Debug Info</summary>
                        <pre style="font-size: 12px; margin: 8px 0;">${JSON.stringify(window.CONFIG, null, 2)}</pre>
                    </details>
                    <button onclick="window.location.reload()" 
                            style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }
});

// Show fallback UI for demo mode
function showFallbackUI() {
    document.getElementById('user-email').textContent = 'Demo Mode';
    document.getElementById('sidebar-plan').textContent = 'Demo Plan';
    document.getElementById('sidebar-billing').textContent = 'Demo Active';
    
    const demoMessage = document.createElement('div');
    demoMessage.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0;
        background: linear-gradient(135deg, var(--warning), #F59E0B);
        color: white; padding: 12px; text-align: center;
        font-weight: 600; z-index: 10000;
    `;
    demoMessage.textContent = '⚠️ Demo Mode - Please configure environment variables to enable full functionality';
    document.body.insertBefore(demoMessage, document.body.firstChild);
    
    setupEventListeners();
}


// Initialize the entire page
async function initializePage() {
    if (!supabaseClient) {
        console.warn('Supabase client not initialized, running in demo mode');
        showFallbackUI();
        return;
    }
    
    await checkAuth();
    await loadUserData();
    setupEventListeners();
    await loadInitialData();
    
    setTimeout(() => {
        generateInsights();
    }, 1000);
}

// Check user authentication
// Replace your existing checkAuth function with this:
async function checkAuth() {
    if (!supabaseClient) {
        console.warn('Supabase client not available for auth check');
        return;
    }
    
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Auth session error:', error);
            if (!window.CONFIG.supabaseUrl?.includes('your-project')) {
                window.location.href = '/login.html';
                return;
            }
            return;
        }
        
        if (!session) {
            console.log('No active session found');
            if (!window.CONFIG.supabaseUrl?.includes('your-project')) {
                window.location.href = '/login.html';
                return;
            }
            return;
        }
        
        currentSession = session;
        currentUser = session.user;
        document.getElementById('user-email').textContent = currentUser.email;
        
        console.log('✅ User authenticated:', currentUser.email);
        
    } catch (err) {
        console.error('Auth check failed:', err);
        if (!window.CONFIG.supabaseUrl?.includes('your-project')) {
            window.location.href = '/login.html';
        }
    }
}
// Load user subscription and credit data
// Load user subscription and credit data
// Load user subscription and credit data
async function loadUserData() {
    if (!supabaseClient || !currentUser) {
        updateSubscriptionUI('free', 'active', 0);
        return;
    }
    
    try {
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('email, subscription_plan, subscription_status, credits')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.warn('Error loading user data:', error);
            updateSubscriptionUI('free', 'active', 0);
            return;
        }

        // UPDATED: Pass credits to the UI update function
        const userCredits = user.credits || 0;
        updateSubscriptionUI(user.subscription_plan, user.subscription_status, userCredits);
        
        console.log('✅ User data loaded:', { 
            plan: user.subscription_plan, 
            credits: userCredits 
        });
        
    } catch (error) {
        console.error('Error loading user data:', error);
        updateSubscriptionUI('free', 'active', 0);
    }
}
// Update subscription UI elements
function updateSubscriptionUI(plan, status, credits) {
    const planNames = {
        free: 'Free Plan',
        starter: 'Starter Plan',
        growth: 'Growth Plan',
        professional: 'Professional Plan',
        enterprise: 'Enterprise Plan'
    };

    const planName = planNames[plan] || 'Free Plan';
    document.getElementById('sidebar-plan').textContent = planName;
    
    // Enhanced credits display with visual indicators
    const billingElement = document.getElementById('sidebar-billing');
    const creditsCount = credits || 0;
    
    // Determine warning level for free users
    let warningClass = '';
    let warningText = '';
    
    if (plan === 'free') {
        if (creditsCount === 0) {
            warningClass = 'credits-empty';
            warningText = '⚠️ No credits left';
        } else if (creditsCount <= 2) {
            warningClass = 'credits-low';
            warningText = '⚠️ Low credits';
        } else {
            warningClass = 'credits-good';
            warningText = '';
        }
        
        billingElement.innerHTML = `
            <div style="text-align: center; margin-top: 8px;" class="${warningClass}">
                <div style="font-size: 28px; font-weight: 800; color: ${creditsCount === 0 ? 'var(--error)' : creditsCount <= 2 ? 'var(--warning)' : 'var(--primary-blue)'}; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    ${creditsCount}
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    Credits Remaining
                </div>
                ${warningText ? `
                    <div style="font-size: 10px; color: ${creditsCount === 0 ? 'var(--error)' : 'var(--warning)'}; margin-top: 4px; font-weight: 600;">
                        ${warningText}
                    </div>
                ` : ''}
                ${creditsCount === 0 ? `
                    <div style="margin-top: 8px;">
                        <a href="subscription.html" style="font-size: 10px; color: var(--error); text-decoration: none; font-weight: 600; padding: 4px 8px; background: rgba(220, 38, 38, 0.1); border-radius: 4px; display: inline-block;">
                            🚀 Upgrade Now
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        billingElement.innerHTML = `
            <div style="text-align: center; margin-top: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: var(--success); line-height: 1; text-shadow: 0 1px 2px rgba(16, 185, 129, 0.2);">
                    ${creditsCount}
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    Credits Available
                </div>
                <div style="font-size: 10px; color: var(--success); margin-top: 4px; font-weight: 600;">
                    ✅ Active subscription
                </div>
            </div>
        `;
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Business selector
    document.getElementById('business-select')?.addEventListener('change', switchBusiness);
    
    // Header buttons
    document.getElementById('bulk-upload-btn')?.addEventListener('click', showBulkUpload);
    document.getElementById('research-lead-btn')?.addEventListener('click', showAnalysisModal);
    
    // Action cards
    document.getElementById('research-action-card')?.addEventListener('click', showAnalysisModal);
    document.getElementById('campaigns-action-card')?.addEventListener('click', () => location.href='campaigns.html');
    document.getElementById('csv-import-action-card')?.addEventListener('click', showBulkUpload);
    document.getElementById('export-action-card')?.addEventListener('click', exportLeads);
    
    // Filter controls
    document.getElementById('timeframe-filter')?.addEventListener('change', filterByTimeframe);
    document.getElementById('activity-filter')?.addEventListener('change', filterActivity);
    document.getElementById('refresh-activity-btn')?.addEventListener('click', refreshActivity);
    
    // Insights
    document.getElementById('generate-insights-btn')?.addEventListener('click', generateInsights);
    document.getElementById('welcome-cta-btn')?.addEventListener('click', showAnalysisModal);
    
    // Support
    document.getElementById('support-btn')?.addEventListener('click', showSupportModal);
    document.getElementById('general-support-btn')?.addEventListener('click', () => contactSupport('support'));
    document.getElementById('billing-support-btn')?.addEventListener('click', () => contactSupport('billing'));
    document.getElementById('security-support-btn')?.addEventListener('click', () => contactSupport('security'));
    
    // Modal close buttons
    document.getElementById('support-modal-close')?.addEventListener('click', () => closeModal('supportModal'));
    document.getElementById('lead-modal-close')?.addEventListener('click', () => closeModal('leadModal'));
    document.getElementById('analysis-modal-close')?.addEventListener('click', () => closeModal('analysisModal'));
    document.getElementById('bulk-modal-close')?.addEventListener('click', () => closeModal('bulkModal'));
    
    // Form handlers
    document.getElementById('analysisForm')?.addEventListener('submit', submitAnalysis);
    document.getElementById('analysis-type')?.addEventListener('change', updateInputField);
    
    // Logout
    document.getElementById('logout-link')?.addEventListener('click', logout);

    document.getElementById('select-all-btn')?.addEventListener('click', selectAllLeads);
    document.getElementById('bulk-delete-btn')?.addEventListener('click', bulkDeleteLeads);
    document.getElementById('clear-selection-btn')?.addEventListener('click', clearSelection);
    
    // Close modals on outside click
    window.addEventListener('click', handleModalClick);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Load all initial data
async function loadInitialData() {
    await Promise.all([
        loadBusinessProfiles(),
        loadDashboardData()
    ]);
}

// Load business profiles from database
async function loadBusinessProfiles() {
    if (!supabaseClient || !currentUser) return;
    
    try {
        const { data: businesses, error } = await supabaseClient
            .from('business_profiles')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (error) {
            console.warn('Error loading business profiles:', error);
            return;
        }
        
        businessProfiles = businesses || [];
        const businessSelect = document.getElementById('business-select');
        const modalBusinessSelect = document.getElementById('business-id');
        
        if (businessSelect) {
            businessSelect.innerHTML = '<option value="">Select Business...</option>';
            businessProfiles.forEach(business => {
                const option = new Option(business.business_name, business.id);
                businessSelect.add(option);
            });
            
            if (businessProfiles.length > 0) {
                currentBusiness = businessProfiles[0];
                businessSelect.value = currentBusiness.id;
            }
        }
        
        if (modalBusinessSelect) {
            modalBusinessSelect.innerHTML = '<option value="">Select business profile...</option>';
            businessProfiles.forEach(business => {
                const option = new Option(business.business_name, business.id);
                modalBusinessSelect.add(option);
            });
            
            if (currentBusiness) {
                modalBusinessSelect.value = currentBusiness.id;
            }
        }
        
    } catch (err) {
        console.error('Error loading business profiles:', err);
    }
}

// Switch business context
async function switchBusiness() {
    const businessSelect = document.getElementById('business-select');
    const selectedBusinessId = businessSelect.value;
    
    if (selectedBusinessId) {
        currentBusiness = businessProfiles.find(b => b.id === selectedBusinessId);
        await loadDashboardData();
        document.getElementById('business-id').value = selectedBusinessId;
    }
}

// Load all dashboard data
async function loadDashboardData() {
    if (!supabaseClient || !currentUser) return;
    
    await Promise.all([
        loadRecentActivity(),
        loadStats(),
        loadCreditUsage()
    ]);
}

async function forceRefreshFromDatabase() {
    console.log('🔄 Force refreshing all data from Supabase...');
    
    // Clear local cache
    allLeads = [];
    selectedLeads.clear();
    
    // Force reload from database
    await Promise.all([
        loadRecentActivity(),
        loadStats(),
        loadCreditUsage()
    ]);
    
    // Clear any UI state
    const bulkActions = document.getElementById('bulk-actions');
    if (bulkActions) {
        bulkActions.style.display = 'none';
    }
    
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.innerHTML = '☑️ Select All';
    }
    
    console.log('✅ Force refresh complete');
}

// Load recent activity with filtering

async function loadRecentActivity() {
    if (!supabaseClient || !currentUser) return;
    
    console.log('📊 Loading fresh activity data from Supabase...');
    
    try {
        let query = supabaseClient
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
            .eq('user_id', currentUser.id);

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
        
        console.log(`📊 Loaded ${leads?.length || 0} leads from database`);
        
        // FIXED: Always update local cache with fresh data
        allLeads = leads || [];
        
        // Clear any stale selection state
        selectedLeads.clear();
        
        // Re-render with fresh data
        applyActivityFilter();
        
    } catch (err) {
        console.error('Error loading activity:', err);
        document.getElementById('activity-table').innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--warning);">
                    Error loading activity data - ${err.message}
                </td>
            </tr>
        `;
    }
}

// Apply activity filters and sorting
function applyActivityFilter() {
    const filter = document.getElementById('activity-filter')?.value || 'all';
    let filteredLeads = [...allLeads];

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
            // UPDATED: Sort by highest score first (no filtering by 80+)
            filteredLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
            break;
        case 'score_low':
            // UPDATED: Sort by lowest score first (no filtering by 0-50)
            filteredLeads.sort((a, b) => (a.score || 0) - (b.score || 0));
            break;
        case 'recent':
            filteredLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            filteredLeads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
    }

    displayLeads(filteredLeads);
}

// Display leads in activity table
// Display leads in activity table - FIXED VERSION with profile pictures
function displayLeads(leads) {
    const tableBody = document.getElementById('activity-table');
    
    if (leads && leads.length > 0) {
        tableBody.innerHTML = leads.map(lead => {
            const analysisType = lead.type || (lead.lead_analyses && lead.lead_analyses.length > 0 ? 'deep' : 'light');
            const scoreClass = lead.score >= 80 ? 'score-high' : lead.score >= 60 ? 'score-medium' : 'score-low';
            
            // Get profile picture URL
            const profilePicUrl = lead.profile_pic_url || 
                                 lead.profile_picture_url || 
                                 lead.avatar_url ||
                                 (lead.profile_data && JSON.parse(lead.profile_data || '{}').profile_pic_url) ||
                                 null;
            
            // Create profile picture HTML
            const profilePicHtml = profilePicUrl 
                ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=40&h=40&fit=cover&a=attention" 
                        alt="@${lead.username}" 
                        style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                : '';
            
            // Fallback avatar with first letter of username
            const fallbackAvatar = `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; display: ${profilePicUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 2px solid var(--border-light);">
                ${(lead.username || 'U').charAt(0).toUpperCase()}
            </div>`;
            
            const isSelected = selectedLeads.has(lead.id);
            
return `
    <tr class="lead-row ${isSelected ? 'selected' : ''}" data-lead-id="${lead.id}">
        <td>
            <div style="display: flex; align-items: center; gap: 12px;">
                <label class="checkbox-container" style="margin: 0;">
                    <input type="checkbox" 
                           class="lead-checkbox" 
                           data-lead-id="${lead.id}" 
                           ${isSelected ? 'checked' : ''}
                           onchange="toggleLeadSelection('${lead.id}')">
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
        <!-- <td><span class="status light">analyzed</span></td>  REMOVE THIS LINE -->
        <td>${new Date(lead.created_at).toLocaleString()}</td>
<td style="text-align: center;">
    <button class="btn-small" onclick="viewLead('${lead.id}')">📝 View</button>
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
    
    // Update bulk actions visibility
    updateBulkActionsVisibility();
}

// Load statistics from database
async function loadStats() {
    if (!supabaseClient || !currentUser) return;
    
    try {
        // Get total leads count
        const { count: totalLeads } = await supabaseClient
            .from('leads')
            .select('*', { count: 'exact' })
            .eq('user_id', currentUser.id);
        
        // Get leads with scores for average calculation
        const { data: leadsWithScores } = await supabaseClient
            .from('leads')
            .select('score')
            .eq('user_id', currentUser.id)
            .not('score', 'is', null);
        
        // Calculate average score
        const avgScore = leadsWithScores?.length > 0 
            ? Math.round(leadsWithScores.reduce((sum, lead) => sum + (lead.score || 0), 0) / leadsWithScores.length)
            : 0;
        
        // Get high value leads count
        const { count: highValueLeads } = await supabaseClient
            .from('leads')
            .select('*', { count: 'exact' })
            .eq('user_id', currentUser.id)
            .gte('score', 80);
        
        // Update UI
        document.getElementById('total-leads').textContent = totalLeads || 0;
        document.getElementById('avg-score').textContent = avgScore;
        document.getElementById('high-value-leads').textContent = highValueLeads || 0;
        
        // Update trend indicators
        if (totalLeads > 0) {
            document.getElementById('leads-trend').textContent = `${totalLeads} total researched`;
            document.getElementById('leads-trend').className = 'trend up';
        }
        
        if (avgScore > 0) {
            document.getElementById('score-trend').textContent = `${avgScore}% average quality`;
            document.getElementById('score-trend').className = avgScore >= 70 ? 'trend up' : 'trend';
        }
        
        if (highValueLeads > 0 && totalLeads > 0) {
            document.getElementById('high-value-trend').textContent = `${Math.round((highValueLeads / totalLeads) * 100)}% high-value rate`;
        }
        
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}
// Replace your bulkDeleteLeads function with this fixed version:

async function bulkDeleteLeads() {
    const selectedCount = selectedLeads.size;
    
    if (selectedCount === 0) {
        showMessage('No leads selected for deletion', 'error');
        return;
    }
    
    const confirmMessage = `Are you sure you want to delete ${selectedCount} lead${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    if (!supabaseClient || !currentUser) {
        showMessage('Database not available', 'error');
        return;
    }
    
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const originalText = bulkDeleteBtn.innerHTML;
    bulkDeleteBtn.innerHTML = '🔄 Deleting...';
    bulkDeleteBtn.disabled = true;
    
    let deletedCount = 0;
    let errorCount = 0;
    const leadIds = Array.from(selectedLeads);
    
    try {
        console.log(`🗑️ Starting bulk deletion of ${selectedCount} leads`);
        
        // Delete in batches for better performance
        const batchSize = 10;
        for (let i = 0; i < leadIds.length; i += batchSize) {
            const batch = leadIds.slice(i, i + batchSize);
            
            try {
                // Delete analyses first
                const { error: analysisError } = await supabaseClient
                    .from('lead_analyses')
                    .delete()
                    .in('lead_id', batch)
                    .eq('user_id', currentUser.id);
                
                if (analysisError) {
                    console.warn('Some analyses could not be deleted:', analysisError);
                }
                
                // Delete leads
                const { error: leadError } = await supabaseClient
                    .from('leads')
                    .delete()
                    .in('id', batch)
                    .eq('user_id', currentUser.id);
                
                if (leadError) {
                    console.error('Batch deletion error:', leadError);
                    errorCount += batch.length;
                } else {
                    deletedCount += batch.length;
                    
                    // Remove from local array immediately
                    allLeads = allLeads.filter(lead => !batch.includes(lead.id));
                    
                    // FIXED: Remove from selection immediately for each successful batch
                    batch.forEach(id => {
                        selectedLeads.delete(id);
                        console.log(`Removed ${id} from selection`);
                    });
                }
                
            } catch (batchError) {
                console.error('Batch processing error:', batchError);
                errorCount += batch.length;
            }
        }
        
        // FIXED: Force clear all selections regardless of what's left
        console.log('🧹 Force clearing all selections...');
        selectedLeads.clear();
        
        // FIXED: Force update UI with explicit state reset
        console.log('🔄 Force updating UI state...');
        
        // Clear all checkboxes manually
        document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            const row = checkbox.closest('tr');
            if (row) {
                row.classList.remove('selected');
            }
        });
        
        // Force hide bulk actions
        const bulkActions = document.getElementById('bulk-actions');
        if (bulkActions) {
            bulkActions.style.display = 'none';
        }
        
        // Force reset select all button
        const selectAllBtn = document.getElementById('select-all-btn');
        if (selectAllBtn) {
            selectAllBtn.innerHTML = '☑️ Select All';
        }
        
        // Re-render the table
        applyActivityFilter();
        
        // Refresh stats
        await loadStats();
        
        // Show results
        if (deletedCount > 0) {
            showMessage(`Successfully deleted ${deletedCount} lead${deletedCount > 1 ? 's' : ''}`, 'success');
        }
        
        if (errorCount > 0) {
            showMessage(`Failed to delete ${errorCount} lead${errorCount > 1 ? 's' : ''}`, 'error');
        }
        
        console.log(`✅ Bulk deletion completed: ${deletedCount} deleted, ${errorCount} failed`);
        console.log(`Final selection state: ${selectedLeads.size} items selected`);
        
    } catch (error) {
        console.error('❌ Bulk deletion failed:', error);
        showMessage(`Bulk deletion failed: ${error.message}`, 'error');
        
        // FIXED: Force clear selection even on error
        selectedLeads.clear();
        
        // Force hide bulk actions on error too
        const bulkActions = document.getElementById('bulk-actions');
        if (bulkActions) {
            bulkActions.style.display = 'none';
        }
        
        await loadRecentActivity();
        
    } finally {
        // Reset button state
        bulkDeleteBtn.innerHTML = originalText;
        bulkDeleteBtn.disabled = false;
        
        // FINAL FORCE CHECK: Make sure everything is cleared
        setTimeout(() => {
            if (selectedLeads.size === 0) {
                const bulkActions = document.getElementById('bulk-actions');
                if (bulkActions && bulkActions.style.display !== 'none') {
                    console.log('🔧 Final force hide of bulk actions');
                    bulkActions.style.display = 'none';
                }
            }
        }, 100);
        
        console.log('🔄 Final UI state reset complete');
    }
}

// Load credit usage from transactions
async function loadCreditUsage() {
    if (!supabaseClient || !currentUser) {
        document.getElementById('credits-used').textContent = '0';
        document.getElementById('credits-trend').textContent = 'Last 30 days';
        return;
    }
    
    try {
        const { data: transactions, error } = await supabaseClient
            .from('credit_transactions')
            .select('amount')
            .eq('user_id', currentUser.id)
            .eq('type', 'use')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        
        if (error) {
            console.warn('Error loading credit usage:', error);
            document.getElementById('credits-used').textContent = '0';
            document.getElementById('credits-trend').textContent = 'Last 30 days';
            return;
        }
        
        const creditsUsed = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        document.getElementById('credits-used').textContent = creditsUsed;
        document.getElementById('credits-trend').textContent = 'Last 30 days';
        
    } catch (err) {
        console.error('Error loading credit usage:', err);
        document.getElementById('credits-used').textContent = '0';
        document.getElementById('credits-trend').textContent = 'Last 30 days';
    }
}

async function refreshCreditsDisplay() {
    if (!supabaseClient || !currentUser) return;
    
    try {
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('subscription_plan, subscription_status, credits')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.warn('Error refreshing credits:', error);
            return;
        }

        // Update just the credits in the sidebar
        updateSubscriptionUI(user.subscription_plan, user.subscription_status, user.credits);
        
    } catch (error) {
        console.error('Error refreshing credits:', error);
    }
}
function toggleLeadSelection(leadId) {
    if (selectedLeads.has(leadId)) {
        selectedLeads.delete(leadId);
    } else {
        selectedLeads.add(leadId);
    }
    
    // Update UI
    updateBulkActionsVisibility();
    updateSelectAllButton();
    
    // Update row styling
    const row = document.querySelector(`tr[data-lead-id="${leadId}"]`);
    if (row) {
        row.classList.toggle('selected', selectedLeads.has(leadId));
    }
}

function selectAllLeads() {
    const visibleLeads = allLeads.filter(lead => {
        const row = document.querySelector(`tr[data-lead-id="${lead.id}"]`);
        return row && row.style.display !== 'none';
    });
    
    if (selectedLeads.size === visibleLeads.length) {
        // Deselect all
        selectedLeads.clear();
    } else {
        // Select all visible leads
        selectedLeads.clear();
        visibleLeads.forEach(lead => selectedLeads.add(lead.id));
    }
    
    // Update all checkboxes
    document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
        const leadId = checkbox.dataset.leadId;
        checkbox.checked = selectedLeads.has(leadId);
        
        const row = checkbox.closest('tr');
        if (row) {
            row.classList.toggle('selected', selectedLeads.has(leadId));
        }
    });
    
    updateBulkActionsVisibility();
    updateSelectAllButton();
}

function clearSelection() {
    console.log('🧹 Clearing all selections...');
    
    selectedLeads.clear();
    
    // Update all checkboxes and remove selected styling
    document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const row = checkbox.closest('tr');
        if (row) {
            row.classList.remove('selected');
        }
    });
    
    // Update UI elements
    updateBulkActionsVisibility();
    updateSelectAllButton();
    
    console.log('✅ Selection cleared, UI updated');
}

// Enhanced updateBulkActionsVisibility function with better logging:
function updateBulkActionsVisibility() {
    const bulkActions = document.getElementById('bulk-actions');
    const selectedCount = document.getElementById('selected-count');
    
    console.log('🔄 Updating bulk actions visibility, selected count:', selectedLeads.size);
    
    if (bulkActions && selectedCount) {
        if (selectedLeads.size > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = selectedLeads.size;
            console.log('✅ Bulk actions shown');
        } else {
            bulkActions.style.display = 'none';
            console.log('✅ Bulk actions hidden');
        }
    }
}

// Enhanced updateSelectAllButton function:
function updateSelectAllButton() {
    const selectAllBtn = document.getElementById('select-all-btn');
    if (!selectAllBtn) return;
    
    const visibleLeads = document.querySelectorAll('.lead-checkbox').length;
    const selectedCount = selectedLeads.size;
    
    console.log('🔄 Updating select all button:', { visibleLeads, selectedCount });
    
    if (selectedCount === 0) {
        selectAllBtn.innerHTML = '☑️ Select All';
    } else if (selectedCount === visibleLeads && visibleLeads > 0) {
        selectAllBtn.innerHTML = '☐ Deselect All';
    } else {
        selectAllBtn.innerHTML = `☑️ Select All (${selectedCount}/${visibleLeads})`;
    }
}
// Show analysis modal
function showAnalysisModal() {
    const modal = document.getElementById('analysisModal');
    if (!modal) {
        console.error('Analysis modal not found');
        return;
    }
    
    const form = document.getElementById('analysisForm');
    if (form) form.reset();
    
    const analysisType = document.getElementById('analysis-type');
    const profileInput = document.getElementById('profile-input');
    const inputContainer = document.getElementById('input-field-container');
    
    if (analysisType) analysisType.value = '';
    if (profileInput) profileInput.value = '';
    if (inputContainer) inputContainer.style.display = 'none';
    
    if (currentBusiness) {
        const businessSelect = document.getElementById('business-id');
        if (businessSelect) businessSelect.value = currentBusiness.id;
    }
    
    modal.style.display = 'flex';
}

// Update input field based on analysis type
function updateInputField() {
    const analysisType = document.getElementById('analysis-type').value;
    const inputContainer = document.getElementById('input-field-container');
    const inputField = document.getElementById('profile-input');
    const inputLabel = document.getElementById('input-label');
    const inputHelp = document.getElementById('input-help');
    
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

// Submit analysis to worker
async function submitAnalysis(event) {
    event.preventDefault();
    
    const analysisType = document.getElementById('analysis-type').value;
    const profileInput = document.getElementById('profile-input').value.trim();
    const businessId = document.getElementById('business-id').value;
    
    if (!analysisType || !profileInput) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    const username = profileInput.replace('@', '');
    
    if (!validateUsername(username)) {
        showMessage('Please enter a valid Instagram username', 'error');
        return;
    }
    
    const profileUrl = `https://instagram.com/${username}`;
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '🔄 Analyzing... <small style="display: block; font-size: 10px; margin-top: 4px;">This may take 30-60 seconds</small>';
    submitBtn.disabled = true;
    
    showMessage('Starting analysis... This may take up to 60 seconds', 'info');
    
    try {
        if (!supabaseClient) {
            throw new Error('Not connected to database. Please refresh the page.');
        }
        
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) {
            throw new Error('Please log in again to continue');
        }

        // Debug the request
        const requestBody = {
            profile_url: profileUrl,
            analysis_type: analysisType,
            business_id: businessId || null,
            user_id: currentUser.id,
            platform: 'instagram'
        };
        
        console.log('📤 Sending request:', requestBody);
        console.log('🔑 Auth token length:', session.access_token?.length);
        
        const response = await fetch(window.CONFIG.workerUrl + '/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📥 Response status:', response.status);
        
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            const responseText = await response.text();
            console.error('Raw response:', responseText);
            throw new Error('Invalid response from server');
        }
        
        console.log('📥 Response data:', result);
        
        if (!response.ok) {
            let errorMessage = result.error || result.message || `HTTP ${response.status}`;
            
            // Handle specific error cases
            if (response.status === 400) {
                if (result.error && result.error.includes('profile data')) {
                    errorMessage = 'Could not find this Instagram profile. Please check the username and make sure the profile is public.';
                } else if (result.error && result.error.includes('business')) {
                    errorMessage = 'Please select a business profile before analyzing.';
                } else if (result.error && result.error.includes('username')) {
                    errorMessage = 'Invalid username format. Please enter a valid Instagram username.';
                }
            } else if (response.status === 401) {
                errorMessage = 'Authentication failed. Please refresh the page and try again.';
            } else if (response.status === 402) {
                errorMessage = `Insufficient credits. You need ${result.required || 'more'} credits but only have ${result.available || 0}. Please upgrade your plan.`;
            } else if (response.status === 500) {
                errorMessage = `Server error: ${result.error || result.message || 'Our analysis service is temporarily unavailable. Please try again in a few minutes.'}`;
            }
            
            throw new Error(errorMessage);
        }
        
        showMessage('Analysis completed successfully!', 'success');
        closeModal('analysisModal');
        
        // Refresh all data after successful analysis
        await Promise.all([
            loadRecentActivity(),
            loadStats(),
            loadCreditUsage(),
            refreshCreditsDisplay()
        ]);
        
    } catch (error) {
        console.error('Analysis error:', error);
        showMessage(`Analysis failed: ${error.message}`, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}
// Validate Instagram username
async function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
    const hasConsecutivePeriods = /\.{2,}/.test(username);
    const startsOrEndsWithPeriod = /^\./.test(username) || /\.$/.test(username);
    
    return usernameRegex.test(username) && !hasConsecutivePeriods && !startsOrEndsWithPeriod;
}
async function viewLead(leadId) {
    // Validation and early returns
    if (!leadId) {
        console.error('viewLead: leadId is required');
        return;
    }
    
    if (!supabaseClient || !currentUser) {
        console.warn('viewLead: Supabase client or user not available');
        showMessage('Unable to load lead details. Please refresh and try again.', 'error');
        return;
    }
    
    // Show loading state
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
        // Fetch lead data with comprehensive analysis information
        const { data: lead, error: leadError } = await supabaseClient
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
                    analysis_type
                )
            `)
            .eq('id', leadId)
            .eq('user_id', currentUser.id)  // Security: ensure user owns this lead
            .single();
        
        if (leadError) {
            throw new Error(`Database error: ${leadError.message}`);
        }
        
        if (!lead) {
            throw new Error('Lead not found or access denied');
        }
        
        // Extract analysis data and determine type
        const analysis = lead.lead_analyses?.[0] || {};
        const hasAnalysisData = analysis && Object.keys(analysis).length > 0;
        const analysisType = lead.type || (hasAnalysisData ? 'deep' : 'light');
        
        // Determine score styling
        const score = lead.score || 0;
        const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
        
        // Build the HTML content
        const detailsHtml = buildLeadDetailsHTML(lead, analysis, analysisType, scoreClass);
        
        // Inject content and show modal
        detailsContainer.innerHTML = detailsHtml;
        
        // Log analytics event
        console.log(`Lead viewed: ${leadId} (${analysisType} analysis)`);
        
    } catch (error) {
        console.error('Error loading lead details:', error);
        
        detailsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 24px; margin-bottom: 12px; color: var(--error);">❌</div>
                <h3 style="color: var(--error); margin-bottom: 8px;">Unable to Load Lead</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    ${error.message || 'An unexpected error occurred'}
                </p>
                <button onclick="closeModal('leadModal')" 
                        style="background: var(--primary-blue); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        
        // Track error for monitoring
        if (window.analytics) {
            window.analytics.track('Lead View Error', {
                leadId,
                error: error.message,
                userId: currentUser.id
            });
        }
    }
}

/**
 * Builds the complete HTML content for lead details
 * @param {Object} lead - Lead data from database
 * @param {Object} analysis - Analysis data from database
 * @param {string} analysisType - 'light' or 'deep'
 * @param {string} scoreClass - CSS class for score styling
 * @returns {string} Complete HTML string
 */
function buildLeadDetailsHTML(lead, analysis, analysisType, scoreClass) {
    const isDeepAnalysis = analysisType === 'deep';
    const platform = lead.platform || 'Instagram';
    const score = lead.score || 0;
    
    // Build basic profile header (always shown)
    let html = buildProfileHeader(lead, analysisType, scoreClass, platform);
    
    // Build basic information sections (always shown)
    html += `<div class="detail-grid">`;
    html += buildBasicInfoSection(lead, analysisType, platform, score);
    html += buildAnalysisStatusSection(lead, analysisType);
    
    // Add premium sections for deep analysis only
    if (isDeepAnalysis && analysis && Object.keys(analysis).length > 0) {
        html += buildAdvancedMetricsSection(analysis);
        html += buildSellingPointsSection(analysis);
    }
    
    html += `</div>`; // Close detail-grid
    
    // Add premium outreach message section for deep analysis
    if (isDeepAnalysis && analysis.outreach_message) {
        html += buildOutreachMessageSection(analysis.outreach_message);
    }
    
    // Add upgrade prompt for light analysis
    if (analysisType === 'light') {
        html += buildUpgradePromptSection();
    }
    
    return html;
}

/**
 * Builds the profile header section
 */
/**
 * Builds the profile header section - FIXED VERSION with profile picture
 */
function buildProfileHeader(lead, analysisType, scoreClass, platform) {
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
                <h4 style="margin: 0 0 8px 0; font-size: 24px; color: var(--text-primary);">@${escapeHtml(lead.username)}</h4>
                <a href="${escapeHtml(lead.profile_url)}" 
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

/**
 * Builds the basic information section
 */
function buildBasicInfoSection(lead, analysisType, platform, score) {
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
                <div class="detail-value">${formatDate(lead.created_at)}</div>
            </div>
        </div>
    `;
}

/**
 * Builds the analysis status section
 */
function buildAnalysisStatusSection(lead, analysisType) {
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

/**
 * Builds the advanced metrics section (deep analysis only)
 */
function buildAdvancedMetricsSection(analysis) {
    return `
        <div class="detail-section">
            <h4>📊 Advanced Metrics</h4>
            <div class="detail-row">
                <div class="detail-label">Engagement Score:</div>
                <div class="detail-value">
                    <strong style="color: var(--accent-teal);">
                        ${formatScore(analysis.engagement_score)}
                    </strong>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Niche‑Fit Score:</div>
                <div class="detail-value">
                    <strong style="color: var(--accent-teal);">
                        ${formatScore(analysis.score_niche_fit)}
                    </strong>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">AI Total Score:</div>
                <div class="detail-value">
                    <strong style="color: var(--primary-blue);">
                        ${formatScore(analysis.score_total)}
                    </strong>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">AI Model Version:</div>
                <div class="detail-value" style="font-family: monospace; font-size: 12px;">
                    ${analysis.ai_version_id || '—'}
                </div>
            </div>
        </div>
    `;
}

/**
 * Builds the selling points section (deep analysis only) - FIXED VERSION
 */
function buildSellingPointsSection(analysis) {
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
            // Treat as single string if JSON parsing fails
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
    
    // Create HTML for selling points
    const sellingPointsHtml = sellingPoints.map(point => `
        <div style="margin: 8px 0; padding: 12px 16px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border-left: 4px solid var(--primary-blue); display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: var(--primary-blue); font-size: 16px; margin-top: 2px;">💡</span>
            <span style="color: var(--text-primary); line-height: 1.5; font-size: 14px;">${escapeHtml(point.trim())}</span>
        </div>
    `).join('');
    
    return `
        <div class="detail-section" style="grid-column: 1 / -1;">
            <h4 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                💡 Key Selling Points
                <span style="background: var(--primary-blue); color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                    ${sellingPoints.length} insights
                </span>
            </h4>
            <div class="selling-points-container" style="display: flex; flex-direction: column; gap: 4px;">
                ${sellingPointsHtml}
            </div>
        </div>
    `;
}

/**
 * Builds the outreach message section (deep analysis only)
 */
function buildOutreachMessageSection(outreachMessage) {
    const escapedMessage = escapeHtml(outreachMessage);
    const copyData = JSON.stringify(outreachMessage).slice(1, -1); // Remove quotes and escape
    
    return `
        <div style="background: linear-gradient(135deg, var(--bg-light), #E8F3FF); padding: 24px; border-radius: 12px; border-left: 4px solid var(--primary-blue); margin-top: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h4 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; font-size: 16px;">
                💬 Personalized Outreach Message
                <button onclick="copyOutreachMessage('${copyData}', this)" 
                        style="background: var(--primary-blue); color: white; border: none; padding: 10px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                    📋 Copy Message
                </button>
            </h4>
            <div style="background: rgba(255, 255, 255, 0.9); padding: 18px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                <div style="color: var(--text-primary); line-height: 1.7; font-size: 15px;">
                    "${escapedMessage}"
                </div>
            </div>
            <div style="margin-top: 16px; padding: 12px; background: rgba(255, 255, 255, 0.7); border-radius: 6px; border: 1px dashed rgba(59, 130, 246, 0.3);">
                <p style="margin: 0; font-size: 12px; color: var(--text-secondary); text-align: center; line-height: 1.4;">
                    <strong>💡 AI-Generated:</strong> This message was crafted based on the lead's profile content and your business requirements
                </p>
            </div>
        </div>
    `;
}

/**
 * Builds the upgrade prompt section (light analysis only)
 */
function buildUpgradePromptSection() {
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
            <button onclick="showAnalysisModal()" 
                    style="background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple)); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'">
                🔍 Run Deep Analysis
            </button>
        </div>
    `;
}

/**
 * Utility function to safely copy outreach message to clipboard
 * @param {string} message - The message to copy
 * @param {HTMLElement} button - The button element that was clicked
 */
async function copyOutreachMessage(message, button) {
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
        
        // Show success message
        showMessage('Outreach message copied to clipboard', 'success');
        
        // Track analytics
        if (window.analytics) {
            window.analytics.track('Outreach Message Copied', {
                userId: currentUser?.id,
                messageLength: message.length
            });
        }
        
    } catch (error) {
        console.error('Failed to copy message:', error);
        showMessage('Failed to copy message. Please try selecting and copying manually.', 'error');
        
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

/**
 * Utility functions for formatting and escaping
 */
function formatScore(score) {
    if (score === null || score === undefined || score === '') {
        return 'N/A';
    }
    return `${score}/100`;
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid date';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make the copy function globally available
window.copyOutreachMessage = copyOutreachMessage;

// Generate AI insights based on user data
// Fix the generateInsights function around line 795 - update the insight objects:


async function generateInsights() {
    const container = document.getElementById('insights-container');
    const loading = document.getElementById('loading-insights');
    
    if (!container || !loading) return;
    
    container.style.display = 'none';
    loading.style.display = 'block';
    
    try {
        if (!supabaseClient || !currentUser) {
            // Show welcome insight for demo mode
            setTimeout(() => {
                renderWelcomeInsights();
                loading.style.display = 'none';
                container.style.display = 'grid';
            }, 1500);
            return;
        }
        
        // Load user's leads data
        const { data: leads } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('user_id', currentUser.id);
        
        // Load user subscription data
        const { data: userData } = await supabaseClient
            .from('users')
            .select('credits, subscription_plan')
            .eq('id', currentUser.id)
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
            
            // FIXED: Subscription recommendations with direct URL storage
            const plan = userData?.subscription_plan || 'free';
            if (plan === 'free') {
                insights.push({
                    type: 'recommendation',
                    icon: '⬆️',
                    title: 'Upgrade Recommended',
                    content: 'Unlock unlimited monthly credits and advanced features with a paid subscription plan.',
                    cta: 'View Plans',
                    actionType: 'url',
                    actionValue: 'https://oslira.com/subscription'
                });
            }
            
            // FIXED: Campaign insight with direct URL storage
            insights.push({
                type: 'recommendation',
                icon: '🚀',
                title: 'Scale with Campaigns',
                content: 'Create automated outreach sequences to scale your lead generation and convert more prospects.',
                cta: 'Create Campaign',
                actionType: 'url',
                actionValue: 'https://oslira.com/campaigns'
            });
        }
        
        setTimeout(() => {
            renderInsights(insights);
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
                    <button class="insight-cta" data-action-type="function" data-action-value="generateInsights">Retry</button>
                </div>
            `;
        }, 1500);
    }
}
function renderWelcomeInsights() {
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
    renderInsights(insights);
}
function renderInsights(insights) {
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
    
    // FIXED: Add event listeners with proper action handling
    container.querySelectorAll('.insight-cta').forEach((button) => {
        button.addEventListener('click', function() {
            const actionType = this.getAttribute('data-action-type');
            const actionValue = this.getAttribute('data-action-value');
            
            console.log('🎯 Button clicked!', { actionType, actionValue });
            
            try {
                if (actionType === 'function') {
                    // Call a function by name
                    if (actionValue === 'showAnalysisModal') {
                        console.log('🔍 Opening analysis modal...');
                        showAnalysisModal();
                    } else if (actionValue === 'generateInsights') {
                        console.log('🔄 Regenerating insights...');
                        generateInsights();
                    } else {
                        console.error('❌ Unknown function:', actionValue);
                    }
                } else if (actionType === 'url') {
                    // Open URL in new tab
                    console.log('🌐 Opening URL:', actionValue);
                    window.open(actionValue, '_blank');
                } else {
                    console.error('❌ Unknown action type:', actionType);
                }
            } catch (error) {
                console.error('❌ Error executing insight action:', error);
                showMessage('Action failed to execute', 'error');
            }
        });
    });
    
    console.log('✅ Event listeners added to', container.querySelectorAll('.insight-cta').length, 'buttons');
}

// Export leads to CSV
async function exportLeads() {
    if (!supabaseClient || !currentUser) {
        showMessage('Export not available in demo mode', 'error');
        return;
    }
    
    try {
        const { data: leads, error } = await supabaseClient
            .from('leads')
            .select(`
                *,
                lead_analyses (*)
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!leads || leads.length === 0) {
            showMessage('No leads to export', 'error');
            return;
        }
        
        const headers = ['Username', 'Profile URL', 'Score', 'Type', 'Platform', 'Outreach Message', 'Created Date'];
        const csvContent = [
            headers.join(','),
            ...leads.map(lead => {
                const analysis = lead.lead_analyses?.[0];
                const analysisType = lead.type || (analysis ? 'deep' : 'light');
                return [
                    lead.username,
                    lead.profile_url,
                    lead.score || 0,
                    analysisType,
                    lead.platform || 'Instagram',
                    `"${(analysis?.outreach_message || '').replace(/"/g, '""')}"`,
                    new Date(lead.created_at).toLocaleDateString()
                ].join(',');
            })
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `oslira-leads-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showMessage('Leads exported successfully', 'success');
        
    } catch (err) {
        console.error('Export error:', err);
        showMessage('Failed to export leads: ' + err.message, 'error');
    }
}

// Filter functions
function filterActivity() {
    applyActivityFilter();
}

function filterByTimeframe() {
    loadRecentActivity();
}

async function refreshActivity() {
    const btn = document.getElementById('refresh-activity-btn');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '🔄 Loading...';
        btn.disabled = true;
        
        try {
            await forceRefreshFromDatabase();
            showMessage('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('Refresh failed:', error);
            showMessage('Failed to refresh data', 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    } else {
        // If called without button context
        await forceRefreshFromDatabase();
    }

}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (modalId === 'analysisModal') {
        const form = document.getElementById('analysisForm');
        if (form) form.reset();
        
        const analysisType = document.getElementById('analysis-type');
        const profileInput = document.getElementById('profile-input');
        const inputContainer = document.getElementById('input-field-container');
        
        if (analysisType) analysisType.value = '';
        if (profileInput) profileInput.value = '';
        if (inputContainer) inputContainer.style.display = 'none';
    }
}

// Support functions
const CONTACT_EMAILS = {
    support: 'support@oslira.com',
    billing: 'billing@oslira.com',
    security: 'security@oslira.com'
};

function contactSupport(type = 'support') {
    const email = CONTACT_EMAILS[type];
    const subject = encodeURIComponent(`Oslira ${type.charAt(0).toUpperCase() + type.slice(1)} Request`);
    window.location.href = `mailto:${email}?subject=${subject}`;
}

function showSupportModal() {
    const modal = document.getElementById('supportModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Logout function
function logout(e) {
    e.preventDefault();
    
    if (supabaseClient) {
        supabaseClient.auth.signOut().then(() => {
            window.location.href = '/login.html';
        }).catch(err => {
            console.error('Logout error:', err);
            window.location.href = '/login.html';
        });
    } else {
        window.location.href = '/login.html';
    }
}

// Modal click handler
function handleModalClick(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    if (event.key === 'Escape') {
        const openModal = document.querySelector('.modal[style*="flex"]');
        if (openModal) {
            openModal.style.display = 'none';
        }
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        showAnalysisModal();
    }
}

// Show message function
function showMessage(text, type = 'success') {
    console.log(`${type.toUpperCase()}: ${text}`);
    
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
        background: ${type === 'success' ? 'linear-gradient(135deg, var(--success), #34D399)' : 
                     type === 'error' ? 'linear-gradient(135deg, var(--error), #F87171)' : 
                     type === 'info' ? 'linear-gradient(135deg, var(--primary-blue), var(--secondary-purple))' :
                     'linear-gradient(135deg, var(--primary-blue), var(--secondary-purple))'};
    `;
    document.body.appendChild(message);

    setTimeout(() => {
        message.style.opacity = '1';
        message.style.transform = 'translateX(0)';
    }, 100);

    const duration = type === 'info' ? 8000 : 5000;
    setTimeout(() => {
        message.style.opacity = '0';
        message.style.transform = 'translateX(100%)';
        setTimeout(() => message.remove(), 300);
    }, duration);
}

// Set up auth state listener
function setupAuthListener() {
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            if (event === 'SIGNED_OUT' || !session) {
                if (!window.CONFIG.supabaseUrl.includes('your-project')) {
                    window.location.href = '/login.html';
                }
            }
        });
    }
}

let csvData = [];

function showBulkUpload() {
    const modal = document.getElementById('bulkModal');
    if (!modal) return;
    
    // Update modal content for simple CSV import
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <button class="modal-close" id="bulk-modal-close">×</button>
        <h3>📤 Import CSV for Bulk Analysis</h3>
        <p style="margin-bottom: 20px; color: var(--text-secondary);">Upload a CSV file with Instagram usernames for batch analysis</p>
        
        <div class="csv-import-sections">
            <!-- CSV Format Instructions -->
            <div class="form-group">
                <label>📋 Simple CSV Format:</label>
                <div style="background: var(--bg-light); padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; margin-bottom: 16px; border: 1px dashed var(--border-light);">
                    nasa<br>
                    elonmusk<br>
                    instagram<br>
                    cultleaderhamza<br>
                    hamzawilx
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
                <select id="bulk-analysis-type" style="width: 100%; padding: 8px; margin-bottom: 12px;">
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
            <button id="process-csv-btn" class="primary-btn" style="width: 100%; margin-top: 16px;" disabled>
                🚀 Start Bulk Analysis
            </button>
            
            <!-- Progress Section -->
            <div id="bulk-progress" style="display: none; margin-top: 20px;">
                <div style="background: var(--bg-light); padding: 16px; border-radius: 8px; border: 1px solid var(--border-light);">
                    <h4>📊 Bulk Analysis Progress</h4>
                    <div style="margin: 12px 0;">
                        <div style="background: #e5e7eb; border-radius: 4px; height: 8px;">
                            <div id="progress-bar" style="background: var(--primary-blue); height: 100%; border-radius: 4px; width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <p id="progress-text" style="margin: 8px 0 0 0; font-size: 14px; color: var(--text-secondary);">Ready to start...</p>
                    </div>
                    <div id="progress-details" style="font-size: 12px; color: var(--text-secondary);"></div>
                </div>
            </div>
        </div>
    `;
    
    // Re-populate business profiles
    populateBulkBusinessProfiles();
    
    // Re-attach event listeners
    document.getElementById('bulk-modal-close')?.addEventListener('click', () => closeModal('bulkModal'));
    document.getElementById('csv-file')?.addEventListener('change', handleCSVUpload);
    document.getElementById('process-csv-btn')?.addEventListener('click', processBulkAnalysis);
    document.getElementById('bulk-analysis-type')?.addEventListener('change', updateCreditCostDisplay);
    
    modal.style.display = 'flex';
}

async function handleCSVUpload(event) {
    const file = event.target.files[0];
    const processBtn = document.getElementById('process-csv-btn');
    const previewDiv = document.getElementById('csv-preview');
    
    if (!file) {
        processBtn.disabled = true;
        previewDiv.style.display = 'none';
        return;
    }
    
    if (!file.name.endsWith('.csv')) {
        showMessage('Please upload a CSV file', 'error');
        processBtn.disabled = true;
        return;
    }
    
    try {
        const text = await file.text();
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (lines.length === 0) {
            showMessage('CSV file is empty', 'error');
            processBtn.disabled = true;
            return;
        }
        
        // Parse as simple username list (no headers)
        csvData = lines.map(line => {
            const username = line.split(',')[0].trim().replace(/"/g, '').replace('@', '');
            return { 
                username: username,
                name: '',
                notes: ''
            };
        }).filter(row => row.username && row.username.length > 0);
        
        if (csvData.length === 0) {
            showMessage('No valid usernames found in CSV', 'error');
            processBtn.disabled = true;
            return;
        }
        
        // NEW: Calculate credit cost based on current analysis type
        updateCreditCostDisplay();
        
        // Show preview with credit cost
        previewDiv.innerHTML = `
            <h4>📋 CSV Preview (${csvData.length} usernames found)</h4>
            <div style="max-height: 200px; overflow-y: auto; background: white; border: 1px solid var(--border-light); border-radius: 4px;">
                <div style="padding: 16px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
                        ${csvData.slice(0, 20).map(row => `
                            <div style="padding: 4px 8px; background: var(--bg-light); border-radius: 4px; font-size: 12px; text-align: center;">
                                @${row.username}
                            </div>
                        `).join('')}
                        ${csvData.length > 20 ? `
                            <div style="padding: 4px 8px; background: var(--primary-blue); color: white; border-radius: 4px; font-size: 12px; text-align: center;">
                                +${csvData.length - 20} more
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- NEW: Credit Cost Display -->
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
                            Loading...
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            credits total
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        previewDiv.style.display = 'block';
        processBtn.disabled = false;
        
    } catch (error) {
        console.error('CSV parsing error:', error);
        showMessage('Error reading CSV file', 'error');
        processBtn.disabled = true;
    }
}

// NEW: Function to update credit cost display
function updateCreditCostDisplay() {
    if (!csvData || csvData.length === 0) return;
    
    const analysisType = document.getElementById('bulk-analysis-type').value;
    const creditsPerLead = analysisType === 'deep' ? 2 : 1;
    const totalCredits = csvData.length * creditsPerLead;
    
    // Update the cost display
    const totalCostElement = document.getElementById('total-cost');
    if (totalCostElement) {
        totalCostElement.textContent = totalCredits;
    }
    
    // Update the process button
    const processBtn = document.getElementById('process-csv-btn');
    if (processBtn && !processBtn.disabled) {
        processBtn.innerHTML = `🚀 Analyze ${csvData.length} Profiles (${totalCredits} credits)`;
    }
}

async function processBulkAnalysis() {
    if (!csvData || csvData.length === 0) {
        showMessage('No CSV data to process', 'error');
        return;
    }
    
    const analysisType = document.getElementById('bulk-analysis-type').value;
    const businessId = document.getElementById('bulk-business-id').value;
    
    if (!businessId) {
        showMessage('Please select a business profile', 'error');
        return;
    }
    
    if (!supabaseClient || !currentUser) {
        showMessage('Not connected to database', 'error');
        return;
    }
    
    // Show progress section
    const progressSection = document.getElementById('bulk-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressDetails = document.getElementById('progress-details');
    const processBtn = document.getElementById('process-csv-btn');
    
    progressSection.style.display = 'block';
    processBtn.disabled = true;
    processBtn.innerHTML = '🔄 Processing...';
    
    let completed = 0;
    let failed = 0;
    const total = csvData.length;
    
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) {
            throw new Error('Please log in again to continue');
        }
        
        progressText.textContent = `Starting bulk analysis of ${total} profiles...`;
        
        // Process in larger batches using Apify's bulk capability
        const batchSize = 10; // Apify can handle multiple profiles per request
        const batches = [];
        
        for (let i = 0; i < csvData.length; i += batchSize) {
            batches.push(csvData.slice(i, i + batchSize));
        }
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            
            progressText.textContent = `Processing batch ${batchIndex + 1} of ${batches.length} (${batch.length} profiles)...`;
            
            try {
                // Send bulk request to worker
                const bulkRequestBody = {
                    profiles: batch.map(profile => ({
                        username: profile.username,
                        name: profile.name,
                        notes: profile.notes
                    })),
                    analysis_type: analysisType,
                    business_id: businessId,
                    user_id: currentUser.id,
                    platform: 'instagram'
                };
                
                console.log(`📤 Sending bulk batch ${batchIndex + 1}:`, bulkRequestBody);
                
                const response = await fetch(window.CONFIG.workerUrl + '/bulk-analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify(bulkRequestBody)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    completed += result.successful || 0;
                    failed += result.failed || 0;
                    
                    console.log(`✅ Batch ${batchIndex + 1} completed:`, {
                        successful: result.successful,
                        failed: result.failed,
                        details: result.results
                    });
                } else {
                    failed += batch.length;
                    console.error(`❌ Batch ${batchIndex + 1} failed:`, result.error);
                }
                
            } catch (error) {
                failed += batch.length;
                console.error(`❌ Batch ${batchIndex + 1} error:`, error.message);
            }
            
            // Update progress
            const progressPercent = Math.round(((completed + failed) / total) * 100);
            progressBar.style.width = `${progressPercent}%`;
            progressDetails.innerHTML = `
                ✅ Completed: ${completed} | ❌ Failed: ${failed} | 📊 Total: ${total}
            `;
            
            // Wait between batches to avoid overwhelming
            if (batchIndex < batches.length - 1) {
                progressText.textContent = `Waiting before next batch...`;
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        // Final results
        progressText.textContent = `Bulk analysis complete! ${completed} successful, ${failed} failed.`;
        
        if (completed > 0) {
            showMessage(`Successfully analyzed ${completed} profiles!`, 'success');
            
            // Refresh the dashboard data
            await Promise.all([
                loadRecentActivity(),
                loadStats(),
                loadCreditUsage(),
                refreshCreditsDisplay()
            ]);
        }
        
        if (failed > 0) {
            showMessage(`${failed} profiles failed to analyze. Check console for details.`, 'warning');
        }
        
    } catch (error) {
        console.error('Bulk analysis error:', error);
        showMessage(`Bulk analysis failed: ${error.message}`, 'error');
        progressText.textContent = 'Bulk analysis failed.';
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '🚀 Start Bulk Analysis';
    }
}

function populateBulkBusinessProfiles() {
    const select = document.getElementById('bulk-business-id');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select business profile...</option>';
    businessProfiles.forEach(business => {
        const option = document.createElement('option');
        option.value = business.id;
        option.textContent = business.business_name;
        select.appendChild(option);
    });
    
    if (currentBusiness) {
        select.value = currentBusiness.id;
    }
}

// Make functions globally available (add this at the very end of dashboard.js)
window.viewLead = viewLead;
window.copyText = copyText;
window.showAnalysisModal = showAnalysisModal;
window.generateInsights = generateInsights;
window.copyOutreachMessage = copyOutreachMessage;
window.toggleLeadSelection = toggleLeadSelection;
window.selectAllLeads = selectAllLeads;
window.clearSelection = clearSelection;
window.bulkDeleteLeads = bulkDeleteLeads;
window.forceRefreshFromDatabase = forceRefreshFromDatabase;
window.handleCSVUpload = handleCSVUpload;
window.processBulkAnalysis = processBulkAnalysis;
window.showBulkUpload = showBulkUpload;
window.populateBulkBusinessProfiles = populateBulkBusinessProfiles;

// Initialize auth listener after page load
setTimeout(setupAuthListener, 2000);
