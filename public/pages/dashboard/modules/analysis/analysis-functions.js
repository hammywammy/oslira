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
   buildAnalysisModalHTML(lead, analysisData, leadId) {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) {
        console.error('❌ Modal content container not found');
        return;
    }
    
    const isDeepAnalysis = lead.analysis_type === 'deep' && analysisData;
    const summaryText = isDeepAnalysis ? analysisData.deep_summary : lead.quick_summary;
    
    // Safe profile image URL with fallback
    const profileImageUrl = lead.profile_pic_url ? 
        `https://images.weserv.nl/?url=${encodeURIComponent(lead.profile_pic_url)}&w=160&h=160&fit=cover&mask=circle` : 
        '/assets/default-avatar.png';
    
    const mainScore = isDeepAnalysis ? (analysisData.score_total || lead.score) : lead.score;
    
    // Enhanced score display with animations
    const getScoreGradient = (score) => {
        if (score >= 85) return 'from-emerald-400 via-green-500 to-teal-600';
        if (score >= 70) return 'from-blue-400 via-indigo-500 to-purple-600';
        if (score >= 55) return 'from-yellow-400 via-orange-500 to-red-500';
        if (score >= 40) return 'from-orange-400 via-red-500 to-pink-600';
        return 'from-gray-400 via-slate-500 to-gray-600';
    };
    
    modalContent.innerHTML = `
        <style>
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }
            @keyframes pulse-ring {
                0% { transform: scale(0.8); opacity: 1; }
                100% { transform: scale(1.4); opacity: 0; }
            }
            @keyframes gradient-shift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes particle-float {
                0% { transform: translateY(0px) translateX(0px); opacity: 0.7; }
                33% { transform: translateY(-30px) translateX(10px); opacity: 1; }
                66% { transform: translateY(-60px) translateX(-5px); opacity: 1; }
                100% { transform: translateY(-100px) translateX(15px); opacity: 0; }
            }
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            @keyframes countUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: rgba(255, 255, 255, 0.6);
                border-radius: 50%;
                animation: particle-float 3s infinite linear;
            }
            .particle:nth-child(2) { animation-delay: 0.5s; left: 20%; }
            .particle:nth-child(3) { animation-delay: 1s; left: 40%; }
            .particle:nth-child(4) { animation-delay: 1.5s; left: 60%; }
            .particle:nth-child(5) { animation-delay: 2s; left: 80%; }
            .gradient-shift {
                background-size: 200% 200%;
                animation: gradient-shift 3s ease infinite;
            }
            .hover-3d {
                transition: transform 0.3s ease;
            }
            .hover-3d:hover {
                transform: perspective(1000px) rotateX(5deg) rotateY(5deg) scale(1.02);
            }
            .shimmer-effect {
                position: relative;
                overflow: hidden;
            }
            .shimmer-effect::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                animation: shimmer 2s infinite;
            }
            .count-up {
                animation: countUp 0.8s ease-out forwards;
            }
            .pulse-ring {
                position: absolute;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                animation: pulse-ring 2s infinite;
            }
        </style>
        
        <!-- Animated Hero Header -->
        <div class="relative bg-gradient-to-br ${getScoreGradient(mainScore)} gradient-shift p-8 text-white overflow-hidden">
            <!-- Floating Particles -->
            <div class="absolute inset-0 overflow-hidden">
                <div class="particle" style="left: 10%; animation-delay: 0s;"></div>
                <div class="particle" style="left: 25%; animation-delay: 0.8s;"></div>
                <div class="particle" style="left: 45%; animation-delay: 1.2s;"></div>
                <div class="particle" style="left: 65%; animation-delay: 0.4s;"></div>
                <div class="particle" style="left: 85%; animation-delay: 1.6s;"></div>
            </div>
            
            <!-- Glassmorphism overlay -->
            <div class="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 backdrop-blur-[1px]"></div>
            
            <div class="relative z-10">
                <!-- Profile Section -->
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center space-x-6">
                        <div class="relative hover-3d">
                            <!-- Pulsing rings around profile -->
                            <div class="pulse-ring w-20 h-20"></div>
                            <div class="pulse-ring w-20 h-20" style="animation-delay: 0.5s;"></div>
                            
                            <img src="${profileImageUrl}" 
                                 alt="Profile" 
                                 class="relative w-20 h-20 rounded-full border-3 border-white/40 shadow-2xl transition-all duration-500 hover:scale-110 hover:shadow-3xl shimmer-effect"
                                 onerror="this.src='/assets/default-avatar.png'">
                            ${lead.is_verified ? `
                                <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-3 border-white shadow-xl hover-3d">
                                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                                    </svg>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="space-y-2">
                            <h1 class="text-3xl font-bold text-white count-up">
                                ${lead.full_name || lead.username}
                            </h1>
                            <p class="text-xl text-white/90 count-up" style="animation-delay: 0.2s;">@${lead.username}</p>
                            <div class="flex items-center space-x-3">
                                ${lead.is_business_account ? '<span class="px-3 py-1 bg-white/20 backdrop-blur-sm text-sm rounded-full border border-white/30 hover-3d shimmer-effect">Business</span>' : ''}
                                ${lead.is_private ? '<span class="px-3 py-1 bg-white/20 backdrop-blur-sm text-sm rounded-full border border-white/30 hover-3d shimmer-effect">Private</span>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Animated Score Ring -->
                    <div class="relative">
                        <div class="w-32 h-32 relative hover-3d">
                            <!-- Background circle -->
                            <svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.2)" stroke-width="8" fill="none"/>
                                <circle cx="50" cy="50" r="40" stroke="white" stroke-width="8" fill="none"
                                        stroke-dasharray="${2 * Math.PI * 40}"
                                        stroke-dashoffset="${2 * Math.PI * 40 * (1 - mainScore / 100)}"
                                        stroke-linecap="round"
                                        style="transition: stroke-dashoffset 2s ease-in-out;"/>
                            </svg>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="text-center">
                                    <div class="text-4xl font-bold text-white count-up" style="animation-delay: 0.5s;">${mainScore}</div>
                                    <div class="text-sm text-white/80">Score</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Animated Stats Grid -->
                <div class="grid grid-cols-3 gap-4">
                    <div class="group bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover-3d shimmer-effect transition-all duration-500 hover:bg-white/25">
                        <div class="text-2xl font-bold text-white count-up group-hover:scale-110 transition-transform duration-300" style="animation-delay: 0.6s;">${(lead.followers_count || 0).toLocaleString()}</div>
                        <div class="text-sm text-white/80">Followers</div>
                        <div class="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full" style="animation: float 2s ease-in-out infinite;"></div>
                    </div>
                    <div class="group bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover-3d shimmer-effect transition-all duration-500 hover:bg-white/25">
                        <div class="text-2xl font-bold text-white count-up group-hover:scale-110 transition-transform duration-300" style="animation-delay: 0.8s;">${(lead.following_count || 0).toLocaleString()}</div>
                        <div class="text-sm text-white/80">Following</div>
                        <div class="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full" style="animation: float 2s ease-in-out infinite; animation-delay: 0.5s;"></div>
                    </div>
                    <div class="group bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover-3d shimmer-effect transition-all duration-500 hover:bg-white/25">
                        <div class="text-2xl font-bold text-white count-up group-hover:scale-110 transition-transform duration-300" style="animation-delay: 1s;">${(lead.posts_count || 0).toLocaleString()}</div>
                        <div class="text-sm text-white/80">Posts</div>
                        <div class="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full" style="animation: float 2s ease-in-out infinite; animation-delay: 1s;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Content with Advanced Animations -->
        <div class="p-8 space-y-8 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
            ${isDeepAnalysis ? `
                <!-- Animated Metrics Grid -->
                <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <!-- Engagement Card -->
                    <div class="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-50 to-rose-100 p-6 shadow-2xl border border-pink-200/50 hover-3d shimmer-effect transition-all duration-700 hover:shadow-3xl">
                        <!-- Floating gradient orb -->
                        <div class="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-1000" style="animation: float 3s ease-in-out infinite;"></div>
                        
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-4">
                                <div class="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-500">
                                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                                    </svg>
                                </div>
                                <div class="text-right">
                                    <div class="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent count-up">${analysisData.engagement_score || 0}</div>
                                    <div class="text-sm text-pink-600/80">Engagement</div>
                                </div>
                            </div>
                            
                            <h3 class="text-lg font-bold text-gray-900 mb-3">Engagement Metrics</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Avg. Likes</span>
                                    <span class="font-bold text-pink-700 count-up">${(analysisData.avg_likes || 0).toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Avg. Comments</span>
                                    <span class="font-bold text-pink-700 count-up">${(analysisData.avg_comments || 0).toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Rate</span>
                                    <span class="font-bold text-pink-700 count-up">${analysisData?.engagement_rate ? `${analysisData.engagement_rate.toFixed(2)}%` : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Niche Fit Card -->
                    <div class="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 p-6 shadow-2xl border border-blue-200/50 hover-3d shimmer-effect transition-all duration-700 hover:shadow-3xl">
                        <div class="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-1000" style="animation: float 3s ease-in-out infinite; animation-delay: 1s;"></div>
                        
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-4">
                                <div class="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-500">
                                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <div class="text-right">
                                    <div class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent count-up">${analysisData.score_niche_fit || 0}</div>
                                    <div class="text-sm text-blue-600/80">Niche Fit</div>
                                </div>
                            </div>
                            
                            <h3 class="text-lg font-bold text-gray-900 mb-3">Target Alignment</h3>
                            <div class="space-y-3">
                                <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-2000 ease-out" 
                                         style="width: ${analysisData.score_niche_fit || 0}%; animation-delay: 1s;"></div>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Audience Quality</span>
                                    <span class="px-2 py-1 rounded-full text-xs font-bold ${
                                        analysisData.audience_quality === 'High' ? 'bg-green-500 text-white' :
                                        analysisData.audience_quality === 'Medium' ? 'bg-yellow-500 text-white' :
                                        'bg-red-500 text-white'
                                    }">${analysisData.audience_quality || 'Unknown'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Followers Card -->
                    <div class="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-50 to-emerald-100 p-6 shadow-2xl border border-green-200/50 hover-3d shimmer-effect transition-all duration-700 hover:shadow-3xl">
                        <div class="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-1000" style="animation: float 3s ease-in-out infinite; animation-delay: 2s;"></div>
                        
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-4">
                                <div class="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-500">
                                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                </div>
                                <div class="text-right">
                                    <div class="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent count-up">${(lead.followers_count || 0) > 1000 ? ((lead.followers_count || 0) / 1000).toFixed(1) + 'K' : (lead.followers_count || 0)}</div>
                                    <div class="text-sm text-green-600/80">Followers</div>
                                </div>
                            </div>
                            
                            <h3 class="text-lg font-bold text-gray-900 mb-3">Reach Potential</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Category</span>
                                    <span class="px-2 py-1 rounded-full text-xs font-bold ${
                                        (lead.followers_count || 0) >= 10000 ? 'bg-purple-500 text-white' :
                                        (lead.followers_count || 0) >= 1000 ? 'bg-blue-500 text-white' :
                                        'bg-gray-500 text-white'
                                    }">${(lead.followers_count || 0) >= 10000 ? 'Macro' : (lead.followers_count || 0) >= 1000 ? 'Micro' : 'Nano'}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Engagement Rate</span>
                                    <span class="font-bold text-green-700">${analysisData?.engagement_rate ? `${analysisData.engagement_rate.toFixed(2)}%` : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- AI Summary with Morphing Border -->
                <div class="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-2xl border-2 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-border hover-3d">
                    <div class="absolute inset-[2px] bg-white rounded-3xl"></div>
                    <div class="relative z-10">
                        <div class="flex items-center space-x-4 mb-6">
                            <div class="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Analysis Summary</h3>
                        </div>
                        <p class="text-gray-700 leading-relaxed text-lg font-light">${summaryText || 'No analysis summary available for this lead.'}</p>
                    </div>
                </div>
                
                ${analysisData.selling_points && analysisData.selling_points.length > 0 ? `
                    <!-- Selling Points with Staggered Animation -->
                    <div class="group rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-100 p-8 shadow-2xl border border-yellow-200/50 hover-3d shimmer-effect">
                        <div class="flex items-center space-x-4 mb-6">
                            <div class="p-4 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-3xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">Key Selling Points</h3>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${analysisData.selling_points.map((point, index) => `
                                <div class="group/item flex items-start space-x-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-yellow-200/50 hover-3d shimmer-effect transition-all duration-500 hover:bg-white hover:shadow-xl count-up" style="animation-delay: ${index * 0.2}s;">
                                    <div class="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300 shadow-lg">
                                        ${index + 1}
                                    </div>
                                    <span class="text-gray-700 font-medium leading-relaxed">${point}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${analysisData.outreach_message ? `
                    <!-- Outreach Message with Glowing Border -->
                    <div class="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 to-pink-100 p-8 shadow-2xl border-2 border-purple-200/50 hover-3d">
                        <!-- Animated border gradient -->
                        <div class="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-1000"></div>
                        
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-6">
                                <div class="flex items-center space-x-4">
                                    <div class="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.405L3 21l2.595-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
                                        </svg>
                                    </div>
                                    <h3 class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Ready-to-Send Message</h3>
                                </div>
                                <button onclick="copyOutreachMessage()" class="group/btn relative overflow-hidden px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 shimmer-effect">
                                    <span class="relative z-10 flex items-center space-x-2">
                                        <svg class="w-5 h-5 group-hover/btn:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                        <span>Copy Message</span>
                                    </span>
                                </button>
                            </div>
<div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-200/50 shadow-inner">
                                <p class="text-gray-700 leading-relaxed text-lg font-light" id="outreachMessage">${analysisData.outreach_message}</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${analysisData.engagement_insights ? `
                    <!-- Insights with Floating Elements -->
                    <div class="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-50 to-cyan-100 p-8 shadow-2xl border border-teal-200/50 hover-3d shimmer-effect">
                        <!-- Floating geometric shapes -->
                        <div class="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full opacity-30 group-hover:scale-150 transition-transform duration-1000" style="animation: float 4s ease-in-out infinite;"></div>
                        <div class="absolute bottom-8 left-8 w-6 h-6 bg-gradient-to-br from-cyan-400 to-teal-500 rotate-45 opacity-20 group-hover:rotate-180 transition-transform duration-1000" style="animation: float 3s ease-in-out infinite; animation-delay: 1s;"></div>
                        
                        <div class="relative z-10">
                            <div class="flex items-center space-x-4 mb-6">
                                <div class="p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                    </svg>
                                </div>
                                <h3 class="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Pro Insights</h3>
                            </div>
                            <p class="text-gray-700 leading-relaxed text-lg font-light">${analysisData.engagement_insights}</p>
                        </div>
                    </div>
                ` : ''}
            ` : `
                <!-- Light Analysis with Animated Elements -->
                <div class="group relative overflow-hidden rounded-3xl bg-white p-12 shadow-2xl border-2 border-blue-200/50 text-center hover-3d">
                    <!-- Pulsing background orbs -->
                    <div class="absolute top-8 left-8 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-1000" style="animation: float 3s ease-in-out infinite;"></div>
                    <div class="absolute bottom-8 right-8 w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-1000" style="animation: float 4s ease-in-out infinite; animation-delay: 1s;"></div>
                    
                    <div class="relative z-10 space-y-6">
                        <div class="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform duration-500">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <h3 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent count-up">Light Analysis Complete</h3>
                        <p class="text-gray-600 text-lg font-light max-w-2xl mx-auto count-up" style="animation-delay: 0.3s;">
                            ${summaryText || 'Basic profile analysis shows potential for outreach.'}
                        </p>
                        <p class="text-gray-500 max-w-xl mx-auto count-up" style="animation-delay: 0.6s;">
                            For detailed engagement metrics, audience insights, and personalized outreach messages, run a deep analysis.
                        </p>
                        <button onclick="startDeepAnalysis('${lead.username}')" class="group/btn relative overflow-hidden px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-500 shimmer-effect count-up" style="animation-delay: 0.9s;">
                            <span class="relative z-10 flex items-center space-x-3">
                                <svg class="w-6 h-6 group-hover/btn:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                                <span>Run Deep Analysis</span>
                            </span>
                        </button>
                    </div>
                </div>
            `}
        </div>
        
        <!-- Enhanced Footer with Glassmorphism -->
        <div class="relative bg-gradient-to-r from-slate-100 via-gray-100 to-slate-100 px-8 py-6 border-t border-gray-200/50 backdrop-blur-sm">
            <!-- Subtle floating particles -->
            <div class="absolute inset-0 overflow-hidden opacity-30">
                <div class="absolute top-2 left-1/4 w-1 h-1 bg-blue-400 rounded-full" style="animation: float 3s ease-in-out infinite;"></div>
                <div class="absolute bottom-2 right-1/3 w-1 h-1 bg-purple-400 rounded-full" style="animation: float 4s ease-in-out infinite; animation-delay: 1s;"></div>
            </div>
            
            <div class="relative z-10 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div class="flex gap-4">
                    <button onclick="contactLead('${lead.username}', '${lead.profile_url || ''}')" 
                            class="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-500 shimmer-effect">
                        <span class="relative z-10 flex items-center space-x-3">
                            <svg class="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.405L3 21l2.595-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
                            </svg>
                            <span>Contact Lead</span>
                        </span>
                    </button>
                    ${lead.profile_url ? `
                        <a href="${lead.profile_url}" target="_blank" rel="noopener noreferrer" 
                           class="group relative overflow-hidden px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-500 hover:border-gray-400 shimmer-effect">
                            <span class="relative z-10 flex items-center space-x-2">
                                <svg class="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                </svg>
                                <span>View Profile</span>
                            </span>
                        </a>
                    ` : ''}
                </div>
                <button onclick="closeLeadAnalysisModal()" 
                        class="px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-700 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 font-medium">
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Initialize animations after DOM is ready
    setTimeout(() => {
        // Trigger count-up animations
        const countElements = modalContent.querySelectorAll('.count-up');
        countElements.forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // Initialize particle systems
        const particles = modalContent.querySelectorAll('.particle');
        particles.forEach(particle => {
            setInterval(() => {
                particle.style.animationDuration = `${2 + Math.random() * 2}s`;
            }, 3000);
        });
        
    }, 100);
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
            const lead = await leadManager.getLeadById(leadId);
            
            if (!lead) {
                throw new Error('Lead not found');
            }
            
            let analysisData = null;
            if (lead.analysis_type === 'deep' && lead.analysis_result) {
                try {
                    analysisData = typeof lead.analysis_result === 'string' 
                        ? JSON.parse(lead.analysis_result) 
                        : lead.analysis_result;
                } catch (e) {
                    console.warn('Failed to parse analysis result:', e);
                }
            }
            
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
