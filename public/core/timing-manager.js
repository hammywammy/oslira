// =============================================================================
// TIMING MANAGER - CENTRALIZED INITIALIZATION CONTROL
// =============================================================================

class TimingManager {
    constructor() {
        this.initPhases = new Map();
        this.dependencies = new Map();
        this.completedPhases = new Set();
        this.initPromises = new Map();
        this.globalReadyState = 'initializing';
        
        this.setupInitPhases();
        console.log('🕐 [TimingManager] Initialized');
    }
    
setupInitPhases() {
    const currentPage = window.OsliraEnv?.CURRENT_PAGE || 'unknown';
    
    // Phase 1: Core Environment (all pages)
    this.addPhase('core', {
        order: 1,
        items: ['env-manager', 'config-manager', 'supabase'],
        dependencies: [],
        critical: true
    });
    
    // Phase 2: Authentication (all pages except public)
    this.addPhase('auth', {
        order: 2,
        items: ['auth-manager', 'simple-app'],
        dependencies: ['core'],
        critical: true
    });
    
    // Only add dashboard phases for dashboard page
    if (currentPage === 'dashboard') {
        // Phase 3: Dashboard Infrastructure
        this.addPhase('dashboard-core', {
            order: 3,
            items: [
                'DashboardCore',
                'DashboardErrorSystem', 
                'DashboardEventSystem',
                'dependency-container',
                'event-bus',
                'state-manager'
            ],
            dependencies: ['auth'],
            critical: true
        });
        
        // Phase 4: Business Logic
        this.addPhase('business-logic', {
            order: 4,
            items: [
                'business-manager',
                'lead-manager',
                'analysis-functions',
                'realtime-manager'
            ],
            dependencies: ['dashboard-core'],
            critical: true
        });
        
        // Phase 5: UI Components
        this.addPhase('ui-components', {
            order: 5,
            items: [
                'lead-renderer',
                'stats-calculator',
                'modal-manager',
                'dashboard-header',
                'leads-table',
                'stats-cards',
                'insights-panel'
            ],
            dependencies: ['business-logic'],
            critical: false
        });
        
        // Phase 6: Features
        this.addPhase('features', {
            order: 6,
            items: [
                'analysis-queue',
                'bulk-upload',
                'analysis-modal',
                'research-modal',
                'lead-analysis-handlers',
                'research-handlers'
            ],
            dependencies: ['ui-components'],
            critical: false
        });
    }
}
    
    addPhase(name, config) {
        this.initPhases.set(name, {
            ...config,
            status: 'pending',
            startTime: null,
            endTime: null,
            errors: []
        });
    }
    
    async executeInitialization() {
        console.log('🚀 [TimingManager] Starting centralized initialization');
        
        try {
            const phases = Array.from(this.initPhases.entries())
                .sort(([,a], [,b]) => a.order - b.order);
            
            for (const [phaseName, phaseConfig] of phases) {
                await this.executePhase(phaseName, phaseConfig);
            }
            
            this.globalReadyState = 'ready';
            this.dispatchReadyEvent();
            console.log('✅ [TimingManager] All phases completed successfully');
            
        } catch (error) {
            this.globalReadyState = 'error';
            console.error('❌ [TimingManager] Initialization failed:', error);
            throw error;
        }
    }
    
    async executePhase(phaseName, phaseConfig) {
        console.log(`🔄 [TimingManager] Starting phase: ${phaseName}`);
        
        // Wait for dependencies
        await this.waitForDependencies(phaseConfig.dependencies);
        
        phaseConfig.status = 'running';
        phaseConfig.startTime = Date.now();
        
        try {
            // Initialize all items in parallel within the phase
            const initPromises = phaseConfig.items.map(item => this.initializeItem(item));
            await Promise.all(initPromises);
            
            phaseConfig.status = 'completed';
            phaseConfig.endTime = Date.now();
            this.completedPhases.add(phaseName);
            
            const duration = phaseConfig.endTime - phaseConfig.startTime;
            console.log(`✅ [TimingManager] Phase ${phaseName} completed in ${duration}ms`);
            
        } catch (error) {
            phaseConfig.status = 'failed';
            phaseConfig.errors.push(error);
            
            if (phaseConfig.critical) {
                throw new Error(`Critical phase ${phaseName} failed: ${error.message}`);
            } else {
                console.warn(`⚠️ [TimingManager] Non-critical phase ${phaseName} failed:`, error);
            }
        }
    }
    
