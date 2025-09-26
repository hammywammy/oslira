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
                <!-- Dynamic Research Button with Dropdown -->
                <div class="relative">
                    <!-- Split Button Container -->
                    <div class="flex rounded-xl overflow-hidden shadow-lg">
                        <!-- Main Research Button -->
                        <button id="main-research-btn" onclick="handleMainButtonClick()" 
                                class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:shadow-lg transition-all flex items-center space-x-2 border-r border-purple-400/30">
                            <i data-feather="plus" class="w-4 h-4"></i>
                            <span id="main-research-text">Research New Lead</span>
                        </button>
                        
                        <!-- Dropdown Arrow Button -->
                        <button id="dropdown-arrow-btn" onclick="toggleResearchDropdown()" 
                                class="px-3 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transition-all">
                            <i data-feather="chevron-down" class="w-4 h-4"></i>
                        </button>
                    </div>
                    
                    <!-- Dropdown Menu - Fixed positioned and properly centered -->
                    <div id="researchDropdown" class="hidden fixed w-56 bg-white rounded-xl shadow-2xl border border-gray-200/60 z-[9999]" 
                         style="top: 120px; right: 50%; transform: translateX(50%); backdrop-filter: blur(16px);">
                        <div class="py-3">
                            <button onclick="selectResearchType('single'); closeResearchDropdown();" 
                                    class="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-indigo-50 transition-all duration-200">
                                <div class="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                                    <i data-feather="user-plus" class="w-5 h-5 text-indigo-600"></i>
                                </div>
                                <div>
                                    <div class="font-semibold text-gray-800">Research Single Lead</div>
                                    <div class="text-sm text-gray-500">Analyze one profile in detail</div>
                                </div>
                            </button>
                            
                            <button onclick="selectResearchType('bulk'); closeResearchDropdown();" 
                                    class="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-orange-50 transition-all duration-200">
                                <div class="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center">
                                    <i data-feather="layers" class="w-5 h-5 text-orange-600"></i>
                                </div>
                                <div>
                                    <div class="font-semibold text-gray-800">Bulk Analyze</div>
                                    <div class="text-sm text-gray-500">Process multiple leads at once</div>
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
    // Track current mode
    this.currentMode = 'single'; // 'single' or 'bulk'
    
    // Register global functions
    window.toggleResearchDropdown = () => {
        const dropdown = document.getElementById('researchDropdown');
        const button = document.querySelector('[onclick*="toggleResearchDropdown"]');
        
        if (dropdown) {
            this.isDropdownOpen = !this.isDropdownOpen;
            if (this.isDropdownOpen) {
                // Position dropdown relative to button
                const rect = button.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                dropdown.style.top = (rect.bottom + scrollTop + 8) + 'px';
                dropdown.style.right = (window.innerWidth - rect.right) + 'px';
                dropdown.style.transform = 'none';
                
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

    window.selectResearchType = (type) => {
        this.currentMode = type;
        this.updateButtonState();
    };

    window.handleMainButtonClick = () => {
        if (this.currentMode === 'single') {
            window.openResearchModal && window.openResearchModal();
        } else if (this.currentMode === 'bulk') {
            window.openBulkAnalysisModal && window.openBulkAnalysisModal();
        }
    };

    // Placeholder functions for modals
    window.openBulkAnalysisModal = () => {
        console.log('🔄 Opening bulk analysis modal...');
        // TODO: Implement bulk analysis modal
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

updateButtonState() {
    const mainBtn = document.getElementById('main-research-btn');
    const mainText = document.getElementById('main-research-text');
    const arrowBtn = document.getElementById('dropdown-arrow-btn');
    
    if (this.currentMode === 'bulk') {
        // Switch to bulk mode styling
        mainBtn.className = 'px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium hover:shadow-lg transition-all flex items-center space-x-2 border-r border-red-400/30';
        arrowBtn.className = 'px-3 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg transition-all';
        mainText.textContent = 'Bulk Analyze Leads';
        
        // Update icon
        const icon = mainBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-feather', 'layers');
            if (window.feather) feather.replace();
        }
    } else {
        // Switch to single mode styling
        mainBtn.className = 'px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:shadow-lg transition-all flex items-center space-x-2 border-r border-purple-400/30';
        arrowBtn.className = 'px-3 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transition-all';
        mainText.textContent = 'Research New Lead';
        
        // Update icon
        const icon = mainBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-feather', 'plus');
            if (window.feather) feather.replace();
        }
    }
}
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardHeader;
} else {
    window.DashboardHeader = DashboardHeader;
}
