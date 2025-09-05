//public/pages/dashboard/modules/ui/modal-manager.js

/**
 * OSLIRA MODAL MANAGER MODULE
 * Handles all modal operations, analysis forms, and bulk upload functionality
 * Extracted from dashboard.js - maintains exact functionality
 */
class ModalManager {
    constructor(container) {
        this.container = container;
        this.eventBus = container.get('eventBus');
        this.stateManager = container.get('stateManager');
        this.osliraApp = container.get('osliraApp');
        
        // Modal state
        this.activeModals = new Set();
        this.bulkUsernames = [];
        
        console.log('🚀 [ModalManager] Initialized');
    }
    
    async init() {
        // Setup modal event listeners
        this.setupModalEventListeners();
        
        console.log('✅ [ModalManager] Event listeners initialized');
    }
    
    // ===============================================================================
    // MODAL CONTROL METHODS - EXTRACTED FROM ORIGINAL
    // ===============================================================================
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            this.activeModals.delete(modalId);
            
            // Clear any form data
            this.clearModalForm(modalId);
            
            // Update state
            this.stateManager.setState('activeModal', null);
            
            this.eventBus.emit(DASHBOARD_EVENTS.MODAL_CLOSED, { modalId });
            console.log(`❌ [ModalManager] Modal closed: ${modalId}`);
        }
    }
    
    openModal(modalId, data = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`❌ [ModalManager] Modal not found: ${modalId}`);
            return;
        }
        
        // Close other modals first
        this.closeAllModals();
        
        modal.style.display = 'flex';
        this.activeModals.add(modalId);
        
        // Update state
        this.stateManager.setState('activeModal', modalId);
        
        this.eventBus.emit(DASHBOARD_EVENTS.MODAL_OPENED, { modalId, data });
        console.log(`✅ [ModalManager] Modal opened: ${modalId}`);
        
        return modal;
    }
    
    closeAllModals() {
        this.activeModals.forEach(modalId => {
            this.closeModal(modalId);
        });
    }
    
    // ===============================================================================
    // ANALYSIS MODAL - EXTRACTED FROM dashboard.js
    // ===============================================================================
    
    showAnalysisModal(prefillUsername = '') {
        console.log('🔍 [ModalManager] Opening analysis modal...');
        
        const modal = this.openModal('analysisModal');
        if (!modal) return;
        
        // Reset form
        const form = document.getElementById('analysisForm');
        if (form) {
            form.reset();
        }
        
        // Reset form fields
        const analysisType = document.getElementById('analysis-type');
        const profileInput = document.getElementById('profile-input');
        const inputContainer = document.getElementById('input-field-container');
        
        if (analysisType) {
            analysisType.value = '';
        }
        if (profileInput) {
            profileInput.value = prefillUsername; // Allow prefilling username
        }
        if (inputContainer) {
            inputContainer.style.display = 'none';
        }
        
// Load business profiles (async)
setTimeout(async () => {
    try {
        await this.container.get('businessManager')?.loadBusinessProfilesForModal();
    } catch (error) {
        console.error('❌ [ModalManager] Failed to load business profiles:', error);
    }
}, 100);
        
        // Focus on analysis type dropdown
        setTimeout(() => {
            if (analysisType) {
                analysisType.focus();
            }
        }, 100);
        
        console.log('✅ [ModalManager] Analysis modal opened');
    }
    
    // Handle analysis type selection - EXACT FROM ORIGINAL
    handleAnalysisTypeChange() {
        const analysisType = document.getElementById('analysis-type')?.value;
        const inputContainer = document.getElementById('input-field-container');
        const profileInput = document.getElementById('profile-input');
        
        if (analysisType && inputContainer) {
            inputContainer.style.display = 'block';
            
            // Focus on input field
            setTimeout(() => {
                if (profileInput) {
                    profileInput.focus();
                }
            }, 100);
        }
        
        // Update credit cost display
        this.updateCreditCostDisplay(analysisType);
    }
    
    updateCreditCostDisplay(analysisType) {
        const costDisplay = document.getElementById('analysis-cost');
        if (costDisplay) {
            const cost = analysisType === 'deep' ? 2 : 1;
            costDisplay.textContent = `${cost} credit${cost > 1 ? 's' : ''}`;
        }
        
        // Update submit button text
        const submitBtn = document.getElementById('analysis-submit-btn');
        if (submitBtn) {
            const cost = analysisType === 'deep' ? 2 : 1;
            submitBtn.textContent = `Start Analysis (${cost} credit${cost > 1 ? 's' : ''})`;
        }
    }
    
    // ===============================================================================
    // BULK MODAL - EXTRACTED FROM dashboard.js
    // ===============================================================================
    
    showBulkModal() {
        console.log('📁 [ModalManager] Opening bulk analysis modal...');
        
        const modal = this.openModal('bulkModal');
        if (!modal) return;
        
        // Reset form and state
        this.resetBulkModal();
        
// Load business profiles for bulk modal
setTimeout(async () => {
    try {
        await this.container.get('businessManager')?.loadBusinessProfilesForBulkModal();
    } catch (error) {
        console.error('❌ [ModalManager] Failed to load bulk business profiles:', error);
    }
}, 100);
        
        console.log('✅ [ModalManager] Bulk modal opened');
    }
    
    resetBulkModal() {
        // Reset form
        const form = document.getElementById('bulkForm');
        if (form) {
            form.reset();
        }
        
        // Clear file input display
        const fileDisplay = document.getElementById('file-display');
        if (fileDisplay) {
            fileDisplay.innerHTML = '';
        }
        
        // Reset validation state
        const submitBtn = document.getElementById('bulk-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Select Analysis Type';
        }
        
        // Clear usernames
        this.bulkUsernames = [];
    }
    
    // Handle file upload - EXTRACTED FROM ORIGINAL
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📄 [ModalManager] Processing file upload:', file.name);
        
        try {
            // Validate file
            if (!this.validateFile(file)) {
                return;
            }
            
            // Read file content
            const content = await this.readFileAsText(file);
            
            // Parse usernames
            const usernames = this.parseUsernamesFromContent(content, file.type);
            
            if (usernames.length === 0) {
                throw new Error('No valid usernames found in file');
            }
            
            // Store usernames
            this.bulkUsernames = usernames;
            
            // Update UI
            this.displayParsedUsernames(usernames, file.name);
            this.validateBulkForm();
            
            console.log(`✅ [ModalManager] File processed: ${usernames.length} usernames found`);
            
        } catch (error) {
            console.error('❌ [ModalManager] File processing failed:', error);
            this.osliraApp?.showMessage(`File processing failed: ${error.message}`, 'error');
            
            // Reset file input
            event.target.value = '';
            this.bulkUsernames = [];
        }
    }
    
    validateFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
        
        if (file.size > maxSize) {
            this.osliraApp?.showMessage('File too large. Maximum size is 5MB.', 'error');
            return false;
        }
        
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            this.osliraApp?.showMessage('Please upload a CSV or TXT file.', 'error');
            return false;
        }
        
        return true;
    }
    
    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => {
                this.osliraApp?.showMessage('Failed to read file', 'error');
                reject(new Error('Failed to read file'));
            };
            reader.readAsText(file);
        });
    }
    
    parseUsernamesFromContent(content, fileType) {
        let usernames = [];
        
        if (fileType === 'text/csv' || content.includes(',')) {
            // Parse CSV
            const lines = content.split('\n');
            lines.forEach(line => {
                const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
                columns.forEach(col => {
                    const username = this.extractUsername(col);
                    if (username) {
                        usernames.push(username);
                    }
                });
            });
        } else {
            // Parse plain text (line by line)
            const lines = content.split('\n');
            lines.forEach(line => {
                const username = this.extractUsername(line.trim());
                if (username) {
                    usernames.push(username);
                }
            });
        }
        
        // Remove duplicates and filter valid usernames
        return [...new Set(usernames)].filter(username => this.isValidUsername(username));
    }
    
    extractUsername(text) {
        if (!text) return null;
        
        // Remove @ symbol and clean
        let username = text.replace(/^@/, '').trim();
        
        // Extract from Instagram URLs
        const instagramMatch = username.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
        if (instagramMatch) {
            username = instagramMatch[1];
        }
        
        // Clean up any remaining URL parts
        username = username.split('/')[0].split('?')[0];
        
        return username;
    }
    
    isValidUsername(username) {
        // Instagram username validation
        return /^[a-zA-Z0-9._]{1,30}$/.test(username);
    }
    
    displayParsedUsernames(usernames, filename) {
        const fileDisplay = document.getElementById('file-display');
        if (!fileDisplay) return;
        
        const previewCount = Math.min(usernames.length, 5);
        const remainingCount = Math.max(0, usernames.length - previewCount);
        
        fileDisplay.innerHTML = `
            <div class="file-summary">
                <div class="file-info">
                    <span class="filename">📄 ${filename}</span>
                    <span class="username-count">${usernames.length} username${usernames.length !== 1 ? 's' : ''} found</span>
                </div>
                
                <div class="username-preview">
                    <div class="preview-list">
                        ${usernames.slice(0, previewCount).map(username => 
                            `<span class="username-tag">@${username}</span>`
                        ).join('')}
                        ${remainingCount > 0 ? `<span class="more-count">+${remainingCount} more</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Handle bulk form validation - EXTRACTED FROM ORIGINAL
    validateBulkForm() {
        const analysisType = document.getElementById('bulk-analysis-type')?.value;
        const businessId = document.getElementById('bulk-business-id')?.value;
        const usernameCount = this.bulkUsernames?.length || 0;
        const submitBtn = document.getElementById('bulk-submit-btn');
        
        if (!submitBtn) return;
        
        // Check if all fields are filled
        const isFormValid = analysisType && businessId && usernameCount > 0;
        
        // Check credits
        const hasEnoughCredits = this.checkBulkCredits();
        
        // Update button state
        const isValid = isFormValid && hasEnoughCredits;
        
        if (isValid) {
            const creditCost = this.calculateBulkCreditCost();
            submitBtn.textContent = `Start Bulk Analysis (${creditCost} credits)`;
            submitBtn.disabled = false;
        } else if (!isFormValid) {
            submitBtn.textContent = 'Complete all fields';
            submitBtn.disabled = true;
        } else if (!hasEnoughCredits) {
            const creditCost = this.calculateBulkCreditCost();
            submitBtn.textContent = `Insufficient credits (${creditCost} needed)`;
            submitBtn.disabled = true;
        }
        
        // Update submit button styling
        submitBtn.style.opacity = isValid ? '1' : '0.6';
        submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
    
    checkBulkCredits() {
        const analysisType = document.getElementById('bulk-analysis-type')?.value;
        const usernameCount = this.bulkUsernames?.length || 0;
        const currentCredits = this.getCurrentUserCredits();
        
        if (!analysisType || usernameCount === 0) {
            return false;
        }
        
        const creditPerAnalysis = analysisType === 'deep' ? 2 : 1;
        const totalCost = usernameCount * creditPerAnalysis;
        
        return currentCredits >= totalCost;
    }
    
    calculateBulkCreditCost() {
        const analysisType = document.getElementById('bulk-analysis-type')?.value;
        const usernameCount = this.bulkUsernames?.length || 0;
        
        if (!analysisType) return 0;
        
        const creditPerAnalysis = analysisType === 'deep' ? 2 : 1;
        return usernameCount * creditPerAnalysis;
    }
    
    getCurrentUserCredits() {
        // Get current user credits from global state
        const credits = this.osliraApp?.user?.credits;
        
        if (typeof credits === 'number') {
            return credits;
        }
        
        // Fallback: try to get from UI if available
        const currentCreditsEl = document.getElementById('current-credits');
        if (currentCreditsEl && currentCreditsEl.textContent !== 'Loading...') {
            const uiCredits = parseInt(currentCreditsEl.textContent.replace(/,/g, ''));
            return isNaN(uiCredits) ? 0 : uiCredits;
        }
        
        return 0;
    }
    
    // ===============================================================================
    // LEAD DETAILS MODAL
    // ===============================================================================
    
    showLeadDetailsModal(leadId) {
        console.log('👁️ [ModalManager] Opening lead details modal for:', leadId);
        
        const modal = this.openModal('leadDetailsModal');
        if (!modal) return;
        
        // Show loading state
        const detailsContainer = document.getElementById('lead-details-content');
        if (detailsContainer) {
            detailsContainer.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <div style="font-size: 32px; margin-bottom: 16px;">⏳</div>
                    <h3 style="margin: 0; color: var(--text-primary);">Loading lead details...</h3>
                </div>
            `;
        }
        
        // Load lead details
        this.container.get('leadManager')?.viewLead(leadId)
            .then(({ lead, analysisData }) => {
                if (detailsContainer) {
                    const detailsHtml = this.container.get('leadRenderer')?.buildLeadDetailsHTML(lead, analysisData);
                    detailsContainer.innerHTML = detailsHtml;
                }
            })
            .catch(error => {
                if (detailsContainer) {
                    detailsContainer.innerHTML = `
                        <div style="text-align: center; padding: 60px;">
                            <div style="font-size: 32px; margin-bottom: 16px;">❌</div>
                            <h3 style="margin: 0; color: var(--error);">Error Loading Lead</h3>
                            <p style="color: var(--text-secondary);">${error.message}</p>
                            <button onclick="modalManager.showLeadDetailsModal('${leadId}')" 
                                    class="btn btn-primary" style="margin-top: 16px;">
                                Try Again
                            </button>
                        </div>
                    `;
                }
            });
    }
    
    // ===============================================================================
    // MODAL UTILITIES
    // ===============================================================================
    
    clearModalForm(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Clear forms
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
        });
        
        // Clear specific fields based on modal
        switch (modalId) {
            case 'analysisModal':
                const inputContainer = document.getElementById('input-field-container');
                if (inputContainer) {
                    inputContainer.style.display = 'none';
                }
                break;
                
            case 'bulkModal':
                this.bulkUsernames = [];
                const fileDisplay = document.getElementById('file-display');
                if (fileDisplay) {
                    fileDisplay.innerHTML = '';
                }
                break;
        }
    }
    
    setupModalEventListeners() {
        // Close modals when clicking outside
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal') && 
                event.target === event.currentTarget) {
                const modalId = event.target.id;
                this.closeModal(modalId);
            }
        });
        
        // Close modals on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.activeModals.size > 0) {
                this.closeAllModals();
            }
        });
        
        console.log('✅ [ModalManager] Global modal event listeners setup');
    }
    
    isModalOpen(modalId = null) {
        if (modalId) {
            return this.activeModals.has(modalId);
        }
        return this.activeModals.size > 0;
    }
    
    getActiveModal() {
        return this.stateManager.getState('activeModal');
    }
    
    // ===============================================================================
    // CLEANUP
    // ===============================================================================
    
    async cleanup() {
        console.log('🧹 [ModalManager] Cleaning up...');
        
        // Close all open modals
        this.closeAllModals();
        
        // Clear bulk usernames
        this.bulkUsernames = [];
        
        // Clear active modals set
        this.activeModals.clear();
        
        console.log('✅ [ModalManager] Cleanup completed');
    }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModalManager };
} else {
    window.ModalManager = ModalManager;
}
