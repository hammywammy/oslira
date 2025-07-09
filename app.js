// Initialize Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Check authentication on protected pages
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user && !window.location.pathname.includes('auth.html') && !window.location.pathname.includes('terms') && !window.location.pathname.includes('privacy') && !window.location.pathname.includes('refund')) {
        window.location.href = '/auth.html';
    }
    
    if (user) {
        // Update UI with user info
        const emailElements = document.querySelectorAll('#user-email');
        emailElements.forEach(el => el.textContent = user.email);
        
        // Load credit balance
        loadCreditBalance();
    }
}

// Load credit balance
async function loadCreditBalance() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single();
        
        if (data) {
            document.querySelectorAll('#credit-count').forEach(el => {
                el.textContent = data.credits + ' credits';
            });
        }
    } catch (error) {
        console.error('Error loading credits:', error);
    }
}

// Logout function
async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
}

//
