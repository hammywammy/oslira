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
<!-- Unified Button Container -->
<div class="bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
    <div class="flex">
        <!-- Main Research Button -->
        <button id="main-research-btn" onclick="handleMainButtonClick()" 
                class="px-6 py-3 text-white font-medium hover:bg-white/10 transition-all duration-200 flex items-center space-x-2 flex-1 rounded-l-xl">
            <i data-feather="plus" class="w-4 h-4"></i>
            <span id="main-research-text">Research New Lead</span>
        </button>
        
        <!-- Dropdown Divider -->
        <div class="w-px bg-white/20 my-2"></div>
        
        <!-- Dropdown Arrow Button -->
        <button id="dropdown-arrow-btn" onclick="toggleResearchDropdown()" 
                class="px-3 py-3 text-white hover:bg-white/10 transition-all duration-200 rounded-r-xl">
            <i data-feather="chevron-down" class="w-4 h-4"></i>
        </button>
    </div>
</div>
                    
<!-- Dropdown Menu - Compact and clean -->
<div id="researchDropdown" class="hidden absolute top-full right-0 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/50 z-[9999] mt-2 overflow-hidden">
    <div class="py-1">
        <button onclick="selectResearchType('single'); closeResearchDropdown();" 
                class="w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors duration-150">
            <div class="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i data-feather="user-plus" class="w-4 h-4 text-indigo-600"></i>
            </div>
            <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-800 text-sm">Research Single</div>
                <div class="text-xs text-gray-500 truncate">One profile analysis</div>
            </div>
        </button>
        
        <div class="mx-3 border-t border-gray-100"></div>
        
        <button onclick="selectResearchType('bulk'); closeResearchDropdown();" 
                class="w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-orange-50 transition-colors duration-150">
            <div class="w-8 h-8 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i data-feather="layers" class="w-4 h-4 text-orange-600"></i>
            </div>
            <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-800 text-sm">Bulk Analyze</div>
                <div class="text-xs text-gray-500 truncate">Multiple leads at once</div>
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
        if (dropdown) {
            this.isDropdownOpen = !this.isDropdownOpen;
            if (this.isDropdownOpen) {
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
    const buttonContainer = document.querySelector('.bg-gradient-to-r');
    const mainText = document.getElementById('main-research-text');
    const icon = document.querySelector('#main-research-btn i');
    
    if (this.currentMode === 'bulk') {
        // Switch to bulk mode
        buttonContainer.className = 'bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300';
        mainText.textContent = 'Bulk Analyze Leads';
        
        if (icon) {
            icon.setAttribute('data-feather', 'layers');
            if (window.feather) feather.replace();
        }
    } else {
        // Switch to single mode
        buttonContainer.className = 'bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300';
        mainText.textContent = 'Research New Lead';
        
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
