class SecureDataWriteService {
    constructor() {
        // Initialize secure data write client
        this.baseUrl = window.OsliraApp?.config?.workerUrl;
        this.backupUrl = window.OsliraApp?.config?.backupWorkerUrl || null;
        this.currentEndpoint = 'primary';
        
        // Setup Worker write endpoints
        this.endpoints = {
            writeAnalysis: '/data/write-analysis',
            auditLog: '/data/audit-log',
            cachePerformance: '/data/cache-perf',
            batchWrite: '/data/batch-operations',
            validateWrite: '/data/validate-write',
            bulkWrite: '/data/bulk-write',
            transactionWrite: '/data/transaction-write',
            scheduleWrite: '/data/schedule-write'
        };
        
        // Configure write queue for batching
        this.writeQueue = {
            high: [],
            medium: [],
            low: []
        };
        
        this.queueConfig = {
            maxBatchSize: 50,
            batchTimeout: 2000, // 2 seconds
            maxQueueSize: 1000,
            processingInterval: 1000, // 1 second
            retryAttempts: 3,
            retryDelay: 1000,
            maxRetryDelay: 30000
        };
        
        this.isProcessingQueue = false;
        this.processingStats = {
            totalWrites: 0,
            successfulWrites: 0,
            failedWrites: 0,
            queuedWrites: 0,
            batchesProcessed: 0,
            averageLatency: 0,
            errorRate: 0
        };
        
        // Initialize audit logging
        this.auditConfig = {
            enableAuditLogging: true,
            auditRetention: 90, // days
            sensitiveActions: [
                'analysis_write', 'user_data_access', 'credit_transaction',
                'security_event', 'data_export', 'admin_action'
            ],
            auditLevel: 'detailed', // minimal, standard, detailed
            encryptSensitiveData: true,
            realTimeAuditAlerts: true
        };
        
        this.auditStats = {
            totalAuditLogs: 0,
            criticalEvents: 0,
            failedAudits: 0,
            auditQueueSize: 0
        };
        
        // Write operation tracking
        this.activeWrites = new Map();
        this.writePromises = new Map();
        this.maxConcurrentWrites = 20;
        this.writeTimeouts = {
            analysis: 30000,     // 30 seconds
            audit: 15000,        // 15 seconds
            cache: 10000,        // 10 seconds
            batch: 60000,        // 60 seconds
            default: 20000       // 20 seconds
        };
        
        // Data validation and sanitization
        this.dataValidation = {
            enableValidation: true,
            maxPayloadSize: 10 * 1024 * 1024, // 10MB
            requiredFields: ['timestamp', 'userId', 'action'],
            sanitizeInput: true,
            validateSchema: true
        };
        
        // Security and encryption
        this.security = {
            encryptSensitiveFields: true,
            hashPersonalData: true,
            signRequests: true,
            validateIntegrity: true,
            auditAllWrites: true
        };
        
        // Performance monitoring
        this.performanceMetrics = {
            slowWrites: 0,
            timeoutWrites: 0,
            retryWrites: 0,
            failoverWrites: 0,
            dataIntegrityErrors: 0,
            securityViolations: 0
        };
        
        // Write deduplication
        this.deduplication = {
            enabled: true,
            windowMs: 5000, // 5 seconds
            recentWrites: new Map(),
            maxRecentWrites: 500
        };
        
        // Transaction management
        this.transactions = {
            enabled: true,
            activeTransactions: new Map(),
            maxTransactionDuration: 300000, // 5 minutes
            autoCommitTimeout: 30000 // 30 seconds
        };
        
        if (!this.baseUrl) {
            console.warn('SecureDataWriteService: Worker URL not configured, using fallback');
            this.baseUrl = 'https://oslira-worker.example.workers.dev';
        }
        
        // Initialize background processes
        this.startQueueProcessor();
        this.startAuditProcessor();
        this.startPerformanceMonitoring();
        this.startDeduplicationCleanup();
        
        console.log('📝 SecureDataWriteService initialized:', {
            baseUrl: this.baseUrl,
            backupUrl: this.backupUrl,
            endpoints: Object.keys(this.endpoints).length,
            maxBatchSize: this.queueConfig.maxBatchSize,
            auditLogging: this.auditConfig.enableAuditLogging,
            encryption: this.security.encryptSensitiveFields
        });
    }

