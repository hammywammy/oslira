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
            
// Create external toggle
this.createExternalToggle();

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
        
        // Initialize toggle functionality
        this.initializeToggle();
        
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

    // Add this method to the SidebarManager class
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
        top: 2rem !important;
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
    
    // Force dimensional changes with inline styles
    if (this.isCollapsed) {
        // Collapsed state: 64px width
        this.sidebar.classList.add('collapsed');
        this.sidebar.style.width = '64px';
        this.sidebar.style.minWidth = '64px';
        this.sidebar.style.maxWidth = '64px';
        
        if (this.mainContent) {
            this.mainContent.classList.add('sidebar-collapsed');
            this.mainContent.style.marginLeft = '64px';
        }
    } else {
        // Expanded state: 256px width
        this.sidebar.classList.remove('collapsed');
        this.sidebar.style.width = '256px';
        this.sidebar.style.minWidth = '256px';
        this.sidebar.style.maxWidth = '256px';
        
        if (this.mainContent) {
            this.mainContent.classList.remove('sidebar-collapsed');
            this.mainContent.style.marginLeft = '256px';
        }
    }
    
    // Update external toggle button position
    const externalToggle = document.getElementById('sidebar-toggle');
    if (externalToggle) {
        if (this.isCollapsed) {
            externalToggle.style.left = '72px'; // 64px + 8px gap
        } else {
            externalToggle.style.left = '264px'; // 256px + 8px gap
        }
    }
    
    // Update all child elements
    this.updateChildElements();
    
    // Force reflow to ensure changes take effect
    this.sidebar.offsetHeight;
    if (this.mainContent) {
        this.mainContent.offsetHeight;
    }

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
    
    console.log('✅ [SidebarManager] State updated - Width:', this.sidebar.style.width, 'Main margin:', this.mainContent?.style.marginLeft);
}

