//public/pages/dashboard/modules/leads/lead-renderer.js

/**
 * OSLIRA LEAD RENDERER MODULE - PROFESSIONAL CRM VERSION
 * Handles all lead display, card rendering, and UI presentation
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
    // EVENT HANDLERS
    // ===============================================================================
    
    handleLeadsChanged(leads) {
        console.log('🔄 [LeadRenderer] Leads data changed, re-rendering');
        this.displayLeads(leads);
    }
    
    handleFilteredLeadsChanged(filteredLeads) {
        console.log('🔄 [LeadRenderer] Filtered leads changed, re-rendering');
        this.displayLeads(filteredLeads);
    }
    
    handleSelectionChanged(selectedLeads) {
        console.log('🔄 [LeadRenderer] Selection changed, updating UI');
        this.updateBulkActionsVisibility(selectedLeads.size > 0);
        this.updateSelectionUI();
    }
    
    // ===============================================================================
    // MAIN DISPLAY FUNCTION
    // ===============================================================================
    
    displayLeads(leads = null) {
        const leadsToDisplay = leads || this.stateManager.getState('filteredLeads') || this.stateManager.getState('leads');
        const tableBody = document.getElementById('leads-table-body');
        const selectedLeads = this.stateManager.getState('selectedLeads') || new Set();
        
        if (!tableBody) {
            console.warn('⚠️ [LeadRenderer] Table body element not found');
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
    // PROFESSIONAL CRM LEAD CARD CREATION
    // ===============================================================================
    
    createLeadCard(lead) {
        const selectedLeads = this.stateManager.getState('selectedLeads') || new Set();
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
                
                <!-- Selection Checkbox - Only visible on hover or when selected -->
                <td class="px-6 py-4">
                    <input type="checkbox" 
                           class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-offset-0 transition-all duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
                           ${isSelected ? 'checked' : ''}
                           onchange="dashboard.toggleLeadSelection('${lead.id}', this.checked)">
                </td>
                
<!-- Lead Profile - Improved styling and spacing -->
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0 relative">
                            ${profilePicHtml}
                            ${fallbackHtml}
                            ${lead.is_verified ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></div>' : ''}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center space-x-2 mb-1">
                                <button onclick="dashboard.openProfile('${lead.profile_url || `https://instagram.com/${username}`}')" 
                                        class="font-semibold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer text-left truncate">
                                    @${username}
                                </button>
                                ${lead.is_business_account ? '<span class="inline-flex items-center px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-md border border-orange-200 flex-shrink-0">Business</span>' : ''}
                            </div>
                            ${fullName ? `<div class="text-sm text-slate-600 truncate mb-0.5">${fullName}</div>` : ''}
                            ${lead.followers_count ? `<div class="text-xs text-slate-500">${this.formatNumber(lead.followers_count)} followers</div>` : ''}
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
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center space-x-2">
                        <!-- Primary Action: View Analysis -->
                        <button onclick="dashboard.openLeadDetails('${lead.id}')" 
                                class="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                                title="View detailed analysis">
                            <svg class="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                            Analysis
                        </button>
                        
                        <!-- Secondary Actions Menu -->
                        <div class="relative inline-block text-left">
                            <button onclick="dashboard.toggleActionMenu('${lead.id}', this)" 
                                    class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                    title="More actions">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                </svg>
                            </button>
                            
                            <!-- Action Menu (Hidden by default) -->
                            <div class="action-menu absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-20 opacity-0 scale-95 transform transition-all duration-200 origin-top-right pointer-events-none">
                                <div class="py-1">
                                    <button onclick="dashboard.copyUsername('${username}')" 
                                            class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                        Copy Username
                                    </button>
                                    <button onclick="dashboard.openProfile('${lead.profile_url || `https://instagram.com/${username}`}')" 
                                            class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"/>
                                        </svg>
                                        View Profile
                                    </button>
                                    <button onclick="dashboard.exportLead('${lead.id}')" 
                                            class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        Export Data
                                    </button>
                                    <div class="border-t border-slate-200 my-1"></div>
                                    <button onclick="dashboard.deleteLead('${lead.id}')" 
                                            class="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
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
    // PROFESSIONAL CRM UI HELPERS
    // ===============================================================================

    updateBulkActionsVisibility(show) {
        const toolbar = document.getElementById('bulk-actions-toolbar');
        const selectionCount = document.getElementById('selection-count');
        const selectedLeads = this.stateManager.getState('selectedLeads') || new Set();
        
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
        
        // Get actual total from state - FIXED count logic
        const allLeads = this.stateManager.getState('leads') || [];
        const actualTotal = allLeads.length;
        
        if (resultsCount) {
            resultsCount.textContent = `Showing ${visibleCount} leads`;
        }
        
        if (totalCountEl) {
            totalCountEl.textContent = `Total: ${actualTotal}`;
        }
        
        if (leadCountDisplay) {
            if (actualTotal === 0) {
                leadCountDisplay.textContent = 'No leads in pipeline';
            } else if (actualTotal === 1) {
                leadCountDisplay.textContent = '1 lead in pipeline';
            } else {
                leadCountDisplay.textContent = `${actualTotal} leads in pipeline`;
            }
        }
    }

    updateSelectionUI() {
        const selectedLeads = this.stateManager.getState('selectedLeads') || new Set();
        const checkboxes = document.querySelectorAll('.lead-checkbox');
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        
        // Update individual checkboxes
        checkboxes.forEach(checkbox => {
            const leadId = checkbox.dataset.leadId;
            checkbox.checked = selectedLeads.has(leadId);
        });
        
        // Update select all checkbox
        if (selectAllCheckbox) {
            const totalLeads = checkboxes.length;
            if (totalLeads === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (selectedLeads.size === totalLeads) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else if (selectedLeads.size > 0) {
                selectAllCheckbox.indeterminate = true;
                selectAllCheckbox.checked = false;
            } else {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            }
        }
    }

    renderLoadingState(tableBody) {
        const loadingRows = Array.from({ length: 5 }, (_, i) => `
            <tr class="animate-pulse">
                <td class="px-6 py-4">
                    <div class="w-4 h-4 bg-slate-200 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-slate-200 rounded-full"></div>
                        <div class="flex-1">
                            <div class="w-24 h-4 bg-slate-200 rounded mb-2"></div>
                            <div class="w-16 h-3 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="w-20 h-6 bg-slate-200 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="w-16 h-4 bg-slate-200 rounded mb-1"></div>
                    <div class="w-full h-2 bg-slate-200 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="w-24 h-6 bg-slate-200 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="w-16 h-4 bg-slate-200 rounded mb-1"></div>
                    <div class="w-12 h-3 bg-slate-200 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="w-8 h-8 bg-slate-200 rounded"></div>
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
    // UTILITY METHODS
    // ===============================================================================

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

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

// Export the class
window.LeadRenderer = LeadRenderer;
