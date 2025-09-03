// =============================================================================
// AUTH PAGE STATE MANAGEMENT - OTP FLOW
// =============================================================================

let currentStep = 'options'; // 'options', 'email', 'otp-verification', 'password'
let currentEmail = '';
let authMode = null; // 'signin' or 'signup' or 'signup-verified'
let isLoading = false;

function showStep(stepName) {
    // Hide all steps
    document.getElementById('auth-options').style.display = 'none';
    document.getElementById('email-input-step').style.display = 'none';
    document.getElementById('otp-verification-step').style.display = 'none';
    document.getElementById('password-input-step').style.display = 'none';
    
    // Show requested step
    currentStep = stepName;
    
    switch(stepName) {
        case 'options':
            document.getElementById('auth-options').style.display = 'block';
            document.getElementById('auth-title').textContent = 'Start your free trial';
            document.getElementById('auth-subtitle').textContent = 'Get 5 free lead analyses, then upgrade for unlimited access';
            break;
            
        case 'email':
            document.getElementById('email-input-step').style.display = 'block';
            document.getElementById('auth-title').textContent = 'Enter your email';
            document.getElementById('auth-subtitle').textContent = 'We\'ll check if you have an account';
            setTimeout(() => document.getElementById('auth-email').focus(), 100);
            break;
            
        case 'otp-verification':
            document.getElementById('otp-verification-step').style.display = 'block';
            document.getElementById('otp-email').textContent = currentEmail;
            document.getElementById('auth-title').textContent = 'Verify your email';
            document.getElementById('auth-subtitle').textContent = 'Enter the code we sent you';
            setTimeout(() => document.getElementById('otp-code').focus(), 100);
            break;
            
        case 'password':
            document.getElementById('password-input-step').style.display = 'block';
            updatePasswordStepUI();
            setTimeout(() => document.getElementById('auth-password').focus(), 100);
            break;
    }
}

function updatePasswordStepUI() {
    const userContext = document.getElementById('user-context');
    const submitBtn = document.getElementById('submit-auth');
    
    if (authMode === 'signin') {
        document.getElementById('auth-title').textContent = 'Welcome back';
        document.getElementById('auth-subtitle').textContent = '';
        userContext.innerHTML = `<p class="welcome-back">Welcome back, <strong>${currentEmail}</strong></p>`;
        submitBtn.textContent = 'Sign in';
        document.getElementById('auth-password').setAttribute('autocomplete', 'current-password');
    } else if (authMode === 'set-password') {
        document.getElementById('auth-title').textContent = 'Set your password';  
        document.getElementById('auth-subtitle').textContent = 'Email verified ✓';
        userContext.innerHTML = `<p class="create-account">Set password for <strong>${currentEmail}</strong></p>`;
        submitBtn.textContent = 'Set password';
        document.getElementById('auth-password').setAttribute('autocomplete', 'new-password');
    } else {
        document.getElementById('auth-title').textContent = 'Create your account';  
        document.getElementById('auth-subtitle').textContent = '';
        userContext.innerHTML = `<p class="create-account">Create account for <strong>${currentEmail}</strong></p>`;
        submitBtn.textContent = 'Create account';
        document.getElementById('auth-password').setAttribute('autocomplete', 'new-password');
    }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleEmailSubmit(e) {
    e.preventDefault();
    if (isLoading) return;
    
    const email = document.getElementById('auth-email').value.trim();
    
    if (!validateEmail(email)) {
        showFieldError('auth-email', 'Please enter a valid email address');
        return;
    }
    
    try {
        hideError();
        showLoading('Checking account...');
        currentEmail = email;
        
        // Check if user exists
        const userExists = await window.SimpleAuth.checkUserExists(email);
        
        hideLoading();
        
        if (userExists) {
            authMode = 'signin';
            showStep('password');
        } else {
            // New user - send OTP for verification
            await sendEmailVerification(email);
        }
        
    } catch (error) {
        console.error('❌ [Auth] Email check failed:', error);
        hideLoading();
        // If check fails, default to signup flow
        authMode = 'signup';
        showStep('password');
    }
}

async function sendEmailVerification(email) {
    try {
        showLoading('Sending verification code...');
        
        // Send OTP for new user signup - explicitly allow user creation
        const { data, error } = await window.SimpleAuth.supabase.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: true  // This fixes the 422 error
            }
        });
        
        if (error) {
            console.error('Supabase OTP Error:', error);
            throw error;
        }
        
        console.log('✅ OTP sent successfully:', data);
        hideLoading();
        
        // Show OTP input step
        showStep('otp-verification');
        
    } catch (error) {
        console.error('❌ [Auth] Email verification failed:', error);
        hideLoading();
        
        // If OTP fails, fall back to password step
        console.log('📝 Falling back to direct signup without OTP');
        authMode = 'signup';
        showStep('password');
    }
}

