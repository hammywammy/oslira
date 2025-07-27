// ===== SECURE FEEDBACK SIGNAL EXPLORER =====
class SecureFeedbackSignalExplorer {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        // Initialize secure feedback explorer
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        this.claudeService = secureClaudeService;
        
        // Feedback explorer configuration
        this.config = {
            maxFeedbackItems: 500,
            refreshInterval: 45000, // 45 seconds
            animationDuration: 700,
            debounceDelay: 400,
            creditCost: 3, // Credits for Claude analysis
            minFeedbackLength: 10,
            maxDisplayLength: 300,
            confidenceThreshold: 0.7
        };
        
        // Chart and state management
        this.sentimentChart = null;
        this.themeChart = null;
        this.trendChart = null;
        this.currentData = null;
        this.currentFilters = {};
        this.lastAnalysis = null;
        this.lastDataFetch = null;
        
        // Claude processing state
        this.isProcessingWithClaude = false;
        this.claudeProcessingQueue = [];
        this.claudeRateLimiter = {
            requests: 0,
            resetTime: Date.now() + 60000,
            maxRequests: 10
        };
        
        // Interaction and visualization state
        this.interactionState = {
            selectedSentiment: null,
            selectedTheme: null,
            hoveredFeedback: null,
            expandedClusters: new Set(),
            viewMode: 'overview', // 'overview', 'themes', 'sentiment', 'timeline'
            filterBy: 'all' // 'all', 'positive', 'negative', 'neutral'
        };
        
        // Sentiment categories and scoring
        this.sentimentCategories = {
            very_positive: { label: 'Very Positive', score: 5, color: '#10B981', range: [0.8, 1.0] },
            positive: { label: 'Positive', score: 4, color: '#34D399', range: [0.4, 0.8] },
            neutral: { label: 'Neutral', score: 3, color: '#6B7280', range: [-0.2, 0.4] },
            negative: { label: 'Negative', score: 2, color: '#F59E0B', range: [-0.6, -0.2] },
            very_negative: { label: 'Very Negative', score: 1, color: '#EF4444', range: [-1.0, -0.6] }
        };
        
        // Theme categories for clustering
        this.themeCategories = {
            product: { label: 'Product Feedback', icon: '📦', color: '#3B82F6' },
            service: { label: 'Service Quality', icon: '🛎️', color: '#8B5CF6' },
            communication: { label: 'Communication', icon: '💬', color: '#06B6D4' },
            pricing: { label: 'Pricing', icon: '💰', color: '#10B981' },
            support: { label: 'Support Experience', icon: '🤝', color: '#F59E0B' },
            technical: { label: 'Technical Issues', icon: '⚙️', color: '#EF4444' },
            ui_ux: { label: 'User Experience', icon: '🎨', color: '#EC4899' },
            other: { label: 'Other', icon: '📝', color: '#6B7280' }
        };
        
        // Performance optimization
        this.isLoading = false;
        this.refreshTimer = null;
        this.updateDebounced = this.debounce(this._updateInternal.bind(this), this.config.debounceDelay);
        
        // Security and audit
        this.securitySettings = {
            sanitizeFeedback: true,
            anonymizeUsers: true,
            encryptSensitive: true,
            logAnalysis: true,
            validateSentiment: true
        };
        this.auditLog = [];
        
        // Connect to secure analytics and Claude services
        this.setupServiceConnections();
        
        // Setup sentiment analysis components
        this.setupSentimentAnalysis();
        
        // Configure theme extraction displays
        this.setupThemeExtraction();
        
        // Setup container
        this.setupContainer();
        
        console.log('SecureFeedbackSignalExplorer initialized');
    }
    // ADD THESE METHODS after the constructor:

getModuleInfo() {
    return {
        name: 'Message Style Matrix',
        version: '1.0.0',
        description: 'AI-powered message style performance analysis',
        dependencies: ['claudeService', 'analyticsService'],
        status: this.state || 'uninitialized',
        container: this.container?.id || 'unknown'
    };
}

cleanup() {
    console.log('🧹 Cleaning up SecureMessageStyleMatrix');
    
    if (this.updateInterval) {
        clearInterval(this.updateInterval);
    }
    
    if (this.container) {
        this.container.innerHTML = '';
    }
    
    this.state = 'cleaned';
}

onError(error, context = {}) {
    console.error(`❌ SecureMessageStyleMatrix error:`, error);
    this.fallbackRender(error);
}

