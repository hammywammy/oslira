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
        console.log('👤 [SidebarManager] Updating user info...', user?.email);
        this.user = user;

        // Update email
        const emailElement = document.getElementById('sidebar-email');
        if (emailElement && user?.email) {
            emailElement.textContent = user.email;
            console.log('✅ [SidebarManager] Email updated:', user.email);
        } else {
            console.warn('⚠️ [SidebarManager] Email element or user email missing', {
                hasElement: !!emailElement,
                hasEmail: !!user?.email
            });
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
    <!-- Business Selector -->
    <div class="sidebar-business-section">
        <div class="sidebar-business-header">
            <span class="sidebar-business-label">Business</span>
        </div>
        <select id="business-select" class="sidebar-business-select">
            <option value="">Loading...</option>
        </select>
    </div>
    
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
    
    // Initialize business integration
    this.initializeBusinessIntegration();
    
    // Initialize user data integration
    this.initializeUserIntegration();
    
    // Set initial state
    this.updateSidebarState();
    
    console.log('✅ [SidebarManager] Sidebar functionality initialized');
}

toggleSidebar() {
    console.log('🔄 [SidebarManager] Toggling sidebar, current state:', this.isCollapsed);
    
    this.isCollapsed = !this.isCollapsed;
    this.updateSidebarState();
    
    // Update classes and margins
    if (this.isCollapsed) {
        this.sidebar.classList.add('collapsed');
        if (this.mainContent) {
            this.mainContent.classList.add('sidebar-collapsed');
            this.mainContent.style.marginLeft = '64px'; // Collapsed sidebar width
        }
    } else {
        this.sidebar.classList.remove('collapsed');
        if (this.mainContent) {
            this.mainContent.classList.remove('sidebar-collapsed');
            this.mainContent.style.marginLeft = '256px'; // Full sidebar width
        }
    }
}

createExternalToggle() {
    console.log('🔧 [SidebarManager] Creating external toggle...');
    
    // Create the toggle button element
    this.externalToggle = document.createElement('button');
    this.externalToggle.className = 'sidebar-external-toggle';
    
    // Apply comprehensive styling
    this.externalToggle.style.cssText = `
        position: fixed;
        top: 20px;
        left: 256px;
        z-index: 1000;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        color: #374151;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        outline: none;
        user-select: none;
    `;
    
    // Add the toggle icon
    this.externalToggle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.3s ease;">
            <path d="M3 12h18m-9-9l9 9-9 9"/>
        </svg>
    `;
    
    // Add hover effects
    this.externalToggle.addEventListener('mouseenter', () => {
        this.externalToggle.style.background = 'rgba(255, 255, 255, 0.95)';
        this.externalToggle.style.transform = 'scale(1.05)';
        this.externalToggle.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    });

    this.externalToggle.addEventListener('mouseleave', () => {
        this.externalToggle.style.background = 'rgba(255, 255, 255, 0.9)';
        this.externalToggle.style.transform = 'scale(1)';
        this.externalToggle.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    });

    // Add focus effects for accessibility
    this.externalToggle.addEventListener('focus', () => {
        this.externalToggle.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
        this.externalToggle.style.outlineOffset = '2px';
    });

    this.externalToggle.addEventListener('blur', () => {
        this.externalToggle.style.outline = 'none';
    });
    
    // Add click handler
    this.externalToggle.addEventListener('click', () => {
        this.toggleSidebar();
    });
    
    // Append to body
    document.body.appendChild(this.externalToggle);
    
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
// BUSINESS INTEGRATION
// =========================================================================

initializeBusinessIntegration() {
    console.log('🏢 [SidebarManager] Initializing business integration...');
    
    // Wait for business manager to be available
    const waitForBusinessManager = setInterval(() => {
        if (window.businessManager || this.businessManager) {
            clearInterval(waitForBusinessManager);
            const manager = window.businessManager || this.businessManager;
            
            // Trigger initial business selector update
            manager.updateSidebarBusinessSelector();
            console.log('✅ [SidebarManager] Business integration initialized');
        }
    }, 100);
    
    // Clear interval after 5 seconds to prevent infinite polling
    setTimeout(() => clearInterval(waitForBusinessManager), 5000);
}

setBusinessManager(businessManager) {
    this.businessManager = businessManager;
    this.initializeBusinessIntegration();
}
    // =========================================================================
// USER DATA INTEGRATION
// =========================================================================

initializeUserIntegration() {
    console.log('👤 [SidebarManager] Initializing user integration...');
    
    // Wait for OsliraApp to be available and update user info
    const waitForUserData = setInterval(() => {
        if (window.OsliraApp?.user) {
            clearInterval(waitForUserData);
            this.updateUserInfo(window.OsliraApp.user);
            console.log('✅ [SidebarManager] User integration initialized');
        }
    }, 100);
    
    // Clear interval after 10 seconds to prevent infinite polling
    setTimeout(() => clearInterval(waitForUserData), 10000);
    
// Also listen for auth state changes if available
try {
    if (window.OsliraAuth && typeof window.OsliraAuth.onAuthStateChange === 'function') {
        window.OsliraAuth.onAuthStateChange((event, session) => {
            if (session?.user && window.OsliraApp?.user) {
                this.updateUserInfo(window.OsliraApp.user);
            }
        });
    } else {
        console.log('👤 [SidebarManager] Auth state change listener not available, using polling only');
    }
} catch (error) {
    console.warn('⚠️ [SidebarManager] Could not setup auth state listener:', error.message);
}
}

// Helper method to refresh user data from OsliraApp
refreshUserData() {
    if (window.OsliraApp?.user) {
        this.updateUserInfo(window.OsliraApp.user);
        console.log('🔄 [SidebarManager] User data refreshed');
    } else {
        console.warn('⚠️ [SidebarManager] No user data available to refresh');
    }
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

    static refreshAllUserData() {
    if (window.sidebarManager) {
        window.sidebarManager.refreshUserData();
    }
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
