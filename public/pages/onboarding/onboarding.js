/* =============================================================================
   ONBOARDING.JS - INTEGRATED WITH MODERN SYSTEM
   Uses modern auth patterns and script-loader integration
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

// =============================================================================
// APPLICATION STATE
// =============================================================================

let authManager = null;
let currentUser = null;
let currentStep = 1;
let isLoading = false;
let isInitialized = false;

// Form validation state
const validationRules = {
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
    await initializeApp();
});

// Listen for script-loader completion
window.addEventListener('oslira:scripts:loaded', async (event) => {
    console.log('📚 [Onboarding] Scripts loaded, finalizing initialization...');
    if (!isInitialized) {
        await initializeApp();
    }
});

async function initializeApp() {
    try {
        console.log('🚀 [Onboarding] Starting initialization...');
        
        // Show auth check state
        showState('auth-check');
        
        // Wait for auth system
        await waitForAuthSystem();
        
        // Check authentication
        await checkAuthentication();
        
        // Setup event listeners
        setupEventListeners();
        
        isInitialized = true;
        console.log('✅ [Onboarding] Initialization complete');
        
    } catch (error) {
        console.error('❌ [Onboarding] Initialization failed:', error);
        showError(`Initialization failed: ${error.message}`);
    }
}

async function waitForAuthSystem() {
    console.log('⏳ [Onboarding] Waiting for auth system...');
    
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds
    
    while (attempts < maxAttempts) {
        if (window.OsliraAuth?.initialize) {
            console.log('🔐 [Onboarding] Auth system found, initializing...');
            authManager = await window.OsliraAuth.initialize();
            return authManager;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Auth system not available after timeout');
}

async function checkAuthentication() {
    try {
        console.log('🔍 [Onboarding] Checking authentication...');
        
        if (!authManager) {
            throw new Error('Auth manager not available');
        }
        
        // Get current session and user
        const session = authManager.getCurrentSession();
        const user = authManager.getCurrentUser();
        
        if (!session || !user) {
            console.log('❌ [Onboarding] No valid session found');
            showError('Please log in first.');
            setTimeout(() => {
                window.location.href = '/auth';
            }, 2000);
            return;
        }
        
        // Check if already completed onboarding
        if (user.onboarding_completed) {
            console.log('✅ [Onboarding] User already onboarded, redirecting...');
            showError('You have already completed onboarding.');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
            return;
        }
        
        currentUser = user;
        console.log('✅ [Onboarding] Authentication verified for:', user.email);
        
        // Show main onboarding flow
        showState('onboarding-main');
        
    } catch (error) {
        console.error('❌ [Onboarding] Auth check failed:', error);
        showError('Authentication check failed. Please try again.');
        setTimeout(() => {
            window.location.href = '/auth';
        }, 3000);
    }
}

// =============================================================================
// EVENT LISTENERS SETUP
// =============================================================================

function setupEventListeners() {
    console.log('🎧 [Onboarding] Setting up event listeners...');
    
    // Form submission
    const form = document.getElementById('onboarding-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Real-time validation
    Object.keys(validationRules).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', () => validateField(fieldId));
            field.addEventListener('input', () => clearFieldError(fieldId));
        }
    });
    
    // Progress tracking
    setupProgressTracking();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyPress);
    
    // Auth state changes
    if (authManager?.supabase) {
        authManager.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = '/auth';
            }
        });
    }
}

function setupProgressTracking() {
    // Update progress when steps change
    const observer = new MutationObserver(() => {
        updateProgress();
    });
    
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        observer.observe(step, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    });
}

// =============================================================================
// STEP NAVIGATION
// =============================================================================

function nextStep() {
    if (!validateCurrentStep()) return;
    
    if (currentStep < 5) {
        // Hide current step
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        
        // Show next step
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        
        // Update progress
        updateProgress();
        
        // Focus first input in new step
        focusFirstInput();
        
        console.log(`📈 [Onboarding] Advanced to step ${currentStep}`);
    }
}

function prevStep() {
    if (currentStep > 1) {
        // Hide current step
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        
        // Show previous step
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        
        // Update progress
        updateProgress();
        
        // Focus first input in previous step
        focusFirstInput();
        
        console.log(`📉 [Onboarding] Returned to step ${currentStep}`);
    }
}

function updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
        const percentage = (currentStep / 5) * 100;
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `Step ${currentStep} of 5`;
    }
}

function focusFirstInput() {
    setTimeout(() => {
        const activeStep = document.querySelector('.step.active');
        if (activeStep) {
            const firstInput = activeStep.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }, 100);
}

// =============================================================================
// FORM VALIDATION
// =============================================================================

function validateCurrentStep() {
    const stepElement = document.getElementById(`step-${currentStep}`);
    if (!stepElement) return false;
    
    const fields = stepElement.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    fields.forEach(field => {
        if (!validateField(field.id)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(fieldId) {
    const field = document.getElementById(fieldId);
    const rules = validationRules[fieldId];
    
    if (!field || !rules) return true;
    
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Required validation
    if (rules.required && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    
    // Length validation
    if (value && rules.minLength && value.length < rules.minLength) {
        isValid = false;
        errorMessage = `Minimum ${rules.minLength} characters required`;
    }
    
    if (value && rules.maxLength && value.length > rules.maxLength) {
        isValid = false;
        errorMessage = `Maximum ${rules.maxLength} characters allowed`;
    }
    
    // Update field appearance
    if (!isValid) {
        showFieldError(fieldId, errorMessage);
    } else {
        clearFieldError(fieldId);
    }
    
    return isValid;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    
    // Add error class
    field.classList.add('error');
    formGroup.classList.add('error');
    
    // Remove existing error message
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);
}

function clearFieldError(fieldId) {
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

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    try {
        // Final validation
        if (!validateAllFields()) {
            showMessage('Please fix the errors before submitting', 'error');
            return;
        }
        
        if (!currentUser || !authManager) {
            throw new Error('Authentication required');
        }
        
        setLoadingState(true);
        
        // Collect form data
        const formData = collectFormData();
        console.log('📋 [Onboarding] Form data collected:', formData);
        
        // Submit to database
        await submitToDatabase(formData);
        
        // Show success and redirect
        showSuccess();
        
    } catch (error) {
        console.error('❌ [Onboarding] Form submission failed:', error);
        showMessage(`Setup failed: ${error.message}`, 'error');
        setLoadingState(false);
    }
}

function validateAllFields() {
    let isValid = true;
    
    Object.keys(validationRules).forEach(fieldId => {
        if (!validateField(fieldId)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function collectFormData() {
    return {
        business_name: document.getElementById('business-name').value.trim(),
        business_niche: document.getElementById('business-niche').value,
        target_audience: document.getElementById('target-audience').value.trim(),
        target_problems: document.getElementById('target-problems').value.trim(),
        value_proposition: document.getElementById('value-proposition').value.trim(),
        success_outcome: document.getElementById('success-outcome').value,
        communication_style: document.getElementById('communication-style').value,
        call_to_action: document.getElementById('call-to-action').value,
        message_example: document.getElementById('message-example').value.trim()
    };
}

async function submitToDatabase(formData) {
    try {
        console.log('💾 [Onboarding] Submitting to database...');
        
        const supabase = authManager.getSupabaseClient();
        if (!supabase) {
            throw new Error('Database connection not available');
        }
        
        // Update user record - mark onboarding as complete
        const userUpdate = {
            id: currentUser.id,
            email: currentUser.email,
            credits: 5, // Give initial credits
            subscription_plan: 'free',
            subscription_status: 'active',
            onboarding_completed: true,
            updated_at: new Date().toISOString()
        };
        
        const { error: userError } = await supabase
            .from('users')
            .upsert(userUpdate, { onConflict: 'id' });
        
        if (userError) {
            throw new Error(`User update failed: ${userError.message}`);
        }
        
        // Create business profile
        const profileData = {
            user_id: currentUser.id,
            business_name: formData.business_name,
            business_niche: formData.business_niche,
            target_audience: formData.target_audience,
            target_problems: formData.target_problems,
            value_proposition: formData.value_proposition,
            communication_style: formData.communication_style,
            message_example: formData.message_example,
            success_outcome: formData.success_outcome,
            call_to_action: formData.call_to_action,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { error: profileError } = await supabase
            .from('business_profiles')
            .insert(profileData);
        
        if (profileError) {
            throw new Error(`Profile creation failed: ${profileError.message}`);
        }
        
        console.log('✅ [Onboarding] Data saved successfully');
        
    } catch (error) {
        console.error('❌ [Onboarding] Database submission failed:', error);
        throw error;
    }
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

function setLoadingState(loading) {
    isLoading = loading;
    const submitBtn = document.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = loading;
        if (loading) {
            submitBtn.classList.add('loading');
        } else {
            submitBtn.classList.remove('loading');
        }
    }
}

function showState(stateId) {
    const states = ['auth-check', 'onboarding-main', 'error-state', 'loading-state'];
    states.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = id === stateId ? 'block' : 'none';
        }
    });
}

function showSuccess() {
    // Hide form
    const form = document.getElementById('onboarding-form');
    if (form) form.style.display = 'none';
    
    // Show success state
    const successState = document.getElementById('success-state');
    if (successState) {
        successState.style.display = 'block';
        
        // Redirect after delay
        setTimeout(() => {
            console.log('🎉 [Onboarding] Redirecting to dashboard...');
            window.location.href = '/dashboard';
        }, 3000);
    }
}

function showError(message) {
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    
    if (errorState) {
        showState('error-state');
    }
}

function showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = 'toast-message';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary-blue)'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: var(--shadow-large);
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    message.textContent = text;
    document.body.appendChild(message);

    setTimeout(() => {
        message.style.opacity = '1';
        message.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        message.style.opacity = '0';
        message.style.transform = 'translateX(100%)';
        setTimeout(() => message.remove(), 300);
    }, 5000);
}

// =============================================================================
// KEYBOARD HANDLING
// =============================================================================

function handleKeyPress(event) {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (currentStep < 5) {
            nextStep();
        } else {
            const form = document.getElementById('onboarding-form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    }
    
    // Escape key to go back
    if (event.key === 'Escape' && currentStep > 1) {
        prevStep();
    }
}

// =============================================================================
// GLOBAL FUNCTION EXPORTS
// =============================================================================

// Export functions for HTML onclick handlers
window.nextStep = nextStep;
window.prevStep = prevStep;

// =============================================================================
// ERROR HANDLING
// =============================================================================

window.addEventListener('error', function(event) {
    console.error('❌ [Onboarding] JavaScript error:', event.error);
    if (!isInitialized) {
        showError('Application failed to load properly. Please refresh the page.');
    }
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ [Onboarding] Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

console.log('📝 [Onboarding] Module loaded successfully');
