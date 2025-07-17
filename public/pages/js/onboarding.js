/* =============================================================================
   ONBOARDING.JS - FRESH MODERN SYSTEM
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
let currentUser = null;
let currentStep = 1;
let isLoading = false;
let isInitialized = false;

// Initialize application when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Oslira onboarding loaded');
    await initializeApp();
});

// =============================================================================
// INITIALIZATION (Modern System Pattern)
// =============================================================================

// =============================================================================
// INITIALIZATION (Modern System Pattern + Original Features)
// =============================================================================

async function initializeApp() {
    try {
        console.log('🚀 Starting onboarding initialization...');
        
        // Show auth check state initially
        showState('auth-check');
        
        // Initialize Supabase using modern pattern
        await initializeSupabase();
        
        // Check authentication
        await checkAuthentication();
        
        // Setup event listeners
        setupEventListeners();
        
        isInitialized = true;
        console.log('✅ Onboarding initialized');
        
    } catch (error) {
        console.error('❌ Onboarding initialization failed:', error);
        showError(`Initialization failed: ${error.message}`);
    }
}

function initializeSupabase() {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('🔍 Initializing Supabase...');
            
            // Wait for Supabase library to be available
            let attempts = 0;
            while (typeof window.supabase === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase library not available');
            }
            
            // Use API config if window.CONFIG not available
            let config = window.CONFIG;
            if (!config) {
                console.log('🔧 Loading config from API...');
                config = await loadConfigFromAPI();
            }
            
            if (!config.supabaseUrl || !config.supabaseAnonKey) {
                throw new Error('Invalid configuration received');
            }
            
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
            
            console.log('✅ Supabase initialized');
            resolve(supabase);
            
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            reject(new Error('Failed to load configuration. Please check your API endpoint.'));
        }
    });
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

async function checkAuthentication() {
    try {
        console.log('🔍 Checking authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            throw new Error(`Auth check failed: ${error.message}`);
        }
        
        if (!session || !session.user) {
            console.log('❌ No valid session found, redirecting to auth');
            showError('Please log in first.');
            setTimeout(() => {
                window.location.href = '/auth.html';
            }, 2000);
            return;
        }
        
        currentUser = session.user;
        console.log('✅ User authenticated:', currentUser.email);
        
        // Check if onboarding is already completed
        await checkOnboardingStatus();
        
    } catch (error) {
        console.error('❌ Authentication check failed:', error);
        showError(`Authentication failed: ${error.message}`);
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
            window.location.href = '/dashboard.html';
            return;
        }
        
        console.log('🔍 User needs to complete onboarding');
        showOnboardingForm();
        
    } catch (error) {
        console.error('💥 Onboarding status check error:', error);
        // If error, show onboarding anyway
        showOnboardingForm();
    }
}

function showOnboardingForm() {
    showState('onboarding-main');
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
    // Form submission
    const form = document.getElementById('onboarding-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Step validation on input
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyNavigation);
    
    // Auth state changes
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = '/auth.html';
            }
        });
    }
}

function handleKeyNavigation(event) {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (currentStep < 5) {
            nextStep();
        } else {
            const form = document.getElementById('onboarding-form');
            if (form) {
                form.requestSubmit();
            }
        }
    }
}

// =============================================================================
// STEP NAVIGATION
// =============================================================================

function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }
    
    if (currentStep < 5) {
        currentStep++;
        updateStepDisplay();
        updateProgressBar();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
        updateProgressBar();
    }
}

function updateStepDisplay() {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    // Focus on first input of current step
    const firstInput = currentStepElement?.querySelector('input, select, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function updateProgressBar() {
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

// =============================================================================
// VALIDATION
// =============================================================================

// =============================================================================
// VALIDATION (Enhanced with Original Features)
// =============================================================================

function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    if (!currentStepElement) return false;
    
    const requiredFields = currentStepElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#EF4444';
            isValid = false;
        } else {
            field.style.borderColor = '#10B981';
        }
    });
    
    if (!isValid) {
        showMessage('Please fill in all required fields', 'error');
    }
    
    return isValid;
}

function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    
    // Specific field validations (original logic)
    switch (field.id) {
        case 'business-name':
            if (value && value.length < 2) {
                isValid = false;
                errorMessage = 'Business name must be at least 2 characters';
            }
            break;
            
        case 'target-audience':
            if (value && value.length < 20) {
                isValid = false;
                errorMessage = 'Please provide more detail (minimum 20 characters)';
            }
            break;
            
        case 'target-problems':
            if (value && value.length < 15) {
                isValid = false;
                errorMessage = 'Please describe the problems in more detail';
            }
            break;
            
        case 'value-proposition':
            if (value && value.length < 25) {
                isValid = false;
                errorMessage = 'Please provide a more detailed value proposition';
            }
            break;
            
        case 'message-example':
            if (value && value.length < 50) {
                isValid = false;
                errorMessage = 'Message example should be at least 50 characters';
            }
            break;
    }
    
    // Update field styling (original behavior)
    if (isValid) {
        field.style.borderColor = '#10B981';
        clearFieldError(field);
    } else {
        field.style.borderColor = '#EF4444';
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = `
        color: var(--error);
        font-size: 12px;
        margin-top: 4px;
        font-weight: 500;
    `;
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    const target = field.target || field;
    const existingError = target.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    if (target.value.trim()) {
        target.style.borderColor = 'var(--border-light)';
    }
}

// =============================================================================
// FORM SUBMISSION
// =============================================================================

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    try {
        if (!validateCurrentStep()) return;
        if (!currentUser || !supabase) {
            throw new Error('Not properly authenticated');
        }
        
        setLoadingState(true);
        
        // Collect form data
        const formData = collectFormData();
        
        // Submit to database
        await submitToDatabase(formData);
        
        // Show success and redirect
        showSuccess();
        
    } catch (error) {
        console.error('❌ Form submission failed:', error);
        showMessage(`Setup failed: ${error.message}`, 'error');
        setLoadingState(false);
    }
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
        console.log('💾 Submitting to database...');
        
        // User table update (original structure)
        const userUpdate = {
            id: currentUser.id,
            email: currentUser.email,
            credits: 5,
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
        
        // Business profiles table insertion (original structure)
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
        
        console.log('✅ Onboarding data saved successfully');
        
    } catch (error) {
        console.error('❌ Database submission failed:', error);
        throw error;
    }
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

// =============================================================================
// UI STATE MANAGEMENT (Enhanced with Original Features)
// =============================================================================

function showState(stateId) {
    const states = ['auth-check', 'onboarding-main', 'error-state', 'loading-state'];
    states.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = id === stateId ? 'block' : 'none';
        }
    });
}

function hideAllStates() {
    showState(''); // Hide all states
}

function showError(message) {
    showState('error-state');
    
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function showLoading() {
    showState('loading-state');
}

function showSuccess() {
    // Hide form and show success state (original behavior)
    document.getElementById('onboarding-form').style.display = 'none';
    const successState = document.getElementById('success-state');
    
    if (successState) {
        successState.style.display = 'block';
        
        // Redirect after delay (original timing)
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 3000);
    }
}

function setLoadingState(loading) {
    isLoading = loading;
    const submitBtn = document.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = loading;
        submitBtn.classList.toggle('loading', loading);
    }
    
    // Also show/hide loading state for major operations
    if (loading) {
        showLoading();
    }
}

function showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary-blue)'};
        box-shadow: var(--shadow-large);
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
// GLOBAL FUNCTIONS & EVENT HANDLERS (Original Functionality)
// =============================================================================

window.nextStep = nextStep;
window.prevStep = prevStep;

// Handle enter key (original behavior)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (currentStep < 5) {
            nextStep();
        } else {
            const form = document.getElementById('onboarding-form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    }
});

// Auth state listener (original functionality)
window.addEventListener('load', () => {
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = '/auth.html';
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
        showError('Application failed to load properly. Please refresh the page.');
    }
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// =============================================================================
// ENHANCED FORM SUBMISSION (Original + Modern)
// =============================================================================

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    try {
        if (!validateCurrentStep()) return;
        if (!currentUser || !supabase) {
            throw new Error('Not properly authenticated');
        }
        
        setLoadingState(true);
        
        // Collect form data
        const formData = collectFormData();
        
        // Submit to database using original structure
        await submitToDatabase(formData);
        
        // Show success and redirect
        setLoadingState(false);
        showSuccess();
        
    } catch (error) {
        console.error('❌ Form submission failed:', error);
        showMessage(`Setup failed: ${error.message}`, 'error');
        setLoadingState(false);
    }
}
