// ==========================================
// MODULE NAVIGATION SIDEBAR - Smart Analytics Navigation
// Enterprise-Grade Analytics Dashboard Component
// ==========================================

import { createIcon, addTooltip } from '../utils/UIHelpers.js';

export class ModuleNavSidebar {
    constructor(container, modules = {}) {
        // Initialize with modules registry
        this.container = container;
        this.modules = modules;
        
        // Configuration
        this.config = {
            position: 'fixed',
            offsetTop: 80, // Offset from top of viewport
            offsetLeft: 20, // Offset from left edge
            autoHide: true, // Hide when not needed
            hideTimeout: 3000, // Auto-hide after 3 seconds
            smoothScroll: true,
            scrollOffset: 100, // Offset when scrolling to sections
            highlightActiveSection: true,
            showProgressIndicator: true,
            compactMode: false,
            animations: true
        };
        
        // State management
        this.state = {
            activeSection: null,
            isVisible: true,
            isExpanded: false,
            isScrolling: false,
            scrollProgress: 0,
            hideTimer: null,
            lastScrollTop: 0,
            moduleContainers: new Map(),
            intersectionObserver: null,
            resizeObserver: null
        };
        
        // Module categories for organization
        this.moduleCategories = {
            overview: {
                name: 'Overview',
                icon: 'activity',
                modules: ['summary', 'insights']
            },
            core: {
                name: 'Core Analytics',
                icon: 'bar-chart',
                modules: ['messageMatrix', 'heatmap', 'ctaTracker']
            },
            intelligence: {
                name: 'AI Intelligence',
                icon: 'brain',
                modules: ['feedbackExplorer', 'claudeGuidance', 'messageRisk']
            },
            performance: {
                name: 'Performance',
                icon: 'trending-up',
                modules: ['crmComparator', 'iterationROI', 'teamDashboard']
            },
            timeline: {
                name: 'Timeline',
                icon: 'clock',
                modules: ['outreachTimeline']
            }
        };
        
        // Default module configuration
        this.defaultModules = [
            { id: 'summary-panel', name: 'Summary', category: 'overview', icon: 'activity' },
            { id: 'insights-panel', name: 'AI Insights', category: 'overview', icon: 'brain' },
            { id: 'message-style-matrix-container', name: 'Style Matrix', category: 'core', icon: 'grid' },
            { id: 'heatmap-container', name: 'Conversion Heatmap', category: 'core', icon: 'map' },
            { id: 'cta-effectiveness-container', name: 'CTA Tracker', category: 'core', icon: 'target' },
            { id: 'feedback-signal-container', name: 'Feedback Explorer', category: 'intelligence', icon: 'message-square' },
            { id: 'claude-guidance-history', name: 'Claude Guidance', category: 'intelligence', icon: 'cpu' },
            { id: 'message-risk-dashboard', name: 'Risk Classifier', category: 'intelligence', icon: 'shield-alert' },
            { id: 'crm-performance-container', name: 'CRM Comparison', category: 'performance', icon: 'users' },
            { id: 'roi-tracker-container', name: 'ROI Tracker', category: 'performance', icon: 'dollar-sign' },
            { id: 'team-impact-dashboard', name: 'Team Dashboard', category: 'performance', icon: 'users-2' },
            { id: 'outreach-timeline-container', name: 'Timeline', category: 'timeline', icon: 'calendar' }
        ];
        
        // Event handlers
        this.boundHandlers = {
            scroll: this.handleScroll.bind(this),
            resize: this.handleResize.bind(this),
            mouseEnter: this.handleMouseEnter.bind(this),
            mouseLeave: this.handleMouseLeave.bind(this),
            moduleClick: this.handleModuleClick.bind(this),
            toggleExpanded: this.handleToggleExpanded.bind(this),
            toggleCompact: this.handleToggleCompact.bind(this)
        };
        
        console.log('🧭 ModuleNavSidebar initialized');
    }

    render() {
        try {
            // Discover available modules
            this.discoverModules();
            
            // Create sidebar structure
            this.createSidebarStructure();
            
            // Setup observers and event listeners
            this.setupObservers();
            this.attachEventListeners();
            
            // Apply styling
            this.applySidebarStyles();
            
            // Initialize with current scroll position
            this.updateActiveSection();
            
            console.log(`✅ ModuleNavSidebar rendered with ${this.state.moduleContainers.size} modules`);
            
        } catch (error) {
            console.error('❌ ModuleNavSidebar render failed:', error);
        }
    }

