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
                        <span class="text-xs font-medium text-gray-500 uppercase tracking-widest opacity-80">
                            AI Platform
                        </span>
                    </div>
                </div>
                <!-- Animated background -->
                <div class="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-all duration-700 animate-pulse"></div>
            </div>
            
            <!-- Business Selector with Modern Styling -->
            <div class="p-6 border-b border-gray-100/50">
                <label class="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-4 relative">
                    <span class="relative z-10">Active Business</span>
                    <div class="absolute bottom-0 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                </label>
                <div class="relative group">
                    <select id="business-select" 
                            aria-label="Select active business"
                            class="w-full px-4 py-3 bg-gradient-to-r from-white/80 to-blue-50/50 border-2 border-blue-200/50 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm appearance-none cursor-pointer">
                        <option value="">Loading businesses...</option>
                    </select>
                    <!-- Custom Dropdown Arrow -->
                    <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg class="w-5 h-5 text-blue-500 group-hover:text-purple-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <!-- Glow effect on focus -->
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-300 -z-10 blur-md"></div>
                </div>
            </div>
            
            <!-- Navigation with Ultra Modern Styling -->
            <nav class="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
                
                <!-- Main Section -->
                <div>
                    <h4 class="px-4 text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 relative">
                        <span class="relative z-10">Main</span>
                        <div class="absolute bottom-0 left-4 w-6 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                    </h4>
                    
                    <div class="space-y-2">
                        <a href="/dashboard" data-page="dashboard" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">📊</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Dashboard</span>
                            <!-- Shine effect -->
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/leads" data-page="leads" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 hover:shadow-xl hover:shadow-emerald-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">🔍</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Lead Research</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/analytics" data-page="analytics" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-violet-500 hover:to-purple-600 hover:shadow-xl hover:shadow-violet-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
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
                        <div class="absolute bottom-0 left-4 w-6 h-0.5 bg-gradient-to-r from-orange-400 to-red-400 rounded-full"></div>
                    </h4>
                    
                    <div class="space-y-2">
                        <a href="/campaigns" data-page="campaigns" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-pink-600 hover:shadow-xl hover:shadow-rose-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">🎯</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Campaigns</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
                        <a href="/messages" data-page="messages" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-indigo-500 hover:to-blue-600 hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">💬</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Messages</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                    </div>
                </div>
                
                <!-- Account Section -->
                <div>
                    <h4 class="px-4 text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 relative">
                        <span class="relative z-10">Account</span>
                        <div class="absolute bottom-0 left-4 w-6 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"></div>
                    </h4>
                    
                    <div class="space-y-2">
                        <a href="/subscription" data-page="subscription" 
                           class="group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-600 hover:shadow-xl hover:shadow-amber-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <span class="text-xl group-hover:scale-125 transition-transform duration-300 relative z-10">💳</span>
                            <span class="relative z-10 group-hover:translate-x-1 transition-transform duration-300">Subscription</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                        </a>
                        
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
            
            <!-- Modern Logout Button -->
            <div class="p-6">
                <button onclick="handleLogout()" 
                        class="w-full group flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 hover:scale-105 transition-all duration-300 relative overflow-hidden">
                    <span class="text-lg group-hover:scale-110 transition-transform duration-300 relative z-10">🚪</span>
                    <span class="relative z-10">Logout</span>
                    <!-- Shine effect -->
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                </button>
            </div>
            
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
