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
        // Use Supabase auth admin method or a simple signin attempt
        // Since we can't directly query auth.users, we'll use a different approach
        const { data, error } = await this.supabase.rpc('check_user_exists', { email });
        return !error && data;
    } catch {
        return false;
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
