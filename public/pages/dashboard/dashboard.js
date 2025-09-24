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
            
            // Set global reference for onclick handlers after successful initialization
            if (this.app && this.app.container) {
                try {
                    window.analysisQueue = this.app.container.get('analysisQueue');
                    console.log('✅ [Dashboard] Global analysisQueue reference set');
                } catch (error) {
                    console.warn('⚠️ [Dashboard] Failed to set global analysisQueue:', error.message);
                }
            }
            
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
            
            // Wait for sidebarManager to be available
            for (let i = 0; i < 50; i++) {
                if (window.sidebarManager) {
                    console.log('✅ [Dashboard] SidebarManager found');
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (!window.sidebarManager) {
                console.warn('⚠️ [Dashboard] SidebarManager not available after waiting, skipping sidebar');
                return;
            }
            
            // Render sidebar with correct selector
            await window.sidebarManager.render('#sidebar-container');
            
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
        // Create comprehensive global dashboard interface
        window.dashboard = {
            // Core initialization
            init: () => this.init(),
            
            // Modal Management
            showAnalysisModal: (username = '') => {
                console.log('🔍 [Dashboard] Global showAnalysisModal called with:', username);
                try {
                    if (this.app?.showAnalysisModal) {
                        return this.app.showAnalysisModal(username);
                    }
                    
                    // Fallback: direct modal opening
                    const modal = document.getElementById('analysisModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        
                        // Prefill username if provided
                        if (username) {
                            const usernameInput = document.getElementById('username');
                            const analysisType = document.getElementById('analysis-type');
                            const inputContainer = document.getElementById('input-field-container');
                            
                            if (usernameInput) usernameInput.value = username;
                            if (analysisType) analysisType.value = 'profile';
                            if (inputContainer) inputContainer.style.display = 'block';
                        }
                        
                        console.log('✅ [Dashboard] Analysis modal opened via fallback');
                    } else {
                        console.error('❌ [Dashboard] Analysis modal element not found');
                    }
                } catch (error) {
                    console.error('❌ [Dashboard] showAnalysisModal failed:', error);
                }
            },
            
            showBulkModal: () => {
                console.log('📁 [Dashboard] Global showBulkModal called');
                try {
                    if (this.app?.showBulkModal) {
                        return this.app.showBulkModal();
                    }
                    
                    // Fallback: direct modal opening
                    const modal = document.getElementById('bulkModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        console.log('✅ [Dashboard] Bulk modal opened via fallback');
                    }
                } catch (error) {
                    console.error('❌ [Dashboard] showBulkModal failed:', error);
                }
            },
            
            closeModal: (modalId) => {
                console.log('❌ [Dashboard] Global closeModal called with:', modalId);
                try {
                    if (this.app?.closeModal) {
                        return this.app.closeModal(modalId);
                    }
                    
                    // Fallback: direct modal closing
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.style.display = 'none';
                        console.log(`✅ [Dashboard] Modal ${modalId} closed via fallback`);
                    }
                } catch (error) {
                    console.error('❌ [Dashboard] closeModal failed:', error);
                }
            },
            
            // Form Handlers
            submitAnalysis: async () => {
                console.log('🔍 [Dashboard] Global submitAnalysis called');
                
                const form = document.getElementById('analysisForm');
                const submitBtn = document.getElementById('analysis-submit-btn');
                const analysisType = document.getElementById('analysis-type')?.value;
                const username = document.getElementById('username')?.value;
                
                // Validation
                if (!analysisType) {
                    this.showAlert('Please select an analysis type', 'error');
                    return;
                }
                
                if (analysisType === 'profile' && !username?.trim()) {
                    this.showAlert('Please enter a username', 'error');
                    return;
                }
                
                let originalText = 'Start Analysis';
                
                try {
                    // Update button state
                    if (submitBtn) {
                        originalText = submitBtn.textContent;
                        submitBtn.textContent = 'Processing...';
                        submitBtn.disabled = true;
                    }
                    
                    // Get configuration
                    const config = await window.OsliraConfig.getConfig();
                    const session = window.SimpleAuth.getCurrentSession();
                    
                    if (!session?.access_token) {
                        throw new Error('Authentication required');
                    }
                    
                    // Submit analysis
                    const response = await fetch(`${config.workerUrl}/analyze/single`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            username: username?.trim(),
                            analysis_type: analysisType
                        })
                    });
                    
                    if (response.ok) {
                        this.showAlert('Analysis started! Results will appear in your dashboard.', 'success');
                        this.closeModal('analysisModal');
                        
                        // Refresh dashboard if possible
                        if (this.app?.refreshLeads) {
                            setTimeout(() => this.app.refreshLeads(), 2000);
                        }
                    } else {
                        const errorText = await response.text();
                        throw new Error(errorText || `Server error: ${response.status}`);
                    }
                    
                } catch (error) {
                    console.error('❌ [Dashboard] Analysis submission failed:', error);
                    this.showAlert(error.message || 'Analysis failed. Please try again.', 'error');
                } finally {
                    // Reset button state
                    if (submitBtn) {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    }
                }
            },
            
            // Lead Management
            deleteLead: (leadId) => {
                console.log('🗑️ [Dashboard] Global deleteLead called with:', leadId);
                try {
                    if (this.app?.deleteLead) {
                        return this.app.deleteLead(leadId);
                    }
                    console.warn('❌ [Dashboard] deleteLead not available in app');
                } catch (error) {
                    console.error('❌ [Dashboard] deleteLead failed:', error);
                }
            },
            
            selectLead: (checkbox) => {
                try {
                    if (this.app?.selectLead) {
                        return this.app.selectLead(checkbox);
                    }
                } catch (error) {
                    console.error('❌ [Dashboard] selectLead failed:', error);
                }
            },
            
            toggleAllLeads: (masterCheckbox) => {
                try {
                    if (this.app?.toggleAllLeads) {
                        return this.app.toggleAllLeads(masterCheckbox);
                    }
                } catch (error) {
                    console.error('❌ [Dashboard] toggleAllLeads failed:', error);
                }
            },
            
            // Filtering and Search
            filterLeads: (filter) => {
                try {
                    if (this.app?.filterLeads) {
                        return this.app.filterLeads(filter);
                    }
                } catch (error) {
                    console.error('❌ [Dashboard] filterLeads failed:', error);
                }
            },
            
            searchLeads: (term) => {
                try {
                    if (this.app?.searchLeads) {
                        return this.app.searchLeads(term);
                    }
                } catch (error) {
                    console.error('❌ [Dashboard] searchLeads failed:', error);
                }
            },
            
            // Bulk Operations
            processBulkUpload: () => {
                console.log('📁 [Dashboard] Global processBulkUpload called');
                try {
                    if (this.app?.processBulkUpload) {
                        return this.app.processBulkUpload();
                    }
                    console.warn('❌ [Dashboard] processBulkUpload not available in app');
                } catch (error) {
                    console.error('❌ [Dashboard] processBulkUpload failed:', error);
                }
            },
            
            // Utility Methods
            showAlert: (message, type = 'info') => {
                if (window.Alert) {
                    switch (type) {
                        case 'error':
                            window.Alert.error(message);
                            break;
                        case 'success':
                            window.Alert.success(message);
                            break;
                        default:
                            window.Alert.info(message);
                    }
                } else {
                    // Fallback to browser alert
                    alert(message);
                }
            },
            
            refreshData: async () => {
                console.log('🔄 [Dashboard] Global refreshData called');
                try {
                    if (this.app?.refreshLeads) {
                        await this.app.refreshLeads();
                        console.log('✅ [Dashboard] Data refreshed');
                    } else {
                        console.warn('❌ [Dashboard] refreshLeads not available');
                    }
                } catch (error) {
                    console.error('❌ [Dashboard] refreshData failed:', error);
                }
            },
            
            // Debug and Development
            debugDashboard: () => {
                console.log('🐛 [Dashboard] Debug info:', {
                    app: !!this.app,
                    appMethods: this.app ? Object.keys(this.app) : [],
                    container: !!this.app?.container,
                    modules: this.app?.container ? {
                        modalManager: !!this.app.container.get('modalManager'),
                        businessManager: !!this.app.container.get('businessManager'),
                        leadManager: !!this.app.container.get('leadManager')
                    } : 'No container'
                });
                
                if (this.app?.debugDashboard) {
                    return this.app.debugDashboard();
                }
            },
            
            // Internal reference for advanced usage
            _app: this.app,
            _initializer: this
        };
        
        // Expose debugging utilities
        if (this.app?.container) {
            window.debugUtils = {
                analysisQueue: this.app.container.get('analysisQueue'),
                modalManager: this.app.container.get('modalManager'),
                businessManager: this.app.container.get('businessManager'),
                leadManager: this.app.container.get('leadManager'),
                stateManager: this.app.container.get('stateManager')
            };
            console.log('🐛 [Dashboard] Debug utilities exposed as window.debugUtils');
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
        console.log('📄 [Dashboard] Dashboard initializer ready');
        
        // Initialization will be controlled by TimingManager
        window.addEventListener('oslira:timing:ready', () => {
            console.log('📄 [Dashboard] TimingManager ready, dashboard can proceed');
        });
        
        // 2. Polling with shorter interval for faster response
        console.log('📄 [Dashboard] Setting up dependency polling...');
        const pollForDependencies = setInterval(async () => {
            if (window.OsliraApp && window.SimpleAuth && !dashboardInitializer.initialized) {
                console.log('📄 [Dashboard] Dependencies detected via polling, initializing...');
                clearInterval(pollForDependencies);
                await dashboardInitializer.init();
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
