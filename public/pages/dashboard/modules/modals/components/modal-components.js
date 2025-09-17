// ===============================================================================
// MODAL COMPONENTS SYSTEM - Modular Analysis Modal Builder
// ===============================================================================

class ModalComponents {
    constructor() {
        this.components = new Map();
        this.registerDefaultComponents();
    }

    // ===============================================================================
    // CORE COMPONENT REGISTRATION
    // ===============================================================================
    
    registerComponent(name, component) {
        this.components.set(name, component);
    }

    getComponent(name) {
        return this.components.get(name);
    }

    // ===============================================================================
    // DEFAULT COMPONENTS LIBRARY
    // ===============================================================================
    
    registerDefaultComponents() {
        // Universal Header - Same for all analysis types
        this.registerComponent('header', {
            render: (lead, analysisData) => `
                <div class="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                    <div class="flex items-center space-x-4">
                        <img src="${this.getProfileImageUrl(lead)}" alt="@${lead.username}" 
                             class="w-20 h-20 rounded-full border-4 border-white/20 shadow-lg">
                        <div class="flex-1">
                            <h2 class="text-2xl font-bold">@${lead.username}</h2>
                            <p class="text-white/90">${lead.display_name || ''}</p>
                            <div class="flex items-center space-x-4 mt-2">
                                <span class="px-3 py-1 bg-white/20 rounded-full text-sm">
                                    ${(lead.follower_count || 0).toLocaleString()} followers
                                </span>
                                <span class="px-3 py-1 bg-white/20 rounded-full text-sm">
                                    Score: ${lead.overall_score || 0}/100
                                </span>
                                <span class="px-3 py-1 bg-white/20 rounded-full text-sm analysis-type-badge">
                                    ${this.getAnalysisTypeLabel(lead.analysis_type)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `
        });

        // Universal Summary - Consistent styling across types
        this.registerComponent('summary', {
            render: (lead, analysisData) => `
                <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <span class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm mr-2">📋</span>
                        Analysis Summary
                    </h3>
                    <p class="text-gray-700 leading-relaxed">${this.getSummaryText(lead, analysisData)}</p>
                </div>
            `
        });

        // Selling Points - Reusable across deep/xray
        this.registerComponent('sellingPoints', {
            condition: (lead, analysisData) => analysisData?.selling_points?.length > 0,
            render: (lead, analysisData) => `
                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <span class="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-2">✓</span>
                        Key Selling Points
                    </h3>
                    <ul class="space-y-2">
                        ${analysisData.selling_points.map(point => `
                            <li class="flex items-start">
                                <span class="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                <span class="text-sm text-gray-700">${point}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `
        });

        // Reasons - For deep/xray analysis
        this.registerComponent('reasons', {
            condition: (lead, analysisData) => analysisData?.reasons?.length > 0,
            render: (lead, analysisData) => `
                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <span class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm mr-2">💡</span>
                        Analysis Reasons
                    </h3>
                    <ul class="space-y-2">
                        ${analysisData.reasons.map(reason => `
                            <li class="flex items-start">
                                <span class="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                <span class="text-sm text-gray-700">${reason}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `
        });

        // Engagement Metrics - For deep/xray
        this.registerComponent('engagementMetrics', {
            condition: (lead, analysisData) => analysisData?.engagement_breakdown,
            render: (lead, analysisData) => {
                const engagement = analysisData.engagement_breakdown;
                return `
                    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <span class="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm mr-2">📊</span>
                            Engagement Metrics
                        </h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <p class="text-sm text-gray-600">Average Likes</p>
                                <p class="text-lg font-semibold text-gray-800">${engagement.avg_likes?.toLocaleString() || 0}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Average Comments</p>
                                <p class="text-lg font-semibold text-gray-800">${engagement.avg_comments?.toLocaleString() || 0}</p>
                            </div>
                            <div class="col-span-2">
                                <p class="text-sm text-gray-600">Engagement Rate</p>
                                <p class="text-lg font-semibold text-gray-800">${engagement.engagement_rate || 0}%</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        // Audience Insights - For deep/xray
        this.registerComponent('audienceInsights', {
            condition: (lead, analysisData) => analysisData?.audience_insights,
            render: (lead, analysisData) => `
                <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <span class="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm mr-2">👥</span>
                        Audience Insights
                    </h3>
                    <p class="text-sm text-gray-700 leading-relaxed">${analysisData.audience_insights}</p>
                </div>
            `
        });

        // Outreach Message - For deep/xray
        this.registerComponent('outreachMessage', {
            condition: (lead, analysisData) => analysisData?.outreach_message,
            render: (lead, analysisData) => `
                <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-4">
                    <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <span class="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm mr-2">✉️</span>
                        Suggested Outreach Message
                    </h3>
                    <div class="bg-white p-3 rounded text-sm text-gray-700 border border-gray-200 leading-relaxed">
                        ${analysisData.outreach_message.replace(/\n/g, '<br>')}
                    </div>
                    <button onclick="copyToClipboard('${analysisData.outreach_message.replace(/'/g, "\\'")}')" 
                            class="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                        Copy Message
                    </button>
                </div>
            `
        });

        // Light Analysis Upgrade Notice
        this.registerComponent('upgradeNotice', {
            condition: (lead, analysisData) => lead.analysis_type === 'light',
            render: (lead, analysisData) => `
                <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <span class="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-sm mr-2">⚡</span>
                        Quick Analysis Complete
                    </h3>
                    <p class="text-sm text-gray-700 mb-3">This is a quick analysis. Upgrade to Profile or X-Ray analysis for detailed insights, engagement metrics, and personalized outreach messages.</p>
                    <button onclick="upgradeAnalysis('${lead.lead_id}', 'deep')" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm mr-2">
                        Upgrade to Profile
                    </button>
                    <button onclick="upgradeAnalysis('${lead.lead_id}', 'xray')" 
                            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                        Upgrade to X-Ray
                    </button>
                </div>
            `
        });
    }

    // ===============================================================================
    // UTILITY METHODS
    // ===============================================================================
    
    getProfileImageUrl(lead) {
        return (lead.profile_picture_url || lead.profile_pic_url) ? 
            `https://images.weserv.nl/?url=${encodeURIComponent(lead.profile_picture_url || lead.profile_pic_url)}&w=160&h=160&fit=cover&mask=circle` : 
            '/assets/images/default-avatar.png';
    }

    getAnalysisTypeLabel(type) {
        const labels = {
            light: 'Quick Analysis',
            deep: 'Profile Analysis', 
            xray: 'X-Ray Analysis'
        };
        return labels[type] || 'Unknown';
    }

    getSummaryText(lead, analysisData) {
        return analysisData?.audience_insights || 
               analysisData?.summary_text || 
               lead.quick_summary || 
               'No summary available for this lead.';
    }
}

// Export component system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalComponents;
} else {
    window.ModalComponents = ModalComponents;
}
