// =============================================================================
// AUTH CALLBACK HANDLER - DUAL ENVIRONMENT SYSTEM
// Handles authentication callbacks from Supabase for both environments
// =============================================================================

let supabase = null;
let envConfig = null;

// Initialize callback handler when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔐 [AuthCallback] Starting callback processing...');
    await handleAuthCallback();
});

async function handleAuthCallback() {
    try {
        // Load environment configuration
        await loadEnvConfig();
        envConfig = getEnvConfig();
        
        console.log(`🌐 [AuthCallback] Processing callback for ${envConfig.ENV} environment`);
        
        // Initialize Supabase client
        const supabaseConfig = envConfig.getSupabaseConfig ? envConfig.getSupabaseConfig() : {
            url: envConfig.SUPABASE_URL,
            anonKey: envConfig.SUPABASE_ANON_KEY
        };
        
        supabase = window.supabase.createClient(
            supabaseConfig.url,
            supabaseConfig.anonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        );

        // Check for authentication parameters in URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for error first
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
            console.error('🔐 [AuthCallback] Auth error from URL:', error, errorDescription);
            showError(`Authentication failed: ${errorDescription || error}`);
            return;
        }

        // Check for auth code or tokens
        const code = urlParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
            console.log('🔐 [AuthCallback] Found auth code, exchanging for session...');
            await handleAuthCode();
        } else if (accessToken && refreshToken) {
            console.log('🔐 [AuthCallback] Found tokens, setting session...');
            await handleTokens(accessToken, refreshToken);
        } else {
            console.log('🔐 [AuthCallback] No auth parameters found, checking existing session...');
            await handleExistingSession();
        }

    } catch (error) {
        console.error('🔐 [AuthCallback] Callback processing failed:', error);
        showError(`Callback processing failed: ${error.message}`);
    }
}

async function handleAuthCode() {
    try {
        // Exchange code for session using the current URL
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
            throw error;
        }

        if (data.session && data.user) {
            console.log('🔐 [AuthCallback] Code exchange successful');
            console.log(`👤 [AuthCallback] User: ${data.user.email}`);
            await redirectToApp(data.user);
        } else {
            throw new Error('No session returned from code exchange');
        }

    } catch (error) {
        console.error('🔐 [AuthCallback] Code exchange failed:', error);
        throw error;
    }
}

async function handleTokens(accessToken, refreshToken) {
    try {
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        if (error) {
            throw error;
        }

        if (data.session && data.user) {
            console.log('🔐 [AuthCallback] Token session successful');
            console.log(`👤 [AuthCallback] User: ${data.user.email}`);
            await redirectToApp(data.user);
        } else {
            throw new Error('No session returned from token exchange');
        }

    } catch (error) {
        console.error('🔐 [AuthCallback] Token session failed:', error);
        throw error;
    }
}

async function handleExistingSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            throw error;
        }

        if (session && session.user) {
            console.log('🔐 [AuthCallback] Found existing session');
            console.log(`👤 [AuthCallback] User: ${session.user.email}`);
            await redirectToApp(session.user);
        } else {
            // No session found, redirect to login
            console.log('🔐 [AuthCallback] No session found, redirecting to login');
            window.location.replace(envConfig.AUTH_LOGIN_URL);
        }

    } catch (error) {
        console.error('🔐 [AuthCallback] Session check failed:', error);
        throw error;
    }
}

async function redirectToApp(user) {
    try {
        // Clean the URL first
        cleanUrl();
        
        // Check if user needs onboarding
        const { data: userData, error } = await supabase
            .from('users')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.warn('🔐 [AuthCallback] Could not check onboarding status:', error);
        }

        // Determine redirect destination
        let redirectUrl;
        if (!userData?.onboarding_completed) {
            console.log('🔐 [AuthCallback] User needs onboarding');
            redirectUrl = envConfig.ONBOARDING_URL;
        } else {
            console.log('🔐 [AuthCallback] User completed onboarding, going to dashboard');
            redirectUrl = envConfig.DASHBOARD_URL;
        }

        console.log(`🔐 [AuthCallback] Redirecting to: ${redirectUrl}`);
        
        // Small delay to ensure session is fully established
        setTimeout(() => {
            window.location.replace(redirectUrl);
        }, 500);

    } catch (error) {
        console.error('🔐 [AuthCallback] Redirect preparation failed:', error);
        // Fallback to dashboard
        window.location.replace(envConfig.DASHBOARD_URL);
    }
}

function cleanUrl() {
    // Clean up URL without triggering a reload
    if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
    }
}

function showError(message) {
    console.error('🔐 [AuthCallback] Showing error:', message);
    
    // Hide loading state
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
        loadingState.style.display = 'none';
    }
    
    // Show error state
    const errorState = document.getElementById('error-state');
    if (errorState) {
        errorState.style.display = 'block';
        errorState.classList.remove('error-state');
    }
    
    // Update error message
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    
    // Show debug info in staging
    if (envConfig && envConfig.ENV === 'staging') {
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            debugInfo.style.display = 'block';
            debugInfo.innerHTML = `
                <strong>Debug Info (Staging Only):</strong><br>
                Environment: ${envConfig.ENV}<br>
                URL: ${window.location.href}<br>
                Origin: ${window.location.origin}<br>
                Timestamp: ${new Date().toISOString()}
            `;
        }
    }
}
