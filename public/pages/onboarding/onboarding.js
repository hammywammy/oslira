// =============================================================================
// ONBOARDING.JS - Complete Enhanced Onboarding Controller with Character Limits
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
    
    // Character limits for each field (optimized for AI summary generation)
    const CHARACTER_LIMITS = {
        // Text inputs
        'business-name': {
            min: 2,
            max: 100,
            reason: 'Business names are typically 2-100 characters'
        },
        
        // Textareas  
        'target-audience': {
            min: 20,
            max: 500,
            reason: 'Detailed audience description for AI analysis'
        },
        
        'value-proposition': {
            min: 20,
            max: 300,
            reason: 'Concise but detailed value prop (2-3 sentences ideal)'
        },
        
        'key-results': {
            min: 0,  // Optional field
            max: 800,
            reason: 'Detailed success outcomes for AI summary generation'
        },
        
        // Phone number
        'phone-number': {
            min: 10,
            max: 20,
            reason: 'International phone numbers with formatting'
        }
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
    // CHARACTER LIMIT FUNCTIONS
    // =============================================================================
    
    function addCharacterLimitStyles() {
        const styles = `
            <style>
            /* Character Counter Styles */
            .character-counter {
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
                text-align: right;
                margin-top: 0.25rem;
                font-family: monospace;
            }
            
            .character-counter.warning {
                color: var(--color-orange-600, #ea580c);
                font-weight: 500;
            }
            
            .character-counter.limit-reached {
                color: var(--color-red-600, #dc2626);
                font-weight: 600;
            }
            
            .character-counter .current {
                font-weight: 600;
            }
            
            /* Field Warning States */
            .form-input.warning,
            .form-textarea.warning,
            .form-select.warning {
                border-color: var(--color-orange-500, #f97316);
                box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
            }
            
            /* Enhanced Error States */
            .form-input.error,
            .form-textarea.error,
            .form-select.error {
                border-color: var(--color-red-500, #ef4444);
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
            
            /* Character Counter Animations */
            .character-counter {
                transition: all 0.2s ease;
            }
            
            .character-counter.warning,
            .character-counter.limit-reached {
                animation: pulse 0.5s ease-in-out;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            /* Helper Text with Limits */
            .helper-text.with-limit {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .helper-text .limit-hint {
                font-size: 0.8rem;
                color: var(--text-secondary, #6b7280);
                font-style: italic;
            }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    function addCharacterLimits() {
        console.log('🔢 [Onboarding] Adding character limits to form fields...');
        
        Object.keys(CHARACTER_LIMITS).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const limits = CHARACTER_LIMITS[fieldId];
            
            if (!field) return;
            
            // Add maxlength attribute
            field.setAttribute('maxlength', limits.max);
            
            // Add character counter
            addCharacterCounter(fieldId, limits.max);
            
            // Add real-time validation
            field.addEventListener('input', () => {
                validateCharacterLimit(fieldId);
                updateCharacterCounter(fieldId);
            });
            
            // Add paste handling (prevent massive paste)
            field.addEventListener('paste', (e) => {
                setTimeout(() => validateCharacterLimit(fieldId), 10);
            });
        });
        
        console.log('✅ [Onboarding] Character limits added successfully');
    }
    
    function addCharacterCounter(fieldId, maxLength) {
        const field = document.getElementById(fieldId);
        const fieldContainer = field.closest('.form-group');
        
        if (!fieldContainer) return;
        
        // Create character counter element
        const counter = document.createElement('div');
        counter.id = `${fieldId}-counter`;
        counter.className = 'character-counter';
        counter.innerHTML = `<span class="current">0</span>/<span class="max">${maxLength}</span>`;
        
        // Insert after the field
        field.parentNode.insertBefore(counter, field.nextSibling);
    }
    
    function updateCharacterCounter(fieldId) {
        const field = document.getElementById(fieldId);
        const counter = document.getElementById(`${fieldId}-counter`);
        const limits = CHARACTER_LIMITS[fieldId];
        
        if (!field || !counter || !limits) return;
        
        const currentLength = field.value.length;
        const currentSpan = counter.querySelector('.current');
        
        if (currentSpan) {
            currentSpan.textContent = currentLength;
            
            // Color coding
            const percentage = currentLength / limits.max;
            if (percentage >= 0.9) {
                counter.classList.add('warning');
            } else {
                counter.classList.remove('warning');
            }
            
            if (currentLength >= limits.max) {
                counter.classList.add('limit-reached');
            } else {
                counter.classList.remove('limit-reached');
            }
        }
    }
    
    function validateCharacterLimit(fieldId) {
        const field = document.getElementById(fieldId);
        const limits = CHARACTER_LIMITS[fieldId];
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (!field || !limits) return true;
        
        const currentLength = field.value.length;
        
        // Clear previous styling
        field.classList.remove('error', 'warning');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
        
        // Check minimum length (for required fields)
        if (limits.min > 0 && currentLength > 0 && currentLength < limits.min) {
            field.classList.add('warning');
            if (errorElement) {
                errorElement.textContent = `Minimum ${limits.min} characters required`;
                errorElement.style.display = 'block';
            }
            return false;
        }
        
        // Check maximum length
        if (currentLength > limits.max) {
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = `Maximum ${limits.max} characters allowed`;
                errorElement.style.display = 'block';
            }
            
            // Trim to max length
            field.value = field.value.substring(0, limits.max);
            updateCharacterCounter(fieldId);
            return false;
        }
        
        return true;
    }
    
    function addPasteProtection() {
        Object.keys(CHARACTER_LIMITS).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const limits = CHARACTER_LIMITS[fieldId];
            
            if (!field) return;
            
            field.addEventListener('paste', (e) => {
                // Get pasted content
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                
                // If paste would exceed limit, truncate it
                const currentText = field.value;
                const maxAllowed = limits.max - currentText.length;
                
                if (pastedText.length > maxAllowed) {
                    e.preventDefault();
                    
                    // Insert truncated version
                    const truncatedText = pastedText.substring(0, maxAllowed);
                    const cursorPos = field.selectionStart;
                    
                    field.value = currentText.substring(0, cursorPos) + 
                                 truncatedText + 
                                 currentText.substring(field.selectionEnd);
                    
                    // Show warning
                    const errorElement = document.getElementById(`${fieldId}-error`);
                    if (errorElement) {
                        errorElement.textContent = `Pasted text was truncated to ${limits.max} characters`;
                        errorElement.style.display = 'block';
                        
                        // Clear warning after 3 seconds
                        setTimeout(() => {
                            errorElement.style.display = 'none';
                        }, 3000);
                    }
                    
                    // Update counter
                    setTimeout(() => updateCharacterCounter(fieldId), 10);
                }
            });
        });
    }
    
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    
    // Wait for scripts to load, then initialize
    window.addEventListener('oslira:scripts:loaded', async () => {
        try {
            console.log('📝 [Onboarding] Scripts loaded, initializing...');
            await initialize();
            
            // Add character limit functionality
            addCharacterLimitStyles();
            addCharacterLimits();
            addPasteProtection();
            
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
        // Hide all steps
        for (let i = 1; i <= totalSteps; i++) {
            hideElement(`step-${i}`);
        }
        
        // Show current step
        showElement(`step-${stepNumber}`);
        
        // Update progress
        currentStep = stepNumber;
        updateProgress();
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = document.querySelector(`#step-${stepNumber} input, #step-${stepNumber} select, #step-${stepNumber} textarea`);
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
        
        console.log(`👀 [Onboarding] Showing step ${stepNumber}`);
    }
    
    
    function prevStep() {
        if (currentStep > 1) {
            showStep(currentStep - 1);
        }
    }
    
function validateStep(stepNumber) {
    console.log(`🔍 [Onboarding] Validating step ${stepNumber}`);
    
    switch (stepNumber) {
        case 1: // Business Info
            const businessName = getFieldValue('business_name');
            return validateBusinessName(businessName);
            
        case 2: // Business Niche
            return getFieldValue('business_niche') !== '';
            
        case 3: // Target Audience
            return getFieldValue('target_audience').trim().length > 0;
            
        case 4: // Success Outcome - NOW MANDATORY
            const successOutcome = getFieldValue('success_outcome');
            return validateSuccessOutcome(successOutcome);
            
        case 5: // Communication Style - NOW PROPERLY ENFORCED
            return validateCommunicationStyle();
            
        default:
            return true;
    }
}

// =============================================================================
// ENHANCED VALIDATION FUNCTIONS
// =============================================================================

function validateBusinessName(businessName) {
    const trimmed = businessName.trim();
    
    // Check if empty
    if (trimmed.length === 0) {
        showValidationError('business_name', 'Business name is required');
        return false;
    }
    
    // Check minimum length
    if (trimmed.length < 2) {
        showValidationError('business_name', 'Business name must be at least 2 characters');
        return false;
    }
    
    // Check maximum length
    if (trimmed.length > 50) {
        showValidationError('business_name', 'Business name must be 50 characters or less');
        return false;
    }
    
    // Check for valid characters only (letters, numbers, spaces, hyphens, apostrophes)
    const validPattern = /^[a-zA-Z0-9\s\-'&\.]+$/;
    if (!validPattern.test(trimmed)) {
        showValidationError('business_name', 'Business name contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, and periods are allowed.');
        return false;
    }
    
    // Check that it's not just special characters
    const hasLetterOrNumber = /[a-zA-Z0-9]/.test(trimmed);
    if (!hasLetterOrNumber) {
        showValidationError('business_name', 'Business name must contain at least one letter or number');
        return false;
    }
    
    // Clear any previous errors
    clearValidationError('business_name');
    console.log(`✅ [Onboarding] Business name validation passed: "${trimmed}"`);
    return true;
}

function validateSuccessOutcome(successOutcome) {
    const trimmed = successOutcome.trim();
    
    // Check if empty
    if (trimmed.length === 0) {
        showValidationError('success_outcome', 'Please describe what results you deliver to your clients');
        return false;
    }
    
    // Check minimum word count (at least 3 words)
    const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 3) {
        showValidationError('success_outcome', 'Please provide a more detailed description (at least 3 words)');
        return false;
    }
    
    // Check minimum character count
    if (trimmed.length < 10) {
        showValidationError('success_outcome', 'Please provide a more detailed description (at least 10 characters)');
        return false;
    }
    
    // Clear any previous errors
    clearValidationError('success_outcome');
    console.log(`✅ [Onboarding] Success outcome validation passed: ${wordCount} words`);
    return true;
}

function validateCommunicationStyle() {
    const selectedStyle = getSelectedChoice('communication_style');
    
    // Check if any option is selected
    if (!selectedStyle || selectedStyle === null || selectedStyle === '') {
        showValidationError('communication_style', 'Please select how you prefer to communicate');
        highlightCommunicationChoices();
        return false;
    }
    
    // Verify the selected option is valid
    const validStyles = ['professional', 'casual', 'friendly', 'direct', 'consultative'];
    if (!validStyles.includes(selectedStyle)) {
        showValidationError('communication_style', 'Please select a valid communication style');
        return false;
    }
    
    // Clear any previous errors
    clearValidationError('communication_style');
    console.log(`✅ [Onboarding] Communication style validation passed: "${selectedStyle}"`);
    return true;
}

// =============================================================================
// ERROR DISPLAY FUNCTIONS
// =============================================================================

function showValidationError(fieldName, message) {
    // Remove any existing error for this field
    clearValidationError(fieldName);
    
    // Find the field
    const field = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
    if (!field) return;
    
    // Add error styling to field
    field.classList.add('field-error');
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'validation-error';
    errorElement.id = `${fieldName}_error`;
    errorElement.textContent = message;
    
    // Insert error message after the field
    field.parentNode.insertBefore(errorElement, field.nextSibling);
    
    // Add error styling to field container if it exists
    const fieldContainer = field.closest('.onboarding-form-group');
    if (fieldContainer) {
        fieldContainer.classList.add('has-error');
    }
    
    console.log(`❌ [Onboarding] Validation error for ${fieldName}: ${message}`);
}

function clearValidationError(fieldName) {
    // Find and remove error message
    const errorElement = document.getElementById(`${fieldName}_error`);
    if (errorElement) {
        errorElement.remove();
    }
    
    // Remove error styling from field
    const field = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
    if (field) {
        field.classList.remove('field-error');
        
        // Remove error styling from container
        const fieldContainer = field.closest('.onboarding-form-group');
        if (fieldContainer) {
            fieldContainer.classList.remove('has-error');
        }
    }
}

function highlightCommunicationChoices() {
    // Add visual emphasis to communication style choices
    const choiceCards = document.querySelectorAll('[data-choice-group="communication_style"]');
    choiceCards.forEach(card => {
        card.classList.add('choice-required-highlight');
        // Remove highlight after 3 seconds
        setTimeout(() => {
            card.classList.remove('choice-required-highlight');
        }, 3000);
    });
}

// =============================================================================
// ENHANCED NEXT STEP FUNCTION
// =============================================================================

// Also enhance the nextStep function to provide better user feedback
function nextStep() {
    const isValid = validateStep(currentStep);
    
    if (!isValid) {
        console.log(`❌ [Onboarding] Step ${currentStep} validation failed`);
        
        // Show user feedback
        showStepValidationFailed();
        return;
    }
    
    // Handle smart defaults
    if (currentStep === 3) { // After business niche selection
        setSmartDefaults();
    }
    
    if (currentStep < totalSteps) {
        showStep(currentStep + 1);
        console.log(`✅ [Onboarding] Moved to step ${currentStep}`);
    } else {
        completeOnboarding();
    }
}

function showStepValidationFailed() {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'validation-notification';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>Please complete all required fields before continuing</span>
    `;
    
    // Add to current step
    const currentStepElement = document.querySelector('.onboarding-step.active');
    if (currentStepElement) {
        currentStepElement.insertBefore(notification, currentStepElement.firstChild);
        
        // Remove notification after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
}
    
    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (field) {
            field.classList.add('error');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    function validatePhoneNumber(phone) {
        // Remove all non-digits
        const cleaned = phone.replace(/\D/g, '');
        
        // Check if it's a reasonable phone number length
        return cleaned.length >= 10 && cleaned.length <= 15;
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
        
        // Phone number input formatting and SMS opt-in visibility
        const phoneInput = document.getElementById('phone-number');
        const smsOptInGroup = document.getElementById('sms-opt-in-group');
        
        if (phoneInput && smsOptInGroup) {
            phoneInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                
                // Show/hide SMS opt-in based on phone input
                if (value.length > 0) {
                    smsOptInGroup.style.display = 'block';
                } else {
                    smsOptInGroup.style.display = 'none';
                }
                
                // Format phone number (simple US formatting)
                const cleaned = value.replace(/\D/g, '');
                if (cleaned.length <= 10) {
                    if (cleaned.length >= 6) {
                        e.target.value = cleaned.replace(/(\d{3})(\d{3})(\d{0,4})/, '($1) $2-$3');
                    } else if (cleaned.length >= 3) {
                        e.target.value = cleaned.replace(/(\d{3})(\d{0,3})/, '($1) $2');
                    }
                }
            });
        }
        
        // Real-time validation for all character-limited fields
        Object.keys(CHARACTER_LIMITS).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Update character counter on input
                field.addEventListener('input', () => {
                    updateCharacterCounter(fieldId);
                });
                
                // Initialize counter
                updateCharacterCounter(fieldId);
            }
        });
        
        console.log('✅ [Onboarding] Event listeners setup complete');
    }
    
    // =============================================================================
    // DATA COLLECTION & UTILITIES
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
    
    // =============================================================================
    // ONBOARDING SUBMISSION
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
            
console.log('💾 [Onboarding] Verifying user record exists (should already exist from auth)...');

// Verify user record exists - DO NOT CREATE, only check
const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id, email, onboarding_completed')
    .eq('id', user.id)
    .single();

if (checkError || !existingUser) {
    console.error('❌ [Onboarding] User record missing - this should not happen:', checkError);
    throw new Error('User record not found. Please complete signup first.');
}

if (existingUser.onboarding_completed) {
    console.log('⚠️ [Onboarding] User already completed onboarding, redirecting...');
    window.location.href = '/dashboard';
    return;
}

console.log('✅ [Onboarding] User record verified, proceeding with onboarding...');  

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
            let errorMessage = 'Failed to save your information. Please try again.';
            if (error.message) {
                errorMessage = error.message;
            }
            
            // Show error at bottom of form
            const errorContainer = document.getElementById('submission-error') || createSubmissionError();
            errorContainer.textContent = errorMessage;
            errorContainer.style.display = 'block';
            
            // Scroll to error
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    function createSubmissionError() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'submission-error';
        errorDiv.className = 'form-error';
        errorDiv.style.display = 'none';
        errorDiv.style.marginTop = '1rem';
        
        const currentStep = document.getElementById(`step-${totalSteps}`);
        if (currentStep) {
            currentStep.appendChild(errorDiv);
        }
        
        return errorDiv;
    }
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    function getFieldUsageStats() {
        const stats = {};
        
        Object.keys(CHARACTER_LIMITS).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const limits = CHARACTER_LIMITS[fieldId];
            
            if (field && limits) {
                const currentLength = field.value.length;
                const percentage = (currentLength / limits.max * 100).toFixed(1);
                
                stats[fieldId] = {
                    current: currentLength,
                    max: limits.max,
                    percentage: parseFloat(percentage),
                    utilization: percentage >= 80 ? 'high' : percentage >= 50 ? 'medium' : 'low'
                };
            }
        });
        
        return stats;
    }
    
    // Log usage stats (helpful for optimization)
    function logFieldUsage() {
        const stats = getFieldUsageStats();
        console.log('📊 [Onboarding] Field usage statistics:', stats);
        
        // Track high-utilization fields
        const highUtilizationFields = Object.entries(stats)
            .filter(([_, data]) => data.utilization === 'high')
            .map(([fieldId, _]) => fieldId);
        
        if (highUtilizationFields.length > 0) {
            console.log('⚠️ [Onboarding] High character utilization fields:', highUtilizationFields);
        }
    }
    
    // Initialize the form
    showStep(1);
    
    console.log('📝 [Onboarding] Controller loaded successfully');
    console.log('🔢 Character limits configured:', CHARACTER_LIMITS);
    console.log('📋 Step fields mapping:', stepFields);

})();
