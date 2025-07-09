// Initialize Supabase
const supabaseUrl = 'https://jswzzihuqtjqvobfosks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzd3p6aWh1cXRqcXZvYmZvc2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMjQxMzUsImV4cCI6MjA2NzYwMDEzNX0.XMoC3iLcDbKNxPfhTHj8CQsEjelTIrivIddfPTO9P64';
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
// Update credit count
async function updateCreditCount(change) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get current credits
        const { data: currentData } = await supabase
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single();
        
        const newCredits = currentData.credits + change;
        
        // Update credits
        const { error } = await supabase
            .from('users')
            .update({ credits: newCredits })
            .eq('id', user.id);
        
        if (!error) {
            // Update UI
            document.querySelectorAll('#credit-count').forEach(el => {
                el.textContent = newCredits + ' credits';
            });
        }
    } catch (error) {
        console.error('Error updating credits:', error);
    }
}

// Activity feed updates (for landing page)
function updateActivityFeed() {
    const activities = [
        "🔥 Sarah from NYC just booked 3 meetings",
        "⚡ Mike analyzed 127 profiles in 4 minutes",
        "💰 Tech Startup closed $50k deal from AI outreach",
        "🚀 Emma got 89% response rate on her campaign",
        "📈 David's lead score improved by 45 points",
        "✨ Lisa found 23 perfect leads in her niche",
        "🎯 StartupCo booked demo with dream client",
        "💪 Agency scaled to 200 leads per day"
    ];
    
    const feedElement = document.getElementById('activity-feed');
    if (feedElement) {
        setInterval(() => {
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            const newItem = document.createElement('div');
            newItem.className = 'feed-item';
            newItem.textContent = randomActivity;
            
            feedElement.insertBefore(newItem, feedElement.firstChild);
            
            if (feedElement.children.length > 3) {
                feedElement.removeChild(feedElement.lastChild);
            }
        }, 5000);
    }
}

// Handle demo on landing page
function analyzeDemo() {
    const url = document.getElementById('demo-url').value;
    if (url) {
        // Store demo URL in session storage
        sessionStorage.setItem('demoUrl', url);
        window.location.href = '/auth.html';
    }
}

// Lead research functions
async function researchRelated(username) {
    document.getElementById('lead-url').value = `https://instagram.com/${username}`;
    researchLead();
}

function viewLead(username) {
    window.location.href = `/leads.html?lead=${username}`;
}

// Load leads pipeline
async function loadLeadsPipeline() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (leads) {
            const tbody = document.getElementById('leads-tbody');
            tbody.innerHTML = '';
            
            leads.forEach(lead => {
                const row = createLeadRow(lead);
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading leads:', error);
    }
}

function createLeadRow(lead) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>
            <div class="mini-profile">
                <img src="${lead.avatar_url || '/default-avatar.png'}" class="mini-avatar">
                <div>
                    <strong>${lead.username}</strong>
                    <br>
                    <small>${lead.bio_snippet}</small>
                </div>
            </div>
        </td>
        <td><span class="score-badge">${lead.score}</span></td>
        <td><span class="status ${lead.status}">${lead.status}</span></td>
        <td>${formatDate(lead.last_action)}</td>
        <td>${lead.responded ? 'Yes' : 'No'}</td>
        <td>${lead.notes || '-'}</td>
        <td>
            <button onclick="viewLeadDetails('${lead.id}')">View</button>
            <button onclick="sendMessage('${lead.id}')">Send</button>
        </td>
    `;
    return tr;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) {
        return Math.floor(diff / 60000) + ' minutes ago';
    } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + ' hours ago';
    } else {
        return Math.floor(diff / 86400000) + ' days ago';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateActivityFeed();
    
    // Load page-specific data
    if (window.location.pathname.includes('leads.html')) {
        loadLeadsPipeline();
    }
});
//
