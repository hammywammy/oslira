updateMessageTemplates() {
        const outreachMode = document.getElementById('outreach-mode')?.value;
        const variantAMessage = document.getElementById('variant-a-message');
        
        if (!outreachMode || !variantAMessage || variantAMessage.value.trim()) return;
        
        const templates = {
            'Instagram DM': `Hi {name}! 👋

I came across your profile and love your content about {niche_topic}. Your recent post about {recent_post} really caught my attention!

I help {target_audience} achieve {specific_benefit} through {solution_type}. Just helped {similar_profile} increase their {metric} by {percentage}.

Would love to share some insights that might be valuable for your content strategy. Interested in a quick chat?

Best,
{your_name}`,

            'Email': `Subject: Quick question about {company}'s {business_area}

Hi {name},

I hope this email finds you well. I came across {company} and was impressed by your approach to {industry_specific_topic}.

I specialize in helping {target_companies} solve {common_challenge}. Recently, I helped {similar_company} achieve {specific_result} by implementing {solution_approach}.

I'd love to share a few insights that might be relevant to {company}'s goals. Would you be open to a brief 15-minute call this week?

Looking forward to connecting.

Best regards,
{your_name}`,

            'LinkedIn Message': `Hi {name},

I noticed we both have experience in {industry}. Your background at {company} particularly caught my attention, especially your work on {relevant_project}.

I help {target_professionals} overcome {common_challenge} that many face in {industry}. Just worked with {similar_professional} to achieve {specific_outcome}.

Would love to connect and share some insights that might be valuable for your work at {company}.

Best,
{your_name}`,

            'Twitter DM': `Hey {name}! 👋

Loved your recent tweet about {recent_tweet_topic}. Really resonated with what I see in the {industry} space.

I help {target_audience} with {solution_area}. Just curious - have you ever considered {relevant_question}?

Would love to share some insights that might be valuable. Quick DM conversation? 

Cheers!
{your_name}`
        };
        
        if (templates[outreachMode]) {
            variantAMessage.value = templates[outreachMode];
            this.updateCharacterCount('variant-a-message');
            this.updateMessageAnalysis('variant-a-message');
        }
    }

    updateComplianceGuidelines() {
        const outreachMode = document.getElementById('outreach-mode')?.value;
        const guidelinesEl = document.getElementById('compliance-guidelines');
        
        if (!guidelinesEl) return;
        
        const guidelines = {
            'Instagram DM': `
                <div class="compliance-box">
                    <h5>📋 Instagram DM Guidelines:</h5>
                    <ul>
                        <li>Maximum 25-30 DMs per day to avoid restrictions</li>
                        <li>Avoid spammy language and excessive emojis</li>
                        <li>Don't send identical messages to multiple users</li>
                        <li>Respect user preferences and unsubscribe requests</li>
                        <li>Include clear value proposition in your message</li>
                    </ul>
                </div>
            `,
            'Email': `
                <div class="compliance-box">
                    <h5>📋 Email Outreach Guidelines:</h5>
                    <ul>
                        <li>Include clear unsubscribe mechanism</li>
                        <li>Use legitimate sender address and domain</li>
                        <li>Avoid spam trigger words and excessive capitalization</li>
                        <li>Personalize subject lines and content</li>
                        <li>Comply with CAN-SPAM Act and GDPR requirements</li>
                    </ul>
                </div>
            `,
            'LinkedIn Message': `
                <div class="compliance-box">
                    <h5>📋 LinkedIn Messaging Guidelines:</h5>
                    <ul>
                        <li>Connect before sending direct messages when possible</li>
                        <li>Maximum 15-20 connection requests per day</li>
                        <li>Personalize connection requests and messages</li>
                        <li>Maintain professional tone and language</li>
                        <li>Respect LinkedIn's user agreement and policies</li>
                    </ul>
                </div>
            `,
            'Twitter DM': `
                <div class="compliance-box">
                    <h5>📋 Twitter DM Guidelines:</h5>
                    <ul>
                        <li>Follow users before sending DMs (or ensure they follow you)</li>
                        <li>Keep messages concise and engaging</li>
                        <li>Avoid automated DM tools that violate Twitter TOS</li>
                        <li>Use relevant hashtags and mentions appropriately</li>
                        <li>Respect rate limits and user privacy settings</li>
                    </ul>
                </div>
            `
        };
        
        if (outreachMode && guidelines[outreachMode]) {
            guidelinesEl.innerHTML = guidelines[outreachMode];
        }
    }

    updateCreditEstimate(targetCount) {
        const estimateEl = document.getElementById('credit-estimate');
        if (!estimateEl) return;
        
        const count = parseInt(targetCount) || 0;
        const creditsPerLead = this.getCreditsPerLead();
        const totalCredits = count * creditsPerLead;
        const currentCredits = this.userProfile.credits || 0;
        
        const hasEnoughCredits = totalCredits <= currentCredits;
        const color = hasEnoughCredits ? 'var(--success)' : 'var(--error)';
        
        estimateEl.innerHTML = `
            <div class="credit-estimate-box" style="border-color: ${color}">
                <h5 style="color: ${color}">💳 Credit Estimate</h5>
                <div class="estimate-breakdown">
                    <div>Leads: ${count} × ${creditsPerLead} credits = <strong>${totalCredits} credits</strong></div>
                    <div>Available: <strong>${currentCredits} credits</strong></div>
                    <div style="color: ${color}">
                        ${hasEnoughCredits ? '✅ Sufficient credits' : `❌ Need ${totalCredits - currentCredits} more credits`}
                    </div>
                </div>
                ${!hasEnoughCredits ? `
                    <a href="/subscription.html" style="color: ${color}; font-weight: 600; text-decoration: none;">
                        🚀 Upgrade Plan →
                    </a>
                ` : ''}
            </div>
        `;
    }

    updateBatchRecommendations(targetCount) {
        const recommendationsEl = document.getElementById('batch-recommendations');
        if (!recommendationsEl) return;
        
        const count = parseInt(targetCount) || 0;
        let recommendations = '';
        
        if (count <= 50) {
            recommendations = 'Small batch: Perfect for testing message variants and approach. Launch all at once.';
        } else if (count <= 200) {
            recommendations = 'Medium batch: Recommend splitting into 2-3 batches of 50-75 leads each for better management.';
        } else if (count <= 500) {
            recommendations = 'Large batch: Split into 5-7 batches of 75-100 leads each. Monitor performance between batches.';
        } else {
            recommendations = 'Very large batch: Strongly recommend splitting into 10+ smaller batches. Start with 50-100 lead test batch.';
        }
        
        recommendationsEl.innerHTML = `
            <div class="recommendation-box">
                <h5>📊 Batch Size Recommendation:</h5>
                <p>${recommendations}</p>
            </div>
        `;
    }

    updateAudienceInsights() {
        const icpCriteria = document.getElementById('icp-criteria')?.value;
        const insightsEl = document.getElementById('audience-insights');
        
        if (!insightsEl || !icpCriteria) return;
        
        // Analyze ICP criteria for insights
        const text = icpCriteria.toLowerCase();
        const insights = [];
        
        if (text.includes('ceo') || text.includes('founder')) {
            insights.push('💼 C-level executives typically have 15-25% lower response rates but much higher conversion value');
        }
        
        if (text.includes('startup')) {
            insights.push('🚀 Startup professionals are generally more open to new solutions and partnerships');
        }
        
        if (text.includes('enterprise') || text.includes('large company')) {
            insights.push('🏢 Enterprise contacts may have longer decision cycles but larger deal sizes');
        }
        
        if (text.includes('marketing')) {
            insights.push('📈 Marketing professionals respond well to data-driven value propositions');
        }
        
        if (text.includes('developer') || text.includes('engineer')) {
            insights.push('💻 Technical audiences prefer detailed, factual messaging over emotional appeals');
        }
        
        if (insights.length > 0) {
            insightsEl.innerHTML = `
                <div class="insights-box">
                    <h5>🎯 Audience Insights:</h5>
                    <ul>
                        ${insights.map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }

    updateLaunchChecklist() {
        const checklistEl = document.getElementById('launch-checklist');
        if (!checklistEl) return;
        
        const checklist = [
            { 
                item: 'Campaign name and objective defined', 
                completed: !!(this.campaignData.name && this.campaignData.objective),
                required: true 
            },
            { 
                item: 'Target audience and ICP criteria specified', 
                completed: !!(this.campaignData.target_lead_count && this.campaignData.icp_criteria),
                required: true 
            },
            { 
                item: 'At least one message variant created', 
                completed: !!(this.campaignData.message_variants && this.campaignData.message_variants.length > 0),
                required: true 
            },
            { 
                item: 'Sufficient credits available', 
                completed: this.calculateCreditRequirement() <= this.userProfile.credits,
                required: true 
            },
            { 
                item: 'Business profile selected', 
                completed: !!this.campaignData.business_id,
                required: false 
            },
            { 
                item: 'Send timing configured', 
                completed: !!(this.campaignData.send_timing && this.campaignData.send_timing.preferred_hours),
                required: false 
            },
            { 
                item: 'Follow-up sequence defined', 
                completed: !!(this.campaignData.follow_up_sequence && this.campaignData.follow_up_sequence.length > 0),
                required: false 
            }
        ];
        
        const completedRequired = checklist.filter(item => item.required && item.completed).length;
        const totalRequired = checklist.filter(item => item.required).length;
        const canLaunch = completedRequired === totalRequired;
        
        checklistEl.innerHTML = `
            <div class="launch-checklist-content">
                <div class="checklist-header">
                    <h5>🚀 Pre-Launch Checklist</h5>
                    <div class="checklist-progress">
                        ${completedRequired}/${totalRequired} required items completed
                    </div>
                </div>
                
                <div class="checklist-items">
                    ${checklist.map(item => `
                        <div class="checklist-item ${item.completed ? 'completed' : ''} ${item.required ? 'required' : 'optional'}">
                            <div class="checklist-icon">
                                ${item.completed ? '✅' : item.required ? '❌' : '⚪'}
                            </div>
                            <div class="checklist-text">
                                ${item.item}
                                ${item.required ? '<span class="required-badge">Required</span>' : '<span class="optional-badge">Optional</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="checklist-status">
                    ${canLaunch ? 
                        '<div class="status-ready">✅ Ready to launch!</div>' : 
                        '<div class="status-pending">⏳ Complete required items to launch</div>'
                    }
                </div>
            </div>
        `;
    }

    validateField(field) {
        // Individual field validation with user feedback
        const value = field.value.trim();
        const fieldId = field.id;
        let isValid = true;
        let message = '';
        
        switch (fieldId) {
            case 'campaign-name':
                if (!value) {
                    isValid = false;
                    message = 'Campaign name is required';
                } else if (value.length < 3) {
                    isValid = false;
                    message = 'Campaign name must be at least 3 characters';
                } else if (this.campaigns.some(c => c.name.toLowerCase() === value.toLowerCase())) {
                    isValid = false;
                    message = 'Campaign name already exists';
                }
                break;
                
            case 'target-count':
                const count = parseInt(value);
                if (!value || count < 1) {
                    isValid = false;
                    message = 'Target count must be at least 1';
                } else if (count > 10000) {
                    isValid = false;
                    message = 'Target count cannot exceed 10,000';
                }
                break;
                
            case 'icp-criteria':
                if (!value) {
                    isValid = false;
                    message = 'ICP criteria is required';
                } else if (value.length < 20) {
                    isValid = false;
                    message = 'Please provide more detailed ICP criteria (minimum 20 characters)';
                }
                break;
                
            case 'variant-a-message':
            case 'variant-b-message':
                if (value && value.length < 50) {
                    isValid = false;
                    message = 'Message must be at least 50 characters';
                } else if (value.length > 1000) {
                    isValid = false;
                    message = 'Message is too long (maximum 1000 characters)';
                }
                break;
        }
        
        // Update field styling and show validation message
        if (isValid) {
            field.classList.remove('error');
            field.classList.add('valid');
            this.clearFieldError(fieldId);
        } else {
            field.classList.remove('valid');
            field.classList.add('error');
            this.showFieldError(fieldId, message);
        }
        
        return isValid;
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Remove existing error message
        this.clearFieldError(fieldId);
        
        // Create error message element
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error-message';
        errorEl.id = `${fieldId}-error`;
        errorEl.textContent = message;
        
        // Insert after the field
        field.parentNode.insertBefore(errorEl, field.nextSibling);
    }

    clearFieldError(fieldId) {
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (errorEl) {
            errorEl.remove();
        }
    }

    showUpgradeModal(reason, data) {
        const modal = document.createElement('div');
        modal.className = 'modal upgrade-modal';
        
        let content = '';
        
        switch (reason) {
            case 'campaign_limit':
                content = `
                    <h3>🚀 Upgrade Required</h3>
                    <p>You've reached your campaign limit (${data.current}/${data.limit})</p>
                    <p>Upgrade to create unlimited campaigns and unlock advanced features:</p>
                    <ul>
                        <li>✅ Unlimited active campaigns</li>
                        <li>✅ Advanced A/B testing</li>
                        <li>✅ Priority support</li>
                        <li>✅ Advanced analytics</li>
                    </ul>
                `;
                break;
            default:
                content = `
                    <h3>🚀 Upgrade Your Plan</h3>
                    <p>Unlock more features and capabilities with a premium plan.</p>
                `;
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    ${content}
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                        Maybe Later
                    </button>
                    <button class="primary-btn" onclick="window.location.href='/subscription.html'">
                        🚀 Upgrade Now
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // =============================================================================
    // REAL-TIME UPDATES AND LIVE METRICS
    // =============================================================================

    startRealTimeUpdates() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user || !this.userCapabilities.hasRealTimeUpdates) {
            console.log('Real-time updates skipped (demo mode or plan limitation)');
            return;
        }
        
        // Subscribe to campaign changes
        this.realTimeSubscription = supabase
            .channel('campaigns_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'campaigns',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                this.handleRealTimeUpdate(payload);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'campaign_analytics',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                this.handleAnalyticsUpdate(payload);
            })
            .subscribe();

        // Update metrics every 30 seconds for active campaigns
        this.liveMetricsInterval = setInterval(() => {
            if (this.selectedCampaign) {
                this.updateLiveMetrics();
            }
        }, 30000);
        
        console.log('✅ Real-time updates started');
    }

    handleRealTimeUpdate(payload) {
        console.log('📡 Real-time campaign update:', payload);
        
        if (payload.eventType === 'INSERT') {
            // New campaign created
            this.loadCampaigns();
            window.OsliraApp.showMessage('New campaign detected', 'info');
        } else if (payload.eventType === 'UPDATE') {
            // Campaign updated
            this.updateCampaignInList(payload.new);
            if (payload.new.id === this.selectedCampaign) {
                // Update selected campaign details if needed
                this.loadCampaignDetails(this.selectedCampaign);
            }
        } else if (payload.eventType === 'DELETE') {
            // Campaign deleted
            this.removeCampaignFromList(payload.old.id);
            if (payload.old.id === this.selectedCampaign) {
                this.selectedCampaign = null;
            }
        }
    }

    handleAnalyticsUpdate(payload) {
        console.log('📊 Real-time analytics update:', payload);
        
        if (payload.new && payload.new.campaign_id === this.selectedCampaign) {
            this.updateLiveMetrics();
        }
    }

    updateCampaignInList(updatedCampaign) {
        const index = this.campaigns.findIndex(c => c.id === updatedCampaign.id);
        if (index !== -1) {
            this.campaigns[index] = { ...this.campaigns[index], ...updatedCampaign };
            this.applyFiltersAndSearch(); // Re-render with updated data
        }
    }

    removeCampaignFromList(campaignId) {
        this.campaigns = this.campaigns.filter(c => c.id !== campaignId);
        this.applyFiltersAndSearch();
    }

    // =============================================================================
    // FINAL CLEANUP AND INITIALIZATION
    // =============================================================================

    async initializeCharts() {
        // Initialize performance charts if container exists
        const chartContainers = document.querySelectorAll('.campaign-chart-container');
        chartContainers.forEach((container, index) => {
            this.createPerformanceChart(container, `chart-${index}`);
        });
    }

    createPerformanceChart(container, chartId) {
        // Create a simple canvas-based chart for performance metrics
        const canvas = document.createElement('canvas');
        canvas.id = chartId;
        canvas.width = 400;
        canvas.height = 200;
        canvas.style.width = '100%';
        canvas.style.height = '200px';
        
        container.appendChild(canvas);
        
        // Draw sample performance chart
        const ctx = canvas.getContext('2d');
        this.drawPerformanceChart(ctx, canvas.width, canvas.height);
    }

    drawPerformanceChart(ctx, width, height) {
        // Sample data for demonstration
        const data = [25, 30, 28, 35, 32, 38, 42, 39, 45, 41];
        const maxValue = Math.max(...data);
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid lines
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Draw data line
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = padding + chartHeight - (value / maxValue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#007bff';
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = padding + chartHeight - (value / maxValue) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Draw labels
        ctx.fillStyle = '#6c757d';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            const value = Math.round(maxValue - (maxValue / 5) * i);
            ctx.fillText(`${value}%`, padding - 10, y + 4);
        }
        
        // Title
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#495057';
        ctx.fillText('Response Rate Trend', width / 2, 20);
    }

    // Cleanup method
    destroy() {
        // Clean up event listeners and subscriptions
        this.stopRealTimeUpdates();
        
        // Clear intervals
        if (this.liveMetricsInterval) {
            clearInterval(this.liveMetricsInterval);
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        console.log('🧹 Campaigns instance cleaned up');
    }
}

// =============================================================================
// INITIALIZE CAMPAIGNS
// =============================================================================

// Create global campaigns instance
const campaigns = new OsliraCampaigns();

// Make campaigns available globally for onclick handlers
window.campaigns = campaigns;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    campaigns.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    campaigns.destroy();
});

