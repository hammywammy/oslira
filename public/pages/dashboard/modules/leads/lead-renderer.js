//public/pages/dashboard/modules/leads/lead-renderer.js

/**
 * OSLIRA LEAD RENDERER MODULE
 * Handles all lead display, card rendering, and UI presentation
 * Extracted from dashboard.js - maintains exact functionality and styling
 */
class LeadRenderer {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.stateManager = container.get('stateManager');
        this.osliraApp = container.get('osliraApp');
        
        // Cache for rendered elements
        this.renderCache = new Map();
        this.dateFormatCache = new Map();
        
        console.log('🚀 [LeadRenderer] Initialized');
    }
    
    async init() {
        // Listen to data changes for re-rendering
        this.stateManager.subscribe('leads', this.handleLeadsChanged.bind(this));
        this.stateManager.subscribe('filteredLeads', this.handleFilteredLeadsChanged.bind(this));
        this.stateManager.subscribe('selectedLeads', this.handleSelectionChanged.bind(this));
        
        console.log('✅ [LeadRenderer] Event listeners initialized');
    }
    
    // ===============================================================================
    // MAIN DISPLAY FUNCTION - EXTRACTED FROM dashboard.js lines 2200-2350
    // ===============================================================================
    
displayLeads(leads = null) {
    const leadsToDisplay = leads || this.stateManager.getState('filteredLeads') || this.stateManager.getState('leads');
    const tableBody = document.getElementById('leads-table-body') || document.getElementById('activity-table');
    const selectedLeads = this.stateManager.getState('selectedLeads');
    
    if (!tableBody) {
        console.warn('⚠️ [LeadRenderer] Table body element not found. Expected: leads-table-body');
        // Try to create the table structure if it doesn't exist
        this.createTableStructureIfMissing();
        return;
    }
        
        console.log(`🎨 [LeadRenderer] Displaying ${leadsToDisplay.length} leads`);
        
        // Show loading state if needed
        if (this.stateManager.getState('isLoading')) {
            this.renderLoadingState(tableBody);
            return;
        }
        
        // Handle empty state
        if (leadsToDisplay.length === 0) {
            this.renderEmptyState(tableBody);
            this.updateLeadCounts(0, 0);
            return;
        }
        
        // Render leads
        const leadCards = leadsToDisplay.map(lead => this.createLeadCard(lead)).join('');
        tableBody.innerHTML = leadCards;
        
        // Update counts
        this.updateLeadCounts(leadsToDisplay.length, selectedLeads.size);
        
        // Update bulk actions visibility
        this.updateBulkActionsVisibility(selectedLeads.size > 0);
        
        // Emit render complete event
        this.eventBus.emit('leads:rendered', {
            count: leadsToDisplay.length,
            selected: selectedLeads.size
        });
        
        console.log('✅ [LeadRenderer] Leads display completed');
    }

    // ===============================================================================
// DOM STRUCTURE REPAIR
// ===============================================================================

createTableStructureIfMissing() {
    const leadsContainer = document.querySelector('.leads-table-container');
    if (!leadsContainer) {
        console.error('❌ [LeadRenderer] Leads container not found - cannot create table structure');
        return;
    }
    
    console.log('🔧 [LeadRenderer] Creating missing table structure...');
    
    const tableHTML = `
        <table class="leads-table w-full">
            <thead class="bg-slate-50/50">
                <tr class="border-b border-slate-200/60">
                    <th class="px-6 py-4 text-left">
                        <input type="checkbox" 
                               id="select-all-checkbox" 
                               onchange="dashboard.toggleAllLeads(this)"
                               class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lead</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Platform</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Score</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Time</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody id="leads-table-body" class="divide-y divide-slate-200/60">
                <!-- Leads will be populated by JavaScript -->
            </tbody>
        </table>
    `;
    
    leadsContainer.innerHTML = tableHTML;
    console.log('✅ [LeadRenderer] Table structure created');
}
    
    // ===============================================================================
    // LEAD CARD CREATION - EXTRACTED FROM dashboard.js lines 2650-2850
    // ===============================================================================
    
