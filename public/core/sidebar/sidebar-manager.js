// =============================================================================
// SIDEBAR-MANAGER.JS - Modular Sidebar Implementation
// =============================================================================

class SidebarManager {
    constructor() {
        this.initialized = false;
        this.currentConfig = null;
        this.businessManager = null;
        this.eventListeners = [];
    }
    
    // =========================================================================
    // MAIN RENDER METHOD
    // =========================================================================
    
    render(container, config = {}) {
        try {
            console.log('🎨 [SidebarManager] Rendering sidebar...');
            
            this.currentConfig = {
                activePage: 'dashboard',
                showBusinessSelector: true,
                customMenuItems: [],
                theme: 'default',
                ...config
            };
            
            // Get container element
            const targetElement = typeof container === 'string' 
                ? document.getElementById(container) 
                : container;
                
            if (!targetElement) {
                throw new Error(`Container element not found: ${container}`);
            }
            
            // Inject sidebar HTML
            targetElement.innerHTML = this.getSidebarHTML();
            targetElement.className = 'sidebar';
            
            // Initialize functionality
            this.initializeSidebar();
            
            console.log('✅ [SidebarManager] Sidebar rendered successfully');
            return this;
            
        } catch (error) {
            console.error('❌ [SidebarManager] Render failed:', error);
            throw error;
        }
    }
    
    // =========================================================================
    // HTML TEMPLATE
    // =========================================================================
    
    getSidebarHTML() {
        return `
            <div class="logo">
                <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" class="logo-image">
                Oslira
            </div>
            
            <!-- Business Selector -->
            <div class="business-selector">
                <h4>Active Business</h4>
                <select id="business-select" aria-label="Select active business">
                    <option value="">Loading businesses...</option>
                </select>
            </div>
            
            <!-- Navigation Menu -->
            <nav class="menu">
                <div class="menu-section">
                    <h4>Main</h4>
                    <a href="/dashboard" data-page="dashboard">
                        <span class="icon">📊</span>
                        Dashboard
                    </a>
                    <a href="/leads" data-page="leads">
                        <span class="icon">🔍</span>
                        Lead Research
                    </a>
                    <a href="/analytics" data-page="analytics">
                        <span class="icon">📈</span>
                        Analytics
                    </a>
                </div>
                
                <div class="menu-section">
                    <h4>Tools</h4>
                    <a href="/campaigns" data-page="campaigns">
                        <span class="icon">🚀</span>
                        Campaigns
                    </a>
                    <a href="/messages" data-page="messages">
                        <span class="icon">💬</span>
                        Messages
                    </a>
                    <a href="/integrations" data-page="integrations">
                        <span class="icon">🔗</span>
                        Integrations
                    </a>
                </div>
                
                <div class="menu-section">
                    <h4>Account</h4>
                    <a href="/subscription" data-page="subscription">
                        <span class="icon">💳</span>
                        <span id="sidebar-plan">Plan</span>
                    </a>
                    <a href="/settings" data-page="settings">
                        <span class="icon">⚙️</span>
                        Settings
                    </a>
                </div>
            </nav>
            
            <!-- User Info -->
            <div class="user-info">
                <div class="user-details">
                    <div class="user-email" id="sidebar-email">Loading...</div>
                    <div class="user-credits" id="sidebar-billing">
                        <span class="credits-amount" id="sidebar-credits">--</span>
                        <span class="credits-label">credits</span>
                    </div>
                </div>
                
                <button onclick="window.SimpleAuth?.signOut()" class="logout-btn" aria-label="Sign out">
                    <span class="icon">🚪</span>
                </button>
            </div>
        `;
    }
    
    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    
    async initializeSidebar() {
        // Wait for required systems
        await this.waitForDependencies();
        
        // Connect to business manager
        this.connectToBusinessManager();
        
        // Update user info
        this.updateUserInfo();
        
        // Set active menu item
        this.setActiveMenuItem(this.currentConfig.activePage);
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('✅ [SidebarManager] Initialization complete');
    }
    
    async waitForDependencies() {
        // Wait for OsliraApp
        for (let i = 0; i < 50; i++) {
            if (window.OsliraApp?.user) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!window.OsliraApp?.user) {
            throw new Error('OsliraApp not available');
        }
    }
    
