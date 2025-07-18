/*
===============================================================================
                        SECURE ANALYTICS DASHBOARD ARCHITECTURE
===============================================================================
🔐 All AI calls, billing operations, and secure writes routed through Cloudflare Workers
🔐 Frontend acts as thin HTTP client with no direct Claude/OpenAI access
🔐 Credit verification and deduction handled server-side with service role key
*/

/*
===============================================================================
                           CLOUDFLARE WORKER ENDPOINTS
===============================================================================
Modular worker architecture with named endpoints and clear responsibilities
*/

// ===== WORKER ENDPOINT STRUCTURE =====
const WORKER_ENDPOINTS = {
    // AI & Claude Services - All AI processing moved to Worker
    ai: {
        risk: '/ai/risk-analysis',           // Message risk classification with Claude
        insights: '/ai/generate-insights',   // Strategic insights generation
        feedback: '/ai/classify-feedback',   // Sentiment & theme analysis
        optimize: '/ai/suggest-optimizations', // Performance recommendations
        experiments: '/ai/suggest-experiments', // A/B test suggestions
        patterns: '/ai/analyze-patterns',    // Weekly pattern analysis
        icp_drift: '/ai/detect-icp-drift'   // ICP drift detection
    },
    
    // Analytics Data Processing - Server-side data aggregation
    analytics: {
        matrix: '/analytics/message-matrix',      // Message style performance
        heatmap: '/analytics/lead-conversion',    // Lead conversion heatmap
        cta: '/analytics/cta-effectiveness',      // CTA performance tracking
        timeline: '/analytics/timeline-overlay', // Outreach timeline
        roi: '/analytics/iteration-roi',          // Message iteration ROI
        team: '/analytics/team-impact',           // Team performance
        crm: '/analytics/crm-comparison',         // CRM performance
        guidance: '/analytics/claude-history'    // Claude guidance tracking
    },
    
    // Credit & Billing Management - Server-side credit operations
    credits: {
        check: '/credits/check-balance',     // Verify user credits with service role
        deduct: '/credits/deduct-usage',     // Deduct credits with audit logging
        history: '/credits/usage-history',   // Credit usage analytics
        predict: '/credits/predict-usage'    // Predict credit consumption
    },
    
    // External Integrations - Server-side API calls
    integrations: {
        scrape: '/integrations/apify-scrape',    // Apify lead scraping
        crm_sync: '/integrations/crm-sync',      // CRM data synchronization
        bi_push: '/integrations/bi-export',      // BI platform export
        webhooks: '/integrations/webhooks'       // Webhook handlers
    },
    
    // Data Writes & Logging - Server-side writes with service role
    data: {
        write_analysis: '/data/write-analysis',  // Write AI analysis results
        log_audit: '/data/audit-log',           // Audit trail logging
        cache_performance: '/data/cache-perf',   // Performance cache updates
        batch_write: '/data/batch-operations'   // Batch data operations
    },
    
    // Export & Reporting - Server-side report generation
    export: {
        pdf: '/export/generate-pdf',         // PDF report generation
        csv: '/export/generate-csv',         // CSV data export
        excel: '/export/generate-excel',     // Excel workbook export
        scheduled: '/export/scheduled-reports' // Automated report scheduling
    }
};

/*
===============================================================================
                        FRONTEND HTTP CLIENT SERVICES
===============================================================================
Thin client services that act as secure proxies to Worker endpoints
*/

// ===== SECURE CLAUDE SERVICE (HTTP CLIENT) =====
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

// ===== SECURE ANALYTICS SERVICE (HTTP CLIENT) =====
class SecureAnalyticsService {
    constructor() {
        // Initialize secure analytics data client
        // - Setup Worker endpoint connections
        // - Configure caching strategies
        // - Initialize request management
    }

    async getMessageMatrix(filters = {}) {
        // 🔐 Fetch message style performance matrix via Worker
        // - Send filter parameters to Worker
        // - Process data aggregation server-side
        // - Return formatted matrix data for visualization
    }

    async getLeadConversionHeatmap(filters = {}) {
        // 🔐 Fetch lead conversion heatmap via Worker
        // - Apply filters server-side for security
        // - Calculate conversion rates and confidence intervals
        // - Return heatmap data with statistical significance
    }

