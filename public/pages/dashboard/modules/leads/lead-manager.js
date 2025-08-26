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
        this.supabase = container.get('supabase');
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
            
            // Load leads with analysis data - EXACT QUERY FROM ORIGINAL
            const { data: leadsData, error: leadsError } = await this.supabase
                .from('leads')
                .select(`
                    id,
                    username,
                    profile_pic_url,
                    platform,
                    score,
                    analysis_type,
                    business_id,
                    created_at,
                    followers_count,
                    profile_url,
                    quick_summary
                `)
                .eq('user_id', user.id)
                .eq('business_id', selectedBusinessId)
                .order('created_at', { ascending: false })
                .limit(50);
                
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
        try {
            console.log('🔍 [LeadManager] Loading lead details:', leadId);
            
            const user = this.osliraApp?.user;
            if (!this.supabase || !user) {
                throw new Error('Authentication system not ready');
            }
            
            let lead = null;
            let analysisData = null;
            
            // Try to find in cache first
            const cachedLeads = this.stateManager.getState('leads');
            const cachedLead = cachedLeads.find(l => l.id === leadId);
            
            if (cachedLead) {
                lead = cachedLead;
                if (lead.lead_analyses && lead.lead_analyses.length > 0) {
                    analysisData = lead.lead_analyses[0];
                }
            } else {
                // Fetch from database - EXACT QUERY FROM ORIGINAL
                const { data: leadData, error: leadError } = await this.supabase
                    .from('leads')
                    .select(`
                        id,
                        username,
                        profile_pic_url,
                        platform,
                        score,
                        analysis_type,
                        business_id,
                        created_at,
                        followers_count
                    `)
                    .eq('id', leadId)
                    .eq('user_id', user.id)
                    .single();
                    
                if (leadError || !leadData) {
                    throw new Error('Lead not found or access denied');
                }
                
                lead = leadData;
                
                // Fetch analysis data if it's a deep analysis - EXACT QUERY FROM ORIGINAL
                if (lead.analysis_type === 'deep') {
                    console.log('🔍 [LeadManager] Fetching deep analysis data...');
                    
                    const { data: deepAnalysis, error: analysisError } = await this.supabase
                        .from('lead_analyses')
                        .select(`
                            engagement_score,
                            score_niche_fit,
                            score_total,
                            outreach_message,
                            selling_points,
                            audience_quality,
                            engagement_insights,
                            avg_likes,
                            avg_comments,
                            engagement_rate,
                            latest_posts,
                            username
                        `)
                        .eq('lead_id', leadId)
                        .single();
                        
                    if (analysisError) {
                        console.warn('⚠️ [LeadManager] Deep analysis data not found:', analysisError.message);
                    } else {
                        analysisData = deepAnalysis;
                        console.log('📈 [LeadManager] Analysis data loaded:', analysisData);
                    }
                }
            }
            
            // Emit event
            this.eventBus.emit(DASHBOARD_EVENTS.LEAD_VIEWED, { lead, analysisData });
            
            return { lead, analysisData };
            
        } catch (error) {
            console.error('❌ [LeadManager] Error loading lead details:', error);
            this.eventBus.emit(DASHBOARD_EVENTS.ERROR, error);
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
