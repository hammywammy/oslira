//public/pages/dashboard/modules/ui/stats-cards.js

class StatsCards {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.stateManager = container.get('stateManager');
    }

    renderPriorityCards() {
        return `
<!-- Lead Priority Overview -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
    <!-- High Priority Card -->
    <div class="glass-white rounded-2xl p-6 hover-lift priority-high cursor-pointer" onclick="filterByPriority('high')">
        <div class="flex items-start justify-between">
            <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">HIGH PRIORITY</p>
                <h2 class="text-4xl font-black text-gray-800 count-animation" id="high-priority-count">12</h2>
                <p class="text-sm text-gray-600 mt-2">Score 80-100</p>
                <p class="text-xs text-green-600 font-medium mt-1">Ready for immediate outreach</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i data-feather="trending-up" class="w-6 h-6 text-green-600"></i>
            </div>
        </div>
    </div>
    
    <!-- Medium Priority Card -->
    <div class="glass-white rounded-2xl p-6 hover-lift priority-medium cursor-pointer" onclick="filterByPriority('medium')">
        <div class="flex items-start justify-between">
            <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">MEDIUM PRIORITY</p>
                <h2 class="text-4xl font-black text-gray-800 count-animation" id="medium-priority-count">28</h2>
                <p class="text-sm text-gray-600 mt-2">Score 60-79</p>
                <p class="text-xs text-yellow-600 font-medium mt-1">Needs nurturing strategy</p>
            </div>
            <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <i data-feather="activity" class="w-6 h-6 text-yellow-600"></i>
            </div>
        </div>
    </div>
    
    <!-- Low Priority Card -->
    <div class="glass-white rounded-2xl p-6 hover-lift priority-low cursor-pointer" onclick="filterByPriority('low')">
        <div class="flex items-start justify-between">
            <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">LOW PRIORITY</p>
                <h2 class="text-4xl font-black text-gray-800 count-animation" id="low-priority-count">45</h2>
                <p class="text-sm text-gray-600 mt-2">Score &lt;60</p>
                <p class="text-xs text-red-600 font-medium mt-1">Review or archive</p>
            </div>
            <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <i data-feather="trending-down" class="w-6 h-6 text-red-600"></i>
            </div>
        </div>
    </div>
</div>`;
    }

    renderPerformanceMetrics() {
        return `
<!-- Key Performance Metrics Panel -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <!-- Total Leads Analyzed -->
    <div class="glass-white rounded-2xl p-6 hover-lift">
        <div class="flex items-center justify-between mb-4">
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <i data-feather="search" class="w-5 h-5 text-purple-600"></i>
            </div>
            <span class="text-xs text-green-600 font-semibold">+14% this week</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-800" id="total-leads">1,247</h3>
        <p class="text-xs text-gray-500 uppercase tracking-wider mt-1">Total Leads Analyzed</p>
    </div>
    
    <!-- Outreach Success Rate -->
    <div class="glass-white rounded-2xl p-6 hover-lift">
        <div class="flex items-center justify-between mb-4">
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <i data-feather="check-circle" class="w-5 h-5 text-green-600"></i>
            </div>
            <span class="text-xs text-green-600 font-semibold">Above average</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-800" id="success-rate">73%</h3>
        <p class="text-xs text-gray-500 uppercase tracking-wider mt-1">Success Rate</p>
    </div>
    
    <!-- Outreach Sent -->
    <div class="glass-white rounded-2xl p-6 hover-lift">
        <div class="flex items-center justify-between mb-4">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i data-feather="send" class="w-5 h-5 text-blue-600"></i>
            </div>
            <span class="text-xs text-blue-600 font-semibold">32 today</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-800" id="outreach-sent">892</h3>
        <p class="text-xs text-gray-500 uppercase tracking-wider mt-1">Outreach Sent</p>
    </div>
    
    <!-- Response Rate -->
    <div class="glass-white rounded-2xl p-6 hover-lift">
        <div class="flex items-center justify-between mb-4">
            <div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i data-feather="message-circle" class="w-5 h-5 text-yellow-600"></i>
            </div>
            <span class="text-xs text-yellow-600 font-semibold">Industry avg: 18%</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-800" id="response-rate">24%</h3>
        <p class="text-xs text-gray-500 uppercase tracking-wider mt-1">Response Rate</p>
    </div>
</div>`;
    }

    updateStats(stats) {
        const elements = {
            'high-priority-count': stats.highValueLeads || 0,
            'medium-priority-count': stats.mediumPriorityLeads || 0,
            'low-priority-count': stats.lowPriorityLeads || 0,
            'total-leads': stats.totalLeads || 0,
            'success-rate': `${stats.successRate || 73}%`,
            'outreach-sent': stats.outreachSent || 0,
            'response-rate': `${stats.responseRate || 24}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    setupEventHandlers() {
        window.filterByPriority = (priority) => {
            console.log(`🔍 Filtering by priority: ${priority}`);
            this.eventBus.emit('filter:priority', { priority });
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsCards;
} else {
    window.StatsCards = StatsCards;
}
