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
            this.container.get('eventBus').emit(DASHBOARD_EVENTS.INIT_COMPLETE, {
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
        
        // State manager depends on event bus
        container.registerFactory('stateManager', (eventBus) => {
            return new DashboardStateManager(eventBus);
        }, ['eventBus']);
        
// Register external dependencies
        container.registerSingleton('supabase', window.supabase);
        
        // Register OsliraApp with lazy getter to handle timing
        container.registerFactory('osliraApp', () => {
            return window.OsliraApp;
        }, []);
        
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
    // INITIALIZATION HELPERS
    // ===============================================================================
    
    async setupInitialData() {
        try {
            console.log('📊 [DashboardApp] Setting up initial data...');
            // Wait for authentication
            const isAuthReady = await this.waitForAuth(10000);
            
            if (isAuthReady) {
                console.log('🔐 [DashboardApp] Authentication ready');
                
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
                
            } else {
                console.warn('⚠️ [DashboardApp] Authentication not ready, showing empty state');
                this.displayDemoState();
            }
            
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
                const osliraApp = this.container.get('osliraApp');
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
    // EVENT HANDLING
    // ===============================================================================
    
    setupGlobalEventHandlers() {
        const eventBus = this.container.get('eventBus');
        
        // Auth state changes
        if (window.OsliraApp?.events) {
            window.OsliraApp.events.addEventListener('userAuthenticated', async (event) => {
                console.log('🔐 [DashboardApp] User authenticated event received');
                eventBus.emit('auth:changed', { user: event.detail });
                await this.setupInitialData();
            });
            
            window.OsliraApp.events.addEventListener('userLoggedOut', () => {
                console.log('🔐 [DashboardApp] User logged out event received');
                eventBus.emit('auth:changed', { user: null });
                this.clearDashboardData();
            });
        }
        
        // Data refresh events
        eventBus.on(DASHBOARD_EVENTS.DATA_REFRESH, async (data) => {
            console.log('🔄 [DashboardApp] Data refresh requested:', data.reason);
            
            const leadManager = this.container.get('leadManager');
            const statsCalculator = this.container.get('statsCalculator');
            
            try {
                await leadManager.loadDashboardData();
                await statsCalculator.refreshStats();
            } catch (error) {
                console.error('❌ [DashboardApp] Data refresh failed:', error);
            }
        });
        
        // Analysis completion events
        eventBus.on(DASHBOARD_EVENTS.ANALYSIS_COMPLETED, async (data) => {
            console.log('🎉 [DashboardApp] Analysis completed:', data.username);
            
            // Refresh data after a short delay
            setTimeout(async () => {
                const leadManager = this.container.get('leadManager');
                await leadManager.loadDashboardData();
            }, 2000);
        });
        
        // Business changes
        eventBus.on(DASHBOARD_EVENTS.BUSINESS_CHANGED, async (data) => {
            console.log('🏢 [DashboardApp] Business changed, refreshing data');
            
            const leadManager = this.container.get('leadManager');
            const statsCalculator = this.container.get('statsCalculator');
            
            try {
                await leadManager.loadDashboardData();
                await statsCalculator.refreshStats();
            } catch (error) {
                console.error('❌ [DashboardApp] Business change refresh failed:', error);
            }
        });
        
        // Error handling
        eventBus.on(DASHBOARD_EVENTS.ERROR, (error) => {
            console.error('🚨 [DashboardApp] Global error:', error);
            this.handleGlobalError(error);
        });
        
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ [DashboardApp] Page became visible, checking for updates');
                eventBus.emit(DASHBOARD_EVENTS.DATA_REFRESH, {
                    reason: 'page_visible',
                    timestamp: Date.now()
                });
            }
        });
        
        console.log('✅ [DashboardApp] Global event handlers setup completed');
    }
    
    // ===============================================================================
    // LEGACY COMPATIBILITY LAYER
    // ===============================================================================
    
    setupLegacyCompatibility() {
        console.log('🔧 [DashboardApp] Setting up legacy compatibility...');
        
        // Create global dashboard object for backward compatibility with HTML onclick handlers
        window.dashboard = {
            // Lead management
            loadDashboardData: () => this.container.get('leadManager').loadDashboardData(),
            viewLead: (id) => this.container.get('modalManager').showLeadDetailsModal(id),
            viewLatestLead: (username) => this.container.get('leadManager').viewLatestLead(username),
            deleteLead: (id) => this.container.get('leadManager').deleteLead(id),
            bulkDeleteLeads: () => this.container.get('leadManager').bulkDeleteLeads(),
            
            // Selection
            toggleLeadSelection: (id) => this.container.get('leadManager').toggleLeadSelection(id),
            selectAllLeads: () => this.container.get('leadManager').selectAllLeads(),
            clearSelection: () => this.container.get('leadManager').clearSelection(),
            
            // Filtering
            filterLeads: (filter) => this.container.get('leadManager').filterLeads(filter),
            searchLeads: (term) => this.container.get('leadManager').searchLeads(term),
            
            // Modals
            showAnalysisModal: (username) => this.container.get('modalManager').showAnalysisModal(username),
            showBulkModal: () => this.container.get('modalManager').showBulkModal(),
            closeModal: (id) => this.container.get('modalManager').closeModal(id),
            
            // Stats
            refreshStats: () => this.container.get('statsCalculator').refreshStats(),
            
            // Business
            debugBusinessProfiles: () => this.container.get('businessManager').debugBusinessProfiles(),
            loadBusinessProfilesForModal: () => this.container.get('businessManager').loadBusinessProfilesForModal(),
            setDefaultBusinessProfile: () => this.container.get('businessManager').setDefaultBusinessProfile(),
            
            // Utilities
            copyText: (elementId) => this.copyText(elementId),
            editMessage: (leadId) => this.editMessage(leadId),
            saveEditedMessage: (leadId) => this.saveEditedMessage(leadId),
            
            // Modal handlers
            handleAnalysisTypeChange: () => this.container.get('modalManager').handleAnalysisTypeChange(),
            handleFileUpload: (event) => this.container.get('modalManager').handleFileUpload(event),
            validateBulkForm: () => this.container.get('modalManager').validateBulkForm(),
            
            // Form processing
            processAnalysisForm: (event) => this.processAnalysisForm(event),
            processBulkUpload: () => this.processBulkUpload(),
            
            // Internal references (for debugging)
            _app: this,
            _container: this.container
        };
        
        // Global analysis queue reference
        window.analysisQueue = this.container.get('analysisQueue');
        
        // Global modal manager reference
        window.modalManager = this.container.get('modalManager');
        
        // Global business manager reference
        window.businessManager = this.container.get('businessManager');
        
        console.log('✅ [DashboardApp] Legacy compatibility layer established');
    }
    
    // ===============================================================================
    // FORM PROCESSING - EXTRACTED FROM ORIGINAL
    // ===============================================================================
    
    async processAnalysisForm(event) {
        event?.preventDefault();
        
        const analysisType = document.getElementById('analysis-type')?.value;
        const profileInput = document.getElementById('profile-input')?.value?.trim();
        const businessId = document.getElementById('business-id')?.value;
        
        if (!analysisType || !profileInput || !businessId) {
            this.container.get('osliraApp')?.showMessage('Please fill in all fields', 'error');
            return;
        }
        
        try {
            console.log('📤 [DashboardApp] Processing analysis form submission');
            
            const user = this.container.get('osliraApp')?.user;
            const supabase = this.container.get('supabase');
            const session = await supabase.auth.getSession();
            
            if (!session?.data?.session?.access_token) {
                throw new Error('Session expired');
            }
            
            const cleanUsername = profileInput.replace(/^@/, '');
            
            // Close modal
            this.container.get('modalManager').closeModal('analysisModal');
            
            // Prepare request data
            const requestData = {
                username: cleanUsername,
                analysis_type: analysisType,
                business_id: businessId,
                user_id: user.id,
                platform: 'instagram'
            };
            
            console.log('📤 [DashboardApp] Starting analysis via queue system:', {
                username: cleanUsername,
                type: analysisType,
                businessId
            });
            
            // Use the analysis queue
            const analysisQueue = this.container.get('analysisQueue');
            const result = await analysisQueue.startSingleAnalysis(
                cleanUsername,
                analysisType,
                businessId,
                requestData
            );
            
            if (result.success) {
                console.log('✅ [DashboardApp] Analysis successfully queued');
                this.container.get('osliraApp')?.showMessage(
                    `Analysis started for @${cleanUsername}`,
                    'success'
                );
            }
            
        } catch (error) {
            console.error('❌ [DashboardApp] Analysis form processing failed:', error);
            this.container.get('osliraApp')?.showMessage(
                `Analysis failed: ${error.message}`,
                'error'
            );
        }
    }
    
    async processBulkUpload() {
        try {
            console.log('📁 [DashboardApp] Processing bulk upload');
            
            const modalManager = this.container.get('modalManager');
            const analysisType = document.getElementById('bulk-analysis-type')?.value;
            const businessId = document.getElementById('bulk-business-id')?.value;
            const usernames = modalManager.bulkUsernames || [];
            
            if (!analysisType || !businessId || usernames.length === 0) {
                throw new Error('Please complete all required fields');
            }
            
            // Close modal
            modalManager.closeModal('bulkModal');
            
            // Convert usernames to lead objects
            const leads = usernames.map(username => ({ username }));
            
            // Use the analysis queue for bulk processing
            const analysisQueue = this.container.get('analysisQueue');
            const result = await analysisQueue.startBulkAnalysis(leads, analysisType, businessId);
            
            this.container.get('osliraApp')?.showMessage(
                `Bulk analysis started: ${leads.length} profiles queued`,
                'success'
            );
            
            console.log('✅ [DashboardApp] Bulk upload initiated:', result);
            
        } catch (error) {
            console.error('❌ [DashboardApp] Bulk upload failed:', error);
            this.container.get('osliraApp')?.showMessage(
                `Bulk upload failed: ${error.message}`,
                'error'
            );
        }
    }
    
    // ===============================================================================
    // UTILITY METHODS
    // ===============================================================================
    
    copyText(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const text = element.textContent || element.innerText;
        
        navigator.clipboard.writeText(text).then(() => {
            this.container.get('osliraApp')?.showMessage('Copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            this.container.get('osliraApp')?.showMessage('Copied to clipboard!', 'success');
        });
    }
    
    editMessage(leadId) {
        const messageElement = document.getElementById(`outreach-message-${leadId}`);
        if (!messageElement) return;
        
        const currentText = messageElement.textContent || messageElement.innerText;
        
        messageElement.innerHTML = `
            <textarea id="edit-message-${leadId}" 
                      style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; font-size: inherit;">
                ${currentText.trim()}
            </textarea>
            <div style="margin-top: 12px; text-align: right;">
                <button onclick="dashboard.saveEditedMessage('${leadId}')" class="btn btn-primary btn-sm">
                    Save Changes
                </button>
                <button onclick="location.reload()" class="btn btn-secondary btn-sm">
                    Cancel
                </button>
            </div>
        `;
        
        const textarea = document.getElementById(`edit-message-${leadId}`);
        if (textarea) {
            textarea.focus();
        }
    }
    
    saveEditedMessage(leadId) {
        const textarea = document.getElementById(`edit-message-${leadId}`);
        if (!textarea) return;
        
        const newMessage = textarea.value.trim();
        if (!newMessage) {
            this.container.get('osliraApp')?.showMessage('Message cannot be empty', 'error');
            return;
        }
        
        // Here you would typically save to the database
        // For now, just update the UI
        const messageElement = document.getElementById(`outreach-message-${leadId}`);
        if (messageElement) {
            messageElement.innerHTML = newMessage.replace(/\n/g, '<br>');
            this.container.get('osliraApp')?.showMessage('Message updated!', 'success');
        }
    }
    
    // ===============================================================================
    // STATE MANAGEMENT
    // ===============================================================================
    
    displayDemoState() {
        console.log('📋 [DashboardApp] Displaying demo/empty state');
        
        const leadRenderer = this.container.get('leadRenderer');
        leadRenderer.displayLeads([]);
        
        const statsCalculator = this.container.get('statsCalculator');
        const defaultStats = statsCalculator.getDefaultStats();
        statsCalculator.renderStats(defaultStats);
    }
    
    displayErrorState(error) {
        console.error('🚨 [DashboardApp] Displaying error state:', error);
        
        const tableBody = document.getElementById('activity-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 60px;">
                        <div style="font-size: 32px; margin-bottom: 16px;">⚠️</div>
                        <h3 style="margin: 0 0 8px 0; color: var(--error);">Error Loading Dashboard</h3>
                        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">${error.message}</p>
                        <button onclick="location.reload()" class="btn btn-primary">
                            🔄 Reload Page
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    clearDashboardData() {
        console.log('🧹 [DashboardApp] Clearing dashboard data');
        
        const leadManager = this.container.get('leadManager');
        leadManager.clearData();
        
        const statsCalculator = this.container.get('statsCalculator');
        statsCalculator.clearStatsCache();
        
        this.displayDemoState();
    }
    
    // ===============================================================================
    // ERROR HANDLING
    // ===============================================================================
    
    handleInitializationError(error) {
        console.error('🚨 [DashboardApp] Initialization error:', error);
        
        // Show user-friendly error message
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;">
                <div style="text-align: center; max-width: 600px;">
                    <div style="font-size: 48px; margin-bottom: 24px;">😞</div>
                    <h2 style="color: #dc2626; margin-bottom: 16px;">Dashboard Failed to Load</h2>
                    <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.5;">
                        We're sorry, but the dashboard couldn't initialize properly. This might be due to a temporary issue.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="location.reload()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                            🔄 Reload Page
                        </button>
                        <button onclick="window.location.href='/'" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                            🏠 Go Home
                        </button>
                    </div>
                    <details style="margin-top: 24px; text-align: left; background: #f9fafb; padding: 16px; border-radius: 8px;">
                        <summary style="cursor: pointer; font-weight: 500; margin-bottom: 8px;">Technical Details</summary>
                        <pre style="font-size: 12px; color: #374151; overflow-x: auto;">${error.stack || error.message}</pre>
                    </details>
                </div>
            </div>
        `;
    }
    
    handleGlobalError(error) {
        // Log error for debugging
        console.error('🚨 [DashboardApp] Global error:', error);
        
        // Show user notification
        if (error.source !== 'realtime') { // Don't spam for realtime errors
            this.container.get('osliraApp')?.showMessage(
                `Error: ${error.error || error.message}`,
                'error'
            );
        }
    }
    
    // ===============================================================================
    // PUBLIC API & DEBUGGING
    // ===============================================================================
    
    getDashboardStatus() {
        return {
            initialized: this.initialized,
            initTime: this.initialized ? Date.now() - this.initStartTime : null,
            moduleCount: this.container?.list().length || 0,
            dependencies: this.container?.getStatus() || {},
            leads: this.container?.get('stateManager')?.getState('leads')?.length || 0,
            isAuthenticated: !!this.container?.get('osliraApp')?.user,
            hasRealtime: this.container?.get('stateManager')?.getState('isRealtimeActive') || false
        };
    }
    
    debugDashboard() {
        const status = this.getDashboardStatus();
        console.table(status);
        
        const stateManager = this.container?.get('stateManager');
        if (stateManager) {
            const summary = stateManager.getStateSummary();
            console.log('📊 State Summary:', summary);
        }
        
        return status;
    }
    
    // ===============================================================================
    // CLEANUP
    // ===============================================================================
    
    async cleanup() {
        console.log('🧹 [DashboardApp] Starting cleanup...');
        
        try {
            // Emit cleanup event
            this.container?.get('eventBus')?.emit(DASHBOARD_EVENTS.CLEANUP);
            
            // Cleanup container and all modules
            if (this.container) {
                await this.container.cleanup();
                this.container = null;
            }
            
            // Clear global references
            delete window.dashboard;
            delete window.analysisQueue;
            delete window.modalManager;
            delete window.businessManager;
            
            this.initialized = false;
            
            console.log('✅ [DashboardApp] Cleanup completed');
            
        } catch (error) {
            console.error('❌ [DashboardApp] Cleanup failed:', error);
        }
    }

    copyText(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.textContent || element.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        this.container.get('osliraApp')?.showMessage('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        this.container.get('osliraApp')?.showMessage('Copied to clipboard!', 'success');
    });
}

editMessage(leadId) {
    // Delegate to modal manager
    this.container.get('modalManager').editMessage(leadId);
}

saveEditedMessage(leadId) {
    // Delegate to modal manager
    this.container.get('modalManager').saveEditedMessage(leadId);
}

deleteLead(leadId) {
    // Delegate to lead manager
    this.container.get('leadManager').deleteLead(leadId);
}

selectLead(checkbox) {
    // Delegate to lead manager
    this.container.get('leadManager').selectLead(checkbox);
}

toggleAllLeads(masterCheckbox) {
    // Delegate to lead manager
    this.container.get('leadManager').toggleAllLeads(masterCheckbox);
}

debugDashboard() {
    const state = this.container.get('stateManager').getStateSummary();
    console.table(state);
    return state;
}

async processAnalysisForm(event) {
    // This should already exist - check if it's there
    // If missing, delegate to modal manager
    return this.container.get('modalManager').processAnalysisForm(event);
}

async processBulkUpload() {
    // This should already exist - check if it's there  
    // If missing, delegate to modal manager
    return this.container.get('modalManager').processBulkUpload();
}
// ===============================================================================
    // GLOBAL COMPATIBILITY METHODS - FOR HTML ONCLICK HANDLERS
    // ===============================================================================
    
    showAnalysisModal(username = null) {
        return this.container.get('modalManager').showAnalysisModal(username);
    }
    
    showBulkModal() {
        return this.container.get('modalManager').showBulkModal();
    }
    
    closeModal(modalId) {
        return this.container.get('modalManager').closeModal(modalId);
    }
    
    filterLeads(filter) {
        return this.container.get('leadManager').filterLeads(filter);
    }
    
    searchLeads(term) {
        return this.container.get('leadManager').searchLeads(term);
    }
    
    refreshStats() {
        return this.container.get('statsCalculator').refreshStats();
    }
    
    refreshInsights() {
        // For now, just reload dashboard data
        return this.container.get('leadManager').loadDashboardData();
    }
    
    handleAnalysisTypeChange() {
        return this.container.get('modalManager').handleAnalysisTypeChange();
    }
    
    handleFileUpload(event) {
        return this.container.get('modalManager').handleFileUpload(event);
    }
    
    validateBulkForm() {
        return this.container.get('modalManager').validateBulkForm();
    }
    
    processAnalysisForm(event) {
        return this.container.get('modalManager').processAnalysisForm(event);
    }
    
    processBulkUpload() {
        return this.container.get('modalManager').processBulkUpload();
    }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardApp };
} else {
    window.DashboardApp = DashboardApp;
}
