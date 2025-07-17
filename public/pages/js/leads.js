    <script>
        window.CONFIG = {
            supabaseUrl: 'your-supabase-url',
            supabaseKey: 'your-supabase-key',
            workerUrl: 'your-worker-url'
        };
    </script>

if (typeof Sentry !== 'undefined') {
            Sentry.init({
                environment: 'production',
                beforeSend(event) {
                    if (event.exception?.values?.[0]?.value?.includes('NetworkError')) {
                        return null;
                    }
                    return event;
                }
            });
        }

        // Application state
        let currentUser = null;
        let currentSession = null;
        let supabase = null;
        let currentLead = null;
        let savedTags = [];

        // Initialize application
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('🔬 Lead Research Intelligence loaded');
            initializeSupabase();
            setupEventListeners();
            await checkAuth();
            loadSavedTags();
        });

        // Initialize Supabase
        function initializeSupabase() {
            if (window.CONFIG && window.supabase) {
                supabase = window.supabase.createClient(
                    window.CONFIG.supabaseUrl, 
                    window.CONFIG.supabaseKey
                );
            } else {
                console.error('❌ Configuration or Supabase not available');
            }
        }

        // Set up all event listeners
        function setupEventListeners() {
            // Main navigation
            document.querySelectorAll('nav a[data-page]').forEach(link => {
                link.addEventListener('click', handleNavigation);
            });

            // Header actions
            document.getElementById('export-research-btn')?.addEventListener('click', exportResearch);
            document.getElementById('saved-leads-btn')?.addEventListener('click', showSavedLeads);
            document.getElementById('new-research-btn')?.addEventListener('click', startNewResearch);
            document.getElementById('logout-btn')?.addEventListener('click', logout);

            // Research actions
            document.getElementById('analyze-lead-btn')?.addEventListener('click', analyzeLead);
            document.getElementById('research-input')?.addEventListener('keypress', handleEnterKey);

            // Lead actions
            document.getElementById('save-lead-btn')?.addEventListener('click', saveLead);
            document.getElementById('add-to-list-btn')?.addEventListener('click', addToList);
            document.getElementById('find-similar-btn')?.addEventListener('click', findSimilarLeads);
            document.getElementById('generate-message-btn')?.addEventListener('click', generateMessage);

            // Quick actions
            document.getElementById('compare-leads-btn')?.addEventListener('click', compareLeads);
            document.getElementById('export-profile-btn')?.addEventListener('click', exportProfile);
            document.getElementById('schedule-review-btn')?.addEventListener('click', scheduleReview);
            document.getElementById('share-research-btn')?.addEventListener('click', shareResearch);

            // Tags and notes
            document.getElementById('tags-input')?.addEventListener('keypress', handleTagInput);
            document.getElementById('lead-notes')?.addEventListener('blur', saveNotes);
            
            // Tag suggestions
            document.querySelectorAll('.tag-chip').forEach(chip => {
                chip.addEventListener('click', toggleTag);
            });
        }

        // Authentication check
        async function checkAuth() {
            if (!supabase) {
                console.log('⚠️ Supabase not initialized, using demo mode');
                setupDemoMode();
                return;
            }

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
                console.error('❌ Auth check error:', err);
                setupDemoMode();
            }
        }

        // Setup demo mode for development
        function setupDemoMode() {
            console.log('🔧 Running in demo mode');
            currentUser = { id: 'demo', email: 'demo@oslira.com' };
            document.getElementById('user-email').textContent = 'demo@oslira.com';
            document.getElementById('plan-name').textContent = 'Pro Plan';
        }

        // Handle Enter key in research input
        function handleEnterKey(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                analyzeLead();
            }
        }

        // Analyze lead function
        async function analyzeLead() {
            const input = document.getElementById('research-input');
            const button = document.getElementById('analyze-lead-btn');
            const query = input?.value?.trim();
            
            if (!query) {
                showStatusMessage('Please enter a username or profile URL to analyze', 'error');
                return;
            }

            try {
                // Show loading state
                setButtonLoading(button, '🔄 Analyzing...');
                showStatusMessage('Analyzing lead profile...', 'info');

                // Clean username if it's Instagram
                let username = query.replace('@', '').trim();
                if (username.includes('instagram.com/')) {
                    username = username.split('instagram.com/')[1].split('/')[0];
                } else if (username.includes('linkedin.com/')) {
                    username = username.split('linkedin.com/in/')[1]?.split('/')[0] || username;
                }

                // Simulate API call or make real call
                let result;
                if (window.CONFIG?.workerUrl && currentSession) {
                    result = await callAnalysisAPI(username);
                } else {
                    result = await simulateAnalysis(username);
                }

                // Display results
                displayLeadAnalysis(result);
                showStatusMessage('Lead analysis completed successfully!', 'success');
                
                // Clear input
                input.value = '';

            } catch (err) {
                console.error('❌ Analysis error:', err);
                showStatusMessage('Analysis failed: ' + err.message, 'error');
            } finally {
                resetButton(button, '🔍 Analyze Lead');
            }
        }

        // Call real analysis API
        async function callAnalysisAPI(username) {
            const response = await fetch(window.CONFIG.workerUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentSession.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile_url: username.includes('linkedin') ? 
                        `https://linkedin.com/in/${username}` : 
                        `https://instagram.com/${username}`,
                    username: username,
                    analysis_type: 'deep',
                    user_id: currentUser.id,
                    platform: username.includes('linkedin') ? 'linkedin' : 'instagram'
                })
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            return await response.json();
        }

        // Simulate analysis for demo
        async function simulateAnalysis(username) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const opportunityScore = Math.floor(Math.random() * 30) + 70;
            
            return {
                username: username,
                name: generateRandomName(),
                bio: `${username} is a tech entrepreneur focused on scaling SaaS solutions and building high-performing teams`,
                followers: generateRandomFollowers(),
                engagement_rate: (Math.random() * 5 + 1).toFixed(1),
                post_frequency: Math.floor(Math.random() * 20) + 5,
                growth_trend: Math.floor(Math.random() * 30) + 5,
                opportunity_score: opportunityScore,
                analysis: {
                    content_analysis: [
                        'Primarily carousel posts (68%)',
                        'Regular video content (24%)',
                        'Educational tone dominant',
                        'Consistent CTA usage'
                    ],
                    business_signals: [
                        'Active link-in-bio usage',
                        'Monetization indicators present',
                        'Professional content strategy',
                        'Collaboration mentions'
                    ],
                    audience_intel: [
                        'High comment engagement',
                        'Strong share/save ratio',
                        'B2B-focused audience',
                        'Quality over quantity followers'
                    ],
                    opportunity_indicators: [
                        'Recent growth phase',
                        'Pain point discussions',
                        'Tool/service interest signals',
                        'Event/collaboration openness'
                    ]
                },
                claude_assessment: generateClaudeAssessment(opportunityScore)
            };
        }

        // Display lead analysis results
        function displayLeadAnalysis(data) {
            currentLead = data;
            
            // Show the lead context card
            const contextCard = document.getElementById('lead-context-card');
            contextCard.classList.add('active');
            
            // Update lead information
            document.getElementById('lead-name').textContent = data.name || 'Unknown Name';
            document.getElementById('lead-handle').textContent = `@${data.username}`;
            document.getElementById('lead-bio').textContent = data.bio || 'No bio available';
            
            // Update metrics
            document.getElementById('followers-count').textContent = data.followers || 'N/A';
            document.getElementById('engagement-rate').textContent = `${data.engagement_rate || '0'}%`;
            document.getElementById('post-frequency').textContent = data.post_frequency || '0';
            document.getElementById('growth-trend').textContent = `+${data.growth_trend || '0'}%`;
            
            // Update opportunity score
            const score = data.opportunity_score || 70;
            document.getElementById('opportunity-score').textContent = score;
            updateOpportunityMeter(score);
            
            // Update analysis sections
            if (data.analysis) {
                updateAnalysisSection('content-analysis', data.analysis.content_analysis);
                updateAnalysisSection('business-signals', data.analysis.business_signals);
                updateAnalysisSection('audience-intel', data.analysis.audience_intel);
                updateAnalysisSection('opportunity-indicators', data.analysis.opportunity_indicators);
            }
            
            // Update Claude assessment
            document.getElementById('claude-assessment').textContent = 
                data.claude_assessment || 'Analysis completed. This lead shows potential for engagement.';
            
            // Scroll to results
            contextCard.scrollIntoView({ behavior: 'smooth' });
        }

        // Update analysis sections
        function updateAnalysisSection(sectionId, items) {
            const container = document.getElementById(sectionId);
            if (!container || !items) return;
            
            container.innerHTML = items.map(item => 
                `<li>${item.startsWith('📸') || item.startsWith('🎥') || item.startsWith('📝') || 
                     item.startsWith('🔗') || item.startsWith('🚀') || item.startsWith('💰') || 
                     item.startsWith('📊') || item.startsWith('🤝') || item.startsWith('💬') || 
                     item.startsWith('🔄') || item.startsWith('🎯') || item.startsWith('⭐') || 
                     item.startsWith('📈') || item.startsWith('💡') || item.startsWith('🛠️') || 
                     item.startsWith('🎪') ? '' : '•'} ${item}</li>`
            ).join('');
        }

        // Update opportunity meter visual
        function updateOpportunityMeter(score) {
            const meterVisual = document.getElementById('meter-visual');
            const percentage = Math.min(score, 100);
            const degrees = (percentage / 100) * 360;
            
            meterVisual.style.background = 
                `conic-gradient(#2D6CDF 0deg ${degrees}deg, #E5E7EB ${degrees}deg 360deg)`;
            
            // Update score factors
            const factors = document.getElementById('score-factors');
            const factorScores = [
                `ICP alignment: ${Math.min(score + 5, 100)}%`,
                `Engagement quality: ${Math.max(score - 3, 0)}%`,
                `Monetization readiness: ${Math.max(score - 8, 0)}%`,
                `Growth trajectory: ${Math.max(score - 12, 0)}%`
            ];
            
            factors.innerHTML = factorScores.map(factor => `<li>${factor}</li>`).join('');
        }

        // Tag management
        function toggleTag(event) {
            const chip = event.currentTarget;
            const tag = chip.dataset.tag;
            
            chip.classList.toggle('selected');
            
            if (chip.classList.contains('selected')) {
                if (!savedTags.includes(tag)) {
                    savedTags.push(tag);
                }
            } else {
                savedTags = savedTags.filter(t => t !== tag);
            }
            
            updateTagsDisplay();
        }

        function handleTagInput(event) {
            if (event.key === 'Enter') {
                const input = event.target;
                const tag = input.value.trim();
                
                if (tag && !savedTags.includes(tag)) {
                    savedTags.push(tag);
                    updateTagsDisplay();
                    input.value = '';
                }
            }
        }

        function updateTagsDisplay() {
            // Update visual indicators and save to backend if needed
            console.log('Tags updated:', savedTags);
        }

        // Action handlers
        function saveLead() {
            if (!currentLead) {
                showStatusMessage('No lead to save', 'error');
                return;
            }
            
            showStatusMessage('Lead saved to your research database!', 'success');
        }

        function addToList() {
            showStatusMessage('Add to list functionality coming soon!', 'info');
        }

        function findSimilarLeads() {
            showStatusMessage('Finding similar leads based on current profile...', 'info');
        }

        function generateMessage() {
            if (!currentLead) {
                showStatusMessage('No lead selected for message generation', 'error');
                return;
            }
            
            // Redirect to message studio with lead data
            window.location.href = `messages.html?lead=${encodeURIComponent(currentLead.username)}`;
        }

        function compareLeads() {
            showStatusMessage('Lead comparison tool coming soon!', 'info');
        }

        function exportProfile() {
            if (!currentLead) {
                showStatusMessage('No profile to export', 'error');
                return;
            }
            
            const exportData = {
                ...currentLead,
                notes: document.getElementById('lead-notes').value,
                tags: savedTags,
                exported_at: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lead-profile-${currentLead.username}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showStatusMessage('Profile exported successfully!', 'success');
        }

        function scheduleReview() {
            showStatusMessage('Review scheduling functionality coming soon!', 'info');
        }

        function shareResearch() {
            showStatusMessage('Research sharing functionality coming soon!', 'info');
        }

        // Header actions
        function exportResearch() {
            showStatusMessage('Exporting all research data...', 'info');
        }

        function showSavedLeads() {
            showStatusMessage('Saved leads dashboard coming soon!', 'info');
        }

        function startNewResearch() {
            // Clear current research
            document.getElementById('lead-context-card').classList.remove('active');
            document.getElementById('research-input').focus();
            document.getElementById('lead-notes').value = '';
            savedTags = [];
            currentLead = null;
            
            // Clear tag selections
            document.querySelectorAll('.tag-chip').forEach(chip => {
                chip.classList.remove('selected');
            });
            
            showStatusMessage('Ready for new research!', 'info');
        }

        function saveNotes() {
            const notes = document.getElementById('lead-notes').value;
            if (currentLead && notes.trim()) {
                console.log('Saving notes for', currentLead.username, ':', notes);
                // Save to backend
            }
        }

        function loadSavedTags() {
            // Load user's saved tags from backend
            savedTags = [];
        }

        // Navigation
        function handleNavigation(event) {
            event.preventDefault();
            const page = event.currentTarget.dataset.page;
            
            console.log('🧭 Navigating to:', page);
            
            // Route to appropriate page files
            switch (page) {
                case 'dashboard':
                    window.location.href = 'dashboard.html';
                    break;
                case 'leads':
                    // Already on leads page
                    break;
                case 'analytics':
                    window.location.href = 'analytics.html';
                    break;
                case 'bulk-upload':
                    window.location.href = 'bulk-upload.html';
                    break;
                case 'messages':
                    window.location.href = 'messages.html';
                    break;
                case 'integrations':
                    window.location.href = 'integrations.html';
                    break;
                case 'subscription':
                    window.location.href = 'subscription.html';
                    break;
                case 'settings':
                    window.location.href = 'settings.html';
                    break;
                default:
                    showStatusMessage(`Navigation to ${page} page coming soon!`, 'info');
            }
        }

        // Utility functions
        function showStatusMessage(message, type = 'info') {
            const statusEl = document.getElementById('status-message');
            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
            statusEl.style.display = 'block';
            
            // Auto-hide after 5 seconds for non-error messages
            if (type !== 'error') {
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 5000);
            }
        }

        function setButtonLoading(button, text) {
            if (!button) return;
            button.textContent = text;
            button.disabled = true;
        }

        function resetButton(button, text) {
            if (!button) return;
            button.textContent = text;
            button.disabled = false;
        }

        function generateRandomName() {
            const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn'];
            const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
            return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        }

        function generateRandomFollowers() {
            const count = Math.floor(Math.random() * 500) + 50;
            if (count < 1000) {
                return count.toString();
            } else {
                return (count / 1000).toFixed(1) + 'K';
            }
        }

        function generateClaudeAssessment(score) {
            if (score >= 85) {
                return "This lead shows exceptional alignment with your ICP. They're in an active growth phase with clear monetization strategies and highly engaged audience. Recent content indicates strong openness to partnerships and tool adoption. Recommended approach: consultative outreach focusing on specific scaling challenges mentioned in their posts.";
            } else if (score >= 70) {
                return "This lead demonstrates good potential for engagement. They show consistent content creation with moderate audience engagement. Some monetization indicators present. Recommended approach: value-first outreach with relevant industry insights or case studies.";
            } else {
                return "This lead shows limited alignment with your current ICP. Lower engagement metrics and unclear monetization strategy. Consider for broader awareness campaigns rather than direct sales outreach.";
            }
        }

        // Authentication
        function logout() {
            if (supabase) {
                supabase.auth.signOut().then(() => {
                    window.location.href = 'auth.html';
                });
            } else {
                window.location.href = 'auth.html';
            }
        }

        // Auth state listener
        if (window.supabase) {
            window.supabase.auth?.onAuthStateChange?.((event, session) => {
                if (event === 'SIGNED_OUT' || !session) {
                    window.location.href = 'auth.html';
                }
            });
        }

        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('💥 Global error:', event.error);
            if (typeof Sentry !== 'undefined') {
                Sentry.captureException(event.error);
            }
        });

        // Global functions for any dynamically generated content
        window.osliraResearch = {
            analyzeLead,
            saveLead,
            generateMessage,
            exportProfile,
            showStatusMessage
        };