    async writeAnalysisResult(analysisData) {
        // 🔐 Write AI analysis results via Worker
        try {
            console.log('💾 Writing analysis result via Worker...', {
                analysisType: analysisData.type || 'unknown',
                dataSize: JSON.stringify(analysisData).length,
                userId: analysisData.userId || 'anonymous'
            });
            
            // Validate analysis data
            if (this.dataValidation.enableValidation) {
                this.validateAnalysisData(analysisData);
            }
            
            // Queue analysis data for secure write
            const writePayload = {
                type: 'analysis_result',
                data: this.sanitizeAnalysisData(analysisData),
                metadata: {
                    timestamp: new Date().toISOString(),
                    userId: window.OsliraApp?.user?.id || analysisData.userId,
                    sessionId: this.getSessionId(),
                    clientVersion: 'v1.3.0',
                    source: 'secure_data_write_service',
                    analysisType: analysisData.type || 'unknown',
                    modelVersion: analysisData.modelVersion || 'unknown',
                    promptVersion: analysisData.promptVersion || 'v2.1',
                    processingTime: analysisData.processingTime || 0,
                    tokensUsed: analysisData.tokensUsed || 0,
                    cost: analysisData.cost || 0
                },
                audit: {
                    action: 'analysis_write',
                    resource: 'analysis_results',
                    resourceId: analysisData.id || this.generateId(),
                    ipAddress: await this.getClientIP(),
                    userAgent: navigator.userAgent,
                    referrer: document.referrer || 'direct'
                },
                validation: {
                    checksum: this.calculateChecksum(analysisData),
                    schema: 'analysis_result_v1',
                    integrity: this.generateIntegrityHash(analysisData)
                },
                requestId: this.generateRequestId(),
                priority: 'high', // Analysis results are high priority
                timeout: this.writeTimeouts.analysis
            };
            
            // Include metadata and timestamps
            writePayload.metadata.createdAt = new Date().toISOString();
            writePayload.metadata.expiresAt = this.calculateExpirationDate(analysisData.retention || '1y');
            
            // Check for duplicate writes
            if (this.deduplication.enabled && this.isDuplicateWrite(writePayload)) {
                console.log('🔄 Duplicate analysis write detected, skipping...');
                return { success: true, duplicate: true, requestId: writePayload.requestId };
            }
            
            // Log write operations for audit
            await this.logAuditTrail('analysis_write_initiated', {
                analysisId: writePayload.audit.resourceId,
                analysisType: analysisData.type,
                dataSize: JSON.stringify(analysisData).length
            });
            
            // Execute secure write via Worker
            const result = await this.executeSecureWrite(
                this.endpoints.writeAnalysis,
                writePayload
            );
            
            if (result.success) {
                // Log successful write
                await this.logAuditTrail('analysis_write_completed', {
                    analysisId: writePayload.audit.resourceId,
                    transactionId: result.transactionId,
                    duration: result.duration
                });
                
                // Track in deduplication cache
                this.trackWrite(writePayload);
                
                console.log('✅ Analysis result written successfully:', {
                    transactionId: result.transactionId,
                    analysisId: writePayload.audit.resourceId,
                    duration: `${result.duration}ms`
                });
            }
            
            return {
                success: result.success,
                transactionId: result.transactionId,
                analysisId: writePayload.audit.resourceId,
                requestId: writePayload.requestId,
                duration: result.duration,
                error: result.error
            };
            
        } catch (error) {
            // Log write failure
            await this.logAuditTrail('analysis_write_failed', {
                error: error.message,
                analysisType: analysisData.type
            });
            
            console.error('❌ Analysis result write failed:', error);
            throw new Error(`Analysis write failed: ${error.message}`);
        }
    }

