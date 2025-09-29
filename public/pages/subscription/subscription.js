// =============================================================================
// SUBSCRIPTION PAGE - PRODUCTION
// =============================================================================

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
// INITIALIZATION
// =============================================================================

console.log('📦 [Subscription] Module loaded');

window.addEventListener('oslira:timing:ready', () => {
    console.log('✅ [Subscription] Dependencies ready, initializing...');
    initializeSubscriptionPage();
});

async function initializeSubscriptionPage() {
    try {
        console.log('🔧 [Subscription] Starting initialization...');
        
        // Populate state from global objects
        subscriptionState.currentUser = window.OsliraApp.user;
        subscriptionState.currentSession = window.OsliraApp.session;
        subscriptionState.supabase = window.OsliraAuth.supabase();
        subscriptionState.config = window.OsliraConfig;
        
        // Initialize Stripe if available
        if (window.OsliraConfig?.STRIPE_PUBLIC_KEY && typeof Stripe !== 'undefined') {
            subscriptionState.stripe = Stripe(window.OsliraConfig.STRIPE_PUBLIC_KEY);
        }
        
        console.log('✅ [Subscription] Initialized:', subscriptionState.currentUser.email);
        
        // Initialize components
        setupAuthStateMonitoring();
        await loadSubscriptionData();
        setupEventListeners();
        await initializeSidebar();
        
    } catch (error) {
        console.error('❌ [Subscription] Initialization failed:', error);
        showErrorState('Failed to load subscription page. Please email support@oslira.com');
    }
}

async function initializeSidebar() {
    try {
        console.log('📋 [Subscription] Initializing sidebar...');
        
        // Wait for sidebar manager
        let attempts = 0;
        while (!window.sidebarManager && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.sidebarManager) {
            await window.sidebarManager.render('#sidebar-container');
            console.log('✅ [Subscription] Sidebar initialized');
        }
        
    } catch (error) {
        console.error('❌ [Subscription] Sidebar failed:', error);
    }
}

// =============================================================================
// DATA LOADING
// =============================================================================

