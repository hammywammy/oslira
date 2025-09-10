// =============================================================================
// SIDEBAR MANAGER - PRODUCTION READY COMPONENT
// Core sidebar navigation system with proper width control and state management
// =============================================================================

class SidebarManager {
    constructor() {
        this.isCollapsed = false;
        this.user = null;
        this.sidebar = null;
        this.mainContent = null;
        
        console.log('🚀 [SidebarManager] Initializing...');
    }

    // =========================================================================
    // PUBLIC API - CORE METHODS
    // =========================================================================

    async render(container = '#sidebar-container') {
        try {
            console.log('🎨 [SidebarManager] Rendering sidebar...');
            
            // Wait for container to exist if it's not found immediately
            let targetElement = typeof container === 'string' 
                ? document.querySelector(container)
                : container;

            if (!targetElement && typeof container === 'string') {
                // Wait up to 2 seconds for container to appear
                console.log('🔍 [SidebarManager] Waiting for container:', container);
                await new Promise((resolve, reject) => {
                    let attempts = 0;
                    const maxAttempts = 20; // 2 seconds at 100ms intervals
                    
                    const checkForElement = () => {
                        targetElement = document.querySelector(container);
                        attempts++;
                        
                        if (targetElement) {
                            resolve();
                        } else if (attempts >= maxAttempts) {
                            reject(new Error(`Container element not found after waiting: ${container}`));
                        } else {
                            setTimeout(checkForElement, 100);
                        }
                    };
                    
                    checkForElement();
                });
            }

            if (!targetElement) {
                throw new Error(`Container element not found: ${container}`);
            }
            
            // Apply sidebar classes and inject HTML
            targetElement.className = 'sidebar';
            targetElement.innerHTML = this.getSidebarHTML();

            // Store references
            this.sidebar = targetElement;
            this.mainContent = document.querySelector('.main-content, [class*="content"], main');
            
            // Create external toggle
            this.createExternalToggle();

            // Initialize functionality
            this.initializeSidebar();

            console.log('✅ [SidebarManager] Sidebar rendered successfully');
            return this;
            
        } catch (error) {
            console.error('❌ [SidebarManager] Render failed:', error);
            throw error;
        }
    }

    async updateUserInfo(user) {
        try {
            console.log('👤 [SidebarManager] Updating user info...');
            this.user = user;

            // Update email
            const emailElement = document.getElementById('sidebar-email');
            if (emailElement && user?.email) {
                emailElement.textContent = user.email;
            }

            // Update user initial
            const userInitialElement = document.getElementById('sidebar-user-initial');
            if (userInitialElement && user?.email) {
                userInitialElement.textContent = user.email.charAt(0).toUpperCase();
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
                
                // Add low credits warning
                if (credits < 5) {
                    creditsElement.classList.add('text-red-500');
                } else {
                    creditsElement.classList.remove('text-red-500');
                }
            }

            console.log('✅ [SidebarManager] User info updated');
            
        } catch (error) {
            console.error('❌ [SidebarManager] Failed to update user info:', error);
        }
    }

