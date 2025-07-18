class SecureCreditService {
    constructor() {
        // Initialize secure credit management client
        this.baseUrl = window.OsliraApp?.config?.workerUrl;
        this.backupUrl = window.OsliraApp?.config?.backupWorkerUrl || null;
        this.currentEndpoint = 'primary';
        
        // Connect to Worker credit endpoints
        this.endpoints = {
            checkBalance: '/credits/check-balance',
            deductCredits: '/credits/deduct-usage',
            usageHistory: '/credits/usage-history',
            predictUsage: '/credits/predict-usage',
            addCredits: '/credits/add-credits',
            getUserLimits: '/credits/get-limits',
            validateOperation: '/credits/validate-operation'
        };
        
        // Setup request authentication
        this.timeout = 30000; // 30 seconds for credit operations
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.maxRetryDelay = 10000;
        this.failoverEnabled = true;
        
        // Configure timeout settings
        this.balanceCheckTimeout = 15000; // Faster for balance checks
        this.deductionTimeout = 45000; // Longer for credit deductions
        this.historyTimeout = 30000; // Standard for history queries
        this.predictionTimeout = 20000; // Fast for predictions
        
        // Credit operation costs and limits
        this.operationCosts = {
            light_analysis: 1,
            deep_analysis: 2,
            risk_analysis: 1,
            insight_generation: 3,
            feedback_classification: 1,
            optimization_suggestions: 2,
            experiment_suggestions: 2,
            bulk_analysis: 5,
            custom_analysis: 1
        };
        
        // Subscription limits and features
        this.subscriptionLimits = {
            free: { 
                monthly: 10, 
                daily: 3, 
                features: ['light_analysis', 'basic_insights'] 
            },
            starter: { 
                monthly: 100, 
                daily: 15, 
                features: ['light_analysis', 'deep_analysis', 'risk_analysis'] 
            },
            growth: { 
                monthly: 500, 
                daily: 50, 
                features: ['all_basic', 'bulk_analysis', 'advanced_insights'] 
            },
            professional: { 
                monthly: 2000, 
                daily: 200, 
                features: ['all_features', 'priority_support'] 
            },
            enterprise: { 
                monthly: -1, 
                daily: -1, 
                features: ['unlimited', 'custom_integrations'] 
            }
        };
        
        // Cache configuration
        this.balanceCache = new Map();
        this.balanceCacheTTL = 30000; // 30 seconds
        this.usageCache = new Map();
        this.usageCacheTTL = 300000; // 5 minutes
        this.maxCacheSize = 50;
        
        // Usage tracking and analytics
        this.usageStats = {
            totalOperations: 0,
            totalCreditsUsed: 0,
            operationsByType: {},
            successRate: 0,
            averageLatency: 0,
            insufficientCreditCount: 0,
            lastBalanceCheck: null,
            cacheMisses: 0,
            cacheHits: 0
        };
        
        // Real-time balance monitoring
        this.balanceThresholds = {
            critical: 5,    // Alert when <= 5 credits
            warning: 15,    // Warn when <= 15 credits
            low: 30         // Notice when <= 30 credits
        };
        
        this.balanceAlerts = {
            critical: false,
            warning: false,
            low: false
        };
        
        // Rate limiting for credit operations
        this.rateLimitConfig = {
            balanceChecks: { limit: 60, window: 60000 }, // 60 per minute
            deductions: { limit: 30, window: 60000 },     // 30 per minute
            predictions: { limit: 100, window: 60000 }    // 100 per minute
        };
        
        this.rateLimitTracking = new Map();
        
        if (!this.baseUrl) {
            console.warn('SecureCreditService: Worker URL not configured, using fallback');
            this.baseUrl = 'https://oslira-worker.example.workers.dev';
        }
        
        // Initialize background processes
        this.startCacheCleanup();
        this.startRateLimitCleanup();
        
        console.log('💳 SecureCreditService initialized:', {
            baseUrl: this.baseUrl,
            backupUrl: this.backupUrl,
            operationCosts: Object.keys(this.operationCosts).length,
            subscriptionTiers: Object.keys(this.subscriptionLimits).length,
            balanceCacheTTL: `${this.balanceCacheTTL/1000}s`
        });
    }

    async checkBalance(userId = null) {
        // 🔐 Check user credit balance via Worker
        try {
            console.log('💰 Checking credit balance via Worker...', { 
                userId: userId || window.OsliraApp?.user?.id,
                useCache: true
            });
            
            // Check cache first for recent balance
            const cacheKey = this.generateBalanceCacheKey(userId);
            const cached = this.getFromCache(this.balanceCache, cacheKey, this.balanceCacheTTL);
            if (cached) {
                console.log('📋 Returning cached balance data');
                this.usageStats.cacheHits++;
                this.updateBalanceAlerts(cached.balance);
                return cached;
            }
            
            this.usageStats.cacheMisses++;
            
            // Rate limit check
            await this.enforceRateLimit('balanceChecks');
            
            // Verify user authentication server-side
            const session = window.OsliraApp?.session;
            if (!session?.access_token) {
                throw new Error('Authentication required for balance check');
            }
            
            const targetUserId = userId || window.OsliraApp?.user?.id;
            if (!targetUserId) {
                throw new Error('User ID required for balance check');
            }
            
            const payload = {
                userId: targetUserId,
                requestType: 'balance_check',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                includeProjections: true,
                includeSubscriptionInfo: true,
                includeLimits: true
            };
            
            // Make secure request with shorter timeout
            const response = await this.makeSecureRequest(
                this.endpoints.checkBalance, 
                payload, 
                this.balanceCheckTimeout
            );
            
            if (!response.success) {
                throw new Error(response.error || 'Balance check failed');
            }
            
            // Return current balance and usage projections
            const result = {
                success: true,
                balance: response.data.balance || 0,
                subscription: {
                    plan: response.data.subscription?.plan || 'free',
                    status: response.data.subscription?.status || 'unknown',
                    renewalDate: response.data.subscription?.renewalDate || null,
                    features: response.data.subscription?.features || []
                },
                limits: {
                    monthly: response.data.limits?.monthly || 0,
                    daily: response.data.limits?.daily || 0,
                    remaining: {
                        monthly: response.data.limits?.remainingMonthly || 0,
                        daily: response.data.limits?.remainingDaily || 0
                    }
                },
                usage: {
                    currentMonth: response.data.usage?.currentMonth || 0,
                    currentDay: response.data.usage?.currentDay || 0,
                    trend: response.data.usage?.trend || 'stable',
                    projectedMonthEnd: response.data.usage?.projectedMonthEnd || 0
                },
                alerts: this.generateBalanceAlerts(response.data.balance || 0),
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    source: 'worker',
                    cached: false,
                    requestId: payload.requestId
                }
            };
            
            // Cache the result
            this.setCache(this.balanceCache, cacheKey, result, this.balanceCacheTTL);
            
            // Update usage statistics
            this.usageStats.lastBalanceCheck = new Date().toISOString();
            this.updateBalanceAlerts(result.balance);
            
            // Include subscription status and limits
            console.log('✅ Credit balance retrieved successfully:', {
                balance: result.balance,
                plan: result.subscription.plan,
                monthlyRemaining: result.limits.remaining.monthly,
                dailyRemaining: result.limits.remaining.daily,
                alerts: Object.keys(result.alerts).filter(key => result.alerts[key]).length
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ Credit balance check failed:', error);
            throw new Error(`Balance check failed: ${error.message}`);
        }
    }

    async deductCredits(operation, metadata = {}) {
        // 🔐 Deduct credits with server-side verification
        try {
            console.log('🔻 Deducting credits via Worker...', { 
                operation,
                expectedCost: this.operationCosts[operation] || 'unknown',
                metadata: Object.keys(metadata).length
            });
            
            // Rate limit check
            await this.enforceRateLimit('deductions');
            
            // Validate operation cost server-side
            if (!this.operationCosts[operation]) {
                throw new Error(`Unknown operation type: ${operation}`);
            }
            
            const expectedCost = this.operationCosts[operation];
            const session = window.OsliraApp?.session;
            
            if (!session?.access_token) {
                throw new Error('Authentication required for credit deduction');
            }
            
            // Pre-flight balance check
            const currentBalance = await this.checkBalance();
            if (currentBalance.balance < expectedCost) {
                throw new Error(`Insufficient credits: need ${expectedCost}, have ${currentBalance.balance}`);
            }
            
            const payload = {
                operation: operation,
                expectedCost: expectedCost,
                userId: window.OsliraApp?.user?.id,
                metadata: {
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    sessionId: session.access_token.substr(0, 10) + '...',
                    clientVersion: 'v1.3.0',
                    ...metadata
                },
                requestType: 'credit_deduction',
                requestId: this.generateRequestId(),
                preFlightBalance: currentBalance.balance,
                auditInfo: {
                    ipAddress: await this.getClientIP(),
                    referrer: document.referrer || 'direct',
                    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };
            
            // Make secure request with longer timeout for deductions
            const response = await this.makeSecureRequest(
                this.endpoints.deductCredits, 
                payload, 
                this.deductionTimeout
            );
            
            if (!response.success) {
                // Handle insufficient credit scenarios
                if (response.error?.includes('insufficient')) {
                    this.usageStats.insufficientCreditCount++;
                    const balanceInfo = await this.checkBalance();
                    throw new Error(`Insufficient credits: operation requires ${expectedCost}, current balance: ${balanceInfo.balance}`);
                }
                throw new Error(response.error || 'Credit deduction failed');
            }
            
            // Log usage with audit trail
            const deductionResult = {
                success: true,
                transaction: {
                    id: response.data.transactionId,
                    operation: operation,
                    creditsDeducted: response.data.creditsDeducted || expectedCost,
                    timestamp: response.data.timestamp || new Date().toISOString(),
                    balanceBefore: response.data.balanceBefore || currentBalance.balance,
                    balanceAfter: response.data.balanceAfter || (currentBalance.balance - expectedCost)
                },
                balance: {
                    current: response.data.balanceAfter || (currentBalance.balance - expectedCost),
                    previous: response.data.balanceBefore || currentBalance.balance,
                    remaining: {
                        monthly: response.data.limits?.remainingMonthly || 0,
                        daily: response.data.limits?.remainingDaily || 0
                    }
                },
                alerts: this.generateBalanceAlerts(response.data.balanceAfter || 0),
                metadata: {
                    requestId: payload.requestId,
                    auditLogged: response.data.auditLogged || false,
                    source: 'worker'
                }
            };
            
            // Update usage statistics
            this.usageStats.totalOperations++;
            this.usageStats.totalCreditsUsed += deductionResult.transaction.creditsDeducted;
            
            if (!this.usageStats.operationsByType[operation]) {
                this.usageStats.operationsByType[operation] = 0;
            }
            this.usageStats.operationsByType[operation]++;
            
            // Clear balance cache to force refresh
            this.clearBalanceCache();
            
            // Update balance alerts
            this.updateBalanceAlerts(deductionResult.balance.current);
            
            // Return updated balance and transaction ID
            console.log('✅ Credits deducted successfully:', {
                transactionId: deductionResult.transaction.id,
                creditsDeducted: deductionResult.transaction.creditsDeducted,
                newBalance: deductionResult.balance.current,
                operation: operation
            });
            
            return deductionResult;
            
        } catch (error) {
            console.error('❌ Credit deduction failed:', error);
            throw new Error(`Credit deduction failed: ${error.message}`);
        }
    }

    async getUsageHistory(timeframe = '30d') {
        // 🔐 Get credit usage analytics via Worker
        try {
            console.log('📊 Fetching credit usage history via Worker...', { 
                timeframe,
                useCache: true
            });
            
            // Check cache for recent usage data
            const cacheKey = this.generateUsageCacheKey(timeframe);
            const cached = this.getFromCache(this.usageCache, cacheKey, this.usageCacheTTL);
            if (cached) {
                console.log('📋 Returning cached usage history');
                return cached;
            }
            
            // Validate timeframe parameter
            const validTimeframes = ['1d', '7d', '30d', '90d', '1y', 'all'];
            if (!validTimeframes.includes(timeframe)) {
                throw new Error(`Invalid timeframe: ${timeframe}. Valid options: ${validTimeframes.join(', ')}`);
            }
            
            const session = window.OsliraApp?.session;
            if (!session?.access_token) {
                throw new Error('Authentication required for usage history');
            }
            
            const payload = {
                timeframe: timeframe,
                userId: window.OsliraApp?.user?.id,
                requestType: 'usage_history',
                requestId: this.generateRequestId(),
                includeBreakdown: true,
                includeTrends: true,
                includeProjections: true,
                groupBy: 'day' // day, week, month
            };
            
            // Make secure request
            const response = await this.makeSecureRequest(
                this.endpoints.usageHistory, 
                payload, 
                this.historyTimeout
            );
            
            if (!response.success) {
                throw new Error(response.error || 'Usage history retrieval failed');
            }
            
            // Fetch usage breakdown by operation type
            const result = {
                success: true,
                timeframe: timeframe,
                summary: {
                    totalCreditsUsed: response.data.summary?.totalCreditsUsed || 0,
                    totalOperations: response.data.summary?.totalOperations || 0,
                    averageDaily: response.data.summary?.averageDaily || 0,
                    peakDay: response.data.summary?.peakDay || null,
                    trend: response.data.summary?.trend || 'stable'
                },
                breakdown: {
                    byOperation: response.data.breakdown?.byOperation || {},
                    byDay: response.data.breakdown?.byDay || [],
                    byWeek: response.data.breakdown?.byWeek || [],
                    byMonth: response.data.breakdown?.byMonth || []
                },
                analytics: {
                    mostUsedOperation: response.data.analytics?.mostUsedOperation || null,
                    costEfficiency: response.data.analytics?.costEfficiency || 0,
                    usagePattern: response.data.analytics?.usagePattern || 'irregular',
                    optimizationSuggestions: response.data.analytics?.optimizationSuggestions || []
                },
                projections: {
                    nextMonth: response.data.projections?.nextMonth || 0,
                    endOfMonth: response.data.projections?.endOfMonth || 0,
                    recommendedTopUp: response.data.projections?.recommendedTopUp || 0
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    dataPoints: response.data.metadata?.dataPoints || 0,
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(this.usageCache, cacheKey, result, this.usageCacheTTL);
            
            // Include trend analysis and projections
            console.log('✅ Usage history retrieved successfully:', {
                timeframe: result.timeframe,
                totalCreditsUsed: result.summary.totalCreditsUsed,
                totalOperations: result.summary.totalOperations,
                trend: result.summary.trend,
                dataPoints: result.metadata.dataPoints
            });
            
            // Return formatted usage reports
            return result;
            
        } catch (error) {
            console.error('❌ Usage history retrieval failed:', error);
            throw new Error(`Usage history retrieval failed: ${error.message}`);
        }
    }

    async predictUsage(operation) {
        // 🔐 Predict credit consumption for planned operations
        try {
            console.log('🔮 Predicting credit usage via Worker...', { 
                operation: typeof operation === 'string' ? operation : 'bulk_operation',
                operationCount: Array.isArray(operation) ? operation.length : 1
            });
            
            // Rate limit check
            await this.enforceRateLimit('predictions');
            
            const session = window.OsliraApp?.session;
            if (!session?.access_token) {
                throw new Error('Authentication required for usage prediction');
            }
            
            // Normalize operation input
            let operations = [];
            if (typeof operation === 'string') {
                operations = [{ type: operation, count: 1 }];
            } else if (Array.isArray(operation)) {
                operations = operation.map(op => {
                    if (typeof op === 'string') {
                        return { type: op, count: 1 };
                    }
                    return { type: op.type || 'unknown', count: op.count || 1 };
                });
            } else if (typeof operation === 'object') {
                operations = [{ 
                    type: operation.type || 'unknown', 
                    count: operation.count || 1,
                    complexity: operation.complexity || 'standard'
                }];
            }
            
            const payload = {
                operations: operations,
                userId: window.OsliraApp?.user?.id,
                requestType: 'usage_prediction',
                requestId: this.generateRequestId(),
                context: {
                    currentBalance: null, // Will be fetched server-side
                    subscriptionPlan: null, // Will be fetched server-side
                    historicalUsage: true,
                    includeOptimizations: true
                }
            };
            
            // Make secure request
            const response = await this.makeSecureRequest(
                this.endpoints.predictUsage, 
                payload, 
                this.predictionTimeout
            );
            
            if (!response.success) {
                throw new Error(response.error || 'Usage prediction failed');
            }
            
            // Analyze operation requirements
            const result = {
                success: true,
                prediction: {
                    totalCredits: response.data.prediction?.totalCredits || 0,
                    breakdown: response.data.prediction?.breakdown || [],
                    confidence: response.data.prediction?.confidence || 0.8,
                    estimatedDuration: response.data.prediction?.estimatedDuration || 'unknown'
                },
                feasibility: {
                    currentBalance: response.data.feasibility?.currentBalance || 0,
                    sufficientCredits: response.data.feasibility?.sufficientCredits || false,
                    creditsNeeded: response.data.feasibility?.creditsNeeded || 0,
                    recommendedAction: response.data.feasibility?.recommendedAction || 'proceed'
                },
                optimization: {
                    suggestions: response.data.optimization?.suggestions || [],
                    potentialSavings: response.data.optimization?.potentialSavings || 0,
                    alternativeApproaches: response.data.optimization?.alternativeApproaches || []
                },
                risk: {
                    level: response.data.risk?.level || 'low',
                    factors: response.data.risk?.factors || [],
                    mitigation: response.data.risk?.mitigation || []
                },
                metadata: {
                    operationCount: operations.length,
                    generatedAt: new Date().toISOString(),
                    requestId: payload.requestId,
                    algorithmVersion: response.data.metadata?.algorithmVersion || 'v1.0'
                }
            };
            
            // Return cost estimates and recommendations
            console.log('✅ Usage prediction completed:', {
                totalCredits: result.prediction.totalCredits,
                confidence: result.prediction.confidence,
                sufficientCredits: result.feasibility.sufficientCredits,
                suggestionsCount: result.optimization.suggestions.length,
                riskLevel: result.risk.level
            });
            
            // Include optimization suggestions
            return result;
            
        } catch (error) {
            console.error('❌ Usage prediction failed:', error);
            throw new Error(`Usage prediction failed: ${error.message}`);
        }
    }

    async makeSecureRequest(endpoint, payload, timeout = null) {
        // Execute authenticated credit operation
        const requestId = payload.requestId || this.generateRequestId();
        const startTime = Date.now();
        const requestTimeout = timeout || this.timeout;
        
        try {
            console.log('🔐 Making secure credit request...', {
                endpoint,
                requestId,
                timeout: `${requestTimeout}ms`,
                payloadSize: JSON.stringify(payload).length
            });
            
            // Add session authentication
            const session = window.OsliraApp?.session;
            if (!session?.access_token) {
                throw new Error('No valid session token for credit operation');
            }
            
            // Determine target URL (primary/backup)
            const targetUrl = this.getCurrentEndpointUrl();
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'X-Request-ID': requestId,
                'X-Client-Version': 'v1.3.0',
                'X-Timestamp': new Date().toISOString(),
                'X-Credit-Operation': 'true',
                'X-Priority': 'high' // Credit operations are high priority
            };
            
            // Include request tracking
            if (window.OsliraApp?.user?.id) {
                headers['X-User-ID'] = window.OsliraApp.user.id;
            }
            
            // Make primary request attempt
            let response = await this.attemptCreditRequest(
                targetUrl + endpoint, 
                payload, 
                headers, 
                requestTimeout
            );
            
            // Handle credit-specific errors with retries
            let attempt = 1;
            while (!response.success && attempt <= this.retryAttempts) {
                console.warn(`⚠️ Credit request failed, attempt ${attempt}/${this.retryAttempts}:`, response.error);
                
                // Special handling for credit-specific errors
                if (response.error?.includes('insufficient') || 
                    response.error?.includes('exceeded') ||
                    response.statusCode === 402) {
                    // Don't retry payment/credit errors
                    break;
                }
                
                // Calculate retry delay
                const delay = Math.min(
                    this.retryDelay * Math.pow(2, attempt - 1),
                    this.maxRetryDelay
                );
                
                console.log(`⏳ Retrying credit request in ${delay}ms...`);
                await this.sleep(delay);
                
                // Try backup endpoint on later attempts
                if (attempt > 1 && this.failoverEnabled && this.backupUrl) {
                    console.log('🔄 Attempting credit failover to backup...');
                    const backupUrl = this.getBackupEndpointUrl();
                    response = await this.attemptCreditRequest(
                        backupUrl + endpoint, 
                        payload, 
                        headers, 
                        requestTimeout
                    );
                } else {
                    response = await this.attemptCreditRequest(
                        targetUrl + endpoint, 
                        payload, 
                        headers, 
                        requestTimeout
                    );
                }
                
                attempt++;
            }
            
            if (!response.success) {
                throw new Error(response.error || 'Credit operation failed after all retry attempts');
            }
            
            // Update success statistics
            const duration = Date.now() - startTime;
            this.updateCreditStats(duration, true);
            
            console.log('✅ Secure credit request completed:', {
                requestId,
                duration: `${duration}ms`,
                endpoint: endpoint.split('/').pop(),
                success: true
            });
            
            // Return formatted responses
            return response;
            
        } catch (error) {
            // Update error statistics
            const duration = Date.now() - startTime;
            this.updateCreditStats(duration, false);
            
            console.error('❌ Secure credit request failed:', {
                requestId,
                endpoint,
                error: error.message,
                duration: `${duration}ms`
            });
            
            throw error;
        }
    }

    async attemptCreditRequest(url, payload, headers, timeout) {
        // Single credit request attempt with timeout
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
            
            // Handle HTTP status codes
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                
                return {
                    success: false,
                    error: errorData.error || errorData.message || `Credit request failed with status ${response.status}`,
                    statusCode: response.status,
                    creditError: response.status === 402 || response.status === 429
                };
            }
            
            // Parse successful response
            const data = await response.json();
            
            return {
                success: true,
                data: data,
                statusCode: response.status
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: `Credit request timeout after ${timeout}ms`,
                    timeout: true
                };
            }
            
            return {
                success: false,
                error: error.message || 'Credit request network error',
                networkError: true
            };
        }
    }

    // Helper and utility methods
    generateRequestId() {
        return 'credit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateBalanceCacheKey(userId) {
        const targetUserId = userId || window.OsliraApp?.user?.id || 'unknown';
        return `balance_${targetUserId}`;
    }

    generateUsageCacheKey(timeframe) {
        const userId = window.OsliraApp?.user?.id || 'unknown';
        return `usage_${userId}_${timeframe}`;
    }

    getCurrentEndpointUrl() {
        return this.currentEndpoint === 'backup' && this.backupUrl ? this.backupUrl : this.baseUrl;
    }

    getBackupEndpointUrl() {
        return this.backupUrl || this.baseUrl;
    }

    async getClientIP() {
        // Get client IP for audit logging
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    generateBalanceAlerts(balance) {
        // Generate balance alerts based on thresholds
        return {
            critical: balance <= this.balanceThresholds.critical,
            warning: balance <= this.balanceThresholds.warning && balance > this.balanceThresholds.critical,
            low: balance <= this.balanceThresholds.low && balance > this.balanceThresholds.warning,
            sufficient: balance > this.balanceThresholds.low
        };
    }

    updateBalanceAlerts(balance) {
        // Update and trigger balance alerts
        const alerts = this.generateBalanceAlerts(balance);
        
        // Trigger alerts for new conditions
        Object.keys(alerts).forEach(alertType => {
            if (alerts[alertType] && !this.balanceAlerts[alertType]) {
                this.triggerBalanceAlert(alertType, balance);
            }
        });
        
        this.balanceAlerts = alerts;
    }

    triggerBalanceAlert(alertType, balance) {
        // Trigger balance alert notification
        const messages = {
            critical: `Critical: Only ${balance} credits remaining!`,
            warning: `Warning: ${balance} credits remaining`,
            low: `Notice: ${balance} credits remaining`
        };
        
        if (window.OsliraApp?.showMessage) {
            const messageType = alertType === 'critical' ? 'error' : 
                               alertType === 'warning' ? 'warning' : 'info';
            window.OsliraApp.showMessage(messages[alertType], messageType);
        }
        
        console.warn(`💳 Balance Alert [${alertType}]:`, messages[alertType]);
    }

    async enforceRateLimit(operationType) {
        // Enforce rate limiting for credit operations
        const config = this.rateLimitConfig[operationType];
        if (!config) return; // No rate limit configured
        
        const now = Date.now();
        const windowKey = `${operationType}_${Math.floor(now / config.window)}`;
        
        if (!this.rateLimitTracking.has(windowKey)) {
            this.rateLimitTracking.set(windowKey, { count: 0, firstRequest: now });
        }
        
        const windowData = this.rateLimitTracking.get(windowKey);
        windowData.count++;
        
        if (windowData.count > config.limit) {
            const waitTime = config.window - (now - windowData.firstRequest);
            if (waitTime > 0) {
                console.warn(`🚫 Rate limit exceeded for ${operationType}, waiting ${waitTime}ms`);
                await this.sleep(waitTime);
            }
        }
    }

    getFromCache(cache, key, ttl) {
        // Get item from cache with TTL validation
        const item = cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > ttl) {
            cache.delete(key);
            return null;
        }
        
        return item.data;
    }

    setCache(cache, key, data, ttl) {
        // Set item in cache with TTL and size management
        if (cache.size >= this.maxCacheSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        cache.set(key, {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        });
    }

    clearBalanceCache() {
        // Clear all balance cache entries
        this.balanceCache.clear();
        console.log('🗑️ Balance cache cleared');
    }

    clearUsageCache() {
        // Clear all usage cache entries
        this.usageCache.clear();
        console.log('🗑️ Usage cache cleared');
    }

    updateCreditStats(duration, success) {
        // Update credit operation statistics
        if (success) {
            this.usageStats.successRate = (this.usageStats.successRate + 1) / 2;
            this.usageStats.averageLatency = (this.usageStats.averageLatency + duration) / 2;
        } else {
            this.usageStats.successRate = this.usageStats.successRate * 0.9; // Decay on failure
        }
    }

    startCacheCleanup() {
        // Start background cache cleanup process
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 60000); // Every minute
    }

    cleanupExpiredCache() {
        // Clean up expired cache entries
        const now = Date.now();
        let removedCount = 0;
        
        // Clean balance cache
        for (const [key, item] of this.balanceCache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.balanceCache.delete(key);
                removedCount++;
            }
        }
        
        // Clean usage cache
        for (const [key, item] of this.usageCache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.usageCache.delete(key);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            console.log(`🧹 Cleaned ${removedCount} expired cache entries`);
        }
    }

    startRateLimitCleanup() {
        // Start background rate limit cleanup process
        setInterval(() => {
            this.cleanupExpiredRateLimits();
        }, 300000); // Every 5 minutes
    }

    cleanupExpiredRateLimits() {
        // Clean up expired rate limit tracking
        const now = Date.now();
        let removedCount = 0;
        
        for (const [key, data] of this.rateLimitTracking.entries()) {
            const maxWindow = Math.max(...Object.values(this.rateLimitConfig).map(c => c.window));
            if (now - data.firstRequest > maxWindow * 2) {
                this.rateLimitTracking.delete(key);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            console.log(`🧹 Cleaned ${removedCount} expired rate limit entries`);
        }
    }

    sleep(ms) {
        // Sleep utility for delays
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Advanced credit management methods
    async validateOperation(operation, metadata = {}) {
        // Validate if operation can be performed with current credits
        try {
            console.log('🔍 Validating credit operation...', { operation });
            
            const payload = {
                operation: operation,
                metadata: metadata,
                userId: window.OsliraApp?.user?.id,
                requestType: 'operation_validation',
                requestId: this.generateRequestId(),
                checkLimits: true,
                checkSubscriptionFeatures: true
            };
            
            const response = await this.makeSecureRequest(
                this.endpoints.validateOperation,
                payload,
                this.balanceCheckTimeout
            );
            
            if (!response.success) {
                throw new Error(response.error || 'Operation validation failed');
            }
            
            return {
                success: true,
                valid: response.data.valid || false,
                reason: response.data.reason || null,
                cost: response.data.cost || this.operationCosts[operation] || 0,
                balance: response.data.balance || 0,
                subscriptionAllows: response.data.subscriptionAllows || false,
                limitsExceeded: response.data.limitsExceeded || false,
                recommendations: response.data.recommendations || []
            };
            
        } catch (error) {
            console.error('❌ Operation validation failed:', error);
            throw new Error(`Operation validation failed: ${error.message}`);
        }
    }

    async addCredits(amount, source = 'manual', metadata = {}) {
        // Add credits to user account (admin/payment processing)
        try {
            console.log('➕ Adding credits via Worker...', { amount, source });
            
            if (amount <= 0) {
                throw new Error('Credit amount must be positive');
            }
            
            const payload = {
                amount: amount,
                source: source,
                metadata: {
                    timestamp: new Date().toISOString(),
                    adminUserId: window.OsliraApp?.user?.id,
                    reason: metadata.reason || 'Manual credit addition',
                    ...metadata
                },
                userId: metadata.targetUserId || window.OsliraApp?.user?.id,
                requestType: 'credit_addition',
                requestId: this.generateRequestId(),
                auditInfo: {
                    ipAddress: await this.getClientIP(),
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                }
            };
            
            const response = await this.makeSecureRequest(
                this.endpoints.addCredits,
                payload,
                this.deductionTimeout
            );
            
            if (!response.success) {
                throw new Error(response.error || 'Credit addition failed');
            }
            
            // Clear cache to force refresh
            this.clearBalanceCache();
            
            const result = {
                success: true,
                transaction: {
                    id: response.data.transactionId,
                    amount: response.data.creditsAdded || amount,
                    source: source,
                    timestamp: response.data.timestamp || new Date().toISOString()
                },
                balance: {
                    previous: response.data.balanceBefore || 0,
                    current: response.data.balanceAfter || 0,
                    added: response.data.creditsAdded || amount
                },
                metadata: {
                    requestId: payload.requestId,
                    auditLogged: response.data.auditLogged || false
                }
            };
            
            console.log('✅ Credits added successfully:', {
                transactionId: result.transaction.id,
                creditsAdded: result.balance.added,
                newBalance: result.balance.current
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ Credit addition failed:', error);
            throw new Error(`Credit addition failed: ${error.message}`);
        }
    }

    async getUserLimits(userId = null) {
        // Get user subscription limits and features
        try {
            console.log('📋 Fetching user limits via Worker...', { userId });
            
            const payload = {
                userId: userId || window.OsliraApp?.user?.id,
                requestType: 'get_limits',
                requestId: this.generateRequestId(),
                includeFeatures: true,
                includeUsage: true
            };
            
            const response = await this.makeSecureRequest(
                this.endpoints.getUserLimits,
                payload,
                this.balanceCheckTimeout
            );
            
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch user limits');
            }
            
            return {
                success: true,
                subscription: {
                    plan: response.data.subscription?.plan || 'free',
                    status: response.data.subscription?.status || 'unknown',
                    features: response.data.subscription?.features || []
                },
                limits: {
                    monthly: response.data.limits?.monthly || 0,
                    daily: response.data.limits?.daily || 0,
                    concurrent: response.data.limits?.concurrent || 1
                },
                usage: {
                    currentMonth: response.data.usage?.currentMonth || 0,
                    currentDay: response.data.usage?.currentDay || 0,
                    remaining: {
                        monthly: response.data.usage?.remainingMonthly || 0,
                        daily: response.data.usage?.remainingDaily || 0
                    }
                },
                features: {
                    available: response.data.features?.available || [],
                    restricted: response.data.features?.restricted || []
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to fetch user limits:', error);
            throw new Error(`Failed to fetch user limits: ${error.message}`);
        }
    }

    // Analytics and monitoring methods
    getUsageStats() {
        // Get local usage statistics
        return {
            ...this.usageStats,
            cacheStats: {
                balanceCacheSize: this.balanceCache.size,
                usageCacheSize: this.usageCache.size,
                cacheHitRate: this.usageStats.cacheHits / (this.usageStats.cacheHits + this.usageStats.cacheMisses) || 0
            },
            rateLimitStats: {
                activeWindows: this.rateLimitTracking.size,
                rateLimitConfig: this.rateLimitConfig
            }
        };
    }

    getBalanceAlerts() {
        // Get current balance alert status
        return {
            ...this.balanceAlerts,
            thresholds: this.balanceThresholds,
            hasActiveAlerts: Object.values(this.balanceAlerts).some(alert => alert)
        };
    }

    async refreshAllData() {
        // Refresh all cached credit data
        try {
            console.log('🔄 Refreshing all credit data...');
            
            // Clear all caches
            this.clearBalanceCache();
            this.clearUsageCache();
            
            // Fetch fresh data
            const [balance, usage, limits] = await Promise.allSettled([
                this.checkBalance(),
                this.getUsageHistory('30d'),
                this.getUserLimits()
            ]);
            
            const results = {
                balance: balance.status === 'fulfilled' ? balance.value : null,
                usage: usage.status === 'fulfilled' ? usage.value : null,
                limits: limits.status === 'fulfilled' ? limits.value : null,
                errors: []
            };
            
            // Collect any errors
            if (balance.status === 'rejected') results.errors.push(`Balance: ${balance.reason}`);
            if (usage.status === 'rejected') results.errors.push(`Usage: ${usage.reason}`);
            if (limits.status === 'rejected') results.errors.push(`Limits: ${limits.reason}`);
            
            console.log('✅ Credit data refresh completed:', {
                balance: results.balance?.balance || 'failed',
                usage: results.usage?.summary?.totalCreditsUsed || 'failed',
                limits: results.limits?.subscription?.plan || 'failed',
                errors: results.errors.length
            });
            
            return results;
            
        } catch (error) {
            console.error('❌ Credit data refresh failed:', error);
            throw new Error(`Credit data refresh failed: ${error.message}`);
        }
    }

    // Emergency and fallback methods
    async emergencyBalanceCheck() {
        // Emergency balance check with minimal caching
        try {
            console.log('🚨 Emergency balance check...');
            
            // Bypass cache and rate limits for emergency check
            const payload = {
                userId: window.OsliraApp?.user?.id,
                requestType: 'emergency_balance_check',
                requestId: this.generateRequestId(),
                emergency: true,
                bypassCache: true
            };
            
            const response = await this.attemptCreditRequest(
                this.getCurrentEndpointUrl() + this.endpoints.checkBalance,
                payload,
                {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.OsliraApp?.session?.access_token}`,
                    'X-Request-ID': payload.requestId,
                    'X-Emergency': 'true'
                },
                10000 // 10 second timeout
            );
            
            if (!response.success) {
                throw new Error(response.error || 'Emergency balance check failed');
            }
            
            return {
                balance: response.data.balance || 0,
                status: response.data.status || 'unknown',
                emergency: true,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Emergency balance check failed:', error);
            // Return fallback data
            return {
                balance: 0,
                status: 'error',
                emergency: true,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    destroy() {
        // Clean up credit service resources
        try {
            console.log('🗑️ Destroying SecureCreditService...');
            
            // Clear all caches
            this.balanceCache.clear();
            this.usageCache.clear();
            this.rateLimitTracking.clear();
            
            // Reset usage stats
            this.usageStats = {
                totalOperations: 0,
                totalCreditsUsed: 0,
                operationsByType: {},
                successRate: 0,
                averageLatency: 0,
                insufficientCreditCount: 0,
                lastBalanceCheck: null,
                cacheMisses: 0,
                cacheHits: 0
            };
            
            // Reset balance alerts
            this.balanceAlerts = {
                critical: false,
                warning: false,
                low: false
            };
            
            console.log('✅ SecureCreditService destroyed successfully');
            
        } catch (error) {
            console.error('❌ Error destroying SecureCreditService:', error);
        }
    }

    // Development and testing methods
    enableTestMode(testResponses = {}) {
        // Enable test mode with stubbed responses
        console.log('🧪 Enabling SecureCreditService test mode');
        this.testingMode = true;
        this.testStubResponses = new Map(Object.entries(testResponses));
    }

    disableTestMode() {
        // Disable test mode
        console.log('✅ Disabling SecureCreditService test mode');
        this.testingMode = false;
        this.testStubResponses.clear();
    }

    // Test mode simulation methods
    simulateBalanceCheck(balance = 50) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    success: true,
                    balance: balance,
                    subscription: { plan: 'free', status: 'active' },
                    limits: { monthly: 100, daily: 10 },
                    usage: { currentMonth: 50, currentDay: 5 },
                    alerts: this.generateBalanceAlerts(balance),
                    metadata: { source: 'test', cached: false }
                });
            }, this.testResponseDelay);
        });
    }

    simulateCreditDeduction(operation, cost = 2) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    success: true,
                    transaction: {
                        id: 'test_txn_' + Date.now(),
                        operation: operation,
                        creditsDeducted: cost,
                        timestamp: new Date().toISOString(),
                        balanceBefore: 50,
                        balanceAfter: 50 - cost
                    },
                    balance: { current: 50 - cost, previous: 50 },
                    alerts: this.generateBalanceAlerts(50 - cost),
                    metadata: { source: 'test' }
                });
            }, this.testResponseDelay);
        });
    }

    simulateUsageHistory(timeframe = '30d') {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    success: true,
                    timeframe: timeframe,
                    summary: { totalCreditsUsed: 45, totalOperations: 23, trend: 'stable' },
                    breakdown: { byOperation: { light_analysis: 20, deep_analysis: 25 } },
                    analytics: { mostUsedOperation: 'deep_analysis', costEfficiency: 0.85 },
                    projections: { nextMonth: 50, endOfMonth: 48 },
                    metadata: { source: 'test', dataPoints: 30 }
                });
            }, this.testResponseDelay);
        });
    }

    simulateUsagePrediction(operations) {
        return new Promise(resolve => {
            setTimeout(() => {
                const totalCredits = Array.isArray(operations) ? operations.length * 2 : 2;
                resolve({
                    success: true,
                    prediction: { totalCredits: totalCredits, confidence: 0.9 },
                    feasibility: { currentBalance: 50, sufficientCredits: totalCredits <= 50 },
                    optimization: { suggestions: ['Use bulk operations for better efficiency'] },
                    risk: { level: 'low', factors: [] },
                    metadata: { source: 'test', algorithmVersion: 'test-v1.0' }
                });
            }, this.testResponseDelay);
        });
    }
}
export { SecureCreditService };

