class OsliraApp {
    static instance = null;
    
    static async init() {
        if (this.instance) return this.instance;
        
        console.log('🚀 [App] Starting Oslira initialization...');
        
        try {
            this.instance = new OsliraApp();
            await this.instance.initialize();
            return this.instance;
        } catch (error) {
            console.error('❌ [App] Initialization failed:', error);
            throw error;
        }
    }
    
    async initialize() {
        // 1. Load configuration
        this.config = await OsliraConfig.load();
        
        // 2. Wait for Supabase library
        await this.waitForSupabase();
        
        // 3. Initialize authentication
        this.auth = await OsliraAuth.initialize(this.config);
        
        // 4. Initialize API client
        this.api = new OsliraApi(this.config, this.auth);
        
        // 5. Initialize UI manager
        this.ui = new OsliraUI();
        
        // 6. Setup global error handling
        this.setupErrorHandling();
        
        // 7. Attach to window for global access
        window.OsliraApp = {
            config: this.config,
            auth: this.auth,
            api: this.api,
            ui: this.ui
        };
        
        // 8. Emit ready event
        window.dispatchEvent(new Event('oslira:ready'));
        
        console.log('✅ [App] Oslira initialization complete');
        
        return this;
    }
    
    async waitForSupabase() {
        let attempts = 0;
        while (!window.supabase && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (!window.supabase) {
            throw new Error('Supabase library failed to load');
        }
    }
    
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('🚨 [App] Global error:', event.error);
            this.ui?.toast?.error('An unexpected error occurred');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 [App] Unhandled promise rejection:', event.reason);
            this.ui?.toast?.error('An unexpected error occurred');
        });
    }
}

window.Oslira = OsliraApp;
