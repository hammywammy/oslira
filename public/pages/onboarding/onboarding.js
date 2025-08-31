/* =============================================================================
   ONBOARDING.JS - FIXED VERSION - INTEGRATED WITH MODERN SYSTEM
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

let onboardingAuthManager = null; // Different name to avoid any conflicts
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
        
        // Check authentication - FIXED LOGIC
        await checkAuthentication();
        
        // Setup event listeners
        setupEventListeners();
        
        isInitialized = true;
        console.log('✅ [Onboarding] Initialization complete');
        
    } catch (error) {
        console.error('❌ [Onboarding] Initialization failed:', error);
        showError(`Initialization failed: ${error.message}`);
        
        // Enhanced error reporting
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error, {
                tags: { section: 'onboarding-init' }
            });
        }
    }
}

async function waitForAuthSystem() {
    console.log('⏳ [Onboarding] Waiting for auth system...');
    
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds
    
    while (attempts < maxAttempts) {
        if (window.OsliraAuth?.initialize) {
            console.log('🔐 [Onboarding] Auth system found, initializing...');
            onboardingAuthManager = await window.OsliraAuth.initialize();
return onboardingAuthManager;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Auth system not available after timeout');
}

async function checkAuthentication() {
    try {
        console.log('🔍 [Onboarding] Checking authentication...');
        
        if (!authManagerInstance) {
            throw new Error('Auth manager not available');
        }
        
        // FIXED: Use proper auth detection with retry logic
        let retryCount = 0;
        const maxRetries = 10; // 5 seconds max wait
        
        while (retryCount < maxRetries) {
            // Check if authenticated using the reliable method
            if (authManagerInstance.isAuthenticated()) {
                console.log('✅ [Onboarding] User is authenticated');
                break;
            }
            
            console.log(`⏳ [Onboarding] Auth context loading... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            retryCount++;
        }
        
        // Final auth check
        if (!authManagerInstance.isAuthenticated()) {
            console.log('❌ [Onboarding] No valid session found after retries');
            showError('Please log in first.');
            setTimeout(() => {
                window.location.href = '/auth';
            }, 2000);
            return;
        }
        
        // Get user after confirming authentication
        currentUser = authManagerInstance.getCurrentUser();
        
        // FIXED: Handle case where user data is still loading
        if (!currentUser) {
            console.log('⏳ [Onboarding] User data still loading, waiting...');
            setTimeout(() => checkAuthentication(), 1000);
            return;
        }
        
        // Check if already completed onboarding
        if (currentUser.onboarding_completed) {
            console.log('✅ [Onboarding] User already onboarded, redirecting...');
            showMessage('You have already completed onboarding.', 'info');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
            return;
        }
        
        console.log('✅ [Onboarding] Authentication verified for:', currentUser.email);
        
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
    
    // Auth state changes - FIXED: Use proper instance
    if (authManagerInstance?.supabase) {
        authManagerInstance.supabase.auth.onAuthStateChange((event, session) => {
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
        
        // Focus first field in new step
        const firstField = document.querySelector(`#step-${currentStep} input, #step-${currentStep} select, #step-${currentStep} textarea`);
        if (firstField) {
            firstField.focus();
        }
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
    }
}

function updateProgress() {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    
    if (progressBar && progressText) {
        const progress = ((currentStep - 1) / 4) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Step ${currentStep} of 5`;
    }
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateCurrentStep() {
    const stepElement = document.getElementById(`step-${currentStep}`);
    const fields = stepElement.querySelectorAll('input[required], select[required], textarea[required]');
    
    let isValid = true;
    
    fields.forEach(field => {
        if (!validateField(field.id)) {
            isValid = false;
        }
    });
    
    return isValid;
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

function validateField(fieldId) {
    const field = document.getElementById(fieldId);
    const rules = validationRules[fieldId];
    
    if (!field || !rules) return true;
    
    let isValid = true;
    let errorMessage = '';
    const value = field.value.trim();
    
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
        
        // FIXED: Use proper auth check
        if (!currentUser || !authManagerInstance?.isAuthenticated()) {
            throw new Error('Authentication required');
        }
        
        setLoading(true);
        
        // Collect form data
        const formData = collectFormData();
        console.log('📋 [Onboarding] Submitting form data:', formData);
        
        // Submit to API
        const response = await submitOnboardingData(formData);
        
        if (response.success) {
            console.log('✅ [Onboarding] Submission successful');
            showMessage('Onboarding completed successfully!', 'success');
            
            // Redirect to dashboard after success
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
                extra: { userId: currentUser?.id }
            });
        }
    } finally {
        setLoading(false);
    }
}

function collectFormData() {
    const formData = {};
    
    Object.keys(validationRules).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            formData[fieldId] = field.value.trim();
        }
    });
    
    return {
        ...formData,
        userId: currentUser.id,
        userEmail: currentUser.email
    };
}

async function submitOnboardingData(formData) {
    const config = window.OsliraConfig?.get();
    if (!config) {
        throw new Error('Configuration not available');
    }
    
    const response = await authManagerInstance.makeAuthenticatedRequest(
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
    // Hide all states
    document.querySelectorAll('.state').forEach(state => {
        state.style.display = 'none';
    });
    
    // Show target state
    const targetState = document.getElementById(stateName);
    if (targetState) {
        targetState.style.display = 'block';
    }
}

function showMessage(message, type = 'info') {
    // Use alert system if available
    if (window.OsliraApp?.showMessage) {
        window.OsliraApp.showMessage(message, type);
        return;
    }
    
    // Fallback to console and basic alert
    console.log(`${type.toUpperCase()}: ${message}`);
    if (type === 'error') {
        alert(`Error: ${message}`);
    }
}

function showError(message) {
    showMessage(message, 'error');
}

function setLoading(loading) {
    isLoading = loading;
    const submitButton = document.querySelector('button[type="submit"]');
    
    if (submitButton) {
        submitButton.disabled = loading;
        submitButton.textContent = loading ? 'Submitting...' : 'Complete Onboarding';
    }
    
    // Update loading state in UI
    document.body.classList.toggle('loading', loading);
}

// =============================================================================
// KEYBOARD & ACCESSIBILITY
// =============================================================================

function handleKeyPress(event) {
    // Enter key advances to next step (if not in textarea)
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        nextStep();
    }
    
    // Escape key goes back
    if (event.key === 'Escape') {
        prevStep();
    }
}

// =============================================================================
// ERROR HANDLING & DEBUG
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
