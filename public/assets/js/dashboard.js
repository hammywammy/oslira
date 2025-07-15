// Global configuration and state
window.CONFIG = {};


async function loadConfig() {
  try {
    const res = await fetch('/.netlify/functions/config');
    if (!res.ok) throw new Error(res.statusText);
    Object.assign(window.CONFIG, await res.json());
  } catch (err) {
    console.warn('⚠️ could not load config –', err);
  }
}

// Global state
let supabaseClient;
let currentUser = null;
let currentSession = null;
let currentBusiness = null;
let businessProfiles = [];
let allLeads = [];

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadConfig();
        supabaseClient = window.supabase.createClient(
            window.CONFIG.supabaseUrl,
            window.CONFIG.supabaseAnonKey
        );
        await initializePage();
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        showMessage('Dashboard initialization failed', 'error');
        showFallbackUI();
    }
});

// Load configuration from API
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            window.CONFIG = {
                supabaseUrl: config.supabaseUrl || window.CONFIG.supabaseUrl,
                supabaseAnonKey: config.supabaseAnonKey || window.CONFIG.supabaseAnonKey,
                workerUrl: config.workerUrl || window.CONFIG.workerUrl
            };
        }
    } catch (error) {
        console.warn('Could not load config from API, using defaults');
    }
}

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
async function checkAuth() {
    if (!supabaseClient) return;
    
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error || !session) {
            if (!window.CONFIG.supabaseUrl.includes('your-project')) {
                window.location.href = '/login.html';
                return;
            }
            return;
        }
        
        currentSession = session;
        currentUser = session.user;
        document.getElementById('user-email').textContent = currentUser.email;
        
    } catch (err) {
        console.warn('Auth check failed:', err);
        if (!window.CONFIG.supabaseUrl.includes('your-project')) {
            window.location.href = '/login.html';
        }
    }
}

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

        const { data: balanceData, error: balanceError } = await supabaseClient
            .from('credit_balances')
            .select('balance')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        let userCredits = user.credits || 0;
        if (!balanceError && balanceData) {
            userCredits = balanceData.balance;
        }

        updateSubscriptionUI(user.subscription_plan, user.subscription_status, userCredits);
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
    document.getElementById('sidebar-billing').textContent = 
        plan === 'free' ? 'No active subscription' : 'Active subscription';
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
    document.getElementById('subscription-action-card')?.addEventListener('click', () => location.href='subscription.html');
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

