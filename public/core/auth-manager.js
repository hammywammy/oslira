class OsliraAuthManager {
    static instance = null;
    
    static async initialize(config) {
        if (this.instance) return this.instance;
        
        this.instance = new OsliraAuthManager(config);
        await this.instance.setup();
        return this.instance;
    }
    
    constructor(config) {
        this.config = config;
        this.supabase = null;
        this.session = null;
        this.user = null;
        this.businesses = [];
    }
    
    async setup() {
        console.log('🔐 [Auth] Initializing authentication...');
        
        // Initialize Supabase once
        this.supabase = window.supabase.createClient(
            this.config.SUPABASE_URL,
            this.config.SUPABASE_ANON_KEY
        );
        
        // Get current session
        const { data: { session } } = await this.supabase.auth.getSession();
        this.session = session;
        
        // Load user data if authenticated
        if (session) {
            await this.loadUserContext();
        }
        
        // Setup auth state listener
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            this.session = session;
            if (session) {
                await this.loadUserContext();
            } else {
                this.user = null;
                this.businesses = [];
            }
            
            // Emit auth change event
            window.dispatchEvent(new CustomEvent('auth:change', { 
                detail: { event, session, user: this.user } 
            }));
        });
        
        console.log('✅ [Auth] Authentication system ready');
        return this;
    }
    
    async loadUserContext() {
        try {
            // Load user profile
            const { data: userData } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', this.session.user.id)
                .single();
            
            this.user = userData;
            
            // Load business profiles
            const { data: businessData } = await this.supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', this.session.user.id);
            
            this.businesses = businessData || [];
            
            console.log('✅ [Auth] User context loaded', { 
                user: this.user?.id, 
                businesses: this.businesses.length 
            });
            
        } catch (error) {
            console.error('❌ [Auth] Failed to load user context:', error);
        }
    }
    
    // Guard functions for pages
    async requireAuth(redirectUrl = '/auth.html') {
        if (!this.session) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    async requireBusiness(redirectUrl = '/onboarding.html') {
        if (!await this.requireAuth()) return false;
        
        if (!this.businesses.length) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    async requireAdmin() {
        if (!await this.requireAuth()) return false;
        
        if (!this.user?.is_admin) {
            window.location.href = '/dashboard.html';
            return false;
        }
        return true;
    }
    
    async signOut() {
        await this.supabase.auth.signOut();
        window.location.href = '/';
    }
}

window.OsliraAuth = OsliraAuthManager;
