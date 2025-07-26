class SecureClaudeService {
    constructor() {
        // Initialize secure Claude HTTP client
        this.baseUrl = window.OsliraApp?.config?.workerUrl;
        this.backupUrl = window.OsliraApp?.config?.backupWorkerUrl || null;
        this.currentEndpoint = 'primary';
        
        // Configure timeout and retry settings
        this.timeout = 45000;
        this.retryAttempts = 3;
        this.retryDelay = 2000;
        this.maxRetryDelay = 30000;
        this.jitterFactor = 0.3;
        this.adaptiveTimeoutMultiplier = 1.5;
        this.failoverAttempts = 2;
        this.failoverEnabled = true;
        
        // Setup request queue for deduplication
        this.priorityQueue = {
            high: [],
            medium: [],
            low: []
        };
        this.isProcessingQueue = false;
        this.maxConcurrentRequests = 5;
        this.activeRequests = 0;
        this.requestQueue = new Map();
        this.pendingRequests = new Set();
        this.resultCache = new Map();
        this.cacheTTL = 300000; // 5 minutes default
        this.maxCacheSize = 100;
        
        // Rate limiting configuration
        this.rateLimitRequests = 60;
        this.requestInterval = 1000;
        this.lastRequestTime = 0;
        
        // Testing mode configuration
        this.testingMode = false;
        this.testResponseDelay = 2000;
        this.testStubResponses = new Map();
        
        // Cost estimation and analytics
        this.costEstimation = true;
        this.analyticsLogging = true;
        this.usageStats = {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            averageLatency: 0,
            errorRate: 0,
            requestsByType: {},
            cacheHitRate: 0
        };
        
        // Analytics logging hook
        this.analyticsHook = window.OsliraApp?.config?.analyticsHook || null;
        this.supabaseLogging = window.OsliraApp?.config?.enableSupabaseAnalytics || false;
        
        // Token cost configuration (Claude API pricing)
        this.tokenCosts = {
            input: 0.008 / 1000,   // $0.008 per 1K input tokens
            output: 0.024 / 1000   // $0.024 per 1K output tokens
        };
        
        // Request type token split estimates
        this.tokenSplits = {
            risk_analysis: { input: 0.7, output: 0.3 },
            insight_generation: { input: 0.6, output: 0.4 },
            feedback_classification: { input: 0.8, output: 0.2 },
            optimization_suggestions: { input: 0.5, output: 0.5 },
            experiment_suggestions: { input: 0.6, output: 0.4 },
            standard: { input: 0.7, output: 0.3 }
        };
        
        if (!this.baseUrl) {
            console.warn('SecureClaudeService: Worker URL not configured, using fallback');
            this.baseUrl = 'https://oslira-worker.example.workers.dev';
        }
        
        // Initialize background processes
        this.startCacheCleanup();
        this.startQueueProcessor();
        
        console.log('🔐 Enhanced SecureClaudeService initialized:', {
            baseUrl: this.baseUrl,
            backupUrl: this.backupUrl,
            testingMode: this.testingMode,
            analyticsLogging: this.analyticsLogging,
            failoverEnabled: this.failoverEnabled,
            maxConcurrentRequests: this.maxConcurrentRequests,
            cacheTTL: `${this.cacheTTL/1000}s`
        });
    }

    async analyzeMessageRisk(messages, options = {}) {
        // 🔐 Send message risk analysis to Worker
        try {
            console.log('🔍 Analyzing message risk via Worker...', { 
                messageCount: Array.isArray(messages) ? messages.length : 1,
                testMode: options.test || this.testingMode 
            });
            
            // Check for testing mode
            if (options.test === true || this.testingMode) {
                return this.simulateRiskAnalysis(messages, options);
            }
            
            // Sanitize message data before transport
            const sanitizedMessages = this.sanitizeForTransport(messages);
            
            // Include analysis options and preferences
            const payload = {
                messages: sanitizedMessages,
                options: {
                    analysisDepth: options.analysisDepth || 'standard',
                    includeRecommendations: options.includeRecommendations !== false,
                    riskThreshold: options.riskThreshold || 'medium',
                    businessContext: options.businessContext || null,
                    promptVersion: options.promptVersion || 'v2.1',
                    ...options
                },
                requestType: 'risk_analysis',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                priority: options.priority || 'medium',
                useCache: options.useCache !== false,
                cacheTTL: options.cacheTTL || this.cacheTTL
            };
            
            // Check cache first if enabled
            if (payload.useCache) {
                const cached = this.getCachedResult(payload);
                if (cached) {
                    console.log('📋 Returning cached risk analysis result');
                    this.logAnalytics('risk_analysis', { cacheHit: true });
                    return cached;
                }
            }
            
            // Queue request with priority
            const response = await this.queueSecureRequest('/ai/risk-analysis', payload, payload.priority);
            
            // Validate and structure response
            if (!response.success) {
                throw new Error(response.error || 'Risk analysis failed');
            }
            
            // Estimate cost and tokens
            const tokensUsed = response.data?.metadata?.tokensUsed || this.estimateTokenUsage(sanitizedMessages, 'risk_analysis');
            const costEstimate = this.estimateClaudeCost(tokensUsed, 'risk_analysis');
            
            // Return structured risk assessment from Claude
            const result = {
                success: true,
                results: response.data.results || [],
                summary: response.data.summary || {},
                recommendations: response.data.recommendations || [],
                metadata: {
                    analysisTime: response.data.metadata?.analysisTime || 0,
                    promptVersion: response.data.metadata?.promptVersion || 'v2.1',
                    confidence: response.data.metadata?.confidence || 0,
                    tokensUsed: tokensUsed,
                    estimatedCost: costEstimate.cost,
                    costBreakdown: costEstimate.breakdown,
                    endpoint: this.currentEndpoint,
                    cached: false
                }
            };
            
            // Cache result if successful
            if (payload.useCache) {
                this.cacheResult(payload, result, payload.cacheTTL);
            }
            
            // Log analytics
            this.logAnalytics('risk_analysis', {
                messagesAnalyzed: result.results.length,
                tokensUsed: result.metadata.tokensUsed,
                cost: result.metadata.estimatedCost,
                duration: result.metadata.analysisTime,
                endpoint: result.metadata.endpoint
            });
            
            console.log('✅ Message risk analysis completed:', { 
                messagesAnalyzed: result.results.length,
                averageRiskScore: result.summary.averageRiskScore || 0,
                tokensUsed: result.metadata.tokensUsed,
                estimatedCost: `$${result.metadata.estimatedCost}`,
                endpoint: result.metadata.endpoint
            });
            
            return result;
            
        } catch (error) {
            this.logAnalytics('risk_analysis', { error: error.message }, false);
            console.error('❌ Message risk analysis failed:', error);
            throw new Error(`Risk analysis failed: ${error.message}`);
        }
    }

    async generateInsights(analyticsData, context = {}) {
        // 🔐 Generate strategic insights via Worker
        try {
            console.log('🧠 Generating strategic insights via Worker...', { 
                dataPoints: Object.keys(analyticsData).length,
                timeframe: context.timeframe || 'unknown',
                testMode: context.test || this.testingMode
            });
            
            // Check for testing mode
            if (context.test === true || this.testingMode) {
                return this.simulateInsightGeneration(analyticsData, context);
            }
            
            // Send analytics data to Worker for Claude processing
            const sanitizedData = this.sanitizeForTransport(analyticsData);
            
            // Include context like timeframe, focus areas
            const enrichedContext = {
                timeframe: context.timeframe || '30d',
                focusAreas: context.focusAreas || ['performance', 'optimization'],
                businessGoals: context.businessGoals || [],
                constraints: context.constraints || {},
                analysisType: context.analysisType || 'comprehensive',
                includeActionables: context.includeActionables !== false,
                priorityLevel: context.priorityLevel || 'high',
                ...context
            };
            
            const payload = {
                analyticsData: sanitizedData,
                context: enrichedContext,
                requestType: 'insight_generation',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                priority: context.priority || 'high',
                useCache: context.useCache !== false,
                cacheTTL: context.cacheTTL || this.cacheTTL
            };
            
            // Check cache first
            if (payload.useCache) {
                const cached = this.getCachedResult(payload);
                if (cached) {
                    console.log('📋 Returning cached insights result');
                    this.logAnalytics('insight_generation', { cacheHit: true });
                    return cached;
                }
            }
            
            // Queue request with priority
            const response = await this.queueSecureRequest('/ai/generate-insights', payload, payload.priority);
            
            // Validate and structure response
            if (!response.success) {
                throw new Error(response.error || 'Insight generation failed');
            }
            
            // Estimate cost and tokens
            const tokensUsed = response.data?.metadata?.tokensUsed || this.estimateTokenUsage(sanitizedData, 'insight_generation');
            const costEstimate = this.estimateClaudeCost(tokensUsed, 'insight_generation');
            
            // Return actionable insights and recommendations
            const result = {
                success: true,
                insights: response.data.insights || [],
                recommendations: response.data.recommendations || [],
                keyFindings: response.data.keyFindings || [],
                actionableItems: response.data.actionableItems || [],
                trends: response.data.trends || {},
                metadata: {
                    analysisTime: response.data.metadata?.analysisTime || 0,
                    confidence: response.data.metadata?.confidence || 0,
                    dataQuality: response.data.metadata?.dataQuality || 'unknown',
                    promptVersion: response.data.metadata?.promptVersion || 'v2.1',
                    tokensUsed: tokensUsed,
                    estimatedCost: costEstimate.cost,
                    costBreakdown: costEstimate.breakdown,
                    endpoint: this.currentEndpoint,
                    cached: false
                }
            };
            
            // Cache result if successful
            if (payload.useCache) {
                this.cacheResult(payload, result, payload.cacheTTL);
            }
            
            // Log analytics
            this.logAnalytics('insight_generation', {
                insightCount: result.insights.length,
                recommendationCount: result.recommendations.length,
                tokensUsed: result.metadata.tokensUsed,
                cost: result.metadata.estimatedCost,
                duration: result.metadata.analysisTime,
                confidence: result.metadata.confidence,
                endpoint: result.metadata.endpoint
            });
            
            console.log('✅ Strategic insights generated:', {
                insightCount: result.insights.length,
                recommendationCount: result.recommendations.length,
                confidence: result.metadata.confidence,
                tokensUsed: result.metadata.tokensUsed,
                estimatedCost: `$${result.metadata.estimatedCost}`,
                endpoint: result.metadata.endpoint
            });
            
            return result;
            
        } catch (error) {
            this.logAnalytics('insight_generation', { error: error.message }, false);
            console.error('❌ Strategic insight generation failed:', error);
            throw new Error(`Insight generation failed: ${error.message}`);
        }
    }

    async classifyFeedback(feedbackData, options = {}) {
        // 🔐 Classify feedback sentiment and themes via Worker
        try {
            console.log('💬 Classifying feedback via Worker...', { 
                feedbackCount: Array.isArray(feedbackData) ? feedbackData.length : 1,
                testMode: options.test || this.testingMode
            });
            
            // Check for testing mode
            if (options.test === true || this.testingMode) {
                return this.simulateFeedbackClassification(feedbackData, options);
            }
            
            // Send feedback text to Worker for Claude analysis
            const sanitizedFeedback = this.sanitizeForTransport(feedbackData);
            
            // Extract themes, sentiment, and priority issues
            const classificationOptions = {
                includeSentiment: options.includeSentiment !== false,
                includeThemes: options.includeThemes !== false,
                includePriority: options.includePriority !== false,
                includeActionability: options.includeActionability !== false,
                sentimentGranularity: options.sentimentGranularity || 'detailed',
                themeDepth: options.themeDepth || 'comprehensive',
                languageDetection: options.languageDetection !== false,
                customCategories: options.customCategories || [],
                confidenceThreshold: options.confidenceThreshold || 0.7,
                ...options
            };
            
            const payload = {
                feedbackData: sanitizedFeedback,
                options: classificationOptions,
                requestType: 'feedback_classification',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                priority: options.priority || 'medium',
                useCache: options.useCache !== false,
                cacheTTL: options.cacheTTL || this.cacheTTL
            };
            
            // Check cache first
            if (payload.useCache) {
                const cached = this.getCachedResult(payload);
                if (cached) {
                    console.log('📋 Returning cached feedback classification result');
                    this.logAnalytics('feedback_classification', { cacheHit: true });
                    return cached;
                }
            }
            
            // Queue request with priority
            const response = await this.queueSecureRequest('/ai/classify-feedback', payload, payload.priority);
            
            // Validate and structure response
            if (!response.success) {
                throw new Error(response.error || 'Feedback classification failed');
            }
            
            // Estimate cost and tokens
            const tokensUsed = response.data?.metadata?.tokensUsed || this.estimateTokenUsage(sanitizedFeedback, 'feedback_classification');
            const costEstimate = this.estimateClaudeCost(tokensUsed, 'feedback_classification');
            
            // Return structured classification results
            const result = {
                success: true,
                results: response.data.results || [],
                sentimentSummary: response.data.sentimentSummary || {},
                themeAnalysis: response.data.themeAnalysis || {},
                priorityIssues: response.data.priorityIssues || [],
                actionableInsights: response.data.actionableInsights || [],
                trends: response.data.trends || {},
                metadata: {
                    processingTime: response.data.metadata?.processingTime || 0,
                    confidence: response.data.metadata?.confidence || 0,
                    languagesDetected: response.data.metadata?.languagesDetected || [],
                    promptVersion: response.data.metadata?.promptVersion || 'v2.1',
                    tokensUsed: tokensUsed,
                    estimatedCost: costEstimate.cost,
                    costBreakdown: costEstimate.breakdown,
                    endpoint: this.currentEndpoint,
                    cached: false
                }
            };
            
            // Cache result if successful
            if (payload.useCache) {
                this.cacheResult(payload, result, payload.cacheTTL);
            }
            
            // Log analytics
            this.logAnalytics('feedback_classification', {
                feedbackProcessed: result.results.length,
                uniqueThemes: result.themeAnalysis.uniqueThemes || 0,
                overallSentiment: result.sentimentSummary.overall || 'unknown',
                tokensUsed: result.metadata.tokensUsed,
                cost: result.metadata.estimatedCost,
                duration: result.metadata.processingTime,
                endpoint: result.metadata.endpoint
            });
            
            console.log('✅ Feedback classification completed:', {
                feedbackProcessed: result.results.length,
                uniqueThemes: result.themeAnalysis.uniqueThemes || 0,
                overallSentiment: result.sentimentSummary.overall || 'unknown',
                tokensUsed: result.metadata.tokensUsed,
                estimatedCost: `$${result.metadata.estimatedCost}`,
                endpoint: result.metadata.endpoint
            });
            
            return result;
            
        } catch (error) {
            this.logAnalytics('feedback_classification', { error: error.message }, false);
            console.error('❌ Feedback classification failed:', error);
            throw new Error(`Feedback classification failed: ${error.message}`);
        }
    }

    async suggestOptimizations(performanceData, constraints = {}) {
        // 🔐 Get optimization suggestions via Worker
        try {
            console.log('⚡ Generating optimization suggestions via Worker...', {
                metricsCount: Object.keys(performanceData).length,
                constraintCount: Object.keys(constraints).length,
                testMode: constraints.test || this.testingMode
            });
            
            // Check for testing mode
            if (constraints.test === true || this.testingMode) {
                return this.simulateOptimizationSuggestions(performanceData, constraints);
            }
            
            // Send performance metrics to Worker
            const sanitizedData = this.sanitizeForTransport(performanceData);
            
            // Include constraints like budget, timeframe, risk tolerance
            const optimizationConstraints = {
                budget: constraints.budget || null,
                timeframe: constraints.timeframe || '30d',
                riskTolerance: constraints.riskTolerance || 'medium',
                resourceAvailability: constraints.resourceAvailability || 'standard',
                priorityMetrics: constraints.priorityMetrics || ['response_rate', 'conversion_rate'],
                excludeStrategies: constraints.excludeStrategies || [],
                minImpactThreshold: constraints.minImpactThreshold || 0.05,
                implementationComplexity: constraints.implementationComplexity || 'any',
                ...constraints
            };
            
            const payload = {
                performanceData: sanitizedData,
                constraints: optimizationConstraints,
                requestType: 'optimization_suggestions',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                priority: constraints.priority || 'high',
                useCache: constraints.useCache !== false,
                cacheTTL: constraints.cacheTTL || this.cacheTTL
            };
            
            // Check cache first
            if (payload.useCache) {
                const cached = this.getCachedResult(payload);
                if (cached) {
                    console.log('📋 Returning cached optimization suggestions result');
                    this.logAnalytics('optimization_suggestions', { cacheHit: true });
                    return cached;
                }
            }
            
            // Queue request with priority
            const response = await this.queueSecureRequest('/ai/suggest-optimizations', payload, payload.priority);
            
            // Validate and structure response
            if (!response.success) {
                throw new Error(response.error || 'Optimization suggestion failed');
            }
            
            // Estimate cost and tokens
            const tokensUsed = response.data?.metadata?.tokensUsed || this.estimateTokenUsage(sanitizedData, 'optimization_suggestions');
            const costEstimate = this.estimateClaudeCost(tokensUsed, 'optimization_suggestions');
            
            // Return prioritized optimization recommendations
            const result = {
                success: true,
                suggestions: response.data.suggestions || [],
                prioritizedRecommendations: response.data.prioritizedRecommendations || [],
                quickWins: response.data.quickWins || [],
                longTermStrategies: response.data.longTermStrategies || [],
                riskAssessment: response.data.riskAssessment || {},
                implementation: response.data.implementation || {},
                summary: response.data.summary || {},
                metadata: {
                    analysisTime: response.data.metadata?.analysisTime || 0,
                    confidence: response.data.metadata?.confidence || 0,
                    strategiesEvaluated: response.data.metadata?.strategiesEvaluated || 0,
                    promptVersion: response.data.metadata?.promptVersion || 'v2.1',
                    tokensUsed: tokensUsed,
                    estimatedCost: costEstimate.cost,
                    costBreakdown: costEstimate.breakdown,
                    endpoint: this.currentEndpoint,
                    cached: false
                }
            };
            
            // Cache result if successful
            if (payload.useCache) {
                this.cacheResult(payload, result, payload.cacheTTL);
            }
            
            // Log analytics
            this.logAnalytics('optimization_suggestions', {
                suggestionCount: result.suggestions.length,
                highImpactCount: result.suggestions.filter(s => s.impact === 'high').length || 0,
                estimatedImpact: result.summary.estimatedOverallImpact || 0,
                tokensUsed: result.metadata.tokensUsed,
                cost: result.metadata.estimatedCost,
                duration: result.metadata.analysisTime,
                endpoint: result.metadata.endpoint
            });
            
            console.log('✅ Optimization suggestions generated:', {
                suggestionCount: result.suggestions.length,
                highImpactCount: result.suggestions.filter(s => s.impact === 'high').length || 0,
                estimatedImpact: result.summary.estimatedOverallImpact || 0,
                tokensUsed: result.metadata.tokensUsed,
                estimatedCost: `$${result.metadata.estimatedCost}`,
                endpoint: result.metadata.endpoint
            });
            
            return result;
            
        } catch (error) {
            this.logAnalytics('optimization_suggestions', { error: error.message }, false);
            console.error('❌ Optimization suggestion failed:', error);
            throw new Error(`Optimization suggestion failed: ${error.message}`);
        }
    }

    async suggestExperiments(data, experimentType = 'ab_test', options = {}) {
        // 🔐 Get A/B test suggestions via Worker
        try {
            console.log('🧪 Generating experiment suggestions via Worker...', {
                experimentType,
                dataSize: Object.keys(data).length,
                testMode: options.test || this.testingMode
            });
            
            // Check for testing mode
            if (options.test === true || this.testingMode) {
                return this.simulateExperimentSuggestions(data, experimentType, options);
            }
            
            // Send historical data to Worker for analysis
            const sanitizedData = this.sanitizeForTransport(data);
            
            // Validate experiment type
            const validExperimentTypes = ['ab_test', 'multivariate', 'sequential', 'cohort', 'split_url'];
            if (!validExperimentTypes.includes(experimentType)) {
                throw new Error(`Invalid experiment type: ${experimentType}`);
            }
            
            // Specify experiment type and parameters
            const payload = {
                historicalData: sanitizedData,
                experimentType: experimentType,
                parameters: {
                    minSampleSize: options.minSampleSize || 100,
                    confidenceLevel: options.confidenceLevel || 0.95,
                    minimumDetectableEffect: options.minimumDetectableEffect || 0.05,
                    maxTestDuration: options.maxTestDuration || '30d',
                    simultaneousTests: options.simultaneousTests || 3,
                    riskTolerance: options.riskTolerance || 'medium',
                    ...options
                },
                requestType: 'experiment_suggestions',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                priority: options.priority || 'medium',
                useCache: options.useCache !== false,
                cacheTTL: options.cacheTTL || this.cacheTTL
            };
            
            // Check cache first
            if (payload.useCache) {
                const cached = this.getCachedResult(payload);
                if (cached) {
                    console.log('📋 Returning cached experiment suggestions result');
                    this.logAnalytics('experiment_suggestions', { cacheHit: true });
                    return cached;
                }
            }
            
            // Queue request with priority
            const response = await this.queueSecureRequest('/ai/suggest-experiments', payload, payload.priority);
            
            // Validate and structure response
            if (!response.success) {
                throw new Error(response.error || 'Experiment suggestion failed');
            }
            
            // Estimate cost and tokens
            const tokensUsed = response.data?.metadata?.tokensUsed || this.estimateTokenUsage(sanitizedData, 'experiment_suggestions');
            const costEstimate = this.estimateClaudeCost(tokensUsed, 'experiment_suggestions');
            
            // Return suggested experiments with confidence scores
            const result = {
                success: true,
                experiments: response.data.experiments || [],
                recommendedPriority: response.data.recommendedPriority || [],
                riskAssessment: response.data.riskAssessment || {},
                sampleSizeCalculations: response.data.sampleSizeCalculations || {},
                timeline: response.data.timeline || {},
                summary: response.data.summary || {},
                metadata: {
                    analysisTime: response.data.metadata?.analysisTime || 0,
                    confidence: response.data.metadata?.confidence || 0,
                    strategiesEvaluated: response.data.metadata?.strategiesEvaluated || 0,
                    promptVersion: response.data.metadata?.promptVersion || 'v2.1',
                    tokensUsed: tokensUsed,
                    estimatedCost: costEstimate.cost,
                    costBreakdown: costEstimate.breakdown,
                    endpoint: this.currentEndpoint,
                    cached: false
                }
            };
            
            // Cache result if successful
            if (payload.useCache) {
                this.cacheResult(payload, result, payload.cacheTTL);
            }
            
            // Log analytics
            this.logAnalytics('experiment_suggestions', {
                experimentCount: result.experiments.length,
                experimentType: experimentType,
                estimatedDuration: result.summary.averageDuration || 'unknown',
                highConfidenceCount: result.experiments.filter(e => e.confidence > 0.8).length || 0,
                tokensUsed: result.metadata.tokensUsed,
                cost: result.metadata.estimatedCost,
                duration: result.metadata.analysisTime,
                endpoint: result.metadata.endpoint
            });
            
            console.log('✅ Experiment suggestions generated:', {
                experimentCount: result.experiments.length,
                experimentType: experimentType,
                estimatedDuration: result.summary.averageDuration || 'unknown',
                highConfidenceCount: result.experiments.filter(e => e.confidence > 0.8).length || 0,
                tokensUsed: result.metadata.tokensUsed,
                estimatedCost: `$${result.metadata.estimatedCost}`,
                endpoint: result.metadata.endpoint
            });
            
            return result;
            
        } catch (error) {
            this.logAnalytics('experiment_suggestions', { error: error.message }, false);
            console.error('❌ Experiment suggestion failed:', error);
            throw new Error(`Experiment suggestion failed: ${error.message}`);
        }
    }

async makeSecureRequest(endpoint, payload) {
        // Make authenticated request to Worker endpoint
        const requestId = payload.requestId || this.generateRequestId();
        const startTime = Date.now();
        
        try {
            // Prevent duplicate requests with queue management
            const requestKey = this.generateRequestKey(endpoint, payload);
            if (this.pendingRequests.has(requestKey)) {
                console.log('🔄 Deduplicating identical request:', requestKey);
                throw new Error('Identical request already in progress');
            }
            
            // Check cache for identical request
            if (payload.useCache !== false) {
                const cached = this.getCachedResult(payload);
                if (cached) {
                    console.log('📋 Returning cached result for request');
                    this.updateUsageStats(Date.now() - startTime, { data: cached }, true, true);
                    return { success: true, data: cached, fromCache: true };
                }
            }
            
            // Rate limiting check
            await this.enforceRateLimit();
            
            // Mark request as pending
            this.pendingRequests.add(requestKey);
            this.activeRequests++;
            
            // Get session token for authentication
            const session = window.OsliraApp?.session;
            if (!session?.access_token) {
                throw new Error('No valid session token available');
            }
            
            // Determine which endpoint to use (primary/backup)
            let targetUrl = this.getCurrentEndpointUrl();
            
            // Add Authorization: Bearer header with session token
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'X-Request-ID': requestId,
                'X-Client-Version': 'v1.3.0',
                'X-Timestamp': new Date().toISOString(),
                'X-Priority': payload.priority || 'medium'
            };
            
            // Include request ID for tracking
            if (window.OsliraApp?.user?.id) {
                headers['X-User-ID'] = window.OsliraApp.user.id;
            }
            
            console.log('🚀 Making secure request to Worker:', {
                endpoint,
                requestId,
                payloadSize: JSON.stringify(payload).length,
                workerEndpoint: this.currentEndpoint,
                targetUrl: targetUrl + endpoint
            });
            
            // Make primary request attempt
            let response = await this.attemptRequest(targetUrl + endpoint, payload, headers);
            
            // Handle retries and error responses with exponential backoff
            let attempt = 1;
            while (!response.success && attempt <= this.retryAttempts) {
                console.warn(`⚠️ Request failed, attempt ${attempt}/${this.retryAttempts}:`, response.error);
                
                // Calculate retry delay with jitter
                const baseDelay = this.retryDelay * Math.pow(2, attempt - 1);
                const jitter = baseDelay * this.jitterFactor * Math.random();
                const retryDelay = Math.min(baseDelay + jitter, this.maxRetryDelay);
                
                console.log(`⏳ Retrying in ${Math.round(retryDelay)}ms...`);
                await this.sleep(retryDelay);
                
                // Try backup endpoint on later attempts if available
                if (attempt > 1 && this.failoverEnabled && this.backupUrl) {
                    console.log('🔄 Attempting failover to backup endpoint...');
                    targetUrl = this.getBackupEndpointUrl();
                    this.currentEndpoint = 'backup';
                }
                
                response = await this.attemptRequest(targetUrl + endpoint, payload, headers);
                attempt++;
            }
            
            // Final failover attempt if primary/backup both failed
            if (!response.success && this.failoverEnabled && this.backupUrl && this.currentEndpoint !== 'backup') {
                console.log('🆘 Final failover attempt to backup endpoint...');
                try {
                    const backupUrl = this.getBackupEndpointUrl();
                    this.currentEndpoint = 'backup';
                    response = await this.attemptRequest(backupUrl + endpoint, payload, headers);
                } catch (failoverError) {
                    console.error('❌ Failover attempt failed:', failoverError);
                }
            }
            
            if (!response.success) {
                throw new Error(response.error || 'All request attempts failed');
            }
            
            // Reset to primary endpoint on successful request
            if (this.currentEndpoint === 'backup') {
                console.log('✅ Resetting to primary endpoint after successful backup request');
                this.currentEndpoint = 'primary';
            }
            
            // Update usage statistics
            const duration = Date.now() - startTime;
            this.updateUsageStats(duration, response, true, false);
            
            console.log('✅ Secure request completed successfully:', {
                requestId,
                duration: `${duration}ms`,
                endpoint: this.currentEndpoint,
                responseSize: JSON.stringify(response).length
            });
            
            return response;
            
        } catch (error) {
            // Update error statistics
            const duration = Date.now() - startTime;
            this.updateUsageStats(duration, null, false, false);
            
            console.error('❌ Secure request failed:', {
                requestId,
                endpoint,
                error: error.message,
                duration: `${duration}ms`,
                endpoint: this.currentEndpoint
            });
            
            throw error;
            
        } finally {
            // Clean up request tracking
            const requestKey = this.generateRequestKey(endpoint, payload);
            this.pendingRequests.delete(requestKey);
            this.activeRequests = Math.max(0, this.activeRequests - 1);
        }
    }

    async attemptRequest(url, payload, headers) {
        // Single request attempt with timeout and error handling
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Handle non-200 status codes
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                
                return {
                    success: false,
                    error: errorData.error || errorData.message || `Request failed with status ${response.status}`,
                    statusCode: response.status,
                    headers: Object.fromEntries(response.headers.entries())
                };
            }
            
            // Parse response
            const data = await response.json();
            
            return {
                success: true,
                data: data,
                statusCode: response.status,
                headers: Object.fromEntries(response.headers.entries())
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: `Request timeout after ${this.timeout}ms`,
                    timeout: true
                };
            }
            
            return {
                success: false,
                error: error.message || 'Network request failed',
                networkError: true
            };
        }
    }

    // Add this method to your public/analytics/services/secureClaudeService.js file
