//public/pages/dashboard/modules/core/DashboardCore.js

/**
 * DASHBOARD CORE - Clean Initialization System
 * Handles dependency resolution, authentication, and core setup
 */
class DashboardCore {
    
    /**
     * Main initialization flow
     */
    static async initialize(container) {
        console.log('🔧 [DashboardCore] Starting initialization...');
        
        try {
            // Pre-resolve async dependencies BEFORE module initialization
            await this.preResolveAsyncDependencies(container);
            
// Initialize all modules
console.log('🔄 [DashboardCore] Initializing modules...');
await container.initialize();

// Trigger business loading after all dependencies are initialized
const businessManager = container.get('businessManager');
await businessManager.loadBusinesses();

// Render dashboard UI first to create table structure
console.log('🎨 [DashboardCore] Rendering dashboard UI...');
await this.renderDashboardUI(container);

// Initialize LeadRenderer after UI is rendered
console.log('🔧 [DashboardCore] Initializing LeadRenderer...');
const leadRenderer = container.get('leadRenderer');
if (leadRenderer && !leadRenderer.initialized) {
    leadRenderer.init();
    leadRenderer.initialized = true;
}

// Load lead data after UI and renderer are ready
console.log('📊 [DashboardCore] Loading lead data...');
const leadManager = container.get('leadManager');
await leadManager.loadDashboardData();
            
            console.log('✅ [DashboardCore] Initialization completed');
            return true;
            
        } catch (error) {
            console.error('❌ [DashboardCore] Initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Pre-resolve async dependencies to avoid race conditions
     */
    static async preResolveAsyncDependencies(container) {
        console.log('🔄 [DashboardCore] Resolving async dependencies...');
        
        // Resolve Supabase client
        const supabase = await this.resolveSupabaseClient();
        container.registerSingleton('supabase', supabase);
        
        // Resolve AnalysisFunctions
        const analysisFunctions = await container.getAsync('analysisFunctions');
        container.registerSingleton('analysisFunctions', analysisFunctions);
        
        console.log('✅ [DashboardCore] Async dependencies resolved');
    }
    
    /**
     * Resolve Supabase client from SimpleAuth
     */
    static async resolveSupabaseClient() {
        console.log('🔄 [DashboardCore] Resolving Supabase client...');
        
        let attempts = 0;
        while (attempts < 50) {
            if (window.SimpleAuth?.supabase && typeof window.SimpleAuth.supabase === 'function') {
                const client = window.SimpleAuth.supabase();
                if (client?.from && typeof client.from === 'function') {
                    console.log('✅ [DashboardCore] Got Supabase client from SimpleAuth');
                    return client;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('SimpleAuth Supabase client not ready after timeout');
    }

/**
 * Render all dashboard UI components
 */
static async renderDashboardUI(container) {
    try {
        // Render header
        const dashboardHeader = container.get('dashboardHeader');
        if (dashboardHeader && dashboardHeader.renderHeader) {
            document.getElementById('dashboard-header').innerHTML = dashboardHeader.renderHeader();
        }
        
        // Render stats cards
        const statsCards = container.get('statsCards');
        if (statsCards) {
            if (statsCards.renderPriorityCards) {
                document.getElementById('priority-cards').innerHTML = statsCards.renderPriorityCards();
            }
            if (statsCards.renderPerformanceMetrics) {
                document.getElementById('performance-metrics').innerHTML = statsCards.renderPerformanceMetrics();
            }
        }
        
// Render leads table - check for correct container ID
const leadsTable = container.get('leadsTable');
if (leadsTable && leadsTable.renderTableContainer) {
    const leadsSection = document.getElementById('leads-section');
    if (leadsSection) {
        leadsSection.innerHTML = leadsTable.renderTableContainer();
    } else {
        console.error('❌ [DashboardCore] leads-section element not found');
    }
}
        
        // Render insights panel
        const insightsPanel = container.get('insightsPanel');
        if (insightsPanel && insightsPanel.renderInsightsPanel) {
            document.getElementById('insights-panel').innerHTML = insightsPanel.renderInsightsPanel();
        }

        // Inject dashboard styles
const stylesContainer = document.getElementById('dynamic-styles');
if (stylesContainer && window.DashboardStyles) {
    stylesContainer.innerHTML = window.DashboardStyles.getInlineStyles();
}
        
        // Initialize Feather icons after rendering
        if (window.feather) {
            window.feather.replace();
        }
        
        console.log('✅ [DashboardCore] Dashboard UI rendered');
        
    } catch (error) {
        console.error('❌ [DashboardCore] UI rendering failed:', error);
    }
}
    
    /**
     * Setup initial dashboard data
     */
    static async setupInitialData(container) {
        console.log('📊 [DashboardCore] Setting up initial data...');
        
        try {
            // Initialize state defaults
            const stateManager = container.get('stateManager');
            stateManager.batchUpdate({
                'pageSize': 25,
                'currentPage': 1,
                'filteredLeads': [],
                'visibleLeads': [],
                'selectedLeads': new Set()
            });
            
            // Wait for authentication
            const isAuthReady = await this.waitForAuth(10000);
            if (!isAuthReady) {
                console.warn('⚠️ [DashboardCore] Authentication not ready, showing empty state');
                this.displayEmptyState(stateManager);
                return;
            }
            
            // Verify user data
            const osliraApp = container.get('osliraApp');
            if (!osliraApp?.user) {
                throw new Error('User data not loaded');
            }
            
            console.log('👤 [DashboardCore] User authenticated:', osliraApp.user.email);
            
            
        } catch (error) {
            console.error('❌ [DashboardCore] Initial data setup failed:', error);
            
            if (this.isSchemaError(error)) {
                this.handleSchemaError(container);
            } else {
                throw error;
            }
        }
    }
    
    /**
     * Wait for authentication to be ready
     */
    static async waitForAuth(timeout = 10000) {
        console.log('🔐 [DashboardCore] Waiting for authentication...');
        
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = timeout / 100;
            
            const checkAuth = () => {
                const osliraApp = window.OsliraApp;
                const user = osliraApp?.user;
                const simpleAuth = window.SimpleAuth;
                
                if (user && simpleAuth?.supabase) {
                    console.log('✅ [DashboardCore] Authentication verified');
                    resolve(true);
                    return;
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ [DashboardCore] Authentication timeout');
                    resolve(false);
                    return;
                }
                
                setTimeout(checkAuth, 100);
            };
            
            checkAuth();
        });
    }
    
    /**
     * Check if error is schema-related
     */
    static isSchemaError(error) {
        return error.message && 
               error.message.includes('column') && 
               error.message.includes('does not exist');
    }
    
    /**
     * Handle database schema mismatch
     */
    static handleSchemaError(container) {
        console.warn('⚠️ [DashboardCore] Database schema mismatch detected');
        
        const stateManager = container.get('stateManager');
        stateManager.batchUpdate({
            leads: [],
            filteredLeads: [],
            isLoading: false,
            loadingMessage: 'Database schema update needed',
            error: 'The database structure has changed. Please contact support.'
        });
        
        if (window.Alert) {
            window.Alert.warning('Database structure has been updated. Some features may be limited.');
        }
    }
    
    /**
     * Display empty state when auth not ready
     */
    static displayEmptyState(stateManager) {
        stateManager.setState('leads', []);
        stateManager.setState('businesses', []);
        stateManager.setState('isLoading', false);
        stateManager.setState('loadingMessage', 'Authentication required');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardCore };
} else {
    window.DashboardCore = DashboardCore;
}
