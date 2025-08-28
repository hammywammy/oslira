// =============================================================================
// FORM-MANAGER.JS - Centralized Form Handling System
// Handles validation, submission, and form state management
// =============================================================================

class OsliraFormManager {
    constructor(formElement, options = {}) {
        if (typeof formElement === 'string') {
            this.form = document.getElementById(formElement);
        } else {
            this.form = formElement;
        }
        
        if (!this.form) {
            throw new Error('Form element not found');
        }
        
        this.options = {
            validateOnInput: true,
            validateOnBlur: true,
            showSuccessMessages: true,
            clearOnSuccess: false,
            disableOnSubmit: true,
            scrollToErrors: true,
            ...options
        };
        
        this.validators = new Map();
        this.submitHandler = null;
        this.errorHandler = null;
        this.state = {
            isValid: false,
            isSubmitting: false,
            hasErrors: false,
            touchedFields: new Set(),
            errors: new Map()
        };
        
        this.init();
    }
    
    init() {
        // Add form class for styling
        this.form.classList.add('oslira-form');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial validation
        this.validateForm();
        
        console.log('✅ [Form] Form manager initialized for:', this.form.id || 'unnamed form');
    }
    
    setupEventListeners() {
        // Prevent default form submission
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Field-level validation
        if (this.options.validateOnInput) {
            this.form.addEventListener('input', this.handleInput.bind(this));
        }
        
        if (this.options.validateOnBlur) {
            this.form.addEventListener('blur', this.handleBlur.bind(this), true);
        }
        
        // Form reset
        this.form.addEventListener('reset', this.handleReset.bind(this));
        
        // Dynamic field detection
        this.observeFormChanges();
    }
    
