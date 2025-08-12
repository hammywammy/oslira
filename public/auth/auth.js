/* =============================================================================
   AUTH.JS - FINAL COMPLETE SYSTEM WITH ALL ORIGINAL FUNCTIONALITY
   ============================================================================= */

// Initialize Sentry if available
if (typeof Sentry !== 'undefined') {
    Sentry.init({
        environment: 'production',
        beforeSend(event) {
            if (event.exception?.values?.[0]?.value?.includes('NetworkError')) { 
                return null;
            }
            return event; 
        }
    });
}

// Application state
let supabase = null;
let isLoading = false;
let isInitialized = false;

// Initialize application when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔐 Oslira auth loaded');
    await initializeAuth();
});

// =============================================================================
// INITIALIZATION (Modern System + Original Features)
// =============================================================================

async function initializeAuth() {
    try {
        console.log('🚀 Starting auth initialization...');
        
        // Wait for Supabase to be available (original timing)
        let attempts = 0;
        while (typeof window.supabase === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase library not available');
        }

        // Get configuration (modern + fallback)
        const config = window.CONFIG || await loadConfigFromAPI();
        
        // Initialize Supabase client
        supabase = window.supabase.createClient(
            config.supabaseUrl, 
            config.supabaseAnonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true
                }
            }
        );
        
        // Check for existing session or magic link
        await handleExistingAuth();

        // Set up form handler
        setupFormHandler();
        
        isInitialized = true;
        console.log('✅ Auth initialized');

    } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        showError(`Authentication setup failed: ${error.message}`);
    }
}