// Add it inside the SecureClaudeService class

// Missing method: simulateFeedbackClassification
simulateFeedbackClassification(feedbackData, options = {}) {
    try {
        console.log('🧪 [SecureClaudeService] Running feedback classification simulation...', {
            feedbackCount: feedbackData.length,
            testMode: true
        });
        
        // Generate realistic simulation results
        const simulatedResults = {
            success: true,
            results: feedbackData.map((feedback, index) => {
                // Simulate sentiment analysis
                const sentimentScores = [0.8, -0.3, 0.6, -0.7, 0.2, 0.9, -0.1];
                const sentimentScore = sentimentScores[index % sentimentScores.length];
                
                // Simulate theme classification
                const themes = ['product', 'service', 'communication', 'pricing', 'support'];
                const theme = themes[index % themes.length];
                
                return {
                    id: feedback.id || `feedback_${index}`,
                    text: feedback.text || `Sample feedback ${index + 1}`,
                    sentiment: {
                        score: sentimentScore,
                        label: sentimentScore > 0.4 ? 'positive' : sentimentScore < -0.4 ? 'negative' : 'neutral',
                        confidence: Math.random() * 0.3 + 0.7 // 0.7 to 1.0
                    },
                    themes: [{
                        name: theme,
                        confidence: Math.random() * 0.3 + 0.7,
                        category: theme
                    }],
                    priority: sentimentScore < -0.5 ? 'high' : sentimentScore < 0 ? 'medium' : 'low',
                    actionable: sentimentScore < 0
                };
            }),
            sentimentSummary: {
                overall: 'mixed',
                positive: 40,
                negative: 25,
                neutral: 35,
                averageScore: 0.15
            },
            themeAnalysis: {
                uniqueThemes: 5,
                topThemes: [
                    { name: 'product', frequency: 35, avgSentiment: 0.3 },
                    { name: 'service', frequency: 28, avgSentiment: 0.6 },
                    { name: 'communication', frequency: 22, avgSentiment: -0.2 },
                    { name: 'pricing', frequency: 18, avgSentiment: -0.4 },
                    { name: 'support', frequency: 15, avgSentiment: 0.8 }
                ]
            },
            priorityIssues: [
                {
                    issue: 'Communication timing needs improvement',
                    severity: 'medium',
                    frequency: 12,
                    sentiment: -0.3
                },
                {
                    issue: 'Pricing concerns in multiple feedback',
                    severity: 'high', 
                    frequency: 8,
                    sentiment: -0.6
                }
            ],
            actionableInsights: [
                'Improve response time for customer inquiries',
                'Review pricing strategy based on feedback',
                'Enhance product documentation',
                'Train team on better communication practices'
            ],
            trends: {
                sentimentTrend: 'improving',
                themeTrend: 'service-focused',
                volumeTrend: 'increasing'
            },
            metadata: {
                processingTime: Math.random() * 2000 + 500, // 500-2500ms
                confidence: 0.85,
                languagesDetected: ['en'],
                promptVersion: 'simulation_v1.0',
                tokensUsed: feedbackData.length * 150, // Simulate token usage
                testMode: true,
                simulationTimestamp: new Date().toISOString()
            }
        };
        
        console.log('✅ [SecureClaudeService] Feedback classification simulation completed:', {
            resultsCount: simulatedResults.results.length,
            overallSentiment: simulatedResults.sentimentSummary.overall,
            uniqueThemes: simulatedResults.themeAnalysis.uniqueThemes,
            priorityIssues: simulatedResults.priorityIssues.length
        });
        
        return simulatedResults;
        
    } catch (error) {
        console.error('❌ [SecureClaudeService] Simulation failed:', error);
        throw new Error(`Feedback classification simulation failed: ${error.message}`);
    }
}
    
    sanitizeForTransport(data) {
        // Remove sensitive fields before sending to Worker
        try {
            console.log('🧹 Sanitizing data for transport...', {
                originalType: typeof data,
                originalSize: JSON.stringify(data).length
            });
            
            // Deep clone to avoid modifying original data
            let sanitized = this.deepClone(data);
            
            // Strip PII, tokens, secrets
            sanitized = this.removeSensitiveFields(sanitized);
            
            // Maintain data integrity for analysis
            sanitized = this.preserveAnalysisIntegrity(sanitized);
            
            // Validate sanitized data structure
            this.validateSanitizedData(sanitized);
            
            // Log sanitization actions for audit
            this.logSanitizationActions(data, sanitized);
            
            console.log('✅ Data sanitization completed:', {
                sanitizedType: typeof sanitized,
                sanitizedSize: JSON.stringify(sanitized).length,
                reductionRatio: `${Math.round((1 - JSON.stringify(sanitized).length / JSON.stringify(data).length) * 100)}%`
            });
            
            return sanitized;
            
        } catch (error) {
            console.error('❌ Data sanitization failed:', error);
            throw new Error(`Data sanitization failed: ${error.message}`);
        }
    }

    deepClone(obj) {
        // Deep clone object while handling complex types
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        
        return obj;
    }

    removeSensitiveFields(data) {
        // Comprehensive sensitive field removal
        const sensitivePatterns = [
            // Authentication & Security
            /^(password|pwd|pass|secret|token|key|auth|credential)$/i,
            /^(api_key|access_token|refresh_token|session_token|bearer)$/i,
            /^(private_key|public_key|certificate|cert|signature)$/i,
            
            // Personal Information
            /^(ssn|social_security|tax_id|passport|license)$/i,
            /^(credit_card|cc_number|cvv|expiry|billing)$/i,
            /^(email|phone|address|location|ip_address)$/i,
            
            // Internal System Data
            /^(internal_id|system_id|database_id|admin)$/i,
            /^(config|configuration|environment|env)$/i,
            /^(log|debug|trace|error_details)$/i
        ];
        
        const sensitiveValues = [
            // Common sensitive patterns
            /^sk-[a-zA-Z0-9]{48}$/, // OpenAI API keys
            /^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}$/, // Credit card pattern
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email pattern
            /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/, // SSN pattern
        ];
        
        return this.recursiveFieldRemoval(data, sensitivePatterns, sensitiveValues);
    }

    recursiveFieldRemoval(obj, patterns, valuePatterns) {
        // Recursively remove sensitive fields and values
        if (obj === null || typeof obj !== 'object') {
            // Check if primitive value matches sensitive patterns
            if (typeof obj === 'string') {
                for (const pattern of valuePatterns) {
                    if (pattern.test(obj)) {
                        return '[REDACTED]';
                    }
                }
            }
            return obj;
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.recursiveFieldRemoval(item, patterns, valuePatterns));
        }
        
        const cleaned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Check if field name matches sensitive patterns
                const isSensitiveField = patterns.some(pattern => pattern.test(key));
                
                if (isSensitiveField) {
                    cleaned[key] = '[REDACTED]';
                } else {
                    cleaned[key] = this.recursiveFieldRemoval(obj[key], patterns, valuePatterns);
                }
            }
        }
        
        return cleaned;
    }

    startCacheCleanup() {
    // Start periodic cache cleanup
    this.cacheCleanupInterval = setInterval(() => {
        this.performCacheCleanup();
    }, 300000); // 5 minutes
    
    console.log('🧹 [SecureClaudeService] Cache cleanup started');
}

    // Add these methods inside your SecureClaudeService class:

startQueueProcessor() {
    // Start queue processing
    this.queueProcessorInterval = setInterval(() => {
        this.processQueue();
    }, 1000); // Process every second
    
    console.log('🔄 [SecureClaudeService] Queue processor started');
}

processQueue() {
    // Implement queue processing logic
    try {
        // Add your queue processing logic here
        console.log('🔄 [SecureClaudeService] Processing queue...');
    } catch (error) {
        console.warn('⚠️ [SecureClaudeService] Queue processing failed:', error);
    }
}

startCacheCleanup() {
    // Start periodic cache cleanup
    this.cacheCleanupInterval = setInterval(() => {
        this.performCacheCleanup();
    }, 300000); // 5 minutes
    
    console.log('🧹 [SecureClaudeService] Cache cleanup started');
}

performCacheCleanup() {
    // Implement cache cleanup logic
    try {
        // Clear expired cache entries
        const now = Date.now();
        console.log('🧹 [SecureClaudeService] Cache cleanup performed');
    } catch (error) {
        console.warn('⚠️ [SecureClaudeService] Cache cleanup failed:', error);
    }
}

performCacheCleanup() {
    // Implement cache cleanup logic
    try {
        // Clear expired cache entries
        const now = Date.now();
        const expiredKeys = [];
        
        // Add your cache cleanup logic here
        console.log('🧹 [SecureClaudeService] Cache cleanup performed');
    } catch (error) {
        console.warn('⚠️ [SecureClaudeService] Cache cleanup failed:', error);
    }
}

    preserveAnalysisIntegrity(data) {
        // Ensure critical fields for analysis are preserved
        const preserveFields = [
            'message_content', 'text', 'content', 'body',
            'performance_metrics', 'analytics_data', 'results',
            'timestamp', 'created_at', 'updated_at', 'date',
            'score', 'rating', 'engagement', 'conversion',
            'platform', 'source', 'type', 'category',
            'metadata', 'tags', 'status', 'state'
        ];
        
        // Ensure preserved fields maintain their structure
        return this.ensureFieldPreservation(data, preserveFields);
    }

    ensureFieldPreservation(obj, preserveFields) {
        // Maintain critical field structure for analysis
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.ensureFieldPreservation(item, preserveFields));
        }
        
        const preserved = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Check if this is a field we need to preserve
                const shouldPreserve = preserveFields.some(field => 
                    key.toLowerCase().includes(field.toLowerCase()) ||
                    field.toLowerCase().includes(key.toLowerCase())
                );
                
                if (shouldPreserve && obj[key] === '[REDACTED]') {
                    console.warn(`⚠️ Critical field '${key}' was redacted but needed for analysis`);
                    // You might want to implement special handling here
                }
                
                preserved[key] = this.ensureFieldPreservation(obj[key], preserveFields);
            }
        }
        
        return preserved;
    }

    validateSanitizedData(data) {
        // Validate that sanitized data is still usable
        try {
            // Ensure JSON serializable
            JSON.stringify(data);
            
            // Check size constraints
            const serialized = JSON.stringify(data);
            const sizeInMB = serialized.length / (1024 * 1024);
            
            if (sizeInMB > 10) { // 10MB limit
                throw new Error(`Sanitized data too large: ${sizeInMB.toFixed(2)}MB`);
            }
            
            // Ensure no circular references
            this.checkCircularReferences(data);
            
            return true;
            
        } catch (error) {
            throw new Error(`Sanitized data validation failed: ${error.message}`);
        }
    }

    checkCircularReferences(obj, seen = new WeakSet()) {
        // Check for circular references that would break JSON serialization
        if (obj === null || typeof obj !== 'object') {
            return false;
        }
        
        if (seen.has(obj)) {
            throw new Error('Circular reference detected in sanitized data');
        }
        
        seen.add(obj);
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                this.checkCircularReferences(obj[key], seen);
            }
        }
        
        seen.delete(obj);
        return false;
    }

    logSanitizationActions(original, sanitized) {
        // Log sanitization actions for audit trail
        if (!this.analyticsLogging) return;
        
        try {
            const originalSize = JSON.stringify(original).length;
            const sanitizedSize = JSON.stringify(sanitized).length;
            const redactedFields = this.countRedactedFields(sanitized);
            
            const auditLog = {
                action: 'data_sanitization',
                timestamp: new Date().toISOString(),
                originalSize: originalSize,
                sanitizedSize: sanitizedSize,
                reductionRatio: (1 - sanitizedSize / originalSize),
                redactedFieldCount: redactedFields,
                userId: window.OsliraApp?.user?.id || 'unknown',
                sessionId: window.OsliraApp?.session?.access_token?.substr(0, 10) + '...' || 'unknown'
            };
            
            // Log to console in development
            if (window.location.hostname === 'localhost') {
                console.log('🔍 Sanitization audit log:', auditLog);
            }
            
            // Send to analytics hook if configured
            if (this.analyticsHook) {
                this.analyticsHook('sanitization', auditLog);
            }
            
            // Store in Supabase if enabled
            if (this.supabaseLogging) {
                this.logToSupabase('data_sanitization', auditLog);
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to log sanitization actions:', error);
        }
    }

    countRedactedFields(obj, count = 0) {
        // Count how many fields were redacted
        if (obj === null || typeof obj !== 'object') {
            return obj === '[REDACTED]' ? count + 1 : count;
        }
        
        if (obj instanceof Array) {
            return obj.reduce((acc, item) => acc + this.countRedactedFields(item, 0), count);
        }
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                count = this.countRedactedFields(obj[key], count);
            }
        }
        
        return count;
    }

    // Helper methods used by the main functions
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateRequestKey(endpoint, payload) {
        // Create deterministic key for request deduplication
        const keyData = {
            endpoint,
            requestType: payload.requestType,
            // Include only key payload fields for deduplication
            keyFields: {
                messages: payload.messages ? JSON.stringify(payload.messages).substr(0, 100) : null,
                analyticsData: payload.analyticsData ? Object.keys(payload.analyticsData).sort().join(',') : null,
                feedbackData: payload.feedbackData ? JSON.stringify(payload.feedbackData).substr(0, 100) : null
            }
        };
        
        return btoa(JSON.stringify(keyData)).substr(0, 32);
    }

    getCurrentEndpointUrl() {
        return this.currentEndpoint === 'backup' && this.backupUrl ? this.backupUrl : this.baseUrl;
    }

    getBackupEndpointUrl() {
        return this.backupUrl || this.baseUrl;
    }

    async enforceRateLimit() {
        const now = Date.now();
        if (now - this.lastRequestTime < this.requestInterval) {
            const waitTime = this.requestInterval - (now - this.lastRequestTime);
            await this.sleep(waitTime);
        }
        this.lastRequestTime = Date.now();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getCachedResult(payload) {
        const cacheKey = this.generateCacheKey(payload);
        const cached = this.resultCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        
        if (cached) {
            this.resultCache.delete(cacheKey);
        }
        
        return null;
    }

    cacheResult(payload, result, ttl) {
        const cacheKey = this.generateCacheKey(payload);
        
        // Manage cache size
        if (this.resultCache.size >= this.maxCacheSize) {
            const firstKey = this.resultCache.keys().next().value;
            this.resultCache.delete(firstKey);
        }
        
        this.resultCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            ttl: ttl || this.cacheTTL
        });
    }

    generateCacheKey(payload) {
        const keyData = {
            requestType: payload.requestType,
            contentHash: this.hashPayloadContent(payload)
        };
        return btoa(JSON.stringify(keyData)).substr(0, 24);
    }

    hashPayloadContent(payload) {
        // Simple hash for cache key generation
        const content = JSON.stringify({
            messages: payload.messages,
            analyticsData: payload.analyticsData,
            feedbackData: payload.feedbackData,
            options: payload.options
        });
        
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    updateUsageStats(duration, response, success, fromCache) {
        this.usageStats.totalRequests++;
        
        if (success) {
            this.usageStats.averageLatency = (this.usageStats.averageLatency + duration) / 2;
            
            if (fromCache) {
                this.usageStats.cacheHitRate = (this.usageStats.cacheHitRate + 1) / 2;
            }
        } else {
            this.usageStats.errorRate = (this.usageStats.errorRate + 1) / 2;
        }
    }

    logAnalytics(requestType, metadata, success = true) {
        if (!this.analyticsLogging) return;
        
        // Update request type stats
        if (!this.usageStats.requestsByType[requestType]) {
            this.usageStats.requestsByType[requestType] = 0;
        }
        this.usageStats.requestsByType[requestType]++;
        
        // Log to analytics hook if available
        if (this.analyticsHook) {
            this.analyticsHook(requestType, {
                ...metadata,
                success,
                timestamp: new Date().toISOString()
            });
        }
    }

    async logToSupabase(eventType, data) {
        // Log to Supabase analytics table if enabled
        try {
            if (!window.OsliraApp?.supabase) return;
            
            await window.OsliraApp.supabase
                .from('analytics_events')
                .insert({
                    event_type: eventType,
                    event_data: data,
                    user_id: window.OsliraApp?.user?.id,
                    created_at: new Date().toISOString()
                });
                
        } catch (error) {
            console.warn('⚠️ Failed to log to Supabase:', error);
        }
    }
}
    export { SecureClaudeService };

