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
targetElement.className = 'sidebar sidebar-expanded fixed left-0 top-0 h-screen z-50';
            
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
    
// File: public/core/sidebar/sidebar-manager.js
// Replace the getSidebarHTML() method (around line 50-150) with this Tailwind version

getSidebarHTML() {
    return `
        <div id="sidebar-container" class="h-full bg-gradient-to-br from-white/95 via-blue-50/90 to-purple-50/85 backdrop-blur-xl border-r border-white/20 shadow-2xl shadow-blue-500/10 transition-all duration-300">
            
            <!-- Header -->
<div class="sidebar-header">
    <div class="flex items-center justify-between">
        <div class="sidebar-logo flex items-center gap-3 flex-1">
            <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                 class="w-8 h-8 object-contain flex-shrink-0">
<div class="sidebar-logo-text flex flex-col min-w-0">
    <span class="text-lg font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Oslira
    </span>
</div>
        </div>
        <button id="sidebar-toggle" class="sidebar-toggle p-2 rounded-lg hover:bg-white/50 transition-all duration-200 group flex-shrink-0">
            <svg class="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
            </svg>
        </button>
    </div>
</div>
            
            <!-- Navigation -->
            <nav class="sidebar-nav">
                
                <!-- Main Section -->
                <div class="nav-section">
                    <h4 class="nav-section-header px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Main
                    </h4>
                    
                    <div class="nav-items">
                        <a href="/dashboard" data-page="dashboard" data-tooltip="Dashboard" class="nav-item">
                            <span class="nav-icon">📊</span>
                            <span class="nav-text">Dashboard</span>
                        </a>
                        
                        <a href="/leads" data-page="leads" data-tooltip="Lead Research" class="nav-item">
                            <span class="nav-icon">🔍</span>
                            <span class="nav-text">Lead Research</span>
                        </a>
                        
                        <a href="/analytics" data-page="analytics" data-tooltip="Analytics" class="nav-item">
                            <span class="nav-icon">📈</span>
                            <span class="nav-text">Analytics</span>
                        </a>
                    </div>
                </div>
                
                <!-- Tools Section -->
                <div class="nav-section">
                    <h4 class="nav-section-header px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Tools
                    </h4>
                    
                    <div class="nav-items">
                        <a href="/campaigns" data-page="campaigns" data-tooltip="Campaigns" class="nav-item">
                            <span class="nav-icon">🎯</span>
                            <span class="nav-text">Campaigns</span>
                        </a>
                        
                        <a href="/automations" data-page="automations" data-tooltip="Automations" class="nav-item">
                            <span class="nav-icon">⚡</span>
                            <span class="nav-text">Automations</span>
                        </a>
                    </div>
                </div>
                
                <!-- Account Section -->
                <div class="nav-section">
                    <h4 class="nav-section-header px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Account
                    </h4>
                    
                    <div class="nav-items">
                        <a href="/settings" data-page="settings" data-tooltip="Settings" class="nav-item">
                            <span class="nav-icon">⚙️</span>
                            <span class="nav-text">Settings</span>
                        </a>
                    </div>
                </div>
                
            </nav>
            
            <!-- User Section -->
            <div class="sidebar-user-section">
                <!-- Expanded User Info -->
                <div class="sidebar-user-expanded">
                    <div class="bg-gradient-to-br from-white/70 via-blue-50/60 to-purple-50/50 backdrop-blur-xl border border-white/30 rounded-xl shadow-lg p-4">
                        <div class="mb-3">
                            <div id="sidebar-email" class="text-sm font-bold text-gray-900 mb-1 truncate">Loading...</div>
                            <div id="sidebar-plan" class="inline-flex items-center px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-xs font-bold text-blue-700 uppercase tracking-wider rounded-full border border-blue-200/50">
                                Free Plan
                            </div>
                        </div>
                        
                        <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-lg text-white shadow-lg mb-3">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-xs font-bold uppercase tracking-wide opacity-90">Credits</span>
                                    <div id="sidebar-credits" class="text-xl font-black">--</div>
                                </div>
                                <div class="text-xl opacity-80">⚡</div>
                            </div>
                        </div>
                        
                        <button onclick="handleLogout()" class="w-full text-xs text-gray-500 hover:text-red-600 transition-colors duration-200 font-medium py-2 text-left">
                            Sign out
                        </button>
                    </div>
                </div>
                
                <!-- Collapsed User Info -->
                <div class="sidebar-user-collapsed">
                    <div class="user-avatar">
                        <span id="sidebar-user-initial-collapsed">U</span>
                    </div>
                    <div id="sidebar-credits-collapsed" class="credits-collapsed" title="Available Credits">--</div>
                    <button onclick="handleLogout()" class="p-2 text-gray-500 hover:text-red-600 transition-colors duration-200" title="Sign out">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
        </div>
    `;
}
    
    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    