    async getCTAEffectiveness(filters = {}) {
        // 🔐 Fetch CTA performance tracking via Worker
        // - Analyze CTA usage patterns server-side
        // - Calculate effectiveness scores and rankings
        // - Return actionable CTA insights
    }

    async getTimelineOverlay(filters = {}) {
        // 🔐 Fetch outreach timeline with performance overlay
        // - Correlate events with performance changes
        // - Calculate impact scores for timeline events
        // - Return timeline with correlation analysis
    }

    async getIterationROI(filters = {}) {
        // 🔐 Fetch message iteration ROI analysis
        // - Calculate improvement metrics server-side
        // - Track regeneration impact and costs
        // - Return ROI analysis with recommendations
    }

    async getTeamImpact(filters = {}) {
        // 🔐 Fetch team performance analytics
        // - Analyze individual contributor metrics
        // - Track Claude utilization and improvements
        // - Return team rankings and coaching insights
    }

    async getCRMComparison(filters = {}) {
        // 🔐 Fetch CRM performance comparison
        // - Compare win rates across CRM systems
        // - Calculate quality and consistency scores
        // - Return CRM rankings with insights
    }

    async getClaudeGuidanceHistory(filters = {}) {
        // 🔐 Fetch Claude guidance tracking
        // - Track advice implementation and outcomes
        // - Calculate guidance ROI and effectiveness
        // - Return guidance history with impact analysis
    }

    async makeAnalyticsRequest(endpoint, payload) {
        // Execute secure analytics data request
        // - Cache responses for performance
        // - Handle large datasets efficiently
        // - Return formatted analytics data
    }
}

// ===== SECURE DATA WRITE SERVICE (HTTP CLIENT) =====
class SecureDataWriteService {
    constructor() {
        // Initialize secure data write client
        // - Setup Worker write endpoints
        // - Configure write queue for batching
        // - Initialize audit logging
    }

    async writeAnalysisResult(analysisData) {
        // 🔐 Write AI analysis results via Worker
        // - Queue analysis data for secure write
        // - Include metadata and timestamps
        // - Log write operations for audit
    }

    async logAuditTrail(action, metadata = {}) {
        // 🔐 Log user actions for audit trail
        // - Capture user actions and context
        // - Include session and security metadata
        // - Store audit logs securely server-side
    }

    async cachePerformanceData(data, cacheKey) {
        // 🔐 Cache performance data via Worker
        // - Store processed analytics server-side
        // - Set appropriate TTL values
        // - Enable cache invalidation strategies
    }

    async queueWrite(endpoint, payload) {
        // Queue write operation for batch processing
        // - Add to write queue with priority
        // - Handle write conflicts and retries
        // - Return promise for completion tracking
    }

    async processWriteQueue() {
        // Process queued write operations in batches
        // - Execute writes in optimal batch sizes
        // - Handle errors and retries gracefully
        // - Maintain write order when required
    }
}

// ===== SECURE INTEGRATION SERVICE (HTTP CLIENT) =====
class SecureIntegrationService {
    constructor() {
        // Initialize secure integration client
        // - Setup Worker integration endpoints
        // - Configure extended timeouts for external APIs
        // - Initialize integration monitoring
    }

    async triggerApifyScrape(scrapeConfig) {
        // 🔐 Trigger Apify lead scraping via Worker
        // - Send scraping configuration to Worker
        // - Handle long-running scrape operations
        // - Return scrape job ID and status tracking
    }

    async syncWithCRM(crmConfig) {
        // 🔐 Synchronize data with external CRM
        // - Execute CRM API calls server-side
        // - Handle authentication and rate limiting
        // - Return sync status and results
    }

    async exportToBI(exportConfig) {
        // 🔐 Export analytics to BI platforms
        // - Format data for target BI system
        // - Handle large dataset exports
        // - Return export status and access links
    }

    async makeIntegrationRequest(endpoint, payload) {
        // Execute secure integration request
        // - Handle extended timeouts for external APIs
        // - Include integration-specific error handling
        // - Return formatted integration responses
    }
}

/*
===============================================================================
                        UPDATED ANALYTICS MODULES
===============================================================================
Analytics modules updated to use secure Worker-based services
*/

// ===== SECURE MESSAGE STYLE PERFORMANCE MATRIX =====
class SecureMessageStyleMatrix {
    constructor(container, secureAnalyticsService, secureCreditService) {
        // Initialize secure matrix component
        // - Connect to secure analytics and credit services
        // - Setup visualization container
        // - Configure chart rendering options
    }

