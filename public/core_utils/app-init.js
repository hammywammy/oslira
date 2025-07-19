// =============================================================================
// APP INITIALIZATION - ENTERPRISE GRADE BOOTSTRAP
// Single source of truth for all Oslira app initialization
// =============================================================================

class OsliraAppInit {
    static initializationPromise = null;
    static isInitialized = false;
    
    static async initializeApp() {
        // Prevent multiple initialization calls
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        if (this.isInitialized) {
            console.log('⚠️ [AppInit] Already initialized');
            return true;
        }
        
        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }
    
    static async _performInitialization() {
        const startTime = performance.now();
        
        try {
            console.log('🚀 [AppInit] Starting Oslira enterprise initialization...');
            this._showLoadingOverlay('Initializing Oslira...');
            
            // Step 1: Initialize global namespace
            this._updateProgress(10, 'Setting up global state...');
            this._initializeGlobalNamespace();
            
            // Step 2: Load configuration
            this._updateProgress(20, 'Loading configuration...');
            await this._loadConfig();
            
            // Step 3: Initialize Supabase
            this._updateProgress(40, 'Connecting to database...');
            await this._initializeSupabase();
            
            // Step 4: Setup timezone
            this._updateProgress(50, 'Setting up timezone...');
            this._initializeTimezone();
            
            // Step 5: Check authentication (if needed)
            this._updateProgress(60, 'Checking authentication...');
            await this._checkAuth();
            
            // Step 6: Load user context
            this._updateProgress(80, 'Loading user context...');
            await this._loadUserContext();
            
            // Step 7: Setup global UI handlers
            this._updateProgress(90, 'Setting up UI...');
            this._setupGlobalUI();
            
            // Step 8: Complete initialization
            this._updateProgress(100, 'Ready!');
            
            const duration = performance.now() - startTime;
            this.isInitialized = true;
            
            console.log(`✅ [AppInit] Oslira initialized successfully in ${duration.toFixed(2)}ms`);
            
            // Emit global event
            window.dispatchEvent(new CustomEvent('oslira:app:ready', {
                detail: { 
                    initTime: duration,
                    user: window.OsliraApp.user,
                    business: window.OsliraApp.business
                }
            }));
            
            this._hideLoadingOverlay();
            return true;
            
        } catch (error) {
            console.error('❌ [AppInit] Initialization failed:', error);
            this._showInitializationError(error);
            throw error;
        }
    }
    
    static _initializeGlobalNamespace() {
        if (!window.OsliraApp) {
            window.OsliraApp = {};
        }
        
        // Core state
        Object.assign(window.OsliraApp, {
            config: {},
            supabase: null,
            user: null,
            session: null,
            business: null,
            businesses: [],
            
            // Feature flags
            features: {
                bulkUpload: true,
                analytics: true,
                campaigns: false,
                integrations: false
            },
            
            // Navigation state
            currentPage: this._getCurrentPageName(),
            
            // UI state
            modals: new Set(),
            loading: false,
            
            // Cache
            cache: {
                leads: [],
                stats: null,
                lastRefresh: null
            },
            
            // Event system
            events: new EventTarget(),
            
            // Performance tracking
            performance: new Map(),
            errors: [],
            
            // Initialization metadata
            version: '4.0.0',
            buildTime: Date.now(),
            initStartTime: performance.now()
        });
        
        console.log('🏗️ [AppInit] Global namespace initialized');
    }
    