async function loadConfigFromAPI() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
        const response = await fetch('/api/config', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Config API failed: ${response.status}`);
        }
        
        const config = await response.json();
        
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error('Invalid config received');
        }
        
        return config;
        
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// =============================================================================
// AUTH STATE HANDLING (Original Logic)
// =============================================================================

async function handleExistingAuth() {
    try {
        // Check URL for magic link parameters first (original order)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
        const error = hashParams.get('error') || urlParams.get('error');

        if (error) {
            console.log('🔍 AUTH: URL contains auth error:', error);
            cleanUrl();
            showError('Authentication failed. Please try again.');
            return;
        }

        if (accessToken && refreshToken) {
            console.log('🔍 AUTH: Found magic link tokens in URL');
            await handleMagicLink(accessToken, refreshToken);
            return;
        }

        // Check for existing session - be more lenient (original behavior)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.log('🔍 AUTH: Session error:', sessionError.message);
            // Don't clear data immediately - could be network issue (original logic)
            return;
        }
        
        if (session && session.user) {
            console.log('🔍 AUTH: Found existing session for user:', session.user?.email || 'Unknown email');
            console.log('🔍 AUTH: User ID:', session.user?.id || 'Unknown ID');
            console.log('🔍 AUTH: Session expires:', new Date(session.expires_at * 1000).toLocaleString());
            
            // Check if session is still valid (not expired) - original validation
            const now = Date.now() / 1000;
            if (session.expires_at && session.expires_at > now) {
                console.log('🔍 AUTH: Valid session found, redirecting...');
                await redirectToDashboard();
                return;
            } else {
                console.log('🔍 AUTH: Session expired, clearing...');
                await clearAllAuthData();
                return;
            }
        } else {
            console.log('🔍 AUTH: No existing session found - ready for fresh login');
        }

    } catch (error) {
        console.error('🔍 AUTH: Auth check failed:', error);
        // Don't clear auth data for network errors (original behavior)
    }
}

// Handle magic link authentication (original logic)
async function handleMagicLink(accessToken, refreshToken) {
    try {
        console.log('🔍 AUTH: Processing magic link authentication...');
        
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        if (error) {
            console.log('🔍 AUTH: Magic link session error:', error.message);
            throw error;
        }

        console.log('🔍 AUTH: Magic link successful for user:', data.user?.email || 'Unknown email');
        console.log('🔍 AUTH: New user ID:', data.user?.id || 'Unknown ID');
        
        cleanUrl();
        await redirectToDashboard();

    } catch (error) {
        console.error('🔍 AUTH: Magic link failed:', error.message);
        cleanUrl();
        await clearAllAuthData();
        showError('There was a problem with your login link. Please try signing in again.');
    }
}

// Clear all authentication data (original comprehensive clearing)
async function clearAllAuthData() {
    try {
        console.log('🧹 AUTH: Clearing all authentication data...');
        
        // Clear browser storage first
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // Clear IndexedDB (where Supabase stores tokens)
        if ('indexedDB' in window) {
            try {
                const databases = await indexedDB.databases();
                databases.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                });
            } catch (e) {
                console.log('🧹 AUTH: Could not clear IndexedDB');
            }
        }
        
        // If Supabase is available, force sign out
        if (supabase) {
            await supabase.auth.signOut({ scope: 'global' });
        }
        
        console.log('🧹 AUTH: All auth data cleared successfully');
    } catch (error) {
        console.error('🧹 AUTH: Error clearing auth data:', error);
    }
}

// =============================================================================
// FORM HANDLING (Original Rate Limiting + Logic)
// =============================================================================

function setupFormHandler() {
    const form = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    
    if (form && emailInput) {
        form.addEventListener('submit', handleFormSubmission);
        
        // Clear errors on input (original behavior)
        emailInput.addEventListener('input', () => {
            clearError();
            emailInput.classList.remove('error');
        });
    }
}

async function handleFormSubmission(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    const emailInput = document.getElementById('email');
    const button = document.getElementById('signin-button');
    const email = emailInput.value.trim().toLowerCase();
    
    // Validate email (original validation)
    if (!email) {
        showError('Please enter your email address');
        emailInput.focus();
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        emailInput.classList.add('error');
        emailInput.focus();
        return;
    }
    
    // Rate limiting (original comprehensive system)
    const now = Date.now();
    const sessionKey = 'auth_session_attempts';
    const emailKey = `auth_email_attempts_${email}`;
    
    // Session-based rate limiting
    const sessionAttempts = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
    const recentSessionAttempts = sessionAttempts.filter(time => now - time < 5 * 60 * 1000);
    
    // Email-based rate limiting  
    const emailAttempts = JSON.parse(localStorage.getItem(emailKey) || '{"attempts": [], "lastSuccess": 0}');
    const recentEmailAttempts = emailAttempts.attempts.filter(time => now - time < 60 * 60 * 1000);
    const hasRecentSuccess = emailAttempts.lastSuccess && now - emailAttempts.lastSuccess < 60 * 60 * 1000;
    
    // Check limits (original thresholds)
    const isSessionAbuse = recentSessionAttempts.length >= 5;
    const isEmailAbuse = recentEmailAttempts.length >= 3 && !hasRecentSuccess;
    
    if (isSessionAbuse) {
        console.log('🔍 AUTH: Session abuse detected - too many attempts in this session');
        showError('Too many attempts. Please wait 5 minutes.');
        return;
    }
    
    if (isEmailAbuse && !hasRecentSuccess) {
        console.log('🔍 AUTH: Email abuse detected - too many attempts for this email');
        const nextAttempt = new Date(Math.max(...recentEmailAttempts) + 60 * 60 * 1000);
        showError(`Too many attempts for this email. Try again after ${nextAttempt.toLocaleTimeString()}.`);
        return;
    }

    // Record this attempt
    recentSessionAttempts.push(now);
    recentEmailAttempts.push(now);
    
    sessionStorage.setItem(sessionKey, JSON.stringify(recentSessionAttempts));
    localStorage.setItem(emailKey, JSON.stringify({
        attempts: recentEmailAttempts,
        lastSuccess: emailAttempts.lastSuccess
    }));

    // Show loading state (original UI)
    isLoading = true;
    button.disabled = true;
    button.classList.add('loading');
    console.log('🔍 AUTH: Sending magic link...');

    try {
        const isStaging = window.location.hostname.includes('test') || 
                 window.location.hostname.includes('staging') ||
                 window.location.hostname.includes('prototype');

const redirectTo = isStaging 
    ? 'https://osliratest.netlify.app/auth.html'    // Your staging URL
    : window.location.origin + '/auth.html';       // Production URL

const { error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
        emailRedirectTo: redirectTo,  // 🔥 DYNAMIC REDIRECT
        shouldCreateUser: true
    }
});

        if (error) {
            console.log('🔍 AUTH: Supabase error:', error.message);
            throw error;
        }

        // Mark successful attempt (original tracking)
        localStorage.setItem(emailKey, JSON.stringify({
            attempts: [],
            lastSuccess: now
        }));

        console.log('🔍 AUTH: Magic link sent successfully to:', email);
        showSuccess(email);

    } catch (error) {
        console.error('🔍 AUTH: Form submission error:', error);
        
        let errorMessage = 'Unable to send login link. Please try again.';
        
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
            // Remove our attempt record if Supabase rate limited us (original logic)
            const currentData = JSON.parse(localStorage.getItem(emailKey) || '{"attempts": [], "lastSuccess": 0}');
            currentData.attempts.pop();
            localStorage.setItem(emailKey, JSON.stringify(currentData));
            
            errorMessage = 'Server rate limit reached. Please wait a moment and try again.';
        } else if (error.message.includes('invalid') || error.message.includes('malformed')) {
            errorMessage = 'Please check your email address and try again.';
        }
        
        showError(errorMessage);
        emailInput.classList.add('error');
        emailInput.focus();

    } finally {
        isLoading = false;
        button.disabled = false;
        button.classList.remove('loading');
    }
}

// =============================================================================
// UTILITY FUNCTIONS (Original Logic)
// =============================================================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanUrl() {
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
    }
}

async function redirectToDashboard() {
    try {
        // Check if user needs onboarding first (original flow)
        if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('onboarding_completed')
                    .eq('id', user.id)
                    .single();
                
                if (!userData?.onboarding_completed) {
                    console.log('🔍 AUTH: User needs onboarding, redirecting...');
                    window.location.href = '/onboarding.html';
                    return;
                }
            }
        }
        
        console.log('🔍 AUTH: Redirecting to dashboard...');
        window.location.href = '/dashboard.html';
        
    } catch (error) {
        console.error('🔍 AUTH: Redirect error:', error);
        // Fallback to dashboard
        window.location.href = '/dashboard.html';
    }
}

// =============================================================================
// UI FUNCTIONS (Original Styling & Behavior)
// =============================================================================

function showError(message) {
    const errorEl = document.getElementById('error-display');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        errorEl.focus();
        
        // Auto-hide after 5 seconds (original timing)
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

function clearError() {
    const errorEl = document.getElementById('error-display');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function showSuccess(email) {
    document.getElementById('sent-email').textContent = email;
    document.getElementById('main-card').style.display = 'none';
    document.getElementById('success-card').style.display = 'block';
}



// =============================================================================
// AUTH STATE LISTENERS (Original Functionality)
// =============================================================================

// Handle auth state changes (original behavior)
window.addEventListener('load', () => {
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔍 AUTH: Auth state changed:', event);
            if (event === 'SIGNED_IN' && session) {
                redirectToDashboard();
            }
        });
    }
});

// =============================================================================
// ERROR HANDLING (Enhanced)
// =============================================================================

window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
    if (!isInitialized) {
        showError('Authentication system failed to load. Please refresh the page.');
    }
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});