    observeFormChanges() {
        // Watch for dynamically added fields
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        (node.matches('input, select, textarea') || 
                         node.querySelector('input, select, textarea'))) {
                        this.validateForm();
                    }
                });
            });
        });
        
        observer.observe(this.form, {
            childList: true,
            subtree: true
        });
    }
    
    // =============================================================================
    // VALIDATION SYSTEM
    // =============================================================================
    
    /**
     * Add validator for a field
     * @param {string} fieldName - Name attribute of the field
     * @param {function|object} validator - Validation function or config
     * @returns {OsliraFormManager} For method chaining
     */
    addValidator(fieldName, validator) {
        if (typeof validator === 'function') {
            this.validators.set(fieldName, { validate: validator });
        } else {
            this.validators.set(fieldName, validator);
        }
        
        return this;
    }
    
    /**
     * Add multiple validators at once
     * @param {object} validators - Object with fieldName: validator pairs
     * @returns {OsliraFormManager} For method chaining
     */
    addValidators(validators) {
        Object.entries(validators).forEach(([fieldName, validator]) => {
            this.addValidator(fieldName, validator);
        });
        
        return this;
    }
    
    /**
     * Built-in validators
     */
    static validators = {
        required: (message = 'This field is required') => ({
            validate: (value) => value && value.toString().trim() ? null : message
        }),
        
        email: (message = 'Please enter a valid email address') => ({
            validate: (value) => {
                if (!value) return null; // Only validate if value exists
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value) ? null : message;
            }
        }),
        
        minLength: (min, message) => ({
            validate: (value) => {
                if (!value) return null;
                const msg = message || `Must be at least ${min} characters`;
                return value.toString().length >= min ? null : msg;
            }
        }),
        
        maxLength: (max, message) => ({
            validate: (value) => {
                if (!value) return null;
                const msg = message || `Must be no more than ${max} characters`;
                return value.toString().length <= max ? null : msg;
            }
        }),
        
        pattern: (regex, message = 'Invalid format') => ({
            validate: (value) => {
                if (!value) return null;
                return regex.test(value) ? null : message;
            }
        }),
        
        url: (message = 'Please enter a valid URL') => ({
            validate: (value) => {
                if (!value) return null;
                try {
                    new URL(value);
                    return null;
                } catch {
                    return message;
                }
            }
        }),
        
        number: (message = 'Please enter a valid number') => ({
            validate: (value) => {
                if (!value) return null;
                return !isNaN(value) && isFinite(value) ? null : message;
            }
        }),
        
        range: (min, max, message) => ({
            validate: (value) => {
                if (!value) return null;
                const num = parseFloat(value);
                const msg = message || `Must be between ${min} and ${max}`;
                return (num >= min && num <= max) ? null : msg;
            }
        }),
        
        match: (otherFieldName, message = 'Fields do not match') => ({
            validate: (value, formData) => {
                if (!value) return null;
                const otherValue = formData.get(otherFieldName);
                return value === otherValue ? null : message;
            }
        }),
        
        custom: (validatorFn, message = 'Validation failed') => ({
            validate: (value, formData) => {
                if (!value) return null;
                try {
                    const isValid = validatorFn(value, formData);
                    return isValid ? null : message;
                } catch (error) {
                    return message;
                }
            }
        })
    };
    
    /**
     * Validate a single field
     * @param {string} fieldName - Field name to validate
     * @returns {string|null} Error message or null if valid
     */
    validateField(fieldName) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (!field) return null;
        
        const validator = this.validators.get(fieldName);
        if (!validator) return null;
        
        const value = this.getFieldValue(field);
        const formData = this.getData();
        
        let error = null;
        
        // Handle different validator formats
        if (typeof validator.validate === 'function') {
            error = validator.validate(value, formData);
        } else if (Array.isArray(validator)) {
            // Multiple validators for one field
            for (const v of validator) {
                error = v.validate(value, formData);
                if (error) break;
            }
        }
        
        // Update field state
        if (error) {
            this.state.errors.set(fieldName, error);
            this.showFieldError(field, error);
        } else {
            this.state.errors.delete(fieldName);
            this.clearFieldError(field);
        }
        
        return error;
    }
    
    /**
     * Validate entire form
     * @returns {boolean} True if form is valid
     */
    validateForm() {
        let isValid = true;
        
        // Clear previous errors
        this.state.errors.clear();
        
        // Validate each field with a validator
        this.validators.forEach((validator, fieldName) => {
            const error = this.validateField(fieldName);
            if (error) {
                isValid = false;
            }
        });
        
        // Update form state
        this.state.isValid = isValid;
        this.state.hasErrors = !isValid;
        
        // Update form classes
        this.form.classList.toggle('form-valid', isValid);
        this.form.classList.toggle('form-invalid', !isValid);
        
        return isValid;
    }
    
    // =============================================================================
    // FIELD VALUE HANDLING
    // =============================================================================
    
    getFieldValue(field) {
        switch (field.type) {
            case 'checkbox':
                return field.checked;
            case 'radio':
                const radioGroup = this.form.querySelectorAll(`[name="${field.name}"]`);
                for (const radio of radioGroup) {
                    if (radio.checked) return radio.value;
                }
                return null;
            case 'select-multiple':
                return Array.from(field.selectedOptions).map(option => option.value);
            case 'file':
                return field.files;
            default:
                return field.value;
        }
    }
    
    setFieldValue(fieldName, value) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        switch (field.type) {
            case 'checkbox':
                field.checked = Boolean(value);
                break;
            case 'radio':
                const radioGroup = this.form.querySelectorAll(`[name="${fieldName}"]`);
                radioGroup.forEach(radio => {
                    radio.checked = radio.value === value;
                });
                break;
            case 'select-multiple':
                Array.from(field.options).forEach(option => {
                    option.selected = Array.isArray(value) && value.includes(option.value);
                });
                break;
            case 'file':
                // Cannot programmatically set file input values for security
                console.warn('Cannot programmatically set file input values');
                break;
            default:
                field.value = value || '';
        }
        
        // Trigger validation
        this.validateField(fieldName);
    }
    
    /**
     * Get all form data
     * @returns {FormData} Form data object
     */
    getData() {
        const formData = new FormData(this.form);
        
        // Handle checkboxes that aren't checked (they won't appear in FormData)
        const checkboxes = this.form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked && checkbox.name) {
                formData.set(checkbox.name, false);
            }
        });
        
        return formData;
    }
    
    /**
     * Get form data as a plain object
     * @returns {object} Form data as object
     */
    getDataAsObject() {
        const formData = this.getData();
        const obj = {};
        
        for (const [key, value] of formData.entries()) {
            // Handle multiple values for same key (like checkboxes or multi-select)
            if (obj[key]) {
                if (Array.isArray(obj[key])) {
                    obj[key].push(value);
                } else {
                    obj[key] = [obj[key], value];
                }
            } else {
                obj[key] = value;
            }
        }
        
        return obj;
    }
    
    /**
     * Set form data
     * @param {object} data - Data to populate form with
     */
    setData(data) {
        Object.entries(data).forEach(([fieldName, value]) => {
            this.setFieldValue(fieldName, value);
        });
    }
    
    // =============================================================================
    // ERROR DISPLAY
    // =============================================================================
    
    showFieldError(field, message) {
        // Add error class to field
        field.classList.add('field-error');
        
        // Find or create error element
        let errorElement = field.parentNode.querySelector('.field-error-message');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error-message';
            errorElement.style.cssText = `
                color: #EF4444;
                font-size: 14px;
                margin-top: 4px;
                display: block;
            `;
            
            // Insert after field
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        errorElement.textContent = message;
        
        // Add ARIA attributes for accessibility
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', errorElement.id || `error-${field.name}`);
    }
    
    clearFieldError(field) {
        field.classList.remove('field-error');
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        
        const errorElement = field.parentNode.querySelector('.field-error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    clearAllErrors() {
        this.state.errors.clear();
        
        this.form.querySelectorAll('.field-error').forEach(field => {
            this.clearFieldError(field);
        });
        
        this.form.classList.remove('form-invalid');
    }
    
    scrollToFirstError() {
        if (!this.options.scrollToErrors || this.state.errors.size === 0) return;
        
        const firstErrorField = this.form.querySelector('.field-error');
        if (firstErrorField) {
            firstErrorField.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            firstErrorField.focus();
        }
    }
    
    // =============================================================================
    // SUBMISSION HANDLING
    // =============================================================================
    
    /**
     * Set form submission handler
     * @param {function} handler - Async function to handle form submission
     * @returns {OsliraFormManager} For method chaining
     */
    onSubmit(handler) {
        this.submitHandler = handler;
        return this;
    }
    
    /**
     * Set error handler
     * @param {function} handler - Function to handle submission errors
     * @returns {OsliraFormManager} For method chaining
     */
    onError(handler) {
        this.errorHandler = handler;
        return this;
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.state.isSubmitting) {
            console.warn('[Form] Form is already submitting');
            return;
        }
        
        // Mark all fields as touched
        this.form.querySelectorAll('input, select, textarea').forEach(field => {
            if (field.name) {
                this.state.touchedFields.add(field.name);
            }
        });
        
        // Validate form
        const isValid = this.validateForm();
        
        if (!isValid) {
            console.warn('[Form] Form validation failed');
            this.scrollToFirstError();
            return;
        }
        
        if (!this.submitHandler) {
            console.error('[Form] No submit handler defined');
            return;
        }
        

        try {
    // Get form data BEFORE disabling fields
    const formData = this.getDataAsObject();
    console.log('📤 [Form] Submitting form data:', formData);
    
    // Set submitting state AFTER collecting data
    this.setSubmittingState(true);
    
    await this.submitHandler(formData, this);
            
            if (this.options.showSuccessMessages) {
                this.showSuccess('Form submitted successfully!');
            }
            
            if (this.options.clearOnSuccess) {
                this.reset();
            }
            
        } catch (error) {
            console.error('❌ [Form] Form submission failed:', error);
            
            if (this.errorHandler) {
                this.errorHandler(error, this);
            } else {
                this.showError(`Submission failed: ${error.message}`);
            }
            
        } finally {
            this.setSubmittingState(false);
        }
    }
    
    setSubmittingState(isSubmitting) {
        this.state.isSubmitting = isSubmitting;
        
        // Disable/enable form elements
        if (this.options.disableOnSubmit) {
            const elements = this.form.querySelectorAll('input, select, textarea, button');
            elements.forEach(element => {
                element.disabled = isSubmitting;
            });
        }
        
        // Add/remove loading class
        this.form.classList.toggle('form-submitting', isSubmitting);
        
        // Update submit button text/state
        const submitButton = this.form.querySelector('[type="submit"]');
        if (submitButton) {
            if (isSubmitting) {
                submitButton.dataset.originalText = submitButton.textContent;
                submitButton.textContent = 'Submitting...';
            } else if (submitButton.dataset.originalText) {
                submitButton.textContent = submitButton.dataset.originalText;
                delete submitButton.dataset.originalText;
            }
        }
    }
    
    showSuccess(message) {
        // Use global UI manager if available
        if (window.OsliraApp && window.OsliraApp.ui) {
            window.OsliraApp.ui.toast.success(message);
        } else {
            console.log('✅ [Form] Success:', message);
        }
    }
    
    showError(message) {
        // Use global UI manager if available
        if (window.OsliraApp && window.OsliraApp.ui) {
            window.OsliraApp.ui.toast.error(message);
        } else {
            console.error('❌ [Form] Error:', message);
        }
    }
    
    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================
    
    handleInput(event) {
        const field = event.target;
        if (field.name && this.validators.has(field.name)) {
            // Only validate if field has been touched
            if (this.state.touchedFields.has(field.name)) {
                this.validateField(field.name);
            }
        }
    }
    
    handleBlur(event) {
        const field = event.target;
        if (field.name && this.validators.has(field.name)) {
            this.state.touchedFields.add(field.name);
            this.validateField(field.name);
        }
    }
    
    handleReset(event) {
        // Clear all state
        this.state.touchedFields.clear();
        this.state.errors.clear();
        this.state.isValid = false;
        this.state.hasErrors = false;
        
        // Clear all errors
        this.clearAllErrors();
        
        // Remove form classes
        this.form.classList.remove('form-valid', 'form-invalid', 'form-submitting');
        
        console.log('🔄 [Form] Form reset');
    }
    
    // =============================================================================
    // PUBLIC METHODS
    // =============================================================================
    
    /**
     * Manually trigger form validation
     * @returns {boolean} True if form is valid
     */
    validate() {
        return this.validateForm();
    }
    
    /**
     * Reset form to initial state
     */
    reset() {
        this.form.reset();
        // Reset event will handle the rest
    }
    
    /**
     * Check if form is valid
     * @returns {boolean} True if form is valid
     */
    isValid() {
        return this.state.isValid;
    }
    
    /**
     * Get form state
     * @returns {object} Current form state
     */
    getState() {
        return { ...this.state, errors: Object.fromEntries(this.state.errors) };
    }
    
    /**
     * Get all validation errors
     * @returns {object} Object with field names as keys and error messages as values
     */
    getErrors() {
        return Object.fromEntries(this.state.errors);
    }
    
    /**
     * Check if specific field has error
     * @param {string} fieldName - Field name to check
     * @returns {boolean} True if field has error
     */
    hasError(fieldName) {
        return this.state.errors.has(fieldName);
    }
    
    /**
     * Get error for specific field
     * @param {string} fieldName - Field name
     * @returns {string|null} Error message or null
     */
    getFieldError(fieldName) {
        return this.state.errors.get(fieldName) || null;
    }
    
    /**
     * Manually set field error
     * @param {string} fieldName - Field name
     * @param {string} message - Error message
     */
    setFieldError(fieldName, message) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            this.state.errors.set(fieldName, message);
            this.showFieldError(field, message);
            this.state.hasErrors = true;
            this.state.isValid = false;
        }
    }
    
    /**
     * Clear specific field error
     * @param {string} fieldName - Field name
     */
    clearFieldErrorByName(fieldName) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            this.state.errors.delete(fieldName);
            this.clearFieldError(field);
            this.validateForm(); // Re-validate to update form state
        }
    }
    
    /**
     * Focus on specific field
     * @param {string} fieldName - Field name to focus
     */
    focusField(fieldName) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.focus();
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    /**
     * Enable/disable form
     * @param {boolean} enabled - True to enable, false to disable
     */
    setEnabled(enabled) {
        const elements = this.form.querySelectorAll('input, select, textarea, button');
        elements.forEach(element => {
            element.disabled = !enabled;
        });
        
        this.form.classList.toggle('form-disabled', !enabled);
    }
    
    /**
     * Destroy form manager and cleanup
     */
    destroy() {
        // Remove event listeners
        this.form.removeEventListener('submit', this.handleSubmit);
        this.form.removeEventListener('input', this.handleInput);
        this.form.removeEventListener('blur', this.handleBlur);
        this.form.removeEventListener('reset', this.handleReset);
        
        // Clear all errors
        this.clearAllErrors();
        
        // Clear state
        this.validators.clear();
        this.state.errors.clear();
        this.state.touchedFields.clear();
        
        // Remove classes
        this.form.classList.remove('oslira-form', 'form-valid', 'form-invalid', 'form-submitting');
        
        console.log('🗑️ [Form] Form manager destroyed');
    }
}

