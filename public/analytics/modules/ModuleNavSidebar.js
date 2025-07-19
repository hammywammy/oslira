// ==========================================
// MODULE NAVIGATION SIDEBAR - Smart Analytics Navigation
// Enterprise-Grade Analytics Dashboard Component
// ==========================================

import { BaseSecureModule } from '../utils/baseSecureModule.js';
import { createIcon, addTooltip } from '../utils/UIHelpers.js';

export class ModuleNavSidebar extends BaseSecureModule {
    constructor(container) {
        // Call parent constructor (no services needed for navigation)
        super(container);
        
        // Module-specific configuration
        this.config = {
            ...this.config, // Inherit base config
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
            animations: true,
            collapsible: true,
            persistState: true
        };
        
        // Module-specific state
        this.moduleState = {
            activeSection: null,
            isVisible: true,
            isExpanded: true,
            isScrolling: false,
            scrollProgress: 0,
            hideTimer: null,
            lastScrollTop: 0,
            moduleContainers: new Map(),
            visibleModules: new Set(),
            moduleOrder: []
        };
        
        // Module categories for organization
        this.moduleCategories = {
            overview: {
                name: 'Overview',
                icon: 'activity',
                modules: ['summary-panel', 'insights-panel']
            },
            core: {
                name: 'Core Analytics',
                icon: 'bar-chart',
                modules: ['message-style-matrix-container', 'heatmap-container', 'cta-effectiveness-container']
            },
            intelligence: {
                name: 'AI Intelligence',
                icon: 'brain',
                modules: ['feedback-signal-container', 'claude-guidance-history', 'message-risk-dashboard']
            },
            performance: {
                name: 'Performance',
                icon: 'trending-up',
                modules: ['crm-performance-container', 'roi-tracker-container', 'team-dashboard-container']
            },
            timeline: {
                name: 'Timeline',
                icon: 'clock',
                modules: ['outreach-timeline-container']
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
            { id: 'team-dashboard-container', name: 'Team Impact', category: 'performance', icon: 'users' },
            { id: 'outreach-timeline-container', name: 'Timeline', category: 'timeline', icon: 'clock' }
        ];
        
        // Event handlers
        this.boundHandlers = {
            scroll: this.handleScroll.bind(this),
            moduleClick: this.handleModuleClick.bind(this),
            toggleExpanded: this.handleToggleExpanded.bind(this),
            toggleCompact: this.handleToggleCompact.bind(this),
            mouseEnter: this.handleMouseEnter.bind(this),
            mouseLeave: this.handleMouseLeave.bind(this)
        };
        
        // Setup observers
        this.intersectionObserver = null;
        this.resizeObserver = null;
        
        console.log('🧭 ModuleNavSidebar initialized with smart navigation');
    }
    
    // ===== REQUIRED LIFECYCLE METHODS =====
    
    async render() {
        const startTime = performance.now();
        this.setState('rendering');
        
        try {
            // Discover available modules
            this.discoverModules();
            
            // Render navigation UI
            await this.renderNavigationUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup intersection observer
            this.setupIntersectionObserver();
            
            // Setup resize observer
            this.setupResizeObserver();
            
            // Setup scroll monitoring
            this.setupScrollMonitoring();
            
            // Load persisted state
            this.loadPersistedState();
            
            // Update performance metrics
            const renderTime = performance.now() - startTime;
            this.updatePerformanceMetrics('renderTime', renderTime);
            this.performanceMetrics.totalRenders++;
            
            console.log(`✅ ModuleNavSidebar rendered in ${renderTime.toFixed(2)}ms`);
            
        } catch (error) {
            await this.onError(error, { operation: 'render' });
            throw error;
        }
    }
    
    async cleanup() {
        console.log('🧹 ModuleNavSidebar cleanup starting...');
        
        // Disconnect observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Clear timers
        if (this.moduleState.hideTimer) {
            clearTimeout(this.moduleState.hideTimer);
            this.moduleState.hideTimer = null;
        }
        
        // Clear module containers
        this.moduleState.moduleContainers.clear();
        this.moduleState.visibleModules.clear();
        
        // Call base cleanup
        await this.baseCleanup();
        
        console.log('✅ ModuleNavSidebar cleanup completed');
    }
    
    getModuleInfo() {
        return {
            name: 'ModuleNavSidebar',
            version: '2.0.0',
            description: 'Smart navigation sidebar for analytics modules',
            author: 'Oslira Analytics Team',
            dependencies: [
                'UIHelpers'
            ],
            capabilities: [
                'Module discovery and navigation',
                'Smart auto-hide functionality',
                'Progress tracking',
                'Responsive design',
                'State persistence',
                'Smooth scrolling',
                'Category organization'
            ],
            configuration: Object.keys(this.config),
            state: {
                isVisible: this.moduleState.isVisible,
                isExpanded: this.moduleState.isExpanded,
                activeSection: this.moduleState.activeSection,
                visibleModulesCount: this.moduleState.visibleModules.size,
                totalModules: this.moduleState.moduleOrder.length,
                scrollProgress: this.moduleState.scrollProgress
            },
            performance: this.getPerformanceMetrics()
        };
    }
    
    // ===== OPTIONAL LIFECYCLE METHODS =====
    
    async ready() {
        await super.ready();
        
        // Start auto-hide timer if enabled
        if (this.config.autoHide) {
            this.startAutoHideTimer();
        }
        
        // Update initial active section
        this.updateActiveSection();
        
        console.log('🧭 ModuleNavSidebar ready for navigation');
    }
    
    async onResize() {
        const containerWidth = window.innerWidth;
        
        // Auto-switch to compact mode on small screens
        if (containerWidth < 768 && !this.config.compactMode) {
            this.enableCompactMode();
        } else if (containerWidth >= 768 && this.config.compactMode) {
            this.disableCompactMode();
        }
        
        // Update position if needed
        this.updatePosition();
    }
    
    // ===== MODULE DISCOVERY =====
    
    discoverModules() {
        // Discover modules from global registry
        const globalModules = window.OsliraApp?.modules || new Map();
        
        // Discover modules from DOM
        const moduleElements = document.querySelectorAll('[data-module], .module-container, [id*="container"], [id*="panel"]');
        
        // Combine default modules with discovered ones
        const discoveredModules = new Set();
        
        // Add default modules that exist in DOM
        this.defaultModules.forEach(moduleConfig => {
            const element = document.getElementById(moduleConfig.id);
            if (element) {
                discoveredModules.add(moduleConfig);
                this.moduleState.moduleContainers.set(moduleConfig.id, element);
            }
        });
        
        // Add discovered elements
        moduleElements.forEach(element => {
            if (element.id && !this.moduleState.moduleContainers.has(element.id)) {
                const moduleConfig = {
                    id: element.id,
                    name: this.inferModuleName(element),
                    category: this.inferModuleCategory(element),
                    icon: this.inferModuleIcon(element)
                };
                
                discoveredModules.add(moduleConfig);
                this.moduleState.moduleContainers.set(element.id, element);
            }
        });
        
        // Update module order
        this.moduleState.moduleOrder = Array.from(discoveredModules);
        
        console.log(`🔍 ModuleNavSidebar discovered ${this.moduleState.moduleOrder.length} modules`);
    }
    
    inferModuleName(element) {
        // Try to infer name from various sources
        const dataName = element.dataset.name || element.dataset.module;
        if (dataName) return dataName;
        
        const title = element.title || element.getAttribute('aria-label');
        if (title) return title;
        
        const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) return heading.textContent.trim();
        
        // Fallback to ID-based name
        return element.id
            .replace(/[-_]/g, ' ')
            .replace(/container|panel|dashboard/gi, '')
            .trim()
            .replace(/\b\w/g, l => l.toUpperCase()) || 'Module';
    }
    
