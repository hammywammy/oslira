// =============================================================================
// ANALYSIS FUNCTIONS MODULE - Complete Analysis System
// =============================================================================

/**
 * Unified Analysis System
 * Handles all analysis modal, form processing, and build analysis functionality
 */
class AnalysisFunctions {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.stateManager = container.get('stateManager');
        this.osliraApp = container.get('osliraApp');
        this.isProcessing = false;
        this.bulkUsernames = [];
        
        console.log('🔍 [AnalysisFunctions] Initialized');
    }
    
    async openLeadAnalysisModal(leadId) {
    console.log('🔍 Opening lead analysis modal for:', leadId);
    
    try {
        const modalManager = window.modalManager;
        if (!modalManager || !modalManager.container) {
            throw new Error('Modal manager not available');
        }
        
        const leadManager = modalManager.container.get('leadManager');
        if (!leadManager) {
            throw new Error('Lead manager not found');
        }
        
        showLoadingModal();
        
        const { lead, analysisData } = await leadManager.viewLead(leadId);
        
        if (!lead) {
            throw new Error('Lead not found');
        }

        removeExistingModals();
        createLeadAnalysisModalStructure();
        buildAnalysisModalHTML(lead, analysisData, leadId);
        
        // Animate modal entry
        setTimeout(() => {
            const modal = document.getElementById('leadAnalysisModal');
            if (modal) {
                modal.style.opacity = '1';
                const container = modal.querySelector('div');
                if (container) {
                    container.style.transform = 'scale(1)';
                }
            }
        }, 10);
        
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('❌ Failed to load lead analysis:', error);
        removeExistingModals();
        showErrorModal(error.message);
    }
}
    
// File Path: public/pages/dashboard/modules/analysis/analysis-functions.js
// Replace the buildAnalysisModalHTML method