// Export for global use
window.OsliraFormManager = OsliraFormManager;

// =============================================================================
// APP.JS - Master Application Initializer
// =============================================================================

class OsliraApp {
    static instance = null;
    
    static async init() {
        if (this.instance) return this.instance;
        
        console.log('🚀 [App] Starting Oslira application initialization...');
        
        try {
            this.instance = new OsliraApp();
            await this.instance.initialize();
            return this.instance;
        } catch (error) {
            console.error('❌ [App] Application initialization failed:', error);
            this.showInitializationError(error);
            throw error;
        }
    }
    
    constructor() {
        this.config = null;
        this.auth = null;
        this.api = null;
        this.ui = null;
        this.store = null;
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return this;
        
        const startTime = performance.now();
        
        try {
            // Step 1: Load configuration (CRITICAL FIRST STEP)
            console.log('🔧 [App] Loading configuration...');
            this.config = await this.loadConfiguration();
            
            // Step 2: Wait for required libraries
            console.log('📚 [App] Waiting for required libraries...');
            await this.waitForLibraries();
            
            // Step 3: Initialize authentication system
            console.log('🔐 [App] Initializing authentication...');
            this.auth = await this.initializeAuth();
            
            // Step 4: Initialize API client
            console.log('🌐 [App] Initializing API client...');
            this.api = new window.OsliraApiClient(this.config, this.auth);
            
            // Step 5: Initialize UI manager
            console.log('🎨 [App] Initializing UI manager...');
            this.ui = new window.OsliraUI();
            
            // Step 6: Initialize data store
            console.log('📊 [App] Initializing data store...');
            this.store = new window.OsliraDataStore();
            
            // Step 7: Setup global error handling
            console.log('🛡️ [App] Setting up error handling...');
            this.setupErrorHandling();
            
            // Step 8: Setup global keyboard shortcuts
            console.log('⌨️ [App] Setting up keyboard shortcuts...');
            this.setupKeyboardShortcuts();
            
            // Step 9: Attach to global window object
            this.attachToWindow();
            
            // Step 10: Emit ready event
            const duration = performance.now() - startTime;
            console.log(`✅ [App] Oslira application initialized successfully in ${duration.toFixed(2)}ms`);
            
            window.dispatchEvent(new CustomEvent('oslira:ready', {
                detail: {
                    app: this,
                    initTime: duration,
                    config: this.config,
                    user: this.auth?.user
                }
            }));
            
            this.initialized = true;
            return this;
            
        } catch (error) {
            console.error('❌ [App] Initialization step failed:', error);
            throw error;
        }
    }
    
