// =============================================================================
// TIMING MANAGER - CENTRALIZED INITIALIZATION CONTROL WITH CONFIG PHASE
// =============================================================================

class TimingManager {
    constructor() {
        this.initPhases = new Map();
        this.dependencies = new Map();
        this.completedPhases = new Set();
        this.initPromises = new Map();
        this.globalReadyState = 'initializing';
        
        this.setupInitPhases();
        console.log('🕐 [TimingManager] Initialized with config-fetch phase');
    }
    
    setupInitPhases() {
        const currentPage = window.OsliraEnv?.CURRENT_PAGE || 'unknown';
        
        // Phase 0: Bootstrap (env-manager already loaded by HTML)
        // env-manager.js is loaded directly in HTML before this script
        
        // Phase 1: Config Fetch - NEW PHASE
        this.addPhase('config-fetch', {
            order: 1,
            items: ['config-loader'], // Special marker for async config load
            dependencies: [],
            critical: true
        });
        
        // Phase 2: Core Environment (after config loaded)
        this.addPhase('core', {
            order: 2,
            items: ['config-manager', 'supabase'],
            dependencies: ['config-fetch'],
            critical: true
        });
        
        // Phase 3: Authentication (all pages except public)
        this.addPhase('auth', {
            order: 3,
            items: ['auth-manager', 'simple-app'],
            dependencies: ['core'],
            critical: true
        });
        
        // Only add dashboard phases for dashboard page
        if (currentPage === 'dashboard') {
            // Phase 4: Dashboard Infrastructure
            this.addPhase('dashboard-core', {
                order: 4,
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
            
            // Phase 5: Business Logic
            this.addPhase('business-logic', {
                order: 5,
                items: [
                    'business-manager',
                    'lead-manager',
                    'analysis-functions',
                    'realtime-manager'
                ],
                dependencies: ['dashboard-core'],
                critical: true
            });
            
            // Phase 6: UI Components
            this.addPhase('ui-components', {
                order: 6,
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
            
            // Phase 7: Features
            this.addPhase('features', {
                order: 7,
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
            // Special handling for config-fetch phase
            if (phaseName === 'config-fetch') {
                console.log('⏳ [TimingManager] Waiting for async config load...');
                await window.OsliraEnv.ready();
                console.log('✅ [TimingManager] Config loaded successfully');
            } else {
                // Initialize all items in parallel within the phase
                const initPromises = phaseConfig.items.map(item => this.initializeItem(item));
                await Promise.all(initPromises);
            }
            
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
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout waiting for ${itemName}`));
            }, 10000);
            
            const checkGlobal = () => {
                const globalName = this.getGlobalName(itemName);
                
                if (globalName && typeof window[globalName] !== 'undefined') {
                    clearTimeout(timeout);
                    console.log(`✓ [TimingManager] ${itemName} ready`);
                    resolve();
                } else if (itemName === 'config-loader') {
                    // Special case: config-loader doesn't have a global
                    clearTimeout(timeout);
                    resolve();
                } else {
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
            'simple-app': 'OsliraSimpleApp',
            'business-manager': 'BusinessManager',
            'lead-manager': 'LeadManager',
            'modal-manager': 'ModalManager',
            'supabase': 'supabase',
            'DashboardCore': 'DashboardCore',
            'DashboardErrorSystem': 'DashboardErrorSystem',
            'DashboardEventSystem': 'DashboardEventSystem',
            'dependency-container': 'DependencyContainer',
            'event-bus': 'EventBus',
            'state-manager': 'StateManager'
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