    discoverModules() {
        // Discover available module containers on the page
        this.state.moduleContainers.clear();
        
        // Try to find modules from the default list
        this.defaultModules.forEach(moduleConfig => {
            const container = document.querySelector(`#${moduleConfig.id}`);
            if (container) {
                // Add data-module-id attribute if not present
                if (!container.hasAttribute('data-module-id')) {
                    container.setAttribute('data-module-id', moduleConfig.id);
                }
                
                this.state.moduleContainers.set(moduleConfig.id, {
                    ...moduleConfig,
                    element: container,
                    position: this.getElementPosition(container),
                    visible: this.isElementVisible(container)
                });
            }
        });
        
        // Also discover any additional modules with data-module-id
        const additionalModules = document.querySelectorAll('[data-module-id]');
        additionalModules.forEach(container => {
            const moduleId = container.getAttribute('data-module-id');
            if (!this.state.moduleContainers.has(moduleId)) {
                this.state.moduleContainers.set(moduleId, {
                    id: moduleId,
                    name: this.generateModuleName(moduleId),
                    category: 'other',
                    icon: 'box',
                    element: container,
                    position: this.getElementPosition(container),
                    visible: this.isElementVisible(container)
                });
            }
        });
        
        console.log(`🔍 Discovered ${this.state.moduleContainers.size} modules:`, 
                   Array.from(this.state.moduleContainers.keys()));
    }

