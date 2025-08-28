// =============================================================================
// APP.JS - Modern Application Initializer (Replaces shared-legacy.js)
// =============================================================================

class OsliraAppInitializer {
    static instance = null;
    
    constructor() {
        this.config = {};
        this.supabase = null;
        this.user = null;
        this.session = null;
        this.business = null;
        this.businesses = [];
        this.initializationPromise = null;
        
        // Feature flags
        this.features = {
            bulkUpload: true,
            analytics: true,
            campaigns: false,
            integrations: false
        };
        
        // UI state
        this.modals = new Set();
        this.loading = false;
        
        // Cache
        this.cache = {
            leads: [],
            stats: null,
            lastRefresh: null
        };
        
        // Event system
        this.events = new EventTarget();
        
        // Performance tracking
        this.performance = {
            marks: new Map(),
            measures: new Map(),
            mark: (name) => {
                this.performance.marks.set(name, performance.now());
                performance.mark(name);
            },
            measure: (name, startMark, endMark) => {
                const startTime = this.performance.marks.get(startMark);
                const endTime = this.performance.marks.get(endMark);
                const duration = endTime - startTime;
                this.performance.measures.set(name, duration);
                performance.measure(name, startMark, endMark);
                return duration;
            },
            getReport: () => {
                const report = {};
                for (const [name, duration] of this.performance.measures) {
                    report[name] = `${duration.toFixed(2)}ms`;
                }
                return report;
            }
        };
        
        // Error handling
        this.errorHandler = {
            errors: [],
            logError: (error, context = {}) => {
                const errorEntry = {
                    message: error.message,
                    stack: error.stack,
                    context,
                    timestamp: new Date().toISOString()
                };
                this.errorHandler.errors.push(errorEntry);
                console.error('🚨 [App] Error logged:', errorEntry);
            },
            getErrorReport: () => this.errorHandler.errors
        };
    }
    
    // =============================================================================
    // SINGLETON INITIALIZATION
    // =============================================================================
    
    static async initialize() {
        if (this.instance) {
            return this.instance.initializationPromise;
        }
        
        this.instance = new OsliraAppInitializer();
        this.instance.initializationPromise = this.instance.performInitialization();
        return this.instance.initializationPromise;
    }
    
    static getInstance() {
        return this.instance;
    }
    
    // =============================================================================
    // CORE INITIALIZATION SEQUENCE
    // =============================================================================
    
    async performInitialization() {
        try {
            console.log('🚀 [App] Starting Oslira application initialization...');
            this.performance.mark('initialization-start');
            
            this.showLoadingOverlay('Initializing application...');
            
            // Core initialization steps
            await this.initConfig();
            await this.initSupabase();
            await this.initTimezone();
            await this.initAuth();
            await this.initBusinessContext();
            await this.initUI();
            await this.setupGlobalErrorHandling();
            await this.setupKeyboardShortcuts();
            await this.setupPageSpecificFeatures();
            await this.attachToWindow();
            
            this.performance.mark('initialization-end');
            const duration = this.performance.measure('total-initialization', 'initialization-start', 'initialization-end');
            
            console.log(`✅ [App] Application initialized successfully in ${duration.toFixed(2)}ms`);
            this.removeLoadingOverlay();
            
            // Emit ready event
            window.dispatchEvent(new CustomEvent('oslira:ready', {
                detail: {
                    app: this,
                    initTime: duration,
                    config: this.config,
                    user: this.user
                }
            }));
            
            return this;
            
        } catch (error) {
            console.error('❌ [App] Initialization failed:', error);
            this.errorHandler.logError(error, { phase: 'initialization' });
            this.showMessage(`Initialization failed: ${error.message}`, 'error');
            this.removeLoadingOverlay();
            throw error;
        }
    }
    
    // =============================================================================
    // INITIALIZATION STEPS
    // =============================================================================
    
