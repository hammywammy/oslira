        let supabase = null;
        let isLoading = false;

        // Clear all authentication data
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

        // Initialize authentication system
        async function initializeAuth() {
            try {
                // Wait for Supabase to be available
                let attempts = 0;
                while (typeof window.supabase === 'undefined' && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (typeof window.supabase === 'undefined') {
                    throw new Error('Supabase library not available');
                }

                // Get configuration from API
                const config = window.CONFIG || await loadConfigFromAPI();
                
                // Initialize Supabase client
                supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
                
                // Check for existing session or magic link
                await handleExistingAuth();

                // Set up form handler
                setupFormHandler();

            } catch (error) {
                showError(`Authentication setup failed: ${error.message}`);
            }
        }

        // Fetch configuration from API
        async function fetchConfig() {
            try {
                const response = await fetch('/api/config');
                
                if (!response.ok) {
                    throw new Error(`Config API returned ${response.status}: ${response.statusText}`);
                }
                
                const config = await response.json();
                
                if (config.error) {
                    throw new Error(config.error);
                }

                if (!config.supabaseUrl || !config.supabaseAnonKey) {
                    throw new Error('Invalid configuration received from API');
                }

                return config;

            } catch (error) {
                throw new Error(`Failed to load configuration: ${error.message}`);
            }
        }

        // Handle existing authentication
        async function handleExistingAuth() {
            try {
                // Check URL for magic link parameters first
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

                // Check for existing session - be more lenient
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.log('🔍 AUTH: Session error:', sessionError.message);
                    // Don't clear data immediately - could be network issue
                    return;
                }
                
                if (session && session.user) {
                    console.log('🔍 AUTH: Found existing session for user:', session.user?.email || 'Unknown email');
                    console.log('🔍 AUTH: User ID:', session.user?.id || 'Unknown ID');
                    console.log('🔍 AUTH: Session expires:', new Date(session.expires_at * 1000).toLocaleString());
                    
                    // Check if session is still valid (not expired)
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
                // Don't clear auth data for network errors
            }
        }

        // Handle magic link authentication
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

        // Redirect to dashboard
        async function redirectToDashboard() {
            try {
                // Check if user has completed onboarding by checking for business profiles
                const { data: businessProfiles, error } = await supabase
                    .from('business_profiles')
                    .select('id, business_name')
                    .limit(1);
                
                if (error) {
                    console.log('🔍 AUTH: Error checking business profiles, assuming new user:', error.message);
                    // If we can't check, assume new user and send to onboarding
                    window.location.href = 'onboarding.html';
                    return;
                }
                
                if (!businessProfiles || businessProfiles.length === 0) {
                    console.log('🔍 AUTH: No business profiles found - redirecting to onboarding');
                    window.location.href = 'onboarding.html';
                } else {
                    console.log('🔍 AUTH: Business profiles found - redirecting to dashboard');
                    
                    // Check for demo context
                    const demoUsername = sessionStorage.getItem('demo_username');
                    if (demoUsername) {
                        sessionStorage.removeItem('demo_username');
                        window.location.href = `dashboard.html?demo_analysis=${encodeURIComponent(demoUsername)}`;
                        return;
                    }
                    
                    // Default redirect to dashboard
                    window.location.href = 'dashboard.html';
                }
            } catch (error) {
                console.error('🔍 AUTH: Error during redirect logic:', error);
                // Default to onboarding if there's any error
                window.location.href = 'onboarding.html';
            }
        }

        // Clean authentication parameters from URL
        function cleanUrl() {
            const url = new URL(window.location);
            const params = ['access_token', 'refresh_token', 'token_type', 'expires_in', 'error', 'error_description'];
            
            params.forEach(param => {
                url.searchParams.delete(param);
                url.hash = url.hash.replace(new RegExp(`[&?]${param}=[^&]*`, 'g'), '');
            });
            
            window.history.replaceState(null, '', url.toString());
        }

        // Set up form submission handler
        function setupFormHandler() {
            const form = document.getElementById('auth-form');
            form.addEventListener('submit', handleFormSubmit);
        }

        // Handle form submission
        async function handleFormSubmit(event) {
            event.preventDefault();
            
            if (isLoading) return;

            const email = document.getElementById('email').value.trim();
            const button = document.getElementById('submit-button');
            const emailInput = document.getElementById('email');

            console.log('🔍 AUTH: Form submission for email:', email);

            // Clear previous errors
            clearError();
            emailInput.classList.remove('error');

            // Validate email
            if (!email || !isValidEmail(email)) {
                console.log('🔍 AUTH: Invalid email format');
                showError('Please enter a valid email address');
                emailInput.classList.add('error');
                emailInput.focus();
                return;
            }

            // Smart rate limiting - only prevent actual abuse
            const sessionKey = `auth_attempts_${Date.now().toString().slice(0, -5)}`; // 10-minute windows
            const emailKey = `email_attempts_${email}`;
            
            const sessionAttempts = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
            const emailAttempts = JSON.parse(localStorage.getItem(emailKey) || '{"attempts": [], "lastSuccess": 0}');
            
            const now = Date.now();
            const fiveMinutesAgo = now - 5 * 60 * 1000;
            const oneHourAgo = now - 60 * 60 * 1000;
            
            // Clean old attempts
            const recentSessionAttempts = sessionAttempts.filter(time => time > fiveMinutesAgo);
            const recentEmailAttempts = emailAttempts.attempts.filter(time => time > oneHourAgo);
            
            // Abuse detection
            const isSessionAbuse = recentSessionAttempts.length >= 5; // 5 attempts in 5 minutes from same browser
            const isEmailAbuse = recentEmailAttempts.length >= 3; // 3 attempts in 1 hour for same email
            const hasRecentSuccess = emailAttempts.lastSuccess > fiveMinutesAgo; // Had success in last 5 minutes
            
            if (isSessionAbuse) {
                console.log('🔍 AUTH: Session abuse detected - too many attempts from this browser');
                showError('Too many attempts from this browser. Please wait 5 minutes.');
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

            // Show loading state
            isLoading = true;
            button.disabled = true;
            button.classList.add('loading');
            console.log('🔍 AUTH: Sending magic link...');

            try {
                const { error } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: {
                        emailRedirectTo: window.location.origin + '/auth.html',
                        shouldCreateUser: true
                    }
                });

                if (error) {
                    console.log('🔍 AUTH: Supabase error:', error.message);
                    throw error;
                }

                // Mark successful attempt
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
                    // Remove our attempt record if Supabase rate limited us
                    const currentData = JSON.parse(localStorage.getItem(emailKey) || '{"attempts": [], "lastSuccess": 0}');
                    currentData.attempts.pop(); // Remove the last attempt
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

        // Utility functions
        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function showError(message) {
            const errorEl = document.getElementById('error-display');
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            errorEl.focus();
            
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }

        function clearError() {
            const errorEl = document.getElementById('error-display');
            errorEl.style.display = 'none';
        }

        function showSuccess(email) {
            document.getElementById('sent-email').textContent = email;
            document.getElementById('main-card').style.display = 'none';
            document.getElementById('success-card').style.display = 'block';
        }

        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            initializeAuth();
        });

        // Handle auth state changes
        window.addEventListener('load', () => {
            if (supabase) {
                supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        redirectToDashboard();
                    }
                });
            }
        });
