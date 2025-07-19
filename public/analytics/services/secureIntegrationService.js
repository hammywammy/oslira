// ===== SECURE INTEGRATION SERVICE (HTTP CLIENT) =====
class SecureIntegrationService {
    constructor() {
        // Initialize secure integration client
        this.baseUrl = window.OsliraApp?.config?.workerUrl;
        this.timeout = 120000; // 2 minutes for external APIs
        this.retryAttempts = 3;
        this.retryDelay = 3000;
        this.requestQueue = new Map();
        this.activeJobs = new Set();
        
        // Extended timeouts for long-running operations
        this.longRunningTimeout = 300000; // 5 minutes
        
        // Integration-specific endpoints
        this.endpoints = {
            apifyScrape: '/integrations/apify-scrape',
            crmSync: '/integrations/crm-sync',
            biExport: '/integrations/bi-export',
            webhooks: '/integrations/webhooks',
            jobStatus: '/integrations/job-status',
            jobCancel: '/integrations/job-cancel'
        };
        
        // Initialize monitoring
        this.metrics = {
            requestsStarted: 0,
            requestsCompleted: 0,
            requestsFailed: 0,
            averageResponseTime: 0
        };
        
        if (!this.baseUrl) {
            console.warn('Worker URL not configured for SecureIntegrationService');
        }
    }

    async triggerApifyScrape(scrapeConfig) {
        // 🔐 Trigger Apify lead scraping via Worker
        try {
            // Validate scraping configuration
            this.validateScrapeConfig(scrapeConfig);
            
            // Sanitize configuration before transport
            const sanitizedConfig = this.sanitizeScrapeConfig(scrapeConfig);
            
            // Send scraping request to Worker
            const response = await this.makeIntegrationRequest(
                this.endpoints.apifyScrape,
                {
                    action: 'start',
                    config: sanitizedConfig,
                    priority: scrapeConfig.priority || 'normal',
                    callback_url: scrapeConfig.callbackUrl
                },
                { timeout: this.longRunningTimeout }
            );
            
            // Track active scrape job
            if (response.jobId) {
                this.activeJobs.add(response.jobId);
            }
            
            // Return scrape job details
            return {
                jobId: response.jobId,
                status: response.status,
                estimatedDuration: response.estimatedDuration,
                expectedResults: response.expectedResults,
                costEstimate: response.costEstimate,
                trackingUrl: response.trackingUrl
            };
            
        } catch (error) {
            console.error('Apify scrape trigger failed:', error);
            this.metrics.requestsFailed++;
            throw new Error(`Scraping failed: ${error.message}`);
        }
    }

    async syncWithCRM(crmConfig) {
        // 🔐 Synchronize data with external CRM
        try {
            // Validate CRM configuration
            this.validateCRMConfig(crmConfig);
            
            // Prepare sync payload
            const syncPayload = {
                crmType: crmConfig.type,
                syncDirection: crmConfig.direction || 'bidirectional',
                dataTypes: crmConfig.dataTypes || ['leads', 'contacts', 'opportunities'],
                batchSize: crmConfig.batchSize || 100,
                includeMetadata: crmConfig.includeMetadata !== false,
                dryRun: crmConfig.dryRun === true
            };
            
            // Execute CRM sync via Worker
            const response = await this.makeIntegrationRequest(
                this.endpoints.crmSync,
                {
                    action: 'sync',
                    config: syncPayload,
                    credentials: crmConfig.credentials, // Encrypted at Worker level
                    options: crmConfig.options || {}
                },
                { timeout: this.longRunningTimeout }
            );
            
            // Track sync job if long-running
            if (response.jobId) {
                this.activeJobs.add(response.jobId);
            }
            
            // Return sync results
            return {
                jobId: response.jobId,
                status: response.status,
                recordsProcessed: response.recordsProcessed,
                recordsUpdated: response.recordsUpdated,
                recordsCreated: response.recordsCreated,
                errors: response.errors || [],
                warnings: response.warnings || [],
                nextSyncTime: response.nextSyncTime,
                syncDuration: response.syncDuration
            };
            
        } catch (error) {
            console.error('CRM sync failed:', error);
            this.metrics.requestsFailed++;
            throw new Error(`CRM sync failed: ${error.message}`);
        }
    }

