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
targetElement.className = 'sidebar fixed left-0 top-0 w-80 h-screen overflow-y-auto z-50';
            
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
        <!-- Sidebar Toggle Button -->
        <button id="sidebar-toggle" class="fixed left-80 top-6 z-50 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-r-lg p-2 shadow-lg hover:bg-white transition-all duration-200 group" style="transform: translateX(-1px);">
            <svg class="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
        </button>

        <!-- Sidebar Container with Border -->
        <div class="h-full bg-white/98 backdrop-blur-xl border-r-2 border-gray-200/50 shadow-xl shadow-gray-500/5 relative">
            
            <!-- Logo Section -->
            <div class="p-6 border-b border-gray-100 group">
                <div class="flex items-center gap-3">
                    <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                         class="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110">
                    <div class="flex flex-col">
                        <span class="text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                            Oslira
                        </span>
                        <span class="text-xs text-gray-500 font-medium">Lead Research</span>
                    </div>
                </div>
            </div>
            
            <!-- Navigation -->
            <nav class="px-4 py-6 space-y-8">
                
                <!-- Main Section -->
                <div>
                    <h4 class="px-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 relative">
                        <span class="relative z-10">Main</span>
                        <div class="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-60"></div>
                    </h4>
                    
                    <div class="space-y-1">
                        <a href="/dashboard" data-page="dashboard" 
                           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-800 bg-gray-50/50 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm hover:translate-x-1 transition-all duration-200 group border border-transparent hover:border-blue-100">
                            <span class="text-lg transition-transform duration-200 group-hover:scale-110">📊</span>
                            <span class="font-semibold">Dashboard</span>
                        </a>
                        
                        <a href="/leads" data-page="leads" 
                           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-800 bg-gray-50/50 hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-sm hover:translate-x-1 transition-all duration-200 group border border-transparent hover:border-emerald-100">
                            <span class="text-lg transition-transform duration-200 group-hover:scale-110">🔍</span>
                            <span class="font-semibold">Lead Research</span>
                        </a>
                        
                        <a href="/analytics" data-page="analytics" 
                           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-800 bg-gray-50/50 hover:text-purple-600 hover:bg-purple-50 hover:shadow-sm hover:translate-x-1 transition-all duration-200 group border border-transparent hover:border-purple-100">
                            <span class="text-lg transition-transform duration-200 group-hover:scale-110">📈</span>
                            <span class="font-semibold">Analytics</span>
                        </a>
                    </div>
                </div>
                
                <!-- Tools Section -->
                <div>
                    <h4 class="px-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 relative">
                        <span class="relative z-10">Tools</span>
                        <div class="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-60"></div>
                    </h4>
                    
                    <div class="space-y-1">
                        <a href="/campaigns" data-page="campaigns" 
                           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-800 bg-gray-50/50 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-sm hover:translate-x-1 transition-all duration-200 group border border-transparent hover:border-indigo-100">
                            <span class="text-lg transition-transform duration-200 group-hover:scale-110">🎯</span>
                            <span class="font-semibold">Campaigns</span>
                        </a>
                        
                        <a href="/automations" data-page="automations" 
                           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-800 bg-gray-50/50 hover:text-orange-600 hover:bg-orange-50 hover:shadow-sm hover:translate-x-1 transition-all duration-200 group border border-transparent hover:border-orange-100">
                            <span class="text-lg transition-transform duration-200 group-hover:scale-110">⚡</span>
                            <span class="font-semibold">Automations</span>
                        </a>
                    </div>
                </div>
                
                <!-- Accounts Section -->
                <div>
                    <h4 class="px-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 relative">
                        <span class="relative z-10">Account</span>
                        <div class="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full opacity-60"></div>
                    </h4>
                    
                    <div class="space-y-1">
                        <a href="/settings" data-page="settings" 
                           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-800 bg-gray-50/50 hover:text-gray-600 hover:bg-gray-100 hover:shadow-sm hover:translate-x-1 transition-all duration-200 group border border-transparent hover:border-gray-200">
                            <span class="text-lg transition-transform duration-200 group-hover:scale-110">⚙️</span>
                            <span class="font-semibold">Settings</span>
                        </a>
                    </div>
                </div>
                
            </nav>
            
            <!-- Clean User Info Section -->
            <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
                
                <!-- User Details -->
                <div class="mb-3">
                    <div id="sidebar-email" class="text-sm font-medium text-gray-900 mb-1 truncate">Loading...</div>
                    <div id="sidebar-plan" class="inline-flex items-center px-2 py-1 bg-blue-50 text-xs font-medium text-blue-700 rounded border border-blue-100">
                        Free Plan
                    </div>
                </div>
                
                <!-- Credits Display -->
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200 mb-3">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-medium text-gray-600 uppercase tracking-wide">Credits</span>
                            <div id="sidebar-credits" class="text-lg font-bold text-gray-900">50</div>
                        </div>
                        <div class="text-right">
                            <a href="/billing" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                Upgrade
                            </a>
                        </div>
                    </div>
                </div>
                
                <!-- Subtle Logout -->
                <button id="sidebar-logout" class="text-xs text-gray-500 hover:text-red-600 transition-colors duration-200 font-medium">
                    Sign out
                </button>
                
            </div>
            
        </div>
    `;
}
    
    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    
initializeSidebar() {
    try {
        // Set up logout functionality
        const logoutBtn = document.getElementById('sidebar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Set up sidebar toggle functionality
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (toggleBtn && sidebar && mainContent) {
            toggleBtn.addEventListener('click', () => {
                const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
                
                if (isCollapsed) {
                    // Expand sidebar
                    sidebar.classList.remove('sidebar-collapsed');
                    mainContent.style.marginLeft = 'var(--sidebar-width)';
                    toggleBtn.style.left = '320px';
                    toggleBtn.querySelector('svg').style.transform = 'rotate(0deg)';
                } else {
                    // Collapse sidebar
                    sidebar.classList.add('sidebar-collapsed');
                    mainContent.style.marginLeft = '0';
                    toggleBtn.style.left = '0px';
                    toggleBtn.querySelector('svg').style.transform = 'rotate(180deg)';
                }
            });
        }
        
        // Initialize active menu item
        const currentPage = this.getCurrentPage();
        this.setActiveMenuItem(currentPage);
        
        console.log('✅ [SidebarManager] Sidebar initialized successfully');
        
    } catch (error) {
        console.error('❌ [SidebarManager] Initialization failed:', error);
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
        const businessSelect = document.getElementById('business-select');
        if (!businessSelect) {
            console.warn('⚠️ [SidebarManager] Business selector element not found');
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