buildAnalysisModalHTML(lead, analysisData, leadId) {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) {
        console.error('❌ Modal content container not found');
        return;
    }
    
    // More robust deep analysis detection
    const isDeepAnalysis = lead.analysis_type === 'deep';
    const hasDeepData = isDeepAnalysis && analysisData && analysisData.deep_summary;
    const summaryText = hasDeepData ? analysisData.deep_summary : lead.quick_summary;
    
    console.log('🎨 [AnalysisFunctions] Building modal HTML:', {
        username: lead.username,
        analysisType: lead.analysis_type,
        isDeepAnalysis,
        hasDeepData,
        hasAnalysisData: !!analysisData
    });
    
    // Safe profile image URL with fallback
    const profileImageUrl = lead.profile_pic_url ? 
        `https://images.weserv.nl/?url=${encodeURIComponent(lead.profile_pic_url)}&w=160&h=160&fit=cover&mask=circle` : 
        '/assets/default-avatar.png';
    
    const mainScore = isDeepAnalysis ? (analysisData?.score_total || lead.score) : lead.score;
    
    // Success state detection for premium leads
    const isPremiumLead = mainScore >= 90;
    const isHighValue = mainScore >= 80;
    
    // Enhanced CSS with subtle dopamine triggers
    modalContent.innerHTML = `
        <style>
            /* Score animation - counts up from 0 to final score */
            @keyframes scoreCountUp {
                from { 
                    opacity: 0; 
                    transform: scale(0.8); 
                }
                to { 
                    opacity: 1; 
                    transform: scale(1); 
                }
            }
            
            /* Subtle card stagger animation */
            @keyframes cardSlideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* Very subtle hover lift - fixes your rotation issue */
            .subtle-hover {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .subtle-hover:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            }
            
            /* Premium glow effect for 90+ scores */
            @keyframes premiumGlow {
                0% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
                50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.5); }
                100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
            }
            
            .premium-glow {
                animation: premiumGlow 3s ease-in-out infinite;
            }
            
            /* Success celebration particles for 90+ scores */
            @keyframes celebrationParticle {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100px) rotate(360deg);
                    opacity: 0;
                }
            }
            
            .celebration-particle {
                position: absolute;
                width: 6px;
                height: 6px;
                background: linear-gradient(45deg, #10b981, #34d399);
                border-radius: 50%;
                animation: celebrationParticle 2s ease-out forwards;
            }
            
            /* Subtle icon pulse for high-value indicators */
            @keyframes iconPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .icon-pulse {
                animation: iconPulse 2s ease-in-out infinite;
            }
            
            /* Score ring animation */
            .score-ring {
                stroke-dasharray: 251.2; /* 2π × 40 */
                stroke-dashoffset: 251.2;
                animation: fillRing 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            
            @keyframes fillRing {
                to {
                    stroke-dashoffset: calc(251.2 - (251.2 * var(--score) / 100));
                }
            }
            
            /* Stagger delays for content reveal */
            .stagger-1 { animation-delay: 0.1s; }
            .stagger-2 { animation-delay: 0.2s; }
            .stagger-3 { animation-delay: 0.3s; }
            .stagger-4 { animation-delay: 0.4s; }
            .stagger-5 { animation-delay: 0.5s; }
            
            /* Success state gradient for high-value leads */
            .success-gradient {
                background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            }
            
            .high-value-gradient {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            }
        </style>
        
        <!-- Main Content - keeping your exact structure -->
        <div class="relative ${isPremiumLead ? 'premium-glow' : ''}" style="animation: cardSlideUp 0.6s ease-out;">
            <!-- Header Section - unchanged -->
            <div class="relative ${isPremiumLead ? 'success-gradient' : isHighValue ? 'high-value-gradient' : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600'} text-white p-8">
                
                <!-- Celebration particles for premium leads -->
                ${isPremiumLead ? `
                    <div class="celebration-particle" style="top: 20%; left: 10%; animation-delay: 0s;"></div>
                    <div class="celebration-particle" style="top: 30%; left: 80%; animation-delay: 0.5s;"></div>
                    <div class="celebration-particle" style="top: 60%; left: 15%; animation-delay: 1s;"></div>
                    <div class="celebration-particle" style="top: 70%; left: 85%; animation-delay: 1.5s;"></div>
                ` : ''}
                
                <div class="flex items-start justify-between">
                    <!-- Profile Info - unchanged -->
                    <div class="flex items-start space-x-6">
                        <div class="relative">
                            <img src="${profileImageUrl}" 
                                 alt="Profile" 
                                 class="w-20 h-20 rounded-full border-4 border-white shadow-xl"
                                 onerror="this.src='https://via.placeholder.com/80x80/6366f1/ffffff?text=${lead.username?.charAt(0)?.toUpperCase() || 'U'}'">
                            ${isHighValue ? '<div class="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-xs">⭐</span></div>' : ''}
                        </div>
                        
                        <div class="flex-1">
                            <h2 class="text-2xl font-bold mb-2">@${lead.username}</h2>
                            <div class="flex flex-wrap gap-2">
                                ${lead.is_business ? '<span class="px-3 py-1 bg-white/20 backdrop-blur-sm text-sm rounded-full border border-white/30">Business</span>' : ''}
                                ${lead.is_private ? '<span class="px-3 py-1 bg-white/20 backdrop-blur-sm text-sm rounded-full border border-white/30">Private</span>' : ''}
                                ${isPremiumLead ? '<span class="px-3 py-1 bg-yellow-400/20 backdrop-blur-sm text-sm rounded-full border border-yellow-400/30 icon-pulse">🎯 Premium Lead</span>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Animated Score Ring - enhanced -->
                    <div class="relative">
                        <div class="w-32 h-32 relative">
                            <svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.2)" stroke-width="8" fill="none"/>
                                <circle cx="50" cy="50" r="40" 
                                        stroke="white" 
                                        stroke-width="8" 
                                        fill="none"
                                        stroke-linecap="round"
                                        class="score-ring"
                                        style="--score: ${mainScore}"/>
                            </svg>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="text-center">
                                    <div id="scoreDisplay" class="text-4xl font-bold text-white" style="animation: scoreCountUp 0.8s ease-out 1s both;">0</div>
                                    <div class="text-sm text-white/80">Score</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Stats Grid - with stagger animation -->
                <div class="grid grid-cols-3 gap-4 mt-6">
                    <div class="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 subtle-hover" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both;" class="stagger-2">
                        <div class="text-2xl font-bold text-white">${(lead.followers_count || 0).toLocaleString()}</div>
                        <div class="text-sm text-white/80 flex items-center gap-1">
                            ${isHighValue ? '<span class="icon-pulse">📈</span>' : ''}
                            Followers
                        </div>
                    </div>
                    <div class="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 subtle-hover" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both;" class="stagger-3">
                        <div class="text-2xl font-bold text-white">${isDeepAnalysis ? (analysisData?.engagement_rate || 0).toFixed(1) : 'N/A'}%</div>
                        <div class="text-sm text-white/80">Engagement</div>
                    </div>
                    <div class="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 subtle-hover" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both;" class="stagger-4">
                        <div class="text-2xl font-bold text-white">${isDeepAnalysis ? (analysisData?.niche_fit || 0) : 'N/A'}</div>
                        <div class="text-sm text-white/80">Niche Fit</div>
                    </div>
                </div>
            </div>
            
            <!-- Content Section - with stagger animation -->
            <div class="p-8">
                <!-- Summary Section - unchanged structure -->
                <div class="mb-8" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both;" class="stagger-5">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        ${isDeepAnalysis ? 'Deep Analysis Summary' : 'Quick Analysis Summary'}
                    </h3>
                    <div class="bg-gray-50 rounded-2xl p-6 subtle-hover">
                        <p class="text-gray-700 leading-relaxed">${summaryText || 'Analysis summary not available.'}</p>
                    </div>
                </div>
                
                ${isDeepAnalysis && analysisData ? `
                    <!-- Deep Analysis Content - with stagger -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <!-- Engagement Insights -->
                        <div class="subtle-hover" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both; animation-delay: 0.6s;">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                ${analysisData.engagement_score >= 70 ? '<span class="icon-pulse">💎</span>' : '📊'} Engagement Analysis
                            </h4>
                            <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <div class="space-y-4">
                                    <div class="flex justify-between items-center">
                                        <span class="text-gray-600">Engagement Score</span>
                                        <span class="font-bold text-2xl text-indigo-600">${analysisData.engagement_score || 0}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-gray-600">Avg Likes</span>
                                        <span class="font-semibold">${(analysisData.avg_likes || 0).toLocaleString()}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-gray-600">Avg Comments</span>
                                        <span class="font-semibold">${(analysisData.avg_comments || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Audience Quality -->
                        <div class="subtle-hover" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both; animation-delay: 0.7s;">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                🎯 Audience Quality
                            </h4>
                            <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <p class="text-gray-700">${analysisData.audience_quality || 'Quality assessment not available'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Selling Points - with stagger -->
                    ${analysisData.selling_points && analysisData.selling_points.length > 0 ? `
                        <div class="mb-8" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both; animation-delay: 0.8s;">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4">💡 Key Selling Points</h4>
                            <div class="grid gap-3">
                                ${analysisData.selling_points.map((point, index) => `
                                    <div class="bg-green-50 border border-green-200 rounded-xl p-4 subtle-hover" style="animation-delay: ${0.9 + (index * 0.1)}s;">
                                        <p class="text-green-800 font-medium">${point}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Outreach Message Section -->
                    ${analysisData.outreach_message ? `
                        <div class="mb-8" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both; animation-delay: 1s;">
                            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="text-lg font-semibold text-purple-800 flex items-center gap-2">
                                        <span class="icon-pulse">💌</span> Ready-to-Send Message
                                    </h4>
                                    <button onclick="copyOutreachMessage('${analysisData.outreach_message.replace(/'/g, "\\'")}')" 
                                            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors subtle-hover">
                                        Copy Message
                                    </button>
                                </div>
                                <div class="bg-white rounded-xl p-4 border border-purple-100">
                                    <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">${analysisData.outreach_message}</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                ` : ''}
                
                <!-- Action Buttons - with stagger -->
                <div class="flex flex-col sm:flex-row gap-4 items-center" style="animation: cardSlideUp 0.6s ease-out; animation-fill-mode: both; animation-delay: 1.1s;">
                    ${!isDeepAnalysis ? `
                        <button onclick="startDeepAnalysis('${leadId}')" 
                                class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl subtle-hover flex items-center space-x-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            <span>Upgrade to Deep Analysis</span>
                        </button>
                    ` : `
                        <button onclick="contactLead('${leadId}')" 
                                class="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl subtle-hover flex items-center space-x-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.446L3 21l2.446-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
                            </svg>
                            <span>Contact Lead</span>
                        </button>
                    `}
                    
                    ${lead.profile_url ? `
                        <a href="${lead.profile_url}" target="_blank" rel="noopener noreferrer" 
                           class="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold shadow-lg hover:shadow-xl subtle-hover flex items-center space-x-2 hover:border-gray-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                            <span>View Profile</span>
                        </a>
                    ` : ''}
                    
                    <button onclick="closeLeadAnalysisModal()" 
                            class="px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-700 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 font-medium subtle-hover">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Initialize score count-up animation
    setTimeout(() => {
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) {
            this.animateScoreCountUp(scoreDisplay, mainScore);
        }
    }, 1000);
}

// Add this new method to handle score animation
animateScoreCountUp(element, targetScore) {
    let currentScore = 0;
    const increment = Math.ceil(targetScore / 50); // Adjust speed
    const timer = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(timer);
        }
        element.textContent = currentScore;
    }, 40); // 40ms intervals for smooth animation
}

    init() {
        this.setupEventListeners();
        this.setupGlobalMethods();
        console.log('✅ [AnalysisFunctions] Event listeners and global methods setup');
    }

    setupEventListeners() {
        // Analysis type change handler
        const analysisType = document.getElementById('analysis-type');
        if (analysisType) {
            analysisType.addEventListener('change', (e) => {
                this.handleAnalysisTypeChange(e.target.value);
            });
        }

        // Bulk analysis type change
        const bulkAnalysisType = document.getElementById('bulk-analysis-type');
        if (bulkAnalysisType) {
            bulkAnalysisType.addEventListener('change', () => {
                this.validateBulkForm();
            });
        }

        // Bulk business selection change
        const bulkBusinessId = document.getElementById('bulk-business-id');
        if (bulkBusinessId) {
            bulkBusinessId.addEventListener('change', () => {
                this.validateBulkForm();
            });
        }

        // Form submission handlers
        const analysisForm = document.getElementById('analysisForm');
        if (analysisForm) {
            analysisForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processAnalysisForm(e);
            });
        }

        const bulkForm = document.getElementById('bulkForm');
        if (bulkForm) {
            bulkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processBulkUpload(e);
            });
        }

        // File upload handler
        const fileUpload = document.getElementById('file-upload');
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => {
                this.handleFileUpload(e);
            });
        }
    }

