(function() {
    'use strict';

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    let initialized = false;
    let user = null;
    let supabase = null;
    let currentStep = 1;
    let rules = null;
    let validator = null;
    let totalSteps = null;
    
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    
    // Wait for scripts to load, then initialize
    window.addEventListener('oslira:scripts:loaded', async () => {
        try {
            console.log('📝 [Onboarding] Scripts loaded, initializing...');
            
            // Initialize modular components after dependencies are loaded
            rules = new window.OnboardingRules();
            validator = new window.OnboardingValidator();
            totalSteps = rules.getTotalSteps();
            
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
        
        // Initialize validator
        validator.initialize();
        
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
    hideElement('error-state');  
    showElement('onboarding-form');
    document.body.style.visibility = 'visible';
    
    // Initialize step management
    currentStep = 1;
    showStep(1);
    updateNavigationButtons();
    
    // Pre-fill user data
    prefillUserData();
    
    console.log('[Onboarding] Onboarding form displayed, starting at step 1');
}
    
    function showError(message) {
        hideElement('loading-state');
        hideElement('onboarding-form');
        document.getElementById('error-message').textContent = message;
        showElement('error-state');
        document.body.style.visibility = 'visible';
    }
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
        element.classList.add('hidden');
    }
}

function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
        element.classList.remove('hidden');
    }
}

function updateNavigationButtons() {
    const prevButton = document.getElementById('back-btn');
    const nextButton = document.getElementById('next-btn');
    const submitButton = document.getElementById('finish-btn');
    
    // Show/hide previous button
    if (prevButton) {
        prevButton.style.display = currentStep > 1 ? 'inline-flex' : 'none';
    }
    
    // Update next/submit button
    if (currentStep === totalSteps) {
        if (nextButton) nextButton.style.display = 'none';
        if (submitButton) submitButton.style.display = 'inline-flex';
    } else {
        if (nextButton) nextButton.style.display = 'inline-flex';
        if (submitButton) submitButton.style.display = 'none';
    }
    
    console.log(`[Onboarding] Navigation buttons updated for step ${currentStep}`);
}
    
    function updateProgress() {
        const progress = (currentStep / totalSteps) * 100;
        const progressFill = document.getElementById('progress-fill');
        const progressStep = document.getElementById('progress-step');
        const progressPercent = document.getElementById('progress-percent');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressStep) {
            progressStep.textContent = currentStep;
        }
        
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(progress)}%`;
        }
        
        console.log(`📊 [Onboarding] Progress updated: Step ${currentStep}/${totalSteps} (${Math.round(progress)}%)`);
    }
    
    // =============================================================================
    // STEP NAVIGATION
    // =============================================================================
    
function showStep(stepNumber) {
    console.log(`[Onboarding] Showing step ${stepNumber}`);
    
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
        const step = document.getElementById(`step-${i}`);
        if (step) {
            step.classList.remove('active');
            step.style.display = 'none';
        }
    }
    
    // Show target step
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        targetStep.style.display = 'block';
        console.log(`[Onboarding] Step ${stepNumber} is now visible`);
    } else {
        console.error(`[Onboarding] Step ${stepNumber} element not found!`);
    }
    
    // Update progress
    updateProgress();
    
    // Focus on first input
    setTimeout(() => {
        const firstInput = document.querySelector(`#step-${stepNumber} input, #step-${stepNumber} select, #step-${stepNumber} textarea`);
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}
    