    async render(filters = {}) {
        // Render secure message style performance matrix
        // - Verify user credits before expensive operations
        // - Fetch matrix data via secure Worker endpoint
        // - Create interactive 3D matrix visualization
        // - Handle loading states and error scenarios
    }

    async updateMatrix(newData) {
        // Update matrix with new secure data
        // - Validate data format from Worker response
        // - Animate transitions between data states
        // - Maintain user interaction state
    }

    createMatrixChart(data) {
        // Create secure matrix visualization
        // - Process Worker-supplied matrix data
        // - Apply security-conscious chart configurations
        // - Enable secure interaction capabilities
    }

    handleMatrixClick(event) {
        // Handle secure matrix interactions
        // - Validate user permissions for detailed views
        // - Log interaction events for audit
        // - Trigger secure detail data fetches
    }
}

// ===== SECURE LEAD CONVERSION HEATMAP =====
class SecureLeadConversionHeatmap {
    constructor(container, secureAnalyticsService) {
        // Initialize secure heatmap component
        // - Setup secure analytics service connection
        // - Configure heatmap visualization options
        // - Initialize interaction handlers
    }

    async render(filters = {}) {
        // Render secure lead conversion heatmap
        // - Fetch conversion data via Worker endpoints
        // - Apply server-side filtering for security
        // - Create interactive heatmap visualization
    }

    async updateHeatmap(newData) {
        // Update heatmap with secure data
        // - Process Worker-validated conversion data
        // - Update color intensity calculations
        // - Refresh tooltips and interactions
    }

    createHeatmapChart(data) {
        // Create secure heatmap visualization
        // - Use Worker-processed conversion rates
        // - Apply security-conscious color schemes
        // - Enable secure hover interactions
    }
}

// ===== SECURE CTA EFFECTIVENESS TRACKER =====
class SecureCTAEffectivenessTracker {
    constructor(container, secureAnalyticsService) {
        // Initialize secure CTA tracker
        // - Connect to secure analytics endpoints
        // - Setup CTA performance monitoring
        // - Configure tracking visualizations
    }

    async render(filters = {}) {
        // Render secure CTA effectiveness analysis
        // - Fetch CTA data via Worker processing
        // - Calculate effectiveness scores server-side
        // - Display ranked CTA performance
    }

    async updateCTAData(newData) {
        // Update CTA tracking with secure data
        // - Process Worker-validated CTA metrics
        // - Update ranking and trend calculations
        // - Refresh recommendation displays
    }

    createCTAChart(data) {
        // Create secure CTA performance visualization
        // - Use Worker-calculated effectiveness scores
        // - Display usage patterns and trends
        // - Enable secure drill-down capabilities
    }
}

// ===== SECURE FEEDBACK SIGNAL EXPLORER =====
class SecureFeedbackSignalExplorer {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        // Initialize secure feedback explorer
        // - Connect to secure analytics and Claude services
        // - Setup sentiment analysis components
        // - Configure theme extraction displays
    }

    async render(filters = {}) {
        // Render secure feedback analysis
        // - Fetch feedback data via Worker endpoints
        // - Process sentiment analysis via secure Claude service
        // - Display theme clusters and sentiment trends
    }

    async processFeedbackWithClaude(feedbackData) {
        // Process feedback via secure Claude service
        // - Send feedback to Worker for Claude analysis
        // - Extract themes and sentiment server-side
        // - Return structured classification results
    }

    createSentimentChart(data) {
        // Create secure sentiment visualization
        // - Use Worker-processed sentiment data
        // - Display sentiment distribution and trends
        // - Enable secure sentiment drill-down
    }
}

// ===== SECURE CRM PERFORMANCE COMPARATOR =====
class SecureCRMPerformanceComparator {
    constructor(container, secureAnalyticsService) {
        // Initialize secure CRM comparator
        // - Setup secure analytics service connection
        // - Configure CRM comparison displays
        // - Initialize ranking visualizations
    }

    async render(filters = {}) {
        // Render secure CRM performance comparison
        // - Fetch CRM data via Worker endpoints
        // - Calculate rankings and scores server-side
        // - Display interactive comparison charts
    }