    inferModuleCategory(element) {
        const id = element.id.toLowerCase();
        
        if (id.includes('summary') || id.includes('overview') || id.includes('insights')) {
            return 'overview';
        }
        if (id.includes('ai') || id.includes('claude') || id.includes('risk') || id.includes('feedback')) {
            return 'intelligence';
        }
        if (id.includes('performance') || id.includes('roi') || id.includes('crm') || id.includes('team')) {
            return 'performance';
        }
        if (id.includes('timeline') || id.includes('outreach')) {
            return 'timeline';
        }
        
        return 'core';
    }
    
    inferModuleIcon(element) {
        const id = element.id.toLowerCase();
        const iconMap = {
            summary: 'activity',
            insights: 'brain',
            matrix: 'grid',
            heatmap: 'map',
            cta: 'target',
            feedback: 'message-square',
            claude: 'cpu',
            risk: 'shield-alert',
            crm: 'users',
            roi: 'dollar-sign',
            team: 'users',
            timeline: 'clock',
            outreach: 'send'
        };
        
        for (const [keyword, icon] of Object.entries(iconMap)) {
            if (id.includes(keyword)) {
                return icon;
            }
        }
        
        return 'box';
    }
    
    // ===== UI RENDERING =====
    
    async renderNavigationUI() {
        const categories = this.organizeModulesByCategory();
        
        const sidebarHtml = `
            <div class="nav-sidebar ${this.config.compactMode ? 'compact' : ''} ${this.moduleState.isExpanded ? 'expanded' : 'collapsed'}">
                <!-- Header -->
                <div class="nav-header">
                    <div class="nav-title">
                        ${createIcon('compass', { size: '20px' })}
                        <span class="title-text">Navigation</span>
                    </div>
                    <div class="nav-controls">
                        <button class="nav-btn toggle-expanded" data-action="toggleExpanded" title="${this.moduleState.isExpanded ? 'Collapse' : 'Expand'} sidebar">
                            ${createIcon(this.moduleState.isExpanded ? 'chevron-left' : 'chevron-right', { size: '16px' })}
                        </button>
                        <button class="nav-btn toggle-compact" data-action="toggleCompact" title="Toggle compact mode">
                            ${createIcon(this.config.compactMode ? 'maximize' : 'minimize', { size: '16px' })}
                        </button>
                    </div>
                </div>
                
                <!-- Progress Indicator -->
                ${this.config.showProgressIndicator ? `
                    <div class="scroll-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${this.moduleState.scrollProgress}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(this.moduleState.scrollProgress)}%</span>
                    </div>
                ` : ''}
                
                <!-- Navigation Menu -->
                <nav class="nav-menu">
                    ${Object.entries(categories).map(([categoryKey, category]) => `
                        <div class="nav-category" data-category="${categoryKey}">
                            <div class="category-header">
                                ${createIcon(category.icon, { size: '16px' })}
                                <span class="category-name">${category.name}</span>
                                <span class="module-count">${category.modules.length}</span>
                            </div>
                            <div class="category-modules">
                                ${category.modules.map(module => this.renderModuleItem(module)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </nav>
                
                <!-- Footer -->
                <div class="nav-footer">
                    <div class="module-stats">
                        <span class="visible-count">${this.moduleState.visibleModules.size}</span>
                        <span class="total-count">of ${this.moduleState.moduleOrder.length}</span>
                        <span class="stats-label">visible</span>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = sidebarHtml;
        
        // Inject styles
        this.injectStyles();
        
        // Update visibility states
        this.updateModuleVisibility();
    }
    
    renderModuleItem(module) {
        const isActive = this.moduleState.activeSection === module.id;
        const isVisible = this.moduleState.visibleModules.has(module.id);
        
        return `
            <div class="nav-item ${isActive ? 'active' : ''} ${isVisible ? 'visible' : 'hidden'}" 
                 data-module-id="${module.id}" 
                 data-action="moduleClick">
                <div class="item-indicator"></div>
                <div class="item-icon">
                    ${createIcon(module.icon, { size: '16px' })}
                </div>
                <div class="item-content">
                    <span class="item-name">${module.name}</span>
                    <span class="item-category">${module.category}</span>
                </div>
                <div class="item-status">
                    <span class="visibility-indicator ${isVisible ? 'visible' : 'hidden'}" title="${isVisible ? 'Module visible' : 'Module hidden'}">
                        ${createIcon(isVisible ? 'eye' : 'eye-off', { size: '12px' })}
                    </span>
                </div>
            </div>
        `;
    }
    
    organizeModulesByCategory() {
        const categories = {};
        
        // Initialize categories
        Object.entries(this.moduleCategories).forEach(([key, category]) => {
            categories[key] = {
                ...category,
                modules: []
            };
        });
        
        // Organize modules by category
        this.moduleState.moduleOrder.forEach(module => {
            const categoryKey = module.category || 'core';
            if (categories[categoryKey]) {
                categories[categoryKey].modules.push(module);
            } else {
                // Create category if it doesn't exist
                categories[categoryKey] = {
                    name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
                    icon: 'folder',
                    modules: [module]
                };
            }
        });
        
        // Remove empty categories
        Object.keys(categories).forEach(key => {
            if (categories[key].modules.length === 0) {
                delete categories[key];
            }
        });
        
        return categories;
    }
    
    // ===== EVENT HANDLING =====
    
    setupEventListeners() {
        this.removeAllEventListeners();
        
        // Module clicks
        const moduleItems = this.container.querySelectorAll('[data-action="moduleClick"]');
        moduleItems.forEach(item => {
            this.addEventListener(item, 'click', this.boundHandlers.moduleClick);
        });
        
        // Toggle buttons
        const toggleExpanded = this.container.querySelector('[data-action="toggleExpanded"]');
        if (toggleExpanded) {
            this.addEventListener(toggleExpanded, 'click', this.boundHandlers.toggleExpanded);
        }
        
        const toggleCompact = this.container.querySelector('[data-action="toggleCompact"]');
        if (toggleCompact) {
            this.addEventListener(toggleCompact, 'click', this.boundHandlers.toggleCompact);
        }
        
        // Mouse events for auto-hide
        if (this.config.autoHide) {
            this.addEventListener(this.container, 'mouseenter', this.boundHandlers.mouseEnter);
            this.addEventListener(this.container, 'mouseleave', this.boundHandlers.mouseLeave);
        }
        
        // Global scroll listener
        this.addEventListener(window, 'scroll', this.boundHandlers.scroll, { passive: true });
        
        // Setup tooltips
        this.setupTooltips();
    }
    
    setupTooltips() {
        const moduleItems = this.container.querySelectorAll('.nav-item');
        moduleItems.forEach(item => {
            const moduleName = item.querySelector('.item-name').textContent;
            const moduleCategory = item.querySelector('.item-category').textContent;
            const tooltip = `${moduleName} (${moduleCategory})`;
            
            if (this.config.compactMode) {
                addTooltip(item, tooltip, { placement: 'right' });
            }
        });
    }
    
    // ===== EVENT HANDLERS =====
    
    handleModuleClick(event) {
        event.preventDefault();
        
        const moduleId = event.currentTarget.dataset.moduleId;
        if (!moduleId) return;
        
        const moduleElement = this.moduleState.moduleContainers.get(moduleId);
        if (!moduleElement) {
            console.warn(`Module element not found: ${moduleId}`);
            return;
        }
        
        // Scroll to module
        this.scrollToModule(moduleId);
        
        // Update active section
        this.setActiveSection(moduleId);
        
        // Log navigation
        console.log(`🧭 ModuleNavSidebar navigated to: ${moduleId}`);
    }
    
    handleToggleExpanded(event) {
        event.preventDefault();
        
        this.moduleState.isExpanded = !this.moduleState.isExpanded;
        
        const sidebar = this.container.querySelector('.nav-sidebar');
        const toggleBtn = event.target.closest('.toggle-expanded');
        
        if (this.moduleState.isExpanded) {
            sidebar.classList.add('expanded');
            sidebar.classList.remove('collapsed');
            toggleBtn.innerHTML = createIcon('chevron-left', { size: '16px' });
            toggleBtn.title = 'Collapse sidebar';
        } else {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
            toggleBtn.innerHTML = createIcon('chevron-right', { size: '16px' });
            toggleBtn.title = 'Expand sidebar';
        }
        
        // Persist state
        this.persistState();
        
        console.log(`🧭 ModuleNavSidebar ${this.moduleState.isExpanded ? 'expanded' : 'collapsed'}`);
    }
    
    handleToggleCompact(event) {
        event.preventDefault();
        
        if (this.config.compactMode) {
            this.disableCompactMode();
        } else {
            this.enableCompactMode();
        }
    }
    
    handleMouseEnter(event) {
        if (this.config.autoHide && this.moduleState.hideTimer) {
            clearTimeout(this.moduleState.hideTimer);
            this.moduleState.hideTimer = null;
        }
        
        this.showSidebar();
    }
    
    handleMouseLeave(event) {
        if (this.config.autoHide) {
            this.startAutoHideTimer();
        }
    }
    
    handleScroll(event) {
        // Throttle scroll handling
        if (this.moduleState.isScrolling) return;
        
        this.moduleState.isScrolling = true;
        
        requestAnimationFrame(() => {
            this.updateScrollProgress();
            this.updateActiveSection();
            this.moduleState.isScrolling = false;
        });
    }
    
    // ===== NAVIGATION METHODS =====
    
    scrollToModule(moduleId) {
        const moduleElement = this.moduleState.moduleContainers.get(moduleId);
        if (!moduleElement) return;
        
        const elementTop = moduleElement.offsetTop - this.config.scrollOffset;
        
        if (this.config.smoothScroll) {
            window.scrollTo({
                top: elementTop,
                behavior: 'smooth'
            });
        } else {
            window.scrollTo(0, elementTop);
        }
    }
    
    setActiveSection(moduleId) {
        // Remove previous active state
        const previousActive = this.container.querySelector('.nav-item.active');
        if (previousActive) {
            previousActive.classList.remove('active');
        }
        
        // Set new active state
        const newActive = this.container.querySelector(`[data-module-id="${moduleId}"]`);
        if (newActive) {
            newActive.classList.add('active');
        }
        
        this.moduleState.activeSection = moduleId;
    }
    
    updateActiveSection() {
        if (!this.config.highlightActiveSection) return;
        
        let activeModuleId = null;
        let minDistance = Infinity;
        
        // Find the module closest to viewport center
        const viewportCenter = window.innerHeight / 2 + window.scrollY;
        
        this.moduleState.moduleContainers.forEach((element, moduleId) => {
            if (!this.moduleState.visibleModules.has(moduleId)) return;
            
            const elementCenter = element.offsetTop + element.offsetHeight / 2;
            const distance = Math.abs(viewportCenter - elementCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                activeModuleId = moduleId;
            }
        });
        
        if (activeModuleId && activeModuleId !== this.moduleState.activeSection) {
            this.setActiveSection(activeModuleId);
        }
    }
    
    updateScrollProgress() {
        if (!this.config.showProgressIndicator) return;
        
        const scrollTop = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
        
        this.moduleState.scrollProgress = Math.min(100, Math.max(0, progress));
        
        // Update progress bar
        const progressFill = this.container.querySelector('.progress-fill');
        const progressText = this.container.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${this.moduleState.scrollProgress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(this.moduleState.scrollProgress)}%`;
        }
    }
    
    // ===== INTERSECTION OBSERVER =====
    
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) return;
        
        const options = {
            root: null,
            rootMargin: '-20% 0px -20% 0px',
            threshold: [0, 0.25, 0.5, 0.75, 1]
        };
        
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const moduleId = entry.target.id;
                
                if (entry.isIntersecting) {
                    this.moduleState.visibleModules.add(moduleId);
                } else {
                    this.moduleState.visibleModules.delete(moduleId);
                }
            });
            
            // Update visibility indicators
            this.updateModuleVisibility();
            
        }, options);
        
        // Observe all module containers
        this.moduleState.moduleContainers.forEach((element) => {
            this.intersectionObserver.observe(element);
        });
        
        this.observers.add(this.intersectionObserver);
    }
    
    setupResizeObserver() {
        if (!('ResizeObserver' in window)) return;
        
        this.resizeObserver = new ResizeObserver(() => {
            this.onResize();
        });
        
        this.resizeObserver.observe(document.body);
        this.observers.add(this.resizeObserver);
    }
    
    setupScrollMonitoring() {
        // Monitor scroll direction for auto-hide
        let lastScrollTop = 0;
        
        this.addEventListener(window, 'scroll', () => {
            const scrollTop = window.scrollY;
            const scrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
            
            if (this.config.autoHide) {
                if (scrollDirection === 'down' && scrollTop > 100) {
                    this.hideSidebar();
                } else if (scrollDirection === 'up') {
                    this.showSidebar();
                }
            }
            
            lastScrollTop = scrollTop;
        }, { passive: true });
    }
    
    // ===== VISIBILITY MANAGEMENT =====
    
    updateModuleVisibility() {
        const moduleItems = this.container.querySelectorAll('.nav-item');
        
        moduleItems.forEach(item => {
            const moduleId = item.dataset.moduleId;
            const isVisible = this.moduleState.visibleModules.has(moduleId);
            
            item.classList.toggle('visible', isVisible);
            item.classList.toggle('hidden', !isVisible);
            
            const indicator = item.querySelector('.visibility-indicator');
            if (indicator) {
                indicator.innerHTML = createIcon(isVisible ? 'eye' : 'eye-off', { size: '12px' });
                indicator.title = isVisible ? 'Module visible' : 'Module hidden';
            }
        });
        
        // Update stats
        const visibleCount = this.container.querySelector('.visible-count');
        if (visibleCount) {
            visibleCount.textContent = this.moduleState.visibleModules.size;
        }
    }
    
    showSidebar() {
        this.moduleState.isVisible = true;
        this.container.querySelector('.nav-sidebar')?.classList.remove('auto-hidden');
    }
    
    hideSidebar() {
        if (!this.config.autoHide) return;
        
        this.moduleState.isVisible = false;
        this.container.querySelector('.nav-sidebar')?.classList.add('auto-hidden');
    }
    
    startAutoHideTimer() {
        if (!this.config.autoHide) return;
        
        if (this.moduleState.hideTimer) {
            clearTimeout(this.moduleState.hideTimer);
        }
        
        this.moduleState.hideTimer = setTimeout(() => {
            this.hideSidebar();
        }, this.config.hideTimeout);
    }
    
    // ===== COMPACT MODE =====
    
    enableCompactMode() {
        this.config.compactMode = true;
        
        const sidebar = this.container.querySelector('.nav-sidebar');
        const toggleBtn = this.container.querySelector('.toggle-compact');
        
        if (sidebar) {
            sidebar.classList.add('compact');
        }
        
        if (toggleBtn) {
            toggleBtn.innerHTML = createIcon('maximize', { size: '16px' });
            toggleBtn.title = 'Exit compact mode';
        }
        
        // Update tooltips for compact mode
        this.setupTooltips();
        
        // Persist state
        this.persistState();
        
        console.log('🧭 ModuleNavSidebar compact mode enabled');
    }
    
    disableCompactMode() {
        this.config.compactMode = false;
        
        const sidebar = this.container.querySelector('.nav-sidebar');
        const toggleBtn = this.container.querySelector('.toggle-compact');
        
        if (sidebar) {
            sidebar.classList.remove('compact');
        }
        
        if (toggleBtn) {
            toggleBtn.innerHTML = createIcon('minimize', { size: '16px' });
            toggleBtn.title = 'Enable compact mode';
        }
        
        // Persist state
        this.persistState();
        
        console.log('🧭 ModuleNavSidebar compact mode disabled');
    }
    
    // ===== STATE PERSISTENCE =====
    
    persistState() {
        if (!this.config.persistState) return;
        
        const state = {
            isExpanded: this.moduleState.isExpanded,
            compactMode: this.config.compactMode,
            autoHide: this.config.autoHide
        };
        
        try {
            localStorage.setItem('oslira_nav_sidebar_state', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to persist sidebar state:', error);
        }
    }
    
    loadPersistedState() {
        if (!this.config.persistState) return;
        
        try {
            const stored = localStorage.getItem('oslira_nav_sidebar_state');
            if (stored) {
                const state = JSON.parse(stored);
                
                this.moduleState.isExpanded = state.isExpanded !== false;
                this.config.compactMode = state.compactMode || false;
                this.config.autoHide = state.autoHide !== false;
                
                // Apply loaded state
                if (this.config.compactMode) {
                    this.enableCompactMode();
                }
                
                if (!this.moduleState.isExpanded) {
                    const sidebar = this.container.querySelector('.nav-sidebar');
                    if (sidebar) {
                        sidebar.classList.remove('expanded');
                        sidebar.classList.add('collapsed');
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load persisted sidebar state:', error);
        }
    }
    
    updatePosition() {
        const sidebar = this.container.querySelector('.nav-sidebar');
        if (!sidebar) return;
        
        // Update position based on config
        sidebar.style.top = `${this.config.offsetTop}px`;
        sidebar.style.left = `${this.config.offsetLeft}px`;
    }
    
    // ===== STYLES INJECTION =====
    
    injectStyles() {
        if (document.getElementById('module-nav-sidebar-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'module-nav-sidebar-styles';
        style.textContent = `
            .nav-sidebar {
                position: fixed;
                top: 80px;
                left: 20px;
                width: 280px;
                max-height: calc(100vh - 100px);
                background: var(--bg-primary, #ffffff);
                border: 1px solid var(--border-light, #e5e7eb);
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                z-index: 1000;
                overflow: hidden;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
            }
            
            .nav-sidebar.collapsed {
                width: 60px;
            }
            
            .nav-sidebar.compact {
                width: 240px;
            }
            
            .nav-sidebar.compact.collapsed {
                width: 50px;
            }
            
            .nav-sidebar.auto-hidden {
                transform: translateX(-100%);
                opacity: 0.3;
            }
            
            .nav-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid var(--border-light, #e5e7eb);
                background: var(--bg-secondary, #f9fafb);
            }
            
            .nav-title {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }
            
            .nav-sidebar.collapsed .title-text {
                display: none;
            }
            
            .nav-controls {
                display: flex;
                gap: 0.25rem;
            }
            
            .nav-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: none;
                border: 1px solid var(--border-light, #e5e7eb);
                border-radius: 4px;
                color: var(--text-secondary, #6b7280);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .nav-btn:hover {
                background: var(--primary-blue, #3b82f6);
                color: white;
                border-color: var(--primary-blue, #3b82f6);
            }
            
            .scroll-progress {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                background: var(--bg-secondary, #f9fafb);
                border-bottom: 1px solid var(--border-light, #e5e7eb);
            }
            
            .progress-bar {
                flex: 1;
                height: 4px;
                background: var(--border-light, #e5e7eb);
                border-radius: 2px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: var(--primary-blue, #3b82f6);
                border-radius: 2px;
                transition: width 0.3s ease;
            }
            
            .progress-text {
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
                min-width: 32px;
                text-align: right;
            }
            
            .nav-sidebar.collapsed .scroll-progress {
                padding: 0.75rem 0.5rem;
            }
            
            .nav-sidebar.collapsed .progress-text {
                display: none;
            }
            
            .nav-menu {
                flex: 1;
                overflow-y: auto;
                padding: 0.5rem 0;
            }
            
            .nav-category {
                margin-bottom: 0.5rem;
            }
            
            .category-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--text-secondary, #6b7280);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .module-count {
                margin-left: auto;
                background: var(--bg-secondary, #f9fafb);
                color: var(--text-secondary, #6b7280);
                padding: 0.125rem 0.375rem;
                border-radius: 8px;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .nav-sidebar.collapsed .category-header {
                padding: 0.5rem;
                justify-content: center;
            }
            
            .nav-sidebar.collapsed .category-name,
            .nav-sidebar.collapsed .module-count {
                display: none;
            }
            
            .category-modules {
                padding-left: 0.5rem;
            }
            
            .nav-sidebar.collapsed .category-modules {
                padding-left: 0;
            }
            
            .nav-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                margin: 0.125rem 0.5rem;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                opacity: 0.6;
            }
            
            .nav-item.visible {
                opacity: 1;
            }
            
            .nav-item:hover {
                background: var(--bg-secondary, #f9fafb);
                transform: translateX(2px);
            }
            
            .nav-item.active {
                background: rgba(59, 130, 246, 0.1);
                color: var(--primary-blue, #3b82f6);
                font-weight: 600;
            }
            
            .nav-item.active .item-indicator {
                background: var(--primary-blue, #3b82f6);
            }
            
            .item-indicator {
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 3px;
                height: 16px;
                background: transparent;
                border-radius: 0 2px 2px 0;
                transition: all 0.2s ease;
            }
            
            .item-icon {
                flex-shrink: 0;
                color: var(--text-secondary, #6b7280);
                transition: color 0.2s ease;
            }
            
            .nav-item.active .item-icon {
                color: var(--primary-blue, #3b82f6);
            }
            
            .item-content {
                flex: 1;
                min-width: 0;
            }
            
            .item-name {
                display: block;
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--text-primary, #1f2937);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .item-category {
                display: block;
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
                margin-top: 0.125rem;
            }
            
            .item-status {
                flex-shrink: 0;
            }
            
            .visibility-indicator {
                color: var(--text-secondary, #6b7280);
                opacity: 0.5;
                transition: all 0.2s ease;
            }
            
            .nav-item.visible .visibility-indicator {
                opacity: 1;
                color: var(--success, #10b981);
            }
            
            .nav-sidebar.collapsed .item-content,
            .nav-sidebar.collapsed .item-status {
                display: none;
            }
            
            .nav-sidebar.collapsed .nav-item {
                justify-content: center;
                padding: 0.75rem 0.5rem;
                margin: 0.125rem 0.25rem;
            }
            
            .nav-footer {
                padding: 0.75rem 1rem;
                border-top: 1px solid var(--border-light, #e5e7eb);
                background: var(--bg-secondary, #f9fafb);
            }
            
            .module-stats {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
            }
            
            .visible-count {
                font-weight: 600;
                color: var(--success, #10b981);
            }
            
            .total-count {
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }
            
            .nav-sidebar.collapsed .module-stats {
                justify-content: center;
            }
            
            .nav-sidebar.collapsed .stats-label {
                display: none;
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .nav-sidebar {
                    top: 60px;
                    left: 10px;
                    width: 240px;
                    max-height: calc(100vh - 80px);
                }
                
                .nav-sidebar.collapsed {
                    width: 50px;
                }
                
                .nav-sidebar.auto-hidden {
                    transform: translateX(-110%);
                }
            }
            
            @media (max-width: 480px) {
                .nav-sidebar {
                    top: 50px;
                    left: 5px;
                    width: 200px;
                    max-height: calc(100vh - 70px);
                }
                
                .nav-sidebar.collapsed {
                    width: 45px;
                }
            }
            
            /* Animation Keyframes */
            @keyframes slideIn {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-100%);
                    opacity: 0;
                }
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }
            
            /* Loading States */
            .nav-item.loading {
                animation: pulse 2s infinite;
            }
            
            /* Hover Effects */
            .nav-item:hover .item-icon {
                transform: scale(1.1);
            }
            
            .nav-item:hover .visibility-indicator {
                opacity: 1;
            }
            
            /* Focus States */
            .nav-btn:focus,
            .nav-item:focus {
                outline: 2px solid var(--primary-blue, #3b82f6);
                outline-offset: 2px;
            }
            
            /* Accessibility */
            @media (prefers-reduced-motion: reduce) {
                .nav-sidebar,
                .nav-item,
                .progress-fill,
                .item-icon {
                    transition: none;
                }
                
                .nav-item.loading {
                    animation: none;
                }
            }
            
            /* High Contrast Mode */
            @media (prefers-contrast: high) {
                .nav-sidebar {
                    border-width: 2px;
                }
                
                .nav-item.active {
                    background: var(--primary-blue, #3b82f6);
                    color: white;
                }
                
                .nav-item.active .item-icon {
                    color: white;
                }
            }
            
            /* Dark Mode Support */
            @media (prefers-color-scheme: dark) {
                .nav-sidebar {
                    background: var(--bg-primary-dark, #1f2937);
                    border-color: var(--border-dark, #374151);
                }
                
                .nav-header,
                .scroll-progress,
                .nav-footer {
                    background: var(--bg-secondary-dark, #111827);
                    border-color: var(--border-dark, #374151);
                }
                
                .nav-title,
                .item-name {
                    color: var(--text-primary-dark, #f9fafb);
                }
                
                .category-header,
                .item-category,
                .progress-text {
                    color: var(--text-secondary-dark, #d1d5db);
                }
                
                .nav-item:hover {
                    background: var(--bg-tertiary-dark, #374151);
                }
                
                .nav-btn {
                    border-color: var(--border-dark, #374151);
                    color: var(--text-secondary-dark, #d1d5db);
                }
                
                .nav-btn:hover {
                    background: var(--primary-blue, #3b82f6);
                    color: white;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Export for ES6 modules
export { ModuleNavSidebar };

// Global registration for dynamic loading
if (window.OsliraApp && window.OsliraApp.modules) {
    window.OsliraApp.modules.set('ModuleNavSidebar', ModuleNavSidebar);
}

console.log('🧭 ModuleNavSidebar module loaded successfully with BaseSecureModule integration');