    static async _loadConfig() {
        try {
            console.log('🔧 [AppInit] Loading configuration...');
            
            // Primary: Use window.CONFIG from env-config.js
            if (window.CONFIG) {
                Object.assign(window.OsliraApp.config, window.CONFIG);
                console.log('✅ [AppInit] Configuration loaded from window.CONFIG');
                return window.CONFIG;
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
            
            Object.assign(window.OsliraApp.config, config);
            console.log('✅ [AppInit] Configuration loaded from API');
            return config;
            
        } catch (error) {
            console.error('❌ [AppInit] Configuration failed:', error);
            throw new Error(`Configuration loading failed: ${error.message}`);
        }
    }
    
    static async _initializeSupabase() {
        try {
            console.log('🔧 [AppInit] Initializing Supabase...');
            
            const config = window.OsliraApp.config;
            
            // Check for configuration
            const supabaseUrl = config.SUPABASE_URL || config.supabaseUrl;
            const supabaseKey = config.SUPABASE_ANON_KEY || config.supabaseAnonKey;
            
            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Supabase configuration missing (URL or anonymous key)');
            }
            
            // Check if Supabase library is loaded
            if (typeof supabase === 'undefined' || !supabase.createClient) {
                throw new Error('Supabase library not loaded');
            }
            
            // Create client
            const client = supabase.createClient(supabaseUrl, supabaseKey);
            window.OsliraApp.supabase = client;
            
            // Test connection
            const { data, error } = await client.from('_health').select('*').limit(1);
            if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is OK
                console.warn('⚠️ [AppInit] Supabase connection test warning:', error.message);
            }
            
            console.log('✅ [AppInit] Supabase initialized successfully');
            return client;
            
        } catch (error) {
            console.error('❌ [AppInit] Supabase initialization failed:', error);
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }
    
    static _initializeTimezone() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            localStorage.setItem('userTimezone', timezone);
            window.OsliraApp.timezone = timezone;
            