    async initConfig() {
        try {
            console.log('🔧 [App] Loading configuration...');
            
            // Primary: Use window.CONFIG from env-config.js
            if (window.CONFIG) {
                Object.assign(this.config, window.CONFIG);
                
                // Ensure workerUrl is set
                if (!this.config.workerUrl) {
                    this.config.workerUrl = window.CONFIG.WORKER_URL || 
                                          window.CONFIG.workerUrl || 
                                          'https://oslira-worker.oslira-worker.workers.dev';
                }
                
                console.log('✅ [App] Configuration loaded from window.CONFIG');
                return this.config;
            }
            
            // Fallback: Use API endpoint
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error(`Config API returned ${response.status}`);
            }
            
            const config = await response.json();
            if (config.error) {
                throw new Error(config.error);
            }
            
            Object.assign(this.config, config);
            console.log('✅ [App] Configuration loaded from API');
            return config;
            
        } catch (error) {
            console.error('❌ [App] Configuration failed:', error);
            throw error;
        }
    }
    
    async initSupabase() {
        try {
            console.log('🔌 [App] Initializing Supabase...');
            
            // Wait for Supabase library to be available
            let attempts = 0;
            const maxAttempts = 100;
            
            while (!window.supabase && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.supabase) {
                throw new Error('Supabase library not available');
            }
            
            if (!this.config.supabaseUrl || !this.config.supabaseKey) {
                throw new Error('Supabase configuration missing');
            }
            
            this.supabase = window.supabase.createClient(
                this.config.supabaseUrl,
                this.config.supabaseKey
            );
            
            // Make globally available
            window.supabase = this.supabase;
            
            console.log('✅ [App] Supabase initialized');
            
        } catch (error) {
            console.error('❌ [App] Supabase initialization failed:', error);
            throw error;
        }
    }
    
    async initTimezone() {
        try {
            this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            console.log('🌍 [App] Timezone detected:', this.userTimezone);
        } catch (error) {
            this.userTimezone = 'UTC';
            console.warn('⚠️ [App] Timezone detection failed, using UTC');
        }
    }
    
    async initAuth() {
    this.auth = await window.OsliraAuth.initialize(this.config);
    
    // Attach to global app
    window.OsliraApp.auth = this.auth;
    
    // Setup auth event listeners
    this.auth.onAuthChange((event, session) => {
        // Update app state when auth changes
        this.user = this.auth.getCurrentUser();
        this.session = this.auth.getCurrentSession();
        this.businesses = this.auth.getBusinesses();
        this.business = this.auth.getSelectedBusiness();
    });
}
    
    async initBusinessContext() {
        if (!this.user) return;
        
        try {
            console.log('🏢 [App] Loading business context...');
            await this.loadBusinesses();
            
            // Set active business from localStorage or first available
            const savedBusinessId = localStorage.getItem('selectedBusinessId');
            if (savedBusinessId && this.businesses.some(b => b.id === savedBusinessId)) {
                this.business = this.businesses.find(b => b.id === savedBusinessId);
            } else if (this.businesses.length > 0) {
                this.business = this.businesses[0];
                localStorage.setItem('selectedBusinessId', this.business.id);
            }
            
            console.log('✅ [App] Business context loaded:', this.business?.business_name || 'None');
            
        } catch (error) {
            console.error('❌ [App] Business context loading failed:', error);
            // Non-critical error, continue initialization
        }
    }
    
    async initUI() {
        console.log('🎨 [App] Initializing UI components...');
        
        // Setup modal system
        this.setupModalSystem();
        
        // Setup message system
        this.setupMessageSystem();
        
        // Update UI with user data
        if (this.user) {
            this.updateUserInterface();
        }
        
        console.log('✅ [App] UI components initialized');
    }
    
    // =============================================================================
    // BUSINESS MANAGEMENT
    // =============================================================================
    
    async loadBusinesses() {
        if (!this.user) return;
        
        try {
            const { data, error } = await this.supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: true });
                
            if (error) throw error;
            
            this.businesses = data || [];
            console.log(`📊 [App] Loaded ${this.businesses.length} business profiles`);
            
        } catch (error) {
            console.error('❌ [App] Failed to load businesses:', error);
            this.businesses = [];
        }
    }
    
    setActiveBusiness(businessId) {
        const business = this.businesses.find(b => b.id === businessId);
        if (business) {
            this.business = business;
            localStorage.setItem('selectedBusinessId', businessId);
            
            // Emit business change event
            this.events.dispatchEvent(new CustomEvent('business-changed', {
                detail: { business }
            }));
            
            console.log('🔄 [App] Active business changed:', business.business_name);
        }
    }
    
    // =============================================================================
    // UI MANAGEMENT
    // =============================================================================
    
    setupModalSystem() {
        // Close modals on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Close modals on backdrop click
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-overlay')) {
                const modalId = event.target.querySelector('.modal')?.id;
                if (modalId) {
                    this.closeModal(modalId);
                }
            }
        });
    }
    
    setupMessageSystem() {
        // Create message container if it doesn't exist
        if (!document.getElementById('message-container')) {
            const container = document.createElement('div');
            container.id = 'message-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
    }
    
    updateUserInterface() {
        // Update user email displays
        const emailElements = document.querySelectorAll('#user-email, .user-email');
        emailElements.forEach(el => {
            el.textContent = this.user.email;
        });
        
        // Update business selector
        const businessSelect = document.getElementById('business-selector');
        if (businessSelect && this.businesses.length > 0) {
            businessSelect.innerHTML = this.businesses.map(business => 
                `<option value="${business.id}" ${business.id === this.business?.id ? 'selected' : ''}>
                    ${business.business_name}
                </option>`
            ).join('');
        }
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    getCurrentPageName() {
        const pathname = window.location.pathname;
        const filename = pathname.split('/').pop();
        
        if (filename && filename.includes('.')) {
            return filename.split('.')[0];
        }
        
        if (pathname === '/' || pathname === '') {
            return 'index';
        }
        
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
            return segments[0];
        }
        
        return 'index';
    }
    
    async apiRequest(endpoint, options = {}) {
        try {
            const baseUrl = this.config.workerUrl || this.config.WORKER_URL;
            const url = `${baseUrl}${endpoint}`;
            
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.session?.access_token && {
                        'Authorization': `Bearer ${this.session.access_token}`
                    })
                }
            };
            
            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('❌ [App] API request failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // UI HELPER METHODS
    // =============================================================================
    
    showMessage(message, type = 'info', duration = 5000) {
        const container = document.getElementById('message-container');
        if (!container) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.style.cssText = `
            padding: 12px 16px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease;
            ${type === 'error' ? 'background: #ef4444;' : ''}
            ${type === 'success' ? 'background: #10b981;' : ''}
            ${type === 'warning' ? 'background: #f59e0b;' : ''}
            ${type === 'info' ? 'background: #3b82f6;' : ''}
        `;
        messageEl.textContent = message;
        
        container.appendChild(messageEl);
        
        if (duration > 0) {
            setTimeout(() => {
                messageEl.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => messageEl.remove(), 300);
            }, duration);
        }
    }
    
    showLoadingOverlay(message = 'Loading...') {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                font-size: 16px;
                font-weight: 500;
                color: #374151;
            `;
            document.body.appendChild(overlay);
        }
        overlay.textContent = message;
        overlay.style.display = 'flex';
    }
    
    removeLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            this.modals.add(modalId);
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            this.modals.delete(modalId);
            if (this.modals.size === 0) {
                document.body.style.overflow = '';
            }
        }
    }
    
    closeAllModals() {
        this.modals.forEach(modalId => this.closeModal(modalId));
    }
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    formatNumber(number, options = {}) {
        if (typeof number !== 'number') return number;
        
        const defaults = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        };
        
        return new Intl.NumberFormat('en-US', { ...defaults, ...options }).format(number);
    }
    
    formatDateInUserTimezone(dateInput, options = {}) {
        try {
            const date = new Date(dateInput);
            const defaultOptions = {
                timeZone: this.userTimezone || 'UTC',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            return date.toLocaleString('en-US', { ...defaultOptions, ...options });
        } catch (error) {
            console.warn('Date formatting failed:', error);
            return String(dateInput);
        }
    }
    
    copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return Promise.resolve();
        }
    }
    
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }
    
    // =============================================================================
    // GLOBAL ERROR HANDLING & SHORTCUTS
    // =============================================================================
    
    async setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.errorHandler.logError(event.error, { 
                type: 'javascript',
                filename: event.filename,
                lineno: event.lineno 
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.errorHandler.logError(new Error(event.reason), { 
                type: 'promise_rejection' 
            });
        });
    }
    
    async setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Cmd/Ctrl + K for global search (if implemented)
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                // Trigger global search if available
                console.log('🔍 Global search shortcut triggered');
            }
            
            // Escape to close modals (handled in setupModalSystem)
        });
    }

    async setupPageSpecificFeatures() {
    const currentPage = this.detectCurrentPage();
    
    console.log(`📄 [App] Setting up page-specific features for: ${currentPage}`);
    
    try {
        switch (currentPage) {
            case 'auth':
                // Auth page setup
                if (this.auth) {
                    console.log('🔐 [App] Setting up authentication form...');
                    await this.setupAuthForm();
                } else {
                    console.error('❌ [App] Cannot setup auth form - auth manager not initialized');
                    // Show fallback auth error
                    this.showInitializationError(new Error('Authentication system not available'));
                }
                break;
                
            case 'auth-callback':
                // Callback page - no additional setup needed
                console.log('🔗 [App] Auth callback page - handled by callback.html');
                break;
                
            case 'dashboard':
                // Dashboard has its own controller system
                console.log('📊 [App] Dashboard page - controller will initialize separately');
                await this.setupDashboardIntegrations();
                break;
                
            case 'onboarding':
                // Onboarding flow setup
                console.log('🎯 [App] Setting up onboarding features...');
                await this.setupOnboardingFlow();
                break;
                
            case 'admin':
                // Admin panel setup
                console.log('👑 [App] Setting up admin panel...');
                await this.setupAdminFeatures();
                break;
                
            case 'settings':
                // Settings page setup
                console.log('⚙️ [App] Setting up settings page...');
                await this.setupSettingsPage();
                break;
                
            case 'subscription':
                // Subscription management setup
                console.log('💳 [App] Setting up subscription management...');
                await this.setupSubscriptionPage();
                break;
                
            case 'analytics':
                // Analytics page setup
                console.log('📈 [App] Setting up analytics page...');
                await this.setupAnalyticsPage();
                break;
                
            case 'leads':
                // Leads page setup
                console.log('🎯 [App] Setting up leads management...');
                await this.setupLeadsPage();
                break;
                
            case 'messages':
                // Messages page setup
                console.log('💬 [App] Setting up messages page...');
                await this.setupMessagesPage();
                break;
                
            case 'home':
                // Landing page setup
                console.log('🏠 [App] Setting up home page features...');
                await this.setupHomePage();
                break;
                
            case 'generic':
            case 'unknown':
                // Generic page setup
                console.log('📄 [App] Setting up generic page features...');
                await this.setupGenericPage();
                break;
                
            default:
                console.log(`📄 [App] No specific setup defined for page: ${currentPage}`);
        }
        
        console.log(`✅ [App] Page-specific features setup complete for: ${currentPage}`);
        
    } catch (error) {
        console.error(`❌ [App] Failed to setup page-specific features for ${currentPage}:`, error);
        // Don't throw - allow app to continue with basic functionality
    }
}

// =============================================================================
// PAGE-SPECIFIC SETUP METHODS
// =============================================================================

async setupDashboardIntegrations() {
    // Set up global dashboard helpers that work with the dashboard controller
    if (window.OsliraDashboard) {
        console.log('📊 [App] Dashboard controller already loaded');
        return;
    }
    
    // Set up dashboard event listeners for when controller loads
    window.addEventListener('oslira:dashboard:loaded', (event) => {
        console.log('📊 [App] Dashboard controller loaded, setting up integrations...');
        
        // Integrate with global app systems
        if (event.detail && event.detail.dashboard) {
            this.dashboardInstance = event.detail.dashboard;
            
            // Connect dashboard to global error handling
            this.dashboardInstance.onError = this.logError.bind(this);
            
            // Connect dashboard to global UI notifications
            if (this.ui) {
                this.dashboardInstance.showMessage = this.ui.toast.info.bind(this.ui.toast);
                this.dashboardInstance.showError = this.ui.toast.error.bind(this.ui.toast);
                this.dashboardInstance.showSuccess = this.ui.toast.success.bind(this.ui.toast);
            }
        }
    });
}

async setupOnboardingFlow() {
    // Initialize onboarding progress tracking
    const currentStep = this.getOnboardingStep();
    console.log('🎯 [App] Current onboarding step:', currentStep);
    
    // Set up step navigation
    this.setupStepNavigation();
    
    // Set up form handling for onboarding forms
    const onboardingForms = document.querySelectorAll('.onboarding-form');
    onboardingForms.forEach(form => {
        this.setupFormHandler(form, 'onboarding');
    });
    
    // Set up progress indicators
    this.updateOnboardingProgress(currentStep);
}

async setupAdminFeatures() {
    // Verify admin access
    if (!this.auth.isAdmin()) {
        console.warn('⚠️ [App] Non-admin user on admin page');
        window.location.href = '/dashboard';
        return;
    }
    
    // Set up admin-specific UI
    console.log('👑 [App] Loading admin dashboard features...');
    
    // Enable admin shortcuts
    this.setupAdminShortcuts();
    
    // Set up admin data refresh
    this.setupAdminDataRefresh();
}

async setupSettingsPage() {
    // Set up settings forms
    const settingsForms = document.querySelectorAll('.settings-form');
    settingsForms.forEach(form => {
        this.setupFormHandler(form, 'settings');
    });
    
    // Set up profile image upload
    this.setupProfileImageUpload();
    
    // Set up account deletion confirmation
    this.setupAccountDeletion();
}

async setupSubscriptionPage() {
    // Initialize Stripe if not already loaded
    if (!window.Stripe && this.config.STRIPE_PUBLISHABLE_KEY) {
        await this.loadStripe();
    }
    
    // Set up billing forms
    this.setupBillingForms();
    
    // Set up subscription management
    this.setupSubscriptionManagement();
    
    // Set up usage tracking display
    this.setupUsageDisplay();
}

async setupAnalyticsPage() {
    // Set up analytics data loading
    this.setupAnalyticsDataLoader();
    
    // Set up chart initialization
    this.setupAnalyticsCharts();
    
    // Set up export functionality
    this.setupAnalyticsExport();
}

async setupLeadsPage() {
    // Set up leads table
    this.setupLeadsTable();
    
    // Set up bulk actions
    this.setupBulkActions();
    
    // Set up lead import/export
    this.setupLeadImportExport();
}

async setupMessagesPage() {
    // Set up message templates
    this.setupMessageTemplates();
    
    // Set up message queue
    this.setupMessageQueue();
    
    // Set up message analytics
    this.setupMessageAnalytics();
}

async setupHomePage() {
    // Set up demo form handling
    const demoForm = document.querySelector('.demo-form');
    if (demoForm) {
        this.setupDemoForm(demoForm);
    }
    
    // Set up scroll animations
    this.setupScrollAnimations();
    
    // Set up interactive elements
    this.setupInteractiveElements();
}

async setupGenericPage() {
    // Set up basic page features that apply to all pages
    this.setupBasicInteractions();
    
    // Set up any forms on the page
    const forms = document.querySelectorAll('form:not(.no-auto-setup)');
    forms.forEach(form => {
        if (form.id && !form.hasAttribute('data-setup-complete')) {
            this.setupFormHandler(form, 'generic');
        }
    });
}

// =============================================================================
// HELPER METHODS
// =============================================================================

detectCurrentPage() {
    const pathname = window.location.pathname;
    
    // Comprehensive page detection
    const pageMap = {
        '/': 'home',
        '/index.html': 'home',
        '/pages/home/index.html': 'home',
        '/home': 'home',
        
        '/auth': 'auth',
        '/auth.html': 'auth',
        '/pages/auth/index.html': 'auth',
        
        '/auth/callback': 'auth-callback',
        '/auth/callback.html': 'auth-callback', 
        '/pages/auth/callback.html': 'auth-callback',
        
        '/dashboard': 'dashboard',
        '/dashboard.html': 'dashboard',
        '/pages/dashboard/index.html': 'dashboard',
        
        '/onboarding': 'onboarding',
        '/onboarding.html': 'onboarding',
        '/pages/onboarding/index.html': 'onboarding',
        
        '/admin': 'admin',
        '/admin.html': 'admin',
        '/pages/admin/index.html': 'admin',
        
        '/settings': 'settings',
        '/settings.html': 'settings',
        '/pages/settings/index.html': 'settings',
        
        '/subscription': 'subscription',
        '/subscription.html': 'subscription',
        '/pages/subscription/index.html': 'subscription',
        
        '/analytics': 'analytics',
        '/analytics.html': 'analytics',
        '/pages/analytics/index.html': 'analytics',
        
        '/leads': 'leads',
        '/leads.html': 'leads',
        '/pages/leads/index.html': 'leads',
        
        '/messages': 'messages',
        '/messages.html': 'messages',
        '/pages/messages/index.html': 'messages'
    };
    
    // Exact match first
    if (pageMap[pathname]) {
        return pageMap[pathname];
    }
    
    // Partial matches for nested paths
    for (const [path, page] of Object.entries(pageMap)) {
        if (pathname.startsWith(path) && path !== '/') {
            return page;
        }
    }
    
    // Check for known page patterns
    if (pathname.includes('/auth/callback')) return 'auth-callback';
    if (pathname.includes('/auth')) return 'auth';
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/onboarding')) return 'onboarding';
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/subscription')) return 'subscription';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/leads')) return 'leads';
    if (pathname.includes('/messages')) return 'messages';
    
    return 'generic';
}

setupFormHandler(form, context) {
    if (form.hasAttribute('data-setup-complete')) return;
    
    form.setAttribute('data-setup-complete', 'true');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log(`📝 [App] Form submitted in ${context} context:`, form.id);
        
        // Handle based on context
        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Route to appropriate handler
            switch (context) {
                case 'onboarding':
                    await this.handleOnboardingSubmit(form, data);
                    break;
                case 'settings':
                    await this.handleSettingsSubmit(form, data);
                    break;
                default:
                    await this.handleGenericSubmit(form, data);
            }
        } catch (error) {
            console.error(`❌ [App] Form submission failed in ${context}:`, error);
            this.showError(`Form submission failed: ${error.message}`);
        }
    });
}

getOnboardingStep() {
    // Determine current onboarding step from URL or storage
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get('step');
    
    if (step) return parseInt(step, 10);
    
    // Get from localStorage
    return parseInt(localStorage.getItem('onboarding_step') || '1', 10);
}

updateOnboardingProgress(step) {
    // Update progress indicators
    const progressIndicators = document.querySelectorAll('.progress-step');
    progressIndicators.forEach((indicator, index) => {
        const stepNumber = index + 1;
        indicator.classList.toggle('active', stepNumber === step);
        indicator.classList.toggle('completed', stepNumber < step);
    });
}

async handleOnboardingSubmit(form, data) {
    console.log('🎯 [App] Handling onboarding form submission:', data);
    // Implementation would go here
}

async handleSettingsSubmit(form, data) {
    console.log('⚙️ [App] Handling settings form submission:', data);
    // Implementation would go here
}

async handleGenericSubmit(form, data) {
    console.log('📝 [App] Handling generic form submission:', data);
    // Implementation would go here
}

    // Add rate limiting for auth attempts
// Add rate limiting for auth attempts
setupAuthRateLimit() {
    const RATE_LIMIT_KEY = 'auth_attempts';
    const MAX_ATTEMPTS = 5;
    const WINDOW_DURATION = 5 * 60 * 1000; // 5 minutes
    
    return {
        checkRateLimit: () => {
            const now = Date.now();
            const attempts = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]');
            
            // Clean old attempts
            const validAttempts = attempts.filter(time => now - time < WINDOW_DURATION);
            
            if (validAttempts.length >= MAX_ATTEMPTS) {
                const oldestAttempt = Math.min(...validAttempts);
                const timeRemaining = WINDOW_DURATION - (now - oldestAttempt);
                const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
                throw new Error(`Too many attempts. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`);
            }
            
            return true;
        },
        
        recordAttempt: () => {
            const now = Date.now();
            const attempts = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]');
            attempts.push(now);
            
            // Keep only recent attempts
            const validAttempts = attempts.filter(time => now - time < WINDOW_DURATION);
            localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(validAttempts));
        }
    };
}

async setupAuthForm() {
    const form = document.getElementById('auth-form');
    if (!form) {
        console.warn('🔐 [App] Auth form not found on page');
        return;
    }
    
    console.log('🔐 [App] Setting up auth form...');
    
    // CRITICAL: Wait for auth manager to be available
    if (!this.auth) {
        console.error('❌ [Auth] Auth manager not initialized - cannot setup form');
        return;
    }
    
    const rateLimiter = this.setupAuthRateLimit();
    
    // Clear any existing errors first
    this.clearError();
    
    // CRITICAL: Remove any existing event listeners and add our own first
    // DEBUG: Add extensive logging before setup
console.log('🔍 [DEBUG] setupAuthForm called');
console.log('🔍 [DEBUG] Auth manager available:', !!this.auth);
console.log('🔍 [DEBUG] Form element:', form);

// CRITICAL: Remove any existing event listeners and add our own first
const newForm = form.cloneNode(true);
form.parentNode.replaceChild(newForm, form);

console.log('🔍 [DEBUG] Form replaced, adding submit handler');

// Add our submit handler directly to the form - NO FORM MANAGER
newForm.addEventListener('submit', async (e) => {
    console.log('🔍 [DEBUG] ===== SUBMIT HANDLER FIRED =====');
    console.log('🔍 [DEBUG] Event:', e);
    console.log('🔍 [DEBUG] Auth manager at submit time:', !!this.auth);
    
    e.preventDefault();
    e.stopImmediatePropagation();
    
    console.log('📧 [Auth] Form submitted, processing...');
        
        // Clear any existing errors
        this.clearError();
        
        const emailInput = newForm.querySelector('#email');
        const submitButton = newForm.querySelector('#signin-button');
        const buttonText = submitButton.querySelector('.button-text') || submitButton;
        const originalText = buttonText.textContent;
        const email = emailInput.value.trim();
        
        // Basic validation
        if (!email) {
            this.showError('Email is required');
            emailInput.focus();
            return;
        }
        
        if (!email.includes('@') || email.length < 5) {
            this.showError('Please enter a valid email address');
            emailInput.focus();
            return;
        }
        
        // Additional email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError('Please enter a valid email address');
            emailInput.focus();
            return;
        }
        
        try {
            // Check rate limit first
            if (!rateLimiter.checkRateLimit()) {
                return; // Error already shown by rate limiter
            }
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            buttonText.textContent = 'Sending...';
            
            console.log('📧 [Auth] Sending magic link to:', email);
            
            // Use auth manager to send magic link
            const result = await this.auth.signInWithEmail(email);
            
            if (result.success) {
                console.log('✅ [Auth] Magic link sent successfully');
                
                // Show success state
                this.showSuccess(email);
                
                // Record successful attempt for rate limiting  
                rateLimiter.recordAttempt();
                
            } else {
                throw new Error(result.error || 'Failed to send magic link');
            }
            
        } catch (error) {
            console.error('❌ [Auth] Sign in failed:', error);
            
            // Record failed attempt for rate limiting  
            rateLimiter.recordAttempt();
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
            buttonText.textContent = originalText;
            
            // Show user-friendly error message
            let errorMessage = 'Failed to send sign-in link';
            
            if (error.message) {
                if (error.message.includes('Invalid email')) {
                    errorMessage = 'Please enter a valid email address';
                } else if (error.message.includes('rate')) {
                    errorMessage = 'Too many requests. Please try again later.';
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            this.showError(errorMessage);
            emailInput.focus();
        }
    });
    
    console.log('✅ [Auth] Form event listeners attached successfully');
}

showError(message) {
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
        errorDisplay.textContent = message;
        errorDisplay.classList.add('show');
        errorDisplay.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.clearError();
        }, 10000);
    } else {
        console.error('❌ [Auth] Error display element not found:', message);
    }
}

showSuccess(email) {
    // Hide the main form card
    const mainCard = document.getElementById('main-card');
    const successCard = document.getElementById('success-card');
    const sentEmailElement = document.getElementById('sent-email');
    
    if (mainCard && successCard) {
        mainCard.style.display = 'none';
        successCard.style.display = 'block';
        
        if (sentEmailElement) {
            sentEmailElement.textContent = email;
        }
    } else {
        // Fallback: show alert if success card not found
        console.warn('⚠️ [Auth] Success card elements not found, showing fallback message');
        if (window.Alert && window.Alert.success) {
            window.Alert.success({
                message: `Sign-in link sent to ${email}`,
                timeoutMs: 5000
            });
        }
    }
}

clearError() {
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
        errorDisplay.classList.remove('show');
        errorDisplay.style.display = 'none';
        errorDisplay.textContent = '';
    }
}
  
    // =============================================================================
    // GLOBAL ATTACHMENT
    // =============================================================================
    
    attachToWindow() {
        // Attach instance to window for global access
        window.OsliraApp = this;
        
        // Provide commonly used methods directly
        window.OsliraApp.showMessage = this.showMessage.bind(this);
        window.OsliraApp.apiRequest = this.apiRequest.bind(this);
        window.OsliraApp.openModal = this.openModal.bind(this);
        window.OsliraApp.closeModal = this.closeModal.bind(this);
        window.OsliraApp.formatDate = this.formatDateInUserTimezone.bind(this);
        window.OsliraApp.setActiveBusiness = this.setActiveBusiness.bind(this);
        
        // Logout function
        window.OsliraApp.logout = async () => {
            try {
                await this.supabase.auth.signOut();
                localStorage.clear();
                window.location.href = '/auth.html';
            } catch (error) {
                console.error('Logout failed:', error);
                window.location.href = '/auth.html';
            }
        };
        
        console.log('🌐 [App] Global window attachment completed');
    }
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Export the class
window.OsliraAppInitializer = OsliraAppInitializer;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await OsliraAppInitializer.initialize();
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    });
} else {
    // DOM already ready
    setTimeout(async () => {
        try {
            await OsliraAppInitializer.initialize();
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    }, 100);
}

console.log('📦 Modern Oslira app initializer loaded');
console.log('🚀 Will initialize automatically when DOM is ready');