    async waitForDependencies(dependencies) {
        if (!dependencies || dependencies.length === 0) return;
        
        for (const dep of dependencies) {
            if (!this.completedPhases.has(dep)) {
                console.log(`⏳ [TimingManager] Waiting for dependency: ${dep}`);
                await this.waitForPhase(dep);
            }
        }
    }
    
    async waitForPhase(phaseName) {
        return new Promise((resolve, reject) => {
            const checkPhase = () => {
                const phase = this.initPhases.get(phaseName);
                
                if (phase.status === 'completed') {
                    resolve();
                } else if (phase.status === 'failed' && phase.critical) {
                    reject(new Error(`Critical dependency ${phaseName} failed`));
                } else {
                    setTimeout(checkPhase, 100);
                }
            };
            
            checkPhase();
        });
    }
    
    async initializeItem(itemName) {
        if (this.initPromises.has(itemName)) {
            return this.initPromises.get(itemName);
        }
        
        const promise = this.performItemInit(itemName);
        this.initPromises.set(itemName, promise);
        return promise;
    }
    
    async performItemInit(itemName) {
        console.log(`📦 [TimingManager] Initializing: ${itemName}`);
        
        try {
            // Wait for script to be loaded by ScriptLoader
            await this.waitForScript(itemName);
            
            // Perform item-specific initialization
            await this.initializeSpecificItem(itemName);
            
            console.log(`✅ [TimingManager] ${itemName} initialized`);
            
        } catch (error) {
            console.error(`❌ [TimingManager] ${itemName} initialization failed:`, error);
            throw error;
        }
    }
    
    async waitForScript(scriptName) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds
            
            const checkScript = () => {
                if (window.ScriptLoader?.isLoaded(scriptName)) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error(`Script ${scriptName} failed to load within timeout`));
                } else {
                    attempts++;
                    setTimeout(checkScript, 100);
                }
            };
            
            checkScript();
        });
    }
    
    async initializeSpecificItem(itemName) {
        // Supabase client resolution
        if (itemName === 'supabase') {
            await this.initializeSupabaseClient();
            return;
        }

        // Dashboard header needs special handling
if (itemName === 'dashboard-header') {
    await this.initializeDashboardHeader();
    return;
}
        
        // Authentication system
        if (itemName === 'auth-manager') {
            await this.waitForGlobal('OsliraAuth', 5000);
            return;
        }
        
        // Business manager initialization
        if (itemName === 'business-manager') {
            await this.initializeBusinessManager();
            return;
        }
        
        // Lead manager initialization  
        if (itemName === 'lead-manager') {
            await this.initializeLeadManager();
            return;
        }
        
// Simple-app needs special handling since it creates OsliraApp with user data
        if (itemName === 'simple-app') {
            await this.waitForSimpleApp();
            return;
        }
        
        // Default: just wait for global to be available
        const globalName = this.getGlobalName(itemName);
        if (globalName) {
            await this.waitForGlobal(globalName, 3000);
        }
    }
