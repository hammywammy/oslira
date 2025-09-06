// =============================================================================
// DASHBOARD.JS - Main Dashboard Controller with Modular Sidebar
// =============================================================================

class DashboardInitializer {
    constructor() {
        this.initialized = false;
        this.app = null;
    }
    
    async init() {
        if (this.initialized) return this;
        
        try {
            console.log('🚀 [Dashboard] Starting initialization...');
            
            // Verify all required modules are loaded
            this.verifyModules();
            
            // Initialize the dashboard application
            await this.initializeApp();
            
// Initialize modular sidebar
await this.initializeSidebar();
            
            // Setup global compatibility
            this.setupGlobalCompatibility();
            
            this.initialized = true;
            console.log('✅ [Dashboard] Initialization complete');
            
            return this;
            
        } catch (error) {
            console.error('❌ [Dashboard] Initialization failed:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }
    
async initializeApp() {
    console.log('📱 [Dashboard] Initializing dashboard app...');
    
    // Wait for OsliraApp to be available
    for (let i = 0; i < 50; i++) {
        if (window.OsliraApp?.user) {
            console.log('👤 [Dashboard] OsliraApp available with user data');
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!window.OsliraApp?.user) {
        throw new Error('OsliraApp not available or no user data');
    }
    
// Use the global DashboardApp (loaded via script loader)
try {
    if (!window.DashboardApp) {
        throw new Error('DashboardApp not available on window object');
    }
    
    this.app = new window.DashboardApp();
    await this.app.init();
    console.log('✅ [Dashboard] Dashboard app initialized');
} catch (error) {
    console.warn('⚠️ [Dashboard] DashboardApp not available, continuing without it:', error.message);
    // Create minimal app placeholder
    this.app = {
        container: null,
        initialized: true
    };
}
}
    
async initializeSidebar() {
    try {
        console.log('📋 [Dashboard] Initializing modular sidebar...');
        
        // Wait for SidebarManager to be available
        for (let i = 0; i < 50; i++) {
            if (window.SidebarManager) {
                console.log('✅ [Dashboard] SidebarManager found');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!window.SidebarManager) {
            console.warn('⚠️ [Dashboard] SidebarManager not available after waiting, skipping sidebar');
            return;
        }
        
        // Render sidebar with dashboard configuration
        window.SidebarManager.render('sidebar-container', {
            activePage: 'dashboard',
            showBusinessSelector: true,
            theme: 'default'
        });
        
        console.log('✅ [Dashboard] Sidebar initialized successfully');
        
    } catch (error) {
        console.error('❌ [Dashboard] Sidebar initialization failed:', error);
        // Don't throw - dashboard can work without sidebar
    }
}
    
    verifyModules() {
        const requiredModules = [
            { name: 'OsliraApp', path: 'window.OsliraApp' },
            { name: 'SimpleAuth', path: 'window.SimpleAuth' }
        ];
        
        const optionalModules = [
            { name: 'SidebarManager', path: 'window.SidebarManager' }
        ];
        
        const missing = [];
        
        requiredModules.forEach(module => {
            const obj = module.path.split('.').reduce((o, p) => o && o[p], window);
            if (!obj) {
                missing.push(module.name);
            }
        });
        
        if (missing.length > 0) {
            throw new Error(`Required modules not loaded: ${missing.join(', ')}`);
        }
        
        // Log optional modules
        optionalModules.forEach(module => {
            const obj = module.path.split('.').reduce((o, p) => o && o[p], window);
            if (!obj) {
                console.warn(`⚠️ [Dashboard] Optional module not available: ${module.name}`);
            }
        });
        
        console.log('✅ [Dashboard] Required modules verified');
    }
    
    setupGlobalCompatibility() {
        // Make dashboard functions available globally for HTML onclick handlers
        window.dashboard = {
            init: () => this.init(),
            showAnalysisModal: (username) => this.app.showAnalysisModal(username),
            showBulkModal: () => this.app.showBulkModal(),
            closeModal: (id) => this.app.closeModal(id),
            refreshStats: () => this.app.refreshStats(),
            copyText: (elementId) => this.app.copyText(elementId),
            editMessage: (leadId) => this.app.editMessage(leadId),
            saveEditedMessage: (leadId) => this.app.saveEditedMessage(leadId),
            handleAnalysisTypeChange: () => this.app.handleAnalysisTypeChange(),
            handleFileUpload: (event) => this.app.handleFileUpload(event),
            validateBulkForm: () => this.app.validateBulkForm(),
            processAnalysisForm: (event) => this.app.processAnalysisForm(event),
            processBulkUpload: () => this.app.processBulkUpload(),
            deleteLead: (leadId) => this.app.deleteLead(leadId),
            selectLead: (checkbox) => this.app.selectLead(checkbox),
            toggleAllLeads: (masterCheckbox) => this.app.toggleAllLeads(masterCheckbox),
            filterLeads: (filter) => this.app.filterLeads(filter),
            searchLeads: (term) => this.app.searchLeads(term),
            debugDashboard: () => this.app.debugDashboard(),
            _app: this.app
        };
        
        // Expose managers for debugging
        if (this.app?.container) {
            window.analysisQueue = this.app.container.get('analysisQueue');
            window.modalManager = this.app.container.get('modalManager');
            window.businessManager = this.app.container.get('businessManager');
        }
        
        console.log('✅ [Dashboard] Global compatibility established');
    }
    
    handleInitializationError(error) {
        console.error('💥 [Dashboard] Critical initialization error:', error);
        
        // Show user-friendly error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'dashboard-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h2>⚠️ Dashboard Loading Error</h2>
                <p>The dashboard failed to initialize properly.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <div class="error-actions">
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        🔄 Reload Page
                    </button>
                    <button onclick="window.location.href='/auth'" class="btn btn-secondary">
                        🔐 Return to Login
                    </button>
                </div>
            </div>
        `;
        
        // Replace dashboard content with error message
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.innerHTML = '';
            dashboard.appendChild(errorContainer);
        }
    }
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

const dashboardInitializer = new DashboardInitializer();

// Initialize immediately if DOM is ready, or when it becomes ready
const startDashboard = async () => {
    try {
        console.log('📄 [Dashboard] Starting dashboard auto-initialization...');
        
        const initializeDashboard = async () => {
            try {
                if (dashboardInitializer.initialized) {
                    console.log('📄 [Dashboard] Already initialized, skipping');
                    return;
                }
                console.log('📄 [Dashboard] Auto-initializing dashboard...');
                await dashboardInitializer.init();
            } catch (error) {
                console.error('❌ [Dashboard] Auto-initialization failed:', error);
            }
        };

// Enhanced dependency and DOM ready check
const checkReady = () => {
    const hasRequiredGlobals = window.OsliraApp && window.SimpleAuth;
    const isDOMReady = document.readyState === 'complete' || 
                       (document.readyState === 'interactive' && document.querySelector('.dashboard'));
    
    return hasRequiredGlobals && isDOMReady;
};

if (checkReady()) {
    console.log('📄 [Dashboard] All dependencies and DOM ready, initializing immediately');
    await initializeDashboard();
    return;
}
        
        // 2. Polling with shorter interval for faster response
        console.log('📄 [Dashboard] Setting up dependency polling...');
        const pollForDependencies = setInterval(async () => {
            if (window.OsliraApp && window.SimpleAuth && !dashboardInitializer.initialized) {
                console.log('📄 [Dashboard] Dependencies detected via polling, initializing...');
                clearInterval(pollForDependencies);
                await initializeDashboard();
            }
        }, 100); // Check every 100ms instead of 500ms
        
        // 3. Cleanup timeout after 10 seconds
        setTimeout(() => {
            clearInterval(pollForDependencies);
            if (!dashboardInitializer.initialized) {
                console.log('📄 [Dashboard] Polling timeout reached without initialization');
            }
        }, 10000);
        
    } catch (error) {
        console.error('❌ [Dashboard] Failed to start dashboard:', error);
    }
};

// Start immediately if DOM is ready, otherwise wait for it
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDashboard);
} else {
    // DOM already ready - start immediately
    startDashboard();
}

// Make dashboardInitializer available globally for debugging
window.dashboardInitializer = dashboardInitializer;

console.log('📊 Dashboard initializer ready');
