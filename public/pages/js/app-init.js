// =============================================================================
// APP INITIALIZATION - SHARED ACROSS ALL PAGES
// =============================================================================

class OsliraAppInit {
    static async initializeApp() {
        try {
            // 1. Load configuration
            await this.loadConfig();
            
            // 2. Initialize Supabase
            await this.initializeSupabase();
            
            // 3. Check authentication (if needed)
            await this.checkAuth();
            
            console.log('✅ Oslira app initialized');
            return true;
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            throw error;
        }
    }
    
    static async loadConfig() {
        // Use window.CONFIG (from env-config.js) as primary source
        if (window.CONFIG) {
            Object.assign(window.OsliraApp.config, window.CONFIG);
            return window.CONFIG;
        }
        
        // Fallback to API
        try {
            const response = await fetch('/api/config');
            if (!response.ok) throw new Error(`API ${response.status}`);
            
            const config = await response.json();
            if (config.error) throw new Error(config.error);
            
            Object.assign(window.OsliraApp.config, config);
            return config;
            
        } catch (error) {
            throw new Error(`Configuration failed: ${error.message}`);
        }
    }
    
    static async initializeSupabase() {
        const config = window.OsliraApp.config;
        
        if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
            throw new Error('Supabase configuration missing');
        }
        
        window.OsliraApp.supabase = window.supabase.createClient(
            config.SUPABASE_URL || config.supabaseUrl,
            config.SUPABASE_ANON_KEY || config.supabaseAnonKey
        );
        
        return window.OsliraApp.supabase;
    }
    
    static async checkAuth() {
        const protectedPages = ['dashboard', 'leads', 'subscription', 'settings'];
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        
        if (!protectedPages.includes(currentPage)) return true;
        
        const supabase = window.OsliraApp.supabase;
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = '/auth.html';
            return false;
        }
        
        window.OsliraApp.session = session;
        window.OsliraApp.user = session.user;
        return true;
    }
}

// Export for global use
window.OsliraApp.initialize = () => OsliraAppInit.initializeApp();
