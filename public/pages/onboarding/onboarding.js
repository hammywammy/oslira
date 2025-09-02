// =============================================================================
// ONBOARDING.JS - Simple Onboarding Controller
// =============================================================================

(function() {
    'use strict';
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    let initialized = false;
    let user = null;
    let supabase = null;
    let currentStep = 1;
const totalSteps = 8; // Expanded from 3 to 8 steps

const validationRules = {
    'primary-objective': { required: true },
    'business-name': { required: true, minLength: 2 },
    'business-niche': { required: true },
    'target-audience': { required: true, minLength: 20 },
    'value-proposition': { required: true, minLength: 20 },
    'key-results': { required: true, minLength: 10 },
    'communication-tone': { required: true },
    'preferred-cta': { required: true }
};

// New step-field mapping for 8 steps with reordering
const stepFields = {
    1: ['primary-objective'],    // NEW - Primary Objective
    2: ['business-name'],        // Business Name
    3: ['business-niche'],       // Business Niche  
    4: ['target-audience'],      // Target Audience
    5: ['value-proposition'],    // Value Proposition
    6: ['communication-tone'],   // Communication Style
    7: ['preferred-cta'],        // CTA Preference
    8: ['key-results']           // Key Results (moved to end)
};
    
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    
    // Wait for scripts to load, then initialize
    window.addEventListener('oslira:scripts:loaded', async () => {
        try {
            console.log('📝 [Onboarding] Scripts loaded, initializing...');
            await initialize();
        } catch (error) {
            console.error('❌ [Onboarding] Initialization failed:', error);
            showError('Failed to load account setup. Please try refreshing the page.');
        }
    });
    
    async function initialize() {
        if (initialized) return;
        
        // Check authentication
        if (!window.SimpleAuth) {
            throw new Error('SimpleAuth not available');
        }
        
        await window.SimpleAuth.initialize();
        const session = window.SimpleAuth.getCurrentSession();
        
        if (!session || !session.user) {
            console.log('❌ [Onboarding] No valid session, redirecting to auth');
            window.location.href = '/auth';
            return;
        }
        
        user = session.user;
        supabase = window.SimpleAuth.supabase;
        
        console.log('✅ [Onboarding] User authenticated:', user.email);
        
        // Show onboarding form
        showOnboardingForm();
        
        // Setup event listeners
        setupEventListeners();
        
        initialized = true;
        console.log('✅ [Onboarding] Initialization complete');
    }
    
    // =============================================================================
    // UI MANAGEMENT
    // =============================================================================
    
    function showOnboardingForm() {
        hideElement('loading-state');
        showElement('onboarding-form');
        document.body.style.visibility = 'visible';
        updateProgress();
        console.log('✅ [Onboarding] Onboarding form displayed');
    }
    
    function showError(message) {
        hideElement('loading-state');
        hideElement('onboarding-form');
        document.getElementById('error-message').textContent = message;
        showElement('error-state');
        document.body.style.visibility = 'visible';
    }
    
    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }
    
    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }
    
    function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    const progressFill = document.getElementById('progress-fill');
    const progressStep = document.getElementById('progress-step');
    const progressPercent = document.getElementById('progress-percent');
    
    // Update progress bar width
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    // Update step text
    if (progressStep) {
        progressStep.textContent = `Step ${currentStep} of ${totalSteps}`;
    }
    
    // Update percentage text  
    if (progressPercent) {
        progressPercent.textContent = `${Math.round(progress)}% complete`;
    }
    
    console.log(`📊 [Onboarding] Progress: ${currentStep}/${totalSteps} (${Math.round(progress)}%)`);
}
    
    // =============================================================================
    // FORM VALIDATION
    // =============================================================================
    
    function validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(fieldId + '-error');
        const rules = validationRules[fieldId];

    if (fieldId === 'primary-objective') {
        const radioButton = document.querySelector('input[name="primary-objective"]:checked');
        const errorEl = document.getElementById(fieldId + '-error');
        const isValid = !!radioButton;
        
        if (errorEl) {
            errorEl.textContent = isValid ? '' : 'Please select your main goal';
        }
        
        return isValid;
    }

    if (fieldId === 'communication-tone') {
        const radioButton = document.querySelector('input[name="communication-tone"]:checked');
        const errorEl = document.getElementById(fieldId + '-error');
        const isValid = !!radioButton;
        
        if (errorEl) {
            errorEl.textContent = isValid ? '' : 'Please select a communication style';
        }
        
        return isValid;
    }
    
    // Add CTA validation
    if (fieldId === 'preferred-cta') {
        const radioButton = document.querySelector('input[name="preferred-cta"]:checked');
        const errorEl = document.getElementById(fieldId + '-error');
        const isValid = !!radioButton;
        
        if (errorEl) {
            errorEl.textContent = isValid ? '' : 'Please select a call-to-action';
        }
        
        return isValid;
    }
        
        if (!field || !rules) return true;
        
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // Required check
        if (rules.required && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        // Min length check
        else if (rules.minLength && value.length < rules.minLength) {
            isValid = false;
            errorMessage = `Please enter at least ${rules.minLength} characters`;
        }
        
        // Update UI
        if (errorEl) {
            errorEl.textContent = errorMessage;
        }
        
        if (field) {
            field.style.borderColor = isValid ? '#d1d5db' : '#e53e3e';
            field.classList.toggle('error', !isValid);
        }
        
        return isValid;
    }
    
    function validateStep(stepNum) {
    // Add safety checks
    if (!stepFields || typeof stepFields !== 'object') {
        console.error('❌ stepFields not defined properly');
        return false;
    }
    
    const fields = stepFields[stepNum] || [];
    console.log(`🔍 Validating step ${stepNum}, fields:`, fields);
    
    let isValid = true;
    
    fields.forEach(fieldId => {
        if (!validateField(fieldId)) {
            isValid = false;
        }
    });
    
    return isValid;
}
    
    // =============================================================================
    // STEP NAVIGATION
    // =============================================================================
    
    function nextStep() {
        if (!validateStep(currentStep)) {
            console.log('❌ [Onboarding] Step validation failed');
            return;
        }
        
        if (currentStep < totalSteps) {
            // Hide current step
            hideElement('step-' + currentStep);
            
            // Show next step
            currentStep++;
            showElement('step-' + currentStep);
            
            updateProgress();
            
            // Focus first input in new step
            focusFirstInput(currentStep);
            
            console.log('✅ [Onboarding] Moved to step', currentStep);
        }
    }
    
    function prevStep() {
        if (currentStep > 1) {
            // Hide current step
            hideElement('step-' + currentStep);
            
            // Show previous step
            currentStep--;
            showElement('step-' + currentStep);
            
            updateProgress();
            
            // Focus first input in previous step
            focusFirstInput(currentStep);
            
            console.log('✅ [Onboarding] Moved to step', currentStep);
        }
    }
    
    function focusFirstInput(stepNum) {
        setTimeout(() => {
            const stepEl = document.getElementById('step-' + stepNum);
            if (stepEl) {
                const firstInput = stepEl.querySelector('.form-input, .form-textarea, .form-select');
                if (firstInput) {
                    firstInput.focus();
                }
            }
        }, 100);
    }
    
    // =============================================================================
    // FORM SUBMISSION
    // =============================================================================
    
    async function submitOnboarding() {
        if (!validateStep(totalSteps)) {
            console.log('❌ [Onboarding] Final step validation failed');
            return;
        }
        
        const submitBtn = document.querySelector('#step-' + totalSteps + ' .btn-primary');
        if (!submitBtn) return;
        
        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        try {
            console.log('💾 [Onboarding] Submitting onboarding data...');
            
            // Collect form data for business_profiles table
            const businessProfileData = {
                user_id: user.id,
                business_name: getFieldValue('business-name'),
                business_niche: getFieldValue('business-niche'),
                target_audience: getFieldValue('target-audience'),
                target_problems: `Common challenges faced by ${getFieldValue('target-audience')} that ${getFieldValue('business-name')} addresses.`,
                value_proposition: getFieldValue('value-proposition'),
                communication_style: getFieldValue('communication-tone'),
                message_example: `Hi! I noticed you're interested in ${getFieldValue('business-niche')}. ${getFieldValue('value-proposition')} Would you like to learn more?`,
                success_outcome: getFieldValue('key-results'),
                call_to_action: getFieldValue('preferred-cta'),
                primary_objective: getFieldValue('primary-objective'),
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            console.log('💾 [Onboarding] Ensuring user record exists...');

// First, ensure user record exists in custom users table
const { error: userInsertError } = await supabase
    .from('users')
    .upsert([{
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        created_via: 'google',
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }])
    .select();

if (userInsertError) {
    console.log('⚠️ [Onboarding] User record issue (might already exist):', userInsertError);
}

console.log('💾 [Onboarding] Creating business profile...', businessProfileData);

// Insert business profile
const { data: businessProfile, error: businessError } = await supabase
    .from('business_profiles')
    .insert([businessProfileData])
                .select()
                .single();
            
            if (businessError) {
                throw businessError;
            }
            
            console.log('✅ [Onboarding] Business profile created:', businessProfile.id);
            
            // Update user onboarding_completed status
console.log('💾 [Onboarding] Updating user onboarding status...');
const { data: updatedUser, error: userError } = await supabase
    .from('users')
    .update({ 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select();

if (userError) {
    console.error('❌ [Onboarding] Failed to update user status:', userError);
    throw userError;
}

console.log('✅ [Onboarding] User onboarding status updated:', updatedUser);
            
            console.log('✅ [Onboarding] Onboarding completed successfully');
            
            // Show success state
            submitBtn.textContent = 'Complete! Redirecting...';
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
            
        } catch (error) {
            console.error('❌ [Onboarding] Submission failed:', error);
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            // Show error
            showSubmissionError(error.message);
        }
    }
    
    function getFieldValue(fieldId) {
    // Handle radio buttons
    if (fieldId === 'primary-objective') {
        const radioButton = document.querySelector('input[name="primary-objective"]:checked');
        return radioButton ? radioButton.value : '';
    }
    
    if (fieldId === 'communication-tone') {
        const radioButton = document.querySelector('input[name="communication-tone"]:checked');
        return radioButton ? radioButton.value : '';
    }
    
    if (fieldId === 'preferred-cta') {
        const radioButton = document.querySelector('input[name="preferred-cta"]:checked');
        return radioButton ? radioButton.value : '';
    }
    
    // Handle regular fields
    const field = document.getElementById(fieldId);
    return field ? field.value.trim() : '';
}
    
    function showSubmissionError(message) {
        // Create or update error message
        let errorEl = document.getElementById('submission-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'submission-error';
            errorEl.style.cssText = `
                background: #fee;
                border: 1px solid #fcc;
                color: #c33;
                padding: 12px;
                border-radius: 8px;
                margin-top: 1rem;
                font-size: 14px;
            `;
            
            const stepEl = document.getElementById('step-' + totalSteps);
            if (stepEl) {
                stepEl.appendChild(errorEl);
            }
        }
        
        errorEl.textContent = `Failed to save: ${message}. Please try again.`;
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // =============================================================================
    // EVENT LISTENERS
    // =============================================================================
    
    function setupEventListeners() {
        // Real-time validation
        document.addEventListener('input', (e) => {
            if (e.target.matches('.form-input, .form-textarea, .form-select')) {
                validateField(e.target.id);
            }
        });
        
        // Form submission prevention
        document.addEventListener('submit', (e) => {
            e.preventDefault();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const activeEl = document.activeElement;
                if (activeEl && activeEl.matches('.form-input, .form-select')) {
                    e.preventDefault();
                    
                    if (currentStep < totalSteps) {
                        nextStep();
                    } else {
                        submitOnboarding();
                    }
                }
            }
        });
        
        console.log('✅ [Onboarding] Event listeners setup complete');
    }
    
    // =============================================================================
    // GLOBAL EXPORTS (for HTML onclick handlers)
    // =============================================================================
    
    // Export functions to global scope for HTML onclick handlers
    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.submitOnboarding = submitOnboarding;
    
    // Export validation functions for external use
    window.onboardingModule = {
        validateField,
        validateStep,
        nextStep,
        prevStep,
        submitOnboarding,
        isInitialized: () => initialized
    };
    
    console.log('📝 [Onboarding] Module loaded successfully');
    
})();