updateChildElements() {
    if (!this.sidebar) return;
    
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
        const elements = this.sidebar.querySelectorAll(selector);
        elements.forEach(el => {
            if (this.isCollapsed) {
                el.classList.add('collapsed');
            } else {
                el.classList.remove('collapsed');
            }
        });
    });
    
    if (this.isCollapsed) {
        // COLLAPSED STATE - Force perfect centering
        
        // 1. Fix sidebar overflow
        this.sidebar.style.overflowX = 'hidden';
        this.sidebar.style.overflowY = 'auto';
        
        // 2. Center header elements
        const header = this.sidebar.querySelector('.sidebar-header');
        if (header) {
            header.style.cssText = `
                padding: 0.5rem 0.25rem !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 0.5rem !important;
                overflow: hidden !important;
            `;
        }
        
// 3. Center logo perfectly when collapsed
const logoContainer = this.sidebar.querySelector('.sidebar-logo-container');
if (logoContainer) {
    logoContainer.style.cssText = `
        justify-content: center !important;
        margin-bottom: 0.5rem !important;
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
    `;
}

// 4. Center just the logo image
const logoImage = this.sidebar.querySelector('.sidebar-logo-image');
if (logoImage) {
    logoImage.style.cssText = `
        margin: 0 auto !important;
        display: block !important;
    `;
}
        
        // 4. Hide logo text completely
        const logoText = this.sidebar.querySelector('.sidebar-logo-text');
        if (logoText) {
            logoText.style.display = 'none';
        }
        
        // 5. Style toggle button as chevron
        const toggle = this.sidebar.querySelector('.sidebar-toggle');
        if (toggle) {
            toggle.style.cssText = `
                padding: 0.25rem !important;
                width: 2rem !important;
                height: 2rem !important;
                margin: 0 auto !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            `;
        }
        
        // 6. Rotate chevron for collapsed state
        const toggleIcon = this.sidebar.querySelector('.sidebar-toggle-icon');
        if (toggleIcon) {
            toggleIcon.style.transform = 'rotate(0deg)';
        }
        
        // 7. Center navigation
        const nav = this.sidebar.querySelector('.sidebar-nav');
        if (nav) {
            nav.style.cssText = `
                padding: 0.25rem !important;
                align-items: center !important;
                overflow: hidden !important;
            `;
        }
        
        // 8. Perfect center all nav items and icons
        const navItems = this.sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.style.cssText = `
                justify-content: center !important;
                align-items: center !important;
                gap: 0 !important;
                padding: 0.5rem !important;
                width: 3rem !important;
                height: 3rem !important;
                margin: 0.125rem auto !important;
                border-radius: 0.5rem !important;
                display: flex !important;
            `;
            
            // Center the icon within each item
            const icon = item.querySelector('.nav-icon');
            if (icon) {
                icon.style.cssText = `
                    margin: 0 auto !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 1.5rem !important;
                    height: 1.5rem !important;
                    font-size: 1.25rem !important;
                `;
            }
        });
        
        // 9. Hide all text elements
        const navTexts = this.sidebar.querySelectorAll('.nav-text');
        navTexts.forEach(text => text.style.display = 'none');
        
        const sectionHeaders = this.sidebar.querySelectorAll('.nav-section-header');
        sectionHeaders.forEach(header => header.style.display = 'none');
        
        // 10. Center user section
        const userSection = this.sidebar.querySelector('.sidebar-user-section');
        if (userSection) {
            userSection.style.cssText = `
                padding: 0.5rem 0.25rem !important;
                display: flex !important;
                justify-content: center !important;
            `;
        }
        
        // 11. Show collapsed user avatar centered
        const userCollapsed = this.sidebar.querySelectorAll('.sidebar-user-collapsed');
        userCollapsed.forEach(el => {
            el.classList.add('show');
            el.style.cssText = `
                display: flex !important;
                justify-content: center !important;
                width: 100% !important;
            `;
        });
        
        // 12. Hide expanded user info
        const userExpanded = this.sidebar.querySelectorAll('.sidebar-user-expanded');
        userExpanded.forEach(el => el.style.display = 'none');
        
    } else {
        // EXPANDED STATE - Reset all styles
        
        // Reset overflow
        this.sidebar.style.overflowX = 'visible';
        this.sidebar.style.overflowY = 'auto';
        
        // Reset header
        const header = this.sidebar.querySelector('.sidebar-header');
        if (header) {
            header.style.cssText = `
                padding: 1rem !important;
                border-bottom: 1px solid rgba(229,231,235,0.5) !important;
                transition: all 0.3s ease !important;
            `;
        }
        
        // Reset logo
        const logoContainer = this.sidebar.querySelector('.sidebar-logo-container');
        if (logoContainer) {
            logoContainer.style.cssText = `
                display: flex !important;
                align-items: center !important;
                gap: 0.75rem !important;
                margin-bottom: 1rem !important;
            `;
        }
        
        const logoText = this.sidebar.querySelector('.sidebar-logo-text');
        if (logoText) {
            logoText.style.display = 'block';
        }
        
        // Reset toggle
        const toggle = this.sidebar.querySelector('.sidebar-toggle');
        if (toggle) {
            toggle.style.cssText = `
                padding: 0.5rem !important;
                color: #6b7280 !important;
                border-radius: 0.5rem !important;
                transition: all 0.2s ease !important;
                background: none !important;
                border: none !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            `;
        }
        
        // Rotate chevron for expanded state
        const toggleIcon = this.sidebar.querySelector('.sidebar-toggle-icon');
        if (toggleIcon) {
            toggleIcon.style.transform = 'rotate(180deg)';
        }
        
        // Reset navigation
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
        
        // Reset nav items
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
                min-height: 2.75rem !important;
                text-decoration: none !important;
                width: auto !important;
                margin: 0 !important;
            `;
            
            const icon = item.querySelector('.nav-icon');
            if (icon) {
                icon.style.cssText = `
                    width: 1.25rem !important;
                    height: 1.25rem !important;
                    flex-shrink: 0 !important;
                    font-size: 1.25rem !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                `;
            }
        });
        
        // Show text elements
        const navTexts = this.sidebar.querySelectorAll('.nav-text');
        navTexts.forEach(text => text.style.display = 'block');
        
        const sectionHeaders = this.sidebar.querySelectorAll('.nav-section-header');
        sectionHeaders.forEach(header => header.style.display = 'block');
        
        // Reset user section
        const userSection = this.sidebar.querySelector('.sidebar-user-section');
        if (userSection) {
            userSection.style.cssText = `
                padding: 1rem !important;
                border-top: 1px solid rgba(229,231,235,0.5) !important;
            `;
        }
        
        // Hide collapsed user avatar
        const userCollapsed = this.sidebar.querySelectorAll('.sidebar-user-collapsed');
        userCollapsed.forEach(el => {
            el.classList.remove('show');
            el.style.display = 'none';
        });
        
        // Show expanded user info
        const userExpanded = this.sidebar.querySelectorAll('.sidebar-user-expanded');
        userExpanded.forEach(el => el.style.display = 'block');
    }
}
initializeToggle() {
    // External toggle is already created and has event listener
    // This method can be simplified or removed
    console.log('✅ [SidebarManager] Toggle initialization complete (external toggle used)');
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
    
// Apply sidebar classes and inject HTML
targetElement.className = 'sidebar';
targetElement.innerHTML = this.getSidebarHTML();


// Create external toggle button if it doesn't exist
let externalToggle = document.getElementById('sidebar-toggle');
if (!externalToggle) {
    externalToggle = document.createElement('button');
    externalToggle.id = 'sidebar-toggle';
    externalToggle.className = 'sidebar-external-toggle';
    externalToggle.innerHTML = `
        <svg class="sidebar-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
    `;
    document.body.appendChild(externalToggle);
}
    
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

// Create thin vertical toggle attached to sidebar edge
window.createAttachedThinToggle = function() {
    console.log('🔧 Creating thin attached toggle...');
    
    // Remove any existing toggle
    const existing = document.getElementById('sidebar-external-toggle');
    if (existing) existing.remove();
    
    // Create thin vertical toggle
    const toggle = document.createElement('button');
    toggle.id = 'sidebar-external-toggle';
    toggle.innerHTML = `
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
    `;
    
    // Style as thin vertical bar attached to sidebar
    toggle.style.cssText = `
        position: fixed;
        top: 50%;
        left: 256px;
        transform: translateY(-50%);
        width: 1rem;
        height: 3rem;
        background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(229,231,235,0.6);
        border-left: none;
        border-radius: 0 0.5rem 0.5rem 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 2px 0 8px rgba(0,0,0,0.1);
        color: #6b7280;
        transition: all 0.3s ease;
    `;
    
    // Add hover effect
    toggle.onmouseenter = function() {
        this.style.background = 'rgba(255,255,255,0.98)';
        this.style.color = '#374151';
        this.style.boxShadow = '2px 0 12px rgba(0,0,0,0.15)';
    };
    
    toggle.onmouseleave = function() {
        this.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)';
        this.style.color = '#6b7280';
        this.style.boxShadow = '2px 0 8px rgba(0,0,0,0.1)';
    };
    
    // Click functionality
    toggle.onclick = function() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const isCollapsed = sidebar?.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            sidebar.classList.remove('collapsed');
            sidebar.style.width = '256px';
            if (mainContent) mainContent.style.marginLeft = '256px';
            toggle.style.left = '256px';
            toggle.querySelector('svg').style.transform = 'rotate(0deg)';

                if (logoContainer) {
        logoContainer.style.cssText = `
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
            margin-bottom: 1rem !important;
            justify-content: flex-start !important;
        `;
    }
        } else {
            // Collapse
            sidebar.classList.add('collapsed');
            sidebar.style.width = '64px';
            if (mainContent) mainContent.style.marginLeft = '64px';
            toggle.style.left = '64px';
            toggle.querySelector('svg').style.transform = 'rotate(180deg)';
        }
        
        // Update child elements including logo centering
        if (window.sidebarManager) {
            window.sidebarManager.isCollapsed = !isCollapsed;
            window.sidebarManager.updateChildElements();
        }
    };
    
    // Add to body
    document.body.appendChild(toggle);
    
    console.log('✅ Thin attached toggle created');
};

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#sidebar-container');
    if (container) {
        window.sidebarManager.render('#sidebar-container').catch(console.error);
    }
});
