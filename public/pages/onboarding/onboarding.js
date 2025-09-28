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
    const prevButton = document.querySelector('[onclick="prevStep()"]');
    const nextButton = document.querySelector('[onclick="nextStep()"]');
    const submitButton = document.querySelector('[onclick="submitOnboarding()"]');
    const skipButton = document.getElementById('skip-btn');
    
    // Show/hide previous button
    if (prevButton) {
        prevButton.style.display = currentStep > 1 ? 'inline-flex' : 'none';
    }
    
    // Show skip button only on steps 8 (integrations) and 9 (phone number)
    if (skipButton) {
        if (currentStep === 8 || currentStep === 9) {
            skipButton.style.display = 'inline-flex';
        } else {
            skipButton.style.display = 'none';
        }
    }
    
    // Update next/submit button
    if (currentStep === totalSteps) {
        if (nextButton) nextButton.style.display = 'none';
        if (submitButton) submitButton.style.display = 'inline-flex';
    } else {
        if (nextButton) nextButton.style.display = 'inline-flex';
        if (submitButton) submitButton.style.display = 'none';
    }

// Update button text for step 10
if (currentStep === 10) {
    const nextText = document.getElementById('next-text');
    if (nextText) nextText.textContent = 'Continue';
    if (submitButton) {
        submitButton.innerHTML = `
            <span class="onboarding-btn-content">
                <i class="fas fa-arrow-right mr-3"></i>
                Continue to Dashboard
                <i class="onboarding-btn-arrow group-hover:translate-x-1 fas fa-arrow-right ml-3"></i>
            </span>
        `;
    }
} else if (currentStep === 9) {
    const nextText = document.getElementById('next-text');
    if (nextText) nextText.textContent = 'Continue';
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
        // Show validation error
        return;
    }
    
    // Move to next step
    currentStep++;
    showStep(currentStep);
    updateProgress();
    updateNavigationButtons();
} else {
    // At final step (step 10), submit
    submitOnboarding();
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
    
    if (fieldId === 'industry') {
        const select = document.getElementById('industry');
        const value = select ? select.value : '';
        
        // If "other" is selected, get the custom industry value
        if (value === 'other') {
            const otherInput = document.getElementById('industry-other');
            return otherInput ? otherInput.value.trim() : '';
        }
        
        return value;
    }
    
    if (fieldId === 'industry-other') {
        const input = document.getElementById('industry-other');
        return input ? input.value.trim() : '';
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

    if (fieldId === 'phone-number') {
    const field = document.getElementById('phone-number');
    return field ? field.value.trim() : '';
}

if (fieldId === 'sms-opt-in') {
    const checkbox = document.querySelector('input[name="sms-opt-in"]:checked');
    return checkbox ? checkbox.value : '';
}

    if (fieldId === 'target-size') {
    const checkboxes = document.querySelectorAll('input[name="target-size"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

if (fieldId === 'communication') {
    const checkboxes = document.querySelectorAll('input[name="communication"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

if (fieldId === 'website') {
    const field = document.getElementById('website');
    return field ? field.value.trim() : '';
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
    // Hide the entire onboarding form
    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) {
        onboardingForm.style.display = 'none';
    }

    // Create progress overlay
    const progressOverlay = document.createElement('div');
    progressOverlay.id = 'submission-progress-overlay';
    progressOverlay.className = 'fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center z-50';
    progressOverlay.innerHTML = `
        <div class="max-w-md mx-auto text-center p-8">
            <div class="w-24 h-24 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <i class="fas fa-cog text-white text-3xl animate-spin"></i>
            </div>
            <h2 class="text-3xl font-bold text-white mb-4">Creating Your Profile</h2>
            <p class="text-white/80 text-lg mb-8">Setting up your AI-powered lead generation system...</p>
            
            <!-- Progress Bar -->
            <div class="w-full bg-white/20 rounded-full h-3 mb-6">
                <div id="submission-progress-bar" class="bg-gradient-to-r from-emerald-400 to-cyan-400 h-3 rounded-full transition-all duration-500" style="width: 0%"></div>
            </div>
            
            <!-- Progress Steps -->
            <div class="space-y-3 text-left">
                <div id="step-auth" class="flex items-center text-white/70">
                    <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center mr-3">
                        <i class="fas fa-spinner animate-spin text-xs"></i>
                    </div>
                    <span>Verifying authentication...</span>
                </div>
                <div id="step-validate" class="flex items-center text-white/50">
                    <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center mr-3">
                        <span class="text-xs">2</span>
                    </div>
                    <span>Validating profile data...</span>
                </div>
                <div id="step-ai" class="flex items-center text-white/50">
                    <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center mr-3">
                        <span class="text-xs">3</span>
                    </div>
                    <span>Training AI algorithms...</span>
                </div>
                <div id="step-save" class="flex items-center text-white/50">
                    <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center mr-3">
                        <span class="text-xs">4</span>
                    </div>
                    <span>Saving profile...</span>
                </div>
                <div id="step-finalize" class="flex items-center text-white/50">
                    <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center mr-3">
                        <span class="text-xs">5</span>
                    </div>
                    <span>Finalizing setup...</span>
                </div>
            </div>
            
            <div class="mt-8 text-white/60 text-sm">
                <span id="progress-time">Estimated time: 25 seconds</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(progressOverlay);
    
    // Start progress simulation
    let currentProgress = 0;
    let currentStepIndex = 0;
    const steps = ['step-auth', 'step-validate', 'step-ai', 'step-save', 'step-finalize'];
    const stepDurations = [3000, 5000, 8000, 6000, 3000]; // Total: 25 seconds
    const stepNames = [
        'Verifying authentication...',
        'Validating profile data...',
        'Training AI algorithms...',
        'Saving profile...',
        'Finalizing setup...'
    ];
    
    const progressBar = document.getElementById('submission-progress-bar');
    const progressTime = document.getElementById('progress-time');
    
    function updateProgressStep(stepIndex) {
        // Mark previous steps as complete
        for (let i = 0; i < stepIndex; i++) {
            const stepEl = document.getElementById(steps[i]);
            if (stepEl) {
                stepEl.className = 'flex items-center text-emerald-400';
                stepEl.querySelector('.w-6').innerHTML = '<i class="fas fa-check text-xs"></i>';
                stepEl.querySelector('.w-6').className = 'w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center mr-3';
            }
        }
        
        // Update current step
        if (stepIndex < steps.length) {
            const currentStepEl = document.getElementById(steps[stepIndex]);
            if (currentStepEl) {
                currentStepEl.className = 'flex items-center text-white';
                currentStepEl.querySelector('.w-6').innerHTML = '<i class="fas fa-spinner animate-spin text-xs"></i>';
                currentStepEl.querySelector('.w-6').className = 'w-6 h-6 rounded-full border-2 border-emerald-400 flex items-center justify-center mr-3';
            }
        }
    }
    
    function animateProgress() {
        const totalDuration = 25000; // 25 seconds
        const interval = 100; // Update every 100ms
        const increment = (100 / totalDuration) * interval;
        
        const progressInterval = setInterval(() => {
            currentProgress += increment;
            
            if (progressBar) {
                progressBar.style.width = `${Math.min(currentProgress, 100)}%`;
            }
            
            // Update time remaining
            const timeRemaining = Math.max(0, Math.ceil((totalDuration - (currentProgress / 100 * totalDuration)) / 1000));
            if (progressTime) {
                if (timeRemaining > 0) {
                    progressTime.textContent = `Estimated time remaining: ${timeRemaining} seconds`;
                } else {
                    progressTime.textContent = 'Almost done...';
                }
            }
            
            if (currentProgress >= 100) {
                clearInterval(progressInterval);
            }
        }, interval);
        
        // Update steps at specific intervals
        stepDurations.forEach((duration, index) => {
            setTimeout(() => {
                updateProgressStep(index + 1);
            }, stepDurations.slice(0, index + 1).reduce((a, b) => a + b, 0));
        });
    }
    
    // Start the animation
    updateProgressStep(0);
    animateProgress();
    
    // Store reference for cleanup
    window.submissionProgressOverlay = progressOverlay;
}
    
function updateSubmissionMessage(message) {
    // Update the progress overlay if it exists
    const overlay = document.getElementById('submission-progress-overlay');
    if (overlay) {
        const progressText = overlay.querySelector('p');
        if (progressText) {
            progressText.textContent = message;
        }
    }
}

function hideSubmissionProgress() {
    // Remove the progress overlay
    const overlay = window.submissionProgressOverlay || document.getElementById('submission-progress-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Show the onboarding form again (in case of error)
    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) {
        onboardingForm.style.display = 'block';
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