async function handleOtpSubmit(e) {
    e.preventDefault();
    if (isLoading) return;
    
    const otpCode = document.getElementById('otp-code').value.trim();
    
    if (!otpCode || otpCode.length !== 6) {
        showFieldError('otp-code', 'Please enter a valid 6-digit code');
        return;
    }
    
    try {
        hideError();
        showLoading('Verifying code...');
        
        // Verify the OTP - this creates the user account
        const { data, error } = await window.SimpleAuth.supabase.auth.verifyOtp({
            email: currentEmail,
            token: otpCode,
            type: 'email'
        });
        
        if (error) throw error;
        
        console.log('✅ OTP verified, user created:', data);
        
        // Update auth state
        window.SimpleAuth.session = data.session;
        
        // Now user needs to set their password
        authMode = 'set-password';
        showLoading('Email verified! Set your password...');
        
        setTimeout(() => {
            hideLoading();
            showStep('password');
        }, 1000);
        
    } catch (error) {
        console.error('❌ [Auth] OTP verification failed:', error);
        hideLoading();
        showFieldError('otp-code', 'Invalid or expired code. Please try again.');
    }
}

async function resendOtp() {
    try {
        showLoading('Resending code...');
        await sendEmailVerification(currentEmail);
    } catch (error) {
        hideLoading();
        showError('Failed to resend code. Please try again.');
    }
}

async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (isLoading) return;
    
    const password = document.getElementById('auth-password').value;
    
    if (!validatePassword(password)) {
        showFieldError('auth-password', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        hideError();
        
        if (authMode === 'signin') {
            showLoading('Signing you in...');
            
            const result = await window.SimpleAuth.signInWithPassword(currentEmail, password);
            
            showLoading('Welcome back! Redirecting...');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
            
        } else if (authMode === 'set-password') {
            // User is already authenticated via OTP, just set their password
            showLoading('Setting your password...');
            
            const { error } = await window.SimpleAuth.supabase.auth.updateUser({
                password: password
            });
            
            if (error) throw error;
            
            showLoading('Password set! Redirecting to onboarding...');
            setTimeout(() => {
                window.location.href = '/onboarding';
            }, 1000);
            
        } else {
            // Regular signup without OTP
            showLoading('Creating your account...');
            
            const result = await window.SimpleAuth.signUpWithPassword(currentEmail, password);
            
            if (result.needsEmailConfirmation) {
                hideLoading();
                showSuccess('<strong>Check your email!</strong> We sent you a confirmation link to complete your signup.');
            } else {
                showLoading('Account created! Redirecting...');
                setTimeout(() => {
                    window.location.href = '/onboarding';
                }, 1000);
            }
        }
        
} catch (error) {
    console.error(`❌ [Auth] ${authMode} failed:`, error);
    hideLoading();
    
    if (authMode === 'signin') {
        // Use your alert system instead of showError
        if (window.Alert && window.Alert.error) {
            window.Alert.error('Incorrect email or password. Please try again.');
        } else {
            showError('Incorrect email or password. Please try again.');
        }
    } else {
        if (window.Alert && window.Alert.error) {
            window.Alert.error(error.message || 'Authentication failed. Please try again.');
        } else {
            showError(error.message || 'Authentication failed. Please try again.');
        }
    }
}
}
async function handleGoogleAuth() {
    if (isLoading) return;
    
    try {
        hideError();
        showLoading('Connecting to Google...');
        
        await window.SimpleAuth.signInWithGoogle();
        
    } catch (error) {
        console.error('❌ [Auth] Google sign-in failed:', error);
        hideLoading();
        showError('Google sign-in failed. Please try again.');
    }
}