    connectToBusinessManager() {
        // Try to get BusinessManager from dashboard container
        if (window.dashboard?._app?.container) {
            this.businessManager = window.dashboard._app.container.get('businessManager');
            console.log('✅ [SidebarManager] Connected to BusinessManager');
        } else {
            console.warn('⚠️ [SidebarManager] BusinessManager not available');
        }
    }
    
    // =========================================================================
    // USER INFO UPDATE
    // =========================================================================
    
    updateUserInfo() {
        try {
            const user = window.OsliraApp?.user;
            if (!user) {
                console.warn('⚠️ [SidebarManager] No user data available');
                return;
            }

            console.log('🔄 [SidebarManager] Updating user info...');

            // Update email
            const emailElement = document.getElementById('sidebar-email');
            if (emailElement) {
                emailElement.textContent = user.email || 'No email';
            }

            // Update subscription plan
            const planElement = document.getElementById('sidebar-plan');
            if (planElement) {
                const planName = this.formatPlanName(user.subscription_plan || 'free');
                planElement.textContent = planName;
            }

            // Update credits display
            const creditsElement = document.getElementById('sidebar-credits');
            if (creditsElement) {
                const credits = user.credits || 0;
                creditsElement.textContent = credits;
                
                // Add warning class for low credits
                const creditClass = credits < 5 ? 'low-credits' : '';
                creditsElement.className = `credits-amount ${creditClass}`;
            }

            console.log('✅ [SidebarManager] User info updated');
            
        } catch (error) {
            console.error('❌ [SidebarManager] Failed to update user info:', error);
        }
    }
    
    formatPlanName(plan) {
        const planMap = {
            'free': 'Free',
            'starter': 'Starter',
            'professional': 'Pro',
            'enterprise': 'Enterprise'
        };
        return planMap[plan] || 'Plan';
    }
    
    // =========================================================================
    // NAVIGATION CONTROL
    // =========================================================================
    
    setActiveMenuItem(pageId) {
        // Remove active class from all menu items
        const menuItems = document.querySelectorAll('.sidebar .menu a');
        menuItems.forEach(item => item.classList.remove('active'));
        
        // Add active class to current page
        const activeItem = document.querySelector(`.sidebar .menu a[data-page="${pageId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            console.log(`🎯 [SidebarManager] Active menu item set: ${pageId}`);
        }
    }
    
    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================
    
    setupEventListeners() {
        // Listen for business changes
        if (this.businessManager?.eventBus) {
            const handleBusinessChange = (event) => {
                console.log('🔄 [SidebarManager] Business changed, updating sidebar...');
                // Business selector is automatically updated by BusinessManager
            };
            
            this.businessManager.eventBus.on('business:changed', handleBusinessChange);
            this.eventListeners.push({
                target: this.businessManager.eventBus,
                event: 'business:changed',
                handler: handleBusinessChange
            });
        }
        
        // Listen for user data changes
        const handleUserUpdate = () => {
            this.updateUserInfo();
        };
        
        window.addEventListener('user:updated', handleUserUpdate);
        this.eventListeners.push({
            target: window,
            event: 'user:updated',
            handler: handleUserUpdate
        });
    }
    
    // =========================================================================
    // UPDATE METHODS
    // =========================================================================
    
    updateUserCredits(newCredits) {
        const creditsElement = document.getElementById('sidebar-credits');
        if (creditsElement) {
            creditsElement.textContent = newCredits;
            const creditClass = newCredits < 5 ? 'low-credits' : '';
            creditsElement.className = `credits-amount ${creditClass}`;
        }
    }
    
    updateSubscriptionPlan(planName) {
        const planElement = document.getElementById('sidebar-plan');
        if (planElement) {
            planElement.textContent = this.formatPlanName(planName);
        }
    }
    
    // =========================================================================
    // CLEANUP
    // =========================================================================
    
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach(({ target, event, handler }) => {
            if (target.off) {
                target.off(event, handler);
            } else {
                target.removeEventListener(event, handler);
            }
        });
        
        this.eventListeners = [];
        this.businessManager = null;
        this.initialized = false;
        
        console.log('🧹 [SidebarManager] Cleaned up');
    }
}

// Create global instance
window.SidebarManager = new SidebarManager();

console.log('📋 SidebarManager ready for use');