setupGlobalMethods() {
    // Export methods to global scope for onclick handlers
    window.openLeadAnalysisModal = (leadId) => this.buildAnalysisModal(leadId);
    window.closeLeadAnalysisModal = () => this.removeExistingModals();
    window.showLoadingModal = () => this.showLoadingModal();
    window.removeExistingModals = () => this.removeExistingModals();
    window.createLeadAnalysisModalStructure = () => this.createLeadAnalysisModalStructure();
    window.buildAnalysisModalHTML = (lead, analysisData, leadId) => this.buildAnalysisModalHTML(lead, analysisData, leadId);
    window.copyOutreachMessage = (message) => this.copyOutreachMessage(message);
    window.startDeepAnalysis = (leadId) => this.startDeepAnalysis(leadId);
    window.contactLead = (leadId) => this.contactLead(leadId);
    window.showContactSuccess = () => this.showContactSuccess();
    window.showCopySuccess = () => this.showCopySuccess();
    
    // Additional analysis modal methods
    window.showAnalysisModal = (username = '') => this.showAnalysisModal(username);
    window.showBulkModal = () => this.showBulkModal();
    window.handleAnalysisTypeChange = (type) => this.handleAnalysisTypeChange(type);
    window.validateBulkForm = () => this.validateBulkForm();
    window.processAnalysisForm = (event) => this.processAnalysisForm(event);
    window.processBulkUpload = () => this.processBulkUpload();
    window.handleFileUpload = (event) => this.handleFileUpload(event);
}

    // ===============================================================================
    // ANALYSIS MODAL MANAGEMENT
    // ===============================================================================

    showAnalysisModal(prefillUsername = '') {
        console.log('🔍 [AnalysisFunctions] Opening analysis modal with username:', prefillUsername);
        
        try {
            const modalManager = this.container.get('modalManager');
            const modal = modalManager.openModal('analysisModal');
            if (!modal) {
                console.error('❌ [AnalysisFunctions] Failed to open analysisModal');
                return;
            }
            
            // Reset form
            const form = document.getElementById('analysisForm');
            if (form) {
                form.reset();
            }
            
            // Reset form fields
            const analysisType = document.getElementById('analysis-type');
            const profileInput = document.getElementById('username');
            const inputContainer = document.getElementById('input-field-container');
            
            if (analysisType) {
                analysisType.value = '';
            }
            if (profileInput) {
                profileInput.value = prefillUsername;
            }
            if (inputContainer) {
                inputContainer.style.display = 'none';
            }
            
            // Load business profiles
            setTimeout(async () => {
                try {
                    const businessManager = this.container.get('businessManager');
                    if (businessManager) {
                        await businessManager.loadBusinessProfilesForModal();
                    }
                } catch (error) {
                    console.error('❌ [AnalysisFunctions] Failed to load business profiles:', error);
                }
            }, 100);
            
            // Focus on analysis type dropdown
            setTimeout(() => {
                if (analysisType) {
                    analysisType.focus();
                }
            }, 200);
            
            console.log('✅ [AnalysisFunctions] Analysis modal opened');
            
        } catch (error) {
            console.error('❌ [AnalysisFunctions] Failed to open analysis modal:', error);
            this.osliraApp?.showMessage('Failed to open analysis modal. Please try again.', 'error');
        }
    }

    showBulkModal() {
        console.log('📁 [AnalysisFunctions] Opening bulk analysis modal...');
        
        try {
            const modalManager = this.container.get('modalManager');
            const modal = modalManager.openModal('bulkModal');
            if (!modal) return;
            
            // Reset form and state
            this.resetBulkModal();
            
            // Load business profiles for bulk modal
            setTimeout(async () => {
                try {
                    const businessManager = this.container.get('businessManager');
                    if (businessManager) {
                        await businessManager.loadBusinessProfilesForBulkModal();
                    }
                } catch (error) {
                    console.error('❌ [AnalysisFunctions] Failed to load bulk business profiles:', error);
                }
            }, 100);
            
            console.log('✅ [AnalysisFunctions] Bulk modal opened');
        } catch (error) {
            console.error('❌ [AnalysisFunctions] Failed to open bulk modal:', error);
        }
    }

    // ===============================================================================
    // FORM HANDLERS
    // ===============================================================================

    handleAnalysisTypeChange(type) {
        const analysisType = type || document.getElementById('analysis-type')?.value;
        const inputContainer = document.getElementById('input-field-container');
        const profileInput = document.getElementById('username');
        
        if (analysisType && inputContainer) {
            inputContainer.style.display = 'block';
            
            // Focus on input field
            setTimeout(() => {
                if (profileInput) {
                    profileInput.focus();
                }
            }, 100);
        }
        
        // Update credit cost display
        this.updateCreditCostDisplay(analysisType);
        
        // Update submit button
        this.updateAnalysisSubmitButton(analysisType);
    }

    updateCreditCostDisplay(analysisType) {
        const costDisplay = document.getElementById('analysis-cost-display');
        if (costDisplay) {
            const cost = analysisType === 'deep' ? 2 : 1;
            costDisplay.textContent = `${cost} credit${cost > 1 ? 's' : ''}`;
        }
    }
    
    updateAnalysisSubmitButton(analysisType) {
        const submitBtn = document.getElementById('analysis-submit-btn');
        if (submitBtn) {
            if (analysisType) {
                const cost = analysisType === 'deep' ? 2 : 1;
                submitBtn.textContent = `Start Analysis (${cost} credit${cost > 1 ? 's' : ''})`;
                submitBtn.disabled = false;
            } else {
                submitBtn.textContent = 'Select Analysis Type';
                submitBtn.disabled = true;
            }
        }
    }

    async processAnalysisForm(event) {
        event.preventDefault();
        
        if (this.isProcessing) return;
        
        try {
            console.log('🔍 [AnalysisFunctions] Processing analysis form...');
            
            // Get form data
            const formData = new FormData(event.target);
            const username = formData.get('username')?.trim();
            const analysisType = formData.get('analysisType');
            const businessId = formData.get('businessId');
            
            // Validate inputs
            if (!username || !analysisType || !businessId) {
                throw new Error('Please fill in all required fields');
            }
            
            // Clean username
            const cleanUsername = this.cleanUsername(username);
            if (!this.isValidUsername(cleanUsername)) {
                throw new Error('Please enter a valid Instagram username');
            }
            
            this.isProcessing = true;
            const submitBtn = document.getElementById('analysis-submit-btn');
            this.setSubmitButtonLoading(submitBtn, true);
            
            // Close modal
            const modalManager = this.container.get('modalManager');
            modalManager.closeModal('analysisModal');
            
            // Start analysis
            const analysisQueue = this.container.get('analysisQueue');
            const result = await analysisQueue.startSingleAnalysis({
                username: cleanUsername,
                analysisType,
                businessId
            });
            
            this.osliraApp?.showMessage(
                `Analysis started for @${cleanUsername}`,
                'success'
            );
            
            console.log('✅ [AnalysisFunctions] Analysis form processed:', result);
            
        } catch (error) {
            console.error('❌ [AnalysisFunctions] Analysis form processing failed:', error);
            this.osliraApp?.showMessage(
                `Analysis failed: ${error.message}`,
                'error'
            );
        } finally {
            this.isProcessing = false;
            const submitBtn = document.getElementById('analysis-submit-btn');
            this.setSubmitButtonLoading(submitBtn, false);
        }
    }

    // ===============================================================================
    // BULK ANALYSIS FUNCTIONS
    // ===============================================================================

    resetBulkModal() {
        // Reset form
        const form = document.getElementById('bulkForm');
        if (form) {
            form.reset();
        }
        
        // Clear file input display
        const fileDisplay = document.getElementById('file-display');
        if (fileDisplay) {
            fileDisplay.innerHTML = '';
        }
        
        // Reset validation state
        const submitBtn = document.getElementById('bulk-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Select Analysis Type';
        }
        
        // Clear usernames
        this.bulkUsernames = [];
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📄 [AnalysisFunctions] Processing file upload:', file.name);
        
        try {
            // Validate file
            if (!this.validateFile(file)) {
                return;
            }
            
            // Read file content
            const content = await this.readFileAsText(file);
            
            // Parse usernames
            const usernames = this.parseUsernamesFromContent(content, file.type);
            
            if (usernames.length === 0) {
                throw new Error('No valid usernames found in file');
            }
            
            // Store usernames
            this.bulkUsernames = usernames;
            
            // Update UI
            this.displayParsedUsernames(usernames, file.name);
            this.validateBulkForm();
            
            console.log(`✅ [AnalysisFunctions] File processed: ${usernames.length} usernames found`);
            
        } catch (error) {
            console.error('❌ [AnalysisFunctions] File processing failed:', error);
            this.osliraApp?.showMessage(`File processing failed: ${error.message}`, 'error');
            
            // Reset file input
            event.target.value = '';
            this.bulkUsernames = [];
        }
    }

    validateBulkForm() {
        const analysisType = document.getElementById('bulk-analysis-type')?.value;
        const businessId = document.getElementById('bulk-business-id')?.value;
        const usernameCount = this.bulkUsernames?.length || 0;
        const submitBtn = document.getElementById('bulk-submit-btn');
        
        if (!submitBtn) return;
        
        // Check if all fields are filled
        const isFormValid = analysisType && businessId && usernameCount > 0;
        
        // Check credits
        const hasEnoughCredits = this.checkBulkCredits();
        
        // Update button state
        const isValid = isFormValid && hasEnoughCredits;
        
        if (isValid) {
            const creditCost = this.calculateBulkCreditCost();
            submitBtn.textContent = `Start Bulk Analysis (${creditCost} credits)`;
            submitBtn.disabled = false;
        } else if (!isFormValid) {
            submitBtn.textContent = 'Complete all fields';
            submitBtn.disabled = true;
        } else if (!hasEnoughCredits) {
            const creditCost = this.calculateBulkCreditCost();
            submitBtn.textContent = `Insufficient credits (${creditCost} needed)`;
            submitBtn.disabled = true;
        }
        
        // Update submit button styling
        submitBtn.style.opacity = isValid ? '1' : '0.6';
        submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }

    async processBulkUpload() {
        if (this.isProcessing) return;
        
        try {
            console.log('📁 [AnalysisFunctions] Processing bulk upload...');
            
            const analysisType = document.getElementById('bulk-analysis-type')?.value;
            const businessId = document.getElementById('bulk-business-id')?.value;
            
            if (!this.bulkUsernames?.length || !analysisType || !businessId) {
                throw new Error('Please complete all fields');
            }
            
            this.isProcessing = true;
            const submitBtn = document.getElementById('bulk-submit-btn');
            this.setSubmitButtonLoading(submitBtn, true, 'Processing...');
            
            // Close modal
            const modalManager = this.container.get('modalManager');
            modalManager.closeModal('bulkModal');
            
            // Start bulk analysis
            const analysisQueue = this.container.get('analysisQueue');
            const result = await analysisQueue.startBulkAnalysis({
                usernames: this.bulkUsernames,
                analysisType,
                businessId
            });
            
            this.osliraApp?.showMessage(
                `Bulk analysis started for ${this.bulkUsernames.length} profiles`,
                'success'
            );
            
            console.log('✅ [AnalysisFunctions] Bulk upload processed:', result);
            
        } catch (error) {
            console.error('❌ [AnalysisFunctions] Bulk upload failed:', error);
            this.osliraApp?.showMessage(
                `Bulk upload failed: ${error.message}`,
                'error'
            );
        } finally {
            this.isProcessing = false;
            const submitBtn = document.getElementById('bulk-submit-btn');
            this.setSubmitButtonLoading(submitBtn, false);
        }
    }

    // ===============================================================================
    // BUILD ANALYSIS FUNCTIONS
    // ===============================================================================