initializeSidebar() {
    try {
        // Set up sidebar toggle functionality
        this.setupSidebarToggle();
        
        // Set up logout functionality
        const logoutBtns = document.querySelectorAll('button[onclick="handleLogout()"]');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
        
        // Wait for dependencies and update user info
        this.waitForDependencies().then(() => {
            this.connectToBusinessManager();
            this.updateUserInfo();
            this.setActiveMenuItem(this.currentConfig.activePage);
            this.setupEventListeners();
            this.initializeBusinessSelector();
        });
        
        console.log('✅ [SidebarManager] Sidebar initialized successfully');
        
    } catch (error) {
        console.error('❌ [SidebarManager] Initialization failed:', error);
    }
}

setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebarContainer = document.getElementById('sidebar-container');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (toggleBtn && sidebarContainer && sidebar && mainContent) {
        let isCollapsed = false;
        
        toggleBtn.addEventListener('click', () => {
            if (isCollapsed) {
                // Expand sidebar
                sidebar.classList.remove('sidebar-collapsed');
                sidebar.classList.add('sidebar-expanded');
                sidebarContainer.classList.remove('collapsed');
                mainContent.style.marginLeft = 'var(--sidebar-width)';
                
                isCollapsed = false;
            } else {
                // Collapse sidebar
                sidebar.classList.remove('sidebar-expanded');
                sidebar.classList.add('sidebar-collapsed');
                sidebarContainer.classList.add('collapsed');
                mainContent.style.marginLeft = '64px';
                
                isCollapsed = true;
            }
        });
    }
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
        
        // Notify BusinessManager that sidebar is ready
        if (this.businessManager && this.businessManager.updateSidebarBusinessSelector) {
            setTimeout(() => {
                console.log('🔄 [SidebarManager] Triggering business selector update...');
                this.businessManager.updateSidebarBusinessSelector();
            }, 100); // Small delay to ensure DOM is ready
        }
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

        // Update user initial (first letter of email)
        const userInitialElement = document.getElementById('sidebar-user-initial');
        if (userInitialElement && user.email) {
            userInitialElement.textContent = user.email.charAt(0).toUpperCase();
        }

        // Update subscription plan
        const planElement = document.getElementById('sidebar-plan');
        if (planElement) {
            const planName = this.formatPlanName(user.subscription_plan || 'free');
            planElement.textContent = planName;
        }

        // Update credits display (both expanded and collapsed)
        const creditsElement = document.getElementById('sidebar-credits');
        const creditsCollapsedElement = document.getElementById('sidebar-credits-collapsed');
        if (creditsElement || creditsCollapsedElement) {
            const credits = user.credits || 0;
            
            if (creditsElement) {
                creditsElement.textContent = credits;
            }
            if (creditsCollapsedElement) {
                creditsCollapsedElement.textContent = credits;
            }
            
            // Add warning class for low credits
            const creditClass = credits < 5 ? 'low-credits' : '';
            if (creditsElement) {
                creditsElement.className = `text-xl font-black ${creditClass}`;
            }
            if (creditsCollapsedElement) {
                creditsCollapsedElement.className = `text-xs font-bold mt-1 ${creditClass}`;
            }
        }

        console.log('✅ [SidebarManager] User info updated');
        
    } catch (error) {
        console.error('❌ [SidebarManager] Failed to update user info:', error);
    }
}
    
