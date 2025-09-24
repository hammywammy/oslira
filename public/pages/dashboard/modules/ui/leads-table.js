//public/pages/dashboard/modules/ui/leads-table.js

class LeadsTable {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.leadRenderer = container.get('leadRenderer');
    }

    renderTableContainer() {
        return `
<!-- Recent Lead Research - Full Width -->
<div class="mb-8">
    <div class="glass-white rounded-2xl overflow-hidden">
        <!-- Table Header -->
        <div class="p-6 border-b border-gray-100">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">Recent Lead Research</h3>
                    <p class="text-sm text-gray-500 mt-1">Individual leads with AI-generated scores and status</p>
                </div>
                <div class="flex items-center space-x-3">
                    <!-- Filter Dropdown -->
                    <select id="platform-filter" class="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option>All Platforms</option>
                        <option>LinkedIn</option>
                        <option>Instagram</option>
                        <option>Twitter</option>
                    </select>
                    <!-- Sort Dropdown -->
                    <select id="sort-filter" class="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option>Sort by: Recent</option>
                        <option>Sort by: Score</option>
                        <option>Sort by: Name</option>
                        <option>Sort by: Followers</option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- Table Content -->
        <div class="leads-table-container overflow-x-auto">
             <!-- Table will be dynamically created by lead-renderer.js -->
        </div>
        
        <!-- Table Footer with Pagination -->
        <div class="p-4 border-t border-gray-100 bg-gray-50/50">
            <div class="flex items-center justify-between">
                <p class="text-sm text-gray-600">
                    Showing <span class="font-medium" id="pagination-start">1-10</span> of <span class="font-medium" id="pagination-total">85</span> leads
                </p>
                <div class="flex items-center space-x-2" id="pagination-controls">
                    <!-- Pagination buttons will be rendered here -->
                </div>
            </div>
        </div>
    </div>
</div>`;
    }

    setupEventHandlers() {
        // Platform filter
        const platformFilter = document.getElementById('platform-filter');
        if (platformFilter) {
            platformFilter.addEventListener('change', (e) => {
                this.eventBus.emit('filter:platform', { platform: e.target.value });
            });
        }

        // Sort filter
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.eventBus.emit('filter:sort', { sort: e.target.value });
            });
        }
    }

    updatePagination(start, end, total) {
        const startEl = document.getElementById('pagination-start');
        const totalEl = document.getElementById('pagination-total');
        
        if (startEl) startEl.textContent = `${start}-${end}`;
        if (totalEl) totalEl.textContent = total;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadsTable;
} else {
    window.LeadsTable = LeadsTable;
}
