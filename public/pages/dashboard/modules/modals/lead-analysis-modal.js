//public/pages/dashboard/modules/modals/lead-analysis-modal.js

class LeadAnalysisModal {
    constructor(container) {
        this.container = container;
        this.modalManager = container.get('modalManager');
    }

    renderModal() {
        return `
<!-- Lead Analysis Modal - Clean Tailwind Design -->
<div id="leadAnalysisModal" class="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 hidden">
    <div class="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        
        <!-- Modal Header with Profile -->
        <div class="relative bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
            <!-- Close Button -->
            <button onclick="closeLeadAnalysisModal()" 
                    class="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
            
            <!-- Profile Section -->
            <div class="flex items-center space-x-4">
                <img id="leadProfileImage" 
                     src="" 
                     alt="Profile" 
                     class="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover">
                
                <div class="text-white">
                    <div class="flex items-center space-x-2">
                        <h2 id="leadUsername" class="text-2xl font-bold">@username</h2>
                        <span id="verifiedBadge" class="hidden">
                            <svg class="w-5 h-5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.21 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.21 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.21 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.21 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                        </span>
                    </div>
                    <p id="leadFullName" class="text-white/90 text-sm">Full Name</p>
                    <div class="flex items-center space-x-4 mt-2 text-white/80 text-sm">
                        <span id="leadPlatform" class="flex items-center space-x-1">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                            </svg>
                            <span>Instagram</span>
                        </span>
                        <span id="businessBadge" class="hidden px-2 py-0.5 bg-white/20 rounded text-xs">Business</span>
                        <span id="privateBadge" class="hidden px-2 py-0.5 bg-white/20 rounded text-xs">🔒 Private</span>
                    </div>
                </div>
            </div>
            
            <!-- Bio Section -->
            <div id="leadBio" class="mt-4 text-white/90 text-sm line-clamp-2"></div>
        </div>
        
        <!-- Modal Body - Scrollable -->
        <div class="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
            
            <!-- Profile Summary -->
            <div id="profileSummary" class="mb-6 p-4 bg-gray-50 rounded-lg">
                <p class="text-gray-700 leading-relaxed"></p>
            </div>
            
            <!-- Key Stats Grid -->
            <div class="grid grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-800" id="followersCount">0</p>
                    <p class="text-sm text-gray-600">Followers</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-800" id="followingCount">0</p>
                    <p class="text-sm text-gray-600">Following</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-800" id="postsCount">0</p>
                    <p class="text-sm text-gray-600">Posts</p>
                </div>
                <div class="text-center" id="engagementRateContainer">
                    <p class="text-2xl font-bold text-gray-800" id="engagementRate">N/A</p>
                    <p class="text-sm text-gray-600">Engagement</p>
                </div>
            </div>
            
            <!-- Deep Analysis Sections -->
            <div id="deepAnalysisContent" class="space-y-6 hidden">
                
                <!-- Engagement Metrics -->
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 class="font-semibold text-gray-800 mb-3">Engagement Metrics</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-600">Average Likes</p>
                            <p class="text-lg font-semibold text-gray-800" id="avgLikes">0</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Average Comments</p>
                            <p class="text-lg font-semibold text-gray-800" id="avgComments">0</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Engagement Rate</p>
                            <p class="text-lg font-semibold text-gray-800" id="engagementRateDetail">0%</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Audience Quality</p>
                            <p class="text-lg font-semibold" id="audienceQuality">
                                <span class="px-2 py-1 rounded text-sm">Medium</span>
                            </p>
                        </div>
                    </div>
                    
                    <!-- Engagement Insights -->
                    <div id="engagementInsights" class="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700 italic hidden"></div>
                </div>
                
                <!-- Scoring Overview -->
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 class="font-semibold text-gray-800 mb-3">Scoring Overview</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Profile Score</span>
                            <span class="font-semibold text-gray-800" id="profileScore">0/100</span>
                        </div>
                        <div class="flex justify-between items-center" id="engagementScoreRow">
                            <span class="text-sm text-gray-600">Engagement Score</span>
                            <span class="font-semibold text-gray-800" id="engagementScore">0/100</span>
                        </div>
                        <div class="flex justify-between items-center" id="nicheFitRow">
                            <span class="text-sm text-gray-600">Niche Fit Score</span>
                            <span class="font-semibold text-gray-800" id="nicheFitScore">0/100</span>
                        </div>
                        <div class="flex justify-between items-center border-t pt-2" id="totalScoreRow">
                            <span class="font-semibold text-gray-700">Total Score</span>
                            <span class="font-bold text-lg text-indigo-600" id="totalScore">0/100</span>
                        </div>
                    </div>
                </div>
                
                <!-- Selling Points -->
                <div id="sellingPointsSection" class="bg-white border border-gray-200 rounded-lg p-4 hidden">
                    <h3 class="font-semibold text-gray-800 mb-3">Key Selling Points</h3>
                    <ul id="sellingPointsList" class="list-disc list-inside space-y-2 text-sm text-gray-700"></ul>
                </div>
                
                <!-- Outreach Message -->
                <div id="outreachSection" class="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 hidden">
                    <h3 class="font-semibold text-gray-800 mb-3">Suggested Outreach Message</h3>
                    <div id="outreachMessage" class="bg-white p-3 rounded text-sm text-gray-700 border border-gray-200"></div>
                    <button onclick="copyOutreachMessage()" 
                            class="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                        Copy Message
                    </button>
                </div>
                
                <!-- Latest Posts Preview -->
                <div id="latestPostsSection" class="bg-white border border-gray-200 rounded-lg p-4 hidden">
                    <h3 class="font-semibold text-gray-800 mb-3">Recent Posts</h3>
                    <div id="latestPostsGrid" class="grid grid-cols-3 gap-2 overflow-x-auto"></div>
                </div>
            </div>
            
            <!-- Light Analysis Note -->
            <div id="lightAnalysisNote" class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg hidden">
                <p class="text-sm text-yellow-800">
                    This is a light analysis. Upgrade to deep analysis for engagement metrics, audience insights, and personalized outreach messages.
                </p>
            </div>
        </div>
    </div>
</div>`;
    }

