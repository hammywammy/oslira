/**
     * Calculate overall success rate
     * @returns {string}
     */
    calculateOverallSuccessRate() {
        if (!this.state.data?.ctas) return '0.0';
        
        const ctas = Object.values(this.state.data.ctas);
        const totalOccurrences = ctas.reduce((sum, cta) => sum + cta.occurrences, 0);
        const totalSuccesses = ctas.reduce((sum, cta) => sum + cta.responses, 0);
        
        return totalOccurrences > 0 ? ((totalSuccesses / totalOccurrences) * 100).toFixed(1) : '0.0';
    }
    
    /**
     * Get settings form
     * @returns {string}
     */
    getSettingsForm() {
        return `
            <div class="settings-form">
                <div class="setting-group">
                    <label for="cta-min-occurrences">Minimum Occurrences</label>
                    <input type="number" id="cta-min-occurrences" name="minOccurrences" 
                           value="${this.state.settings.minOccurrences}" min="1" max="10">
                    <div class="setting-description">Minimum uses required for CTA analysis</div>
                </div>
                
                <div class="setting-group">
                    <label for="cta-sort-default">Default Sort Order</label>
                    <select id="cta-sort-default" name="sortBy">
                        <option value="successRate" ${this.state.settings.sortBy === 'successRate' ? 'selected' : ''}>Success Rate</option>
                        <option value="conversionRate" ${this.state.settings.sortBy === 'conversionRate' ? 'selected' : ''}>Conversion Rate</option>
                        <option value="occurrences" ${this.state.settings.sortBy === 'occurrences' ? 'selected' : ''}>Usage Frequency</option>
                        <option value="recent" ${this.state.settings.sortBy === 'recent' ? 'selected' : ''}>Most Recent</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" name="showReusageData" ${this.state.settings.showReusageData ? 'checked' : ''}>
                        Show Reusage Analytics
                    </label>
                    <div class="setting-description">Display CTA reuse patterns and effectiveness</div>
                </div>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" name="trackClickThroughs" ${this.state.settings.trackClickThroughs ? 'checked' : ''}>
                        Track Click-Through Rates
                    </label>
                    <div class="setting-description">Monitor CTA click performance where available</div>
                </div>
                
                <button type="submit" class="primary-btn">Save Settings</button>
            </div>
        `;
    }
}

// ===== MODULE 4: FEEDBACK SIGNAL EXPLORER =====
class FeedbackSignalExplorer extends AnalyticsModule {
    constructor(analytics) {
        super(analytics, {
            id: ANALYTICS_CONFIG.MODULES.FEEDBACK,
            title: '🔍 Feedback Signal Explorer',
            refreshInterval: ANALYTICS_CONFIG.REFRESH_INTERVALS.MODERATE,
            defaultSettings: {
                clusterThreshold: 0.7,
                maxClusters: 8,
                showSentimentTrends: true,
                includeComments: true,
                minClusterSize: 3
            }
        });
        
        this.feedbackData = null;
        this.clusters = null;
        this.sentimentTrends = null;
        this.aiInsights = null;
    }
    
    /**
     * Load feedback data and perform analysis
     */
    async loadData() {
        try {
            const filters = this.getFilters();
            const feedback = await this.analytics.dataService.getFeedback(filters);
            
            if (!feedback || feedback.length === 0) {
                this.state.data = null;
                return;
            }
            
            // Process feedback into analyzable format
            this.feedbackData = this.processFeedbackData(feedback);
            
            // Perform clustering analysis
            this.clusters = await this.clusterFeedback(this.feedbackData);
            
            // Analyze sentiment trends
            this.sentimentTrends = this.analyzeSentimentTrends(this.feedbackData);
            
            // Generate AI insights
            this.aiInsights = await this.generateAIInsights(this.clusters, this.sentimentTrends);
            
            this.state.data = {
                feedback: this.feedbackData,
                clusters: this.clusters,
                trends: this.sentimentTrends,
                insights: this.aiInsights,
                totalFeedback: feedback.length,
                lastUpdated: new Date()
            };
            
            this.cacheData('feedback', this.state.data);
            
        } catch (error) {
            console.error('Error loading feedback data:', error);
            throw error;
        }
    }
    
    /**
     * Process raw feedback data
     * @param {Array} feedback 
     * @returns {Array}
     */
    processFeedbackData(feedback) {
        return feedback.map(item => ({
            id: item.id,
            messageId: item.message_id,
            rating: item.rating || 0,
            sentiment: item.sentiment || this.detectSentiment(item.comment),
            category: item.category || this.categorizeComment(item.comment),
            comment: item.comment || '',
            tags: item.tags || this.extractTags(item.comment),
            createdAt: new Date(item.created_at),
            keywords: this.extractKeywords(item.comment),
            urgency: this.detectUrgency(item.comment),
            actionable: this.isActionable(item.comment)
        }));
    }
    
    /**
     * Detect sentiment from comment text
     * @param {string} comment 
     * @returns {string}
     */
    detectSentiment(comment) {
        if (!comment) return 'neutral';
        
        const positive = ['great', 'excellent', 'perfect', 'amazing', 'love', 'awesome', 'good', 'nice', 'helpful'];
        const negative = ['bad', 'terrible', 'awful', 'hate', 'poor', 'wrong', 'issue', 'problem', 'error'];
        
        const lowerComment = comment.toLowerCase();
        const positiveCount = positive.filter(word => lowerComment.includes(word)).length;
        const negativeCount = negative.filter(word => lowerComment.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }
    
    /**
     * Categorize feedback comment
     * @param {string} comment 
     * @returns {string}
     */
    categorizeComment(comment) {
        if (!comment) return 'general';
        
        const lower = comment.toLowerCase();
        
        if (lower.includes('tone') || lower.includes('voice') || lower.includes('style')) {
            return 'tone';
        }
        if (lower.includes('length') || lower.includes('short') || lower.includes('long')) {
            return 'length';
        }
        if (lower.includes('timing') || lower.includes('time') || lower.includes('when')) {
            return 'timing';
        }
        if (lower.includes('relevant') || lower.includes('personal') || lower.includes('specific')) {
            return 'relevance';
        }
        if (lower.includes('cta') || lower.includes('call') || lower.includes('action')) {
            return 'cta';
        }
        if (lower.includes('clear') || lower.includes('confus') || lower.includes('understand')) {
            return 'clarity';
        }
        
        return 'general';
    }
    
    /**
     * Extract tags from comment
     * @param {string} comment 
     * @returns {Array}
     */
    extractTags(comment) {
        if (!comment) return [];
        
        const tagPatterns = [
            /too (formal|casual|long|short)/gi,
            /(unclear|confusing|perfect|great)/gi,
            /(needs? more|could be|should be)/gi
        ];
        
        const tags = [];
        tagPatterns.forEach(pattern => {
            const matches = comment.match(pattern);
            if (matches) {
                tags.push(...matches.map(m => m.toLowerCase()));
            }
        });
        
        return [...new Set(tags)]; // Remove duplicates
    }
    
    /**
     * Extract keywords from comment
     * @param {string} comment 
     * @returns {Array}
     */
    extractKeywords(comment) {
        if (!comment) return [];
        
        // Simple keyword extraction - remove stop words and get meaningful terms
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'this', 'that', 'it'];
        
        return comment
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .slice(0, 10); // Limit to top 10 keywords
    }
    
    /**
     * Detect urgency in feedback
     * @param {string} comment 
     * @returns {string}
     */
    detectUrgency(comment) {
        if (!comment) return 'low';
        
        const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'important', 'must', 'need to'];
        const lower = comment.toLowerCase();
        
        if (urgentWords.some(word => lower.includes(word))) {
            return 'high';
        }
        
        if (lower.includes('soon') || lower.includes('quickly')) {
            return 'medium';
        }
        