async waitForSimpleApp() {
    // First wait for OsliraSimpleApp to exist
    await this.waitForGlobal('OsliraSimpleApp', 3000);
    
    // Then manually initialize it since we control the timing
    try {
        console.log('🚀 [TimingManager] Manually initializing OsliraSimpleApp...');
        await window.OsliraSimpleApp.initialize();
        console.log('✅ [TimingManager] OsliraSimpleApp initialized');
        return;
    } catch (error) {
        console.error('❌ [TimingManager] Failed to initialize OsliraSimpleApp:', error);
        throw new Error('OsliraSimpleApp failed to initialize within timeout');
    }
}
    
    async initializeSupabaseClient() {
        let attempts = 0;
        while (attempts < 50) {
            if (window.SimpleAuth?.supabase && typeof window.SimpleAuth.supabase === 'function') {
                const client = window.SimpleAuth.supabase();
                if (client?.from && typeof client.from === 'function') {
                    window.OsliraSupabaseClient = client;
                    console.log('✅ [TimingManager] Supabase client resolved and registered');
                    return;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error('Supabase client resolution failed');
    }
    
    async initializeBusinessManager() {
        await this.waitForGlobal('BusinessManager', 3000);
        // Business manager should NOT auto-load data during init
        console.log('✅ [TimingManager] BusinessManager ready (data loading deferred)');
    }
    
    async initializeLeadManager() {
        await this.waitForGlobal('LeadManager', 3000);
        // Lead manager should NOT auto-load data during init
        console.log('✅ [TimingManager] LeadManager ready (data loading deferred)');
    }

    async initializeDashboardHeader() {
    await this.waitForGlobal('DashboardHeader', 3000);
    
    // Wait for container to have the header instance
    let attempts = 0;
    while (attempts < 50) {
        const container = window.dashboard?.container;
        const header = container?.get('dashboardHeader');
        if (header) {
            if (!header.initialized) {
                await header.initialize();
                console.log('✅ [TimingManager] DashboardHeader initialized properly');
            }
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    console.warn('⚠️ [TimingManager] DashboardHeader container instance not found');
}
    
    async waitForGlobal(globalName, timeout = 3000) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = timeout / 100;
            
            const checkGlobal = () => {
                if (window[globalName]) {
                    resolve(window[globalName]);
                } else if (attempts >= maxAttempts) {
                    reject(new Error(`Global ${globalName} not available within ${timeout}ms`));
                } else {
                    attempts++;
                    setTimeout(checkGlobal, 100);
                }
            };
            
            checkGlobal();
        });
    }
    
getGlobalName(scriptName) {
    const globalMappings = {
        'env-manager': 'OsliraEnv',
        'config-manager': 'OsliraConfig', 
        'auth-manager': 'OsliraAuth',
        'simple-app': 'OsliraSimpleApp', // Use OsliraSimpleApp directly, not alias
        'business-manager': 'BusinessManager',
        'lead-manager': 'LeadManager',
        'modal-manager': 'ModalManager'
    };
    
    return globalMappings[scriptName];
}
    
    dispatchReadyEvent() {
        const event = new CustomEvent('oslira:timing:ready', {
            detail: {
                phases: Array.from(this.initPhases.entries()),
                totalTime: this.getTotalInitTime(),
                readyState: this.globalReadyState
            }
        });
        
        window.dispatchEvent(event);
        console.log('📡 [TimingManager] Ready event dispatched');
    }
    
    getTotalInitTime() {
        const times = Array.from(this.initPhases.values())
            .filter(phase => phase.startTime && phase.endTime)
            .map(phase => phase.endTime - phase.startTime);
        
        return times.reduce((sum, time) => sum + time, 0);
    }
    
    // Public API for status checking
    isReady() {
        return this.globalReadyState === 'ready';
    }
    
    getPhaseStatus(phaseName) {
        return this.initPhases.get(phaseName)?.status || 'unknown';
    }
    
    getCompletedPhases() {
        return Array.from(this.completedPhases);
    }
}

// Global instance
window.OsliraTimingManager = new TimingManager();

// Auto-start when scripts are loaded
window.addEventListener('oslira:scripts:loaded', async () => {
    try {
        // Small delay to ensure all script globals are available
        await new Promise(resolve => setTimeout(resolve, 100));
        await window.OsliraTimingManager.executeInitialization();
    } catch (error) {
        console.error('❌ [TimingManager] Global initialization failed:', error);
    }
});
console.log('🕐 [TimingManager] Module loaded and ready');
