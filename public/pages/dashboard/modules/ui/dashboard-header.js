//public/pages/dashboard/modules/ui/dashboard-header.js

class DashboardHeader {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
    }

    renderHeader() {
        return `
<div class="pt-6 px-6 pb-6">
    <div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
        <div class="flex items-center justify-between">
            <!-- Dashboard Title -->
            <div>
                <h1 class="text-2xl font-bold text-gray-800 mb-1">AI-Powered Lead Research Dashboard</h1>
                <p class="text-gray-600">Comprehensive view of all lead management activities with AI-driven insights</p>
            </div>
            
            <!-- Right Actions -->
            <div class="flex items-center space-x-4">
                <!-- Notifications -->
                <div class="relative" style="z-index: 10001;">
                    <button onclick="toggleNotifications()" class="relative p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl hover:shadow-md transition-all notification-badge" data-count="3">
                        <i data-feather="bell" class="w-5 h-5 text-gray-600"></i>
                    </button>
                    ${this.renderNotificationsDropdown()}
                </div>
                
                <!-- Research New Lead Button -->
                <button onclick="openResearchModal()" class="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all flex items-center space-x-2">
                    <i data-feather="plus" class="w-4 h-4"></i>
                    <span>Research New Lead</span>
                </button>
            </div>
        </div>
    </div>
</div>`;
    }

    renderNotificationsDropdown() {
        return `
<!-- Notifications Dropdown (hidden by default) -->
<div id="notificationsDropdown" class="hidden absolute right-0 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden" style="z-index: 10001; top: calc(100% + 0.5rem);">
    <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">Notifications</h3>
            <button class="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Mark all read</button>
        </div>
    </div>
    
    <div class="max-h-96 overflow-y-auto">
        <div class="p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <i data-feather="trending-up" class="w-4 h-4 text-green-600"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-800">New High-Value Lead</p>
                    <p class="text-xs text-gray-500 mt-1">@marketingpro added with 92% score</p>
                    <p class="text-xs text-gray-400 mt-1">2 minutes ago</p>
                </div>
            </div>
        </div>
        
        <div class="p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i data-feather="check-circle" class="w-4 h-4 text-blue-600"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-800">AI Analysis Complete</p>
                    <p class="text-xs text-gray-500 mt-1">5 leads have been re-scored based on new data</p>
                    <p class="text-xs text-gray-400 mt-1">1 hour ago</p>
                </div>
            </div>
        </div>
    </div>
</div>`;
    }

    setupEventHandlers() {
        // Notifications toggle
        window.toggleNotifications = () => {
            const dropdown = document.getElementById('notificationsDropdown');
            if (dropdown) {
                dropdown.classList.toggle('hidden');
            }
        };

        // Close notifications when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notificationsDropdown');
            const button = e.target.closest('.notification-badge');
            
            if (!button && dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardHeader;
} else {
    window.DashboardHeader = DashboardHeader;
}
