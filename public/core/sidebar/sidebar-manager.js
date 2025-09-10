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
            
            const targetElement = typeof container === 'string' 
                ? document.querySelector(container)
                : container;
                
            if (!targetElement) {
                throw new Error(`Container element not found: ${container}`);
            }
            
// Apply sidebar classes and inject HTML
targetElement.className = 'sidebar';
targetElement.innerHTML = this.getSidebarHTML();

// Ensure main content has proper margin
const mainContent = document.querySelector('.main-content, main');
if (mainContent) {
    mainContent.style.marginLeft = '256px';
    mainContent.style.transition = 'margin-left 0.3s ease';
}
            
            // Store references
            this.sidebar = targetElement;
            this.mainContent = document.querySelector('.main-content, [class*="content"], main');
            
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
                    <div class="flex items-center justify-between">
                        <div class="sidebar-logo-container">
                            <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                                 class="sidebar-logo-image">
                            <div class="sidebar-logo-text">Oslira</div>
                        </div>
                        <button id="sidebar-toggle" class="sidebar-toggle">
                            <svg class="sidebar-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2m0-12h10a2 2 0 012 2v10a2 2 0 01-2 2H9m0-12V9m0 8v-4"/>
                            </svg>
                        </button>
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
        
        // Initialize toggle functionality
        this.initializeToggle();
        
        // Initialize navigation
        this.initializeNavigation();
        
        // Set initial state
        this.updateSidebarState();
        
        console.log('✅ [SidebarManager] Sidebar functionality initialized');
    }

    initializeToggle() {
        const toggleBtn = document.getElementById('sidebar-toggle');
        
        if (!toggleBtn) {
            console.error('❌ [SidebarManager] Toggle button not found');
            return;
        }
        
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleSidebar();
        });
        
        console.log('✅ [SidebarManager] Toggle event listener attached');
    }

    toggleSidebar() {
        console.log('🔄 [SidebarManager] Toggling sidebar, current state:', this.isCollapsed);
        
        this.isCollapsed = !this.isCollapsed;
        this.updateSidebarState();
        
        console.log('✅ [SidebarManager] Sidebar toggled to:', this.isCollapsed ? 'collapsed' : 'expanded');
    }

    updateSidebarState() {
        if (!this.sidebar) return;
        
        // Update sidebar classes
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
    }

    updateChildElements() {
        const elementsToUpdate = [
            '.sidebar-header',
            '.sidebar-logo-container', 
            '.sidebar-logo-text',
            '.sidebar-toggle',
            '.sidebar-toggle-icon',
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
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (this.isCollapsed) {
                    el.classList.add('collapsed');
                } else {
                    el.classList.remove('collapsed');
                }
            });
        });
        
        // Special handling for collapsed user avatar
        const userCollapsed = document.querySelectorAll('.sidebar-user-collapsed');
        userCollapsed.forEach(el => {
            if (this.isCollapsed) {
                el.classList.add('show');
            } else {
                el.classList.remove('show');
            }
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
