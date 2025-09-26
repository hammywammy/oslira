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
<div id="bulkModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden">
    <div class="flex items-center justify-center min-h-screen p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <!-- Header -->
            <div class="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold">Bulk Analysis</h2>
                        <p class="text-orange-100 mt-1">Upload and analyze multiple leads at once</p>
                    </div>
                    <button onclick="closeBulkModal()" class="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="p-6 overflow-y-auto max-h-[70vh]">
                <form id="bulkForm" onsubmit="submitBulkAnalysis(event)">
                    
                    <!-- CSV Upload Section -->
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">Upload CSV File</label>
                        <div id="upload-area" class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-colors hover:border-orange-400 hover:bg-orange-50/30">
                            <input type="file" id="csvFile" accept=".csv" onchange="handleFileUpload(event)" class="hidden">
                            <div id="upload-placeholder" class="text-gray-500">
                                <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                <p class="text-lg font-medium mb-2">Drop your CSV file here or click to browse</p>
                                <p class="text-sm text-gray-400">CSV should have a 'username' column with social media handles</p>
                                <button type="button" onclick="document.getElementById('csvFile').click()" 
                                        class="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                                    Choose File
                                </button>
                            </div>
                            <div id="file-preview" class="hidden">
                                <!-- File preview will be populated here -->
                            </div>
                        </div>
                    </div>

                    <!-- Analysis Type Selection -->
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">Analysis Type</label>
                        <div class="grid grid-cols-3 gap-3">
                            <label class="relative cursor-pointer">
                                <input type="radio" name="bulkAnalysisType" value="light" checked onchange="updateBulkCostCalculation()" class="sr-only">
                                <div class="analysis-option border-2 border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-all">
                                    <div class="text-2xl mb-2">⚡</div>
                                    <div class="font-semibold text-sm">Light</div>
                                    <div class="text-xs text-gray-500">1 credit</div>
                                </div>
                            </label>
                            <label class="relative cursor-pointer">
                                <input type="radio" name="bulkAnalysisType" value="deep" onchange="updateBulkCostCalculation()" class="sr-only">
                                <div class="analysis-option border-2 border-gray-200 rounded-xl p-4 text-center hover:border-purple-300 transition-all">
                                    <div class="text-2xl mb-2">🔍</div>
                                    <div class="font-semibold text-sm">Deep</div>
                                    <div class="text-xs text-gray-500">2 credits</div>
                                </div>
                            </label>
                            <label class="relative cursor-pointer">
                                <input type="radio" name="bulkAnalysisType" value="xray" onchange="updateBulkCostCalculation()" class="sr-only">
                                <div class="analysis-option border-2 border-gray-200 rounded-xl p-4 text-center hover:border-orange-300 transition-all">
                                    <div class="text-2xl mb-2">🎯</div>
                                    <div class="font-semibold text-sm">X-Ray</div>
                                    <div class="text-xs text-gray-500">3 credits</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Credit Calculation -->
                    <div id="credit-calculation" class="mb-6 hidden">
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-semibold text-gray-700">Cost Calculation</span>
                                <div class="flex items-center space-x-2">
                                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold" id="leads-count">0 leads</span>
                                </div>
                            </div>
                            <div class="text-sm text-gray-600 space-y-1">
                                <div class="flex justify-between">
                                    <span>Current Credits:</span>
                                    <span id="current-credits" class="font-semibold">2,000</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Total Cost:</span>
                                    <span id="total-cost" class="font-semibold text-orange-600">-0</span>
                                </div>
                                <div class="border-t border-blue-200 pt-1 mt-2">
                                    <div class="flex justify-between">
                                        <span class="font-semibold">Credits After:</span>
                                        <span id="credits-after" class="font-semibold text-green-600">2,000</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Platform Selection -->
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">Platform</label>
                        <select id="bulkPlatform" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all">
                            <option value="instagram">Instagram</option>
                            <option value="twitter">Twitter/X</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="tiktok">TikTok</option>
                        </select>
                    </div>

                </form>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
                <button onclick="closeBulkModal()" 
                        class="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
                <button id="bulk-submit-btn" onclick="submitBulkAnalysis(event)" disabled
                        class="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    Upload File First
                </button>
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
            const lines = csv.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            const usernameIndex = headers.findIndex(h => h.includes('username') || h.includes('handle') || h.includes('user'));
            
            if (usernameIndex === -1) {
                alert('CSV must contain a username column');
                return;
            }

            this.parsedData = lines.slice(1)
                .map(line => {
                    const values = line.split(',');
                    return values[usernameIndex]?.trim().replace('@', '');
                })
                .filter(username => username && username.length > 0);

            this.displayFilePreview();
            this.updateCostDisplay();
        };
        reader.readAsText(file);
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
