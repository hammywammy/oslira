class SecureLeadConversionHeatmap {
    constructor(container, analyticsService) {
        this.container = container;
        this.analyticsService = analyticsService;
        
        // ⭐ FIX: Initialize methods before binding (common issue)
        this.moduleState = {
            isLoading: false,
            hasError: false,
            lastUpdate: null,
            heatmapData: null
        };
        
        // Initialize configuration
        this.config = {
            cellSize: 12,
            animationDuration: 300,
            colorScheme: 'thermal',
            showTooltips: true,
            enableInteractions: true
        };
        
        // ⭐ FIX: Only bind methods that exist
        this.handleHover = this.handleHover ? this.handleHover.bind(this) : () => {};
        this.handleClick = this.handleClick ? this.handleClick.bind(this) : () => {};
        this.handleResize = this.handleResize ? this.handleResize.bind(this) : () => {};
        
        console.log('🔥 SecureLeadConversionHeatmap initialized');
    }

    setupServiceConnection() {
        // Setup secure analytics service connection
        if (!this.analyticsService) {
            throw new Error('SecureAnalyticsService is required for heatmap functionality');
        }
        
        // Validate service capabilities
        if (typeof this.analyticsService.getLeadConversionHeatmap !== 'function') {
            throw new Error('Analytics service missing getLeadConversionHeatmap method');
        }
        
        // Test connection
        this.testServiceConnection();
    }

    async testServiceConnection() {
        // Test analytics service connection
        try {
            // Lightweight test call
            await this.analyticsService.getLeadConversionHeatmap({ 
                test: true, 
                limit: 1 
            });
            console.log('Analytics service connection verified');
        } catch (error) {
            console.warn('Analytics service test failed:', error.message);
        }
    }

    setupVisualizationOptions() {
        // Configure heatmap visualization options
        this.visualOptions = {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 1,
            
            // Animation settings
            animation: {
                duration: this.config.animationDuration,
                easing: 'easeInOutCubic',
                animateRotate: false,
                animateScale: true
            },
            
            // Interaction settings
            interaction: {
                intersect: true,
                mode: 'nearest',
                includeInvisible: false
            },
            
            // Plugin configuration
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        filter: (legendItem) => this.filterLegendItems(legendItem)
                    }
                },
                tooltip: {
                    enabled: false, // Using custom tooltip
                    external: this.customTooltipHandler.bind(this)
                }
            },
            
            // Scale configuration
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Lead Type Categories',
                        font: { size: 14, weight: 'bold' }
                    },
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    type: 'category', 
                    title: {
                        display: true,
                        text: 'Conversion Funnel Stages',
                        font: { size: 14, weight: 'bold' }
                    },
                    grid: { display: false },
                    ticks: {
                        callback: (value) => this.formatYAxisLabel(value)
                    }
                }
            }
        };
    }

    initializeInteractionHandlers() {
        // Initialize interaction handlers
        this.interactionHandlers = {
            onHover: this.handleHeatmapHover.bind(this),
            onClick: this.handleHeatmapClick.bind(this),
            onLeave: this.handleHeatmapLeave.bind(this),
            onResize: this.handleHeatmapResize.bind(this)
        };
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup accessibility features
        this.setupAccessibilityFeatures();
    }

    setupContainer() {
        // Setup heatmap container structure
        if (!this.container) {
            throw new Error('Container element is required for SecureLeadConversionHeatmap');
        }
        
        this.container.innerHTML = `
            <div class="heatmap-wrapper">
                <div class="heatmap-header">
                    <div class="heatmap-title">
                        <h3>Lead Conversion Heatmap</h3>
                        <span class="heatmap-subtitle">Performance by lead type and stage</span>
                    </div>
                    <div class="heatmap-controls">
                        <select class="color-scheme-selector" aria-label="Color scheme">
                            <option value="default">Default Colors</option>
                            <option value="performance">Performance Colors</option>
                            <option value="accessibility">High Contrast</option>
                        </select>
                        <button class="heatmap-refresh" title="Refresh Data" aria-label="Refresh heatmap data">
                            🔄
                        </button>
                        <button class="heatmap-export" title="Export Heatmap" aria-label="Export heatmap data">
                            📊
                        </button>
                        <button class="heatmap-settings" title="Settings" aria-label="Heatmap settings">
                            ⚙️
                        </button>
                    </div>
                </div>
                
                <div class="heatmap-content">
                    <div class="heatmap-loading" style="display: none;" role="status" aria-live="polite">
                        <div class="loading-spinner" aria-hidden="true"></div>
                        <span class="loading-text">Loading conversion data...</span>
                    </div>
                    
                    <div class="heatmap-error" style="display: none;" role="alert">
                        <div class="error-icon" aria-hidden="true">⚠️</div>
                        <div class="error-content">
                            <h4>Unable to Load Heatmap</h4>
                            <p class="error-message"></p>
                            <button class="retry-btn">Retry</button>
                        </div>
                    </div>
                    
                    <div class="heatmap-chart-container">
                        <canvas class="heatmap-chart" role="img" aria-label="Lead conversion heatmap"></canvas>
                    </div>
                    
                    <div class="heatmap-legend">
                        <div class="legend-gradient">
                            <span class="legend-label">Conversion Rate</span>
                            <div class="gradient-bar" role="img" aria-label="Conversion rate scale"></div>
                            <div class="gradient-labels">
                                <span>0%</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                            </div>
                        </div>
                        
                        <div class="legend-stats">
                            <div class="stat-item">
                                <span class="stat-label">Avg. Conversion:</span>
                                <span class="stat-value" id="avg-conversion">--</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Best Performer:</span>
                                <span class="stat-value" id="best-performer">--</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total Leads:</span>
                                <span class="stat-value" id="total-leads">--</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="heatmap-tooltip" style="display: none;" role="tooltip">
                    <div class="tooltip-content"></div>
                </div>
                
                <div class="heatmap-details" style="display: none;">
                    <div class="details-header">
                        <h4>Conversion Details</h4>
                        <button class="details-close" aria-label="Close details">×</button>
                    </div>
                    <div class="details-body"></div>
                </div>
            </div>
        `;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Setup event listeners for heatmap controls
        const refreshBtn = this.container.querySelector('.heatmap-refresh');
        const exportBtn = this.container.querySelector('.heatmap-export');
        const settingsBtn = this.container.querySelector('.heatmap-settings');
        const retryBtn = this.container.querySelector('.retry-btn');
        const colorSchemeSelector = this.container.querySelector('.color-scheme-selector');
        const detailsClose = this.container.querySelector('.details-close');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportHeatmap());
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }
        
        if (colorSchemeSelector) {
            colorSchemeSelector.addEventListener('change', (e) => {
                this.changeColorScheme(e.target.value);
            });
        }
        
        if (detailsClose) {
            detailsClose.addEventListener('click', () => this.hideDetails());
        }
        
        // Setup resize observer
        this.setupResizeObserver();
    }

    setupResizeObserver() {
        // Setup resize observer for responsive updates
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                if (this.chartInstance) {
                    this.chartInstance.resize();
                    this.updateTooltipPosition();
                }
            });
            
            this.resizeObserver.observe(this.container);
        }
    }

    setupKeyboardNavigation() {
        // Setup keyboard navigation for accessibility
        this.container.addEventListener('keydown', (event) => {
            if (!this.chartInstance) return;
            
            switch (event.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    this.handleKeyboardNavigation(event);
                    event.preventDefault();
                    break;
                case 'Enter':
                case ' ':
                    this.handleKeyboardSelection(event);
                    event.preventDefault();
                    break;
                case 'Escape':
                    this.clearSelection();
                    event.preventDefault();
                    break;
            }
        });
    }

    setupAccessibilityFeatures() {
        // Setup accessibility features
        this.container.setAttribute('role', 'application');
        this.container.setAttribute('aria-label', 'Lead conversion heatmap visualization');
        
        // Add screen reader announcements
        this.announcementRegion = document.createElement('div');
        this.announcementRegion.setAttribute('aria-live', 'polite');
        this.announcementRegion.setAttribute('aria-atomic', 'true');
        this.announcementRegion.style.position = 'absolute';
        this.announcementRegion.style.left = '-10000px';
        this.container.appendChild(this.announcementRegion);
    }

     async render(filters = {}) {
        const startTime = performance.now();
        this.state = 'rendering';
        
        try {
            // Show loading state
            this.showLoading('Loading conversion heatmap...');
            
            // Fetch conversion data
            const heatmapData = await this.fetchConversionData(filters);
            
            // Render heatmap UI
            await this.renderHeatmapUI(heatmapData);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Update performance metrics
            const renderTime = performance.now() - startTime;
            this.updatePerformanceMetrics('renderTime', renderTime);
            
            console.log(`✅ SecureLeadConversionHeatmap rendered in ${renderTime.toFixed(2)}ms`);
            
        } catch (error) {
            await this.onError(error, { operation: 'render', filters });
            throw error;
        }
    }

    setState(newState) {
    if (typeof newState === 'string') {
        // Handle string state (like 'rendering', 'ready', etc.)
        this.state = newState;
    } else if (typeof newState === 'object') {
        // Handle object state updates
        this.state = { ...this.state, ...newState };
    }
    
    // Optional: trigger state change events
    if (this.onStateChange && typeof this.onStateChange === 'function') {
        this.onStateChange(this.state);
    }
}

    async cleanup() {
        console.log('🧹 SecureLeadConversionHeatmap cleanup starting...');
        
        try {
            // Clear chart instance
            if (this.chartInstance) {
                this.chartInstance.destroy();
                this.chartInstance = null;
            }
            
            // Clear event listeners
            if (this.container) {
                this.container.removeEventListener('mouseover', this.handleHover);
                this.container.removeEventListener('click', this.handleClick);
                window.removeEventListener('resize', this.handleResize);
            }
            
            // Clear resize observer
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }
            
            // Clear timers
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
                this.updateTimer = null;
            }
            
            // Clear module state
            this.moduleState = {
                isLoading: false,
                hasError: false,
                lastUpdate: null,
                heatmapData: null
            };
            
            // Clear container
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            console.log('✅ SecureLeadConversionHeatmap cleanup completed');
            
        } catch (error) {
            console.error('❌ SecureLeadConversionHeatmap cleanup error:', error);
        }
    }
    
    getModuleInfo() {
        return {
            name: 'SecureLeadConversionHeatmap',
            version: '1.0.0',
            description: 'Advanced lead conversion heatmap with interactive analytics',
            author: 'Oslira Analytics Team',
            dependencies: [
                'SecureAnalyticsService'
            ],
            capabilities: [
                'Lead conversion visualization',
                'Heatmap generation',
                'Interactive cell exploration',
                'Statistical confidence intervals',
                'Performance insights',
                'Real-time updates'
            ],
            configuration: Object.keys(this.config || {}),
            state: {
                isLoading: this.moduleState?.isLoading || false,
                hasError: this.moduleState?.hasError || false,
                lastUpdate: this.moduleState?.lastUpdate || null,
                hasData: !!(this.moduleState?.heatmapData)
            },
            endpoints: ['/analytics/lead-conversion'],
            performance: this.getPerformanceMetrics ? this.getPerformanceMetrics() : {}
        };
    }

   async fetchConversionData(filters = {}) {
        try {
            console.log('🔥 Fetching lead conversion heatmap...', {
                filterCount: Object.keys(filters).length,
                leadTypes: filters.leadTypes?.length || 'all'
            });
            
            const response = await this.analyticsService.getLeadConversionHeatmap({
                ...filters,
                includeMetrics: true,
                includeConfidence: true,
                aggregationType: 'weighted_average'
            });
            
            if (!response || !response.heatmapData) {
                throw new Error('Invalid heatmap data received from server');
            }
            
            return response;
            
        } catch (error) {
            console.error('❌ Conversion data fetch failed:', error);
            throw new Error(`Failed to fetch conversion data: ${error.message}`);
        }
    }

    validateHeatmapData(data) {
        // Validate heatmap data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Heatmap data must be an object');
        }
        
        if (!Array.isArray(data.cells)) {
            throw new Error('Heatmap data must contain a cells array');
        }
        
        if (!Array.isArray(data.leadTypes) || !Array.isArray(data.stages)) {
            throw new Error('Heatmap data must contain leadTypes and stages arrays');
        }
        
        // Validate data integrity
        if (this.securitySettings.validateDataIntegrity) {
            this.validateDataIntegrity(data);
        }
        
        // Validate cell structure
        data.cells.forEach((cell, index) => {
            if (!cell || typeof cell !== 'object') {
                throw new Error(`Invalid cell at index ${index}: must be an object`);
            }
            
            if (typeof cell.conversionRate !== 'number' || cell.conversionRate < 0 || cell.conversionRate > 100) {
                throw new Error(`Invalid conversion rate at index ${index}: must be a number between 0 and 100`);
            }
            
            if (typeof cell.leadType !== 'string' || typeof cell.stage !== 'string') {
                throw new Error(`Invalid cell identifiers at index ${index}: leadType and stage must be strings`);
            }
        });
    }

    validateDataIntegrity(data) {
        // Validate data integrity and detect tampering
        const expectedCellCount = data.leadTypes.length * data.stages.length;
        if (data.cells.length !== expectedCellCount) {
            console.warn(`Cell count mismatch: expected ${expectedCellCount}, got ${data.cells.length}`);
        }
        
        // Check for duplicate cells
        const cellKeys = new Set();
        data.cells.forEach(cell => {
            const key = `${cell.leadType}-${cell.stage}`;
            if (cellKeys.has(key)) {
                throw new Error(`Duplicate cell detected: ${key}`);
            }
            cellKeys.add(key);
        });
        
        // Validate statistical consistency
        const totalLeads = data.cells.reduce((sum, cell) => sum + (cell.totalLeads || 0), 0);
        if (totalLeads === 0) {
            throw new Error('No lead data available for heatmap generation');
        }
    }

    applySecurityFiltering(data) {
        // Apply server-side filtering for security
        if (!this.securitySettings.enableDataSanitization) {
            return data;
        }
        
        return {
            ...data,
            cells: data.cells.map(cell => ({
                ...cell,
                // Sanitize sensitive fields
                leadType: this.sanitizeString(cell.leadType),
                stage: this.sanitizeString(cell.stage),
                // Round conversion rates for privacy
                conversionRate: Math.round(cell.conversionRate * 100) / 100,
                // Encrypt sensitive metadata if enabled
                metadata: this.securitySettings.encryptSensitiveData 
                    ? this.encryptMetadata(cell.metadata)
                    : cell.metadata
            })),
            leadTypes: data.leadTypes.map(type => this.sanitizeString(type)),
            stages: data.stages.map(stage => this.sanitizeString(stage))
        };
    }

    sanitizeString(str) {
        // Sanitize strings for XSS protection
        if (typeof str !== 'string') {
            return String(str);
        }
        
        return str
            .replace(/[<>\"'&]/g, '')
            .substring(0, 100); // Limit length
    }

    encryptMetadata(metadata) {
        // Encrypt sensitive metadata (placeholder implementation)
        if (!metadata || typeof metadata !== 'object') {
            return metadata;
        }
        
        // In a real implementation, this would use proper encryption
        return { encrypted: true, data: 'encrypted_metadata' };
    }

    async createHeatmapChart(data) {
        // Create secure heatmap visualization
        try {
            // Use Worker-processed conversion rates
            const chartData = this.processHeatmapData(data);
            
            // Get canvas context
            const canvas = this.container.querySelector('.heatmap-chart');
            if (!canvas) {
                throw new Error('Heatmap chart canvas not found');
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart
            if (this.chartInstance) {
                this.chartInstance.destroy();
            }
            
            // Apply security-conscious color schemes
            const secureConfig = this.applySecureChartConfig(chartData);
            
            // Create Chart.js heatmap
            this.chartInstance = new Chart(ctx, {
                type: 'scatter', // Using scatter plot for heatmap simulation
                data: chartData,
                options: {
                    ...this.visualOptions,
                    ...secureConfig,
                    onClick: this.interactionHandlers.onClick,
                    onHover: this.interactionHandlers.onHover
                }
            });
            
            // Enable secure hover interactions
            this.enableSecureInteractions();
            
            console.log('Heatmap chart created successfully');
            
        } catch (error) {
            console.error('Heatmap chart creation failed:', error);
            throw new Error(`Chart creation failed: ${error.message}`);
        }
    }

    processHeatmapData(data) {
        // Process data for Chart.js heatmap visualization
        const processedData = {
            datasets: [{
                label: 'Conversion Rates',
                data: data.cells.map((cell, index) => ({
                    x: data.leadTypes.indexOf(cell.leadType),
                    y: data.stages.indexOf(cell.stage),
                    conversionRate: cell.conversionRate,
                    totalLeads: cell.totalLeads || 0,
                    conversions: cell.conversions || 0,
                    confidence: cell.confidence || 0,
                    metadata: cell.metadata || {},
                    cellIndex: index
                })),
                backgroundColor: (ctx) => this.calculateCellColor(ctx.parsed),
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 1,
                pointRadius: this.config.cellSize / 2,
                pointHoverRadius: this.config.cellSize / 1.8
            }]
        };
        
        // Set axis labels
        this.visualOptions.scales.x.labels = data.leadTypes;
        this.visualOptions.scales.y.labels = data.stages;
        
        return processedData;
    }

    calculateCellColor(parsed) {
        // Calculate cell color based on conversion rate
        if (!parsed || typeof parsed.conversionRate !== 'number') {
            return 'rgba(200, 200, 200, 0.3)';
        }
        
        const rate = parsed.conversionRate / 100; // Normalize to 0-1
        const confidence = parsed.confidence || 0.5;
        const scheme = this.colorSchemes[this.currentColorScheme];
        
        // Calculate color intensity based on rate and confidence
        const opacity = this.config.minOpacity + 
                       (this.config.maxOpacity - this.config.minOpacity) * confidence;
        
        // Determine color based on performance tiers
        let color;
        if (rate >= 0.75) {
            color = scheme.excellent;
        } else if (rate >= 0.5) {
            color = scheme.high || scheme.good;
        } else if (rate >= 0.25) {
            color = scheme.medium || scheme.average;
        } else {
            color = scheme.low || scheme.poor;
        }
        
        // Convert hex to rgba with opacity
        return this.hexToRgba(color, opacity);
    }

    hexToRgba(hex, alpha) {
        // Convert hex color to rgba with alpha
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) {
            return `rgba(128, 128, 128, ${alpha})`;
        }
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    applySecureChartConfig(chartData) {
        // Apply security-conscious chart configurations
        return {
            plugins: {
                ...this.visualOptions.plugins,
                tooltip: {
                    enabled: false, // Using custom secure tooltip
                    external: this.customTooltipHandler.bind(this)
                }
            },
            scales: {
                ...this.visualOptions.scales,
                x: {
                    ...this.visualOptions.scales.x,
                    max: chartData.datasets[0].data.length > 0 
                        ? Math.max(...chartData.datasets[0].data.map(d => d.x)) + 0.5
                        : 1
                },
                y: {
                    ...this.visualOptions.scales.y,
                    max: chartData.datasets[0].data.length > 0
                        ? Math.max(...chartData.datasets[0].data.map(d => d.y)) + 0.5
                        : 1
                }
            }
        };
    }

    enableSecureInteractions() {
        // Enable secure hover interactions
        if (!this.chartInstance) return;
        
        // Add custom interaction tracking
        this.chartInstance.canvas.addEventListener('mousemove', (event) => {
            this.trackMouseMovement(event);
        });
        
        this.chartInstance.canvas.addEventListener('mouseleave', () => {
            this.interactionHandlers.onLeave();
        });
        
        // Add keyboard support
        this.chartInstance.canvas.setAttribute('tabindex', '0');
        this.chartInstance.canvas.setAttribute('role', 'application');
        this.chartInstance.canvas.setAttribute('aria-label', 'Interactive conversion heatmap');
    }

    async updateHeatmap(newData) {
        // Update heatmap with secure data
        try {
            // Process Worker-validated conversion data
            this.validateHeatmapData(newData);
            
            const filteredData = this.applySecurityFiltering(newData);
            
            if (!this.chartInstance) {
                await this.createHeatmapChart(filteredData);
                return;
            }
            
            // Update color intensity calculations
            const chartData = this.processHeatmapData(filteredData);
            
            // Update chart data
            this.chartInstance.data = chartData;
            this.chartInstance.update('active');
            
            // Refresh tooltips and interactions
            this.refreshInteractionState();
            
            // Update statistics
            this.updateStatistics(filteredData);
            
            // Update current data
            this.currentData = filteredData;
            this.lastDataFetch = Date.now();
            
            // Log update
            this.logAuditEvent('heatmap_updated', {
                dataPoints: filteredData.cells?.length || 0,
                updateTime: Date.now()
            });
            
        } catch (error) {
            console.error('Heatmap update failed:', error);
            this.showError(`Update failed: ${error.message}`);
        }
    }

    refreshInteractionState() {
        // Refresh tooltips and interactions after update
        if (this.interactionState.hoveredCell) {
            // Re-validate hovered cell exists in new data
            const cellExists = this.currentData?.cells?.some(cell => 
                cell.leadType === this.interactionState.hoveredCell.leadType &&
                cell.stage === this.interactionState.hoveredCell.stage
            );
            
            if (!cellExists) {
                this.clearHover();
            }
        }
        
        // Update tooltip position if visible
        this.updateTooltipPosition();
    }

    updateStatistics(data) {
        // Update heatmap statistics display
        const avgConversionEl = this.container.querySelector('#avg-conversion');
        const bestPerformerEl = this.container.querySelector('#best-performer');
        const totalLeadsEl = this.container.querySelector('#total-leads');
        
        if (!data.cells || data.cells.length === 0) return;
        
        // Calculate average conversion rate
        const avgConversion = data.cells.reduce((sum, cell) => sum + cell.conversionRate, 0) / data.cells.length;
        
        // Find best performing combination
        const bestCell = data.cells.reduce((best, cell) => 
            cell.conversionRate > best.conversionRate ? cell : best
        );
        
        // Calculate total leads
        const totalLeads = data.cells.reduce((sum, cell) => sum + (cell.totalLeads || 0), 0);
        
        // Update display
        if (avgConversionEl) {
            avgConversionEl.textContent = `${avgConversion.toFixed(1)}%`;
        }
        
        if (bestPerformerEl) {
            bestPerformerEl.textContent = `${bestCell.leadType} - ${bestCell.stage} (${bestCell.conversionRate.toFixed(1)}%)`;
        }
        
        if (totalLeadsEl) {
            totalLeadsEl.textContent = totalLeads.toLocaleString();
        }
    }

    handleHeatmapHover(event, activeElements) {
        // Handle heatmap hover interactions
        try {
            if (!activeElements || activeElements.length === 0) {
                this.clearHover();
                return;
            }
            
            const element = activeElements[0];
            const dataPoint = this.chartInstance.data.datasets[0].data[element.index];
            const cellData = this.currentData?.cells[dataPoint.cellIndex];
            
            if (!cellData) return;
            
            // Update hover state
            this.interactionState.hoveredCell = cellData;
            this.interactionState.isInteracting = true;
            
            // Show custom tooltip
            this.showCustomTooltip(event, cellData);
            
            // Update cursor
            this.chartInstance.canvas.style.cursor = 'pointer';
            
            // Log interaction if enabled
            if (this.securitySettings.logInteractions) {
                this.logAuditEvent('cell_hovered', {
                    leadType: cellData.leadType,
                    stage: cellData.stage,
                    conversionRate: cellData.conversionRate
                });
            }
            
        } catch (error) {
            console.error('Hover handling failed:', error);
        }
}

    handleHeatmapClick(event, activeElements) {
        // Handle heatmap click interactions
        try {
            if (!activeElements || activeElements.length === 0) {
                this.clearSelection();
                return;
            }
            
            const element = activeElements[0];
            const dataPoint = this.chartInstance.data.datasets[0].data[element.index];
            const cellData = this.currentData?.cells[dataPoint.cellIndex];
            
            if (!cellData) return;
            
            // Update selection state
            this.interactionState.selectedSegment = cellData;
            
            // Show detailed breakdown
            this.showCellDetails(cellData);
            
            // Highlight selected cell
            this.highlightSelectedCell(element.index);
            
            // Log interaction
            this.logAuditEvent('cell_clicked', {
                leadType: cellData.leadType,
                stage: cellData.stage,
                conversionRate: cellData.conversionRate,
                totalLeads: cellData.totalLeads
            });
            
            // Announce to screen readers
            this.announceToScreenReader(
                `Selected ${cellData.leadType} at ${cellData.stage} stage with ${cellData.conversionRate.toFixed(1)}% conversion rate`
            );
            
        } catch (error) {
            console.error('Click handling failed:', error);
            this.logAuditEvent('click_error', { error: error.message });
        }
    }

    handleHeatmapLeave() {
        // Handle mouse leave events
        this.clearHover();
        this.interactionState.isInteracting = false;
        
        if (this.chartInstance && this.chartInstance.canvas) {
            this.chartInstance.canvas.style.cursor = 'default';
        }
    }

    handleHeatmapResize() {
        // Handle heatmap resize events
        if (this.chartInstance) {
            this.chartInstance.resize();
            this.updateTooltipPosition();
        }
    }

    handleKeyboardNavigation(event) {
        // Handle keyboard navigation for accessibility
        if (!this.currentData || !this.currentData.cells) return;
        
        const currentIndex = this.interactionState.selectedSegment 
            ? this.currentData.cells.findIndex(cell => 
                cell.leadType === this.interactionState.selectedSegment.leadType &&
                cell.stage === this.interactionState.selectedSegment.stage
              )
            : 0;
        
        let newIndex = currentIndex;
        const gridWidth = this.currentData.leadTypes.length;
        const totalCells = this.currentData.cells.length;
        
        switch (event.key) {
            case 'ArrowUp':
                newIndex = Math.max(0, currentIndex - gridWidth);
                break;
            case 'ArrowDown':
                newIndex = Math.min(totalCells - 1, currentIndex + gridWidth);
                break;
            case 'ArrowLeft':
                newIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowRight':
                newIndex = Math.min(totalCells - 1, currentIndex + 1);
                break;
        }
        
        if (newIndex !== currentIndex && this.currentData.cells[newIndex]) {
            this.interactionState.selectedSegment = this.currentData.cells[newIndex];
            this.showCellDetails(this.currentData.cells[newIndex]);
            this.announceToScreenReader(
                `Navigated to ${this.currentData.cells[newIndex].leadType} at ${this.currentData.cells[newIndex].stage}`
            );
        }
    }

    handleKeyboardSelection(event) {
        // Handle keyboard selection (Enter/Space)
        if (this.interactionState.selectedSegment) {
            this.showCellDetails(this.interactionState.selectedSegment);
        }
    }

    showCustomTooltip(event, cellData) {
        // Show custom secure tooltip
        const tooltip = this.container.querySelector('.heatmap-tooltip');
        const tooltipContent = this.container.querySelector('.tooltip-content');
        
        if (!tooltip || !tooltipContent) return;
        
        // Format tooltip content
        tooltipContent.innerHTML = `
            <div class="tooltip-header">
                <strong>${this.sanitizeString(cellData.leadType)}</strong>
                <span class="tooltip-stage">${this.sanitizeString(cellData.stage)}</span>
            </div>
            <div class="tooltip-metrics">
                <div class="metric">
                    <span class="metric-label">Conversion Rate:</span>
                    <span class="metric-value">${cellData.conversionRate.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Leads:</span>
                    <span class="metric-value">${(cellData.totalLeads || 0).toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Conversions:</span>
                    <span class="metric-value">${(cellData.conversions || 0).toLocaleString()}</span>
                </div>
                ${cellData.confidence ? `
                    <div class="metric">
                        <span class="metric-label">Confidence:</span>
                        <span class="metric-value">${Math.round(cellData.confidence * 100)}%</span>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Position tooltip
        this.positionTooltip(tooltip, event);
        
        // Show tooltip
        tooltip.style.display = 'block';
        tooltip.setAttribute('aria-hidden', 'false');
        
        // Auto-hide after delay
        this.clearTooltipTimeout();
        this.tooltipTimeout = setTimeout(() => {
            this.hideCustomTooltip();
        }, 5000);
    }

    positionTooltip(tooltip, event) {
        // Position tooltip near cursor
        const rect = this.container.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let x = event.clientX - rect.left + 10;
        let y = event.clientY - rect.top - tooltipRect.height - 10;
        
        // Ensure tooltip stays within container bounds
        if (x + tooltipRect.width > rect.width) {
            x = event.clientX - rect.left - tooltipRect.width - 10;
        }
        
        if (y < 0) {
            y = event.clientY - rect.top + 10;
        }
        
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        
        // Store position for updates
        this.interactionState.tooltipPosition = { x, y };
    }

    hideCustomTooltip() {
        // Hide custom tooltip
        const tooltip = this.container.querySelector('.heatmap-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
            tooltip.setAttribute('aria-hidden', 'true');
        }
        
        this.clearTooltipTimeout();
    }

    updateTooltipPosition() {
        // Update tooltip position after resize
        const tooltip = this.container.querySelector('.heatmap-tooltip');
        if (tooltip && tooltip.style.display !== 'none') {
            // Recalculate position based on stored coordinates
            // This is a simplified implementation
            const { x, y } = this.interactionState.tooltipPosition;
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        }
    }

    clearTooltipTimeout() {
        // Clear tooltip auto-hide timeout
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }

    showCellDetails(cellData) {
        // Show detailed cell information
        const detailsPanel = this.container.querySelector('.heatmap-details');
        const detailsBody = this.container.querySelector('.details-body');
        
        if (!detailsPanel || !detailsBody) return;
        
        // Format detailed content
        detailsBody.innerHTML = `
            <div class="details-section">
                <h5>Conversion Performance</h5>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Lead Type:</span>
                        <span class="detail-value">${this.sanitizeString(cellData.leadType)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Funnel Stage:</span>
                        <span class="detail-value">${this.sanitizeString(cellData.stage)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Conversion Rate:</span>
                        <span class="detail-value performance-${this.getPerformanceClass(cellData.conversionRate)}">
                            ${cellData.conversionRate.toFixed(2)}%
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Leads:</span>
                        <span class="detail-value">${(cellData.totalLeads || 0).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Successful Conversions:</span>
                        <span class="detail-value">${(cellData.conversions || 0).toLocaleString()}</span>
                    </div>
                    ${cellData.confidence ? `
                        <div class="detail-item">
                            <span class="detail-label">Statistical Confidence:</span>
                            <span class="detail-value">${Math.round(cellData.confidence * 100)}%</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${cellData.metadata && Object.keys(cellData.metadata).length > 0 ? `
                <div class="details-section">
                    <h5>Additional Metrics</h5>
                    <div class="details-grid">
                        ${Object.entries(cellData.metadata).map(([key, value]) => `
                            <div class="detail-item">
                                <span class="detail-label">${this.formatMetadataKey(key)}:</span>
                                <span class="detail-value">${this.formatMetadataValue(value)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="details-actions">
                <button class="details-action" onclick="heatmap.exportCellData('${cellData.leadType}', '${cellData.stage}')">
                    Export Data
                </button>
                <button class="details-action" onclick="heatmap.analyzeTrends('${cellData.leadType}', '${cellData.stage}')">
                    View Trends
                </button>
            </div>
        `;
        
        // Show details panel
        detailsPanel.style.display = 'block';
        detailsPanel.setAttribute('aria-hidden', 'false');
        
        // Focus management for accessibility
        const closeButton = detailsPanel.querySelector('.details-close');
        if (closeButton) {
            closeButton.focus();
        }
    }

    getPerformanceClass(conversionRate) {
        // Get CSS class based on performance tier
        if (conversionRate >= 75) return 'excellent';
        if (conversionRate >= 50) return 'good';
        if (conversionRate >= 25) return 'average';
        return 'poor';
    }

    formatMetadataKey(key) {
        // Format metadata keys for display
        return key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    formatMetadataValue(value) {
        // Format metadata values for display
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        
        if (typeof value === 'string') {
            return this.sanitizeString(value);
        }
        
        return String(value);
    }

    hideDetails() {
        // Hide cell details panel
        const detailsPanel = this.container.querySelector('.heatmap-details');
        if (detailsPanel) {
            detailsPanel.style.display = 'none';
            detailsPanel.setAttribute('aria-hidden', 'true');
        }
    }

    highlightSelectedCell(cellIndex) {
        // Highlight selected cell in heatmap
        if (!this.chartInstance) return;
        
        // Update chart styling to highlight selected cell
        // This would depend on the specific Chart.js heatmap implementation
        this.chartInstance.setActiveElements([{
            datasetIndex: 0,
            index: cellIndex
        }]);
        
        this.chartInstance.update('none');
    }

    clearSelection() {
        // Clear cell selection
        this.interactionState.selectedSegment = null;
        this.hideDetails();
        
        if (this.chartInstance) {
            this.chartInstance.setActiveElements([]);
            this.chartInstance.update('none');
        }
    }

    clearHover() {
        // Clear hover state
        this.interactionState.hoveredCell = null;
        this.hideCustomTooltip();
    }

    trackMouseMovement(event) {
        // Track mouse movement for interaction analytics
        if (this.securitySettings.logInteractions) {
            // Throttled mouse tracking for performance
            if (!this.mouseTrackingThrottle) {
                this.mouseTrackingThrottle = setTimeout(() => {
                    this.logAuditEvent('mouse_movement', {
                        x: event.offsetX,
                        y: event.offsetY,
                        timestamp: Date.now()
                    });
                    this.mouseTrackingThrottle = null;
                }, 1000); // Track every second
            }
        }
    }

    changeColorScheme(scheme) {
        // Change heatmap color scheme
        if (!this.colorSchemes[scheme]) {
            console.warn(`Invalid color scheme: ${scheme}`);
            return;
        }
        
        this.currentColorScheme = scheme;
        
        // Update chart colors
        if (this.chartInstance && this.currentData) {
            const chartData = this.processHeatmapData(this.currentData);
            this.chartInstance.data = chartData;
            this.chartInstance.update('active');
        }
        
        // Update legend gradient
        this.updateLegendGradient(scheme);
        
        // Log color scheme change
        this.logAuditEvent('color_scheme_changed', { scheme });
    }

    updateLegendGradient(scheme) {
        // Update legend gradient to match color scheme
        const gradientBar = this.container.querySelector('.gradient-bar');
        if (!gradientBar) return;
        
        const colors = this.colorSchemes[scheme];
        const gradient = `linear-gradient(to right, ${colors.low || colors.poor}, ${colors.medium || colors.average}, ${colors.high || colors.good}, ${colors.excellent})`;
        
        gradientBar.style.background = gradient;
    }

    setupAutoRefresh() {
        // Setup automatic data refresh
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (this.isDataStale()) {
                this.refresh();
            }
        }, this.config.refreshInterval);
    }

    isDataStale() {
        // Check if data is stale and needs refresh
        if (!this.lastDataFetch) return true;
        
        const age = Date.now() - this.lastDataFetch;
        return age > this.config.maxDataAge;
    }

    async refresh() {
        // Refresh heatmap data
        try {
            await this.render(this.currentFilters);
        } catch (error) {
            console.error('Heatmap refresh failed:', error);
            this.showError(`Refresh failed: ${error.message}`);
        }
    }

    async retry() {
        // Retry after error
        this.clearError();
        await this.refresh();
    }

    async exportHeatmap() {
        // Export heatmap data
        try {
            if (!this.currentData) {
                throw new Error('No data available for export');
            }
            
            const exportData = {
                timestamp: new Date().toISOString(),
                filters: this.currentFilters,
                data: this.currentData,
                statistics: this.calculateExportStatistics()
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lead-conversion-heatmap-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.logAuditEvent('heatmap_exported', {
                dataPoints: this.currentData.cells?.length || 0,
                format: 'json'
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError(`Export failed: ${error.message}`);
        }
    }

    calculateExportStatistics() {
        // Calculate statistics for export
        if (!this.currentData || !this.currentData.cells) {
            return {};
        }
        
        const cells = this.currentData.cells;
        const conversionRates = cells.map(cell => cell.conversionRate);
        
        return {
            averageConversionRate: conversionRates.reduce((sum, rate) => sum + rate, 0) / conversionRates.length,
            maxConversionRate: Math.max(...conversionRates),
            minConversionRate: Math.min(...conversionRates),
            totalLeads: cells.reduce((sum, cell) => sum + (cell.totalLeads || 0), 0),
            totalConversions: cells.reduce((sum, cell) => sum + (cell.conversions || 0), 0),
            leadTypeCount: this.currentData.leadTypes?.length || 0,
            stageCount: this.currentData.stages?.length || 0
        };
    }

    showSettings() {
        // Show heatmap settings modal
        console.log('Heatmap settings modal - to be implemented');
        // This would open a modal with heatmap configuration options
    }

    showLoading() {
        // Show loading state
        this.isLoading = true;
        const loadingEl = this.container.querySelector('.heatmap-loading');
        const contentEl = this.container.querySelector('.heatmap-chart-container');
        
        if (loadingEl) {
            loadingEl.style.display = 'flex';
            loadingEl.setAttribute('aria-hidden', 'false');
        }
        
        if (contentEl) {
            contentEl.style.opacity = '0.5';
        }
    }

    hideLoading() {
        // Hide loading state
        this.isLoading = false;
        const loadingEl = this.container.querySelector('.heatmap-loading');
        const contentEl = this.container.querySelector('.heatmap-chart-container');
        
        if (loadingEl) {
            loadingEl.style.display = 'none';
            loadingEl.setAttribute('aria-hidden', 'true');
        }
        
        if (contentEl) {
            contentEl.style.opacity = '1';
        }
    }

    showError(message) {
        // Show error state
        const errorEl = this.container.querySelector('.heatmap-error');
        const messageEl = this.container.querySelector('.error-message');
        
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.setAttribute('aria-hidden', 'false');
        }
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        // Announce error to screen readers
        this.announceToScreenReader(`Error: ${message}`);
    }

    clearError() {
        // Clear error state
        const errorEl = this.container.querySelector('.heatmap-error');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.setAttribute('aria-hidden', 'true');
        }
    }

    announceToScreenReader(message) {
        // Announce messages to screen readers
        if (this.announcementRegion) {
            this.announcementRegion.textContent = message;
        }
    }

    customTooltipHandler(context) {
        // Custom tooltip handler for Chart.js
        const tooltipModel = context.tooltip;
        
        if (tooltipModel.opacity === 0) {
            this.hideCustomTooltip();
            return;
        }
        
        // Show custom tooltip with security considerations
        // This is handled by the hover event handler
    }

    filterLegendItems(legendItem) {
        // Filter legend items for security
        return legendItem && legendItem.text && legendItem.text.length < 100;
    }

    formatYAxisLabel(value) {
        // Format Y-axis labels
        if (typeof value === 'string') {
            return this.sanitizeString(value).substring(0, 20);
        }
        return String(value).substring(0, 20);
    }

    logAuditEvent(eventType, metadata = {}) {
        // Log events for audit trail
        const auditEntry = {
            timestamp: new Date().toISOString(),
            eventType,
            userId: window.OsliraApp?.user?.id,
            sessionId: window.OsliraApp?.session?.access_token?.substr(-8),
            component: 'SecureLeadConversionHeatmap',
            metadata: {
                ...metadata,
                userAgent: navigator.userAgent.substr(0, 100),
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }
        };
        
        this.auditTrail.push(auditEntry);
        
        // Keep only last 200 entries
        if (this.auditTrail.length > 200) {
            this.auditTrail = this.auditTrail.slice(-200);
        }
        
        // Log to console in development
        if (window.OsliraApp?.config?.enableDebugLogging) {
            console.log('Heatmap audit event:', auditEntry);
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

    getMetrics() {
        // Get heatmap performance metrics
        return {
            renderCount: this.auditTrail.filter(entry => entry.eventType === 'heatmap_rendered').length,
            updateCount: this.auditTrail.filter(entry => entry.eventType === 'heatmap_updated').length,
            errorCount: this.auditTrail.filter(entry => entry.eventType.includes('error')).length,
            interactionCount: this.auditTrail.filter(entry => 
                ['cell_hovered', 'cell_clicked'].includes(entry.eventType)
            ).length,
            lastRender: this.auditTrail.filter(entry => entry.eventType === 'heatmap_rendered').pop()?.timestamp,
            currentColorScheme: this.currentColorScheme,
            dataPoints: this.currentData?.cells?.length || 0,
            isLoading: this.isLoading,
            hasData: !!this.currentData
        };
    }

    destroy() {
        // Clean up heatmap component
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        this.clearTooltipTimeout();
        
        if (this.mouseTrackingThrottle) {
            clearTimeout(this.mouseTrackingThrottle);
            this.mouseTrackingThrottle = null;
        }
        
        // Clear data and state
        this.currentData = null;
        this.interactionState = {
            hoveredCell: null,
            selectedSegment: null,
            tooltipPosition: { x: 0, y: 0 },
            isInteracting: false
        };
        
        // Clear audit trail
        this.auditTrail = [];
        
        console.log('SecureLeadConversionHeatmap destroyed');
    }
}
export { SecureLeadConversionHeatmap };
