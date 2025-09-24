//public/pages/dashboard/modules/analysis/analysis-queue.js

/**
 * OSLIRA ANALYSIS QUEUE MODULE  
 * Handles analysis queue management, progress tracking, and API coordination
 * Extracted from dashboard.js - maintains exact functionality
 */
class AnalysisQueue {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.stateManager = container.get('stateManager');
        this.supabase = container.get('supabase');
        this.osliraApp = container.get('osliraApp');
        
        // Queue configuration - EXACT FROM ORIGINAL
        this.activeAnalyses = new Map();
        this.maxVisible = 5;
        this.autoHideDelay = 10000;
        
        // Create queue container
        this.setupQueueContainer();
        
        console.log('🚀 [AnalysisQueue] Initialized');
    }
    
    async init() {
        // Listen for cleanup events
        this.eventBus.on('dashboard:cleanup', this.cleanup.bind(this));
        
        console.log('✅ [AnalysisQueue] Event listeners initialized');
    }
    
    // ===============================================================================
    // QUEUE MANAGEMENT - EXTRACTED FROM dashboard.js lines 3200-3400
    // ===============================================================================
    
    // EXTRACTED FROM dashboard.js lines 3300-3350
    updateAnalysis(analysisId, updates) {
        const analysis = this.activeAnalyses.get(analysisId);
        if (analysis) {
            Object.assign(analysis, updates);
            
            // Update state
            this.stateManager.setState('analysisQueue', new Map(this.activeAnalyses));
            
            // Update UI
            this.renderQueue();
            
            // Emit event
            this.eventBus.emit(DASHBOARD_EVENTS.ANALYSIS_PROGRESS, {
                analysisId,
                updates,
                analysis
            });
            
            console.log(`🔄 [AnalysisQueue] Updated analysis ${analysisId}:`, updates);
        }
    }
    
    // EXTRACTED FROM dashboard.js lines 3400-3480
    completeAnalysis(analysisId, success = true, message = null) {
        const analysis = this.activeAnalyses.get(analysisId);
        if (!analysis) return;
        
        analysis.status = success ? 'completed' : 'failed';
        analysis.progress = 100;
        analysis.message = message || (success ? 'Analysis completed!' : 'Analysis failed');
        analysis.endTime = Date.now();
        analysis.duration = Math.round((analysis.endTime - analysis.startTime) / 1000);
        
        // Update state and UI
        this.stateManager.setState('analysisQueue', new Map(this.activeAnalyses));
        this.renderQueue();
        
// Emit success event for dashboard refresh
this.eventBus.emit(DASHBOARD_EVENTS.ANALYSIS_COMPLETED, {
    analysisId,
    username: analysis.username, // Use the username from analysis object
    result
});
        
        // Auto-remove after delay
        setTimeout(() => {
            this.removeAnalysis(analysisId);
        }, this.autoHideDelay);
        
        console.log(`${success ? '✅' : '❌'} [AnalysisQueue] ${success ? 'Completed' : 'Failed'} analysis for @${analysis.username}`);
    }
    
    // EXTRACTED FROM dashboard.js lines 3500-3580
    removeAnalysis(analysisId) {
        const analysis = this.activeAnalyses.get(analysisId);
        if (!analysis) return;
        
        // Add removing class for animation
        const element = document.getElementById(`queue-item-${analysisId}`);
        if (element) {
            element.classList.add('removing');
            setTimeout(() => {
                this.activeAnalyses.delete(analysisId);
                this.stateManager.setState('analysisQueue', new Map(this.activeAnalyses));
                this.renderQueue();
                this.maybeHideQueue();
            }, 300); // Match CSS animation duration
        } else {
            this.activeAnalyses.delete(analysisId);
            this.stateManager.setState('analysisQueue', new Map(this.activeAnalyses));
            this.renderQueue();
            this.maybeHideQueue();
        }
        
        // Emit event
        this.eventBus.emit(DASHBOARD_EVENTS.QUEUE_ITEM_REMOVED, {
            analysisId,
            analysis
        });
        
        console.log(`🗑️ [AnalysisQueue] Removed analysis for @${analysis.username}`);
    }
    
    // EXTRACTED FROM dashboard.js lines 3600-3650
    clearCompleted() {
        const completed = Array.from(this.activeAnalyses.entries()).filter(
            ([_, analysis]) => analysis.status === 'completed' || analysis.status === 'failed'
        );
        
        completed.forEach(([id]) => this.removeAnalysis(id));
        
        if (completed.length > 0) {
            this.osliraApp?.showMessage(`Cleared ${completed.length} completed analyses`, 'success');
            console.log(`🧹 [AnalysisQueue] Cleared ${completed.length} completed items`);
        }
    }
    
    // ===============================================================================
    // UI MANAGEMENT - EXTRACTED FROM dashboard.js lines 4350-4850
    // ===============================================================================
    
    // EXTRACTED FROM dashboard.js lines 4350-4400
    setupQueueContainer() {
        // Remove existing container if it exists
        const existing = document.getElementById('analysis-queue-container');
        if (existing) {
            existing.remove();
        }
        
        const container = document.createElement('div');
        container.id = 'analysis-queue-container';
        container.className = 'analysis-queue';
        container.style.display = 'none'; // Hidden by default
        
        document.body.appendChild(container);
        console.log('🏗️ [AnalysisQueue] Queue container created');
    }
    
    // EXTRACTED FROM dashboard.js lines 3700-3850
    renderQueue() {
        const container = document.getElementById('analysis-queue-container');
        if (!container) return;
        
        const analyses = Array.from(this.activeAnalyses.values()).sort(
            (a, b) => b.startTime - a.startTime
        ); // Newest first
        
        if (analyses.length === 0) {
            container.innerHTML = '';
            this.stateManager.setState('queueVisible', false);
            return;
        }
        
        // Create scrollable container if needed
        const needsScroll = analyses.length > this.maxVisible;
        const visibleAnalyses = needsScroll ? analyses.slice(0, this.maxVisible) : analyses;
        
        container.innerHTML = `
            <div style="max-height: ${this.maxVisible * 90}px; overflow-y: ${needsScroll ? 'auto' : 'visible'}; padding-right: 8px;">
                ${visibleAnalyses.map((analysis) => this.renderQueueItem(analysis)).join('')}
            </div>
            ${needsScroll ? `
                <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.9); border-radius: 8px; margin-top: 8px;">
                    <span style="font-size: 12px; color: var(--text-secondary);">
                        +${analyses.length - this.maxVisible} more items
                    </span>
                </div>
            ` : ''}
            ${this.hasCompletedItems() ? `
                <div style="text-align: center; padding: 8px; margin-top: 8px;">
                    <button onclick="analysisQueue.clearCompleted()" 
                            class="btn btn-small"
                            style="font-size: 11px; padding: 6px 12px;">
                        Clear Completed
                    </button>
                </div>
            ` : ''}
        `;
        
        // Emit queue update event
        this.eventBus.emit(DASHBOARD_EVENTS.QUEUE_UPDATED, {
            count: analyses.length,
            visible: visibleAnalyses.length
        });
    }
    
    // EXTRACTED FROM dashboard.js lines 3900-4100
    renderQueueItem(analysis) {
        const statusConfig = this.getStatusConfig(analysis.status);
        const elapsed = Math.round((Date.now() - analysis.startTime) / 1000);
        const timeText = elapsed < 60 ? `${elapsed}s` : `${Math.round(elapsed / 60)}m`;
        
        return `
            <div id="queue-item-${analysis.id}" 
                 class="queue-item ${analysis.status}"
                 style="margin-bottom: 12px;">
                
                <!-- Header -->
                <div class="queue-header">
                    <div class="queue-username">
                        <span style="font-size: 16px;">${statusConfig.icon}</span>
                        <span>@${analysis.username}</span>
                        <span class="queue-type" style="background: ${statusConfig.color};">
                            ${analysis.analysisType.toUpperCase()}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; color: var(--text-secondary);">${timeText}</span>
                        ${analysis.status === 'starting' || analysis.status === 'analyzing' ? 
                            `<button onclick="analysisQueue.removeAnalysis('${analysis.id}')" 
                                     style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px;">
                                ✕
                             </button>` 
                            : ''
                        }
                    </div>
                </div>
                
                <!-- Progress Bar -->
                ${analysis.status === 'starting' || analysis.status === 'analyzing' ? `
                    <div class="progress-container" style="margin: 8px 0;">
                        <div class="progress-bar" style="width: 100%; height: 4px; background: rgba(0,0,0,0.1); border-radius: 2px; overflow: hidden;">
                            <div class="progress-fill" style="height: 100%; background: ${statusConfig.color}; width: ${analysis.progress}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                            ${analysis.message}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Actions for completed -->
                ${analysis.status === 'completed' ? `
                    <div class="queue-actions">
                        <button onclick="dashboard.viewLatestLead('${analysis.username}')" 
                                class="btn primary-btn">
                            View Results
                        </button>
                        <button onclick="analysisQueue.removeAnalysis('${analysis.id}')" 
                                class="btn btn-small">
                            Dismiss
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // EXTRACTED FROM dashboard.js lines 4250-4300
    getStatusConfig(status) {
        const configs = {
            starting: { icon: '⏳', color: '#f59e0b' },
            analyzing: { icon: '🔄', color: '#3b82f6' },
            completed: { icon: '✅', color: '#10b981' },
            failed: { icon: '❌', color: '#ef4444' }
        };
        return configs[status] || configs.starting;
    }
    
    // EXTRACTED FROM dashboard.js lines 4150-4180
    showQueue() {
        const container = document.getElementById('analysis-queue-container');
        if (container) {
            container.style.display = 'block';
            this.stateManager.setState('queueVisible', true);
        }
    }
    
    // EXTRACTED FROM dashboard.js lines 4200-4230
    maybeHideQueue() {
        if (this.activeAnalyses.size === 0) {
            const container = document.getElementById('analysis-queue-container');
            if (container) {
                container.style.display = 'none';
                this.stateManager.setState('queueVisible', false);
            }
        }
    }
    
    hasCompletedItems() {
        return Array.from(this.activeAnalyses.values()).some(
            analysis => analysis.status === 'completed' || analysis.status === 'failed'
        );
    }
    
    // ===============================================================================
    // ANALYSIS EXECUTION - EXTRACTED FROM dashboard.js lines 4450-4750
    // ===============================================================================
    
    // EXTRACTED FROM dashboard.js lines 4450-4550
    async startSingleAnalysis(username, analysisType, businessId, requestData) {
        const analysisId = this.addAnalysis(username, analysisType, businessId);
        
        try {
            // Start progress simulation
            this.simulateProgress(analysisId);
            
            // Update to analyzing status
            setTimeout(() => {
                this.updateAnalysis(analysisId, {
                    status: 'analyzing',
                    progress: 20,
                    message: 'Scraping Instagram profile...'
                });
            }, 1000);
            
            // Call the actual API
            const result = await this.callAnalysisAPI(requestData);
            
            if (result.success) {
                this.completeAnalysis(analysisId, true, 'Analysis completed successfully!');
                
                // Emit success event for dashboard refresh
                this.eventBus.emit(DASHBOARD_EVENTS.ANALYSIS_COMPLETED, {
                    analysisId,
                    username,
                    result
                });
                
                return result;
            } else {
                this.completeAnalysis(analysisId, false, result.error || 'Analysis failed');
                throw new Error(result.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('❌ [AnalysisQueue] Analysis failed:', error);
            this.completeAnalysis(analysisId, false, error.message);
            throw error;
        }
    }
    
    // EXTRACTED FROM dashboard.js lines 4600-4750
    async startBulkAnalysis(leads, analysisType, businessId) {
        console.log(`🚀 [AnalysisQueue] Starting bulk analysis: ${leads.length} profiles`);
        
        const results = [];
        const user = this.osliraApp?.user;
        
        if (!user) {
            throw new Error('User authentication required');
        }
        
        // Process each lead sequentially to avoid overwhelming the API
        for (const lead of leads) {
            try {
                const requestData = {
                    username: lead.username.replace('@', ''),
                    analysis_type: analysisType,
                    business_id: businessId,
                    user_id: user.id,
                    platform: 'instagram'
                };
                
                const result = await this.startSingleAnalysis(
                    lead.username,
                    analysisType,
                    businessId,
                    requestData
                );
                
                results.push({
                    username: lead.username,
                    success: true,
                    result
                });
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ [AnalysisQueue] Failed to analyze ${lead.username}:`, error);
                results.push({
                    username: lead.username,
                    success: false,
                    error: error.message
                });
            }
        }
        
        console.log('✅ [AnalysisQueue] Bulk analysis completed:', {
            total: leads.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        });
        
        return results;
    }
    
    // ===============================================================================
    // PROGRESS SIMULATION - EXTRACTED FROM dashboard.js
    // ===============================================================================
    
    simulateProgress(analysisId) {
        const analysis = this.activeAnalyses.get(analysisId);
        if (!analysis) return;
        
        const steps = [
            { progress: 10, message: 'Connecting to Instagram...', delay: 500 },
            { progress: 30, message: 'Downloading profile data...', delay: 1500 },
            { progress: 50, message: 'Analyzing engagement patterns...', delay: 2000 },
            { progress: 70, message: analysis.analysisType === 'deep' 
                ? 'Deep analysis in progress...' 
                : 'Processing insights...', delay: 2500 },
            { progress: 85, message: analysis.analysisType === 'deep' 
                ? 'Generating outreach message...' 
                : 'Finalizing results...', delay: 2000 },
            { progress: 95, message: 'Saving to database...', delay: 1000 }
        ];
        
        let currentStep = 0;
        const updateProgress = () => {
            if (currentStep < steps.length && analysis.status === 'analyzing') {
                const step = steps[currentStep];
                this.updateAnalysis(analysisId, {
                    progress: step.progress,
                    message: step.message
                });
                currentStep++;
                setTimeout(updateProgress, step.delay);
            }
        };
        
        // Start after initial delay
        setTimeout(updateProgress, 100);
    }
    
    // ===============================================================================
    // API INTEGRATION
    // ===============================================================================
    
    async callAnalysisAPI(requestData) {
        try {
            const session = await this.supabase.auth.getSession();
            if (!session?.data?.session?.access_token) {
                throw new Error('No valid session token');
            }
            
            // Use the existing API endpoint
            const apiUrl = 'https://ai-outreach-api.oslira.workers.dev/analyze';
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.data.session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('❌ [AnalysisQueue] API call failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ===============================================================================
    // UTILITY METHODS
    // ===============================================================================
    
    generateId() {
        return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getQueueStats() {
        const analyses = Array.from(this.activeAnalyses.values());
        
        return {
            total: analyses.length,
            starting: analyses.filter(a => a.status === 'starting').length,
            analyzing: analyses.filter(a => a.status === 'analyzing').length,
            completed: analyses.filter(a => a.status === 'completed').length,
            failed: analyses.filter(a => a.status === 'failed').length
        };
    }
    
    isAnalyzing(username) {
        return Array.from(this.activeAnalyses.values()).some(
            analysis => analysis.username.toLowerCase() === username.toLowerCase() &&
                       (analysis.status === 'starting' || analysis.status === 'analyzing')
        );
    }
    
    async cleanup() {
        console.log('🧹 [AnalysisQueue] Cleaning up...');
        
        // Clear all active analyses
        this.activeAnalyses.clear();
        this.stateManager.setState('analysisQueue', new Map());
        
        // Hide and remove queue container
        const container = document.getElementById('analysis-queue-container');
        if (container) {
            container.remove();
        }
        
        console.log('✅ [AnalysisQueue] Cleanup completed');
    }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalysisQueue };
} else {
    window.AnalysisQueue = AnalysisQueue;
}
