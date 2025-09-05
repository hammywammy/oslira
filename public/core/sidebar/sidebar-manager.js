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
        <button id="sidebar-toggle" class="fixed left-80 top-6 z-50 bg-black/20 backdrop-blur-sm border border-white/20 rounded-r-lg p-2 shadow-xl hover:bg-black/30 transition-all duration-200 group" style="transform: translateX(-1px);">
            <svg class="w-4 h-4 text-white group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
        </button>

        <!-- Modern Glassmorphism Container -->
        <div class="h-full bg-gradient-to-br from-white/95 via-blue-50/90 to-purple-50/85 backdrop-blur-xl border-r border-white/20 shadow-2xl shadow-blue-500/10">
            
            <!-- Logo Section with Advanced Effects -->
            <div class="relative p-6 border-b border-gradient-to-r from-blue-200/30 to-purple-200/30 group">
                <div class="flex items-center gap-4 relative z-10">
                    <div class="relative">
                        <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                             class="w-10 h-10 object-contain drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12">
                        <!-- Logo glow ring -->
                        <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-20 blur-md scale-150 transition-all duration-500"></div>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight group-hover:from-blue-500 group-hover:via-purple-500 group-hover:to-pink-400 transition-all duration-300">
                            Oslira
                        </span>
                        <span class="text-xs text-gray-600 font-medium opacity-80">Lead Research</span>
                    </div>
                </div>
            </div>
            
            <!-- Navigation -->
            <nav class="px-6 py-8 space-y-8">
                
                <!-- Main Section -->
                <div>
                    <h4 class="px-4 text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 relative">
                        <span class="relative z-10">Main</span>
                        <div class="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                    </h4>
                    
                    <div class="space-y-2">
                        <a href="/dashboard" data-page="dashboard" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">📊</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Dashboard</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/leads" data-page="leads" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 hover:shadow-xl hover:shadow-emerald-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">🔍</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Lead Research</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/analytics" data-page="analytics" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-violet-500 hover:to-indigo-600 hover:shadow-xl hover:shadow-violet-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">📈</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Analytics</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                    </div>
                </div>
                
                <!-- Tools Section -->
                <div>
                    <h4 class="px-4 text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 relative">
                        <span class="relative z-10">Tools</span>
                        <div class="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"></div>
                    </h4>
                    
                    <div class="space-y-2">
                        <a href="/campaigns" data-page="campaigns" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-600 hover:shadow-xl hover:shadow-pink-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">🎯</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Campaigns</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/automations" data-page="automations" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-600 hover:shadow-xl hover:shadow-orange-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">⚡</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Automations</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                    </div>
                </div>
                
                <!-- Account Section -->
                <div>
                    <h4 class="px-4 text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 relative">
                        <span class="relative z-10">Account</span>
                        <div class="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"></div>
                    </h4>
                    
                    <div class="space-y-2">
                        <a href="/settings" data-page="settings" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-slate-500 hover:to-gray-600 hover:shadow-xl hover:shadow-slate-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">⚙️</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Settings</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                    </div>
                </div>
                
            </nav>
            
            <!-- Ultra Modern User Info Section -->
            <div class="p-6 m-4 relative">
                <div class="relative bg-gradient-to-br from-white/70 via-blue-50/60 to-purple-50/50 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden">
                    
                    <!-- Animated background pattern -->
                    <div class="absolute inset-0 opacity-20">
                        <div class="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-2xl animate-pulse"></div>
                        <div class="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full blur-2xl animate-pulse delay-1000"></div>
                    </div>
                    
                    <div class="relative z-10 p-6">
                        <!-- User Details -->
                        <div class="mb-6">
                            <div id="sidebar-email" class="text-sm font-bold text-gray-900 mb-2 truncate">Loading...</div>
                            <div id="sidebar-plan" class="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-xs font-bold text-blue-700 uppercase tracking-wider rounded-full border border-blue-200/50">
                                Free Plan
                            </div>
                        </div>
                        
                        <!-- Credits Display with Advanced Styling -->
                        <div class="relative group">
                            <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-xl text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <span class="text-xs font-bold uppercase tracking-widest opacity-90">Credits</span>
                                        <div id="sidebar-credits" class="text-3xl font-black mt-1 drop-shadow-lg">--</div>
                                    </div>
                                    <div class="text-2xl opacity-80 group-hover:scale-110 transition-transform duration-300">⚡</div>
                                </div>
                                
                                <!-- Shine animation -->
                                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12 rounded-xl"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Subtle Logout Button -->
            <div class="absolute bottom-4 left-6 right-6">
                <button onclick="handleLogout()" 
                        class="text-xs text-gray-500 hover:text-red-600 transition-colors duration-200 font-medium py-1">
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
        // Set up sidebar toggle functionality
        this.setupSidebarToggle();
        
        // Set up logout functionality
        const logoutBtn = document.querySelector('button[onclick="handleLogout()"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
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
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (toggleBtn && sidebar && mainContent) {
        let isCollapsed = false;
        
        toggleBtn.addEventListener('click', () => {
            if (isCollapsed) {
                // Expand sidebar
                sidebar.style.transform = 'translateX(0)';
                mainContent.style.marginLeft = 'var(--sidebar-width)';
                toggleBtn.style.left = '320px';
                toggleBtn.style.transform = 'translateX(-1px)';
                toggleBtn.querySelector('svg').style.transform = 'rotate(0deg)';
                isCollapsed = false;
            } else {
                // Collapse sidebar
                sidebar.style.transform = 'translateX(-100%)';
                mainContent.style.marginLeft = '0';
                toggleBtn.style.left = '10px';
                toggleBtn.style.transform = 'translateX(0)';
                toggleBtn.querySelector('svg').style.transform = 'rotate(180deg)';
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
