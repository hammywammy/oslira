class SimpleAuth {
    constructor() {
        this.supabase = null;
        this.session = null;
    }
    
    async initialize() {
    if (this.supabase) return this;
    
    // Wait for config
    const config = await this.waitForConfig();
    
    this.supabase = supabase.createClient(
        config.SUPABASE_URL, 
        config.SUPABASE_ANON_KEY,
        {
            auth: {
                redirectTo: window.location.origin + '/auth/callback',
                persistSession: true,
                autoRefreshToken: true
            }
        }
    );
    
    // Get current session with retry logic
    let session = null;
    let attempts = 0;
    
    while (!session && attempts < 5) {
        const { data: { session: currentSession } } = await this.supabase.auth.getSession();
        session = currentSession;
        
        if (!session && attempts < 4) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        attempts++;
    }
    
    this.session = session;
    console.log('🔐 [SimpleAuth] Session loaded:', !!session);
    
    return this;
}
    
async waitForConfig() {
    for (let i = 0; i < 50; i++) {
        if (window.OsliraConfig?.get) {
            try {
                return window.OsliraConfig.get();
            } catch (error) {
                // Config manager exists but config not loaded yet
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Config not available');
}
    
    // Missing this:
async signInWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/auth/callback'  // <-- THIS IS MISSING
        }
    });
    if (error) throw error;
}
    
    getCurrentSession() {
        return this.session;
    }
    
    isAuthenticated() {
        return !!this.session;
    }
    
    async signOut() {
        await this.supabase.auth.signOut();
        this.session = null;
        window.location.href = '/auth';
    }
}

window.SimpleAuth = new SimpleAuth();