function prevStep() {
    if (currentStep > 1) {
        validator.clearAllErrors();
        
        // Hide current step
        const currentStepElement = document.getElementById(`step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.remove('active');
            currentStepElement.style.display = 'none';
        }
        
        // Move to previous step
        currentStep--;
        
        // Show previous step
        const prevStepElement = document.getElementById(`step-${currentStep}`);
        if (prevStepElement) {
            prevStepElement.classList.add('active');
            prevStepElement.style.display = 'block';
            
            // Focus first input in previous step
            const firstInput = prevStepElement.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
        
        updateProgress();
        updateNavigationButtons();
        
        console.log(`[Onboarding] Moved back to step ${currentStep}`);
    }
}
    
function nextStep() {
    console.log(`[Onboarding] nextStep called, currentStep: ${currentStep}, totalSteps: ${totalSteps}`);
    
    if (currentStep < totalSteps) {
        // Validate current step before proceeding
        if (!validator.validateStep(currentStep, getFieldValue)) {
            console.log(`[Onboarding] Step ${currentStep} validation failed`);
            
            // Show validation error message
            const errorDiv = document.getElementById('validation-error');
            if (errorDiv) {
                errorDiv.classList.remove('hidden');
                errorDiv.style.display = 'block';
                
                // Hide error after 3 seconds
                setTimeout(() => {
                    errorDiv.classList.add('hidden');
                    errorDiv.style.display = 'none';
                }, 3000);
            }
            
            return;
        }
        
        validator.clearAllErrors();
        
        // Hide current step
        const currentStepElement = document.getElementById(`step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.remove('active');
            currentStepElement.style.display = 'none';
        }
        
        // Move to next step
        currentStep++;
        
        // Show next step
        const nextStepElement = document.getElementById(`step-${currentStep}`);
        if (nextStepElement) {
            nextStepElement.classList.add('active');
            nextStepElement.style.display = 'block';
            
            // Focus first input in new step
            const firstInput = nextStepElement.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        } else {
            console.error(`Step ${currentStep} element not found!`);
        }
        
        updateProgress();
        updateNavigationButtons();
        
        console.log(`[Onboarding] Moved to step ${currentStep}`);
    } else {
        // At final step, submit instead
        submitOnboarding();
    }
}
    
    function updateNavigationButtons() {
        const prevButton = document.querySelector('[onclick="prevStep()"]');
        const nextButton = document.querySelector('[onclick="nextStep()"]');
        const submitButton = document.querySelector('[onclick="submitOnboarding()"]');
        
        // Show/hide previous button
        if (prevButton) {
            prevButton.style.display = currentStep > 1 ? 'inline-flex' : 'none';
        }
        
        // Update next/submit button
        if (currentStep === totalSteps) {
            if (nextButton) nextButton.style.display = 'none';
            if (submitButton) submitButton.style.display = 'inline-flex';
        } else {
            if (nextButton) nextButton.style.display = 'inline-flex';
            if (submitButton) submitButton.style.display = 'none';
        }
    }
    
    // =============================================================================
    // DATA COLLECTION & UTILITIES
    // =============================================================================
    