async function loadSubscriptionData() {
    console.log('📊 [Subscription] Loading subscription data...');
    
    if (!subscriptionState.currentUser) {
        console.error('❌ [Subscription] No user found');
        return;
    }
    
    try {
        showLoading();
        
        // Fetch user profile
        const { data: profile, error: profileError } = await subscriptionState.supabase
            .from('users')
            .select('*')
            .eq('id', subscriptionState.currentUser.id)
            .single();
        
        if (profileError) throw profileError;
        
        // Fetch subscription
        const { data: subscription, error: subError } = await subscriptionState.supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', subscriptionState.currentUser.id)
            .maybeSingle();
        
        if (subError) console.error('❌ [Subscription] Subscription fetch error:', subError);
        
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
// UI UPDATES
// =============================================================================

function updateSubscriptionUI(profile, subscription) {
    console.log('🎨 [Subscription] Updating subscription UI...');
    
    const planInfo = {
        'free': { name: 'Free Plan', credits: '25', details: '25 monthly credits • Limited features' },
        'starter': { name: 'Starter Plan', credits: '100', details: '100 monthly credits • Basic features' },
        'professional': { name: 'Professional Plan', credits: '300', details: '300 monthly credits • Advanced features' },
        'agency': { name: 'Agency Plan', credits: '1000', details: '1000 monthly credits • Premium features' },
        'enterprise': { name: 'Enterprise Plan', credits: 'Unlimited', details: 'Unlimited credits • All features' }
    };
    
    const currentPlanInfo = planInfo[subscriptionState.currentPlan] || planInfo['free'];
    
    // Update plan name
    const planNameElement = document.getElementById('current-plan-name');
    if (planNameElement) planNameElement.textContent = currentPlanInfo.name;
    
    // Update plan details
    const planDetailsElement = document.getElementById('plan-details');
    if (planDetailsElement) planDetailsElement.textContent = currentPlanInfo.details;
    
    // Update sidebar plan
    const sidebarPlanElement = document.getElementById('sidebar-plan');
    if (sidebarPlanElement) sidebarPlanElement.textContent = currentPlanInfo.name;
    
    // Update billing info
    const sidebarBillingElement = document.getElementById('sidebar-billing');
    if (subscription && sidebarBillingElement) {
        const nextBilling = new Date(subscription.current_period_end);
        sidebarBillingElement.textContent = `Next billing: ${nextBilling.toLocaleDateString()}`;
    } else if (sidebarBillingElement) {
        sidebarBillingElement.textContent = 'Free plan - no billing';
    }
    
    // Update credits
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
}

function updatePricingCards(currentPlan) {
    console.log('🎨 [Subscription] Updating pricing cards for plan:', currentPlan);
    
    const pricingCards = document.querySelectorAll('.pricing-card');
    if (pricingCards.length === 0) {
        console.warn('⚠️ [Subscription] No pricing cards found in DOM');
        return;
    }
    
    pricingCards.forEach(card => {
        const cardPlan = card.getAttribute('data-plan');
        const button = card.querySelector('.card-button');
        
        if (!button) {
            console.warn('⚠️ [Subscription] Card missing button:', cardPlan);
            return;
        }
        
        // Remove existing badges
        const existingBadge = card.querySelector('.current-badge');
        if (existingBadge) existingBadge.remove();
        
        // Reset styling
        card.classList.remove('current-plan-card');
        
        if (cardPlan === currentPlan) {
            // Current plan styling
            card.classList.add('current-plan-card');
            
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
            // Non-current plan styling
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
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
    console.log('🎧 [Subscription] Setting up event listeners...');
    
    // Logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) logoutLink.addEventListener('click', handleLogout);
    
    // Manage billing
    const manageBillingBtn = document.getElementById('manage-billing-btn');
    if (manageBillingBtn) manageBillingBtn.addEventListener('click', handleManageBilling);
    
    // Plan buttons
    document.querySelectorAll('.card-button').forEach(button => {
        button.addEventListener('click', handlePlanSelection);
    });
    
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
        
        if (!response.ok) throw new Error('Failed to create portal session');
        
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
    
    console.log('💰 [Subscription] Plan selected:', plan);
    
    if (plan === 'enterprise') {
        window.open('mailto:sales@oslira.com?subject=Enterprise Plan Inquiry', '_blank');
        return;
    }
    
    if (plan === subscriptionState.currentPlan) {
        console.log('⚠️ [Subscription] User selected current plan');
        return;
    }
    
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Processing...';
    
    try {
        showLoading();
        await createCheckoutSession(plan);
    } catch (error) {
        console.error('❌ [Subscription] Plan selection failed:', error);
        showErrorModal('Failed to process subscription change. Please try again.');
    } finally {
        hideLoading();
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function createCheckoutSession(plan) {
    console.log('🛒 [Subscription] Creating checkout session for:', plan);
    
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
    
    if (!response.ok) throw new Error('Failed to create checkout session');
    
    const { sessionId } = await response.json();
    
    const { error } = await subscriptionState.stripe.redirectToCheckout({ sessionId });
    if (error) throw error;
}

function getPriceId(plan) {
    const priceIds = {
        'starter': 'price_starter_monthly',
        'professional': 'price_professional_monthly',
        'agency': 'price_agency_monthly'
    };
    return priceIds[plan];
}

// =============================================================================
// UI HELPERS
// =============================================================================

function showLoading() {
    subscriptionState.isLoading = true;
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    subscriptionState.isLoading = false;
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

function showErrorModal(message = 'There was an error processing your request.') {
    const modal = document.getElementById('error-modal');
    const messageElement = document.getElementById('error-message');
    
    if (messageElement) messageElement.textContent = message;
    if (modal) modal.classList.remove('hidden');
}

function showErrorState(message) {
    console.error('💥 [Subscription] Error state:', message);
    
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
                <button onclick="location.reload()" class="btn-primary">Reload Page</button>
            </div>
        `;
    }
}

// =============================================================================
// AUTH STATE MONITORING
// =============================================================================

function setupAuthStateMonitoring() {
    if (subscriptionState.supabase?.auth) {
        subscriptionState.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 [Subscription] Auth state change:', event);
            
            if (event === 'SIGNED_OUT') {
                window.location.href = '/auth';
            } else if (event === 'SIGNED_IN' && session) {
                subscriptionState.currentSession = session;
                subscriptionState.currentUser = session.user;
                loadSubscriptionData();
            }
        });
        console.log('✅ [Subscription] Auth state monitoring setup');
    }
}

// =============================================================================
// GLOBAL MODAL FUNCTIONS
// =============================================================================

window.closeErrorModal = function() {
    const modal = document.getElementById('error-modal');
    if (modal) modal.classList.add('hidden');
};

window.openLiveChat = function() {
    alert('Live chat coming soon! Please email support@oslira.com');
};

console.log('📦 [Subscription] Module ready');
