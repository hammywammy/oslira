//public/pages/dashboard/modules/core/DashboardCore.js

/**
 * DASHBOARD CORE - Clean Initialization System
 * Handles dependency resolution, authentication, and core setup
 */
class DashboardCore {

    /**
 * Wait for DOM element to exist
 */
static async waitForDOMElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}
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

// Initialize ResearchHandlers to set up global handlers
console.log('🔧 [DashboardCore] Initializing ResearchHandlers...');
if (window.ResearchHandlers) {
    new window.ResearchHandlers();
    console.log('✅ [DashboardCore] ResearchHandlers initialized');
} else {
    console.warn('⚠️ [DashboardCore] ResearchHandlers class not found');
}

// Dashboard Header initialized by TimingManager - just setup UI
console.log('🔧 [DashboardCore] Setting up Dashboard Header UI...');
const dashboardHeader = container.get('dashboardHeader');
if (dashboardHeader && dashboardHeader.renderHeader) {
    document.getElementById('dashboard-header').innerHTML = dashboardHeader.renderHeader();
    console.log('✅ [DashboardCore] Dashboard Header UI rendered');
} else {
    console.warn('⚠️ [DashboardCore] Dashboard Header not available');
}

// Populate ResearchModal with HTML content
console.log('🔧 [DashboardCore] Populating ResearchModal...');
if (window.ResearchModal) {
    const researchModal = new window.ResearchModal(container);
    const modalHTML = researchModal.renderModal();
    const modalContainer = document.getElementById('researchModal');
    if (modalContainer) {
        modalContainer.outerHTML = modalHTML;
        console.log('✅ [DashboardCore] ResearchModal populated with content');
} else {
    console.warn('⚠️ [DashboardCore] #researchModal container not found');
}
} else {
    console.warn('⚠️ [DashboardCore] ResearchModal class not found');
}

// Initialize and populate BulkModal
console.log('🔧 [DashboardCore] Populating BulkModal...');
if (window.BulkModal) {
    const bulkModal = new window.BulkModal(container);
    const modalHTML = bulkModal.renderBulkModal();
    const modalContainer = document.getElementById('bulkModal');
    if (modalContainer) {
        modalContainer.innerHTML = modalHTML;
        bulkModal.setupEventHandlers();
        console.log('✅ [DashboardCore] BulkModal populated with content');
    } else {
        console.warn('⚠️ [DashboardCore] #bulkModal container not found');
    }
} else {
    console.warn('⚠️ [DashboardCore] BulkModal class not found');
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
        // Render header with new split button
        const dashboardHeader = container.get('dashboardHeader');
        if (dashboardHeader && dashboardHeader.renderHeader) {
            document.getElementById('dashboard-header').innerHTML = dashboardHeader.renderHeader();
            // Setup header event handlers
            if (dashboardHeader.setupEventHandlers) {
                dashboardHeader.setupEventHandlers();
            }
        }
        
        // Render redesigned stats cards
        const statsCards = container.get('statsCards');
        if (statsCards) {
            if (statsCards.renderPriorityCards) {
                document.getElementById('priority-cards').innerHTML = statsCards.renderPriorityCards();
            }
            if (statsCards.renderPerformanceMetrics) {
                document.getElementById('performance-metrics').innerHTML = statsCards.renderPerformanceMetrics();
            }
            // Setup stats cards event handlers
            if (statsCards.setupEventHandlers) {
                statsCards.setupEventHandlers();
            }
        }
        
        // Render leads table with export functionality
        const leadsTable = container.get('leadsTable');
        if (leadsTable && leadsTable.renderTableContainer) {
            const leadsSection = document.getElementById('leads-section');
            if (leadsSection) {
                leadsSection.innerHTML = leadsTable.renderTableContainer();
                // Setup leads table event handlers
                if (leadsTable.setupEventHandlers) {
                    leadsTable.setupEventHandlers();
                }
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
        
        console.log('✅ [DashboardCore] Dashboard UI rendered with new components');
        
    } catch (error) {
        console.error('❌ [DashboardCore] UI rendering failed:', error);
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
