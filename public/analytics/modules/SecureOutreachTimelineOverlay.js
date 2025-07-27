// ===== SECURE OUTREACH TIMELINE OVERLAY =====
class SecureOutreachTimelineOverlay {
    constructor(container, secureAnalyticsService) {
        // Initialize secure timeline component
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        
        // Timeline configuration
        this.config = {
            maxTimelineEvents: 1000,
            refreshInterval: 30000, // 30 seconds
            animationDuration: 800,
            debounceDelay: 300,
            correlationThreshold: 0.3,
            eventBatchSize: 50,
            maxZoomLevel: 10,
            minZoomLevel: 0.1,
            defaultTimeRange: '30d'
        };
        
        // Chart and state management
        this.timelineChart = null;
        this.overlayChart = null;
        this.correlationChart = null;
        this.currentData = null;
        this.currentFilters = {};
        this.selectedEvent = null;
        this.selectedTimeRange = this.config.defaultTimeRange;
        this.zoomLevel = 1;
        this.panOffset = 0;
        
        // Timeline event types and categories
        this.eventTypes = {
            campaign_launch: {
                label: 'Campaign Launch',
                icon: '🚀',
                color: '#3B82F6',
                priority: 'high',
                category: 'marketing'
            },
            message_template_change: {
                label: 'Message Template Update',
                icon: '📝',
                color: '#8B5CF6',
                priority: 'medium',
                category: 'content'
            },
            crm_integration: {
                label: 'CRM Integration',
                icon: '🔗',
                color: '#10B981',
                priority: 'high',
                category: 'technical'
            },
            team_change: {
                label: 'Team Change',
                icon: '👥',
                color: '#F59E0B',
                priority: 'medium',
                category: 'organizational'
            },
            performance_milestone: {
                label: 'Performance Milestone',
                icon: '🏆',
                color: '#EF4444',
                priority: 'high',
                category: 'achievement'
            },
            strategy_pivot: {
                label: 'Strategy Change',
                icon: '🎯',
                color: '#06B6D4',
                priority: 'high',
                category: 'strategic'
            },
            external_event: {
                label: 'External Event',
                icon: '🌍',
                color: '#84CC16',
                priority: 'low',
                category: 'external'
            },
            system_update: {
                label: 'System Update',
                icon: '⚙️',
                color: '#64748B',
                priority: 'low',
                category: 'technical'
            }
        };
        
        // Performance metrics for correlation
        this.performanceMetrics = {
            response_rate: {
                label: 'Response Rate',
                format: 'percentage',
                color: '#3B82F6',
                baseline: 0.15
            },
            conversion_rate: {
                label: 'Conversion Rate',
                format: 'percentage',
                color: '#10B981',
                baseline: 0.08
            },
            lead_quality: {
                label: 'Lead Quality Score',
                format: 'score',
                color: '#8B5CF6',
                baseline: 70
            },
            outreach_volume: {
                label: 'Outreach Volume',
                format: 'number',
                color: '#F59E0B',
                baseline: 100
            }
        };
        
        // Interaction state
        this.interactionState = {
            selectedEventType: 'all',
            selectedMetric: 'response_rate',
            showCorrelations: true,
            showPerformanceOverlay: true,
            viewMode: 'combined', // 'events', 'performance', 'combined'
            highlightedPeriod: null,
            tooltipData: null
        };
        
        // Performance optimization
        this.isLoading = false;
        this.refreshTimer = null;
        this.updateDebounced = this.debounce(this._updateInternal.bind(this), this.config.debounceDelay);
        
        // Security and audit
        this.securitySettings = {
            sanitizeEventData: true,
            logInteractions: true,
            validateTimestamps: true,
            anonymizeUserData: true
        };
        this.auditLog = [];
        
        // Connect to secure analytics endpoints
        this.setupServiceConnection();
        
        // Setup timeline visualization
        this.setupTimelineVisualization();
        
        // Configure event correlation analysis
        this.setupEventCorrelation();
        
        // Setup container
        this.setupContainer();
        
        console.log('SecureOutreachTimelineOverlay initialized');
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

    setupServiceConnection() {
        // Connect to secure analytics endpoints
        if (!this.analyticsService) {
            throw new Error('SecureAnalyticsService is required for timeline overlay');
        }
        
        // Validate required methods
        if (typeof this.analyticsService.getTimelineData !== 'function') {
            throw new Error('Analytics service missing getTimelineData method');
        }
        
        // Test connection
        this.testServiceConnection();
    }

    async testServiceConnection() {
        // Test service connection
        try {
            await this.analyticsService.getTimelineData({ 
                test: true, 
                limit: 1 
            });
            console.log('Timeline overlay service connection verified');
        } catch (error) {
            console.warn('Timeline service connection test failed:', error.message);
        }
    }

    setupTimelineVisualization() {
        // Setup timeline visualization configuration
        this.timelineConfig = {
            chartOptions: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: this.config.animationDuration,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: this.formatTooltipTitle.bind(this),
                            label: this.formatTooltipLabel.bind(this)
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                            limits: {
                                x: {min: 'original', max: 'original'}
                            }
                        },
                        pan: {
                            enabled: true,
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM DD',
                                week: 'MMM DD',
                                month: 'MMM YYYY'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Timeline'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Performance Metric'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Event Impact'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            },
            
            eventVisualization: {
                markerSize: 8,
                markerHoverSize: 12,
                lineWidth: 2,
                eventLineColor: 'rgba(107, 114, 128, 0.5)',
                highlightColor: 'rgba(59, 130, 246, 0.8)'
            }
        };
    }

    setupEventCorrelation() {
        // Configure event correlation analysis
        this.correlationConfig = {
            analysisWindow: {
                before: 7, // days before event
                after: 14  // days after event
            },
            
            correlationMethods: {
                immediate: { window: 1, weight: 1.0 },
                short_term: { window: 7, weight: 0.8 },
                medium_term: { window: 14, weight: 0.6 },
                long_term: { window: 30, weight: 0.4 }
            },
            
            significanceThreshold: 0.05,
            minDataPoints: 5,
            
            impactCalculation: {
                method: 'percentage_change',
                baselinePeriod: 7,
                measurementPeriod: 7
            }
        };
    }

    setupContainer() {
        // Setup timeline overlay container structure
        if (!this.container) {
            throw new Error('Container element is required for SecureOutreachTimelineOverlay');
        }
        
        this.container.innerHTML = `
            <div class="timeline-overlay-wrapper">
                <div class="timeline-header">
                    <div class="timeline-title">
                        <h3>📅 Outreach Timeline Overlay</h3>
                        <span class="timeline-subtitle">Performance correlation with key events</span>
                    </div>
                    <div class="timeline-controls">
                        <select class="time-range-selector" aria-label="Select time range">
                            <option value="7d">Last 7 Days</option>
                            <option value="30d" selected>Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                            <option value="6m">Last 6 Months</option>
                            <option value="1y">Last Year</option>
                            <option value="all">All Time</option>
                        </select>
                        <select class="event-filter" aria-label="Filter events by type">
                            <option value="all">All Events</option>
                            <option value="marketing">Marketing</option>
                            <option value="content">Content</option>
                            <option value="technical">Technical</option>
                            <option value="strategic">Strategic</option>
                        </select>
                        <select class="metric-selector" aria-label="Select performance metric">
                            <option value="response_rate">Response Rate</option>
                            <option value="conversion_rate">Conversion Rate</option>
                            <option value="lead_quality">Lead Quality</option>
                            <option value="outreach_volume">Outreach Volume</option>
                        </select>
                        <button class="view-toggle" data-view="combined" title="Toggle view mode" aria-label="Toggle view mode">
                            📊 Combined
                        </button>
                        <button class="correlation-toggle" title="Toggle correlations" aria-label="Toggle correlation display">
                            🔗 Correlations
                        </button>
                        <button class="timeline-refresh" title="Refresh Data" aria-label="Refresh timeline data">
                            🔄
                        </button>
                        <button class="timeline-export" title="Export Timeline" aria-label="Export timeline data">
                            📥
                        </button>
                        <button class="timeline-settings" title="Settings" aria-label="Timeline settings">
                            ⚙️
                        </button>
                    </div>
                </div>
                
                <div class="timeline-content">
                    <div class="timeline-loading" style="display: none;" role="status" aria-live="polite">
                        <div class="loading-spinner" aria-hidden="true"></div>
                        <span class="loading-text">Loading timeline data...</span>
                    </div>
                    
                    <div class="timeline-error" style="display: none;" role="alert">
                        <div class="error-icon" aria-hidden="true">⚠️</div>
                        <div class="error-content">
                            <h4>Unable to Load Timeline Data</h4>
                            <p class="error-message"></p>
                            <button class="retry-btn">Retry</button>
                        </div>
                    </div>
                    
                    <div class="timeline-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="total-events">--</div>
                            <div class="stat-label">Timeline Events</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="significant-correlations">--</div>
                            <div class="stat-label">Significant Correlations</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="performance-impact">--</div>
                            <div class="stat-label">Avg Impact</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="timeline-range">--</div>
                            <div class="stat-label">Time Range</div>
                        </div>
                    </div>
                    
                    <div class="timeline-visualization">
                        <div class="chart-container">
                            <canvas class="timeline-chart" role="img" aria-label="Timeline with performance overlay"></canvas>
                        </div>
                        
                        <div class="timeline-controls-bar">
                            <div class="zoom-controls">
                                <button class="zoom-in" title="Zoom In" aria-label="Zoom in">🔍+</button>
                                <button class="zoom-out" title="Zoom Out" aria-label="Zoom out">🔍-</button>
                                <button class="zoom-reset" title="Reset Zoom" aria-label="Reset zoom">🔄</button>
                            </div>
                            <div class="pan-controls">
                                <button class="pan-left" title="Pan Left" aria-label="Pan left">⬅️</button>
                                <button class="pan-right" title="Pan Right" aria-label="Pan right">➡️</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="event-legend" id="event-legend">
                        <h4>Event Types</h4>
                        <div class="legend-items" id="legend-items"></div>
                    </div>
                    
                    <div class="correlation-analysis" id="correlation-analysis" style="display: none;">
                        <h4>📈 Event Impact Analysis</h4>
                        <div class="correlation-results" id="correlation-results"></div>
                    </div>
                </div>
                
                <div class="event-details-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h4>Event Details & Impact</h4>
                            <button class="modal-close" aria-label="Close details">×</button>
                        </div>
                        <div class="modal-body" id="event-details-body"></div>
                    </div>
                </div>
                
                <div class="timeline-tooltip" style="display: none;" role="tooltip">
                    <div class="tooltip-content"></div>
                </div>
            </div>
        `;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Setup event listeners for timeline controls
        const refreshBtn = this.container.querySelector('.timeline-refresh');
        const exportBtn = this.container.querySelector('.timeline-export');
        const settingsBtn = this.container.querySelector('.timeline-settings');
        const retryBtn = this.container.querySelector('.retry-btn');
        const timeRangeSelector = this.container.querySelector('.time-range-selector');
        const eventFilter = this.container.querySelector('.event-filter');
        const metricSelector = this.container.querySelector('.metric-selector');
        const viewToggle = this.container.querySelector('.view-toggle');
        const correlationToggle = this.container.querySelector('.correlation-toggle');
        const modalClose = this.container.querySelector('.modal-close');
        
        // Zoom and pan controls
        const zoomIn = this.container.querySelector('.zoom-in');
        const zoomOut = this.container.querySelector('.zoom-out');
        const zoomReset = this.container.querySelector('.zoom-reset');
        const panLeft = this.container.querySelector('.pan-left');
        const panRight = this.container.querySelector('.pan-right');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTimeline());
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }
        
