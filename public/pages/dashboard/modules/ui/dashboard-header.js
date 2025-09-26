//public/pages/dashboard/modules/ui/dashboard-header.js

class DashboardHeader {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.isDropdownOpen = false;
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
                <!-- Split Research Button with Dropdown -->
                <div class="relative">
                    <!-- Split Button Container -->
                    <div class="flex rounded-xl overflow-hidden shadow-lg">
                        <!-- Main Research Button -->
                        <button onclick="openResearchModal()" 
                                class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:shadow-lg transition-all flex items-center space-x-2 border-r border-purple-400/30">
                            <i data-feather="plus" class="w-4 h-4"></i>
                            <span>Research New Lead</span>
                        </button>
                        
                        <!-- Dropdown Arrow Button -->
                        <button onclick="toggleResearchDropdown()" 
                                class="px-3 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transition-all">
                            <i data-feather="chevron-down" class="w-4 h-4"></i>
                        </button>
                    </div>
                    
<!-- Dropdown Menu -->
<div id="researchDropdown" class="hidden fixed w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50" style="top: 120px; right: 20px;">
                        <div class="py-2">
                            <button onclick="openResearchModal(); closeResearchDropdown();" 
                                    class="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-purple-50 transition-colors">
                                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <i data-feather="user-plus" class="w-4 h-4 text-purple-600"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-800">📊 Research Single Lead</div>
                                    <div class="text-sm text-gray-500">Analyze one profile in detail</div>
                                </div>
                            </button>
                            
                            <button onclick="openBulkAnalysisModal(); closeResearchDropdown();" 
                                    class="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-orange-50 transition-colors">
                                <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <i data-feather="layers" class="w-4 h-4 text-orange-600"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-800">📦 Bulk Analyze</div>
                                    <div class="text-sm text-gray-500">Process multiple leads at once</div>
                                </div>
                            </button>
                            
                            <button onclick="openCSVImportModal(); closeResearchDropdown();" 
                                    class="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors">
                                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <i data-feather="upload" class="w-4 h-4 text-blue-600"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-800">📥 Import from CSV</div>
                                    <div class="text-sm text-gray-500">Upload lead lists for analysis</div>
                                </div>
                            </button>
                            
                            <button onclick="openURLResearchModal(); closeResearchDropdown();" 
                                    class="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-green-50 transition-colors">
                                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <i data-feather="link" class="w-4 h-4 text-green-600"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-800">🔗 Research from URL</div>
                                    <div class="text-sm text-gray-500">Analyze profile from direct link</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;
    }

    setupEventHandlers() {
        // Register global functions
window.toggleResearchDropdown = () => {
    const dropdown = document.getElementById('researchDropdown');
    if (dropdown) {
        this.isDropdownOpen = !this.isDropdownOpen;
        if (this.isDropdownOpen) {
            // Move to body and position dynamically
            dropdown.style.position = 'fixed';
            dropdown.style.top = '120px';
            dropdown.style.right = '20px';
            dropdown.style.zIndex = '9999';
            document.body.appendChild(dropdown);
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    }
};

        window.closeResearchDropdown = () => {
            const dropdown = document.getElementById('researchDropdown');
            if (dropdown) {
                dropdown.classList.add('hidden');
                this.isDropdownOpen = false;
            }
        };

        // Placeholder functions for new modal types
        window.openBulkAnalysisModal = () => {
            console.log('🔄 Opening bulk analysis modal...');
            // TODO: Implement bulk analysis modal
        };

        window.openCSVImportModal = () => {
            console.log('📥 Opening CSV import modal...');
            // TODO: Implement CSV import modal
        };

        window.openURLResearchModal = () => {
            console.log('🔗 Opening URL research modal...');
            // TODO: Implement URL research modal
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('researchDropdown');
            const button = e.target.closest('[onclick*="toggleResearchDropdown"]');
            
            if (dropdown && !button && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
                this.isDropdownOpen = false;
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardHeader;
} else {
    window.DashboardHeader = DashboardHeader;
}
