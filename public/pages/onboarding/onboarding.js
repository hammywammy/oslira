/**
 * ONBOARDING PAGE CONTROLLER
 * SecurityGuard-compliant implementation
 * Handles only onboarding-specific functionality
 */

(function() {
    'use strict';
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    let initialized = false;
    let auth = null;
    let user = null;
    let loading = false;
    let step = 1; // Initialize step counter
    
    // Validation rules
    const rules = {
        'business-name': { required: true, minLength: 2 },
        'business-niche': { required: true },
        'target-audience': { required: true, minLength: 20 },
        'target-problems': { required: true, minLength: 10 },
        'value-proposition': { required: true, minLength: 20 },
        'key-results': { required: true, minLength: 10 },
        'success-outcome': { required: true },
        'communication-tone': { required: true },
        'communication-length': { required: true },
        'preferred-cta': { required: true },
        'message-example': { required: true, minLength: 50 }
    };

    // =============================================================================
    // INITIALIZATION - SECURITYGUARD COMPLIANT
    // =============================================================================

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 [Onboarding] Page loaded, initializing...');
        await init();
    });

    // Listen for script-loader completion
    window.addEventListener('oslira:scripts:loaded', async (event) => {
        console.log('📚 [Onboarding] Scripts loaded, finalizing initialization...');
        if (!initialized) {
            await init();
        }
    });

    async function init() {
        try {
            console.log('🚀 [Onboarding] Starting initialization...');
            
            // SecurityGuard verified access - get session directly from Supabase
            await loadSessionDirectly();
            
            // Show onboarding form immediately
            showOnboardingForm();
            
            // Setup event listeners
            setupEvents();
            
            initialized = true;
            console.log('✅ [Onboarding] Initialization complete');
            
        } catch (error) {
            console.error('❌ [Onboarding] Initialization failed:', error);
            showError(`Setup failed: ${error.message}`);
            setTimeout(() => window.location.href = '/auth', 2000);
        }
    }

    async function loadSessionDirectly() {
        console.log('📊 [Onboarding] Loading session directly...');
        
        try {
            // Wait for Supabase to be available
            await waitForSupabase();
            
            // Get config
            const config = window.OsliraConfig?.get();
            if (!config) {
                throw new Error('Configuration not available');
            }
            
            // Create Supabase client directly
            const supabaseClient = window.supabase.createClient(
                config.SUPABASE_URL, 
                config.SUPABASE_ANON_KEY
            );
            
            // Get current session
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) {
                throw new Error(`Session error: ${error.message}`);
            }
            
            if (!session) {
                throw new Error('No session found');
            }
            
            // Store session and user data
            auth = { 
                session, 
                supabase: supabaseClient,
                getCurrentSession: () => session,
                getCurrentUser: () => session.user,
                makeAuthenticatedRequest: async (url, options = {}) => {
                    return fetch(url, {
                        ...options,
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                            ...options.headers
                        }
                    });
                }
            };
            
            user = {
                ...session.user,
                email: session.user.email,
                id: session.user.id,
                onboarding_completed: false // Default assumption for onboarding page
            };
            
            console.log('✅ [Onboarding] Session loaded for:', user.email);
            
        } catch (error) {
            console.error('❌ [Onboarding] Failed to load session:', error);
            throw error;
        }
    }

    async function waitForSupabase() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.supabase?.createClient) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Supabase not available after timeout');
    }

    function showOnboardingForm() {
        console.log('🎨 [Onboarding] Showing onboarding form...');
        
        // Hide auth check
        const authCheck = document.getElementById('auth-check');
        if (authCheck) {
            authCheck.style.display = 'none';
            console.log('🎨 [Onboarding] Hidden auth-check');
        }
        
        // Show main onboarding
        const onboardingMain = document.getElementById('onboarding-main');
        if (onboardingMain) {
            onboardingMain.style.display = 'block';
            console.log('🎨 [Onboarding] Showing onboarding-main');
            
            // Initialize step system
            initializeSteps();
        } else {
            console.error('❌ [Onboarding] onboarding-main element not found');
        }
    }

    function initializeSteps() {
        console.log('🎨 [Onboarding] Initializing step system...');
        
        // Ensure step is initialized
        window.step = 1;
        
        // Activate first step
        const firstStep = document.getElementById('step-1');
        if (firstStep) {
            firstStep.classList.add('active');
            updateProgress();
            console.log('🎨 [Onboarding] Activated step 1');
            
            // Focus first input
            const firstField = firstStep.querySelector('input, select, textarea');
            if (firstField) {
                setTimeout(() => firstField.focus(), 100);
            }
        } else {
            console.error('❌ [Onboarding] step-1 element not found');
        }
    }

    // =============================================================================
    // NAVIGATION
    // =============================================================================

    function nextStep() {
        console.log(`📍 [Onboarding] Next step requested from step ${step}`);
        
        if (!validateCurrentStep()) {
            console.log('❌ [Onboarding] Validation failed, staying on current step');
            return;
        }
        
        if (step < 5) {
            // Hide current step
            const currentStep = document.getElementById(`step-${step}`);
            if (currentStep) {
                currentStep.classList.remove('active');
                console.log(`🎨 [Onboarding] Deactivated step ${step}`);
            }
            
            // Move to next step
            step++;
            
            // Show next step
            const nextStepEl = document.getElementById(`step-${step}`);
            if (nextStepEl) {
                nextStepEl.classList.add('active');
                updateProgress();
                console.log(`🎨 [Onboarding] Activated step ${step}`);
                
                // Focus first field in new step
                const firstField = nextStepEl.querySelector('input, select, textarea');
                if (firstField) {
                    setTimeout(() => firstField.focus(), 100);
                }
            }
        }
    }

    function prevStep() {
        console.log(`📍 [Onboarding] Previous step requested from step ${step}`);
        
        if (step > 1) {
            // Hide current step
            const currentStep = document.getElementById(`step-${step}`);
            if (currentStep) {
                currentStep.classList.remove('active');
                console.log(`🎨 [Onboarding] Deactivated step ${step}`);
            }
            
            // Move to previous step
            step--;
            
            // Show previous step
            const prevStepEl = document.getElementById(`step-${step}`);
            if (prevStepEl) {
                prevStepEl.classList.add('active');
                updateProgress();
                console.log(`🎨 [Onboarding] Activated step ${step}`);
            }
        }
    }

    function updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill && progressText) {
            const progress = ((step - 1) / 4) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Step ${step} of 5`;
            console.log(`📊 [Onboarding] Progress updated: ${progress}%`);
        }
    }

    // =============================================================================
    // VALIDATION
    // =============================================================================

    function validateCurrentStep() {
        const stepElement = document.getElementById(`step-${step}`);
        if (!stepElement) {
            console.error(`❌ [Onboarding] Step element not found: step-${step}`);
            return false;
        }
        
        const fields = stepElement.querySelectorAll('input[required], select[required], textarea[required]');
        let valid = true;
        
        fields.forEach(field => {
            if (!validateField(field.id)) {
                valid = false;
            }
        });
        
        console.log(`✅ [Onboarding] Step ${step} validation: ${valid ? 'passed' : 'failed'}`);
        return valid;
    }

    function validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const rule = rules[fieldId];
        
        if (!field || !rule) return true;
        
        const value = field.value.trim();
        let valid = true;
        let errorMessage = '';
        
        // Required check
        if (rule.required && !value) {
            valid = false;
            errorMessage = 'This field is required';
        }
        
        // Length check
        if (valid && rule.minLength && value.length < rule.minLength) {
            valid = false;
            errorMessage = `Please enter at least ${rule.minLength} characters`;
        }
        
        // Pattern check
        if (valid && rule.pattern && !rule.pattern.test(value)) {
            valid = false;
            errorMessage = rule.message || 'Invalid format';
        }
        
        // Show/hide error
        const errorElement = document.getElementById(`${fieldId}-error`);
        if (errorElement) {
            errorElement.textContent = errorMessage;
            errorElement.style.display = valid ? 'none' : 'block';
        }
        
        // Update field styling
        field.classList.toggle('error', !valid);
        
        return valid;
    }

    function clearError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (field) field.classList.remove('error');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }

    // =============================================================================
    // FORM SUBMISSION
    // =============================================================================

    async function handleSubmit(event) {
        event.preventDefault();
        
        if (loading) return;
        
        console.log('📤 [Onboarding] Form submission started...');
        
        try {
            setLoading(true);
            
            // Validate all fields
            let allValid = true;
            Object.keys(rules).forEach(fieldId => {
                if (!validateField(fieldId)) {
                    allValid = false;
                }
            });
            
            if (!allValid) {
                throw new Error('Please fix the errors above before continuing');
            }
            
            // Collect form data
            const formData = collectData();
            console.log('📊 [Onboarding] Form data collected');
            
            // Submit to backend
            const response = await submitData(formData);
            
            if (response.success) {
                console.log('✅ [Onboarding] Submission successful');
                showMessage('Profile setup complete! Redirecting to dashboard...', 'success');
                
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            } else {
                throw new Error(response.error || 'Submission failed');
            }
            
        } catch (error) {
            console.error('❌ [Onboarding] Submission failed:', error);
            showMessage(error.message, 'error');
            
            if (typeof Sentry !== 'undefined') {
                Sentry.captureException(error, {
                    tags: { section: 'onboarding-submit' },
                    extra: { userId: user?.id }
                });
            }
        } finally {
            setLoading(false);
        }
    }

    function collectData() {
        const data = {};
        
        Object.keys(rules).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                data[fieldId] = field.value.trim();
            }
        });
        
        return {
            ...data,
            userId: user.id,
            userEmail: user.email
        };
    }

    async function submitData(formData) {
        const config = window.OsliraConfig?.get();
        if (!config) {
            throw new Error('Configuration not available');
        }
        
        const response = await auth.makeAuthenticatedRequest(
            `${config.WORKER_URL}/onboarding/submit`,
            {
                method: 'POST',
                body: JSON.stringify(formData)
            }
        );
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }

    // =============================================================================
    // EVENT LISTENERS
    // =============================================================================

    function setupEvents() {
        console.log('🎧 [Onboarding] Setting up event listeners...');
        
        // Form submission
        const form = document.getElementById('onboarding-form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
            console.log('🎧 [Onboarding] Form submit listener added');
        }
        
        // Field validation
        Object.keys(rules).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => validateField(fieldId));
                field.addEventListener('input', () => clearError(fieldId));
            }
        });
        
        // Progress tracking
        setupProgress();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeys);
        
        // Auth state changes (for signout only)
        if (auth?.supabase) {
            auth.supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                    window.location.href = '/auth';
                }
            });
        }
        
        console.log('✅ [Onboarding] Event listeners setup complete');
    }

    function setupProgress() {
        const observer = new MutationObserver(() => {
            updateProgress();
        });
        
        const steps = document.querySelectorAll('.step');
        steps.forEach(stepEl => {
            observer.observe(stepEl, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });
        });
    }

    // =============================================================================
    // UI HELPERS
    // =============================================================================

    function showMessage(message, type = 'info') {
        if (window.OsliraApp?.showMessage) {
            window.OsliraApp.showMessage(message, type);
            return;
        }
        
        console.log(`${type.toUpperCase()}: ${message}`);
        if (type === 'error') {
            alert(`Error: ${message}`);
        }
    }

    function showError(message) {
        showMessage(message, 'error');
    }

    function setLoading(isLoading) {
        loading = isLoading;
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (submitButton) {
            submitButton.disabled = isLoading;
            submitButton.textContent = isLoading ? 
                'Submitting...' : 'Complete Setup';
        }
        
        document.body.classList.toggle('loading', isLoading);
    }

    // =============================================================================
    // KEYBOARD HANDLING
    // =============================================================================

    function handleKeys(event) {
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            nextStep();
        }
        
        if (event.key === 'Escape') {
            prevStep();
        }
    }

    // =============================================================================
    // EXPOSE GLOBAL FUNCTIONS FOR HTML ONCLICK HANDLERS  
    // =============================================================================

    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.validateField = validateField;
    window.onboardingNextStep = nextStep; // Backup name
    window.onboardingPrevStep = prevStep; // Backup name

    // =============================================================================
    // ERROR HANDLING
    // =============================================================================

    window.addEventListener('error', (event) => {
        console.error('❌ [Onboarding] JavaScript error:', event.error);
        
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(event.error);
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ [Onboarding] Unhandled promise rejection:', event.reason);
        
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(event.reason);
        }
    });

    console.log('📝 [Onboarding] Module loaded successfully');

})(); // End IIFE