// =============================================================================
// INITIALIZATION & EVENT LISTENERS
// =============================================================================

window.addEventListener('oslira:scripts:loaded', async () => {
    try {
        console.log('🔐 [Auth] Scripts loaded, initializing OTP auth...');
        
        if (window.SimpleAuth) {
            await window.SimpleAuth.initialize();
        }
        
        setupEventListeners();
        showStep('options');
        document.body.style.visibility = 'visible';
        
        console.log('✅ [Auth] OTP auth ready');
        
    } catch (error) {
        console.error('❌ [Auth] Initialization failed:', error);
        showError('Failed to load authentication system. Please refresh the page.');
        document.body.style.visibility = 'visible';
    }
});

function setupEventListeners() {
    // Navigation
    document.getElementById('email-continue-btn').addEventListener('click', () => {
        hideError();
        showStep('email');
    });
    
    document.getElementById('back-to-options').addEventListener('click', (e) => {
        e.preventDefault();
        hideError();
        clearFieldErrors();
        showStep('options');
    });
    
    document.getElementById('back-to-email').addEventListener('click', (e) => {
        e.preventDefault();
        hideError();
        clearFieldErrors();
        showStep('email');
    });
    
    document.getElementById('back-to-email-otp').addEventListener('click', (e) => {
        e.preventDefault();
        hideError();
        clearFieldErrors();
        showStep('email');
    });
    
    // Form submissions
    document.getElementById('email-form').addEventListener('submit', handleEmailSubmit);
    document.getElementById('otp-form').addEventListener('submit', handleOtpSubmit);
    document.getElementById('password-form').addEventListener('submit', handlePasswordSubmit);
    document.getElementById('google-signin-btn').addEventListener('click', handleGoogleAuth);
    
    // OTP actions
    document.getElementById('resend-otp').addEventListener('click', resendOtp);
    
    // Clear errors on input
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('error');
            const errorEl = document.getElementById(input.id + '-error');
            if (errorEl) {
                errorEl.style.display = 'none';
            }
        });
    });
}

// =============================================================================
// VALIDATION & UTILITY FUNCTIONS
// =============================================================================

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + '-error');
    
    if (field) field.classList.add('error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.form-input').forEach(field => field.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach(error => {
        error.style.display = 'none';
        error.textContent = '';
    });
}

function showLoading(message) {
    isLoading = true;
    const loadingMsgEl = document.getElementById('loading-message');
    const loadingStateEl = document.getElementById('loading-state');
    
    if (loadingMsgEl) {
        loadingMsgEl.textContent = message;
    }
    if (loadingStateEl) {
        loadingStateEl.classList.remove('hidden');
    }
    
    document.querySelectorAll('input, button').forEach(el => el.disabled = true);
}

function hideLoading() {
    isLoading = false;
    const loadingStateEl = document.getElementById('loading-state');
    if (loadingStateEl) {
        loadingStateEl.classList.add('hidden');
    }
    
    document.querySelectorAll('input, button').forEach(el => el.disabled = false);
}

function showError(message) {
    const errorMsgEl = document.getElementById('error-message');
    const errorStateEl = document.getElementById('error-state');
    
    if (errorMsgEl) {
        errorMsgEl.innerHTML = message;
    }
    if (errorStateEl) {
        errorStateEl.classList.remove('hidden');
    }
}

function hideError() {
    const errorEl = document.getElementById('error-state');
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
}

function showSuccess(message) {
    const successMsgEl = document.getElementById('success-message');
    const successStateEl = document.getElementById('success-state');
    
    if (successMsgEl) {
        successMsgEl.innerHTML = message;
    }
    if (successStateEl) {
        successStateEl.classList.remove('hidden');
    }
}

function hideSuccess() {
    const successEl = document.getElementById('success-state');
    if (successEl) {
        successEl.classList.add('hidden');
    }
}
console.log('🔐 [Auth] OTP authentication system loaded');
