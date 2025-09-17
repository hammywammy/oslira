//public/pages/dashboard/modules/leads/lead-manager.js

/**
 * OSLIRA LEAD MANAGER MODULE
 * Handles all lead CRUD operations, data loading, and selection management
 * Extracted from dashboard.js - maintains exact functionality
 */
class LeadManager {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.stateManager = container.get('stateManager');
        this.osliraApp = container.get('osliraApp');
        
        // Cache for lead data
        this.dataCache = new Map();
        this.lastRefresh = null;
        
        console.log('🚀 [LeadManager] Initialized');
    }
    
    async init() {
        // Listen to auth changes
        this.eventBus.on('auth:changed', this.handleAuthChange.bind(this));
        this.eventBus.on('business:changed', this.handleBusinessChange.bind(this));
        
        console.log('✅ [LeadManager] Event listeners initialized');
    }
    
    // ===============================================================================
    // MAIN DATA LOADING - EXTRACTED FROM dashboard.js lines 200-280
    // ===============================================================================
    
    async loadDashboardData() {
        try {
            console.log('🔄 [LeadManager] Loading dashboard data...');
            this.stateManager.setState('isLoading', true);
            this.stateManager.setState('loadingMessage', 'Loading leads...');
            this.eventBus.emit(DASHBOARD_EVENTS.LOADING_START, 'leads');
            
            // Get current user and business
            const user = this.osliraApp?.user;
            const selectedBusiness = this.stateManager.getState('selectedBusiness');
            const selectedBusinessId = selectedBusiness?.id || localStorage.getItem('selectedBusinessId');
            
            if (!user || !selectedBusinessId) {
                throw new Error('User or business not found');
            }
            
            console.log('📊 [LeadManager] Loading leads for:', {
                userId: user.id,
                businessId: selectedBusinessId
            });

                        if (!this.supabase) {
                throw new Error('Database connection not ready');
            }
            
const { data: leads, error } = await supabase
    .from('leads')
    .select(`
        lead_id,
        username,
        display_name,
        profile_picture_url,
        bio_text,
        follower_count,
        following_count,
        post_count,
        is_verified_account,
        platform_type,
        profile_url,
        user_id,
        business_id,
        first_discovered_at,
        runs (
            id,
            analysis_type,
            overall_score,
            niche_fit_score,
            engagement_score,
            summary_text,
            confidence_level,
            created_at
        )
    `)
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .order('first_discovered_at', { ascending: false })
    .limit(50);

            if (leads) {
    const processedLeads = leads.map(lead => {
        // Get the most recent run
        const latestRun = lead.runs && lead.runs.length > 0
            ? lead.runs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            : null;
        
        return {
            ...lead,
            // Add backward compatibility fields
            profile_pic_url: lead.profile_picture_url,
            followers_count: lead.follower_count,
            platform: lead.platform_type || 'instagram',
            created_at: lead.first_discovered_at,
            // Add analysis data from latest run
            score: latestRun?.overall_score || 0,
            analysis_type: latestRun?.analysis_type || 'none',
            quick_summary: latestRun?.summary_text || '',
            niche_fit_score: latestRun?.niche_fit_score || 0,
            engagement_score: latestRun?.engagement_score || 0,
            latest_run_id: latestRun?.id
        };
    });
    
    return processedLeads;
}
            
            if (leadsError) {
                console.error('❌ [LeadManager] Leads query error:', leadsError);
                throw leadsError;
            }
            
            console.log(`📊 [LeadManager] Loaded ${leadsData?.length || 0} leads from database`);
            
            // Load analysis data for deep analysis leads - EXACT LOGIC FROM ORIGINAL
            const deepAnalysisLeadIds = leadsData?.filter(lead => lead.analysis_type === 'deep')?.map(lead => lead.id) || [];
            let analysisDataMap = new Map();
            
            if (deepAnalysisLeadIds.length > 0) {
                const { data: analysisData, error: analysisError } = await this.supabase
                    .from('lead_analyses')
                    .select(`
                        lead_id,
                        engagement_score,
                        selling_points,
                        outreach_message,
                        reasons,
                        deep_summary,
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
                    `)
                    .in('lead_id', deepAnalysisLeadIds);
                    
                if (analysisError) {
                    console.warn('⚠️ [LeadManager] Analysis data query error:', analysisError);
                } else {
                    analysisData?.forEach(analysis => {
                        analysisDataMap.set(analysis.lead_id, analysis);
                    });
                    console.log(`📈 [LeadManager] Loaded analysis data for ${analysisData?.length || 0} deep analysis leads`);
                }
            }
            
            // Combine leads with their analysis data - EXACT LOGIC FROM ORIGINAL
            const enrichedLeads = leadsData?.map(lead => ({
                ...lead,
                lead_analyses: lead.analysis_type === 'deep' && analysisDataMap.has(lead.id) 
                    ? [analysisDataMap.get(lead.id)] 
                    : []
            })) || [];
            
            // Update state
            this.stateManager.batchUpdate({
                'leads': enrichedLeads,
                'allLeads': enrichedLeads,
                'filteredLeads': enrichedLeads
            });
            
            // Clear selection
            this.stateManager.setState('selectedLeads', new Set());
            
            // Cache the data
            this.dataCache.set('leads', enrichedLeads);
            this.lastRefresh = new Date().toISOString();
            
            // Update global cache
            if (this.osliraApp.cache) {
                this.osliraApp.cache.leads = enrichedLeads;
                this.osliraApp.cache.lastRefresh = this.lastRefresh;
            }
            
console.log(`✅ [LeadManager] Final result: ${enrichedLeads.length} unique leads`);
            
            // Initialize pagination with new data
            this.stateManager.setState('filteredLeads', enrichedLeads);
            if (window.dashboard?.updatePagination) {
                window.dashboard.updatePagination();
            }
            
            // Emit events
            this.eventBus.emit(DASHBOARD_EVENTS.LEADS_LOADED, enrichedLeads);
            this.eventBus.emit(DASHBOARD_EVENTS.DATA_LOADED, { leads: enrichedLeads });
            
            return enrichedLeads;
            
        } catch (error) {
            console.error('❌ [LeadManager] Error loading leads:', error);
            this.eventBus.emit(DASHBOARD_EVENTS.DATA_ERROR, error);
            throw error;
            
        } finally {
            this.stateManager.setState('isLoading', false);
            this.eventBus.emit(DASHBOARD_EVENTS.LOADING_END, 'leads');
        }
    }
    
    // ===============================================================================
    // LEAD DETAILS - EXTRACTED FROM dashboard.js lines 1200-1350
    // ===============================================================================
    
