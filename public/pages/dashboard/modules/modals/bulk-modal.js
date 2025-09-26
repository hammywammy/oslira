//public/pages/dashboard/modules/modals/bulk-modal.js

class BulkModal {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.stateManager = container.get('stateManager');
        this.uploadedFile = null;
        this.parsedData = [];
        this.currentCredits = 2000; // This should come from user state
        this.analysisType = 'light';
    }

renderBulkModal() {
    return `
<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 hidden">
    <div class="flex items-center justify-center min-h-screen p-6">
        <div class="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden">
            
            <!-- Header -->
            <div class="p-8 pb-6">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-2xl font-bold text-gray-900">Bulk Analysis</h2>
                    <button onclick="closeBulkModal()" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <p class="text-gray-600">Upload a CSV with Instagram usernames to analyze multiple leads</p>
            </div>

            <!-- Content -->
            <div class="px-8 pb-8 space-y-6">
                
                <!-- CSV Upload Section -->
                <div>
                    <label class="block text-sm font-medium text-gray-900 mb-3">Upload CSV File</label>
                    <div class="flex items-center space-x-4">
                        <!-- Example CSV -->
                        <div class="flex-1">
                            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
<div class="text-xs font-medium text-gray-700 mb-2">Example CSV format:</div>
<div id="csv-example" class="bg-white border border-gray-100 rounded-lg p-3 text-sm font-mono text-gray-600">
    <div>nasa</div>
    <div>instagram</div>
    <div>hormozi</div>
</div>
                                <div class="text-xs text-gray-500 mt-2">Just usernames, no column headers, no @ symbols</div>
                            </div>
                        </div>
                        
                        <!-- Upload Area -->
                        <div class="flex-1">
                            <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer">
                                <input type="file" id="csvFile" accept=".csv" onchange="handleFileUpload(event)" class="hidden">
                                <div onclick="document.getElementById('csvFile').click()">
                                    <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                    </svg>
                                    <div class="text-sm font-medium text-gray-700">Drop CSV here</div>
                                    <div class="text-xs text-gray-500 mt-1">or click to browse</div>
                                </div>
                            </div>
                            
                            <!-- File Preview -->
                            <div id="file-preview" class="hidden mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <div class="flex items-center space-x-2">
                                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span id="file-name" class="text-sm font-medium text-green-800"></span>
                                </div>
                                <div id="leads-count" class="text-xs text-green-600 mt-1"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Analysis Type -->
                <div>
                    <label class="block text-sm font-medium text-gray-900 mb-3">Analysis Type</label>
                    <div class="grid grid-cols-3 gap-3">
                        <label class="relative cursor-pointer">
                            <input type="radio" name="bulkAnalysisType" value="light" checked onchange="updateBulkCostCalculation()" class="sr-only">
                            <div class="analysis-option border-2 border-orange-200 bg-orange-50 rounded-xl p-4 text-center hover:border-orange-300 transition-all">
                                <div class="text-2xl mb-2">⚡</div>
                                <div class="font-semibold text-sm text-gray-900">Light</div>
                                <div class="text-xs text-gray-600">1 credit</div>
                            </div>
                        </label>
                        <label class="relative cursor-pointer">
                            <input type="radio" name="bulkAnalysisType" value="deep" onchange="updateBulkCostCalculation()" class="sr-only">
                            <div class="analysis-option border-2 border-gray-200 rounded-xl p-4 text-center hover:border-purple-300 hover:bg-purple-50 transition-all">
                                <div class="text-2xl mb-2">🔍</div>
                                <div class="font-semibold text-sm text-gray-900">Deep</div>
                                <div class="text-xs text-gray-600">2 credits</div>
                            </div>
                        </label>
                        <label class="relative cursor-pointer">
                            <input type="radio" name="bulkAnalysisType" value="xray" onchange="updateBulkCostCalculation()" class="sr-only">
                            <div class="analysis-option border-2 border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:bg-blue-50 transition-all">
                                <div class="text-2xl mb-2">🎯</div>
                                <div class="font-semibold text-sm text-gray-900">X-Ray</div>
                                <div class="text-xs text-gray-600">3 credits</div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Platform (Instagram only) -->
                <div>
                    <label class="block text-sm font-medium text-gray-900 mb-3">Platform</label>
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center space-x-3">
                        <div class="w-8 h-8 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                                <path d="M12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                        </div>
                        <div>
                            <div class="font-medium text-gray-900">Instagram</div>
                            <div class="text-xs text-gray-600">Analyzing Instagram profiles</div>
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="pt-4">
                    <button id="bulk-submit-btn" onclick="submitBulkAnalysis(event)" disabled
                            class="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        Upload File First
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>`;
    }

    setupEventHandlers() {
        // File upload handler
        window.handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (file && file.type === 'text/csv') {
                this.uploadedFile = file;
                this.parseCSVFile(file);
            } else {
                alert('Please select a valid CSV file');
            }
        };

        // Analysis type change
        window.updateBulkCostCalculation = () => {
            this.analysisType = document.querySelector('input[name="bulkAnalysisType"]:checked').value;
            this.updateCostDisplay();
        };

        // Modal controls
        window.openBulkModal = () => {
            const modal = document.getElementById('bulkModal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        };

        window.closeBulkModal = () => {
            const modal = document.getElementById('bulkModal');
            if (modal) {
                modal.classList.add('hidden');
                this.resetModal();
            }
        };

        window.submitBulkAnalysis = (event) => {
            event.preventDefault();
            this.processBulkAnalysis();
        };
    }

parseCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^@/, '')); // Remove @ if present
        
        this.parsedData = lines;
        this.displayFilePreview(file.name, lines.length);
        this.updateCostDisplay();
        
        const submitBtn = document.getElementById('bulk-submit-btn');
        if (lines.length > 0) {
            submitBtn.disabled = false;
            submitBtn.textContent = `Analyze ${lines.length} Profiles`;
        }
    };
    reader.readAsText(file);
}

