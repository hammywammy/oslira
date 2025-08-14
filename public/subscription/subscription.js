    <script src="https://js.stripe.com/v3/"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" crossorigin="anonymous"></script>

        // Global state
        let supabase = null;
        let currentUser = null;
        let currentSession = null;
        let stripe = null;
        let config = null;

        // Initialize page when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            initializePage();
            setupEventListeners();
        });

        // Set up all event listeners
        function setupEventListeners() {
            // Logout
            document.getElementById('logout-link').addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });

            // Manage billing button
            document.getElementById('manage-billing-btn').addEventListener('click', function(e) {
                e.preventDefault();
                manageBilling();
            });

            // Plan subscription buttons
            document.querySelectorAll('.card-button').forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    const card = this.closest('.pricing-card');
                    const plan = card.getAttribute('data-plan');
                    const priceText = card.querySelector('.card-price').textContent;
                    const price = parseInt(priceText.replace(/[^0-9]/g, ''));
                    subscribeToplan(plan, price, this);
                });
            });
        }

        // Initialize page
        async function initializePage() {
            try {
                // Wait for Supabase to be available
                let attempts = 0;
                while (typeof window.supabase === 'undefined' && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (typeof window.supabase === 'undefined') {
                    throw new Error('Supabase library not available');
                }

                // Get configuration from API
                config = window.OsliraApp.config;
                
                // Initialize Supabase client
                supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
                
                // Initialize Stripe
                if (config.stripePublishableKey) {
                    stripe = Stripe(config.stripePublishableKey);
                }
                
                // Check authentication
                await checkAuth();
                
                // Load user data
                await loadSubscriptionData();
                await loadBillingHistory();
                
                // Handle URL parameters
                handleUrlParams();

            } catch (error) {
                console.error('Page initialization failed:', error);
        // Add this:
        Alert.error('Page failed to load properly', {
            details: error.message,
            actions: [{ label: 'Refresh Page', action: 'reload' }],
            sticky: true
        });
            }
        }

async function loadConfigFromAPI() {
    const response = await fetch('/api/config');
    if (!response.ok) {
        throw new Error(`Config API returned ${response.status}`);
    }
    const configData = await response.json();
    if (configData.error) {
        Alert.error('Configuration failed to load', {
    message: 'Unable to connect to payment services',
    actions: [{ label: 'Refresh Page', action: 'reload' }],
    sticky: true
});
        throw new Error(configData.error);
    }
    return configData;
}

        // Authentication check
        async function checkAuth() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error || !session) {
                    window.location.href = 'auth.html';
                    return;
                }
                
                currentSession = session;
                currentUser = session.user;
                document.getElementById('user-email').textContent = currentUser.email;
                
            } catch (err) {
                console.error('Auth check failed:', err);
Alert.error('Authentication failed', {
    actions: [{ label: 'Go to Login', action: 'redirect:/auth.html' }]
});
            }
        }