    async logAuditTrail(action, metadata = {}) {
        // 🔐 Log user actions for audit trail
        try {
            if (!this.auditConfig.enableAuditLogging) {
                return { success: true, skipped: true };
            }
            
            console.log('📋 Logging audit trail...', {
                action,
                metadataKeys: Object.keys(metadata).length,
                auditLevel: this.auditConfig.auditLevel
            });
            
            // Capture user actions and context
            const auditEntry = {
                id: this.generateAuditId(),
                timestamp: new Date().toISOString(),
                action: action,
                userId: window.OsliraApp?.user?.id || 'anonymous',
                sessionId: this.getSessionId(),
                metadata: {
                    ...metadata,
                    userAgent: navigator.userAgent,
                    ipAddress: await this.getClientIP(),
                    referrer: document.referrer || 'direct',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language,
                    platform: navigator.platform,
                    screenResolution: `${screen.width}x${screen.height}`,
                    timestamp: new Date().toISOString()
                },
                security: {
                    sessionToken: this.hashSessionToken(),
                    requestSignature: this.generateRequestSignature(action, metadata),
                    integrityHash: this.generateIntegrityHash({ action, metadata }),
                    riskScore: this.calculateRiskScore(action, metadata),
                    classification: this.classifyAuditEvent(action)
                },
                context: {
                    page: window.location.pathname,
                    url: window.location.href,
                    title: document.title,
                    clientVersion: 'v1.3.0',
                    environment: this.getEnvironment()
                }
            };
            
            // Include session and security metadata
            if (this.auditConfig.auditLevel === 'detailed') {
                auditEntry.extended = {
                    networkInfo: await this.getNetworkInfo(),
                    performanceMetrics: this.getPerformanceSnapshot(),
                    errorContext: this.getErrorContext(),
                    previousActions: this.getRecentActions(5)
                };
            }
            
            // Encrypt sensitive data if configured
            if (this.security.encryptSensitiveFields) {
                auditEntry.encrypted = this.encryptSensitiveAuditData(auditEntry);
            }
            
            // Determine if this is a critical security event
            const isCritical = this.auditConfig.sensitiveActions.includes(action) ||
                              auditEntry.security.riskScore > 0.7;
            
            if (isCritical) {
                auditEntry.priority = 'critical';
                this.auditStats.criticalEvents++;
                
                // Real-time alert for critical events
                if (this.auditConfig.realTimeAuditAlerts) {
                    this.triggerSecurityAlert(auditEntry);
                }
            }
            
            // Store audit logs securely server-side
            const auditPayload = {
                type: 'audit_log',
                entry: auditEntry,
                requestId: this.generateRequestId(),
                priority: isCritical ? 'critical' : 'normal',
                timeout: this.writeTimeouts.audit
            };
            
            // Queue for batch processing unless critical
            if (isCritical) {
                // Write immediately for critical events
                const result = await this.executeSecureWrite(
                    this.endpoints.auditLog,
                    auditPayload
                );
                
                console.log(`✅ Critical audit entry logged: ${auditEntry.id}`);
                return result;
            } else {
                // Queue for batch processing
                return await this.queueWrite(this.endpoints.auditLog, auditPayload);
            }
            
        } catch (error) {
            this.auditStats.failedAudits++;
            console.error('❌ Audit logging failed:', error);
            
            // Don't throw error to avoid breaking main operations
            return { success: false, error: error.message };
        }
    }

