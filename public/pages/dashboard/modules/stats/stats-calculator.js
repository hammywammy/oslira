//public/pages/dashboard/modules/stats/stats-calculator.js

/**
 * OSLIRA STATS CALCULATOR MODULE
 * Handles dashboard statistics calculation, caching, and UI updates
 * Extracted from dashboard.js - maintains exact functionality
 */
class StatsCalculator {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.stateManager = container.get('stateManager');
        this.supabase = container.get('supabase');
        this.osliraApp = container.get('osliraApp');
        
        // Stats cache
        this.statsCache = new Map();
        this.lastStatsUpdate = null;
        this.cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
        
        console.log('🚀 [StatsCalculator] Initialized');
    }
    
    async init() {
        // Listen to data changes for stats recalculation
        this.stateManager.subscribe('leads', this.handleLeadsChanged.bind(this));
        
        // Listen for stats refresh requests
        this.eventBus.on(DASHBOARD_EVENTS.STATS_REFRESH, this.refreshStats.bind(this));
        this.eventBus.on(DASHBOARD_EVENTS.DATA_LOADED, this.handleDataLoaded.bind(this));
        
        console.log('✅ [StatsCalculator] Event listeners initialized');
    }
    
    // ===============================================================================
    // MAIN STATS CALCULATION - EXTRACTED FROM dashboard.js lines 900-1200
    // ===============================================================================
    
    // EXTRACTED FROM dashboard.js lines 900-1050
    async refreshStats() {
        try {
            console.log('📊 [StatsCalculator] Updating dashboard stats with database queries...');
            
            const user = this.osliraApp?.user;
            if (!this.supabase || !user) {
                console.warn('⚠️ [StatsCalculator] No database connection available, using cached data');
                this.updateStatsFromCachedData();
                return;
            }
            
            // Check cache first
            const cachedStats = this.getCachedStats();
            if (cachedStats) {
                console.log('📊 [StatsCalculator] Using cached stats');
                this.renderStats(cachedStats);
                this.stateManager.setState('stats', cachedStats);
                return cachedStats;
            }
            
            // Get selected business
            const selectedBusiness = this.stateManager.getState('selectedBusiness');
            const businessId = selectedBusiness?.id || localStorage.getItem('selectedBusinessId');
            
            if (!businessId) {
                console.warn('⚠️ [StatsCalculator] No business selected');
                return this.getDefaultStats();
            }
            
            // QUERY 1: Total leads count - EXACT FROM ORIGINAL
            const { count: totalLeads, error: leadsCountError } = await this.supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('business_id', businessId);
                
            if (leadsCountError) {
                console.error('❌ [StatsCalculator] Leads count error:', leadsCountError);
            }
            
            // QUERY 2: Average score calculation - EXACT FROM ORIGINAL
            const { data: scoreData, error: scoreError } = await this.supabase
                .from('leads')
                .select('score')
                .eq('user_id', user.id)
                .eq('business_id', businessId)
                .not('score', 'is', null);
                
            let avgScore = 0;
            if (!scoreError && scoreData && scoreData.length > 0) {
                const totalScore = scoreData.reduce((sum, lead) => sum + (lead.score || 0), 0);
                avgScore = Math.round(totalScore / scoreData.length);
            }
            
            // QUERY 3: High-value leads count (score >= 80) - EXACT FROM ORIGINAL
            const { count: highValueLeads, error: highValueError } = await this.supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('business_id', businessId)
                .gte('score', 80);
                
            if (highValueError) {
                console.error('❌ [StatsCalculator] High value leads error:', highValueError);
            }
            
            // QUERY 4: Deep analysis count
            const { count: deepAnalyses, error: deepAnalysesError } = await this.supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('business_id', businessId)
                .eq('analysis_type', 'deep');
                
            if (deepAnalysesError) {
                console.error('❌ [StatsCalculator] Deep analyses count error:', deepAnalysesError);
            }
            
            // Get user credits - EXACT FROM ORIGINAL
            const userCredits = this.osliraApp?.user?.credits || 0;
            
            // Build stats object
            const stats = {
                totalLeads: totalLeads || 0,
                averageScore: avgScore,
                highValueLeads: highValueLeads || 0,
                deepAnalyses: deepAnalyses || 0,
                lightAnalyses: Math.max(0, (totalLeads || 0) - (deepAnalyses || 0)),
                creditsRemaining: userCredits,
                lastUpdate: new Date().toISOString(),
                businessId: businessId
            };
            
            console.log('📊 [StatsCalculator] Database stats calculated:', stats);
            
            // Cache and render stats
            this.setCachedStats(stats);
            this.renderStats(stats);
            this.stateManager.setState('stats', stats);
            
            // Emit stats updated event
            this.eventBus.emit(DASHBOARD_EVENTS.STATS_UPDATED, stats);
            
            return stats;
            
        } catch (error) {
            console.error('❌ [StatsCalculator] Error updating dashboard stats:', error);
            this.updateStatsFromCachedData();
            throw error;
        }
    }
    
    // EXTRACTED FROM dashboard.js lines 1100-1200
    calculateStats(leads) {
        console.log('🔢 [StatsCalculator] Calculating stats from lead data...');
        
        if (!leads || leads.length === 0) {
            return this.getDefaultStats();
        }
        
        // Calculate from leads array
        const totalLeads = leads.length;
        
        // Calculate average score
        const scoresWithValues = leads.filter(lead => lead.score != null && lead.score > 0);
        const avgScore = scoresWithValues.length > 0
            ? Math.round(scoresWithValues.reduce((sum, lead) => sum + lead.score, 0) / scoresWithValues.length)
            : 0;
            
        // High-value leads (score >= 80)
        const highValueLeads = leads.filter(lead => (lead.score || 0) >= 80).length;
        
        // Analysis type counts
        const deepAnalyses = leads.filter(lead => lead.analysis_type === 'deep').length;
        const lightAnalyses = leads.filter(lead => lead.analysis_type === 'light').length;
        
        // Get user credits
        const userCredits = this.osliraApp?.user?.credits || 0;
        
        const stats = {
            totalLeads,
            averageScore: avgScore,
            highValueLeads,
            deepAnalyses,
            lightAnalyses,
            creditsRemaining: userCredits,
            lastUpdate: new Date().toISOString(),
            calculatedFromLeads: true
        };
        
        console.log('📊 [StatsCalculator] Stats calculated from leads:', stats);
        return stats;
    }
    
    // ===============================================================================
    // STATS RENDERING - EXTRACTED FROM dashboard.js lines 7000-7400
    // ===============================================================================
    
    // EXTRACTED FROM dashboard.js lines 7000-7200
    renderStats(stats) {
        console.log('🎨 [StatsCalculator] Rendering stats to UI:', stats);
        
        // Update total leads
        const totalLeadsEl = document.getElementById('total-leads');
        if (totalLeadsEl) {
            totalLeadsEl.textContent = this.formatNumber(stats.totalLeads);
        }
        
        // Update average score with color coding
        const avgScoreEl = document.getElementById('average-score');
        if (avgScoreEl) {
            avgScoreEl.textContent = `${stats.averageScore}%`;
            avgScoreEl.className = this.getScoreClass(stats.averageScore);
        }
        
        // Update high-value leads
        const highValueEl = document.getElementById('high-value-leads');
        if (highValueEl) {
            highValueEl.textContent = this.formatNumber(stats.highValueLeads);
        }
        
        // Update high-value percentage
        const highValuePercentEl = document.getElementById('high-value-percent');
        if (highValuePercentEl) {
            const percentage = stats.totalLeads > 0 
                ? Math.round((stats.highValueLeads / stats.totalLeads) * 100)
                : 0;
            highValuePercentEl.textContent = `${percentage}%`;
        }
        
        // Update analysis counts
        const deepAnalysesEl = document.getElementById('deep-analyses-count');
        if (deepAnalysesEl) {
            deepAnalysesEl.textContent = this.formatNumber(stats.deepAnalyses);
        }
        
        const lightAnalysesEl = document.getElementById('light-analyses-count');
        if (lightAnalysesEl) {
            lightAnalysesEl.textContent = this.formatNumber(stats.lightAnalyses);
        }
        
        // Update credits
        this.updateCreditsDisplay(stats.creditsRemaining);
        
        // Update last refresh time
        const lastUpdateEl = document.getElementById('last-stats-update');
        if (lastUpdateEl && stats.lastUpdate) {
            const updateTime = new Date(stats.lastUpdate);
            lastUpdateEl.textContent = `Updated ${this.formatTimeAgo(updateTime)}`;
        }
        
        console.log('✅ [StatsCalculator] Stats UI updated successfully');
    }
    
    // EXTRACTED FROM dashboard.js lines 7250-7400
    updateStatsUI(stats) {
        // Alternative method for updating specific UI elements
        const elements = {
            'dashboard-total-leads': stats.totalLeads,
            'dashboard-avg-score': `${stats.averageScore}%`,
            'dashboard-high-value': stats.highValueLeads,
            'dashboard-deep-count': stats.deepAnalyses,
            'dashboard-light-count': stats.lightAnalyses
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = typeof value === 'number' ? this.formatNumber(value) : value;
            }
        });
        
        // Update progress bars if they exist
        this.updateProgressBars(stats);
    }
    
    updateCreditsDisplay(credits) {
        const creditsElements = [
            'current-credits',
            'user-credits', 
            'credits-remaining',
            'header-credits'
        ];
        
        creditsElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = this.formatNumber(credits);
                
                // Add low credits warning
                if (credits < 5) {
                    el.classList.add('low-credits');
                    el.title = 'Low credits remaining';
                } else {
                    el.classList.remove('low-credits');
                    el.title = '';
                }
            }
        });
    }
    
    updateProgressBars(stats) {
        // High-value leads progress bar
        const highValueProgress = document.getElementById('high-value-progress');
        if (highValueProgress && stats.totalLeads > 0) {
            const percentage = (stats.highValueLeads / stats.totalLeads) * 100;
            highValueProgress.style.width = `${Math.min(percentage, 100)}%`;
        }
        
        // Deep vs Light analysis chart
        const deepAnalysisProgress = document.getElementById('deep-analysis-progress');
        if (deepAnalysisProgress && stats.totalLeads > 0) {
            const percentage = (stats.deepAnalyses / stats.totalLeads) * 100;
            deepAnalysisProgress.style.width = `${Math.min(percentage, 100)}%`;
        }
    }
    
    // ===============================================================================
    // CACHED DATA FALLBACK
    // ===============================================================================
    
    updateStatsFromCachedData() {
        console.log('📊 [StatsCalculator] Using cached lead data for stats calculation');
        
        const leads = this.stateManager.getState('leads') || [];
        const stats = this.calculateStats(leads);
        
        this.renderStats(stats);
        this.stateManager.setState('stats', stats);
        
        return stats;
    }
    
    // ===============================================================================
    // INSIGHTS GENERATION
    // ===============================================================================
    
    generateInsights(stats = null) {
        const statsData = stats || this.stateManager.getState('stats');
        if (!statsData) return [];
        
        const insights = [];
        
        // High-value leads insight
        if (statsData.totalLeads > 0) {
            const highValuePercentage = (statsData.highValueLeads / statsData.totalLeads) * 100;
            
            if (highValuePercentage >= 30) {
                insights.push({
                    type: 'success',
                    icon: '🎯',
                    title: 'Excellent Lead Quality',
                    message: `${Math.round(highValuePercentage)}% of your leads are high-value matches!`
                });
            } else if (highValuePercentage >= 15) {
                insights.push({
                    type: 'info',
                    icon: '📈',
                    title: 'Good Lead Quality',
                    message: `${Math.round(highValuePercentage)}% high-value leads. Consider refining your targeting.`
                });
            } else {
                insights.push({
                    type: 'warning',
                    icon: '🔍',
                    title: 'Improve Lead Quality',
                    message: 'Focus on higher-engagement profiles to improve match scores.'
                });
            }
        }
        
        // Analysis depth insight
        if (statsData.totalLeads > 0) {
            const deepPercentage = (statsData.deepAnalyses / statsData.totalLeads) * 100;
            
            if (deepPercentage < 20) {
                insights.push({
                    type: 'tip',
                    icon: '💡',
                    title: 'Upgrade to Deep Analysis',
                    message: 'Get personalized outreach messages and detailed insights.'
                });
            }
        }
        
        // Credits insight
        if (statsData.creditsRemaining < 10) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Low Credits',
                message: `Only ${statsData.creditsRemaining} credits remaining. Consider upgrading your plan.`
            });
        }
        
        // Render insights
        this.renderInsights(insights);
        
        return insights;
    }
    
    renderInsights(insights) {
        const insightsContainer = document.getElementById('dashboard-insights');
        if (!insightsContainer) return;
        
        if (insights.length === 0) {
            insightsContainer.innerHTML = '';
            return;
        }
        
        const insightsHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.message}</p>
                </div>
            </div>
        `).join('');
        
        insightsContainer.innerHTML = `
            <div class="insights-header">
                <h3>📊 Dashboard Insights</h3>
            </div>
            <div class="insights-grid">
                ${insightsHTML}
            </div>
        `;
    }
    
    // ===============================================================================
    // CACHE MANAGEMENT
    // ===============================================================================
    
    getCachedStats() {
        const cached = this.statsCache.get('stats');
        if (!cached) return null;
        
        const isExpired = Date.now() - cached.timestamp > this.cacheExpiryMs;
        if (isExpired) {
            this.statsCache.delete('stats');
            return null;
        }
        
        return cached.stats;
    }
    
    setCachedStats(stats) {
        this.statsCache.set('stats', {
            stats: { ...stats },
            timestamp: Date.now()
        });
        this.lastStatsUpdate = Date.now();
    }
    
    clearStatsCache() {
        this.statsCache.clear();
        this.lastStatsUpdate = null;
        console.log('🧹 [StatsCalculator] Stats cache cleared');
    }
    
    // ===============================================================================
    // UTILITY METHODS
    // ===============================================================================
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num?.toString() || '0';
    }
    
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return date.toLocaleDateString();
    }
    
    getScoreClass(score) {
        if (score >= 80) return 'score-high';
        if (score >= 60) return 'score-medium';
        return 'score-low';
    }
    
    getDefaultStats() {
        return {
            totalLeads: 0,
            averageScore: 0,
            highValueLeads: 0,
            deepAnalyses: 0,
            lightAnalyses: 0,
            creditsRemaining: this.osliraApp?.user?.credits || 0,
            lastUpdate: new Date().toISOString()
        };
    }
    
    // ===============================================================================
    // EVENT HANDLERS
    // ===============================================================================
    
    handleLeadsChanged(leads) {
        console.log('📊 [StatsCalculator] Leads data changed, recalculating stats');
        
        // Calculate stats from new data
        const stats = this.calculateStats(leads);
        this.renderStats(stats);
        this.stateManager.setState('stats', stats);
        
        // Generate insights
        this.generateInsights(stats);
    }
    
    handleDataLoaded(data) {
        console.log('📊 [StatsCalculator] Data loaded, updating stats');
        this.refreshStats();
    }
    
    // ===============================================================================
    // CLEANUP
    // ===============================================================================
    
    async cleanup() {
        console.log('🧹 [StatsCalculator] Cleaning up...');
        this.clearStatsCache();
    }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StatsCalculator };
} else {
    window.StatsCalculator = StatsCalculator;
}
