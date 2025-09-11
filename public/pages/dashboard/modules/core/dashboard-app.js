//public/pages/dashboard/modules/core/dashboard-app.js

/**
 * OSLIRA DASHBOARD APP CONTROLLER
 * Main orchestrator that coordinates all dashboard modules
 * Replaces the monolithic dashboard.js with clean modular architecture
 */
class DashboardApp {
    constructor() {
        this.container = null;
        this.initialized = false;
        this.initStartTime = Date.now();
        
        console.log('🚀 [DashboardApp] Starting initialization...');
    }
    
    async init() {
        try {
            if (this.initialized) {
                console.log('⚠️ [DashboardApp] Already initialized');
                return;
            }
            
            console.log('🔧 [DashboardApp] Setting up dependency container...');
            
            // Create and setup dependency container
            this.container = this.setupDependencyContainer();
            
            // Validate container setup
            const validation = this.container.validate();
            if (!validation.valid) {
                throw new Error('Dependency validation failed: ' + JSON.stringify(validation.issues));
            }
            
            // Pre-resolve async dependencies BEFORE module initialization
            console.log('🔧 [DashboardApp] Pre-resolving async dependencies...');
            await this.preResolveAsyncDependencies();
            
            // Initialize all modules
            console.log('🔄 [DashboardApp] Initializing modules...');
            await this.container.initialize();
            
            // Setup global event handlers
            this.setupGlobalEventHandlers();
            
            // Setup legacy compatibility layer
            this.setupLegacyCompatibility();
            
            // Wait for auth and load initial data
            await this.setupInitialData();
            
            this.initialized = true;
            const initTime = Date.now() - this.initStartTime;
            
            console.log(`✅ [DashboardApp] Initialization completed in ${initTime}ms`);
            
            // Emit initialization complete event
            this.container.get('eventBus').emit(window.DASHBOARD_EVENTS.INIT_COMPLETE, {
                initTime,
                moduleCount: this.container.list().length
            });
            
        } catch (error) {
            console.error('❌ [DashboardApp] Initialization failed:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }
    
    // ===============================================================================
    // DEPENDENCY CONTAINER SETUP
    // ===============================================================================
    
    setupDependencyContainer() {
        const container = new DependencyContainer();
        
        // Register core infrastructure
        console.log('📋 [DashboardApp] Registering core dependencies...');
        container.registerSingleton('eventBus', new DashboardEventBus());

        // Analysis Functions - must call init() to setup global methods
container.registerFactory('analysisFunctions', () => {
    const instance = new window.AnalysisFunctions(container);
    instance.init(); // This sets up the global methods including openLeadAnalysisModal
    return instance;
});
        
        // State manager depends on event bus
        container.registerFactory('stateManager', (eventBus) => {
            return new DashboardStateManager(eventBus);
        }, ['eventBus']);
        
        // Register external dependencies - delay Supabase until SimpleAuth is ready
        container.registerFactory('supabase', async () => {
            // Wait for SimpleAuth to initialize its Supabase client
            let attempts = 0;
            while (attempts < 50) {
                if (window.SimpleAuth?.supabase && typeof window.SimpleAuth.supabase === 'function') {
                    const client = window.SimpleAuth.supabase();
                    if (client?.from) {
                        console.log('✅ [DependencyContainer] Got initialized Supabase client from SimpleAuth');
                        return window.SimpleAuth.supabase();
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            throw new Error('SimpleAuth Supabase client not ready');
        }, []);

        // Register OsliraApp as a getter that always checks the global
        container.registerSingleton('osliraApp', new Proxy({}, {
            get(target, prop) {
                if (!window.OsliraApp) {
                    throw new Error('OsliraApp not initialized');
                }
                return window.OsliraApp[prop];
            },
            has(target, prop) {
                return window.OsliraApp && prop in window.OsliraApp;
            }
        }));
        
        // Register API wrapper if available
        if (window.OsliraApp?.api) {
            container.registerSingleton('api', window.OsliraApp.api);
        }
        
        // Register feature modules
        console.log('📋 [DashboardApp] Registering feature modules...');
        
        container.registerFactory('leadManager', () => {
            return new LeadManager(container);
        }, []);
        
        container.registerFactory('analysisQueue', () => {
            return new AnalysisQueue(container);
        }, []);

        container.registerFactory('realtimeManager', () => {
            return new RealtimeManager(container);
        }, []);

        container.registerFactory('leadRenderer', () => {
            return new LeadRenderer(container);
        }, []);

        container.registerFactory('statsCalculator', () => {
            return new StatsCalculator(container);
        }, []);

        container.registerFactory('businessManager', () => {
            return new BusinessManager(container);
        }, []);

        container.registerFactory('modalManager', () => {
            return new ModalManager(container);
        }, []);
        
        console.log('✅ [DashboardApp] All dependencies registered');
        return container;
    }
    
    // ===============================================================================
    // ASYNC DEPENDENCY RESOLUTION
    // ===============================================================================
    
    async preResolveAsyncDependencies() {
        try {
            // Pre-resolve the Supabase client before any modules try to use it
            console.log('🔄 [DashboardApp] Resolving Supabase dependency...');
            
            // Wait for SimpleAuth to initialize its Supabase client
            let attempts = 0;
            let supabase = null;
            
            while (attempts < 50) {
                if (window.SimpleAuth?.supabase && typeof window.SimpleAuth.supabase === 'function') {
                    const client = window.SimpleAuth.supabase();
                    if (client?.from) {
                        supabase = window.SimpleAuth.supabase();
                        console.log('✅ [DashboardApp] Got initialized Supabase client from SimpleAuth');
                        break;
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!supabase) {
                throw new Error('SimpleAuth Supabase client not ready after timeout');
            }
            
            // Replace the async factory with the resolved instance
            this.container.registerSingleton('supabase', supabase);
            
            console.log('✅ [DashboardApp] Supabase dependency resolved and cached');
            
        } catch (error) {
            console.error('❌ [DashboardApp] Failed to resolve async dependencies:', error);
            throw error;
        }
    }
    
    // ===============================================================================
    // INITIALIZATION HELPERS
    // ===============================================================================
    
    async setupInitialData() {
        try {
            console.log('📊 [DashboardApp] Setting up initial data...');
            
            // Initialize state defaults FIRST
            const stateManager = this.container.get('stateManager');
            stateManager.batchUpdate({
                'pageSize': 25,
                'currentPage': 1,
                'filteredLeads': [],
                'visibleLeads': [],
                'selectedLeads': new Set()
            });
            
            // Wait for authentication AND user data
            const isAuthReady = await this.waitForAuth(10000);
            
            if (!isAuthReady) {
                console.warn('⚠️ [DashboardApp] Authentication not ready, showing empty state');
                this.displayDemoState();
                return;
            }
            
            // Ensure OsliraApp is properly initialized with user data
            const osliraApp = this.container.get('osliraApp');
            if (!osliraApp?.user) {
                console.warn('⚠️ [DashboardApp] User data not available in OsliraApp');
                throw new Error('User data not loaded');
            }
            
            console.log('✅ [DashboardApp] Authentication verified');
            console.log('🔐 [DashboardApp] Authentication ready');
            console.log('👤 [DashboardApp] User data available:', osliraApp.user.email);
            
            // Load business profiles first
            const businessManager = this.container.get('businessManager');
            await businessManager.loadBusinesses();
            
            // Setup real-time connections
            const realtimeManager = this.container.get('realtimeManager');
            await realtimeManager.setupRealtimeSubscription();
            
            // Load dashboard data
            const leadManager = this.container.get('leadManager');
            await leadManager.loadDashboardData();
            
            // Calculate initial stats
            const statsCalculator = this.container.get('statsCalculator');
            await statsCalculator.refreshStats();
            
        } catch (error) {
            console.error('❌ [DashboardApp] Initial data setup failed:', error);
            this.displayErrorState(error);
        }
    }
    
    async waitForAuth(timeout = 10000) {
        console.log('🔐 [DashboardApp] Waiting for authentication...');
        
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = timeout / 100;
            
            const checkAuth = () => {
                // Check window.OsliraApp directly instead of cached dependency
                const osliraApp = window.OsliraApp;
                const user = osliraApp?.user;
                const supabase = this.container.get('supabase');
                
                if (user && supabase) {
                    console.log('✅ [DashboardApp] Authentication verified');
                    resolve(true);
                    return;
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ [DashboardApp] Authentication timeout');
                    resolve(false);
                    return;
                }
                
                setTimeout(checkAuth, 100);
            };
            
            checkAuth();
        });
    }
    
    // ===============================================================================
    // GLOBAL EVENT HANDLERS
    // ===============================================================================
    
    setupGlobalEventHandlers() {
        const eventBus = this.container.get('eventBus');
        
        // Data refresh events
        eventBus.on(window.DASHBOARD_EVENTS.DATA_REFRESH, async (data) => {
            console.log('🔄 [DashboardApp] Data refresh requested:', data.reason);
            try {
                const leadManager = this.container.get('leadManager');
                await leadManager.loadDashboardData();
                
                eventBus.emit(window.DASHBOARD_EVENTS.DATA_REFRESH, {
                    reason: data.reason,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('❌ [DashboardApp] Data refresh failed:', error);
                eventBus.emit(window.DASHBOARD_EVENTS.DATA_ERROR, error);
            }
        });
        
        // Analysis completion events
        eventBus.on(window.DASHBOARD_EVENTS.ANALYSIS_COMPLETED, async (data) => {
            console.log('🎯 [DashboardApp] Analysis completed:', data.username);
            
            // Refresh dashboard data
            const leadManager = this.container.get('leadManager');
            await leadManager.loadDashboardData();
            
            // Update stats
            const statsCalculator = this.container.get('statsCalculator');
            await statsCalculator.refreshStats();
        });
        
        // Business change events
        eventBus.on(window.DASHBOARD_EVENTS.BUSINESS_CHANGED, async (data) => {
            console.log('🏢 [DashboardApp] Business changed:', data.businessId);
            
            // Reload all business-dependent data
            const leadManager = this.container.get('leadManager');
            await leadManager.loadDashboardData();
            
            const statsCalculator = this.container.get('statsCalculator');
            await statsCalculator.refreshStats();
        });
        
        // Global error handler
        eventBus.on(window.DASHBOARD_EVENTS.ERROR, (data) => {
            console.log('🚨 [DashboardApp] Global error:', data);
            this.handleGlobalError(data);
        });
        
        console.log('✅ [DashboardApp] Global event handlers setup completed');
    }
    
    setupLegacyCompatibility() {
        console.log('🔧 [DashboardApp] Setting up legacy compatibility...');
        
        // Expose dashboard methods globally for HTML onclick handlers
        const globalMethods = {
            // Analysis modal
            showAnalysisModal: (username) => this.showAnalysisModal(username),
            closeModal: (modalId) => this.closeModal(modalId),
            
            // Bulk upload modal
            showBulkModal: () => this.showBulkModal(),
            handleFileUpload: (event) => this.handleFileUpload(event),
            processBulkUpload: () => this.processBulkUpload(),
            validateBulkForm: () => this.validateBulkForm(),

            // Lead management
            deleteLead: (leadId) => this.deleteLead(leadId),
            selectLead: (checkbox) => this.selectLead(checkbox),
            toggleAllLeads: (masterCheckbox) => this.toggleAllLeads(masterCheckbox),
            toggleLeadSelection: (leadId, checked) => {
                const leadManager = this.container.get('leadManager');
                return leadManager.toggleLeadSelection(leadId);
            },
            refreshLeads: () => {
                const leadManager = this.container.get('leadManager');
                return leadManager.loadDashboardData();
            },
            toggleActionMenu: (leadId, button) => {
                const menu = button.nextElementSibling;
                if (menu) {
                    const isVisible = menu.classList.contains('opacity-100');
                    
                    // Close all other menus first
                    document.querySelectorAll('.action-menu').forEach(m => {
                        m.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
                        m.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
                    });
                    
                    // Toggle current menu
                    if (!isVisible) {
                        menu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
                        menu.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
                    }
                }
            },
            showBulkActions: () => {
                // Toggle bulk selection mode
                const toolbar = document.getElementById('bulk-actions-toolbar');
                const isVisible = !toolbar.classList.contains('hidden');
                
                if (isVisible) {
                    // Hide bulk actions and clear selection
                    toolbar.classList.add('hidden');
                    const leadManager = this.container.get('leadManager');
                    leadManager.clearSelection();
                } else {
                    // Show bulk actions
                    toolbar.classList.remove('hidden');
                }
            },
            openLeadDetails: (leadId) => {
                console.log(`🔍 [Dashboard] Opening lead details for: ${leadId}`);
                // Future: Open lead details modal/page
                const modalManager = this.container.get('modalManager');
                return modalManager.showLeadDetailsModal(leadId);
            },
            // Pagination functionality
            changePageSize: (size) => {
                const stateManager = this.container.get('stateManager');
                stateManager.setState('pageSize', parseInt(size));
                stateManager.setState('currentPage', 1); // Reset to first page
                this.updatePagination();
            },
            previousPage: () => {
                const stateManager = this.container.get('stateManager');
                const currentPage = stateManager.getState('currentPage') || 1;
                if (currentPage > 1) {
                    stateManager.setState('currentPage', currentPage - 1);
                    this.updatePagination();
                }
            },
            nextPage: () => {
                const stateManager = this.container.get('stateManager');
                const currentPage = stateManager.getState('currentPage') || 1;
                const totalPages = this.calculateTotalPages();
                if (currentPage < totalPages) {
                    stateManager.setState('currentPage', currentPage + 1);
                    this.updatePagination();
                }
            },
            // Missing action functions from the HTML
            copyUsername: (username) => {
                navigator.clipboard.writeText(username).then(() => {
                    console.log(`📋 [Dashboard] Username copied: ${username}`);
                    if (window.OsliraApp?.showMessage) {
                        window.OsliraApp.showMessage(`Username @${username} copied to clipboard`, 'success');
                    }
                }).catch(err => {
                    console.error('❌ [Dashboard] Failed to copy username:', err);
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = username;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                });
            },
            openProfile: (profileUrl) => {
                window.open(profileUrl, '_blank');
                console.log(`🔗 [Dashboard] Opened profile: ${profileUrl}`);
            },
            exportLead: (leadId) => {
                const stateManager = this.container.get('stateManager');
                const leads = stateManager.getState('leads') || [];
                const lead = leads.find(l => l.id === leadId);
                
                if (lead) {
                    const exportData = {
                        username: lead.username,
                        full_name: lead.full_name,
                        platform: lead.platform,
                        followers_count: lead.followers_count,
                        intelligence_score: lead.intelligence_score,
                        analysis_type: lead.analysis_type,
                        created_at: lead.created_at
                    };
                    
                    const dataStr = JSON.stringify(exportData, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `lead-${lead.username}-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                    
                    console.log(`📥 [Dashboard] Lead exported: ${lead.username}`);
                } else {
                    console.error(`❌ [Dashboard] Lead not found for export: ${leadId}`);
                }
            },
            editMessage: (leadId) => this.editMessage(leadId),
            saveEditedMessage: (leadId) => this.saveEditedMessage(leadId),
            
            // Search and filtering - ENHANCED with real functionality
            searchLeads: (term) => {
                const stateManager = this.container.get('stateManager');
                const allLeads = stateManager.getState('leads') || [];
                
                if (!term.trim()) {
                    stateManager.setState('filteredLeads', allLeads);
                    return;
                }
                
                const searchTerm = term.toLowerCase();
                const filtered = allLeads.filter(lead => {
                    const username = (lead.username || '').toLowerCase();
                    const fullName = (lead.full_name || '').toLowerCase();
                    
                    return username.includes(searchTerm) || fullName.includes(searchTerm);
                });
                
                stateManager.setState('filteredLeads', filtered);
                
                // Update clear button state
                this.updateClearButtonState();
            },
            filterLeads: (filter) => this.filterLeads(filter),
            clearFilters: () => {
                // Clear all form inputs
                const searchInput = document.getElementById('lead-search-input');
                const platformFilter = document.getElementById('platform-filter');
                const typeFilter = document.getElementById('type-filter');
                
                if (searchInput) searchInput.value = '';
                if (platformFilter) platformFilter.value = '';
                if (typeFilter) typeFilter.value = '';
                
                // Reset filter buttons
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
                
                // Reset state to show all leads
                const stateManager = this.container.get('stateManager');
                const allLeads = stateManager.getState('leads') || [];
                stateManager.setState('filteredLeads', allLeads);
                
                // Update clear button state
                this.updateClearButtonState();
                
                console.log('🧹 [Dashboard] All filters cleared');
            },
            updateClearButtonState: () => {
                const clearBtn = document.getElementById('clear-filters');
                const searchInput = document.getElementById('lead-search-input');
                const platformFilter = document.getElementById('platform-filter');
                const typeFilter = document.getElementById('type-filter');
                
                const hasFilters = (searchInput?.value) || 
                                 (platformFilter?.value) || 
                                 (typeFilter?.value) ||
                                 document.querySelector('.filter-btn.active:not([data-filter="all"])');
                
                if (clearBtn) {
                    if (hasFilters) {
                        clearBtn.disabled = false;
                        clearBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    } else {
                        clearBtn.disabled = true;
                        clearBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    }
                }
            },
            
            // Analysis form
            processAnalysisForm: (event) => this.processAnalysisForm(event),
            handleAnalysisTypeChange: () => this.handleAnalysisTypeChange(),
            
            // Utilities
            copyText: (elementId) => this.copyText(elementId),
            refreshStats: () => this.refreshStats(),
            debugDashboard: () => this.debugDashboard(),
            
            // Internal access
            _app: this,
            _container: this.container
        };
        
        // Merge with existing global methods
        window.dashboard = { ...window.dashboard, ...globalMethods };
        
        // Expose individual managers for debugging
        window.leadManager = this.container.get('leadManager');
        window.analysisQueue = this.container.get('analysisQueue');
        window.modalManager = this.container.get('modalManager');
        window.businessManager = this.container.get('businessManager');
        window.realtimeManager = this.container.get('realtimeManager');
        window.statsCalculator = this.container.get('statsCalculator');
        window.stateManager = this.container.get('stateManager');
        window.eventBus = this.container.get('eventBus');
        
        console.log('✅ [DashboardApp] Legacy compatibility layer established');
    }
    
    // ===============================================================================
    // ERROR HANDLING
    // ===============================================================================
    
    handleInitializationError(error) {
        console.error('🚨 [DashboardApp] Initialization error:', error);
        
        // Try to show user-friendly error
        try {
            if (window.OsliraApp?.showMessage) {
                window.OsliraApp.showMessage('Dashboard failed to load. Please refresh the page.', 'error');
            }
        } catch (e) {
            console.error('Failed to show error message:', e);
        }
        
        // Show fallback error state
        this.displayErrorState(error);
    }
    
    handleGlobalError(errorData) {
        const { source, error } = errorData;
        
        console.log(`🚨 [DashboardApp] Global error: ${JSON.stringify(errorData)}`);
        
        // Handle specific error types
        switch (source) {
            case 'business':
                // Business loading failed - continue with empty state
                console.warn('⚠️ [DashboardApp] Business loading failed, continuing...');
                break;
                
            case 'leads':
                // Lead loading failed - show error state
                this.displayLoadingError('Failed to load leads');
                break;
                
            case 'analysis':
                // Analysis failed - show specific message
                if (window.OsliraApp?.showMessage) {
                    window.OsliraApp.showMessage('Analysis failed. Please try again.', 'error');
                }
                break;
                
            default:
                // Generic error handling
                console.error('Unhandled error:', error);
        }
        
        // Emit error event for other components
        if (this.container) {
            try {
                const eventBus = this.container.get('eventBus');
                eventBus.emit(window.DASHBOARD_EVENTS.ERROR, errorData);
            } catch (e) {
                console.error('Failed to emit error event:', e);
            }
        }
    }
    
    displayErrorState(error) {
        console.log('🚨 [DashboardApp] Displaying error state:', error);
        
        const container = document.querySelector('.dashboard-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-state">
                <div class="error-content">
                    <h2>Something went wrong</h2>
                    <p>We're having trouble loading your dashboard.</p>
                    <details>
                        <summary>Error details</summary>
                        <pre>${error.message}</pre>
                    </details>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        Reload Page
                    </button>
                </div>
            </div>
        `;
    }
    
    displayDemoState() {
        console.log('📊 [DashboardApp] Displaying demo state');
        
        const stateManager = this.container.get('stateManager');
        stateManager.setState('leads', []);
        stateManager.setState('businesses', []);
        stateManager.setState('isLoading', false);
        stateManager.setState('loadingMessage', 'Demo mode - limited functionality');
    }
    
    displayLoadingError(message) {
        if (window.OsliraApp?.showMessage) {
            window.OsliraApp.showMessage(message, 'error');
        }
        
        const stateManager = this.container.get('stateManager');
        stateManager.setState('isLoading', false);
        stateManager.setState('loadingMessage', message);
    }
    
    // ===============================================================================
    // PUBLIC METHODS - Legacy compatibility methods
    // ===============================================================================
    
    async showAnalysisModal(username) {
        console.log('🔍 [DashboardApp] showAnalysisModal called with:', username);
        try {
            const modalManager = this.container.get('modalManager');
            if (!modalManager) {
                console.error('❌ [DashboardApp] modalManager not found in container');
                // Fallback: open modal directly
                const modal = document.getElementById('analysisModal');
                if (modal) {
                    modal.style.display = 'flex';
                    console.log('✅ [DashboardApp] Opened modal via fallback');
                }
                return;
            }
            return modalManager.showAnalysisModal(username);
        } catch (error) {
            console.error('❌ [DashboardApp] showAnalysisModal failed:', error);
            // Emergency fallback
            const modal = document.getElementById('analysisModal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('✅ [DashboardApp] Emergency fallback modal opened');
            }
        }
    }
    
    async showBulkModal() {
        const modalManager = this.container.get('modalManager');
        return modalManager.showBulkModal();
    }
    
    closeModal(modalId) {
        const modalManager = this.container.get('modalManager');
        return modalManager.closeModal(modalId);
    }
    
    async deleteLead(leadId) {
        const leadManager = this.container.get('leadManager');
        return leadManager.deleteLead(leadId);
    }
    
    selectLead(checkbox) {
        const leadRenderer = this.container.get('leadRenderer');
        return leadRenderer.selectLead(checkbox);
    }
    
    toggleAllLeads(masterCheckbox) {
        const leadRenderer = this.container.get('leadRenderer');
        return leadRenderer.toggleAllLeads(masterCheckbox);
    }
    
    searchLeads(term) {
        const leadRenderer = this.container.get('leadRenderer');
        return leadRenderer.searchLeads(term);
    }
    
    filterLeads(filter) {
        const leadRenderer = this.container.get('leadRenderer');
        return leadRenderer.filterLeads(filter);
    }
    
    editMessage(leadId) {
        const leadRenderer = this.container.get('leadRenderer');
        return leadRenderer.editMessage(leadId);
    }
    
    saveEditedMessage(leadId) {
        const leadRenderer = this.container.get('leadRenderer');
        return leadRenderer.saveEditedMessage(leadId);
    }
    
    async processAnalysisForm(event) {
        const analysisQueue = this.container.get('analysisQueue');
        return analysisQueue.processAnalysisForm(event);
    }
    
    handleAnalysisTypeChange() {
        const modalManager = this.container.get('modalManager');
        return modalManager.handleAnalysisTypeChange();
    }
    
    handleFileUpload(event) {
        const modalManager = this.container.get('modalManager');
        return modalManager.handleFileUpload(event);
    }
    
    validateBulkForm() {
        const modalManager = this.container.get('modalManager');
        return modalManager.validateBulkForm();
    }
    
    async processBulkUpload() {
        const analysisQueue = this.container.get('analysisQueue');
        return analysisQueue.processBulkUpload();
    }
    
    copyText(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return false;
        
        const textArea = document.createElement('textarea');
        textArea.value = element.textContent || element.innerText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (window.OsliraApp?.showMessage) {
            window.OsliraApp.showMessage('Text copied to clipboard', 'success');
        }
        
        return true;
    }
    
    async refreshStats() {
        const statsCalculator = this.container.get('statsCalculator');
        return statsCalculator.refreshStats();
    }

    debugDashboard() {
        const stateManager = this.container.get('stateManager');
        return stateManager.debugState();
    }
    
    calculateTotalPages() {
        const stateManager = this.container.get('stateManager');
        const filteredLeads = stateManager.getState('filteredLeads') || [];
        const pageSize = stateManager.getState('pageSize') || 25;
        return Math.ceil(filteredLeads.length / pageSize);
    }
    
    updatePagination() {
        const stateManager = this.container.get('stateManager');
        const filteredLeads = stateManager.getState('filteredLeads') || [];
        const pageSize = stateManager.getState('pageSize') || 25;
        const currentPage = stateManager.getState('currentPage') || 1;
        
        const totalPages = this.calculateTotalPages();
        const startIndex = (currentPage - 1) * pageSize;
        const visibleLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
        
        // Update visible leads
        stateManager.setState('visibleLeads', visibleLeads);
        
        // Update UI elements
        const currentPageEl = document.getElementById('current-page');
        const totalPagesEl = document.getElementById('total-pages');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (currentPageEl) currentPageEl.textContent = currentPage;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;
        
        // Update button states
        if (prevBtn) {
            prevBtn.disabled = currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = currentPage >= totalPages;
        }
        
        console.log(`📄 [Dashboard] Pagination updated: Page ${currentPage}/${totalPages}, showing ${visibleLeads.length} leads`);
    }
    
    // ===============================================================================
    // CLEANUP
    // ===============================================================================
    
    async cleanup() {
        console.log('🧹 [DashboardApp] Starting cleanup...');
        
        if (this.container) {
            await this.container.cleanup();
        }
        
        // Clear global references
        delete window.dashboard;
        delete window.leadManager;
        delete window.analysisQueue;
        delete window.modalManager;
        delete window.businessManager;
        delete window.realtimeManager;
        delete window.statsCalculator;
        delete window.stateManager;
        delete window.eventBus;
        
        this.initialized = false;
        console.log('✅ [DashboardApp] Cleanup completed');
    }
}

// Export for use in other modules - restore original pattern
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardApp };
} else {
    window.DashboardApp = DashboardApp;
}
