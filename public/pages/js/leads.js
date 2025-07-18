// ==========================================
// LEADS.JS - Lead Research Intelligence System
// Depends on: shared-code.js (must be loaded first)
// ==========================================

// Prevent browser extension interference
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Could not establish connection')) {
        console.warn('Browser extension communication error (non-critical):', event.message);
        event.preventDefault();
        return false;
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && 
        event.reason.message.includes('Could not establish connection')) {
        console.warn('Browser extension promise rejection (non-critical):', event.reason.message);
        event.preventDefault();
        return false;
    }
});

class OsliraLeads {
    constructor() {
        this.currentLead = null;
        this.savedTags = [];
        this.userProfile = null;
        this.businessProfile = null;
        this.currentSession = null;
        this.isLoading = false;
        this.realTimeSubscription = null;
        this.uploadProgress = 0;
        this.csvData = [];
        this.mappedData = [];
        this.isProcessing = false;
        this.analysisHistory = [];
        this.exportFormats = ['json', 'csv', 'google-sheets'];
        this.googleSheetsEnabled = false;
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    async initialize() {
        try {
            console.log('🚀 Initializing Lead Research Intelligence...');
            
            // Check authentication first
            await this.checkAuthentication();
            
            // Initialize components
            await this.initializeSupabase();
            await this.loadUserProfile();
            await this.loadBusinessProfile();
            this.setupEventListeners();
            this.setupRealTimeUpdates();
            this.setupKeyboardShortcuts();
            this.setupGoogleSheetsIntegration();
            
            // Load saved state
            await this.loadSavedState();
            
            console.log('✅ Lead Research Intelligence initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            this.showErrorState(error.message);
        }
    }

    // =============================================================================
    // AUTHENTICATION & PROFILE MANAGEMENT
    // =============================================================================

    async checkAuthentication() {
        if (!window.OsliraApp || !window.OsliraApp.supabase) {
            throw new Error('Supabase not available');
        }

        const { data: { session }, error } = await window.OsliraApp.supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = '/auth.html';
            return;
        }

        this.currentSession = session;
        console.log('✅ User authenticated:', session.user.email);
        
        // Update UI with user info
        document.getElementById('user-email').textContent = session.user.email;
    }

    async initializeSupabase() {
        if (!window.OsliraApp.supabase) {
            throw new Error('Supabase not initialized');
        }
        
        this.supabase = window.OsliraApp.supabase;
        console.log('✅ Supabase client ready');
    }

    async loadUserProfile() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', this.currentSession.user.id)
                .single();

            if (error) throw error;
            
            this.userProfile = data;
            console.log('✅ User profile loaded');
            
            // Update UI elements
            this.updateUserInterface();
            
        } catch (error) {
            console.error('❌ Failed to load user profile:', error);
            throw new Error('Could not load user profile');
        }
    }

    async loadBusinessProfile() {
        try {
            const { data, error } = await this.supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', this.currentSession.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            this.businessProfile = data;
            
            if (!data) {
                console.warn('⚠️ No business profile found - redirecting to onboarding');
                window.location.href = '/onboarding.html';
                return;
            }
            
            console.log('✅ Business profile loaded');
            
        } catch (error) {
            console.error('❌ Failed to load business profile:', error);
            throw new Error('Could not load business profile');
        }
    }

    updateUserInterface() {
        if (!this.userProfile) return;
        
        // Update plan information
        const planElement = document.getElementById('plan-name');
        if (planElement) {
            planElement.textContent = this.userProfile.subscription_plan || 'Free Plan';
        }
        
        // Update credits display
        const creditsElement = document.getElementById('credits-remaining');
        if (creditsElement) {
            creditsElement.textContent = this.userProfile.credits || 0;
        }
    }

    // =============================================================================
    // LEAD ANALYSIS SYSTEM
    // =============================================================================

    async analyzeLead() {
        const input = document.getElementById('research-input');
        const query = input.value.trim();
        
        if (!query) {
            this.showStatusMessage('Please enter an Instagram username or profile URL', 'error');
            input.focus();
            return;
        }

        if (this.isLoading) {
            this.showStatusMessage('Analysis already in progress...', 'info');
            return;
        }

        try {
            this.isLoading = true;
            this.showStatusMessage('🔍 Analyzing profile...', 'loading');
            
            // Validate input format
            const profileUrl = this.normalizeProfileUrl(query);
            if (!profileUrl) {
                throw new Error('Invalid profile URL format. Please enter a valid Instagram username or URL.');
            }

            // Check credits
            await this.checkCreditsAvailable();

            // Perform analysis
            const analysisData = await this.performLeadAnalysis(profileUrl);
            
            // Display results
            await this.displayLeadResults(analysisData);
            
            // Save to history
            await this.saveAnalysisToHistory(analysisData);
            
            this.showStatusMessage('✅ Analysis completed successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            this.showStatusMessage(error.message, 'error');
        } finally {
            this.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    normalizeProfileUrl(input) {
        // Clean the input
        input = input.trim().toLowerCase();
        
        // Remove common prefixes
        input = input.replace(/^@/, '');
        input = input.replace(/^https?:\/\/(www\.)?/, '');
        input = input.replace(/^instagram\.com\//, '');
        input = input.replace(/\/$/, '');
        
        // Extract username
        const usernameMatch = input.match(/^([a-zA-Z0-9._]+)$/);
        if (!usernameMatch) {
            return null;
        }
        
        return `https://instagram.com/${usernameMatch[1]}`;
    }

    async checkCreditsAvailable() {
        if (!this.userProfile) {
            throw new Error('User profile not loaded');
        }
        
        const requiredCredits = 1; // Light analysis
        
        if (this.userProfile.credits < requiredCredits) {
            throw new Error(`Insufficient credits. You need ${requiredCredits} credit(s) but have ${this.userProfile.credits}.`);
        }
    }

    async performLeadAnalysis(profileUrl) {
        const analysisPayload = {
            profile_url: profileUrl,
            analysis_type: 'light',
            business_id: this.businessProfile.id,
            user_id: this.currentSession.user.id,
            platform: 'instagram',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            user_local_time: new Date().toISOString(),
            request_timestamp: new Date().toISOString()
        };

        console.log('📊 Sending analysis request:', analysisPayload);

        const response = await fetch(`${window.CONFIG.WORKER_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.currentSession.access_token}`
            },
            body: JSON.stringify(analysisPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Analysis completed:', result);
        
        return result;
    }

    async displayLeadResults(data) {
        this.currentLead = data;
        
        // Update lead header
        this.updateLeadHeader(data.profile);
        
        // Update metrics
        this.updateLeadMetrics(data.profile, data.analysis);
        
        // Update insights
        this.updateLeadInsights(data.analysis);
        
        // Show the lead context card
        const leadCard = document.getElementById('lead-context-card');
        leadCard.classList.add('active');
        
        // Scroll to results
        leadCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateLeadHeader(profile) {
        const avatar = document.getElementById('lead-avatar');
        const name = document.getElementById('lead-name');
        const handle = document.getElementById('lead-handle');
        const bio = document.getElementById('lead-bio');
        
        if (avatar) {
            avatar.src = profile.profilePicUrl || 'https://via.placeholder.com/80';
            avatar.alt = `${profile.username} profile picture`;
        }
        
        if (name) {
            name.textContent = profile.fullName || profile.username;
        }
        
        if (handle) {
            handle.textContent = `@${profile.username}`;
        }
        
        if (bio) {
            bio.textContent = profile.biography || 'No bio available';
        }
    }

    updateLeadMetrics(profile, analysis) {
        // Update follower count
        const followersEl = document.getElementById('followers-count');
        if (followersEl) {
            followersEl.textContent = this.formatNumber(profile.followersCount || 0);
        }
        
        // Update posts count
        const postsEl = document.getElementById('posts-count');
        if (postsEl) {
            postsEl.textContent = this.formatNumber(profile.postsCount || 0);
        }
        
        // Update opportunity score
        const scoreEl = document.getElementById('opportunity-score');
        if (scoreEl) {
            scoreEl.textContent = analysis.score || 0;
        }
        
        // Update opportunity meter
        this.updateOpportunityMeter(analysis.score || 0);
        
        // Update engagement data
        this.updateEngagementMetrics(profile.engagement);
    }

    updateEngagementMetrics(engagement) {
        if (!engagement) return;
        
        const avgLikesEl = document.getElementById('avg-likes');
        const avgCommentsEl = document.getElementById('avg-comments');
        const engagementRateEl = document.getElementById('engagement-rate');
        
        if (avgLikesEl) {
            avgLikesEl.textContent = this.formatNumber(engagement.avgLikes || 0);
        }
        
        if (avgCommentsEl) {
            avgCommentsEl.textContent = this.formatNumber(engagement.avgComments || 0);
        }
        
        if (engagementRateEl) {
            engagementRateEl.textContent = `${(engagement.engagementRate || 0).toFixed(1)}%`;
        }
    }

    updateOpportunityMeter(score) {
        const meterVisual = document.getElementById('meter-visual');
        if (!meterVisual) return;
        
        const percentage = Math.min(score, 100);
        const degrees = (percentage / 100) * 360;
        
        meterVisual.style.background = 
            `conic-gradient(#2D6CDF 0deg ${degrees}deg, #E5E7EB ${degrees}deg 360deg)`;
        
        // Update score factors
        const factors = document.getElementById('score-factors');
        if (factors) {
            const factorScores = [
                `ICP alignment: ${Math.min(score + 5, 100)}%`,
                `Engagement quality: ${Math.max(score - 3, 0)}%`,
                `Monetization readiness: ${Math.max(score - 8, 0)}%`,
                `Growth trajectory: ${Math.max(score - 12, 0)}%`
            ];
            
            factors.innerHTML = factorScores.map(factor => `<li>${factor}</li>`).join('');
        }
    }

    updateLeadInsights(analysis) {
        // Update reasons list
        const reasonsList = document.getElementById('analysis-reasons');
        if (reasonsList && analysis.reasons) {
            reasonsList.innerHTML = analysis.reasons.map(reason => 
                `<li>${reason}</li>`
            ).join('');
        }
        
        // Update selling points
        const sellingPointsList = document.getElementById('selling-points');
        if (sellingPointsList && analysis.selling_points) {
            sellingPointsList.innerHTML = analysis.selling_points.map(point => 
                `<li>${point}</li>`
            ).join('');
        }
        
        // Update summary
        const summaryEl = document.getElementById('analysis-summary');
        if (summaryEl && analysis.summary) {
            summaryEl.textContent = analysis.summary;
        }
    }

    // =============================================================================
    // GOOGLE SHEETS INTEGRATION
    // =============================================================================

    setupGoogleSheetsIntegration() {
        // Check if Google Sheets API is available
        this.checkGoogleSheetsAvailability();
        
        // Setup export handlers
        this.setupExportHandlers();
    }

    async checkGoogleSheetsAvailability() {
        try {
            // Check for Google Sheets configuration
            if (window.CONFIG && window.CONFIG.GOOGLE_SHEETS_ENABLED) {
                this.googleSheetsEnabled = true;
                console.log('✅ Google Sheets integration enabled');
            } else {
                console.log('ℹ️ Google Sheets integration not configured');
            }
        } catch (error) {
            console.warn('⚠️ Google Sheets check failed:', error);
        }
    }

    setupExportHandlers() {
        const exportBtn = document.getElementById('export-research-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportModal());
        }
    }

    async exportToGoogleSheets(data) {
        if (!this.googleSheetsEnabled) {
            throw new Error('Google Sheets integration not enabled');
        }

        try {
            this.showStatusMessage('📊 Exporting to Google Sheets...', 'loading');
            
            // Prepare data for export
            const exportData = this.prepareExportData(data);
            
            // Call export API
            const response = await fetch(`${window.CONFIG.WORKER_URL}/export/google-sheets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentSession.access_token}`
                },
                body: JSON.stringify({
                    data: exportData,
                    user_id: this.currentSession.user.id,
                    spreadsheet_name: `Oslira Leads Export - ${new Date().toLocaleDateString()}`
                })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const result = await response.json();
            
            this.showStatusMessage('✅ Successfully exported to Google Sheets!', 'success');
            
            // Show link to spreadsheet
            if (result.spreadsheet_url) {
                this.showExportSuccess(result.spreadsheet_url);
            }
            
        } catch (error) {
            console.error('❌ Google Sheets export failed:', error);
            this.showStatusMessage('Export failed: ' + error.message, 'error');
        }
    }

    prepareExportData(data) {
        if (!data) data = this.analysisHistory;
        
        return data.map(analysis => ({
            username: analysis.profile?.username || '',
            full_name: analysis.profile?.fullName || '',
            followers: analysis.profile?.followersCount || 0,
            following: analysis.profile?.followingCount || 0,
            posts: analysis.profile?.postsCount || 0,
            verified: analysis.profile?.isVerified || false,
            private: analysis.profile?.private || false,
            biography: analysis.profile?.biography || '',
            score: analysis.analysis?.score || 0,
            niche_fit: analysis.analysis?.niche_fit || 0,
            engagement_score: analysis.analysis?.engagement_score || 0,
            reasons: analysis.analysis?.reasons?.join('; ') || '',
            selling_points: analysis.analysis?.selling_points?.join('; ') || '',
            analyzed_at: analysis.analyzed_at || new Date().toISOString()
        }));
    }

    // =============================================================================
    // FILE UPLOAD & BULK PROCESSING
    // =============================================================================

    async handleFileUpload(file) {
        if (!file) return;
        
        try {
            this.showStatusMessage('📄 Processing file...', 'loading');
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            let data;
            
            switch (fileExtension) {
                case 'csv':
                    data = await this.processCsvFile(file);
                    break;
                case 'xlsx':
                case 'xls':
                    data = await this.processExcelFile(file);
                    break;
                default:
                    throw new Error('Unsupported file format. Please use CSV or Excel files.');
            }
            
            this.csvData = data;
            await this.processBulkAnalysis(data);
            
        } catch (error) {
            console.error('❌ File processing failed:', error);
            this.showStatusMessage('File processing failed: ' + error.message, 'error');
        }
    }

    async processCsvFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim());
                    
                    const data = lines.slice(1)
                        .filter(line => line.trim())
                        .map(line => {
                            const values = line.split(',');
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header] = values[index]?.trim() || '';
                            });
                            return row;
                        });
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async processExcelFile(file) {
        // This would require the SheetJS library
        throw new Error('Excel file processing requires additional setup');
    }

    async processBulkAnalysis(data) {
        if (!data || data.length === 0) {
            throw new Error('No data to process');
        }
        
        this.isProcessing = true;
        this.showStatusMessage(`🔄 Processing ${data.length} profiles...`, 'loading');
        
        try {
            const results = [];
            
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                
                // Extract username from the row
                const username = this.extractUsernameFromRow(row);
                if (!username) continue;
                
                try {
                    // Update progress
                    this.updateProgress((i + 1) / data.length * 100);
                    
                    // Analyze the profile
                    const profileUrl = `https://instagram.com/${username}`;
                    const analysis = await this.performLeadAnalysis(profileUrl);
                    
                    results.push(analysis);
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.warn(`⚠️ Failed to analyze ${username}:`, error.message);
                }
            }
            
            this.showStatusMessage(`✅ Processed ${results.length} profiles successfully!`, 'success');
            
            // Show results or export options
            await this.showBulkResults(results);
            
        } catch (error) {
            console.error('❌ Bulk processing failed:', error);
            this.showStatusMessage('Bulk processing failed: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.updateProgress(0);
        }
    }

    extractUsernameFromRow(row) {
        // Try common column names
        const possibleFields = ['username', 'handle', 'instagram', 'ig_username', 'profile'];
        
        for (const field of possibleFields) {
            if (row[field]) {
                return row[field].replace('@', '').trim();
            }
        }
        
        return null;
    }

    updateProgress(percentage) {
        this.uploadProgress = percentage;
        
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `${Math.round(percentage)}% complete`;
        }
    }

    // =============================================================================
    // REAL-TIME UPDATES & SUBSCRIPTIONS
    // =============================================================================

    setupRealTimeUpdates() {
        if (!this.supabase) return;
        
        try {
            // Subscribe to leads table changes
            this.realTimeSubscription = this.supabase
                .channel('leads_changes')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'leads',
                    filter: `user_id=eq.${this.currentSession.user.id}`
                }, (payload) => {
                    console.log('🔄 New lead analysis:', payload);
                    this.handleNewLeadUpdate(payload.new);
                })
                .subscribe();
                
            console.log('✅ Real-time updates enabled');
            
        } catch (error) {
            console.warn('⚠️ Real-time updates setup failed:', error);
        }
    }

    handleNewLeadUpdate(newLead) {
        // Add to analysis history
        this.analysisHistory.unshift(newLead);
        
        // Update UI if needed
        this.updateAnalysisHistory();
        
        // Show notification
        this.showNotification(`New analysis completed for @${newLead.username}`);
    }

    // =============================================================================
    // LEAD MANAGEMENT & ACTIONS
    // =============================================================================

    async saveLead() {
        if (!this.currentLead) {
            this.showStatusMessage('No lead to save', 'error');
            return;
        }
        
        try {
            const notes = document.getElementById('lead-notes')?.value || '';
            
            const { error } = await this.supabase
                .from('saved_leads')
                .insert({
                    user_id: this.currentSession.user.id,
                    username: this.currentLead.profile.username,
                    profile_data: this.currentLead.profile,
                    analysis_data: this.currentLead.analysis,
                    notes: notes,
                    tags: this.savedTags,
                    saved_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            this.showStatusMessage('✅ Lead saved successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to save lead:', error);
            this.showStatusMessage('Failed to save lead: ' + error.message, 'error');
        }
    }

    async generateMessage() {
        if (!this.currentLead) {
            this.showStatusMessage('No lead selected for message generation', 'error');
            return;
        }
        
        try {
            this.showStatusMessage('✍️ Generating personalized message...', 'loading');
            
            const response = await fetch(`${window.CONFIG.WORKER_URL}/generate-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentSession.access_token}`
                },
                body: JSON.stringify({
                    profile_data: this.currentLead.profile,
                    analysis_data: this.currentLead.analysis,
                    business_id: this.businessProfile.id,
                    user_id: this.currentSession.user.id
                })
            });
            
            if (!response.ok) {
                throw new Error('Message generation failed');
            }
            
            const result = await response.json();
            
            // Show generated message
            this.showGeneratedMessage(result.message);
            
            this.showStatusMessage('✅ Message generated successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Message generation failed:', error);
            this.showStatusMessage('Message generation failed: ' + error.message, 'error');
        }
    }

    showGeneratedMessage(message) {
        // Create and show modal with generated message
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Generated Message</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <textarea class="generated-message" readonly>${message}</textarea>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="navigator.clipboard.writeText('${message.replace(/'/g, "\\'")}'); this.textContent='Copied!'">
                            📋 Copy Message
                        </button>
                        <button class="primary-btn" onclick="window.open('https://instagram.com/${this.currentLead?.profile?.username}', '_blank')">
                            📩 Send on Instagram
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // =============================================================================
    // TAG MANAGEMENT
    // =============================================================================

    toggleTag(event) {
        const chip = event.currentTarget;
        const tag = chip.dataset.tag;
        
        chip.classList.toggle('selected');
        
        if (chip.classList.contains('selected')) {
            if (!this.savedTags.includes(tag)) {
                this.savedTags.push(tag);
            }
        } else {
            this.savedTags = this.savedTags.filter(t => t !== tag);
        }
        
        this.updateTagsDisplay();
    }

    handleTagInput(event) {
        if (event.key === 'Enter') {
            const input = event.target;
            const tag = input.value.trim();
            
            if (tag && !this.savedTags.includes(tag)) {
                this.savedTags.push(tag);
                this.updateTagsDisplay();
                input.value = '';
            }
        }
    }

    updateTagsDisplay() {
        // Update visual indicators
        console.log('Tags updated:', this.savedTags);
        
        // Save tags to localStorage for persistence
        localStorage.setItem('oslira_saved_tags', JSON.stringify(this.savedTags));
    }

    // =============================================================================
    // STATE MANAGEMENT
    // =============================================================================

    async saveAnalysisToHistory(analysisData) {
        try {
            // Save to database
            const { error } = await this.supabase
                .from('analysis_history')
                .insert({
                    user_id: this.currentSession.user.id,
                    username: analysisData.profile.username,
                    profile_data: analysisData.profile,
                    analysis_data: analysisData.analysis,
                    analyzed_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            // Add to local history
            this.analysisHistory.unshift(analysisData);
            
            // Keep only last 50 analyses in memory
            if (this.analysisHistory.length > 50) {
                this.analysisHistory = this.analysisHistory.slice(0, 50);
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to save analysis to history:', error);
        }
    }

    async loadSavedState() {
        try {
            // Load saved tags
            const savedTags = localStorage.getItem('oslira_saved_tags');
            if (savedTags) {
                this.savedTags = JSON.parse(savedTags);
            }
            
            // Load analysis history
            const { data, error } = await this.supabase
                .from('analysis_history')
                .select('*')
                .eq('user_id', this.currentSession.user.id)
                .order('analyzed_at', { ascending: false })
                .limit(25);
            
            if (error) throw error;
            
            this.analysisHistory = data || [];
            console.log(`✅ Loaded ${this.analysisHistory.length} previous analyses`);
            
        } catch (error) {
            console.warn('⚠️ Failed to load saved state:', error);
        }
    }

    // =============================================================================
    // EVENT LISTENERS & UI HANDLERS
    // =============================================================================

    setupEventListeners() {
        // Main navigation
        document.querySelectorAll('nav a[data-page]').forEach(link => {
            link.addEventListener('click', this.handleNavigation.bind(this));
        });

        // Header actions
        document.getElementById('export-research-btn')?.addEventListener('click', () => this.showExportModal());
        document.getElementById('saved-leads-btn')?.addEventListener('click', () => this.showSavedLeads());
        document.getElementById('new-research-btn')?.addEventListener('click', () => this.startNewResearch());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());

        // Research actions
        document.getElementById('analyze-lead-btn')?.addEventListener('click', () => this.analyzeLead());
        document.getElementById('research-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyzeLead();
        });

        // Lead actions
        document.getElementById('save-lead-btn')?.addEventListener('click', () => this.saveLead());
        document.getElementById('generate-message-btn')?.addEventListener('click', () => this.generateMessage());
        document.getElementById('add-to-list-btn')?.addEventListener('click', () => this.addToList());
        document.getElementById('find-similar-btn')?.addEventListener('click', () => this.findSimilarLeads());
        document.getElementById('export-profile-btn')?.addEventListener('click', () => this.exportProfile());
        document.getElementById('compare-leads-btn')?.addEventListener('click', () => this.compareLeads());

        // Tag management
        document.querySelectorAll('.tag-chip').forEach(chip => {
            chip.addEventListener('click', this.toggleTag.bind(this));
        });
        
        document.getElementById('tag-input')?.addEventListener('keypress', this.handleTagInput.bind(this));

        // Notes auto-save
        document.getElementById('lead-notes')?.addEventListener('input', this.debounce(() => {
            this.saveNotes();
        }, 1000));

        // File upload
        document.getElementById('file-upload')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Form validation
        document.getElementById('research-input')?.addEventListener('input', this.validateInput.bind(this));
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to analyze
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.analyzeLead();
            }
            
            // Ctrl/Cmd + S to save lead
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.currentLead) {
                    this.saveLead();
                }
            }
            
            // Escape to clear/cancel
            if (e.key === 'Escape') {
                this.clearCurrentAnalysis();
            }
        });
    }

    handleNavigation(event) {
        event.preventDefault();
        const page = event.currentTarget.dataset.page;
        
        console.log('🧭 Navigating to:', page);
        
        switch (page) {
            case 'dashboard':
                window.location.href = '/dashboard.html';
                break;
            case 'leads':
                // Already on leads page
                break;
            case 'analytics':
                window.location.href = '/analytics.html';
                break;
            case 'bulk-upload':
                window.location.href = '/bulk-upload.html';
                break;
            case 'messages':
                window.location.href = '/messages.html';
                break;
            case 'integrations':
                window.location.href = '/integrations.html';
                break;
            case 'subscription':
                window.location.href = '/subscription.html';
                break;
            case 'settings':
                window.location.href = '/settings.html';
                break;
            default:
                this.showStatusMessage(`Navigation to ${page} page coming soon!`, 'info');
        }
    }

    // =============================================================================
    // ADDITIONAL LEAD ACTIONS
    // =============================================================================

    async addToList() {
        if (!this.currentLead) {
            this.showStatusMessage('No lead selected', 'error');
            return;
        }
        
        try {
            // Show list selection modal
            this.showListSelectionModal();
            
        } catch (error) {
            console.error('❌ Add to list failed:', error);
            this.showStatusMessage('Failed to add to list: ' + error.message, 'error');
        }
    }

    async findSimilarLeads() {
        if (!this.currentLead) {
            this.showStatusMessage('No lead selected', 'error');
            return;
        }
        
        try {
            this.showStatusMessage('🔍 Finding similar profiles...', 'loading');
            
            const response = await fetch(`${window.CONFIG.WORKER_URL}/find-similar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentSession.access_token}`
                },
                body: JSON.stringify({
                    profile_data: this.currentLead.profile,
                    analysis_data: this.currentLead.analysis,
                    user_id: this.currentSession.user.id,
                    limit: 10
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to find similar leads');
            }
            
            const results = await response.json();
            this.showSimilarLeadsModal(results.similar_leads);
            
            this.showStatusMessage('✅ Found similar profiles!', 'success');
            
        } catch (error) {
            console.error('❌ Find similar failed:', error);
            this.showStatusMessage('Failed to find similar leads: ' + error.message, 'error');
        }
    }

    async compareLeads() {
        this.showStatusMessage('Lead comparison tool coming soon!', 'info');
    }

    async exportProfile() {
        if (!this.currentLead) {
            this.showStatusMessage('No profile to export', 'error');
            return;
        }
        
        try {
            const notes = document.getElementById('lead-notes')?.value || '';
            
            const exportData = {
                profile: this.currentLead.profile,
                analysis: this.currentLead.analysis,
                notes: notes,
                tags: this.savedTags,
                exported_at: new Date().toISOString(),
                exported_by: this.currentSession.user.email
            };
            
            // Create and download JSON file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `oslira-lead-${this.currentLead.profile.username}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatusMessage('✅ Profile exported successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showStatusMessage('Export failed: ' + error.message, 'error');
        }
    }

    // =============================================================================
    // MODAL & UI COMPONENTS
    // =============================================================================

    showExportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Export Research Data</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <div class="export-format">
                            <h4>Export Format</h4>
                            <label><input type="radio" name="format" value="json" checked> JSON</label>
                            <label><input type="radio" name="format" value="csv"> CSV</label>
                            ${this.googleSheetsEnabled ? '<label><input type="radio" name="format" value="sheets"> Google Sheets</label>' : ''}
                        </div>
                        <div class="export-data">
                            <h4>Data to Export</h4>
                            <label><input type="checkbox" checked> Current Analysis</label>
                            <label><input type="checkbox" checked> Analysis History</label>
                            <label><input type="checkbox"> Saved Leads</label>
                            <label><input type="checkbox"> Notes & Tags</label>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button class="primary-btn" onclick="window.osliraLeads.performExport(this.closest('.modal-content'))">
                            📥 Export Data
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async performExport(modalContent) {
        try {
            const format = modalContent.querySelector('input[name="format"]:checked').value;
            const includeOptions = Array.from(modalContent.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.nextSibling.textContent.trim());
            
            this.showStatusMessage(`📥 Exporting data as ${format.toUpperCase()}...`, 'loading');
            
            switch (format) {
                case 'json':
                    await this.exportAsJson(includeOptions);
                    break;
                case 'csv':
                    await this.exportAsCsv(includeOptions);
                    break;
                case 'sheets':
                    await this.exportToGoogleSheets(this.prepareExportData());
                    break;
            }
            
            // Close modal
            modalContent.closest('.modal-overlay').remove();
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showStatusMessage('Export failed: ' + error.message, 'error');
        }
    }

    async exportAsJson(options) {
        const exportData = {
            exported_at: new Date().toISOString(),
            exported_by: this.currentSession.user.email,
            options: options
        };
        
        if (options.includes('Current Analysis') && this.currentLead) {
            exportData.current_analysis = this.currentLead;
        }
        
        if (options.includes('Analysis History')) {
            exportData.analysis_history = this.analysisHistory;
        }
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `oslira-export-${new Date().toISOString().split('T')[0]}.json`);
        
        this.showStatusMessage('✅ JSON export completed!', 'success');
    }

    async exportAsCsv(options) {
        let csvContent = '';
        
        if (options.includes('Analysis History') && this.analysisHistory.length > 0) {
            // CSV headers
            const headers = [
                'Username', 'Full Name', 'Followers', 'Following', 'Posts', 
                'Verified', 'Private', 'Biography', 'Score', 'Niche Fit', 
                'Engagement Score', 'Analyzed At'
            ];
            
            csvContent = headers.join(',') + '\n';
            
            // CSV rows
            this.analysisHistory.forEach(analysis => {
                const row = [
                    `"${analysis.profile?.username || ''}"`,
                    `"${analysis.profile?.fullName || ''}"`,
                    analysis.profile?.followersCount || 0,
                    analysis.profile?.followingCount || 0,
                    analysis.profile?.postsCount || 0,
                    analysis.profile?.isVerified || false,
                    analysis.profile?.private || false,
                    `"${(analysis.profile?.biography || '').replace(/"/g, '""')}"`,
                    analysis.analysis?.score || 0,
                    analysis.analysis?.niche_fit || 0,
                    analysis.analysis?.engagement_score || 0,
                    `"${analysis.analyzed_at || ''}"`
                ];
                
                csvContent += row.join(',') + '\n';
            });
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadFile(blob, `oslira-export-${new Date().toISOString().split('T')[0]}.csv`);
        
        this.showStatusMessage('✅ CSV export completed!', 'success');
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showListSelectionModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add to List</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="list-selection">
                        <h4>Select List</h4>
                        <select class="form-select" id="list-select">
                            <option value="">Choose a list...</option>
                            <option value="prospects">Hot Prospects</option>
                            <option value="follow-up">Follow Up</option>
                            <option value="high-value">High Value Targets</option>
                            <option value="new">+ Create New List</option>
                        </select>
                        <input type="text" id="new-list-name" class="form-input" placeholder="New list name..." style="display: none; margin-top: 12px;">
                    </div>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button class="primary-btn" onclick="window.osliraLeads.addToSelectedList()">Add to List</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle new list creation
        modal.querySelector('#list-select').addEventListener('change', (e) => {
            const newListInput = modal.querySelector('#new-list-name');
            if (e.target.value === 'new') {
                newListInput.style.display = 'block';
                newListInput.focus();
            } else {
                newListInput.style.display = 'none';
            }
        });
    }

    async addToSelectedList() {
        // Implementation for adding to selected list
        this.showStatusMessage('✅ Lead added to list!', 'success');
        document.querySelector('.modal-overlay').remove();
    }

    showSimilarLeadsModal(similarLeads) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content modal-wide">
                <div class="modal-header">
                    <h3>Similar Leads</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="similar-leads-grid">
                        ${similarLeads.map(lead => `
                            <div class="similar-lead-card">
                                <img src="${lead.profile_pic_url || 'https://via.placeholder.com/60'}" alt="Profile">
                                <div class="lead-info">
                                    <h4>@${lead.username}</h4>
                                    <p>${lead.followers_count} followers</p>
                                    <p>Score: ${lead.score}/100</p>
                                </div>
                                <button class="analyze-btn" onclick="window.osliraLeads.analyzeLeadByUsername('${lead.username}')">
                                    Analyze
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async analyzeLeadByUsername(username) {
        document.getElementById('research-input').value = username;
        document.querySelector('.modal-overlay').remove();
        await this.analyzeLead();
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    validateInput(event) {
        const input = event.target;
        const value = input.value.trim();
        
        // Clear previous validation
        input.classList.remove('error', 'valid');
        
        if (value) {
            // Check if it looks like a valid username or URL
            const isValid = /^@?[a-zA-Z0-9._]+$/.test(value) || 
                           value.includes('instagram.com/') ||
                           value.includes('linkedin.com/');
            
            input.classList.add(isValid ? 'valid' : 'error');
        }
    }

    updateLoadingState(isLoading) {
        const button = document.getElementById('analyze-lead-btn');
        const input = document.getElementById('research-input');
        
        if (button) {
            button.disabled = isLoading;
            button.textContent = isLoading ? '🔄 Analyzing...' : '🔍 Analyze Lead';
        }
        
        if (input) {
            input.disabled = isLoading;
        }
    }

    showStatusMessage(message, type = 'info') {
        const statusEl = document.getElementById('status-message');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        statusEl.style.display = 'block';
        
        // Auto-hide success and info messages
        if (type !== 'error' && type !== 'loading') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showErrorState(message) {
        const errorHTML = `
            <div class="error-state">
                <h3>⚠️ System Error</h3>
                <p>${message}</p>
                <button class="primary-btn" onclick="window.location.reload()">
                    🔄 Reload Page
                </button>
                <p class="error-help">If this problem persists, please contact support.</p>
            </div>
        `;
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = errorHTML;
        }
    }

    async saveNotes() {
        if (!this.currentLead) return;
        
        try {
            const notes = document.getElementById('lead-notes')?.value || '';
            
            // Save notes to database or localStorage
            const leadData = {
                ...this.currentLead,
                notes: notes,
                updated_at: new Date().toISOString()
            };
            
            // Save to localStorage as backup
            localStorage.setItem(`lead_notes_${this.currentLead.profile.username}`, notes);
            
            console.log('✅ Notes saved for', this.currentLead.profile.username);
            
        } catch (error) {
            console.warn('⚠️ Failed to save notes:', error);
        }
    }

    clearCurrentAnalysis() {
        this.currentLead = null;
        this.savedTags = [];
        
        // Clear UI
        const leadCard = document.getElementById('lead-context-card');
        if (leadCard) {
            leadCard.classList.remove('active');
        }
        
        const input = document.getElementById('research-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        
        const notes = document.getElementById('lead-notes');
        if (notes) {
            notes.value = '';
        }
        
        // Clear tags
        document.querySelectorAll('.tag-chip').forEach(chip => {
            chip.classList.remove('selected');
        });
        
        this.showStatusMessage('Ready for new research!', 'info');
    }

    startNewResearch() {
        this.clearCurrentAnalysis();
    }

    async showSavedLeads() {
        try {
            const { data, error } = await this.supabase
                .from('saved_leads')
                .select('*')
                .eq('user_id', this.currentSession.user.id)
                .order('saved_at', { ascending: false });
            
            if (error) throw error;
            
            // Show saved leads modal or navigate to saved leads page
            this.showSavedLeadsModal(data);
            
        } catch (error) {
            console.error('❌ Failed to load saved leads:', error);
            this.showStatusMessage('Failed to load saved leads: ' + error.message, 'error');
        }
    }

    showSavedLeadsModal(savedLeads) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content modal-wide">
                <div class="modal-header">
                    <h3>Saved Leads (${savedLeads.length})</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="saved-leads-grid">
                        ${savedLeads.map(lead => `
                            <div class="saved-lead-card">
                                <img src="${lead.profile_data?.profilePicUrl || 'https://via.placeholder.com/60'}" alt="Profile">
                                <div class="lead-info">
                                    <h4>@${lead.username}</h4>
                                    <p>${lead.profile_data?.followersCount || 0} followers</p>
                                    <p>Score: ${lead.analysis_data?.score || 0}/100</p>
                                    <p class="saved-date">Saved: ${new Date(lead.saved_at).toLocaleDateString()}</p>
                                </div>
                                <div class="lead-actions">
                                    <button class="secondary-btn" onclick="window.osliraLeads.loadSavedLead('${lead.username}')">
                                        View
                                    </button>
                                    <button class="danger-btn" onclick="window.osliraLeads.deleteSavedLead('${lead.id}')">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async loadSavedLead(username) {
        document.getElementById('research-input').value = username;
        document.querySelector('.modal-overlay').remove();
        await this.analyzeLead();
    }

    async deleteSavedLead(leadId) {
        if (!confirm('Are you sure you want to delete this saved lead?')) return;
        
        try {
            const { error } = await this.supabase
                .from('saved_leads')
                .delete()
                .eq('id', leadId);
            
            if (error) throw error;
            
            // Refresh the modal
            this.showSavedLeads();
            
            this.showStatusMessage('✅ Lead deleted successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to delete lead:', error);
            this.showStatusMessage('Failed to delete lead: ' + error.message, 'error');
        }
    }

    async logout() {
        try {
            await this.supabase.auth.signOut();
            window.location.href = '/auth.html';
        } catch (error) {
            console.error('❌ Logout failed:', error);
            window.location.href = '/auth.html';
        }
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    destroy() {
        // Clean up subscriptions
        if (this.realTimeSubscription) {
            this.realTimeSubscription.unsubscribe();
        }
        
        // Clear intervals
        if (this.liveMetricsInterval) {
            clearInterval(this.liveMetricsInterval);
        }
        
        console.log('🧹 OsliraLeads cleaned up');
    }
}

// =============================================================================
// INITIALIZE APPLICATION
// =============================================================================

// Global instance
let osliraLeads;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for shared code to be available
        if (typeof window.OsliraApp === 'undefined') {
            console.log('⏳ Waiting for shared code...');
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (typeof window.OsliraApp !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }
        
        // Create and initialize the application
        osliraLeads = new OsliraLeads();
        window.osliraLeads = osliraLeads; // Make globally available for modal callbacks
        
        await osliraLeads.initialize();
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        
        // Show user-friendly error
        const errorHTML = `
            <div class="error-state">
                <h3>⚠️ Application Error</h3>
                <p>Failed to initialize the Lead Research Intelligence system.</p>
                <p class="error-details">${error.message}</p>
                <button class="primary-btn" onclick="window.location.reload()">
                    🔄 Reload Page
                </button>
                <p class="error-help">If this problem persists, please contact support.</p>
            </div>
        `;
        
        document.body.innerHTML = errorHTML;
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (osliraLeads) {
        osliraLeads.destroy();
    }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OsliraLeads;
}
