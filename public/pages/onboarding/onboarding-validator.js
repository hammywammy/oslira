// =============================================================================
// ONBOARDING VALIDATION ENGINE
// =============================================================================

import { OnboardingRules } from './onboarding-rules.js';

export class OnboardingValidator {
    constructor() {
        this.rules = new OnboardingRules();
        this.errors = new Map();
        this.characterCounters = new Map();
        this.initialized = false;
    }
    
    // =============================================================================
    // INITIALIZATION & STYLING
    // =============================================================================
    
    initialize() {
        if (this.initialized) return;
        
        this.addCharacterLimitStyles();
        this.setupCharacterLimits();
        this.setupPasteProtection();
        this.setupRealTimeValidation();
        
        this.initialized = true;
        console.log('✅ [OnboardingValidator] Initialized successfully');
    }
    
    addCharacterLimitStyles() {
        const styles = `
            <style>
            /* Character Counter Styles */
            .character-counter {
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
                text-align: right;
                margin-top: 0.25rem;
                font-family: monospace;
            }
            
            .character-counter.warning {
                color: var(--color-orange-600, #ea580c);
                font-weight: 500;
            }
            
            .character-counter.limit-reached {
                color: var(--color-red-600, #dc2626);
                font-weight: 600;
            }
            
            .character-counter .current {
                font-weight: 600;
            }
            
            /* Field Warning States */
            .form-input.warning,
            .form-textarea.warning,
            .form-select.warning {
                border-color: var(--color-orange-500, #f97316);
                box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
            }
            
            /* Enhanced Error States */
            .form-input.error,
            .form-textarea.error,
            .form-select.error {
                border-color: var(--color-red-500, #ef4444);
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
            
            .field-error {
                border-color: var(--color-red-500, #ef4444) !important;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
            
            /* Character Counter Animations */
            .character-counter {
                transition: all 0.2s ease;
            }
            
            .character-counter.warning,
            .character-counter.limit-reached {
                animation: pulse 0.5s ease-in-out;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            /* Validation Error Messages */
            .validation-error {
                color: var(--color-red-600, #dc2626);
                font-size: 0.875rem;
                margin-top: 0.25rem;
                display: block;
            }
            
            .validation-notification {
                background-color: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: var(--color-red-700, #b91c1c);
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .has-error .onboarding-form-label {
                color: var(--color-red-600, #dc2626);
            }
            
            .choice-required-highlight {
                animation: highlightPulse 1s ease-in-out 3;
                border-color: var(--color-red-500, #ef4444) !important;
            }
            
            @keyframes highlightPulse {
                0%, 100% { border-color: var(--color-red-500, #ef4444); }
                50% { border-color: var(--color-red-300, #fca5a5); }
            }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // =============================================================================
    // CHARACTER LIMIT MANAGEMENT
    // =============================================================================
    
    setupCharacterLimits() {
        Object.keys(this.rules.CHARACTER_LIMITS).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const limits = this.rules.CHARACTER_LIMITS[fieldId];
            
            if (!field) return;
            
            // Add maxlength attribute
            field.setAttribute('maxlength', limits.max);
            
            // Add character counter
            this.addCharacterCounter(fieldId, limits.max);
            
            // Initialize counter
            this.updateCharacterCounter(fieldId);
        });
    }
    
    addCharacterCounter(fieldId, maxLength) {
        const field = document.getElementById(fieldId);
        const fieldContainer = field.closest('.form-group') || field.closest('.onboarding-form-group');
        
        if (!fieldContainer) return;
        
        // Create character counter element
        const counter = document.createElement('div');
        counter.id = `${fieldId}-counter`;
        counter.className = 'character-counter';
        counter.innerHTML = `<span class="current">0</span>/<span class="max">${maxLength}</span>`;
        
        // Insert after the field
        field.parentNode.insertBefore(counter, field.nextSibling);
        
        // Store reference
        this.characterCounters.set(fieldId, counter);
    }
    
    updateCharacterCounter(fieldId) {
        const field = document.getElementById(fieldId);
        const counter = this.characterCounters.get(fieldId) || document.getElementById(`${fieldId}-counter`);
        const limits = this.rules.getCharacterLimits(fieldId);
        
        if (!field || !counter || !limits) return;
        
        const currentLength = field.value.length;
        const currentSpan = counter.querySelector('.current');
        
        if (currentSpan) {
            currentSpan.textContent = currentLength;
            
            // Apply status classes
            const status = this.rules.getCharacterUsageStatus(fieldId, field.value);
            counter.classList.remove('warning', 'limit-reached');
            
            if (status === 'warning') {
                counter.classList.add('warning');
            } else if (status === 'limit-reached') {
                counter.classList.add('limit-reached');
            }
        }
    }
    
    // =============================================================================
    // PASTE PROTECTION
    // =============================================================================
    
    setupPasteProtection() {
        Object.keys(this.rules.CHARACTER_LIMITS).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const limits = this.rules.CHARACTER_LIMITS[fieldId];
            
            if (!field) return;
            
            field.addEventListener('paste', (e) => {
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const currentText = field.value;
                const maxAllowed = limits.max - currentText.length;
                
                if (pastedText.length > maxAllowed) {
                    e.preventDefault();
                    
                    // Insert truncated version
                    const truncatedText = pastedText.substring(0, maxAllowed);
                    const cursorPos = field.selectionStart;
                    
                    field.value = currentText.substring(0, cursorPos) + 
                                 truncatedText + 
                                 currentText.substring(field.selectionEnd);
                    
                    // Show warning
                    this.showFieldError(fieldId, `Pasted text was truncated to ${limits.max} characters`);
                    
                    // Clear warning after 3 seconds
                    setTimeout(() => {
                        this.clearFieldError(fieldId);
                    }, 3000);
                    
                    // Update counter
                    setTimeout(() => this.updateCharacterCounter(fieldId), 10);
                }
            });
        });
    }
    
    // =============================================================================
    // REAL-TIME VALIDATION
    // =============================================================================
    
    setupRealTimeValidation() {
        // Setup character counter updates
        Object.keys(this.rules.CHARACTER_LIMITS).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    this.updateCharacterCounter(fieldId);
                    this.validateCharacterLimit(fieldId);
                });
            }
        });
        
        // Setup phone number formatting
        const phoneInput = document.getElementById('phone-number');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                e.target.value = this.rules.formatPhoneNumber(e.target.value);
                this.updatePhoneOptInVisibility();
            });
        }
    }
    
    updatePhoneOptInVisibility() {
        const phoneInput = document.getElementById('phone-number');
        const smsOptInGroup = document.getElementById('sms-opt-in-group');
        
        if (phoneInput && smsOptInGroup) {
            const value = phoneInput.value.trim();
            smsOptInGroup.style.display = value.length > 0 ? 'block' : 'none';
        }
    }
    
    // =============================================================================
    // STEP VALIDATION
    // =============================================================================
    
    validateStep(stepNumber, getFieldValueFn) {
        console.log(`🔍 [OnboardingValidator] Validating step ${stepNumber}`);
        
        const fieldsForStep = this.rules.getFieldsForStep(stepNumber);
        if (!fieldsForStep || fieldsForStep.length === 0) return true;
        
        let isValid = true;
        this.clearAllErrors(); // Clear previous errors
        
        for (const fieldId of fieldsForStep) {
            const rules = this.rules.getValidationRules(fieldId);
            if (!rules) continue;
            
            const value = getFieldValueFn(fieldId);
            
            // Required field validation
            if (rules.required && (!value || value.trim().length === 0)) {
                this.showFieldError(fieldId, 'This field is required');
                isValid = false;
                continue;
            }
            
            // Skip further validation if field is empty and not required
            if (!value || value.trim().length === 0) continue;
            
            // Character limit validation
            const charLimitResult = this.validateCharacterLimit(fieldId, value);
            if (!charLimitResult.valid && !charLimitResult.warning) {
                isValid = false;
                continue;
            }
            
            // Minimum length validation
            if (rules.minLength && value.length < rules.minLength) {
                this.showFieldError(fieldId, `Minimum ${rules.minLength} characters required`);
                isValid = false;
                continue;
            }
            
            // Field-specific business validation
            const businessValidation = this.validateBusinessLogic(fieldId, value);
            if (!businessValidation.valid) {
                this.showFieldError(fieldId, businessValidation.message);
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    validateCharacterLimit(fieldId, value = null) {
        const field = document.getElementById(fieldId);
        const fieldValue = value || (field ? field.value : '');
        
        return this.rules.validateCharacterLimit(fieldId, fieldValue);
    }
    
    validateBusinessLogic(fieldId, value) {
        switch (fieldId) {
            case 'business-name':
                return this.rules.validateBusinessName(value);
                
            case 'success-outcome':
                return this.rules.validateSuccessOutcome(value);
                
            case 'communication-style':
            case 'communication-tone':
                return this.rules.validateCommunicationStyle(value);
                
            case 'phone-number':
                return this.rules.validatePhoneNumber(value);
                
            default:
                return { valid: true, message: '' };
        }
    }
    
    // =============================================================================
    // FORM DATA VALIDATION
    // =============================================================================
    
    validateAllFields(formData) {
        const errors = this.rules.validateRequiredFields(formData);
        
        // Additional business logic validation
        for (const [key, value] of Object.entries(formData)) {
            const fieldId = key.replace('_', '-');
            const businessValidation = this.validateBusinessLogic(fieldId, value);
            
            if (!businessValidation.valid) {
                errors.push(`${key}: ${businessValidation.message}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // =============================================================================
    // ERROR MANAGEMENT
    // =============================================================================
    
    showFieldError(fieldId, message) {
        // Clear existing error first
        this.clearFieldError(fieldId);
        
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Add error styling to field
        field.classList.add('field-error', 'error');
        
        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-error';
        errorElement.id = `${fieldId}-error`;
        errorElement.textContent = message;
        
        // Insert error message after the field or counter
        const counter = document.getElementById(`${fieldId}-counter`);
        const insertAfter = counter || field;
        insertAfter.parentNode.insertBefore(errorElement, insertAfter.nextSibling);
        
        // Add error styling to field container
        const fieldContainer = field.closest('.onboarding-form-group') || field.closest('.form-group');
        if (fieldContainer) {
            fieldContainer.classList.add('has-error');
        }
        
        // Store error reference
        this.errors.set(fieldId, errorElement);
        
        console.log(`❌ [OnboardingValidator] Field error: ${fieldId} - ${message}`);
    }
    
    clearFieldError(fieldId) {
        // Remove error element
        const errorElement = this.errors.get(fieldId) || document.getElementById(`${fieldId}-error`);
        if (errorElement) {
            errorElement.remove();
            this.errors.delete(fieldId);
        }
        
        // Remove error styling from field
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('field-error', 'error', 'warning');
            
            // Remove error styling from container
            const fieldContainer = field.closest('.onboarding-form-group') || field.closest('.form-group');
            if (fieldContainer) {
                fieldContainer.classList.remove('has-error');
            }
        }
    }
    