// Load recent activity with filtering
async function loadRecentActivity() {
    if (!supabaseClient || !currentUser) return;
    
    try {
        let query = supabaseClient
            .from('leads')
            .select(`
                *,
                lead_analyses (
                    engagement_score,
                    score_niche_fit,
                    score_total,
                    ai_version_id,
                    outreach_message
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
        
        allLeads = leads || [];
        applyActivityFilter();
        
    } catch (err) {
        console.error('Error loading activity:', err);
        document.getElementById('activity-table').innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--warning);">
                    Error loading activity data
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
            filteredLeads = filteredLeads.filter(lead => (lead.score || 0) >= 80);
            filteredLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
            break;
        case 'score_low':
            filteredLeads = filteredLeads.filter(lead => (lead.score || 0) <= 50);
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
function displayLeads(leads) {
    const tableBody = document.getElementById('activity-table');
    
    if (leads && leads.length > 0) {
        tableBody.innerHTML = leads.map(lead => {
            const analysisType = lead.type || (lead.lead_analyses && lead.lead_analyses.length > 0 ? 'deep' : 'light');
            const scoreClass = lead.score >= 80 ? 'score-high' : lead.score >= 60 ? 'score-medium' : 'score-low';
            
            return `
                <tr class="lead-row">
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
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
                    <td><span class="status light">analyzed</span></td>
                    <td>${new Date(lead.created_at).toLocaleString()}</td>
                    <td>
                        <button class="btn-small" onclick="viewLead('${lead.id}')">📝 View</button>
                        <button class="delete-btn" onclick="deleteLead('${lead.id}')" title="Delete lead">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    No leads found for the selected filters.
                </td>
            </tr>
        `;
    }
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
        
        const requestBody = {
            profile_url: profileUrl,
            analysis_type: analysisType,
            business_id: businessId || null,
            user_id: currentUser.id,
            platform: 'instagram'
        };
        
        const response = await fetch(window.CONFIG.workerUrl + '/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            let errorMessage = result.error || `HTTP ${response.status}`;
            
            if (response.status === 400) {
                if (result.error && result.error.includes('profile data')) {
                    errorMessage = 'Could not find this Instagram profile. Please check the username and make sure the profile is public.';
                } else if (result.error && result.error.includes('business')) {
                    errorMessage = 'Please select a business profile before analyzing.';
                }
            } else if (response.status === 402) {
                errorMessage = `Insufficient credits. You need ${result.required} credits but only have ${result.available}. Please upgrade your plan.`;
            } else if (response.status === 500) {
                errorMessage = 'Our analysis service is temporarily unavailable. Please try again in a few minutes.';
            }
            
            throw new Error(errorMessage);
        }
        
        showMessage('Analysis completed successfully!', 'success');
        closeModal('analysisModal');
        
        // Refresh all data after successful analysis
        await Promise.all([
            loadRecentActivity(),
            loadStats(),
            loadCreditUsage()
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
function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
    const hasConsecutivePeriods = /\.{2,}/.test(username);
    const startsOrEndsWithPeriod = /^\./.test(username) || /\.$/.test(username);
    
    return usernameRegex.test(username) && !hasConsecutivePeriods && !startsOrEndsWithPeriod;
}

// View lead details
// Replace your existing viewLead with this:
async function viewLead(leadId) {
  if (!supabaseClient || !currentUser) return;

  try {
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select(`
        *,
        lead_analyses (*)
      `)
      .eq('id', leadId)
      .single();
    if (leadError) throw leadError;

    const analysis = lead.lead_analyses?.[0] || {};
    const analysisType = lead.type || (analysis ? 'deep' : 'light');
    const scoreClass = lead.score >= 80 ? 'score-high'
                     : lead.score >= 60 ? 'score-medium'
                     : 'score-low';

    let detailsHtml = `
      <div class="profile-header">
        <div class="profile-info">
          <h4>@${lead.username}</h4>
          <a href="${lead.profile_url}" target="_blank">View on Instagram 🔗</a>
          <p style="margin-top:8px;color:var(--text-secondary);">${lead.platform || 'Instagram'}</p>
        </div>
        <div style="margin-left:auto;">
          <span class="score-badge ${scoreClass}">
            ${lead.score || 0}/100
          </span>
          <div style="margin-top:8px;">
            <span class="status ${analysisType}">
              ${analysisType === 'deep' ? '🔍 Deep Analysis' : '⚡ Light Analysis'}
            </span>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-section">
          <h4>📋 Profile Info</h4>
          <div class="detail-row">
            <div class="detail-label">Platform:</div>
            <div class="detail-value">${lead.platform || 'Instagram'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Score:</div>
            <div class="detail-value">${lead.score || 0}/100</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Type:</div>
            <div class="detail-value">${lead.type || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Created:</div>
            <div class="detail-value">${new Date(lead.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="detail-section">
          <h4>🎯 Analysis Results</h4>
          <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">Analyzed</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Business:</div>
            <div class="detail-value">${lead.business_id || '—'}</div>
          </div>
        </div>

        <div class="detail-section">
          <h4>📊 Engagement & Fit</h4>
          <div class="detail-row">
            <div class="detail-label">Engagement Score:</div>
            <div class="detail-value">${analysis.engagement_score ?? 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Niche‑Fit Score:</div>
            <div class="detail-value">${analysis.score_niche_fit ?? 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Total AI Score:</div>
            <div class="detail-value">${analysis.score_total ?? 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">AI Version:</div>
            <div class="detail-value">${analysis.ai_version_id ?? '—'}</div>
          </div>
        </div>

        <div class="detail-section">
          <h4>💡 Selling Points</h4>
          <div class="detail-value">
            ${(analysis.selling_points || []).length
              ? analysis.selling_points.join(', ')
              : 'None found'}
          </div>
        </div>
      </div>
    `;

    if (analysis.outreach_message) {
      detailsHtml += `
        <div style="background:linear-gradient(135deg,var(--bg-light),#E8F3FF); padding:20px; border-radius:12px; border-left:4px solid var(--primary-blue); margin-top:20px;">
          <h4 style="display:flex;justify-content:space-between;align-items:center; color:var(--text-primary); margin-bottom:12px;">
            💬 Personalized Outreach
            <button onclick="copyText('${analysis.outreach_message.replace(/'/g, "\\'")}', this)"
                    style="background:var(--primary-blue);color:white;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;">
              📋 Copy
            </button>
          </h4>
          <div style="font-style:italic; line-height:1.6;">
            "${analysis.outreach_message}"
          </div>
        </div>
      `;
    }

    document.getElementById('leadDetails').innerHTML = detailsHtml;
    document.getElementById('leadModal').style.display = 'flex';
  }
  catch (err) {
    console.error('Error loading lead details:', err);
    document.getElementById('leadDetails').innerHTML = `<p style="color:var(--error);">Failed to load lead details: ${err.message}</p>`;
    document.getElementById('leadModal').style.display = 'flex';
  }
}

// Copy text to clipboard
async function copyText(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.style.background = 'var(--accent-teal)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = 'var(--primary-blue)';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text:', err);
    }
}

// Delete lead from database
async function deleteLead(leadId) {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
        return;
    }

    if (!supabaseClient || !currentUser) return;

    try {
        // Delete related analyses first
        const { error: analysisError } = await supabaseClient
            .from('lead_analyses')
            .delete()
            .eq('lead_id', leadId);

        // Delete the lead
        const { error: leadError } = await supabaseClient
            .from('leads')
            .delete()
            .eq('id', leadId)
            .eq('user_id', currentUser.id);

        if (leadError) throw leadError;

        // Refresh data
        await Promise.all([
            loadRecentActivity(),
            loadStats()
        ]);
        
        showMessage('Lead deleted successfully', 'success');

    } catch (err) {
        console.error('Error deleting lead:', err);
        showMessage('Failed to delete lead: ' + err.message, 'error');
    }
}

// Generate AI insights based on user data
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
                action: 'showAnalysisModal()'
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
                    action: 'showAnalysisModal()'
                });
            } else if (avgScore > 0) {
                insights.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Lead Quality Alert',
                    content: `Your average lead score of ${Math.round(avgScore)} suggests you may need to adjust your targeting strategy.`,
                    cta: 'Research Better Leads',
                    action: 'showAnalysisModal()'
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
                    action: 'location.href="subscription.html"'
                });
            }
            
            // Campaign insight
            insights.push({
                type: 'recommendation',
                icon: '🚀',
                title: 'Scale with Campaigns',
                content: 'Create automated outreach sequences to scale your lead generation and convert more prospects.',
                cta: 'Create Campaign',
                action: 'location.href="campaigns.html"'
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
                    <button class="insight-cta" onclick="generateInsights()">Retry</button>
                </div>
            `;
        }, 1500);
    }
}

// Render welcome insights for demo mode
function renderWelcomeInsights() {
    const container = document.getElementById('insights-container');
    const insights = [
        {
            type: 'welcome',
            icon: '🚀',
            title: 'Welcome to Oslira!',
            content: 'Start researching leads to unlock AI-powered insights and recommendations tailored to your data.',
            cta: 'Research Your First Lead',
            action: 'showAnalysisModal()'
        }
    ];
    renderInsights(insights);
}

// Render insights cards
function renderInsights(insights) {
    const container = document.getElementById('insights-container');
    
    container.innerHTML = insights.map(insight => `
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
                <button class="insight-cta" onclick="${insight.action}">
                    ${insight.cta}
                </button>
            ` : ''}
        </div>
    `).join('');
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

// Refresh activity data
async function refreshActivity() {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '🔄 Loading...';
    btn.disabled = true;
    
    try {
        await loadRecentActivity();
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Show bulk upload modal
function showBulkUpload() {
    const modal = document.getElementById('bulkModal');
    if (modal) {
        modal.style.display = 'flex';
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

// Make functions globally available
window.viewLead = viewLead;
window.deleteLead = deleteLead;
window.copyText = copyText;
window.showAnalysisModal = showAnalysisModal;
window.generateInsights = generateInsights;

// Initialize auth listener after page load
setTimeout(setupAuthListener, 2000);