    createSidebarStructure() {
        // Create the main sidebar container
        const sidebarHTML = `
            <div class="module-nav-sidebar ${this.config.compactMode ? 'compact' : ''}" id="module-nav-sidebar">
                <div class="nav-header">
                    <div class="nav-title">
                        ${createIcon('map')}
                        <span class="nav-title-text">Navigation</span>
                    </div>
                    <div class="nav-controls">
                        <button class="nav-control-btn" id="toggle-compact" title="Toggle Compact Mode">
                            ${createIcon('minimize-2')}
                        </button>
                        <button class="nav-control-btn" id="toggle-expanded" title="Toggle Categories">
                            ${createIcon('chevron-down')}
                        </button>
                    </div>
                </div>
                
                <div class="nav-progress" id="nav-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="height: 0%;"></div>
                    </div>
                    <span class="progress-text">0%</span>
                </div>
                
                <nav class="nav-content" id="nav-content">
                    ${this.renderNavigationContent()}
                </nav>
                
                <div class="nav-footer">
                    <div class="module-count">
                        ${this.state.moduleContainers.size} modules
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = sidebarHTML;
    }

    renderNavigationContent() {
        const visibleModules = Array.from(this.state.moduleContainers.values())
            .filter(module => module.visible)
            .sort((a, b) => a.position.top - b.position.top);
        
        if (visibleModules.length === 0) {
            return `
                <div class="nav-empty">
                    <div class="empty-icon">${createIcon('search')}</div>
                    <p>No modules found</p>
                </div>
            `;
        }
        
        // Group modules by category if expanded
        if (this.state.isExpanded) {
            return this.renderCategorizedModules(visibleModules);
        } else {
            return this.renderFlatModules(visibleModules);
        }
    }

    renderCategorizedModules(modules) {
        const categorizedModules = {};
        
        // Group modules by category
        modules.forEach(module => {
            const category = module.category || 'other';
            if (!categorizedModules[category]) {
                categorizedModules[category] = [];
            }
            categorizedModules[category].push(module);
        });
        
        // Render categories
        return Object.entries(categorizedModules).map(([categoryKey, categoryModules]) => {
            const categoryConfig = this.moduleCategories[categoryKey] || {
                name: this.capitalizeName(categoryKey),
                icon: 'folder'
            };
            
            return `
                <div class="nav-category" data-category="${categoryKey}">
                    <div class="category-header">
                        <div class="category-icon">${createIcon(categoryConfig.icon)}</div>
                        <span class="category-name">${categoryConfig.name}</span>
                        <span class="category-count">${categoryModules.length}</span>
                    </div>
                    <div class="category-modules">
                        ${categoryModules.map(module => this.renderModuleItem(module)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderFlatModules(modules) {
        return `
            <div class="nav-modules">
                ${modules.map(module => this.renderModuleItem(module)).join('')}
            </div>
        `;
    }

    renderModuleItem(module) {
        const isActive = this.state.activeSection === module.id;
        const activeClass = isActive ? 'active' : '';
        
        return `
            <div class="nav-module-item ${activeClass}" data-module-id="${module.id}">
                <div class="module-indicator"></div>
                <div class="module-icon">
                    ${createIcon(module.icon)}
                </div>
                <div class="module-info">
                    <span class="module-name">${module.name}</span>
                    <span class="module-status">${this.getModuleStatus(module)}</span>
                </div>
                <div class="module-actions">
                    <button class="action-scroll" title="Scroll to ${module.name}">
                        ${createIcon('arrow-right')}
                    </button>
                </div>
            </div>
        `;
    }

    setupObservers() {
        // Setup Intersection Observer for active section detection
        if ('IntersectionObserver' in window && this.config.highlightActiveSection) {
            this.state.intersectionObserver = new IntersectionObserver(
                this.handleIntersection.bind(this),
                {
                    rootMargin: '-20% 0px -20% 0px',
                    threshold: [0, 0.1, 0.5, 1.0]
                }
            );
            
            // Observe all module containers
            this.state.moduleContainers.forEach(module => {
                this.state.intersectionObserver.observe(module.element);
            });
        }
        
        // Setup Resize Observer for position updates
        if ('ResizeObserver' in window) {
            this.state.resizeObserver = new ResizeObserver(
                this.handleResize.bind(this)
            );
            
            this.state.resizeObserver.observe(document.body);
        }
    }

    attachEventListeners() {
        // Scroll event for progress tracking
        window.addEventListener('scroll', this.boundHandlers.scroll, { passive: true });
        window.addEventListener('resize', this.boundHandlers.resize, { passive: true });
        
        // Sidebar interaction events
        const sidebar = this.container.querySelector('#module-nav-sidebar');
        if (sidebar) {
            sidebar.addEventListener('mouseenter', this.boundHandlers.mouseEnter);
            sidebar.addEventListener('mouseleave', this.boundHandlers.mouseLeave);
        }
        
        // Module click events
        const moduleItems = this.container.querySelectorAll('.nav-module-item');
        moduleItems.forEach(item => {
            item.addEventListener('click', this.boundHandlers.moduleClick);
        });
        
        // Control button events
        const toggleCompactBtn = this.container.querySelector('#toggle-compact');
        const toggleExpandedBtn = this.container.querySelector('#toggle-expanded');
        
        if (toggleCompactBtn) {
            toggleCompactBtn.addEventListener('click', this.boundHandlers.toggleCompact);
            addTooltip(toggleCompactBtn, 'Toggle compact mode');
        }
        
        if (toggleExpandedBtn) {
            toggleExpandedBtn.addEventListener('click', this.boundHandlers.toggleExpanded);
            addTooltip(toggleExpandedBtn, 'Toggle category view');
        }
    }

    // Event Handlers
    handleScroll() {
        if (!this.config.showProgressIndicator) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = Math.min(Math.max(scrollTop / scrollHeight, 0), 1);
        
        this.state.scrollProgress = scrollProgress;
        this.updateScrollProgress();
        
        // Auto-hide logic
        if (this.config.autoHide) {
            this.handleAutoHide(scrollTop);
        }
        
        this.state.lastScrollTop = scrollTop;
    }

    handleAutoHide(scrollTop) {
        const sidebar = this.container.querySelector('#module-nav-sidebar');
        if (!sidebar) return;
        
        // Show sidebar when scrolling up or at top
        if (scrollTop < this.state.lastScrollTop || scrollTop < 100) {
            this.showSidebar();
            this.resetHideTimer();
        } else {
            // Hide sidebar when scrolling down
            this.startHideTimer();
        }
    }

    handleResize() {
        // Update module positions on resize
        this.state.moduleContainers.forEach(module => {
            module.position = this.getElementPosition(module.element);
            module.visible = this.isElementVisible(module.element);
        });
        
        // Re-render navigation if modules visibility changed
        this.updateNavigationContent();
    }

    handleMouseEnter() {
        this.showSidebar();
        this.clearHideTimer();
    }

    handleMouseLeave() {
        if (this.config.autoHide) {
            this.startHideTimer();
        }
    }

    handleModuleClick(event) {
        const moduleItem = event.currentTarget;
        const moduleId = moduleItem.getAttribute('data-module-id');
        
        if (moduleId) {
            this.scrollToModule(moduleId);
            
            // Track interaction
            this.trackUserInteraction('module_click', { moduleId });
        }
    }

    handleToggleCompact() {
        this.config.compactMode = !this.config.compactMode;
        
        const sidebar = this.container.querySelector('#module-nav-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('compact', this.config.compactMode);
        }
        
        // Update button icon
        const button = this.container.querySelector('#toggle-compact');
        if (button) {
            button.innerHTML = this.config.compactMode ? createIcon('maximize-2') : createIcon('minimize-2');
            button.title = this.config.compactMode ? 'Expand view' : 'Compact view';
        }
        
        // Store preference
        localStorage.setItem('moduleNavCompactMode', this.config.compactMode.toString());
        
        this.trackUserInteraction('toggle_compact', { compact: this.config.compactMode });
    }

    handleToggleExpanded() {
        this.state.isExpanded = !this.state.isExpanded;
        
        // Update navigation content
        this.updateNavigationContent();
        
        // Update button icon
        const button = this.container.querySelector('#toggle-expanded');
        if (button) {
            button.innerHTML = this.state.isExpanded ? createIcon('chevron-up') : createIcon('chevron-down');
            button.title = this.state.isExpanded ? 'Hide categories' : 'Show categories';
        }
        
        this.trackUserInteraction('toggle_expanded', { expanded: this.state.isExpanded });
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            const moduleId = entry.target.getAttribute('data-module-id') || entry.target.id;
            
            if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                this.setActiveSection(moduleId);
            }
        });
    }

