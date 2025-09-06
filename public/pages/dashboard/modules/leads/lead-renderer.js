// ===============================================================================
// ENHANCED LEAD RENDERER - PROFESSIONAL CRM TABLE
// Modern, polished UI for lead intelligence pipeline
// ===============================================================================

class LeadRenderer {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.dateFormatCache = new Map();
        console.log('🎨 [LeadRenderer] Enhanced renderer initialized');
    }

    // ===============================================================================
    // MAIN RENDER FUNCTION
    // ===============================================================================
    
    renderLeads(leads = []) {
        console.log('🎨 [LeadRenderer] Starting enhanced lead rendering...', { 
            leadCount: leads.length 
        });
        
        const tableBody = document.getElementById('leads-table-body');
        const emptyState = document.getElementById('empty-state');
        const leadsContainer = document.querySelector('.leads-table-container');
        
        if (!tableBody) {
            console.error('❌ [LeadRenderer] Table body not found');
            this.createTableStructureIfMissing();
            return;
        }
        
        // Show/hide based on leads
        if (leads.length === 0) {
            tableBody.innerHTML = '';
            if (leadsContainer) leadsContainer.style.display = 'none';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        // Show table, hide empty state
        if (leadsContainer) leadsContainer.style.display = 'block';
        if (emptyState) emptyState.classList.add('hidden');
        
        // Render leads with enhanced styling
        const leadsDisplay = leads.map(lead => this.createEnhancedLeadCard(lead)).join('');
        tableBody.innerHTML = leadsDisplay;
        
        // Update UI states
        this.updateSelectionUI();
        this.updateLeadCounts(leads.length, leads.length);
        
        console.log('✨ [LeadRenderer] Enhanced leads display completed', {
            displayed: leads.length,
            selected: (this.stateManager.getState('selectedLeads') || new Set()).size
        });
    }

    // ===============================================================================
    // ENHANCED LEAD CARD CREATION
    // ===============================================================================
    
    createEnhancedLeadCard(lead) {
        const selectedLeads = this.stateManager.getState('selectedLeads') || new Set();
        const isSelected = selectedLeads.has(lead.id);
        const score = lead.score || 0;
        
        // Enhanced score configuration with modern styling
        const getScoreConfig = (score) => {
            if (score >= 90) return { 
                class: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
                label: 'Excellent', 
                color: 'emerald',
                icon: '🌟',
                gradient: 'from-emerald-500 to-emerald-600',
                barGradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
                borderColor: 'border-emerald-500'
            };
            if (score >= 75) return { 
                class: 'bg-blue-100 text-blue-800 border-blue-200', 
                label: 'Strong', 
                color: 'blue',
                icon: '💪',
                gradient: 'from-blue-500 to-blue-600',
                barGradient: 'from-blue-400 via-blue-500 to-blue-600',
                borderColor: 'border-blue-500'
            };
            if (score >= 60) return { 
                class: 'bg-amber-100 text-amber-800 border-amber-200', 
                label: 'Moderate', 
                color: 'amber',
                icon: '⚡',
                gradient: 'from-amber-500 to-orange-500',
                barGradient: 'from-amber-400 via-amber-500 to-orange-500',
                borderColor: 'border-amber-500'
            };
            return { 
                class: 'bg-slate-100 text-slate-600 border-slate-200', 
                label: 'Low', 
                color: 'slate',
                icon: '📊',
                gradient: 'from-slate-400 to-slate-500',
                barGradient: 'from-slate-300 via-slate-400 to-slate-500',
                borderColor: 'border-slate-400'
            };
        };
        
        const scoreConfig = getScoreConfig(score);
        
        // Enhanced platform configuration
        const getPlatformConfig = (platform) => {
            const configs = {
                instagram: { 
                    icon: '📷', 
                    class: 'bg-gradient-to-br from-pink-50 to-rose-50 text-pink-700 hover:from-pink-100 hover:to-rose-100', 
                    name: 'Instagram',
                    gradient: 'from-pink-400 to-rose-500',
                    iconBg: 'bg-pink-100'
                },
                tiktok: { 
                    icon: '🎵', 
                    class: 'bg-gradient-to-br from-purple-50 to-violet-50 text-purple-700 hover:from-purple-100 hover:to-violet-100', 
                    name: 'TikTok',
                    gradient: 'from-purple-400 to-violet-500',
                    iconBg: 'bg-purple-100'
                },
                youtube: { 
                    icon: '📺', 
                    class: 'bg-gradient-to-br from-red-50 to-orange-50 text-red-700 hover:from-red-100 hover:to-orange-100', 
                    name: 'YouTube',
                    gradient: 'from-red-400 to-orange-500',
                    iconBg: 'bg-red-100'
                },
                twitter: { 
                    icon: '🐦', 
                    class: 'bg-gradient-to-br from-blue-50 to-sky-50 text-blue-700 hover:from-blue-100 hover:to-sky-100', 
                    name: 'Twitter',
                    gradient: 'from-blue-400 to-sky-500',
                    iconBg: 'bg-blue-100'
                }
            };
            return configs[platform] || { 
                icon: '🌐', 
                class: 'bg-gradient-to-br from-slate-50 to-gray-50 text-slate-700 hover:from-slate-100 hover:to-gray-100', 
                name: platform,
                gradient: 'from-slate-400 to-gray-500',
                iconBg: 'bg-slate-100'
            };
        };
        
        const platformConfig = getPlatformConfig(lead.platform);
        
        // Enhanced analysis type badge
        const analysisConfig = lead.analysis_type === 'deep' 
            ? { class: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Deep Analysis', icon: '🔍' }
            : { class: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Light Analysis', icon: '👁️' };

        // Enhanced date formatting
        const dateKey = lead.updated_at || lead.created_at;
        let formattedDate = this.dateFormatCache.get(dateKey);
        if (!formattedDate) {
            formattedDate = this.formatDateProfessional(dateKey);
            this.dateFormatCache.set(dateKey, formattedDate);
        }
        
        // Enhanced profile picture with better fallback
        const profilePicUrl = lead.profile_pic_url;
        const username = lead.username || 'unknown';
        const fullName = lead.full_name || '';
        
        const profilePicHtml = profilePicUrl
            ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=64&h=64&fit=cover&mask=circle" 
                   alt="@${username}" 
                   class="w-12 h-12 rounded-full border-2 border-slate-200 object-cover shadow-sm hover:scale-105 transition-transform duration-200"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : '';
            
        const fallbackHtml = `
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg border-2 border-slate-200 shadow-sm hover:scale-105 transition-transform duration-200 ${profilePicUrl ? 'hidden' : 'flex'}">
                ${username.charAt(0).toUpperCase()}
            </div>
        `;

        return `
            <tr class="group hover:bg-slate-50/50 transition-all duration-300 ${isSelected ? 'bg-blue-50/50 border-blue-200' : ''}" 
                data-lead-id="${lead.id}">
                
                <!-- Enhanced Selection Checkbox -->
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <input type="checkbox" 
                               class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-offset-0 transition-all duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
                               ${isSelected ? 'checked' : ''}
                               onchange="dashboard.toggleLeadSelection('${lead.id}', this.checked)">
                    </div>
                </td>
                
                <!-- Enhanced Lead Profile -->
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0 relative">
                            ${profilePicHtml}
                            ${fallbackHtml}
                            ${lead.is_verified ? 
                                '<div class="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg></div>' : ''
                            }
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center space-x-2 mb-1">
                                <p class="text-sm font-semibold text-slate-900 truncate">@${username}</p>
                                ${lead.account_type === 'business' ? 
                                    '<span class="inline-flex items-center px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-md border border-orange-200 flex-shrink-0">Business</span>' : ''}
                            </div>
                            ${fullName ? `<div class="text-sm text-slate-600 truncate mb-0.5">${fullName}</div>` : ''}
                            ${lead.followers_count ? `<div class="text-xs text-slate-500">${this.formatNumber(lead.followers_count)} followers</div>` : ''}
                        </div>
                    </div>
                </td>
                
                <!-- Enhanced Platform -->
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center">
                        <div class="relative group platform-badge-glow">
                            <div class="absolute -inset-0.5 bg-gradient-to-r ${platformConfig.gradient} rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                            <div class="relative inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold ${platformConfig.class} shadow-sm hover:shadow-md transition-all duration-200 border-0">
                                <div class="flex items-center space-x-2">
                                    <div class="w-5 h-5 flex items-center justify-center ${platformConfig.iconBg} rounded-full">
                                        <span class="text-xs">${platformConfig.icon}</span>
                                    </div>
                                    <span>${platformConfig.name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
                
                <!-- Enhanced Intelligence Score -->
                <td class="px-6 py-4">
                    <div class="relative">
                        <!-- Score value with modern styling -->
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-baseline space-x-1">
                                <span class="text-2xl font-bold text-slate-900">${score}</span>
                                <span class="text-sm text-slate-500 font-medium">/100</span>
                            </div>
                            <div class="flex items-center space-x-1">
                                ${scoreConfig.icon ? `<span class="text-sm">${scoreConfig.icon}</span>` : ''}
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${scoreConfig.gradient} text-white shadow-sm">
                                    ${scoreConfig.label}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Enhanced progress bar with glow effect -->
                        <div class="relative">
                            <div class="w-full bg-slate-100 rounded-full h-3 shadow-inner">
                                <div class="bg-gradient-to-r ${scoreConfig.barGradient} h-3 rounded-full transition-all duration-500 ease-out shadow-sm relative overflow-hidden" 
                                     style="width: ${score}%">
                                    <!-- Animated shine effect -->
                                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                                </div>
                            </div>
                            <!-- Score indicator dot -->
                            <div class="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 ${scoreConfig.borderColor} transition-all duration-300"
                                 style="left: calc(${score}% - 8px)"></div>
                        </div>
                    </div>
                </td>
                
                <!-- Enhanced Analysis Type -->
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium border ${analysisConfig.class}">
                        <span class="mr-1">${analysisConfig.icon}</span>
                        ${analysisConfig.label}
                    </span>
                </td>
                
                <!-- Enhanced Date -->
                <td class="px-6 py-4">
                    <div class="text-sm text-slate-900">${formattedDate.date}</div>
                    <div class="text-xs text-slate-500">${formattedDate.time}</div>
                </td>
                
                <!-- Enhanced Actions -->
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center space-x-3">
                        <!-- Primary Action: Enhanced Analysis Button -->
                        <button onclick="dashboard.openLeadDetails('${lead.id}')" 
                                class="group relative inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                title="View detailed analysis">
                            <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                            <svg class="relative w-4 h-4 mr-2 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                            <span class="relative">Analysis</span>
                        </button>
                        
                        <!-- Modern Action Menu -->
                        <div class="relative">
                            <button onclick="dashboard.toggleActionMenu('${lead.id}', this)" 
                                    class="group p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    title="More actions">
                                <svg class="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                            </button>
                            
                            <!-- Enhanced Action Menu -->
                            <div class="action-menu absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200/60 z-20 opacity-0 scale-95 transform transition-all duration-300 origin-top-right backdrop-blur-sm"
                                 id="action-menu-${lead.id}">
                                <div class="py-2">
                                    <button onclick="dashboard.exportLead('${lead.id}')" 
                                            class="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                        <svg class="w-4 h-4 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        Export Lead
                                    </button>
                                    <button onclick="dashboard.duplicateLead('${lead.id}')" 
                                            class="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                        <svg class="w-4 h-4 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                        Duplicate Analysis
                                    </button>
                                    <div class="border-t border-slate-200 my-1"></div>
                                    <button onclick="dashboard.deleteLead('${lead.id}')" 
                                            class="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        
        console.log('🔧 [LeadRenderer] Creating enhanced table structure...');
        
        const tableHTML = `
            <table class="leads-table w-full">
                <thead class="bg-gradient-to-r from-slate-50 to-slate-100/80 backdrop-blur-sm sticky top-0 z-10">
                    <tr class="border-b border-slate-200/60">
                        <th class="px-6 py-4 text-left w-12">
                            <input type="checkbox" 
                                   id="select-all-checkbox" 
                                   onchange="dashboard.toggleAllLeads(this)"
                                   class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                        </th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lead Profile</th>
                        <th class="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Platform</th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Intelligence Score</th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Analysis Type</th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date Added</th>
                        <th class="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody id="leads-table-body" class="divide-y divide-slate-200/60 bg-white">
                    <!-- Leads will be populated by JavaScript -->
                </tbody>
            </table>
        `;
        
        leadsContainer.innerHTML = tableHTML;
        console.log('✅ [LeadRenderer] Enhanced table structure created');
    }

    // ===============================================================================
    // UI HELPERS
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
                    <div class="w-full h-8 bg-slate-200 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="w-16 h-6 bg-slate-200 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="w-16 h-4 bg-slate-200 rounded"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="w-20 h-8 bg-slate-200 rounded"></div>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = loadingRows;
        console.log('🔄 [LeadRenderer] Loading state displayed');
    }

    // ===============================================================================
    // UTILITY FUNCTIONS
    // ===============================================================================

    formatDateProfessional(dateString) {
        if (!dateString) return { date: 'Unknown', time: '' };
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            
            // Format date
            let dateFormatted;
            if (diffDays === 0) {
                dateFormatted = 'Today';
            } else if (diffDays === 1) {
                dateFormatted = 'Yesterday';
            } else if (diffDays < 7) {
                dateFormatted = `${diffDays} days ago`;
            } else {
                dateFormatted = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            }
            
            // Format time
            let timeFormatted;
            if (diffMinutes < 60) {
                timeFormatted = `${diffMinutes}m ago`;
            } else if (diffHours < 24) {
                timeFormatted = `${diffHours}h ago`;
            } else {
                timeFormatted = date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            }
            
            return { date: dateFormatted, time: timeFormatted };
        } catch (error) {
            console.warn('⚠️ [LeadRenderer] Date formatting error:', error);
            return { date: 'Invalid date', time: '' };
        }
    }

    formatNumber(num) {
        if (!num) return '0';
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // ===============================================================================
    // SEARCH AND FILTER FUNCTIONALITY
    // ===============================================================================

    filterLeads(leads, searchTerm, platformFilter, scoreFilter) {
        if (!leads || leads.length === 0) return [];
        
        let filteredLeads = [...leads];
        
        // Search filter
        if (searchTerm && searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filteredLeads = filteredLeads.filter(lead => {
                const username = (lead.username || '').toLowerCase();
                const fullName = (lead.full_name || '').toLowerCase();
                const platform = (lead.platform || '').toLowerCase();
                
                return username.includes(term) || 
                       fullName.includes(term) || 
                       platform.includes(term);
            });
        }
        
        // Platform filter
        if (platformFilter && platformFilter !== 'all') {
            filteredLeads = filteredLeads.filter(lead => 
                lead.platform === platformFilter
            );
        }
        
        // Score filter
        if (scoreFilter && scoreFilter !== 'all') {
            switch (scoreFilter) {
                case 'high-score':
                    filteredLeads = filteredLeads.filter(lead => (lead.score || 0) >= 80);
                    break;
                case 'medium-score':
                    filteredLeads = filteredLeads.filter(lead => {
                        const score = lead.score || 0;
                        return score >= 60 && score < 80;
                    });
                    break;
                case 'low-score':
                    filteredLeads = filteredLeads.filter(lead => (lead.score || 0) < 60);
                    break;
            }
        }
        
        return filteredLeads;
    }

    sortLeads(leads, sortBy, sortOrder = 'desc') {
        if (!leads || leads.length === 0) return [];
        
        const sortedLeads = [...leads];
        
        sortedLeads.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'username':
                    aValue = (a.username || '').toLowerCase();
                    bValue = (b.username || '').toLowerCase();
                    break;
                case 'platform':
                    aValue = a.platform || '';
                    bValue = b.platform || '';
                    break;
                case 'score':
                    aValue = a.score || 0;
                    bValue = b.score || 0;
                    break;
                case 'date':
                    aValue = new Date(a.updated_at || a.created_at);
                    bValue = new Date(b.updated_at || b.created_at);
                    break;
                case 'followers':
                    aValue = a.followers_count || 0;
                    bValue = b.followers_count || 0;
                    break;
                default:
                    aValue = new Date(a.updated_at || a.created_at);
                    bValue = new Date(b.updated_at || b.created_at);
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sortedLeads;
    }

    // ===============================================================================
    // ADVANCED UI METHODS
    // ===============================================================================

    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm || !text) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>');
    }

    getLeadCardClasses(lead, isSelected) {
        const baseClasses = 'group hover:bg-slate-50/50 transition-all duration-300';
        const selectedClasses = 'bg-blue-50/50 border-blue-200';
        const scoreClasses = this.getRowScoreClasses(lead.score);
        
        return `${baseClasses} ${isSelected ? selectedClasses : ''} ${scoreClasses}`;
    }

    getRowScoreClasses(score) {
        if (score >= 90) return 'border-l-4 border-emerald-500';
        if (score >= 75) return 'border-l-4 border-blue-500';
        if (score >= 60) return 'border-l-4 border-amber-500';
        return 'border-l-4 border-slate-300';
    }

    // ===============================================================================
    // BULK OPERATIONS
    // ===============================================================================

    selectAllVisibleLeads() {
        const visibleRows = document.querySelectorAll('#leads-table-body tr[data-lead-id]');
        const selectedLeads = new Set();
        
        visibleRows.forEach(row => {
            const leadId = row.dataset.leadId;
            if (leadId) {
                selectedLeads.add(leadId);
                const checkbox = row.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.checked = true;
            }
        });
        
        this.stateManager.setState('selectedLeads', selectedLeads);
        this.updateSelectionUI();
        this.updateBulkActionsVisibility(true);
        
        console.log('✅ [LeadRenderer] All visible leads selected:', selectedLeads.size);
    }

    clearAllSelections() {
        const selectedLeads = new Set();
        this.stateManager.setState('selectedLeads', selectedLeads);
        
        // Update all checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.updateBulkActionsVisibility(false);
        console.log('🧹 [LeadRenderer] All selections cleared');
    }

    getSelectedLeadsData() {
        const selectedLeads = this.stateManager.getState('selectedLeads') || new Set();
        const allLeads = this.stateManager.getState('leads') || [];
        
        return allLeads.filter(lead => selectedLeads.has(lead.id));
    }

    // ===============================================================================
    // PERFORMANCE OPTIMIZATIONS
    // ===============================================================================

    createVirtualizedRenderer(leads, containerHeight = 600, rowHeight = 80) {
        // Basic virtualization for large datasets
        const visibleRows = Math.ceil(containerHeight / rowHeight);
        const buffer = 5; // Extra rows for smooth scrolling
        
        return {
            totalRows: leads.length,
            visibleRows: visibleRows + buffer,
            rowHeight,
            
            getVisibleRange(scrollTop) {
                const startIndex = Math.floor(scrollTop / rowHeight);
                const endIndex = Math.min(startIndex + visibleRows + buffer, leads.length);
                
                return {
                    start: Math.max(0, startIndex - buffer),
                    end: endIndex,
                    leads: leads.slice(Math.max(0, startIndex - buffer), endIndex)
                };
            }
        };
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ===============================================================================
    // ERROR HANDLING AND RECOVERY
    // ===============================================================================

    handleRenderError(error, leads) {
        console.error('❌ [LeadRenderer] Render error:', error);
        
        // Attempt graceful fallback
        const tableBody = document.getElementById('leads-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center space-y-3">
                            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-slate-900">Unable to display leads</h3>
                                <p class="text-sm text-slate-600 mt-1">There was an error rendering the lead data. Please try refreshing.</p>
                            </div>
                            <button onclick="dashboard.refreshLeads()" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                Refresh Leads
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    // ===============================================================================
    // ACCESSIBILITY ENHANCEMENTS
    // ===============================================================================

    addAccessibilityAttributes() {
        // Add ARIA labels and roles for screen readers
        const table = document.querySelector('.leads-table');
        if (table) {
            table.setAttribute('role', 'table');
            table.setAttribute('aria-label', 'Lead intelligence pipeline data');
        }

        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('.leads-table')) {
                this.handleKeyboardNavigation(e);
            }
        });
    }

    handleKeyboardNavigation(event) {
        const { key, target } = event;
        const currentRow = target.closest('tr');
        
        if (!currentRow) return;
        
        switch (key) {
            case 'ArrowDown':
                event.preventDefault();
                const nextRow = currentRow.nextElementSibling;
                if (nextRow) {
                    const firstInput = nextRow.querySelector('input, button');
                    if (firstInput) firstInput.focus();
                }
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                const prevRow = currentRow.previousElementSibling;
                if (prevRow) {
                    const firstInput = prevRow.querySelector('input, button');
                    if (firstInput) firstInput.focus();
                }
                break;
                
            case 'Space':
                if (target.type === 'checkbox') {
                    event.preventDefault();
                    target.checked = !target.checked;
                    target.dispatchEvent(new Event('change'));
                }
                break;
        }
    }

    // ===============================================================================
    // CLEANUP AND INITIALIZATION
    // ===============================================================================

    destroy() {
        // Clear caches
        this.dateFormatCache.clear();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardNavigation);
        
        console.log('🧹 [LeadRenderer] Renderer destroyed and cleaned up');
    }

    init() {
        this.addAccessibilityAttributes();
        console.log('🚀 [LeadRenderer] Enhanced renderer initialized');
    }
}

// ===============================================================================
// EXPORT AND INITIALIZATION
// ===============================================================================

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    window.LeadRenderer = LeadRenderer;
    console.log('✅ [LeadRenderer] Enhanced renderer class available globally');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadRenderer;
}
