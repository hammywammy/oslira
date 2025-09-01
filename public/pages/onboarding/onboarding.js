/**
 * ONBOARDING PAGE CONTROLLER - FIXED VERSION
 * SecurityGuard-compliant implementation with proper app coordination
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
    // INITIALIZATION - PROPER APP COORDINATION
    // =============================================================================

// Wait for complete app initialization
window.addEventListener('oslira:app:ready', async (event) => {
    console.log('🚀 [Onboarding] App ready event received:', event.detail);
    
    if (!initialized) {
        if (event.detail.success === false) {
            console.warn('🚨 [Onboarding] App initialization failed, using degraded mode');
            await initDegradedMode();
        } else {
            await init();
        }
    }
});

// Enhanced fallback with multiple retry attempts
document.addEventListener('DOMContentLoaded', () => {
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryInit = async () => {
        attempts++;
        console.log(`🔄 [Onboarding] Fallback attempt ${attempts}/${maxAttempts}...`);
        
        if (!initialized) {
            if (window.OsliraApp?.instance) {
                await init();
            } else if (attempts >= maxAttempts) {
                console.warn('🚨 [Onboarding] Max fallback attempts reached, using degraded mode');
                await initDegradedMode();
            } else {
                setTimeout(tryInit, 2000 * attempts); // Exponential backoff
            }
        }
    };
    
    setTimeout(tryInit, 1000); // Initial delay
});

    async function init() {
        try {
            console.log('🚀 [Onboarding] Starting initialization...');
            
            // Use the app's auth manager (guaranteed to exist at this point)
            await loadSessionFromApp();
            
            // Show onboarding form
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

    async function loadSessionFromApp() {
        console.log('📊 [Onboarding] Loading session from app auth manager...');
        
        try {
            // App is guaranteed to be initialized at this point
            const app = window.OsliraApp.instance;
            if (!app || !app.auth) {
                throw new Error('App or auth manager not available');
            }
            
            const authManager = app.auth;
            const session = authManager.getCurrentSession();
            const supabaseClient = authManager.getSupabaseClient();
            
            if (!session) {
                throw new Error('No authenticated session found');
            }
            
            // Use the app's auth manager directly
            auth = { 
                session, 
                supabase: supabaseClient,
                getCurrentSession: () => authManager.getCurrentSession(),
                getCurrentUser: () => authManager.getCurrentUser(),
                makeAuthenticatedRequest: async (url, options = {}) => {
                    const currentSession = authManager.getCurrentSession();
                    return fetch(url, {
                        ...options,
                        headers: {
                            'Authorization': `Bearer ${currentSession.access_token}`,
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
                onboarding_completed: false
            };
            
            console.log('✅ [Onboarding] Session loaded from app for:', user.email);
            
        } catch (error) {
            console.error('❌ [Onboarding] Failed to load session from app:', error);
            throw error;
        }
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
            updateProgress();
        }
    }

    // =============================================================================
    // STEP MANAGEMENT
    // =============================================================================

    function initializeSteps() {
        console.log('🎯 [Onboarding] Initializing step system...');
        
        // Hide all steps except first
        const steps = document.querySelectorAll('.onboarding-step');
        steps.forEach((stepEl, index) => {
            stepEl.style.display = index === 0 ? 'block' : 'none';
        });
        
        // Initialize navigation buttons
        setupStepNavigation();
        
        console.log('🎯 [Onboarding] Step system initialized');
    }

    function setupStepNavigation() {
        // Next buttons
        const nextButtons = document.querySelectorAll('[data-next-step]');
        nextButtons.forEach(btn => {
            btn.addEventListener('click', handleNextStep);
        });
        
        // Previous buttons
        const prevButtons = document.querySelectorAll('[data-prev-step]');
        prevButtons.forEach(btn => {
            btn.addEventListener('click', handlePrevStep);
        });
        
        // Skip buttons (if any)
        const skipButtons = document.querySelectorAll('[data-skip-step]');
        skipButtons.forEach(btn => {
            btn.addEventListener('click', handleSkipStep);
        });
    }

    function handleNextStep(event) {
        event.preventDefault();
        
        if (loading) return;
        
        // Validate current step
        if (!validateCurrentStep()) {
            return;
        }
        
        goToStep(step + 1);
    }

    function handlePrevStep(event) {
        event.preventDefault();
        if (loading) return;
        
        goToStep(step - 1);
    }

    function handleSkipStep(event) {
        event.preventDefault();
        if (loading) return;
        
        goToStep(step + 1);
    }

    function goToStep(newStep) {
        const totalSteps = document.querySelectorAll('.onboarding-step').length;
        
        if (newStep < 1 || newStep > totalSteps) {
            return;
        }
        
        console.log(`🎯 [Onboarding] Moving from step ${step} to step ${newStep}`);
        
        // Hide current step
        const currentStepEl = document.querySelector(`[data-step="${step}"]`);
        if (currentStepEl) {
            currentStepEl.style.display = 'none';
        }
        
        // Show new step
        const newStepEl = document.querySelector(`[data-step="${newStep}"]`);
        if (newStepEl) {
            newStepEl.style.display = 'block';
            
            // Focus first input in new step
            const firstInput = newStepEl.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
        
        step = newStep;
        updateProgress();
    }

    function updateProgress() {
        const totalSteps = document.querySelectorAll('.onboarding-step').length;
        const progressPercent = ((step - 1) / (totalSteps - 1)) * 100;
        
        // Update progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }
        
        // Update step indicator
        const stepIndicator = document.querySelector('.step-indicator');
        if (stepIndicator) {
            stepIndicator.textContent = `Step ${step} of ${totalSteps}`;
        }
        
        // Update step numbers in navigation
        const stepNumbers = document.querySelectorAll('.step-number');
        stepNumbers.forEach((el, index) => {
            el.classList.toggle('active', index + 1 === step);
            el.classList.toggle('completed', index + 1 < step);
        });
    }

    function validateCurrentStep() {
        const currentStepEl = document.querySelector(`[data-step="${step}"]`);
        if (!currentStepEl) return true;
        
        const fieldsInStep = currentStepEl.querySelectorAll('input, textarea, select');
        let isValid = true;
        
        fieldsInStep.forEach(field => {
            const fieldName = field.name || field.id;
            if (fieldName && rules[fieldName]) {
                if (!validateField(fieldName)) {
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }

    // =============================================================================
    // FORM VALIDATION
    // =============================================================================

    function validateField(fieldName) {
        const field = document.getElementById(fieldName);
        const rule = rules[fieldName];
        
        if (!field || !rule) return true;
        
        const value = field.value.trim();
        
        // Required validation
        if (rule.required && !value) {
            showFieldError(field, `${getFieldLabel(field)} is required`);
            return false;
        }
        
        // Min length validation
        if (rule.minLength && value.length > 0 && value.length < rule.minLength) {
            showFieldError(field, `${getFieldLabel(field)} must be at least ${rule.minLength} characters`);
            return false;
        }
        
        // Clear any existing errors
        clearFieldError(field);
        return true;
    }

    function getFieldLabel(field) {
        const label = document.querySelector(`label[for="${field.id}"]`);
        return label ? label.textContent.replace('*', '').trim() : field.name || 'Field';
    }

    function showFieldError(field, message) {
        clearFieldError(field);
        
        field.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }

    function clearFieldError(field) {
        field.classList.remove('error');
        
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    function clearError(fieldName) {
        const field = document.getElementById(fieldName);
        if (field) {
            clearFieldError(field);
        }
    }

    // =============================================================================
    // FORM SUBMISSION
    // =============================================================================

    async function handleSubmit(event) {
        event.preventDefault();
        
        if (loading) {
            console.log('🚀 [Onboarding] Already submitting, ignoring duplicate request');
            return;
        }
        
        console.log('🚀 [Onboarding] Form submission started');
        
        try {
            loading = true;
            updateSubmitButton(true);
            
            // Validate all fields
            let isValid = true;
            Object.keys(rules).forEach(fieldName => {
                if (!validateField(fieldName)) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                console.log('❌ [Onboarding] Validation failed');
                showError('Please fix the errors above');
                return;
            }
            
            // Collect form data
            const formData = collectFormData();
            console.log('📊 [Onboarding] Form data collected:', Object.keys(formData));
            
            // Submit to server
            const result = await submitOnboarding(formData);
            
            console.log('✅ [Onboarding] Submission successful');
            showSuccess('Profile created successfully!');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
            
        } catch (error) {
            console.error('❌ [Onboarding] Submission failed:', error);
            showError(error.message || 'Failed to save profile. Please try again.');
        } finally {
            loading = false;
            updateSubmitButton(false);
        }
    }

    function collectFormData() {
        const formData = {
            user_id: user.id,
            business_name: getValue('business-name'),
            business_niche: getValue('business-niche'),
            target_audience: getValue('target-audience'),
            target_problems: getValue('target-problems'),
            value_proposition: getValue('value-proposition'),
            key_results: getValue('key-results'),
            success_outcome: getValue('success-outcome'),
            communication_tone: getValue('communication-tone'),
            communication_length: getValue('communication-length'),
            preferred_cta: getValue('preferred-cta'),
            message_example: getValue('message-example')
        };
        
        return formData;
    }

    function getValue(fieldName) {
        const field = document.getElementById(fieldName);
        return field ? field.value.trim() : '';
    }

    function updateSubmitButton(isLoading) {
        const submitBtn = document.getElementById('submit-btn');
        if (!submitBtn) return;
        
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Creating Profile...';
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Complete Onboarding';
        }
    }

    async function submitOnboarding(formData) {
        console.log('🌐 [Onboarding] Submitting to server...');
        
        const config = window.OsliraConfig?.get();
        if (!config?.WORKER_URL) {
            throw new Error('Configuration not available');
        }
        
        const response = await auth.makeAuthenticatedRequest(
            `${config.WORKER_URL}/onboarding`,
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
                    console.log('🚪 [Onboarding] User signed out, redirecting to auth');
                    window.location.href = '/auth';
                }
            });
        }
        
        console.log('🎧 [Onboarding] Event listeners setup complete');
    }

    function setupProgress() {
        // Auto-advance on certain field types
        const selectFields = document.querySelectorAll('select');
        selectFields.forEach(select => {
            select.addEventListener('change', () => {
                // Auto-advance after selection (optional)
                setTimeout(() => {
                    const nextBtn = select.closest('.onboarding-step').querySelector('[data-next-step]');
                    if (nextBtn && validateCurrentStep()) {
                        // Auto-advance logic can go here
                    }
                }, 500);
            });
        });
    }

    function handleKeys(event) {
        if (loading) return;
        
        // Enter key to advance (if not in textarea)
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
            const nextBtn = document.querySelector(`[data-step="${step}"] [data-next-step]`);
            if (nextBtn && !nextBtn.disabled) {
                event.preventDefault();
                nextBtn.click();
            }
        }
        
        // Escape key to go back
        if (event.key === 'Escape') {
            const prevBtn = document.querySelector(`[data-step="${step}"] [data-prev-step]`);
            if (prevBtn) {
                prevBtn.click();
            }
        }
    }

    // =============================================================================
    // UI FEEDBACK
    // =============================================================================

    function showError(message) {
        console.error('❌ [Onboarding] Error:', message);
        
        const errorDiv = document.getElementById('error-message') || createMessageDiv('error-message', 'error');
        errorDiv.innerHTML = `<span class="error-icon">⚠️</span> ${message}`;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    function showSuccess(message) {
        console.log('✅ [Onboarding] Success:', message);
        
        const successDiv = document.getElementById('success-message') || createMessageDiv('success-message', 'success');
        successDiv.innerHTML = `<span class="success-icon">✅</span> ${message}`;
        successDiv.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }

    function createMessageDiv(id, className) {
        const div = document.createElement('div');
        div.id = id;
        div.className = `message ${className}`;
        div.style.display = 'none';
        
        const form = document.getElementById('onboarding-form');
        if (form) {
            form.insertBefore(div, form.firstChild);
        }
        
        return div;
    }
    
    async function initDegradedMode() {
    try {
        console.log('🔧 [Onboarding] Starting degraded mode initialization...');
        
        // Try to get session directly from Supabase if app failed
        const config = JSON.parse(localStorage.getItem('oslira_config') || '{}');
        if (config.SUPABASE_URL) {
            const supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
            const { data: { session } } = await supabaseClient.auth.getSession();
            
            if (session?.user) {
                auth = { supabase: supabaseClient };
                user = session.user;
                
                console.log('✅ [Onboarding] Degraded mode session loaded for:', user.email);
                
                // Show onboarding form
                showOnboardingForm();
                setupEvents();
                
                initialized = true;
                console.log('✅ [Onboarding] Degraded mode initialization complete');
            } else {
                throw new Error('No valid session in degraded mode');
            }
        } else {
            throw new Error('No Supabase config available');
        }
        
    } catch (error) {
        console.error('❌ [Onboarding] Degraded mode failed:', error);
        showError('Unable to load account setup. Please try refreshing the page.');
        setTimeout(() => window.location.href = '/auth', 3000);
    }
}

    // =============================================================================
    // MODULE EXPORT
    // =============================================================================

    // Export functions for HTML onclick handlers (legacy compatibility)
    window.onboardingModule = {
        validateField,
        goToStep,
        handleSubmit,
        showError,
        showSuccess
    };

    console.log('📝 [Onboarding] Module loaded successfully');

})();