    async exportToBI(exportConfig) {
        // 🔐 Export analytics to BI platforms
        try {
            // Validate export configuration
            this.validateExportConfig(exportConfig);
            
            // Prepare export payload
            const exportPayload = {
                platform: exportConfig.platform,
                dataType: exportConfig.dataType,
                format: exportConfig.format || 'json',
                compression: exportConfig.compression !== false,
                filters: exportConfig.filters || {},
                dateRange: exportConfig.dateRange,
                aggregation: exportConfig.aggregation || 'none',
                includeMetadata: exportConfig.includeMetadata !== false
            };
            
            // Execute BI export via Worker
            const response = await this.makeIntegrationRequest(
                this.endpoints.biExport,
                {
                    action: 'export',
                    config: exportPayload,
                    destination: exportConfig.destination,
                    credentials: exportConfig.credentials, // Encrypted at Worker level
                    options: exportConfig.options || {}
                },
                { timeout: this.longRunningTimeout }
            );
            
            // Track export job
            if (response.jobId) {
                this.activeJobs.add(response.jobId);
            }
            
            // Return export details
            return {
                jobId: response.jobId,
                status: response.status,
                downloadUrl: response.downloadUrl,
                fileSize: response.fileSize,
                recordCount: response.recordCount,
                expiresAt: response.expiresAt,
                format: response.format,
                checksum: response.checksum
            };
            
        } catch (error) {
            console.error('BI export failed:', error);
            this.metrics.requestsFailed++;
            throw new Error(`BI export failed: ${error.message}`);
        }
    }

    async getJobStatus(jobId) {
        // Get status of long-running integration job
        try {
            const response = await this.makeIntegrationRequest(
                this.endpoints.jobStatus,
                { jobId },
                { timeout: 30000 }
            );
            
            // Update active jobs tracking
            if (response.status === 'completed' || response.status === 'failed') {
                this.activeJobs.delete(jobId);
            }
            
            return {
                jobId: response.jobId,
                status: response.status,
                progress: response.progress,
                message: response.message,
                result: response.result,
                error: response.error,
                startedAt: response.startedAt,
                completedAt: response.completedAt,
                duration: response.duration
            };
            
        } catch (error) {
            console.error('Job status check failed:', error);
            throw new Error(`Status check failed: ${error.message}`);
        }
    }

    async cancelJob(jobId) {
        // Cancel long-running integration job
        try {
            const response = await this.makeIntegrationRequest(
                this.endpoints.jobCancel,
                { jobId },
                { timeout: 30000 }
            );
            
            // Remove from active jobs
            this.activeJobs.delete(jobId);
            
            return {
                jobId: response.jobId,
                status: response.status,
                cancelled: response.cancelled,
                message: response.message
            };
            
        } catch (error) {
            console.error('Job cancellation failed:', error);
            throw new Error(`Job cancellation failed: ${error.message}`);
        }
    }

    async makeIntegrationRequest(endpoint, payload, options = {}) {
        // Execute secure integration request
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        
        try {
            this.metrics.requestsStarted++;
            
            // Validate Worker URL
            if (!this.baseUrl) {
                throw new Error('Worker URL not configured');
            }
            
            // Build request URL
            const url = `${this.baseUrl}${endpoint}`;
            
            // Prepare request headers
            const headers = {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId,
                'X-Request-Source': 'secure-integration-service',
                'X-Timestamp': new Date().toISOString()
            };
            
            // Add authentication if available
            const session = window.OsliraApp?.session;
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            
            // Configure request options
            const requestOptions = {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...payload,
                    requestId,
                    timestamp: new Date().toISOString()
                })
            };
            
            // Set timeout
            const timeout = options.timeout || this.timeout;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            requestOptions.signal = controller.signal;
            
