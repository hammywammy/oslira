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
    
    // Get current session
    const { data: { session } } = await this.supabase.auth.getSession();
    this.session = session;
    
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
            redirectTo: window.location.origin + '/auth/callback'
        }
    });
    if (error) throw error;
}

// ADD THESE NEW METHODS:
async signUpWithPassword(email, password, userData = {}) {
    const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
            data: userData
        }
    });
    
    if (error) throw error;
    
    return {
        user: data.user,
        session: data.session,
        needsEmailConfirmation: !data.session
    };
}

async signInWithPassword(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    
    this.session = data.session;
    return data;
}

async checkUserExists(email) {
    try {
        // Check if user completed full signup (exists in custom users table)
        const { data: userData, error: userError } = await this.supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();
            
        if (!userError && userData) {
            // User completed full signup
            return { exists: true, completed: true };
        }
        
// Can't use admin API with anon key - skip this check
// Just return based on public.users table result
console.log('⚠️ [Auth] Cannot check auth.users with anon key - assuming new user');
        
        if (authUser) {
            // User exists in auth but not in custom table (incomplete)
            return { exists: true, completed: false };
        }
        
        // User doesn't exist anywhere (new user)
        return { exists: false, completed: false };
        
    } catch (error) {
        console.error('❌ [Auth] checkUserExists failed:', error);
        return { exists: false, completed: false };
    }
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