    async updateCRMData(newData) {
        // Update CRM comparison with secure data
        // - Process Worker-validated CRM metrics
        // - Update ranking calculations
        // - Refresh comparison visualizations
    }

    createComparisonChart(data) {
        // Create secure CRM comparison visualization
        // - Use Worker-calculated performance metrics
        // - Display multi-metric radar charts
        // - Enable secure CRM analysis drill-down
    }
}

// ===== SECURE OUTREACH TIMELINE OVERLAY =====
class SecureOutreachTimelineOverlay {
    constructor(container, secureAnalyticsService) {
        // Initialize secure timeline component
        // - Connect to secure analytics endpoints
        // - Setup timeline visualization
        // - Configure event correlation analysis
    }

    async render(filters = {}) {
        // Render secure outreach timeline
        // - Fetch timeline data via Worker processing
        // - Correlate events with performance server-side
        // - Display interactive timeline with overlays
    }

    async updateTimeline(newData) {
        // Update timeline with secure event data
        // - Process Worker-validated timeline events
        // - Update correlation calculations
        // - Refresh timeline visualizations
    }

    createTimelineChart(data) {
        // Create secure timeline visualization
        // - Use Worker-processed event correlations
        // - Display performance overlay data
        // - Enable secure timeline interactions
    }
}

// ===== SECURE MESSAGE ITERATION ROI TRACKER =====
class SecureMessageIterationROITracker {
    constructor(container, secureAnalyticsService) {
        // Initialize secure ROI tracker
        // - Setup secure analytics service connection
        // - Configure ROI calculation displays
        // - Initialize iteration tracking
    }

    async render(filters = {}) {
        // Render secure iteration ROI analysis
        // - Fetch iteration data via Worker endpoints
        // - Calculate ROI metrics server-side
        // - Display before/after comparisons
    }

    async updateROIData(newData) {
        // Update ROI tracking with secure data
        // - Process Worker-calculated ROI metrics
        // - Update improvement calculations
        // - Refresh ROI visualizations
    }

    calculateIterationROI(data) {
        // Calculate secure iteration ROI
        // - Use Worker-validated performance data
        // - Calculate improvement percentages
        // - Include cost-benefit analysis
    }
}

// ===== SECURE TEAM IMPACT DASHBOARD =====
class SecureTeamImpactDashboard {
    constructor(container, secureAnalyticsService) {
        // Initialize secure team dashboard
        // - Connect to secure team analytics endpoints
        // - Setup team performance displays
        // - Configure coaching insights
    }

    async render(filters = {}) {
        // Render secure team performance analysis
        // - Fetch team data via Worker processing
        // - Calculate team metrics server-side
        // - Display individual and team performance
    }

    async updateTeamData(newData) {
        // Update team dashboard with secure data
        // - Process Worker-validated team metrics
        // - Update ranking calculations
        // - Refresh coaching recommendations
    }

    createTeamChart(data) {
        // Create secure team performance visualization
        // - Use Worker-calculated team metrics
        // - Display performance rankings
        // - Enable secure team member drill-down
    }
}

// ===== SECURE CLAUDE GUIDANCE HISTORY =====
class SecureClaudeGuidanceHistory {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        // Initialize secure guidance history
        // - Connect to secure analytics and Claude services
        // - Setup guidance tracking displays
        // - Configure implementation monitoring
    }

    async render(filters = {}) {
        // Render secure Claude guidance analysis
        // - Fetch guidance data via Worker endpoints
        // - Track implementation success server-side
        // - Display advice correlation with results
    }

    async updateGuidanceData(newData) {
        // Update guidance tracking with secure data
        // - Process Worker-validated guidance metrics
        // - Update implementation tracking
        // - Refresh advice effectiveness displays
    }

    trackAdviceImplementation(advice, outcomes) {
        // Track secure advice implementation
        // - Log implementation status securely
        // - Calculate outcome correlations
        // - Update advice effectiveness scores
    }
}

// ===== SECURE MESSAGE RISK CLASSIFIER =====
class SecureMessageRiskClassifier {
    constructor(container, secureAnalyticsService, secureClaudeService) {
        // Initialize secure risk classifier
        // - Connect to secure Claude risk analysis service
        // - Setup risk monitoring displays
        // - Configure alert systems
    }

    async render(filters = {}) {
        // Render secure risk analysis dashboard
        // - Fetch risk data via Worker endpoints
        // - Process risk classification via secure Claude service
        // - Display risk distribution and alerts
    }