    setActiveMenuItem(pageId) {
        console.log(`🎯 [SidebarManager] Setting active menu item: ${pageId}`);
        
        // Remove active class from all menu items
        const menuItems = document.querySelectorAll('.nav-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current page
        const activeItem = document.querySelector(`[data-page="${pageId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            console.log(`✅ [SidebarManager] Active menu item set: ${pageId}`);
        } else {
            console.warn(`⚠️ [SidebarManager] Menu item not found: ${pageId}`);
        }
    }

    // =========================================================================
    // HTML TEMPLATE
    // =========================================================================

    getSidebarHTML() {
        return `
            <div class="sidebar-container">
                <!-- Header -->
                <div class="sidebar-header">
                    <div class="sidebar-logo-container">
                        <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                             class="sidebar-logo-image">
                        <div class="sidebar-logo-text">Oslira</div>
                    </div>
                </div>
                
                <!-- Navigation -->
                <nav class="sidebar-nav">
                    <!-- Main Section -->
                    <div class="nav-section">
                        <h4 class="nav-section-header">Main</h4>
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
                        <h4 class="nav-section-header">Tools</h4>
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
                        <h4 class="nav-section-header">Account</h4>
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
                        <div class="sidebar-user-info">
                            <div class="sidebar-user-header">
                                <div id="sidebar-email" class="sidebar-user-email">Loading...</div>
                                <div id="sidebar-plan" class="sidebar-user-plan">Free Plan</div>
                            </div>
                            
                            <div class="sidebar-user-credits">
                                <div class="sidebar-user-credits-header">
                                    <div>
                                        <span class="sidebar-user-credits-label">Credits</span>
                                        <div id="sidebar-credits" class="sidebar-user-credits-count">--</div>
                                    </div>
                                    <div class="sidebar-user-credits-icon">⚡</div>
                                </div>
                            </div>
                            
                            <div class="sidebar-user-actions">
                                <button onclick="window.handleLogout && window.handleLogout()" 
                                        class="sidebar-user-button">
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Collapsed User Avatar -->
                    <div class="sidebar-user-collapsed">
                        <div class="sidebar-user-avatar">
                            <span id="sidebar-user-initial">U</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // SIDEBAR FUNCTIONALITY
    // =========================================================================

    initializeSidebar() {
        console.log('⚙️ [SidebarManager] Initializing sidebar functionality...');
        
        // Initialize navigation
        this.initializeNavigation();
        
        // Set initial state
        this.updateSidebarState();
        
        console.log('✅ [SidebarManager] Sidebar functionality initialized');
    }

    toggleSidebar() {
        console.log('🔄 [SidebarManager] Toggling sidebar, current state:', this.isCollapsed);
        
        this.isCollapsed = !this.isCollapsed;
        this.updateSidebarState();
        
        console.log('✅ [SidebarManager] Sidebar toggled to:', this.isCollapsed ? 'collapsed' : 'expanded');
    }

    createExternalToggle() {
        console.log('🔧 [SidebarManager] Creating external toggle...');
        
        // Remove any existing external toggle
        const existing = document.getElementById('sidebar-external-toggle');
        if (existing) {
            existing.remove();
        }
        
        // Create the toggle button
        const toggle = document.createElement('button');
        toggle.id = 'sidebar-external-toggle';
        toggle.innerHTML = `
            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
            </svg>
        `;
        
        // Style as thin vertical bar
        toggle.style.cssText = `
            position: fixed !important;
            top: 6.3% !important;
            left: 256px !important;
            transform: translateY(-50%) !important;
            width: 1rem !important;
            height: 8rem !important;
            background: white !important;
            border: 1px solid #e5e7eb !important;
            border-left: none !important;
            border-radius: 0 0.5rem 0.5rem 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            z-index: 9999 !important;
            box-shadow: 2px 0 8px rgba(0,0,0,0.1) !important;
            color: #6b7280 !important;
            transition: all 0.3s ease !important;
        `;
        
        // Add click handler
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleSidebar();
        });
        
        // Add to body
        document.body.appendChild(toggle);
        
        // Store reference
        this.externalToggle = toggle;
        
        console.log('✅ [SidebarManager] External toggle created');
    }

    updateSidebarState() {
        if (!this.sidebar) return;
        
        console.log('🔄 [SidebarManager] Updating sidebar state to:', this.isCollapsed ? 'collapsed' : 'expanded');
        
        // Update classes only - let CSS handle styling
        if (this.isCollapsed) {
            this.sidebar.classList.add('collapsed');
            if (this.mainContent) {
                this.mainContent.classList.add('sidebar-collapsed');
            }
        } else {
            this.sidebar.classList.remove('collapsed');
            if (this.mainContent) {
                this.mainContent.classList.remove('sidebar-collapsed');
            }
        }
        
        // Update all child elements
        this.updateChildElements();
        
        // Update external toggle position
        if (this.externalToggle) {
            if (this.isCollapsed) {
                this.externalToggle.style.left = '64px';
                this.externalToggle.querySelector('svg').style.transform = 'rotate(180deg)';
            } else {
                this.externalToggle.style.left = '256px';
                this.externalToggle.querySelector('svg').style.transform = 'rotate(0deg)';
            }
        }
        
        console.log('✅ [SidebarManager] State updated');
    }

    updateChildElements() {
        if (!this.sidebar) return;
        
        const elementsToUpdate = [
            '.sidebar-header',
            '.sidebar-logo-container', 
            '.sidebar-logo-text',
            '.sidebar-nav',
            '.nav-section',
            '.nav-section-header',
            '.nav-item',
            '.nav-text',
            '.sidebar-user-section',
            '.sidebar-user-expanded',
            '.sidebar-user-collapsed'
        ];
        
        elementsToUpdate.forEach(selector => {
            const elements = this.sidebar.querySelectorAll(selector);
            elements.forEach(el => {
                if (this.isCollapsed) {
                    el.classList.add('collapsed');
                } else {
                    el.classList.remove('collapsed');
                }
            });
        });
    }
    
    initializeNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const pageId = item.getAttribute('data-page');
                if (pageId) {
                    this.setActiveMenuItem(pageId);
                }
            });
        });
        
        console.log('✅ [SidebarManager] Navigation event listeners attached');
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

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
    // PUBLIC UTILITIES
    // =========================================================================

    collapse() {
        if (!this.isCollapsed) {
            this.toggleSidebar();
        }
    }

    expand() {
        if (this.isCollapsed) {
            this.toggleSidebar();
        }
    }

    getState() {
        return {
            isCollapsed: this.isCollapsed,
            user: this.user
        };
    }
}

// =============================================================================
// GLOBAL INITIALIZATION
// =============================================================================

// Export for global use
window.SidebarManager = SidebarManager;

// Create global instance
window.sidebarManager = new SidebarManager();

console.log('✅ [SidebarManager] Module loaded and ready');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#sidebar-container');
    if (container) {
        window.sidebarManager.render('#sidebar-container').catch(console.error);
    }
});