async viewLead(leadId) {
    console.log('🔍 [LeadManager] Loading lead details:', leadId);
    
    let lead = null;
    let analysisData = null;
    
    try {
        const user = await this.getUser();
        if (!user) throw new Error('No authenticated user');
        
        // Check cache first
        const cachedLeads = JSON.parse(localStorage.getItem('oslira_cached_leads') || '[]');
        const cachedLead = cachedLeads.find(l => l.lead_id === leadId);
        
        if (cachedLead) {
            lead = cachedLead;
            // For cached leads, we might have runs data already
            if (lead.runs && lead.runs.length > 0) {
                analysisData = lead.runs[0]; // Most recent run
            }
        } else {
            // Fetch from new 3-table structure
            const { data: leadData, error: leadError } = await this.supabase
                .from('leads')
                .select(`
                    lead_id,
                    username,
                    display_name,
                    profile_picture_url,
                    bio_text,
                    external_website_url,
                    follower_count,
                    following_count,
                    post_count,
                    is_verified_account,
                    is_private_account,
                    is_business_account,
                    platform_type,
                    profile_url,
                    first_discovered_at,
                    runs(
                        run_id,
                        analysis_type,
                        overall_score,
                        niche_fit_score,
                        engagement_score,
                        summary_text,
                        confidence_level,
                        created_at,
                        payloads(analysis_data)
                    )
                `)
                .eq('lead_id', leadId)
                .eq('user_id', user.id)
                .order('created_at', { foreignTable: 'runs', ascending: false })
                .single();
                
            if (leadError || !leadData) {
                throw new Error('Lead not found or access denied');
            }
            
            // Transform data to match old interface for compatibility
            lead = {
                id: leadData.lead_id, // Keep old id field for compatibility
                lead_id: leadData.lead_id,
                username: leadData.username,
                full_name: leadData.display_name,
                profile_pic_url: leadData.profile_picture_url,
                bio: leadData.bio_text,
                external_url: leadData.external_website_url,
                followers_count: leadData.follower_count,
                following_count: leadData.following_count,
                posts_count: leadData.post_count,
                is_verified: leadData.is_verified_account,
                is_private: leadData.is_private_account,
                is_business_account: leadData.is_business_account,
                platform: leadData.platform_type,
                profile_url: leadData.profile_url,
                created_at: leadData.first_discovered_at,
                
                // Map from latest run for compatibility
                score: leadData.runs?.[0]?.overall_score || 0,
                analysis_type: leadData.runs?.[0]?.analysis_type || 'light',
                quick_summary: leadData.runs?.[0]?.summary_text,
                runs: leadData.runs // Keep full runs data
            };
            
            // Get analysis data from most recent run
            if (leadData.runs && leadData.runs.length > 0) {
                const latestRun = leadData.runs[0];
                analysisData = {
                    run_id: latestRun.run_id,
                    engagement_score: latestRun.engagement_score,
                    score_niche_fit: latestRun.niche_fit_score,
                    score_total: latestRun.overall_score,
                    summary_text: latestRun.summary_text,
                    confidence_level: latestRun.confidence_level,
                    created_at: latestRun.created_at
                };
                
                // If there's payload data, extract it
                if (latestRun.payloads && latestRun.payloads.length > 0) {
                    const payload = latestRun.payloads[0].analysis_data;
                    if (payload) {
                        // Map payload data to old format for compatibility
                        analysisData.deep_summary = payload.deep_payload?.detailed_summary || payload.summary;
                        analysisData.outreach_message = payload.deep_payload?.outreach_message;
                        analysisData.selling_points = payload.deep_payload?.selling_points || payload.light_payload?.insights;
                        analysisData.audience_quality = payload.light_payload?.audience_quality;
                        analysisData.engagement_insights = payload.light_payload?.engagement_summary;
                        analysisData.latest_posts = payload.profile_data?.latest_posts;
                        analysisData.engagement_data = payload.profile_data?.engagement;
                    }
                }
            }
        }
        
        console.log('✅ [LeadManager] Lead loaded successfully');
        return { lead, analysisData };
        
    } catch (error) {
        console.error('❌ [LeadManager] Failed to load lead:', error);
        throw error;
    }
}
    
    // ===============================================================================
    // LEAD OPERATIONS - EXTRACTED FROM dashboard.js
    // ===============================================================================
    
    // EXTRACTED FROM dashboard.js lines 1400-1450
    viewLatestLead(username) {
        console.log('🔍 [LeadManager] Looking for latest lead:', username);
        
        const leads = this.stateManager.getState('leads');
        const lead = leads.find(l => l.username.toLowerCase() === username.toLowerCase());
        
        if (lead) {
            console.log('✅ [LeadManager] Found lead, opening details:', lead.id);
            this.viewLead(lead.id);
            return lead;
        } else {
            console.warn('⚠️ [LeadManager] Lead not found, refreshing data:', username);
            // Trigger refresh
            this.loadDashboardData();
            return null;
        }
    }
    
    // EXTRACTED FROM dashboard.js lines 1500-1580  
    async deleteLead(leadId) {
        try {
            console.log('🗑️ [LeadManager] Deleting lead:', leadId);
            
            const user = this.osliraApp?.user;
            if (!this.supabase || !user) {
                throw new Error('Database connection failed');
            }
            
            // Delete from lead_analyses first (foreign key constraint)
            const { error: analysisError } = await this.supabase
                .from('lead_analyses')
                .delete()
                .eq('lead_id', leadId);
                
            if (analysisError) {
                console.warn('⚠️ [LeadManager] Some analysis records could not be deleted:', analysisError.message);
            }
            
            // Delete from leads table
            const { error: leadsError } = await this.supabase
                .from('leads')
                .delete()
                .eq('id', leadId)
                .eq('user_id', user.id); // Security: only delete user's own leads
                
            if (leadsError) {
                throw leadsError;
            }
            
            // Remove from local state
            const currentLeads = this.stateManager.getState('leads');
            const updatedLeads = currentLeads.filter(lead => lead.id !== leadId);
            
            this.stateManager.batchUpdate({
                'leads': updatedLeads,
                'allLeads': updatedLeads,
                'filteredLeads': updatedLeads
            });
            
            // Remove from selection if selected
            const selectedLeads = this.stateManager.getState('selectedLeads');
            if (selectedLeads.has(leadId)) {
                const newSelection = new Set(selectedLeads);
                newSelection.delete(leadId);
                this.stateManager.setState('selectedLeads', newSelection);
            }
            
            this.eventBus.emit(DASHBOARD_EVENTS.LEAD_DELETED, { leadId });
            console.log('✅ [LeadManager] Lead deleted successfully');
            
        } catch (error) {
            console.error('❌ [LeadManager] Error deleting lead:', error);
            this.eventBus.emit(DASHBOARD_EVENTS.ERROR, error);
            throw error;
        }
    }
    
    // EXTRACTED FROM dashboard.js lines 1600-1680
    async bulkDeleteLeads(leadIds = null) {
        const selectedLeads = leadIds || this.stateManager.getState('selectedLeads');
        const idsToDelete = leadIds || Array.from(selectedLeads);
        
        if (idsToDelete.length === 0) {
            throw new Error('No leads selected for deletion');
        }
        
        try {
            console.log(`🗑️ [LeadManager] Bulk deleting ${idsToDelete.length} leads`);
            
            const user = this.osliraApp?.user;
            if (!this.supabase || !user) {
                throw new Error('Database connection failed');
            }
            
            // Delete from lead_analyses first (foreign key constraint)
            const { error: analysisError } = await this.supabase
                .from('lead_analyses')
                .delete()
                .in('lead_id', idsToDelete);
                
            if (analysisError) {
                console.warn('⚠️ [LeadManager] Some analysis records could not be deleted:', analysisError.message);
            }
            
            // Delete from leads table
            const { error: leadsError } = await this.supabase
                .from('leads')
                .delete()
                .in('id', idsToDelete)
                .eq('user_id', user.id); // Security: only delete user's own leads
                
            if (leadsError) {
                throw leadsError;
            }
            
            // Update state
            const currentLeads = this.stateManager.getState('leads');
            const updatedLeads = currentLeads.filter(lead => !idsToDelete.includes(lead.id));
            
            this.stateManager.batchUpdate({
                'leads': updatedLeads,
                'allLeads': updatedLeads,
                'filteredLeads': updatedLeads,
                'selectedLeads': new Set()
            });
            
            this.eventBus.emit(DASHBOARD_EVENTS.LEAD_DELETED, { 
                leadIds: idsToDelete,
                count: idsToDelete.length 
            });
            
            console.log('✅ [LeadManager] Bulk delete completed');
            return { count: idsToDelete.length };
            
        } catch (error) {
            console.error('❌ [LeadManager] Bulk delete failed:', error);
            this.eventBus.emit(DASHBOARD_EVENTS.ERROR, error);
            throw error;
        }
    }
    
    // ===============================================================================
    // SELECTION MANAGEMENT - EXTRACTED FROM dashboard.js
    // ===============================================================================
    
    // EXTRACTED FROM dashboard.js lines 1850-1900
    toggleLeadSelection(leadId) {
        const selectedLeads = this.stateManager.getState('selectedLeads');
        const newSelection = new Set(selectedLeads);
        
        if (newSelection.has(leadId)) {
            newSelection.delete(leadId);
            this.eventBus.emit(DASHBOARD_EVENTS.LEAD_DESELECTED, leadId);
        } else {
            newSelection.add(leadId);
            this.eventBus.emit(DASHBOARD_EVENTS.LEAD_SELECTED, leadId);
        }
        
        this.stateManager.setState('selectedLeads', newSelection);
        this.eventBus.emit(DASHBOARD_EVENTS.SELECTION_CHANGED, {
            selectedLeads: newSelection,
            count: newSelection.size
        });
        
        console.log(`🎯 [LeadManager] Selection toggled: ${leadId} (${newSelection.size} selected)`);
    }
    
    // EXTRACTED FROM dashboard.js lines 1950-2000
    selectAllLeads() {
        const leads = this.stateManager.getState('filteredLeads') || this.stateManager.getState('leads');
        const allIds = new Set(leads.map(lead => lead.id));
        
        this.stateManager.setState('selectedLeads', allIds);
        this.eventBus.emit(DASHBOARD_EVENTS.BULK_SELECTION, {
            selectedLeads: allIds,
            count: allIds.size
        });
        
        console.log(`🎯 [LeadManager] All leads selected: ${allIds.size}`);
    }
    
    // EXTRACTED FROM dashboard.js lines 2050-2080
    clearSelection() {
        this.stateManager.setState('selectedLeads', new Set());
        this.eventBus.emit(DASHBOARD_EVENTS.SELECTION_CLEARED);
        console.log('🎯 [LeadManager] Selection cleared');
    }
    
    // ===============================================================================
    // FILTERING & SEARCH
    // ===============================================================================
    
    filterLeads(filter = 'all') {
        const allLeads = this.stateManager.getState('allLeads');
        let filteredLeads = allLeads;
        
        switch (filter) {
            case 'high-score':
                filteredLeads = allLeads.filter(lead => (lead.score || 0) >= 80);
                break;
            case 'deep-analysis':
                filteredLeads = allLeads.filter(lead => lead.analysis_type === 'deep');
                break;
            case 'light-analysis':
                filteredLeads = allLeads.filter(lead => lead.analysis_type === 'light');
                break;
            case 'recent':
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                filteredLeads = allLeads.filter(lead => new Date(lead.created_at) > weekAgo);
                break;
            case 'all':
            default:
                filteredLeads = allLeads;
                break;
        }
        
        this.stateManager.batchUpdate({
            'currentFilter': filter,
            'filteredLeads': filteredLeads
        });
        
        this.eventBus.emit(DASHBOARD_EVENTS.FILTER_CHANGED, {
            filter,
            count: filteredLeads.length
        });
        
        console.log(`🔍 [LeadManager] Filter applied: ${filter} (${filteredLeads.length} results)`);
        return filteredLeads;
    }
    
    searchLeads(searchTerm) {
        const allLeads = this.stateManager.getState('allLeads');
        
        if (!searchTerm.trim()) {
            const currentFilter = this.stateManager.getState('currentFilter');
            return this.filterLeads(currentFilter);
        }
        
        const filteredLeads = allLeads.filter(lead =>
            lead.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.stateManager.batchUpdate({
            'searchTerm': searchTerm,
            'filteredLeads': filteredLeads
        });
        
        this.eventBus.emit(DASHBOARD_EVENTS.SEARCH_CHANGED, {
            searchTerm,
            count: filteredLeads.length
        });
        
        console.log(`🔍 [LeadManager] Search applied: "${searchTerm}" (${filteredLeads.length} results)`);
        return filteredLeads;
    }
    
    // ===============================================================================
    // EVENT HANDLERS
    // ===============================================================================
    
    handleAuthChange(userData) {
        if (userData.user) {
            console.log('🔐 [LeadManager] User authenticated, loading data');
            this.loadDashboardData();
        } else {
            console.log('🔐 [LeadManager] User logged out, clearing data');
            this.clearData();
        }
    }
    
    handleBusinessChange(businessData) {
        console.log('🏢 [LeadManager] Business changed, reloading leads');
        this.loadDashboardData();
    }

get supabase() {
        try {
            const client = this.container.get('supabase');
            if (!client || typeof client.from !== 'function') {
                console.warn('⚠️ [LeadManager] Supabase client not ready yet');
                return null;
            }
            return client;
        } catch (error) {
            console.warn('⚠️ [LeadManager] Supabase client not available:', error.message);
            return null;
        }
    }

    
    // ===============================================================================
    // UTILITY METHODS
    // ===============================================================================
    
    clearData() {
        this.stateManager.batchUpdate({
            'leads': [],
            'allLeads': [],
            'filteredLeads': [],
            'selectedLeads': new Set()
        });
        
        this.dataCache.clear();
        this.lastRefresh = null;
    }
    
    getLeadById(leadId) {
        const leads = this.stateManager.getState('leads');
        return leads.find(lead => lead.id === leadId);
    }
    
    getSelectedLeads() {
        const selectedIds = this.stateManager.getState('selectedLeads');
        const leads = this.stateManager.getState('leads');
        return leads.filter(lead => selectedIds.has(lead.id));
    }
    
    getLeadStats() {
        const leads = this.stateManager.getState('leads');
        
        return {
            total: leads.length,
            selected: this.stateManager.getState('selectedLeads').size,
            deepAnalysis: leads.filter(l => l.analysis_type === 'deep').length,
            lightAnalysis: leads.filter(l => l.analysis_type === 'light').length,
            highScore: leads.filter(l => (l.score || 0) >= 80).length,
            averageScore: leads.length > 0 
                ? Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / leads.length)
                : 0
        };
    }
    
    async cleanup() {
        console.log('🧹 [LeadManager] Cleaning up...');
        this.clearData();
        this.dataCache.clear();
    }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LeadManager };
} else {
    window.LeadManager = LeadManager;
}
