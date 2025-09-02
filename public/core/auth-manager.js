// =============================================================================
// AUTH-MANAGER.JS - Enhanced Multi-Method Authentication System
// =============================================================================

class OsliraSimpleAuth {
    constructor() {
        this.supabase = null;
        this.session = null;
        this.user = null;
        this.initialized = false;
        
        console.log('🔐 [SimpleAuth] Enhanced auth manager initialized');
    }
    
    // =============================================================================
    // CORE INITIALIZATION
    // =============================================================================
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('🔐 [SimpleAuth] Initializing enhanced authentication...');
            
            // Wait for config to be available
            if (!window.OsliraConfig) {
                console.log('⏳ [SimpleAuth] Waiting for config...');
                await this.waitForConfig();
            }
            
            const config = window.OsliraConfig;
            
            // Initialize Supabase client
            this.supabase = window.supabase.createClient(
                config.SUPABASE_URL,
                config.SUPABASE_ANON_KEY
            );
            
            console.log('✅ [SimpleAuth] Supabase client initialized');
            
            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.session = session;
                this.user = session.user;
                console.log('✅ [SimpleAuth] Existing session found:', session.user.email);
                
                // Emit auth change event
                this.emitAuthChange('SIGNED_IN', session, session.user);
            }
            
            // Listen for auth state changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('🔐 [SimpleAuth] Auth state change:', event);
                
                this.session = session;
                this.user = session?.user || null;
                
                this.emitAuthChange(event, session, this.user);
            });
            
            this.initialized = true;
            console.log('✅ [SimpleAuth] Enhanced authentication ready');
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Initialization failed:', error);
            throw error;
        }
    }
    
    async waitForConfig() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.OsliraConfig && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.OsliraConfig) {
            throw new Error('Config not available after waiting');
        }
    }
    
    // =============================================================================
    // GOOGLE OAUTH (EXISTING)
    // =============================================================================
    
    async signInWithGoogle() {
        try {
            console.log('🔐 [SimpleAuth] Google OAuth sign-in...');
            
            if (!this.supabase) {
                throw new Error('Auth not initialized');
            }
            
            const redirectTo = window.OsliraEnv.AUTH_CALLBACK_URL;
            console.log('🔗 [SimpleAuth] Redirect URL:', redirectTo);
            
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectTo,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });
            
            if (error) throw error;
            
            console.log('✅ [SimpleAuth] Google OAuth initiated');
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Google sign-in failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // EMAIL/PASSWORD AUTHENTICATION (NEW)
    // =============================================================================
    
    async signUpWithPassword(email, password, userData = {}) {
        try {
            console.log('🔐 [SimpleAuth] Email signup attempt:', email);
            
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: userData.full_name || '',
                        created_via: 'email'
                    }
                }
            });
            
            if (error) throw error;
            
            // Create user record in custom users table
            if (data.user) {
                const { error: userInsertError } = await this.supabase
                    .from('users')
                    .insert([{
                        id: data.user.id,
                        email: data.user.email,
                        full_name: userData.full_name || '',
                        created_via: 'email',
                        onboarding_completed: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);
                
                if (userInsertError) {
                    console.log('⚠️ [SimpleAuth] User record creation issue:', userInsertError);
                }
            }
            
            console.log('✅ [SimpleAuth] Email signup successful');
            return { success: true, data, needsEmailConfirmation: !data.session };
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Email signup failed:', error);
            throw error;
        }
    }

    async signInWithPassword(email, password) {
        try {
            console.log('🔐 [SimpleAuth] Email signin attempt:', email);
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            if (data.session) {
                this.session = data.session;
                this.user = data.user;
                
                // Ensure user record exists in custom users table
                const { error: userUpsertError } = await this.supabase
                    .from('users')
                    .upsert([{
                        id: data.user.id,
                        email: data.user.email,
                        full_name: data.user.user_metadata?.full_name || '',
                        created_via: 'email',
                        last_sign_in_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }], {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });
                    
                if (userUpsertError) {
                    console.log('⚠️ [SimpleAuth] User record sync issue:', userUpsertError);
                }
                
                // Emit auth change event
                this.emitAuthChange('SIGNED_IN', data.session, data.user);
            }
            
            console.log('✅ [SimpleAuth] Email signin successful');
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Email signin failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // PHONE/SMS AUTHENTICATION (NEW)
    // =============================================================================
    
    async signInWithPhone(phone) {
        try {
            console.log('🔐 [SimpleAuth] Phone signin attempt:', phone);
            
            const { data, error } = await this.supabase.auth.signInWithOtp({
                phone: phone,
                options: {
                    data: {
                        created_via: 'phone'
                    }
                }
            });
            
            if (error) throw error;
            
            console.log('✅ [SimpleAuth] SMS sent successfully');
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Phone signin failed:', error);
            throw error;
        }
    }

    async verifyPhoneOtp(phone, otp) {
        try {
            console.log('🔐 [SimpleAuth] OTP verification attempt');
            
            const { data, error } = await this.supabase.auth.verifyOtp({
                phone: phone,
                token: otp,
                type: 'sms'
            });
            
            if (error) throw error;
            
            if (data.session) {
                this.session = data.session;
                this.user = data.user;
                
                // Create/update user record in custom users table
                const { error: userUpsertError } = await this.supabase
                    .from('users')
                    .upsert([{
                        id: data.user.id,
                        email: data.user.email || '',
                        phone: data.user.phone || phone,
                        full_name: data.user.user_metadata?.full_name || '',
                        created_via: 'phone',
                        phone_verified: true,
                        onboarding_completed: false,
                        last_sign_in_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }], {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });
                    
                if (userUpsertError) {
                    console.log('⚠️ [SimpleAuth] User record sync issue:', userUpsertError);
                }
                
                // Emit auth change event
                this.emitAuthChange('SIGNED_IN', data.session, data.user);
            }
            
            console.log('✅ [SimpleAuth] OTP verification successful');
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ [SimpleAuth] OTP verification failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // UTILITY FUNCTIONS (NEW)
    // =============================================================================
    
    formatPhoneE164(countryCode, phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return countryCode + cleanPhone;
    }

    async checkUsernameAvailable(username) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('id')
                .eq('username', username.toLowerCase())
                .single();
                
            if (error && error.code === 'PGRST116') {
                // No rows returned = username available
                return true;
            }
            
            if (error) throw error;
            
            // User found = username taken
            return false;
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Username check failed:', error);
            return false;
        }
    }
    
    // =============================================================================
    // SESSION MANAGEMENT (EXISTING)
    // =============================================================================
    
    isAuthenticated() {
        return !!(this.session && this.user);
    }
    
    getCurrentSession() {
        return this.session;
    }
    
    getCurrentUser() {
        return this.user;
    }
    
    async signOut() {
        try {
            console.log('🔐 [SimpleAuth] Signing out...');
            
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.session = null;
            this.user = null;
            
            console.log('✅ [SimpleAuth] Signed out successfully');
            
            // Redirect to auth page
            window.location.href = '/auth';
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Sign out failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // EVENT MANAGEMENT (EXISTING)
    // =============================================================================
    
    emitAuthChange(event, session, user) {
        const detail = {
            event,
            session,
            user,
            isAuthenticated: !!(session && user)
        };
        
        console.log('📡 [SimpleAuth] Emitting auth change:', event);
        
        window.dispatchEvent(new CustomEvent('auth:change', { detail }));
        
        // Also emit on document for broader compatibility
        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('auth:state-change', { detail }));
        }
    }
    
    // =============================================================================
    // PASSWORD RESET (NEW)
    // =============================================================================
    
    async resetPassword(email) {
        try {
            console.log('🔐 [SimpleAuth] Password reset request:', email);
            
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`
            });
            
            if (error) throw error;
            
            console.log('✅ [SimpleAuth] Password reset email sent');
            return { success: true };
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Password reset failed:', error);
            throw error;
        }
    }
    
    async updatePassword(newPassword) {
        try {
            console.log('🔐 [SimpleAuth] Updating password...');
            
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            
            console.log('✅ [SimpleAuth] Password updated successfully');
            return { success: true };
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Password update failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // PROFILE MANAGEMENT (NEW)
    // =============================================================================
    
    async updateProfile(updates) {
        try {
            console.log('🔐 [SimpleAuth] Updating user profile...');
            
            const { error } = await this.supabase.auth.updateUser({
                data: updates
            });
            
            if (error) throw error;
            
            // Also update custom users table
            const { error: userUpdateError } = await this.supabase
                .from('users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.user.id);
                
            if (userUpdateError) {
                console.log('⚠️ [SimpleAuth] Custom user table update issue:', userUpdateError);
            }
            
            console.log('✅ [SimpleAuth] Profile updated successfully');
            return { success: true };
            
        } catch (error) {
            console.error('❌ [SimpleAuth] Profile update failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // ERROR HANDLING (ENHANCED)
    // =============================================================================
    
    handleAuthError(error) {
        console.error('🚨 [SimpleAuth] Auth error:', error);
        
        // Map Supabase errors to user-friendly messages
        const errorMappings = {
            'Invalid login credentials': 'Invalid email or password.',
            'Email not confirmed': 'Please check your email and click the confirmation link.',
            'User already registered': 'An account with this email already exists.',
            'Signup disabled': 'Account creation is currently disabled.',
            'Invalid phone number': 'Please enter a valid phone number.',
            'SMS sending failed': 'Failed to send verification code. Please try again.',
            'Invalid OTP': 'Invalid verification code. Please try again.',
            'OTP expired': 'Verification code has expired. Please request a new one.'
        };
        
        const userMessage = errorMappings[error.message] || error.message || 'An error occurred during authentication.';
        
        return {
            original: error,
            userMessage: userMessage,
            code: error.code || 'unknown'
        };
    }
    
    // =============================================================================
    // DEBUG UTILITIES (DEVELOPMENT)
    // =============================================================================
    
    getDebugInfo() {
        return {
            initialized: this.initialized,
            hasSession: !!this.session,
            hasUser: !!this.user,
            userEmail: this.user?.email,
            sessionExpiry: this.session?.expires_at,
            supabaseConnected: !!this.supabase
        };
    }
}

// =============================================================================
// GLOBAL INITIALIZATION
// =============================================================================

// Create and export global instance
if (!window.SimpleAuth) {
    window.SimpleAuth = new OsliraSimpleAuth();
    console.log('✅ [SimpleAuth] Global instance created');
} else {
    console.log('⚠️ [SimpleAuth] Instance already exists');
}

// Auto-initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.SimpleAuth && !window.SimpleAuth.initialized) {
                console.log('🚀 [SimpleAuth] Auto-initializing...');
                window.SimpleAuth.initialize().catch(error => {
                    console.error('❌ [SimpleAuth] Auto-initialization failed:', error);
                });
            }
        }, 100);
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        if (window.SimpleAuth && !window.SimpleAuth.initialized) {
            console.log('🚀 [SimpleAuth] Auto-initializing...');
            window.SimpleAuth.initialize().catch(error => {
                console.error('❌ [SimpleAuth] Auto-initialization failed:', error);
            });
        }
    }, 100);
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OsliraSimpleAuth;
}
console.log('🔐 Enhanced SimpleAuth loaded - Email, Phone, Google OAuth ready');