function getFieldValue(fieldId) {
    console.log(`[Onboarding] Getting field value for: ${fieldId}`);
    
    // Handle radio buttons
    if (fieldId === 'primary-objective') {
        const radioButton = document.querySelector('input[name="primary-objective"]:checked');
        const value = radioButton ? radioButton.value : '';
        console.log(`[Onboarding] primary-objective value: ${value}`);
        return value;
    }
    
    if (fieldId === 'company-size') {
        const radioButton = document.querySelector('input[name="company-size"]:checked');
        return radioButton ? radioButton.value : '';
    }
    
    if (fieldId === 'budget') {
        const radioButton = document.querySelector('input[name="budget"]:checked');
        return radioButton ? radioButton.value : '';
    }
    
    if (fieldId === 'communication-tone') {
        const radioButton = document.querySelector('input[name="communication-tone"]:checked');
        return radioButton ? radioButton.value : '';
    }
    
    if (fieldId === 'team-size') {
        const radioButton = document.querySelector('input[name="team-size"]:checked');
        return radioButton ? radioButton.value : '';
    }
    
    if (fieldId === 'campaign-manager') {
        const radioButton = document.querySelector('input[name="campaign-manager"]:checked');
        return radioButton ? radioButton.value : '';
    }
    
    // Handle checkbox groups (return arrays)
    if (fieldId === 'target-size') {
        const checkboxes = document.querySelectorAll('input[name="target-size"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    
    if (fieldId === 'challenges') {
        const checkboxes = document.querySelectorAll('input[name="challenges"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    
    if (fieldId === 'communication') {
        const checkboxes = document.querySelectorAll('input[name="communication"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    
    if (fieldId === 'integrations') {
        const checkboxes = document.querySelectorAll('input[name="integrations"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    
    // Handle regular input fields
    const field = document.getElementById(fieldId);
    const value = field ? field.value.trim() : '';
    console.log(`[Onboarding] ${fieldId} value: ${value}`);
    return value;
}
    
    function setSmartDefaults() {
        console.log('🧠 [Onboarding] Setting smart defaults...');
        
        const businessNiche = getFieldValue('business-niche');
        
        if (!businessNiche) return;
        
        const defaultCta = rules.getSmartDefault('preferred-cta', businessNiche);
        
        if (defaultCta) {
            // Set the default radio button when user reaches step 7
            setTimeout(() => {
                const radioButton = document.querySelector(`input[name="preferred-cta"][value="${defaultCta}"]`);
                if (radioButton && !document.querySelector('input[name="preferred-cta"]:checked')) {
                    radioButton.checked = true;
                }
            }, 100);
        }
        
        console.log(`🧠 [Onboarding] Smart defaults set for niche: ${businessNiche} → CTA: ${defaultCta}`);
    }
    
    function prefillUserData() {
        console.log('🔧 [Onboarding] Pre-filling user data from Google OAuth...');
        
        if (!user || !user.user_metadata) {
            console.log('⚠️ [Onboarding] No user metadata available for pre-filling');
            return;
        }
        
        // Pre-fill business name with user's name as fallback
        const businessNameField = document.getElementById('business-name');
        if (businessNameField && !businessNameField.value) {
            const fullName = user.user_metadata.full_name || user.user_metadata.name || '';
            if (fullName) {
                // Don't auto-fill, just show as placeholder suggestion
                businessNameField.placeholder = `e.g. "${fullName} Consulting" or "${fullName.split(' ')[0]} Agency"`;
            }
        }
        
        console.log('✅ [Onboarding] User data pre-filling complete');
    }
    
    // =============================================================================
    // EVENT LISTENERS
    // =============================================================================
    
    function setupEventListeners() {
        console.log('🔗 [Onboarding] Setting up event listeners...');
        
        // Step navigation
        window.nextStep = nextStep;
        window.prevStep = prevStep;
        window.submitOnboarding = submitOnboarding;
        window.skipPhoneStep = () => {
            console.log('⏭️ [Onboarding] Skipping phone step');
            nextStep();
        };
        window.skipStep = () => {
            console.log('⏭️ [Onboarding] Skipping current step');
            if (currentStep < totalSteps) {
                nextStep();
            } else {
                submitOnboarding();
            }
        };
        
        console.log('✅ [Onboarding] Event listeners setup complete');
    }
    
    // =============================================================================
    // ONBOARDING SUBMISSION
    // =============================================================================
    
    function showSubmissionProgress() {
        const submitButton = document.querySelector('[onclick="submitOnboarding()"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Creating Profile...';
            submitButton.classList.add('loading');
        }
    }

    function hideSubmissionProgress() {
        const submitButton = document.querySelector('[onclick="submitOnboarding()"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Complete Onboarding';
            submitButton.classList.remove('loading');
        }
    }
    
    async function submitOnboarding() {
        console.log('📤 [Onboarding] Starting submission process');
        
        try {
            showSubmissionProgress();
            
            // Collect form data
            const formData = {
                business_name: getFieldValue('business-name'),
                business_niche: getFieldValue('business-niche'),
                target_audience: getFieldValue('target-audience'),
                target_problems: getFieldValue('target-problems'),
                value_proposition: getFieldValue('value-proposition'),
                communication_style: getFieldValue('communication-tone'),
                message_example: getFieldValue('message-example'),
                success_outcome: getFieldValue('key-results'),
                call_to_action: getFieldValue('preferred-cta'),
                primary_objective: getFieldValue('primary-objective'),
                phone_number: rules.sanitizePhoneNumber(getFieldValue('phone-number')),
                opt_in_sms: document.getElementById('opt-in-sms')?.checked || false
            };
            
            // Validate all fields
            const validation = validator.validateAllFields(formData);
            if (!validation.isValid) {
                hideSubmissionProgress();
                validator.showSubmissionError('Please complete all required fields: ' + validation.errors.join(', '));
                return;
            }
            
            console.log('🧠 [Onboarding] Generating business context via AI...');
            
            // Call Cloudflare Worker to generate context using AI
            const contextResponse = await window.OsliraApiClient.request('/v1/generate-business-context', {
                method: 'POST',
                data: {
                    business_data: formData,
                    user_id: window.OsliraAuth.getSession()?.user?.id,
                    request_type: 'onboarding_context_generation'
                }
            });
            
            if (!contextResponse.success) {
                throw new Error(contextResponse.error || 'Failed to generate business context');
            }
            
            console.log('✅ [Onboarding] Business context generated successfully');
            
            // Combine form data with AI-generated context
            const profileData = {
                ...formData,
                business_one_liner: contextResponse.data.business_one_liner,
                business_context_pack: contextResponse.data.business_context_pack,
                context_version: contextResponse.data.context_version || 'v1.0',
                context_updated_at: new Date().toISOString()
            };
            
            console.log('📝 [Onboarding] Submitting complete profile:', {
                business_name: profileData.business_name,
                one_liner_length: profileData.business_one_liner?.length,
                context_pack_size: JSON.stringify(profileData.business_context_pack).length,
                ai_generated: true
            });
            
            // Submit to API
            const response = await window.OsliraApiClient.request('/business-profiles', {
                method: 'POST',
                data: profileData
            });
            
            if (response.success) {
                console.log('✅ [Onboarding] Profile created successfully with AI context');
                
                // Log field usage stats before completion
                validator.logFieldUsage();
                
                // Update user onboarding status
                await window.OsliraAuth.updateUserOnboardingStatus(true);
                
                // Redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                throw new Error(response.error || 'Failed to create profile');
            }
            
        } catch (error) {
            console.error('❌ [Onboarding] Submission failed:', error);
            validator.showSubmissionError(error.message);
            hideSubmissionProgress();
        }
    }
    
// =============================================================================
// INITIALIZATION
// =============================================================================

// Don't initialize step immediately - wait for proper initialization
console.log('📝 [Onboarding] Main controller loaded successfully');

})();