formatPlanName(plan) {
    const planMap = {
        'free': 'Free Plan',
        'starter': 'Starter Plan',
        'professional': 'Pro Plan',
        'enterprise': 'Enterprise Plan'
    };
    return planMap[plan] || 'Subscription';
}
    
    // =========================================================================
    // NAVIGATION CONTROL
    // =========================================================================
    
// File: public/core/sidebar/sidebar-manager.js
// Replace the setActiveMenuItem method (around line 200-220) with this version

setActiveMenuItem(pageId) {
    console.log(`🎯 [SidebarManager] Setting active menu item: ${pageId}`);
    
    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.sidebar nav a[data-page]');
    menuItems.forEach(item => {
        item.classList.remove('active');
        // Reset to default styles
        item.classList.remove('bg-blue-500', 'text-white', 'shadow-lg');
        item.classList.add('text-gray-800', 'bg-gray-50/50');
    });
    
    // Add active class to current page
    const activeItem = document.querySelector(`.sidebar nav a[data-page="${pageId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        // Apply active styles - dark text on light background for readability
        activeItem.classList.remove('text-gray-800', 'bg-gray-50/50');
        activeItem.classList.add('bg-blue-500', 'text-white', 'shadow-lg');
        
        console.log(`✅ [SidebarManager] Active menu item set: ${pageId}`);
    } else {
        console.warn(`⚠️ [SidebarManager] Menu item not found: ${pageId}`);
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
// BUSINESS SELECTOR INITIALIZATION
// =========================================================================

initializeBusinessSelector() {
    try {
        // Try multiple possible selectors
        const businessSelect = document.getElementById('business-select') || 
                              document.getElementById('sidebar-business-select') ||
                              document.querySelector('.sidebar-business-select');
                              
        if (!businessSelect) {
            console.warn('⚠️ [SidebarManager] Business selector element not found, creating...');
            this.createBusinessSelectorIfMissing();
            return;
        }

        // Check if we have business data available
        if (window.OsliraApp?.businesses && window.OsliraApp.businesses.length > 0) {
            console.log('🏢 [SidebarManager] Populating business selector with existing data');
            
            const businesses = window.OsliraApp.businesses;
            const currentBusiness = window.OsliraApp.business;
            
            const optionsHTML = businesses.map(business => 
                `<option value="${business.id}" ${business.id === currentBusiness?.id ? 'selected' : ''}>
                    ${business.business_name || business.name || 'Unnamed Business'}
                </option>`
            ).join('');
            
            businessSelect.innerHTML = `
                <option value="">Select business profile...</option>
                ${optionsHTML}
            `;
            
            // Add change handler
            businessSelect.addEventListener('change', (e) => {
                if (e.target.value && this.businessManager?.switchBusiness) {
                    this.businessManager.switchBusiness(e.target.value);
                }
            });
            
            console.log('✅ [SidebarManager] Business selector initialized');
        }
    } catch (error) {
        console.error('❌ [SidebarManager] Failed to initialize business selector:', error);
    }
}

    // =========================================================================
// DOM REPAIR METHODS
// =========================================================================

createBusinessSelectorIfMissing() {
    const userSection = document.querySelector('.sidebar-user-section') || 
                        document.querySelector('.user-info');
    
    if (!userSection) {
        console.error('❌ [SidebarManager] Cannot create business selector - no user section found');
        return;
    }
    
    console.log('🔧 [SidebarManager] Creating missing business selector...');
    
    const selectorHTML = `
        <div class="business-selector-section mt-4 p-3 bg-slate-50 rounded-lg">
            <label for="business-select" class="block text-sm font-medium text-slate-700 mb-2">
                Business Profile
            </label>
            <select id="business-select" 
                    class="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onchange="window.businessManager?.handleBusinessChange(this.value)">
                <option value="">Loading...</option>
            </select>
        </div>
    `;
    
    userSection.insertAdjacentHTML('afterend', selectorHTML);
    console.log('✅ [SidebarManager] Business selector created');
    
    // Initialize after creation
    setTimeout(() => {
        this.initializeBusinessSelector();
    }, 100);
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
