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

// Force immediate style application
targetElement.style.cssText = `
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    height: 100vh !important;
    width: 256px !important;
    background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 50%, rgba(241,245,249,0.92) 100%) !important;
    backdrop-filter: blur(24px) !important;
    -webkit-backdrop-filter: blur(24px) !important;
    border-right: 1px solid rgba(229,231,235,0.5) !important;
    display: flex !important;
    flex-direction: column !important;
    transition: all 0.3s ease !important;
    z-index: 40 !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
`;

// Ensure main content has proper margin
const mainContent = document.querySelector('.main-content, main');
if (mainContent) {
    mainContent.style.marginLeft = '256px';
    mainContent.style.transition = 'margin-left 0.3s ease';
}

// Force browser reflow
targetElement.offsetHeight;
            
            // Store references
            this.sidebar = targetElement;
            this.mainContent = document.querySelector('.main-content, [class*="content"], main');
            
// Initialize functionality  
this.initializeSidebar();

// Verify CSS is loaded and applied
this.verifyCSSLoaded();

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
    // Add this new method after line 116 in public/core/sidebar/sidebar-manager.js

verifyCSSLoaded() {
    console.log('🔍 [SidebarManager] Verifying CSS application...');
    
    if (!this.sidebar) return;
    
    const computed = getComputedStyle(this.sidebar);
    const expectedBg = 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(241, 245, 249, 0.92) 100%)';
    
    console.log('Computed background:', computed.background);
    console.log('Computed width:', computed.width);
    console.log('Computed position:', computed.position);
    
    // If CSS isn't loaded properly, force inline styles
    if (computed.position !== 'fixed' || computed.width !== '256px') {
        console.warn('⚠️ [SidebarManager] CSS not loaded properly, applying emergency styles');
        this.applyEmergencyStyles();
    }
}

applyEmergencyStyles() {
    if (!this.sidebar) return;
    
    console.log('🚨 [SidebarManager] Applying emergency inline styles...');
    
    // Apply all critical styles inline to override any conflicts
    this.sidebar.style.cssText = `
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        height: 100vh !important;
        width: 256px !important;
        background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 50%, rgba(241,245,249,0.92) 100%) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border-right: 1px solid rgba(229,231,235,0.5) !important;
        display: flex !important;
        flex-direction: column !important;
        transition: all 0.3s ease !important;
        z-index: 40 !important;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
        overflow: hidden !important;
    `;
    
    // Apply styles to inner elements
    const header = this.sidebar.querySelector('.sidebar-header');
    if (header) {
        header.style.cssText = `
            padding: 1rem !important;
            border-bottom: 1px solid rgba(229,231,235,0.5) !important;
            transition: all 0.3s ease !important;
            display: flex !important;
            flex-direction: column !important;
        `;
    }
    
    const nav = this.sidebar.querySelector('.sidebar-nav');
    if (nav) {
        nav.style.cssText = `
            flex: 1 !important;
            overflow-y: auto !important;
            padding: 1rem !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.5rem !important;
        `;
    }
    
    const userSection = this.sidebar.querySelector('.sidebar-user-section');
    if (userSection) {
        userSection.style.cssText = `
            padding: 1rem !important;
            border-top: 1px solid rgba(229,231,235,0.5) !important;
        `;
    }
    
    // Style navigation items
    const navItems = this.sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.style.cssText = `
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
            padding: 0.625rem 0.75rem !important;
            color: #374151 !important;
            border-radius: 0.5rem !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
            text-decoration: none !important;
            min-height: 2.75rem !important;
        `;
    });
    
    // Style user info
    const userInfo = this.sidebar.querySelector('.sidebar-user-info');
    if (userInfo) {
        userInfo.style.cssText = `
            background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(219,234,254,0.6) 50%, rgba(196,181,253,0.5) 100%) !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
            border-radius: 0.75rem !important;
            padding: 1rem !important;
            box-shadow: 0 8px 15px rgba(0,0,0,0.1) !important;
        `;
    }
    
    console.log('✅ [SidebarManager] Emergency styles applied');
    
    // Force reflow to ensure styles are applied
    this.sidebar.offsetHeight;
}