            try {
                // Execute request with retry logic
                const response = await this.executeWithRetry(url, requestOptions);
                clearTimeout(timeoutId);
                
                // Validate response
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}`);
                }
                
                // Parse response
                const data = await response.json();
                
                // Update metrics
                this.metrics.requestsCompleted++;
                const responseTime = Date.now() - startTime;
                this.updateAverageResponseTime(responseTime);
                
                // Log successful request
                if (window.OsliraApp?.config?.enableDebugLogging) {
                    console.log(`Integration request successful: ${endpoint}`, {
                        requestId,
                        responseTime,
                        status: response.status
                    });
                }
                
                return data;
                
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
            
        } catch (error) {
            this.metrics.requestsFailed++;
            
            // Handle specific error types
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${options.timeout || this.timeout}ms`);
            }
            
            if (error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to integration service');
            }
            
            // Log error for debugging
            console.error('Integration request failed:', {
                endpoint,
                requestId,
                error: error.message,
                duration: Date.now() - startTime
            });
            
            throw error;
        }
    }

    async executeWithRetry(url, options) {
        // Execute request with exponential backoff retry
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, options);
                
                // Don't retry on 4xx errors (client errors)
                if (response.status >= 400 && response.status < 500) {
                    return response;
                }
                
                // Retry on 5xx errors (server errors)
                if (response.status >= 500 && attempt < this.retryAttempts) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                return response;
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on abort or network errors
                if (error.name === 'AbortError' || error.message.includes('fetch')) {
                    throw error;
                }
                
                // Wait before retry
                if (attempt < this.retryAttempts) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    validateScrapeConfig(config) {
        // Validate Apify scraping configuration
        if (!config) {
            throw new Error('Scrape configuration is required');
        }
        
        if (!config.targetUrl && !config.searchTerms) {
            throw new Error('Either targetUrl or searchTerms must be provided');
        }
        
        if (config.maxResults && (config.maxResults < 1 || config.maxResults > 10000)) {
            throw new Error('maxResults must be between 1 and 10000');
        }
    }

    validateCRMConfig(config) {
        // Validate CRM synchronization configuration
        if (!config) {
            throw new Error('CRM configuration is required');
        }
        
        if (!config.type) {
            throw new Error('CRM type is required');
        }
        
        const supportedCRMs = ['salesforce', 'hubspot', 'pipedrive', 'custom'];
        if (!supportedCRMs.includes(config.type)) {
            throw new Error(`Unsupported CRM type: ${config.type}`);
        }
        
        if (!config.credentials) {
            throw new Error('CRM credentials are required');
        }
    }

    validateExportConfig(config) {
        // Validate BI export configuration
        if (!config) {
            throw new Error('Export configuration is required');
        }
        
        if (!config.platform) {
            throw new Error('Export platform is required');
        }
        
        const supportedPlatforms = ['tableau', 'powerbi', 'looker', 'custom'];
        if (!supportedPlatforms.includes(config.platform)) {
            throw new Error(`Unsupported BI platform: ${config.platform}`);
        }
        
        if (!config.dataType) {
            throw new Error('Data type is required for export');
        }
    }

    sanitizeScrapeConfig(config) {
        // Sanitize scraping configuration
        return {
            targetUrl: config.targetUrl,
            searchTerms: config.searchTerms,
            maxResults: Math.min(config.maxResults || 1000, 10000),
            includeProfiles: config.includeProfiles !== false,
            includeMetrics: config.includeMetrics !== false,
            filters: config.filters || {},
            options: {
                respectRobots: config.respectRobots !== false,
                delayBetweenRequests: Math.max(config.delayBetweenRequests || 1000, 500),
                maxConcurrency: Math.min(config.maxConcurrency || 5, 10)
            }
        };
    }

    generateRequestId() {
        // Generate unique request ID
        return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    updateAverageResponseTime(responseTime) {
        // Update rolling average response time
        const alpha = 0.1; // Smoothing factor
        this.metrics.averageResponseTime = 
            this.metrics.averageResponseTime === 0 
                ? responseTime 
                : (alpha * responseTime) + ((1 - alpha) * this.metrics.averageResponseTime);
    }

    getMetrics() {
        // Get integration service metrics
        return {
            ...this.metrics,
            activeJobs: this.activeJobs.size,
            successRate: this.metrics.requestsStarted > 0 
                ? (this.metrics.requestsCompleted / this.metrics.requestsStarted) * 100 
                : 0
        };
    }

    destroy() {
        // Clean up integration service
        this.requestQueue.clear();
        this.activeJobs.clear();
        
        // Reset metrics
        this.metrics = {
            requestsStarted: 0,
            requestsCompleted: 0,
            requestsFailed: 0,
            averageResponseTime: 0
        };
    }
}
export { SecureIntegrationService };

