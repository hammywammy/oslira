// =============================================================================
// LEAD-RENDERER.JS - V4 COMPATIBLE VERSION - COMPLETE
// Professional lead rendering with Tailwind V4 gradient syntax
// =============================================================================

class LeadRenderer {
    constructor() {
        this.dateFormatCache = new Map();
        this.initialized = false;
    }

    // Enhanced platform configuration with V4 gradient syntax
    getPlatformConfig(platform) {
        const configs = {
            instagram: { 
                icon: '📷', 
                class: 'bg-linear-to-br from-pink-50 to-rose-50 text-pink-700 hover:from-pink-100 hover:to-rose-100', 
                name: 'Instagram',
                gradient: 'from-pink-400 to-rose-500',
                iconBg: 'bg-pink-100'
            },
            tiktok: { 
                icon: '🎵', 
                class: 'bg-linear-to-br from-purple-50 to-violet-50 text-purple-700 hover:from-purple-100 hover:to-violet-100', 
                name: 'TikTok',
                gradient: 'from-purple-400 to-violet-500',
                iconBg: 'bg-purple-100'
            },
            youtube: { 
                icon: '📺', 
                class: 'bg-linear-to-br from-red-50 to-orange-50 text-red-700 hover:from-red-100 hover:to-orange-100', 
                name: 'YouTube',
                gradient: 'from-red-400 to-orange-500',
                iconBg: 'bg-red-100'
            },
            twitter: { 
                icon: '🐦', 
                class: 'bg-linear-to-br from-blue-50 to-sky-50 text-blue-700 hover:from-blue-100 hover:to-sky-100', 
                name: 'Twitter',
                gradient: 'from-blue-400 to-sky-500',
                iconBg: 'bg-blue-100'
            }
        };
        return configs[platform] || { 
            icon: '🌐', 
            class: 'bg-linear-to-br from-slate-50 to-gray-50 text-slate-700 hover:from-slate-100 hover:to-gray-100', 
            name: platform || 'Unknown',
            gradient: 'from-slate-400 to-gray-500',
            iconBg: 'bg-slate-100'
        };
    }

    // Enhanced analysis type configuration with V4 gradient syntax
    getAnalysisConfig(analysisType) {
        return analysisType === 'deep' 
            ? { 
                class: 'bg-linear-to-br from-purple-50 to-violet-50 text-purple-700 hover:from-purple-100 hover:to-violet-100', 
                label: 'Deep Analysis', 
                icon: '🔍',
                gradient: 'from-purple-400 to-violet-500',
                iconBg: 'bg-purple-100'
            }
            : { 
                class: 'bg-linear-to-br from-slate-50 to-gray-50 text-slate-600 hover:from-slate-100 hover:to-gray-100', 
                label: 'Light Analysis', 
                icon: '👁️',
                gradient: 'from-slate-400 to-gray-500',
                iconBg: 'bg-slate-100'
            };
    }