async buildAnalysisModal(leadId) {
    console.log('🔍 [AnalysisFunctions] Building analysis modal for lead:', leadId);
    
    try {
        this.showLoadingModal();
        
        const leadManager = this.container.get('leadManager');
        
        // Use viewLead method to get both lead and analysis data
        const { lead, analysisData } = await leadManager.viewLead(leadId);
        
        if (!lead) {
            throw new Error('Lead not found');
        }
        
        console.log('📊 [AnalysisFunctions] Lead data:', {
            username: lead.username,
            analysisType: lead.analysis_type,
            hasAnalysisData: !!analysisData
        });
            
            this.removeExistingModals();
            this.createLeadAnalysisModalStructure();
            this.buildAnalysisModalHTML(lead, analysisData, leadId);
            
            // Animate modal entry
            setTimeout(() => {
                const modal = document.getElementById('leadAnalysisModal');
                if (modal) {
                    modal.style.opacity = '1';
                    const container = modal.querySelector('div');
                    if (container) {
                        container.style.transform = 'scale(1)';
                    }
                }
            }, 10);
            
            document.body.style.overflow = 'hidden';
            
        } catch (error) {
            console.error('❌ [AnalysisFunctions] Failed to load lead analysis:', error);
            this.removeExistingModals();
            this.showErrorModal(error.message);
        }
    }

    createLeadAnalysisModalStructure() {
        this.removeExistingModals();
        
        const modalHTML = `
            <div id="leadAnalysisModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" style="opacity: 0;">
                <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden" style="transform: scale(0.95); transition: transform 0.2s ease;">
                    <!-- Close button -->
                    <div class="absolute top-4 right-4 z-10">
                        <button onclick="closeLeadAnalysisModal()" class="p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-colors">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div id="modalContent" class="overflow-y-auto max-h-[90vh]">
                        <!-- Content will be populated by buildAnalysisModalHTML -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // ===============================================================================
    // UTILITY FUNCTIONS
    // ===============================================================================

    cleanUsername(username) {
        return username.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').split('/')[0].trim();
    }

    isValidUsername(username) {
        return /^[a-zA-Z0-9._]{1,30}$/.test(username);
    }

    setSubmitButtonLoading(button, isLoading, loadingText = 'Processing...') {
        if (!button) return;

        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.disabled = true;
        } else {
            button.textContent = button.dataset.originalText || 'Start Analysis';
            button.disabled = false;
        }
    }

    validateFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
        
        if (file.size > maxSize) {
            this.osliraApp?.showMessage('File too large. Maximum size is 5MB.', 'error');
            return false;
        }
        
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            this.osliraApp?.showMessage('Please upload a CSV or TXT file.', 'error');
            return false;
        }
        
        return true;
    }

    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseUsernamesFromContent(content, fileType) {
        const usernames = [];
        const lines = content.split(/\r?\n/);
        
        lines.forEach(line => {
            const cleanLine = line.trim();
            if (cleanLine && !cleanLine.startsWith('#')) {
                // Handle CSV format
                if (fileType === 'text/csv' || cleanLine.includes(',')) {
                    const columns = cleanLine.split(',');
                    columns.forEach(col => {
                        const username = this.cleanUsername(col.trim());
                        if (username && this.isValidUsername(username)) {
                            usernames.push(username);
                        }
                    });
                } else {
                    // Handle plain text
                    const username = this.cleanUsername(cleanLine);
                    if (username && this.isValidUsername(username)) {
                        usernames.push(username);
                    }
                }
            }
        });
        
        // Remove duplicates
        return [...new Set(usernames)];
    }

    displayParsedUsernames(usernames, fileName) {
        const fileDisplay = document.getElementById('file-display');
        if (!fileDisplay) return;
        
        const previewCount = Math.min(usernames.length, 10);
        const remainingCount = Math.max(0, usernames.length - previewCount);
        
        fileDisplay.innerHTML = `
            <div class="file-summary">
                <div class="file-info">
                    <span class="file-name">${fileName}</span>
                    <span class="username-count">${usernames.length} username${usernames.length !== 1 ? 's' : ''} found</span>
                </div>
                
                <div class="username-preview">
                    <div class="preview-list">
                        ${usernames.slice(0, previewCount).map(username => 
                            `<span class="username-tag">@${username}</span>`
                        ).join('')}
                        ${remainingCount > 0 ? `<span class="more-count">+${remainingCount} more</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    checkBulkCredits() {
        const creditCost = this.calculateBulkCreditCost();
        const availableCredits = this.osliraApp?.credits || 0;
        return availableCredits >= creditCost;
    }
    
    calculateBulkCreditCost() {
        const analysisType = document.getElementById('bulk-analysis-type')?.value;
        const usernameCount = this.bulkUsernames?.length || 0;
        const costPerAnalysis = analysisType === 'deep' ? 2 : 1;
        return usernameCount * costPerAnalysis;
    }

    showLoadingModal() {
        const loadingHTML = `
            <div id="loadingModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Loading Analysis</h3>
                    <p class="text-gray-500">Fetching lead details and analysis data...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    removeExistingModals() {
        ['leadAnalysisModal', 'loadingModal', 'errorModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });
        document.body.style.overflow = '';
    }

    showErrorModal(message) {
        const errorHTML = `
            <div id="errorModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                        <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Error</h3>
                    <p class="text-gray-500 mb-4">${message}</p>
                    <button onclick="closeErrorModal()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', errorHTML);
    }

    generateAnalysisModalContent(lead, analysisData, profileImageUrl, mainScore, summaryText, isDeepAnalysis) {
        // Return the complete HTML content for the modal
        // This would be the same HTML structure you currently have in buildAnalysisModalHTML
        // I'm keeping this method separate for clarity but you'd put your full HTML generation here
        return `<!-- Your existing modal HTML content -->`;
    }  
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalysisFunctions };
} else {
    window.AnalysisFunctions = AnalysisFunctions;
}

console.log('📄 [AnalysisFunctions] Module loaded');
