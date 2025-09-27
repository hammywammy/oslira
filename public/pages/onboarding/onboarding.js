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

// Verify critical dependencies before proceeding
if (!window.OsliraApiClient) {
    console.error('❌ [Onboarding] API client not available');
    showError('System initialization incomplete. Please refresh the page.');
    return;
}

if (typeof window.OsliraApiClient.request !== 'function') {
    console.error('❌ [Onboarding] API client not properly instantiated');
    showError('API client initialization failed. Please refresh the page.');
    return;
}
        
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
    const skipButton = document.getElementById('skip-btn');
    
    // Show/hide previous button
    if (prevButton) {
        prevButton.style.display = currentStep > 1 ? 'inline-flex' : 'none';
    }
    
    // Update next/submit button and skip button
    if (currentStep === totalSteps) {
        if (nextButton) nextButton.style.display = 'none';
        if (submitButton) submitButton.style.display = 'inline-flex';
        if (skipButton) skipButton.style.display = 'none'; // Hide skip on final step
    } else {
        if (nextButton) nextButton.style.display = 'inline-flex';
        if (submitButton) submitButton.style.display = 'none';
        if (skipButton) skipButton.style.display = 'inline-flex'; // Show skip on other steps
    }
    
    console.log(`[Onboarding] Navigation buttons updated for step ${currentStep}/${totalSteps}`);
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
     // Clear any error messages and show onboarding form
hideElement('error-state');
hideElement('loading-state');
showElement('onboarding-form');
    } else {
        console.error(`[Onboarding] Step ${stepNumber} element not found!`);
    }
    
// Update progress
updateProgress();