displayFilePreview(fileName, count) {
    const fileNameEl = document.getElementById('file-name');
    const leadsCountEl = document.getElementById('leads-count');
    const filePreviewEl = document.getElementById('file-preview');
    
    if (fileNameEl) fileNameEl.textContent = fileName;
    if (leadsCountEl) leadsCountEl.textContent = `${count} usernames found`;
    if (filePreviewEl) filePreviewEl.classList.remove('hidden');
    
    // Switch example to show actual uploaded usernames
    const csvExample = document.getElementById('csv-example');
    if (csvExample && this.parsedData.length > 0) {
        const displayUsernames = this.parsedData.slice(0, 3); // Show first 3
        csvExample.innerHTML = displayUsernames.map(username => `<div>${username}</div>`).join('');
        
        // Update label
        const label = csvExample.previousElementSibling;
        if (label) {
            label.textContent = 'Your uploaded usernames:';
        }
    }
}
    displayFilePreview() {
        const placeholder = document.getElementById('upload-placeholder');
        const preview = document.getElementById('file-preview');
        const submitBtn = document.getElementById('bulk-submit-btn');

        placeholder.classList.add('hidden');
        preview.classList.remove('hidden');
        
        preview.innerHTML = `
            <div class="text-center">
                <svg class="w-8 h-8 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="font-semibold text-green-700">File uploaded successfully!</p>
                <p class="text-sm text-gray-600 mt-1">${this.parsedData.length} usernames found</p>
                <p class="text-xs text-gray-500 mt-1">${this.uploadedFile.name}</p>
                <button onclick="this.resetUpload()" class="text-orange-500 text-xs mt-2 hover:underline">Upload different file</button>
            </div>
        `;

        submitBtn.disabled = false;
        submitBtn.textContent = `Analyze ${this.parsedData.length} Leads`;
    }

    updateCostDisplay() {
        if (this.parsedData.length === 0) return;

        const costPerLead = this.analysisType === 'xray' ? 3 : (this.analysisType === 'deep' ? 2 : 1);
        const totalCost = this.parsedData.length * costPerLead;
        const creditsAfter = this.currentCredits - totalCost;

        document.getElementById('leads-count').textContent = `${this.parsedData.length} leads`;
        document.getElementById('current-credits').textContent = this.currentCredits.toLocaleString();
        document.getElementById('total-cost').textContent = `-${totalCost}`;
        document.getElementById('credits-after').textContent = creditsAfter.toLocaleString();
        document.getElementById('credits-after').className = creditsAfter >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600';

        document.getElementById('credit-calculation').classList.remove('hidden');
    }

    processBulkAnalysis() {
        const platform = document.getElementById('bulkPlatform').value;
        const analysisType = document.querySelector('input[name="bulkAnalysisType"]:checked').value;
        
        console.log('Processing bulk analysis:', {
            platform,
            analysisType,
            leads: this.parsedData.length,
            usernames: this.parsedData
        });

        // TODO: Integrate with your existing analysis system
        alert(`Bulk analysis started for ${this.parsedData.length} leads with ${analysisType} analysis`);
        this.closeBulkModal();
    }

    resetModal() {
        this.uploadedFile = null;
        this.parsedData = [];
        document.getElementById('bulkForm').reset();
        document.getElementById('upload-placeholder').classList.remove('hidden');
        document.getElementById('file-preview').classList.add('hidden');
        document.getElementById('credit-calculation').classList.add('hidden');
        document.getElementById('bulk-submit-btn').disabled = true;
        document.getElementById('bulk-submit-btn').textContent = 'Upload File First';
    }

    resetUpload() {
        document.getElementById('csvFile').value = '';
        this.resetModal();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BulkModal;
} else {
    window.BulkModal = BulkModal;
}
