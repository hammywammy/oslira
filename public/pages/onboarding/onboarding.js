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
    
// Progress tracking state
let progressTracker = {
    startTime: null,
    currentProgress: 0,
    estimatedDuration: 25000, // Start with 25 seconds
    currentStep: 0,
    steps: [
        { name: 'Validating form data', weight: 5 },
        { name: 'Creating business profile', weight: 15 },
        { name: 'Generating AI insights', weight: 60 },
        { name: 'Finalizing setup', weight: 20 }
    ]
};

function showSubmissionProgress() {
    // Hide the entire onboarding form
    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) {
        onboardingForm.style.display = 'none';
    }

    // Initialize progress tracking
    progressTracker.startTime = Date.now();
    progressTracker.currentProgress = 0;
    progressTracker.currentStep = 0;

    // Create progress overlay
    const progressOverlay = document.createElement('div');
    progressOverlay.id = 'submission-progress-overlay';
    progressOverlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
    progressOverlay.innerHTML = `
        <div class="max-w-lg mx-auto text-center p-8 bg-white rounded-2xl shadow-2xl border">
            <div class="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="fas fa-brain text-white text-2xl"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Generating Business Intelligence</h2>
            <p id="progress-step-text" class="text-gray-600 mb-6">Validating form data...</p>
            
            <!-- Progress Bar -->
            <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div id="progress-bar-fill" class="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out" style="width: 0%"></div>
            </div>
            
            <!-- Progress Stats -->
            <div class="flex justify-between items-center text-sm">
                <span id="progress-percentage" class="font-semibold text-gray-700">0%</span>
                <span id="progress-time" class="text-gray-500">Estimating time...</span>
            </div>
            
            <!-- Progress Details -->
            <div class="mt-4 text-xs text-gray-400">
                <div class="flex items-center justify-center space-x-2">
                    <div class="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                    <span>Processing your business data</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(progressOverlay);
    
    // Start progress animation
    startProgressAnimation();
    
    // Store reference for cleanup
    window.submissionProgressOverlay = progressOverlay;
}

function startProgressAnimation() {
    const progressInterval = setInterval(() => {
        updateProgressDisplay();
    }, 100); // Update every 100ms for smooth animation
    
    // Store interval for cleanup
    window.progressAnimationInterval = progressInterval;
}

function updateProgressDisplay() {
    const elapsed = Date.now() - progressTracker.startTime;
    const progressPercentageEl = document.getElementById('progress-percentage');
    const progressTimeEl = document.getElementById('progress-time');
    const progressBarFill = document.getElementById('progress-bar-fill');
    
    if (!progressPercentageEl || !progressTimeEl || !progressBarFill) return;
    
    // Update progress bar and percentage
    progressBarFill.style.width = `${progressTracker.currentProgress}%`;
    progressPercentageEl.textContent = `${Math.floor(progressTracker.currentProgress)}%`;
    
    // Calculate and update time estimate
    if (progressTracker.currentProgress > 5) {
        const estimatedTotal = (elapsed / progressTracker.currentProgress) * 100;
        const remaining = Math.max(0, (estimatedTotal - elapsed) / 1000);
        
        if (remaining > 60) {
            progressTimeEl.textContent = `~${Math.ceil(remaining / 60)}m remaining`;
        } else if (remaining > 0) {
            progressTimeEl.textContent = `~${Math.ceil(remaining)}s remaining`;
        } else {
            progressTimeEl.textContent = 'Almost done...';
        }
    } else {
        progressTimeEl.textContent = `~${Math.ceil(progressTracker.estimatedDuration / 1000)}s remaining`;
    }
}

function setProgressStep(stepIndex, additionalProgress = 0) {
    if (stepIndex >= progressTracker.steps.length) return;
    
    // Update current step
    progressTracker.currentStep = stepIndex;
    
    // Calculate progress based on completed steps + additional progress within current step
    let totalProgress = 0;
    
    // Add weight of all completed steps
    for (let i = 0; i < stepIndex; i++) {
        totalProgress += progressTracker.steps[i].weight;
    }
    
    // Add partial progress of current step
    totalProgress += (progressTracker.steps[stepIndex].weight * additionalProgress);
    
    progressTracker.currentProgress = Math.min(totalProgress, 100);
    
    // Update step text
    const stepTextEl = document.getElementById('progress-step-text');
    if (stepTextEl) {
        stepTextEl.textContent = progressTracker.steps[stepIndex].name;
    }
    
    console.log(`📊 Progress: ${Math.floor(progressTracker.currentProgress)}% - ${progressTracker.steps[stepIndex].name}`);
}

function updateSubmissionMessage(message) {
    const stepTextEl = document.getElementById('progress-step-text');
    if (stepTextEl) {
        stepTextEl.textContent = message;
    }
}

function hideSubmissionProgress() {
    // Cleanup progress tracking
    cleanupProgressTracking();
    
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

function cleanupProgressTracking() {
    // Clear animation interval
    if (window.progressAnimationInterval) {
        clearInterval(window.progressAnimationInterval);
        window.progressAnimationInterval = null;
    }
    
    // Reset progress tracker
    progressTracker = {
        startTime: null,
        currentProgress: 0,
        estimatedDuration: 25000,
        currentStep: 0,
        steps: [
            { name: 'Validating form data', weight: 5 },
            { name: 'Creating business profile', weight: 15 },
            { name: 'Generating AI insights', weight: 60 },
            { name: 'Finalizing setup', weight: 20 }
        ]
    };
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
        setProgressStep(0, 0.2); // Start validation step
        
        // Use the correct auth system
        const authSystem = window.OsliraAuth || window.SimpleAuth;
        // 1. VERIFY AUTHENTICATION FIRST
        if (!window.OsliraAuth?.supabase) {
            throw new Error('Authentication system not available');
        }

        setProgressStep(0, 0.6); // Auth check progress
        
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

        setProgressStep(1, 0.1); // Starting profile creation

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
        
        setProgressStep(1, 0.5); // Form data ready
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

        setProgressStep(1, 0.8); // Sending profile data

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

        setProgressStep(2, 0.1); // Starting AI generation

        // 4. GENERATE BUSINESS CONTEXT
        updateSubmissionMessage('Generating AI business insights...');
        console.log('🤖 [Onboarding] Generating business context...');

        try {
            setProgressStep(2, 0.3); // AI processing started

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

            setProgressStep(2, 0.7); // AI processing in progress

            if (contextResponse.ok) {
                const contextResult = await contextResponse.json();
                
                if (contextResult && contextResult.success) {
                    console.log('✅ [Onboarding] Business context generated successfully');
                    
                    setProgressStep(2, 0.9); // AI generation complete
                    
                    // 5. UPDATE PROFILE WITH GENERATED CONTEXT
                    updateSubmissionMessage('Finalizing your profile...');
                    console.log('📝 [Onboarding] Updating profile with AI context...');
                    
                    setProgressStep(3, 0.2); // Starting profile update
                    
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
                    
                    setProgressStep(3, 0.5); // Profile update in progress
                    
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
                    setProgressStep(2, 1.0); // Skip to next step
                }
            } else {
                console.warn('⚠️ [Onboarding] Context generation request failed, continuing without it');
                setProgressStep(2, 1.0); // Skip to next step
            }
        } catch (contextError) {
            console.warn('⚠️ [Onboarding] Context generation failed, continuing without it:', contextError);
            setProgressStep(2, 1.0); // Skip to next step
        }
        
        setProgressStep(3, 0.7); // Updating user status
        updateSubmissionMessage('Completing setup...');

        // 6. UPDATE USER ONBOARDING STATUS
        const { error: updateUserError } = await authSystem.supabase
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', user.id);
            
        if (updateUserError) {
            console.warn('⚠️ [Onboarding] Failed to update user status:', updateUserError);
            // Continue anyway - the main business profile was created
        }
        
        setProgressStep(3, 1.0); // Complete
        updateSubmissionMessage('Setup complete! Redirecting...');
        
        console.log('✅ [Onboarding] Onboarding complete, redirecting...');
        
        // Small delay to show completion
        setTimeout(() => {
            window.location.href = '/dashboard/';
        }, 1000);
        
    } catch (error) {
        // Reset submission state on error
        isSubmissionInProgress = false;
        
        console.error('❌ [Onboarding] Submission failed:', error);
        
        // Show user-friendly error message
        const errorMessage = error.message.includes('Invalid signature') 
            ? 'Authentication expired. Please refresh the page and try again.'
            : error.message.includes('Authentication expired')
            ? 'Your session has expired. Please log in again.'
            : error.message.includes('Failed to create business profile')
            ? 'Server error occurred while creating your profile. Please try again.'
            : 'An unexpected error occurred. Please try again.';
            
        // Clean up progress and show error
        cleanupProgressTracking();
        hideSubmissionProgress();
        
        // Show error via validator if available
        if (validator && validator.showSubmissionError) {
            validator.showSubmissionError(errorMessage);
        } else {
            // Fallback error display
            alert(errorMessage);
        }
        
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