function validatePaymentSetup() {
    // Add validation logic here
    if (!stripe) {
        Alert.error('Payment system not ready', {
            suggestions: ['Refresh the page', 'Check your connection'],
            actions: [{ label: 'Refresh', action: 'reload' }]
        });
        return false;
    }
    return true;
}

        // Load subscription data
        async function loadSubscriptionData() {
            try {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('subscription_plan, subscription_status, credits, billing_cycle_end')
                    .eq('id', currentUser.id)
                    .single();
                
                if (error) {
                    console.warn('User data not accessible:', error);
Alert.info({ 
    message: 'Showing default plan information',
    suggestions: ['Refresh the page to load your data']
});
updateUIWithPlan('free', 'active', 0, null);
                    return;
                }
                
                const plan = userData?.subscription_plan || 'free';
                const status = userData?.subscription_status || 'active';
                const credits = userData?.credits || 0;
                const billingEnd = userData?.billing_cycle_end;
                
                updateUIWithPlan(plan, status, credits, billingEnd);
                
            } catch (err) {
                console.error('Error loading subscription data:', err);
Alert.warning({ 
    message: 'Unable to load subscription details',
    suggestions: ['Page will show basic info', 'Refresh to retry']
});
updateUIWithPlan('free', 'active', 0, null);
            }
        }

        // Update UI with plan data
        function updateUIWithPlan(plan, status, credits, billingEnd) {
            const planNames = {
                free: 'Free Plan',
                starter: 'Starter Plan',
                growth: 'Growth Plan',
                professional: 'Professional Plan',
                enterprise: 'Enterprise Plan'
            };

            const planCredits = {
                free: 0,
                starter: 50,
                growth: 150,
                professional: 500,
                enterprise: 'Unlimited'
            };

            const planPrices = {
                free: 0,
                starter: 29,
                growth: 79,
                professional: 199,
                enterprise: 499
            };

            const planName = planNames[plan] || 'Free Plan';
            const planCredit = planCredits[plan] || 0;
            const planPrice = planPrices[plan] || 0;

            // Update current plan display
            document.getElementById('current-plan-name').textContent = planName;
            document.getElementById('sidebar-plan').textContent = planName;
            
            // Update plan details
            if (plan === 'free') {
                document.getElementById('plan-details').textContent = '0 monthly credits • Limited features';
                document.getElementById('subscription-info').innerHTML = '💡 <strong>Upgrade today</strong> to unlock unlimited lead analysis and advanced features';
            } else {
                const creditText = planCredit === 'Unlimited' ? 'Unlimited' : `${planCredit} monthly`;
                document.getElementById('plan-details').textContent = `${creditText} credits • Full features included`;
                
                if (billingEnd) {
                    const nextBilling = new Date(billingEnd).toLocaleDateString();
                    document.getElementById('subscription-info').innerHTML = `🔄 <strong>Next billing:</strong> ${nextBilling} • Auto-renewal enabled`;
                    document.getElementById('sidebar-billing').textContent = `Next billing: ${nextBilling}`;
                } else {
                    document.getElementById('subscription-info').innerHTML = '✅ <strong>Active subscription</strong> • Auto-renewal enabled';
                    document.getElementById('sidebar-billing').textContent = 'Active subscription';
                }
            }

            // Update billing info
            document.getElementById('billing-current-plan').textContent = planName;
            document.getElementById('monthly-cost').textContent = `${planPrice}.00`;
            
            if (billingEnd) {
                document.getElementById('next-billing-date').textContent = new Date(billingEnd).toLocaleDateString();
            } else {
                document.getElementById('next-billing-date').textContent = plan === 'free' ? 'No active subscription' : 'Contact support';
            }

            // Update credits display
            if (planCredit === 'Unlimited') {
                document.getElementById('credits-remaining').textContent = 'Unlimited';
            } else {
                document.getElementById('credits-remaining').textContent = `${credits} / ${planCredit}`;
            }

            // Update pricing cards
            updatePricingCards(plan);
        }

        // Update pricing cards to show current plan
        function updatePricingCards(currentPlan) {
            document.querySelectorAll('.pricing-card').forEach(card => {
                const cardPlan = card.getAttribute('data-plan');
                const button = card.querySelector('.card-button');
                
                // Remove existing badges
                const existingBadge = card.querySelector('.current-badge');
                if (existingBadge) existingBadge.remove();
                
                if (cardPlan === currentPlan) {
                    card.classList.add('current-plan-card');
                    
                    // Add current plan badge
                    const badge = document.createElement('div');
                    badge.className = 'current-badge';
                    badge.textContent = 'Current Plan';
                    card.appendChild(badge);
                    
                    button.textContent = 'Current Plan';
                    button.classList.add('current');
                    button.disabled = true;
                } else {
                    card.classList.remove('current-plan-card');
                    
                    button.classList.remove('current');
                    button.disabled = false;
                    
                    if (cardPlan === 'enterprise') {
                        button.textContent = 'Contact Sales';
                    } else {
                        button.textContent = currentPlan === 'free' ? 'Start Free Trial' : 'Switch Plan';
                    }
                }
            });
        }

        // Load billing history
        async function loadBillingHistory() {
            try {
                const { data: invoices, error } = await supabase
                    .from('billing_history')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                const historyTable = document.getElementById('billing-history');
                
                if (error) {
                    console.warn('Billing history not accessible:', error);
Alert.info({ 
    message: 'Billing history unavailable',
    suggestions: ['Try refreshing the page', 'Check with support']
});
                    historyTable.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                                No billing history yet. Subscribe to a plan to see your invoices here.
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                if (invoices && invoices.length > 0) {
                    historyTable.innerHTML = invoices.map(invoice => {
                        const date = new Date(invoice.created_at).toLocaleDateString();
                        const amount = `${(invoice.amount / 100).toFixed(2)}`;
                        const status = invoice.status || 'pending';
                        
                        let statusClass = 'status-pending';
                        if (status === 'paid') statusClass = 'status-paid';
                        if (status === 'failed') statusClass = 'status-failed';
                        
                        return `
                            <tr>
                                <td>${date}</td>
                                <td>${invoice.description || 'Monthly subscription'}</td>
                                <td>${amount}</td>
                                <td><span class="status-badge ${statusClass}">${status}</span></td>
                                <td>
                                    ${invoice.invoice_url ? 
                                        `<a href="${invoice.invoice_url}" target="_blank" style="color: var(--primary-blue);">View</a>` : 
                                        '-'
                                    }
                                </td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    historyTable.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                                No billing history yet. Subscribe to a plan to see your invoices here.
                            </td>
                        </tr>
                    `;
                }
                
            } catch (err) {
                console.error('Error loading billing history:', err);
                document.getElementById('billing-history').innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: var(--warning);">
                            Unable to load billing history
                        </td>
                    </tr>
                `;
            }
        }

        // Subscribe to plan - WITH CORRECT PRICE IDs
        async function subscribeToplan(plan, price, buttonElement) {
            if (plan === 'enterprise') {
                Alert.info({ 
    message: 'Enterprise plan inquiry',
    suggestions: ['Check your email client', 'You can also contact us directly'],
    actions: [{ label: 'Contact Support', action: 'redirect:/support' }]
});
window.open('mailto:support@oslira.com?subject=Enterprise%20Plan%20Inquiry&body=Please contact me to discuss pricing and features.', '_blank');
                return;
            }

            const button = buttonElement;
            const originalText = button.textContent;
            
            try {
                button.textContent = '🔄 Processing...';
                button.disabled = true;

                // Check authentication
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session) {
                    Alert.error('Login required to subscribe', {
    actions: [{ label: 'Go to Login', action: 'redirect:/auth.html' }]
});
                    window.location.href = 'auth.html';
                    return;
                }

                // YOUR ACTUAL STRIPE PRICE IDs
                const priceIds = {
                    starter: 'price_1RkCKjJzvcRSqGG3Hq4WNNSU',     // Starter: $29/month
                    growth: 'price_1RkCLGJzvcRSqGG3XqDyhYZN',      // Growth: $79/month  
                    professional: 'price_1RkCLtJzvcRSqGG30FfJSpau' // Professional: $199/month
                };

                const priceId = priceIds[plan];
                if (!priceId) {
                    Alert.error('Plan configuration error', {
    details: `Price ID not configured for plan: ${plan}`,
    actions: [{ label: 'Contact Support', action: 'redirect:/support' }]
});
throw new Error('Price ID not configured for plan: ' + plan);
                }

                console.log(`🔄 Creating subscription for ${plan} with price_id: ${priceId}`);

                // Create checkout session using your updated worker endpoint
                const response = await fetch(`${config.workerUrl}/billing/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        price_id: priceId,
                        customer_email: session.user.email,
                        success_url: `${window.location.origin}/subscription.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
                        cancel_url: `${window.location.origin}/subscription.html?canceled=true`,
                        metadata: {
                            user_id: session.user.id,
                            plan: plan
                        },
                        trial_period_days: 7
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('❌ Subscription creation failed:', errorData);
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('✅ Checkout session created:', data);
                
                if (!data.url) {
                   Alert.error('Payment setup failed', {
    message: 'Unable to create checkout session',
    suggestions: ['Try again in a moment', 'Check your internet connection'],
    actions: [{ label: 'Retry', action: 'retry' }]
});
throw new Error('No checkout URL received from server');
                }

                // Redirect to Stripe Checkout
                window.location.href = data.url;

            } catch (err) {
    console.error('❌ Subscription error:', err);
    showMessage('Subscription failed: ' + err.message, 'error');
    
    // Reset button with error handling
    try {
        button.textContent = originalText;
        button.disabled = false;
    } catch (error) {
        console.error('Button reset failed:', error);
        // Don't show alert for this - just log it
    }
}}

        // Manage billing
        async function manageBilling() {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session) {
                    Alert.error('Login required to manage billing', {
    actions: [{ label: 'Go to Login', action: 'redirect:/auth.html' }]
});
                    return;
                }

                console.log('🔄 Creating billing portal session...');

                const response = await fetch(`${config.workerUrl}/billing/create-portal-session`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customer_email: session.user.email,
                        return_url: window.location.href
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('❌ Portal creation failed:', errorData);
                    Alert.error('Payment service error', {
    details: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
    suggestions: ['Try again in a moment', 'Check your payment method'],
    actions: [{ label: 'Retry', action: 'retry' }]
});
throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('✅ Portal session created');
                
                if (!data.url) {
                    Alert.error('Billing portal unavailable', {
    message: 'Unable to create billing session',
    suggestions: ['Try again in a moment', 'Contact support'],
    actions: [{ label: 'Retry', action: 'retry' }]
});
throw new Error('No portal URL received from server');
                }

                // Redirect to Stripe Customer Portal
                window.location.href = data.url;

            } catch (err) {
                console.error('❌ Billing portal error:', err);
                Alert.error('Unable to access billing portal', {
    details: err.message,
    suggestions: [
        'Try refreshing the page',
        'Check your internet connection',
        'Contact support if issue continues'
    ],
    actions: [{ label: 'Try Again', action: 'retry' }]
});
            }
        }

        // Handle URL parameters
        function handleUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            
            if (urlParams.get('success') === 'true') {
                Alert.success({ 
    message: 'Subscription activated! Welcome to your new plan.',
    timeoutMs: 6000
});
                window.history.replaceState({}, document.title, window.location.pathname);
                setTimeout(async () => {
                    await loadSubscriptionData();
                    await loadBillingHistory();
                }, 1000);
            }
            
            if (urlParams.get('canceled') === 'true') {
                Alert.info({ 
    message: 'Subscription setup was canceled',
    suggestions: ['No charges were made', 'You can try again anytime']
});
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        // Show message function
        function showMessage(text, type = 'success') {
    // Legacy support - redirect to Alert system
    if (type === 'error') {
        Alert.error(text);
    } else if (type === 'success') {
        Alert.success({ message: text });
    } else if (type === 'warning') {
        Alert.warning({ message: text });
    } else {
        Alert.info({ message: text });
    }
}

function checkNetworkAndRetry(operation, operationName) {
    if (!navigator.onLine) {
        Alert.error('No internet connection', {
            suggestions: ['Check your internet connection', 'Try again when connected'],
            actions: [{ label: 'Retry', action: 'retry' }]
        });
        return;
    }
    
    operation().catch(error => {
        Alert.error(`${operationName} failed`, {
            details: error.message,
            suggestions: ['Check your connection', 'Try again in a moment'],
            actions: [{ label: 'Retry', action: 'retry' }]
        });
    });
}

        // Logout function
        function logout() {
            if (supabase) {
                supabase.auth.signOut().then(() => {
                    window.location.href = 'auth.html';
                });
            }
        }

        // Listen for auth changes
        window.addEventListener('load', () => {
            if (supabase) {
                supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
        Alert.info({ 
            message: 'You have been signed out',
            actions: [{ label: 'Go to Login', action: 'redirect:/auth.html' }]
        });
    }
});
            }
        });