    // Professional date formatting
    formatDateProfessional(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('Date formatting error:', error);
            return 'Unknown';
        }
    }

    // Score-based row accent color
    getRowAccentColor(score) {
        if (score >= 80) return 'border-emerald-500';
        if (score >= 60) return 'border-blue-500';
        if (score >= 40) return 'border-amber-500';
        return 'border-slate-300';
    }

    // Score progress bar color
    getScoreBarColor(score) {
        if (score >= 80) return 'bg-linear-to-r from-emerald-400 to-emerald-600';
        if (score >= 60) return 'bg-linear-to-r from-blue-400 to-blue-600';
        if (score >= 40) return 'bg-linear-to-r from-amber-400 to-amber-600';
        return 'bg-linear-to-r from-slate-300 to-slate-500';
    }

    // Main render method for lead rows
    renderLeadRow(lead, isSelected = false) {
        if (!lead) {
            console.warn('Lead data is null or undefined');
            return '<tr><td colspan="6" class="text-center py-4 text-slate-500">Invalid lead data</td></tr>';
        }

        const platformConfig = this.getPlatformConfig(lead.platform);
        const analysisConfig = this.getAnalysisConfig(lead.analysis_type);
        
        // Enhanced date formatting with caching
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
        const score = lead.score || 0;
        
        const profilePicHtml = profilePicUrl
            ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(profilePicUrl)}&w=64&h=64&fit=cover&mask=circle" 
                   alt="@${username}" 
                   class="w-12 h-12 rounded-full border-2 border-slate-200 object-cover shadow-sm hover:scale-105 transition-transform duration-200"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : '';
            
        const fallbackHtml = `
            <div class="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg border-2 border-slate-200 shadow-sm hover:scale-105 transition-transform duration-200 ${profilePicUrl ? 'hidden' : 'flex'}">
                ${username.charAt(0).toUpperCase()}
            </div>
        `;

        return `
            <tr class="table-row relative hover:bg-purple-50 hover:shadow-md transition-all duration-200 ${isSelected ? 'bg-blue-50/50' : ''} border-l-4 ${this.getRowAccentColor(score)} odd:bg-slate-25/20" 
                data-lead-id="${lead.id}">
            
                <!-- Hidden selection checkbox that appears on hover at far left -->
                <div class="absolute left-1 top-1/2 transform -translate-y-1/2 opacity-0 transition-all duration-200 z-20 checkbox-container">
                    <input type="checkbox" 
                           class="lead-checkbox w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 bg-white shadow-md"
                           data-lead-id="${lead.id}"
                           ${isSelected ? 'checked' : ''}>
                </div>

                <!-- Profile Column -->
                <td class="py-4 pl-12 pr-6">
                    <div class="flex items-center gap-3">
                        <div class="relative flex-shrink-0">
                            ${profilePicHtml}
                            ${fallbackHtml}
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-semibold text-slate-900 truncate">
                                ${fullName || `@${username}`}
                            </p>
                            <p class="text-xs text-slate-500 truncate">
                                @${username}
                            </p>
                        </div>
                    </div>
                </td>

                <!-- Platform Column -->
                <td class="py-4 px-6">
                    <div class="platform-group">
                        <span class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 platform-badge-glow ${platformConfig.class}">
                            <span class="text-base leading-none">${platformConfig.icon}</span>
                            <span class="font-medium">${platformConfig.name}</span>
                        </span>
                    </div>
                </td>

                <!-- Analysis Type Column -->
                <td class="py-4 px-6">
                    <div class="analysis-group">
                        <span class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${analysisConfig.class}">
                            <span class="text-base leading-none">${analysisConfig.icon}</span>
                            <span class="font-medium">${analysisConfig.label}</span>
                        </span>
                    </div>
                </td>

                <!-- Score Column -->
                <td class="py-4 px-6">
                    <div class="flex items-center gap-2">
                        <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-500 ${this.getScoreBarColor(score)}" 
                                 style="width: ${Math.max(score, 5)}%"></div>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 min-w-[3rem] text-right">
                            ${score}%
                        </span>
                    </div>
                </td>

                <!-- Date Column -->
                <td class="py-4 px-6">
                    <span class="text-sm text-slate-600 font-medium">
                        ${formattedDate}
                    </span>
                </td>

                <!-- Actions Column -->
                <td class="py-4 px-6">
                    <div class="flex items-center justify-end gap-2">
                        <button class="action-button p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
                                onclick="this.showLeadActions('${lead.id}')"
                                title="More actions">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01"></path>
                            </svg>
                        </button>
                        
                        <button class="action-button px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-200"
                                onclick="this.viewLeadDetails('${lead.id}')"
                                title="View details">
                            View
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Render multiple leads
    renderLeads(leads, selectedLeadIds = new Set()) {
        if (!Array.isArray(leads)) {
            console.warn('Leads data is not an array:', leads);
            return '<tr><td colspan="6" class="text-center py-8 text-slate-500">No leads data available</td></tr>';
        }

        if (leads.length === 0) {
            return `
                <tr>
                    <td colspan="6" class="text-center py-12">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                                </svg>
                            </div>
                            <h3 class="empty-state-title">No leads found</h3>
                            <p class="empty-state-description">
                                Start by running an analysis or import some leads to get started.
                            </p>
                        </div>
                    </td>
                </tr>
            `;
        }

        return leads.map(lead => {
            const isSelected = selectedLeadIds.has(lead.id);
            return this.renderLeadRow(lead, isSelected);
        }).join('');
    }

    // Loading skeleton for leads table
    renderLoadingSkeleton(count = 5) {
        const skeletonRows = Array.from({ length: count }, (_, index) => `
            <tr class="skeleton-loader border-b border-slate-200">
                <td class="py-4 pl-12 pr-6">
                    <div class="flex items-center gap-3">
                        <div class="skeleton-avatar"></div>
                        <div class="flex-1 space-y-2">
                            <div class="skeleton-text h-4 w-32"></div>
                            <div class="skeleton-text-sm h-3 w-24"></div>
                        </div>
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="skeleton-badge"></div>
                </td>
                <td class="py-4 px-6">
                    <div class="skeleton-badge"></div>
                </td>
                <td class="py-4 px-6">
                    <div class="flex items-center gap-2">
                        <div class="flex-1 h-2 bg-slate-200 rounded-full"></div>
                        <div class="skeleton-text h-4 w-12"></div>
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="skeleton-text h-4 w-20"></div>
                </td>
                <td class="py-4 px-6">
                    <div class="flex justify-end gap-2">
                        <div class="skeleton-button"></div>
                    </div>
                </td>
            </tr>
        `).join('');

        return skeletonRows;
    }

    // Action handlers (to be implemented by parent component)
    showLeadActions(leadId) {
        if (window.leadsManager && typeof window.leadsManager.showLeadActions === 'function') {
            window.leadsManager.showLeadActions(leadId);
        } else {
            console.warn('Lead actions handler not found');
        }
    }

    viewLeadDetails(leadId) {
        if (window.leadsManager && typeof window.leadsManager.viewLeadDetails === 'function') {
            window.leadsManager.viewLeadDetails(leadId);
        } else {
            console.warn('Lead details handler not found');
        }
    }

    // Clear cache for memory management
    clearCache() {
        this.dateFormatCache.clear();
    }

    // Initialize renderer
    initialize() {
        if (this.initialized) return;
        
        console.log('🎨 [LeadRenderer] Initializing V4-compatible lead renderer...');
        this.initialized = true;
        
        // Set up periodic cache clearing
        setInterval(() => {
            if (this.dateFormatCache.size > 100) {
                this.clearCache();
                console.log('🧹 [LeadRenderer] Cache cleared for memory optimization');
            }
        }, 300000); // Clear every 5 minutes if cache is large
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadRenderer;
} else if (typeof window !== 'undefined') {
    window.LeadRenderer = LeadRenderer;
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    window.leadRenderer = new LeadRenderer();
    window.leadRenderer.initialize();
}
