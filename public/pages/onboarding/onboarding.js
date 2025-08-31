/* =============================================================================
   ONBOARDING.JS - CLEAN VERSION - NO CONFLICTS
   ============================================================================= */

// IIFE to avoid global conflicts
(function() {
    'use strict';
    
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

    // =============================================================================
    // APPLICATION STATE - SCOPED TO AVOID CONFLICTS
    // =============================================================================

    let auth = null;
    let user = null;
    let step = 1;
    let loading = false;
    let initialized = false;

    // Form validation rules
    const rules = {
        'business-name': { required: true, minLength: 2, maxLength: 100 },
        'business-niche': { required: true },
        'target-audience': { required: true, minLength: 10, maxLength: 500 },
        'target-problems': { required: true, minLength: 10, maxLength: 400 },
        'value-proposition': { required: true, minLength: 10, maxLength: 500 },
        'success-outcome': { required: true },
        'communication-style': { required: true },
        'call-to-action': { required: true },
        'message-example': { required: true, minLength: 20, maxLength: 800 }
    };

    // =============================================================================
    // INITIALIZATION
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
            
            // Show auth check state
            showState('auth-check');
            
            // Wait for auth system
            await waitForAuth();
            
            // Check authentication
            await checkAuth();
            
            // Setup event listeners
            setupEvents();
            
            initialized = true;
            console.log('✅ [Onboarding] Initialization complete');
            
        } catch (error) {
            console.error('❌ [Onboarding] Initialization failed:', error);
            showError(`Initialization failed: ${error.message}`);
            
            if (typeof Sentry !== 'undefined') {
                Sentry.captureException(error, {
                    tags: { section: 'onboarding-init' }
                });
            }
        }
    }

    async function waitForAuth() {
        console.log('⏳ [Onboarding] Waiting for auth system...');
        
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            if (window.OsliraAuth?.initialize) {
                console.log('🔐 [Onboarding] Auth system found, initializing...');
                auth = await window.OsliraAuth.initialize();
                return auth;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Auth system not available after timeout');
    }

   async function checkAuth() {
    try {
        console.log('🔍 [Onboarding] Checking authentication...');
        
        if (!auth) {
            throw new Error('Auth manager not available');
        }
        
        // SIMPLIFIED: SecurityGuard already granted access, just verify session exists
        const session = auth.getCurrentSession();
        if (!session) {
            console.log('❌ [Onboarding] No session found, redirecting to auth');
            showError('Please log in first.');
            setTimeout(() => window.location.href = '/auth', 2000);
            return;
        }
        
        console.log('✅ [Onboarding] Session found, proceeding...');
        
        // Try to get user data, use session fallback if needed
        user = auth.getCurrentUser() || session.user || { 
            email: session.user?.email || 'Loading...', 
            id: session.user?.id,
            onboarding_completed: false 
        };
        
        // Quick onboarding completion check
        if (user.onboarding_completed) {
            console.log('✅ [Onboarding] User already onboarded, redirecting...');
            showMessage('You have already completed onboarding.', 'info');
            setTimeout(() => window.location.href = '/dashboard', 2000);
            return;
        }
        
        console.log('✅ [Onboarding] Access verified for:', user.email);
        showState('onboarding-main');
        
    } catch (error) {
        console.error('❌ [Onboarding] Auth check failed:', error);
        showError('Authentication check failed. Please try again.');
        setTimeout(() => window.location.href = '/auth', 3000);
    }
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
        
        // Auth state changes
        if (auth?.supabase) {
            auth.supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                    window.location.href = '/auth';
                }
            });
        }
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
    // NAVIGATION
    // =============================================================================

    function nextStep() {
        if (!validateCurrentStep()) return;
        
        if (step < 5) {
            document.getElementById(`step-${step}`).classList.remove('active');
            step++;
            document.getElementById(`step-${step}`).classList.add('active');
            updateProgress();
            
            const firstField = document.querySelector(`#step-${step} input, #step-${step} select, #step-${step} textarea`);
            if (firstField) {
                firstField.focus();
            }
        }
    }

    function prevStep() {
        if (step > 1) {
            document.getElementById(`step-${step}`).classList.remove('active');
            step--;
            document.getElementById(`step-${step}`).classList.add('active');
            updateProgress();
        }
    }

    function updateProgress() {
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        
        if (progressBar && progressText) {
            const progress = ((step - 1) / 4) * 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `Step ${step} of 5`;
        }
    }

    // =============================================================================
    // VALIDATION
    // =============================================================================

    function validateCurrentStep() {
        const stepElement = document.getElementById(`step-${step}`);
        const fields = stepElement.querySelectorAll('input[required], select[required], textarea[required]');
        
        let valid = true;
        
        fields.forEach(field => {
            if (!validateField(field.id)) {
                valid = false;
            }
        });
        
        return valid;
    }

    function validateAllFields() {
        let valid = true;
        
        Object.keys(rules).forEach(fieldId => {
            if (!validateField(fieldId)) {
                valid = false;
            }
        });
        
        return valid;
    }

    function validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const fieldRules = rules[fieldId];
        
        if (!field || !fieldRules) return true;
        
        let valid = true;
        let errorMessage = '';
        const value = field.value.trim();
        
        // Required validation
        if (fieldRules.required && !value) {
            valid = false;
            errorMessage = 'This field is required';
        }
        
        // Length validation
        if (value && fieldRules.minLength && value.length < fieldRules.minLength) {
            valid = false;
            errorMessage = `Minimum ${fieldRules.minLength} characters required`;
        }
        
        if (value && fieldRules.maxLength && value.length > fieldRules.maxLength) {
            valid = false;
            errorMessage = `Maximum ${fieldRules.maxLength} characters allowed`;
        }
        
        // Update field appearance
        if (!valid) {
            showFieldError(fieldId, errorMessage);
        } else {
            clearError(fieldId);
        }
        
        return valid;
    }

    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const formGroup = field.closest('.form-group');
        
        field.classList.add('error');
        formGroup.classList.add('error');
        
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
    }

    function clearError(fieldId) {
        const field = document.getElementById(fieldId);
        const formGroup = field.closest('.form-group');
        
        field.classList.remove('error');
        formGroup.classList.remove('error');
        
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    // =============================================================================
    // FORM SUBMISSION
    // =============================================================================

    async function handleSubmit(event) {
        event.preventDefault();
        
        if (loading) return;
        
        try {
            if (!validateAllFields()) {
                showMessage('Please fix the errors before submitting', 'error');
                return;
            }
            
            if (!user || !auth?.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            setLoading(true);
            
            const formData = collectData();
            console.log('📋 [Onboarding] Submitting form data:', formData);
            
            const response = await submitData(formData);
            
            if (response.success) {
                console.log('✅ [Onboarding] Submission successful');
                showMessage('Onboarding completed successfully!', 'success');
                
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
    // UI HELPERS
    // =============================================================================

    function showState(stateName) {
        document.querySelectorAll('.state').forEach(state => {
            state.style.display = 'none';
        });
        
        const targetState = document.getElementById(stateName);
        if (targetState) {
            targetState.style.display = 'block';
        }
    }

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
            submitButton.textContent = isLoading ? 'Submitting...' : 'Complete Onboarding';
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

    window.onboardingNextStep = nextStep;
    window.onboardingPrevStep = prevStep;
    window.onboardingValidateField = validateField;

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