    // =============================================================================
    // INITIALIZATION STEPS
    // =============================================================================
    
    async loadConfiguration() {
        // Use the centralized config manager from shared-code.js
        if (typeof loadAppConfig === 'function') {
            return await loadAppConfig();
        } else {
            throw new Error('Configuration system not available');
        }
    }
    
    async waitForLibraries() {
        // Wait for Supabase
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max wait
        
        while (!window.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.supabase) {
            throw new Error('Supabase library failed to load after 10 seconds');
        }
        
        // Wait for other required libraries
        const requiredLibraries = ['OsliraUI', 'OsliraDataStore', 'OsliraApiClient'];
        for (const lib of requiredLibraries) {
            attempts = 0;
            while (!window[lib] && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            if (!window[lib]) {
                throw new Error(`Required library ${lib} not available`);
            }
        }
        
        console.log('✅ [App] All required libraries loaded');
    }
    
    async initializeAuth() {
        // Use shared-code.js auth system for now
        if (typeof initializeSupabase === 'function') {
            await initializeSupabase();
            
            // Return a compatibility object
            return {
                supabase: window.OsliraApp?.supabase,
                user: window.OsliraApp?.user,
                session: window.OsliraApp?.session,
                requireAuth: async (redirectUrl = '/auth.html') => {
                    if (!window.OsliraApp?.session) {
                        window.location.href = redirectUrl;
                        return false;
                    }
                    return true;
                },
                requireBusiness: async (redirectUrl = '/onboarding.html') => {
                    if (!window.OsliraApp?.session) {
                        window.location.href = '/auth.html';
                        return false;
                    }
                    if (!window.OsliraApp?.businesses?.length) {
                        window.location.href = redirectUrl;
                        return false;
                    }
                    return true;
                }
            };
        } else {
            throw new Error('Authentication system not available');
        }
    }
    
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('🚨 [App] Global error:', event.error);
            
            if (this.ui) {
                this.ui.toast.error('An unexpected error occurred');
            }
            
            // Log to external service if available
            this.logError(event.error, { type: 'global_error', filename: event.filename, lineno: event.lineno });
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 [App] Unhandled promise rejection:', event.reason);
            
            if (this.ui) {
                this.ui.toast.error('An unexpected error occurred');
            }
            
            this.logError(new Error(event.reason), { type: 'promise_rejection' });
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Global shortcuts (Cmd/Ctrl + key combinations)
            if (event.metaKey || event.ctrlKey) {
                switch (event.key) {
                    case 'k':
                        // Cmd/Ctrl + K - Global search
                        event.preventDefault();
                        this.openGlobalSearch();
                        break;
                    case '/':
                        // Cmd/Ctrl + / - Show help
                        event.preventDefault();
                        this.showKeyboardShortcuts();
                        break;
                }
            }
            
            // Escape key handling
            if (event.key === 'Escape') {
                // Let UI manager handle modal closing
                // Additional escape key handling can go here
            }
        });
    }
    
    attachToWindow() {
        // Make app accessible globally
        window.Oslira = this;
        
        // Legacy compatibility
        window.OsliraApp = {
            ...window.OsliraApp, // Keep existing data from shared-code.js
            app: this,
            config: this.config,
            auth: this.auth,
            api: this.api,
            ui: this.ui,
            store: this.store
        };
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    openGlobalSearch() {
        // Placeholder for global search functionality
        console.log('🔍 [App] Global search would open here');
        if (this.ui) {
            this.ui.toast.info('Global search coming soon!');
        }
    }
    
    showKeyboardShortcuts() {
        // Placeholder for keyboard shortcuts help
        console.log('⌨️ [App] Keyboard shortcuts help would show here');
        if (this.ui) {
            this.ui.toast.info('Keyboard shortcuts: Cmd+K (Search), Cmd+/ (Help), Esc (Close)');
        }
    }
    
    logError(error, context = {}) {
        // Log error to external service (Sentry, LogRocket, etc.)
        if (window.Sentry) {
            window.Sentry.captureException(error, { extra: context });
        }
        
        // Store error locally for debugging
        if (this.store) {
            const errors = this.store.get('errors') || [];
            errors.push({
                message: error.message,
                stack: error.stack,
                context,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
            
            // Keep only last 50 errors
            if (errors.length > 50) {
                errors.splice(0, errors.length - 50);
            }
            
            this.store.set('errors', errors, { persist: false });
        }
    }
    
    // =============================================================================
    // PAGE GUARDS
    // =============================================================================
    
    async requireAuth(redirectUrl = '/auth.html') {
        return await this.auth.requireAuth(redirectUrl);
    }
    
    async requireBusiness(redirectUrl = '/onboarding.html') {
        return await this.auth.requireBusiness(redirectUrl);
    }
    
    async requireAdmin(redirectUrl = '/dashboard.html') {
        const user = this.auth.user || window.OsliraApp?.user;
        if (!user?.is_admin) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    // =============================================================================
    // STATIC METHODS
    // =============================================================================
    
    static showInitializationError(error) {
        // Show user-friendly error without UI manager
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 32px;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            max-width: 500px;
            text-align: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        errorDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h2 style="margin-bottom: 16px; color: #1f2937;">Application Failed to Load</h2>
            <p style="color: #6b7280; margin-bottom: 24px;">
                There was a problem starting the application. This might be due to network issues or browser compatibility.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="window.location.reload()" style="
                    background: #2D6CDF;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                ">Retry</button>
                <button onclick="window.location.href='/'" style="
                    background: #6B7280;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                ">Go Home</button>
            </div>
            <details style="margin-top: 24px; text-align: left;">
                <summary style="cursor: pointer; color: #6b7280;">Technical Details</summary>
                <pre style="
                    background: #f3f4f6;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 8px;
                    font-size: 12px;
                    overflow: auto;
                ">${error.message}\n${error.stack || ''}</pre>
            </details>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    /**
     * Get current application instance
     * @returns {OsliraApp|null} App instance or null if not initialized
     */
    static getInstance() {
        return this.instance;
    }
    
    /**
     * Check if app is ready
     * @returns {boolean} True if app is initialized
     */
    static isReady() {
        return this.instance && this.instance.initialized;
    }
}

// Export for global use
window.OsliraAppInitializer = OsliraApp;