    async cachePerformanceData(data, cacheKey) {
        // 🔐 Cache performance data via Worker
        try {
            console.log('🗄️ Caching performance data...', {
                cacheKey,
                dataSize: JSON.stringify(data).length,
                ttl: data.ttl || 'default'
            });
            
            // Validate cache data
            if (this.dataValidation.enableValidation) {
                this.validateCacheData(data, cacheKey);
            }
            
            // Store processed analytics server-side
            const cachePayload = {
                type: 'performance_cache',
                key: cacheKey,
                data: this.sanitizeCacheData(data),
                metadata: {
                    timestamp: new Date().toISOString(),
                    userId: window.OsliraApp?.user?.id,
                    sessionId: this.getSessionId(),
                    source: 'analytics_service',
                    dataType: data.type || 'performance',
                    version: data.version || '1.0'
                },
                options: {
                    ttl: data.ttl || 3600, // 1 hour default
                    compression: data.compression !== false,
                    encryption: data.encryption !== false,
                    replication: data.replication !== false,
                    indexing: data.indexing !== false
                },
                validation: {
                    checksum: this.calculateChecksum(data),
                    schema: 'cache_data_v1',
                    integrity: this.generateIntegrityHash(data)
                },
                requestId: this.generateRequestId(),
                priority: 'medium',
                timeout: this.writeTimeouts.cache
            };
            
            // Set appropriate TTL values based on data type
            if (data.type) {
                const ttlMap = {
                    real_time: 300,      // 5 minutes
                    hourly: 3600,        // 1 hour
                    daily: 86400,        // 24 hours
                    weekly: 604800,      // 7 days
                    monthly: 2592000,    // 30 days
                    persistent: -1       // No expiration
                };
                
                cachePayload.options.ttl = ttlMap[data.type] || cachePayload.options.ttl;
            }
            
            // Enable cache invalidation strategies
            cachePayload.invalidation = {
                dependsOn: data.dependsOn || [],
                invalidateOn: data.invalidateOn || [],
                cascadeInvalidation: data.cascadeInvalidation || false,
                conditionalInvalidation: data.conditionalInvalidation || null
            };
            
            // Queue cache write (non-critical)
            const result = await this.queueWrite(this.endpoints.cachePerformance, cachePayload);
            
            console.log('✅ Performance data queued for caching:', {
                cacheKey,
                ttl: `${cachePayload.options.ttl}s`,
                requestId: cachePayload.requestId
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ Performance data caching failed:', error);
            throw new Error(`Cache write failed: ${error.message}`);
        }
    }

    async queueWrite(endpoint, payload) {
        // Queue write operation for batch processing
        try {
            console.log('📝 Queueing write operation...', {
                endpoint: endpoint.split('/').pop(),
                priority: payload.priority || 'medium',
                queueSize: this.getTotalQueueSize()
            });
            
            // Validate queue capacity
            if (this.getTotalQueueSize() >= this.queueConfig.maxQueueSize) {
                throw new Error('Write queue is full, please try again later');
            }
            
            // Add to write queue with priority
            const queueEntry = {
                id: this.generateQueueId(),
                endpoint: endpoint,
                payload: payload,
                priority: payload.priority || 'medium',
                timestamp: new Date().toISOString(),
                attempts: 0,
                maxAttempts: this.queueConfig.retryAttempts,
                timeout: payload.timeout || this.writeTimeouts.default,
                promise: null,
                resolve: null,
                reject: null
            };
            
            // Create promise for completion tracking
            queueEntry.promise = new Promise((resolve, reject) => {
                queueEntry.resolve = resolve;
                queueEntry.reject = reject;
            });
            
            // Add to appropriate priority queue
            const priorityLevel = payload.priority || 'medium';
            if (this.writeQueue[priorityLevel]) {
                this.writeQueue[priorityLevel].push(queueEntry);
            } else {
                this.writeQueue.medium.push(queueEntry);
            }
            
            this.processingStats.queuedWrites++;
            
            console.log('✅ Write operation queued:', {
                queueId: queueEntry.id,
                priority: priorityLevel,
                position: this.writeQueue[priorityLevel].length,
                totalQueued: this.getTotalQueueSize()
            });
            
            // Handle write conflicts and retries
            this.checkWriteConflicts(queueEntry);
            
            // Start queue processing if not already running
            if (!this.isProcessingQueue) {
                this.processWriteQueue();
            }
            
            // Return promise for completion tracking
            return queueEntry.promise;
            
        } catch (error) {
            console.error('❌ Write queue operation failed:', error);
            throw new Error(`Queue write failed: ${error.message}`);
        }
    }

    async processWriteQueue() {
        // Process queued write operations in batches
        if (this.isProcessingQueue) {
            return; // Already processing
        }
        
        this.isProcessingQueue = true;
        
        try {
            console.log('⚙️ Starting write queue processing...');
            
            while (this.getTotalQueueSize() > 0) {
                // Execute writes in optimal batch sizes
                const batch = this.createBatch();
                
                if (batch.length === 0) {
                    break; // No more items to process
                }
                
                console.log(`📦 Processing batch of ${batch.length} writes...`);
                
                // Process batch with error handling
                await this.processBatch(batch);
                
                this.processingStats.batchesProcessed++;
                
                // Small delay between batches to prevent overwhelming
                await this.sleep(100);
            }
            
        } catch (error) {
            console.error('❌ Write queue processing failed:', error);
        } finally {
            this.isProcessingQueue = false;
            
            // Schedule next processing cycle if queue is not empty
            if (this.getTotalQueueSize() > 0) {
                setTimeout(() => this.processWriteQueue(), this.queueConfig.processingInterval);
            }
        }
    }

    createBatch() {
        // Create optimal batch from queue
        const batch = [];
        const maxBatchSize = this.queueConfig.maxBatchSize;
        
        // Process high priority first
        while (batch.length < maxBatchSize && this.writeQueue.high.length > 0) {
            batch.push(this.writeQueue.high.shift());
        }
        
        // Then medium priority
        while (batch.length < maxBatchSize && this.writeQueue.medium.length > 0) {
            batch.push(this.writeQueue.medium.shift());
        }
        
        // Finally low priority
        while (batch.length < maxBatchSize && this.writeQueue.low.length > 0) {
            batch.push(this.writeQueue.low.shift());
        }
        
        return batch;
    }

    async processBatch(batch) {
        // Process batch with concurrent execution
        const batchPromises = batch.map(entry => this.processQueueEntry(entry));
        
        // Handle errors and retries gracefully
        const results = await Promise.allSettled(batchPromises);
        
        results.forEach((result, index) => {
            const entry = batch[index];
            
            if (result.status === 'fulfilled') {
                // Successful write
                entry.resolve(result.value);
                this.processingStats.successfulWrites++;
            } else {
                // Failed write - handle retry
                this.handleWriteFailure(entry, result.reason);
            }
        });
        
        // Maintain write order when required
        // This is handled by processing batches sequentially
    }

    async processQueueEntry(entry) {
        // Process individual queue entry
        const startTime = Date.now();
        
        try {
            entry.attempts++;
            
            console.log(`📝 Processing write: ${entry.id} (attempt ${entry.attempts})`);
            
            // Execute the write operation
            const result = await this.executeSecureWrite(entry.endpoint, entry.payload);
            
            const duration = Date.now() - startTime;
            this.updatePerformanceMetrics(duration, true);
            
            return {
                success: true,
                queueId: entry.id,
                transactionId: result.transactionId,
                duration: duration,
                attempts: entry.attempts
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.updatePerformanceMetrics(duration, false);
            
            console.error(`❌ Write processing failed: ${entry.id}`, error);
            throw error;
        }
    }

    handleWriteFailure(entry, error) {
        // Handle write failure with retry logic
        if (entry.attempts < entry.maxAttempts) {
            // Calculate retry delay with exponential backoff
            const delay = Math.min(
                this.queueConfig.retryDelay * Math.pow(2, entry.attempts - 1),
                this.queueConfig.maxRetryDelay
            );
            
            console.log(`⏳ Retrying write ${entry.id} in ${delay}ms (attempt ${entry.attempts + 1}/${entry.maxAttempts})`);
            
            // Re-queue with delay
            setTimeout(() => {
                const priorityLevel = entry.priority || 'medium';
                this.writeQueue[priorityLevel].push(entry);
            }, delay);
            
            this.performanceMetrics.retryWrites++;
        } else {
            // Max attempts reached - reject promise
            console.error(`❌ Write ${entry.id} failed after ${entry.attempts} attempts:`, error);
            entry.reject(new Error(`Write failed after ${entry.attempts} attempts: ${error.message}`));
            this.processingStats.failedWrites++;
        }
    }

    async executeSecureWrite(endpoint, payload) {
        // Execute secure write via Worker
        const requestId = payload.requestId || this.generateRequestId();
        const startTime = Date.now();
        
        try {
            // Get authentication
            const session = window.OsliraApp?.session;
            if (!session?.access_token) {
                throw new Error('Authentication required for secure write');
            }
            
            // Determine target URL
            const targetUrl = this.getCurrentEndpointUrl();
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'X-Request-ID': requestId,
                'X-Client-Version': 'v1.3.0',
                'X-Timestamp': new Date().toISOString(),
                'X-Write-Operation': 'true',
                'X-Priority': payload.priority || 'medium'
            };
            
            // Add integrity signature
            if (this.security.signRequests) {
                headers['X-Request-Signature'] = this.generateRequestSignature(endpoint, payload);
            }
            
            // Add user context
            if (window.OsliraApp?.user?.id) {
                headers['X-User-ID'] = window.OsliraApp.user.id;
            }
            
            console.log('🔐 Executing secure write...', {
                endpoint: endpoint.split('/').pop(),
                requestId,
                payloadSize: JSON.stringify(payload).length
            });
            
            // Make write request
            const response = await this.attemptSecureWrite(
                targetUrl + endpoint,
                payload,
                headers,
                payload.timeout || this.writeTimeouts.default
            );
            
            if (!response.success) {
                throw new Error(response.error || 'Secure write failed');
            }
            
            const duration = Date.now() - startTime;
            this.processingStats.totalWrites++;
            
            console.log('✅ Secure write completed:', {
                requestId,
                transactionId: response.data?.transactionId,
                duration: `${duration}ms`
            });
            
            return {
                success: true,
                transactionId: response.data?.transactionId || requestId,
                duration: duration,
                data: response.data
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Secure write failed:', {
                requestId,
                endpoint,
                error: error.message,
                duration: `${duration}ms`
            });
            
            throw error;
        }
    }

    async attemptSecureWrite(url, payload, headers, timeout) {
        // Single secure write attempt
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                
                return {
                    success: false,
                    error: errorData.error || errorData.message || `Write failed with status ${response.status}`,
                    statusCode: response.status
                };
            }
            
            const data = await response.json();
            
            return {
                success: true,
                data: data,
                statusCode: response.status
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.performanceMetrics.timeoutWrites++;
                return {
                    success: false,
                    error: `Write timeout after ${timeout}ms`,
                    timeout: true
                };
            }
            
            return {
                success: false,
                error: error.message || 'Write network error',
                networkError: true
            };
        }
    }

    // Validation and sanitization methods
    validateAnalysisData(data) {
        const required = ['type', 'userId'];
        
        for (const field of required) {
            if (!data[field]) {
                throw new Error(`Missing required analysis field: ${field}`);
            }
        }
        
        const maxSize = this.dataValidation.maxPayloadSize;
        const dataSize = JSON.stringify(data).length;
        
        if (dataSize > maxSize) {
            throw new Error(`Analysis data too large: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);
        }
    }

    validateCacheData(data, cacheKey) {
        if (!cacheKey || typeof cacheKey !== 'string') {
            throw new Error('Invalid cache key');
        }
        
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid cache data');
        }
    }

    sanitizeAnalysisData(data) {
        // Remove sensitive fields and sanitize data
        const sanitized = { ...data };
        
        // Remove potentially sensitive fields
        const sensitiveFields = ['apiKey', 'token', 'password', 'secret'];
        sensitiveFields.forEach(field => {
            delete sanitized[field];
        });
        
        return sanitized;
    }

    sanitizeCacheData(data) {
        // Sanitize cache data
        const sanitized = { ...data };
        
        // Remove functions and undefined values
        const cleanObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'function' || obj[key] === undefined) {
                    delete obj[key];
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    cleanObject(obj[key]);
                }
            }
        };
        
        cleanObject(sanitized);
        return sanitized;
    }

    // Utility methods
    generateRequestId() {
        return 'write_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateAuditId() {
        return 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateQueueId() {
        return 'queue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSessionId() {
        const token = window.OsliraApp?.session?.access_token;
        return token ? token.substr(0, 10) + '...' : 'no_session';
    }
getCurrentEndpointUrl() {
        return this.currentEndpoint === 'backup' && this.backupUrl ? this.backupUrl : this.baseUrl;
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    calculateChecksum(data) {
        // Simple checksum calculation for data integrity
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    generateIntegrityHash(data) {
        // Generate integrity hash for security validation
        const str = JSON.stringify(data) + Date.now() + Math.random();
        return btoa(str).substr(0, 16);
    }

    calculateExpirationDate(retention) {
        // Calculate expiration date based on retention period
        const now = new Date();
        const retentionMap = {
            '1d': 1 * 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000,
            '1m': 30 * 24 * 60 * 60 * 1000,
            '3m': 90 * 24 * 60 * 60 * 1000,
            '6m': 180 * 24 * 60 * 60 * 1000,
            '1y': 365 * 24 * 60 * 60 * 1000,
            'permanent': null
        };
        
        const retentionMs = retentionMap[retention] || retentionMap['1y'];
        return retentionMs ? new Date(now.getTime() + retentionMs).toISOString() : null;
    }

    hashSessionToken() {
        // Hash session token for audit logging
        const token = window.OsliraApp?.session?.access_token;
        if (!token) return 'no_token';
        
        return btoa(token.substr(0, 10) + '_' + Date.now()).substr(0, 16);
    }

    generateRequestSignature(endpoint, payload) {
        // Generate request signature for security
        const signatureData = {
            endpoint: endpoint,
            timestamp: Date.now(),
            userId: window.OsliraApp?.user?.id,
            payloadHash: this.calculateChecksum(payload)
        };
        
        return btoa(JSON.stringify(signatureData)).substr(0, 32);
    }

    calculateRiskScore(action, metadata) {
        // Calculate risk score for audit events
        let riskScore = 0;
        
        // High-risk actions
        const highRiskActions = [
            'data_export', 'admin_action', 'credit_transaction',
            'security_event', 'user_data_access'
        ];
        
        if (highRiskActions.includes(action)) {
            riskScore += 0.5;
        }
        
        // Check for suspicious patterns
        if (metadata.error || metadata.failure) {
            riskScore += 0.3;
        }
        
        if (metadata.retry || metadata.timeout) {
            riskScore += 0.2;
        }
        
        // Time-based risk (off-hours activity)
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            riskScore += 0.1;
        }
        
        return Math.min(riskScore, 1.0);
    }

    classifyAuditEvent(action) {
        // Classify audit event for categorization
        const classifications = {
            'analysis_write': 'data_operation',
            'credit_transaction': 'financial',
            'user_login': 'authentication',
            'data_export': 'data_access',
            'admin_action': 'administrative',
            'security_event': 'security',
            'error_event': 'system_error'
        };
        
        return classifications[action] || 'general';
    }

    getEnvironment() {
        // Detect current environment
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
            return 'development';
        } else if (hostname.includes('staging') || hostname.includes('test')) {
            return 'staging';
        } else if (hostname.includes('oslira.com')) {
            return 'production';
        } else {
            return 'unknown';
        }
    }

    async getNetworkInfo() {
        // Get network information for detailed auditing
        try {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            return {
                effectiveType: connection?.effectiveType || 'unknown',
                downlink: connection?.downlink || 0,
                rtt: connection?.rtt || 0,
                saveData: connection?.saveData || false,
                type: connection?.type || 'unknown'
            };
        } catch {
            return { type: 'unknown' };
        }
    }

    getPerformanceSnapshot() {
        // Get performance metrics snapshot
        try {
            const navigation = performance.getEntriesByType('navigation')[0];
            
            return {
                loadTime: navigation?.loadEventEnd - navigation?.navigationStart || 0,
                domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart || 0,
                memoryUsage: performance.memory?.usedJSHeapSize || 0,
                timestamp: Date.now()
            };
        } catch {
            return { timestamp: Date.now() };
        }
    }

    getErrorContext() {
        // Get error context for debugging
        return {
            lastError: window.lastError?.message || null,
            errorCount: window.errorCount || 0,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        };
    }

    getRecentActions(count = 5) {
        // Get recent actions for context
        // This would typically be stored in memory or local storage
        try {
            const recentActions = JSON.parse(localStorage.getItem('recentActions') || '[]');
            return recentActions.slice(-count);
        } catch {
            return [];
        }
    }

    encryptSensitiveAuditData(auditEntry) {
        // Encrypt sensitive fields in audit data
        const sensitiveFields = ['ipAddress', 'sessionToken', 'userAgent'];
        const encrypted = {};
        
        sensitiveFields.forEach(field => {
            if (auditEntry.metadata?.[field] || auditEntry.security?.[field]) {
                const value = auditEntry.metadata?.[field] || auditEntry.security?.[field];
                encrypted[field] = btoa(value + '_encrypted_' + Date.now()).substr(0, 24);
            }
        });
        
        return encrypted;
    }

    triggerSecurityAlert(auditEntry) {
        // Trigger real-time security alert for critical events
        console.warn('🚨 Security Alert:', {
            action: auditEntry.action,
            riskScore: auditEntry.security.riskScore,
            userId: auditEntry.userId,
            timestamp: auditEntry.timestamp
        });
        
        // Send to external monitoring if configured
        if (window.OsliraApp?.securityAlert) {
            window.OsliraApp.securityAlert(auditEntry);
        }
    }

    isDuplicateWrite(payload) {
        // Check for duplicate writes within time window
        const key = this.calculateChecksum({
            type: payload.type,
            userId: payload.metadata?.userId,
            data: payload.data
        });
        
        const now = Date.now();
        const existing = this.deduplication.recentWrites.get(key);
        
        if (existing && (now - existing.timestamp) < this.deduplication.windowMs) {
            return true;
        }
        
        return false;
    }

    trackWrite(payload) {
        // Track write in deduplication cache
        const key = this.calculateChecksum({
            type: payload.type,
            userId: payload.metadata?.userId,
            data: payload.data
        });
        
        // Manage cache size
        if (this.deduplication.recentWrites.size >= this.deduplication.maxRecentWrites) {
            const firstKey = this.deduplication.recentWrites.keys().next().value;
            this.deduplication.recentWrites.delete(firstKey);
        }
        
        this.deduplication.recentWrites.set(key, {
            timestamp: Date.now(),
            payload: payload
        });
    }

    checkWriteConflicts(queueEntry) {
        // Check for potential write conflicts
        const conflicts = [];
        
        // Check for same resource writes
        for (const [priority, queue] of Object.entries(this.writeQueue)) {
            for (const entry of queue) {
                if (entry.payload?.audit?.resourceId === queueEntry.payload?.audit?.resourceId) {
                    conflicts.push(entry);
                }
            }
        }
        
        if (conflicts.length > 0) {
            console.warn(`⚠️ Write conflict detected for ${queueEntry.id}:`, conflicts.length);
            queueEntry.conflicts = conflicts;
        }
    }

    getTotalQueueSize() {
        return this.writeQueue.high.length + 
               this.writeQueue.medium.length + 
               this.writeQueue.low.length;
    }

    updatePerformanceMetrics(duration, success) {
        // Update performance tracking metrics
        if (success) {
            this.processingStats.averageLatency = 
                (this.processingStats.averageLatency + duration) / 2;
        }
        
        // Track slow writes
        if (duration > 5000) {
            this.performanceMetrics.slowWrites++;
        }
        
        // Update error rate
        const totalOps = this.processingStats.successfulWrites + this.processingStats.failedWrites;
        this.processingStats.errorRate = totalOps > 0 ? 
            this.processingStats.failedWrites / totalOps : 0;
    }

    // Background process management
    startQueueProcessor() {
        // Start background queue processor
        setInterval(() => {
            if (!this.isProcessingQueue && this.getTotalQueueSize() > 0) {
                this.processWriteQueue();
            }
        }, this.queueConfig.processingInterval);
    }

    startAuditProcessor() {
        // Start background audit processor
        setInterval(() => {
            this.processAuditQueue();
        }, 5000); // Every 5 seconds
    }

    async processAuditQueue() {
        // Process any queued audit entries
        // This would handle batch audit logging
        if (this.auditStats.auditQueueSize > 0) {
            console.log(`📋 Processing ${this.auditStats.auditQueueSize} queued audit entries...`);
            // Implementation would batch process audit entries
        }
    }

    startPerformanceMonitoring() {
        // Start performance monitoring
        setInterval(() => {
            this.logPerformanceMetrics();
        }, 300000); // Every 5 minutes
    }

    logPerformanceMetrics() {
        const metrics = {
            processing: { ...this.processingStats },
            performance: { ...this.performanceMetrics },
            audit: { ...this.auditStats },
            queue: {
                total: this.getTotalQueueSize(),
                high: this.writeQueue.high.length,
                medium: this.writeQueue.medium.length,
                low: this.writeQueue.low.length
            },
            deduplication: {
                cacheSize: this.deduplication.recentWrites.size,
                maxSize: this.deduplication.maxRecentWrites
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Write service performance metrics:', metrics);
        
        // Send to monitoring service if configured
        if (window.OsliraApp?.logMetrics) {
            window.OsliraApp.logMetrics('data_write_service', metrics);
        }
    }

    startDeduplicationCleanup() {
        // Start deduplication cache cleanup
        setInterval(() => {
            this.cleanupDeduplicationCache();
        }, 60000); // Every minute
    }

    cleanupDeduplicationCache() {
        const now = Date.now();
        let removedCount = 0;
        
        for (const [key, entry] of this.deduplication.recentWrites.entries()) {
            if (now - entry.timestamp > this.deduplication.windowMs * 2) {
                this.deduplication.recentWrites.delete(key);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            console.log(`🧹 Cleaned ${removedCount} expired deduplication entries`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public utility methods
    getStats() {
        return {
            processing: { ...this.processingStats },
            performance: { ...this.performanceMetrics },
            audit: { ...this.auditStats },
            queue: {
                total: this.getTotalQueueSize(),
                breakdown: {
                    high: this.writeQueue.high.length,
                    medium: this.writeQueue.medium.length,
                    low: this.writeQueue.low.length
                }
            },
            deduplication: {
                cacheSize: this.deduplication.recentWrites.size,
                enabled: this.deduplication.enabled
            },
            config: {
                maxBatchSize: this.queueConfig.maxBatchSize,
                maxQueueSize: this.queueConfig.maxQueueSize,
                auditLogging: this.auditConfig.enableAuditLogging
            }
        };
    }

    getQueueStatus() {
        return {
            isProcessing: this.isProcessingQueue,
            totalQueued: this.getTotalQueueSize(),
            queues: {
                high: this.writeQueue.high.length,
                medium: this.writeQueue.medium.length,
                low: this.writeQueue.low.length
            },
            activeWrites: this.activeWrites.size,
            performance: {
                averageLatency: this.processingStats.averageLatency,
                errorRate: this.processingStats.errorRate,
                successRate: this.processingStats.totalWrites > 0 ? 
                    this.processingStats.successfulWrites / this.processingStats.totalWrites : 0
            }
        };
    }

    pauseProcessing() {
        // Pause queue processing
        this.isProcessingQueue = false;
        console.log('⏸️ Write queue processing paused');
    }

    resumeProcessing() {
        // Resume queue processing
        if (this.getTotalQueueSize() > 0) {
            this.processWriteQueue();
        }
        console.log('▶️ Write queue processing resumed');
    }

    clearQueue() {
        // Clear all queues (emergency function)
        const totalCleared = this.getTotalQueueSize();
        
        this.writeQueue.high = [];
        this.writeQueue.medium = [];
        this.writeQueue.low = [];
        
        console.log(`🗑️ Cleared ${totalCleared} queued writes`);
        return totalCleared;
    }

    async flushQueue() {
        // Force process all queued writes immediately
        console.log('🚀 Force flushing write queue...');
        
        const totalToFlush = this.getTotalQueueSize();
        
        if (totalToFlush === 0) {
            console.log('✅ Queue already empty');
            return { flushed: 0, success: true };
        }
        
        // Temporarily increase batch size for flushing
        const originalBatchSize = this.queueConfig.maxBatchSize;
        this.queueConfig.maxBatchSize = Math.min(totalToFlush, 100);
        
        try {
            await this.processWriteQueue();
            
            console.log(`✅ Flushed ${totalToFlush} writes from queue`);
            return { flushed: totalToFlush, success: true };
            
        } catch (error) {
            console.error('❌ Queue flush failed:', error);
            return { flushed: 0, success: false, error: error.message };
            
        } finally {
            // Restore original batch size
            this.queueConfig.maxBatchSize = originalBatchSize;
        }
    }

    destroy() {
        // Clean up write service resources
        try {
            console.log('🗑️ Destroying SecureDataWriteService...');
            
            // Clear all queues
            this.clearQueue();
            
            // Clear caches
            this.deduplication.recentWrites.clear();
            this.activeWrites.clear();
            this.writePromises.clear();
            
            // Reset statistics
            this.processingStats = {
                totalWrites: 0,
                successfulWrites: 0,
                failedWrites: 0,
                queuedWrites: 0,
                batchesProcessed: 0,
                averageLatency: 0,
                errorRate: 0
            };
            
            this.auditStats = {
                totalAuditLogs: 0,
                criticalEvents: 0,
                failedAudits: 0,
                auditQueueSize: 0
            };
            
            this.performanceMetrics = {
                slowWrites: 0,
                timeoutWrites: 0,
                retryWrites: 0,
                failoverWrites: 0,
                dataIntegrityErrors: 0,
                securityViolations: 0
            };
            
            console.log('✅ SecureDataWriteService destroyed successfully');
            
        } catch (error) {
            console.error('❌ Error destroying SecureDataWriteService:', error);
        }
    }
}
export { SecureDataWriteService };


    
