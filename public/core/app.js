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
    
    switch (currentPage) {
        case 'auth':
            await this.setupAuthForm();
            break;
        case 'dashboard':
            // Dashboard has its own controller
            break;
        default:
            console.log(`📄 [App] No specific setup for page: ${currentPage}`);
    }
}

detectCurrentPage() {
    const pathname = window.location.pathname;
    if (pathname.includes('/auth')) return 'auth';
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/onboarding')) return 'onboarding';
    return 'home';
}

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
    if (!form) return;
    
    console.log('🔐 [App] Setting up auth form...');
    
    const rateLimiter = this.setupAuthRateLimit();
    
    const formManager = new window.OsliraFormManager(form, {
        validateOnInput: true,
        showSuccessMessages: false
    });
    
    formManager
        .addValidator('email', 'email', 'Please enter a valid email address')
        .addValidator('email', 'required', 'Email address is required')
        .onSubmit(async (formData) => {
            // Check rate limit first
            rateLimiter.checkRateLimit();
            
            // Add loading state
            const submitButton = document.querySelector('#signin-button');
            const buttonText = submitButton.querySelector('.button-text');
            const originalText = buttonText.textContent;
            
            // Visual loading state
            buttonText.textContent = 'Sending...';
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            
            try {
                const { data, error } = await this.supabase.auth.signInWithOtp({
                    email: formData.email,
                    options: {
                        emailRedirectTo: `${window.location.origin}/pages/auth/callback.html`
                    }
                });
                
                if (error) {
                    console.error('Supabase Auth Error:', error);
                    throw new Error(error.message || 'Failed to send magic link');
                }
                
                console.log('✅ Magic link sent successfully:', data);
                
                // Record successful attempt for rate limiting
                rateLimiter.recordAttempt();
                
                // Show success state
                document.getElementById('main-card').style.display = 'none';
                document.getElementById('sent-email').textContent = formData.email;
                document.getElementById('success-card').style.display = 'block';
                
            } catch (err) {
                console.error('Auth submission error:', err);
                // Record failed attempt for rate limiting
                rateLimiter.recordAttempt();
                
                // Reset button state
                buttonText.textContent = originalText;
                submitButton.disabled = false;
                submitButton.classList.remove('loading');
                throw err; // Re-throw for form manager error handling
            }
        })
        .onError((error) => {
            const errorDisplay = document.getElementById('error-display');
            if (errorDisplay) {
                errorDisplay.textContent = error.message || 'Sign in failed';
                errorDisplay.classList.add('show');
            }
        });
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