    clearAllErrors() {
        // Clear all stored errors
        for (const [fieldId] of this.errors) {
            this.clearFieldError(fieldId);
        }
        
        // Clear any submission errors
        const submissionError = document.getElementById('submission-error');
        if (submissionError) {
            submissionError.style.display = 'none';
        }
        
        // Clear any validation notifications
        const notifications = document.querySelectorAll('.validation-notification');
        notifications.forEach(notification => notification.remove());
    }
    
    showSubmissionError(message) {
        let errorElement = document.getElementById('submission-error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'submission-error';
            errorElement.className = 'validation-notification';
            
            const form = document.querySelector('.onboarding-form');
            if (form) {
                form.insertBefore(errorElement, form.firstChild);
            }
        }
        
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        errorElement.style.display = 'flex';
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    showStepValidationFailed() {
        const notification = document.createElement('div');
        notification.className = 'validation-notification';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>Please complete all required fields before continuing</span>
        `;
        
        const currentStepElement = document.querySelector('.onboarding-step.active');
        if (currentStepElement) {
            currentStepElement.insertBefore(notification, currentStepElement.firstChild);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 4000);
        }
    }
    
    highlightCommunicationChoices() {
        const choiceCards = document.querySelectorAll('[data-choice-group="communication_style"]');
        choiceCards.forEach(card => {
            card.classList.add('choice-required-highlight');
            setTimeout(() => {
                card.classList.remove('choice-required-highlight');
            }, 3000);
        });
    }
    
// =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    getFieldUsageStats() {
        const stats = {};
        
        Object.keys(this.rules.CHARACTER_LIMITS).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const limits = this.rules.CHARACTER_LIMITS[fieldId];
            
            if (field && limits) {
                const currentLength = field.value.length;
                const percentage = (currentLength / limits.max * 100).toFixed(1);
                
                stats[fieldId] = {
                    current: currentLength,
                    max: limits.max,
                    percentage: parseFloat(percentage),
                    utilization: percentage >= 80 ? 'high' : percentage >= 50 ? 'medium' : 'low'
                };
            }
        });
        
        return stats;
    }
    
    logFieldUsage() {
        const stats = this.getFieldUsageStats();
        console.log('📊 [OnboardingValidator] Field usage statistics:', stats);
        
        // Track high-utilization fields
        const highUtilizationFields = Object.entries(stats)
            .filter(([_, data]) => data.utilization === 'high')
            .map(([fieldId, _]) => fieldId);
        
        if (highUtilizationFields.length > 0) {
            console.log('⚠️ [OnboardingValidator] High character utilization fields:', highUtilizationFields);
        }
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    reset() {
        this.clearAllErrors();
        this.errors.clear();
        this.characterCounters.clear();
        console.log('🔄 [OnboardingValidator] Reset complete');
    }
}
