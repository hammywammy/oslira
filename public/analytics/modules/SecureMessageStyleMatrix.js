// ===== SECURE MESSAGE STYLE PERFORMANCE MATRIX =====
class SecureMessageStyleMatrix {
    constructor(container, secureAnalyticsService, secureCreditService) {
        // Initialize secure matrix component
        this.container = container;
        this.analyticsService = secureAnalyticsService;
        this.creditService = secureCreditService;
        
        // Matrix configuration
        this.config = {
            cellSize: 40,
            padding: 10,
            minOpacity: 0.2,
            maxOpacity: 1.0,
            animationDuration: 750,
            debounceDelay: 300,
            creditCost: 2 // Credits required for detailed matrix analysis
        };
        
        // Chart instance and state
        this.chartInstance = null;
        this.currentData = null;
        this.currentFilters = {};
        this.interactionState = {
            selectedCell: null,
            hoveredCell: null,
            zoomLevel: 1,
            panOffset: { x: 0, y: 0 }
        };
        
        // Loading and error states
        this.isLoading = false;
        this.lastError = null;
        
        // Performance optimization
        this.renderDebounced = this.debounce(this._renderInternal.bind(this), this.config.debounceDelay);
        this.resizeObserver = null;
        
        // Audit logging
        this.auditLog = [];
        
        // Setup visualization container
        this.setupContainer();
        
        // Configure chart rendering options
        this.setupChartConfig();
        
        // Initialize resize observer
        this.initializeResizeObserver();
        
        console.log('SecureMessageStyleMatrix initialized');
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

    setupContainer() {
        // Setup visualization container
        if (!this.container) {
            throw new Error('Container element is required for SecureMessageStyleMatrix');
        }
        
        // Create matrix container structure
        this.container.innerHTML = `
            <div class="matrix-header">
                <h3>Message Style Performance Matrix</h3>
                <div class="matrix-controls">
                    <button class="matrix-refresh-btn" title="Refresh Matrix">🔄</button>
                    <button class="matrix-settings-btn" title="Matrix Settings">⚙️</button>
                    <button class="matrix-fullscreen-btn" title="Fullscreen">⛶</button>
                </div>
            </div>
            <div class="matrix-content">
                <div class="matrix-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Loading matrix data...</p>
                </div>
                <div class="matrix-error" style="display: none;">
                    <div class="error-icon">❌</div>
                    <p class="error-message"></p>
                    <button class="retry-btn">Retry</button>
                </div>
                <div class="matrix-chart-container">
                    <canvas class="matrix-chart"></canvas>
                </div>
                <div class="matrix-legend">
                    <div class="legend-scale">
                        <span class="legend-label">Performance</span>
                        <div class="legend-gradient"></div>
                        <div class="legend-values">
                            <span>Low</span>
                            <span>High</span>
                        </div>
                    </div>
                    <div class="legend-interactions">
                        <span class="legend-help">Click cells for details • Hover for metrics</span>
                    </div>
                </div>
            </div>
            <div class="matrix-details" style="display: none;">
                <div class="details-content"></div>
            </div>
        `;
        
        // Add event listeners
        this.setupEventListeners();
    }

    setupChartConfig() {
        // Configure chart rendering options
        this.chartConfig = {
            type: 'matrix',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: this.config.animationDuration,
                easing: 'easeInOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'point'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    external: this.customTooltip.bind(this),
                    callbacks: {
                        title: this.formatTooltipTitle.bind(this),
                        label: this.formatTooltipLabel.bind(this)
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Message Tone'
                    }
                },
                y: {
                    type: 'category',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Message Structure'
                    }
                }
            },
            elements: {
                rectangle: {
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.8)'
                }
            },
            onClick: this.handleMatrixClick.bind(this),
            onHover: this.handleMatrixHover.bind(this)
        };
    }

    setupEventListeners() {
        // Setup event listeners for matrix controls
        const refreshBtn = this.container.querySelector('.matrix-refresh-btn');
        const settingsBtn = this.container.querySelector('.matrix-settings-btn');
        const fullscreenBtn = this.container.querySelector('.matrix-fullscreen-btn');
        const retryBtn = this.container.querySelector('.retry-btn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }
    }

    initializeResizeObserver() {
        // Initialize resize observer for responsive updates
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                if (this.chartInstance) {
                    this.chartInstance.resize();
                }
            });
            
            this.resizeObserver.observe(this.container);
        }
    }

    async render(filters = {}) {
        // Render secure message style performance matrix
        try {
            this.currentFilters = { ...filters };
            this.showLoading();
            this.clearError();
            
            // Verify user credits before expensive operations
            const creditCheck = await this.verifyCreditBalance();

// Handle bypass case
if (creditCheck.message === 'Credit check bypassed' || creditCheck.message === 'Development bypass') {
    console.log('💳 Credit check bypassed for development');
} else if (creditCheck.credits && creditCheck.credits < this.config.creditCost) {
    throw new Error(`Insufficient credits. Required: ${this.config.creditCost}, Available: ${creditCheck.credits}`);
} else if (creditCheck.credits === undefined) {
    // Default to allowing if credits are undefined (service not available)
    console.log('💳 Credit service unavailable, proceeding with request');
}
            if (!creditCheck.sufficient) {
                throw new Error(`Insufficient credits. Required: ${this.config.creditCost}, Available: ${creditCheck.balance}`);
            }
            
            // Use debounced render for performance
            await this.renderDebounced(filters);
            
        } catch (error) {
            console.error('Matrix render failed:', error);
            this.showError(error.message);
            this.logAuditEvent('render_failed', { error: error.message, filters });
        }
    }

    async _renderInternal(filters) {
        // Internal render method (debounced)
        try {
            // Fetch matrix data via secure Worker endpoint
            const matrixData = await this.fetchMatrixData(filters);
            
            // Validate data format from Worker response
            this.validateMatrixData(matrixData);
            
            // Create interactive matrix visualization
            await this.createMatrixChart(matrixData);
            
            // Update current data
            this.currentData = matrixData;
            
            // Hide loading state
            this.hideLoading();
            
            // Log successful render
            this.logAuditEvent('render_success', { 
                filters, 
                dataPoints: matrixData.matrix?.length || 0,
                renderTime: Date.now()
            });
            
        } catch (error) {
            this.hideLoading();
            throw error;
        }
    }

   async verifyCreditBalance() {
    try {
        // Check if credit service exists
        if (!this.creditService || typeof this.creditService.checkBalance !== 'function') {
            console.warn('⚠️ Credit service not available, skipping credit check');
            return { success: true, credits: 999, message: 'Credit check bypassed' };
        }
        
        const balance = await this.creditService.checkBalance();
        
        if (balance.credits < this.config.creditCost) {
            throw new Error(`Insufficient credits. Required: ${this.config.creditCost}, Available: ${balance.credits}`);
        }
        
        return { success: true, credits: balance.credits };
        
    } catch (error) {
        console.error('Credit verification failed:', error);
        
        // For development/testing, allow bypass
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('netlify')) {
            console.warn('🧪 Development mode: bypassing credit check');
            return { success: true, credits: 999, message: 'Development bypass' };
        }
        
        throw error;
    }
}

    async fetchMatrixData(filters) {
        // Fetch matrix data via secure Worker endpoint
        try {
            const response = await this.analyticsService.getMessageMatrix({
                ...filters,
                includeMetrics: true,
                includeConfidence: true,
                aggregationType: 'weighted_average'
            });
            
            if (!response || !response.matrix) {
                throw new Error('Invalid matrix data received from server');
            }
            
            return response;
            
        } catch (error) {
            console.error('Matrix data fetch failed:', error);
            throw new Error(`Failed to fetch matrix data: ${error.message}`);
        }
    }

    validateMatrixData(data) {
        // Validate data format from Worker response
        if (!data || typeof data !== 'object') {
            throw new Error('Matrix data must be an object');
        }
        
        if (!Array.isArray(data.matrix)) {
            throw new Error('Matrix data must contain a matrix array');
        }
        
        if (!Array.isArray(data.xLabels) || !Array.isArray(data.yLabels)) {
            throw new Error('Matrix data must contain xLabels and yLabels arrays');
        }
        
        // Validate matrix dimensions
        const expectedSize = data.xLabels.length * data.yLabels.length;
        if (data.matrix.length !== expectedSize) {
            throw new Error(`Matrix size mismatch. Expected: ${expectedSize}, Got: ${data.matrix.length}`);
        }
        
        // Validate matrix cell structure
        data.matrix.forEach((cell, index) => {
            if (!cell || typeof cell.value !== 'number') {
                throw new Error(`Invalid matrix cell at index ${index}: missing or invalid value`);
            }
        });
    }

    async createMatrixChart(data) {
        // Create secure matrix visualization
        try {
            // Process Worker-supplied matrix data
            const chartData = this.processMatrixData(data);
            
            // Get canvas context
            const canvas = this.container.querySelector('.matrix-chart');
            if (!canvas) {
                throw new Error('Matrix chart canvas not found');
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart
            if (this.chartInstance) {
                this.chartInstance.destroy();
            }
            
            // Apply security-conscious chart configurations
            const secureConfig = this.applySecurityConfig(this.chartConfig, chartData);
            
            // Create Chart.js instance
            this.chartInstance = new Chart(ctx, {
                ...secureConfig,
                data: chartData
            });
            
            // Enable secure interaction capabilities
            this.setupSecureInteractions();
            
        } catch (error) {
            console.error('Matrix chart creation failed:', error);
            throw new Error(`Chart creation failed: ${error.message}`);
        }
    }

    processMatrixData(data) {
        // Process Worker-supplied matrix data for Chart.js
        const datasets = [{
            label: 'Performance Matrix',
            data: data.matrix.map((cell, index) => {
                const x = index % data.xLabels.length;
                const y = Math.floor(index / data.xLabels.length);
                
                return {
                    x: data.xLabels[x],
                    y: data.yLabels[y],
                    v: cell.value,
                    confidence: cell.confidence || 0,
                    sampleSize: cell.sampleSize || 0,
                    metadata: cell.metadata || {}
                };
            }),
            backgroundColor: (ctx) => this.calculateCellColor(ctx.parsed),
            borderColor: 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1
        }];
        
        return {
            labels: data.yLabels,
            datasets
        };
    }

    calculateCellColor(parsed) {
        // Calculate cell color based on performance value
        if (!parsed || typeof parsed.v !== 'number') {
            return 'rgba(200, 200, 200, 0.3)';
        }
        
        // Normalize value to 0-1 range
        const normalizedValue = Math.max(0, Math.min(1, parsed.v / 100));
        
        // Calculate opacity based on confidence
        const confidence = parsed.confidence || 0.5;
        const opacity = this.config.minOpacity + 
                       (this.config.maxOpacity - this.config.minOpacity) * confidence;
        
        // Generate color based on performance
        const hue = normalizedValue * 120; // 0 (red) to 120 (green)
        const saturation = 80;
        const lightness = 50;
        
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
    }

    applySecurityConfig(baseConfig, chartData) {
        // Apply security-conscious chart configurations
        const secureConfig = { ...baseConfig };
        
        // Limit data points for performance
        const maxDataPoints = 1000;
        if (chartData.datasets[0].data.length > maxDataPoints) {
            console.warn(`Matrix data truncated from ${chartData.datasets[0].data.length} to ${maxDataPoints} points`);
            chartData.datasets[0].data = chartData.datasets[0].data.slice(0, maxDataPoints);
        }
        
        // Sanitize labels
        secureConfig.data = {
            ...chartData,
            labels: chartData.labels.map(label => this.sanitizeLabel(label))
        };
        
        // Add security headers to tooltips
        secureConfig.plugins.tooltip.callbacks.afterBody = () => {
            return 'Data processed securely via Workers';
        };
        
        return secureConfig;
    }

    sanitizeLabel(label) {
        // Sanitize chart labels for XSS protection
        if (typeof label !== 'string') {
            return String(label);
        }
        
        return label
            .replace(/[<>\"'&]/g, '')
            .substring(0, 50); // Limit length
    }

    setupSecureInteractions() {
        // Enable secure interaction capabilities
        if (!this.chartInstance) return;
        
        // Add custom interaction handlers
        this.chartInstance.options.onHover = (event, activeElements) => {
            this.handleMatrixHover(event, activeElements);
        };
        
        this.chartInstance.options.onClick = (event, activeElements) => {
            this.handleMatrixClick(event, activeElements);
        };
    }

    async updateMatrix(newData) {
        // Update matrix with new secure data
        try {
            // Validate data format from Worker response
            this.validateMatrixData(newData);
            
            if (!this.chartInstance) {
                await this.createMatrixChart(newData);
                return;
            }
            
            // Process new data
            const chartData = this.processMatrixData(newData);
            
            // Animate transitions between data states
            this.chartInstance.data = chartData;
            this.chartInstance.update('active');
            
            // Update current data
            this.currentData = newData;
            
            // Maintain user interaction state
            this.restoreInteractionState();
            
            // Log update
            this.logAuditEvent('matrix_updated', {
                dataPoints: newData.matrix?.length || 0,
                updateTime: Date.now()
            });
            
        } catch (error) {
            console.error('Matrix update failed:', error);
            this.showError(`Update failed: ${error.message}`);
        }
    }

    handleMatrixClick(event, activeElements) {
        // Handle secure matrix interactions
        try {
            if (!activeElements || activeElements.length === 0) {
                this.clearSelection();
                return;
            }
            
            const element = activeElements[0];
            const dataIndex = element.index;
            const cellData = this.currentData?.matrix[dataIndex];
            
            if (!cellData) return;
            
            // Validate user permissions for detailed views
            if (!this.validateViewPermissions(cellData)) {
                this.showError('Insufficient permissions to view detailed data');
                return;
            }
            
            // Update interaction state
            this.interactionState.selectedCell = {
                index: dataIndex,
                data: cellData,
                timestamp: Date.now()
            };
            
            // Log interaction events for audit
            this.logAuditEvent('cell_clicked', {
                cellIndex: dataIndex,
                cellValue: cellData.value,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
            
            // Trigger secure detail data fetches
            this.fetchCellDetails(cellData);
            
        } catch (error) {
            console.error('Matrix click handling failed:', error);
            this.logAuditEvent('click_error', { error: error.message });
        }
    }

    handleMatrixHover(event, activeElements) {
        // Handle matrix hover interactions
        try {
            if (!activeElements || activeElements.length === 0) {
                this.clearHover();
                return;
            }
            
            const element = activeElements[0];
            const dataIndex = element.index;
            const cellData = this.currentData?.matrix[dataIndex];
            
            if (!cellData) return;
            
            // Update hover state
            this.interactionState.hoveredCell = {
                index: dataIndex,
                data: cellData
            };
            
            // Update cursor
            this.container.style.cursor = 'pointer';
            
        } catch (error) {
            console.error('Matrix hover handling failed:', error);
        }
    }

    validateViewPermissions(cellData) {
        // Validate user permissions for detailed views
        const session = window.OsliraApp?.session;
        if (!session) return false;
        
        // Check if user has premium features
        const userProfile = window.OsliraApp?.userProfile;
        if (userProfile?.subscription_plan === 'free' && cellData.requiresPremium) {
            return false;
        }
        
        return true;
    }

    async fetchCellDetails(cellData) {
        // Trigger secure detail data fetches
        try {
            this.showLoading();
            
            const details = await this.analyticsService.getMatrixCellDetails({
                cellId: cellData.id,
                includeBreakdown: true,
                includeRecommendations: true
            });
            
            this.showCellDetails(details);
            this.hideLoading();
            
        } catch (error) {
            console.error('Cell details fetch failed:', error);
            this.showError(`Failed to load details: ${error.message}`);
            this.hideLoading();
        }
    }

    showCellDetails(details) {
        // Show cell details panel
        const detailsPanel = this.container.querySelector('.matrix-details');
        const detailsContent = this.container.querySelector('.details-content');
        
        if (!detailsPanel || !detailsContent) return;
        
        detailsContent.innerHTML = `
            <div class="details-header">
                <h4>Performance Details</h4>
                <button class="details-close">×</button>
            </div>
            <div class="details-body">
                <div class="metric">
                    <span class="metric-label">Performance Score:</span>
                    <span class="metric-value">${details.score}/100</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Sample Size:</span>
                    <span class="metric-value">${details.sampleSize}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Confidence:</span>
                    <span class="metric-value">${Math.round(details.confidence * 100)}%</span>
                </div>
                ${details.recommendations ? `
                    <div class="recommendations">
                        <h5>Recommendations:</h5>
                        <ul>
                            ${details.recommendations.map(rec => `<li>${this.sanitizeLabel(rec)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add close handler
        const closeBtn = detailsContent.querySelector('.details-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideCellDetails());
        }
        
        detailsPanel.style.display = 'block';
    }

    hideCellDetails() {
        // Hide cell details panel
        const detailsPanel = this.container.querySelector('.matrix-details');
        if (detailsPanel) {
            detailsPanel.style.display = 'none';
        }
    }

    clearSelection() {
        // Clear cell selection
        this.interactionState.selectedCell = null;
        this.hideCellDetails();
    }

    clearHover() {
        // Clear hover state
        this.interactionState.hoveredCell = null;
        this.container.style.cursor = 'default';
    }

    restoreInteractionState() {
        // Maintain user interaction state after updates
        if (this.interactionState.selectedCell) {
            // Restore selected cell highlighting
            this.highlightCell(this.interactionState.selectedCell.index);
        }
    }

    highlightCell(cellIndex) {
        // Highlight specific matrix cell
        if (!this.chartInstance) return;
        
        // Implementation depends on Chart.js version and matrix plugin
        // This is a placeholder for cell highlighting logic
    }

    showLoading() {
        // Show loading state
        this.isLoading = true;
        const loadingEl = this.container.querySelector('.matrix-loading');
        const contentEl = this.container.querySelector('.matrix-chart-container');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (contentEl) contentEl.style.opacity = '0.5';
    }

    hideLoading() {
        // Hide loading state
        this.isLoading = false;
        const loadingEl = this.container.querySelector('.matrix-loading');
        const contentEl = this.container.querySelector('.matrix-chart-container');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.opacity = '1';
    }

    showError(message) {
        // Show error state
        this.lastError = message;
        const errorEl = this.container.querySelector('.matrix-error');
        const messageEl = this.container.querySelector('.error-message');
        
        if (errorEl) errorEl.style.display = 'block';
        if (messageEl) messageEl.textContent = message;
    }

    clearError() {
        // Clear error state
        this.lastError = null;
        const errorEl = this.container.querySelector('.matrix-error');
        if (errorEl) errorEl.style.display = 'none';
    }

    async refresh() {
        // Refresh matrix data
        await this.render(this.currentFilters);
    }

    async retry() {
        // Retry after error
        this.clearError();
        await this.refresh();
    }

    showSettings() {
        // Show matrix settings modal
        console.log('Matrix settings modal - to be implemented');
    }

    toggleFullscreen() {
        // Toggle fullscreen mode
        if (this.container.classList.contains('fullscreen')) {
            this.container.classList.remove('fullscreen');
        } else {
            this.container.classList.add('fullscreen');
        }
        
        // Resize chart after fullscreen toggle
        setTimeout(() => {
            if (this.chartInstance) {
                this.chartInstance.resize();
            }
        }, 100);
    }

    customTooltip(context) {
        // Custom tooltip implementation
        return {
            body: this.formatTooltipContent(context)
        };
    }

    formatTooltipTitle(tooltipItems) {
        // Format tooltip title
        const item = tooltipItems[0];
        return `${item.parsed.x} × ${item.parsed.y}`;
    }

    formatTooltipLabel(context) {
        // Format tooltip label
        const parsed = context.parsed;
        return `Performance: ${parsed.v}% (±${Math.round(parsed.confidence * 100)}%)`;
    }

    formatTooltipContent(context) {
        // Format tooltip content
        const parsed = context.parsed;
        return [
            `Performance: ${parsed.v}%`,
            `Confidence: ${Math.round(parsed.confidence * 100)}%`,
            `Sample Size: ${parsed.sampleSize}`
        ];
    }

    logAuditEvent(eventType, metadata = {}) {
        // Log interaction events for audit
        const auditEntry = {
            timestamp: new Date().toISOString(),
            eventType,
            userId: window.OsliraApp?.user?.id,
            sessionId: window.OsliraApp?.session?.access_token?.substr(-8),
            metadata: {
                ...metadata,
                matrixVersion: '1.0',
                userAgent: navigator.userAgent.substr(0, 100)
            }
        };
        
        this.auditLog.push(auditEntry);
        
        // Keep only last 100 entries
        if (this.auditLog.length > 100) {
            this.auditLog = this.auditLog.slice(-100);
        }
        
        // Log to console in development
        if (window.OsliraApp?.config?.enableDebugLogging) {
            console.log('Matrix audit event:', auditEntry);
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
        // Get matrix performance metrics
        return {
            renderCount: this.auditLog.filter(entry => entry.eventType === 'render_success').length,
            errorCount: this.auditLog.filter(entry => entry.eventType.includes('error')).length,
            clickCount: this.auditLog.filter(entry => entry.eventType === 'cell_clicked').length,
            lastRender: this.auditLog.filter(entry => entry.eventType === 'render_success').pop()?.timestamp,
            currentFilters: this.currentFilters,
            dataPoints: this.currentData?.matrix?.length || 0
        };
    }

    destroy() {
        // Clean up matrix component
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Clear data and state
        this.currentData = null;
        this.interactionState = {
            selectedCell: null,
            hoveredCell: null,
            zoomLevel: 1,
            panOffset: { x: 0, y: 0 }
        };
        
        // Clear audit log
        this.auditLog = [];
        
        console.log('SecureMessageStyleMatrix destroyed');
    }
}


export { SecureMessageStyleMatrix };
