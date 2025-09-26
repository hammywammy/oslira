//public/pages/dashboard/modules/ui/dashboard-header.js

class DashboardHeader {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.isDropdownOpen = false;
        this.currentMode = 'single'; // 'single' or 'bulk'
    }

    renderHeader() {
        return `
<div class="pt-6 px-6 pb-6">
    <div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6" style="position: relative; overflow: visible; z-index: 100;">
        <div class="flex items-center justify-between">
            <!-- Dashboard Title -->
            <div>
                <h1 class="text-2xl font-bold text-gray-800 mb-1">AI-Powered Lead Research Dashboard</h1>
                <p class="text-gray-600">Comprehensive view of all lead management activities with AI-driven insights</p>
            </div>
            
            <!-- Right Actions -->
            <div class="flex items-center space-x-4">
                <!-- Dynamic Research Button with Dropdown -->
                <div class="relative" style="z-index: 100; isolation: isolate;">
                    <!-- Unified Button Container -->
                    <div id="main-button-container" class="bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
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
                </div>
            </div>
        </div>
    </div>
</div>`;
    }

    setupEventHandlers() {
        // Main button click handler
        window.handleMainButtonClick = () => {
            if (this.currentMode === 'single') {
                window.openResearchModal && window.openResearchModal();
            } else if (this.currentMode === 'bulk') {
                window.openBulkAnalysisModal && window.openBulkAnalysisModal();
            }
        };

        // Dropdown toggle with proper positioning
        window.toggleResearchDropdown = () => {
            const existingDropdown = document.getElementById('researchDropdown');
            
            if (existingDropdown) {
                existingDropdown.remove();
                this.isDropdownOpen = false;
                return;
            }

            this.createAndShowDropdown();
            this.isDropdownOpen = true;
        };

// Placeholder functions for modals
window.openBulkAnalysisModal = () => {
    window.openBulkModal && window.openBulkModal();
};

// Close dropdown when clicking outside or when modals open
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('researchDropdown');
    const isDropdownButton = e.target.closest('[onclick*="toggleResearchDropdown"]');
    const isDropdownContent = e.target.closest('#researchDropdown');
    
    if (dropdown && !isDropdownButton && !isDropdownContent) {
        dropdown.remove();
        this.isDropdownOpen = false;
    }
});

// Hide dropdown when any modal opens
const observer = new MutationObserver(() => {
    const modals = document.querySelectorAll('#leadAnalysisModal, #researchModal, #bulkModal');
    const hasVisibleModal = Array.from(modals).some(modal => 
        modal && !modal.classList.contains('hidden') && modal.offsetParent !== null
    );
    
    if (hasVisibleModal) {
        const dropdown = document.getElementById('researchDropdown');
        if (dropdown) {
            dropdown.remove();
            this.isDropdownOpen = false;
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
});
    }

 createAndShowDropdown() {
    // Get button container for proper centering
    const buttonContainer = document.getElementById('main-button-container');
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'researchDropdown';
    dropdown.innerHTML = `
        <div style="padding: 8px 0;">
            <div data-type="single" style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; transition: background 0.2s;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
                <div>
                    <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Research Single</div>
                    <div style="color: #6b7280; font-size: 12px;">One profile analysis</div>
                </div>
            </div>
            <div data-type="bulk" style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; transition: background 0.2s;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                </div>
                <div>
                    <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Bulk Analyze</div>
                    <div style="color: #6b7280; font-size: 12px;">Multiple leads at once</div>
                </div>
            </div>
        </div>
    `;
    
    // Position dropdown properly centered and attached
    dropdown.style.cssText = `
        position: absolute !important;
        top: calc(100% + 8px) !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 220px !important;
        background: white !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
        border: 1px solid rgba(0,0,0,0.1) !important;
        z-index: 999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    `;
    
    // Add hover effects and click handlers
    dropdown.querySelectorAll('[data-type]').forEach(item => {
        item.addEventListener('mouseenter', () => item.style.backgroundColor = '#f9fafb');
        item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
        
        item.addEventListener('click', () => {
            this.selectResearchType(item.dataset.type);
            dropdown.remove();
            this.isDropdownOpen = false;
        });
    });
    
    // Append to the button's relative container instead of body
    buttonContainer.parentElement.appendChild(dropdown);
}

    selectResearchType(type) {
        this.currentMode = type;
        this.updateButtonState();
    }

    updateButtonState() {
        const buttonContainer = document.getElementById('main-button-container');
        const mainText = document.getElementById('main-research-text');
        const icon = document.querySelector('#main-research-btn i');
        
        if (this.currentMode === 'bulk') {
            // Switch to bulk mode
            buttonContainer.className = 'bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300';
            mainText.textContent = 'Bulk Analyze Leads';
            
            if (icon) {
                icon.setAttribute('data-feather', 'layers');
                if (window.feather) window.feather.replace();
            }
        } else {
            // Switch to single mode
            buttonContainer.className = 'bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300';
            mainText.textContent = 'Research New Lead';
            
            if (icon) {
                icon.setAttribute('data-feather', 'plus');
                if (window.feather) window.feather.replace();
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardHeader;
} else {
    window.DashboardHeader = DashboardHeader;
}