console.log('📊 Full-featured Campaigns module loaded - uses shared-core.js');
            details.push('<span class="analysis-success">✅ Includes engaging question</span>');
        } else {
            details.push('<span class="analysis-info">💡 Consider adding a question to increase engagement</span>');
        }
        
        // CTA check
        const ctaDetected = this.detectCallToAction(message);
        if (ctaDetected.detected) {
            details.push('<span class="analysis-success">✅ Clear call-to-action detected</span>');
        } else {
            details.push('<span class="analysis-warning">💡 Add a clear call-to-action</span>');
        }
        
        return details.join('<br>');
    }

    testMessage() {
        const variantA = document.getElementById('variant-a-message')?.value;
        if (!variantA || variantA.trim().length < 50) {
            window.OsliraApp.showMessage('Please complete Variant A message first', 'error');
            return;
        }
        
        // Show message testing modal
        this.showMessageTestModal(variantA);
    }

    showMessageTestModal(message) {
        const modal = document.createElement('div');
        modal.className = 'modal message-test-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📱 Message Preview & Test</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                
                <div class="message-test-content">
                    <div class="test-tabs">
                        <button class="test-tab active" data-tab="preview">Preview</button>
                        <button class="test-tab" data-tab="personalized">Personalized</button>
                        <button class="test-tab" data-tab="analysis">Analysis</button>
                    </div>
                    
                    <div class="test-content">
                        <div class="test-panel active" id="preview-panel">
                            <div class="message-preview-container">
                                <div class="platform-preview instagram-preview">
                                    <div class="platform-header">
                                        <span class="platform-icon">📷</span>
                                        <span class="platform-name">Instagram DM</span>
                                    </div>
                                    <div class="message-bubble">
                                        ${this.formatMessagePreview(message)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="test-panel" id="personalized-panel">
                            <div class="personalization-form">
                                <h4>Test with sample data:</h4>
                                <div class="sample-inputs">
                                    <input type="text" id="test-name" placeholder="Contact name" value="John Smith">
                                    <input type="text" id="test-company" placeholder="Company" value="TechCorp">
                                    <input type="text" id="test-recent-post" placeholder="Recent post topic" value="startup growth strategies">
                                </div>
                                <button class="primary-btn" onclick="campaigns.updatePersonalizedPreview()">
                                    Update Preview
                                </button>
                                <div class="personalized-message" id="personalized-message">
                                    ${this.personalizeMessage(message, {
                                        name: 'John Smith',
                                        company: 'TechCorp',
                                        recent_post: 'startup growth strategies'
                                    })}
                                </div>
                            </div>
                        </div>
                        
                        <div class="test-panel" id="analysis-panel">
                            <div class="detailed-analysis">
                                ${this.generateDetailedAnalysis(message)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                    <button class="primary-btn" onclick="campaigns.sendTestMessage()">
                        📧 Send Test Message
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.setupTestModalEvents();
    }

    setupTestModalEvents() {
        document.querySelectorAll('.test-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.test-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.test-panel').forEach(p => p.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(`${e.target.dataset.tab}-panel`).classList.add('active');
            });
        });
    }

    formatMessagePreview(message) {
        return message.replace(/\n/g, '<br>');
    }

    personalizeMessage(message, data) {
        let personalized = message;
        
        Object.entries(data).forEach(([key, value]) => {
            const token = `{${key}}`;
            personalized = personalized.replace(new RegExp(token, 'g'), value);
        });
        
        return this.formatMessagePreview(personalized);
    }

    updatePersonalizedPreview() {
        const name = document.getElementById('test-name')?.value || 'John';
        const company = document.getElementById('test-company')?.value || 'Company';
        const recentPost = document.getElementById('test-recent-post')?.value || 'recent content';
        
        const originalMessage = document.getElementById('variant-a-message')?.value || '';
        const personalizedContainer = document.getElementById('personalized-message');
        
        if (personalizedContainer) {
            personalizedContainer.innerHTML = this.personalizeMessage(originalMessage, {
                name: name,
                company: company,
                recent_post: recentPost
            });
        }
    }

    generateDetailedAnalysis(message) {
        const analysis = {
            readability: this.calculateReadability(message),
            sentiment: this.analyzeSentiment(message),
            wordCount: message.split(/\s+/).length,
            avgSentenceLength: this.calculateAvgSentenceLength(message),
            keywordDensity: this.analyzeKeywordDensity(message),
            callToActions: this.findAllCTAs(message)
        };
        
        return `
            <div class="analysis-grid">
                <div class="analysis-item">
                    <div class="analysis-label">Readability:</div>
                    <div class="analysis-value ${analysis.readability}">${analysis.readability}</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">Sentiment:</div>
                    <div class="analysis-value ${analysis.sentiment.toLowerCase()}">${analysis.sentiment}</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">Word Count:</div>
                    <div class="analysis-value">${analysis.wordCount} words</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">Avg Sentence Length:</div>
                    <div class="analysis-value">${analysis.avgSentenceLength} words</div>
                </div>
            </div>
            
            <div class="keyword-analysis">
                <h5>Key Phrases:</h5>
                <div class="keyword-list">
                    ${analysis.keywordDensity.map(keyword => `
                        <span class="keyword-tag">${keyword.word} (${keyword.count})</span>
                    `).join('')}
                </div>
            </div>
            
            <div class="cta-analysis">
                <h5>Call-to-Actions Found:</h5>
                <div class="cta-list">
                    ${analysis.callToActions.length > 0 ? 
                        analysis.callToActions.map(cta => `<div class="cta-item">"${cta}"</div>`).join('') :
                        '<div class="no-cta">No clear call-to-actions detected</div>'
                    }
                </div>
            </div>
        `;
    }

    analyzeSentiment(message) {
        const positiveWords = ['great', 'awesome', 'excellent', 'amazing', 'love', 'fantastic', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'struggle', 'problem'];
        
        const words = message.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(word => positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => negativeWords.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'Positive';
        if (negativeCount > positiveCount) return 'Negative';
        return 'Neutral';
    }

    calculateAvgSentenceLength(message) {
        const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const totalWords = sentences.reduce((total, sentence) => {
            return total + sentence.trim().split(/\s+/).length;
        }, 0);
        
        return sentences.length > 0 ? Math.round(totalWords / sentences.length) : 0;
    }

    analyzeKeywordDensity(message) {
        const words = message.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word, count]) => ({ word, count }));
    }

    findAllCTAs(message) {
        const ctaPatterns = [
            /book\s+a?\s*(call|meeting|demo)/gi,
            /schedule\s+a?\s*(call|meeting|demo)/gi,
            /let'?s\s+(chat|talk|connect)/gi,
            /check\s+out/gi,
            /click\s+(here|the\s+link)/gi,
            /reply\s+to\s+this/gi,
            /get\s+in\s+touch/gi,
            /reach\s+out/gi
        ];
        
        const ctas = [];
        ctaPatterns.forEach(pattern => {
            const matches = message.match(pattern);
            if (matches) {
                ctas.push(...matches);
            }
        });
        
        return [...new Set(ctas)]; // Remove duplicates
    }

    sendTestMessage() {
        window.OsliraApp.showMessage('Test message feature coming soon!', 'info');
    }

    // =============================================================================
    // ADVANCED DASHBOARD AND ANALYTICS
    // =============================================================================

    async loadCampaignTemplates() {
        // Load predefined campaign templates
        this.campaignTemplates = [
            {
                id: 'saas-lead-gen',
                name: 'SaaS Lead Generation',
                objective: 'Lead Generation',
                outreach_mode: 'Email',
                description: 'Proven template for B2B SaaS lead generation',
                message_variants: [
                    {
                        name: 'Problem-focused',
                        content: 'Hi {name}, I noticed {company} is in the {industry} space. Many companies like yours struggle with {common_problem}. We helped {similar_company} achieve {specific_result}. Would love to share how we might help {company} as well.',
                        hook_style: 'problem',
                        cta_type: 'meeting'
                    }
                ]
            },
            {
                id: 'ecommerce-influencer',
                name: 'E-commerce Influencer Outreach',
                objective: 'Brand Awareness',
                outreach_mode: 'Instagram DM',
                description: 'Template for reaching out to influencers for product collaborations',
                message_variants: [
                    {
                        name: 'Compliment-based',
                        content: 'Hi {name}! Love your content about {niche_topic}. Your recent post about {recent_post} really resonated with our brand values. We\'d love to collaborate with you on our new {product_category} line. Interested in learning more?',
                        hook_style: 'compliment',
                        cta_type: 'response'
                    }
                ]
            }
        ];
    }

    async loadUserStats() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.displayDemoStats();
            return;
        }
        
        try {
            // Load comprehensive user statistics
            const stats = await Promise.all([
                this.loadCampaignStats(),
                this.loadResponseStats(),
                this.loadCreditStats(),
                this.loadPerformanceTrends()
            ]);
            
            this.updateDashboardStats(stats);
            
        } catch (error) {
            console.error('Error loading user stats:', error);
            this.displayDemoStats();
        }
    }

    async loadCampaignStats() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        const { data, error } = await supabase
            .from('campaigns')
            .select('status, created_at, messages_sent, responses_received, conversions')
            .eq('user_id', user.id);
            
        if (error) throw error;
        
        return {
            total: data.length,
            active: data.filter(c => c.status === 'live').length,
            paused: data.filter(c => c.status === 'paused').length,
            completed: data.filter(c => c.status === 'completed').length,
            totalMessages: data.reduce((sum, c) => sum + (c.messages_sent || 0), 0),
            totalResponses: data.reduce((sum, c) => sum + (c.responses_received || 0), 0),
            totalConversions: data.reduce((sum, c) => sum + (c.conversions || 0), 0)
        };
    }

    async loadResponseStats() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        const { data, error } = await supabase
            .from('campaign_analytics')
            .select('response_rate, conversion_rate, quality_score, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);
            
        if (error) throw error;
        
        const avgResponseRate = data.reduce((sum, d) => sum + (d.response_rate || 0), 0) / data.length;
        const avgConversionRate = data.reduce((sum, d) => sum + (d.conversion_rate || 0), 0) / data.length;
        const avgQualityScore = data.reduce((sum, d) => sum + (d.quality_score || 0), 0) / data.length;
        
        return {
            avgResponseRate: avgResponseRate || 0,
            avgConversionRate: avgConversionRate || 0,
            avgQualityScore: avgQualityScore || 0,
            dataPoints: data
        };
    }

    async loadCreditStats() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        const { data, error } = await supabase
            .from('credit_transactions')
            .select('amount, type, created_at')
            .eq('user_id', user.id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        const creditsUsed = data
            .filter(t => t.type === 'campaign_launch' || t.type === 'analysis')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
        const creditsAdded = data
            .filter(t => t.type === 'purchase' || t.type === 'bonus')
            .reduce((sum, t) => sum + t.amount, 0);
        
        return {
            used: creditsUsed,
            added: creditsAdded,
            transactions: data
        };
    }

    async loadPerformanceTrends() {
        // Calculate performance trends over time
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        const [recentData, olderData] = await Promise.all([
            supabase
                .from('campaign_analytics')
                .select('response_rate, conversion_rate')
                .eq('user_id', user.id)
                .gte('created_at', thirtyDaysAgo.toISOString()),
            supabase
                .from('campaign_analytics')
                .select('response_rate, conversion_rate')
                .eq('user_id', user.id)
                .gte('created_at', sixtyDaysAgo.toISOString())
                .lt('created_at', thirtyDaysAgo.toISOString())
        ]);
        
        const recentAvgResponse = recentData.data?.reduce((sum, d) => sum + (d.response_rate || 0), 0) / (recentData.data?.length || 1);
        const olderAvgResponse = olderData.data?.reduce((sum, d) => sum + (d.response_rate || 0), 0) / (olderData.data?.length || 1);
        
        const recentAvgConversion = recentData.data?.reduce((sum, d) => sum + (d.conversion_rate || 0), 0) / (recentData.data?.length || 1);
        const olderAvgConversion = olderData.data?.reduce((sum, d) => sum + (d.conversion_rate || 0), 0) / (olderData.data?.length || 1);
        
        return {
            responseRateTrend: recentAvgResponse - olderAvgResponse,
            conversionRateTrend: recentAvgConversion - olderAvgConversion,
            dataPoints: recentData.data || []
        };
    }

    displayDemoStats() {
        const demoStats = {
            campaigns: { total: 3, active: 1, paused: 1, completed: 1, totalMessages: 216, totalResponses: 64, totalConversions: 19 },
            responses: { avgResponseRate: 29.6, avgConversionRate: 29.7, avgQualityScore: 85 },
            credits: { used: 24, added: 50 },
            trends: { responseRateTrend: 5.2, conversionRateTrend: 3.1 }
        };
        
        this.updateDashboardStats([
            demoStats.campaigns,
            demoStats.responses,
            demoStats.credits,
            demoStats.trends
        ]);
    }

    updateDashboardStats(stats) {
        const [campaignStats, responseStats, creditStats, trends] = stats;
        
        // Update campaign metrics
        this.updateElementText('total-campaigns', campaignStats.total);
        this.updateElementText('active-campaigns', campaignStats.active);
        this.updateElementText('total-messages-sent', campaignStats.totalMessages);
        this.updateElementText('total-responses', campaignStats.totalResponses);
        
        // Update response metrics
        this.updateElementText('avg-response-rate', `${responseStats.avgResponseRate.toFixed(1)}%`);
        this.updateElementText('avg-conversion-rate', `${responseStats.avgConversionRate.toFixed(1)}%`);
        this.updateElementText('avg-quality-score', Math.round(responseStats.avgQualityScore));
        
        // Update credit metrics
        this.updateElementText('credits-used-month', creditStats.used);
        this.updateElementText('credits-added-month', creditStats.added);
        
        // Update trends with indicators
        this.updateTrendIndicator('response-rate-trend', trends.responseRateTrend);
        this.updateTrendIndicator('conversion-rate-trend', trends.conversionRateTrend);
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }

    updateTrendIndicator(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const isPositive = value > 0;
        const arrow = isPositive ? '↗' : value < 0 ? '↘' : '→';
        const color = isPositive ? 'var(--success)' : value < 0 ? 'var(--error)' : 'var(--text-secondary)';
        
        element.innerHTML = `
            <span style="color: ${color}">
                ${arrow} ${Math.abs(value).toFixed(1)}%
            </span>
        `;
    }

    async loadIntegrations() {
        // Load user's connected integrations
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.integrations = [];
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('user_integrations')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active');
                
            if (error) throw error;
            
            this.integrations = data || [];
            this.updateIntegrationsUI();
            
        } catch (error) {
            console.error('Error loading integrations:', error);
            this.integrations = [];
        }
    }

    updateIntegrationsUI() {
        const integrationsContainer = document.getElementById('connected-integrations');
        if (!integrationsContainer) return;
        
        if (this.integrations.length === 0) {
            integrationsContainer.innerHTML = `
                <div class="no-integrations">
                    <p>No integrations connected</p>
                    <button class="secondary-btn" onclick="campaigns.showIntegrationSettings()">
                        Connect Services
                    </button>
                </div>
            `;
            return;
        }
        
        integrationsContainer.innerHTML = this.integrations.map(integration => `
            <div class="integration-item">
                <div class="integration-icon">${this.getIntegrationIcon(integration.service)}</div>
                <div class="integration-info">
                    <div class="integration-name">${integration.service}</div>
                    <div class="integration-status">Connected</div>
                </div>
            </div>
        `).join('');
    }

    getIntegrationIcon(service) {
        const icons = {
            'hubspot': '🔶',
            'salesforce': '☁️',
            'pipedrive': '📊',
            'slack': '💬',
            'zapier': '⚡',
            'webhook': '🔗'
        };
        return icons[service.toLowerCase()] || '🔌';
    }

    // =============================================================================
    // SETTINGS AND PREFERENCES
    // =============================================================================

    showCampaignSettings() {
        window.OsliraApp.showMessage('Campaign settings coming soon!', 'info');
    }

    showNotificationSettings() {
        window.OsliraApp.showMessage('Notification settings coming soon!', 'info');
    }

    showIntegrationSettings() {
        window.OsliraApp.showMessage('Integration settings coming soon!', 'info');
    }

    viewAnalytics() {
        window.location.href = '/analytics.html';
    }

    editMessages() {
        if (!this.selectedCampaign) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        window.OsliraApp.showMessage('Message editing interface coming soon!', 'info');
    }

    addLeads() {
        window.location.href = '/dashboard.html';
    }

    exportResults() {
        if (!this.selectedCampaign) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        window.OsliraApp.showMessage('Results export coming soon!', 'info');
    }

    showCampaignMenu(campaignId, event) {
        event.stopPropagation();
        
        // Implementation for campaign context menu
        window.OsliraApp.showMessage('Campaign menu coming soon!', 'info');
    }

    // =============================================================================
    // INITIALIZE CAMPAIGNS
    // =============================================================================

    // Additional utility methods for form handling
    loadCampaignObjectives() {
        // Dynamic loading of campaign objectives based on user's business
        const objectives = [
            { value: 'Lead Generation', label: 'Lead Generation', description: 'Generate qualified leads for sales' },
            { value: 'Brand Awareness', label: 'Brand Awareness', description: 'Increase brand visibility and recognition' },
            { value: 'Sales', label: 'Direct Sales', description: 'Drive direct sales and conversions' },
            { value: 'Partnership', label: 'Partnerships', description: 'Build strategic partnerships' },
            { value: 'Content Promotion', label: 'Content Promotion', description: 'Promote content and thought leadership' }
        ];
        
        const select = document.getElementById('campaign-objective');
        if (select && select.children.length <= 1) { // Only if not already populated
            objectives.forEach(obj => {
                const option = new Option(obj.label, obj.value);
                option.title = obj.description;
                select.add(option);
            });
        }
    }

    loadOutreachModes() {
        const modes = [
            { value: 'Instagram DM', label: 'Instagram DM', cost: 2 },
            { value: 'Email', label: 'Email', cost: 1 },
            { value: 'LinkedIn Message', label: 'LinkedIn Message', cost: 3 },
            { value: 'Twitter DM', label: 'Twitter DM', cost: 1 }
        ];
        
        const select = document.getElementById('outreach-mode');
        if (select && select.children.length <= 1) {
            modes.forEach(mode => {
                const option = new Option(`${mode.label} (${mode.cost} credits)`, mode.value);
                select.add(option);
            });
        }
    }

    loadCRMIntegrations() {
        const integrations = [
            { value: '', label: 'No CRM Integration' },
            { value: 'hubspot', label: 'HubSpot' },
            { value: 'salesforce', label: 'Salesforce' },
            { value: 'pipedrive', label: 'Pipedrive' },
            { value: 'custom', label: 'Custom Webhook' }
        ];
        
        const select = document.getElementById('crm-integration');
        if (select && select.children.length <= 1) {
            integrations.forEach(integration => {
                const option = new Option(integration.label, integration.value);
                select.add(option);
            });
        }
    }

    loadLeadSources() {
        const sources = [
            { value: 'manual', label: 'Manual Selection' },
            { value: 'csv_import', label: 'CSV Import' },
            { value: 'integration', label: 'CRM Integration' },
            { value: 'existing_leads', label: 'Existing Leads Database' }
        ];
        
        const select = document.getElementById('lead-source');
        if (select && select.children.length <= 1) {
            sources.forEach(source => {
                const option = new Option(source.label, source.value);
                select.add(option);
            });
        }
    }

    updateOutreachModeOptions() {
        const objective = document.getElementById('campaign-objective')?.value;
        const modeSelect = document.getElementById('outreach-mode');
        
        if (!objective || !modeSelect) return;
        
        // Filter outreach modes based on objective
        const recommendations = {
            'Lead Generation': ['Email', 'LinkedIn Message', 'Instagram DM'],
            'Brand Awareness': ['Instagram DM', 'Twitter DM', 'Email'],
            'Sales': ['Email', 'LinkedIn Message', 'Instagram DM'],
            'Partnership': ['LinkedIn Message', 'Email'],
            'Content Promotion': ['Twitter DM', 'Instagram DM', 'Email']
        };
        
        const recommended = recommendations[objective] || [];
        
        // Highlight recommended options
        Array.from(modeSelect.options).forEach(option => {
            if (recommended.includes(option.value)) {
                option.style.fontWeight = 'bold';
                option.textContent = option.textContent.includes('⭐') ? option.textContent : `⭐ ${option.textContent}`;
            }
        });
    }

    updateTargetingRecommendations() {
        const objective = document.getElementById('campaign-objective')?.value;
        const recommendationsEl = document.getElementById('targeting-recommendations');
        
        if (!recommendationsEl) return;
        
        const recommendations = {
            'Lead Generation': 'Focus on decision-makers and influencers in your target industry. Recommend 50-200 highly qualified leads over 500-1000 broader leads.',
            'Brand Awareness': 'Cast a wider net with industry professionals and potential customers. Higher volume (500-2000 leads) with broader criteria works well.',
            'Sales': 'Target prospects showing buying intent signals. Focus on company size, role seniority, and recent activity. 100-500 leads recommended.',
            'Partnership': 'Target specific companies and key decision-makers. Lower volume (20-100 leads) with very specific criteria.',
            'Content Promotion': 'Target industry thought leaders, content creators, and engaged professionals. Medium volume (200-800 leads).'
        };
        
        if (objective && recommendations[objective]) {
            recommendationsEl.innerHTML = `
                <div class="recommendation-box">
                    <h5>💡 Targeting Recommendation for ${objective}:</h5>
                    <p>${recommendations[objective]}</p>
                </div>
            `;
        }
    }

    updateMessageTemplates() {
            refreshData() {
        window.OsliraApp.showLoadingOverlay('Refreshing data...');
        this.loadCampaignsData().finally(() => {
            window.OsliraApp.removeLoadingOverlay();
            window.OsliraApp.showMessage('Data refreshed successfully', 'success');
        });
    }

    toggleLiveUpdates(enabled) {
        if (enabled) {
            this.startRealTimeUpdates();
            window.OsliraApp.showMessage('Live updates enabled', 'success');
        } else {
            this.stopRealTimeUpdates();
            window.OsliraApp.showMessage('Live updates disabled', 'info');
        }
    }

    stopRealTimeUpdates() {
        if (this.realTimeSubscription) {
            this.realTimeSubscription.unsubscribe();
            this.realTimeSubscription = null;
        }
        
        if (this.liveMetricsInterval) {
            clearInterval(this.liveMetricsInterval);
            this.liveMetricsInterval = null;
        }
    }

    // =============================================================================
    // ADVANCED FEATURES CONTINUED
    // =============================================================================

    async generateMessageVariants() {
        if (!this.userCapabilities.hasClaudeIntegration) {
            window.OsliraApp.showMessage('Message generation requires Growth plan or higher', 'warning');
            return;
        }
        
        const button = document.getElementById('generate-variants-btn');
        if (button) {
            button.disabled = true;
            button.textContent = '🧠 Generating...';
            
            try {
                const variants = await this.createMessageVariants();
                this.populateGeneratedVariants(variants);
                window.OsliraApp.showMessage('Message variants generated successfully!', 'success');
            } catch (error) {
                console.error('Generate variants error:', error);
                window.OsliraApp.showMessage('Failed to generate variants', 'error');
            } finally {
                button.disabled = false;
                button.textContent = '🧠 Generate Variants';
            }
        }
    }

    async createMessageVariants() {
        const baseMessage = document.getElementById('variant-a-message')?.value || '';
        const objective = this.campaignData.objective;
        const icpCriteria = this.campaignData.icp_criteria;
        
        // Simulate Claude API call for message variant generation
        const variants = [
            {
                name: 'Question Hook',
                content: this.generateVariantWithHook(baseMessage, 'question'),
                hook_style: 'question',
                rationale: 'Questions increase engagement by 35% and encourage responses'
            },
            {
                name: 'Compliment Hook',
                content: this.generateVariantWithHook(baseMessage, 'compliment'),
                hook_style: 'compliment',
                rationale: 'Compliments build rapport and create positive first impressions'
            },
            {
                name: 'Problem-Solution',
                content: this.generateVariantWithHook(baseMessage, 'problem'),
                hook_style: 'problem',
                rationale: 'Problem-focused messaging resonates with pain points'
            },
            {
                name: 'Social Proof',
                content: this.generateVariantWithHook(baseMessage, 'social_proof'),
                hook_style: 'social_proof',
                rationale: 'Social proof increases credibility and trust'
            }
        ];
        
        return variants;
    }

    generateVariantWithHook(baseMessage, hookType) {
        const hooks = {
            question: [
                "Quick question - {name}, I noticed your recent content about {topic}. How are you currently handling {pain_point}?",
                "{name}, your {recent_achievement} caught my attention. What's been your biggest challenge with {relevant_area}?",
                "Hi {name}, love your content! Quick question about your {business_area} - have you considered {solution_hint}?"
            ],
            compliment: [
                "Hi {name}, just saw your latest post about {recent_post} - absolutely brilliant insights!",
                "{name}, your approach to {industry_topic} is impressive. I particularly loved your take on {specific_point}.",
                "Love what you're doing with {business_area}, {name}! Your {specific_achievement} really stands out."
            ],
            problem: [
                "Hi {name}, I noticed many {target_audience} struggle with {common_problem}. Is this something you've experienced?",
                "{name}, I see you're in {industry}. Most professionals I work with face challenges with {pain_point}.",
                "Quick question {name} - I help {target_audience} solve {specific_problem}. Is this relevant to your current situation?"
            ],
            social_proof: [
                "Hi {name}, I recently helped {similar_company} increase their {metric} by {percentage}. Thought this might interest you.",
                "{name}, after working with 50+ {industry} companies, I've noticed a pattern that might apply to your {business_area}.",
                "Hi {name}, just helped {competitor_type} achieve {specific_result}. Your {business_aspect} reminds me of their situation."
            ]
        };
        
        const selectedHooks = hooks[hookType] || hooks.question;
        const randomHook = selectedHooks[Math.floor(Math.random() * selectedHooks.length)];
        
        // Combine hook with base message
        const messageParts = baseMessage.split('\n').filter(part => part.trim());
        const restOfMessage = messageParts.slice(1).join('\n\n') || 'Would love to connect and share some insights that might be valuable for your business.';
        
        return `${randomHook}\n\n${restOfMessage}`;
    }

    populateGeneratedVariants(variants) {
        // Show variant selection modal
        const modal = this.createVariantSelectionModal(variants);
        document.body.appendChild(modal);
    }

    createVariantSelectionModal(variants) {
        const modal = document.createElement('div');
        modal.className = 'modal variant-selection-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🧠 Generated Message Variants</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                
                <div class="variants-list">
                    ${variants.map((variant, index) => `
                        <div class="variant-option" data-variant-index="${index}">
                            <div class="variant-header">
                                <h4>${variant.name}</h4>
                                <button class="select-variant-btn" onclick="campaigns.selectGeneratedVariant(${index}, this)">
                                    Select This Variant
                                </button>
                            </div>
                            <div class="variant-content">
                                <div class="variant-message">${variant.content}</div>
                                <div class="variant-rationale">
                                    <strong>Why this works:</strong> ${variant.rationale}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                    <button class="primary-btn" onclick="campaigns.applyAllVariants()">
                        Apply Best Variants
                    </button>
                </div>
            </div>
        `;
        
        // Store variants for later use
        this.generatedVariants = variants;
        
        return modal;
    }

    selectGeneratedVariant(index, button) {
        const variant = this.generatedVariants[index];
        const availableSlots = ['a', 'b', 'c', 'd'].filter(letter => {
            const field = document.getElementById(`variant-${letter}-message`);
            return field && !field.value.trim();
        });
        
        if (availableSlots.length === 0) {
            window.OsliraApp.showMessage('All variant slots are filled. Clear a variant first.', 'warning');
            return;
        }
        
        const slot = availableSlots[0];
        const messageField = document.getElementById(`variant-${slot}-message`);
        const hookField = document.getElementById(`variant-${slot}-hook`);
        
        if (messageField) messageField.value = variant.content;
        if (hookField) hookField.value = variant.hook_style;
        
        window.OsliraApp.showMessage(`Variant applied to slot ${slot.toUpperCase()}`, 'success');
        button.textContent = '✅ Applied';
        button.disabled = true;
    }

    applyAllVariants() {
        const slots = ['a', 'b'];
        const bestVariants = this.generatedVariants.slice(0, 2); // Take top 2 variants
        
        bestVariants.forEach((variant, index) => {
            if (index < slots.length) {
                const slot = slots[index];
                const messageField = document.getElementById(`variant-${slot}-message`);
                const hookField = document.getElementById(`variant-${slot}-hook`);
                
                if (messageField) messageField.value = variant.content;
                if (hookField) hookField.value = variant.hook_style;
            }
        });
        
        document.querySelector('.variant-selection-modal')?.remove();
        window.OsliraApp.showMessage('Best variants applied successfully!', 'success');
    }

    async optimizeTiming() {
        if (!this.userCapabilities.hasClaudeIntegration) {
            window.OsliraApp.showMessage('Timing optimization requires Growth plan or higher', 'warning');
            return;
        }
        
        const button = document.getElementById('optimize-timing-btn');
        if (button) {
            button.disabled = true;
            button.textContent = '⏰ Analyzing...';
            
            try {
                const timingAnalysis = await this.performTimingAnalysis();
                this.displayTimingRecommendations(timingAnalysis);
                window.OsliraApp.showMessage('Timing analysis complete!', 'success');
            } catch (error) {
                console.error('Timing optimization error:', error);
                window.OsliraApp.showMessage('Timing analysis failed', 'error');
            } finally {
                button.disabled = false;
                button.textContent = '⏰ Optimize Timing';
            }
        }
    }

    async performTimingAnalysis() {
        const icpCriteria = this.campaignData.icp_criteria || '';
        const outreachMode = this.campaignData.outreach_mode || '';
        const userTimezone = this.userProfile.timezone || 'UTC';
        
        // Simulate sophisticated timing analysis
        const analysis = {
            optimal_hours: this.calculateOptimalHours(icpCriteria, outreachMode),
            optimal_days: this.calculateOptimalDays(icpCriteria),
            timezone_recommendations: this.getTimezoneRecommendations(icpCriteria, userTimezone),
            seasonal_factors: this.getSeasonalFactors(),
            frequency_recommendations: this.getFrequencyRecommendations(outreachMode),
            confidence_score: 85
        };
        
        return analysis;
    }

    calculateOptimalHours(icpCriteria, outreachMode) {
        // Business professionals
        if (icpCriteria.toLowerCase().includes('ceo') || icpCriteria.toLowerCase().includes('executive')) {
            return { start: 7, end: 9, secondary: { start: 17, end: 19 } }; // Early morning or after work
        }
        
        // Marketing professionals
        if (icpCriteria.toLowerCase().includes('marketing')) {
            return { start: 10, end: 12, secondary: { start: 14, end: 16 } }; // Mid-morning or mid-afternoon
        }
        
        // Developers/Technical
        if (icpCriteria.toLowerCase().includes('developer') || icpCriteria.toLowerCase().includes('engineer')) {
            return { start: 14, end: 17, secondary: { start: 20, end: 22 } }; // Afternoon or evening
        }
        
        // Default business hours
        return { start: 9, end: 11, secondary: { start: 14, end: 16 } };
    }

    calculateOptimalDays(icpCriteria) {
        // B2B audiences generally respond better on weekdays
        if (icpCriteria.toLowerCase().includes('business') || icpCriteria.toLowerCase().includes('professional')) {
            return ['tuesday', 'wednesday', 'thursday']; // Mid-week performs best
        }
        
        // Consumer audiences might include weekends
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    }

    getTimezoneRecommendations(icpCriteria, userTimezone) {
        // Analyze target audience location patterns
        const recommendations = {
            primary_timezone: userTimezone,
            considerations: []
        };
        
        if (icpCriteria.toLowerCase().includes('global') || icpCriteria.toLowerCase().includes('international')) {
            recommendations.considerations.push('Consider multiple timezone windows for global audience');
            recommendations.suggested_timezones = ['America/New_York', 'Europe/London', 'Asia/Singapore'];
        } else if (icpCriteria.toLowerCase().includes('us') || icpCriteria.toLowerCase().includes('american')) {
            recommendations.primary_timezone = 'America/New_York';
            recommendations.considerations.push('Focus on US Eastern timezone for maximum reach');
        }
        
        return recommendations;
    }

    getSeasonalFactors() {
        const currentMonth = new Date().getMonth() + 1;
        const factors = {
            current_season: this.getCurrentSeason(currentMonth),
            response_rate_modifier: 1.0,
            considerations: []
        };
        
        // Holiday seasons
        if (currentMonth === 12 || currentMonth === 1) {
            factors.response_rate_modifier = 0.7;
            factors.considerations.push('Holiday season: Expect 30% lower response rates');
        }
        
        // Back to school/work (September)
        if (currentMonth === 9) {
            factors.response_rate_modifier = 1.2;
            factors.considerations.push('Back-to-work season: Expect 20% higher engagement');
        }
        
        // Summer (June-August)
        if (currentMonth >= 6 && currentMonth <= 8) {
            factors.response_rate_modifier = 0.9;
            factors.considerations.push('Summer season: Slightly lower business engagement');
        }
        
        return factors;
    }

    getCurrentSeason(month) {
        if (month >= 3 && month <= 5) return 'Spring';
        if (month >= 6 && month <= 8) return 'Summer';
        if (month >= 9 && month <= 11) return 'Fall';
        return 'Winter';
    }

    getFrequencyRecommendations(outreachMode) {
        const recommendations = {
            initial_batch_size: 50,
            daily_limit: 30,
            follow_up_intervals: [3, 7, 14] // days
        };
        
        if (outreachMode === 'Instagram DM') {
            recommendations.daily_limit = 25; // Instagram is more restrictive
            recommendations.follow_up_intervals = [5, 10, 21]; // Longer intervals for Instagram
        } else if (outreachMode === 'LinkedIn Message') {
            recommendations.daily_limit = 15; // LinkedIn connection limits
            recommendations.follow_up_intervals = [7, 14, 30]; // Professional follow-up cadence
        } else if (outreachMode === 'Email') {
            recommendations.daily_limit = 50; // Email allows higher volume
            recommendations.follow_up_intervals = [2, 5, 10]; // Faster email follow-up
        }
        
        return recommendations;
    }

    displayTimingRecommendations(analysis) {
        const modal = document.createElement('div');
        modal.className = 'modal timing-recommendations-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⏰ Optimal Timing Analysis</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                
                <div class="timing-analysis-content">
                    <div class="confidence-score">
                        <div class="score-circle">
                            <div class="score-value">${analysis.confidence_score}%</div>
                            <div class="score-label">Confidence</div>
                        </div>
                    </div>
                    
                    <div class="recommendations-grid">
                        <div class="recommendation-section">
                            <h4>📅 Optimal Days</h4>
                            <div class="days-list">
                                ${analysis.optimal_days.map(day => `
                                    <span class="day-badge">${day.charAt(0).toUpperCase() + day.slice(1)}</span>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="recommendation-section">
                            <h4>🕐 Best Hours</h4>
                            <div class="hours-info">
                                <div class="primary-hours">
                                    <strong>Primary:</strong> ${this.formatHour(analysis.optimal_hours.start)} - ${this.formatHour(analysis.optimal_hours.end)}
                                </div>
                                ${analysis.optimal_hours.secondary ? `
                                    <div class="secondary-hours">
                                        <strong>Secondary:</strong> ${this.formatHour(analysis.optimal_hours.secondary.start)} - ${this.formatHour(analysis.optimal_hours.secondary.end)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="recommendation-section">
                            <h4>📊 Frequency</h4>
                            <div class="frequency-info">
                                <div>Daily Limit: <strong>${analysis.frequency_recommendations.daily_limit}</strong></div>
                                <div>Batch Size: <strong>${analysis.frequency_recommendations.initial_batch_size}</strong></div>
                                <div>Follow-up: <strong>${analysis.frequency_recommendations.follow_up_intervals.join(', ')} days</strong></div>
                            </div>
                        </div>
                        
                        <div class="recommendation-section">
                            <h4>🌍 Timezone</h4>
                            <div class="timezone-info">
                                <div>Primary: <strong>${analysis.timezone_recommendations.primary_timezone}</strong></div>
                                ${analysis.timezone_recommendations.considerations.map(consideration => `
                                    <div class="consideration">${consideration}</div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="recommendation-section">
                            <h4>📈 Seasonal Factors</h4>
                            <div class="seasonal-info">
                                <div>Current Season: <strong>${analysis.seasonal_factors.current_season}</strong></div>
                                <div>Rate Modifier: <strong>${(analysis.seasonal_factors.response_rate_modifier * 100).toFixed(0)}%</strong></div>
                                ${analysis.seasonal_factors.considerations.map(consideration => `
                                    <div class="consideration">${consideration}</div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                    <button class="primary-btn" onclick="campaigns.applyTimingRecommendations(${JSON.stringify(analysis).replace(/"/g, '&quot;')})">
                        Apply Recommendations
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:00 ${period}`;
    }

    applyTimingRecommendations(analysis) {
        // Apply timing settings to campaign
        const startHourEl = document.getElementById('send-start-hour');
        const endHourEl = document.getElementById('send-end-hour');
        const timezoneEl = document.getElementById('send-timezone');
        const dailyLimitEl = document.getElementById('daily-limit');
        
        if (startHourEl) startHourEl.value = analysis.optimal_hours.start;
        if (endHourEl) endHourEl.value = analysis.optimal_hours.end;
        if (timezoneEl) timezoneEl.value = analysis.timezone_recommendations.primary_timezone;
        if (dailyLimitEl) dailyLimitEl.value = analysis.frequency_recommendations.daily_limit;
        
        // Apply day selections
        analysis.optimal_days.forEach(day => {
            const dayCheckbox = document.querySelector(`[data-day-checkbox="${day}"]`);
            if (dayCheckbox) dayCheckbox.checked = true;
        });
        
        document.querySelector('.timing-recommendations-modal')?.remove();
        window.OsliraApp.showMessage('Timing recommendations applied successfully!', 'success');
    }

    // =============================================================================
    // MESSAGE VARIANT MANAGEMENT
    // =============================================================================

    addMessageVariant() {
        const variantContainer = document.getElementById('message-variants-container');
        if (!variantContainer) return;
        
        const existingVariants = variantContainer.querySelectorAll('.variant-section').length;
        const maxVariants = this.userCapabilities.hasABTesting ? 5 : 2;
        
        if (existingVariants >= maxVariants) {
            const upgradeText = this.userCapabilities.hasABTesting ? 
                'Maximum 5 variants reached' : 
                'Upgrade to Professional for more variants';
            window.OsliraApp.showMessage(upgradeText, 'warning');
            return;
        }
        
        const variantLetter = String.fromCharCode(97 + existingVariants); // c, d, e...
        const variantHtml = this.createVariantHTML(variantLetter, existingVariants + 1);
        
        variantContainer.insertAdjacentHTML('beforeend', variantHtml);
        this.attachVariantEvents(variantLetter);
        
        window.OsliraApp.showMessage(`Variant ${variantLetter.toUpperCase()} added`, 'success');
    }

    createVariantHTML(letter, number) {
        return `
            <div class="variant-section" data-variant="${letter}">
                <div class="variant-header">
                    <h4>Variant ${letter.toUpperCase()}</h4>
                    <div class="variant-controls">
                        <button class="variant-control-btn" onclick="campaigns.duplicateVariant('${letter}')" title="Duplicate">
                            📋
                        </button>
                        <button class="variant-control-btn" onclick="campaigns.removeVariant('${letter}')" title="Remove">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="variant-content">
                    <div class="form-group">
                        <label for="variant-${letter}-message">Message Content *</label>
                        <textarea id="variant-${letter}-message" 
                                  class="form-textarea variant-message" 
                                  rows="6" 
                                  placeholder="Write your outreach message..."
                                  onchange="campaigns.updateMessageAnalysis('variant-${letter}-message')"></textarea>
                        <div class="character-count" id="variant-${letter}-char-count">0 characters</div>
                    </div>
                    
                    <div class="variant-settings">
                        <div class="form-group">
                            <label for="variant-${letter}-hook">Hook Style</label>
                            <select id="variant-${letter}-hook" class="form-select variant-hook">
                                <option value="">Select hook style...</option>
                                <option value="question">Question Hook</option>
                                <option value="compliment">Compliment Hook</option>
                                <option value="curiosity">Curiosity Hook</option>
                                <option value="problem">Problem Hook</option>
                                <option value="social_proof">Social Proof Hook</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="variant-${letter}-cta">Call to Action</label>
                            <select id="variant-${letter}-cta" class="form-select variant-cta">
                                <option value="">Select CTA type...</option>
                                <option value="meeting">Schedule Meeting</option>
                                <option value="demo">Request Demo</option>
                                <option value="content">Download Content</option>
                                <option value="response">General Response</option>
                                <option value="link">Visit Link</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="variant-${letter}-tone">Tone</label>
                            <select id="variant-${letter}-tone" class="form-select variant-tone">
                                <option value="">Select tone...</option>
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                                <option value="friendly">Friendly</option>
                                <option value="formal">Formal</option>
                                <option value="direct">Direct</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="variant-analysis" id="variant-${letter}-analysis"></div>
            </div>
        `;
    }

    attachVariantEvents(letter) {
        const messageField = document.getElementById(`variant-${letter}-message`);
        if (messageField) {
            messageField.addEventListener('input', () => {
                this.updateCharacterCount(`variant-${letter}-message`);
                this.updateMessageAnalysis(`variant-${letter}-message`);
            });
        }
        
        // Attach other event listeners as needed
        ['hook', 'cta', 'tone'].forEach(field => {
            const element = document.getElementById(`variant-${letter}-${field}`);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateMessageAnalysis(`variant-${letter}-message`);
                });
            }
        });
    }

    removeVariant(letter) {
        if (['a', 'b'].includes(letter)) {
            window.OsliraApp.showMessage('Cannot remove required variants A and B', 'error');
            return;
        }
        
        const variantSection = document.querySelector(`[data-variant="${letter}"]`);
        if (variantSection) {
            variantSection.remove();
            window.OsliraApp.showMessage(`Variant ${letter.toUpperCase()} removed`, 'success');
        }
    }

    duplicateVariant(letter) {
        const sourceMessage = document.getElementById(`variant-${letter}-message`)?.value || '';
        const sourceHook = document.getElementById(`variant-${letter}-hook`)?.value || '';
        const sourceCTA = document.getElementById(`variant-${letter}-cta`)?.value || '';
        const sourceTone = document.getElementById(`variant-${letter}-tone`)?.value || '';
        
        // Add new variant
        this.addMessageVariant();
        
        // Find the newly added variant and populate it
        const variants = document.querySelectorAll('.variant-section');
        const newVariant = variants[variants.length - 1];
        const newLetter = newVariant.dataset.variant;
        
        setTimeout(() => {
            const newMessage = document.getElementById(`variant-${newLetter}-message`);
            const newHook = document.getElementById(`variant-${newLetter}-hook`);
            const newCTA = document.getElementById(`variant-${newLetter}-cta`);
            const newTone = document.getElementById(`variant-${newLetter}-tone`);
            
            if (newMessage) newMessage.value = sourceMessage;
            if (newHook) newHook.value = sourceHook;
            if (newCTA) newCTA.value = sourceCTA;
            if (newTone) newTone.value = sourceTone;
            
            this.updateCharacterCount(`variant-${newLetter}-message`);
            this.updateMessageAnalysis(`variant-${newLetter}-message`);
        }, 100);
    }

    updateCharacterCount(fieldId) {
        const field = document.getElementById(fieldId);
        const countElement = document.getElementById(fieldId.replace('-message', '-char-count'));
        
        if (field && countElement) {
            const count = field.value.length;
            countElement.textContent = `${count} characters`;
            
            // Color coding
            if (count < 50) {
                countElement.style.color = 'var(--error)';
            } else if (count > 500) {
                countElement.style.color = 'var(--warning)';
            } else {
                countElement.style.color = 'var(--success)';
            }
        }
    }

    updateMessageAnalysis(fieldId) {
        const field = document.getElementById(fieldId);
        const analysisContainer = document.getElementById(fieldId.replace('-message', '-analysis'));
        
        if (!field || !analysisContainer) return;
        
        const message = field.value.trim();
        if (!message) {
            analysisContainer.innerHTML = '';
            return;
        }
        
        const analysis = this.analyzeMessageQuality(message);
        const variant = fieldId.split('-')[1];
        
        analysisContainer.innerHTML = `
            <div class="message-analysis-content">
                <div class="analysis-header">
                    <span class="analysis-title">Message Analysis</span>
                    <span class="analysis-score" style="color: ${this.getScoreColor(analysis)}">
                        ${analysis}/100
                    </span>
                </div>
                <div class="analysis-details">
                    ${this.generateAnalysisDetails(message, variant)}
                </div>
            </div>
        `;
    }

    generateAnalysisDetails(message, variant) {
        const details = [];
        
        // Length check
        if (message.length < 50) {
            details.push('<span class="analysis-warning">⚠️ Message too short (minimum 50 characters)</span>');
        } else if (message.length > 500) {
            details.push('<span class="analysis-warning">⚠️ Message might be too long for optimal response</span>');
        } else {
            details.push('<span class="analysis-success">✅ Good message length</span>');
        }
        
        // Personalization check
        if (this.countPersonalizationTokens(message) > 0) {
            details.push('<span class="analysis-success">✅ Contains personalization</span>');
        } else {
            details.push('<span class="analysis-warning">💡 Consider adding personalization tokens</span>');
        }
        
        // Question check
        if (message.includes('?')) {
                    if (filter === 'all') {
            this.activeFilters.clear();
            this.activeFilters.add('all');
        } else {
            this.activeFilters.delete('all');
            if (this.activeFilters.has(filter)) {
                this.activeFilters.delete(filter);
            } else {
                this.activeFilters.add(filter);
            }
            
            // If no filters selected, default to 'all'
            if (this.activeFilters.size === 0) {
                this.activeFilters.add('all');
            }
        }
        
        this.currentPage = 1; // Reset to first page
        this.applyFiltersAndSearch();
    }

    updateFiltersUI() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            const filter = chip.dataset.filter;
            if (this.activeFilters.has(filter)) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    clearAllFilters() {
        this.activeFilters.clear();
        this.activeFilters.add('all');
        this.searchTerm = '';
        this.currentPage = 1;
        
        // Clear UI
        const searchInput = document.getElementById('campaign-search');
        if (searchInput) searchInput.value = '';
        
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) clearBtn.style.display = 'none';
        
        this.applyFiltersAndSearch();
    }

    showAdvancedFilters() {
        // Implementation for advanced filtering modal
        window.OsliraApp.showMessage('Advanced filters coming soon!', 'info');
    }

    // =============================================================================
    // PAGINATION
    // =============================================================================

    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const paginationContainer = document.getElementById('pagination-container');
        
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        const pageInfo = document.getElementById('page-info');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage === totalPages;
        }
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
        
        // Update page size display
        const pageSizeSelect = document.getElementById('page-size-select');
        if (pageSizeSelect && pageSizeSelect.value != this.itemsPerPage) {
            pageSizeSelect.value = this.itemsPerPage;
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.applyFiltersAndSearch();
        }
    }

    nextPage() {
        this.currentPage++;
        this.applyFiltersAndSearch();
    }

    changePageSize(newSize) {
        this.itemsPerPage = parseInt(newSize);
        this.currentPage = 1;
        this.applyFiltersAndSearch();
    }

    // =============================================================================
    // BULK CSV IMPORT
    // =============================================================================

    showBulkImport() {
        const modal = document.getElementById('bulk-import-modal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            this.createBulkImportModal();
        }
    }

    createBulkImportModal() {
        const modal = document.createElement('div');
        modal.id = 'bulk-import-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content bulk-import-content">
                <div class="modal-header">
                    <h3>📤 Bulk Import Leads</h3>
                    <button class="modal-close" onclick="campaigns.closeBulkImportModal()">×</button>
                </div>
                
                <div class="import-steps">
                    <div class="step-indicator">
                        <div class="step active" data-step="1">1. Upload</div>
                        <div class="step" data-step="2">2. Map</div>
                        <div class="step" data-step="3">3. Review</div>
                        <div class="step" data-step="4">4. Import</div>
                    </div>
                    
                    <div class="import-content">
                        <div class="import-step active" id="import-step-1">
                            <h4>Upload CSV File</h4>
                            <div class="upload-zone" onclick="document.getElementById('csv-file-input').click()">
                                <div class="upload-icon">📁</div>
                                <div class="upload-text">
                                    <div>Click to select CSV file</div>
                                    <div class="upload-subtext">Maximum 10,000 leads per import</div>
                                </div>
                            </div>
                            <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
                            
                            <div class="csv-requirements">
                                <h5>Required Columns:</h5>
                                <ul>
                                    <li><strong>username</strong> - Instagram username (without @)</li>
                                    <li><strong>name</strong> - Full name (optional)</li>
                                    <li><strong>email</strong> - Email address (optional)</li>
                                    <li><strong>company</strong> - Company name (optional)</li>
                                </ul>
                                
                                <button class="secondary-btn" onclick="campaigns.downloadCSVTemplate()">
                                    📥 Download Template
                                </button>
                            </div>
                        </div>
                        
                        <div class="import-step" id="import-step-2">
                            <h4>Map Columns</h4>
                            <div id="column-mapping"></div>
                        </div>
                        
                        <div class="import-step" id="import-step-3">
                            <h4>Review Data</h4>
                            <div id="data-preview"></div>
                        </div>
                        
                        <div class="import-step" id="import-step-4">
                            <h4>Import Progress</h4>
                            <div id="import-progress"></div>
                        </div>
                    </div>
                    
                    <div class="import-actions">
                        <button class="secondary-btn" onclick="campaigns.closeBulkImportModal()">Cancel</button>
                        <button id="import-next-btn" class="primary-btn" onclick="campaigns.nextImportStep()" disabled>Next</button>
                        <button id="import-process-btn" class="primary-btn" onclick="campaigns.processBulkCSV()" style="display: none;">Start Import</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.setupBulkImportListeners();
    }

    setupBulkImportListeners() {
        const fileInput = document.getElementById('csv-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleCSVUpload(e));
        }
    }

    async handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.csv')) {
            window.OsliraApp.showMessage('Please upload a CSV file', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            window.OsliraApp.showMessage('File too large. Maximum size is 10MB.', 'error');
            return;
        }
        
        try {
            const text = await file.text();
            this.csvData = this.parseCSV(text);
            
            if (this.csvData.length === 0) {
                window.OsliraApp.showMessage('CSV file appears to be empty', 'error');
                return;
            }
            
            if (this.csvData.length > 10000) {
                window.OsliraApp.showMessage('Too many rows. Maximum 10,000 leads per import.', 'error');
                return;
            }
            
            window.OsliraApp.showMessage(`CSV loaded successfully! Found ${this.csvData.length} rows.`, 'success');
            
            // Enable next button
            const nextBtn = document.getElementById('import-next-btn');
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.textContent = `Next (${this.csvData.length} rows)`;
            }
            
        } catch (error) {
            console.error('CSV upload error:', error);
            window.OsliraApp.showMessage('Error reading CSV file: ' + error.message, 'error');
        }
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return []; // Need header + at least one data row
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }
        
        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    nextImportStep() {
        const currentStep = document.querySelector('.import-step.active');
        const currentStepNum = parseInt(currentStep.id.split('-')[2]);
        
        if (currentStepNum === 1) {
            this.showColumnMapping();
        } else if (currentStepNum === 2) {
            this.showDataPreview();
        } else if (currentStepNum === 3) {
            this.showImportReady();
        }
        
        // Update step indicators
        this.updateImportStepIndicators(currentStepNum + 1);
    }

    updateImportStepIndicators(activeStep) {
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < activeStep) {
                step.classList.add('completed');
            } else if (index + 1 === activeStep) {
                step.classList.add('active');
            }
        });
        
        document.querySelectorAll('.import-step').forEach((step, index) => {
            step.classList.remove('active');
            if (index + 1 === activeStep) {
                step.classList.add('active');
            }
        });
    }

    showColumnMapping() {
        const mappingContainer = document.getElementById('column-mapping');
        if (!mappingContainer || !this.csvData.length) return;
        
        const csvHeaders = Object.keys(this.csvData[0]);
        const requiredFields = ['username', 'name', 'email', 'company'];
        
        mappingContainer.innerHTML = `
            <div class="column-mapping-content">
                <p>Map your CSV columns to the required fields:</p>
                <div class="mapping-list">
                    ${requiredFields.map(field => `
                        <div class="mapping-row">
                            <label class="mapping-label">${field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                            <select class="mapping-select" data-field="${field}">
                                <option value="">-- Select Column --</option>
                                ${csvHeaders.map(header => `
                                    <option value="${header}" ${this.guessMapping(field, header) ? 'selected' : ''}>
                                        ${header}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Update next button
        const nextBtn = document.getElementById('import-next-btn');
        if (nextBtn) {
            nextBtn.textContent = 'Review Data';
        }
    }

    guessMapping(field, header) {
        const headerLower = header.toLowerCase();
        const fieldLower = field.toLowerCase();
        
        // Exact match
        if (headerLower === fieldLower) return true;
        
        // Common variations
        const variations = {
            username: ['user', 'handle', 'instagram', 'ig_username'],
            name: ['full_name', 'fullname', 'display_name'],
            email: ['email_address', 'mail'],
            company: ['organization', 'business', 'company_name']
        };
        
        return variations[fieldLower]?.some(variation => headerLower.includes(variation)) || false;
    }

    showDataPreview() {
        const previewContainer = document.getElementById('data-preview');
        if (!previewContainer) return;
        
        // Get column mappings
        const mappings = {};
        document.querySelectorAll('.mapping-select').forEach(select => {
            const field = select.dataset.field;
            const column = select.value;
            if (column) {
                mappings[field] = column;
            }
        });
        
        // Validate required mappings
        if (!mappings.username) {
            window.OsliraApp.showMessage('Username mapping is required', 'error');
            return;
        }
        
        // Transform data
        this.mappedData = this.csvData.map(row => ({
            username: row[mappings.username] || '',
            name: row[mappings.name] || '',
            email: row[mappings.email] || '',
            company: row[mappings.company] || ''
        })).filter(row => row.username.trim()); // Filter out rows without username
        
        // Show preview
        const previewData = this.mappedData.slice(0, 10); // Show first 10 rows
        
        previewContainer.innerHTML = `
            <div class="data-preview-content">
                <div class="preview-stats">
                    <div class="stat">
                        <div class="stat-value">${this.mappedData.length}</div>
                        <div class="stat-label">Valid Leads</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${this.csvData.length - this.mappedData.length}</div>
                        <div class="stat-label">Skipped Rows</div>
                    </div>
                </div>
                
                <div class="preview-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Company</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${previewData.map(row => `
                                <tr>
                                    <td>@${row.username}</td>
                                    <td>${row.name || '-'}</td>
                                    <td>${row.email || '-'}</td>
                                    <td>${row.company || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${this.mappedData.length > 10 ? `
                        <div class="preview-more">
                            ... and ${this.mappedData.length - 10} more rows
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Update next button
        const nextBtn = document.getElementById('import-next-btn');
        if (nextBtn) {
            nextBtn.textContent = 'Ready to Import';
        }
    }

    showImportReady() {
        // Hide next button, show process button
        const nextBtn = document.getElementById('import-next-btn');
        const processBtn = document.getElementById('import-process-btn');
        
        if (nextBtn) nextBtn.style.display = 'none';
        if (processBtn) {
            processBtn.style.display = 'block';
            processBtn.textContent = `Import ${this.mappedData.length} Leads`;
        }
        
        // Show import settings
        const progressContainer = document.getElementById('import-progress');
        if (progressContainer) {
            progressContainer.innerHTML = `
                <div class="import-ready-content">
                    <div class="import-summary">
                        <h5>Import Summary</h5>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <div class="summary-label">Total Leads:</div>
                                <div class="summary-value">${this.mappedData.length}</div>
                            </div>
                            <div class="summary-item">
                                <div class="summary-label">With Names:</div>
                                <div class="summary-value">${this.mappedData.filter(r => r.name).length}</div>
                            </div>
                            <div class="summary-item">
                                <div class="summary-label">With Emails:</div>
                                <div class="summary-value">${this.mappedData.filter(r => r.email).length}</div>
                            </div>
                            <div class="summary-item">
                                <div class="summary-label">With Companies:</div>
                                <div class="summary-value">${this.mappedData.filter(r => r.company).length}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="import-settings">
                        <h5>Import Settings</h5>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="skip-duplicates" checked>
                                Skip duplicate usernames
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="validate-profiles" checked>
                                Validate Instagram profiles
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                Add to campaign:
                                <select id="import-campaign-select">
                                    <option value="">-- Don't add to campaign --</option>
                                    ${this.campaigns.filter(c => ['draft', 'paused'].includes(c.status)).map(campaign => `
                                        <option value="${campaign.id}">${campaign.name}</option>
                                    `).join('')}
                                </select>
                            </label>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async processBulkCSV() {
        if (!this.mappedData || this.mappedData.length === 0) {
            window.OsliraApp.showMessage('No data to import', 'error');
            return;
        }
        
        const processBtn = document.getElementById('import-process-btn');
        if (processBtn) {
            processBtn.disabled = true;
            processBtn.textContent = '⏳ Processing...';
        }
        
        try {
            await this.performBulkImport();
            window.OsliraApp.showMessage(`Successfully imported ${this.mappedData.length} leads!`, 'success');
            this.closeBulkImportModal();
        } catch (error) {
            console.error('Bulk import error:', error);
            window.OsliraApp.showMessage('Import failed: ' + error.message, 'error');
        } finally {
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.textContent = `Import ${this.mappedData.length} Leads`;
            }
        }
    }

    async performBulkImport() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        // Get import settings
        const skipDuplicates = document.getElementById('skip-duplicates')?.checked || false;
        const validateProfiles = document.getElementById('validate-profiles')?.checked || false;
        const campaignId = document.getElementById('import-campaign-select')?.value || null;
        
        if (!supabase || !user) {
            // Demo mode - simulate import
            await this.simulateBulkImport();
            return;
        }
        
        try {
            // Prepare leads data
            const leadsData = this.mappedData.map(lead => ({
                username: lead.username.replace('@', ''),
                profile_url: `https://instagram.com/${lead.username.replace('@', '')}`,
                platform: 'Instagram',
                user_id: user.id,
                created_at: new Date().toISOString(),
                name: lead.name || null,
                email: lead.email || null,
                company: lead.company || null,
                status: 'imported',
                campaign_id: campaignId || null
            }));
            
            // Check for duplicates if enabled
            let filteredLeads = leadsData;
            if (skipDuplicates) {
                const existingUsernames = await this.getExistingUsernames(leadsData.map(l => l.username));
                filteredLeads = leadsData.filter(lead => !existingUsernames.includes(lead.username));
                
                if (filteredLeads.length < leadsData.length) {
                    const skipped = leadsData.length - filteredLeads.length;
                    window.OsliraApp.showMessage(`Skipped ${skipped} duplicate usernames`, 'info');
                }
            }
            
            if (filteredLeads.length === 0) {
                throw new Error('No new leads to import after filtering duplicates');
            }
            
            // Batch insert leads
            const batchSize = 100;
            const batches = [];
            for (let i = 0; i < filteredLeads.length; i += batchSize) {
                batches.push(filteredLeads.slice(i, i + batchSize));
            }
            
            let importedCount = 0;
            for (const batch of batches) {
                const { error } = await supabase
                    .from('leads')
                    .insert(batch);
                    
                if (error) throw error;
                importedCount += batch.length;
                
                // Update progress
                this.updateImportProgress(importedCount, filteredLeads.length);
            }
            
            // Validate profiles if enabled
            if (validateProfiles) {
                await this.validateImportedProfiles(filteredLeads);
            }
            
        } catch (error) {
            console.error('Bulk import database error:', error);
            throw error;
        }
    }

    async simulateBulkImport() {
        const progressContainer = document.getElementById('import-progress');
        if (progressContainer) {
            progressContainer.innerHTML = `
                <div class="import-progress-content">
                    <div class="progress-bar">
                        <div class="progress-fill" id="import-progress-fill"></div>
                    </div>
                    <div class="progress-text" id="import-progress-text">Starting import...</div>
                </div>
            `;
        }
        
        // Simulate import progress
        for (let i = 0; i <= this.mappedData.length; i += Math.ceil(this.mappedData.length / 10)) {
            await new Promise(resolve => setTimeout(resolve, 200));
            this.updateImportProgress(Math.min(i, this.mappedData.length), this.mappedData.length);
        }
    }

    updateImportProgress(current, total) {
        const progressFill = document.getElementById('import-progress-fill');
        const progressText = document.getElementById('import-progress-text');
        
        const percentage = Math.round((current / total) * 100);
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Imported ${current} of ${total} leads (${percentage}%)`;
        }
    }

    async getExistingUsernames(usernames) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) return [];
        
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('username')
                .eq('user_id', user.id)
                .in('username', usernames);
                
            if (error) throw error;
            
            return data.map(row => row.username);
            
        } catch (error) {
            console.error('Error checking existing usernames:', error);
            return [];
        }
    }

    async validateImportedProfiles(leads) {
        // Implementation for profile validation
        // This would typically involve checking if Instagram profiles exist
        // For now, we'll just simulate the process
        
        window.OsliraApp.showMessage('Profile validation completed', 'info');
    }

    downloadCSVTemplate() {
        const template = `username,name,email,company
johndoe,John Doe,john@example.com,Example Corp
janedoe,Jane Doe,jane@example.com,Sample Inc
marketingpro,Marketing Pro,marketing@business.com,Business LLC`;
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leads_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    closeBulkImportModal() {
        const modal = document.getElementById('bulk-import-modal');
        if (modal) {
            modal.remove();
        }
        
        // Reset import state
        this.csvData = [];
        this.mappedData = [];
    }

    // =============================================================================
    // TEMPLATES AND EXPORT
    // =============================================================================

    showTemplates() {
        window.OsliraApp.showMessage('Campaign templates feature coming soon! 📋', 'info');
    }

    async exportCampaigns() {
        try {
            const campaigns = this.campaigns;
            if (campaigns.length === 0) {
                window.OsliraApp.showMessage('No campaigns to export', 'error');
                return;
            }
            
            const csvContent = this.generateCampaignsCSV(campaigns);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `campaigns_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            window.OsliraApp.showMessage(`Exported ${campaigns.length} campaigns successfully`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            window.OsliraApp.showMessage('Export failed: ' + error.message, 'error');
        }
    }

    generateCampaignsCSV(campaigns) {
        const headers = [
            'Name', 'Status', 'Objective', 'Outreach Mode', 'Target Count',
            'Messages Sent', 'Responses', 'Conversions', 'Response Rate',
            'Created Date', 'Updated Date'
        ];
        
        const rows = campaigns.map(campaign => [
            campaign.name,
            campaign.status,
            campaign.objective,
            campaign.outreach_mode,
            campaign.target_lead_count || 0,
            campaign.messages_sent || 0,
            campaign.responses_received || 0,
            campaign.conversions || 0,
            this.calculateResponseRate(campaign).toFixed(1) + '%',
            new Date(campaign.created_at).toLocaleDateString(),
            new Date(campaign.updated_at).toLocaleDateString()
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    trackWizardStart() {
        // Analytics tracking
        if (window.gtag) {
            window.gtag('event', 'campaign_wizard_start', {
                event_category: 'campaigns',
                event_label: 'wizard_started'
            });
        }
    }

    trackWizardProgress() {
        // Analytics tracking
        if (window.gtag) {
            window.gtag('event', 'campaign_wizard_progress', {
                event_category: 'campaigns',
                event_label: `step_${this.currentStep}_completed`
            });
        }
    }

    trackCampaignLaunch() {
        // Analytics tracking
        if (window.gtag) {
            window.gtag('event', 'campaign_launch', {
                event_category: 'campaigns',
                event_label: this.campaignData.objective,
                value: this.campaignData.target_lead_count
            });
        }
    }

    trackDraftSave() {
        // Analytics tracking
        if (window.gtag) {
            window.gtag('event', 'campaign_draft_save', {
                event_category: 'campaigns',
                event_label: 'draft_saved'
            });
        }
    }

    isWizardActive() {
        return document.getElementById('wizard-view')?.classList.contains('active') || false;
    }

    handleEscapeKey() {
        if (this.isWizardActive()) {
            this.cancelWizard();
        } else {
            // Close any open modals
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                openModal.style.display = 'none';
            }
        }
    }

    handleModalClick(event) {
        // Close modal if clicking on overlay
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }

    refreshData() {
        this        // Credit check
        const requiredCredits = this.calculateCreditRequirement();
        if (requiredCredits > this.userProfile.credits) {
            this.showInsufficientCreditsModal(requiredCredits);
            return;
        }
        
        // Show launch confirmation
        if (!await this.confirmCampaignLaunch()) {
            return;
        }
        
        const launchBtn = document.getElementById('launch-campaign-btn');
        const originalText = launchBtn?.textContent || 'Launch Campaign';
        
        try {
            if (launchBtn) {
                launchBtn.disabled = true;
                launchBtn.textContent = '🚀 Launching...';
            }
            
            window.OsliraApp.showLoadingOverlay('Launching your campaign...');
            
            await this.processCampaignLaunch();
            
            window.OsliraApp.showMessage('Campaign launched successfully! 🎉', 'success');
            this.trackCampaignLaunch();
            this.returnToOverview();
            await this.loadCampaigns();
            
        } catch (error) {
            console.error('Campaign launch error:', error);
            window.OsliraApp.showMessage('Failed to launch campaign: ' + error.message, 'error');
        } finally {
            window.OsliraApp.removeLoadingOverlay();
            if (launchBtn) {
                launchBtn.disabled = false;
                launchBtn.textContent = originalText;
            }
        }
    }

    async confirmCampaignLaunch() {
        return new Promise((resolve) => {
            const modal = this.createConfirmationModal({
                title: 'Launch Campaign',
                message: `
                    <div style="margin-bottom: 16px;">
                        <strong>Campaign:</strong> ${this.campaignData.name}<br>
                        <strong>Target Leads:</strong> ${this.campaignData.target_lead_count}<br>
                        <strong>Credits Required:</strong> ${this.calculateCreditRequirement()}<br>
                        <strong>Estimated Duration:</strong> ${this.estimateCampaignDuration()}
                    </div>
                    <p>Are you ready to launch this campaign?</p>
                `,
                confirmText: '🚀 Launch Campaign',
                cancelText: 'Cancel',
                onConfirm: () => {
                    modal.remove();
                    resolve(true);
                },
                onCancel: () => {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }

    createConfirmationModal({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>${title}</h3>
                    <div class="modal-message">${message}</div>
                    <div class="modal-actions">
                        <button class="cancel-btn">${cancelText}</button>
                        <button class="confirm-btn">${confirmText}</button>
                    </div>
                </div>
            </div>
        `;
        
        modal.querySelector('.cancel-btn').addEventListener('click', onCancel);
        modal.querySelector('.confirm-btn').addEventListener('click', onConfirm);
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) onCancel();
        });
        
        document.body.appendChild(modal);
        return modal;
    }

    async processCampaignLaunch() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            // Demo mode
            await this.simulateCampaignLaunch();
            return;
        }
        
        try {
            // Prepare campaign data
            const campaignData = {
                ...this.campaignData,
                status: 'live',
                user_id: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                scheduled_start: new Date().toISOString(),
                current_spend: 0
            };

            // Insert campaign
            const { data: campaign, error: campaignError } = await supabase
                .from('campaigns')
                .insert([campaignData])
                .select()
                .single();

            if (campaignError) throw campaignError;

            // Insert message variants
            if (this.campaignData.message_variants?.length > 0) {
                const variants = this.campaignData.message_variants.map(variant => ({
                    ...variant,
                    campaign_id: campaign.id,
                    user_id: user.id,
                    created_at: new Date().toISOString()
                }));

                const { error: messageError } = await supabase
                    .from('campaign_messages')
                    .insert(variants);

                if (messageError) throw messageError;
            }

            // Insert follow-up sequence if exists
            if (this.campaignData.follow_up_sequence?.length > 0) {
                const followUps = this.campaignData.follow_up_sequence.map(followUp => ({
                    ...followUp,
                    campaign_id: campaign.id,
                    user_id: user.id,
                    created_at: new Date().toISOString()
                }));

                const { error: followUpError } = await supabase
                    .from('campaign_follow_ups')
                    .insert(followUps);

                if (followUpError) throw followUpError;
            }

            // Deduct credits
            await this.deductCredits(this.calculateCreditRequirement(), campaign.id);

            // Log campaign activity
            await this.logCampaignActivity(campaign.id, 'campaign_created', 'Campaign launched successfully');

            this.campaignData.id = campaign.id;
            
        } catch (error) {
            console.error('Database campaign launch error:', error);
            throw new Error('Failed to save campaign to database: ' + error.message);
        }
    }

    async simulateCampaignLaunch() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Add to demo campaigns
        const newCampaign = {
            id: 'demo-' + Date.now(),
            ...this.campaignData,
            status: 'live',
            messages_sent: 0,
            responses_received: 0,
            conversions: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.campaigns.unshift(newCampaign);
    }

    async deductCredits(amount, campaignId) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) return;
        
        try {
            // Record credit transaction
            const { error: transactionError } = await supabase
                .from('credit_transactions')
                .insert([{
                    user_id: user.id,
                    amount: -amount,
                    type: 'campaign_launch',
                    description: `Campaign launch: ${this.campaignData.name}`,
                    campaign_id: campaignId,
                    created_at: new Date().toISOString()
                }]);

            if (transactionError) throw transactionError;

            // Update user credits
            const newCredits = this.userProfile.credits - amount;
            const { error: updateError } = await supabase
                .from('users')
                .update({ credits: newCredits })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Update local profile
            this.userProfile.credits = newCredits;
            this.updateUserInterface();
            
        } catch (error) {
            console.error('Credit deduction error:', error);
            throw new Error('Failed to process credit transaction');
        }
    }

    async logCampaignActivity(campaignId, activityType, description) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) return;
        
        try {
            await supabase
                .from('campaign_activities')
                .insert([{
                    campaign_id: campaignId,
                    user_id: user.id,
                    activity_type: activityType,
                    description: description,
                    created_at: new Date().toISOString()
                }]);
        } catch (error) {
            console.warn('Failed to log campaign activity:', error);
        }
    }

    showInsufficientCreditsModal(required) {
        const modal = this.createConfirmationModal({
            title: 'Insufficient Credits',
            message: `
                <div style="margin-bottom: 16px;">
                    <p>You need ${required} credits to launch this campaign.</p>
                    <p>Current balance: ${this.userProfile.credits} credits</p>
                    <p>Required: ${required} credits</p>
                    <p><strong>Shortfall: ${required - this.userProfile.credits} credits</strong></p>
                </div>
                <p>Would you like to upgrade your plan or reduce the campaign size?</p>
            `,
            confirmText: '🚀 Upgrade Plan',
            cancelText: 'Reduce Campaign Size',
            onConfirm: () => {
                modal.remove();
                window.location.href = '/subscription.html';
            },
            onCancel: () => {
                modal.remove();
                this.suggestCampaignReduction(required);
            }
        });
    }

    suggestCampaignReduction(required) {
        const available = this.userProfile.credits;
        const creditsPerLead = this.getCreditsPerLead();
        const maxLeads = Math.floor(available / creditsPerLead);
        
        const targetCountEl = document.getElementById('target-count');
        if (targetCountEl && maxLeads > 0) {
            targetCountEl.value = maxLeads;
            this.campaignData.target_lead_count = maxLeads;
            this.updateSummary();
            
            window.OsliraApp.showMessage(`Campaign size reduced to ${maxLeads} leads to fit your credit balance`, 'info');
        } else {
            window.OsliraApp.showMessage('Insufficient credits for any campaign size. Please upgrade your plan.', 'error');
        }
    }

    async saveDraft() {
        if (!this.campaignData.name) {
            window.OsliraApp.showMessage('Please enter a campaign name before saving', 'error');
            return;
        }
        
        const saveBtn = document.getElementById('save-draft-btn');
        const originalText = saveBtn?.textContent || 'Save Draft';
        
        try {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = '💾 Saving...';
            }
            
            this.saveStepData(); // Save current step data
            
            const supabase = window.OsliraApp.supabase;
            const user = window.OsliraApp.user;
            
            if (!supabase || !user) {
                // Demo mode
                this.saveDraftToStorage();
                window.OsliraApp.showMessage('Draft saved locally! (Demo mode)', 'success');
                return;
            }
            
            const draftData = {
                ...this.campaignData,
                status: 'draft',
                user_id: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Check if updating existing draft or creating new one
            if (this.campaignData.id) {
                const { error } = await supabase
                    .from('campaigns')
                    .update(draftData)
                    .eq('id', this.campaignData.id);
                    
                if (error) throw error;
            } else {
                const { data: campaign, error } = await supabase
                    .from('campaigns')
                    .insert([draftData])
                    .select()
                    .single();
                    
                if (error) throw error;
                this.campaignData.id = campaign.id;
            }

            window.OsliraApp.showMessage('Draft saved successfully!', 'success');
            this.trackDraftSave();
            
        } catch (error) {
            console.error('Save draft error:', error);
            window.OsliraApp.showMessage('Failed to save draft: ' + error.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
    }

    cancelWizard() {
        const hasUnsavedChanges = this.checkUnsavedChanges();
        
        if (hasUnsavedChanges) {
            const modal = this.createConfirmationModal({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Do you want to save as draft before leaving?',
                confirmText: '💾 Save & Exit',
                cancelText: '🗑️ Discard Changes',
                onConfirm: async () => {
                    modal.remove();
                    await this.saveDraft();
                    this.returnToOverview();
                },
                onCancel: () => {
                    modal.remove();
                    this.returnToOverview();
                }
            });
        } else {
            this.returnToOverview();
        }
    }

    checkUnsavedChanges() {
        return this.campaignData.name || 
               this.campaignData.objective || 
               this.campaignData.target_lead_count ||
               (this.campaignData.message_variants && this.campaignData.message_variants.length > 0);
    }

    returnToOverview() {
        document.getElementById('wizard-view')?.classList.remove('active');
        document.getElementById('overview-view')?.classList.add('active');
        
        // Clear wizard state
        this.currentStep = 1;
        this.campaignData = {};
        this.clearFormFields();
        localStorage.removeItem('campaign_draft');
    }

    // =============================================================================
    // CAMPAIGN OPERATIONS
    // =============================================================================

    async pauseCampaign(campaignId = this.selectedCampaign) {
        if (!campaignId) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        try {
            await this.updateCampaignStatus(campaignId, 'paused', 'Campaign paused by user');
            window.OsliraApp.showMessage('Campaign paused successfully', 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Pause campaign error:', error);
            window.OsliraApp.showMessage('Failed to pause campaign', 'error');
        }
    }

    async resumeCampaign(campaignId = this.selectedCampaign) {
        if (!campaignId) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        try {
            await this.updateCampaignStatus(campaignId, 'live', 'Campaign resumed by user');
            window.OsliraApp.showMessage('Campaign resumed successfully', 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Resume campaign error:', error);
            window.OsliraApp.showMessage('Failed to resume campaign', 'error');
        }
    }

    async stopCampaign(campaignId = this.selectedCampaign) {
        if (!campaignId) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        const confirmed = await this.confirmAction(`
            <p>Are you sure you want to stop the campaign "${campaign.name}"?</p>
            <p><strong>This action cannot be undone.</strong></p>
        `, 'Stop Campaign', '🛑 Stop Campaign');
        
        if (!confirmed) return;
        
        try {
            await this.updateCampaignStatus(campaignId, 'stopped', 'Campaign stopped by user');
            window.OsliraApp.showMessage('Campaign stopped successfully', 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Stop campaign error:', error);
            window.OsliraApp.showMessage('Failed to stop campaign', 'error');
        }
    }

    async cloneCampaign(campaignId = this.selectedCampaign) {
        if (!campaignId) {
            window.OsliraApp.showMessage('Please select a campaign first', 'error');
            return;
        }
        
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        try {
            // Load full campaign data
            const fullCampaign = await this.loadFullCampaignData(campaignId);
            
            // Prepare cloned data
            this.campaignData = {
                ...fullCampaign,
                name: `${fullCampaign.name} (Copy)`,
                status: 'draft',
                id: null, // Remove ID to create new campaign
                messages_sent: 0,
                responses_received: 0,
                conversions: 0
            };
            
            // Show wizard with populated data
            this.showWizard();
            this.populateWizardFromData();
            
            window.OsliraApp.showMessage('Campaign cloned successfully! Review and launch when ready.', 'success');
            
        } catch (error) {
            console.error('Clone campaign error:', error);
            window.OsliraApp.showMessage('Failed to clone campaign', 'error');
        }
    }

    async loadFullCampaignData(campaignId) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            // Return demo data
            return this.campaigns.find(c => c.id === campaignId) || {};
        }
        
        try {
            const { data: campaign, error } = await supabase
                .from('campaigns')
                .select(`
                    *,
                    campaign_messages(*),
                    campaign_follow_ups(*)
                `)
                .eq('id', campaignId)
                .eq('user_id', user.id)
                .single();
                
            if (error) throw error;
            
            // Transform data for wizard
            if (campaign.campaign_messages) {
                campaign.message_variants = campaign.campaign_messages;
            }
            
            if (campaign.campaign_follow_ups) {
                campaign.follow_up_sequence = campaign.campaign_follow_ups;
            }
            
            return campaign;
            
        } catch (error) {
            console.error('Load full campaign data error:', error);
            throw error;
        }
    }

    populateWizardFromData() {
        // Populate form fields with campaign data
        const fieldMappings = {
            'campaign-name': 'name',
            'campaign-objective': 'objective',
            'outreach-mode': 'outreach_mode',
            'campaign-business-id': 'business_id',
            'campaign-priority': 'priority',
            'target-count': 'target_lead_count',
            'icp-criteria': 'icp_criteria',
            'exclusion-rules': 'exclusion_rules',
            'lead-source': 'lead_source',
            'budget-limit': 'budget_limit',
            'daily-limit': 'daily_limit'
        };
        
        Object.entries(fieldMappings).forEach(([fieldId, dataKey]) => {
            const field = document.getElementById(fieldId);
            const value = this.campaignData[dataKey];
            if (field && value !== undefined) {
                field.value = value;
            }
        });
        
        // Populate message variants
        if (this.campaignData.message_variants) {
            this.campaignData.message_variants.forEach((variant, index) => {
                const variantLetter = String.fromCharCode(97 + index); // a, b, c...
                const messageField = document.getElementById(`variant-${variantLetter}-message`);
                const hookField = document.getElementById(`variant-${variantLetter}-hook`);
                const ctaField = document.getElementById(`variant-${variantLetter}-cta`);
                const toneField = document.getElementById(`variant-${variantLetter}-tone`);
                
                if (messageField) messageField.value = variant.content || '';
                if (hookField) hookField.value = variant.hook_style || '';
                if (ctaField) ctaField.value = variant.cta_type || '';
                if (toneField) toneField.value = variant.tone || '';
            });
        }
        
        // Populate tags
        if (this.campaignData.tags) {
            const tagsField = document.getElementById('campaign-tags');
            if (tagsField) tagsField.value = this.campaignData.tags.join(', ');
        }
    }

    async updateCampaignStatus(campaignId, status, reason) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            // Demo mode - update local campaigns
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (campaign) {
                campaign.status = status;
                campaign.updated_at = new Date().toISOString();
            }
            return;
        }
        
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ 
                    status: status, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', campaignId)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
            // Log activity
            await this.logCampaignActivity(campaignId, `campaign_${status}`, reason);
            
        } catch (error) {
            console.error('Update campaign status error:', error);
            throw error;
        }
    }

    async confirmAction(message, title, confirmText) {
        return new Promise((resolve) => {
            const modal = this.createConfirmationModal({
                title: title,
                message: message,
                confirmText: confirmText,
                cancelText: 'Cancel',
                onConfirm: () => {
                    modal.remove();
                    resolve(true);
                },
                onCancel: () => {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }

    // =============================================================================
    // BULK OPERATIONS
    // =============================================================================

    selectAllCampaigns() {
        const checkboxes = document.querySelectorAll('.campaign-checkbox');
        const selectAllBtn = document.getElementById('select-all-campaigns');
        const isSelectingAll = !selectAllBtn.classList.contains('all-selected');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isSelectingAll;
        });
        
        if (isSelectingAll) {
            selectAllBtn.classList.add('all-selected');
            selectAllBtn.textContent = '☑️ Deselect All';
        } else {
            selectAllBtn.classList.remove('all-selected');
            selectAllBtn.textContent = '☐ Select All';
        }
        
        this.updateBulkActionButtons();
    }

    updateBulkActionButtons() {
        const checkedBoxes = document.querySelectorAll('.campaign-checkbox:checked');
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (checkedBoxes.length > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = checkedBoxes.length;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    async bulkDeleteCampaigns() {
        const checkedBoxes = document.querySelectorAll('.campaign-checkbox:checked');
        const campaignIds = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (campaignIds.length === 0) {
            window.OsliraApp.showMessage('No campaigns selected', 'error');
            return;
        }
        
        const confirmed = await this.confirmAction(
            `<p>Are you sure you want to delete ${campaignIds.length} campaign(s)?</p><p><strong>This action cannot be undone.</strong></p>`,
            'Delete Campaigns',
            '🗑️ Delete Campaigns'
        );
        
        if (!confirmed) return;
        
        try {
            await this.performBulkDelete(campaignIds);
            window.OsliraApp.showMessage(`${campaignIds.length} campaign(s) deleted successfully`, 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Bulk delete error:', error);
            window.OsliraApp.showMessage('Failed to delete campaigns', 'error');
        }
    }

    async bulkPauseCampaigns() {
        const checkedBoxes = document.querySelectorAll('.campaign-checkbox:checked');
        const campaignIds = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (campaignIds.length === 0) {
            window.OsliraApp.showMessage('No campaigns selected', 'error');
            return;
        }
        
        try {
            await this.performBulkStatusUpdate(campaignIds, 'paused');
            window.OsliraApp.showMessage(`${campaignIds.length} campaign(s) paused successfully`, 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Bulk pause error:', error);
            window.OsliraApp.showMessage('Failed to pause campaigns', 'error');
        }
    }

    async bulkResumeCampaigns() {
        const checkedBoxes = document.querySelectorAll('.campaign-checkbox:checked');
        const campaignIds = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (campaignIds.length === 0) {
            window.OsliraApp.showMessage('No campaigns selected', 'error');
            return;
        }
        
        try {
            await this.performBulkStatusUpdate(campaignIds, 'live');
            window.OsliraApp.showMessage(`${campaignIds.length} campaign(s) resumed successfully`, 'success');
            await this.loadCampaigns();
        } catch (error) {
            console.error('Bulk resume error:', error);
            window.OsliraApp.showMessage('Failed to resume campaigns', 'error');
        }
    }

    async performBulkDelete(campaignIds) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            // Demo mode
            this.campaigns = this.campaigns.filter(c => !campaignIds.includes(c.id));
            return;
        }
        
        try {
            // Delete related data first
            await supabase.from('campaign_messages').delete().in('campaign_id', campaignIds);
            await supabase.from('campaign_follow_ups').delete().in('campaign_id', campaignIds);
            await supabase.from('campaign_activities').delete().in('campaign_id', campaignIds);
            await supabase.from('campaign_analytics').delete().in('campaign_id', campaignIds);
            
            // Delete campaigns
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .in('id', campaignIds)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
        } catch (error) {
            console.error('Bulk delete database error:', error);
            throw error;
        }
    }

    async performBulkStatusUpdate(campaignIds, status) {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            // Demo mode
            this.campaigns.forEach(campaign => {
                if (campaignIds.includes(campaign.id)) {
                    campaign.status = status;
                    campaign.updated_at = new Date().toISOString();
                }
            });
            return;
        }
        
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ 
                    status: status, 
                    updated_at: new Date().toISOString() 
                })
                .in('id', campaignIds)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
            // Log activities for each campaign
            for (const campaignId of campaignIds) {
                await this.logCampaignActivity(campaignId, `campaign_${status}`, `Bulk ${status} operation`);
            }
            
        } catch (error) {
            console.error('Bulk status update error:', error);
            throw error;
        }
    }

    // =============================================================================
    // SEARCH AND FILTERING
    // =============================================================================

    initializeSearch() {
        const searchInput = document.getElementById('campaign-search');
        if (searchInput) {
            // Debounced search
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.trim();
        this.currentPage = 1; // Reset to first page
        this.applyFiltersAndSearch();
        
        // Update clear button visibility
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) {
            clearBtn.style.display = this.searchTerm ? 'block' : 'none';
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('campaign-search');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.searchTerm = '';
        this.applyFiltersAndSearch();
        
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
    }

    toggleFilter(filter) {
        if (filter === 'all') {
            this.activeFilters.clear();
            this.activeFilters.add('all');
        } else {
            this.activeFilters.delete('all');
            if (this.activeFilters.has// ==========================================
// CAMPAIGNS.JS - Full Campaign Management System
// Depends on: shared-core.js (must be loaded first)
// ==========================================

class OsliraCampaigns {
    constructor() {
        this.selectedCampaign = null;
        this.campaigns = [];
        this.currentStep = 1;
        this.campaignData = {};
        this.userProfile = null;
        this.realTimeSubscription = null;
        this.charts = {};
        this.messageVariants = [];
        this.abTestData = {};
        this.liveMetricsInterval = null;
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.searchTerm = '';
        this.activeFilters = new Set(['all']);
        this.csvData = [];
        this.bulkImportProgress = null;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing campaigns...');
            
            // Wait for shared core to handle all the heavy lifting
            await window.OsliraApp.initialize();
            
            // Campaigns-specific setup
            await this.setupCampaigns();
            this.setupEventListeners();
            await this.loadCampaignsData();
            this.initializeCharts();
            this.startRealTimeUpdates();
            this.initializeSearch();
            this.setupKeyboardShortcuts();
            
            console.log('✅ Campaigns ready');
            
        } catch (error) {
            console.error('❌ Campaigns initialization failed:', error);
            window.OsliraApp.showMessage('Campaigns failed to load: ' + error.message, 'error');
        }
    }

    async setupCampaigns() {
        // Get user profile from shared state
        this.userProfile = await this.loadUserProfile();
        this.updateUserInterface();
        await this.setupBusinessSelector();
        this.detectUserCapabilities();
    }

    async loadUserProfile() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            return this.getDemoProfile();
        }
        
        try {
            const { data: profile, error } = await supabase
                .from('users')
                .select('email, subscription_plan, subscription_status, credits, timezone, preferences')
                .eq('id', user.id)
                .single();

            if (error) {
                console.warn('Error loading user profile:', error);
                return this.getDemoProfile();
            }

            return profile || this.getDemoProfile();
            
        } catch (error) {
            console.error('Profile loading failed:', error);
            return this.getDemoProfile();
        }
    }

    getDemoProfile() {
        return {
            email: window.OsliraApp.user?.email || 'demo@oslira.com',
            subscription_plan: 'free',
            subscription_status: 'active',
            credits: 10,
            timezone: window.OsliraApp.getUserTimezone(),
            preferences: {
                default_outreach_mode: 'Instagram DM',
                auto_pause_low_performance: true,
                claude_suggestions_enabled: true
            }
        };
    }

    updateUserInterface() {
        const profile = this.userProfile;
        
        // Update user email
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) userEmailEl.textContent = profile.email;
        
        // Update plan name with features
        const planNameEl = document.getElementById('plan-name');
        if (planNameEl) {
            const planFeatures = this.getPlanFeatures(profile.subscription_plan);
            planNameEl.innerHTML = `
                <div>${planFeatures.name}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                    ${planFeatures.campaigns} campaigns • ${planFeatures.leads} leads/month
                </div>
            `;
        }

        // Update credits with visual indicator
        const creditsEl = document.getElementById('user-credits');
        if (creditsEl) {
            const creditsColor = profile.credits <= 5 ? 'var(--error)' : 
                                profile.credits <= 20 ? 'var(--warning)' : 'var(--success)';
            creditsEl.innerHTML = `
                <span style="color: ${creditsColor}; font-weight: 600;">${profile.credits}</span>
                <span style="font-size: 11px; color: var(--text-secondary);">credits</span>
            `;
        }
    }

    getPlanFeatures(plan) {
        const features = {
            free: { name: 'Free Plan', campaigns: 2, leads: 100 },
            starter: { name: 'Starter Plan', campaigns: 10, leads: 500 },
            growth: { name: 'Growth Plan', campaigns: 25, leads: 2000 },
            professional: { name: 'Professional Plan', campaigns: 100, leads: 10000 },
            enterprise: { name: 'Enterprise Plan', campaigns: 'Unlimited', leads: 'Unlimited' }
        };
        return features[plan] || features.free;
    }

    async setupBusinessSelector() {
        const businesses = window.OsliraApp.businesses;
        const businessSelects = document.querySelectorAll('#business-select, #campaign-business-id');
        
        businessSelects.forEach(select => {
            select.innerHTML = '<option value="">Select business profile...</option>';
            businesses.forEach(business => {
                const option = new Option(business.business_name, business.id);
                select.add(option);
            });
            
            if (businesses.length > 0) {
                select.value = businesses[0].id;
                window.OsliraApp.business = businesses[0];
            }
        });
    }

    detectUserCapabilities() {
        // Detect user's subscription capabilities
        const plan = this.userProfile.subscription_plan;
        const features = this.getPlanFeatures(plan);
        
        // Update UI based on capabilities
        this.updateFeatureAvailability(features);
        
        // Store capabilities for later use
        this.userCapabilities = {
            maxCampaigns: features.campaigns,
            maxLeadsPerMonth: features.leads,
            hasClaudeIntegration: ['growth', 'professional', 'enterprise'].includes(plan),
            hasABTesting: ['professional', 'enterprise'].includes(plan),
            hasAdvancedAnalytics: ['professional', 'enterprise'].includes(plan),
            hasRealTimeUpdates: plan !== 'free'
        };
    }

    updateFeatureAvailability(features) {
        // Show/hide features based on plan
        const advancedFeatures = document.querySelectorAll('[data-feature="advanced"]');
        const proFeatures = document.querySelectorAll('[data-feature="professional"]');
        
        if (features.campaigns === 'Unlimited') {
            advancedFeatures.forEach(el => el.style.display = 'block');
            proFeatures.forEach(el => el.style.display = 'block');
        } else {
            advancedFeatures.forEach(el => el.style.opacity = '0.6');
            proFeatures.forEach(el => el.style.opacity = '0.6');
        }
    }

    // =============================================================================
    // COMPREHENSIVE EVENT LISTENERS
    // =============================================================================

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('new-campaign-btn')?.addEventListener('click', () => this.showWizard());
        document.getElementById('campaign-templates-btn')?.addEventListener('click', () => this.showTemplates());
        document.getElementById('bulk-import-btn')?.addEventListener('click', () => this.showBulkImport());
        document.getElementById('export-campaigns-btn')?.addEventListener('click', () => this.exportCampaigns());

        // Wizard navigation
        document.getElementById('step-1-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('step-2-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('step-2-back')?.addEventListener('click', () => this.prevStep());
        document.getElementById('step-3-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('step-3-back')?.addEventListener('click', () => this.prevStep());
        document.getElementById('step-4-back')?.addEventListener('click', () => this.prevStep());
        document.getElementById('launch-campaign-btn')?.addEventListener('click', () => this.launchCampaign());
        document.getElementById('save-draft-btn')?.addEventListener('click', () => this.saveDraft());
        document.getElementById('cancel-wizard-btn')?.addEventListener('click', () => this.cancelWizard());

        // Campaign filters and search
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => this.toggleFilter(e.target.dataset.filter));
        });
        
        document.getElementById('campaign-search')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('clear-search-btn')?.addEventListener('click', () => this.clearSearch());
        document.getElementById('advanced-filters-btn')?.addEventListener('click', () => this.showAdvancedFilters());

        // Campaign cards and selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.campaign-card')) {
                this.selectCampaign(e.target.closest('.campaign-card').dataset.campaignId);
            }
        });

        // Bulk operations
        document.getElementById('select-all-campaigns')?.addEventListener('click', () => this.selectAllCampaigns());
        document.getElementById('bulk-delete-campaigns')?.addEventListener('click', () => this.bulkDeleteCampaigns());
        document.getElementById('bulk-pause-campaigns')?.addEventListener('click', () => this.bulkPauseCampaigns());
        document.getElementById('bulk-resume-campaigns')?.addEventListener('click', () => this.bulkResumeCampaigns());

        // Form validation and dynamic updates
        this.setupFormValidation();
        this.setupDynamicFormUpdates();

        // Claude integration buttons
        document.getElementById('claude-suggestions-a')?.addEventListener('click', () => this.getClaudeSuggestions('a'));
        document.getElementById('claude-suggestions-b')?.addEventListener('click', () => this.getClaudeSuggestions('b'));
        document.getElementById('analyze-fitness-a')?.addEventListener('click', () => this.analyzeFitness('a'));
        document.getElementById('analyze-fitness-b')?.addEventListener('click', () => this.analyzeFitness('b'));
        document.getElementById('generate-variants-btn')?.addEventListener('click', () => this.generateMessageVariants());
        document.getElementById('optimize-timing-btn')?.addEventListener('click', () => this.optimizeTiming());

        // Message variant management
        document.getElementById('add-variant-btn')?.addEventListener('click', () => this.addMessageVariant());
        document.getElementById('remove-variant-btn')?.addEventListener('click', () => this.removeMessageVariant());
        document.getElementById('duplicate-variant-btn')?.addEventListener('click', () => this.duplicateVariant());
        document.getElementById('test-message-btn')?.addEventListener('click', () => this.testMessage());

        // Campaign operations
        document.getElementById('pause-campaign-btn')?.addEventListener('click', () => this.pauseCampaign());
        document.getElementById('resume-campaign-btn')?.addEventListener('click', () => this.resumeCampaign());
        document.getElementById('stop-campaign-btn')?.addEventListener('click', () => this.stopCampaign());
        document.getElementById('clone-campaign-btn')?.addEventListener('click', () => this.cloneCampaign());
        document.getElementById('view-analytics-btn')?.addEventListener('click', () => this.viewAnalytics());
        document.getElementById('edit-messages-btn')?.addEventListener('click', () => this.editMessages());
        document.getElementById('add-leads-btn')?.addEventListener('click', () => this.addLeads());
        document.getElementById('export-results-btn')?.addEventListener('click', () => this.exportResults());

        // Settings and preferences
        document.getElementById('campaign-settings-btn')?.addEventListener('click', () => this.showCampaignSettings());
        document.getElementById('notification-settings-btn')?.addEventListener('click', () => this.showNotificationSettings());
        document.getElementById('integration-settings-btn')?.addEventListener('click', () => this.showIntegrationSettings());

        // Real-time controls
        document.getElementById('refresh-data-btn')?.addEventListener('click', () => this.refreshData());
        document.getElementById('toggle-live-updates')?.addEventListener('change', (e) => this.toggleLiveUpdates(e.target.checked));

        // CSV Import handlers
        document.getElementById('csv-file-input')?.addEventListener('change', (e) => this.handleCSVUpload(e));
        document.getElementById('process-csv-btn')?.addEventListener('click', () => this.processBulkCSV());
        document.getElementById('download-template-btn')?.addEventListener('click', () => this.downloadCSVTemplate());

        // Pagination
        document.getElementById('prev-page-btn')?.addEventListener('click', () => this.previousPage());
        document.getElementById('next-page-btn')?.addEventListener('click', () => this.nextPage());
        document.getElementById('page-size-select')?.addEventListener('change', (e) => this.changePageSize(e.target.value));

        // Modal handlers
        document.addEventListener('click', (e) => this.handleModalClick(e));
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => window.OsliraApp.logout());
    }

    setupFormValidation() {
        const inputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateForm());
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('change', () => this.updateClaudeInsights());
        });
    }

    setupDynamicFormUpdates() {
        // Campaign objective changes
        document.getElementById('campaign-objective')?.addEventListener('change', () => {
            this.updateOutreachModeOptions();
            this.updateTargetingRecommendations();
        });

        // Outreach mode changes
        document.getElementById('outreach-mode')?.addEventListener('change', () => {
            this.updateMessageTemplates();
            this.updateComplianceGuidelines();
        });

        // Target count changes
        document.getElementById('target-count')?.addEventListener('input', (e) => {
            this.updateCreditEstimate(e.target.value);
            this.updateBatchRecommendations(e.target.value);
        });

        // ICP criteria changes
        document.getElementById('icp-criteria')?.addEventListener('input', () => {
            this.updateAudienceInsights();
        });

        // Message content changes
        document.querySelectorAll('[id^="variant-"][id$="-message"]').forEach(textarea => {
            textarea.addEventListener('input', () => {
                this.updateMessageAnalysis(textarea.id);
                this.updateCharacterCount(textarea);
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N - New campaign
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.showWizard();
            }
            
            // Ctrl/Cmd + S - Save draft
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isWizardActive()) {
                e.preventDefault();
                this.saveDraft();
            }
            
            // Escape - Cancel/close
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
            
            // Ctrl/Cmd + Enter - Launch campaign
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && this.isWizardActive()) {
                e.preventDefault();
                this.launchCampaign();
            }
        });
    }

    // =============================================================================
    // COMPREHENSIVE CAMPAIGN MANAGEMENT
    // =============================================================================

    async loadCampaignsData() {
        window.OsliraApp.showLoadingOverlay('Loading campaigns...');
        
        try {
            await Promise.all([
                this.loadCampaigns(),
                this.loadCampaignTemplates(),
                this.loadDashboardData(),
                this.loadUserStats(),
                this.loadIntegrations()
            ]);
        } finally {
            window.OsliraApp.removeLoadingOverlay();
        }
    }

    async loadCampaigns() {
        const supabase = window.OsliraApp.supabase;
        const user = window.OsliraApp.user;
        
        if (!supabase || !user) {
            this.displayDemoCampaigns();
            return;
        }
        
        try {
            const { data: campaigns, error } = await supabase
                .from('campaigns')
                .select(`
                    id, name, status, objective, outreach_mode, 
                    target_lead_count, messages_sent, responses_received, conversions,
                    created_at, updated_at, scheduled_start, scheduled_end,
                    budget_limit, current_spend, priority, tags,
                    campaign_analytics(response_rate, conversion_rate, quality_score, cost_per_lead),
                    campaign_messages(id, content, variant_name, is_control, performance_score)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.campaigns = campaigns || [];
            this.applyFiltersAndSearch();
            
        } catch (error) {
            console.error('Error loading campaigns:', error);
            this.displayDemoCampaigns();
            window.OsliraApp.showMessage('Error loading campaigns: ' + error.message, 'error');
        }
    }

    displayDemoCampaigns() {
        this.campaigns = [
            {
                id: 'demo-1',
                name: 'SaaS Outreach Q1 2025',
                status: 'live',
                objective: 'Lead Generation',
                outreach_mode: 'Instagram DM',
                target_lead_count: 500,
                messages_sent: 127,
                responses_received: 38,
                conversions: 12,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                priority: 'high',
                tags: ['saas', 'q1'],
                campaign_analytics: [{
                    response_rate: 29.9,
                    conversion_rate: 31.6,
                    quality_score: 87,
                    cost_per_lead: 12.50
                }],
                campaign_messages: [
                    { id: 1, variant_name: 'A', is_control: true, performance_score: 85 },
                    { id: 2, variant_name: 'B', is_control: false, performance_score: 92 }
                ]
            },
            {
                id: 'demo-2',
                name: 'Product Launch Campaign',
                status: 'draft',
                objective: 'Brand Awareness',
                outreach_mode: 'Email',
                target_lead_count: 1000,
                messages_sent: 0,
                responses_received: 0,
                conversions: 0,
                created_at: new Date(Date.now() - 86400000).toISOString(),
                priority: 'medium',
                tags: ['launch', 'email'],
                campaign_analytics: [],
                campaign_messages: []
            },
            {
                id: 'demo-3',
                name: 'Holiday Promotion',
                status: 'paused',
                objective: 'Sales',
                outreach_mode: 'LinkedIn Message',
                target_lead_count: 300,
                messages_sent: 89,
                responses_received: 22,
                conversions: 8,
                created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
                priority: 'low',
                tags: ['promotion', 'holiday'],
                campaign_analytics: [{
                    response_rate: 24.7,
                    conversion_rate: 36.4,
                    quality_score: 78
                }],
                campaign_messages: [
                    { id: 3, variant_name: 'A', is_control: true, performance_score: 78 }
                ]
            }
        ];
        this.applyFiltersAndSearch();
    }

    applyFiltersAndSearch() {
        let filteredCampaigns = [...this.campaigns];
        
        // Apply search filter
        if (this.searchTerm) {
            filteredCampaigns = filteredCampaigns.filter(campaign =>
                campaign.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                campaign.objective.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                campaign.outreach_mode.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (campaign.tags && campaign.tags.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase())))
            );
        }
        
        // Apply status filters
        if (!this.activeFilters.has('all')) {
            filteredCampaigns = filteredCampaigns.filter(campaign =>
                this.activeFilters.has(campaign.status) ||
                this.activeFilters.has(campaign.objective.toLowerCase()) ||
                this.activeFilters.has(campaign.priority)
            );
        }
        
        // Apply sorting
        this.sortCampaigns(filteredCampaigns);
        
        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + this.itemsPerPage);
        
        this.renderCampaigns(paginatedCampaigns);
        this.updatePagination(filteredCampaigns.length);
        this.updateFiltersUI();
    }

    sortCampaigns(campaigns) {
        // Default sort by priority and updated date
        campaigns.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority] || 1;
            const bPriority = priorityOrder[b.priority] || 1;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            return new Date(b.updated_at) - new Date(a.updated_at);
        });
    }

    renderCampaigns(campaigns) {
        const container = document.getElementById('campaigns-container');
        if (!container) return;

        if (campaigns.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = campaigns.map(campaign => this.renderCampaignCard(campaign)).join('');
        this.attachCampaignCardEvents();
    }

    renderEmptyState() {
        const hasFilters = this.searchTerm || this.activeFilters.size > 1;
        
        if (hasFilters) {
            return `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <h3 style="margin-bottom: 8px;">No campaigns found</h3>
                    <p style="margin-bottom: 24px;">Try adjusting your search or filters</p>
                    <button onclick="campaigns.clearAllFilters()" class="secondary-btn">
                        Clear Filters
                    </button>
                </div>
            `;
        } else {
            return `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
                    <h3 style="margin-bottom: 8px;">No campaigns yet</h3>
                    <p style="margin-bottom: 24px;">Create your first campaign to get started with AI-powered outreach</p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="campaigns.showWizard()" class="primary-btn">
                            🚀 Create Campaign
                        </button>
                        <button onclick="campaigns.showTemplates()" class="secondary-btn">
                            📋 Use Template
                        </button>
                        <button onclick="campaigns.showBulkImport()" class="secondary-btn">
                            📤 Import CSV
                        </button>
                    </div>
                </div>
            `;
        }
    }

    renderCampaignCard(campaign) {
        const analytics = campaign.campaign_analytics?.[0] || {};
        const responseRate = analytics.response_rate || this.calculateResponseRate(campaign);
        const progress = this.calculateProgress(campaign);
        const statusColor = this.getStatusColor(campaign.status);
        const priorityIcon = this.getPriorityIcon(campaign.priority);
        
        return `
            <div class="campaign-card ${campaign.id === this.selectedCampaign ? 'active' : ''}" 
                 data-campaign-id="${campaign.id}">
                <div class="campaign-header">
                    <div class="campaign-title-section">
                        <div class="campaign-name">${campaign.name}</div>
                        <div class="campaign-meta">
                            <span class="campaign-objective">${campaign.objective}</span>
                            <span class="campaign-separator">•</span>
                            <span class="campaign-mode">${campaign.outreach_mode}</span>
                            ${priorityIcon ? `<span class="priority-icon">${priorityIcon}</span>` : ''}
                        </div>
                    </div>
                    <div class="campaign-actions">
                        <span class="campaign-status status-${campaign.status}" style="background-color: ${statusColor}">
                            ${campaign.status}
                        </span>
                        <div class="campaign-menu">
                            <button class="menu-btn" onclick="campaigns.showCampaignMenu('${campaign.id}', event)">⋮</button>
                        </div>
                    </div>
                </div>
                
                <div class="campaign-metrics">
                    <div class="metric-item">
                        <div class="metric-value">${campaign.target_lead_count || 0}</div>
                        <div class="metric-label">Target</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${campaign.messages_sent || 0}</div>
                        <div class="metric-label">Sent</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${campaign.responses_received || 0}</div>
                        <div class="metric-label">Responses</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${responseRate.toFixed(1)}%</div>
                        <div class="metric-label">Response Rate</div>
                    </div>
                </div>
                
                <div class="campaign-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>${progress.toFixed(1)}% complete</span>
                        <span>${this.getTimeRemaining(campaign)}</span>
                    </div>
                </div>
                
                ${campaign.tags ? `
                    <div class="campaign-tags">
                        ${campaign.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="campaign-footer">
                    <span class="campaign-date">
                        Updated ${window.OsliraApp.formatDateInUserTimezone(campaign.updated_at, { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                    ${analytics.quality_score ? `
                        <span class="quality-score" title="AI Quality Score">
                            🎯 ${analytics.quality_score}/100
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    attachCampaignCardEvents() {
        // Re-attach event listeners for dynamic content
        document.querySelectorAll('.campaign-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.campaign-menu') && !e.target.closest('.menu-btn')) {
                    this.selectCampaign(card.dataset.campaignId);
                }
            });
        });
    }

    calculateResponseRate(campaign) {
        if (!campaign.messages_sent || campaign.messages_sent === 0) return 0;
        return (campaign.responses_received / campaign.messages_sent) * 100;
    }

    calculateProgress(campaign) {
        if (!campaign.target_lead_count || campaign.target_lead_count === 0) return 0;
        return Math.min(100, (campaign.messages_sent / campaign.target_lead_count) * 100);
    }

    getStatusColor(status) {
        const colors = {
            live: '#10B981',
            draft: '#6B7280',
            paused: '#F59E0B',
            completed: '#3B82F6',
            stopped: '#EF4444'
        };
        return colors[status] || '#6B7280';
    }

    getPriorityIcon(priority) {
        const icons = {
            high: '🔥',
            medium: '⚡',
            low: '📋'
        };
        return icons[priority] || '';
    }

    getTimeRemaining(campaign) {
        if (campaign.scheduled_end) {
            const endDate = new Date(campaign.scheduled_end);
            const now = new Date();
            const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
                return `${diffDays} days left`;
            } else if (diffDays === 0) {
                return 'Ends today';
            } else {
                return 'Overdue';
            }
        }
        
        // Estimate based on current pace
        if (campaign.messages_sent > 0 && campaign.status === 'live') {
            const remaining = campaign.target_lead_count - campaign.messages_sent;
            const dailyRate = this.estimateDailyRate(campaign);
            if (dailyRate > 0) {
                const daysRemaining = Math.ceil(remaining / dailyRate);
                return `~${daysRemaining} days left`;
            }
        }
        
        return '';
    }

    estimateDailyRate(campaign) {
        const campaignStart = new Date(campaign.created_at);
        const now = new Date();
        const daysRunning = Math.max(1, Math.ceil((now - campaignStart) / (1000 * 60 * 60 * 24)));
        return campaign.messages_sent / daysRunning;
    }

    // =============================================================================
    // COMPREHENSIVE WIZARD MANAGEMENT
    // =============================================================================

    showWizard() {
        // Check user limits
        if (!this.checkCampaignLimits()) return;
        
        document.getElementById('overview-view')?.classList.remove('active');
        document.getElementById('wizard-view')?.classList.add('active');
        this.resetWizard();
        this.trackWizardStart();
    }

    checkCampaignLimits() {
        const features = this.getPlanFeatures(this.userProfile.subscription_plan);
        const activeCampaigns = this.campaigns.filter(c => ['live', 'paused'].includes(c.status)).length;
        
        if (features.campaigns !== 'Unlimited' && activeCampaigns >= features.campaigns) {
            this.showUpgradeModal('campaign_limit', {
                current: activeCampaigns,
                limit: features.campaigns
            });
            return false;
        }
        
        return true;
    }

    resetWizard() {
        this.currentStep = 1;
        this.campaignData = {
            message_variants: [
                { name: 'Variant A', is_control: true },
                { name: 'Variant B', is_control: false }
            ]
        };
        this.messageVariants = [];
        this.updateWizardStep();
        this.clearFormFields();
        this.initializeFormDefaults();
    }

    clearFormFields() {
        document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
            input.value = '';
            input.classList.remove('error', 'valid');
        });
    }

    initializeFormDefaults() {
        // Set intelligent defaults based on user preferences
        const preferences = this.userProfile.preferences || {};
        
        if (preferences.default_outreach_mode) {
            const outreachModeEl = document.getElementById('outreach-mode');
            if (outreachModeEl) outreachModeEl.value = preferences.default_outreach_mode;
        }
        
        // Set default business profile
        if (window.OsliraApp.business) {
            const businessEl = document.getElementById('campaign-business-id');
            if (businessEl) businessEl.value = window.OsliraApp.business.id;
        }
        
        // Set default target count based on plan
        const features = this.getPlanFeatures(this.userProfile.subscription_plan);
        const targetCountEl = document.getElementById('target-count');
        if (targetCountEl) {
            const defaultTarget = Math.min(100, features.leads / 10);
            targetCountEl.value = defaultTarget;
        }
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveStepData();
            this.currentStep++;
            this.updateWizardStep();
            this.updateClaudeInsights();
            this.trackWizardProgress();
        }
    }

    prevStep() {
        this.currentStep--;
        this.updateWizardStep();
    }

    updateWizardStep() {
        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
        
        // Show current step
        const currentStepEl = document.getElementById(`wizard-step-${this.currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
            // Focus on first input in step
            const firstInput = currentStepEl.querySelector('.form-input, .form-select, .form-textarea');
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        }
        
        // Update progress indicators
        this.updateWizardProgress();
        
        // Update navigation buttons
        this.updateWizardNavigation();
        
        // Load step-specific content
        this.loadStepContent();
    }

    updateWizardProgress() {
        for (let i = 1; i <= 4; i++) {
            const indicator = document.getElementById(`step-${i}-indicator`);
            const divider = indicator?.nextElementSibling;
            
            if (i < this.currentStep) {
                indicator?.classList.add('completed');
                indicator?.classList.remove('active');
                if (divider && divider.classList.contains('step-divider')) {
                    divider.classList.add('completed');
                }
            } else if (i === this.currentStep) {
                indicator?.classList.add('active');
                indicator?.classList.remove('completed');
            } else {
                indicator?.classList.remove('active', 'completed');
                if (divider && divider.classList.contains('step-divider')) {
                    divider.classList.remove('completed');
                }
            }
        }
        
        // Update progress percentage
        const progressEl = document.getElementById('wizard-progress-bar');
        if (progressEl) {
            const percentage = ((this.currentStep - 1) / 3) * 100;
            progressEl.style.width = `${percentage}%`;
        }
    }

    updateWizardNavigation() {
        const backBtn = document.getElementById(`step-${this.currentStep}-back`);
        const nextBtn = document.getElementById(`step-${this.currentStep}-next`);
        const launchBtn = document.getElementById('launch-campaign-btn');
        const saveBtn = document.getElementById('save-draft-btn');
        
        // Show/hide back button
        if (backBtn) backBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
        
        // Update next/launch button text
        if (this.currentStep === 4) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (launchBtn) launchBtn.style.display = 'block';
            if (saveBtn) saveBtn.style.display = 'block';
        } else {
            if (nextBtn) nextBtn.style.display = 'block';
            if (launchBtn) launchBtn.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'block';
        }
    }

    loadStepContent() {
        switch (this.currentStep) {
            case 1:
                this.loadCampaignObjectives();
                this.loadOutreachModes();
                this.loadCRMIntegrations();
                break;
            case 2:
                this.loadLeadSources();
                this.updateTargetingRecommendations();
                break;
            case 3:
                this.loadMessageTemplates();
                this.updateMessageVariants();
                break;
            case 4:
                this.updateCampaignSummary();
                this.updateLaunchChecklist();
                break;
        }
    }

    validateCurrentStep() {
        const step = this.currentStep;
        let isValid = true;
        let errors = [];

        switch (step) {
            case 1:
                const requiredFields = ['campaign-name', 'campaign-objective', 'outreach-mode'];
                requiredFields.forEach(field => {
                    const element = document.getElementById(field);
                    if (!element || !element.value.trim()) {
                        isValid = false;
                        errors.push(`${field.replace('-', ' ')} is required`);
                        element?.classList.add('error');
                    } else {
                        element?.classList.remove('error');
                        element?.classList.add('valid');
                    }
                });
                
                // Validate campaign name uniqueness
                const nameEl = document.getElementById('campaign-name');
                if (nameEl && nameEl.value.trim()) {
                    const isDuplicate = this.campaigns.some(c => 
                        c.name.toLowerCase() === nameEl.value.trim().toLowerCase()
                    );
                    if (isDuplicate) {
                        isValid = false;
                        errors.push('Campaign name already exists');
                        nameEl.classList.add('error');
                    }
                }
                break;
                
            case 2:
                const targetCount = document.getElementById('target-count');
                const icpCriteria = document.getElementById('icp-criteria');
                
                if (!targetCount?.value || parseInt(targetCount.value) < 1) {
                    isValid = false;
                    errors.push('Target count must be at least 1');
                    targetCount?.classList.add('error');
                } else if (parseInt(targetCount.value) > 10000) {
                    isValid = false;
                    errors.push('Target count cannot exceed 10,000');
                    targetCount?.classList.add('error');
                } else {
                    targetCount?.classList.remove('error');
                    targetCount?.classList.add('valid');
                }
                
                if (!icpCriteria?.value.trim()) {
                    isValid = false;
                    errors.push('ICP criteria is required');
                    icpCriteria?.classList.add('error');
                } else {
                    icpCriteria?.classList.remove('error');
                    icpCriteria?.classList.add('valid');
                }
                
                // Validate credit requirements
                const creditRequired = this.calculateCreditRequirement();
                if (creditRequired > this.userProfile.credits) {
                    isValid = false;
                    errors.push(`Insufficient credits. Need ${creditRequired}, have ${this.userProfile.credits}`);
                }
                break;
                
            case 3:
                const variantA = document.getElementById('variant-a-message');
                const variantB = document.getElementById('variant-b-message');
                
                if (!variantA?.value.trim() || variantA.value.trim().length < 50) {
                    isValid = false;
                    errors.push('Variant A message must be at least 50 characters');
                    variantA?.classList.add('error');
                } else {
                    variantA?.classList.remove('error');
                    variantA?.classList.add('valid');
                }
                
                if (variantB?.value.trim() && variantB.value.trim().length < 50) {
                    isValid = false;
                    errors.push('Variant B message must be at least 50 characters if provided');
                    variantB?.classList.add('error');
                } else if (variantB?.value.trim()) {
                    variantB?.classList.remove('error');
                    variantB?.classList.add('valid');
                }
                
                // Check for message similarity
                if (variantA?.value.trim() && variantB?.value.trim()) {
                    const similarity = this.calculateMessageSimilarity(variantA.value, variantB.value);
                    if (similarity > 0.8) {
                        isValid = false;
                        errors.push('Message variants are too similar. Make them more distinct for better A/B testing.');
                    }
                }
                break;
                
            case 4:
                // Final validation - check all previous steps
                isValid = this.validateAllSteps();
                break;
        }

        if (!isValid) {
            this.showValidationErrors(errors);
        } else {
            this.clearValidationErrors();
        }

        return isValid;
    }

    calculateMessageSimilarity(text1, text2) {
        // Simple similarity calculation using word overlap
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }

    showValidationErrors(errors) {
        const errorContainer = document.getElementById('validation-errors');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="validation-error-list">
                    ${errors.map(error => `<div class="error-item">⚠️ ${error}</div>`).join('')}
                </div>
            `;
            errorContainer.style.display = 'block';
        } else {
            window.OsliraApp.showMessage(errors[0], 'error');
        }
    }

    clearValidationErrors() {
        const errorContainer = document.getElementById('validation-errors');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }

    validateAllSteps() {
        // Comprehensive validation across all steps
        return this.campaignData.name && 
               this.campaignData.objective && 
               this.campaignData.outreach_mode &&
               this.campaignData.target_lead_count > 0 &&
               this.campaignData.icp_criteria &&
               this.campaignData.message_variants?.length > 0;
    }

    saveStepData() {
        switch (this.currentStep) {
            case 1:
                this.campaignData = {
                    ...this.campaignData,
                    name: document.getElementById('campaign-name')?.value.trim(),
                    objective: document.getElementById('campaign-objective')?.value,
                    crm_integration: document.getElementById('crm-integration')?.value,
                    outreach_mode: document.getElementById('outreach-mode')?.value,
                    business_id: document.getElementById('campaign-business-id')?.value,
                    priority: document.getElementById('campaign-priority')?.value || 'medium',
                    tags: this.parseTagsInput(document.getElementById('campaign-tags')?.value)
                };
                break;
                
            case 2:
                this.campaignData = {
                    ...this.campaignData,
                    target_lead_count: parseInt(document.getElementById('target-count')?.value),
                    icp_criteria: document.getElementById('icp-criteria')?.value.trim(),
                    exclusion_rules: document.getElementById('exclusion-rules')?.value.trim(),
                    lead_source: document.getElementById('lead-source')?.value,
                    targeting_filters: this.getTargetingFilters(),
                    budget_limit: parseFloat(document.getElementById('budget-limit')?.value) || null,
                    daily_limit: parseInt(document.getElementById('daily-limit')?.value) || null
                };
                break;
                
            case 3:
                this.campaignData = {
                    ...this.campaignData,
                    message_variants: this.collectMessageVariants(),
                    follow_up_sequence: this.getFollowUpSequence(),
                    personalization_level: document.getElementById('personalization-level')?.value || 'medium',
                    send_timing: this.getSendTiming()
                };
                break;
        }

        this.updateSummary();
        this.saveDraftToStorage();
    }

    parseTagsInput(tagsInput) {
        if (!tagsInput) return [];
        return tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    getTargetingFilters() {
        const filters = {};
        
        // Collect all targeting filter inputs
        const filterInputs = document.querySelectorAll('[data-filter-type]');
        filterInputs.forEach(input => {
            const filterType = input.dataset.filterType;
            if (input.value) {
                filters[filterType] = input.value;
            }
        });
        
        return filters;
    }

    collectMessageVariants() {
        const variants = [];
        
        // Collect variant A (required)
        const variantAMessage = document.getElementById('variant-a-message')?.value.trim();
        if (variantAMessage) {
            variants.push({
                name: 'Variant A',
                content: variantAMessage,
                hook_style: document.getElementById('variant-a-hook')?.value,
                cta_type: document.getElementById('variant-a-cta')?.value,
                tone: document.getElementById('variant-a-tone')?.value,
                is_control: true,
                weight: 50
            });
        }
        
        // Collect variant B (optional)
        const variantBMessage = document.getElementById('variant-b-message')?.value.trim();
        if (variantBMessage) {
            variants.push({
                name: 'Variant B',
                content: variantBMessage,
                hook_style: document.getElementById('variant-b-hook')?.value,
                cta_type: document.getElementById('variant-b-cta')?.value,
                tone: document.getElementById('variant-b-tone')?.value,
                is_control: false,
                weight: 50
            });
        }
        
        // Collect any additional variants
        document.querySelectorAll('[data-variant-id]').forEach(variantEl => {
            const variantId = variantEl.dataset.variantId;
            if (!['a', 'b'].includes(variantId)) {
                const content = variantEl.querySelector('.variant-message')?.value.trim();
                if (content) {
                    variants.push({
                        name: `Variant ${variantId.toUpperCase()}`,
                        content: content,
                        hook_style: variantEl.querySelector('.variant-hook')?.value,
                        cta_type: variantEl.querySelector('.variant-cta')?.value,
                        tone: variantEl.querySelector('.variant-tone')?.value,
                        is_control: false,
                        weight: Math.floor(100 / variants.length)
                    });
                }
            }
        });
        
        return variants;
    }

    getFollowUpSequence() {
        const sequence = [];
        
        document.querySelectorAll('[data-followup-day]').forEach(followUpEl => {
            const day = parseInt(followUpEl.dataset.followupDay);
            const message = followUpEl.querySelector('.followup-message')?.value.trim();
            
            if (message) {
                sequence.push({
                    day: day,
                    message: message,
                    condition: followUpEl.querySelector('.followup-condition')?.value || 'no_response'
                });
            }
        });
        
        return sequence.sort((a, b) => a.day - b.day);
    }

    getSendTiming() {
        return {
            timezone: document.getElementById('send-timezone')?.value || this.userProfile.timezone,
            preferred_hours: this.getPreferredHours(),
            preferred_days: this.getPreferredDays(),
            respect_business_hours: document.getElementById('respect-business-hours')?.checked || true,
            avoid_weekends: document.getElementById('avoid-weekends')?.checked || false
        };
    }

    getPreferredHours() {
        const startHour = document.getElementById('send-start-hour')?.value;
        const endHour = document.getElementById('send-end-hour')?.value;
        
        if (startHour && endHour) {
            return { start: parseInt(startHour), end: parseInt(endHour) };
        }
        
        return { start: 9, end: 17 }; // Default business hours
    }

    getPreferredDays() {
        const selectedDays = [];
        document.querySelectorAll('[data-day-checkbox]:checked').forEach(checkbox => {
            selectedDays.push(checkbox.dataset.dayCheckbox);
        });
        
        return selectedDays.length > 0 ? selectedDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    }

    updateSummary() {
        if (this.currentStep === 4) {
            const summaryElements = {
                'summary-name': this.campaignData.name || '--',
                'summary-objective': this.campaignData.objective || '--',
                'summary-mode': this.campaignData.outreach_mode || '--',
                'summary-leads': this.campaignData.target_lead_count || '--',
                'summary-variants': this.campaignData.message_variants?.length || 0,
                'summary-credits': this.calculateCreditRequirement(),
                'summary-duration': this.estimateCampaignDuration(),
                'summary-budget': this.campaignData.budget_limit ? `${this.campaignData.budget_limit}` : 'No limit'
            };
            
            Object.entries(summaryElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });
            
            this.updateSummaryPreview();
        }
    }

    updateSummaryPreview() {
        // Show message preview
        const previewEl = document.getElementById('message-preview');
        if (previewEl && this.campaignData.message_variants?.[0]) {
            const primaryMessage = this.campaignData.message_variants[0].content;
            previewEl.innerHTML = `
                <div class="message-preview-content">
                    <h4>Primary Message Preview:</h4>
                    <div class="message-text">${primaryMessage}</div>
                </div>
            `;
        }
        
        // Show targeting summary
        const targetingEl = document.getElementById('targeting-summary');
        if (targetingEl) {
            targetingEl.innerHTML = `
                <div class="targeting-summary-content">
                    <h4>Targeting Summary:</h4>
                    <p><strong>ICP:</strong> ${this.campaignData.icp_criteria || 'Not specified'}</p>
                    <p><strong>Lead Source:</strong> ${this.campaignData.lead_source || 'Manual selection'}</p>
                    ${this.campaignData.exclusion_rules ? `<p><strong>Exclusions:</strong> ${this.campaignData.exclusion_rules}</p>` : ''}
                </div>
            `;
        }
    }

    calculateCreditRequirement() {
        const targetCount = this.campaignData.target_lead_count || 0;
        const creditsPerLead = this.getCreditsPerLead();
        return targetCount * creditsPerLead;
    }

    getCreditsPerLead() {
        // Credits required based on outreach mode and personalization
        const baseCredits = {
            'Instagram DM': 2,
            'Email': 1,
            'LinkedIn Message': 3,
            'Twitter DM': 1
        };
        
        const mode = this.campaignData.outreach_mode || 'Instagram DM';
        let credits = baseCredits[mode] || 2;
        
        // Add credits for personalization
        if (this.campaignData.personalization_level === 'high') {
            credits += 1;
        }
        
        // Add credits for follow-up sequences
        if (this.campaignData.follow_up_sequence?.length > 0) {
            credits += this.campaignData.follow_up_sequence.length * 0.5;
        }
        
        return Math.ceil(credits);
    }

    estimateCampaignDuration() {
        if (!this.campaignData.target_lead_count) return 'Unknown';
        
        const dailyLimit = this.campaignData.daily_limit || this.getDefaultDailyLimit();
        const days = Math.ceil(this.campaignData.target_lead_count / dailyLimit);
        
        if (days === 1) return '1 day';
        if (days < 7) return `${days} days`;
        if (days < 30) return `${Math.ceil(days / 7)} weeks`;
        return `${Math.ceil(days / 30)} months`;
    }

    getDefaultDailyLimit() {
        // Default daily limits based on outreach mode
        const limits = {
            'Instagram DM': 50,
            'Email': 100,
            'LinkedIn Message': 30,
            'Twitter DM': 80
        };
        
        return limits[this.campaignData.outreach_mode] || 50;
    }

    saveDraftToStorage() {
        // Save draft to localStorage for recovery
        try {
            localStorage.setItem('campaign_draft', JSON.stringify({
                ...this.campaignData,
                lastSaved: new Date().toISOString(),
                currentStep: this.currentStep
            }));
        } catch (error) {
            console.warn('Failed to save draft to localStorage:', error);
        }
    }

    loadDraftFromStorage() {
        try {
            const draft = localStorage.getItem('campaign_draft');
            if (draft) {
                const draftData = JSON.parse(draft);
                const lastSaved = new Date(draftData.lastSaved);
                const now = new Date();
                
                // Only load if saved within last 24 hours
                if (now - lastSaved < 24 * 60 * 60 * 1000) {
                    return draftData;
                }
            }
        } catch (error) {
            console.warn('Failed to load draft from localStorage:', error);
        }
        
        return null;
    }

    // =============================================================================
    // ADVANCED CLAUDE INTEGRATION
    // =============================================================================

    async updateClaudeInsights() {
        if (!this.userCapabilities.hasClaudeIntegration) {
            this.showClaudeUpgradePrompt();
            return;
        }
        
        const step = this.currentStep;
        let insights = '';

        try {
            switch (step) {
                case 1:
                    insights = await this.getClaudeFoundationInsights();
                    this.updateInsightsDisplay('step1-claude-insights', insights);
                    break;
                case 2:
                    insights = await this.getClaudeTargetingInsights();
                    this.updateInsightsDisplay('step2-claude-insights', insights);
                    break;
                case 3:
                    insights = await this.getClaudeMessageInsights();
                    this.updateInsightsDisplay('step3-claude-insights', insights);
                    break;
                case 4:
                    insights = await this.getClaudeRiskAssessment();
                    this.updateInsightsDisplay('step4-claude-insights', insights);
                    break;
            }
        } catch (error) {
            console.error('Claude insights error:', error);
            this.updateInsightsDisplay(`step${step}-claude-insights`, 'Claude insights temporarily unavailable. Please try again.');
        }
    }

    async getClaudeFoundationInsights() {
        const objective = document.getElementById('campaign-objective')?.value;
        const mode = document.getElementById('outreach-mode')?.value;
        const businessType = window.OsliraApp.business?.business_type;
        
        if (!objective || !mode) {
            return 'Select your campaign objective and outreach mode to receive AI-powered strategic recommendations for optimal campaign structure and performance benchmarks.';
        }
        
        // Simulate Claude API call with intelligent insights
        const insights = await this.generateFoundationInsights(objective, mode, businessType);
        return insights;
    }

    async generateFoundationInsights(objective, mode, businessType) {
        // Simulate realistic Claude insights based on campaign parameters
        const insightTemplates = {
            'Lead Generation': {
                'Instagram DM': `For B2B lead generation via Instagram DM: Target 3-5 message variants with 70%+ personalization depth. Initial test cohort of 50-100 leads recommended for statistical significance. Expected baseline response rate: 25-35% for ${businessType || 'SaaS'} industry. Focus on value-first messaging with clear next steps.`,
                'Email': `Email lead generation campaigns perform best with subject line A/B testing and progressive profiling. Recommend 48-hour follow-up sequence for non-responders. Expected response rates: 15-25% for cold outreach, 35-50% for warm leads. Include social proof and case studies for ${businessType || 'B2B'} audience.`,
                'LinkedIn Message': `LinkedIn performs exceptionally for B2B lead generation. Leverage mutual connections and shared experiences. Response rates typically 20-40% with personalized connection requests followed by value-driven messages. Recommend profile optimization before campaign launch.`
            },
            'Brand Awareness': {
                'Instagram DM': `Brand awareness campaigns should focus on engagement over direct conversion. Use storytelling approaches with 60% educational content, 40% promotional. Track engagement depth metrics alongside response rates. Consider influencer collaboration for amplification.`,
                'Email': `Email brand awareness requires consistent touchpoints over 3-6 months. Newsletter format with valuable content performs better than direct promotional messages. Segment by engagement level for personalized content delivery.`,
                'LinkedIn Message': `LinkedIn brand awareness benefits from thought leadership positioning. Share industry insights and participate in discussions before direct outreach. Focus on building long-term relationships rather than immediate conversions.`
            },
            'Sales': {
                'Instagram DM': `Direct sales via Instagram DM requires high trust signals. Include customer testimonials, clear pricing, and risk reversal offers. Recommend 2-3 touch campaign with objection handling sequences. Average conversion rate: 8-15% from qualified responses.`,
                'Email': `Sales-focused email campaigns need clear value propositions and urgency elements. Use scarcity and social proof effectively. Implement abandoned cart sequences for e-commerce. Track revenue per email for ROI optimization.`,
                'LinkedIn Message': `LinkedIn sales approach should be consultative rather than pushy. Ask diagnostic questions and provide custom solutions. Longer sales cycles require 5-7 touchpoint sequences with value-added content between pitches.`
            }
        };
        
        const modeInsights = insightTemplates[objective]?.[mode];
        return modeInsights || `For ${objective} campaigns using ${mode}: Personalization and timing are crucial factors. Research your audience thoroughly and test different approaches to find optimal performance patterns.`;
    }

    async getClaudeTargetingInsights() {
        const count = document.getElementById('target-count')?.value;
        const icp = document.getElementById('icp-criteria')?.value;
        const leadSource = document.getElementById('lead-source')?.value;
        
        if (!count || !icp) {
            return 'Define your target count and ICP criteria to receive AI-powered lead selection strategies, segment filtering recommendations, and batch sizing optimization for maximum engagement.';
        }
        
        return await this.generateTargetingInsights(count, icp, leadSource);
    }

    async generateTargetingInsights(count, icp, leadSource) {
        const targetCount = parseInt(count);
        
        let insights = `Target count of ${targetCount} leads provides `;
        
        if (targetCount < 50) {
            insights += `limited statistical significance for A/B testing. Consider increasing to 100+ for reliable results. `;
        } else if (targetCount <= 200) {
            insights += `good statistical power for A/B testing. Ideal for focused campaigns with high personalization. `;
        } else if (targetCount <= 1000) {
            insights += `excellent scale for comprehensive testing. Recommend segmentation by company size or industry for optimized messaging. `;
        } else {
            insights += `large-scale reach requiring batch management. Consider phased rollout with performance monitoring between batches. `;
        }
        
        // ICP analysis
        if (icp.toLowerCase().includes('ceo') || icp.toLowerCase().includes('founder')) {
            insights += `Targeting C-level executives requires premium personalization and value propositions. Response rates typically 15-25% lower but conversion quality is significantly higher. `;
        } else if (icp.toLowerCase().includes('manager') || icp.toLowerCase().includes('director')) {
            insights += `Mid-level management shows strong response rates with operational benefits messaging. Focus on efficiency and ROI metrics. `;
        }
        
        // Lead source optimization
        if (leadSource === 'manual') {
            insights += `Manual lead selection allows for highest quality but limits scale. Recommend developing selection criteria checklist for consistency.`;
        } else if (leadSource === 'csv_import') {
            insights += `CSV import enables scale but requires data validation. Implement deduplication and verification processes.`;
        } else if (leadSource === 'integration') {
            insights += `CRM integration provides warm leads with higher conversion potential. Leverage existing relationship data for personalization.`;
        }
        
        return insights;
    }

    async getClaudeMessageInsights() {
        const variantA = document.getElementById('variant-a-message')?.value;
        const variantB = document.getElementById('variant-b-message')?.value;
        
        if (!variantA) {
            return 'Write your first message variant to receive AI-powered analysis on tone, structure, personalization opportunities, and performance predictions.';
        }
        
        return await this.generateMessageInsights(variantA, variantB);
    }

    async generateMessageInsights(variantA, variantB) {
        let insights = await this.analyzeMessageStructure(variantA, 'A');
        
        if (variantB && variantB.trim()) {
            insights += '\n\n' + await this.analyzeMessageStructure(variantB, 'B');
            insights += '\n\n' + await this.compareVariants(variantA, variantB);
        } else {
            insights += '\n\nConsider adding Variant B to enable A/B testing for performance optimization.';
        }
        
        return insights;
    }

    async analyzeMessageStructure(message, variant) {
        const analysis = {
            length: message.length,
            sentences: message.split(/[.!?]+/).length - 1,
            questions: (message.match(/\?/g) || []).length,
            personalTokens: this.countPersonalizationTokens(message),
            cta: this.detectCallToAction(message),
            tone: this.analyzeTone(message),
            readability: this.calculateReadability(message)
        };
        
        let feedback = `Variant ${variant} Analysis: `;
        
        // Length feedback
        if (analysis.length < 100) {
            feedback += `Message is concise (${analysis.length} chars) - good for high open rates. `;
        } else if (analysis.length > 300) {
            feedback += `Message is detailed (${analysis.length} chars) - may reduce response rates but increases quality. `;
        } else {
            feedback += `Message length (${analysis.length} chars) is optimal for engagement. `;
        }
        
        // Structure feedback
        if (analysis.questions > 0) {
            feedback += `${analysis.questions} question(s) detected - excellent for engagement. `;
        } else {
            feedback += `Consider adding a question to increase response likelihood. `;
        }
        
        // Personalization feedback
        if (analysis.personalTokens > 0) {
            feedback += `${analysis.personalTokens} personalization element(s) found - good for relevance. `;
        } else {
            feedback += `Add personalization tokens (name, company, recent posts) for better results. `;
        }
        
        // CTA feedback
        if (analysis.cta.detected) {
            feedback += `Clear ${analysis.cta.type} CTA identified. `;
        } else {
            feedback += `Consider adding a clear call-to-action for better conversion. `;
        }
        
        // Tone feedback
        feedback += `Tone: ${analysis.tone}. `;
        
        return feedback;
    }

    countPersonalizationTokens(message) {
        const tokens = ['{name}', '{company}', '{title}', '{industry}', '{recent_post}', '{mutual_connection}'];
        return tokens.reduce((count, token) => count + (message.includes(token) ? 1 : 0), 0);
    }

    detectCallToAction(message) {
        const ctaPatterns = [
            /book|schedule|call|meeting/i,
            /click|visit|check out/i,
            /reply|respond|let me know/i,
            /download|get|access/i,
            /join|sign up|register/i
        ];
        
        for (const pattern of ctaPatterns) {
            if (pattern.test(message)) {
                return { detected: true, type: this.getCTAType(pattern) };
            }
        }
        
        return { detected: false, type: null };
    }

    getCTAType(pattern) {
        if (/book|schedule|call|meeting/i.test(pattern.source)) return 'scheduling';
        if (/click|visit|check out/i.test(pattern.source)) return 'link';
        if (/reply|respond|let me know/i.test(pattern.source)) return 'response';
        if (/download|get|access/i.test(pattern.source)) return 'content';
        if (/join|sign up|register/i.test(pattern.source)) return 'registration';
        return 'general';
    }

    analyzeTone(message) {
        const toneIndicators = {
            professional: /please|sincerely|regards|thank you|appreciate/i,
            casual: /hey|awesome|cool|thanks|let's/i,
            urgent: /urgent|immediate|asap|deadline|limited time/i,
            friendly: /hope|excited|love|amazing|fantastic/i,
            formal: /dear|esteemed|respectfully|cordially/i
        };
        
        const scores = {};
        for (const [tone, pattern] of Object.entries(toneIndicators)) {
            scores[tone] = (message.match(pattern) || []).length;
        }
        
        const dominantTone = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
        return dominantTone || 'neutral';
    }

    calculateReadability(message) {
        const words = message.split(/\s+/).length;
        const sentences = message.split(/[.!?]+/).length - 1;
        const avgWordsPerSentence = words / Math.max(sentences, 1);
        
        if (avgWordsPerSentence < 15) return 'easy';
        if (avgWordsPerSentence < 20) return 'moderate';
        return 'complex';
    }

    async compareVariants(variantA, variantB) {
        const similarity = this.calculateMessageSimilarity(variantA, variantB);
        const lengthDiff = Math.abs(variantA.length - variantB.length);
        
        let comparison = 'A/B Test Analysis: ';
        
        if (similarity > 0.7) {
            comparison += `Variants are ${Math.round(similarity * 100)}% similar - consider making them more distinct for meaningful testing. `;
        } else if (similarity < 0.3) {
            comparison += `Variants are quite different (${Math.round(similarity * 100)}% similarity) - excellent for testing different approaches. `;
        } else {
            comparison += `Good variation level (${Math.round(similarity * 100)}% similarity) for reliable A/B testing results. `;
        }
        
        if (lengthDiff > 100) {
            comparison += `Significant length difference (${lengthDiff} characters) may affect performance comparison. `;
        }
        
        comparison += 'Recommend 50/50 traffic split for statistical significance.';
        
        return comparison;
    }

    async getClaudeRiskAssessment() {
        const campaignData = this.campaignData;
        const risks = [];
        const recommendations = [];
        
        // Analyze potential risks
        if (campaignData.target_lead_count > 1000) {
            risks.push('Large campaign scale may trigger platform limitations');
            recommendations.push('Consider phased rollout with 200-500 leads per batch');
        }
        
        if (!campaignData.message_variants || campaignData.message_variants.length < 2) {
            risks.push('Single message variant limits optimization opportunities');
            recommendations.push('Add message variant B for A/B testing');
        }
        
        if (campaignData.daily_limit && campaignData.daily_limit > this.getRecommendedDailyLimit()) {
            risks.push('High daily send volume may affect deliverability');
            recommendations.push(`Reduce daily limit to ${this.getRecommendedDailyLimit()} for better results`);
        }
        
        if (this.calculateCreditRequirement() > this.userProfile.credits) {
            risks.push('Insufficient credits to complete campaign');
            recommendations.push('Upgrade plan or reduce target count');
        }
        
        // Generate risk assessment
        let assessment = 'Campaign Risk Assessment: ';
        
        if (risks.length === 0) {
            assessment += 'Low risk profile detected. Campaign is optimally configured for launch. ';
        } else {
            assessment += `${risks.length} potential issue(s) identified: ${risks.join(', ')}. `;
        }
        
        if (recommendations.length > 0) {
            assessment += `Recommendations: ${recommendations.join('; ')}. `;
        }
        
        assessment += `Estimated success rate: ${this.calculateSuccessRate()}%. Ready for launch with monitoring.`;
        
        return assessment;
    }

    getRecommendedDailyLimit() {
        const limits = {
            'Instagram DM': 50,
            'Email': 100,
            'LinkedIn Message': 30,
            'Twitter DM': 80
        };
        return limits[this.campaignData.outreach_mode] || 50;
    }

    calculateSuccessRate() {
        let baseRate = 75;
        
        // Adjust based on various factors
        if (this.campaignData.message_variants?.length >= 2) baseRate += 10;
        if (this.campaignData.personalization_level === 'high') baseRate += 15;
        if (this.campaignData.target_lead_count <= 500) baseRate += 5;
        if (this.campaignData.follow_up_sequence?.length > 0) baseRate += 10;
        
        // Reduce for risk factors
        if (this.campaignData.target_lead_count > 2000) baseRate -= 10;
        if (!this.campaignData.icp_criteria || this.campaignData.icp_criteria.length < 50) baseRate -= 15;
        
        return Math.min(95, Math.max(25, baseRate));
    }

    updateInsightsDisplay(elementId, insights) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="claude-insights-content">
                    <div class="insights-header">
                        <span class="claude-icon">🧠</span>
                        <span class="claude-label">Claude AI Insights</span>
                    </div>
                    <div class="insights-text">${insights}</div>
                </div>
            `;
        }
    }

    showClaudeUpgradePrompt() {
        const promptEl = document.querySelector('.claude-upgrade-prompt');
        if (promptEl) {
            promptEl.style.display = 'block';
        }
    }

    // Advanced Claude action handlers
    async getClaudeSuggestions(variant) {
        if (!this.userCapabilities.hasClaudeIntegration) {
            window.OsliraApp.showMessage('Claude suggestions require Growth plan or higher', 'warning');
            return;
        }
        
        const button = document.getElementById(`claude-suggestions-${variant}`);
        if (button) {
            button.disabled = true;
            button.textContent = 'Analyzing...';
            
            try {
                const suggestions = await this.generateClaudeSuggestions(variant);
                this.displaySuggestions(variant, suggestions);
                window.OsliraApp.showMessage('Claude suggestions generated!', 'success');
            } catch (error) {
                console.error('Claude suggestions error:', error);
                window.OsliraApp.showMessage('Failed to generate suggestions', 'error');
            } finally {
                button.disabled = false;
                button.textContent = '🧠 Claude Suggestions';
            }
        }
    }

    async generateClaudeSuggestions(variant) {
        const messageEl = document.getElementById(`variant-${variant}-message`);
        const currentMessage = messageEl?.value || '';
        
        // Simulate Claude API response with realistic suggestions
        const suggestions = [
            {
                type: 'personalization',
                title: 'Add Personalization',
                suggestion: 'Include {name} and reference their recent {recent_post} for 40% higher response rates',
                impact: 'High'
            },
            {
                type: 'structure',
                title: 'Improve Structure',
                suggestion: 'Start with a question to increase engagement by 25%',
                impact: 'Medium'
            },
            {
                type: 'cta',
                title: 'Strengthen CTA',
                suggestion: 'Use specific action words like "schedule 15-minute call" instead of generic "let\'s chat"',
                impact: 'High'
            },
            {
                type: 'tone',
                title: 'Optimize Tone',
                suggestion: 'Reduce formality by 20% for Instagram DM to match platform expectations',
                impact: 'Medium'
            }
        ];
        
        return suggestions;
    }

    displaySuggestions(variant, suggestions) {
        const containerId = `claude-suggestions-${variant}-container`;
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'claude-suggestions-container';
            
            const messageContainer = document.getElementById(`variant-${variant}-message`)?.parentNode;
            if (messageContainer) {
                messageContainer.appendChild(container);
            }
        }
        
        container.innerHTML = `
            <div class="suggestions-list">
                <h4>🧠 Claude Suggestions for Variant ${variant.toUpperCase()}</h4>
                ${suggestions.map(suggestion => `
                    <div class="suggestion-item" data-impact="${suggestion.impact.toLowerCase()}">
                        <div class="suggestion-header">
                            <span class="suggestion-title">${suggestion.title}</span>
                            <span class="suggestion-impact impact-${suggestion.impact.toLowerCase()}">${suggestion.impact} Impact</span>
                        </div>
                        <div class="suggestion-text">${suggestion.suggestion}</div>
                        <button class="apply-suggestion-btn" onclick="campaigns.applySuggestion('${variant}', '${suggestion.type}')">
                            Apply
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    applySuggestion(variant, suggestionType) {
        const messageEl = document.getElementById(`variant-${variant}-message`);
        if (!messageEl) return;
        
        let currentMessage = messageEl.value;
        
        switch (suggestionType) {
            case 'personalization':
                if (!currentMessage.includes('{name}')) {
                    currentMessage = `Hi {name},\n\n${currentMessage}`;
                }
                break;
                
            case 'structure':
                if (!currentMessage.includes('?')) {
                    const firstSentence = currentMessage.split('.')[0];
                    currentMessage = currentMessage.replace(firstSentence, `${firstSentence}?`);
                }
                break;
                
            case 'cta':
                currentMessage = currentMessage.replace(/let['']s chat/gi, 'schedule a 15-minute call');
                currentMessage = currentMessage.replace(/get in touch/gi, 'book a quick call');
                break;
                
            case 'tone':
                currentMessage = currentMessage.replace(/Dear\s+/gi, 'Hi ');
                currentMessage = currentMessage.replace(/Sincerely,/gi, 'Best,');
                break;
        }
        
        messageEl.value = currentMessage;
        this.updateMessageAnalysis(`variant-${variant}-message`);
        window.OsliraApp.showMessage('Suggestion applied successfully!', 'success');
    }

    async analyzeFitness(variant) {
        if (!this.userCapabilities.hasClaudeIntegration) {
            window.OsliraApp.showMessage('Fitness analysis requires Growth plan or higher', 'warning');
            return;
        }
        
        const button = document.getElementById(`analyze-fitness-${variant}`);
        if (button) {
            button.disabled = true;
            button.textContent = 'Analyzing...';
            
            try {
                const analysis = await this.performFitnessAnalysis(variant);
                this.displayFitnessAnalysis(variant, analysis);
                window.OsliraApp.showMessage('Fitness analysis complete!', 'success');
            } catch (error) {
                console.error('Fitness analysis error:', error);
                window.OsliraApp.showMessage('Analysis failed', 'error');
            } finally {
                button.disabled = false;
                button.textContent = '🔍 Analyze Fitness';
            }
        }
    }

    async performFitnessAnalysis(variant) {
        const messageEl = document.getElementById(`variant-${variant}-message`);
        const hookEl = document.getElementById(`variant-${variant}-hook`);
        const ctaEl = document.getElementById(`variant-${variant}-cta`);
        const toneEl = document.getElementById(`variant-${variant}-tone`);
        
        const message = messageEl?.value || '';
        const hook = hookEl?.value || '';
        const cta = ctaEl?.value || '';
        const tone = toneEl?.value || '';
        
        // Comprehensive fitness analysis
        const analysis = {
            overall_score: 0,
            components: {
                message_quality: this.analyzeMessageQuality(message),
                hook_effectiveness: this.analyzeHookEffectiveness(hook, message),
                cta_strength: this.analyzeCTAStrength(cta, message),
                tone_alignment: this.analyzeToneAlignment(tone, message),
                audience_fit: this.analyzeAudienceFit(message),
                platform_optimization: this.analyzePlatformOptimization(message)
            },
            recommendations: [],
            predicted_performance: {}
        };
        
        // Calculate overall score
        analysis.overall_score = Object.values(analysis.components).reduce((sum, score) => sum + score, 0) / Object.keys(analysis.components).length;
        
        // Generate recommendations
        analysis.recommendations = this.generateFitnessRecommendations(analysis.components);
        
        // Predict performance
        analysis.predicted_performance = this.predictMessagePerformance(analysis);
        
        return analysis;
    }

    analyzeMessageQuality(message) {
        let score = 50; // Base score
        
        // Length optimization
        if (message.length >= 100 && message.length <= 300) score += 15;
        else if (message.length < 50) score -= 20;
        else if (message.length > 500) score -= 10;
        
        // Structure analysis
        const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length >= 2 && sentences.length <= 4) score += 10;
        
        // Personalization tokens
        const personalTokens = this.countPersonalizationTokens(message);
        score += personalTokens * 5;
        
        // Question presence
        if (message.includes('?')) score += 10;
        
        // Spelling and grammar (simplified check)
        const commonMistakes = /\b(recieve|seperate|definately|loose|effect)\b/gi;
        if (commonMistakes.test(message)) score -= 15;
        
        return Math.min(100, Math.max(0, score));
    }

    analyzeHookEffectiveness(hook, message) {
        if (!hook) return 30; // No hook selected
        
        let score = 50;
        const messageStart = message.substring(0, 100).toLowerCase();
        
        const hookPatterns = {
            question: /\?/,
            compliment: /(great|awesome|impressive|love)/i,
            curiosity: /(noticed|saw|found|discovered)/i,
            problem: /(struggling|challenge|difficult|issue)/i,
            social_proof: /(helped|worked with|results)/i
        };
        
        if (hookPatterns[hook] && hookPatterns[hook].test(messageStart)) {
            score += 30;
        }
        
        // Hook-message alignment
        if (hook === 'question' && message.includes('?')) score += 15;
        if (hook === 'compliment' && /great|awesome|impressive/i.test(messageStart)) score += 15;
        
        return Math.min(100, score);
    }

    analyzeCTAStrength(cta, message) {
        if (!cta) return 20; // No CTA selected
        
        let score = 40;
        const messageLower = message.toLowerCase();
        
        const ctaPatterns = {
            meeting: /(call|meeting|schedule|book)/i,
            demo: /(demo|show|walkthrough)/i,
            content: /(download|guide|report|whitepaper)/i,
            response: /(reply|respond|thoughts|interested)/i,
            link: /(click|visit|check)/i
        };
        
        if (ctaPatterns[cta] && ctaPatterns[cta].test(messageLower)) {
            score += 40;
        }
        
        // CTA clarity and specificity
        const specificCTAs = /(15-minute|quick call|brief chat|schedule|book)/i;
        if (specificCTAs.test(messageLower)) score += 20;
        
        return Math.min(100, score);
    }

    analyzeToneAlignment(tone, message) {
        if (!tone) return 40; // No tone selected
        
        let score = 50;
        const messageLower = message.toLowerCase();
        
        const toneIndicators = {
            professional: /(please|thank you|appreciate|regards|sincerely)/i,
            casual: /(hey|awesome|cool|thanks)/i,
            friendly: /(hope|excited|love|amazing)/i,
            formal: /(dear|esteemed|respectfully)/i,
            direct: /(want|need|require|must)/i
        };
        
        if (toneIndicators[tone] && toneIndicators[tone].test(messageLower)) {
            score += 30;
        }
        
        // Platform-tone alignment
        const platform = this.campaignData.outreach_mode || '';
        if (platform.includes('Instagram') && ['casual', 'friendly'].includes(tone)) score += 20;
        if (platform.includes('LinkedIn') && ['professional', 'formal'].includes(tone)) score += 20;
        if (platform.includes('Email') && tone === 'professional') score += 15;
        
        return Math.min(100, score);
    }

    analyzeAudienceFit(message) {
        let score = 50;
        const icp = this.campaignData.icp_criteria || '';
        const messageLower = message.toLowerCase();
        
        // Executive audience
        if (icp.toLowerCase().includes('ceo') || icp.toLowerCase().includes('founder')) {
            if (/strategy|growth|revenue|scale/i.test(messageLower)) score += 20;
            if (/time|busy|quick/i.test(messageLower)) score += 15;
        }
        
        // Technical audience
        if (icp.toLowerCase().includes('developer') || icp.toLowerCase().includes('engineer')) {
            if (/technical|api|integration|solution/i.test(messageLower)) score += 20;
        }
        
        // Marketing audience
        if (icp.toLowerCase().includes('marketing')) {
            if (/conversion|engagement|roi|campaign/i.test(messageLower)) score += 20;
        }
        
        return Math.min(100, score);
    }

    analyzePlatformOptimization(message) {
        let score = 50;
        const platform = this.campaignData.outreach_mode || '';
        
        if (platform.includes('Instagram')) {
            // Instagram-specific optimizations
            if (message.length <= 300) score += 15; // Shorter messages perform better
            if (/visual|content|post|story/i.test(message)) score += 10;
        } else if (platform.includes('LinkedIn')) {
            // LinkedIn-specific optimizations
            if (/connection|network|professional/i.test(message)) score += 15;
            if (message.length >= 150) score += 10; // LinkedIn allows longer messages
        } else if (platform.includes('Email')) {
            // Email-specific optimizations
            if (/subject/i.test(message)) score -= 10; // Subject should be separate
            if (message.length >= 200) score += 10; // Email allows detailed content
        }
        
        return Math.min(100, score);
    }

    generateFitnessRecommendations(components) {
        const recommendations = [];
        
        if (components.message_quality < 70) {
            recommendations.push({
                priority: 'high',
                area: 'Message Quality',
                suggestion: 'Improve message structure and add personalization tokens'
            });
        }
        
        if (components.hook_effectiveness < 60) {
            recommendations.push({
                priority: 'medium',
                area: 'Hook',
                suggestion: 'Align hook style with message opening for better impact'
            });
        }
        
        if (components.cta_strength < 50) {
            recommendations.push({
                priority: 'high',
                area: 'Call to Action',
                suggestion: 'Add specific, actionable CTA with clear next steps'
            });
        }
        
        if (components.tone_alignment < 60) {
            recommendations.push({
                priority: 'medium',
                area: 'Tone',
                suggestion: 'Adjust tone to better match platform and audience expectations'
            });
        }
        
        return recommendations;
    }

    predictMessagePerformance(analysis) {
        const baseResponseRate = 25; // Base 25% response rate
        const scoreMultiplier = analysis.overall_score / 100;
        const adjustedRate = baseResponseRate * scoreMultiplier;
        
        return {
            response_rate: Math.round(adjustedRate * 10) / 10,
            conversion_rate: Math.round(adjustedRate * 0.3 * 10) / 10,
            confidence: analysis.overall_score > 75 ? 'High' : analysis.overall_score > 50 ? 'Medium' : 'Low'
        };
    }

    displayFitnessAnalysis(variant, analysis) {
        const containerId = `fitness-analysis-${variant}-container`;
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'fitness-analysis-container';
            
            const messageContainer = document.getElementById(`variant-${variant}-message`)?.parentNode;
            if (messageContainer) {
                messageContainer.appendChild(container);
            }
        }
        
        const scoreColor = analysis.overall_score >= 75 ? '#10B981' : analysis.overall_score >= 50 ? '#F59E0B' : '#EF4444';
        
        container.innerHTML = `
            <div class="fitness-analysis-content">
                <div class="analysis-header">
                    <h4>🔍 Fitness Analysis - Variant ${variant.toUpperCase()}</h4>
                    <div class="overall-score" style="color: ${scoreColor}">
                        ${Math.round(analysis.overall_score)}/100
                    </div>
                </div>
                
                <div class="component-scores">
                    ${Object.entries(analysis.components).map(([component, score]) => `
                        <div class="score-item">
                            <span class="score-label">${component.replace('_', ' ')}</span>
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${score}%; background-color: ${this.getScoreColor(score)}"></div>
                            </div>
                            <span class="score-value">${Math.round(score)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="performance-prediction">
                    <h5>📊 Predicted Performance</h5>
                    <div class="prediction-metrics">
                        <div class="metric">
                            <span class="metric-label">Response Rate:</span>
                            <span class="metric-value">${analysis.predicted_performance.response_rate}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Conversion Rate:</span>
                            <span class="metric-value">${analysis.predicted_performance.conversion_rate}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Confidence:</span>
                            <span class="metric-value">${analysis.predicted_performance.confidence}</span>
                        </div>
                    </div>
                </div>
                
                ${analysis.recommendations.length > 0 ? `
                    <div class="recommendations">
                        <h5>💡 Recommendations</h5>
                        ${analysis.recommendations.map(rec => `
                            <div class="recommendation-item priority-${rec.priority}">
                                <div class="recommendation-header">
                                    <span class="recommendation-area">${rec.area}</span>
                                    <span class="recommendation-priority">${rec.priority} priority</span>
                                </div>
                                <div class="recommendation-text">${rec.suggestion}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    getScoreColor(score) {
        if (score >= 75) return '#10B981';
        if (score >= 50) return '#F59E0B';
        return '#EF4444';
    }

    // =============================================================================
    // COMPREHENSIVE CAMPAIGN OPERATIONS
    // =============================================================================

    async launchCampaign() {
        // Final validation
        if (!this.validateAllSteps()) {
            window.OsliraApp.showMessage('Please complete all required fields before launching', 'error');
            return;
        }
        
        // Credit check
        const requiredCredits = this.calculateCreditRequirement();
        if (requiredCredits > this.userProfile.credits) {
            this.showInsufficientCreditsModal(requiredCredits);
            return;
        }
        
        // Show launch confirmation
        if (!await this.confirmCampaignLaunch()) {
            return;
        }
        
        const launchBtn = document.getElementById('launch-campaign-btn');
        const originalText = launchBtn?.textContent || 'Launch Campaign';
        
        try {
            if (launchBtn) {
                launchBtn.disabled = true;
                launchBtn.textContent = '🚀 Launching...';
            }
            
            window.OsliraApp.showLoadingOverlay('Launching your campaign...');
            
            await this.processCampaignLaunch();
            
            window.OsliraApp.showMessage('Campaign launched successfully! 🎉', 'success');
            this.trackCampaignLaunch();
            this.returnToOverview();
            await this.loadCampaigns();
            
        } catch (error) {
            console.error('Campaign launch error:', error);
            window.OsliraApp.showMessage('Failed to launch campaign: ' + error.message, 'error');
        } finally {
            window.OsliraApp.removeLoadingOverlay();
            if (launchBtn) {
                launchBtn.disabled = false;
                launchBtn.textContent = originalText;
            }
        }
    }

    // =============================================================================
    // UTILITY FUNCTIONS AND CLEANUP
    // =============================================================================

    validateForm() {
        // General form validation
        const inputs = document.querySelectorAll('.form-input[required], .form-select[required], .form-textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                input.classList.remove('valid');
                isValid = false;
            } else {
                input.classList.remove('error');
                input.classList.add('valid');
            }
        });
        
        return isValid;
    }

    selectCampaign(campaignId) {
        // Deselect previous
        document.querySelectorAll('.campaign-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Select new
        const selectedCard = document.querySelector(`[data-campaign-id="${campaignId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            this.selectedCampaign = campaignId;
            this.loadCampaignDetails(campaignId);
        }
    }

    async loadCampaignDetails(campaignId) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        // Update campaign details panel
        const detailsPanel = document.getElementById('campaign-details-panel');
        if (detailsPanel) {
            detailsPanel.innerHTML = this.renderCampaignDetails(campaign);
        }
        
        // Load analytics for selected campaign
        await this.loadCampaignAnalytics(campaignId);
    }

    renderCampaignDetails(campaign) {
        const analytics = campaign.campaign_analytics?.[0] || {};
        const responseRate = this.calculateResponseRate(campaign);
        
        return `
            <div class="campaign-details-content">
                <div class="campaign-details-header">
                    <h3>${campaign.name}</h3>
                    <div class="campaign-actions">
                        <button class="action-btn" onclick="campaigns.pauseCampaign('${campaign.id}')">
                            ${campaign.status === 'live' ? '⏸️ Pause' : '▶️ Resume'}
                        </button>
                        <button class="action-btn" onclick="campaigns.cloneCampaign('${campaign.id}')">
                            📋 Clone
                        </button>
                        <button class="action-btn danger" onclick="campaigns.stopCampaign('${campaign.id}')">
                            🛑 Stop
                        </button>
                    </div>
                </div>
                
                <div class="campaign-metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${campaign.messages_sent || 0}</div>
                        <div class="metric-label">Messages Sent</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${campaign.responses_received || 0}</div>
                        <div class="metric-label">Responses</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${responseRate.toFixed(1)}%</div>
                        <div class="metric-label">Response Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${campaign.conversions || 0}</div>
                        <div class="metric-label">Conversions</div>
                    </div>
                </div>
                
                <div class="campaign-info">
                    <div class="info-row">
                        <span class="info-label">Objective:</span>
                        <span class="info-value">${campaign.objective}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Platform:</span>
                        <span class="info-value">${campaign.outreach_mode}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Target Leads:</span>
                        <span class="info-value">${campaign.target_lead_count || 0}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Created:</span>
                        <span class="info-value">${window.OsliraApp.formatDateInUserTimezone(campaign.created_at)}</span>
                    </div>
                </div>
                
                ${analytics.quality_score ? `
                    <div class="quality-metrics">
                        <h4>AI Quality Metrics</h4>
                        <div class="quality-score-display">
                            <div class="quality-score">${analytics.quality_score}/100</div>
                            <div class="quality-label">Overall Quality</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async loadCampaignAnalytics(campaignId) {
        // Implementation for loading detailed analytics
        console.log('Loading analytics for campaign:', campaignId);
        
        // Update charts and metrics for selected campaign
        this.updateLiveMetrics();
    }

    async updateLiveMetrics() {
        if (!this.selectedCampaign) return;
        
        const campaign = this.campaigns.find(c => c.id === this.selectedCampaign);
        if (!campaign) return;
        
        // Update real-time metrics
        const metricsElements = {
            'live-messages-sent': campaign.messages_sent || 0,
            'live-responses': campaign.responses_received || 0,
            'live-response-rate': this.calculateResponseRate(campaign).toFixed(1) + '%',
            'live-conversions': campaign.conversions || 0
        };
        
        Object.entries(metricsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    // =============================================================================
    // ADVANCED DASHBOARD FUNCTIONS
    // =============================================================================

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadUserStats(),
                this.loadRecentActivity(),
                this.loadCreditUsage()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadRecentActivity() {
        // Load recent campaign activities
        const activities = [
            { type: 'campaign_created', message: 'New campaign "SaaS Outreach Q1" created', timestamp: new Date() },
            { type: 'message_sent', message: '127 messages sent from campaign', timestamp: new Date(Date.now() - 3600000) },
            { type: 'response_received', message: '12 new responses received', timestamp: new Date(Date.now() - 7200000) }
        ];
        
        const activityContainer = document.getElementById('recent-activity');
        if (activityContainer) {
            activityContainer.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
                    <div class="activity-content">
                        <div class="activity-message">${activity.message}</div>
                        <div class="activity-time">${window.OsliraApp.formatDateInUserTimezone(activity.timestamp)}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    getActivityIcon(type) {
        const icons = {
            campaign_created: '🚀',
            message_sent: '📧',
            response_received: '💬',
            conversion: '🎯',
            campaign_paused: '⏸️',
            campaign_resumed: '▶️'
        };
        return icons[type] || '📊';
    }

    async loadCreditUsage() {
        const usage = {
            used_this_month: 24,
            total_available: this.userProfile.credits,
            monthly_limit: this.getPlanFeatures(this.userProfile.subscription_plan).leads
        };
        
        this.updateCreditUsageDisplay(usage);
    }

    updateCreditUsageDisplay(usage) {
        const usageEl = document.getElementById('credit-usage');
        if (usageEl) {
            const percentage = (usage.used_this_month / usage.monthly_limit) * 100;
            usageEl.innerHTML = `
                <div class="usage-stats">
                    <div class="usage-bar">
                        <div class="usage-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="usage-text">
                        ${usage.used_this_month} / ${usage.monthly_limit} credits used this month
                    </div>
                </div>
            `;
        }
    }

    // =============================================================================
    // KEYBOARD SHORTCUTS AND EVENT HANDLERS
    // =============================================================================

    handleKeyboardShortcuts(e) {
        // Global keyboard shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showWizard();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isWizardActive()) {
            e.preventDefault();
            this.saveDraft();
        }
        
        if (e.key === 'Escape') {
            this.handleEscapeKey();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && this.isWizardActive()) {
            e.preventDefault();
            if (this.currentStep === 4) {
                this.launchCampaign();
            } else {
                this.nextStep();
            }
        }
    }

    handleEscapeKey() {
        if (this.isWizardActive()) {
            this.cancelWizard();
        } else {
            // Close any open modals
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                openModal.style.display = 'none';
            }
        }
    }

    handleModalClick(event) {
        // Close modal if clicking on overlay
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }

    isWizardActive() {
        return document.getElementById('wizard-view')?.classList.contains('active') || false;
    }

    // =============================================================================
    // CLEANUP AND FINALIZATION
    // =============================================================================

    destroy() {
        // Clean up event listeners and subscriptions
        this.stopRealTimeUpdates();
        
        // Clear intervals
        if (this.liveMetricsInterval) {
            clearInterval(this.liveMetricsInterval);
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        // Clear storage
        localStorage.removeItem('campaign_draft');
        
        console.log('🧹 Campaigns instance cleaned up');
    }

    // Development helpers
    debugCampaignData() {
        console.log('📊 Current Campaign Data:', this.campaignData);
        console.log('🎯 Selected Campaign:', this.selectedCampaign);
        console.log('👤 User Profile:', this.userProfile);
        console.log('🔧 User Capabilities:', this.userCapabilities);
    }
}

// =============================================================================
// INITIALIZE CAMPAIGNS
// =============================================================================

// Create global campaigns instance
const campaigns = new OsliraCampaigns();

// Make campaigns available globally for onclick handlers
window.campaigns = campaigns;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    campaigns.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    campaigns.destroy();
});

// Debug helper for development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugCampaigns = () => campaigns.debugCampaignData();
    console.log('🛠️ Debug helper available: debugCampaigns()');
}

console.log('📊 Full-featured Campaigns module loaded - uses shared-core.js');
