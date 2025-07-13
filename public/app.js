// Add this at the very top to properly destructure createClient
const { createClient } = window.supabase || {};

// Initialize Supabase
const { createClient } = window.supabase || {};
const supabaseUrl = CONFIG.supabaseUrl;
const supabaseKey = CONFIG.supabaseKey;
const supabaseClient = createClient ? createClient(supabaseUrl, supabaseKey) : null;

// Check authentication on protected pages
async function checkAuth() {
    if (!supabaseClient) {
        console.error('Supabase client not initialized');
        return;
    }
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // List of public pages that don't require auth
    const publicPages = ['/', '/index.html', '/auth.html', '/legal/terms.html', '/legal/privacy.html', '/legal/refund.html'];
    const currentPath = window.location.pathname;
    
    // Check if current page is protected and user is not authenticated
    if (!user && !publicPages.some(page => currentPath.includes(page))) {
        window.location.href = '/auth.html';
        return;
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
        if (!supabaseClient) return;
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data, error } = await supabaseClient
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single();
        
        if (data) {
            document.querySelectorAll('#credit-count').forEach(el => {
                el.textContent = data.credits + ' credits';
            });
            
            // Also update any balance displays
            const balanceDisplay = document.getElementById('balance-display');
            if (balanceDisplay) {
                balanceDisplay.textContent = data.credits;
            }
        }
    } catch (error) {
        console.error('Error loading credits:', error);
    }
}

// Logout function
async function logout() {
    if (!supabaseClient) return;
    
    await supabaseClient.auth.signOut();
    window.location.href = '/';
}

// Update credit count
async function updateCreditCount(change) {
    try {
        if (!supabaseClient) return;
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // Get current credits
        const { data: currentData } = await supabaseClient
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single();
        
        const newCredits = currentData.credits + change;
        
        // Update credits
        const { error } = await supabaseClient
            .from('users')
            .update({ credits: newCredits })
            .eq('id', user.id);
        
        if (!error) {
            // Update UI
            document.querySelectorAll('#credit-count').forEach(el => {
                el.textContent = newCredits + ' credits';
            });
            
            // Update balance display if exists
            const balanceDisplay = document.getElementById('balance-display');
            if (balanceDisplay) {
                balanceDisplay.textContent = newCredits;
            }
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

// Upload CSV function
function uploadCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // In production, this would parse CSV and process leads
            alert('CSV upload functionality coming soon!');
        }
    };
    input.click();
}

// Load leads pipeline
async function loadLeadsPipeline() {
    try {
        if (!supabaseClient) return;
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const { data: leads, error } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (leads && leads.length > 0) {
            const tbody = document.getElementById('leads-tbody');
            if (tbody) {
                tbody.innerHTML = '';
                
                leads.forEach(lead => {
                    const row = createLeadRow(lead);
                    tbody.appendChild(row);
                });
            }
        } else {
            // Show empty state
            const tbody = document.getElementById('leads-tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No leads yet. Start by researching a profile above!</td></tr>';
            }
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
                <img src="${lead.avatar_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTIwIDIyQzIzLjMxMzcgMjIgMjYgMTkuMzEzNyAyNiAxNkMyNiAxMi42ODYzIDIzLjMxMzcgMTAgMjAgMTBDMTYuNjg2MyAxMCAxNCAxMi42ODYzIDE0IDE2QzE0IDE5LjMxMzcgMTYuNjg2MyAyMiAyMCAyMloiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTEwIDMzQzEwIDI4LjU4MTcgMTQuNTgxNyAyNSAyMCAyNUMyNS40MTgzIDI1IDMwIDI4LjU4MTcgMzAgMzNWNDBIMTBWMzNaIiBmaWxsPSIjOUNBNEFGIi8+Cjwvc3ZnPg=='}" class="mini-avatar">
                <div>
                    <strong>${lead.username}</strong>
                    <br>
                    <small>${lead.bio_snippet || 'No bio available'}</small>
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

// View lead details
function viewLeadDetails(leadId) {
    // In production, this would open a modal or navigate to lead detail page
    console.log('Viewing lead:', leadId);
}

// Send message to lead
function sendMessage(leadId) {
    // In production, this would open message composer
    console.log('Sending message to lead:', leadId);
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
    // Only run auth check if Supabase is loaded
    if (window.supabase && createClient) {
        checkAuth();
    }
    
    // Always run these regardless of auth
    updateActivityFeed();
    
    // Load page-specific data
    if (window.location.pathname.includes('leads.html')) {
        loadLeadsPipeline();
    }
});
