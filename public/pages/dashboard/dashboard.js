//public/pages/dashboard/dashboard.js

/**
 * OSLIRA DASHBOARD - WORKS WITH SCRIPT LOADER
 * 
 * Simple and clean. Script loader handles all module loading,
 * this just initializes the already-loaded modules.
 */ 

class Dashboard {
    constructor() {
        this.app = null;
        this.initialized = false;
        this.initStartTime = Date.now();
        
        console.log('🚀 [Dashboard] Dashboard controller ready');
    }
    
    async init() {
        if (this.initialized) {
            console.log('⚠️ [Dashboard] Already initialized');
            return;
        }
        
        try {
            console.log('🔧 [Dashboard] Starting dashboard initialization...');
            
            // All modules should be loaded by script loader at this point
            this.verifyModulesLoaded();
            
            // Create and initialize the main dashboard app
            this.app = new DashboardApp();
            await this.app.init();
            
// Setup global compatibility for HTML onclick handlers
this.setupGlobalCompatibility();

// Update sidebar with user information
this.updateSidebarUserInfo();

this.initialized = true;
const totalTime = Date.now() - this.initStartTime;

console.log(`✅ [Dashboard] Dashboard initialized successfully in ${totalTime}ms`);

if (window.OsliraApp?.showMessage) {
    window.OsliraApp.showMessage('Dashboard loaded successfully', 'success');
}
            
        } catch (error) {
            console.error('❌ [Dashboard] Initialization failed:', error);
            this.handleInitializationFailure(error);
            throw error;
        }
    }
    
    verifyModulesLoaded() {
        const requiredModules = [
            'DashboardEventBus', 'DashboardStateManager', 'DependencyContainer',
            'LeadManager', 'LeadRenderer', 'AnalysisQueue', 'RealtimeManager',
            'StatsCalculator', 'BusinessManager', 'ModalManager', 'DashboardApp'
        ];
        
        const missing = requiredModules.filter(module => !window[module]);
        
        if (missing.length > 0) {
            throw new Error(`Missing modules: ${missing.join(', ')}. Script loader may have failed.`);
        }
        
        console.log('✅ [Dashboard] All modules verified and ready');
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
    
updateSidebarUserInfo() {
    try {
        const user = window.OsliraApp?.user;
        if (!user) {
            console.warn('⚠️ [Dashboard] No user data available for sidebar update');
            return;
        }

        console.log('🔄 [Dashboard] Updating sidebar with user info...');

        // Update subscription plan
        const planElement = document.getElementById('sidebar-plan');
        if (planElement) {
            const planName = this.formatPlanName(user.subscription_plan || 'free');
            planElement.textContent = planName;
        }

        // Update credits display
        const creditsElement = document.getElementById('sidebar-billing');
        if (creditsElement) {
            const credits = user.credits || 0;
            const creditClass = credits < 5 ? 'credits-free' : 'credits-paid';
            creditsElement.innerHTML = `
                <span class="${creditClass}">${credits} credits remaining</span>
            `;
        }

        // Update user email
        const emailElement = document.getElementById('user-email');
        if (emailElement) {
            emailElement.textContent = user.email || 'No email';
        }

        // Setup logout functionality
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        console.log('✅ [Dashboard] Sidebar user info updated');

    } catch (error) {
        console.error('❌ [Dashboard] Failed to update sidebar user info:', error);
    }
}

formatPlanName(plan) {
    const planNames = {
        'free': 'Free Plan',
        'basic': 'Basic Plan', 
        'pro': 'Pro Plan',
        'premium': 'Premium Plan',
        'enterprise': 'Enterprise Plan'
    };
    
    return planNames[plan.toLowerCase()] || 'Free Plan';
}

async handleLogout() {
    try {
        console.log('🚪 [Dashboard] Logging out user...');
        
        if (window.SimpleAuth) {
            await window.SimpleAuth.signOut();
        }
        
        // Clear any cached data
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to auth page
        window.location.href = '/auth';
        
    } catch (error) {
        console.error('❌ [Dashboard] Logout failed:', error);
        // Force redirect anyway
        window.location.href = '/auth';
    }
}

handleInitializationFailure(error) {
    console.error('🚨 [Dashboard] Initialization failed:', error);
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #ef4444; color: white; padding: 24px; border-radius: 12px;
        max-width: 500px; text-align: center; z-index: 10000;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;
    errorDiv.innerHTML = `
        <h3 style="margin: 0 0 12px 0;">Dashboard Failed to Load</h3>
        <p style="margin: 0 0 16px 0;">${error.message}</p>
        <button onclick="window.location.reload()" style="
            background: white; color: #ef4444; border: none;
            padding: 8px 16px; border-radius: 6px; cursor: pointer;
        ">Reload Page</button>
    `;
    document.body.appendChild(errorDiv);
}

// Initialize when script loader is done
window.addEventListener('oslira:scripts:loaded', async (event) => {
    if (event.detail.page === 'dashboard') {
        console.log('🎯 [Dashboard] Script loader finished, initializing dashboard...');
        try {
            window.dashboard = new Dashboard();
            await window.dashboard.init();
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
        }
    }
});

// Fallback for direct access
if (document.readyState === 'complete') {
    setTimeout(async () => {
        if (!window.dashboard) {
            console.log('🔄 [Dashboard] Fallback initialization...');
            try {
                window.dashboard = new Dashboard();
                await window.dashboard.init();
            } catch (error) {
                console.error('❌ Dashboard fallback failed:', error);
            }
        }
    }, 500);
}

console.log('📱 Dashboard controller loaded, waiting for script loader...');