        if (timeRangeSelector) {
            timeRangeSelector.addEventListener('change', (e) => {
                this.selectedTimeRange = e.target.value;
                this.applyFiltersAndUpdate();
            });
        }
        
        if (eventFilter) {
            eventFilter.addEventListener('change', (e) => {
                this.interactionState.selectedEventType = e.target.value;
                this.applyFiltersAndUpdate();
            });
        }
        
        if (metricSelector) {
            metricSelector.addEventListener('change', (e) => {
                this.interactionState.selectedMetric = e.target.value;
                this.updatePerformanceOverlay();
            });
        }
        
        if (viewToggle) {
            viewToggle.addEventListener('click', () => this.toggleViewMode());
        }
        
        if (correlationToggle) {
            correlationToggle.addEventListener('click', () => this.toggleCorrelations());
        }
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideEventDetailsModal());
        }
        
        // Zoom and pan controls
        if (zoomIn) zoomIn.addEventListener('click', () => this.zoomIn());
        if (zoomOut) zoomOut.addEventListener('click', () => this.zoomOut());
        if (zoomReset) zoomReset.addEventListener('click', () => this.resetZoom());
        if (panLeft) panLeft.addEventListener('click', () => this.panLeft());
        if (panRight) panRight.addEventListener('click', () => this.panRight());
        
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
                    this.hideEventDetailsModal();
                    this.clearSelection();
                    break;
                case 'Enter':
                case ' ':
                    if (this.selectedEvent) {
                        this.showEventDetails(this.selectedEvent);
                    }
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                    if (event.ctrlKey) {
                        this.panLeft();
                        event.preventDefault();
                    }
                    break;
                case 'ArrowRight':
                    if (event.ctrlKey) {
                        this.panRight();
                        event.preventDefault();
                    }
                    break;
                case '+':
                case '=':
                    if (event.ctrlKey) {
                        this.zoomIn();
                        event.preventDefault();
                    }
                    break;
                case '-':
                    if (event.ctrlKey) {
                        this.zoomOut();
                        event.preventDefault();
                    }
                    break;
            }
        });
    }

    setupResizeObserver() {
        // Setup resize observer for responsive updates
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.timelineChart) this.timelineChart.resize();
                if (this.overlayChart) this.overlayChart.resize();
                if (this.correlationChart) this.correlationChart.resize();
            });
            
            this.resizeObserver.observe(this.container);
        }
    }

    async render(filters = {}) {
        // Render secure outreach timeline
        try {
            performance.mark('timeline-overlay-render-start');
            
            this.currentFilters = { ...filters };
            this.showLoading();
            this.clearError();
            
            // Fetch timeline data via Worker processing
            const timelineData = await this.fetchTimelineData(filters);
            
            // Validate and process data
            this.validateTimelineData(timelineData);
            
            // Correlate events with performance server-side
            const processedData = await this.processTimelineData(timelineData);
            
            // Display interactive timeline with overlays
            await this.displayTimeline(processedData);
            
            // Update statistics
            this.updateStatistics(processedData);
            
            // Generate event legend
            this.updateEventLegend(processedData);
            
            // Show correlation analysis if enabled
            if (this.interactionState.showCorrelations) {
                this.displayCorrelationAnalysis(processedData);
            }
            
            // Update current data
            this.currentData = processedData;
            
            // Setup auto-refresh
            this.setupAutoRefresh();
            
            // Hide loading state
            this.hideLoading();
            
            performance.mark('timeline-overlay-render-end');
            performance.measure('timeline-overlay-render', 'timeline-overlay-render-start', 'timeline-overlay-render-end');
            
            // Log successful render
            this.logAuditEvent('timeline_overlay_rendered', {
                filters,
                eventCount: processedData.events?.length || 0,
                renderTime: Date.now()
            });
            
        } catch (error) {
            console.error('Timeline overlay render failed:', error);
            this.showError(error.message);
            this.hideLoading();
            this.logAuditEvent('render_failed', { error: error.message, filters });
        }
    }

    async fetchTimelineData(filters) {
        // Fetch timeline data via Worker processing
        try {
            const response = await this.analyticsService.getTimelineData({
                ...filters,
                timeRange: this.selectedTimeRange,
                includeEvents: true,
                includePerformance: true,
                includeCorrelations: this.interactionState.showCorrelations,
                maxEvents: this.config.maxTimelineEvents,
                eventTypes: this.interactionState.selectedEventType !== 'all' ? [this.interactionState.selectedEventType] : null
            });
            
            if (!response || !response.success) {
                throw new Error(response?.message || 'Invalid response from timeline analytics service');
            }
            
            return response.data;
            
        } catch (error) {
            console.error('Timeline data fetch failed:', error);
            throw new Error(`Failed to fetch timeline data: ${error.message}`);
        }
    }

    validateTimelineData(data) {
        // Validate timeline data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Timeline data must be an object');
        }
        
        if (!Array.isArray(data.events)) {
            throw new Error('Timeline data must contain an events array');
        }
        
        if (!Array.isArray(data.performance)) {
            throw new Error('Timeline data must contain a performance array');
        }
        
        // Validate events
        data.events.forEach((event, index) => {
            if (!event || typeof event !== 'object') {
                throw new Error(`Invalid event at index ${index}: must be an object`);
            }
            
            if (!event.timestamp || isNaN(new Date(event.timestamp))) {
                throw new Error(`Invalid event timestamp at index ${index}`);
            }
            
            if (typeof event.type !== 'string' || event.type.length === 0) {
                throw new Error(`Invalid event type at index ${index}`);
            }
            
            if (this.securitySettings.validateTimestamps) {
                this.validateEventTimestamp(event.timestamp, index);
            }
        });
        
        // Validate performance data
        data.performance.forEach((point, index) => {
            if (!point || typeof point !== 'object') {
                throw new Error(`Invalid performance point at index ${index}: must be an object`);
            }
            
            if (!point.timestamp || isNaN(new Date(point.timestamp))) {
                throw new Error(`Invalid performance timestamp at index ${index}`);
            }
        });
    }

    validateEventTimestamp(timestamp, index) {
        // Validate event timestamp for security
        const eventDate = new Date(timestamp);
        const now = new Date();
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        if (eventDate < oneYearAgo || eventDate > oneYearFromNow) {
            console.warn(`Event ${index} has suspicious timestamp: ${timestamp}`);
        }
    }

    async processTimelineData(data) {
        // Process and enrich timeline data
        const processedEvents = data.events.map(event => ({
            ...event,
            // Sanitize event data if enabled
            title: this.securitySettings.sanitizeEventData ? this.sanitizeEventData(event.title) : event.title,
            description: this.securitySettings.sanitizeEventData ? this.sanitizeEventData(event.description) : event.description,
            // Add event type configuration
            config: this.eventTypes[event.type] || this.eventTypes.external_event,
            // Add unique ID
            id: event.id || this.generateEventId(event),
            // Add processed timestamp
            processedAt: new Date().toISOString(),
            // Anonymize user data if enabled
            userId: this.securitySettings.anonymizeUserData ? this.anonymizeUserId(event.userId) : event.userId
        }));
        
        const processedPerformance = data.performance.map(point => ({
            ...point,
            // Normalize performance values
            normalizedValue: this.normalizePerformanceValue(point.value, point.metric),
            // Add baseline comparison
            baselineComparison: this.compareToBaseline(point.value, point.metric),
            // Add processed timestamp
            processedAt: new Date().toISOString()
        }));
        
        // Calculate event correlations
        const correlations = await this.calculateEventCorrelations(processedEvents, processedPerformance);
        
        return {
            ...data,
            events: processedEvents,
            performance: processedPerformance,
            correlations: correlations,
            summary: this.calculateTimelineSummary(processedEvents, processedPerformance, correlations),
            processedAt: new Date().toISOString()
        };
    }

    sanitizeEventData(text) {
        // Sanitize event data for security
        if (typeof text !== 'string') return String(text);
        
        return text
            .replace(/[<>\"'&]/g, '') // Remove potential XSS characters
            .substring(0, 500) // Limit length
            .trim();
    }

    anonymizeUserId(userId) {
        // Anonymize user ID for privacy
        if (!userId) return 'anonymous';
        
        // Simple hash-based anonymization
        return `user_${userId.toString().split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0).toString().replace('-', '0')}`;
    }

    generateEventId(event) {
        // Generate unique ID for event
        return `event_${event.type}_${new Date(event.timestamp).getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    normalizePerformanceValue(value, metric) {
        // Normalize performance value to 0-1 scale
        const metricConfig = this.performanceMetrics[metric];
        if (!metricConfig) return value;
        
        // Simple normalization based on baseline
        const baseline = metricConfig.baseline;
        return Math.max(0, Math.min(2, value / baseline)); // Clamp to 0-2x baseline
    }

    compareToBaseline(value, metric) {
        // Compare value to baseline
        const metricConfig = this.performanceMetrics[metric];
        if (!metricConfig) return { difference: 0, status: 'unknown' };
        
        const baseline = metricConfig.baseline;
        const difference = ((value - baseline) / baseline) * 100;
        
        return {
            difference: Math.round(difference * 10) / 10,
            status: difference > 10 ? 'above' : difference < -10 ? 'below' : 'at'
        };
    }

    async calculateEventCorrelations(events, performance) {
        // Calculate correlations between events and performance changes
        const correlations = [];
        
        events.forEach(event => {
            const eventDate = new Date(event.timestamp);
            
            // Get performance data before and after event
            const beforeWindow = this.getPerformanceWindow(performance, eventDate, -this.correlationConfig.analysisWindow.before);
            const afterWindow = this.getPerformanceWindow(performance, eventDate, this.correlationConfig.analysisWindow.after);
            
            if (beforeWindow.length >= this.correlationConfig.minDataPoints && afterWindow.length >= this.correlationConfig.minDataPoints) {
                // Calculate impact for each metric
                Object.keys(this.performanceMetrics).forEach(metric => {
                    const impact = this.calculateEventImpact(beforeWindow, afterWindow, metric);
                    
                    if (Math.abs(impact.changePercent) >= this.config.correlationThreshold * 100) {
                        correlations.push({
                            eventId: event.id,
                            eventType: event.type,
                            eventTimestamp: event.timestamp,
                            metric: metric,
                            impact: impact,
                            significance: this.calculateSignificance(impact),
                            confidence: this.calculateCorrelationConfidence(beforeWindow, afterWindow)
                        });
                    }
                });
            }
        });
        
        return correlations.sort((a, b) => Math.abs(b.impact.changePercent) - Math.abs(a.impact.changePercent));
    }

    getPerformanceWindow(performance, eventDate, dayOffset) {
        // Get performance data within a time window
        const windowStart = new Date(eventDate.getTime() + (dayOffset * 24 * 60 * 60 * 1000));
        const windowEnd = new Date(eventDate.getTime() + ((dayOffset > 0 ? dayOffset : 0) * 24 * 60 * 60 * 1000));
        
        return performance.filter(point => {
            const pointDate = new Date(point.timestamp);
            return pointDate >= windowStart && pointDate <= windowEnd;
        });
    }

    calculateEventImpact(beforeWindow, afterWindow, metric) {
        // Calculate impact of event on specific metric
        const beforeAvg = this.calculateAverage(beforeWindow, metric);
        const afterAvg = this.calculateAverage(afterWindow, metric);
        
        if (beforeAvg === 0) return { changePercent: 0, changeAbsolute: 0, direction: 'neutral' };
        
        const changeAbsolute = afterAvg - beforeAvg;
        const changePercent = (changeAbsolute / beforeAvg) * 100;
        
        return {
            changePercent: Math.round(changePercent * 10) / 10,
            changeAbsolute: Math.round(changeAbsolute * 1000) / 1000,
            direction: changePercent > 5 ? 'positive' : changePercent < -5 ? 'negative' : 'neutral',
            beforeAvg: beforeAvg,
            afterAvg: afterAvg
        };
    }

    calculateAverage(dataWindow, metric) {
        // Calculate average value for metric in data window
        const values = dataWindow
            .map(point => point.metrics?.[metric] || point[metric])
            .filter(value => typeof value === 'number' && !isNaN(value));
        
        if (values.length === 0) return 0;
        
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    calculateSignificance(impact) {
        // Calculate statistical significance of impact
        const absChange = Math.abs(impact.changePercent);
        
        if (absChange >= 50) return 'very_high';
        if (absChange >= 25) return 'high';
        if (absChange >= 15) return 'medium';
        if (absChange >= 5) return 'low';
        return 'negligible';
    }

    calculateCorrelationConfidence(beforeWindow, afterWindow) {
        // Calculate confidence level of correlation
        const dataQuality = Math.min(beforeWindow.length, afterWindow.length) / this.correlationConfig.minDataPoints;
        const timeConsistency = this.calculateTimeConsistency(beforeWindow, afterWindow);
        
        return Math.min(1, (dataQuality + timeConsistency) / 2);
    }

    calculateTimeConsistency(beforeWindow, afterWindow) {
        // Calculate consistency of time intervals in data
        const allTimestamps = [...beforeWindow, ...afterWindow]
            .map(point => new Date(point.timestamp).getTime())
            .sort((a, b) => a - b);
        
        if (allTimestamps.length < 2) return 0;
        
        const intervals = [];
        for (let i = 1; i < allTimestamps.length; i++) {
            intervals.push(allTimestamps[i] - allTimestamps[i - 1]);
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const consistency = 1 - Math.min(1, Math.sqrt(variance) / avgInterval);
        
        return Math.max(0, consistency);
    }

    calculateTimelineSummary(events, performance, correlations) {
        // Calculate summary statistics for timeline
        const significantCorrelations = correlations.filter(corr => 
            corr.significance === 'high' || corr.significance === 'very_high'
        ).length;
        
        const avgImpact = correlations.length > 0 
            ? correlations.reduce((sum, corr) => sum + Math.abs(corr.impact.changePercent), 0) / correlations.length
            : 0;
        
        const timeRange = this.calculateTimeRange(events, performance);
        
        return {
            totalEvents: events.length,
            significantCorrelations: significantCorrelations,
            avgImpact: Math.round(avgImpact * 10) / 10,
            timeRange: timeRange,
            correlationRate: events.length > 0 ? (correlations.length / events.length) : 0
        };
    }

    calculateTimeRange(events, performance) {
        // Calculate time range of data
        const allTimestamps = [
            ...events.map(e => new Date(e.timestamp)),
            ...performance.map(p => new Date(p.timestamp))
        ].sort((a, b) => a - b);
        
        if (allTimestamps.length === 0) return 'No data';
        
        const start = allTimestamps[0];
        const end = allTimestamps[allTimestamps.length - 1];
        const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
        
        return `${days} days`;
    }

    async updateTimeline(newData) {
        // Update timeline with secure event data
        try {
            // Process Worker-validated timeline events
            const processedData = await this.processTimelineData(newData);
            
            // Update correlation calculations
            this.currentData = processedData;
            
            // Refresh timeline visualizations
            await this.displayTimeline(processedData);
            this.updateStatistics(processedData);
            
            if (this.interactionState.showCorrelations) {
                this.displayCorrelationAnalysis(processedData);
            }
            
            this.logAuditEvent('timeline_updated', {
                eventCount: processedData.events.length,
                updateTime: Date.now()
            });
            
        } catch (error) {
            console.error('Timeline update failed:', error);
            this.showError(`Failed to update timeline: ${error.message}`);
        }
    }

    async displayTimeline(data) {
        // Display timeline based on current view mode
        switch (this.interactionState.viewMode) {
            case 'events':
                await this.displayEventsOnly(data);
                break;
            case 'performance':
                await this.displayPerformanceOnly(data);
                break;
            case 'combined':
            default:
                await this.displayCombinedView(data);
                break;
        }
    }

    async displayCombinedView(data) {
        // Display combined events and performance view
        await this.createTimelineChart(data);
        this.addEventMarkers(data.events);
        this.addPerformanceOverlay(data.performance);
    }

    async displayEventsOnly(data) {
        // Display events-only view
        await this.createTimelineChart(data);
        this.addEventMarkers(data.events);
    }

    async displayPerformanceOnly(data) {
        // Display performance-only view
        await this.createTimelineChart(data);
        this.addPerformanceOverlay(data.performance);
    }

    createTimelineChart(data) {
        // Create secure timeline visualization
        try {
            const canvas = this.container.querySelector('.timeline-chart');
            if (!canvas) {
                throw new Error('Timeline chart canvas not found');
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart
            if (this.timelineChart) {
                this.timelineChart.destroy();
            }
            
            // Use Worker-processed event correlations
            const chartData = this.prepareTimelineChartData(data);
            
            // Create Chart.js timeline chart
            this.timelineChart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    ...this.timelineConfig.chartOptions,
                    onClick: this.handleTimelineClick.bind(this),
                    onHover: this.handleTimelineHover.bind(this)
                }
            });
            
            // Display performance overlay data
            this.addInteractiveFeatures();
            
            // Enable secure timeline interactions
            this.enableSecureTimelineInteractions();
            
            console.log('Timeline chart created successfully');
            
        } catch (error) {
            console.error('Timeline chart creation failed:', error);
            throw new Error(`Timeline chart creation failed: ${error.message}`);
        }
    }

    prepareTimelineChartData(data) {
        // Prepare timeline data for Chart.js
        const datasets = [];
        
        // Performance data dataset
        if (this.interactionState.showPerformanceOverlay) {
            const performanceData = this.preparePerformanceDataset(data.performance);
            if (performanceData) datasets.push(performanceData);
        }
        
        // Event markers dataset
        const eventData = this.prepareEventDataset(data.events);
        if (eventData) datasets.push(eventData);
        
        // Correlation indicators dataset
        if (this.interactionState.showCorrelations && data.correlations) {
            const correlationData = this.prepareCorrelationDataset(data.correlations);
            if (correlationData) datasets.push(correlationData);
        }
        
        return { datasets };
    }

    preparePerformanceDataset(performance) {
        // Prepare performance data for chart
        const metric = this.interactionState.selectedMetric;
        const metricConfig = this.performanceMetrics[metric];
        
        if (!metricConfig) return null;
        
        const dataPoints = performance
            .filter(point => point.metrics?.[metric] !== undefined)
            .map(point => ({
                x: new Date(point.timestamp),
                y: point.metrics[metric]
            }))
            .sort((a, b) => a.x - b.x);
        
        return {
            label: metricConfig.label,
            data: dataPoints,
            borderColor: metricConfig.color,
            backgroundColor: metricConfig.color + '20',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: metricConfig.color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
        };
    }

    prepareEventDataset(events) {
        // Prepare event markers for chart
        const eventPoints = events.map(event => ({
            x: new Date(event.timestamp),
            y: this.getEventYPosition(event),
            event: event
        }));
        
        return {
            label: 'Events',
            data: eventPoints,
            borderColor: 'rgba(107, 114, 128, 0.8)',
            backgroundColor: 'rgba(107, 114, 128, 0.3)',
            borderWidth: 1,
            pointRadius: this.timelineConfig.eventVisualization.markerSize,
            pointHoverRadius: this.timelineConfig.eventVisualization.markerHoverSize,
            pointBackgroundColor: eventPoints.map(point => point.event.config.color),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            showLine: false,
            yAxisID: 'y1'
        };
    }

    getEventYPosition(event) {
        // Calculate Y position for event marker
        return event.impact || 0.5; // Default to middle position
    }

    prepareCorrelationDataset(correlations) {
        // Prepare correlation indicators for chart
        const correlationPoints = correlations
            .filter(corr => corr.significance !== 'negligible')
            .map(corr => ({
                x: new Date(corr.eventTimestamp),
                y: this.getCorrelationYPosition(corr),
                correlation: corr
            }));
        
        return {
            label: 'Significant Correlations',
            data: correlationPoints,
            borderColor: this.timelineConfig.eventVisualization.highlightColor,
            backgroundColor: this.timelineConfig.eventVisualization.highlightColor + '40',
            borderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointBackgroundColor: correlationPoints.map(point => 
                point.correlation.impact.direction === 'positive' ? '#10B981' : '#EF4444'
            ),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 3,
            showLine: false,
            yAxisID: 'y1'
        };
    }

    getCorrelationYPosition(correlation) {
        // Calculate Y position for correlation indicator
        const maxImpact = 50; // Maximum expected impact percentage
        const normalizedImpact = Math.abs(correlation.impact.changePercent) / maxImpact;
        return Math.min(1, normalizedImpact);
    }

    addEventMarkers(events) {
        // Add interactive event markers to timeline
        if (!this.timelineChart) return;
        
        // Add custom event markers using Chart.js plugins
        this.timelineChart.options.plugins = this.timelineChart.options.plugins || {};
        this.timelineChart.options.plugins.eventMarkers = {
            events: events,
            render: this.renderEventMarkers.bind(this)
        };
        
        this.timelineChart.update();
    }

    addPerformanceOverlay(performance) {
        // Add performance data overlay
        if (!this.timelineChart || !this.interactionState.showPerformanceOverlay) return;
        
        // Performance overlay is handled in the main dataset preparation
        // This method can add additional overlay features
        this.addPerformanceTrendlines(performance);
        this.addPerformanceAnnotations(performance);
    }

    addPerformanceTrendlines(performance) {
        // Add trend lines to performance data
        // Implementation would add trend analysis overlays
        console.log('Adding performance trend lines');
    }

    addPerformanceAnnotations(performance) {
        // Add annotations for significant performance changes
        // Implementation would mark significant performance events
        console.log('Adding performance annotations');
    }

    addInteractiveFeatures() {
        // Add interactive features to timeline
        if (!this.timelineChart) return;
        
        // Add click handlers
        this.timelineChart.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        
        // Add hover handlers
        this.timelineChart.canvas.addEventListener('mousemove', this.handleCanvasHover.bind(this));
        
        // Add wheel zoom
        this.timelineChart.canvas.addEventListener('wheel', this.handleWheelZoom.bind(this));
    }

    enableSecureTimelineInteractions() {
        // Enable secure timeline interactions with audit logging
        if (!this.timelineChart) return;
        
        this.timelineChart.canvas.addEventListener('click', (event) => {
            this.logAuditEvent('timeline_interaction', {
                type: 'click',
                coordinates: { x: event.offsetX, y: event.offsetY },
                timestamp: Date.now()
            });
        });
    }

    renderEventMarkers(chart, easing) {
        // Custom rendering for event markers
        const ctx = chart.ctx;
        const events = chart.options.plugins.eventMarkers.events;
        
        events.forEach(event => {
            const position = this.getEventCanvasPosition(chart, event);
            if (position) {
                this.drawEventMarker(ctx, position, event);
            }
        });
    }

    getEventCanvasPosition(chart, event) {
        // Get canvas position for event
        const xScale = chart.scales.x;
        const yScale = chart.scales.y1 || chart.scales.y;
        
        const x = xScale.getPixelForValue(new Date(event.timestamp));
        const y = yScale.getPixelForValue(event.impact || 0.5);
        
        return { x, y };
    }

    drawEventMarker(ctx, position, event) {
        // Draw custom event marker
        const config = event.config;
        const size = this.timelineConfig.eventVisualization.markerSize;
        
        ctx.save();
        
        // Draw marker background
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(position.x, position.y, size, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw marker border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw event icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.icon, position.x, position.y);
        
        ctx.restore();
    }

    handleTimelineClick(event, elements) {
        // Handle timeline chart clicks
        if (elements.length === 0) return;
        
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        const dataset = this.timelineChart.data.datasets[datasetIndex];
        
        if (dataset.label === 'Events' && dataset.data[dataIndex].event) {
            this.selectEvent(dataset.data[dataIndex].event);
        } else if (dataset.label === 'Significant Correlations' && dataset.data[dataIndex].correlation) {
            this.showCorrelationDetails(dataset.data[dataIndex].correlation);
        }
    }

    handleTimelineHover(event, elements) {
        // Handle timeline chart hover
        const canvas = this.timelineChart.canvas;
        canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        
        if (elements.length > 0) {
            this.showTooltip(event, elements);
        } else {
            this.hideTooltip();
        }
    }

    handleCanvasClick(event) {
        // Handle direct canvas clicks
        const rect = this.timelineChart.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if click is on an event marker
        const clickedEvent = this.findEventAtPosition(x, y);
        if (clickedEvent) {
            this.selectEvent(clickedEvent);
        }
    }

    handleCanvasHover(event) {
        // Handle canvas hover for custom interactions
        const rect = this.timelineChart.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const hoveredEvent = this.findEventAtPosition(x, y);
        if (hoveredEvent !== this.interactionState.hoveredEvent) {
            this.interactionState.hoveredEvent = hoveredEvent;
            this.updateHoverState();
        }
    }

    handleWheelZoom(event) {
        // Handle wheel zoom
        if (event.ctrlKey) {
            event.preventDefault();
            
            if (event.deltaY < 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
        }
    }

    findEventAtPosition(x, y) {
        // Find event at canvas position
        if (!this.currentData || !this.currentData.events) return null;
        
        const tolerance = this.timelineConfig.eventVisualization.markerSize + 5;
        
        return this.currentData.events.find(event => {
            const position = this.getEventCanvasPosition(this.timelineChart, event);
            if (!position) return false;
            
            const distance = Math.sqrt(
                Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2)
            );
            
            return distance <= tolerance;
        });
    }

    selectEvent(event) {
        // Select event for detailed view
        this.selectedEvent = event;
        this.updateEventSelection();
        
        this.logAuditEvent('event_selected', {
            eventId: event.id,
            eventType: event.type,
            timestamp: Date.now()
        });
    }

    updateEventSelection() {
        // Update visual selection state
        if (this.timelineChart) {
            this.timelineChart.update();
        }
    }

    showTooltip(event, elements) {
        // Show interactive tooltip
        const tooltip = this.container.querySelector('.timeline-tooltip');
        const tooltipContent = this.container.querySelector('.timeline-tooltip .tooltip-content');
        
        if (!tooltip || !tooltipContent) return;
        
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        const dataset = this.timelineChart.data.datasets[datasetIndex];
        const dataPoint = dataset.data[dataIndex];
        
        let content = '';
        
        if (dataset.label === 'Events' && dataPoint.event) {
            content = this.generateEventTooltipContent(dataPoint.event);
        } else if (dataset.label === 'Significant Correlations' && dataPoint.correlation) {
            content = this.generateCorrelationTooltipContent(dataPoint.correlation);
        } else {
            content = this.generatePerformanceTooltipContent(dataPoint, dataset);
        }
        
        tooltipContent.innerHTML = content;
        
        // Position tooltip
        const rect = this.timelineChart.canvas.getBoundingClientRect();
        tooltip.style.left = (rect.left + event.offsetX + 10) + 'px';
        tooltip.style.top = (rect.top + event.offsetY - 10) + 'px';
        tooltip.style.display = 'block';
    }

    hideTooltip() {
        // Hide tooltip
        const tooltip = this.container.querySelector('.timeline-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    generateEventTooltipContent(event) {
        // Generate tooltip content for event
        return `
            <div class="event-tooltip">
                <div class="tooltip-header">
                    <span class="event-icon">${event.config.icon}</span>
                    <span class="event-type">${event.config.label}</span>
                </div>
                <div class="tooltip-body">
                    <div class="event-title">${this.sanitizeEventData(event.title || 'Event')}</div>
                    <div class="event-date">${this.formatDate(event.timestamp)}</div>
                    ${event.description ? `<div class="event-description">${this.sanitizeEventData(event.description)}</div>` : ''}
                </div>
            </div>
        `;
    }

    generateCorrelationTooltipContent(correlation) {
        // Generate tooltip content for correlation
        const metricConfig = this.performanceMetrics[correlation.metric];
        
        return `
            <div class="correlation-tooltip">
                <div class="tooltip-header">
                    <span class="correlation-icon">🔗</span>
                    <span class="correlation-title">Performance Impact</span>
                </div>
                <div class="tooltip-body">
                    <div class="correlation-metric">${metricConfig?.label || correlation.metric}</div>
                    <div class="correlation-change ${correlation.impact.direction}">
                        ${correlation.impact.changePercent > 0 ? '+' : ''}${correlation.impact.changePercent}%
                    </div>
                    <div class="correlation-significance">
                        Significance: ${correlation.significance}
                    </div>
                    <div class="correlation-confidence">
                        Confidence: ${(correlation.confidence * 100).toFixed(0)}%
                    </div>
                </div>
            </div>
        `;
    }

    generatePerformanceTooltipContent(dataPoint, dataset) {
        // Generate tooltip content for performance data
        return `
            <div class="performance-tooltip">
                <div class="tooltip-header">
                    <span class="metric-name">${dataset.label}</span>
                </div>
                <div class="tooltip-body">
                    <div class="metric-value">${this.formatMetricValue(dataPoint.y, this.interactionState.selectedMetric)}</div>
                    <div class="metric-date">${this.formatDate(dataPoint.x)}</div>
                </div>
            </div>
        `;
    }

    formatMetricValue(value, metric) {
        // Format metric value for display
        const metricConfig = this.performanceMetrics[metric];
        if (!metricConfig) return value.toString();
        
        switch (metricConfig.format) {
            case 'percentage':
                return (value * 100).toFixed(1) + '%';
            case 'score':
                return value.toFixed(1);
            case 'number':
                return Math.round(value).toLocaleString();
            default:
                return value.toString();
        }
    }

    formatDate(date) {
        // Format date for display
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTooltipTitle(tooltipItems) {
        // Format tooltip title
        if (tooltipItems.length === 0) return '';
        
        const date = tooltipItems[0].parsed.x;
        return this.formatDate(date);
    }

    formatTooltipLabel(context) {
        // Format tooltip label
        const datasetLabel = context.dataset.label;
        const value = context.parsed.y;
        
        if (datasetLabel === 'Events') {
            return 'Event';
        } else if (datasetLabel === 'Significant Correlations') {
            return 'Impact';
        } else {
            return `${datasetLabel}: ${this.formatMetricValue(value, this.interactionState.selectedMetric)}`;
        }
    }

    updateStatistics(data) {
        // Update statistics display
        const totalEventsEl = this.container.querySelector('#total-events');
        const significantCorrelationsEl = this.container.querySelector('#significant-correlations');
        const performanceImpactEl = this.container.querySelector('#performance-impact');
        const timelineRangeEl = this.container.querySelector('#timeline-range');
        
        if (totalEventsEl) {
            totalEventsEl.textContent = data.summary.totalEvents;
        }
        
        if (significantCorrelationsEl) {
            significantCorrelationsEl.textContent = data.summary.significantCorrelations;
        }
        
        if (performanceImpactEl) {
            performanceImpactEl.textContent = data.summary.avgImpact.toFixed(1) + '%';
        }
        
        if (timelineRangeEl) {
            timelineRangeEl.textContent = data.summary.timeRange;
        }
    }

    updateEventLegend(data) {
        // Update event legend display
        const legendItems = this.container.querySelector('#legend-items');
        if (!legendItems) return;
        
        // Get unique event types from data
        const eventTypeCounts = {};
        data.events.forEach(event => {
            eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
        });
        
        legendItems.innerHTML = Object.entries(eventTypeCounts)
            .map(([type, count]) => {
                const config = this.eventTypes[type] || this.eventTypes.external_event;
                return `
                    <div class="legend-item" data-event-type="${type}">
                        <span class="legend-icon" style="color: ${config.color};">${config.icon}</span>
                        <span class="legend-label">${config.label}</span>
                        <span class="legend-count">(${count})</span>
                    </div>
                `;
            })
            .join('');
        
        // Add legend item click handlers
        this.setupLegendInteractions();
    }

    setupLegendInteractions() {
        // Setup legend item interactions
        const legendItems = this.container.querySelectorAll('.legend-item');
        
        legendItems.forEach(item => {
            item.addEventListener('click', () => {
                const eventType = item.dataset.eventType;
                this.filterByEventType(eventType);
            });
        });
    }

    filterByEventType(eventType) {
        // Filter timeline by event type
        this.interactionState.selectedEventType = eventType;
        
        // Update event filter dropdown
        const eventFilter = this.container.querySelector('.event-filter');
        if (eventFilter) {
            eventFilter.value = this.getEventCategory(eventType);
        }
        
        this.applyFiltersAndUpdate();
    }

    getEventCategory(eventType) {
        // Get event category for filtering
        const eventConfig = this.eventTypes[eventType];
        return eventConfig?.category || 'external';
    }

    displayCorrelationAnalysis(data) {
        // Display correlation analysis results
        const correlationAnalysis = this.container.querySelector('#correlation-analysis');
        const correlationResults = this.container.querySelector('#correlation-results');
        
        if (!correlationAnalysis || !correlationResults) return;
        
        if (!data.correlations || data.correlations.length === 0) {
            correlationAnalysis.style.display = 'none';
            return;
        }
        
        correlationAnalysis.style.display = 'block';
        
        // Group correlations by significance
        const groupedCorrelations = this.groupCorrelationsBySignificance(data.correlations);
        
        correlationResults.innerHTML = Object.entries(groupedCorrelations)
            .map(([significance, correlations]) => `
                <div class="correlation-group">
                    <h5 class="significance-${significance}">${this.formatSignificanceLabel(significance)} Impact (${correlations.length})</h5>
                    <div class="correlation-list">
                        ${correlations.slice(0, 5).map(corr => this.generateCorrelationItem(corr)).join('')}
                    </div>
                </div>
            `)
            .join('');
    }

    groupCorrelationsBySignificance(correlations) {
        // Group correlations by significance level
        const groups = {
            very_high: [],
            high: [],
            medium: [],
            low: []
        };
        
        correlations.forEach(corr => {
            if (groups[corr.significance]) {
                groups[corr.significance].push(corr);
            }
        });
        
        return groups;
    }

    formatSignificanceLabel(significance) {
        // Format significance level label
        const labels = {
            very_high: 'Very High',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
            negligible: 'Negligible'
        };
        
        return labels[significance] || 'Unknown';
    }

    generateCorrelationItem(correlation) {
        // Generate HTML for correlation item
        const eventConfig = this.eventTypes[correlation.eventType] || this.eventTypes.external_event;
        const metricConfig = this.performanceMetrics[correlation.metric];
        
        return `
            <div class="correlation-item" data-correlation-id="${correlation.eventId}">
                <div class="correlation-header">
                    <span class="event-indicator">
                        <span class="event-icon" style="color: ${eventConfig.color};">${eventConfig.icon}</span>
                        <span class="event-label">${eventConfig.label}</span>
                    </span>
                    <span class="impact-indicator impact-${correlation.impact.direction}">
                        ${correlation.impact.changePercent > 0 ? '+' : ''}${correlation.impact.changePercent}%
                    </span>
                </div>
                <div class="correlation-details">
                    <span class="metric-affected">${metricConfig?.label || correlation.metric}</span>
                    <span class="correlation-confidence">${(correlation.confidence * 100).toFixed(0)}% confidence</span>
                    <span class="event-date">${this.formatDate(correlation.eventTimestamp)}</span>
                </div>
            </div>
        `;
    }

    showCorrelationDetails(correlation) {
        // Show detailed correlation analysis
        this.showEventDetails(correlation.eventId, correlation);
    }

    showEventDetails(eventId, correlation = null) {
        // Show detailed event analysis modal
        const event = this.findEventById(eventId);
        if (!event) return;
        
        const modal = this.container.querySelector('.event-details-modal');
        const modalBody = this.container.querySelector('#event-details-body');
        
        if (!modal || !modalBody) return;
        
        modalBody.innerHTML = this.generateEventDetailsHTML(event, correlation);
        modal.style.display = 'flex';
        
        this.logAuditEvent('event_details_viewed', {
            eventId: eventId,
            timestamp: Date.now()
        });
    }

    findEventById(eventId) {
        // Find event by ID
        return this.currentData?.events.find(event => event.id === eventId);
    }

    generateEventDetailsHTML(event, correlation = null) {
        // Generate detailed HTML for event analysis
        const eventCorrelations = this.currentData?.correlations?.filter(corr => 
            corr.eventId === event.id
        ) || [];
        
        return `
            <div class="event-full-details">
                <div class="event-overview">
                    <div class="event-header">
                        <span class="event-icon-large" style="color: ${event.config.color};">${event.config.icon}</span>
                        <div class="event-info">
                            <h5>${this.sanitizeEventData(event.title || event.config.label)}</h5>
                            <div class="event-meta">
                                <span class="event-type">${event.config.label}</span>
                                <span class="event-category">${event.config.category}</span>
                                <span class="event-priority">Priority: ${event.config.priority}</span>
                            </div>
                        </div>
                    </div>
                    <div class="event-timestamp">
                        <strong>Date:</strong> ${this.formatDate(event.timestamp)}
                    </div>
                    ${event.description ? `
                        <div class="event-description">
                            <strong>Description:</strong>
                            <p>${this.sanitizeEventData(event.description)}</p>
                        </div>
                    ` : ''}
                </div>
                
                ${eventCorrelations.length > 0 ? `
                    <div class="impact-analysis">
                        <h6>📊 Performance Impact Analysis</h6>
                        <div class="impact-grid">
                            ${eventCorrelations.map(corr => `
                                <div class="impact-metric">
                                    <div class="metric-header">
                                        <span class="metric-name">${this.performanceMetrics[corr.metric]?.label || corr.metric}</span>
                                        <span class="impact-direction impact-${corr.impact.direction}">
                                            ${corr.impact.changePercent > 0 ? '↗' : corr.impact.changePercent < 0 ? '↘' : '→'}
                                        </span>
                                    </div>
                                    <div class="impact-value">
                                        <span class="change-percent">${corr.impact.changePercent > 0 ? '+' : ''}${corr.impact.changePercent}%</span>
                                        <span class="significance significance-${corr.significance}">${this.formatSignificanceLabel(corr.significance)}</span>
                                    </div>
                                    <div class="impact-details">
                                        <span class="before-after">
                                            Before: ${this.formatMetricValue(corr.impact.beforeAvg, corr.metric)} → 
                                            After: ${this.formatMetricValue(corr.impact.afterAvg, corr.metric)}
                                        </span>
                                        <span class="confidence">Confidence: ${(corr.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="no-impact">
                        <p>No significant performance correlations detected for this event.</p>
                    </div>
                `}
                
                <div class="event-context">
                    <h6>🔍 Event Context</h6>
                    <div class="context-details">
                        <div class="context-item">
                            <strong>Impact Timeframe:</strong>
                            <span>${this.correlationConfig.analysisWindow.before} days before to ${this.correlationConfig.analysisWindow.after} days after</span>
                        </div>
                        <div class="context-item">
                            <strong>Analysis Method:</strong>
                            <span>Percentage change comparison with baseline period</span>
                        </div>
                        <div class="context-item">
                            <strong>Data Quality:</strong>
                            <span>${this.assessEventDataQuality(event)}</span>
                        </div>
                    </div>
                </div>
                
                ${this.generateEventRecommendations(event, eventCorrelations).length > 0 ? `
                    <div class="recommendations">
                        <h6>💡 Recommendations</h6>
                        <div class="recommendations-list">
                            ${this.generateEventRecommendations(event, eventCorrelations).map(rec => `
                                <div class="recommendation-item">
                                    <span class="rec-icon">${rec.icon}</span>
                                    <span class="rec-text">${rec.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    assessEventDataQuality(event) {
        // Assess quality of event data
        let quality = 'Good';
        let reasons = [];
        
        if (!event.description) reasons.push('missing description');
        if (!event.userId) reasons.push('no user attribution');
        if (event.processedAt && new Date(event.processedAt) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
            reasons.push('older data');
        }
        
        if (reasons.length > 2) quality = 'Poor';
        else if (reasons.length > 0) quality = 'Fair';
        
        return quality + (reasons.length > 0 ? ` (${reasons.join(', ')})` : '');
    }

    generateEventRecommendations(event, correlations) {
        // Generate actionable recommendations for event
        const recommendations = [];
        
        // Recommendations based on correlations
        correlations.forEach(corr => {
            if (corr.impact.direction === 'positive' && corr.significance === 'high') {
                recommendations.push({
                    icon: '🔄',
                    text: `Consider repeating similar ${event.config.label.toLowerCase()} initiatives to maintain positive impact on ${this.performanceMetrics[corr.metric]?.label || corr.metric}`
                });
            } else if (corr.impact.direction === 'negative' && corr.significance === 'high') {
                recommendations.push({
                    icon: '⚠️',
                    text: `Review the implementation of this ${event.config.label.toLowerCase()} to mitigate negative impact on ${this.performanceMetrics[corr.metric]?.label || corr.metric}`
                });
            }
        });
        
        // General recommendations based on event type
        switch (event.type) {
            case 'campaign_launch':
                if (correlations.length === 0) {
                    recommendations.push({
                        icon: '📊',
                        text: 'Monitor performance metrics more closely after campaign launches to detect impact'
                    });
                }
                break;
            case 'message_template_change':
                recommendations.push({
                    icon: '📝',
                    text: 'A/B test message template changes to measure impact before full rollout'
                });
                break;
            case 'team_change':
                recommendations.push({
                    icon: '👥',
                    text: 'Ensure proper knowledge transfer and training during team transitions'
                });
                break;
        }
        
        return recommendations.slice(0, 3); // Limit to 3 recommendations
    }

    hideEventDetailsModal() {
        // Hide event details modal
        const modal = this.container.querySelector('.event-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    clearSelection() {
        // Clear current selections
        this.selectedEvent = null;
        this.interactionState.highlightedPeriod = null;
        
        if (this.timelineChart) {
            this.timelineChart.update();
        }
    }

    // ===== VIEW CONTROL METHODS =====

    toggleViewMode() {
        // Toggle between view modes
        const viewModes = ['combined', 'events', 'performance'];
        const currentIndex = viewModes.indexOf(this.interactionState.viewMode);
        const nextIndex = (currentIndex + 1) % viewModes.length;
        
        this.interactionState.viewMode = viewModes[nextIndex];
        
        // Update view toggle button
        const viewToggle = this.container.querySelector('.view-toggle');
        if (viewToggle) {
            const labels = {
                combined: '📊 Combined',
                events: '📅 Events',
                performance: '📈 Performance'
            };
            viewToggle.innerHTML = labels[this.interactionState.viewMode];
            viewToggle.dataset.view = this.interactionState.viewMode;
        }
        
        // Re-render with new view mode
        if (this.currentData) {
            this.displayTimeline(this.currentData);
        }
    }

    toggleCorrelations() {
        // Toggle correlation display
        this.interactionState.showCorrelations = !this.interactionState.showCorrelations;
        
        // Update toggle button
        const correlationToggle = this.container.querySelector('.correlation-toggle');
        if (correlationToggle) {
            correlationToggle.style.opacity = this.interactionState.showCorrelations ? '1' : '0.6';
        }
        
        // Update correlation analysis display
        const correlationAnalysis = this.container.querySelector('#correlation-analysis');
        if (correlationAnalysis) {
            correlationAnalysis.style.display = this.interactionState.showCorrelations ? 'block' : 'none';
        }
        
        // Re-render chart
        if (this.currentData) {
            this.displayTimeline(this.currentData);
        }
    }

    updatePerformanceOverlay() {
        // Update performance overlay when metric changes
        if (this.currentData) {
            this.displayTimeline(this.currentData);
        }
    }

    // ===== ZOOM AND PAN METHODS =====

    zoomIn() {
        // Zoom in on timeline
        this.zoomLevel = Math.min(this.config.maxZoomLevel, this.zoomLevel * 1.5);
        this.applyZoom();
    }

    zoomOut() {
        // Zoom out on timeline
        this.zoomLevel = Math.max(this.config.minZoomLevel, this.zoomLevel / 1.5);
        this.applyZoom();
    }

    resetZoom() {
        // Reset zoom to default
        this.zoomLevel = 1;
        this.panOffset = 0;
        this.applyZoom();
    }

    panLeft() {
        // Pan timeline left
        this.panOffset -= 0.1;
        this.applyZoom();
    }

    panRight() {
        // Pan timeline right
        this.panOffset += 0.1;
        this.applyZoom();
    }

    applyZoom() {
        // Apply zoom and pan to chart
        if (this.timelineChart && this.timelineChart.options.plugins.zoom) {
            this.timelineChart.zoomScale('x', this.zoomLevel, 'default');
            this.timelineChart.pan({ x: this.panOffset * 100 }, undefined, 'default');
        }
    }

    // ===== FILTER AND UPDATE METHODS =====

    applyFiltersAndUpdate() {
        // Apply filters and update display
        this.updateDebounced();
    }

    async _updateInternal() {
        // Internal update method
        if (this.currentData) {
            const filteredData = this.applyCurrentFilters(this.currentData);
            await this.displayTimeline(filteredData);
            this.updateStatistics(filteredData);
        }
    }

    applyCurrentFilters(data) {
        // Apply current filters to data
        let filteredEvents = [...data.events];
        let filteredPerformance = [...data.performance];
        let filteredCorrelations = [...(data.correlations || [])];
        
        // Apply event type filter
        if (this.interactionState.selectedEventType !== 'all') {
            const category = this.interactionState.selectedEventType;
            filteredEvents = filteredEvents.filter(event => 
                event.config.category === category
            );
            
            // Filter correlations to match filtered events
            const eventIds = new Set(filteredEvents.map(e => e.id));
            filteredCorrelations = filteredCorrelations.filter(corr => 
                eventIds.has(corr.eventId)
            );
        }
        
        // Apply time range filter
        const { startDate, endDate } = this.getTimeRangeBounds();
        if (startDate && endDate) {
            filteredEvents = filteredEvents.filter(event => {
                const eventDate = new Date(event.timestamp);
                return eventDate >= startDate && eventDate <= endDate;
            });
            
            filteredPerformance = filteredPerformance.filter(point => {
                const pointDate = new Date(point.timestamp);
                return pointDate >= startDate && pointDate <= endDate;
            });
        }
        
        return {
            ...data,
            events: filteredEvents,
            performance: filteredPerformance,
            correlations: filteredCorrelations
        };
    }

    getTimeRangeBounds() {
        // Get start and end dates for current time range
        const now = new Date();
        let startDate = null;
        
        switch (this.selectedTimeRange) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '6m':
                startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
            default:
                return { startDate: null, endDate: null };
        }
        
        return { startDate, endDate: now };
    }

    // ===== UTILITY METHODS =====

    setupAutoRefresh() {
        // Setup auto-refresh for real-time updates
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (!this.isLoading) {
                this.refresh();
            }
        }, this.config.refreshInterval);
    }

    async refresh() {
        // Refresh timeline data
        try {
            await this.render(this.currentFilters);
        } catch (error) {
            console.error('Timeline refresh failed:', error);
        }
    }

    async retry() {
        // Retry failed operation
        this.clearError();
        await this.render(this.currentFilters);
    }

    async exportTimeline() {
        // Export timeline data and analysis
        try {
            if (!this.currentData) {
                throw new Error('No data available for export');
            }
            
            const exportData = {
                summary: {
                    exportedAt: new Date().toISOString(),
                    timeRange: this.selectedTimeRange,
                    totalEvents: this.currentData.events.length,
                    totalCorrelations: this.currentData.correlations?.length || 0,
                    analysisType: 'timeline_overlay'
                },
                events: this.currentData.events.map(event => ({
                    id: event.id,
                    type: event.type,
                    title: event.title,
                    description: event.description,
                    timestamp: event.timestamp,
                    category: event.config.category,
                    priority: event.config.priority
                })),
                correlations: this.currentData.correlations || [],
                performanceData: this.currentData.performance,
                statistics: this.currentData.summary,
                metadata: {
                    selectedMetric: this.interactionState.selectedMetric,
                    viewMode: this.interactionState.viewMode,
                    showCorrelations: this.interactionState.showCorrelations,
                    zoomLevel: this.zoomLevel,
                    correlationThreshold: this.config.correlationThreshold
                }
            };
            
            this.downloadJSON(exportData, 'timeline-analysis');
            
            this.logAuditEvent('timeline_exported', {
                eventCount: this.currentData.events.length,
                correlationCount: this.currentData.correlations?.length || 0,
                exportSize: JSON.stringify(exportData).length,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError(`Export failed: ${error.message}`);
        }
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
        // Show settings modal for timeline configuration
        console.log('Timeline settings modal not implemented');
    }

    updateHoverState() {
        // Update hover state for interactive elements
        if (this.timelineChart) {
            this.timelineChart.update('none'); // Update without animation
        }
    }

    // ===== DISPLAY STATE METHODS =====

    showLoading() {
        // Show loading state
        const loading = this.container.querySelector('.timeline-loading');
        if (loading) {
            loading.style.display = 'flex';
        }
        this.isLoading = true;
    }

    hideLoading() {
        // Hide loading state
        const loading = this.container.querySelector('.timeline-loading');
        if (loading) {
            loading.style.display = 'none';
        }
        this.isLoading = false;
    }

    showError(message) {
        // Show error state
        const errorDiv = this.container.querySelector('.timeline-error');
        const errorMessage = this.container.querySelector('.error-message');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'flex';
        }
    }

    clearError() {
        // Clear error state
        const errorDiv = this.container.querySelector('.timeline-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    logAuditEvent(event, data) {
        // Log audit event for security and analytics
        if (this.securitySettings.logInteractions) {
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
        // Clean up timeline overlay resources
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.timelineChart) {
            this.timelineChart.destroy();
        }
        
        if (this.overlayChart) {
            this.overlayChart.destroy();
        }
        
        if (this.correlationChart) {
            this.correlationChart.destroy();
        }
        
        // Clear data
        this.currentData = null;
        this.selectedEvent = null;
        this.auditLog = [];
        
        console.log('SecureOutreachTimelineOverlay destroyed');
    }
}
export { SecureOutreachTimelineOverlay };
