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
    
// File: public/core/sidebar/sidebar-manager.js
// Replace the getSidebarHTML() method (around line 50-150) with this Tailwind version

getSidebarHTML() {
    return `
        <!-- Logo Section -->
        <div class="flex items-center gap-3 p-6 border-b border-blue-100 relative group">
            <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                 class="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300">
            <span class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Oslira
            </span>
            <!-- Subtle glow effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
        </div>
        
        <!-- Business Selector -->
        <div class="p-4 border-b border-gray-100">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Active Business
            </label>
            <div class="relative group">
                <select id="business-select" 
                        aria-label="Select active business"
                        class="w-full px-3 py-2 bg-gradient-to-r from-white to-gray-50 border border-blue-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 appearance-none">
                    <option value="">Loading businesses...</option>
                </select>
                <!-- Glow effect on focus/hover -->
                <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-5 group-focus-within:opacity-10 transition-opacity duration-200 -z-10 blur-sm"></div>
                <!-- Custom dropdown arrow -->
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg class="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>
        </div>
        
        <!-- Navigation Menu -->
        <nav class="flex-1 p-4 space-y-2">
            <!-- Main Section -->
            <div class="mb-6">
                <h4 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Main</h4>
                
                <a href="/dashboard" data-page="dashboard" 
                   class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-200 z-10">📊</span>
                    <span class="z-10">Dashboard</span>
                    <!-- Subtle glow -->
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                </a>
                
                <a href="/leads" data-page="leads" 
                   class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-200 z-10">🔍</span>
                    <span class="z-10">Lead Research</span>
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                </a>
                
                <a href="/analytics" data-page="analytics" 
                   class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-200 z-10">📈</span>
                    <span class="z-10">Analytics</span>
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                </a>
            </div>
            
            <!-- Tools Section -->
            <div class="mb-6">
                <h4 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tools</h4>
                
                <a href="/campaigns" data-page="campaigns" 
                   class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-200 z-10">🚀</span>
                    <span class="z-10">Campaigns</span>
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                </a>
                
                <a href="/messages" data-page="messages" 
                   class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-200 z-10">💬</span>
                    <span class="z-10">Messages</span>
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                </a>
                
                <a href="/integrations" data-page="integrations" 
                   class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-200 z-10">🔗</span>
                    <span class="z-10">Integrations</span>
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                </a>
            </div>
            
            <!-- Account Section -->
            <div class="mb-6">
                <h4 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Account</h4>
                
                <a href="/subscription" data-page="subscription" 
                   class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-200 z-10">💳</span>
                    <span class="z-10">Subscription</span>
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                </a>
                
                <a href="/settings" data-page="settings" 
                   class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-200 z-10">⚙️</span>
                    <span class="z-10">Settings</span>
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                </a>
            </div>
        </nav>
        
        <!-- User Info Section -->
        <div class="p-5 m-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 border border-blue-100 rounded-xl backdrop-blur-sm relative group overflow-hidden">
            <div class="relative z-10">
                <div class="mb-4">
                    <div id="sidebar-email" class="text-sm font-semibold text-gray-900 mb-1 truncate">Loading...</div>
                    <div id="sidebar-plan" class="text-xs text-gray-500 uppercase tracking-wide font-medium">Free Plan</div>
                </div>
                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-blue-100/70 to-purple-100/70 rounded-lg border border-blue-200/50 relative group">
                    <span class="text-xs text-gray-600 font-medium uppercase tracking-wide">Credits</span>
                    <span id="sidebar-credits" class="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent credits-glow">--</span>
                    <!-- Credits glow effect -->
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </div>
            </div>
            <!-- User info background glow -->
            <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
        </div>
        
        <!-- Logout Button -->
        <div class="p-4">
            <button onclick="window.SimpleAuth?.signOut()" 
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 hover:text-blue-600 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-200 group relative overflow-hidden"
                    aria-label="Sign out">
                <span class="text-base group-hover:rotate-12 group-hover:scale-110 transition-transform duration-200 z-10">⚡</span>
                <span class="z-10">Logout</span>
                <!-- Logout button glow -->
                <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
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

        this.initializeBusinessSelector();
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
        // Remove active styling
        item.classList.remove('active');
        
        // Reset to default hover styles
        item.className = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:shadow-blue-500/10 hover:translate-x-1 transition-all duration-200 group relative overflow-hidden';
        
        // Re-add the glow div if it doesn't exist
        if (!item.querySelector('.absolute.inset-0.bg-gradient-to-r')) {
            const glowDiv = document.createElement('div');
            glowDiv.className = 'absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg';
            item.appendChild(glowDiv);
        }
    });
    
    // Add active class to current page
    const activeItem = document.querySelector(`.sidebar nav a[data-page="${pageId}"]`);
    if (activeItem) {
        // Add active class for CSS styling
        activeItem.classList.add('active');
        
        // Override with active styles (white text, gradient background)
        activeItem.classList.remove('text-gray-700', 'hover:text-blue-600');
        activeItem.classList.add('text-white');
        
        // Update text color for child elements
        const textSpan = activeItem.querySelector('span:last-child');
        if (textSpan) {
            textSpan.classList.remove('text-gray-700');
            textSpan.classList.add('text-white');
        }
        
        const iconSpan = activeItem.querySelector('span:first-child');
        if (iconSpan) {
            iconSpan.classList.add('text-white');
        }
        
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