    async classifyMessage(message) {
        // Classify message risk via secure service
        // - Send message to Worker for Claude analysis
        // - Return structured risk assessment
        // - Log risk classification for audit
    }

    async updateRiskData(newData) {
        // Update risk analysis with secure data
        // - Process Worker-validated risk metrics
        // - Update risk trend calculations
        // - Refresh alert configurations
    }
}

/*
===============================================================================
                           CHART RENDERING SYSTEM
===============================================================================
Secure chart creation and management system using Chart.js with Worker data
*/

// ===== SECURE CHART FACTORY =====
class SecureChartFactory {
    constructor() {
        // Initialize secure chart factory
        // - Setup Chart.js with security configurations
        // - Configure data validation for Worker responses
        // - Initialize chart theming and styling
    }

    createChart(type, container, secureData, options = {}) {
        // Create secure chart with Worker-validated data
        // - Validate data structure from Worker responses
        // - Apply security-conscious chart configurations
        // - Setup secure interaction handlers
        // - Return chart instance with security context
    }

    updateChart(chartInstance, newSecureData) {
        // Update chart with new secure data
        // - Validate new data from Worker endpoints
        // - Update chart data securely
        // - Maintain chart state and interactions
    }

    destroyChart(chartInstance) {
        // Securely destroy chart instance
        // - Clean up chart resources
        // - Clear sensitive data from memory
        // - Log chart destruction for audit
    }
}

/*
===============================================================================
                        SECURE CONFIGURATION SYSTEM
===============================================================================
Updated configuration system for Worker-based architecture
*/

// ===== SECURE ANALYTICS CONFIG =====
const SECURE_ANALYTICS_CONFIG = {
    // Worker Configuration
    worker: {
        baseUrl: window.OsliraApp?.config?.workerUrl,
        timeout: 60000,
        retryAttempts: 3,
        retryDelay: 2000,
        batchSize: 10
    },
    
    // Security Configuration
    security: {
        enableRequestSigning: true,
        enableDataSanitization: true,
        enableAuditLogging: true,
        maxRequestSize: 10485760, // 10MB
        rateLimitRequests: 100
    },
    
    // Credit Configuration
    credits: {
        checkBalanceBeforeOperation: true,
        enableUsagePrediction: true,
        enableCostOptimization: true,
        logAllTransactions: true
    },
    
    // AI Configuration
    ai: {
        enableAdvancedRiskScoring: true,
        enableInsightGeneration: true,
        enableFeedbackClassification: true,
        enableExperimentSuggestions: false,
        promptVersion: 'v2.1'
    }
};

/*
===============================================================================
                        SECURE INITIALIZATION SYSTEM
===============================================================================
Updated initialization sequence for Worker-based architecture
*/

// ===== SECURE ANALYTICS DASHBOARD =====
class SecureAnalyticsDashboard {
    constructor() {
        // Initialize secure analytics dashboard
        // - Setup Worker-based service connections
        // - Configure security and authentication
        // - Initialize secure caching system
    }

    async init() {
        // Secure initialization sequence
        // - Validate Worker endpoint availability
        // - Initialize secure service clients
        // - Setup authenticated connections
        // - Load initial data via Workers
        // - Render secure dashboard layout
    }

    async initializeSecureServices() {
        // Initialize all secure Worker-based services
        // - Create SecureClaudeService instance
        // - Create SecureCreditService instance
        // - Create SecureAnalyticsService instance
        // - Create SecureDataWriteService instance
        // - Create SecureIntegrationService instance
    }

    async loadInitialData() {
        // Load initial dashboard data securely
        // - Check user credits via Worker
        // - Fetch analytics data via Workers
        // - Initialize real-time data connections
        // - Setup secure caching strategies
    }

    async renderSecureDashboard() {
        // Render dashboard with secure components
        // - Initialize secure analytics modules
        // - Setup Worker-based data flows
        // - Configure secure user interactions
        // - Enable secure real-time updates
    }
}

// ===== SECURE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize secure analytics dashboard when DOM is ready
    const secureDashboard = new SecureAnalyticsDashboard();
    secureDashboard.init().catch(error => {
        console.error('Secure dashboard initialization failed:', error);
        // Handle initialization errors securely
    });
});
