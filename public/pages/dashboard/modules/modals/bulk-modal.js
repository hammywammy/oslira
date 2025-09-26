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
                                <div id="csv-label" class="text-xs font-medium text-gray-700 mb-2">Example CSV format:</div>
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

                <!-- Platform -->
                <div>
                    <label class="block text-sm font-medium text-gray-900 mb-3">Platform</label>
                    <select id="bulkPlatform" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white">
                        <option value="instagram">📸 Instagram</option>
                    </select>
                </div>

                <!-- Credit Calculation -->
                <div id="credit-calculation" class="hidden">
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div class="flex items-center justify-between mb-3">
                            <span class="font-semibold text-gray-700">Cost Calculation</span>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                    <span id="leads-display"></span> leads
                                </span>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Current Credits:</span>
                                <span id="current-credits" class="font-semibold text-gray-900"></span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Total Cost:</span>
                                <span id="total-cost" class="font-semibold text-red-600"></span>
                            </div>
                            <div class="border-t border-blue-200 pt-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm font-medium text-gray-700">Credits After:</span>
                                    <span id="credits-after" class="font-semibold"></span>
                                </div>
                            </div>
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

        // Analysis type change with visual feedback
        window.updateBulkCostCalculation = () => {
            const selectedRadio = document.querySelector('input[name="bulkAnalysisType"]:checked');
            if (selectedRadio) {
                this.analysisType = selectedRadio.value;
                
                // Update visual selection
                document.querySelectorAll('.analysis-option').forEach(option => {
                    option.classList.remove('border-orange-200', 'bg-orange-50', 'border-purple-200', 'bg-purple-50', 'border-blue-200', 'bg-blue-50');
                    option.classList.add('border-gray-200');
                });
                
                const selectedOption = selectedRadio.closest('label').querySelector('.analysis-option');
                if (this.analysisType === 'light') {
                    selectedOption.classList.add('border-orange-200', 'bg-orange-50');
                } else if (this.analysisType === 'deep') {
                    selectedOption.classList.add('border-purple-200', 'bg-purple-50');
                } else if (this.analysisType === 'xray') {
                    selectedOption.classList.add('border-blue-200', 'bg-blue-50');
                }
                
                this.updateCostDisplay();
            }
        };

        // Modal controls
        window.openBulkModal = () => {
            const modal = document.querySelector('#bulkModal > div');
            if (modal) {
                modal.classList.remove('hidden');
            }
        };

        window.closeBulkModal = () => {
            const modal = document.querySelector('#bulkModal > div');
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
        const csvLabel = document.getElementById('csv-label');
        if (csvExample && this.parsedData.length > 0) {
            const displayUsernames = this.parsedData.slice(0, 3); // Show first 3
            csvExample.innerHTML = displayUsernames.map(username => `<div>${username}</div>`).join('');
            
            // Update label
            if (csvLabel) {
                csvLabel.textContent = 'Your uploaded usernames:';
            }
        }
    }

    updateCostDisplay() {
        if (this.parsedData.length === 0) return;

        const costPerLead = this.analysisType === 'xray' ? 3 : (this.analysisType === 'deep' ? 2 : 1);
        const totalCost = this.parsedData.length * costPerLead;
        const creditsAfter = this.currentCredits - totalCost;

        const leadsDisplayEl = document.getElementById('leads-display');
        const currentCreditsEl = document.getElementById('current-credits');
        const totalCostEl = document.getElementById('total-cost');
        const creditsAfterEl = document.getElementById('credits-after');
        const calculationEl = document.getElementById('credit-calculation');

        if (leadsDisplayEl) leadsDisplayEl.textContent = this.parsedData.length;
        if (currentCreditsEl) currentCreditsEl.textContent = this.currentCredits.toLocaleString();
        if (totalCostEl) totalCostEl.textContent = `-${totalCost}`;
        if (creditsAfterEl) {
            creditsAfterEl.textContent = creditsAfter.toLocaleString();
            creditsAfterEl.className = creditsAfter >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600';
        }
        if (calculationEl) calculationEl.classList.remove('hidden');
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
        
        // Reset file input
        const csvFileEl = document.getElementById('csvFile');
        if (csvFileEl) csvFileEl.value = '';
        
        // Reset UI elements
        const filePreviewEl = document.getElementById('file-preview');
        const calculationEl = document.getElementById('credit-calculation');
        const submitBtnEl = document.getElementById('bulk-submit-btn');
        const csvExampleEl = document.getElementById('csv-example');
        const csvLabelEl = document.getElementById('csv-label');
        
        if (filePreviewEl) filePreviewEl.classList.add('hidden');
        if (calculationEl) calculationEl.classList.add('hidden');
        if (submitBtnEl) {
            submitBtnEl.disabled = true;
            submitBtnEl.textContent = 'Upload File First';
        }
        
        // Reset example CSV
        if (csvExampleEl) {
            csvExampleEl.innerHTML = '<div>nasa</div><div>instagram</div><div>hormozi</div>';
        }
        if (csvLabelEl) {
            csvLabelEl.textContent = 'Example CSV format:';
        }
        
        // Reset analysis type selection
        const lightRadio = document.querySelector('input[name="bulkAnalysisType"][value="light"]');
        if (lightRadio) {
            lightRadio.checked = true;
            this.analysisType = 'light';
        }
        
        // Reset visual selection
        document.querySelectorAll('.analysis-option').forEach(option => {
            option.classList.remove('border-orange-200', 'bg-orange-50', 'border-purple-200', 'bg-purple-50', 'border-blue-200', 'bg-blue-50');
            option.classList.add('border-gray-200');
        });
        
        const lightOption = document.querySelector('input[name="bulkAnalysisType"][value="light"]')?.closest('label').querySelector('.analysis-option');
        if (lightOption) {
            lightOption.classList.add('border-orange-200', 'bg-orange-50');
        }
    }

    resetUpload() {
        const csvFileEl = document.getElementById('csvFile');
        if (csvFileEl) csvFileEl.value = '';
        this.resetModal();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BulkModal;
} else {
    window.BulkModal = BulkModal;
}