createLeadCard(lead) {
        const selectedLeads = this.stateManager.getState('selectedLeads');
        const isSelected = selectedLeads.has(lead.id);
        const score = lead.score || 0;
        
        // Professional score categorization
        const getScoreConfig = (score) => {
            if (score >= 90) return { class: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Excellent', color: 'emerald' };
            if (score >= 75) return { class: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Strong', color: 'blue' };
            if (score >= 60) return { class: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Moderate', color: 'amber' };
            return { class: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Low', color: 'slate' };
        };
        
        const scoreConfig = getScoreConfig(score);
        
        // Enhanced date formatting
        const dateKey = lead.updated_at || lead.created_at;
        let formattedDate = this.dateFormatCache.get(dateKey);
        if (!formattedDate) {
            formattedDate = this.formatDateProfessional(dateKey);
            this.dateFormatCache.set(dateKey, formattedDate);
        }
        
        // Professional profile picture with enhanced fallback
        const profilePicUrl = lead.profile_pic_url;
        const username = lead.username || 'unknown';
        const fullName = lead.full_name || '';
        
        const profilePicHtml = profilePicUrl
            ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=64&h=64&fit=cover&mask=circle" 
                   alt="@${username}" 
                   class="w-12 h-12 rounded-full border-2 border-slate-200 object-cover shadow-sm"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : '';
            
        const fallbackHtml = `
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg border-2 border-slate-200 shadow-sm ${profilePicUrl ? 'hidden' : 'flex'}">
                ${username.charAt(0).toUpperCase()}
            </div>
        `;
        
        // Platform badge configuration
        const getPlatformConfig = (platform) => {
            const configs = {
                instagram: { icon: '📷', class: 'bg-pink-100 text-pink-700 border-pink-200', name: 'Instagram' },
                tiktok: { icon: '🎵', class: 'bg-purple-100 text-purple-700 border-purple-200', name: 'TikTok' },
                youtube: { icon: '📺', class: 'bg-red-100 text-red-700 border-red-200', name: 'YouTube' },
                twitter: { icon: '🐦', class: 'bg-blue-100 text-blue-700 border-blue-200', name: 'Twitter' }
            };
            return configs[platform] || { icon: '🌐', class: 'bg-slate-100 text-slate-700 border-slate-200', name: platform };
        };
        
        const platformConfig = getPlatformConfig(lead.platform);
        
        // Analysis type badge
        const analysisConfig = lead.analysis_type === 'deep' 
            ? { class: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Deep Analysis', icon: '🔍' }
            : { class: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Light Analysis', icon: '👁️' };

        return `
            <tr class="group hover:bg-slate-50/50 transition-colors duration-200 ${isSelected ? 'bg-blue-50/50 border-blue-200' : ''}" 
                data-lead-id="${lead.id}">
                
                <!-- Selection Checkbox -->
                <td class="px-6 py-4">
                    <input type="checkbox" 
                           class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                           ${isSelected ? 'checked' : ''}
                           onchange="dashboard.toggleLeadSelection('${lead.id}', this.checked)">
                </td>
                
                <!-- Lead Profile -->
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-4">
                        <div class="flex-shrink-0 relative">
                            ${profilePicHtml}
                            ${fallbackHtml}
                            <!-- Verification badge if needed -->
                            ${lead.is_verified ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></div>' : ''}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center space-x-2">
                                <button onclick="dashboard.openProfile('${lead.profile_url || `https://instagram.com/${username}`}')" 
                                        class="font-semibold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer text-left">
                                    @${username}
                                </button>
                                ${lead.is_business_account ? '<span class="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded border border-orange-200">Business</span>' : ''}
                            </div>
                            ${fullName ? `<div class="text-sm text-slate-600 truncate">${fullName}</div>` : ''}
                            ${lead.followers_count ? `<div class="text-xs text-slate-500">${this.formatFollowerCount(lead.followers_count)} followers</div>` : ''}
                        </div>
                    </div>
                </td>
                
                <!-- Platform -->
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium border ${platformConfig.class}">
                        <span class="mr-1">${platformConfig.icon}</span>
                        ${platformConfig.name}
                    </span>
                </td>
                
                <!-- Intelligence Score -->
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-3">
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-sm font-semibold text-slate-900">${score}</span>
                                <span class="text-xs text-slate-500">/100</span>
                            </div>
                            <div class="w-full bg-slate-200 rounded-full h-2">
                                <div class="bg-gradient-to-r from-${scoreConfig.color}-400 to-${scoreConfig.color}-600 h-2 rounded-full transition-all duration-300" 
                                     style="width: ${score}%"></div>
                            </div>
                        </div>
                        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${scoreConfig.class}">
                            ${scoreConfig.label}
                        </span>
                    </div>
                </td>
                
                <!-- Analysis Type -->
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium border ${analysisConfig.class}">
                        <span class="mr-1">${analysisConfig.icon}</span>
                        ${analysisConfig.label}
                    </span>
                </td>
                
                <!-- Date -->
                <td class="px-6 py-4">
                    <div class="text-sm text-slate-900">${formattedDate.date}</div>
                    <div class="text-xs text-slate-500">${formattedDate.time}</div>
                </td>
                
                <!-- Actions -->
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end space-x-2">
                        ${lead.quick_summary ? `<button onclick="dashboard.showQuickSummary('${lead.id}')" 
                                                       class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                                                       title="View summary">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                </button>` : ''}
                        
                        <div class="relative inline-block text-left">
                            <button onclick="dashboard.toggleActionMenu('${lead.id}')" 
                                    class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                </svg>
                            </button>
                            
                            <!-- Action Menu (Hidden by default) -->
                            <div id="action-menu-${lead.id}" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
                                <div class="py-1">
                                    <button onclick="dashboard.copyUsername('${username}')" 
                                            class="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                        Copy Username
                                    <button onclick="dashboard.openProfile('${lead.profile_url || `https://instagram.com/${username}`}')" 
                                           class="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                       <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"/>
                                       </svg>
                                       View Profile
                                   </button>
                                   <button onclick="dashboard.exportLead('${lead.id}')" 
                                           class="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                       <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                       </svg>
                                       Export Data
                                   </button>
                                   <div class="border-t border-slate-200 my-1"></div>
                                   <button onclick="dashboard.deleteLead('${lead.id}')" 
                                           class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                       <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                       </svg>
                                       Delete Lead
                                   </button>
                               </div>
                           </div>
                       </div>
                   </div>
               </td>
           </tr>
       `;
   }

   // Enhanced date formatting for professional display
   formatDateProfessional(dateString) {
       if (!dateString) return { date: '—', time: '—' };
       
       const date = new Date(dateString);
       const now = new Date();
       const diffTime = Math.abs(now - date);
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
       
       // Relative date for recent items
       let dateDisplay;
       if (diffDays === 0) {
           dateDisplay = 'Today';
       } else if (diffDays === 1) {
           dateDisplay = 'Yesterday';
       } else if (diffDays < 7) {
           dateDisplay = `${diffDays} days ago`;
       } else {
           dateDisplay = date.toLocaleDateString('en-US', { 
               month: 'short', 
               day: 'numeric',
               year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
           });
       }
       
       const timeDisplay = date.toLocaleTimeString('en-US', { 
           hour: 'numeric', 
           minute: '2-digit',
           hour12: true 
       });
       
       return { date: dateDisplay, time: timeDisplay };
   }

   // Enhanced follower count formatting
   formatFollowerCount(count) {
       if (!count) return '0';
       if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
       if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
       return count.toString();
   }
        
        // Analysis type badge - EXACT FROM ORIGINAL
        const analysisTypeBadge = lead.analysis_type === 'deep'
            ? '<span class="badge badge-premium">DEEP</span>'
            : '<span class="badge badge-light">LIGHT</span>';
            
        // Quick summary for light analysis - EXACT FROM ORIGINAL
        const summaryHtml = lead.analysis_type === 'light' && lead.quick_summary
            ? `<div class="quick-summary">
                   <p>${lead.quick_summary}</p>
                   <button onclick="dashboard.showAnalysisModal('${lead.username}')" class="upgrade-btn">
                       <span>📈</span> Upgrade to Deep Analysis
                   </button>
               </div>`
            : '';
            
        return `
            <tr class="lead-row ${isSelected ? 'selected' : ''}" data-lead-id="${lead.id}">
                <!-- Selection Checkbox -->
                <td class="selection-cell">
                    <input type="checkbox" 
                           class="lead-checkbox" 
                           data-lead-id="${lead.id}"
                           ${isSelected ? 'checked' : ''}
                           onchange="dashboard.toggleLeadSelection('${lead.id}')"
                           title="Select lead">
                </td>
                
                <!-- Profile Picture -->
                <td class="profile-cell">
                    <div class="profile-container">
                        ${profilePicHtml}
                        ${fallbackHtml}
                    </div>
                </td>
                
                <!-- Lead Info -->
                <td class="lead-info">
                    <div class="lead-details">
                        <div class="lead-header">
                            <span class="username">@${lead.username}</span>
                            ${analysisTypeBadge}
                            ${this.renderScoreBadge(score, scoreClass)}
                        </div>
                        
                        <div class="lead-meta">
                            <span class="followers">
                                👥 ${this.formatNumber(lead.followers_count || 0)} followers
                            </span>
                            <span class="date">📅 ${formattedDate}</span>
                        </div>
                        
                        ${summaryHtml}
                    </div>
                </td>
                
                <!-- Actions -->
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button onclick="dashboard.viewLead('${lead.id}')" 
                                class="btn btn-primary btn-sm"
                                title="View full analysis">
                            👁️ View
                        </button>
                        
                        <button onclick="dashboard.deleteLead('${lead.id}')" 
                                class="btn btn-danger btn-sm"
                                title="Delete lead"
                                onclick="return confirm('Delete this lead?')">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // ===============================================================================
    // LEAD DETAILS HTML BUILDER - EXTRACTED FROM dashboard.js lines 6000-6800
    // ===============================================================================
    
    buildLeadDetailsHTML(lead, analysisData = null) {
        const analysisType = lead.analysis_type || 'light';
        const isDeepAnalysis = analysisType === 'deep';
        const score = lead.score || 0;
        const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
        
        console.log(`🔄 [LeadRenderer] Building lead details for ${lead.username} (${analysisType} analysis)`);
        
        // Check if we have analysis data from the join
        const hasAnalysisData = analysisData && Object.keys(analysisData).length > 0;
        
        // For deep analysis, try to get data from the joined result
        if (isDeepAnalysis && !hasAnalysisData && lead.lead_analyses && lead.lead_analyses.length > 0) {
            analysisData = lead.lead_analyses[0];
            console.log('📈 [LeadRenderer] Using joined analysis data:', analysisData);
        }
        
        // Enhanced profile picture with fallback - EXACT FROM ORIGINAL
        const profilePicUrl = lead.profile_pic_url;
        const profilePicHtml = profilePicUrl
            ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=150&h=150&fit=cover&mask=circle" 
                   alt="@${lead.username}" 
                   class="profile-picture"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : '';
            
        const fallbackProfileHtml = `
            <div class="profile-picture-fallback" style="display: ${profilePicUrl ? 'none' : 'flex'};">
                ${lead.username.charAt(1).toUpperCase()}
            </div>
        `;
        
        // Base profile section - EXACT FROM ORIGINAL
        const profileSection = `
            <div class="profile-header">
                <div class="profile-image-container">
                    ${profilePicHtml}
                    ${fallbackProfileHtml}
                </div>
                
                <div class="profile-info">
                    <h2>@${lead.username}</h2>
                    <div class="profile-stats">
                        <div class="stat">
                            <span class="stat-value">${this.formatNumber(lead.followers_count || 0)}</span>
                            <span class="stat-label">Followers</span>
                        </div>
                        <div class="stat score-stat">
                            <span class="stat-value ${scoreClass}">${score}%</span>
                            <span class="stat-label">Match Score</span>
                        </div>
                        <div class="stat">
                            <span class="badge ${analysisType === 'deep' ? 'badge-premium' : 'badge-light'}">
                                ${analysisType.toUpperCase()}
                            </span>
                            <span class="stat-label">Analysis</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Content sections based on analysis type
        let contentSections = '';
        
        if (isDeepAnalysis && hasAnalysisData) {
            // Deep analysis content - EXACT FROM ORIGINAL
            contentSections = this.buildDeepAnalysisContent(lead, analysisData);
        } else if (analysisType === 'light') {
            // Light analysis content - EXACT FROM ORIGINAL  
            contentSections = this.buildLightAnalysisContent(lead);
        } else {
            // Fallback for deep analysis without data
            contentSections = this.buildMissingAnalysisContent(lead);
        }
        
        return `
            <div class="lead-details-container">
                ${profileSection}
                ${contentSections}
                
                <!-- Action Buttons -->
                <div class="details-actions">
                    ${analysisType === 'light' ? `
                        <button onclick="dashboard.showAnalysisModal('${lead.username}')" class="btn btn-primary">
                            📈 Upgrade to Deep Analysis
                        </button>
                    ` : ''}
                    
                    <button onclick="dashboard.deleteLead('${lead.id}')" 
                            class="btn btn-danger"
                            onclick="return confirm('Delete this lead?')">
                        🗑️ Delete Lead
                    </button>
                    
                    <button onclick="dashboard.closeModal('leadDetailsModal')" class="btn btn-secondary">
                        ✕ Close
                    </button>
                </div>
            </div>
        `;
    }
    
    buildDeepAnalysisContent(lead, analysisData) {
        // Engagement metrics - EXACT FROM ORIGINAL
        const engagementSection = `
            <div class="analysis-section">
                <h3>📊 Engagement Analysis</h3>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="metric-value">${analysisData.avg_likes || 'N/A'}</span>
                        <span class="metric-label">Avg Likes</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${analysisData.avg_comments || 'N/A'}</span>
                        <span class="metric-label">Avg Comments</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${analysisData.engagement_rate || 'N/A'}%</span>
                        <span class="metric-label">Engagement Rate</span>
                    </div>
                </div>
                
                ${analysisData.engagement_insights ? `
                    <div class="insights-box">
                        <h4>🔍 Key Insights</h4>
                        <p>${analysisData.engagement_insights}</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Selling points - EXACT FROM ORIGINAL
        const sellingPointsSection = analysisData.selling_points ? `
            <div class="analysis-section">
                <h3>💡 Selling Points</h3>
                <div class="selling-points">
                    ${this.formatSellingPoints(analysisData.selling_points)}
                </div>
            </div>
        ` : '';
        
        // Outreach message - EXACT FROM ORIGINAL
        const outreachSection = analysisData.outreach_message ? `
            <div class="analysis-section">
                <h3>📝 Personalized Outreach</h3>
                <div class="outreach-message">
                    <div class="message-content" id="outreach-message-${lead.id}">
                        ${this.formatOutreachMessage(analysisData.outreach_message)}
                    </div>
                    <div class="message-actions">
                        <button onclick="dashboard.copyText('outreach-message-${lead.id}')" class="btn btn-sm">
                            📋 Copy Message
                        </button>
                        <button onclick="dashboard.editMessage('${lead.id}')" class="btn btn-sm">
                            ✏️ Edit Message
                        </button>
                    </div>
                </div>
            </div>
        ` : '';
        
        return engagementSection + sellingPointsSection + outreachSection;
    }
    
    buildLightAnalysisContent(lead) {
        return `
            <div class="analysis-section light-analysis">
                <h3>⚡ Quick Analysis Summary</h3>
                
                ${lead.quick_summary ? `
                    <div class="summary-box">
                        <p>${lead.quick_summary}</p>
                    </div>
                ` : `
                    <div class="summary-box">
                        <p>Basic profile analysis completed. This lead has a ${lead.score}% match score based on follower count and basic metrics.</p>
                    </div>
                `}
                
                <div class="upgrade-prompt">
                    <div class="upgrade-benefits">
                        <h4>🚀 Upgrade to Deep Analysis for:</h4>
                        <ul>
                            <li>✨ Detailed engagement analysis</li>
                            <li>🎯 Personalized outreach messages</li>
                            <li>📊 Advanced audience insights</li>
                            <li>💡 Custom selling points</li>
                        </ul>
                    </div>
                    
                    <button onclick="dashboard.showAnalysisModal('${lead.username}')" class="upgrade-button">
                        📈 Upgrade to Deep Analysis (2 credits)
                    </button>
                </div>
            </div>
        `;
    }
    
    buildMissingAnalysisContent(lead) {
        return `
            <div class="analysis-section error-state">
                <h3>⚠️ Analysis Data Missing</h3>
                <div class="error-message">
                    <p>Deep analysis data is not available for this lead. This may happen if:</p>
                    <ul>
                        <li>The analysis is still processing</li>
                        <li>There was an error during analysis</li>
                        <li>The data was not properly saved</li>
                    </ul>
                    
                    <div class="error-actions">
                        <button onclick="dashboard.showAnalysisModal('${lead.username}')" class="btn btn-primary">
                            🔄 Re-run Analysis
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===============================================================================
    // STATE RENDERERS - EXTRACTED FROM dashboard.js lines 2900-3080
    // ===============================================================================
    
    // EXTRACTED FROM dashboard.js lines 2900-2980
    renderEmptyState(tableBody) {
        const currentFilter = this.stateManager.getState('currentFilter');
        const searchTerm = this.stateManager.getState('searchTerm');
        
        let emptyMessage = '';
        let emptyAction = '';
        
        if (searchTerm) {
            emptyMessage = `No leads found matching "${searchTerm}"`;
            emptyAction = `
                <button onclick="dashboard.searchLeads('')" class="btn btn-primary">
                    Clear Search
                </button>
            `;
        } else if (currentFilter !== 'all') {
            emptyMessage = `No leads match the current filter: ${currentFilter}`;
            emptyAction = `
                <button onclick="dashboard.filterLeads('all')" class="btn btn-primary">
                    Show All Leads
                </button>
            `;
        } else {
            emptyMessage = 'No leads analyzed yet';
            emptyAction = `
                <button onclick="dashboard.showAnalysisModal()" class="btn btn-primary">
                    🔍 Analyze Your First Lead
                </button>
            `;
        }
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 60px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">${emptyMessage}</h3>
                    <p style="margin: 0 0 24px 0; color: var(--text-secondary);">
                        Start analyzing Instagram profiles to build your lead database
                    </p>
                    ${emptyAction}
                </td>
            </tr>
        `;
    }
    
    renderLoadingState(tableBody) {
        const loadingMessage = this.stateManager.getState('loadingMessage') || 'Loading...';
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 60px;">
                    <div style="font-size: 32px; margin-bottom: 16px;">⏳</div>
                    <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">${loadingMessage}</h3>
                    <div class="loading-spinner"></div>
                </td>
            </tr>
        `;
    }
    
    // EXTRACTED FROM dashboard.js lines 3000-3080
    updateLeadCounts(totalCount, selectedCount) {
        // Update total leads count
        const totalCountEl = document.getElementById('total-leads-count');
        if (totalCountEl) {
            totalCountEl.textContent = this.formatNumber(totalCount);
        }
        
        // Update selected count
        const selectedCountEl = document.getElementById('selected-count');
        if (selectedCountEl) {
            selectedCountEl.textContent = selectedCount;
        }
        
        // Update filter results count
        const filterCount = document.getElementById('filter-results-count');
        if (filterCount) {
            filterCount.textContent = `${totalCount} result${totalCount !== 1 ? 's' : ''}`;
        }
        
        console.log(`📊 [LeadRenderer] Updated counts: ${totalCount} total, ${selectedCount} selected`);
    }
    
    updateBulkActionsVisibility(hasSelection) {
        const bulkActions = document.getElementById('bulk-actions');
        const selectAllBtn = document.getElementById('select-all-btn');
        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        
        if (bulkActions) {
            bulkActions.style.display = hasSelection ? 'flex' : 'none';
        }
        
        if (selectAllBtn) {
            selectAllBtn.style.display = hasSelection ? 'none' : 'inline-block';
        }
        
        if (clearSelectionBtn) {
            clearSelectionBtn.style.display = hasSelection ? 'inline-block' : 'none';
        }
    }
    
    // ===============================================================================
    // UTILITY METHODS
    // ===============================================================================
    
    renderScoreBadge(score, scoreClass) {
        return `<span class="score-badge ${scoreClass}" title="Match score: ${score}%">${score}%</span>`;
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    formatSellingPoints(sellingPoints) {
        if (typeof sellingPoints === 'string') {
            // Parse if it's a JSON string
            try {
                sellingPoints = JSON.parse(sellingPoints);
            } catch {
                return `<p>${sellingPoints}</p>`;
            }
        }
        
        if (Array.isArray(sellingPoints)) {
            return sellingPoints.map(point => `<li>💡 ${point}</li>`).join('');
        }
        
        return `<p>${sellingPoints}</p>`;
    }
    
    formatOutreachMessage(message) {
        // Replace newlines with <br> tags and preserve formatting
        return message.replace(/\n/g, '<br>');
    }
    
    // ===============================================================================
    // EVENT HANDLERS
    // ===============================================================================
    
    handleLeadsChanged(leads) {
        console.log('🎨 [LeadRenderer] Leads data changed, re-rendering');
        this.displayLeads(leads);
    }
    
    handleFilteredLeadsChanged(filteredLeads) {
        console.log('🎨 [LeadRenderer] Filtered leads changed, re-rendering');
        this.displayLeads(filteredLeads);
    }
    
    handleSelectionChanged(selectedLeads) {
        console.log('🎨 [LeadRenderer] Selection changed, updating UI');
        
        // Update checkboxes
        document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
            const leadId = checkbox.dataset.leadId;
            const isSelected = selectedLeads.has(leadId);
            checkbox.checked = isSelected;
            
            // Update row styling
            const row = checkbox.closest('.lead-row');
            if (row) {
                row.classList.toggle('selected', isSelected);
            }
        });
        
        // Update bulk actions
        this.updateBulkActionsVisibility(selectedLeads.size > 0);
        this.updateLeadCounts(
            this.stateManager.getState('filteredLeads')?.length || 0,
            selectedLeads.size
        );
    }
    
    // ===============================================================================
    // CACHE MANAGEMENT
    // ===============================================================================
    
    clearRenderCache() {
        this.renderCache.clear();
        this.dateFormatCache.clear();
        console.log('🧹 [LeadRenderer] Render cache cleared');
    }
    
    getCachedElement(key) {
        return this.renderCache.get(key);
    }
    
    setCachedElement(key, element) {
        // Limit cache size
        if (this.renderCache.size > 100) {
            const firstKey = this.renderCache.keys().next().value;
            this.renderCache.delete(firstKey);
        }
        this.renderCache.set(key, element);
    }

// ===============================================================================
    // PROFESSIONAL CRM UI HELPERS
    // ===============================================================================

    updateBulkActionsVisibility(show) {
        const toolbar = document.getElementById('bulk-actions-toolbar');
        const selectionCount = document.getElementById('selection-count');
        const selectedLeads = this.stateManager.getState('selectedLeads');
        
        if (toolbar) {
            if (show && selectedLeads.size > 0) {
                toolbar.classList.remove('hidden');
                if (selectionCount) {
                    selectionCount.textContent = `${selectedLeads.size} selected`;
                }
            } else {
                toolbar.classList.add('hidden');
            }
        }
    }

    updateLeadCounts(visibleCount, totalCount) {
        const resultsCount = document.getElementById('results-count');
        const totalCountEl = document.getElementById('total-count');
        const leadCountDisplay = document.getElementById('lead-count-display');
        
        if (resultsCount) {
            resultsCount.textContent = `Showing ${visibleCount} leads`;
        }
        
        if (totalCountEl) {
            totalCountEl.textContent = `Total: ${totalCount}`;
        }
        
        if (leadCountDisplay) {
            if (totalCount === 0) {
                leadCountDisplay.textContent = 'No leads in pipeline';
            } else if (totalCount === 1) {
                leadCountDisplay.textContent = '1 lead in pipeline';
            } else {
                leadCountDisplay.textContent = `${totalCount} leads in pipeline`;
            }
        }
    }

    renderLoadingState(tableBody) {
        const loadingRows = Array.from({ length: 5 }, (_, i) => `
            <tr class="table-loading">
                <td class="px-6 py-4">
                    <div class="skeleton-row w-4 h-4 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-4">
                        <div class="skeleton-row w-12 h-12 rounded-full"></div>
                        <div class="flex-1">
                            <div class="skeleton-row w-24 h-4 mb-2"></div>
                            <div class="skeleton-row w-16 h-3"></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="skeleton-row w-20 h-6 rounded-md"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="skeleton-row w-16 h-4 mb-1"></div>
                    <div class="skeleton-row w-full h-2 rounded-full"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="skeleton-row w-24 h-6 rounded-md"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="skeleton-row w-16 h-4 mb-1"></div>
                    <div class="skeleton-row w-12 h-3"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="skeleton-row w-8 h-8 rounded"></div>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = loadingRows;
    }

    renderEmptyState(tableBody) {
        tableBody.innerHTML = '';
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
    }
    
    // ===============================================================================
    // CLEANUP
    // ===============================================================================
    
    async cleanup() {
        console.log('🧹 [LeadRenderer] Cleaning up...');
        this.clearRenderCache();
    }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LeadRenderer };
} else {
    window.LeadRenderer = LeadRenderer;
}