// Update the updateSidebarState method to handle collapsed state emergency styles
updateSidebarStateWithEmergency() {
    if (!this.sidebar) return;
    
    // Update sidebar classes
    if (this.isCollapsed) {
        this.sidebar.classList.add('collapsed');
        // Apply collapsed emergency styles
        this.sidebar.style.width = '64px !important';
        if (this.mainContent) {
            this.mainContent.classList.add('sidebar-collapsed');
            this.mainContent.style.marginLeft = '64px';
        }
    } else {
        this.sidebar.classList.remove('collapsed');
        // Apply expanded emergency styles
        this.sidebar.style.width = '256px !important';
        if (this.mainContent) {
            this.mainContent.classList.remove('sidebar-collapsed');
            this.mainContent.style.marginLeft = '256px';
        }
    }
    
    // Update all child elements
    this.updateChildElements();
    
    // Apply emergency styles to collapsed elements
    if (this.isCollapsed) {
        const navTexts = this.sidebar.querySelectorAll('.nav-text');
        navTexts.forEach(text => {
            text.style.cssText = 'opacity: 0 !important; width: 0 !important; overflow: hidden !important;';
        });
        
        const sectionHeaders = this.sidebar.querySelectorAll('.nav-section-header');
        sectionHeaders.forEach(header => {
            header.style.cssText = 'opacity: 0 !important; height: 0 !important; overflow: hidden !important;';
        });
        
        const logoText = this.sidebar.querySelector('.sidebar-logo-text');
        if (logoText) {
            logoText.style.cssText = 'opacity: 0 !important; width: 0 !important; overflow: hidden !important;';
        }
    } else {
        const navTexts = this.sidebar.querySelectorAll('.nav-text');
        navTexts.forEach(text => {
            text.style.cssText = 'opacity: 1 !important; width: auto !important; overflow: visible !important;';
        });
        
        const sectionHeaders = this.sidebar.querySelectorAll('.nav-section-header');
        sectionHeaders.forEach(header => {
            header.style.cssText = 'opacity: 1 !important; height: auto !important; overflow: visible !important;';
        });
        
        const logoText = this.sidebar.querySelector('.sidebar-logo-text');
        if (logoText) {
            logoText.style.cssText = 'opacity: 1 !important; width: auto !important; overflow: visible !important;';
        }
    }
}

// Emergency sidebar initialization - call this if normal initialization fails
emergencyInitialization() {
    console.log('🚨 [SidebarManager] Running emergency initialization...');
    
    const container = document.querySelector('#sidebar-container');
    if (!container) {
        console.error('❌ [SidebarManager] No container found for emergency init');
        return;
    }
    
    // Force create sidebar structure
    container.innerHTML = this.getSidebarHTML();
    container.className = 'sidebar';
    
    // Apply emergency styles immediately
    this.sidebar = container;
    this.applyEmergencyStyles();
    
    // Initialize basic functionality
    this.initializeToggle();
    this.initializeNavigation();
    
    // Set up main content
    this.mainContent = document.querySelector('.main-content, main, [class*="content"]');
    if (this.mainContent) {
        this.mainContent.style.marginLeft = '256px';
        this.mainContent.style.transition = 'margin-left 0.3s ease';
    }
    
    console.log('✅ [SidebarManager] Emergency initialization complete');
}


}

// =============================================================================
// GLOBAL INITIALIZATION
// =============================================================================

// Export for global use
window.SidebarManager = SidebarManager;

// Create global instance
window.sidebarManager = new SidebarManager();
window.SidebarManager = window.sidebarManager;

// Global emergency fix function
window.fixSidebarEmergency = function() {
    console.log('🚨 Running global sidebar emergency fix...');
    
    if (window.sidebarManager) {
        window.sidebarManager.emergencyInitialization();
    } else {
        // Create new instance if none exists
        window.sidebarManager = new SidebarManager();
        window.sidebarManager.emergencyInitialization();
    }
    
    // Test the fix
    setTimeout(() => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const styles = getComputedStyle(sidebar);
            console.log('Emergency fix result:');
            console.log('Width:', styles.width);
            console.log('Position:', styles.position);
            console.log('Background:', styles.background || styles.backgroundColor);
            console.log('Display:', styles.display);
        }
    }, 500);
};

console.log('✅ [SidebarManager] Module loaded and ready');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#sidebar-container');
    if (container) {
        window.sidebarManager.render('#sidebar-container').catch(console.error);
    }
});
