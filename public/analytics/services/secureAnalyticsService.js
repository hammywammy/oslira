class SecureAnalyticsService { 
    constructor() {
        // Initialize secure analytics data client
        this.baseUrl = window.OsliraApp?.config?.workerUrl || 
               window.CONFIG?.workerUrl || 
               'https://ai-outreach-api.hamzawilliamsbusiness.workers.dev';

console.log('🔧 [SecureAnalyticsService] Using baseUrl:', this.baseUrl);
        this.backupUrl = window.OsliraApp?.config?.backupWorkerUrl || null;
        this.currentEndpoint = 'primary';
        
        // Setup Worker endpoint connections
        this.endpoints = {
            messageMatrix: '/analytics/message-matrix',
            leadConversion: '/analytics/lead-conversion',
            ctaEffectiveness: '/analytics/cta-effectiveness',
            timelineOverlay: '/analytics/timeline-overlay',
            iterationROI: '/analytics/iteration-roi',
            teamImpact: '/analytics/team-impact',
            crmComparison: '/analytics/crm-comparison',
            claudeGuidance: '/analytics/claude-history',
            dataExport: '/analytics/export',
            realTimeUpdates: '/analytics/realtime',
            bulkAnalytics: '/analytics/bulk',
            customMetrics: '/analytics/custom'
        };
        
        // Configure caching strategies
        this.cache = new Map();
        this.cacheTTL = {
            messageMatrix: 300000,      // 5 minutes
            leadConversion: 600000,     // 10 minutes
            ctaEffectiveness: 180000,   // 3 minutes
            timelineOverlay: 300000,    // 5 minutes
            iterationROI: 180000,       // 3 minutes
            teamImpact: 300000,         // 5 minutes
            crmComparison: 600000,      // 10 minutes
            claudeGuidance: 600000,     // 10 minutes
            default: 300000             // 5 minutes default
        };
        
        this.maxCacheSize = 100;
        this.cacheHitCount = 0;
        this.cacheMissCount = 0;
        
        // Initialize request management
        this.timeout = 45000; // 45 seconds for analytics requests
        this.retryAttempts = 3;
        this.retryDelay = 2000;
        this.maxRetryDelay = 15000;
        this.failoverEnabled = true;
        
        // Request queue for batching and deduplication
        this.requestQueue = new Map();
        this.activeRequests = new Set();
        this.maxConcurrentRequests = 10;
        this.batchingEnabled = true;
        this.batchTimeout = 500; // 500ms batch window
        
        // Analytics request tracking
        this.requestStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            requestsByEndpoint: {},
            errorsByType: {},
            cacheHitRate: 0,
            dataTransferred: 0
        };
        
        // Data compression and optimization
        this.compressionEnabled = true;
        this.dataOptimization = true;
        this.maxResponseSize = 50 * 1024 * 1024; // 50MB limit
        
        // Real-time data subscription
        this.realtimeSubscriptions = new Map();
        this.websocketConnection = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Security and validation
        this.dataValidation = true;
        this.sanitizeFilters = true;
        this.auditLogging = true;
        
        // Performance monitoring
        this.performanceMetrics = {
            slowRequests: 0,
            timeoutRequests: 0,
            retryRequests: 0,
            failoverRequests: 0
        };
        
        if (!this.baseUrl) {
            console.warn('SecureAnalyticsService: Worker URL not configured, using fallback');
            this.baseUrl = 'https://oslira-worker.example.workers.dev';
        }
        
        // Initialize background processes
        this.startCacheManagement();
        this.startPerformanceMonitoring();
        
        console.log('📊 SecureAnalyticsService initialized:', {
            baseUrl: this.baseUrl,
            backupUrl: this.backupUrl,
            endpoints: Object.keys(this.endpoints).length,
            cacheTTLs: Object.keys(this.cacheTTL).length,
            maxCacheSize: this.maxCacheSize,
            batchingEnabled: this.batchingEnabled
        });
    }

    async getMessageMatrix(filters = {}) {
        // 🔐 Fetch message style performance matrix via Worker
        try {
            console.log('📈 Fetching message style performance matrix...', {
                filterCount: Object.keys(filters).length,
                timeframe: filters.timeframe || 'default'
            });
            
            // Send filter parameters to Worker
            const sanitizedFilters = this.sanitizeFilters ? this.sanitizeFilterData(filters) : filters;
            
            const payload = {
                filters: sanitizedFilters,
                requestType: 'message_matrix',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                options: {
                    includeConfidenceIntervals: filters.includeConfidence !== false,
                    includeStatisticalSignificance: filters.includeStats !== false,
                    groupBy: filters.groupBy || ['tone', 'structure', 'length'],
                    metrics: filters.metrics || ['response_rate', 'conversion_rate', 'engagement_score'],
                    aggregationLevel: filters.aggregationLevel || 'daily',
                    minSampleSize: filters.minSampleSize || 10
                }
            };
            
            // Check cache first
            const cacheKey = this.generateCacheKey('messageMatrix', payload);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📋 Returning cached message matrix data');
                return cached;
            }
            
            // Process data aggregation server-side
            const response = await this.makeAnalyticsRequest(this.endpoints.messageMatrix, payload);
            
            if (!response.success) {
                throw new Error(response.error || 'Message matrix fetch failed');
            }
            
            // Return formatted matrix data for visualization
            const result = {
                success: true,
                matrix: {
                    data: response.data.matrix || [],
                    dimensions: response.data.dimensions || {},
                    axes: response.data.axes || {},
                    cells: response.data.cells || []
                },
                statistics: {
                    totalMessages: response.data.stats?.totalMessages || 0,
                    significantCells: response.data.stats?.significantCells || 0,
                    confidenceLevel: response.data.stats?.confidenceLevel || 0.95,
                    dataQuality: response.data.stats?.dataQuality || 'good'
                },
                insights: {
                    topPerformingCombinations: response.data.insights?.topPerforming || [],
                    underperformingAreas: response.data.insights?.underperforming || [],
                    recommendations: response.data.insights?.recommendations || [],
                    trends: response.data.insights?.trends || {}
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    dataRange: response.data.metadata?.dataRange || {},
                    sampleSize: response.data.metadata?.sampleSize || 0,
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(cacheKey, result, this.cacheTTL.messageMatrix);
            
            console.log('✅ Message matrix fetched successfully:', {
                matrixSize: result.matrix.data.length,
                totalMessages: result.statistics.totalMessages,
                significantCells: result.statistics.significantCells,
                dataQuality: result.statistics.dataQuality
            });
            
            return result;
            
        } catch (error) {
            this.recordError('message_matrix', error);
            console.error('❌ Message matrix fetch failed:', error);
            throw new Error(`Message matrix fetch failed: ${error.message}`);
        }
    }

    async getLeadConversionHeatmap(filters = {}) {
        // 🔐 Fetch lead conversion heatmap via Worker
        try {
            console.log('🔥 Fetching lead conversion heatmap...', {
                filterCount: Object.keys(filters).length,
                leadTypes: filters.leadTypes?.length || 'all'
            });
            
            // Apply filters server-side for security
            const sanitizedFilters = this.sanitizeFilters ? this.sanitizeFilterData(filters) : filters;
            
            const payload = {
                filters: sanitizedFilters,
                requestType: 'lead_conversion_heatmap',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                options: {
                    heatmapResolution: filters.resolution || 'standard',
                    includeConfidenceIntervals: filters.includeConfidence !== false,
                    colorScheme: filters.colorScheme || 'performance',
                    normalization: filters.normalization || 'by_lead_type',
                    minConversions: filters.minConversions || 5,
                    timeGranularity: filters.timeGranularity || 'week'
                }
            };
            
            // Check cache
            const cacheKey = this.generateCacheKey('leadConversion', payload);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📋 Returning cached heatmap data');
                return cached;
            }
            
            // Calculate conversion rates and confidence intervals
            const response = await this.makeAnalyticsRequest(this.endpoints.leadConversion, payload);
            
            if (!response.success) {
                throw new Error(response.error || 'Lead conversion heatmap fetch failed');
            }
            
            // Return heatmap data with statistical significance
            const result = {
                success: true,
                heatmap: {
                    data: response.data.heatmap || [],
                    grid: response.data.grid || {},
                    colorScale: response.data.colorScale || {},
                    legend: response.data.legend || {}
                },
                conversions: {
                    totalLeads: response.data.conversions?.totalLeads || 0,
                    totalConversions: response.data.conversions?.totalConversions || 0,
                    overallRate: response.data.conversions?.overallRate || 0,
                    byLeadType: response.data.conversions?.byLeadType || {}
                },
                statistics: {
                    confidenceIntervals: response.data.stats?.confidenceIntervals || {},
                    significanceTests: response.data.stats?.significanceTests || {},
                    sampleSizes: response.data.stats?.sampleSizes || {},
                    dataCompleteness: response.data.stats?.dataCompleteness || 0.9
                },
                insights: {
                    hotspots: response.data.insights?.hotspots || [],
                    coldspots: response.data.insights?.coldspots || [],
                    opportunities: response.data.insights?.opportunities || [],
                    patterns: response.data.insights?.patterns || {}
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    resolution: payload.options.heatmapResolution,
                    dataRange: response.data.metadata?.dataRange || {},
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(cacheKey, result, this.cacheTTL.leadConversion);
            
            console.log('✅ Lead conversion heatmap fetched successfully:', {
                heatmapCells: result.heatmap.data.length,
                totalLeads: result.conversions.totalLeads,
                overallRate: `${(result.conversions.overallRate * 100).toFixed(2)}%`,
                hotspots: result.insights.hotspots.length
            });
            
            return result;
            
        } catch (error) {
            this.recordError('lead_conversion', error);
            console.error('❌ Lead conversion heatmap fetch failed:', error);
            throw new Error(`Lead conversion heatmap fetch failed: ${error.message}`);
        }
    }

    async getCTAEffectiveness(filters = {}) {
        // 🔐 Fetch CTA performance tracking via Worker
        try {
            console.log('🎯 Fetching CTA effectiveness data...', {
                filterCount: Object.keys(filters).length,
                ctaTypes: filters.ctaTypes?.length || 'all'
            });
            
            // Analyze CTA usage patterns server-side
            const sanitizedFilters = this.sanitizeFilters ? this.sanitizeFilterData(filters) : filters;
            
            const payload = {
                filters: sanitizedFilters,
                requestType: 'cta_effectiveness',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                options: {
                    sortBy: filters.sortBy || 'effectiveness_score',
                    includeUsageStats: filters.includeUsage !== false,
                    includeVariants: filters.includeVariants !== false,
                    minUsageCount: filters.minUsage || 3,
                    effectivenessMetrics: filters.metrics || ['click_rate', 'conversion_rate', 'engagement'],
                    timeWindow: filters.timeWindow || '30d'
                }
            };
            
            // Check cache
            const cacheKey = this.generateCacheKey('ctaEffectiveness', payload);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📋 Returning cached CTA effectiveness data');
                return cached;
            }
            
            // Calculate effectiveness scores and rankings
            const response = await this.makeAnalyticsRequest(this.endpoints.ctaEffectiveness, payload);
            
            if (!response.success) {
                throw new Error(response.error || 'CTA effectiveness fetch failed');
            }
            
            // Return actionable CTA insights
            const result = {
                success: true,
                ctas: {
                    ranked: response.data.ctas?.ranked || [],
                    categories: response.data.ctas?.categories || {},
                    variants: response.data.ctas?.variants || {},
                    trending: response.data.ctas?.trending || []
                },
                effectiveness: {
                    topPerformers: response.data.effectiveness?.topPerformers || [],
                    underperformers: response.data.effectiveness?.underperformers || [],
                    averageScores: response.data.effectiveness?.averageScores || {},
                    benchmarks: response.data.effectiveness?.benchmarks || {}
                },
                usage: {
                    totalCTAs: response.data.usage?.totalCTAs || 0,
                    totalUsage: response.data.usage?.totalUsage || 0,
                    uniqueCTAs: response.data.usage?.uniqueCTAs || 0,
                    mostUsed: response.data.usage?.mostUsed || []
                },
                insights: {
                    recommendations: response.data.insights?.recommendations || [],
                    opportunities: response.data.insights?.opportunities || [],
                    patterns: response.data.insights?.patterns || {},
                    optimization: response.data.insights?.optimization || []
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    analysisDepth: response.data.metadata?.analysisDepth || 'standard',
                    dataRange: response.data.metadata?.dataRange || {},
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(cacheKey, result, this.cacheTTL.ctaEffectiveness);
            
            console.log('✅ CTA effectiveness fetched successfully:', {
                totalCTAs: result.usage.totalCTAs,
                uniqueCTAs: result.usage.uniqueCTAs,
                topPerformers: result.effectiveness.topPerformers.length,
                recommendations: result.insights.recommendations.length
            });
            
            return result;
            
        } catch (error) {
            this.recordError('cta_effectiveness', error);
            console.error('❌ CTA effectiveness fetch failed:', error);
            throw new Error(`CTA effectiveness fetch failed: ${error.message}`);
        }
    }

    async getTimelineOverlay(filters = {}) {
        // 🔐 Fetch outreach timeline with performance overlay
        try {
            console.log('📅 Fetching timeline overlay data...', {
                filterCount: Object.keys(filters).length,
                timeframe: filters.timeframe || 'default'
            });
            
            // Correlate events with performance changes
            const sanitizedFilters = this.sanitizeFilters ? this.sanitizeFilterData(filters) : filters;
            
            const payload = {
                filters: sanitizedFilters,
                requestType: 'timeline_overlay',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                options: {
                    includeEvents: filters.includeEvents !== false,
                    includePerformanceOverlay: filters.includePerformance !== false,
                    correlationAnalysis: filters.includeCorrelations !== false,
                    eventTypes: filters.eventTypes || ['campaigns', 'strategy_changes', 'external_events'],
                    performanceMetrics: filters.metrics || ['response_rate', 'conversion_rate'],
                    timeResolution: filters.resolution || 'daily'
                }
            };
            
            // Check cache
            const cacheKey = this.generateCacheKey('timelineOverlay', payload);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📋 Returning cached timeline data');
                return cached;
            }
            
            // Calculate impact scores for timeline events
            const response = await this.makeAnalyticsRequest(this.endpoints.timelineOverlay, payload);
            
            if (!response.success) {
                throw new Error(response.error || 'Timeline overlay fetch failed');
            }
            
            // Return timeline with correlation analysis
            const result = {
                success: true,
                timeline: {
                    events: response.data.timeline?.events || [],
                    performance: response.data.timeline?.performance || [],
                    annotations: response.data.timeline?.annotations || [],
                    periods: response.data.timeline?.periods || []
                },
                correlations: {
                    eventImpacts: response.data.correlations?.eventImpacts || {},
                    significantCorrelations: response.data.correlations?.significant || [],
                    causalAnalysis: response.data.correlations?.causal || {},
                    lagAnalysis: response.data.correlations?.lag || {}
                },
                performance: {
                    trends: response.data.performance?.trends || {},
                    anomalies: response.data.performance?.anomalies || [],
                    seasonality: response.data.performance?.seasonality || {},
                    benchmarks: response.data.performance?.benchmarks || {}
                },
                insights: {
                    keyInfluencers: response.data.insights?.keyInfluencers || [],
                    performanceDrivers: response.data.insights?.performanceDrivers || [],
                    recommendations: response.data.insights?.recommendations || [],
                    predictions: response.data.insights?.predictions || {}
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    timeRange: response.data.metadata?.timeRange || {},
                    dataPoints: response.data.metadata?.dataPoints || 0,
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(cacheKey, result, this.cacheTTL.timelineOverlay);
            
            console.log('✅ Timeline overlay fetched successfully:', {
                events: result.timeline.events.length,
                correlations: result.correlations.significantCorrelations.length,
                anomalies: result.performance.anomalies.length,
                insights: result.insights.keyInfluencers.length
            });
            
            return result;
            
        } catch (error) {
            this.recordError('timeline_overlay', error);
            console.error('❌ Timeline overlay fetch failed:', error);
            throw new Error(`Timeline overlay fetch failed: ${error.message}`);
        }
    }

    async getIterationROI(filters = {}) {
        // 🔐 Fetch message iteration ROI analysis
        try {
            console.log('🔄 Fetching iteration ROI analysis...', {
                filterCount: Object.keys(filters).length,
                iterationType: filters.iterationType || 'all'
            });
            
            // Calculate improvement metrics server-side
            const sanitizedFilters = this.sanitizeFilters ? this.sanitizeFilterData(filters) : filters;
            
            const payload = {
                filters: sanitizedFilters,
                requestType: 'iteration_roi',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                options: {
                    includeBeforeAfter: filters.includeComparison !== false,
                    includeROICalculation: filters.includeROI !== false,
                    costModel: filters.costModel || 'time_based',
                    roiMetrics: filters.roiMetrics || ['performance_improvement', 'time_investment', 'cost_benefit'],
                    minIterations: filters.minIterations || 2,
                    confidenceLevel: filters.confidenceLevel || 0.95
                }
            };
            
            // Check cache
            const cacheKey = this.generateCacheKey('iterationROI', payload);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📋 Returning cached iteration ROI data');
                return cached;
            }
            
            // Track regeneration impact and costs
            const response = await this.makeAnalyticsRequest(this.endpoints.iterationROI, payload);
            
            if (!response.success) {
                throw new Error(response.error || 'Iteration ROI fetch failed');
            }
            
            // Return ROI analysis with recommendations
            const result = {
                success: true,
                iterations: {
                    total: response.data.iterations?.total || 0,
                    successful: response.data.iterations?.successful || 0,
                    successRate: response.data.iterations?.successRate || 0,
                    averageIterations: response.data.iterations?.average || 0
                },
                roi: {
                    overall: response.data.roi?.overall || 0,
                    byIteration: response.data.roi?.byIteration || [],
                    costBenefit: response.data.roi?.costBenefit || {},
                    paybackPeriod: response.data.roi?.paybackPeriod || 0
                },
                performance: {
                    improvements: response.data.performance?.improvements || {},
                    beforeAfter: response.data.performance?.beforeAfter || [],
                    significantChanges: response.data.performance?.significantChanges || [],
                    trendAnalysis: response.data.performance?.trends || {}
                },
                insights: {
                    bestPractices: response.data.insights?.bestPractices || [],
                    commonPatterns: response.data.insights?.commonPatterns || [],
                    recommendations: response.data.insights?.recommendations || [],
                    optimization: response.data.insights?.optimization || []
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    analysisMethod: response.data.metadata?.analysisMethod || 'comparative',
                    dataRange: response.data.metadata?.dataRange || {},
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(cacheKey, result, this.cacheTTL.iterationROI);
            
            console.log('✅ Iteration ROI fetched successfully:', {
                totalIterations: result.iterations.total,
                overallROI: `${(result.roi.overall * 100).toFixed(2)}%`,
                successRate: `${(result.iterations.successRate * 100).toFixed(2)}%`,
                recommendations: result.insights.recommendations.length
            });
            
            return result;
            
        } catch (error) {
            this.recordError('iteration_roi', error);
            console.error('❌ Iteration ROI fetch failed:', error);
            throw new Error(`Iteration ROI fetch failed: ${error.message}`);
        }
    }

    async getTeamImpact(filters = {}) {
        // 🔐 Fetch team performance analytics
        try {
            console.log('👥 Fetching team impact analytics...', {
                filterCount: Object.keys(filters).length,
                teamSize: filters.teamMembers?.length || 'all'
            });
            
            // Analyze individual contributor metrics
            const sanitizedFilters = this.sanitizeFilters ? this.sanitizeFilterData(filters) : filters;
            
            const payload = {
                filters: sanitizedFilters,
                requestType: 'team_impact',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                options: {
                    includeIndividualMetrics: filters.includeIndividual !== false,
                    includeClaudeUtilization: filters.includeClaudeUsage !== false,
                    includeCoachingInsights: filters.includeCoaching !== false,
                    teamMetrics: filters.teamMetrics || ['performance', 'improvement', 'claude_adoption'],
                    rankingCriteria: filters.rankingCriteria || 'overall_performance',
                    anonymizeData: filters.anonymize !== false
                }
            };
            
            // Check cache
            const cacheKey = this.generateCacheKey('teamImpact', payload);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📋 Returning cached team impact data');
                return cached;
            }
            
            // Track Claude utilization and improvements
            const response = await this.makeAnalyticsRequest(this.endpoints.teamImpact, payload);
            
            if (!response.success) {
                throw new Error(response.error || 'Team impact fetch failed');
            }
            
            // Return team rankings and coaching insights
            const result = {
                success: true,
                team: {
                    size: response.data.team?.size || 0,
                    averagePerformance: response.data.team?.averagePerformance || 0,
                    totalImprovements: response.data.team?.totalImprovements || 0,
                    claudeAdoptionRate: response.data.team?.claudeAdoptionRate || 0
                },
                individuals: {
                    rankings: response.data.individuals?.rankings || [],
                    performances: response.data.individuals?.performances || {},
                    improvements: response.data.individuals?.improvements || {},
                    claudeUsage: response.data.individuals?.claudeUsage || {}
                },
                coaching: {
                    opportunities: response.data.coaching?.opportunities || [],
                    recommendations: response.data.coaching?.recommendations || [],
                    skillGaps: response.data.coaching?.skillGaps || [],
                    bestPractices: response.data.coaching?.bestPractices || []
                },
                insights: {
                    topPerformers: response.data.insights?.topPerformers || [],
                    improvementAreas: response.data.insights?.improvementAreas || [],
                    teamTrends: response.data.insights?.teamTrends || {},
                    successFactors: response.data.insights?.successFactors || []
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    analysisDepth: response.data.metadata?.analysisDepth || 'standard',
                    anonymized: payload.options.anonymizeData,
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(cacheKey, result, this.cacheTTL.teamImpact);
            
            console.log('✅ Team impact fetched successfully:', {
                teamSize: result.team.size,
                averagePerformance: result.team.averagePerformance,
                claudeAdoption: `${(result.team.claudeAdoptionRate * 100).toFixed(2)}%`,
                coachingOpportunities: result.coaching.opportunities.length
            });
            
            return result;
            
        } catch (error) {
            this.recordError('team_impact', error);
            console.error('❌ Team impact fetch failed:', error);
            throw new Error(`Team impact fetch failed: ${error.message}`);
        }
    }

    async getCRMComparison(filters = {}) {
        // 🔐 Fetch CRM performance comparison
        try {
            console.log('🏆 Fetching CRM comparison analytics...', {
                filterCount: Object.keys(filters).length,
                crmSystems: filters.crmSystems?.length || 'all'
            });
            
            // Compare win rates across CRM systems
            const sanitizedFilters = this.sanitizeFilters ? this.sanitizeFilterData(filters) : filters;
            
            const payload = {
                filters: sanitizedFilters,
                requestType: 'crm_comparison',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                options: {
                    includeWinRates: filters.includeWinRates !== false,
                    includeQualityScores: filters.includeQuality !== false,
                    includeConsistencyMetrics: filters.includeConsistency !== false,
                    comparisonMetrics: filters.metrics || ['win_rate', 'lead_quality', 'response_time', 'conversion_rate'],
                    normalizationMethod: filters.normalization || 'by_volume',
                    minSampleSize: filters.minSample || 20
                }
            };
            
            // Check cache
            const cacheKey = this.generateCacheKey('crmComparison', payload);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📋 Returning cached CRM comparison data');
                return cached;
            }
            
            // Calculate quality and consistency scores
            const response = await this.makeAnalyticsRequest(this.endpoints.crmComparison, payload);
            
            if (!response.success) {
                throw new Error(response.error || 'CRM comparison fetch failed');
            }
            
            // Return CRM rankings with insights
            const result = {
                success: true,
                crms: {
                    total: response.data.crms?.total || 0,
                    compared: response.data.crms?.compared || 0,
                    rankings: response.data.crms?.rankings || [],
                    metadata: response.data.crms?.metadata || {}
                },
                performance: {
                    winRates: response.data.performance?.winRates || {},
                    qualityScores: response.data.performance?.qualityScores || {},
                    consistencyMetrics: response.data.performance?.consistencyMetrics || {},
                    benchmarks: response.data.performance?.benchmarks || {}
                },
               comparison: {
                    topPerformer: response.data.comparison?.topPerformer || null,
                    worstPerformer: response.data.comparison?.worstPerformer || null,
                    significantDifferences: response.data.comparison?.significantDifferences || [],
                    relativeDifferences: response.data.comparison?.relativeDifferences || {}
                },
                insights: {
                    recommendations: response.data.insights?.recommendations || [],
                    opportunities: response.data.insights?.opportunities || [],
                    bestPractices: response.data.insights?.bestPractices || [],
                    riskFactors: response.data.insights?.riskFactors || []
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    comparisonMethod: response.data.metadata?.comparisonMethod || 'statistical',
                    dataRange: response.data.metadata?.dataRange || {},
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(cacheKey, result, this.cacheTTL.crmComparison);
            
            console.log('✅ CRM comparison fetched successfully:', {
                crmsCompared: result.crms.compared,
                topPerformer: result.comparison.topPerformer?.name || 'none',
                significantDiffs: result.comparison.significantDifferences.length,
                recommendations: result.insights.recommendations.length
            });
            
            return result;
            
        } catch (error) {
            this.recordError('crm_comparison', error);
            console.error('❌ CRM comparison fetch failed:', error);
            throw new Error(`CRM comparison fetch failed: ${error.message}`);
        }
    }

    async getClaudeGuidanceHistory(filters = {}) {
        // 🔐 Fetch Claude guidance tracking
        try {
            console.log('🤖 Fetching Claude guidance history...', {
                filterCount: Object.keys(filters).length,
                timeframe: filters.timeframe || 'default'
            });
            
            // Track advice implementation and outcomes
            const sanitizedFilters = this.sanitizeFilters ? this.sanitizeFilterData(filters) : filters;
            
            const payload = {
                filters: sanitizedFilters,
                requestType: 'claude_guidance_history',
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                options: {
                    includeImplementationTracking: filters.includeImplementation !== false,
                    includeROIAnalysis: filters.includeROI !== false,
                    includeAdviceEffectiveness: filters.includeEffectiveness !== false,
                    guidanceTypes: filters.guidanceTypes || ['recommendations', 'optimizations', 'insights'],
                    implementationStatus: filters.implementationStatus || 'all',
                    outcomeMetrics: filters.outcomeMetrics || ['performance_change', 'success_rate']
                }
            };
            
            // Check cache
            const cacheKey = this.generateCacheKey('claudeGuidance', payload);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📋 Returning cached Claude guidance data');
                return cached;
            }
            
            // Calculate guidance ROI and effectiveness
            const response = await this.makeAnalyticsRequest(this.endpoints.claudeGuidance, payload);
            
            if (!response.success) {
                throw new Error(response.error || 'Claude guidance history fetch failed');
            }
            
            // Return guidance history with impact analysis
            const result = {
                success: true,
                guidance: {
                    total: response.data.guidance?.total || 0,
                    implemented: response.data.guidance?.implemented || 0,
                    pending: response.data.guidance?.pending || 0,
                    successful: response.data.guidance?.successful || 0
                },
                history: {
                    timeline: response.data.history?.timeline || [],
                    byType: response.data.history?.byType || {},
                    byOutcome: response.data.history?.byOutcome || {},
                    recent: response.data.history?.recent || []
                },
                effectiveness: {
                    overallSuccessRate: response.data.effectiveness?.overallSuccessRate || 0,
                    byGuidanceType: response.data.effectiveness?.byGuidanceType || {},
                    implementationRate: response.data.effectiveness?.implementationRate || 0,
                    averageImpact: response.data.effectiveness?.averageImpact || 0
                },
                roi: {
                    totalROI: response.data.roi?.totalROI || 0,
                    averageROI: response.data.roi?.averageROI || 0,
                    bestPerforming: response.data.roi?.bestPerforming || [],
                    costBenefit: response.data.roi?.costBenefit || {}
                },
                insights: {
                    patterns: response.data.insights?.patterns || [],
                    successFactors: response.data.insights?.successFactors || [],
                    improvements: response.data.insights?.improvements || [],
                    recommendations: response.data.insights?.recommendations || []
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    analysisMethod: response.data.metadata?.analysisMethod || 'impact_correlation',
                    dataRange: response.data.metadata?.dataRange || {},
                    requestId: payload.requestId,
                    cached: false
                }
            };
            
            // Cache the result
            this.setCache(cacheKey, result, this.cacheTTL.claudeGuidance);
            
            console.log('✅ Claude guidance history fetched successfully:', {
                totalGuidance: result.guidance.total,
                implementationRate: `${(result.effectiveness.implementationRate * 100).toFixed(2)}%`,
                successRate: `${(result.effectiveness.overallSuccessRate * 100).toFixed(2)}%`,
                totalROI: `${(result.roi.totalROI * 100).toFixed(2)}%`
            });
            
            return result;
            
        } catch (error) {
            this.recordError('claude_guidance', error);
            console.error('❌ Claude guidance history fetch failed:', error);
            throw new Error(`Claude guidance history fetch failed: ${error.message}`);
        }
    }

        fixRequestPayload(payload, endpoint) {
        // Add missing requestType based on endpoint
        const endpointToRequestType = {
            '/analytics/cta-effectiveness': 'cta_effectiveness',
            '/analytics/feedback-signals': 'feedback_signals', 
            '/analytics/crm-performance': 'crm_performance',
            '/analytics/timeline': 'timeline_data',
            '/analytics/team-impact': 'team_impact',
            '/analytics/iteration-roi': 'iteration_roi',
            '/analytics/claude-history': 'claude_guidance',
            '/analytics/message-matrix': 'message_matrix',
            '/analytics/lead-conversion': 'lead_conversion'
        };
        
        return {
            ...payload,
            requestType: payload.requestType || endpointToRequestType[endpoint] || 'analytics_request',
            timestamp: payload.timestamp || new Date().toISOString(),
            version: payload.version || 'v1.0'
        };
    }
    
    // ⭐ UPDATE YOUR makeAnalyticsRequest METHOD
    async makeAnalyticsRequest(endpoint, payload) {
        const requestId = payload.requestId || this.generateRequestId();
        const startTime = Date.now();
        
        try {
            // ⭐ FIX: Auto-add missing fields using the class method
            const fixedPayload = this.fixRequestPayload(payload, endpoint);
            
            console.log('🔐 Making secure analytics request...', {
                endpoint: endpoint.split('/').pop(),
                requestId,
                payloadSize: JSON.stringify(fixedPayload).length,
                hasRequestType: !!fixedPayload.requestType
            });
            
            // Check for active duplicate requests
            const requestKey = this.generateRequestKey(endpoint, fixedPayload);
            if (this.activeRequests.has(requestKey)) {
                console.log('🔄 Deduplicating identical analytics request');
                throw new Error('Identical request already in progress');
            }
            
            // Rate limiting check
            if (this.activeRequests.size >= this.maxConcurrentRequests) {
                console.log('⏳ Max concurrent requests reached, queuing...');
                await this.waitForRequestSlot();
            }
            
            // Mark request as active
            this.activeRequests.add(requestKey);
            
            // Get authentication
            const session = window.OsliraApp?.session;
            if (!session?.access_token) {
                throw new Error('Authentication required for analytics request');
            }
            
            // Determine target URL
            const targetUrl = this.getCurrentEndpointUrl();
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'X-Request-ID': requestId,
                'X-Client-Version': 'v1.3.0',
                'X-Timestamp': new Date().toISOString(),
                'X-Analytics-Request': 'true',
                'X-User-ID': session.user?.id || '',
                'X-Business-ID': window.OsliraApp?.business?.id || ''
            };
            
            // Add compression headers if enabled
            if (this.compressionEnabled) {
                headers['Accept-Encoding'] = 'gzip, deflate, br';
                headers['X-Compression'] = 'enabled';
            }
            
            // Validate request payload
            if (this.dataValidation) {
                this.validateRequestPayload(fixedPayload);
            }
            
            // Make the request with retry logic
            let lastError;
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    const response = await this.attemptAnalyticsRequest(
                        `${targetUrl}${endpoint}`, 
                        fixedPayload, 
                        headers, 
                        attempt
                    );
                    
                    // Success - clean up and return
                    this.activeRequests.delete(requestKey);
                    
                    const duration = Date.now() - startTime;
                    console.log(`✅ Analytics request completed: ${endpoint.split('/').pop()} (${duration}ms)`);
                    
                    return response;
                    
                } catch (error) {
                    lastError = error;
                    
                    if (attempt < this.retryAttempts) {
                        const delay = this.calculateRetryDelay(attempt);
                        console.warn(`⚠️ Analytics request failed, attempt ${attempt}/${this.retryAttempts}: ${error.message}`);
                        console.log(`⏳ Retrying analytics request in ${delay}ms...`);
                        await this.delay(delay);
                    }
                }
            }
            
            // All attempts failed
            this.activeRequests.delete(requestKey);
            const duration = Date.now() - startTime;
            
            console.error('❌ Analytics request failed:', {
                requestId,
                endpoint,
                error: lastError.message,
                duration: `${duration}ms`
            });
            
            throw new Error(`Failed to fetch: ${lastError.message}`);
            
        } catch (error) {
            // Record error for analytics
            this.recordError('analytics_request', error);
            throw error;
        }
    }

    async attemptAnalyticsRequest(url, payload, headers) {
        // Single analytics request attempt with timeout and optimization
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            // Optimize payload if enabled
            const optimizedPayload = this.dataOptimization ? 
                this.optimizePayload(payload) : payload;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(optimizedPayload),
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
                    error: errorData.error || errorData.message || `Request failed with status ${response.status}`,
                    statusCode: response.status,
                    headers: Object.fromEntries(response.headers.entries())
                };
            }
            
            // Parse and validate response
            const data = await response.json();
            
            // Validate response structure
            if (this.dataValidation) {
                this.validateResponseData(data);
            }
            
            return {
                success: true,
                data: data,
                statusCode: response.status,
                headers: Object.fromEntries(response.headers.entries())
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.performanceMetrics.timeoutRequests++;
                return {
                    success: false,
                    error: `Analytics request timeout after ${this.timeout}ms`,
                    timeout: true
                };
            }
            
            return {
                success: false,
                error: error.message || 'Analytics request network error',
                networkError: true
            };
        }
    }

    // Helper and utility methods
    generateRequestId() {
        return 'analytics_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateCacheKey(type, payload) {
        const keyData = {
            type: type,
            filters: payload.filters,
            options: payload.options,
            userId: window.OsliraApp?.user?.id
        };
        
        const keyString = JSON.stringify(keyData);
        return btoa(keyString).substr(0, 32);
    }

    generateRequestKey(endpoint, payload) {
        return `${endpoint}_${this.generateCacheKey('request', payload)}`;
    }

    getCurrentEndpointUrl() {
        return this.currentEndpoint === 'backup' && this.backupUrl ? this.backupUrl : this.baseUrl;
    }

    getBackupEndpointUrl() {
        return this.backupUrl || this.baseUrl;
    }

    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.cacheMissCount++;
            return null;
        }
        
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            this.cacheMissCount++;
            return null;
        }
        
        this.cacheHitCount++;
        return item.data;
    }

    setCache(key, data, ttl) {
        // Manage cache size
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        });
    }

    sanitizeFilterData(filters) {
        // Sanitize filter data for security
        const sanitized = { ...filters };
        
        // Remove potentially dangerous filter values
        const dangerousPatterns = [
            /script/i, /javascript/i, /eval/i, /function/i,
            /select.*from/i, /union.*select/i, /drop.*table/i,
            /<.*>/g, /&.*?;/g
        ];
        
        const sanitizeValue = (value) => {
            if (typeof value === 'string') {
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(value)) {
                        console.warn('🚫 Dangerous filter value detected and sanitized');
                        return value.replace(pattern, '');
                    }
                }
            }
            return value;
        };
        
        // Recursively sanitize all filter values
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitizeObject(obj[key]);
                    } else {
                        obj[key] = sanitizeValue(obj[key]);
                    }
                }
            }
        };
        
        sanitizeObject(sanitized);
        return sanitized;
    }

    validateRequestPayload(payload) {
        // Validate request payload structure
        const requiredFields = ['requestType', 'timestamp', 'requestId'];
        
        for (const field of requiredFields) {
            if (!payload[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Validate payload size
        const payloadSize = JSON.stringify(payload).length;
        if (payloadSize > 1024 * 1024) { // 1MB limit
            throw new Error(`Payload too large: ${(payloadSize / 1024 / 1024).toFixed(2)}MB`);
        }
    }

    validateResponseData(data) {
        // Validate response data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response data structure');
        }
        
        // Check for required response fields
        // This would be customized based on your API response structure
    }

    optimizePayload(payload) {
        // Optimize payload for transmission
        const optimized = { ...payload };
        
        // Remove null/undefined values
        const removeEmpty = (obj) => {
            for (const key in obj) {
                if (obj[key] === null || obj[key] === undefined) {
                    delete obj[key];
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    removeEmpty(obj[key]);
                }
            }
        };
        
        removeEmpty(optimized);
        return optimized;
    }

    async makeSecureRequest(endpoint, options = {}) {
    try {
        const {
            method = 'GET',
            data = null,
            headers = {},
            timeout = this.config?.timeout || 60000  // ADD DEFAULT TIMEOUT
        } = options;

        const url = `${this.baseUrl}${endpoint}`;
        
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        // Use fetch with timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        if (data && (method === 'POST' || method === 'PUT')) {
            requestOptions.body = JSON.stringify(data);
        }

        requestOptions.signal = controller.signal;

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('❌ [SecureAnalyticsService] Request failed:', error);
        throw error;
    }
}

    updateRequestStats(endpoint, duration, success, responseSize) {
        this.requestStats.totalRequests++;
        
        if (success) {
            this.requestStats.successfulRequests++;
            this.requestStats.averageLatency = 
                (this.requestStats.averageLatency + duration) / 2;
            this.requestStats.dataTransferred += responseSize;
        } else {
            this.requestStats.failedRequests++;
        }
        
        // Update endpoint-specific stats
        const endpointKey = endpoint.split('/').pop();
        if (!this.requestStats.requestsByEndpoint[endpointKey]) {
            this.requestStats.requestsByEndpoint[endpointKey] = 0;
        }
        this.requestStats.requestsByEndpoint[endpointKey]++;
        
        // Update cache hit rate
        const totalCacheRequests = this.cacheHitCount + this.cacheMissCount;
        this.requestStats.cacheHitRate = totalCacheRequests > 0 ? 
            this.cacheHitCount / totalCacheRequests : 0;
    }

    recordError(requestType, error) {
        const errorType = error.message.includes('timeout') ? 'timeout' :
                         error.message.includes('network') ? 'network' :
                         error.message.includes('auth') ? 'authentication' : 'unknown';
        
        if (!this.requestStats.errorsByType[errorType]) {
            this.requestStats.errorsByType[errorType] = 0;
        }
        this.requestStats.errorsByType[errorType]++;
        
        // Log error for audit if enabled
        if (this.auditLogging) {
            this.logError(requestType, error);
        }
    }

    logError(requestType, error) {
        // Log error for audit trail
        const errorLog = {
            timestamp: new Date().toISOString(),
            requestType: requestType,
            error: error.message,
            userId: window.OsliraApp?.user?.id,
            sessionId: window.OsliraApp?.session?.access_token?.substr(0, 10) + '...',
            userAgent: navigator.userAgent
        };
        
        console.error('📝 Analytics error logged:', errorLog);
        
        // Send to external logging service if configured
        if (window.OsliraApp?.logError) {
            window.OsliraApp.logError('analytics_service', errorLog);
        }
    }

    async waitForRequestSlot() {
        // Wait for an available request slot
        return new Promise((resolve) => {
            const checkSlot = () => {
                if (this.activeRequests.size < this.maxConcurrentRequests) {
                    resolve();
                } else {
                    setTimeout(checkSlot, 100);
                }
            };
            checkSlot();
        });
    }

    // Add to public/analytics/services/secureAnalyticsService.js
async getFeedbackSignalData(filters = {}) {
    try {
        return await this.makeAnalyticsRequest('/analytics/feedback-signals', {
            filters,
            requestId: this.generateRequestId(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Feedback signal data fetch failed:', error);
        throw error;
    }
}

async getCRMPerformanceData(filters = {}) {
    try {
        return await this.makeAnalyticsRequest('/analytics/crm-performance', {
            filters,
            requestId: this.generateRequestId(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ CRM performance data fetch failed:', error);
        throw error;
    }
}

async getTimelineData(filters = {}) {
    try {
        return await this.makeAnalyticsRequest('/analytics/timeline', {
            filters,
            requestId: this.generateRequestId(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Timeline data fetch failed:', error);
        throw error;
    }
}

    startCacheManagement() {
        // Start background cache cleanup
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 60000); // Every minute
    }

    cleanupExpiredCache() {
        const now = Date.now();
        let removedCount = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            console.log(`🧹 Cleaned ${removedCount} expired analytics cache entries`);
        }
    }

    startPerformanceMonitoring() {
        // Start background performance monitoring
        setInterval(() => {
            this.logPerformanceMetrics();
        }, 300000); // Every 5 minutes
    }

    logPerformanceMetrics() {
        const metrics = {
            ...this.requestStats,
            ...this.performanceMetrics,
            cacheSize: this.cache.size,
            activeRequests: this.activeRequests.size,
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Analytics performance metrics:', metrics);
        
        // Send to analytics if configured
        if (window.OsliraApp?.logMetrics) {
            window.OsliraApp.logMetrics('analytics_service', metrics);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public utility methods
    getStats() {
        return {
            requests: { ...this.requestStats },
            performance: { ...this.performanceMetrics },
            cache: {
                size: this.cache.size,
                hitRate: this.requestStats.cacheHitRate,
                maxSize: this.maxCacheSize
            },
            activeRequests: this.activeRequests.size
        };
    }

    clearCache() {
        this.cache.clear();
        this.cacheHitCount = 0;
        this.cacheMissCount = 0;
        console.log('🗑️ Analytics cache cleared');
    }

    destroy() {
        // Clean up analytics service resources
        this.cache.clear();
        this.activeRequests.clear();
        this.requestQueue.clear();
        
        if (this.websocketConnection) {
            this.websocketConnection.close();
        }
        
        console.log('🗑️ SecureAnalyticsService destroyed');
    }
} 
export { SecureAnalyticsService };
