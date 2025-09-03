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
        // Check if user has completed full signup (exists in custom users table)
        const { data: userData, error: userError } = await this.supabase
            .from('users')
            .select('id, onboarding_completed')
            .eq('email', email)
            .single();
            
        // User exists in users table = completed full signup
        if (!userError && userData) {
            console.log('✅ [Auth] User found in users table - completed signup');
            return { exists: true, completed: true };
        }
        
        console.log('🔍 [Auth] User not in users table, checking auth.users...');
        
        // Check if user exists in auth.users (OTP sent, but no password/incomplete)
        try {
            const { data: { user: authUser }, error: authError } = await this.supabase.auth.getUser();
            
            // If we have a current session but no users table record, they're incomplete
            if (authUser && authUser.email === email) {
                console.log('⚠️ [Auth] User in auth.users but not users table - incomplete signup');
                return { exists: true, completed: false };
            }
        } catch (authCheckError) {
            console.log('🔍 [Auth] No current session, checking if email exists in auth...');
        }
        
        // Try to sign in to see if email exists in auth.users
        // This won't actually sign them in, just check if the email exists
        try {
            const { error: signInError } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: 'dummy-password-to-check-existence'
            });
            
            // If error is about invalid password, user exists in auth
            if (signInError?.message?.includes('Invalid login credentials')) {
                console.log('⚠️ [Auth] User exists in auth.users but incomplete - email exists');
                return { exists: true, completed: false };
            }
        } catch (checkError) {
            console.log('🔍 [Auth] Error checking auth existence:', checkError);
        }
        
        console.log('✅ [Auth] New user - does not exist anywhere');
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
