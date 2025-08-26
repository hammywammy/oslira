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
        const tableBody = document.getElementById('activity-table');
        const selectedLeads = this.stateManager.getState('selectedLeads');
        
        if (!tableBody) {
            console.warn('⚠️ [LeadRenderer] Table body element not found');
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
    // LEAD CARD CREATION - EXTRACTED FROM dashboard.js lines 2650-2850
    // ===============================================================================
    
    createLeadCard(lead) {
        const selectedLeads = this.stateManager.getState('selectedLeads');
        const isSelected = selectedLeads.has(lead.id);
        const score = lead.score || 0;
        const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
        
        // Use cached date if available
        const dateKey = lead.created_at;
        let formattedDate = this.dateFormatCache.get(dateKey);
        if (!formattedDate) {
            formattedDate = this.formatDate(lead.created_at);
            this.dateFormatCache.set(dateKey, formattedDate);
        }
        
        // Enhanced profile picture with fallback - EXACT FROM ORIGINAL
        const profilePicUrl = lead.profile_pic_url;
        const profilePicHtml = profilePicUrl
            ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=64&h=64&fit=cover&mask=circle" 
                   alt="@${lead.username}" 
                   style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #e5e7eb; object-fit: cover;"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : '';
            
        const fallbackHtml = `
            <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: ${profilePicUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; border: 2px solid #e5e7eb;">
                ${lead.username.charAt(1).toUpperCase()}
            </div>
        `;
        
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
