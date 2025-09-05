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
        <!-- Collapsible Sidebar Container -->
        <div id="sidebar-container" class="sidebar-expanded h-full bg-gradient-to-br from-white/95 via-blue-50/90 to-purple-50/85 backdrop-blur-xl border-r border-white/20 shadow-2xl shadow-blue-500/10 transition-all duration-300">
            
            <!-- Header with Toggle -->
            <div class="flex items-center justify-between p-4 border-b border-white/20">
                <div class="sidebar-logo flex items-center gap-3">
                    <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                         class="w-8 h-8 object-contain transition-all duration-300">
                    <div class="sidebar-text flex flex-col">
                        <span class="text-lg font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                            Oslira
                        </span>
                        <span class="text-xs text-gray-600 font-medium opacity-80">Lead Research</span>
                    </div>
                </div>
                <button id="sidebar-toggle" class="p-2 rounded-lg hover:bg-white/50 transition-all duration-200 group">
                    <svg class="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
                    </svg>
                </button>
            </div>
            
            <!-- Navigation -->
            <nav class="px-4 py-6 space-y-6">
                
                <!-- Main Section -->
                <div class="nav-section">
                    <h4 class="sidebar-text px-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 relative">
                        <span class="relative z-10">Main</span>
                        <div class="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-60"></div>
                    </h4>
                    
                    <div class="space-y-1">
                        <a href="/dashboard" data-page="dashboard" title="Dashboard"
                           class="nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:shadow-lg hover:scale-105 transition-all duration-200 relative overflow-hidden"
                           style="min-height: 44px;">
                            <span class="nav-icon text-lg transition-transform duration-200 group-hover:scale-110 flex-shrink-0">📊</span>
                            <span class="sidebar-text font-semibold">Dashboard</span>
                            <div class="nav-shine absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/leads" data-page="leads" title="Lead Research"
                           class="nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 hover:shadow-lg hover:scale-105 transition-all duration-200 relative overflow-hidden"
                           style="min-height: 44px;">
                            <span class="nav-icon text-lg transition-transform duration-200 group-hover:scale-110 flex-shrink-0">🔍</span>
                            <span class="sidebar-text font-semibold">Lead Research</span>
                            <div class="nav-shine absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/analytics" data-page="analytics" title="Analytics"
                           class="nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-violet-500 hover:to-indigo-600 hover:shadow-lg hover:scale-105 transition-all duration-200 relative overflow-hidden"
                           style="min-height: 44px;">
                            <span class="nav-icon text-lg transition-transform duration-200 group-hover:scale-110 flex-shrink-0">📈</span>
                            <span class="sidebar-text font-semibold">Analytics</span>
                            <div class="nav-shine absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                    </div>
                </div>
                
                <!-- Tools Section -->
                <div class="nav-section">
                    <h4 class="sidebar-text px-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 relative">
                        <span class="relative z-10">Tools</span>
                        <div class="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-60"></div>
                    </h4>
                    
                    <div class="space-y-1">
                        <a href="/campaigns" data-page="campaigns" title="Campaigns"
                           class="nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-600 hover:shadow-lg hover:scale-105 transition-all duration-200 relative overflow-hidden"
                           style="min-height: 44px;">
                            <span class="nav-icon text-lg transition-transform duration-200 group-hover:scale-110 flex-shrink-0">🎯</span>
                            <span class="sidebar-text font-semibold">Campaigns</span>
                            <div class="nav-shine absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/automations" data-page="automations" title="Automations"
                           class="nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-600 hover:shadow-lg hover:scale-105 transition-all duration-200 relative overflow-hidden"
                           style="min-height: 44px;">
                            <span class="nav-icon text-lg transition-transform duration-200 group-hover:scale-110 flex-shrink-0">⚡</span>
                            <span class="sidebar-text font-semibold">Automations</span>
                            <div class="nav-shine absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                    </div>
                </div>
                
                <!-- Account Section -->
                <div class="nav-section">
                    <h4 class="sidebar-text px-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 relative">
                        <span class="relative z-10">Account</span>
                        <div class="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full opacity-60"></div>
                    </h4>
                    
                    <div class="space-y-1">
                        <a href="/settings" data-page="settings" title="Settings"
                           class="nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-slate-500 hover:to-gray-600 hover:shadow-lg hover:scale-105 transition-all duration-200 relative overflow-hidden"
                           style="min-height: 44px;">
                            <span class="nav-icon text-lg transition-transform duration-200 group-hover:scale-110 flex-shrink-0">⚙️</span>
                            <span class="sidebar-text font-semibold">Settings</span>
                            <div class="nav-shine absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                    </div>
                </div>
                
            </nav>
            
            <!-- User Info Section -->
            <div class="sidebar-user-section mt-auto p-4">
                <!-- Expanded User Info -->
                <div class="sidebar-text relative bg-gradient-to-br from-white/70 via-blue-50/60 to-purple-50/50 backdrop-blur-xl border border-white/30 rounded-xl shadow-lg overflow-hidden">
                    <div class="p-4">
                        <!-- User Details -->
                        <div class="mb-3">
                            <div id="sidebar-email" class="text-sm font-bold text-gray-900 mb-1 truncate">Loading...</div>
                            <div id="sidebar-plan" class="inline-flex items-center px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-xs font-bold text-blue-700 uppercase tracking-wider rounded-full border border-blue-200/50">
                                Free Plan
                            </div>
                        </div>
                        
                        <!-- Credits Display -->
                        <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-lg text-white shadow-lg">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-xs font-bold uppercase tracking-wide opacity-90">Credits</span>
                                    <div id="sidebar-credits" class="text-xl font-black">--</div>
                                </div>
                                <div class="text-xl opacity-80">⚡</div>
                            </div>
                        </div>
                        
                        <!-- Logout Button -->
                        <button onclick="handleLogout()" 
                                class="w-full text-xs text-gray-500 hover:text-red-600 transition-colors duration-200 font-medium py-2 mt-3 text-left">
                            Sign out
                        </button>
                    </div>
                </div>
                
                <!-- Collapsed User Section -->
                <div class="sidebar-collapsed-user" style="display: none;">
                    <div class="flex flex-col items-center space-y-3">
                        <!-- User Avatar -->
                        <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                            <span id="sidebar-user-initial">U</span>
                        </div>
                        
                        <!-- Credits -->
                        <div class="bg-gradient-to-r from-blue-500 to-purple-600 px-2 py-1 rounded text-white text-center min-w-[50px]">
                            <div id="sidebar-credits-collapsed" class="text-xs font-bold">--</div>
                            <div class="text-[10px] opacity-80">credits</div>
                        </div>
                    </div>
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
    const mainContent = document.querySelector('.main-content');
    const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
    
    if (toggleBtn && sidebarContainer && mainContent) {
        let isCollapsed = false;
        
        toggleBtn.addEventListener('click', () => {
            if (isCollapsed) {
                // Expand sidebar
                sidebarContainer.style.width = 'var(--sidebar-width)';
                mainContent.style.marginLeft = 'var(--sidebar-width)';
                
                // Show expanded elements
                document.querySelectorAll('.sidebar-text').forEach(el => {
                    el.style.display = '';
                });
                document.querySelectorAll('.nav-section h4').forEach(el => {
                    el.style.display = '';
                });
                document.querySelector('.sidebar-user-section .sidebar-text').style.display = '';
                document.querySelectorAll('.sidebar-collapsed-user, .sidebar-collapsed-logout').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Reset nav items to normal layout
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.style.justifyContent = '';
                    item.style.padding = '';
                });
                
                // Rotate toggle icon
                if (toggleIcon) {
                    toggleIcon.style.transform = 'rotate(0deg)';
                }
                
                isCollapsed = false;
            } else {
                // Collapse sidebar
                sidebarContainer.style.width = '70px';
                mainContent.style.marginLeft = '70px';
                
                // Hide expanded elements
                document.querySelectorAll('.sidebar-text').forEach(el => {
                    el.style.display = 'none';
                });
                document.querySelectorAll('.nav-section h4').forEach(el => {
                    el.style.display = 'none';
                });
                document.querySelector('.sidebar-user-section .sidebar-text').style.display = 'none';
                document.querySelectorAll('.sidebar-collapsed-user, .sidebar-collapsed-logout').forEach(el => {
                    el.style.display = 'block';
                });
                
                // Adjust nav items for collapsed layout
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.style.justifyContent = 'center';
                    item.style.padding = '0.75rem';
                });
                
                // Rotate toggle icon
                if (toggleIcon) {
                    toggleIcon.style.transform = 'rotate(180deg)';
                }
                
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
