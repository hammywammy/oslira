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
<!-- Research New Lead Button -->
                <button onclick="openResearchModal()" class="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all flex items-center space-x-2">
                    <i data-feather="plus" class="w-4 h-4"></i>
                    <span>Research New Lead</span>
                </button>

    setupEventHandlers() {
        // No notification handlers needed
    }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardHeader;
} else {
    window.DashboardHeader = DashboardHeader;
}
