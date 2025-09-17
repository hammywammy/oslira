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
            
 // Wait for auth and load initial data
            await this.setupInitialData(container);
            
            // Trigger business loading after all dependencies are initialized
            const businessManager = container.get('businessManager');
            await businessManager.loadBusinesses();
            
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
            
            // Load data in sequence
            await this.loadInitialData(container);
            
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
     * Load dashboard data in proper sequence
     */
    static async loadInitialData(container) {
        const businessManager = container.get('businessManager');
        const realtimeManager = container.get('realtimeManager');
        const leadManager = container.get('leadManager');
        const statsCalculator = container.get('statsCalculator');
        
        // Load business profiles first
        await businessManager.loadBusinesses();
        
        // Setup real-time connections
        await realtimeManager.setupRealtimeSubscription();
        
        // Load dashboard data
        await leadManager.loadDashboardData();
        
        // Calculate initial stats
        await statsCalculator.refreshStats();
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