            console.log(`🌍 [AppInit] Timezone detected: ${timezone}`);
            return timezone;
            
        } catch (error) {
            console.warn('⚠️ [AppInit] Timezone detection failed:', error);
            const fallback = 'UTC';
            localStorage.setItem('userTimezone', fallback);
            window.OsliraApp.timezone = fallback;
            return fallback;
        }
    }
    
    static async _checkAuth() {
        const currentPage = this._getCurrentPageName();
        const protectedPages = ['dashboard', 'leads', 'analytics', 'subscription', 'settings', 'admin', 'campaigns'];
        
        // Skip auth check for public pages
        if (!protectedPages.includes(currentPage)) {
            console.log('📖 [AppInit] Public page - skipping authentication');
            return true;
        }
        
        try {
            console.log('🔐 [AppInit] Checking authentication...');
            
            const supabase = window.OsliraApp.supabase;
            if (!supabase) {
                throw new Error('Supabase not initialized');
            }
            
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                throw error;
            }
            
            if (!session) {
                console.log('❌ [AppInit] No active session - redirecting to login');
                this._redirectToLogin();
                return false;
            }
            
            // Store session data
            window.OsliraApp.session = session;
            window.OsliraApp.user = session.user;
            
            // Setup auth state listener
            this._setupAuthListener();
            
            console.log('✅ [AppInit] User authenticated');
            console.log(`👤 [AppInit] User: ${session.user.email} (${session.user.id})`);
            return true;
            
        } catch (error) {
            console.error('❌ [AppInit] Authentication check failed:', error);
            this._redirectToLogin();
            return false;
        }
    }
    
    static async _loadUserContext() {
        if (!window.OsliraApp.user) {
            console.log('👤 [AppInit] No user - skipping context loading');
            return;
        }
        
        try {
            console.log('🏢 [AppInit] Loading user context...');
            
            // Load businesses
            await this._loadBusinesses();
            
            // Load user profile/preferences
            await this._loadUserProfile();
            
            console.log('✅ [AppInit] User context loaded');
            
        } catch (error) {
            console.warn('⚠️ [AppInit] User context loading failed:', error);
            // Don't fail initialization for this
        }
    }
    
    static async _loadBusinesses() {
        try {
            const supabase = window.OsliraApp.supabase;
            const { data: businesses, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('user_id', window.OsliraApp.user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            window.OsliraApp.businesses = businesses || [];
            
            // Set active business
            const savedBusinessId = localStorage.getItem('selectedBusinessId');
            if (savedBusinessId && businesses.find(b => b.id === savedBusinessId)) {
                window.OsliraApp.business = businesses.find(b => b.id === savedBusinessId);
            } else if (businesses.length > 0) {
                window.OsliraApp.business = businesses[0];
                localStorage.setItem('selectedBusinessId', businesses[0].id);
            }
            
            console.log(`🏢 [AppInit] Loaded ${businesses.length} businesses`);
            
        } catch (error) {
            console.warn('⚠️ [AppInit] Failed to load businesses:', error);
            window.OsliraApp.businesses = [];
        }
    }
    
    static async _loadUserProfile() {
        try {
            // Load additional user profile data if needed
            // This is a placeholder for future user profile features
            console.log('👤 [AppInit] User profile loaded');
            
        } catch (error) {
            console.warn('⚠️ [AppInit] Failed to load user profile:', error);
        }
    }
    
    static _setupAuthListener() {
        const supabase = window.OsliraApp.supabase;
        if (!supabase) return;
        
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 [AppInit] Auth state changed: ${event}`);
            
            if (event === 'SIGNED_OUT' || !session) {
                window.OsliraApp.user = null;
                window.OsliraApp.session = null;
                window.OsliraApp.business = null;
                window.OsliraApp.businesses = [];
                this._redirectToLogin();
            } else if (event === 'SIGNED_IN') {
                window.OsliraApp.session = session;
                window.OsliraApp.user = session.user;
                
                // Emit auth event
                window.OsliraApp.events.dispatchEvent(new CustomEvent('userAuthenticated', {
                    detail: { user: session.user }
                }));
                
                // Reload user context
                this._loadUserContext().catch(console.error);
            }
        });
    }
    
    static _setupGlobalUI() {
        try {
            console.log('🎨 [AppInit] Setting up global UI...');
            
            // Setup global event handlers
            this._setupGlobalEventHandlers();
            
            // Populate UI elements
            this._populateUIElements();
            
            console.log('✅ [AppInit] Global UI setup completed');
            
        } catch (error) {
            console.warn('⚠️ [AppInit] Global UI setup failed:', error);
        }
    }
    
    static _setupGlobalEventHandlers() {
        // Logout handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="logout"]')) {
                e.preventDefault();
                this.logout();
            }
        });
        
        // Business selector handlers
        const businessSelectors = document.querySelectorAll('#business-select, #business-filter');
        businessSelectors.forEach(select => {
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.setActiveBusiness(e.target.value);
                }
            });
        });
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for global search (if implemented)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // Trigger global search
                console.log('Global search triggered');
            }
        });
    }
    
    static _populateUIElements() {
        // Populate business selectors
        this._populateBusinessSelectors();
        
        // Update user info displays
        this._updateUserInfoDisplay();
        
        // Update subscription info
        this._updateSubscriptionDisplay();
    }
    
    static _populateBusinessSelectors() {
        const selectors = document.querySelectorAll('#business-select, #business-filter');
        
        selectors.forEach(select => {
            // Preserve first option (usually "Select Business..." or "All Businesses")
            const firstOption = select.firstElementChild;
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);
            
            // Add business options
            window.OsliraApp.businesses.forEach(business => {
                const option = document.createElement('option');
                option.value = business.id;
                option.textContent = business.name;
                option.selected = window.OsliraApp.business?.id === business.id;
                select.appendChild(option);
            });
        });
    }
    
    static _updateUserInfoDisplay() {
        const userEmailElements = document.querySelectorAll('#user-email, .user-email');
        userEmailElements.forEach(element => {
            if (window.OsliraApp.user) {
                element.textContent = window.OsliraApp.user.email;
            }
        });
    }
    
    static _updateSubscriptionDisplay() {
        // Update plan displays
        const planElements = document.querySelectorAll('#sidebar-plan, .plan-name');
        planElements.forEach(element => {
            element.textContent = 'Pro Plan'; // Default for now
        });
        
        // Update billing displays
        const billingElements = document.querySelectorAll('#sidebar-billing, .billing-status');
        billingElements.forEach(element => {
            element.textContent = 'Active'; // Default for now
        });
    }
    
    // ===== UTILITY METHODS =====
    
    static _getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        return filename.replace('.html', '') || 'index';
    }
    
    static _redirectToLogin() {
        const protectedPages = ['dashboard', 'leads', 'analytics', 'subscription', 'settings', 'admin', 'campaigns'];
        const currentPage = this._getCurrentPageName();
        
        if (protectedPages.includes(currentPage)) {
            window.location.href = '/auth.html';
        }
    }
    
    static _showLoadingOverlay(message = 'Loading...') {
        let overlay = document.getElementById('app-loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'app-loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p class="loading-message">${message}</p>
                    <div class="loading-progress">
                        <div class="progress-bar" id="app-progress-bar"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
        window.OsliraApp.loading = true;
    }
    
    static _hideLoadingOverlay() {
        const overlay = document.getElementById('app-loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                window.OsliraApp.loading = false;
            }, 300);
        }
    }
    
    static _updateProgress(percentage, message) {
        const messageElement = document.querySelector('#app-loading-overlay .loading-message');
        const progressBar = document.getElementById('app-progress-bar');
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        console.log(`⏳ [AppInit] ${percentage}% - ${message}`);
    }
    
    static _showInitializationError(error) {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                    <h2 style="color: #dc2626; margin-bottom: 16px;">Initialization Error</h2>
                    <p style="color: #6b7280; margin-bottom: 16px;">
                        ${error.message || 'An unexpected error occurred during startup'}
                    </p>
                    <button onclick="window.location.reload()" 
                            style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Retry
                    </button>
                    <details style="margin-top: 20px; text-align: left;">
                        <summary style="cursor: pointer; color: #6b7280;">Technical Details</summary>
                        <pre style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 12px; overflow: auto; max-height: 200px;">${error.stack || error.message}</pre>
                    </details>
                </div>
            </div>
        `;
    }
    
    // ===== PUBLIC API METHODS =====
    
    static async logout() {
        try {
            console.log('🚪 [AppInit] Logging out...');
            
            const supabase = window.OsliraApp.supabase;
            if (supabase) {
                await supabase.auth.signOut();
            }
            
            // Clear local storage
            localStorage.removeItem('selectedBusinessId');
            localStorage.removeItem('userTimezone');
            
            // Clear app state
            window.OsliraApp.user = null;
            window.OsliraApp.session = null;
            window.OsliraApp.business = null;
            window.OsliraApp.businesses = [];
            
            console.log('✅ [AppInit] Logout successful');
            window.location.href = '/auth.html';
            
        } catch (error) {
            console.error('❌ [AppInit] Logout failed:', error);
            // Force redirect anyway
            window.location.href = '/auth.html';
        }
    }
    
    static setActiveBusiness(businessId) {
        const business = window.OsliraApp.businesses.find(b => b.id === businessId);
        if (business) {
            window.OsliraApp.business = business;
            localStorage.setItem('selectedBusinessId', businessId);
            
            // Emit business change event
            window.OsliraApp.events.dispatchEvent(new CustomEvent('businessChanged', {
                detail: { business }
            }));
            
            console.log(`🏢 [AppInit] Active business changed: ${business.name}`);
            
            // Update UI
            this._populateBusinessSelectors();
        }
    }
}

// =============================================================================
// GLOBAL EXPORTS & AUTO-INITIALIZATION
// =============================================================================

// Export main initialization function
window.OsliraApp = window.OsliraApp || {};
window.OsliraApp.initialize = () => OsliraAppInit.initializeApp();
window.OsliraApp.logout = () => OsliraAppInit.logout();
window.OsliraApp.setActiveBusiness = (id) => OsliraAppInit.setActiveBusiness(id);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        OsliraAppInit.initializeApp().catch(console.error);
    });
} else {
    // DOM already ready
    OsliraAppInit.initializeApp().catch(console.error);
}

console.log('📦 [AppInit] Oslira enterprise app initializer loaded');