async fallbackRender(error) {
    if (this.container) {
        this.container.innerHTML = `
            <div style="padding:20px;background:#f8f9fa;border-radius:8px;text-align:center;">
                <h4>⚠️ Message Style Matrix Unavailable</h4>
                <p>This feature requires credits or has a temporary issue.</p>
                <button onclick="location.reload()" style="background:#3b82f6;color:white;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;">
                    Reload Dashboard
                </button>
            </div>
        `;
    }
    this.state = 'fallback';
}

    setupServiceConnections() {
        // Connect to secure analytics and Claude services
        if (!this.analyticsService) {
            throw new Error('SecureAnalyticsService is required for feedback analysis');
        }
        
        if (!this.claudeService) {
            throw new Error('SecureClaudeService is required for feedback processing');
        }
        
        // Validate required methods
        if (typeof this.analyticsService.getFeedbackSignalData !== 'function') {
            throw new Error('Analytics service missing getFeedbackSignalData method');
        }
        
        if (typeof this.claudeService.classifyFeedback !== 'function') {
            throw new Error('Claude service missing classifyFeedback method');
        }
        
        // Test connections
        this.testServiceConnections();
    }

    async testServiceConnections() {
        // Test service connections
        try {
            // Test analytics service
            await this.analyticsService.getFeedbackSignalData({ 
                test: true, 
                limit: 1 
            });
            
            // Test Claude service (lightweight test)
            await this.claudeService.classifyFeedback(['test feedback'], { 
                test: true 
            });
            
            console.log('Feedback explorer service connections verified');
            
        } catch (error) {
            console.warn('Service connection test failed:', error.message);
        }
    }

    setupSentimentAnalysis() {
        // Setup sentiment analysis components
        this.sentimentAnalysisConfig = {
            enableRealTimeAnalysis: true,
            batchSize: 20,
            confidenceThreshold: this.config.confidenceThreshold,
            enableEmotionDetection: true,
            enableIntentClassification: true,
            
            // Sentiment visualization options
            chartOptions: {
                type: 'doughnut',
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: this.config.animationDuration,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: this.formatSentimentTooltip.bind(this)
                        }
                    }
                }
            }
        };
    }

    setupThemeExtraction() {
        // Configure theme extraction displays
        this.themeExtractionConfig = {
            enableAutomaticClustering: true,
            maxThemes: 10,
            minThemeSize: 3,
            similarityThreshold: 0.75,
            enableKeywordExtraction: true,
            enableTopicModeling: true,
            
            // Theme visualization options
            clusterVisualization: {
                type: 'bubble',
                maxBubbleSize: 50,
                minBubbleSize: 10,
                colorByCategory: true,
                enableInteraction: true
            },
            
            wordCloudOptions: {
                maxWords: 50,
                minFontSize: 12,
                maxFontSize: 32,
                enableTooltips: true
            }
        };
    }

    setupContainer() {
        // Setup feedback explorer container structure
        if (!this.container) {
            throw new Error('Container element is required for SecureFeedbackSignalExplorer');
        }
        
        this.container.innerHTML = `
            <div class="feedback-explorer-wrapper">
                <div class="explorer-header">
                    <div class="explorer-title">
                        <h3>🔍 Feedback Signal Explorer</h3>
                        <span class="explorer-subtitle">AI-powered sentiment and theme analysis</span>
                    </div>
                    <div class="explorer-controls">
                        <select class="feedback-filter" aria-label="Filter feedback by sentiment">
                            <option value="all">All Feedback</option>
                            <option value="positive">Positive Only</option>
                            <option value="negative">Negative Only</option>
                            <option value="neutral">Neutral Only</option>
                        </select>
                        <select class="view-selector" aria-label="Select view mode">
                            <option value="overview">Overview</option>
                            <option value="sentiment">Sentiment Analysis</option>
                            <option value="themes">Theme Clusters</option>
                            <option value="timeline">Timeline Trends</option>
                        </select>
                        <button class="claude-analyze-btn" title="Analyze with Claude" aria-label="Run Claude analysis">
                            🤖 Analyze
                        </button>
                        <button class="explorer-refresh" title="Refresh Data" aria-label="Refresh feedback data">
                            🔄
                        </button>
                        <button class="explorer-export" title="Export Analysis" aria-label="Export analysis data">
                            📥
                        </button>
                        <button class="explorer-settings" title="Settings" aria-label="Explorer settings">
                            ⚙️
                        </button>
                    </div>
                </div>
                
                <div class="explorer-content">
                    <div class="explorer-loading" style="display: none;" role="status" aria-live="polite">
                        <div class="loading-spinner" aria-hidden="true"></div>
                        <span class="loading-text">Analyzing feedback signals...</span>
                    </div>
                    
                    <div class="explorer-error" style="display: none;" role="alert">
                        <div class="error-icon" aria-hidden="true">⚠️</div>
                        <div class="error-content">
                            <h4>Unable to Load Feedback Data</h4>
                            <p class="error-message"></p>
                            <button class="retry-btn">Retry</button>
                        </div>
                    </div>
                    
                    <div class="claude-processing" style="display: none;" role="status" aria-live="polite">
                        <div class="claude-spinner" aria-hidden="true">🤖</div>
                        <span class="claude-text">Claude is analyzing feedback patterns...</span>
                        <div class="claude-progress">
                            <div class="progress-bar"></div>
                        </div>
                    </div>
                    
                    <div class="explorer-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="total-feedback">--</div>
                            <div class="stat-label">Total Feedback</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="sentiment-score">--</div>
                            <div class="stat-label">Avg Sentiment</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="theme-count">--</div>
                            <div class="stat-label">Themes Identified</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="actionable-insights">--</div>
                            <div class="stat-label">Actionable Insights</div>
                        </div>
                    </div>
                    
                    <div class="explorer-visualization">
                        <div class="overview-view" id="overview-view">
                            <div class="overview-grid">
                                <div class="sentiment-overview">
                                    <h4>📊 Sentiment Distribution</h4>
                                    <canvas class="sentiment-chart" role="img" aria-label="Sentiment distribution chart"></canvas>
                                </div>
                                <div class="themes-overview">
                                    <h4>🏷️ Top Themes</h4>
                                    <div class="themes-list" id="themes-list"></div>
                                </div>
                                <div class="trends-overview">
                                    <h4>📈 Sentiment Trends</h4>
                                    <canvas class="trends-chart" role="img" aria-label="Sentiment trends chart"></canvas>
                                </div>
                                <div class="insights-overview">
                                    <h4>💡 Key Insights</h4>
                                    <div class="insights-list" id="insights-list"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="sentiment-view" id="sentiment-view" style="display: none;">
                            <div class="sentiment-analysis-container">
                                <div class="sentiment-breakdown">
                                    <canvas class="detailed-sentiment-chart"></canvas>
                                </div>
                                <div class="sentiment-details">
                                    <div class="sentiment-categories" id="sentiment-categories"></div>
                                    <div class="sentiment-timeline" id="sentiment-timeline"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="themes-view" id="themes-view" style="display: none;">
                            <div class="themes-analysis-container">
                                <div class="theme-clusters">
                                    <div class="clusters-visualization" id="clusters-visualization"></div>
                                </div>
                                <div class="theme-details">
                                    <div class="selected-theme-info" id="selected-theme-info"></div>
                                    <div class="theme-feedback-samples" id="theme-feedback-samples"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="timeline-view" id="timeline-view" style="display: none;">
                            <div class="timeline-container">
                                <canvas class="timeline-chart"></canvas>
                                <div class="timeline-controls">
                                    <button class="timeline-zoom" data-range="7d">7 Days</button>
                                    <button class="timeline-zoom" data-range="30d">30 Days</button>
                                    <button class="timeline-zoom" data-range="90d">90 Days</button>
                                    <button class="timeline-zoom" data-range="all">All Time</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="claude-insights" style="display: none;">
                        <h4>🤖 Claude's Analysis</h4>
                        <div class="claude-insights-content" id="claude-insights-content"></div>
                    </div>
                </div>
                
                <div class="feedback-tooltip" style="display: none;" role="tooltip">
                    <div class="tooltip-content"></div>
                </div>
                
                <div class="theme-details-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h4>Theme Analysis Details</h4>
                            <button class="modal-close" aria-label="Close details">×</button>
                        </div>
                        <div class="modal-body" id="theme-details-body"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Setup event listeners for explorer controls
        const refreshBtn = this.container.querySelector('.explorer-refresh');
        const exportBtn = this.container.querySelector('.explorer-export');
        const settingsBtn = this.container.querySelector('.explorer-settings');
        const claudeBtn = this.container.querySelector('.claude-analyze-btn');
        const retryBtn = this.container.querySelector('.retry-btn');
        const feedbackFilter = this.container.querySelector('.feedback-filter');
        const viewSelector = this.container.querySelector('.view-selector');
        const modalClose = this.container.querySelector('.modal-close');
        const timelineButtons = this.container.querySelectorAll('.timeline-zoom');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAnalysis());
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (claudeBtn) {
            claudeBtn.addEventListener('click', () => this.runClaudeAnalysis());
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }
        
        if (feedbackFilter) {
            feedbackFilter.addEventListener('change', (e) => {
                this.interactionState.filterBy = e.target.value;
                this.applyFiltersAndUpdate();
            });
        }
        
        if (viewSelector) {
            viewSelector.addEventListener('change', (e) => {
                this.switchView(e.target.value);
            });
        }
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideThemeDetailsModal());
        }
        
        timelineButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeTimelineRange(e.target.dataset.range);
            });
        });
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup resize observer
        this.setupResizeObserver();
    }

    setupKeyboardNavigation() {
        // Setup keyboard navigation for accessibility
        this.container.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'Escape':
                    this.hideThemeDetailsModal();
                    this.clearSelection();
                    break;
                case 'Enter':
                case ' ':
                    if (this.interactionState.selectedTheme) {
                        this.showThemeDetails(this.interactionState.selectedTheme);
                    }
                    event.preventDefault();
                    break;
            }
        });
    }

    setupResizeObserver() {
        // Setup resize observer for responsive updates
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.sentimentChart) this.sentimentChart.resize();
                if (this.themeChart) this.themeChart.resize();
                if (this.trendChart) this.trendChart.resize();
            });
            
            this.resizeObserver.observe(this.container);
        }
    }

    async render(filters = {}) {
        // Render secure feedback analysis
        try {
            performance.mark('feedback-explorer-render-start');
            
            this.currentFilters = { ...filters };
            this.showLoading();
            this.clearError();
            
            // Fetch feedback data via Worker endpoints
            const feedbackData = await this.fetchFeedbackData(filters);
            
            // Validate and process data
            this.validateFeedbackData(feedbackData);
            
            // Process sentiment analysis via secure Claude service (if enabled)
            const processedData = await this.processInitialFeedback(feedbackData);
            
            // Display theme clusters and sentiment trends
            await this.displayFeedbackAnalysis(processedData);
            
            // Update statistics
            this.updateStatistics(processedData);
            
            // Generate initial insights
            this.generateInitialInsights(processedData);
            
            // Update current data
            this.currentData = processedData;
            this.lastDataFetch = Date.now();
            
            // Setup auto-refresh
            this.setupAutoRefresh();
            
            // Hide loading state
            this.hideLoading();
            
            performance.mark('feedback-explorer-render-end');
            performance.measure('feedback-explorer-render', 'feedback-explorer-render-start', 'feedback-explorer-render-end');
            
            // Log successful render
            this.logAuditEvent('feedback_explorer_rendered', {
                filters,
                feedbackCount: processedData.feedback?.length || 0,
                renderTime: Date.now()
            });
            
        } catch (error) {
            console.error('Feedback explorer render failed:', error);
            this.showError(error.message);
            this.hideLoading();
            this.logAuditEvent('render_failed', { error: error.message, filters });
        }
    }

    async fetchFeedbackData(filters) {
        // Fetch feedback data via Worker endpoints
        try {
            const response = await this.analyticsService.getFeedbackSignalData({
                ...filters,
                includeMetadata: true,
                includeSentiment: true,
                includeThemes: true,
                maxResults: this.config.maxFeedbackItems,
                minLength: this.config.minFeedbackLength
            });
            
            if (!response || !response.success) {
                throw new Error(response?.message || 'Invalid response from feedback analytics service');
            }
            
            return response.data;
            
        } catch (error) {
            console.error('Feedback data fetch failed:', error);
            throw new Error(`Failed to fetch feedback data: ${error.message}`);
        }
    }

    validateFeedbackData(data) {
        // Validate feedback data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Feedback data must be an object');
        }
        
        if (!Array.isArray(data.feedback)) {
            throw new Error('Feedback data must contain a feedback array');
        }
        
        // Validate feedback items
        data.feedback.forEach((item, index) => {
            if (!item || typeof item !== 'object') {
                throw new Error(`Invalid feedback item at index ${index}: must be an object`);
            }
            
            if (typeof item.text !== 'string' || item.text.length < this.config.minFeedbackLength) {
                throw new Error(`Invalid feedback text at index ${index}: must be a string with minimum length ${this.config.minFeedbackLength}`);
            }
            
            if (item.sentiment && typeof item.sentiment !== 'number') {
                throw new Error(`Invalid sentiment score at index ${index}: must be a number`);
            }
        });
        
        // Validate sentiment data if present
        if (this.securitySettings.validateSentiment && data.sentimentAnalysis) {
            this.validateSentimentData(data.sentimentAnalysis);
        }
    }

    validateSentimentData(sentimentData) {
        // Validate sentiment analysis data
        if (sentimentData.distribution) {
            const total = Object.values(sentimentData.distribution).reduce((sum, val) => sum + val, 0);
            if (Math.abs(total - 1) > 0.01) { // Allow small rounding errors
                console.warn('Sentiment distribution does not sum to 1:', total);
            }
        }
        
        if (sentimentData.confidence && (sentimentData.confidence < 0 || sentimentData.confidence > 1)) {
            console.warn('Invalid sentiment confidence score:', sentimentData.confidence);
        }
    }

    async processInitialFeedback(data) {
        // Process feedback for initial display (basic processing)
        const processedFeedback = data.feedback.map(item => ({
            ...item,
            // Sanitize content
            text: this.securitySettings.sanitizeFeedback ? this.sanitizeFeedbackText(item.text) : item.text,
            // Anonymize if enabled
            userId: this.securitySettings.anonymizeUsers ? this.anonymizeUserId(item.userId) : item.userId,
            // Add display properties
            id: item.id || this.generateFeedbackId(item.text),
            processed: true,
            displayText: this.truncateForDisplay(item.text),
            sentimentCategory: this.categorizeSentiment(item.sentiment),
            timestamp: item.timestamp || new Date().toISOString()
        }));
        
        return {
            ...data,
            feedback: processedFeedback,
            processedAt: new Date().toISOString(),
            processingType: 'initial'
        };
    }

    sanitizeFeedbackText(text) {
        // Sanitize feedback text for security
        if (typeof text !== 'string') {
            return String(text);
        }
        
        return text
            .replace(/[<>\"'&]/g, '') // Remove potential XSS characters
            .substring(0, this.config.maxDisplayLength)
            .trim();
    }

    anonymizeUserId(userId) {
        // Anonymize user ID for privacy
        if (!userId) return 'anonymous';
        
        // Simple hash-based anonymization (in production, use proper crypto)
        return `user_${userId.toString().split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0).toString().replace('-', '0')}`;
    }

    generateFeedbackId(text) {
        // Generate unique ID for feedback
        return `fb_${text.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    }

    truncateForDisplay(text) {
        // Truncate text for display
        if (text.length <= 100) return text;
        return text.substring(0, 97) + '...';
    }

    categorizeSentiment(sentimentScore) {
        // Categorize sentiment score
        if (typeof sentimentScore !== 'number') return 'neutral';
        
        for (const [category, config] of Object.entries(this.sentimentCategories)) {
            if (sentimentScore >= config.range[0] && sentimentScore <= config.range[1]) {
                return category;
            }
        }
        
        return 'neutral';
    }

    async displayFeedbackAnalysis(data) {
        // Display feedback analysis based on current view
        switch (this.interactionState.viewMode) {
            case 'overview':
                await this.displayOverview(data);
                break;
            case 'sentiment':
                await this.displaySentimentAnalysis(data);
                break;
            case 'themes':
                await this.displayThemeAnalysis(data);
                break;
            case 'timeline':
                await this.displayTimelineAnalysis(data);
                break;
            default:
                await this.displayOverview(data);
        }
    }

    async displayOverview(data) {
        // Display overview of all feedback analysis
        // Create sentiment chart
        await this.createSentimentChart(data);
        
        // Display top themes
        this.displayTopThemes(data);
        
        // Show sentiment trends
        this.createTrendChart(data);
        
        // Generate key insights
        this.displayKeyInsights(data);
    }

    async displaySentimentAnalysis(data) {
        // Display detailed sentiment analysis
        await this.createDetailedSentimentChart(data);
        this.displaySentimentCategories(data);
        this.displaySentimentTimeline(data);
    }

    async displayThemeAnalysis(data) {
        // Display theme cluster analysis
        this.createThemeClusters(data);
        this.displayThemeDetails(data);
    }

    async displayTimelineAnalysis(data) {
        // Display timeline analysis
        this.createTimelineChart(data);
    }

    async createSentimentChart(data) {
        // Create secure sentiment visualization
        try {
            // Use Worker-processed sentiment data
            const sentimentData = this.prepareSentimentChartData(data);
            
            // Get canvas context
            const canvas = this.container.querySelector('.sentiment-chart');
            if (!canvas) {
                throw new Error('Sentiment chart canvas not found');
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart
            if (this.sentimentChart) {
                this.sentimentChart.destroy();
            }
            
            // Create Chart.js sentiment chart
            this.sentimentChart = new Chart(ctx, {
                type: 'doughnut',
                data: sentimentData,
                options: {
                    ...this.sentimentAnalysisConfig.chartOptions,
                    onClick: this.handleSentimentChartClick.bind(this),
                    onHover: this.handleSentimentChartHover.bind(this)
                }
            });
            
            // Display sentiment distribution and trends
            this.addSentimentTrendIndicators();
            
            // Enable secure sentiment drill-down
            this.enableSecureSentimentDrillDown();
            
            console.log('Sentiment chart created successfully');
            
        } catch (error) {
            console.error('Sentiment chart creation failed:', error);
            throw new Error(`Sentiment chart creation failed: ${error.message}`);
        }
    }

    prepareSentimentChartData(data) {
        // Prepare sentiment data for Chart.js
        const sentimentCounts = {};
        
        // Initialize counts
        Object.keys(this.sentimentCategories).forEach(category => {
            sentimentCounts[category] = 0;
        });
        
        // Count feedback by sentiment category
        data.feedback.forEach(item => {
            const category = item.sentimentCategory || 'neutral';
            sentimentCounts[category]++;
        });
        
        // Prepare chart data
        const labels = [];
        const chartData = [];
        const colors = [];
        
        Object.entries(sentimentCounts).forEach(([category, count]) => {
            if (count > 0) {
                const config = this.sentimentCategories[category];
                labels.push(config.label);
                chartData.push(count);
                colors.push(config.color);
            }
        });
        
        return {
            labels,
            datasets: [{
                data: chartData,
                backgroundColor: colors,
                borderColor: colors.map(color => color + 'CC'),
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverBackgroundColor: colors.map(color => color + 'DD')
            }]
        };
    }

    addSentimentTrendIndicators() {
        // Add trend indicators to sentiment chart
        if (!this.sentimentChart) return;
        
        // This would add custom trend indicators based on historical data
        // Implementation depends on specific Chart.js version and plugins
    }

    enableSecureSentimentDrillDown() {
        // Enable secure sentiment drill-down capabilities
        if (!this.sentimentChart) return;
        
        // Add secure interaction tracking
        this.sentimentChart.canvas.addEventListener('mousemove', (event) => {
            this.trackSentimentInteraction(event);
        });
    }

   displayTopThemes(data) {
        // Display top themes list
        const themesList = this.container.querySelector('#themes-list');
        if (!themesList) return;
        
        const themes = this.extractTopThemes(data);
        
        themesList.innerHTML = themes.map((theme, index) => `
            <div class="theme-item" data-theme-id="${theme.id}" tabindex="0">
                <div class="theme-header">
                    <span class="theme-icon">${this.themeCategories[theme.category]?.icon || '📝'}</span>
                    <span class="theme-name">${this.sanitizeFeedbackText(theme.name)}</span>
                    <span class="theme-count">${theme.count}</span>
                </div>
                <div class="theme-sentiment">
                    <div class="sentiment-bar">
                        <div class="sentiment-positive" style="width: ${theme.sentimentBreakdown.positive}%"></div>
                        <div class="sentiment-neutral" style="width: ${theme.sentimentBreakdown.neutral}%"></div>
                        <div class="sentiment-negative" style="width: ${theme.sentimentBreakdown.negative}%"></div>
                    </div>
                    <span class="sentiment-score">${theme.avgSentiment.toFixed(1)}</span>
                </div>
                <div class="theme-keywords">
                    ${theme.keywords.slice(0, 3).map(keyword => 
                        `<span class="keyword-tag">${this.sanitizeFeedbackText(keyword)}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('');
        
        // Add theme interaction listeners
        this.setupThemeInteractionListeners();
    }

    extractTopThemes(data) {
        // Extract and analyze top themes from feedback
        const themeMap = new Map();
        
        // Group feedback by themes (if available) or analyze content
        data.feedback.forEach(item => {
            const themes = item.themes || this.extractThemesFromText(item.text);
            
            themes.forEach(theme => {
                if (!themeMap.has(theme.name)) {
                    themeMap.set(theme.name, {
                        id: this.generateThemeId(theme.name),
                        name: theme.name,
                        category: theme.category || 'other',
                        count: 0,
                        sentiments: [],
                        keywords: new Set(),
                        feedback: []
                    });
                }
                
                const themeData = themeMap.get(theme.name);
                themeData.count++;
                themeData.sentiments.push(item.sentiment || 0);
                themeData.feedback.push(item);
                
                // Add keywords
                if (theme.keywords) {
                    theme.keywords.forEach(keyword => themeData.keywords.add(keyword));
                }
            });
        });
        
        // Process themes and calculate metrics
        const processedThemes = Array.from(themeMap.values()).map(theme => ({
            ...theme,
            keywords: Array.from(theme.keywords),
            avgSentiment: theme.sentiments.reduce((sum, s) => sum + s, 0) / theme.sentiments.length,
            sentimentBreakdown: this.calculateSentimentBreakdown(theme.sentiments)
        }));
        
        // Sort by count and return top themes
        return processedThemes
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }

    extractThemesFromText(text) {
        // Extract themes from text using simple keyword matching
        // In production, this would use more sophisticated NLP
        const themes = [];
        
        Object.entries(this.themeCategories).forEach(([category, config]) => {
            if (this.textMatchesTheme(text, category)) {
                themes.push({
                    name: config.label,
                    category: category,
                    confidence: 0.7,
                    keywords: this.extractKeywordsForTheme(text, category)
                });
            }
        });
        
        return themes.length > 0 ? themes : [{
            name: 'General Feedback',
            category: 'other',
            confidence: 0.5,
            keywords: this.extractGeneralKeywords(text)
        }];
    }

    textMatchesTheme(text, category) {
        // Simple theme matching based on keywords
        const themeKeywords = {
            product: ['product', 'feature', 'functionality', 'quality', 'design'],
            service: ['service', 'help', 'assistance', 'staff', 'team'],
            communication: ['communication', 'message', 'response', 'contact', 'reply'],
            pricing: ['price', 'cost', 'expensive', 'cheap', 'value', 'money'],
            support: ['support', 'help', 'issue', 'problem', 'assistance'],
            technical: ['bug', 'error', 'crash', 'technical', 'system', 'performance'],
            ui_ux: ['interface', 'design', 'usability', 'experience', 'navigation']
        };
        
        const keywords = themeKeywords[category] || [];
        const lowerText = text.toLowerCase();
        
        return keywords.some(keyword => lowerText.includes(keyword));
    }

    extractKeywordsForTheme(text, category) {
        // Extract relevant keywords for theme
        const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 3);
        return words.slice(0, 5); // Return first 5 relevant words
    }

    extractGeneralKeywords(text) {
        // Extract general keywords from text
        const words = text.toLowerCase().split(/\W+/)
            .filter(word => word.length > 3)
            .filter(word => !this.isStopWord(word));
        
        return words.slice(0, 3);
    }

    isStopWord(word) {
        // Check if word is a stop word
        const stopWords = ['this', 'that', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their'];
        return stopWords.includes(word);
    }

    generateThemeId(themeName) {
        // Generate unique ID for theme
        return `theme_${themeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    }

    calculateSentimentBreakdown(sentiments) {
        // Calculate sentiment breakdown percentages
        const total = sentiments.length;
        if (total === 0) return { positive: 0, neutral: 0, negative: 0 };
        
        const positive = sentiments.filter(s => s > 0.2).length;
        const negative = sentiments.filter(s => s < -0.2).length;
        const neutral = total - positive - negative;
        
        return {
            positive: (positive / total) * 100,
            neutral: (neutral / total) * 100,
            negative: (negative / total) * 100
        };
    }

    setupThemeInteractionListeners() {
        // Setup interaction listeners for theme items
        const themeItems = this.container.querySelectorAll('.theme-item');
        
        themeItems.forEach(item => {
            item.addEventListener('click', () => {
                const themeId = item.dataset.themeId;
                this.selectTheme(themeId);
            });
            
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const themeId = item.dataset.themeId;
                    this.showThemeDetails(themeId);
                    e.preventDefault();
                }
            });
        });
    }

    createTrendChart(data) {
        // Create sentiment trends chart
        const canvas = this.container.querySelector('.trends-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        const trendData = this.prepareTrendData(data);
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: trendData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        }
                    },
                    y: {
                        min: -1,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Sentiment Score'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    prepareTrendData(data) {
        // Prepare trend data for chart
        const trendPoints = this.calculateSentimentTrends(data);
        
        return {
            datasets: [{
                label: 'Sentiment Trend',
                data: trendPoints,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        };
    }

    calculateSentimentTrends(data) {
        // Calculate sentiment trends over time
        const trends = new Map();
        
        data.feedback.forEach(item => {
            const date = new Date(item.timestamp).toDateString();
            if (!trends.has(date)) {
                trends.set(date, { sentiments: [], count: 0 });
            }
            
            const dayData = trends.get(date);
            dayData.sentiments.push(item.sentiment || 0);
            dayData.count++;
        });
        
        // Calculate average sentiment per day
        return Array.from(trends.entries()).map(([date, dayData]) => ({
            x: new Date(date),
            y: dayData.sentiments.reduce((sum, s) => sum + s, 0) / dayData.sentiments.length
        })).sort((a, b) => a.x - b.x);
    }

    displayKeyInsights(data) {
        // Display key insights from analysis
        const insightsList = this.container.querySelector('#insights-list');
        if (!insightsList) return;
        
        const insights = this.generateKeyInsights(data);
        
        insightsList.innerHTML = insights.map(insight => `
            <div class="insight-item insight-${insight.type}">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-description">${insight.description}</div>
                    ${insight.metric ? `<div class="insight-metric">${insight.metric}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    generateKeyInsights(data) {
        // Generate key insights from feedback data
        const insights = [];
        
        // Sentiment insights
        const avgSentiment = this.calculateAverageSentiment(data);
        if (avgSentiment > 0.5) {
            insights.push({
                type: 'positive',
                icon: '😊',
                title: 'Positive Sentiment Trend',
                description: 'Overall feedback sentiment is positive',
                metric: `${(avgSentiment * 100).toFixed(1)}% positive`
            });
        } else if (avgSentiment < -0.3) {
            insights.push({
                type: 'negative',
                icon: '⚠️',
                title: 'Negative Sentiment Alert',
                description: 'Feedback shows concerning negative trends',
                metric: `${(Math.abs(avgSentiment) * 100).toFixed(1)}% negative`
            });
        }
        
        // Volume insights
        const totalFeedback = data.feedback.length;
        if (totalFeedback > 100) {
            insights.push({
                type: 'volume',
                icon: '📊',
                title: 'High Feedback Volume',
                description: 'Strong engagement with feedback collection',
                metric: `${totalFeedback} responses`
            });
        }
        
        // Theme insights
        const themes = this.extractTopThemes(data);
        const topTheme = themes[0];
        if (topTheme && topTheme.count > totalFeedback * 0.3) {
            insights.push({
                type: 'theme',
                icon: '🏷️',
                title: 'Dominant Theme Identified',
                description: `${topTheme.name} is the primary concern`,
                metric: `${topTheme.count} mentions`
            });
        }
        
        return insights.slice(0, 4); // Limit to 4 insights
    }

    calculateAverageSentiment(data) {
        // Calculate average sentiment score
        const sentiments = data.feedback
            .map(item => item.sentiment)
            .filter(sentiment => typeof sentiment === 'number');
        
        if (sentiments.length === 0) return 0;
        
        return sentiments.reduce((sum, sentiment) => sum + sentiment, 0) / sentiments.length;
    }

    async processFeedbackWithClaude(feedbackData) {
        // Process feedback via secure Claude service
        try {
            if (!this.claudeService) {
                throw new Error('Claude service not available');
            }
            
            // Check rate limiting
            if (!this.checkClaudeRateLimit()) {
                throw new Error('Claude rate limit exceeded. Please wait before retrying.');
            }
            
            this.showClaudeProcessing();
            this.isProcessingWithClaude = true;
            
            // Send feedback to Worker for Claude analysis
            const claudeAnalysis = await this.sendFeedbackToClaude(feedbackData);
            
            // Extract themes and sentiment server-side
            const processedResults = this.processClaudeResults(claudeAnalysis);
            
            // Return structured classification results
            const structuredResults = this.structureClaudeResults(processedResults);
            
            this.hideClaudeProcessing();
            this.isProcessingWithClaude = false;
            
            // Update rate limiter
            this.updateClaudeRateLimit();
            
            // Log Claude processing
            this.logAuditEvent('claude_processing_completed', {
                feedbackCount: feedbackData.length,
                processingTime: Date.now(),
                themesFound: structuredResults.themes?.length || 0
            });
            
            return structuredResults;
            
        } catch (error) {
            console.error('Claude feedback processing failed:', error);
            this.hideClaudeProcessing();
            this.isProcessingWithClaude = false;
            throw new Error(`Claude processing failed: ${error.message}`);
        }
    }

    checkClaudeRateLimit() {
        // Check Claude API rate limiting
        const now = Date.now();
        
        if (now > this.claudeRateLimiter.resetTime) {
            // Reset rate limiter
            this.claudeRateLimiter.requests = 0;
            this.claudeRateLimiter.resetTime = now + 60000; // 1 minute window
        }
        
        return this.claudeRateLimiter.requests < this.claudeRateLimiter.maxRequests;
    }

    updateClaudeRateLimit() {
        // Update rate limit counter
        this.claudeRateLimiter.requests++;
    }

    async sendFeedbackToClaude(feedbackData) {
        // Send feedback to Worker for Claude analysis
        try {
            // Prepare feedback for Claude analysis
            const claudePayload = {
                feedback: feedbackData.map(item => ({
                    text: item.text,
                    id: item.id,
                    timestamp: item.timestamp
                })),
                analysisType: 'comprehensive',
                includeThemes: true,
                includeSentiment: true,
                includeInsights: true,
                includeRecommendations: true,
                confidenceThreshold: this.config.confidenceThreshold
            };
            
            // Call Claude service
            const response = await this.claudeService.classifyFeedback(claudePayload);
            
            if (!response || !response.success) {
                throw new Error(response?.message || 'Invalid Claude response');
            }
            
            return response.data;
            
        } catch (error) {
            console.error('Claude API call failed:', error);
            throw error;
        }
    }

    processClaudeResults(claudeResults) {
        // Process raw Claude results
        return {
            themes: this.processClaudeThemes(claudeResults.themes || []),
            sentiment: this.processClaudeSentiment(claudeResults.sentiment || {}),
            insights: this.processClaudeInsights(claudeResults.insights || []),
            recommendations: this.processClaudeRecommendations(claudeResults.recommendations || []),
            confidence: claudeResults.confidence || 0.5,
            processedAt: new Date().toISOString()
        };
    }

    processClaudeThemes(themes) {
        // Process Claude-identified themes
        return themes.map(theme => ({
            ...theme,
            id: this.generateThemeId(theme.name),
            category: this.mapThemeToCategory(theme.name),
            keywords: theme.keywords || [],
            confidence: theme.confidence || 0.5,
            feedbackIds: theme.feedbackIds || []
        }));
    }

    processClaudeSentiment(sentiment) {
        // Process Claude sentiment analysis
        return {
            overall: sentiment.overall || 0,
            distribution: sentiment.distribution || {},
            confidence: sentiment.confidence || 0.5,
            trends: sentiment.trends || [],
            factors: sentiment.factors || []
        };
    }

    processClaudeInsights(insights) {
        // Process Claude-generated insights
        return insights.map(insight => ({
            ...insight,
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: insight.type || 'general',
            priority: insight.priority || 'medium',
            actionable: insight.actionable || false
        }));
    }

    processClaudeRecommendations(recommendations) {
        // Process Claude recommendations
        return recommendations.map(rec => ({
            ...rec,
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            priority: rec.priority || 'medium',
            effort: rec.effort || 'medium',
            impact: rec.impact || 'medium'
        }));
    }

    mapThemeToCategory(themeName) {
        // Map theme name to predefined category
        const lowerTheme = themeName.toLowerCase();
        
        for (const [category, config] of Object.entries(this.themeCategories)) {
            if (lowerTheme.includes(category) || lowerTheme.includes(config.label.toLowerCase())) {
                return category;
            }
        }
        
        return 'other';
    }

    structureClaudeResults(processedResults) {
        // Structure Claude results for display
        return {
            analysis: {
                type: 'claude_comprehensive',
                processedAt: processedResults.processedAt,
                confidence: processedResults.confidence
            },
            themes: processedResults.themes,
            sentiment: processedResults.sentiment,
            insights: processedResults.insights,
            recommendations: processedResults.recommendations,
            summary: this.generateClaudeSummary(processedResults)
        };
    }

    generateClaudeSummary(results) {
        // Generate summary of Claude analysis
        const themeCount = results.themes.length;
        const avgSentiment = results.sentiment.overall;
        const insightCount = results.insights.length;
        
        return {
            totalThemes: themeCount,
            dominantSentiment: this.categorizeSentiment(avgSentiment),
            keyInsights: insightCount,
            overallScore: this.calculateOverallScore(results),
            recommendations: results.recommendations.length
        };
    }

    calculateOverallScore(results) {
        // Calculate overall feedback score
        const sentimentScore = (results.sentiment.overall + 1) / 2; // Normalize to 0-1
        const confidenceScore = results.confidence;
        const themeBalance = Math.min(results.themes.length / 5, 1); // Ideal 5 themes
        
        return ((sentimentScore * 0.5) + (confidenceScore * 0.3) + (themeBalance * 0.2)) * 100;
    }

    async runClaudeAnalysis() {
        // Run comprehensive Claude analysis
        try {
            if (!this.currentData || !this.currentData.feedback || this.currentData.feedback.length === 0) {
                throw new Error('No feedback data available for analysis');
            }
            
            if (this.isProcessingWithClaude) {
                throw new Error('Claude analysis already in progress');
            }
            
            // Check credits
            const creditCheck = await this.checkCreditsForClaude();
            if (!creditCheck.sufficient) {
                throw new Error(`Insufficient credits for Claude analysis. Required: ${this.config.creditCost}, Available: ${creditCheck.balance}`);
            }
            
            // Process with Claude
            const claudeResults = await this.processFeedbackWithClaude(this.currentData.feedback);
            
            // Update display with Claude results
            this.displayClaudeResults(claudeResults);
            
            // Store results
            this.lastAnalysis = claudeResults;
            
            // Log successful analysis
            this.logAuditEvent('claude_analysis_completed', {
                feedbackCount: this.currentData.feedback.length,
                themesFound: claudeResults.themes?.length || 0,
                insightsGenerated: claudeResults.insights?.length || 0
            });
            
        } catch (error) {
            console.error('Claude analysis failed:', error);
            this.showError(`Claude analysis failed: ${error.message}`);
        }
    }

    async checkCreditsForClaude() {
        // Check if user has sufficient credits for Claude analysis
        try {
            const balance = await this.claudeService.checkBalance?.() || { credits: 10 };
            
            return {
                sufficient: balance.credits >= this.config.creditCost,
                balance: balance.credits,
                required: this.config.creditCost
            };
            
        } catch (error) {
            console.error('Credit check failed:', error);
            return { sufficient: false, balance: 0, required: this.config.creditCost };
        }
    }

    displayClaudeResults(claudeResults) {
        // Display Claude analysis results
        const claudeInsights = this.container.querySelector('.claude-insights');
        const claudeContent = this.container.querySelector('#claude-insights-content');
        
        if (!claudeInsights || !claudeContent) return;
        
        claudeContent.innerHTML = `
            <div class="claude-analysis-summary">
                <div class="analysis-header">
                    <h5>🤖 Claude's Comprehensive Analysis</h5>
                    <div class="analysis-meta">
                        <span class="confidence-score">Confidence: ${(claudeResults.analysis.confidence * 100).toFixed(1)}%</span>
                        <span class="analysis-time">Analyzed: ${this.formatDate(claudeResults.analysis.processedAt)}</span>
                    </div>
                </div>
                
                <div class="analysis-overview">
                    <div class="overview-metric">
                        <span class="metric-value">${claudeResults.summary.totalThemes}</span>
                        <span class="metric-label">Themes Identified</span>
                    </div>
                    <div class="overview-metric">
                        <span class="metric-value">${claudeResults.summary.overallScore.toFixed(0)}</span>
                        <span class="metric-label">Overall Score</span>
                    </div>
                    <div class="overview-metric">
                        <span class="metric-value">${claudeResults.summary.keyInsights}</span>
                        <span class="metric-label">Key Insights</span>
                    </div>
                    <div class="overview-metric">
                        <span class="metric-value">${claudeResults.summary.recommendations}</span>
                        <span class="metric-label">Recommendations</span>
                    </div>
                </div>
                
                ${claudeResults.insights && claudeResults.insights.length > 0 ? `
                    <div class="claude-insights-section">
                        <h6>💡 Key Insights</h6>
                        <div class="insights-grid">
                            ${claudeResults.insights.slice(0, 4).map(insight => `
                                <div class="claude-insight insight-${insight.priority}">
                                    <div class="insight-title">${this.sanitizeFeedbackText(insight.title)}</div>
                                    <div class="insight-description">${this.sanitizeFeedbackText(insight.description)}</div>
                                    ${insight.actionable ? '<span class="actionable-badge">Actionable</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${claudeResults.recommendations && claudeResults.recommendations.length > 0 ? `
                    <div class="claude-recommendations-section">
                        <h6>🎯 Recommendations</h6>
                        <div class="recommendations-list">
                            ${claudeResults.recommendations.slice(0, 3).map(rec => `
                                <div class="claude-recommendation priority-${rec.priority}">
                                    <div class="rec-header">
                                        <span class="rec-title">${this.sanitizeFeedbackText(rec.title)}</span>
                                        <div class="rec-badges">
                                            <span class="priority-badge">${rec.priority}</span>
                                            <span class="impact-badge">${rec.impact} impact</span>
                                        </div>
                                    </div>
                                    <div class="rec-description">${this.sanitizeFeedbackText(rec.description)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Show Claude insights section
        claudeInsights.style.display = 'block';
        
        // Update theme display if themes were found
        if (claudeResults.themes && claudeResults.themes.length > 0) {
            this.updateThemeDisplayWithClaude(claudeResults.themes);
        }
    }

    updateThemeDisplayWithClaude(claudeThemes) {
        // Update theme display with Claude-identified themes
        const themesList = this.container.querySelector('#themes-list');
        if (!themesList) return;
        
        // Merge Claude themes with existing themes
        const enhancedThemes = this.mergeThemesWithClaude(claudeThemes);
        
        // Re-render themes list
        themesList.innerHTML = enhancedThemes.map((theme, index) => `
            <div class="theme-item enhanced-theme" data-theme-id="${theme.id}" tabindex="0">
                <div class="theme-header">
                    <span class="theme-icon">${this.themeCategories[theme.category]?.icon || '📝'}</span>
                    <span class="theme-name">${this.sanitizeFeedbackText(theme.name)}</span>
                    <span class="theme-count">${theme.count}</span>
                    ${theme.claudeEnhanced ? '<span class="claude-badge">🤖</span>' : ''}
                </div>
                <div class="theme-confidence">
                    <span class="confidence-label">Confidence:</span>
                    <span class="confidence-value">${(theme.confidence * 100).toFixed(0)}%</span>
                </div>
                <div class="theme-sentiment">
                    <div class="sentiment-bar">
                        <div class="sentiment-positive" style="width: ${theme.sentimentBreakdown.positive}%"></div>
                        <div class="sentiment-neutral" style="width: ${theme.sentimentBreakdown.neutral}%"></div>
                        <div class="sentiment-negative" style="width: ${theme.sentimentBreakdown.negative}%"></div>
                    </div>
                    <span class="sentiment-score">${theme.avgSentiment.toFixed(1)}</span>
                </div>
                <div class="theme-keywords">
                    ${theme.keywords.slice(0, 3).map(keyword => 
                        `<span class="keyword-tag">${this.sanitizeFeedbackText(keyword)}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('');
        
        // Re-setup interaction listeners
        this.setupThemeInteractionListeners();
    }

    mergeThemesWithClaude(claudeThemes) {
        // Merge Claude themes with existing analysis
        const existingThemes = this.extractTopThemes(this.currentData);
        const mergedThemes = [];
        
        // Add Claude themes
        claudeThemes.forEach(claudeTheme => {
            mergedThemes.push({
                ...claudeTheme,
                claudeEnhanced: true,
                sentimentBreakdown: this.calculateThemeSentimentBreakdown(claudeTheme),
                avgSentiment: this.calculateThemeAverageSentiment(claudeTheme)
            });
        });
        
        // Add existing themes that weren't identified by Claude
        existingThemes.forEach(existingTheme => {
            const claudeMatch = claudeThemes.find(ct => 
                ct.name.toLowerCase() === existingTheme.name.toLowerCase()
            );
            
            if (!claudeMatch) {
                mergedThemes.push({
                    ...existingTheme,
                    claudeEnhanced: false,
                    confidence: 0.5
                });
            }
        });
        
        return mergedThemes.sort((a, b) => b.count - a.count);
    }

    calculateThemeSentimentBreakdown(theme) {
        // Calculate sentiment breakdown for Claude theme
        if (!theme.feedbackIds || theme.feedbackIds.length === 0) {
            return { positive: 33, neutral: 34, negative: 33 };
        }
        
        const themeFeedback = this.currentData.feedback.filter(item => 
            theme.feedbackIds.includes(item.id)
        );
        
        return this.calculateSentimentBreakdown(
            themeFeedback.map(item => item.sentiment || 0)
        );
    }

    calculateThemeAverageSentiment(theme) {
        // Calculate average sentiment for Claude theme
        if (!theme.feedbackIds || theme.feedbackIds.length === 0) {
            return 0;
        }
        
        const themeFeedback = this.currentData.feedback.filter(item => 
            theme.feedbackIds.includes(item.id)
        );
        
        if (themeFeedback.length === 0) return 0;
        
        const sentiments = themeFeedback
            .map(item => item.sentiment || 0)
            .filter(sentiment => typeof sentiment === 'number');
        
        if (sentiments.length === 0) return 0;
        
        return sentiments.reduce((sum, sentiment) => sum + sentiment, 0) / sentiments.length;
    }

    updateStatistics(data) {
        // Update statistics display
        const totalFeedbackEl = this.container.querySelector('#total-feedback');
        const sentimentScoreEl = this.container.querySelector('#sentiment-score');
        const themeCountEl = this.container.querySelector('#theme-count');
        const actionableInsightsEl = this.container.querySelector('#actionable-insights');
        
        if (totalFeedbackEl) {
            totalFeedbackEl.textContent = data.feedback?.length || 0;
        }
        
        if (sentimentScoreEl) {
            const avgSentiment = this.calculateAverageSentiment(data);
            sentimentScoreEl.textContent = (avgSentiment * 100).toFixed(1) + '%';
        }
        
        if (themeCountEl) {
            const themes = this.extractTopThemes(data);
            themeCountEl.textContent = themes.length;
        }
        
        if (actionableInsightsEl) {
            const insights = this.generateKeyInsights(data);
            const actionableCount = insights.filter(insight => insight.type !== 'volume').length;
            actionableInsightsEl.textContent = actionableCount;
        }
    }

    generateInitialInsights(data) {
        // Generate initial insights before Claude analysis
        const insights = this.generateKeyInsights(data);
        this.displayKeyInsights(data);
    }

    setupAutoRefresh() {
        // Setup auto-refresh for real-time updates
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (!this.isProcessingWithClaude && !this.isLoading) {
                this.refresh();
            }
        }, this.config.refreshInterval);
    }

    async refresh() {
        // Refresh feedback data
        try {
            await this.render(this.currentFilters);
        } catch (error) {
            console.error('Refresh failed:', error);
        }
    }

    async retry() {
        // Retry failed operation
        this.clearError();
        await this.render(this.currentFilters);
    }

    applyFiltersAndUpdate() {
        // Apply filters and update display
        this.updateDebounced();
    }

    async _updateInternal() {
        // Internal update method
        if (!this.currentData) return;
        
        const filteredData = this.applyCurrentFilters(this.currentData);
        await this.displayFeedbackAnalysis(filteredData);
        this.updateStatistics(filteredData);
    }

    applyCurrentFilters(data) {
        // Apply current filters to data
        let filteredFeedback = [...data.feedback];
        
        // Apply sentiment filter
        if (this.interactionState.filterBy !== 'all') {
            filteredFeedback = filteredFeedback.filter(item => {
                const category = item.sentimentCategory || 'neutral';
                
                switch (this.interactionState.filterBy) {
                    case 'positive':
                        return ['very_positive', 'positive'].includes(category);
                    case 'negative':
                        return ['very_negative', 'negative'].includes(category);
                    case 'neutral':
                        return category === 'neutral';
                    default:
                        return true;
                }
            });
        }
        
        return {
            ...data,
            feedback: filteredFeedback
        };
    }

    switchView(viewMode) {
        // Switch between different view modes
        this.interactionState.viewMode = viewMode;
        
        // Hide all views
        const views = ['overview-view', 'sentiment-view', 'themes-view', 'timeline-view'];
        views.forEach(viewId => {
            const view = this.container.querySelector(`#${viewId}`);
            if (view) view.style.display = 'none';
        });
        
        // Show selected view
        const activeView = this.container.querySelector(`#${viewMode}-view`);
        if (activeView) {
            activeView.style.display = 'block';
        }
        
        // Re-render for new view
        if (this.currentData) {
            this.displayFeedbackAnalysis(this.currentData);
        }
    }

    changeTimelineRange(range) {
        // Change timeline range
        this.interactionState.timelineRange = range;
        
        // Update timeline buttons
        const buttons = this.container.querySelectorAll('.timeline-zoom');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        
        // Refresh timeline chart
        if (this.currentData) {
            this.createTimelineChart(this.currentData);
        }
    }

    selectTheme(themeId) {
        // Select theme for detailed view
        this.interactionState.selectedTheme = themeId;
        
        // Update theme item visual state
        const themeItems = this.container.querySelectorAll('.theme-item');
        themeItems.forEach(item => {
            item.classList.toggle('selected', item.dataset.themeId === themeId);
        });
        
        // Show theme details if in themes view
        if (this.interactionState.viewMode === 'themes') {
            this.displaySelectedThemeDetails(themeId);
        }
    }

    displaySelectedThemeDetails(themeId) {
        // Display details for selected theme
        const selectedInfo = this.container.querySelector('#selected-theme-info');
        const feedbackSamples = this.container.querySelector('#theme-feedback-samples');
        
        if (!selectedInfo || !feedbackSamples || !this.currentData) return;
        
        const theme = this.findThemeById(themeId);
        if (!theme) return;
        
        // Display theme information
        selectedInfo.innerHTML = `
            <div class="theme-detail-header">
                <h5>${this.sanitizeFeedbackText(theme.name)}</h5>
                <div class="theme-metrics">
                    <span class="metric">Count: ${theme.count}</span>
                    <span class="metric">Avg Sentiment: ${theme.avgSentiment?.toFixed(2) || 'N/A'}</span>
                    <span class="metric">Confidence: ${(theme.confidence * 100).toFixed(0)}%</span>
                </div>
            </div>
            <div class="theme-keywords-detail">
                <strong>Keywords:</strong>
                ${theme.keywords.map(keyword => 
                    `<span class="keyword-chip">${this.sanitizeFeedbackText(keyword)}</span>`
                ).join('')}
            </div>
        `;
        
        // Display feedback samples
        const themeFeedback = this.getThemeFeedback(theme);
        feedbackSamples.innerHTML = `
            <h6>Feedback Samples</h6>
            <div class="feedback-samples">
                ${themeFeedback.slice(0, 5).map(feedback => `
                    <div class="feedback-sample sentiment-${feedback.sentimentCategory}">
                        <div class="sample-text">${this.sanitizeFeedbackText(feedback.displayText)}</div>
                        <div class="sample-meta">
                            <span class="sentiment-indicator ${feedback.sentimentCategory}">
                                ${this.sentimentCategories[feedback.sentimentCategory]?.label || 'Neutral'}
                            </span>
                            <span class="sample-date">${this.formatDate(feedback.timestamp)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    findThemeById(themeId) {
        // Find theme by ID in current data
        if (!this.currentData || !this.lastAnalysis) return null;
        
        // Check Claude themes first
        if (this.lastAnalysis.themes) {
            const claudeTheme = this.lastAnalysis.themes.find(theme => theme.id === themeId);
            if (claudeTheme) return claudeTheme;
        }
        
        // Check extracted themes
        const extractedThemes = this.extractTopThemes(this.currentData);
        return extractedThemes.find(theme => theme.id === themeId);
    }

    getThemeFeedback(theme) {
        // Get feedback items for theme
        if (!this.currentData) return [];
        
        if (theme.feedbackIds) {
            // Claude theme with specific feedback IDs
            return this.currentData.feedback.filter(item => 
                theme.feedbackIds.includes(item.id)
            );
        } else {
            // Extracted theme - find by keywords
            return this.currentData.feedback.filter(item =>
                theme.keywords.some(keyword =>
                    item.text.toLowerCase().includes(keyword.toLowerCase())
                )
            );
        }
    }

    showThemeDetails(themeId) {
        // Show theme details modal
        const modal = this.container.querySelector('.theme-details-modal');
        const modalBody = this.container.querySelector('#theme-details-body');
        
        if (!modal || !modalBody) return;
        
        const theme = this.findThemeById(themeId);
        if (!theme) return;
        
        modalBody.innerHTML = this.generateThemeDetailsHTML(theme);
        modal.style.display = 'flex';
    }

    generateThemeDetailsHTML(theme) {
        // Generate detailed HTML for theme
        const themeFeedback = this.getThemeFeedback(theme);
        
        return `
            <div class="theme-full-details">
                <div class="theme-overview">
                    <h5>${this.sanitizeFeedbackText(theme.name)}</h5>
                    <div class="theme-stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${theme.count}</span>
                            <span class="stat-label">Mentions</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${(theme.avgSentiment * 100).toFixed(0)}%</span>
                            <span class="stat-label">Avg Sentiment</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${(theme.confidence * 100).toFixed(0)}%</span>
                            <span class="stat-label">Confidence</span>
                        </div>
                    </div>
                </div>
                
                <div class="theme-sentiment-breakdown">
                    <h6>Sentiment Distribution</h6>
                    <div class="sentiment-breakdown-chart">
                        <div class="sentiment-bar-large">
                            <div class="sentiment-positive" style="width: ${theme.sentimentBreakdown.positive}%">
                                ${theme.sentimentBreakdown.positive.toFixed(1)}%
                            </div>
                            <div class="sentiment-neutral" style="width: ${theme.sentimentBreakdown.neutral}%">
                                ${theme.sentimentBreakdown.neutral.toFixed(1)}%
                            </div>
                            <div class="sentiment-negative" style="width: ${theme.sentimentBreakdown.negative}%">
                                ${theme.sentimentBreakdown.negative.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="theme-keywords-section">
                    <h6>Related Keywords</h6>
                    <div class="keywords-cloud">
                        ${theme.keywords.map(keyword => 
                            `<span class="keyword-tag-large">${this.sanitizeFeedbackText(keyword)}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="theme-feedback-list">
                    <h6>All Related Feedback</h6>
                    <div class="feedback-list-detailed">
                        ${themeFeedback.map(feedback => `
                            <div class="feedback-item-detailed">
                                <div class="feedback-text">${this.sanitizeFeedbackText(feedback.text)}</div>
                                <div class="feedback-meta">
                                    <span class="sentiment ${feedback.sentimentCategory}">
                                        ${this.sentimentCategories[feedback.sentimentCategory]?.label || 'Neutral'}
                                    </span>
                                    <span class="timestamp">${this.formatDate(feedback.timestamp)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    hideThemeDetailsModal() {
        // Hide theme details modal
        const modal = this.container.querySelector('.theme-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    clearSelection() {
        // Clear current selection
        this.interactionState.selectedTheme = null;
        this.interactionState.selectedSentiment = null;
        
        // Update visual state
        const selectedItems = this.container.querySelectorAll('.selected');
        selectedItems.forEach(item => item.classList.remove('selected'));
    }

    createTimelineChart(data) {
        // Create timeline visualization
        const canvas = this.container.querySelector('.timeline-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.timelineChart) {
            this.timelineChart.destroy();
        }
        
        const timelineData = this.prepareTimelineData(data);
        
        this.timelineChart = new Chart(ctx, {
            type: 'line',
            data: timelineData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: this.getTimelineUnit()
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        min: -1,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Average Sentiment'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: this.formatTimelineTooltip.bind(this)
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    prepareTimelineData(data) {
        // Prepare timeline data for chart
        const timelinePoints = this.calculateTimelineTrends(data);
        
        return {
            datasets: [{
                label: 'Sentiment Trend',
                data: timelinePoints.sentiment,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }, {
                label: 'Feedback Volume',
                data: timelinePoints.volume,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                yAxisID: 'y1',
                fill: false
            }]
        };
    }

    calculateTimelineTrends(data) {
        // Calculate timeline trends for visualization
        const trends = new Map();
        const range = this.interactionState.timelineRange || '30d';
        const now = new Date();
        
        // Filter data by range
        let startDate;
        switch (range) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(0); // All time
        }
        
        const filteredFeedback = data.feedback.filter(item => 
            new Date(item.timestamp) >= startDate
        );
        
        // Group by time periods
        filteredFeedback.forEach(item => {
            const date = this.getTimelineGroupKey(new Date(item.timestamp), range);
            
            if (!trends.has(date)) {
                trends.set(date, { sentiments: [], count: 0 });
            }
            
            const dayData = trends.get(date);
            dayData.sentiments.push(item.sentiment || 0);
            dayData.count++;
        });
        
        // Calculate trends
        const sortedEntries = Array.from(trends.entries()).sort(([a], [b]) => 
            new Date(a) - new Date(b)
        );
        
        return {
            sentiment: sortedEntries.map(([date, data]) => ({
                x: new Date(date),
                y: data.sentiments.reduce((sum, s) => sum + s, 0) / data.sentiments.length
            })),
            volume: sortedEntries.map(([date, data]) => ({
                x: new Date(date),
                y: data.count
            }))
        };
    }

    getTimelineGroupKey(date, range) {
        // Get grouping key for timeline data
        switch (range) {
            case '7d':
                return date.toDateString();
            case '30d':
                return date.toDateString();
            case '90d':
                // Group by week
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                return weekStart.toDateString();
            default:
                // Group by month for all time
                return `${date.getFullYear()}-${date.getMonth() + 1}`;
        }
    }

    getTimelineUnit() {
        // Get appropriate time unit for timeline
        const range = this.interactionState.timelineRange || '30d';
        
        switch (range) {
            case '7d':
                return 'day';
            case '30d':
                return 'day';
            case '90d':
                return 'week';
            default:
                return 'month';
        }
    }

    formatTimelineTooltip(context) {
        // Format timeline tooltip
        const datasetLabel = context.dataset.label;
        const value = context.parsed.y;
        
        if (datasetLabel === 'Sentiment Trend') {
            return `${datasetLabel}: ${(value * 100).toFixed(1)}%`;
        } else {
            return `${datasetLabel}: ${value} items`;
        }
    }

    handleSentimentChartClick(event, elements) {
        // Handle sentiment chart interactions
        if (elements.length === 0) return;
        
        const elementIndex = elements[0].index;
        const chart = this.sentimentChart;
        const label = chart.data.labels[elementIndex];
        
        // Filter by selected sentiment
        this.interactionState.selectedSentiment = label;
        this.filterBySentiment(label);
    }

    handleSentimentChartHover(event, elements) {
        // Handle sentiment chart hover
        const canvas = this.sentimentChart.canvas;
        canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    }

    filterBySentiment(sentimentLabel) {
        // Filter feedback by sentiment
        const sentimentCategory = this.getSentimentCategoryFromLabel(sentimentLabel);
        this.interactionState.filterBy = sentimentCategory;
        
        // Update filter dropdown
        const filterSelect = this.container.querySelector('.feedback-filter');
        if (filterSelect) {
            filterSelect.value = sentimentCategory;
        }
        
        // Apply filter
        this.applyFiltersAndUpdate();
    }

    getSentimentCategoryFromLabel(label) {
        // Convert sentiment label to category
        for (const [category, config] of Object.entries(this.sentimentCategories)) {
            if (config.label === label) {
                return category === 'very_positive' || category === 'positive' ? 'positive' :
                       category === 'very_negative' || category === 'negative' ? 'negative' : 'neutral';
            }
        }
        return 'neutral';
    }

    trackSentimentInteraction(event) {
        // Track sentiment chart interactions for analytics
        if (this.securitySettings.logAnalysis) {
            this.logAuditEvent('sentiment_chart_interaction', {
                timestamp: Date.now(),
                interaction: 'hover',
                coordinates: { x: event.offsetX, y: event.offsetY }
            });
        }
    }

    formatSentimentTooltip(context) {
        // Format sentiment chart tooltip
        const label = context.label;
        const value = context.parsed;
        const percentage = ((value / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
        
        return `${label}: ${value} (${percentage}%)`;
    }

    formatDate(dateString) {
        // Format date for display
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    async exportAnalysis() {
        // Export feedback analysis data
        try {
            if (!this.currentData) {
                throw new Error('No data available for export');
            }
            
            const exportData = {
                summary: {
                    totalFeedback: this.currentData.feedback.length,
                    averageSentiment: this.calculateAverageSentiment(this.currentData),
                    exportedAt: new Date().toISOString()
                },
                themes: this.extractTopThemes(this.currentData),
                sentimentDistribution: this.calculateSentimentDistribution(this.currentData),
                insights: this.generateKeyInsights(this.currentData),
                rawData: this.currentData.feedback.map(item => ({
                    text: item.displayText,
                    sentiment: item.sentimentCategory,
                    timestamp: item.timestamp
                }))
            };
            
            // Include Claude analysis if available
            if (this.lastAnalysis) {
                exportData.claudeAnalysis = {
                    themes: this.lastAnalysis.themes,
                    insights: this.lastAnalysis.insights,
                    recommendations: this.lastAnalysis.recommendations,
                    confidence: this.lastAnalysis.analysis.confidence
                };
            }
            
            this.downloadJSON(exportData, 'feedback-analysis');
            
            this.logAuditEvent('analysis_exported', {
                dataSize: JSON.stringify(exportData).length,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError(`Export failed: ${error.message}`);
        }
    }

    calculateSentimentDistribution(data) {
        // Calculate sentiment distribution for export
        const distribution = {};
        
        Object.keys(this.sentimentCategories).forEach(category => {
            distribution[category] = 0;
        });
        
        data.feedback.forEach(item => {
            const category = item.sentimentCategory || 'neutral';
            distribution[category]++;
        });
        
        return distribution;
    }

    downloadJSON(data, filename) {
        // Download data as JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    showSettings() {
        // Show settings modal
        // Implementation would show configuration options
        console.log('Settings modal not implemented');
    }

    showLoading() {
        // Show loading state
        const loading = this.container.querySelector('.explorer-loading');
        if (loading) {
            loading.style.display = 'flex';
        }
        this.isLoading = true;
    }

    hideLoading() {
        // Hide loading state
        const loading = this.container.querySelector('.explorer-loading');
        if (loading) {
            loading.style.display = 'none';
        }
        this.isLoading = false;
    }

    showClaudeProcessing() {
        // Show Claude processing state
        const processing = this.container.querySelector('.claude-processing');
        if (processing) {
            processing.style.display = 'flex';
        }
    }

    hideClaudeProcessing() {
        // Hide Claude processing state
        const processing = this.container.querySelector('.claude-processing');
        if (processing) {
            processing.style.display = 'none';
        }
    }

    showError(message) {
        // Show error state
        const errorDiv = this.container.querySelector('.explorer-error');
        const errorMessage = this.container.querySelector('.error-message');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'flex';
        }
    }

    clearError() {
        // Clear error state
        const errorDiv = this.container.querySelector('.explorer-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    logAuditEvent(event, data) {
        // Log audit event
        if (this.securitySettings.logAnalysis) {
            this.auditLog.push({
                event,
                data,
                timestamp: Date.now(),
                userId: window.OsliraApp?.user?.id || 'anonymous'
            });
            
            // Keep audit log size manageable
            if (this.auditLog.length > 100) {
                this.auditLog = this.auditLog.slice(-50);
            }
        }
    }

    debounce(func, delay) {
        // Utility method for debouncing function calls
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    destroy() {
        // Clean up feedback explorer resources
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.sentimentChart) {
            this.sentimentChart.destroy();
        }
        
        if (this.themeChart) {
            this.themeChart.destroy();
        }
        
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        if (this.timelineChart) {
            this.timelineChart.destroy();
        }
        
        // Clear data
        this.currentData = null;
        this.lastAnalysis = null;
        this.auditLog = [];
        
        console.log('SecureFeedbackSignalExplorer destroyed');
    }
}
export { SecureFeedbackSignalExplorer };