    setupEventHandlers() {
        window.closeLeadAnalysisModal = () => {
            const modal = document.getElementById('leadAnalysisModal');
            if (modal) {
                modal.classList.add('hidden');
            }
        };

        window.loadLeadAnalysisData = async (leadId, container) => {
            try {
                const leadManager = this.container.get('leadManager');
                const leadData = await leadManager.viewLead(leadId);
                
                if (!leadData) {
                    throw new Error('Lead not found');
                }
                
                window.renderLeadAnalysisContent(leadData, container);
                
            } catch (error) {
                console.error('❌ Failed to load lead analysis:', error);
                this.showErrorModal(error.message);
            }
        };

        window.copyToClipboard = (elementId) => {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const text = element.textContent || element.innerText;
            
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showCopySuccess();
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    this.fallbackCopyTextToClipboard(text);
                });
            } else {
                this.fallbackCopyTextToClipboard(text);
            }
        };
    }

    showCopySuccess() {
        const successEl = document.createElement('div');
        successEl.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300';
        successEl.innerHTML = `
            <div class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Copied to clipboard!
            </div>
        `;
        
        document.body.appendChild(successEl);
        
        setTimeout(() => {
            successEl.style.transform = 'translateY(0)';
        }, 10);
        
        setTimeout(() => {
            successEl.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                document.body.removeChild(successEl);
            }, 300);
        }, 3000);
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showCopySuccess();
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        
        document.body.removeChild(textArea);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadAnalysisModal;
} else {
    window.LeadAnalysisModal = LeadAnalysisModal;
}