// Update navigation buttons for current step
updateNavigationButtons();
    
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
    const timestamp = Date.now();
    const callStack = new Error().stack;
    
    console.log('🚀 [SUBMISSION PROGRESS] Starting button lockdown', {
        timestamp,
        currentStep: window.currentStep,
        totalSteps: window.totalSteps,
        userAgent: navigator.userAgent,
        callStack: callStack.split('\n').slice(0, 5)
    });
    
    // Find ALL possible submission-related buttons with extensive logging
    const selectors = [
        '[onclick*="submitOnboarding"]',
        '#finish-btn', 
        '[onclick*="skipStep"]',
        'button[onclick]'
    ];
    
    let allButtons = [];
    selectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        console.log(`🔍 [SUBMISSION PROGRESS] Found ${buttons.length} buttons with selector: ${selector}`);
        allButtons = [...allButtons, ...Array.from(buttons)];
    });
    
    // Remove duplicates and log each unique button
    const uniqueButtons = [...new Set(allButtons)];
    console.log(`📊 [SUBMISSION PROGRESS] Total unique buttons found: ${uniqueButtons.length}`);
    
    uniqueButtons.forEach((btn, index) => {
        const beforeState = {
            id: btn.id,
            disabled: btn.disabled,
            textContent: btn.textContent?.trim(),
            onclick: btn.onclick?.toString().substring(0, 100),
            pointerEvents: getComputedStyle(btn).pointerEvents,
            display: getComputedStyle(btn).display,
            visibility: getComputedStyle(btn).visibility
        };
        
        console.log(`🔒 [SUBMISSION PROGRESS] Button ${index + 1} BEFORE disable:`, beforeState);
        
        // Disable the button
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        
        // Update text for submission buttons
        if (btn.id === 'finish-btn' || btn.onclick?.toString().includes('submitOnboarding')) {
            btn.textContent = 'Creating Profile...';
            btn.classList.add('loading');
        }
        
        const afterState = {
            id: btn.id,
            disabled: btn.disabled,
            textContent: btn.textContent?.trim(),
            onclick: btn.onclick?.toString().substring(0, 100),
            pointerEvents: getComputedStyle(btn).pointerEvents,
            display: getComputedStyle(btn).display,
            visibility: getComputedStyle(btn).visibility
        };
        
        console.log(`✅ [SUBMISSION PROGRESS] Button ${index + 1} AFTER disable:`, afterState);
        
        // Verify the disable worked
        if (!btn.disabled || getComputedStyle(btn).pointerEvents !== 'none') {
            console.error(`🚨 [SUBMISSION PROGRESS] Button ${index + 1} FAILED to disable properly!`, {
                expectedDisabled: true,
                actualDisabled: btn.disabled,
                expectedPointerEvents: 'none',
                actualPointerEvents: getComputedStyle(btn).pointerEvents
            });
        }
    });
    
    // Log DOM state after changes
    console.log('📋 [SUBMISSION PROGRESS] Final DOM state:', {
        totalButtonsProcessed: uniqueButtons.length,
        finishBtnExists: !!document.getElementById('finish-btn'),
        finishBtnDisabled: document.getElementById('finish-btn')?.disabled,
        skipBtnExists: !!document.getElementById('skip-btn'),
        skipBtnDisabled: document.getElementById('skip-btn')?.disabled,
        processingTime: Date.now() - timestamp
    });
    
    // Set up monitoring for any button clicks after this point
    const postLockdownMonitor = (e) => {
        const button = e.target.closest('button');
        if (button && (
            button.onclick?.toString().includes('submitOnboarding') ||
            button.onclick?.toString().includes('skipStep') ||
            button.id === 'finish-btn'
        )) {
            console.error('🚨 [SUBMISSION PROGRESS] BUTTON CLICK AFTER LOCKDOWN!', {
                buttonId: button.id,
                disabled: button.disabled,
                pointerEvents: getComputedStyle(button).pointerEvents,
                textContent: button.textContent?.trim(),
                timestamp: Date.now(),
                timeSinceLockdown: Date.now() - timestamp
            });
        }
    };
    
    document.addEventListener('click', postLockdownMonitor, { once: false });
    
    // Remove monitor after 10 seconds
    setTimeout(() => {
        document.removeEventListener('click', postLockdownMonitor);
        console.log('🔍 [SUBMISSION PROGRESS] Post-lockdown monitoring ended');
    }, 10000);
    
    console.log('🎯 [SUBMISSION PROGRESS] Button lockdown complete', {
        totalTime: Date.now() - timestamp,
        success: true
    });
}
    
    function updateSubmissionMessage(message) {
        const submitButton = document.querySelector('[onclick="submitOnboarding()"]');
        if (submitButton) {
            submitButton.textContent = message;
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
    
// Global submission state to prevent duplicates
let isSubmissionInProgress = false;

async function submitOnboarding() {
    // Immediate duplicate check with hard block
    if (isSubmissionInProgress) {
        console.warn('🚨 [Onboarding] Duplicate submission blocked');
        return;
    }
    
    isSubmissionInProgress = true;
    console.log('📤 [Onboarding] Starting submission process');
    
    try {
        showSubmissionProgress();
        
// Use the correct auth system
const authSystem = window.OsliraAuth || window.SimpleAuth;
// 1. VERIFY AUTHENTICATION FIRST
if (!window.OsliraAuth?.supabase) {
    throw new Error('Authentication system not available');
}

// Get fresh session
const { data: sessionData, error: sessionError } = await authSystem.supabase.auth.getSession();
        if (sessionError || !sessionData?.session) {
            console.error('❌ [Onboarding] No valid session:', sessionError);
            throw new Error('Authentication expired. Please refresh the page and log in again.');
        }
        
        const session = sessionData.session;
        const user = session.user;
        
        console.log('✅ [Onboarding] Session verified:', {
            userId: user.id,
            email: user.email,
            hasToken: !!session.access_token
        });

        const formData = {
            business_name: getFieldValue('company-name'),
            business_niche: getFieldValue('industry'), 
            target_audience: getFieldValue('target-description'),
            company_size: getFieldValue('company-size'),
            website: getFieldValue('website'),
            budget: getFieldValue('budget'),
            monthly_lead_goal: getFieldValue('monthly-lead-goal') ? 
                parseInt(getFieldValue('monthly-lead-goal')) : null,
            primary_objective: getFieldValue('primary-objective'),
            communication_style: getFieldValue('communication-tone') || null,
            team_size: getFieldValue('team-size'),
            campaign_manager: getFieldValue('campaign-manager'),
            challenges: Array.isArray(getFieldValue('challenges')) ? 
                getFieldValue('challenges') : [],
            integrations: Array.isArray(getFieldValue('integrations')) ? 
                getFieldValue('integrations') : [],
            
            // Auto-generated legacy fields
            target_problems: Array.isArray(getFieldValue('challenges')) && getFieldValue('challenges').length > 0 ? 
                'Main challenges: ' + getFieldValue('challenges').join(', ') : null,
            value_proposition: 'Value proposition to be refined during campaign setup',
            message_example: getFieldValue('communication-tone') ? 
                `Sample message using ${getFieldValue('communication-tone')} communication style - to be generated by AI` : null,
            success_outcome: getFieldValue('monthly-lead-goal') ? 
                `Target: ${getFieldValue('monthly-lead-goal')} qualified leads per month` : null,
            call_to_action: 'Call-to-action strategy to be developed during campaign creation',
            
            // Add user_id
            user_id: user.id
        };
        
        console.log('📝 [Onboarding] Creating profile and generating business context...');
        
        // 2. GET WORKER URL
        let workerUrl;
        if (window.OsliraEnv?.WORKER_URL) {
            workerUrl = window.OsliraEnv.WORKER_URL;
        } else if (window.OsliraConfig?.getWorkerUrl) {
            workerUrl = await window.OsliraConfig.getWorkerUrl();
        } else {
            workerUrl = 'https://api-staging.oslira.com';
        }
        
        console.log('🔧 [Onboarding] Using API URL:', workerUrl);

        // 3. CREATE BUSINESS PROFILE WITH DIRECT FETCH
        console.log('📤 [Onboarding] Creating business profile...');
        
        const profileResponse = await fetch(`${workerUrl}/business-profiles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!profileResponse.ok) {
            const errorText = await profileResponse.text();
            console.error('❌ [Onboarding] Profile creation failed:', {
                status: profileResponse.status,
                statusText: profileResponse.statusText,
                body: errorText
            });
            throw new Error(`Failed to create business profile: ${profileResponse.status} - ${errorText}`);
        }
        
        const profileResult = await profileResponse.json();
        
        if (!profileResult || !profileResult.success) {
            throw new Error(profileResult?.error || 'Failed to create business profile');
        }

        const profileId = profileResult.data.id;
        const userId = profileResult.data.user_id;
        console.log('✅ [Onboarding] Profile created:', profileId);

        // 4. GENERATE BUSINESS CONTEXT
        updateSubmissionMessage('Generating business intelligence...');
        console.log('🤖 [Onboarding] Generating business context...');

        try {
            const contextResponse = await fetch(`${workerUrl}/v1/generate-business-context`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    business_data: formData,
                    user_id: userId,
                    request_type: 'onboarding'
                })
            });

            if (contextResponse.ok) {
                const contextResult = await contextResponse.json();
                
                if (contextResult && contextResult.success) {
                    console.log('✅ [Onboarding] Business context generated successfully');
                    
                    // 5. UPDATE PROFILE WITH GENERATED CONTEXT
                    console.log('📝 [Onboarding] Updating profile with AI context...');
                    
const updateResponse = await fetch(`${workerUrl}/business-profiles/${profileId}`, {
    method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            business_one_liner: contextResult.data.business_one_liner,
                            business_context_pack: contextResult.data.business_context_pack,
                            context_version: contextResult.data.context_version
                        })
                    });
                    
                    if (updateResponse.ok) {
                        const updateResult = await updateResponse.json();
                        if (updateResult && updateResult.success) {
                            console.log('✅ [Onboarding] Profile updated with business context');
                        } else {
                            console.warn('⚠️ [Onboarding] Failed to update profile with context, continuing anyway');
                        }
                    } else {
                        console.warn('⚠️ [Onboarding] Context update request failed, continuing anyway');
                    }
                } else {
                    console.warn('⚠️ [Onboarding] Context generation unsuccessful, continuing without it');
                }
            } else {
                console.warn('⚠️ [Onboarding] Context generation request failed, continuing without it');
            }
        } catch (contextError) {
            console.warn('⚠️ [Onboarding] Context generation failed, continuing without it:', contextError);
        }
        
const { error: updateUserError } = await authSystem.supabase
    .from('users')
    .update({ onboarding_completed: true })
    .eq('id', user.id);
            
        if (updateUserError) {
            console.warn('⚠️ [Onboarding] Failed to update user status:', updateUserError);
            // Continue anyway - the main business profile was created
        }
        
        console.log('✅ [Onboarding] Onboarding complete, redirecting...');
        
        // Redirect to dashboard
        window.location.href = '/dashboard/';
        
} catch (error) {
        // Reset submission state on error
        isSubmissionInProgress = false;
        
        console.error('❌ [Onboarding] Submission failed:', error);
        
        // Show user-friendly error message
        
        // Show user-friendly error message
        const errorMessage = error.message.includes('Invalid signature') 
            ? 'Authentication expired. Please refresh the page and try again.'
            : error.message.includes('Authentication expired')
            ? 'Your session has expired. Please log in again.'
            : error.message.includes('Failed to create business profile')
            ? 'Server error occurred while creating your profile. Please try again.'
            : 'An unexpected error occurred. Please try again.';
            
        validator.showSubmissionError(errorMessage);
        hideSubmissionProgress();
        
        // If auth error, redirect to login after showing error
        if (error.message.includes('Authentication') || error.message.includes('Invalid signature')) {
            setTimeout(() => {
                window.location.href = '/auth';
            }, 3000);
        }
    }
}
    
// =============================================================================
// INITIALIZATION
// =============================================================================

// Don't initialize step immediately - wait for proper initialization
console.log('📝 [Onboarding] Main controller loaded successfully');

})();
