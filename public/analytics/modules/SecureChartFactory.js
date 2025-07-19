class SecureChartFactory {
    constructor() {
        this.chartInstances = new Map();
        this.dataValidators = new Map();
        this.securityConfig = {
            maxDataPoints: 10000,
            allowedChartTypes: ['line', 'bar', 'doughnut', 'pie', 'scatter', 'radar', 'polarArea'],
            sanitizeTooltips: true,
            enableInteractions: true,
            logChartActions: true
        };
        
        // Initialize Chart.js security configurations
        this.initializeChartDefaults();
        
        // Setup data validation for Worker responses
        this.setupDataValidators();
        
        // Initialize chart theming and styling
        this.initializeThemes();
        
        console.log('🔒 SecureChartFactory initialized with security configurations');
    }

    initializeChartDefaults() {
        // Configure Chart.js global defaults for security
        if (typeof Chart !== 'undefined') {
            Chart.defaults.responsive = true;
            Chart.defaults.maintainAspectRatio = false;
            Chart.defaults.interaction.intersect = false;
            Chart.defaults.plugins.legend.display = true;
            Chart.defaults.plugins.tooltip.enabled = true;
            Chart.defaults.animation.duration = window.OsliraApp?.isFeatureEnabled?.('enableReducedMotion') ? 0 : 750;
            
            // Security: Disable HTML in tooltips by default
            Chart.defaults.plugins.tooltip.usePointStyle = false;
            Chart.defaults.plugins.tooltip.filter = (tooltipItem) => {
                // Validate tooltip data before display
                return this.validateTooltipData(tooltipItem);
            };
        }
    }

    setupDataValidators() {
        // Setup validators for different chart types
        this.dataValidators.set('line', this.validateLineChartData.bind(this));
        this.dataValidators.set('bar', this.validateBarChartData.bind(this));
        this.dataValidators.set('doughnut', this.validateDoughnutChartData.bind(this));
        this.dataValidators.set('pie', this.validatePieChartData.bind(this));
        this.dataValidators.set('scatter', this.validateScatterChartData.bind(this));
        this.dataValidators.set('radar', this.validateRadarChartData.bind(this));
        this.dataValidators.set('polarArea', this.validatePolarAreaChartData.bind(this));
    }

    initializeThemes() {
        // Initialize secure chart themes
        this.themes = {
            default: {
                colors: {
                    primary: '#2D6CDF',
                    secondary: '#8A6DF1',
                    accent: '#53E1C5',
                    success: '#10B981',
                    warning: '#F59E0B',
                    error: '#EF4444',
                    neutral: '#6B7280'
                },
                fonts: {
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    size: 12
                }
            },
            highContrast: {
                colors: {
                    primary: '#000000',
                    secondary: '#FFFFFF',
                    accent: '#FFD700',
                    success: '#00FF00',
                    warning: '#FF8C00',
                    error: '#FF0000',
                    neutral: '#808080'
                },
                fonts: {
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    size: 14
                }
            }
        };
    }

    createChart(type, container, secureData, options = {}) {
        try {
            // Validate chart type
            if (!this.securityConfig.allowedChartTypes.includes(type)) {
                throw new Error(`Chart type '${type}' is not allowed for security reasons`);
            }

            // Validate container
            if (!container || !container.getContext) {
                throw new Error('Invalid chart container provided');
            }

            // Validate data structure from Worker responses
            const validatedData = this.validateSecureData(type, secureData);

            // Apply security-conscious chart configurations
            const secureOptions = this.applySecurityConfig(type, options);

            // Get chart context
            const ctx = container.getContext('2d');

            // Create chart instance
            const chartInstance = new Chart(ctx, {
                type: type,
                data: validatedData,
                options: secureOptions
            });

            // Setup secure interaction handlers
            this.setupSecureInteractions(chartInstance, options.interactions);

            // Store chart instance with security context
            const chartId = this.generateChartId();
            const securityContext = {
                id: chartId,
                type: type,
                createdAt: new Date().toISOString(),
                userId: window.OsliraApp.user?.id,
                dataSource: 'worker_validated'
            };

            this.chartInstances.set(chartId, {
                chart: chartInstance,
                security: securityContext,
                container: container
            });

            // Log chart creation for audit
            this.logChartAction('create', chartId, { type, dataPoints: this.countDataPoints(validatedData) });

            // Return chart instance with security context
            chartInstance._securityId = chartId;
            chartInstance._securityContext = securityContext;

            console.log(`🔒 Secure chart created: ${type} (ID: ${chartId})`);
            
            return chartInstance;

        } catch (error) {
            console.error('❌ Secure chart creation failed:', error);
            this.logChartAction('create_error', null, { type, error: error.message });
            throw error;
        }
    }

    updateChart(chartInstance, newSecureData) {
        if (!chartInstance || !chartInstance._securityId) {
            throw new Error('Invalid chart instance or missing security context');
        }

        try {
            const chartId = chartInstance._securityId;
            const storedChart = this.chartInstances.get(chartId);

            if (!storedChart) {
                throw new Error('Chart instance not found in security registry');
            }

            // Validate new data from Worker endpoints
            const validatedData = this.validateSecureData(storedChart.security.type, newSecureData);

            // Update chart data securely
            chartInstance.data = validatedData;

            // Maintain chart state and interactions
            const animationDuration = window.OsliraApp?.isFeatureEnabled?.('enableReducedMotion') ? 0 : 300;
            chartInstance.update(animationDuration > 0 ? 'show' : 'none');

            // Log update for audit
            this.logChartAction('update', chartId, { 
                dataPoints: this.countDataPoints(validatedData),
                timestamp: new Date().toISOString()
            });

            console.log(`🔒 Secure chart updated: ${chartId}`);

        } catch (error) {
            console.error('❌ Secure chart update failed:', error);
            this.logChartAction('update_error', chartInstance._securityId, { error: error.message });
            throw error;
        }
    }

    destroyChart(chartInstance) {
        if (!chartInstance) return;

        try {
            const chartId = chartInstance._securityId;

            // Clean up chart resources
            if (chartInstance.destroy) {
                chartInstance.destroy();
            }

            // Clear sensitive data from memory
            if (chartId && this.chartInstances.has(chartId)) {
                const storedChart = this.chartInstances.get(chartId);
                
                // Clear container
                if (storedChart.container) {
                    const ctx = storedChart.container.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, storedChart.container.width, storedChart.container.height);
                    }
                }

                // Remove from registry
                this.chartInstances.delete(chartId);

                // Log chart destruction for audit
                this.logChartAction('destroy', chartId, { 
                    type: storedChart.security.type,
                    lifetime: Date.now() - new Date(storedChart.security.createdAt).getTime()
                });

                console.log(`🗑️ Secure chart destroyed: ${chartId}`);
            }

        } catch (error) {
            console.error('❌ Chart destruction error:', error);
            this.logChartAction('destroy_error', chartInstance._securityId || 'unknown', { error: error.message });
        }
    }

    validateSecureData(type, data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format: data must be an object');
        }

        // Check for required properties
        if (!data.labels && !data.datasets) {
            throw new Error('Invalid data format: missing labels or datasets');
        }

        // Validate data size limits
        const dataPointCount = this.countDataPoints(data);
        if (dataPointCount > this.securityConfig.maxDataPoints) {
            throw new Error(`Data size exceeds security limit: ${dataPointCount} > ${this.securityConfig.maxDataPoints}`);
        }

        // Use type-specific validator
        const validator = this.dataValidators.get(type);
        if (validator) {
            return validator(data);
        }

        // Generic validation if no specific validator
        return this.validateGenericChartData(data);
    }

    validateLineChartData(data) {
        this.validateDatasets(data.datasets, ['line'], ['data', 'label']);
        return this.sanitizeChartData(data);
    }

    validateBarChartData(data) {
        this.validateDatasets(data.datasets, ['bar'], ['data', 'label']);
        return this.sanitizeChartData(data);
    }

    validateDoughnutChartData(data) {
        this.validateDatasets(data.datasets, ['doughnut'], ['data']);
        return this.sanitizeChartData(data);
    }

    validatePieChartData(data) {
        this.validateDatasets(data.datasets, ['pie'], ['data']);
        return this.sanitizeChartData(data);
    }

    validateScatterChartData(data) {
        this.validateDatasets(data.datasets, ['scatter'], ['data']);
        // Validate scatter plot data format
        data.datasets.forEach(dataset => {
            if (!Array.isArray(dataset.data)) {
                throw new Error('Scatter plot dataset.data must be an array');
            }
            dataset.data.forEach(point => {
                if (typeof point !== 'object' || !('x' in point) || !('y' in point)) {
                    throw new Error('Scatter plot data points must have x and y properties');
                }
            });
        });
        return this.sanitizeChartData(data);
    }

    validateRadarChartData(data) {
        this.validateDatasets(data.datasets, ['radar'], ['data', 'label']);
        return this.sanitizeChartData(data);
    }

    validatePolarAreaChartData(data) {
        this.validateDatasets(data.datasets, ['polarArea'], ['data']);
        return this.sanitizeChartData(data);
    }

    validateGenericChartData(data) {
        // Generic validation for unknown chart types
        if (!Array.isArray(data.datasets)) {
            throw new Error('Data must contain a datasets array');
        }
        return this.sanitizeChartData(data);
    }

    validateDatasets(datasets, allowedTypes, requiredProperties) {
        if (!Array.isArray(datasets)) {
            throw new Error('Datasets must be an array');
        }

        datasets.forEach((dataset, index) => {
            if (!dataset || typeof dataset !== 'object') {
                throw new Error(`Dataset ${index} must be an object`);
            }

            // Check required properties
            requiredProperties.forEach(prop => {
                if (!(prop in dataset)) {
                    throw new Error(`Dataset ${index} missing required property: ${prop}`);
                }
            });

            // Validate data array
            if (!Array.isArray(dataset.data)) {
                throw new Error(`Dataset ${index} data must be an array`);
            }

            // Validate data values
            dataset.data.forEach((value, valueIndex) => {
                if (typeof value === 'object') {
                    // For objects (like scatter plots), validate numeric properties
                    Object.values(value).forEach(val => {
                        if (typeof val !== 'number' || !isFinite(val)) {
                            throw new Error(`Invalid data value in dataset ${index}, point ${valueIndex}`);
                        }
                    });
                } else if (typeof value !== 'number' || !isFinite(value)) {
                    throw new Error(`Invalid data value in dataset ${index}: ${value}`);
                }
            });
        });
    }

    sanitizeChartData(data) {
        // Create a deep copy to avoid modifying original data
        const sanitized = JSON.parse(JSON.stringify(data));

        // Sanitize labels
        if (sanitized.labels) {
            sanitized.labels = sanitized.labels.map(label => 
                this.sanitizeString(String(label))
            );
        }

        // Sanitize datasets
        sanitized.datasets = sanitized.datasets.map(dataset => {
            const sanitizedDataset = { ...dataset };
            
            // Sanitize label
            if (sanitizedDataset.label) {
                sanitizedDataset.label = this.sanitizeString(String(sanitizedDataset.label));
            }

            // Ensure data is clean
            sanitizedDataset.data = dataset.data.map(value => {
                if (typeof value === 'object') {
                    // For scatter plots and similar
                    const sanitizedPoint = {};
                    Object.entries(value).forEach(([key, val]) => {
                        sanitizedPoint[key] = Number(val);
                    });
                    return sanitizedPoint;
                }
                return Number(value);
            });

            return sanitizedDataset;
        });

        return sanitized;
    }

    sanitizeString(str) {
        // Remove potentially dangerous characters and HTML
        return str
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[<>'"&]/g, '') // Remove dangerous characters
            .substring(0, 100); // Limit length
    }

    applySecurityConfig(type, options) {
        const secureOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        filter: (legendItem) => {
                            // Validate legend items
                            return this.validateLegendItem(legendItem);
                        }
                    }
                },
                tooltip: {
                    enabled: this.securityConfig.sanitizeTooltips,
                    filter: (tooltipItem) => {
                        return this.validateTooltipData(tooltipItem);
                    },
                    callbacks: {
                        // Sanitize tooltip content
                        title: (tooltipItems) => {
                            return tooltipItems.map(item => 
                                this.sanitizeString(String(item.label || ''))
                            );
                        },
                        label: (tooltipItem) => {
                            const label = tooltipItem.dataset.label || '';
                            const value = tooltipItem.parsed.y ?? tooltipItem.parsed;
                            return `${this.sanitizeString(label)}: ${Number(value)}`;
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            onHover: this.securityConfig.enableInteractions ? (event, elements) => {
                this.handleSecureHover(event, elements);
            } : undefined,
            onClick: this.securityConfig.enableInteractions ? (event, elements) => {
                this.handleSecureClick(event, elements);
            } : undefined,
            ...options
        };

        // Apply theme
        const theme = this.getActiveTheme();
        this.applyTheme(secureOptions, theme);

        return secureOptions;
    }

    getActiveTheme() {
        return window.OsliraApp?.isFeatureEnabled?.('enableHighContrastMode') 
            ? this.themes.highContrast 
            : this.themes.default;
    }

    applyTheme(options, theme) {
        // Apply font settings
        if (options.plugins && options.plugins.legend) {
            options.plugins.legend.labels = {
                ...options.plugins.legend.labels,
                font: {
                    family: theme.fonts.family,
                    size: theme.fonts.size
                }
            };
        }

        // Apply color scheme if datasets are present
        if (options.datasets) {
            options.datasets.forEach((dataset, index) => {
                const colorIndex = index % Object.keys(theme.colors).length;
                const colorKey = Object.keys(theme.colors)[colorIndex];
                dataset.borderColor = theme.colors[colorKey];
                dataset.backgroundColor = theme.colors[colorKey] + '20'; // Add transparency
            });
        }
    }

    setupSecureInteractions(chartInstance, interactions = {}) {
        if (!this.securityConfig.enableInteractions) return;

        // Store interaction handlers with validation
        chartInstance._secureInteractions = {
            onHover: interactions.onHover || null,
            onClick: interactions.onClick || null,
            onDataPointClick: interactions.onDataPointClick || null
        };
    }

    handleSecureHover(event, elements) {
        // Validate hover event and elements
        if (!this.validateInteractionElements(elements)) return;

        // Log interaction for audit if enabled
        if (this.securityConfig.logChartActions) {
            this.logChartAction('hover', null, { elementCount: elements.length });
        }
    }

    handleSecureClick(event, elements) {
        // Validate click event and elements
        if (!this.validateInteractionElements(elements)) return;

        // Log interaction for audit
        if (this.securityConfig.logChartActions) {
            this.logChartAction('click', null, { elementCount: elements.length });
        }
    }

    validateInteractionElements(elements) {
        if (!Array.isArray(elements)) return false;
        
        // Limit interaction elements for security
        return elements.length <= 10;
    }

    validateTooltipData(tooltipItem) {
        if (!tooltipItem || typeof tooltipItem !== 'object') return false;
        
        // Validate tooltip data structure
        const hasValidData = 'parsed' in tooltipItem || 'raw' in tooltipItem;
        const hasValidIndex = typeof tooltipItem.dataIndex === 'number';
        
        return hasValidData && hasValidIndex;
    }

    validateLegendItem(legendItem) {
        if (!legendItem || typeof legendItem !== 'object') return false;
        
        // Validate legend item structure
        return 'text' in legendItem && typeof legendItem.text === 'string';
    }

    countDataPoints(data) {
        let count = 0;
        if (data.datasets && Array.isArray(data.datasets)) {
            data.datasets.forEach(dataset => {
                if (Array.isArray(dataset.data)) {
                    count += dataset.data.length;
                }
            });
        }
        return count;
    }

    generateChartId() {
        return 'chart_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    logChartAction(action, chartId, metadata = {}) {
        if (!this.securityConfig.logChartActions) return;

        try {
            const logEntry = {
                action,
                chartId,
                metadata,
                timestamp: new Date().toISOString(),
                userId: window.OsliraApp.user?.id,
                sessionId: window.OsliraApp.session?.access_token?.slice(-8)
            };

            // Log to console in development
            if (window.OsliraApp?.config?.isDevelopment) {
                console.log('📊 Chart Action:', logEntry);
            }

            // Send to audit service if available
            window.OsliraApp.dataWriteService?.logAuditTrail('chart_action', logEntry)
                .catch(error => console.warn('Chart audit logging failed:', error));

        } catch (error) {
            console.warn('Chart action logging failed:', error);
        }
    }

    getChartRegistry() {
        // Return read-only view of chart instances for debugging
        return Array.from(this.chartInstances.entries()).map(([id, data]) => ({
            id,
            type: data.security.type,
            createdAt: data.security.createdAt,
            dataSource: data.security.dataSource
        }));
    }

    destroyAllCharts() {
        // Emergency cleanup method
        console.log('🗑️ Destroying all secure charts...');
        
        for (const [chartId, chartData] of this.chartInstances) {
            try {
                this.destroyChart(chartData.chart);
            } catch (error) {
                console.error(`Failed to destroy chart ${chartId}:`, error);
            }
        }
        
        this.chartInstances.clear();
        console.log('✅ All secure charts destroyed');
    }
}
export { SecureChartFactory };