    // Navigation Methods
    scrollToModule(moduleId) {
        const module = this.state.moduleContainers.get(moduleId);
        if (!module || !module.element) {
            console.warn(`Module ${moduleId} not found`);
            return;
        }
        
        const targetTop = module.position.top - this.config.scrollOffset;
        
        if (this.config.smoothScroll && 'scrollBehavior' in document.documentElement.style) {
            window.scrollTo({
                top: targetTop,
                behavior: 'smooth'
            });
        } else {
            window.scrollTo(0, targetTop);
        }
        
        // Set as active immediately for better UX
        this.setActiveSection(moduleId);
        
        console.log(`🎯 Scrolled to module: ${module.name}`);
    }

    setActiveSection(moduleId) {
        if (this.state.activeSection === moduleId) return;
        
        // Remove previous active state
        if (this.state.activeSection) {
            const prevItem = this.container.querySelector(`[data-module-id="${this.state.activeSection}"]`);
            if (prevItem) {
                prevItem.classList.remove('active');
            }
        }
        
        // Set new active state
        this.state.activeSection = moduleId;
        const newItem = this.container.querySelector(`[data-module-id="${moduleId}"]`);
        if (newItem) {
            newItem.classList.add('active');
        }
        
        console.log(`🎯 Active section: ${moduleId}`);
    }

    updateActiveSection() {
        // Find the module that's currently most visible
        const scrollTop = window.pageYOffset + this.config.scrollOffset;
        let closestModule = null;
        let closestDistance = Infinity;
        
        this.state.moduleContainers.forEach(module => {
            if (!module.visible) return;
            
            const distance = Math.abs(module.position.top - scrollTop);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestModule = module;
            }
        });
        
