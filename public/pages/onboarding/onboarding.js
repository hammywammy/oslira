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
    
// =============================================================================
// VALIDATION CONFIGURATION
// =============================================================================

const stepFields = {
    1: ['business-name'],
    2: ['business-niche'],
    3: ['target-audience'],
    4: ['target-problems'],
    5: ['value-proposition'],
    6: ['success-outcome'],
    7: ['call-to-action'],
    8: ['communication-style'],
    9: ['message-example'],
    10: ['primary-objective', 'phone-number'] // Phone is optional
};

const validationRules = {
    'business-name': { required: true, minLength: 2 },
    'business-niche': { required: true, minLength: 3 },
    'target-audience': { required: true, minLength: 10 },
    'target-problems': { required: true, minLength: 20 },
    'value-proposition': { required: true, minLength: 20 },
    'success-outcome': { required: true, minLength: 10 },
    'call-to-action': { required: true, minLength: 5 },
    'communication-style': { required: true },
    'message-example': { required: true, minLength: 50 },
    'primary-objective': { required: true },
    'phone-number': { required: false }
};

function showSubmissionError(message) {
    const errorElement = document.getElementById('submission-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        // Fallback: create error element
        const errorDiv = document.createElement('div');
        errorDiv.id = 'submission-error';
        errorDiv.className = 'validation-notification';
        errorDiv.textContent = message;
        
        const form = document.querySelector('.onboarding-form');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

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
        // Clear any validation errors from current step
        clearAllErrors();
        
        // Hide current step
        const currentStepElement = document.getElementById(`step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'none';
        }
        
        // Show previous step
        currentStep--;
        const prevStepElement = document.getElementById(`step-${currentStep}`);
        if (prevStepElement) {
            prevStepElement.style.display = 'block';
            
            // Focus first input in previous step
            const firstInput = prevStepElement.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
        
        // Update progress
        updateProgress();
        
        // Update navigation buttons
        updateNavigationButtons();
        
        console.log(`⬅️ [Onboarding] Moved back to step ${currentStep}`);
    }
}
    
function validateStep(stepNumber) {
    console.log(`🔍 [Onboarding] Validating step ${stepNumber}`);
    
    const fieldsForStep = stepFields[stepNumber];
    if (!fieldsForStep) return true;
    
    let isValid = true;
    
    for (const fieldId of fieldsForStep) {
        const rules = validationRules[fieldId];
        if (!rules) continue;
        
        const value = getFieldValue(fieldId);
        
        // Required field validation
        if (rules.required && (!value || value.trim().length === 0)) {
            showFieldError(fieldId, `This field is required`);
            isValid = false;
            continue;
        }
        
        // Character limit validation
        if (CHARACTER_LIMITS[fieldId]) {
            if (!validateCharacterLimit(fieldId)) {
                isValid = false;
                continue;
            }
        }
        
        // Minimum length validation
        if (rules.minLength && value.length > 0 && value.length < rules.minLength) {
            showFieldError(fieldId, `Minimum ${rules.minLength} characters required`);
            isValid = false;
        }
        
        // Clear errors for valid fields
        if (value && value.trim().length > 0) {
            clearFieldError(fieldId);
        }
    }
    
    return isValid;
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

    function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    if (field) {
        field.classList.remove('error');
    }
    
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
}

function clearAllErrors() {
    // Clear all field errors
    Object.keys(validationRules).forEach(fieldId => {
        clearFieldError(fieldId);
    });
    
    // Clear submission errors
    const submissionError = document.getElementById('submission-error');
    if (submissionError) {
        submissionError.style.display = 'none';
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
    if (currentStep < totalSteps) {
        // Validate current step before proceeding
        if (!validateStep(currentStep)) {
            console.log(`❌ [Onboarding] Step ${currentStep} validation failed`);
            return;
        }
        
        // Clear any existing errors
        clearAllErrors();
        
        // Hide current step
        const currentStepElement = document.getElementById(`step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'none';
        }
        
        // Show next step
        currentStep++;
        const nextStepElement = document.getElementById(`step-${currentStep}`);
        if (nextStepElement) {
            nextStepElement.style.display = 'block';
            
            // Focus first input in new step
            const firstInput = nextStepElement.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
        
        // Update progress
        updateProgress();
        
        // Update navigation buttons
        updateNavigationButtons();
        
        console.log(`➡️ [Onboarding] Moved to step ${currentStep}`);
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
    if (!phone || phone.trim().length === 0) {
        return true; // Phone is optional
    }
    
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a reasonable phone number length
    if (cleaned.length < 10 || cleaned.length > 15) {
        showFieldError('phone-number', 'Please enter a valid phone number (10-15 digits)');
        return false;
    }
    
    clearFieldError('phone-number');
    return true;
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

function sanitizePhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-numeric characters except + for international
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Validate international format
    if (cleaned.startsWith('+')) {
        return cleaned.length <= 16 ? cleaned : cleaned.substring(0, 16);
    }
    
    // Domestic format - remove leading 1 if present
    const domesticCleaned = cleaned.replace(/^1/, '');
    return domesticCleaned.length <= 10 ? domesticCleaned : domesticCleaned.substring(0, 10);
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
            communication_style: getFieldValue('communication-style'),
            message_example: getFieldValue('message-example'),
            success_outcome: getFieldValue('success-outcome'),
            call_to_action: getFieldValue('call-to-action'),
            primary_objective: getFieldValue('primary-objective'),
            phone_number: sanitizePhoneNumber(getFieldValue('phone-number')),
            opt_in_sms: document.getElementById('opt-in-sms')?.checked || false
        };
        
        // Validate all fields
        if (!validateAllFields(formData)) {
            hideSubmissionProgress();
            return;
        }
        
        console.log('🧠 [Onboarding] Generating business context via AI...');
        
        // Call Cloudflare Worker to generate context using GPT-5 Mini
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
            
            // Update user onboarding status
            await window.OsliraAuth.updateUserOnboardingStatus(true);
            
            // Redirect to dashboard
            window.location.href = '/dashboard';
        } else {
            throw new Error(response.error || 'Failed to create profile');
        }
        
    } catch (error) {
        console.error('❌ [Onboarding] Submission failed:', error);
        showSubmissionError(error.message);
        hideSubmissionProgress();
    }
}
    
function validateAllFields(profileData) {
    let hasErrors = false;
    
    // Check all required fields
    const requiredFields = [
        { key: 'business_name', label: 'Business Name' },
        { key: 'business_niche', label: 'Business Niche' },
        { key: 'target_audience', label: 'Target Audience' },
        { key: 'target_problems', label: 'Target Problems' },
        { key: 'value_proposition', label: 'Value Proposition' },
        { key: 'success_outcome', label: 'Success Outcome' },
        { key: 'call_to_action', label: 'Call to Action' }
    ];
    
    requiredFields.forEach(field => {
        if (!profileData[field.key] || profileData[field.key].trim().length === 0) {
            console.error(`❌ Missing required field: ${field.label}`);
            hasErrors = true;
        }
    });
    
    if (hasErrors) {
        showSubmissionError('Please complete all required fields before submitting.');
    }
    
    return !hasErrors;
}

    // =============================================================================
// SKIP FUNCTIONS - MISSING CRITICAL FUNCTIONS
// =============================================================================

window.skipPhoneStep = function() {
    console.log('⏭️ [Onboarding] Skipping phone step');
    nextStep();
};

window.skipStep = function() {
    console.log('⏭️ [Onboarding] Skipping current step');
    if (currentStep < totalSteps) {
        nextStep();
    } else {
        submitOnboarding();
    }
};
    
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
