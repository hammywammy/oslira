       let currentStep = 1;
        let currentUser = null;
        let supabase = null;

        // Initialize app immediately when page loads
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Oslira onboarding loaded');
            initializeApp();
        });

        async function initializeApp() {
            try {
                // Try to initialize Supabase first
                await initializeSupabase();
                
                // Check authentication
                await checkAuth();
                
            } catch (error) {
                console.error('💥 App initialization failed:', error);
                showError(`Initialization failed: ${error.message}`);
            }
        }

        async function initializeSupabase() {
            try {
                console.log('🔍 Initializing Supabase...');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
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
                
                supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true
                    }
                });
                
                console.log('✅ Supabase initialized');
                
            } catch (error) {
                console.error('❌ Supabase init failed:', error.message);
                throw new Error('Failed to load configuration. Please check your API endpoint.');
            }
        }

        async function checkAuth() {
            try {
                console.log('🔍 Checking authentication...');
                
                if (!supabase) {
                    throw new Error('Supabase not initialized');
                }
                
                // Handle magic link tokens
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                
                if (accessToken) {
                    console.log('🎟️ Magic link tokens found, processing...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                }
                
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    throw new Error('Session error: ' + error.message);
                }
                
                if (!session) {
                    throw new Error('No active session found. Please log in first.');
                }
                
                console.log('✅ Session found for user:', session.user.email);
                currentUser = session.user;
                
                // Check if onboarding already completed
                await checkOnboardingStatus();
                
            } catch (err) {
                console.error('💥 Auth check error:', err);
                showError(err.message);
            }
        }

        async function checkOnboardingStatus() {
            try {
                console.log('🔍 Checking onboarding status...');
                
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('onboarding_completed')
                    .eq('id', currentUser.id)
                    .single();
                
                if (error && error.code !== 'PGRST116') {
                    console.error('❌ Error checking onboarding status:', error);
                    // Continue anyway if there's an error
                }
                
                if (userData?.onboarding_completed) {
                    console.log('✅ User already completed onboarding - redirecting to dashboard');
                    window.location.href = 'dashboard.html';
                    return;
                }
                
                console.log('🔍 User needs to complete onboarding');
                showOnboardingForm();
                
            } catch (err) {
                console.error('💥 Onboarding status check error:', err);
                // If error, show onboarding anyway
                showOnboardingForm();
            }
        }

        function showOnboardingForm() {
            hideAllStates();
            document.getElementById('onboardingMain').style.display = 'block';
        }

        function showError(message) {
            hideAllStates();
            document.getElementById('errorState').style.display = 'block';
            document.getElementById('errorMessage').textContent = message;
        }

        function showLoading() {
            hideAllStates();
            document.getElementById('loadingState').style.display = 'block';
        }

        function hideAllStates() {
            document.getElementById('authCheck').style.display = 'none';
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('errorState').style.display = 'none';
            document.getElementById('onboardingMain').style.display = 'none';
        }

        function nextStep() {
            if (validateCurrentStep()) {
                if (currentStep < 5) {
                    document.getElementById(`step-${currentStep}`).classList.remove('active');
                    currentStep++;
                    document.getElementById(`step-${currentStep}`).classList.add('active');
                    updateProgress();
                }
            }
        }

        function prevStep() {
            if (currentStep > 1) {
                document.getElementById(`step-${currentStep}`).classList.remove('active');
                currentStep--;
                document.getElementById(`step-${currentStep}`).classList.add('active');
                updateProgress();
            }
        }

        function updateProgress() {
            const progress = (currentStep / 5) * 100;
            document.getElementById('progress').style.width = progress + '%';
            document.getElementById('progress-text').textContent = `Step ${currentStep} of 5`;
        }

        function validateCurrentStep() {
            const stepElement = document.getElementById(`step-${currentStep}`);
            const requiredFields = stepElement.querySelectorAll('input[required], textarea[required], select[required]');
            let isValid = true;

            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.style.borderColor = '#EF4444';
                    isValid = false;
                } else {
                    field.style.borderColor = '#C9CEDC';
                }
            });

            if (!isValid) {
                alert('Please fill in all required fields');
            }

            return isValid;
        }

async function submitForm() {
    try {
        if (!validateCurrentStep()) return;
        if (!currentUser || !supabase) throw new Error('Not properly authenticated');

        showLoading();

        // User table update
        const userUpdate = {
            id: currentUser.id,
            email: currentUser.email,
            credits: 5,
            subscription_plan: 'free',
            subscription_status: 'active',
            onboarding_completed: true,
            updated_at: new Date().toISOString()
        };

        // Business profiles table insertion
        const profileData = {
            user_id: currentUser.id,
            business_name: document.getElementById("business-name").value.trim(),
            business_niche: document.getElementById("business-niche").value.trim(),
            target_audience: document.getElementById("target-audience").value.trim(),
            target_problems: document.getElementById("target-problems").value.trim(),
            value_proposition: document.getElementById("value-proposition").value.trim(),
            communication_style: document.getElementById("communication-style").value,
            message_example: document.getElementById("message-example").value.trim(),
            success_outcome: document.getElementById("success-outcome").value,
            call_to_action: document.getElementById("call-to-action").value.trim(),
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Insert user data
        const { error: userError } = await supabase
            .from("users")
            .upsert(userUpdate, { onConflict: 'id' });

        if (userError) throw new Error(`User update failed: ${userError.message}`);

        // Insert profile data
        const { error: profileError } = await supabase
            .from("business_profiles")
            .insert(profileData);

        if (profileError) throw new Error(`Profile insertion failed: ${profileError.message}`);

        hideAllStates();
        document.getElementById('onboarding-form').style.display = 'none';
        document.getElementById('success').style.display = 'block';

        setTimeout(() => window.location.href = 'dashboard.html', 3000);

    } catch (err) {
        console.error('Form submission error:', err);
        showError(`Setup failed: ${err.message}`);
    }
}

document.getElementById('onboarding-form').addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm();
});


        // Handle enter key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (currentStep < 5) {
                    nextStep();
                } else {
                    submitForm();
                }
            }
        });

        // Auth state listener
        if (window.supabase) {
            window.addEventListener('load', () => {
                if (supabase) {
                    supabase.auth.onAuthStateChange((event, session) => {
                        if (event === 'SIGNED_OUT') {
                            window.location.href = 'auth.html';
                        }
                    });
                }
            });
        }