        if (closestModule) {
            this.setActiveSection(closestModule.id);
        }
    }

    // UI State Management
    showSidebar() {
        const sidebar = this.container.querySelector('#module-nav-sidebar');
        if (sidebar) {
            sidebar.classList.remove('hidden');
            this.state.isVisible = true;
        }
    }

    hideSidebar() {
        const sidebar = this.container.querySelector('#module-nav-sidebar');
        if (sidebar) {
            sidebar.classList.add('hidden');
            this.state.isVisible = false;
        }
    }

    startHideTimer() {
        this.clearHideTimer();
        this.state.hideTimer = setTimeout(() => {
            this.hideSidebar();
        }, this.config.hideTimeout);
    }

    resetHideTimer() {
        this.clearHideTimer();
        this.startHideTimer();
    }

    clearHideTimer() {
        if (this.state.hideTimer) {
            clearTimeout(this.state.hideTimer);
            this.state.hideTimer = null;
        }
    }

    updateScrollProgress() {
        const progressFill = this.container.querySelector('.progress-fill');
        const progressText = this.container.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.height = `${this.state.scrollProgress * 100}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(this.state.scrollProgress * 100)}%`;
        }
    }

    updateNavigationContent() {
        const navContent = this.container.querySelector('#nav-content');
        if (navContent) {
            navContent.innerHTML = this.renderNavigationContent();
            
            // Re-attach event listeners for new elements
            const moduleItems = navContent.querySelectorAll('.nav-module-item');
            moduleItems.forEach(item => {
                item.addEventListener('click', this.boundHandlers.moduleClick);
            });
        }
    }

    // Utility Methods
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        return {
            top: rect.top + scrollTop,
            left: rect.left + scrollLeft,
            bottom: rect.bottom + scrollTop,
            right: rect.right + scrollLeft,
            width: rect.width,
            height: rect.height
        };
    }

    isElementVisible(element) {
        return element && element.offsetParent !== null && 
               getComputedStyle(element).display !== 'none' &&
               getComputedStyle(element).visibility !== 'hidden';
    }

    generateModuleName(moduleId) {
        // Generate a human-readable name from module ID
        return moduleId
            .replace(/-/g, ' ')
            .replace(/container/g, '')
            .replace(/dashboard/g, '')
            .replace(/panel/g, '')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ') || 'Module';
    }

    capitalizeName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    getModuleStatus(module) {
        // Get status indicator for module
        if (!module.element) return 'Missing';
        
        const hasContent = module.element.children.length > 0;
        const hasData = module.element.querySelector('[data-loaded="true"]') !== null;
        
        if (hasData) return 'Active';
        if (hasContent) return 'Loading';
        return 'Empty';
    }

    trackUserInteraction(action, data = {}) {
        const event = {
            module: 'ModuleNavSidebar',
            action: action,
            timestamp: new Date().toISOString(),
            data: data,
            userId: window.OsliraApp?.user?.id || 'anonymous'
        };
        
        console.log('🧭 Navigation Interaction:', event);
        
        // Send to analytics service if available
        if (window.OsliraApp?.analytics?.track) {
            window.OsliraApp.analytics.track(event);
        }
    }

    // Public API Methods
    addModule(moduleConfig) {
        // Add a new module to navigation
        const container = document.querySelector(`#${moduleConfig.id}`);
        if (container) {
            container.setAttribute('data-module-id', moduleConfig.id);
            
            this.state.moduleContainers.set(moduleConfig.id, {
                ...moduleConfig,
                element: container,
                position: this.getElementPosition(container),
                visible: this.isElementVisible(container)
            });
            
            this.updateNavigationContent();
            
            // Start observing new module
            if (this.state.intersectionObserver) {
                this.state.intersectionObserver.observe(container);
            }
        }
    }

    removeModule(moduleId) {
        // Remove module from navigation
        const module = this.state.moduleContainers.get(moduleId);
        if (module) {
            // Stop observing
            if (this.state.intersectionObserver && module.element) {
                this.state.intersectionObserver.unobserve(module.element);
            }
            
            this.state.moduleContainers.delete(moduleId);
            this.updateNavigationContent();
        }
    }

    refreshModules() {
        // Refresh module discovery and positions
        this.discoverModules();
        this.updateNavigationContent();
        this.updateActiveSection();
    }

    setCompactMode(compact) {
        // Programmatically set compact mode
        this.config.compactMode = compact;
        
        const sidebar = this.container.querySelector('#module-nav-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('compact', compact);
        }
    }

    // Cleanup
    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.boundHandlers.scroll);
        window.removeEventListener('resize', this.boundHandlers.resize);
        
        // Disconnect observers
        if (this.state.intersectionObserver) {
            this.state.intersectionObserver.disconnect();
        }
        
        if (this.state.resizeObserver) {
            this.state.resizeObserver.disconnect();
        }
        
        // Clear timers
        this.clearHideTimer();
        
        console.log('🧭 ModuleNavSidebar destroyed');
    }

    applySidebarStyles() {
        // Inject styles for the navigation sidebar
        const styleId = 'module-nav-sidebar-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Module Navigation Sidebar Styles */
            .module-nav-sidebar {
                position: fixed;
                top: 80px;
                left: 20px;
                width: 280px;
                max-height: calc(100vh - 100px);
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                z-index: 1000;
                transition: all 0.3s ease;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .module-nav-sidebar.compact {
                width: 60px;
            }
            
            .module-nav-sidebar.hidden {
                transform: translateX(-100%);
                opacity: 0;
            }
            
            .module-nav-sidebar::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
            }
            
            .nav-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                border-bottom: 1px solid #f1f5f9;
                background: #fafbfc;
            }
            
            .compact .nav-header {
                padding: 12px 8px;
                justify-content: center;
            }
            
            .nav-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                color: #1e293b;
                font-size: 0.9rem;
            }
            
            .compact .nav-title-text {
                display: none;
            }
            
            .nav-title svg {
                width: 16px;
                height: 16px;
                color: #3b82f6;
                flex-shrink: 0;
            }
            
            .nav-controls {
                display: flex;
                gap: 4px;
            }
            
            .compact .nav-controls {
                display: none;
            }
            
            .nav-control-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border: none;
                border-radius: 4px;
                background: transparent;
                color: #64748b;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .nav-control-btn:hover {
                background: #f1f5f9;
                color: #3b82f6;
            }
            
            .nav-control-btn svg {
                width: 14px;
                height: 14px;
            }
            
            .nav-progress {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 20px;
                background: #f8fafc;
                border-bottom: 1px solid #f1f5f9;
            }
            
            .compact .nav-progress {
                padding: 8px;
                justify-content: center;
            }
            
            .progress-bar {
                flex: 1;
                width: 100%;
                height: 4px;
                background: #f1f5f9;
                border-radius: 2px;
                overflow: hidden;
                position: relative;
            }
            
            .compact .progress-bar {
                width: 30px;
            }
            
            .progress-fill {
                width: 3px;
                background: linear-gradient(180deg, #3b82f6, #8b5cf6);
                border-radius: 2px;
                transition: height 0.3s ease;
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .progress-text {
                font-size: 0.75rem;
                font-weight: 600;
                color: #64748b;
                min-width: 30px;
                text-align: center;
            }
            
            .compact .progress-text {
                display: none;
            }
            
            .nav-content {
                flex: 1;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: #cbd5e1 transparent;
            }
            
            .nav-content::-webkit-scrollbar {
                width: 4px;
            }
            
            .nav-content::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .nav-content::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 2px;
            }
            
            .nav-content::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            
            .nav-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                text-align: center;
                color: #64748b;
            }
            
            .empty-icon {
                width: 32px;
                height: 32px;
                margin-bottom: 8px;
                opacity: 0.5;
            }
            
            .nav-empty p {
                margin: 0;
                font-size: 0.875rem;
            }
            
            .nav-modules, .category-modules {
                padding: 8px 0;
            }
            
            .nav-category {
                margin-bottom: 8px;
            }
            
            .category-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 20px;
                background: #f8fafc;
                border-bottom: 1px solid #f1f5f9;
                font-size: 0.8rem;
                font-weight: 600;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }
            
            .compact .category-header {
                padding: 6px 8px;
                justify-content: center;
            }
            
            .category-icon svg {
                width: 12px;
                height: 12px;
                color: #64748b;
            }
            
            .category-name {
                flex: 1;
            }
            
            .compact .category-name {
                display: none;
            }
            
            .category-count {
                background: #e2e8f0;
                color: #475569;
                font-size: 0.7rem;
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
            }
            
            .compact .category-count {
                display: none;
            }
            
            .nav-module-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                border-left: 3px solid transparent;
            }
            
            .compact .nav-module-item {
                padding: 8px;
                justify-content: center;
                gap: 0;
            }
            
            .nav-module-item:hover {
                background: #f8fafc;
                border-left-color: #e2e8f0;
            }
            
            .nav-module-item.active {
                background: #eff6ff;
                border-left-color: #3b82f6;
            }
            
            .nav-module-item.active .module-indicator {
                background: #3b82f6;
            }
            
            .module-indicator {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #cbd5e1;
                transition: all 0.2s ease;
                flex-shrink: 0;
                position: absolute;
                left: 8px;
            }
            
            .compact .module-indicator {
                display: none;
            }
            
            .module-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                background: #f1f5f9;
                color: #64748b;
                flex-shrink: 0;
                transition: all 0.2s ease;
            }
            
            .compact .module-icon {
                width: 28px;
                height: 28px;
            }
            
            .nav-module-item:hover .module-icon {
                background: #e2e8f0;
                color: #475569;
            }
            
            .nav-module-item.active .module-icon {
                background: #dbeafe;
                color: #3b82f6;
            }
            
            .module-icon svg {
                width: 16px;
                height: 16px;
            }
            
            .module-info {
                flex: 1;
                min-width: 0;
            }
            
            .compact .module-info {
                display: none;
            }
            
            .module-name {
                display: block;
                font-size: 0.875rem;
                font-weight: 500;
                color: #1e293b;
                line-height: 1.3;
                margin-bottom: 2px;
            }
            
            .module-status {
                display: block;
                font-size: 0.75rem;
                color: #64748b;
                line-height: 1.2;
            }
            
            .nav-module-item.active .module-name {
                color: #1e40af;
                font-weight: 600;
            }
            
            .module-actions {
                display: flex;
                align-items: center;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .compact .module-actions {
                display: none;
            }
            
            .nav-module-item:hover .module-actions {
                opacity: 1;
            }
            
            .action-scroll {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border: none;
                border-radius: 4px;
                background: transparent;
                color: #64748b;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .action-scroll:hover {
                background: #f1f5f9;
                color: #3b82f6;
            }
            
            .action-scroll svg {
                width: 12px;
                height: 12px;
            }
            
            .nav-footer {
                padding: 12px 20px;
                border-top: 1px solid #f1f5f9;
                background: #fafbfc;
            }
            
            .compact .nav-footer {
                padding: 8px;
                text-align: center;
            }
            
            .module-count {
                font-size: 0.75rem;
                color: #64748b;
                font-weight: 500;
            }
            
            .compact .module-count {
                font-size: 0.7rem;
            }
            
            /* Responsive Design */
            @media (max-width: 1024px) {
                .module-nav-sidebar {
                    left: 10px;
                    width: 240px;
                }
                
                .module-nav-sidebar.compact {
                    width: 50px;
                }
            }
            
            @media (max-width: 768px) {
                .module-nav-sidebar {
                    top: 60px;
                    left: 10px;
                    width: 200px;
                    max-height: calc(100vh - 80px);
                }
                
                .module-nav-sidebar.compact {
                    width: 44px;
                }
                
                .nav-header {
                    padding: 12px 16px;
                }
                
                .nav-progress {
                    padding: 8px 16px;
                }
                
                .nav-module-item {
                    padding: 10px 16px;
                }
                
                .category-header {
                    padding: 6px 16px;
                }
            }
            
            @media (max-width: 480px) {
                .module-nav-sidebar {
                    top: 50px;
                    left: 5px;
                    width: 180px;
                    max-height: calc(100vh - 70px);
                }
                
                .module-nav-sidebar.compact {
                    width: 40px;
                }
                
                .nav-header {
                    padding: 10px 12px;
                }
                
                .nav-title {
                    font-size: 0.8rem;
                }
                
                .nav-progress {
                    padding: 6px 12px;
                }
                
                .nav-module-item {
                    padding: 8px 12px;
                    gap: 8px;
                }
                
                .module-icon {
                    width: 28px;
                    height: 28px;
                }
                
                .module-name {
                    font-size: 0.8rem;
                }
                
                .module-status {
                    font-size: 0.7rem;
                }
            }
            
            /* High Contrast Mode */
            @media (prefers-contrast: high) {
                .module-nav-sidebar {
                    border: 2px solid #000000;
                    background: #ffffff;
                }
                
                .nav-module-item {
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .nav-module-item.active {
                    background: #000000;
                    color: #ffffff;
                }
                
                .nav-module-item.active .module-name,
                .nav-module-item.active .module-icon {
                    color: #ffffff;
                }
            }
            
            /* Reduced Motion */
            @media (prefers-reduced-motion: reduce) {
                .module-nav-sidebar,
                .nav-module-item,
                .module-icon,
                .progress-fill,
                .action-scroll {
                    transition: none;
                }
                
                .module-nav-sidebar.hidden {
                    display: none;
                }
            }
            
            /* Dark Mode Support */
            @media (prefers-color-scheme: dark) {
                .module-nav-sidebar {
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                    border-color: #475569;
                    color: #e2e8f0;
                }
                
                .nav-header,
                .nav-progress,
                .nav-footer {
                    background: #334155;
                    border-color: #475569;
                }
                
                .category-header {
                    background: #374151;
                    border-color: #4b5563;
                    color: #d1d5db;
                }
                
                .nav-title,
                .module-name {
                    color: #f1f5f9;
                }
                
                .module-status,
                .progress-text,
                .module-count {
                    color: #94a3b8;
                }
                
                .nav-module-item:hover {
                    background: #374151;
                }
                
                .nav-module-item.active {
                    background: #1e40af;
                    border-left-color: #60a5fa;
                }
                
                .module-icon {
                    background: #374151;
                    color: #94a3b8;
                }
                
                .nav-module-item:hover .module-icon {
                    background: #4b5563;
                    color: #d1d5db;
                }
                
                .nav-module-item.active .module-icon {
                    background: #2563eb;
                    color: #ffffff;
                }
                
                .progress-bar {
                    background: #374151;
                }
                
                .progress-fill {
                    background: linear-gradient(180deg, #60a5fa, #a78bfa);
                }
                
                .category-count {
                    background: #4b5563;
                    color: #d1d5db;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Module Information and Health Check
    getModuleInfo() {
        return {
            name: 'ModuleNavSidebar',
            version: '1.0.0',
            description: 'Smart navigation sidebar for analytics modules with scroll tracking',
            author: 'Oslira Analytics Team',
            dependencies: [
                'UIHelpers'
            ],
            capabilities: [
                'Automatic module discovery',
                'Smooth scroll navigation',
                'Active section highlighting',
                'Progress tracking',
                'Responsive design',
                'Category organization',
                'Compact mode',
                'Auto-hide functionality'
            ],
            state: {
                modulesCount: this.state.moduleContainers.size,
                activeSection: this.state.activeSection,
                isVisible: this.state.isVisible,
                isExpanded: this.state.isExpanded,
                compactMode: this.config.compactMode,
                scrollProgress: Math.round(this.state.scrollProgress * 100)
            },
            modules: Array.from(this.state.moduleContainers.entries()).map(([id, module]) => ({
                id,
                name: module.name,
                category: module.category,
                visible: module.visible,
                status: this.getModuleStatus(module)
            }))
        };
    }

    async healthCheck() {
        const health = {
            status: 'healthy',
            checks: [],
            timestamp: new Date().toISOString()
        };
        
        try {
            // Check container
            health.checks.push({
                name: 'container',
                status: this.container && this.container.isConnected ? 'pass' : 'fail',
                message: this.container ? 'Container available' : 'Container missing'
            });
            
            // Check modules discovered
            health.checks.push({
                name: 'modules',
                status: this.state.moduleContainers.size > 0 ? 'pass' : 'warn',
                message: `${this.state.moduleContainers.size} modules discovered`
            });
            
            // Check observers
            health.checks.push({
                name: 'intersectionObserver',
                status: this.state.intersectionObserver ? 'pass' : 'warn',
                message: this.state.intersectionObserver ? 'Intersection observer active' : 'No intersection observer'
            });
            
            // Check scroll functionality
            health.checks.push({
                name: 'scrollTracking',
                status: this.config.showProgressIndicator ? 'pass' : 'warn',
                message: this.config.showProgressIndicator ? 'Scroll tracking enabled' : 'Scroll tracking disabled'
            });
            
            // Overall status
            const failCount = health.checks.filter(c => c.status === 'fail').length;
            const warnCount = health.checks.filter(c => c.status === 'warn').length;
            
            if (failCount > 0) {
                health.status = 'unhealthy';
            } else if (warnCount > 1) {
                health.status = 'degraded';
            }
            
        } catch (error) {
            health.status = 'error';
            health.error = error.message;
        }
        
        return health;
    }
}

// Export for ES6 modules
export { ModuleNavSidebar };

// Also make available globally for dynamic loading
window.ModuleNavSidebar = ModuleNavSidebar;

// Module registration for analytics dashboard
if (window.OsliraApp && window.OsliraApp.modules) {
    window.OsliraApp.modules.ModuleNavSidebar = ModuleNavSidebar;
}

console.log('🧭 ModuleNavSidebar module loaded successfully');
