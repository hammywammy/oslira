// =============================================================================
// SUBSCRIPTION PAGE JAVASCRIPT - PRODUCTION READY
// Matches architecture patterns from homepage and dashboard
// =============================================================================

// Global state management
let subscriptionState = {
    currentUser: null,
    currentSession: null,
    currentPlan: 'free',
    isLoading: false,
    stripe: null,
    supabase: null,
    config: null
};

// =============================================================================
// PAGE INITIALIZATION - FOLLOWS SCRIPT-LOADER PATTERN
// =============================================================================

console.log('📦 [Subscription] Module executing...');

// Single initialization point
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSubscriptionPage);
} else {
    initializeSubscriptionPage();
}

async function initializeSubscriptionPage() {
    try {
        console.log('🔧 [Subscription] Starting initialization...');
        
        await waitForDependencies();
        
        subscriptionState.currentUser = window.OsliraSimpleApp.user;
        subscriptionState.currentSession = window.OsliraSimpleApp.session;
        subscriptionState.supabase = window.OsliraAuth.supabase();
        subscriptionState.config = window.OsliraConfig;
        
        if (window.OsliraConfig?.STRIPE_PUBLIC_KEY && typeof Stripe !== 'undefined') {
            subscriptionState.stripe = Stripe(window.OsliraConfig.STRIPE_PUBLIC_KEY);
        }
        
        console.log('✅ [Subscription] Initialized:', subscriptionState.currentUser.email);
        
        setupAuthStateMonitoring();
        await loadSubscriptionData();
        setupEventListeners();
        await initializeSidebar();
        initializeUI();
        
    } catch (error) {
        console.error('❌ [Subscription] Initialization failed:', error);
        showErrorState('Failed to load subscription page. Please email support@oslira.com');
    }
}
async function initializeSidebar() {
    try {
        console.log('📋 [Subscription] Initializing modular sidebar...');
        
        // Wait for sidebarManager to be available
        for (let i = 0; i < 50; i++) {
            if (window.sidebarManager) {
                console.log('✅ [Subscription] SidebarManager found');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!window.sidebarManager) {
            console.warn('⚠️ [Subscription] SidebarManager not available after waiting, skipping sidebar');
            return;
        }
        
        // Render sidebar with correct selector
        await window.sidebarManager.render('#sidebar-container');
        
        console.log('✅ [Subscription] Sidebar initialized successfully');
        
    } catch (error) {
        console.error('❌ [Subscription] Sidebar initialization failed:', error);
        // Don't throw - subscription page can work without sidebar
    }
}

// =============================================================================
// DEPENDENCY MANAGEMENT - MATCHES HOMEPAGE PATTERN
// =============================================================================

async function waitForDependencies() {
    console.log('⏳ [Subscription] Waiting for dependencies...');
    
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.OsliraSimpleApp?.user && window.OsliraAuth?.supabase) {
            console.log('✅ [Subscription] Dependencies loaded');
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('OsliraSimpleApp or OsliraAuth not available');
}

// =============================================================================
// SUBSCRIPTION DATA LOADING
// =============================================================================

async function loadSubscriptionData() {
    console.log('📊 [Subscription] Loading subscription data...');
    
    if (!subscriptionState.currentUser) {
        console.error('❌ [Subscription] No user found for data loading');
        return;
    }
    
    try {
        showLoading();
        
        // Fetch user subscription data from database
        const { data: profile, error: profileError } = await subscriptionState.supabase
            .from('profiles')
            .select('*')
            .eq('id', subscriptionState.currentUser.id)
            .single();
            
        if (profileError) {
            console.error('❌ [Subscription] Profile fetch error:', profileError);
            throw profileError;
        }
        
        // Fetch subscription details
        const { data: subscription, error: subError } = await subscriptionState.supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', subscriptionState.currentUser.id)
            .single();
            
        if (subError && subError.code !== 'PGRST116') { // Not found is OK for free users
            console.error('❌ [Subscription] Subscription fetch error:', subError);
        }
        
        // Update state and UI
        subscriptionState.currentPlan = subscription?.plan_name || 'free';
        
        updateSubscriptionUI(profile, subscription);
        updatePricingCards(subscriptionState.currentPlan);
        
        console.log('✅ [Subscription] Data loaded successfully');
        
    } catch (error) {
        console.error('❌ [Subscription] Data loading failed:', error);
        showErrorState('Failed to load subscription data');
    } finally {
        hideLoading();
    }
}

// =============================================================================
// UI UPDATE FUNCTIONS
// =============================================================================

function updateUserInfo(user) {
    console.log('👤 [Subscription] Updating user info...');
    
    const emailElement = document.getElementById('user-email');
    if (emailElement) {
        emailElement.textContent = user.email;
    }
}

function updateSubscriptionUI(profile, subscription) {
    console.log('🎨 [Subscription] Updating subscription UI...');
    
    // Update current plan display
    const planNameElement = document.getElementById('current-plan-name');
    const planDetailsElement = document.getElementById('plan-details');
    const subscriptionInfoElement = document.getElementById('subscription-info');
    const sidebarPlanElement = document.getElementById('sidebar-plan');
    const sidebarBillingElement = document.getElementById('sidebar-billing');
    
    // Plan information mapping
    const planInfo = {
        'free': {
            name: 'Free Plan',
            credits: '25',
            details: '25 monthly credits • Limited features',
            info: '💡 <strong>Upgrade today</strong> to unlock unlimited lead analysis and advanced features'
        },
        'starter': {
            name: 'Starter Plan',
            credits: '100',
            details: '100 monthly credits • Basic features',
            info: '🚀 You\'re on the <strong>Starter Plan</strong> with full access to basic features'
        },
        'professional': {
            name: 'Professional Plan',
            credits: '300',
            details: '300 monthly credits • Advanced features',
            info: '⭐ You\'re on the <strong>Professional Plan</strong> with advanced lead intelligence'
        },
        'agency': {
            name: 'Agency Plan',
            credits: '1000',
            details: '1000 monthly credits • Premium features',
            info: '🎯 You\'re on the <strong>Agency Plan</strong> with premium team collaboration features'
        },
        'enterprise': {
            name: 'Enterprise Plan',
            credits: 'Unlimited',
            details: 'Unlimited credits • All features',
            info: '🏢 You\'re on the <strong>Enterprise Plan</strong> with unlimited access'
        }
    };
    
    const currentPlanInfo = planInfo[subscriptionState.currentPlan] || planInfo['free'];
    
    if (planNameElement) {
        planNameElement.textContent = currentPlanInfo.name;
    }
    
    if (planDetailsElement) {
        planDetailsElement.textContent = currentPlanInfo.details;
    }
    
    if (subscriptionInfoElement) {
        subscriptionInfoElement.innerHTML = currentPlanInfo.info;
    }
    
    if (sidebarPlanElement) {
        sidebarPlanElement.textContent = currentPlanInfo.name;
    }
    
    // Update billing info
    if (subscription && sidebarBillingElement) {
        const nextBilling = new Date(subscription.current_period_end);
        sidebarBillingElement.textContent = `Next billing: ${nextBilling.toLocaleDateString()}`;
    } else if (sidebarBillingElement) {
        sidebarBillingElement.textContent = 'Free plan - no billing';
    }
    
    // Update credits display
    const creditsElement = document.getElementById('credits-remaining');
    if (creditsElement) {
        const usedCredits = profile?.credits_used || 0;
        const totalCredits = currentPlanInfo.credits;
        
        if (totalCredits === 'Unlimited') {
            creditsElement.textContent = 'Unlimited';
        } else {
            const remaining = Math.max(0, parseInt(totalCredits) - usedCredits);
            creditsElement.textContent = `${remaining} / ${totalCredits}`;
        }
    }
    
    // Update other billing info
    updateBillingInfo(subscription);
}

function updateBillingInfo(subscription) {
    console.log('💳 [Subscription] Updating billing info...');
    
    // Update payment method (placeholder - would come from Stripe)
    const paymentMethodElement = document.getElementById('payment-method');
    if (paymentMethodElement && subscription) {
        paymentMethodElement.textContent = '•••• 4242';
    }
    
    // Update next billing date
    const nextBillingElement = document.getElementById('next-billing-date');
    if (nextBillingElement && subscription) {
        const nextBilling = new Date(subscription.current_period_end);
        nextBillingElement.textContent = nextBilling.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Update monthly spend
    const monthlySpendElement = document.getElementById('monthly-spend');
    if (monthlySpendElement && subscription) {
        const planPrices = {
            'starter': '$15.00',
            'professional': '$30.00',
            'agency': '$80.00',
            'enterprise': 'Custom'
        };
        monthlySpendElement.textContent = planPrices[subscription.plan_name] || '$0.00';
    }
}

function updatePricingCards(currentPlan) {
    console.log('🎨 [Subscription] Updating pricing cards for plan:', currentPlan);
    
    document.querySelectorAll('.pricing-card').forEach(card => {
        const cardPlan = card.getAttribute('data-plan');
        const button = card.querySelector('.card-button');
        
        // Remove existing badges
        const existingBadge = card.querySelector('.current-badge');
        if (existingBadge) existingBadge.remove();
        
        // Reset card styling
        card.classList.remove('current-plan-card');
        
        if (cardPlan === currentPlan) {
            card.classList.add('current-plan-card');
            
            // Add current plan badge
            const badge = document.createElement('div');
            badge.className = 'current-badge absolute -top-2 -right-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10';
            badge.textContent = 'Current Plan';
            card.appendChild(badge);
            
            button.textContent = 'Current Plan';
            button.classList.add('current');
            button.disabled = true;
            button.classList.remove('btn-primary');
            button.classList.add('bg-gray-300', 'text-gray-600', 'cursor-not-allowed');
        } else {
            button.classList.remove('current', 'bg-gray-300', 'text-gray-600', 'cursor-not-allowed');
            button.classList.add('btn-primary');
            button.disabled = false;
            
            if (cardPlan === 'enterprise') {
                button.textContent = 'Contact Sales';
            } else {
                const upgradePhrases = {
                    'starter': currentPlan === 'free' ? 'Start Free Trial' : 'Downgrade to Starter',
                    'professional': 'Upgrade to Professional',
                    'agency': 'Upgrade to Agency'
                };
                button.textContent = upgradePhrases[cardPlan] || `Choose ${cardPlan.charAt(0).toUpperCase() + cardPlan.slice(1)}`;
            }
        }
    });
}

// =============================================================================
// EVENT LISTENERS SETUP
// =============================================================================

function setupEventListeners() {
    console.log('🎧 [Subscription] Setting up event listeners...');
    
    // Logout functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Manage billing button
    const manageBillingBtn = document.getElementById('manage-billing-btn');
    if (manageBillingBtn) {
        manageBillingBtn.addEventListener('click', handleManageBilling);
    }
    
    // Plan subscription buttons
    document.querySelectorAll('.card-button').forEach(button => {
        button.addEventListener('click', handlePlanSelection);
    });
    
    // Sidebar toggle (if exists)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    console.log('✅ [Subscription] Event listeners set up');
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleLogout(e) {
    e.preventDefault();
    console.log('🚪 [Subscription] Logging out...');
    
    try {
        showLoading();
        
        const { error } = await subscriptionState.supabase.auth.signOut();
        
        if (error) {
            console.error('❌ [Subscription] Logout error:', error);
            showErrorModal('Failed to log out. Please try again.');
            return;
        }
        
        console.log('✅ [Subscription] Logged out successfully');
        window.location.href = '/';
        
    } catch (error) {
        console.error('❌ [Subscription] Logout failed:', error);
        showErrorModal('Failed to log out. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handleManageBilling(e) {
    e.preventDefault();
    console.log('💳 [Subscription] Opening billing management...');
    
    try {
        showLoading();
        
        // Call your backend to create a Stripe customer portal session
        const response = await fetch('/api/create-portal-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${subscriptionState.currentSession.access_token}`
            },
            body: JSON.stringify({
                customer_id: subscriptionState.currentUser.id
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create portal session');
        }
        
        const { url } = await response.json();
        window.location.href = url;
        
    } catch (error) {
        console.error('❌ [Subscription] Billing management failed:', error);
        showErrorModal('Unable to open billing management. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handlePlanSelection(e) {
    e.preventDefault();
    
    const button = e.target;
    const card = button.closest('.pricing-card');
    const plan = card.getAttribute('data-plan');
    const price = card.getAttribute('data-price');
    
    console.log('💰 [Subscription] Plan selected:', plan, 'Price:', price);
    
    // Disable button during processing
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Processing...';
    
    try {
        if (plan === 'enterprise') {
            // Handle enterprise contact
            window.open('mailto:sales@oslira.com?subject=Enterprise Plan Inquiry', '_blank');
            return;
        }
        
        if (plan === subscriptionState.currentPlan) {
            console.log('⚠️ [Subscription] User selected current plan');
            return;
        }
        
        showLoading();
        
        // Create checkout session
        await createCheckoutSession(plan, price);
        
    } catch (error) {
        console.error('❌ [Subscription] Plan selection failed:', error);
        showErrorModal('Failed to process subscription change. Please try again.');
    } finally {
        hideLoading();
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function createCheckoutSession(plan, price) {
    console.log('🛒 [Subscription] Creating checkout session for:', plan);
    
    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${subscriptionState.currentSession.access_token}`
            },
            body: JSON.stringify({
                plan_name: plan,
                price_id: getPriceId(plan),
                customer_email: subscriptionState.currentUser.email
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }
        
        const { sessionId } = await response.json();
        
        // Redirect to Stripe Checkout
        const { error } = await subscriptionState.stripe.redirectToCheckout({
            sessionId: sessionId
        });
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('❌ [Subscription] Checkout session creation failed:', error);
        throw error;
    }
}

function getPriceId(plan) {
    // Map plan names to Stripe price IDs (these would be from your config)
    const priceIds = {
        'starter': 'price_starter_monthly',
        'professional': 'price_professional_monthly',
        'agency': 'price_agency_monthly'
    };
    
    return priceIds[plan];
}

function toggleSidebar() {
    console.log('📱 [Subscription] Toggling sidebar...');
    
    const sidebar = document.getElementById('dashboard-sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('sidebar-collapsed');
    }
}

// =============================================================================
// UI HELPER FUNCTIONS
// =============================================================================

function initializeUI() {
    console.log('🎨 [Subscription] Initializing UI components...');
    
    // Initialize any tooltips, dropdowns, etc.
    initializeTooltips();
    
    // Setup responsive behavior
    setupResponsiveBehavior();
    
    console.log('✅ [Subscription] UI components initialized');
}

function initializeTooltips() {
    // Add tooltip functionality if needed
    console.log('💡 [Subscription] Tooltips initialized');
}

function setupResponsiveBehavior() {
    // Handle mobile-specific behavior
    const handleResize = () => {
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // Mobile-specific adjustments
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
}

// =============================================================================
// LOADING AND ERROR STATES
// =============================================================================

function showLoading() {
    if (!subscriptionState.isLoading) {
        subscriptionState.isLoading = true;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
    }
}

function hideLoading() {
    if (subscriptionState.isLoading) {
        subscriptionState.isLoading = false;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
}

function showSuccessModal(message = 'Operation completed successfully!') {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function showErrorModal(message = 'There was an error processing your request. Please try again.') {
    const modal = document.getElementById('error-modal');
    const messageElement = document.getElementById('error-message');
    
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function showErrorState(message) {
    console.error('💥 [Subscription] Error state:', message);
    
    // Show error in UI
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="glass-effect rounded-2xl p-8 text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h2>
                <p class="text-gray-600 mb-6">${message}</p>
                <button onclick="location.reload()" class="btn-primary">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// =============================================================================
// MODAL CLOSE FUNCTIONS (Global scope for onclick handlers)
// =============================================================================

window.closeSuccessModal = function() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // Reload page to show updated data
    location.reload();
};

window.closeErrorModal = function() {
    const modal = document.getElementById('error-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.openLiveChat = function() {
    // Placeholder for live chat integration
    alert('Live chat feature coming soon! Please email support@oslira.com for immediate assistance.');
};

// =============================================================================
// AUTHENTICATION STATE MONITORING
// =============================================================================

// Monitor auth state changes
function setupAuthStateMonitoring() {
    // Use the supabase instance from subscriptionState, not window.supabase directly
    if (subscriptionState.supabase && subscriptionState.supabase.auth) {
        subscriptionState.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 [Subscription] Auth state change:', event, session?.user?.email);
            
            if (event === 'SIGNED_OUT') {
                window.location.href = '/auth';
            } else if (event === 'SIGNED_IN' && session) {
                subscriptionState.currentSession = session;
                subscriptionState.currentUser = session.user;
                loadSubscriptionData();
            }
        });
        console.log('✅ [Subscription] Auth state monitoring setup');
    } else {
        console.warn('⚠️ [Subscription] Cannot setup auth monitoring - supabase not available');
    }
}

// =============================================================================
// EXPORT FOR TESTING (if needed)
// =============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        subscriptionState,
        initializeSubscriptionPage,
        updatePricingCards,
        formatCurrency,
        formatDate
    };
}

console.log('📦 [Subscription] JavaScript module loaded successfully');
