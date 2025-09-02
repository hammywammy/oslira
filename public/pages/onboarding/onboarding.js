// =============================================================================
// ONBOARDING.JS - Complete Enhanced Onboarding Controller
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
    const totalSteps = 9; // Updated to 9 steps
    
    // Form validation rules - Updated with all new fields
    const validationRules = {
        'primary-objective': { required: true },
        'business-name': { required: true, minLength: 2 },
        'business-niche': { required: true },
        'target-audience': { required: true, minLength: 20 },
        'value-proposition': { required: true, minLength: 20 },
        'communication-tone': { required: true },
        'preferred-cta': { required: true },
        'phone-number': { required: false }, // Optional
        'key-results': { required: false } // Optional (moved to end)
    };
    
    // New step-field mapping for 9 steps with reordering
    const stepFields = {
        1: ['primary-objective'],    // Primary Objective
        2: ['business-name'],        // Business Name
        3: ['business-niche'],       // Business Niche  
        4: ['target-audience'],      // Target Audience
        5: ['value-proposition'],    // Value Proposition
        6: ['communication-tone'],   // Communication Style
        7: ['preferred-cta'],        // CTA Preference
        8: ['phone-number'],         // Phone Number (optional)
        9: ['key-results']           // Key Results (optional, moved to end)
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
        
        // Pre-fill user data
        prefillUserData();
        
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
        // Handle radio button validation
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
        
        if (fieldId === 'preferred-cta') {
            const radioButton = document.querySelector('input[name="preferred-cta"]:checked');
            const errorEl = document.getElementById(fieldId + '-error');
            const isValid = !!radioButton;
            
            if (errorEl) {
                errorEl.textContent = isValid ? '' : 'Please select a call-to-action';
            }
            
            return isValid;
        }
        
        // Handle phone number validation (optional)
        if (fieldId === 'phone-number') {
            const field = document.getElementById(fieldId);
            const errorEl = document.getElementById(fieldId + '-error');
            const value = field ? field.value.trim() : '';
            
            // Phone is optional, so empty is valid
            if (!value) {
                if (errorEl) errorEl.textContent = '';
                return true;
            }
            
            // If provided, validate format
            const cleanPhone = value.replace(/\D/g, '');
            const isValid = cleanPhone.length >= 10;
            
            if (errorEl) {
                errorEl.textContent = isValid ? '' : 'Please enter a valid phone number';
            }
            
            if (field) {
                field.style.borderColor = isValid ? '#d1d5db' : '#e53e3e';
                field.classList.toggle('error', !isValid);
            }
            
            return isValid;
        }
        
        // Handle regular field validation
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(fieldId + '-error');
        const rules = validationRules[fieldId];
        
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
            
            // Set smart defaults when reaching certain steps
            if (currentStep === 6) { // Communication Tone step
                setTimeout(setSmartDefaults, 100);
            }
            if (currentStep === 7) { // CTA step  
                setTimeout(setSmartDefaults, 100);
            }
            
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
                const firstInput = stepEl.querySelector('.form-input, .form-textarea, .form-select, input[type="radio"]');
                if (firstInput) {
                    firstInput.focus();
                }
            }
        }, 100);
    }
    
    // =============================================================================
    // SKIP FUNCTIONALITY
    // =============================================================================
    
    function skipPhoneStep() {
        console.log('⏭️ [Onboarding] Skipping phone step');
        
        // Clear any phone errors
        clearPhoneErrors();
        
        // Move to next step
        nextStep();
    }
    
    function skipStep() {
        console.log('⏭️ [Onboarding] Skipping optional step:', currentStep);
        
        // Clear any validation errors for this step
        const fields = stepFields[currentStep] || [];
        fields.forEach(fieldId => {
            const errorEl = document.getElementById(fieldId + '-error');
            if (errorEl) {
                errorEl.textContent = '';
            }
            const field = document.getElementById(fieldId) || document.querySelector(`input[name="${fieldId}"]`);
            if (field) {
                field.style.borderColor = '';
                field.classList.remove('error');
            }
        });
        
        // If this is the last step, submit with skipped fields
        if (currentStep === totalSteps) {
            console.log('⏭️ [Onboarding] Skipping final step and submitting...');
            submitOnboarding();
        } else {
            // Move to next step without validation
            nextStep();
        }
    }
    
    function clearPhoneErrors() {
        const errorEl = document.getElementById('phone-number-error');
        if (errorEl) errorEl.textContent = '';
        
        const field = document.getElementById('phone-number');
        if (field) field.classList.remove('error');
    }
    
    // =============================================================================
    // DATA COLLECTION
    // =============================================================================
    
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
    
    function getPhoneData() {
        const countryCode = document.getElementById('country-code').value;
        const phoneNumber = document.getElementById('phone-number').value.trim();
        const optInSms = document.getElementById('opt-in-sms').checked;
        
        if (!phoneNumber) return null;
        
        // Basic phone validation
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 10) return null;
        
        return {
            phone: countryCode + cleanPhone,
            opt_in_sms: optInSms
        };
    }
    
    // =============================================================================
    // SMART DEFAULTS & PRE-FILLING
    // =============================================================================
    
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
    
    function setSmartDefaults() {
        console.log('🧠 [Onboarding] Setting smart defaults...');
        
        const businessNiche = getFieldValue('business-niche');
        
        if (!businessNiche) return;
        
        // Smart CTA defaults based on niche
        const ctaDefaults = {
            'business': 'book-call',      // Business Services → Book a Call
            'coaching': 'book-call',      // Coaching → Book a Call  
            'finance': 'book-call',       // Finance → Book a Call
            'real-estate': 'book-call',   // Real Estate → Book a Call
            'technology': 'visit-website', // Technology → Visit Website
            'ecommerce': 'visit-website', // E-commerce → Visit Website
            'education': 'send-email',    // Education → Send Email
            'marketing': 'send-email',    // Marketing → Send Email
            'fitness': 'send-dm',         // Fitness → Send DM
            'beauty': 'send-dm',          // Beauty → Send DM
            'fashion': 'send-dm',         // Fashion → Send DM
            'food': 'send-dm',            // Food → Send DM
            'travel': 'send-dm'           // Travel → Send DM
        };
        
        const defaultCta = ctaDefaults[businessNiche];
        
        if (defaultCta) {
            // Set the default radio button when user reaches CTA step
            const radioButton = document.getElementById(`cta-${defaultCta.split('-')[0]}`);
            if (radioButton && !document.querySelector('input[name="preferred-cta"]:checked')) {
                radioButton.checked = true;
                console.log(`🎯 [Onboarding] Auto-selected CTA: ${defaultCta} for niche: ${businessNiche}`);
            }
        }
        
        // Smart communication tone defaults
        const toneDefaults = {
            'business': 'professional',
            'finance': 'professional', 
            'real-estate': 'professional',
            'technology': 'direct',
            'coaching': 'friendly',
            'fitness': 'enthusiastic',
            'beauty': 'friendly',
            'fashion': 'enthusiastic',
            'food': 'friendly',
            'travel': 'enthusiastic',
            'education': 'professional',
            'marketing': 'direct'
        };
        
        const defaultTone = toneDefaults[businessNiche];
        
        if (defaultTone) {
            const toneButton = document.getElementById(`tone-${defaultTone}`);
            if (toneButton && !document.querySelector('input[name="communication-tone"]:checked')) {
                toneButton.checked = true;
                console.log(`🗣️ [Onboarding] Auto-selected tone: ${defaultTone} for niche: ${businessNiche}`);
            }
        }
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
            
            // Get phone data
            const phoneData = getPhoneData();
            
            // Collect form data for business_profiles table
            const businessProfileData = {
                user_id: user.id,
                primary_objective: getFieldValue('primary-objective'),
                business_name: getFieldValue('business-name'),
                business_niche: getFieldValue('business-niche'),
                target_audience: getFieldValue('target-audience'),
                target_problems: `Common challenges faced by ${getFieldValue('target-audience')} that ${getFieldValue('business-name')} addresses.`,
                value_proposition: getFieldValue('value-proposition'),
                communication_style: getFieldValue('communication-tone'),
                message_example: `Hi! I noticed you're interested in ${getFieldValue('business-niche')}. ${getFieldValue('value-proposition')} Would you like to learn more?`,
                success_outcome: getFieldValue('key-results') || null,
                call_to_action: getFieldValue('preferred-cta'),
                phone_number: phoneData?.phone || null,
                opt_in_sms: phoneData?.opt_in_sms || false,
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
                    phone: phoneData?.phone || null,
                    created_via: 'google',
                    phone_verified: false,
                    opt_in_sms: phoneData?.opt_in_sms || false,
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
    
    function showSubmissionError(message) {
        // Create error display if it doesn't exist
        let errorDiv = document.getElementById('submission-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'submission-error';
            errorDiv.style.cssText = `
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 12px;
                border-radius: 8px;
                margin: 16px 0;
                font-size: 14px;
            `;
            
            const currentStep = document.getElementById('step-' + totalSteps);
            if (currentStep) {
                currentStep.insertBefore(errorDiv, currentStep.querySelector('.button-group'));
            }
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    // =============================================================================
    // EVENT LISTENERS
    // =============================================================================
    
    function setupEventListeners() {
        // Add any additional event listeners if needed
        console.log('✅ [Onboarding] Event listeners setup complete');
    }
    
    // =============================================================================
    // GLOBAL FUNCTIONS (for HTML onclick handlers)
    // =============================================================================
    
    // Make functions globally available for HTML onclick handlers
    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.skipStep = skipStep;
    window.skipPhoneStep = skipPhoneStep;
    window.submitOnboarding = submitOnboarding;
    
    console.log('📝 [Onboarding] Enhanced onboarding controller loaded');
})();