        return 'low';
    }
    
    /**
     * Check if feedback is actionable
     * @param {string} comment 
     * @returns {boolean}
     */
    isActionable(comment) {
        if (!comment) return false;
        
        const actionablePatterns = [
            /should|could|might|needs?/i,
            /suggest|recommend|consider/i,
            /change|improve|fix|update/i,
            /more|less|better|different/i
        ];
        
        return actionablePatterns.some(pattern => pattern.test(comment));
    }
    
    /**
     * Cluster feedback using simple similarity analysis
     * @param {Array} feedbackData 
     * @returns {Promise<Array>}
     */
    async clusterFeedback(feedbackData) {
        const clusters = [];
        const processed = new Set();
        
        for (const feedback of feedbackData) {
            if (processed.has(feedback.id)) continue;
            
            const cluster = {
                id: `cluster_${clusters.length + 1}`,
                theme: '',
                sentiment: feedback.sentiment,
                category: feedback.category,
                feedback: [feedback],
                keywords: [...feedback.keywords],
                avgRating: feedback.rating,
                urgency: feedback.urgency,
                actionableCount: feedback.actionable ? 1 : 0,
                size: 1
            };
            
            processed.add(feedback.id);
            
            // Find similar feedback items
            for (const otherFeedback of feedbackData) {
                if (processed.has(otherFeedback.id)) continue;
                
                const similarity = this.calculateSimilarity(feedback, otherFeedback);
                
                if (similarity >= this.state.settings.clusterThreshold) {
                    cluster.feedback.push(otherFeedback);
                    cluster.keywords = [...new Set([...cluster.keywords, ...otherFeedback.keywords])];
                    cluster.avgRating = (cluster.avgRating * cluster.size + otherFeedback.rating) / (cluster.size + 1);
                    cluster.size++;
                    
                    if (otherFeedback.actionable) {
                        cluster.actionableCount++;
                    }
                    
                    processed.add(otherFeedback.id);
                }
            }
            
            // Only include clusters that meet minimum size
            if (cluster.size >= this.state.settings.minClusterSize) {
                cluster.theme = this.generateClusterTheme(cluster);
                clusters.push(cluster);
            }
        }
        
        // Sort clusters by size and importance
        return clusters
            .sort((a, b) => b.size - a.size)
            .slice(0, this.state.settings.maxClusters);
    }
    
    /**
     * Calculate similarity between two feedback items
     * @param {object} feedback1 
     * @param {object} feedback2 
     * @returns {number}
     */
    calculateSimilarity(feedback1, feedback2) {
        let similarity = 0;
        
        // Category similarity
        if (feedback1.category === feedback2.category) {
            similarity += 0.3;
        }
        
        // Sentiment similarity
        if (feedback1.sentiment === feedback2.sentiment) {
            similarity += 0.2;
        }
        
        // Keyword overlap
        const commonKeywords = feedback1.keywords.filter(k => feedback2.keywords.includes(k));
        const keywordSimilarity = commonKeywords.length / Math.max(feedback1.keywords.length, feedback2.keywords.length);
        similarity += keywordSimilarity * 0.3;
        
        // Rating similarity (within 1 point)
        if (Math.abs(feedback1.rating - feedback2.rating) <= 1) {
            similarity += 0.2;
        }
        
        return Math.min(similarity, 1.0);
    }
    
    /**
     * Generate theme for cluster
     * @param {object} cluster 
     * @returns {string}
     */
    generateClusterTheme(cluster) {
        const topKeywords = this.getTopKeywords(cluster.keywords, 3);
        const category = cluster.category;
        const sentiment = cluster.sentiment;
        
        // Generate descriptive theme
        let theme = `${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} feedback about `;
        
        if (category !== 'general') {
            theme += `${category} `;
        }
        
        if (topKeywords.length > 0) {
            theme += `(${topKeywords.join(', ')})`;
        }
        
        return theme;
    }
    
    /**
     * Get top keywords by frequency
     * @param {Array} keywords 
     * @param {number} count 
     * @returns {Array}
     */
    getTopKeywords(keywords, count = 5) {
        const frequency = {};
        keywords.forEach(keyword => {
            frequency[keyword] = (frequency[keyword] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, count)
            .map(([keyword]) => keyword);
    }
    
    /**
     * Analyze sentiment trends over time
     * @param {Array} feedbackData 
     * @returns {object}
     */
    analyzeSentimentTrends(feedbackData) {
        const trends = {
            daily: {},
            weekly: {},
            overall: {
                positive: 0,
                negative: 0,
                neutral: 0
            },
            categories: {}
        };
        
        feedbackData.forEach(feedback => {
            const date = feedback.createdAt;
            const dayKey = date.toISOString().split('T')[0];
            const weekKey = this.getWeekKey(date);
            
            // Daily trends
            if (!trends.daily[dayKey]) {
                trends.daily[dayKey] = { positive: 0, negative: 0, neutral: 0 };
            }
            trends.daily[dayKey][feedback.sentiment]++;
            
            // Weekly trends
            if (!trends.weekly[weekKey]) {
                trends.weekly[weekKey] = { positive: 0, negative: 0, neutral: 0 };
            }
            trends.weekly[weekKey][feedback.sentiment]++;
            
            // Overall sentiment
            trends.overall[feedback.sentiment]++;
            
            // Category sentiment
            if (!trends.categories[feedback.category]) {
                trends.categories[feedback.category] = { positive: 0, negative: 0, neutral: 0 };
            }
            trends.categories[feedback.category][feedback.sentiment]++;
        });
        
        return trends;
    }
    
    /**
     * Get week key for grouping
     * @param {Date} date 
     * @returns {string}
     */
    getWeekKey(date) {
        const year = date.getFullYear();
        const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        return `${year}-W${week}`;
    }
    
    /**
     * Generate AI insights from clusters and trends
     * @param {Array} clusters 
     * @param {object} trends 
     * @returns {Promise<Array>}
     */
    async generateAIInsights(clusters, trends) {
        const insights = [];
        
        // Cluster-based insights
        if (clusters.length > 0) {
            const largestCluster = clusters[0];
            insights.push({
                type: 'cluster',
                priority: 'high',
                title: 'Most Common Feedback Theme',
                message: `${largestCluster.size} feedback items focus on: ${largestCluster.theme}`,
                cluster: largestCluster,
                recommendation: this.generateClusterRecommendation(largestCluster)
            });
            
            // Actionable cluster
            const actionableCluster = clusters
                .filter(c => c.actionableCount > 0)
                .sort((a, b) => (b.actionableCount / b.size) - (a.actionableCount / a.size))[0];
            
            if (actionableCluster && actionableCluster !== largestCluster) {
                insights.push({
                    type: 'actionable',
                    priority: 'high',
                    title: 'Actionable Feedback Identified',
                    message: `${actionableCluster.actionableCount}/${actionableCluster.size} items in this cluster suggest specific improvements`,
                    cluster: actionableCluster,
                    recommendation: this.generateClusterRecommendation(actionableCluster)
                });
            }
        }
        
        // Sentiment trend insights
        const totalFeedback = trends.overall.positive + trends.overall.negative + trends.overall.neutral;
        if (totalFeedback > 0) {
            const positiveRate = trends.overall.positive / totalFeedback;
            const negativeRate = trends.overall.negative / totalFeedback;
            
            if (positiveRate > 0.6) {
                insights.push({
                    type: 'positive_trend',
                    priority: 'medium',
                    title: 'Positive Feedback Dominance',
                    message: `${(positiveRate * 100).toFixed(1)}% of feedback is positive`,
                    recommendation: 'Your messaging strategy is working well. Focus on scaling successful approaches.'
                });
            } else if (negativeRate > 0.4) {
                insights.push({
                    type: 'negative_trend',
                    priority: 'high',
                    title: 'High Negative Feedback Rate',
                    message: `${(negativeRate * 100).toFixed(1)}% of feedback is negative`,
                    recommendation: 'Review and address the most common negative feedback themes immediately.'
                });
            }
        }
        
        // Category insights
        const categoryEntries = Object.entries(trends.categories);
        if (categoryEntries.length > 0) {
            const problematicCategory = categoryEntries
                .map(([category, sentiment]) => ({
                    category,
                    negativeRate: sentiment.negative / (sentiment.positive + sentiment.negative + sentiment.neutral)
                }))
                .filter(c => c.negativeRate > 0.5)
                .sort((a, b) => b.negativeRate - a.negativeRate)[0];
            
            if (problematicCategory) {
                insights.push({
                    type: 'category_issue',
                    priority: 'medium',
                    title: `${problematicCategory.category} Issues Detected`,
                    message: `${(problematicCategory.negativeRate * 100).toFixed(1)}% negative feedback in ${problematicCategory.category} category`,
                    recommendation: `Focus improvement efforts on ${problematicCategory.category}-related aspects of your messaging.`
                });
            }
        }
        
        return insights.slice(0, 5); // Limit to top 5 insights
    }
    
    /**
     * Generate recommendation for cluster
     * @param {object} cluster 
     * @returns {string}
     */
    generateClusterRecommendation(cluster) {
        const actionableRate = cluster.actionableCount / cluster.size;
        
        if (cluster.sentiment === 'negative' && actionableRate > 0.5) {
            return `Address the specific issues mentioned in this cluster. ${cluster.actionableCount} items provide clear direction for improvements.`;
        }
        
        if (cluster.sentiment === 'positive') {
            return `This represents a successful pattern. Analyze what makes these messages effective and replicate the approach.`;
        }
        
        if (cluster.category === 'tone') {
            return 'Review and adjust your messaging tone based on the feedback patterns in this cluster.';
        }
        
        if (cluster.category === 'timing') {
            return 'Consider optimizing your outreach timing based on the patterns identified.';
        }
        
        return 'Review the feedback items in this cluster for common patterns and improvement opportunities.';
    }
    
    /**
     * Render the feedback explorer module
     */
    render() {
        const container = this.domElements.get('content');
        if (!container) return;
        
        if (!this.state.data) {
            this.analytics.uiManager.showModuleEmptyState(this.id, 'No feedback data available for analysis');
            return;
        }
        
        const { clusters, trends, insights } = this.state.data;
        
        container.innerHTML = `
            <div class="feedback-explorer-container">
                <div class="feedback-clusters" id="feedback-clusters">
                    ${this.renderClusters(clusters)}
                </div>
                <div class="feedback-trends" id="feedback-trends-chart">
                    <canvas id="sentiment-trends-chart" width="400" height="200"></canvas>
                </div>
                <div class="feedback-insights" id="feedback-ai-insights">
                    ${this.renderInsights(insights)}
                </div>
            </div>
        `;
        
        // Render sentiment trends chart
        setTimeout(() => {
            this.renderSentimentTrendsChart();
        }, 100);
    }
    
    /**
     * Render feedback clusters
     * @param {Array} clusters 
     * @returns {string}
     */
    renderClusters(clusters) {
        if (!clusters || clusters.length === 0) {
            return '<div class="no-clusters">No feedback clusters identified</div>';
        }
        
        return `
            <div class="clusters-header">
                <h4>📊 Feedback Themes (${clusters.length} clusters)</h4>
            </div>
            <div class="clusters-list">
                ${clusters.map((cluster, index) => `
                    <div class="cluster-item ${cluster.sentiment}" data-cluster-id="${cluster.id}">
                        <div class="cluster-header">
                            <div class="cluster-rank">#${index + 1}</div>
                            <div class="cluster-info">
                                <h5>${cluster.theme}</h5>
                                <div class="cluster-meta">
                                    <span class="cluster-size">${cluster.size} items</span>
                                    <span class="cluster-sentiment ${cluster.sentiment}">${cluster.sentiment}</span>
                                    <span class="cluster-rating">⭐ ${cluster.avgRating.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="cluster-keywords">
                            ${cluster.keywords.slice(0, 5).map(keyword => 
                                `<span class="keyword-tag">${keyword}</span>`
                            ).join('')}
                        </div>
                        ${cluster.actionableCount > 0 ? `
                            <div class="cluster-actionable">
                                💡 ${cluster.actionableCount} actionable item(s)
                            </div>
                        ` : ''}
                        <button class="cluster-expand" onclick="analytics.getModule('${this.id}').expandCluster('${cluster.id}')">
                            View Details
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render AI insights
     * @param {Array} insights 
     * @returns {string}
     */
    renderInsights(insights) {
        if (!insights || insights.length === 0) {
            return '<div class="no-insights">No AI insights available yet</div>';
        }
        
        return `
            <div class="insights-header">
                <h4>🤖 AI-Generated Insights</h4>
            </div>
            <div class="insights-list">
                ${insights.map(insight => `
                    <div class="insight-item ${insight.type} ${insight.priority}">
                        <div class="insight-header">
                            <h5>${insight.title}</h5>
                            <span class="priority-badge ${insight.priority}">${insight.priority}</span>
                        </div>
                        <p class="insight-message">${insight.message}</p>
                        <div class="insight-recommendation">
                            💡 <strong>Recommendation:</strong> ${insight.recommendation}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render sentiment trends chart
     */
    renderSentimentTrendsChart() {
        if (!this.sentimentTrends) return;
        
        const canvas = document.getElementById('sentiment-trends-chart');
        if (!canvas) return;
        
        // Prepare chart data from daily trends
        const dates = Object.keys(this.sentimentTrends.daily).sort();
        const positiveData = dates.map(date => this.sentimentTrends.daily[date].positive);
        const negativeData = dates.map(date => this.sentimentTrends.daily[date].negative);
        const neutralData = dates.map(date => this.sentimentTrends.daily[date].neutral);
        
        const chartData = {
            labels: dates.map(date => new Date(date).toLocaleDateString()),
            datasets: [
                {
                    label: 'Positive',
                    data: positiveData,
                    color: ANALYTICS_CONFIG.CHART_COLORS.PERFORMANCE.HIGH,
                    fill: false
                },
                {
                    label: 'Negative',
                    data: negativeData,
                    color: ANALYTICS_CONFIG.CHART_COLORS.PERFORMANCE.LOW,
                    fill: false
                },
                {
                    label: 'Neutral',
                    data: neutralData,
                    color: ANALYTICS_CONFIG.CHART_COLORS.PERFORMANCE.MEDIUM,
                    fill: false
                }
            ]
        };
        
        this.createChart('sentiment-trends-chart', 'line', chartData, {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Feedback Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sentiment Trends Over Time'
                }
            }
        });
    }
    
    /**
     * Expand cluster details
     * @param {string} clusterId 
     */
    expandCluster(clusterId) {
        const cluster = this.clusters?.find(c => c.id === clusterId);
        if (!cluster) {
            console.error('Cluster not found:', clusterId);
            return;
        }
        
        this.showClusterDetailsModal(cluster);
    }
    
    /**
     * Show cluster details modal
     * @param {object} cluster 
     */
    showClusterDetailsModal(cluster) {
        const modalContent = `
            <div class="cluster-details-modal">
                <h3>Feedback Cluster: ${cluster.theme}</h3>
                
                <div class="cluster-overview">
                    <div class="cluster-stats">
                        <div class="stat">
                            <span class="stat-label">Size:</span>
                            <span class="stat-value">${cluster.size} items</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Sentiment:</span>
                            <span class="stat-value ${cluster.sentiment}">${cluster.sentiment}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Avg Rating:</span>
                            <span class="stat-value">${cluster.avgRating.toFixed(1)}/5</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Actionable:</span>
                            <span class="stat-value">${cluster.actionableCount}/${cluster.size}</span>
                        </div>
                    </div>
                </div>
                
                <div class="cluster-keywords-section">
                    <h4>Key Themes</h4>
                    <div class="keyword-cloud">
                        ${cluster.keywords.map(keyword => 
                            `<span class="keyword-tag large">${keyword}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="cluster-feedback-list">
                    <h4>Feedback Items (${cluster.feedback.length})</h4>
                                                    <div class="feedback-items">
                        ${cluster.feedback.slice(0, 10).map(feedback => `
                            <div class="feedback-item ${feedback.sentiment}">
                                <div class="feedback-rating">⭐ ${feedback.rating}</div>
                                <div class="feedback-comment">"${feedback.comment}"</div>
                                <div class="feedback-meta">
                                    <span class="feedback-category">${feedback.category}</span>
                                    <span class="feedback-date">${feedback.createdAt.toLocaleDateString()}</span>
                                    ${feedback.actionable ? '<span class="actionable-tag">💡 Actionable</span>' : ''}
                                </div>
                            </div>
                        `).join('')}
                        ${cluster.feedback.length > 10 ? `
                            <div class="more-items">
                                ... and ${cluster.feedback.length - 10} more items
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">×</button>
                ${modalContent}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close handler
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    /**
     * Get expanded content
     * @returns {string}
     */
    getExpandedContent() {
        return `
            <div class="expanded-feedback-container">
                <div class="feedback-overview">
                    <div class="overview-stats">
                        <div class="stat-card">
                            <h4>Total Feedback</h4>
                            <div class="stat-value">${this.state.data?.totalFeedback || 0}</div>
                        </div>
                        <div class="stat-card">
                            <h4>Clusters Found</h4>
                            <div class="stat-value">${this.state.data?.clusters?.length || 0}</div>
                        </div>
                        <div class="stat-card">
                            <h4>Positive Rate</h4>
                            <div class="stat-value">${this.calculatePositiveRate()}%</div>
                        </div>
                    </div>
                </div>
                <div class="expanded-feedback-visualization" id="expanded-feedback-chart"></div>
                <div class="expanded-feedback-analysis" id="expanded-feedback-analysis"></div>
            </div>
        `;
    }
    
    /**
     * Calculate positive feedback rate
     * @returns {string}
     */
    calculatePositiveRate() {
        if (!this.sentimentTrends?.overall) return '0.0';
        
        const { positive, negative, neutral } = this.sentimentTrends.overall;
        const total = positive + negative + neutral;
        
        return total > 0 ? ((positive / total) * 100).toFixed(1) : '0.0';
    }
    
    /**
     * Get settings form
     * @returns {string}
     */
    getSettingsForm() {
        return `
            <div class="settings-form">
                <div class="setting-group">
                    <label for="feedback-cluster-threshold">Clustering Threshold</label>
                    <input type="range" id="feedback-cluster-threshold" name="clusterThreshold" 
                           min="0.5" max="1.0" step="0.1" value="${this.state.settings.clusterThreshold}">
                    <div class="setting-description">Higher values create fewer, more focused clusters</div>
                </div>
                
                <div class="setting-group">
                    <label for="feedback-max-clusters">Maximum Clusters</label>
                    <input type="number" id="feedback-max-clusters" name="maxClusters" 
                           value="${this.state.settings.maxClusters}" min="3" max="15">
                    <div class="setting-description">Maximum number of clusters to display</div>
                </div>
                
                <div class="setting-group">
                    <label for="feedback-min-cluster-size">Minimum Cluster Size</label>
                    <input type="number" id="feedback-min-cluster-size" name="minClusterSize" 
                           value="${this.state.settings.minClusterSize}" min="2" max="10">
                    <div class="setting-description">Minimum feedback items required per cluster</div>
                </div>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" name="showSentimentTrends" ${this.state.settings.showSentimentTrends ? 'checked' : ''}>
                        Show Sentiment Trends
                    </label>
                    <div class="setting-description">Display sentiment analysis over time</div>
                </div>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" name="includeComments" ${this.state.settings.includeComments ? 'checked' : ''}>
                        Include Comment Analysis
                    </label>
                    <div class="setting-description">Analyze comment text for themes and keywords</div>
                </div>
                
                <button type="submit" class="primary-btn">Save Settings</button>
            </div>
        `;
    }
}

// ===== EXPORT SERVICE =====
class ExportService {
    constructor(analytics) {
        this.analytics = analytics;
        this.exportFormats = {
            pdf: this.exportToPDF.bind(this),
            csv: this.exportToCSV.bind(this),
            json: this.exportToJSON.bind(this),
            xlsx: this.exportToExcel.bind(this)
        };
    }
    
    /**
     * Show export modal
     */
    showExportModal() {
        const modal = this.analytics.uiManager.getModal('export');
        if (!modal) {
            console.error('Export modal not found');
            return;
        }
        
        // Update module checkboxes
        const moduleCheckboxes = modal.querySelector('#export-module-selection');
        if (moduleCheckboxes) {
            const modules = Array.from(this.analytics.modules.keys());
            moduleCheckboxes.innerHTML = modules.map(moduleId => {
                const module = this.analytics.modules.get(moduleId);
                return `
                    <div class="checkbox-item">
                        <input type="checkbox" id="export-${moduleId}" name="modules" value="${moduleId}" checked>
                        <label for="export-${moduleId}">${module.title}</label>
                    </div>
                `;
            }).join('');
        }
        
        this.analytics.uiManager.showModal('export');
    }
    
    /**
     * Generate export based on configuration
     * @param {object} config 
     */
    async generateExport(config) {
        const { format, modules, filters } = config;
        
        if (!this.exportFormats[format]) {
            throw new Error(`Unsupported export format: ${format}`);
        }
        
        this.analytics.uiManager.showLoading('Generating export...');
        
        try {
            // Collect data from selected modules
            const exportData = await this.collectExportData(modules, filters);
            
            // Generate export using selected format
            await this.exportFormats[format](exportData, config);
            
            window.OsliraApp.showMessage('Export generated successfully', 'success');
            
        } catch (error) {
            console.error('Export generation failed:', error);
            window.OsliraApp.showMessage('Export generation failed: ' + error.message, 'error');
        } finally {
            this.analytics.uiManager.hideLoading();
        }
    }
    
    /**
     * Collect data from selected modules
     * @param {Array} moduleIds 
     * @param {object} filters 
     * @returns {Promise<object>}
     */
    async collectExportData(moduleIds, filters) {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                filters,
                generatedBy: 'Oslira Analytics Engine',
                version: '1.0.0'
            },
            modules: {}
        };
        
        for (const moduleId of moduleIds) {
            const module = this.analytics.modules.get(moduleId);
            if (module && module.state.data) {
                exportData.modules[moduleId] = {
                    title: module.title,
                    data: this.sanitizeModuleData(module.state.data),
                    lastUpdated: module.state.lastUpdated
                };
            }
        }
        
        return exportData;
    }
    
    /**
     * Sanitize module data for export
     * @param {object} data 
     * @returns {object}
     */
    sanitizeModuleData(data) {
        // Remove circular references and large objects
        return JSON.parse(JSON.stringify(data, (key, value) => {
            if (key === 'chartInstances' || key === 'domElements') {
                return undefined;
            }
            return value;
        }));
    }
    
    /**
     * Export to PDF format
     * @param {object} data 
     * @param {object} config 
     */
    async exportToPDF(data, config) {
        // For now, generate a simple text-based PDF report
        // In production, you would use a PDF library like jsPDF
        
        const reportContent = this.generateTextReport(data);
        const blob = new Blob([reportContent], { type: 'text/plain' });
        
        this.downloadFile(blob, `analytics-report-${this.getDateString()}.txt`);
    }
    
    /**
     * Export to CSV format
     * @param {object} data 
     * @param {object} config 
     */
    async exportToCSV(data, config) {
        const csvContent = this.generateCSVReport(data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        
        this.downloadFile(blob, `analytics-data-${this.getDateString()}.csv`);
    }
    
    /**
     * Export to JSON format
     * @param {object} data 
     * @param {object} config 
     */
    async exportToJSON(data, config) {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        
        this.downloadFile(blob, `analytics-export-${this.getDateString()}.json`);
    }
    
    /**
     * Export to Excel format
     * @param {object} data 
     * @param {object} config 
     */
    async exportToExcel(data, config) {
        // For now, export as CSV (which Excel can open)
        // In production, you would use a library like SheetJS
        await this.exportToCSV(data, config);
    }
    
    /**
     * Generate text report
     * @param {object} data 
     * @returns {string}
     */
    generateTextReport(data) {
        let report = `OSLIRA ANALYTICS REPORT\n`;
        report += `Generated: ${new Date(data.metadata.exportDate).toLocaleString()}\n`;
        report += `Filters: ${JSON.stringify(data.metadata.filters)}\n\n`;
        
        Object.entries(data.modules).forEach(([moduleId, moduleData]) => {
            report += `\n=== ${moduleData.title.toUpperCase()} ===\n`;
            report += `Last Updated: ${new Date(moduleData.lastUpdated).toLocaleString()}\n`;
            
            // Add module-specific summary
            if (moduleData.data.totalLeads) {
                report += `Total Leads: ${moduleData.data.totalLeads}\n`;
            }
            if (moduleData.data.totalMessages) {
                report += `Total Messages: ${moduleData.data.totalMessages}\n`;
            }
            if (moduleData.data.totalCTAs) {
                report += `Total CTAs: ${moduleData.data.totalCTAs}\n`;
            }
            if (moduleData.data.totalFeedback) {
                report += `Total Feedback: ${moduleData.data.totalFeedback}\n`;
            }
            
            report += '\n';
        });
        
        return report;
    }
    
    /**
     * Generate CSV report
     * @param {object} data 
     * @returns {string}
     */
    generateCSVReport(data) {
        let csv = 'Module,Metric,Value,Last Updated\n';
        
        Object.entries(data.modules).forEach(([moduleId, moduleData]) => {
            const title = moduleData.title;
            const date = new Date(moduleData.lastUpdated).toISOString();
            
            // Extract key metrics from each module
            if (moduleData.data.totalLeads) {
                csv += `"${title}","Total Leads",${moduleData.data.totalLeads},"${date}"\n`;
            }
            if (moduleData.data.totalMessages) {
                csv += `"${title}","Total Messages",${moduleData.data.totalMessages},"${date}"\n`;
            }
            if (moduleData.data.totalCTAs) {
                csv += `"${title}","Total CTAs",${moduleData.data.totalCTAs},"${date}"\n`;
            }
            if (moduleData.data.totalFeedback) {
                csv += `"${title}","Total Feedback",${moduleData.data.totalFeedback},"${date}"\n`;
            }
        });
        
        return csv;
    }
    
    /**
     * Download file
     * @param {Blob} blob 
     * @param {string} filename 
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Get formatted date string
     * @returns {string}
     */
    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
}

// ===== GLOBAL INITIALIZATION =====

// Create global analytics instance
let analytics = null;

/**
 * Initialize analytics when DOM is ready
 */
async function initializeAnalytics() {
    try {
        console.log('🚀 Starting Analytics initialization...');
        
        // Create analytics engine instance
        analytics = new AnalyticsEngine();
        
        // Make it globally available
        window.analytics = analytics;
        
        // Initialize the engine
        await analytics.initialize();
        
        console.log('✅ Analytics initialization complete');
        
    } catch (error) {
        console.error('❌ Analytics initialization failed:', error);
        
        // Show error state
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: var(--bg-gradient); font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: var(--shadow-xl); max-width: 500px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="color: var(--error); margin-bottom: 16px;">Analytics Engine Error</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">
                        Failed to initialize analytics: ${error.message}
                    </p>
                    <button onclick="window.location.reload()" 
                            style="background: var(--primary-blue); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Copy CTA text to clipboard
 * @param {string} text 
 */
window.copyCTAText = async function(text) {
    try {
        await navigator.clipboard.writeText(text);
        window.OsliraApp.showMessage('CTA text copied to clipboard', 'success');
    } catch (error) {
        console.error('Failed to copy text:', error);
        window.OsliraApp.showMessage('Failed to copy text', 'error');
    }
};

// ===== INITIALIZATION =====

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnalytics);
} else {
    // DOM already ready
    initializeAnalytics();
}

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', () => {
    if (analytics) {
        if (document.hidden) {
            // Page hidden - pause non-critical operations
            analytics.trackEvent('page_hidden');
        } else {
            // Page visible - resume operations
            analytics.trackEvent('page_visible');
            
            // Refresh data if it's been a while
            const lastRefresh = analytics.state.lastRefresh;
            if (!lastRefresh || Date.now() - lastRefresh.getTime() > 300000) { // 5 minutes
                analytics.refreshAllData();
            }
        }
    }
});

// Handle browser beforeunload for cleanup
window.addEventListener('beforeunload', () => {
    if (analytics) {
        analytics.trackEvent('page_unload');
        analytics.destroy();
    }
});

console.log('📊 Analytics Engine loaded and ready for initialization');// ===== MODULE 3: CTA EFFECTIVENESS TRACKER =====
class CTAEffectivenessTracker extends AnalyticsModule {
    constructor(analytics) {
        super(analytics, {
            id: ANALYTICS_CONFIG.MODULES.CTA,
            title: '🎪 CTA Effectiveness Tracker',
            refreshInterval: ANALYTICS_CONFIG.REFRESH_INTERVALS.REAL_TIME,
            defaultSettings: {
                sortBy: 'engagement',
                showReusageData: true,
                minOccurrences: 3,
                trackClickThroughs: true
            }
        });
        
        this.ctaData = null;
        this.ctaAnalytics = null;
    }
    
    /**
     * Load CTA effectiveness data
     */
    async loadData() {
        try {
            const filters = this.getFilters();
            const [ctaLogs, messages] = await Promise.all([
                this.analytics.dataService.getCTAData(filters),
                this.analytics.dataService.getMessages(filters)
            ]);
            
            if (!ctaLogs || ctaLogs.length === 0) {
                this.state.data = null;
                return;
            }
            
            // Process CTA performance data
            this.ctaData = this.processCTAData(ctaLogs, messages);
            this.ctaAnalytics = this.analyzeCTAPerformance(this.ctaData);
            
            this.state.data = {
                ctas: this.ctaData,
                analytics: this.ctaAnalytics,
                totalCTAs: Object.keys(this.ctaData).length,
                totalInteractions: ctaLogs.length,
                lastUpdated: new Date()
            };
            
            this.cacheData('cta', this.state.data, ANALYTICS_CONFIG.CACHE_TTL.REAL_TIME);
            
        } catch (error) {
            console.error('Error loading CTA data:', error);
            throw error;
        }
    }
    
    /**
     * Process CTA logs and messages into performance data
     * @param {Array} ctaLogs 
     * @param {Array} messages 
     * @returns {object}
     */
    processCTAData(ctaLogs, messages) {
        const ctaData = {};
        const messageMap = new Map(messages.map(m => [m.id, m]));
        
        // Group CTA logs by CTA text
        ctaLogs.forEach(log => {
            const ctaText = this.normalizeCTAText(log.cta_text);
            const message = messageMap.get(log.message_id);
            
            if (!ctaData[ctaText]) {
                ctaData[ctaText] = {
                    text: ctaText,
                    category: this.categorizeCTA(ctaText),
                    occurrences: 0,
                    totalClicks: 0,
                    totalViews: 0,
                    conversions: 0,
                    responses: 0,
                    avgResponseTime: 0,
                    totalResponseTime: 0,
                    responseCount: 0,
                    leadTypes: {},
                    platforms: {},
                    recentPerformance: [],
                    lastUsed: null,
                    firstUsed: null,
                    successRate: 0,
                    clickThroughRate: 0,
                    conversionRate: 0,
                    avgFeedbackScore: 0,
                    totalFeedbackScore: 0,
                    feedbackCount: 0
                };
            }
            
            const cta = ctaData[ctaText];
            cta.occurrences++;
            
            // Track action types
            switch (log.action) {
                case 'click':
                    cta.totalClicks++;
                    break;
                case 'view':
                    cta.totalViews++;
                    break;
                case 'conversion':
                    cta.conversions++;
                    break;
            }
            
            // Track success and response data
            if (log.success) {
                cta.responses++;
                if (log.response_time) {
                    cta.totalResponseTime += log.response_time;
                    cta.responseCount++;
                }
            }
            
            // Track lead demographics
            if (message) {
                const leadType = message.lead_type || 'unknown';
                const platform = message.platform || 'unknown';
                
                cta.leadTypes[leadType] = (cta.leadTypes[leadType] || 0) + 1;
                cta.platforms[platform] = (cta.platforms[platform] || 0) + 1;
                
                // Add feedback score if available
                if (message.feedback_score) {
                    cta.totalFeedbackScore += message.feedback_score;
                    cta.feedbackCount++;
                }
            }
            
            // Track timestamps
            const logDate = new Date(log.created_at);
            if (!cta.firstUsed || logDate < cta.firstUsed) {
                cta.firstUsed = logDate;
            }
            if (!cta.lastUsed || logDate > cta.lastUsed) {
                cta.lastUsed = logDate;
            }
            
            // Add to recent performance (last 30 days)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            if (logDate >= thirtyDaysAgo) {
                cta.recentPerformance.push({
                    date: logDate,
                    action: log.action,
                    success: log.success,
                    responseTime: log.response_time
                });
            }
        });
        
        // Calculate derived metrics
        Object.values(ctaData).forEach(cta => {
            cta.successRate = cta.occurrences > 0 ? cta.responses / cta.occurrences : 0;
            cta.clickThroughRate = cta.totalViews > 0 ? cta.totalClicks / cta.totalViews : 0;
            cta.conversionRate = cta.totalClicks > 0 ? cta.conversions / cta.totalClicks : 0;
            cta.avgResponseTime = cta.responseCount > 0 ? cta.totalResponseTime / cta.responseCount : 0;
            cta.avgFeedbackScore = cta.feedbackCount > 0 ? cta.totalFeedbackScore / cta.feedbackCount : 0;
            
            // Calculate usage frequency
            if (cta.firstUsed && cta.lastUsed) {
                const daysDiff = (cta.lastUsed - cta.firstUsed) / (1000 * 60 * 60 * 24);
                cta.usageFrequency = daysDiff > 0 ? cta.occurrences / daysDiff : cta.occurrences;
            } else {
                cta.usageFrequency = 0;
            }
        });
        
        return ctaData;
    }
    
    /**
     * Normalize CTA text for grouping
     * @param {string} ctaText 
     * @returns {string}
     */
    normalizeCTAText(ctaText) {
        if (!ctaText) return 'Unknown CTA';
        
        // Remove extra whitespace and normalize case
        return ctaText.trim()
            .replace(/\s+/g, ' ')
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation for grouping
            .split(' ')
            .slice(0, 6) // Limit to first 6 words
            .join(' ');
    }
    
    /**
     * Categorize CTA by type
     * @param {string} ctaText 
     * @returns {string}
     */
    categorizeCTA(ctaText) {
        const lower = ctaText.toLowerCase();
        
        if (lower.includes('book') || lower.includes('schedule') || lower.includes('call')) {
            return 'meeting';
        }
        if (lower.includes('visit') || lower.includes('website') || lower.includes('check out')) {
            return 'website';
        }
        if (lower.includes('download') || lower.includes('get') || lower.includes('free')) {
            return 'download';
        }
        if (lower.includes('follow') || lower.includes('connect') || lower.includes('add')) {
            return 'social';
        }
        if (lower.includes('reply') || lower.includes('message') || lower.includes('dm')) {
            return 'direct_response';
        }
        if (lower.includes('buy') || lower.includes('purchase') || lower.includes('order')) {
            return 'purchase';
        }
        
        return 'other';
    }
    
    /**
     * Analyze CTA performance patterns
     * @param {object} ctaData 
     * @returns {object}
     */
    analyzeCTAPerformance(ctaData) {
        const ctas = Object.values(ctaData);
        const qualifiedCTAs = ctas.filter(cta => cta.occurrences >= this.state.settings.minOccurrences);
        
        const analytics = {
            topPerformers: [],
            worstPerformers: [],
            categoryAnalysis: {},
            reusageAnalysis: {},
            trendingCTAs: [],
            recommendations: []
        };
        
        if (qualifiedCTAs.length === 0) {
            return analytics;
        }
        
        // Sort by different metrics
        const bySuccessRate = [...qualifiedCTAs].sort((a, b) => b.successRate - a.successRate);
        const byConversionRate = [...qualifiedCTAs].sort((a, b) => b.conversionRate - a.conversionRate);
        const byUsageFrequency = [...qualifiedCTAs].sort((a, b) => b.usageFrequency - a.usageFrequency);
        
        // Top performers (top 20% by success rate)
        const topCount = Math.max(1, Math.ceil(qualifiedCTAs.length * 0.2));
        analytics.topPerformers = bySuccessRate.slice(0, topCount);
        
        // Worst performers (bottom 20% by success rate, but only if they have significant usage)
        const worstCandidates = bySuccessRate.slice(-topCount).filter(cta => cta.occurrences >= 5);
        analytics.worstPerformers = worstCandidates;
        
        // Category analysis
        const categories = {};
        qualifiedCTAs.forEach(cta => {
            if (!categories[cta.category]) {
                categories[cta.category] = {
                    count: 0,
                    totalOccurrences: 0,
                    totalSuccesses: 0,
                    totalConversions: 0,
                    avgSuccessRate: 0,
                    avgConversionRate: 0,
                    ctas: []
                };
            }
            
            const cat = categories[cta.category];
            cat.count++;
            cat.totalOccurrences += cta.occurrences;
            cat.totalSuccesses += cta.responses;
            cat.totalConversions += cta.conversions;
            cat.ctas.push(cta);
        });
        
        // Calculate category averages
        Object.values(categories).forEach(cat => {
            cat.avgSuccessRate = cat.totalOccurrences > 0 ? cat.totalSuccesses / cat.totalOccurrences : 0;
            cat.avgConversionRate = cat.totalSuccesses > 0 ? cat.totalConversions / cat.totalSuccesses : 0;
        });
        
        analytics.categoryAnalysis = categories;
        
        // Reusage analysis - CTAs used multiple times
        analytics.reusageAnalysis = {
            highReuse: qualifiedCTAs.filter(cta => cta.occurrences >= 10),
            moderateReuse: qualifiedCTAs.filter(cta => cta.occurrences >= 5 && cta.occurrences < 10),
            lowReuse: qualifiedCTAs.filter(cta => cta.occurrences < 5),
            reusageEffectiveness: this.analyzeReusageEffectiveness(qualifiedCTAs)
        };
        
        // Trending CTAs (recently used with good performance)
        const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        analytics.trendingCTAs = qualifiedCTAs
            .filter(cta => cta.lastUsed >= recentThreshold && cta.successRate > 0.1)
            .sort((a, b) => b.recentPerformance.length - a.recentPerformance.length)
            .slice(0, 5);
        
        // Generate recommendations
        analytics.recommendations = this.generateCTARecommendations(analytics);
        
        return analytics;
    }
    
    /**
     * Analyze relationship between reusage and effectiveness
     * @param {Array} ctas 
     * @returns {object}
     */
    analyzeReusageEffectiveness(ctas) {
        const buckets = {
            low: ctas.filter(cta => cta.occurrences < 5),
            medium: ctas.filter(cta => cta.occurrences >= 5 && cta.occurrences < 15),
            high: ctas.filter(cta => cta.occurrences >= 15)
        };
        
        const analysis = {};
        
        Object.entries(buckets).forEach(([level, ctaList]) => {
            if (ctaList.length > 0) {
                const avgSuccess = ctaList.reduce((sum, cta) => sum + cta.successRate, 0) / ctaList.length;
                const avgConversion = ctaList.reduce((sum, cta) => sum + cta.conversionRate, 0) / ctaList.length;
                
                analysis[level] = {
                    count: ctaList.length,
                    avgSuccessRate: avgSuccess,
                    avgConversionRate: avgConversion,
                    totalUsage: ctaList.reduce((sum, cta) => sum + cta.occurrences, 0)
                };
            }
        });
        
        return analysis;
    }
    
    /**
     * Generate CTA recommendations
     * @param {object} analytics 
     * @returns {Array}
     */
    generateCTARecommendations(analytics) {
        const recommendations = [];
        
        // Recommend scaling top performers
        if (analytics.topPerformers.length > 0) {
            const topCTA = analytics.topPerformers[0];
            recommendations.push({
                type: 'scale',
                priority: 'high',
                title: 'Scale Your Best CTA',
                description: `"${topCTA.text}" shows ${(topCTA.successRate * 100).toFixed(1)}% success rate`,
                action: 'Use this CTA in more campaigns',
                data: topCTA
            });
        }
        
        // Recommend replacing poor performers
        if (analytics.worstPerformers.length > 0) {
            const worstCTA = analytics.worstPerformers[0];
            recommendations.push({
                type: 'replace',
                priority: 'medium',
                title: 'Replace Underperforming CTA',
                description: `"${worstCTA.text}" only achieves ${(worstCTA.successRate * 100).toFixed(1)}% success rate`,
                action: 'Consider alternatives or retire this CTA',
                data: worstCTA
            });
        }
        
        // Category-based recommendations
        const bestCategory = Object.entries(analytics.categoryAnalysis)
            .sort(([,a], [,b]) => b.avgSuccessRate - a.avgSuccessRate)[0];
        
        if (bestCategory) {
            recommendations.push({
                type: 'category_focus',
                priority: 'medium',
                title: 'Focus on High-Performing Category',
                description: `${bestCategory[0]} CTAs perform best with ${(bestCategory[1].avgSuccessRate * 100).toFixed(1)}% success rate`,
                action: `Create more ${bestCategory[0]}-type CTAs`,
                data: bestCategory[1]
            });
        }
        
        // Reusage recommendations
        if (analytics.reusageAnalysis.reusageEffectiveness.high) {
            const highReuse = analytics.reusageAnalysis.reusageEffectiveness.high;
            if (highReuse.avgSuccessRate > 0.15) {
                recommendations.push({
                    type: 'reuse_validation',
                    priority: 'low',
                    title: 'High Reuse CTAs Performing Well',
                    description: `Frequently used CTAs maintain ${(highReuse.avgSuccessRate * 100).toFixed(1)}% success rate`,
                    action: 'Continue using proven CTAs while testing new variations',
                    data: highReuse
                });
            }
        }
        
        return recommendations.slice(0, 4); // Limit to top 4 recommendations
    }
    
    /**
     * Render the CTA tracker module
     */
    render() {
        const container = this.domElements.get('content');
        if (!container) return;
        
        if (!this.state.data) {
            this.analytics.uiManager.showModuleEmptyState(this.id, 'No CTA performance data available');
            return;
        }
        
        const { ctas, analytics } = this.state.data;
        
        container.innerHTML = `
            <div class="cta-tracker-container">
                <div class="cta-filters">
                    <select id="cta-sort-by" onchange="this.dispatchEvent(new CustomEvent('cta-sort-change', {detail: this.value}))">
                        <option value="successRate">By Success Rate</option>
                        <option value="conversionRate">By Conversion Rate</option>
                        <option value="occurrences">By Usage Frequency</option>
                        <option value="recent">By Recent Performance</option>
                    </select>
                    <select id="cta-category-filter" onchange="this.dispatchEvent(new CustomEvent('cta-category-change', {detail: this.value}))">
                        <option value="all">All Categories</option>
                        <option value="meeting">Meeting CTAs</option>
                        <option value="website">Website CTAs</option>
                        <option value="download">Download CTAs</option>
                        <option value="social">Social CTAs</option>
                        <option value="direct_response">Direct Response</option>
                        <option value="purchase">Purchase CTAs</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="cta-list" id="cta-effectiveness-list">
                    ${this.renderCTAList(Object.values(ctas))}
                </div>
                <div class="cta-recommendations" id="cta-recommendations">
                    ${this.renderRecommendations(analytics.recommendations)}
                </div>
            </div>
        `;
        
        // Set up event listeners
        this.setupCTAEventListeners();
    }
    
    /**
     * Render CTA list
     * @param {Array} ctas 
     * @returns {string}
     */
    renderCTAList(ctas) {
        if (!ctas || ctas.length === 0) {
            return '<div class="no-ctas">No CTAs found matching current filters</div>';
        }
        
        const sortBy = this.state.settings.sortBy;
        const sortedCTAs = this.sortCTAs(ctas, sortBy);
        
        return sortedCTAs.map(cta => `
            <div class="cta-item" data-cta-id="${encodeURIComponent(cta.text)}">
                <div class="cta-main">
                    <div class="cta-text">
                        <h5>"${cta.text}"</h5>
                        <div class="cta-meta">
                            <span class="cta-category">${cta.category}</span>
                            <span class="cta-usage">${cta.occurrences} uses</span>
                            <span class="cta-last-used">Last used: ${this.formatDate(cta.lastUsed)}</span>
                        </div>
                    </div>
                    <div class="cta-metrics">
                        <div class="metric">
                            <span class="metric-value ${this.getPerformanceClass(cta.successRate)}">${(cta.successRate * 100).toFixed(1)}%</span>
                            <span class="metric-label">Success Rate</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${(cta.conversionRate * 100).toFixed(1)}%</span>
                            <span class="metric-label">Conversion</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${cta.avgResponseTime.toFixed(1)}h</span>
                            <span class="metric-label">Avg Response</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${cta.avgFeedbackScore.toFixed(1)}</span>
                            <span class="metric-label">Feedback</span>
                        </div>
                    </div>
                </div>
                <div class="cta-actions">
                    <button class="btn-small" onclick="dashboard.copyCTAText('${cta.text.replace(/'/g, "\\'")}')">📋 Copy</button>
                    <button class="btn-small" onclick="analytics.getModule('${this.id}').viewCTADetails('${encodeURIComponent(cta.text)}')">📊 Details</button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Sort CTAs by specified criteria
     * @param {Array} ctas 
     * @param {string} sortBy 
     * @returns {Array}
     */
    sortCTAs(ctas, sortBy) {
        return [...ctas].sort((a, b) => {
            switch (sortBy) {
                case 'successRate':
                    return b.successRate - a.successRate;
                case 'conversionRate':
                    return b.conversionRate - a.conversionRate;
                case 'occurrences':
                    return b.occurrences - a.occurrences;
                case 'recent':
                    return new Date(b.lastUsed) - new Date(a.lastUsed);
                default:
                    return b.successRate - a.successRate;
            }
        });
    }
    
    /**
     * Get performance class for styling
     * @param {number} rate 
     * @returns {string}
     */
    getPerformanceClass(rate) {
        if (rate >= 0.15) return 'performance-high';
        if (rate >= 0.05) return 'performance-medium';
        return 'performance-low';
    }
    
    /**
     * Render recommendations
     * @param {Array} recommendations 
     * @returns {string}
     */
    renderRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return '<div class="no-recommendations">No recommendations available yet</div>';
        }
        
        return `
            <div class="recommendations-header">
                <h4>🎯 CTA Optimization Recommendations</h4>
            </div>
            <div class="recommendations-list">
                ${recommendations.map(rec => `
                    <div class="recommendation-item ${rec.type} ${rec.priority}">
                        <div class="recommendation-header">
                            <h5>${rec.title}</h5>
                            <span class="priority-badge ${rec.priority}">${rec.priority}</span>
                        </div>
                        <p class="recommendation-description">${rec.description}</p>
                        <div class="recommendation-action">
                            💡 <strong>Action:</strong> ${rec.action}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Set up CTA event listeners
     */
    setupCTAEventListeners() {
        // Sort change handler
        document.addEventListener('cta-sort-change', (e) => {
            this.state.settings.sortBy = e.detail;
            this.updateCTAList();
        });
        
        // Category filter handler
        document.addEventListener('cta-category-change', (e) => {
            this.updateCTAList(e.detail);
        });
    }
    
    /**
     * Update CTA list with filters
     * @param {string} categoryFilter 
     */
    updateCTAList(categoryFilter = 'all') {
        if (!this.state.data) return;
        
        let ctas = Object.values(this.state.data.ctas);
        
        // Apply category filter
        if (categoryFilter !== 'all') {
            ctas = ctas.filter(cta => cta.category === categoryFilter);
        }
        
        // Re-render list
        const listContainer = document.getElementById('cta-effectiveness-list');
        if (listContainer) {
            listContainer.innerHTML = this.renderCTAList(ctas);
        }
    }
    
    /**
     * View CTA details
     * @param {string} ctaText 
     */
    viewCTADetails(ctaText) {
        const decodedText = decodeURIComponent(ctaText);
        const cta = this.state.data?.ctas[decodedText];
        
        if (!cta) {
            console.error('CTA not found:', decodedText);
            return;
        }
        
        // Show detailed modal or expand inline
        this.showCTADetailsModal(cta);
    }
    
    /**
     * Show CTA details modal
     * @param {object} cta 
     */
    showCTADetailsModal(cta) {
        const modalContent = `
            <div class="cta-details-modal">
                <h3>CTA Performance Details</h3>
                <div class="cta-overview">
                    <h4>"${cta.text}"</h4>
                    <div class="cta-stats-grid">
                        <div class="stat">
                            <span class="stat-value">${cta.occurrences}</span>
                            <span class="stat-label">Total Uses</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${(cta.successRate * 100).toFixed(1)}%</span>
                            <span class="stat-label">Success Rate</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${(cta.conversionRate * 100).toFixed(1)}%</span>
                            <span class="stat-label">Conversion Rate</span>
                        </div>
                    </div>
                </div>
                
                <div class="cta-breakdown">
                    <h5>Performance by Lead Type</h5>
                    <div class="breakdown-grid">
                        ${Object.entries(cta.leadTypes).map(([type, count]) => `
                            <div class="breakdown-item">
                                <span class="breakdown-label">${type}:</span>
                                <span class="breakdown-value">${count} uses</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <h5>Performance by Platform</h5>
                    <div class="breakdown-grid">
                        ${Object.entries(cta.platforms).map(([platform, count]) => `
                            <div class="breakdown-item">
                                <span class="breakdown-label">${platform}:</span>
                                <span class="breakdown-value">${count} uses</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="cta-timeline">
                    <h5>Usage Timeline</h5>
                    <p>First used: ${this.formatDate(cta.firstUsed)}</p>
                    <p>Last used: ${this.formatDate(cta.lastUsed)}</p>
                    <p>Usage frequency: ${cta.usageFrequency.toFixed(2)} times per day</p>
                </div>
            </div>
        `;
        
        // Create and show modal (simplified implementation)
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">×</button>
                ${modalContent}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close handler
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    /**
     * Format date for display
     * @param {Date} date 
     * @returns {string}
     */
    formatDate(date) {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString();
    }
    
    /**
     * Get expanded content
     * @returns {string}
     */
    getExpandedContent() {
        return `
            <div class="expanded-cta-container">
                <div class="cta-overview-stats">
                    <div class="stats-row">
                        <div class="stat-card">
                            <h4>Total CTAs</h4>
                            <div class="stat-value">${this.state.data?.totalCTAs || 0}</div>
                        </div>
                        <div class="stat-card">
                            <h4>Total Interactions</h4>
                            <div class="stat-value">${this.state.data?.totalInteractions || 0}</div>
                        </div>
                        <div class="stat-card">
                            <h4>Avg Success Rate</h4>
                            <div class="stat-value">${this.calculateOverallSuccessRate()}%</div>
                        </div>
                    </div>
                </div>
                <div class="expanded-cta-visualization" id="expanded-cta-chart"></div>
                <div class="expanded-cta-analysis" id="expanded-cta-analysis"></div>
            </div>
        `;
    }
    
    /**
     * Calculate overall success rate
     * @returns {string}
     */
    calculateOverallSuccessRate() {
        if (!this.state.data?.ctas) return '0.0';
        
        const ctas = Object.values(this.state.data.ctas);
        const totalOccurrences = ctas.reduce((sum, cta) => sum + cta.occurrences, 0);
        const totalSuccesses = ctas.reduce((sum, cta) => sum + cta.responses, 0);
        
        return totalOccurrences > 0 ? ((totalSuccesses / totalOccurrences) * 100).toFixed(1) : '0.0    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        this.chartInstances.forEach((chart, id) => {
            chart.destroy();
        });
        this.chartInstances.clear();
    }
}

// ===== BASE ANALYTICS MODULE CLASS =====
class AnalyticsModule {
    constructor(analytics, config) {
        this.analytics = analytics;
        this.id = config.id;
        this.title = config.title;
        this.refreshInterval = config.refreshInterval || ANALYTICS_CONFIG.REFRESH_INTERVALS.MODERATE;
        this.cacheKey = `module_${this.id}`;
        
        this.state = {
            initialized: false,
            loading: false,
            error: null,
            data: null,
            lastUpdated: null,
            settings: config.defaultSettings || {}
        };
        
        this.chartInstances = new Map();
        this.domElements = new Map();
        this.eventListeners = [];
    }
    
    /**
     * Initialize module - override in subclasses
     */
    async initialize() {
        try {
            console.log(`🔧 Initializing module: ${this.title}`);
            
            await this.setupDOM();
            await this.loadData();
            this.render();
            
            this.state.initialized = true;
            console.log(`✅ Module ${this.title} initialized`);
            
        } catch (error) {
            console.error(`❌ Failed to initialize module ${this.title}:`, error);
            this.handleError(error);
        }
    }
    
    /**
     * Set up DOM elements
     */
    async setupDOM() {
        const moduleElement = document.getElementById(this.id);
        if (!moduleElement) {
            throw new Error(`Module element ${this.id} not found`);
        }
        
        this.domElements.set('container', moduleElement);
        this.domElements.set('content', moduleElement.querySelector('.module-content'));
        this.domElements.set('header', moduleElement.querySelector('.module-header'));
        
        // Set up module-specific event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners - override in subclasses
     */
    setupEventListeners() {
        // Base implementation - subclasses can override
    }
    
    /**
     * Load module data - must be implemented in subclasses
     */
    async loadData() {
        throw new Error('loadData() must be implemented in subclass');
    }
    
    /**
     * Render module - must be implemented in subclasses
     */
    render() {
        throw new Error('render() must be implemented in subclass');
    }
    
    /**
     * Refresh module data and re-render
     */
    async refresh() {
        if (this.state.loading) {
            console.log(`Module ${this.title} is already loading, skipping refresh`);
            return;
        }
        
        try {
            this.setLoadingState(true);
            await this.loadData();
            this.render();
            this.state.lastUpdated = new Date();
            
        } catch (error) {
            console.error(`Error refreshing module ${this.title}:`, error);
            this.handleError(error);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    /**
     * Set loading state
     * @param {boolean} loading 
     */
    setLoadingState(loading) {
        this.state.loading = loading;
        this.analytics.uiManager.updateModuleLoadingState(this.id, loading);
    }
    
    /**
     * Handle module errors
     * @param {Error} error 
     */
    handleError(error) {
        this.state.error = error;
        this.analytics.uiManager.showModuleError(this.id, error.message);
        this.analytics.handleError(`MODULE_ERROR_${this.id.toUpperCase()}`, error, { moduleId: this.id });
    }
    
    /**
     * Get expanded content for modal view - override in subclasses
     * @returns {string}
     */
    getExpandedContent() {
        return `<div>Expanded view for ${this.title}</div>`;
    }
    
    /**
     * Render expanded view in modal - override in subclasses
     * @param {HTMLElement} container 
     */
    renderExpandedView(container) {
        // Base implementation - subclasses should override
        container.innerHTML = this.getExpandedContent();
    }
    
    /**
     * Get settings form HTML - override in subclasses
     * @returns {string}
     */
    getSettingsForm() {
        return `<p>No settings available for ${this.title}</p>`;
    }
    
    /**
     * Update module settings - override in subclasses
     * @param {object} settings 
     */
    updateSettings(settings) {
        this.state.settings = { ...this.state.settings, ...settings };
        this.refresh(); // Re-render with new settings
    }
    
    /**
     * Get current filters from analytics engine
     * @returns {object}
     */
    getFilters() {
        return this.analytics.getFilters();
    }
    
    /**
     * Cache data
     * @param {string} key 
     * @param {*} data 
     * @param {number} ttl 
     */
    cacheData(key, data, ttl = ANALYTICS_CONFIG.CACHE_TTL.MEDIUM) {
        this.analytics.cacheManager.set(`${this.cacheKey}_${key}`, data, ttl);
    }
    
    /**
     * Get cached data
     * @param {string} key 
     * @returns {*}
     */
    getCachedData(key) {
        return this.analytics.cacheManager.get(`${this.cacheKey}_${key}`);
    }
    
    /**
     * Emit module event
     * @param {string} eventName 
     * @param {*} data 
     */
    emit(eventName, data) {
        this.analytics.eventBus.dispatchEvent(new CustomEvent(`module:${this.id}:${eventName}`, {
            detail: data
        }));
    }
    
    /**
     * Listen to module events
     * @param {string} eventName 
     * @param {function} handler 
     */
    on(eventName, handler) {
        const listener = (event) => handler(event.detail);
        this.analytics.eventBus.addEventListener(`module:${this.id}:${eventName}`, listener);
        this.eventListeners.push({ eventName: `module:${this.id}:${eventName}`, listener });
    }
    
    /**
     * Create chart in module
     * @param {string} canvasId 
     * @param {string} type 
     * @param {object} data 
     * @param {object} options 
     * @returns {Chart}
     */
    createChart(canvasId, type, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas ${canvasId} not found`);
        }
        
        let chart;
        switch (type) {
            case 'line':
                chart = this.analytics.chartService.createLineChart(canvas, data, options);
                break;
            case 'bar':
                chart = this.analytics.chartService.createBarChart(canvas, data, options);
                break;
            case 'doughnut':
                chart = this.analytics.chartService.createDoughnutChart(canvas, data, options);
                break;
            case 'scatter':
                chart = this.analytics.chartService.createScatterPlot(canvas, data, options);
                break;
            default:
                throw new Error(`Unsupported chart type: ${type}`);
        }
        
        this.chartInstances.set(canvasId, chart);
        return chart;
    }
    
    /**
     * Update chart data
     * @param {string} chartId 
     * @param {object} newData 
     */
    updateChart(chartId, newData) {
        this.analytics.chartService.updateChart(chartId, newData);
    }
    
    /**
     * Destroy module and clean up resources
     */
    destroy() {
        // Destroy charts
        this.chartInstances.forEach((chart, id) => {
            chart.destroy();
        });
        this.chartInstances.clear();
        
        // Remove event listeners
        this.eventListeners.forEach(({ eventName, listener }) => {
            this.analytics.eventBus.removeEventListener(eventName, listener);
        });
        this.eventListeners = [];
        
        // Clear cache
        this.analytics.cacheManager.delete(this.cacheKey);
        
        console.log(`✅ Module ${this.title} destroyed`);
    }
}

// ===== MODULE 1: MESSAGE STYLE PERFORMANCE MATRIX =====
class MessageStyleMatrix extends AnalyticsModule {
    constructor(analytics) {
        super(analytics, {
            id: ANALYTICS_CONFIG.MODULES.MATRIX,
            title: '🎯 Message Style Performance Matrix',
            refreshInterval: ANALYTICS_CONFIG.REFRESH_INTERVALS.MODERATE,
            defaultSettings: {
                toneAxis: 'formal',
                structureAxis: 'short',
                showHeatmap: true,
                includeEngagement: true
            }
        });
        
        this.matrixData = null;
        this.insights = null;
    }
    
    /**
     * Load message style performance data
     */
    async loadData() {
        try {
            const filters = this.getFilters();
            const messages = await this.analytics.dataService.getMessages(filters);
            
            if (!messages || messages.length === 0) {
                this.state.data = null;
                return;
            }
            
            // Process data into 3D matrix: Tone × Structure × Engagement
            this.matrixData = this.processMatrixData(messages);
            this.insights = await this.generateInsights(this.matrixData);
            
            this.state.data = {
                matrix: this.matrixData,
                insights: this.insights,
                totalMessages: messages.length,
                lastUpdated: new Date()
            };
            
            // Cache the processed data
            this.cacheData('matrix', this.state.data);
            
        } catch (error) {
            console.error('Error loading matrix data:', error);
            throw error;
        }
    }
    
    /**
     * Process messages into matrix format
     * @param {Array} messages 
     * @returns {object}
     */
    processMatrixData(messages) {
        const tones = ['formal', 'casual', 'friendly', 'professional'];
        const structures = ['short', 'medium', 'long', 'bullet'];
        const matrix = {};
        
        // Initialize matrix
        tones.forEach(tone => {
            matrix[tone] = {};
            structures.forEach(structure => {
                matrix[tone][structure] = {
                    count: 0,
                    totalEngagement: 0,
                    averageEngagement: 0,
                    conversions: 0,
                    conversionRate: 0,
                    feedbackScore: 0,
                    messages: []
                };
            });
        });
        
        // Process each message
        messages.forEach(message => {
            const tone = message.tone || this.detectTone(message.content);
            const structure = message.structure || this.detectStructure(message.content);
            
            if (matrix[tone] && matrix[tone][structure]) {
                const cell = matrix[tone][structure];
                cell.count++;
                cell.totalEngagement += message.engagement_score || 0;
                cell.conversions += message.conversion_rate || 0;
                cell.feedbackScore += message.feedback_score || 0;
                cell.messages.push(message);
            }
        });
        
        // Calculate averages
        tones.forEach(tone => {
            structures.forEach(structure => {
                const cell = matrix[tone][structure];
                if (cell.count > 0) {
                    cell.averageEngagement = cell.totalEngagement / cell.count;
                    cell.conversionRate = cell.conversions / cell.count;
                    cell.feedbackScore = cell.feedbackScore / cell.count;
                }
            });
        });
        
        return {
            matrix,
            tones,
            structures,
            totalCombinations: tones.length * structures.length,
            populatedCells: this.countPopulatedCells(matrix)
        };
    }
    
    /**
     * Detect message tone using simple heuristics
     * @param {string} content 
     * @returns {string}
     */
    detectTone(content) {
        if (!content) return 'casual';
        
        const formalWords = ['please', 'would', 'could', 'sincerely', 'regards', 'respectfully'];
        const casualWords = ['hey', 'hi', 'cool', 'awesome', 'great', 'thanks'];
        const friendlyWords = ['hope', 'excited', 'love', 'amazing', 'wonderful'];
        
        const lowerContent = content.toLowerCase();
        
        const formalScore = formalWords.filter(word => lowerContent.includes(word)).length;
        const casualScore = casualWords.filter(word => lowerContent.includes(word)).length;
        const friendlyScore = friendlyWords.filter(word => lowerContent.includes(word)).length;
        
        if (formalScore > casualScore && formalScore > friendlyScore) return 'formal';
        if (friendlyScore > casualScore) return 'friendly';
        if (casualScore > 0) return 'casual';
        
        return 'professional';
    }
    
    /**
     * Detect message structure
     * @param {string} content 
     * @returns {string}
     */
    detectStructure(content) {
        if (!content) return 'short';
        
        const length = content.length;
        const hasBullets = content.includes('•') || content.includes('-') || /^\d+\./.test(content);
        
        if (hasBullets) return 'bullet';
        if (length < 100) return 'short';
        if (length < 250) return 'medium';
        return 'long';
    }
    
    /**
     * Count populated cells in matrix
     * @param {object} matrix 
     * @returns {number}
     */
    countPopulatedCells(matrix) {
        let count = 0;
        Object.values(matrix).forEach(toneData => {
            Object.values(toneData).forEach(cell => {
                if (cell.count > 0) count++;
            });
        });
        return count;
    }
    
    /**
     * Generate AI insights for matrix data
     * @param {object} matrixData 
     * @returns {Promise<Array>}
     */
    async generateInsights(matrixData) {
        const insights = [];
        const { matrix, tones, structures } = matrixData;
        
        // Find best performing combinations
        let bestPerformance = { tone: null, structure: null, score: 0 };
        let worstPerformance = { tone: null, structure: null, score: 100 };
        
        tones.forEach(tone => {
            structures.forEach(structure => {
                const cell = matrix[tone][structure];
                if (cell.count >= 3) { // Only consider cells with significant data
                    const combinedScore = (cell.averageEngagement + cell.conversionRate * 100 + cell.feedbackScore * 20) / 3;
                    
                    if (combinedScore > bestPerformance.score) {
                        bestPerformance = { tone, structure, score: combinedScore, data: cell };
                    }
                    
                    if (combinedScore < worstPerformance.score && combinedScore > 0) {
                        worstPerformance = { tone, structure, score: combinedScore, data: cell };
                    }
                }
            });
        });
        
        // Generate insights
        if (bestPerformance.tone) {
            insights.push({
                type: 'success',
                title: 'Top Performing Style',
                message: `${bestPerformance.tone.charAt(0).toUpperCase() + bestPerformance.tone.slice(1)} tone with ${bestPerformance.structure} structure shows best results`,
                metrics: {
                    engagement: bestPerformance.data.averageEngagement.toFixed(1),
                    conversion: (bestPerformance.data.conversionRate * 100).toFixed(1) + '%',
                    feedback: bestPerformance.data.feedbackScore.toFixed(1)
                },
                recommendation: `Focus on creating more ${bestPerformance.tone} ${bestPerformance.structure} messages`
            });
        }
        
        if (worstPerformance.tone && worstPerformance.tone !== bestPerformance.tone) {
            insights.push({
                type: 'warning',
                title: 'Underperforming Style',
                message: `${worstPerformance.tone.charAt(0).toUpperCase() + worstPerformance.tone.slice(1)} tone with ${worstPerformance.structure} structure needs improvement`,
                metrics: {
                    engagement: worstPerformance.data.averageEngagement.toFixed(1),
                    conversion: (worstPerformance.data.conversionRate * 100).toFixed(1) + '%',
                    feedback: worstPerformance.data.feedbackScore.toFixed(1)
                },
                recommendation: `Consider revising this style or reducing its usage`
            });
        }
        
        // Tone analysis
        const tonePerformance = this.analyzeTonePerformance(matrix, tones, structures);
        if (tonePerformance.insights.length > 0) {
            insights.push(...tonePerformance.insights);
        }
        
        return insights;
    }
    
    /**
     * Analyze tone performance across structures
     * @param {object} matrix 
     * @param {Array} tones 
     * @param {Array} structures 
     * @returns {object}
     */
    analyzeTonePerformance(matrix, tones, structures) {
        const toneAverages = {};
        const insights = [];
        
        tones.forEach(tone => {
            const cells = structures.map(structure => matrix[tone][structure]).filter(cell => cell.count > 0);
            if (cells.length > 0) {
                toneAverages[tone] = {
                    engagement: cells.reduce((sum, cell) => sum + cell.averageEngagement, 0) / cells.length,
                    conversion: cells.reduce((sum, cell) => sum + cell.conversionRate, 0) / cells.length,
                    feedback: cells.reduce((sum, cell) => sum + cell.feedbackScore, 0) / cells.length,
                    messageCount: cells.reduce((sum, cell) => sum + cell.count, 0)
                };
            }
        });
        
        // Find most consistent tone
        const consistentTones = Object.entries(toneAverages)
            .filter(([tone, data]) => data.messageCount >= 5)
            .sort((a, b) => {
                const aVariance = this.calculateToneVariance(matrix[a[0]], structures);
                const bVariance = this.calculateToneVariance(matrix[b[0]], structures);
                return aVariance - bVariance;
            });
        
        if (consistentTones.length > 0) {
            const [mostConsistentTone, data] = consistentTones[0];
            insights.push({
                type: 'info',
                title: 'Most Consistent Tone',
                message: `${mostConsistentTone.charAt(0).toUpperCase() + mostConsistentTone.slice(1)} tone shows consistent performance across structures`,
                metrics: {
                    averageEngagement: data.engagement.toFixed(1),
                    messageCount: data.messageCount
                },
                recommendation: `Consider this as your baseline tone for new campaigns`
            });
        }
        
        return { toneAverages, insights };
    }
    
    /**
     * Calculate variance in tone performance across structures
     * @param {object} toneData 
     * @param {Array} structures 
     * @returns {number}
     */
    calculateToneVariance(toneData, structures) {
        const values = structures
            .map(structure => toneData[structure])
            .filter(cell => cell.count > 0)
            .map(cell => cell.averageEngagement);
        
        if (values.length < 2) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        
        return variance;
    }
    
    /**
     * Render the matrix module
     */
    render() {
        const container = this.domElements.get('content');
        if (!container) return;
        
        if (!this.state.data) {
            this.analytics.uiManager.showModuleEmptyState(this.id, 'No message data available for matrix analysis');
            return;
        }
        
        const { matrix, insights } = this.state.data;
        
        container.innerHTML = `
            <div class="matrix-container">
                <div class="matrix-axes">
                    <div class="axis-selector tone-axis">
                        <label>Tone Focus</label>
                        <select id="tone-axis-select">
                            <option value="all">All Tones</option>
                            <option value="formal">Formal</option>
                            <option value="casual">Casual</option>
                            <option value="friendly">Friendly</option>
                            <option value="professional">Professional</option>
                        </select>
                    </div>
                    <div class="axis-selector structure-axis">
                        <label>Structure Focus</label>
                        <select id="structure-axis-select">
                            <option value="all">All Structures</option>
                            <option value="short">Short Form</option>
                            <option value="medium">Medium Form</option>
                            <option value="long">Long Form</option>
                            <option value="bullet">Bullet Points</option>
                        </select>
                    </div>
                </div>
                <div class="matrix-visualization" id="style-matrix-chart">
                    <canvas id="matrix-heatmap-canvas" width="400" height="300"></canvas>
                </div>
                <div class="matrix-insights" id="style-matrix-insights">
                    ${this.renderInsights(insights)}
                </div>
            </div>
        `;
        
        // Render heatmap
        setTimeout(() => {
            this.renderMatrixHeatmap();
        }, 100);
        
        // Set up axis change handlers
        this.setupAxisHandlers();
    }
    
    /**
     * Render insights section
     * @param {Array} insights 
     * @returns {string}
     */
    renderInsights(insights) {
        if (!insights || insights.length === 0) {
            return '<p style="color: var(--text-secondary);">No insights available yet. More data needed for analysis.</p>';
        }
        
        return insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <h5>${insight.title}</h5>
                <p>${insight.message}</p>
                ${insight.metrics ? `
                    <div class="insight-metrics">
                        ${Object.entries(insight.metrics).map(([key, value]) => 
                            `<span class="metric"><strong>${key}:</strong> ${value}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                ${insight.recommendation ? `
                    <div class="insight-recommendation">
                        💡 ${insight.recommendation}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    /**
     * Render matrix heatmap
     */
    renderMatrixHeatmap() {
        if (!this.matrixData) return;
        
        const container = document.getElementById('style-matrix-chart');
        if (!container) return;
        
        const { matrix, tones, structures } = this.matrixData;
        
        // Prepare heatmap data
        const heatmapData = structures.map(structure => 
            tones.map(tone => {
                const cell = matrix[tone][structure];
                return cell.count > 0 ? cell.averageEngagement : 0;
            })
        );
        
        // Create heatmap
        this.analytics.chartService.createHeatmap(container, {
            matrix: heatmapData,
            xLabels: tones.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
            yLabels: structures.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
            colorScale: ANALYTICS_CONFIG.CHART_COLORS.PERFORMANCE
        });
    }
    
    /**
     * Set up axis selection handlers
     */
    setupAxisHandlers() {
        const toneSelect = document.getElementById('tone-axis-select');
        const structureSelect = document.getElementById('structure-axis-select');
        
        if (toneSelect) {
            toneSelect.addEventListener('change', () => {
                this.updateMatrixView();
            });
        }
        
        if (structureSelect) {
            structureSelect.addEventListener('change', () => {
                this.updateMatrixView();
            });
        }
    }
    
    /**
     * Update matrix view based on axis selection
     */
    updateMatrixView() {
        const toneFilter = document.getElementById('tone-axis-select')?.value;
        const structureFilter = document.getElementById('structure-axis-select')?.value;
        
        // Re-render with filters
        this.renderMatrixHeatmap();
        
        // Update insights based on filters
        this.updateFilteredInsights(toneFilter, structureFilter);
    }
    
    /**
     * Update insights based on filters
     * @param {string} toneFilter 
     * @param {string} structureFilter 
     */
    updateFilteredInsights(toneFilter, structureFilter) {
        if (!this.state.data) return;
        
        // Generate filtered insights
        const filteredMatrix = this.getFilteredMatrix(toneFilter, structureFilter);
        const filteredInsights = this.generateFilteredInsights(filteredMatrix, toneFilter, structureFilter);
        
        // Update insights display
        const insightsContainer = document.getElementById('style-matrix-insights');
        if (insightsContainer) {
            insightsContainer.innerHTML = this.renderInsights(filteredInsights);
        }
    }
    
    /**
     * Get filtered matrix data
     * @param {string} toneFilter 
     * @param {string} structureFilter 
     * @returns {object}
     */
    getFilteredMatrix(toneFilter, structureFilter) {
        if (!this.matrixData) return null;
        
        const { matrix, tones, structures } = this.matrixData;
        const filteredMatrix = {};
        
        const tonesToInclude = toneFilter === 'all' ? tones : [toneFilter];
        const structuresToInclude = structureFilter === 'all' ? structures : [structureFilter];
        
        tonesToInclude.forEach(tone => {
            if (matrix[tone]) {
                filteredMatrix[tone] = {};
                structuresToInclude.forEach(structure => {
                    if (matrix[tone][structure]) {
                        filteredMatrix[tone][structure] = matrix[tone][structure];
                    }
                });
            }
        });
        
        return {
            matrix: filteredMatrix,
            tones: tonesToInclude,
            structures: structuresToInclude
        };
    }
    
    /**
     * Generate insights for filtered data
     * @param {object} filteredMatrix 
     * @param {string} toneFilter 
     * @param {string} structureFilter 
     * @returns {Array}
     */
    generateFilteredInsights(filteredMatrix, toneFilter, structureFilter) {
        if (!filteredMatrix) return [];
        
        const insights = [];
        const { matrix, tones, structures } = filteredMatrix;
        
        // Calculate performance for filtered data
        let totalCells = 0;
        let totalEngagement = 0;
        let totalConversions = 0;
        let totalMessages = 0;
        
        tones.forEach(tone => {
            structures.forEach(structure => {
                const cell = matrix[tone][structure];
                if (cell && cell.count > 0) {
                    totalCells++;
                    totalEngagement += cell.averageEngagement;
                    totalConversions += cell.conversionRate;
                    totalMessages += cell.count;
                }
            });
        });
        
        if (totalCells > 0) {
            const avgEngagement = totalEngagement / totalCells;
            const avgConversion = totalConversions / totalCells;
            
            insights.push({
                type: 'info',
                title: 'Filtered Performance',
                message: `Analysis of ${toneFilter === 'all' ? 'all tones' : toneFilter} with ${structureFilter === 'all' ? 'all structures' : structureFilter}`,
                metrics: {
                    messages: totalMessages,
                    avgEngagement: avgEngagement.toFixed(1),
                    avgConversion: (avgConversion * 100).toFixed(1) + '%'
                },
                recommendation: totalMessages < 10 ? 'Need more data for reliable insights' : 'Performance analysis complete'
            });
        }
        
        return insights;
    }
    
    /**
     * Get expanded content for modal
     * @returns {string}
     */
    getExpandedContent() {
        return `
            <div class="expanded-matrix-container">
                <div class="matrix-controls">
                    <div class="control-row">
                        <select id="expanded-tone-filter">
                            <option value="all">All Tones</option>
                            <option value="formal">Formal</option>
                            <option value="casual">Casual</option>
                            <option value="friendly">Friendly</option>
                            <option value="professional">Professional</option>
                        </select>
                        <select id="expanded-structure-filter">
                            <option value="all">All Structures</option>
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                            <option value="bullet">Bullet</option>
                        </select>
                        <select id="expanded-metric-view">
                            <option value="engagement">Engagement Score</option>
                            <option value="conversion">Conversion Rate</option>
                            <option value="feedback">Feedback Score</option>
                            <option value="volume">Message Volume</option>
                        </select>
                    </div>
                </div>
                <div class="expanded-matrix-visualization" id="expanded-matrix-chart">
                    <!-- Larger, more detailed heatmap -->
                </div>
                <div class="expanded-matrix-details" id="expanded-matrix-details">
                    <!-- Detailed performance breakdown -->
                </div>
            </div>
        `;
    }
    
    /**
     *    /**
     * Destroy    /**
     * Destroy cache manager
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clearAll();
    }
}

// ===== UI MANAGER =====
class UIManager {
    constructor(analyticsEngine) {
        this.analytics = analyticsEngine;
        this.loadingOverlay = null;
        this.modals = new Map();
        this.currentModal = null;
    }
    
    /**
     * Initialize UI Manager
     */
    initialize() {
        this.setupModalElements();
        this.setupLoadingOverlay();
        this.setupGlobalUIEventListeners();
        
        console.log('✅ UIManager initialized');
    }
    
    /**
     * Set up modal elements
     */
    setupModalElements() {
        // Module expansion modal
        const expansionModal = document.getElementById('module-expansion-modal');
        if (expansionModal) {
            this.modals.set('expansion', expansionModal);
        }
        
        // Settings modal
        const settingsModal = document.getElementById('module-settings-modal');
        if (settingsModal) {
            this.modals.set('settings', settingsModal);
        }
        
        // Export modal
        const exportModal = document.getElementById('export-modal');
        if (exportModal) {
            this.modals.set('export', exportModal);
        }
        
        // Set up modal close handlers
        this.modals.forEach((modal, key) => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeModal(key));
            }
            
            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(key);
                }
            });
        });
    }
    
    /**
     * Set up loading overlay
     */
    setupLoadingOverlay() {
        this.loadingOverlay = document.getElementById('analytics-loading');
        if (!this.loadingOverlay) {
            // Create loading overlay if it doesn't exist
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.id = 'analytics-loading';
            this.loadingOverlay.className = 'loading-overlay';
            this.loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p id="loading-message">Loading analytics data...</p>
                    <div class="loading-progress" id="loading-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <span class="progress-text" id="progress-text">0%</span>
                    </div>
                </div>
            `;
            document.body.appendChild(this.loadingOverlay);
        }
    }
    
    /**
     * Set up global UI event listeners
     */
    setupGlobalUIEventListeners() {
        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeModal(this.currentModal);
            }
        });
        
        // Handle form submissions in modals
        document.addEventListener('submit', (e) => {
            if (e.target.closest('.modal')) {
                e.preventDefault();
                this.handleModalFormSubmit(e);
            }
        });
    }
    
    /**
     * Show loading overlay with message
     * @param {string} message 
     */
    showLoading(message = 'Loading...') {
        if (this.loadingOverlay) {
            const messageEl = this.loadingOverlay.querySelector('#loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
            
            this.loadingOverlay.style.display = 'flex';
            this.hideLoadingProgress();
        }
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }
    
    /**
     * Update loading progress
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} text - Optional progress text
     */
    updateLoadingProgress(progress, text = null) {
        const progressContainer = this.loadingOverlay?.querySelector('#loading-progress');
        const progressFill = this.loadingOverlay?.querySelector('#progress-fill');
        const progressText = this.loadingOverlay?.querySelector('#progress-text');
        
        if (progressContainer && progressFill && progressText) {
            progressContainer.style.display = 'block';
            progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            progressText.textContent = text || `${Math.round(progress)}%`;
        }
    }
    
    /**
     * Hide loading progress
     */
    hideLoadingProgress() {
        const progressContainer = this.loadingOverlay?.querySelector('#loading-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }
    
    /**
     * Show expanded module modal
     * @param {AnalyticsModule} module 
     */
    showExpandedModule(module) {
        const modal = this.modals.get('expansion');
        if (!modal) {
            console.error('Expansion modal not found');
            return;
        }
        
        // Update modal title
        const titleEl = modal.querySelector('#expanded-module-title');
        if (titleEl) {
            titleEl.textContent = module.title;
        }
        
        // Get expanded content from module
        const contentEl = modal.querySelector('#expanded-module-content');
        if (contentEl) {
            contentEl.innerHTML = module.getExpandedContent();
        }
        
        // Show modal
        this.showModal('expansion');
        
        // Render expanded charts/visualizations
        setTimeout(() => {
            module.renderExpandedView(contentEl);
        }, 100);
    }
    
    /**
     * Show module settings modal
     * @param {AnalyticsModule} module 
     */
    showModuleSettings(module) {
        const modal = this.modals.get('settings');
        if (!modal) {
            console.error('Settings modal not found');
            return;
        }
        
        // Update modal title
        const titleEl = modal.querySelector('#settings-modal-title');
        if (titleEl) {
            titleEl.textContent = `${module.title} Settings`;
        }
        
        // Get settings form from module
        const formEl = modal.querySelector('#module-settings-form');
        if (formEl) {
            formEl.innerHTML = module.getSettingsForm();
        }
        
        // Show modal
        this.showModal('settings');
        
        // Store current module for form submission
        modal.dataset.moduleId = module.id;
    }
    
    /**
     * Show modal
     * @param {string} modalKey 
     */
    showModal(modalKey) {
        const modal = this.modals.get(modalKey);
        if (!modal) {
            console.error(`Modal ${modalKey} not found`);
            return;
        }
        
        // Close any existing modal
        if (this.currentModal && this.currentModal !== modalKey) {
            this.closeModal(this.currentModal);
        }
        
        modal.classList.add('active');
        this.currentModal = modalKey;
        
        // Focus management
        const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Close modal
     * @param {string} modalKey 
     */
    closeModal(modalKey) {
        const modal = this.modals.get(modalKey);
        if (!modal) {
            return;
        }
        
        modal.classList.remove('active');
        
        if (this.currentModal === modalKey) {
            this.currentModal = null;
        }
        
        // Restore body scrolling
        document.body.style.overflow = '';
        
        // Clean up expanded module state
        if (modalKey === 'expansion') {
            this.analytics.state.expandedModule = null;
        }
    }
    
    /**
     * Close expanded module
     */
    closeExpandedModule() {
        this.closeModal('expansion');
    }
    
    /**
     * Handle modal form submissions
     * @param {Event} event 
     */
    handleModalFormSubmit(event) {
        const form = event.target;
        const modal = form.closest('.modal');
        
        if (!modal) return;
        
        const modalKey = Array.from(this.modals.entries())
            .find(([key, element]) => element === modal)?.[0];
        
        if (modalKey === 'settings') {
            this.handleSettingsFormSubmit(form);
        } else if (modalKey === 'export') {
            this.handleExportFormSubmit(form);
        }
    }
    
    /**
     * Handle settings form submission
     * @param {HTMLFormElement} form 
     */
    handleSettingsFormSubmit(form) {
        const modal = form.closest('.modal');
        const moduleId = modal.dataset.moduleId;
        
        if (!moduleId) {
            console.error('Module ID not found in settings modal');
            return;
        }
        
        const module = this.analytics.getModule(moduleId);
        if (!module) {
            console.error(`Module ${moduleId} not found`);
            return;
        }
        
        // Get form data
        const formData = new FormData(form);
        const settings = Object.fromEntries(formData.entries());
        
        // Apply settings to module
        try {
            module.updateSettings(settings);
            window.OsliraApp.showMessage('Settings updated successfully', 'success');
            this.closeModal('settings');
        } catch (error) {
            console.error('Error updating module settings:', error);
            window.OsliraApp.showMessage('Failed to update settings', 'error');
        }
    }
    
    /**
     * Handle export form submission
     * @param {HTMLFormElement} form 
     */
    handleExportFormSubmit(form) {
        const formData = new FormData(form);
        const exportConfig = {
            format: formData.get('format'),
            modules: formData.getAll('modules'),
            filters: this.analytics.getFilters()
        };
        
        this.analytics.exportService.generateExport(exportConfig);
        this.closeModal('export');
    }
    
    /**
     * Show toast notification
     * @param {string} message 
     * @param {string} type 
     * @param {number} duration 
     */
    showToast(message, type = 'info', duration = 5000) {
        window.OsliraApp.showMessage(message, type, duration);
    }
    
    /**
     * Update module loading state
     * @param {string} moduleId 
     * @param {boolean} isLoading 
     */
    updateModuleLoadingState(moduleId, isLoading) {
        const moduleElement = document.getElementById(moduleId);
        if (!moduleElement) return;
        
        if (isLoading) {
            moduleElement.classList.add('loading');
            
            // Add loading spinner to module content
            const content = moduleElement.querySelector('.module-content');
            if (content && !content.querySelector('.module-loading')) {
                const loadingEl = document.createElement('div');
                loadingEl.className = 'module-loading';
                loadingEl.innerHTML = `
                    <div class="chart-loading">
                        <div class="chart-loading-spinner"></div>
                        <p>Loading data...</p>
                    </div>
                `;
                content.appendChild(loadingEl);
            }
        } else {
            moduleElement.classList.remove('loading');
            
            // Remove loading spinner
            const loadingEl = moduleElement.querySelector('.module-loading');
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    }
    
    /**
     * Show module error state
     * @param {string} moduleId 
     * @param {string} errorMessage 
     */
    showModuleError(moduleId, errorMessage) {
        const moduleElement = document.getElementById(moduleId);
        if (!moduleElement) return;
        
        const content = moduleElement.querySelector('.module-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="chart-error">
                <div style="font-size: 24px; margin-bottom: 12px;">⚠️</div>
                <h4 style="color: var(--error); margin-bottom: 8px;">Error Loading Data</h4>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">${errorMessage}</p>
                <button class="control-btn primary" onclick="analytics.getModule('${moduleId}')?.refresh()">
                    🔄 Retry
                </button>
            </div>
        `;
    }
    
    /**
     * Show module empty state
     * @param {string} moduleId 
     * @param {string} message 
     */
    showModuleEmptyState(moduleId, message = 'No data available') {
        const moduleElement = document.getElementById(moduleId);
        if (!moduleElement) return;
        
        const content = moduleElement.querySelector('.module-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="chart-no-data">
                <div style="font-size: 24px; margin-bottom: 12px;">📊</div>
                <h4 style="color: var(--text-secondary); margin-bottom: 8px;">No Data Available</h4>
                <p style="color: var(--text-muted);">${message}</p>
            </div>
        `;
    }
    
    /**
     * Update dashboard statistics
     * @param {object} stats 
     */
    updateDashboardStats(stats) {
        // This could update header statistics or global metrics
        console.log('Dashboard stats updated:', stats);
    }
    
    /**
     * Get modal element
     * @param {string} modalKey 
     * @returns {HTMLElement|null}
     */
    getModal(modalKey) {
        return this.modals.get(modalKey) || null;
    }
    
    /**
     * Check if modal is open
     * @param {string} modalKey 
     * @returns {boolean}
     */
    isModalOpen(modalKey) {
        return this.currentModal === modalKey;
    }
    
    /**
     * Destroy UI Manager
     */
    destroy() {
        // Close all modals
        this.modals.forEach((modal, key) => {
            this.closeModal(key);
        });
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('submit', this.handleFormSubmit);
        
        // Clean up loading overlay
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }
        
        console.log('✅ UIManager destroyed');
    }
}

// ===== CHART SERVICE =====
class ChartService {
    constructor() {
        this.chartInstances = new Map();
        this.chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#2D6CDF',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        };
    }
    
    /**
     * Create line chart
     * @param {HTMLCanvasElement} canvas 
     * @param {object} data 
     * @param {object} options 
     * @returns {Chart}
     */
    createLineChart(canvas, data, options = {}) {
        const config = {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: data.datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: dataset.color || ANALYTICS_CONFIG.CHART_COLORS.PRIMARY[index],
                    backgroundColor: dataset.backgroundColor || this.addAlpha(dataset.color || ANALYTICS_CONFIG.CHART_COLORS.PRIMARY[index], 0.1),
                    borderWidth: 2,
                    fill: dataset.fill || false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }))
            },
            options: this.mergeOptions(this.chartDefaults, options)
        };
        
        const chart = new Chart(canvas, config);
        this.chartInstances.set(canvas.id, chart);
        return chart;
    }
    
    /**
     * Create bar chart
     * @param {HTMLCanvasElement} canvas 
     * @param {object} data 
     * @param {object} options 
     * @returns {Chart}
     */
    createBarChart(canvas, data, options = {}) {
        const config = {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: data.datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    backgroundColor: dataset.colors || data.labels.map((_, i) => 
                        ANALYTICS_CONFIG.CHART_COLORS.PRIMARY[i % ANALYTICS_CONFIG.CHART_COLORS.PRIMARY.length]
                    ),
                    borderColor: dataset.borderColors || dataset.colors,
                    borderWidth: 1,
                    borderRadius: 4
                }))
            },
            options: this.mergeOptions(this.chartDefaults, options)
        };
        
        const chart = new Chart(canvas, config);
        this.chartInstances.set(canvas.id, chart);
        return chart;
    }
    
    /**
     * Create doughnut chart
     * @param {HTMLCanvasElement} canvas 
     * @param {object} data 
     * @param {object} options 
     * @returns {Chart}
     */
    createDoughnutChart(canvas, data, options = {}) {
        const config = {
            type: 'doughnut',
            data: {
                labels: data.labels || [],
                datasets: [{
                    data: data.values || [],
                    backgroundColor: data.colors || ANALYTICS_CONFIG.CHART_COLORS.PRIMARY,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 4
                }]
            },
            options: this.mergeOptions({
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }, options)
        };
        
        const chart = new Chart(canvas, config);
        this.chartInstances.set(canvas.id, chart);
        return chart;
    }
    
    /**
     * Create scatter plot
     * @param {HTMLCanvasElement} canvas 
     * @param {object} data 
     * @param {object} options 
     * @returns {Chart}
     */
    createScatterPlot(canvas, data, options = {}) {
        const config = {
            type: 'scatter',
            data: {
                datasets: data.datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    backgroundColor: dataset.color || ANALYTICS_CONFIG.CHART_COLORS.PRIMARY[index],
                    borderColor: dataset.color || ANALYTICS_CONFIG.CHART_COLORS.PRIMARY[index],
                    pointRadius: dataset.pointRadius || 6,
                    pointHoverRadius: dataset.pointHoverRadius || 8
                }))
            },
            options: this.mergeOptions(this.chartDefaults, {
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: options.xAxisTitle || 'X Axis'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: options.yAxisTitle || 'Y Axis'
                        }
                    }
                }
            }, options)
        };
        
        const chart = new Chart(canvas, config);
        this.chartInstances.set(canvas.id, chart);
        return chart;
    }
    
    /**
     * Create heatmap visualization
     * @param {HTMLElement} container 
     * @param {object} data 
     * @param {object} options 
     * @returns {object}
     */
    createHeatmap(container, data, options = {}) {
        const {
            matrix,
            xLabels = [],
            yLabels = [],
            colorScale = ANALYTICS_CONFIG.CHART_COLORS.PERFORMANCE
        } = data;
        
        // Clear container
        container.innerHTML = '';
        
        // Create heatmap HTML structure
        const heatmapEl = document.createElement('div');
        heatmapEl.className = 'heatmap-grid';
        heatmapEl.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${xLabels.length}, 1fr);
            gap: 2px;
            padding: 20px;
            height: 100%;
            align-content: center;
        `;
        
        // Calculate value range for color mapping
        const values = matrix.flat();
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        
        // Create cells
        matrix.forEach((row, i) => {
            row.forEach((value, j) => {
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';
                
                // Calculate color intensity
                const intensity = (value - minValue) / (maxValue - minValue);
                const color = this.getHeatmapColor(intensity, colorScale);
                
                cell.style.cssText = `
                    background-color: ${color};
                    padding: 8px;
                    border-radius: 4px;
                    text-align: center;
                    font-weight: 600;
                    color: ${intensity > 0.5 ? '#ffffff' : '#000000'};
                    min-height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                `;
                
                cell.textContent = typeof value === 'number' ? value.toFixed(1) : value;
                cell.title = `${yLabels[i] || i}: ${xLabels[j] || j} = ${value}`;
                
                // Hover effect
                cell.addEventListener('mouseenter', () => {
                    cell.style.transform = 'scale(1.05)';
                });
                
                cell.addEventListener('mouseleave', () => {
                    cell.style.transform = 'scale(1)';
                });
                
                heatmapEl.appendChild(cell);
            });
        });
        
        container.appendChild(heatmapEl);
        
        // Add labels if provided
        if (xLabels.length > 0 || yLabels.length > 0) {
            this.addHeatmapLabels(container, xLabels, yLabels);
        }
        
        return {
            element: heatmapEl,
            update: (newData) => this.createHeatmap(container, newData, options),
            destroy: () => container.innerHTML = ''
        };
    }
    
    /**
     * Add labels to heatmap
     * @param {HTMLElement} container 
     * @param {Array} xLabels 
     * @param {Array} yLabels 
     */
    addHeatmapLabels(container, xLabels, yLabels) {
        // Add X axis labels
        if (xLabels.length > 0) {
            const xLabelsEl = document.createElement('div');
            xLabelsEl.className = 'heatmap-x-labels';
            xLabelsEl.style.cssText = `
                display: grid;
                grid-template-columns: repeat(${xLabels.length}, 1fr);
                gap: 2px;
                padding: 0 20px;
                margin-top: 8px;
            `;
            
            xLabels.forEach(label => {
                const labelEl = document.createElement('div');
                labelEl.textContent = label;
                labelEl.style.cssText = `
                    text-align: center;
                    font-size: 12px;
                    color: var(--text-secondary);
                    font-weight: 600;
                `;
                xLabelsEl.appendChild(labelEl);
            });
            
            container.appendChild(xLabelsEl);
        }
        
        // Add Y axis labels (more complex positioning needed)
        if (yLabels.length > 0) {
            // This would require more complex CSS positioning
            // For now, we'll show them in the tooltip
        }
    }
    
    /**
     * Get heatmap color based on intensity
     * @param {number} intensity 
     * @param {object} colorScale 
     * @returns {string}
     */
    getHeatmapColor(intensity, colorScale) {
        if (intensity < 0.33) {
            return this.addAlpha(colorScale.LOW, 0.3 + intensity * 0.4);
        } else if (intensity < 0.66) {
            return this.addAlpha(colorScale.MEDIUM, 0.5 + (intensity - 0.33) * 0.5);
        } else {
            return this.addAlpha(colorScale.HIGH, 0.7 + (intensity - 0.66) * 0.3);
        }
    }
    
    /**
     * Update chart data
     * @param {string} chartId 
     * @param {object} newData 
     */
    updateChart(chartId, newData) {
        const chart = this.chartInstances.get(chartId);
        if (!chart) {
            console.error(`Chart ${chartId} not found`);
            return;
        }
        
        // Update data
        if (newData.labels) {
            chart.data.labels = newData.labels;
        }
        
        if (newData.datasets) {
            chart.data.datasets = newData.datasets;
        }
        
        // Re-render chart
        chart.update('active');
    }
    
    /**
     * Destroy chart
     * @param {string} chartId 
     */
    destroyChart(chartId) {
        const chart = this.chartInstances.get(chartId);
        if (chart) {
            chart.destroy();
            this.chartInstances.delete(chartId);
        }
    }
    
    /**
     * Resize all charts
     */
    resizeAllCharts() {
        this.chartInstances.forEach(chart => {
            if (chart.resize) {
                chart.resize();
            }
        });
    }
    
    /**
     * Merge chart options
     * @param {...object} options 
     * @returns {object}
     */
    mergeOptions(...options) {
        return this.deepMerge({}, ...options);
    }
    
    /**
     * Deep merge objects
     * @param {object} target 
     * @param {...object} sources 
     * @returns {object}
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        
        return this.deepMerge(target, ...sources);
    }
    
    /**
     * Check if value is object
     * @param {*} item 
     * @returns {boolean}
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    /**
     * Add alpha to color
     * @param {string} color 
     * @param {number} alpha 
     * @returns {string}
     */
    addAlpha(color, alpha) {
        // Convert hex to rgba
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }
    
    /**
     * Get chart instance
     * @param {string} chartId 
     * @returns {Chart|null}
     */
    getChart(chartId) {
        return this.chartInstances.get(chartId) || null;
    }
    
    /**
     * Get all chart instances
     * @returns {Map}
     */
    getAllCharts() {
        return new Map(this.chartInstances);
    }
    
    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        this.chartInstances.forEach((chart, id) => {
            chart.destroy();
        });
        this.chartInstances.clear();
    }
}    /**
     * Update filter and refresh relevant modules
     * @param {string} filterKey 
     * @param {*} value 
     */
    async updateFilter(filterKey, value) {
        const oldValue = this.state.currentFilters[filterKey];
        this.state.currentFilters[filterKey] = value;
        
        console.log(`🔄 Filter updated: ${filterKey} = ${value}`);
        
        // Emit filter change event
        this.eventBus.dispatchEvent(new CustomEvent('analytics:filter-changed', {
            detail: { filterKey, value, oldValue, filters: this.state.currentFilters }
        }));
        
        // Refresh affected modules
        await this.refreshModulesByFilter(filterKey);
    }
    
    /**
     * Refresh modules affected by filter changes
     * @param {string} filterKey 
     */
    async refreshModulesByFilter(filterKey) {
        const affectedModules = this.getModulesAffectedByFilter(filterKey);
        
        if (affectedModules.length > 0) {
            this.uiManager.showLoading(`Updating ${affectedModules.length} modules...`);
            
            const refreshPromises = affectedModules.map(moduleId => {
                const module = this.modules.get(moduleId);
                return module ? module.refresh() : Promise.resolve();
            });
            
            try {
                await Promise.all(refreshPromises);
                console.log(`✅ Refreshed ${affectedModules.length} modules for filter: ${filterKey}`);
            } catch (error) {
                console.error(`❌ Error refreshing modules for filter ${filterKey}:`, error);
                this.handleError('FILTER_REFRESH_FAILED', error, { filterKey, affectedModules });
            } finally {
                this.uiManager.hideLoading();
            }
        }
    }
    
    /**
     * Get modules affected by specific filter
     * @param {string} filterKey 
     * @returns {string[]}
     */
    getModulesAffectedByFilter(filterKey) {
        const filterModuleMap = {
            timeRange: [...this.state.activeModules], // All modules affected by time
            crmFilter: [ANALYTICS_CONFIG.MODULES.CRM, ANALYTICS_CONFIG.MODULES.HEATMAP],
            leadTypeFilter: [ANALYTICS_CONFIG.MODULES.HEATMAP, ANALYTICS_CONFIG.MODULES.MATRIX],
            businessId: [...this.state.activeModules] // All modules affected by business
        };
        
        return filterModuleMap[filterKey] || [];
    }
    
    /**
     * Expand module to full screen modal
     * @param {string} moduleId 
     */
    expandModule(moduleId) {
        const module = this.modules.get(moduleId);
        if (!module) {
            console.error(`Module ${moduleId} not found`);
            return;
        }
        
        this.state.expandedModule = moduleId;
        this.uiManager.showExpandedModule(module);
        
        // Track expansion analytics
        this.trackEvent('module_expanded', { moduleId });
    }
    
    /**
     * Show module settings modal// ==========================================
// ANALYTICS.JS - ENTERPRISE ANALYTICS ENGINE
// Complete 10-module analytics system for $2M+ AI outreach platform
// Dependencies: shared-code.js, Chart.js, Supabase, Claude API
// ==========================================

/* ===== ARCHITECTURAL OVERVIEW =====
 * 
 * MODULE HIERARCHY:
 * 1. Core Analytics Engine (AnalyticsEngine)
 * 2. Data Layer & API Services (DataService, APIService)
 * 3. 10 Analytics Modules (Independent but interconnected)
 * 4. Visualization Engine (ChartService)
 * 5. UI Management (UIManager)
 * 6. Export System (ExportService)
 * 7. Performance Optimization (CacheManager, BatchProcessor)
 * 
 * DATA FLOW:
 * Supabase → DataService → AnalyticsEngine → Modules → ChartService → DOM
 * 
 * ERROR HANDLING:
 * Each module implements graceful degradation with fallback data
 * Global error boundary captures and logs all exceptions
 * 
 * PERFORMANCE:
 * - Lazy loading of module data
 * - Intelligent caching with TTL
 * - Batch API requests
 * - Virtual scrolling for large datasets
 * - Web Workers for heavy computations
 */

// ===== GLOBAL CONSTANTS & CONFIGURATION =====
const ANALYTICS_CONFIG = {
    // Module identifiers
    MODULES: {
        MATRIX: 'message-style-matrix',
        HEATMAP: 'lead-conversion-heatmap', 
        CTA: 'cta-effectiveness',
        FEEDBACK: 'feedback-explorer',
        CRM: 'crm-performance',
        TIMELINE: 'outreach-timeline',
        ITERATION: 'iteration-tracker',
        TEAM: 'team-impact',
        CLAUDE: 'claude-guidance',
        RISK: 'risk-classifier'
    },
    
    // Data refresh intervals (milliseconds)
    REFRESH_INTERVALS: {
        REAL_TIME: 30000,      // 30 seconds
        FREQUENT: 300000,      // 5 minutes
        MODERATE: 900000,      // 15 minutes
        HOURLY: 3600000,       // 1 hour
        DAILY: 86400000        // 24 hours
    },
    
    // Cache TTL settings
    CACHE_TTL: {
        REAL_TIME: 30000,      // 30 seconds
        SHORT: 300000,         // 5 minutes
        MEDIUM: 1800000,       // 30 minutes
        LONG: 3600000,         // 1 hour
        PERSISTENT: 86400000   // 24 hours
    },
    
    // Performance thresholds
    PERFORMANCE: {
        MAX_BATCH_SIZE: 100,
        PAGINATION_SIZE: 50,
        CHART_ANIMATION_THRESHOLD: 1000,
        VIRTUAL_SCROLL_THRESHOLD: 500
    },
    
    // Chart color schemes
    CHART_COLORS: {
        PRIMARY: ['#2D6CDF', '#8A6DF1', '#53E1C5', '#FF6B35', '#10B981'],
        PERFORMANCE: {
            HIGH: '#10B981',
            MEDIUM: '#F59E0B', 
            LOW: '#EF4444'
        },
        GRADIENTS: {
            BLUE_PURPLE: 'linear-gradient(135deg, #2D6CDF, #8A6DF1)',
            TEAL_GREEN: 'linear-gradient(135deg, #53E1C5, #10B981)',
            ORANGE_RED: 'linear-gradient(135deg, #FF6B35, #EF4444)'
        }
    },
    
    // API endpoints
    ENDPOINTS: {
        MESSAGES: '/api/analytics/messages',
        LEADS: '/api/analytics/leads',
        FEEDBACK: '/api/analytics/feedback',
        CTA: '/api/analytics/cta',
        CRM: '/api/analytics/crm',
        TEAM: '/api/analytics/team',
        CLAUDE_INSIGHTS: '/api/analytics/claude-insights',
        RISK_ANALYSIS: '/api/analytics/risk-analysis',
        EXPORT: '/api/analytics/export'
    }
};

// ===== CORE ANALYTICS ENGINE =====
class AnalyticsEngine {
    constructor() {
        this.modules = new Map();
        this.dataService = null;
        this.uiManager = null;
        this.chartService = null;
        this.exportService = null;
        this.cacheManager = null;
        
        // State management
        this.state = {
            initialized: false,
            currentFilters: {
                timeRange: '30d',
                crmFilter: 'all',
                leadTypeFilter: 'all',
                businessId: null
            },
            activeModules: new Set(),
            expandedModule: null,
            isLoading: false,
            lastRefresh: null
        };
        
        // Event system for inter-module communication
        this.eventBus = new EventTarget();
        
        // Performance monitoring
        this.performanceMetrics = {
            initTime: null,
            moduleLoadTimes: new Map(),
            apiCallTimes: new Map(),
            renderTimes: new Map()
        };
        
        // Error tracking
        this.errors = [];
        this.errorHandlers = new Map();
    }
    
    /**
     * Initialize the complete analytics system
     * @returns {Promise<void>}
     */
    async initialize() {
        const startTime = performance.now();
        
        try {
            console.log('🚀 Initializing Analytics Engine...');
            
            // Ensure shared core is ready
            await window.OsliraApp.initialize();
            
            // Initialize core services
            await this.initializeCoreServices();
            
            // Set up global event listeners
            this.setupGlobalEventListeners();
            
            // Initialize all analytics modules
            await this.initializeModules();
            
            // Set up auto-refresh mechanisms
            this.setupAutoRefresh();
            
            // Load initial data
            await this.loadInitialData();
            
            // Mark as initialized
            this.state.initialized = true;
            this.performanceMetrics.initTime = performance.now() - startTime;
            
            console.log(`✅ Analytics Engine initialized in ${this.performanceMetrics.initTime.toFixed(2)}ms`);
            
            // Emit initialization complete event
            this.eventBus.dispatchEvent(new CustomEvent('analytics:initialized', {
                detail: { initTime: this.performanceMetrics.initTime }
            }));
            
        } catch (error) {
            console.error('❌ Analytics Engine initialization failed:', error);
            this.handleError('INITIALIZATION_FAILED', error);
            throw error;
        }
    }
    
    /**
     * Initialize core services
     * @returns {Promise<void>}
     */
    async initializeCoreServices() {
        // Data layer
        this.dataService = new DataService();
        await this.dataService.initialize();
        
        // Cache management
        this.cacheManager = new CacheManager();
        
        // UI management
        this.uiManager = new UIManager(this);
        this.uiManager.initialize();
        
        // Chart service
        this.chartService = new ChartService();
        
        // Export service
        this.exportService = new ExportService(this);
        
        console.log('✅ Core services initialized');
    }
    
    /**
     * Initialize all analytics modules
     * @returns {Promise<void>}
     */
    async initializeModules() {
        const moduleClasses = [
            MessageStyleMatrix,
            LeadConversionHeatmap,
            CTAEffectivenessTracker,
            FeedbackSignalExplorer,
            CRMPerformanceComparator,
            OutreachTimelineOverlay,
            MessageIterationROITracker,
            TeamLevelImpactDashboard,
            ClaudeGuidanceHistory,
            MessageRiskClassifier
        ];
        
        // Initialize modules in parallel for better performance
        const initPromises = moduleClasses.map(async (ModuleClass) => {
            try {
                const moduleInstance = new ModuleClass(this);
                await moduleInstance.initialize();
                this.modules.set(moduleInstance.id, moduleInstance);
                this.state.activeModules.add(moduleInstance.id);
                
                console.log(`✅ Module ${moduleInstance.id} initialized`);
                return moduleInstance;
                
            } catch (error) {
                console.error(`❌ Failed to initialize module ${ModuleClass.name}:`, error);
                this.handleError('MODULE_INIT_FAILED', error, { module: ModuleClass.name });
                return null;
            }
        });
        
        const initializedModules = await Promise.all(initPromises);
        const successCount = initializedModules.filter(m => m !== null).length;
        
        console.log(`✅ ${successCount}/${moduleClasses.length} modules initialized successfully`);
    }
    
    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Filter change handlers
        document.getElementById('time-range')?.addEventListener('change', (e) => {
            this.updateFilter('timeRange', e.target.value);
        });
        
        document.getElementById('crm-filter')?.addEventListener('change', (e) => {
            this.updateFilter('crmFilter', e.target.value);
        });
        
        document.getElementById('lead-type-filter')?.addEventListener('change', (e) => {
            this.updateFilter('leadTypeFilter', e.target.value);
        });
        
        // Global action handlers
        document.getElementById('refresh-data')?.addEventListener('click', () => {
            this.refreshAllData();
        });
        
        document.getElementById('export-analytics')?.addEventListener('click', () => {
            this.exportService.showExportModal();
        });
        
        // Module expansion handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.module-expand')) {
                const moduleId = e.target.dataset.module;
                this.expandModule(moduleId);
            }
            
            if (e.target.matches('.module-settings')) {
                const moduleId = e.target.dataset.module;
                this.showModuleSettings(moduleId);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Window resize handler for responsive charts
        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 250));
        
        console.log('✅ Global event listeners set up');
    }
    
    /**
     * Update filter and refresh relevant modules
     * @param {string} filterKey 
     * @param {*} value 
     */
    async updateFilter(filterKey, value) {
        const oldValue = this.state.currentFilters[filterKey];
        this.state.currentFilters[filterKey] = value;
        
        console.log(`🔄 Filter updated: ${filterKey} = ${value}`);
        
        // Emit filter change event
        this
