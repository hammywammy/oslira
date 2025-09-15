// =============================================================================
// ONBOARDING RULES & BUSINESS LOGIC
// =============================================================================

class OnboardingRules {
    constructor() {
        this.TOTAL_STEPS = 9;
        
        // Step-field mapping for 9 steps
        this.STEP_FIELDS = {
            1: ['primary-objective'],    // Primary Objective
            2: ['business-name'],        // Business Name
            3: ['business-niche'],       // Business Niche  
            4: ['target-audience'],      // Target Audience
            5: ['value-proposition'],    // Value Proposition
            6: ['communication-tone'],   // Communication Style
            7: ['preferred-cta'],        // CTA Preference
            8: ['phone-number'],         // Phone Number (optional)
            9: ['key-results']           // Key Results (optional, moved to end)
        };
        
        // Validation rules for each field
        this.VALIDATION_RULES = {
            'business-name': { required: true, minLength: 2 },
            'business-niche': { required: true, minLength: 3 },
            'target-audience': { required: true, minLength: 10 },
            'target-problems': { required: true, minLength: 20 },
            'value-proposition': { required: true, minLength: 20 },
            'success-outcome': { required: true, minLength: 10 },
            'call-to-action': { required: true, minLength: 5 },
            'communication-style': { required: true },
            'message-example': { required: true, minLength: 50 },
            'primary-objective': { required: true },
            'phone-number': { required: false }
        };
        
        // Character limits for each field (optimized for AI summary generation)
        this.CHARACTER_LIMITS = {
            'business-name': {
                min: 2,
                max: 100,
                reason: 'Business names are typically 2-100 characters'
            },
            'target-audience': {
                min: 20,
                max: 500,
                reason: 'Detailed audience description for AI analysis'
            },
            'value-proposition': {
                min: 20,
                max: 300,
                reason: 'Concise but detailed value prop (2-3 sentences ideal)'
            },
            'key-results': {
                min: 0,  // Optional field
                max: 800,
                reason: 'Detailed success outcomes for AI summary generation'
            },
            'phone-number': {
                min: 10,
                max: 20,
                reason: 'International phone numbers with formatting'
            }
        };
        
        // Business niche to CTA mapping for smart defaults
        this.CTA_DEFAULTS = {
            'coaching': 'Book Your Free Discovery Call',
            'consulting': 'Schedule a Strategy Session',
            'e-commerce': 'Shop Now - Free Shipping',
            'saas': 'Start Your Free Trial',
            'real-estate': 'Get Your Free Property Valuation',
            'fitness': 'Join Our Fitness Challenge',
            'education': 'Enroll in Our Next Cohort',
            'agency': 'Get Your Free Marketing Audit',
            'healthcare': 'Book Your Consultation',
            'legal': 'Schedule Your Free Case Review'
        };
        
        // Field validation patterns
        this.VALIDATION_PATTERNS = {
            'business-name': /^[a-zA-Z0-9\s\-'&\.]+$/,
            'phone-number': /^\+?[\d\s\-()]{10,}$/,
            'email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        };
    }
    
    // =============================================================================
    // STEP VALIDATION LOGIC
    // =============================================================================
    
    getFieldsForStep(stepNumber) {
        return this.STEP_FIELDS[stepNumber] || [];
    }
    
    getValidationRules(fieldId) {
        return this.VALIDATION_RULES[fieldId] || {};
    }
    
    getCharacterLimits(fieldId) {
        return this.CHARACTER_LIMITS[fieldId] || null;
    }
    
    getSmartDefault(fieldId, businessNiche) {
        if (fieldId === 'preferred-cta' && businessNiche) {
            return this.CTA_DEFAULTS[businessNiche] || null;
        }
        return null;
    }
    
    // =============================================================================
    // BUSINESS VALIDATION RULES
    // =============================================================================
    
    validateBusinessName(businessName) {
        const trimmed = businessName.trim();
        
        if (trimmed.length === 0) {
            return { valid: false, message: 'Business name is required' };
        }
        
        if (trimmed.length < 2) {
            return { valid: false, message: 'Business name must be at least 2 characters' };
        }
        
        if (trimmed.length > 50) {
            return { valid: false, message: 'Business name must be 50 characters or less' };
        }
        
        const validPattern = /^[a-zA-Z0-9\s\-'&\.]+$/;
        if (!validPattern.test(trimmed)) {
            return { 
                valid: false, 
                message: 'Business name contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, and periods are allowed.'
            };
        }
        
        return { valid: true, message: '' };
    }
    
    validateSuccessOutcome(outcome) {
        const trimmed = outcome.trim();
        
        if (trimmed.length === 0) {
            return { valid: false, message: 'Success outcome is required' };
        }
        
        if (trimmed.length < 10) {
            return { valid: false, message: 'Please provide more detail about your success outcome' };
        }
        
        return { valid: true, message: '' };
    }
    
    validateCommunicationStyle(style) {
        if (!style || style.trim().length === 0) {
            return { valid: false, message: 'Communication style is required' };
        }
        
        return { valid: true, message: '' };
    }
    
    validatePhoneNumber(phone) {
        if (!phone || phone.trim().length === 0) {
            return { valid: true, message: '' }; // Phone is optional
        }
        
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length < 10 || cleaned.length > 15) {
            return { valid: false, message: 'Please enter a valid phone number (10-15 digits)' };
        }
        
        return { valid: true, message: '' };
    }
    
    // =============================================================================
    // CHARACTER LIMIT VALIDATION
    // =============================================================================
    
    validateCharacterLimit(fieldId, value) {
        const limits = this.getCharacterLimits(fieldId);
        if (!limits) return { valid: true, message: '' };
        
        const currentLength = value.length;
        
        // Check minimum length (for required fields)
        if (limits.min > 0 && currentLength > 0 && currentLength < limits.min) {
            return { 
                valid: false, 
                message: `Minimum ${limits.min} characters required`,
                warning: true 
            };
        }
        
        // Check maximum length
        if (currentLength > limits.max) {
            return { 
                valid: false, 
                message: `Maximum ${limits.max} characters allowed` 
            };
        }
        
        return { valid: true, message: '' };
    }
    
    getCharacterUsageStatus(fieldId, value) {
        const limits = this.getCharacterLimits(fieldId);
        if (!limits) return 'normal';
        
        const percentage = value.length / limits.max;
        
        if (percentage >= 0.9) return 'warning';
        if (value.length >= limits.max) return 'limit-reached';
        return 'normal';
    }
    
    // =============================================================================
    // FORM DATA VALIDATION
    // =============================================================================
    
    validateRequiredFields(formData) {
        const errors = [];
        const requiredFields = [
            { key: 'business_name', label: 'Business Name' },
            { key: 'business_niche', label: 'Business Niche' },
            { key: 'target_audience', label: 'Target Audience' },
            { key: 'target_problems', label: 'Target Problems' },
            { key: 'value_proposition', label: 'Value Proposition' },
            { key: 'success_outcome', label: 'Success Outcome' },
            { key: 'call_to_action', label: 'Call to Action' }
        ];
        
        requiredFields.forEach(field => {
            if (!formData[field.key] || formData[field.key].trim().length === 0) {
                errors.push(`${field.label} is required`);
            }
        });
        
        return errors;
    }
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    sanitizePhoneNumber(phone) {
        if (!phone) return '';
        
        // Remove all non-numeric characters except + for international
        const cleaned = phone.replace(/[^\d+]/g, '');
        
        // Validate international format
        if (cleaned.startsWith('+')) {
            return cleaned.length <= 16 ? cleaned : cleaned.substring(0, 16);
        }
        
        // Domestic format - remove leading 1 if present
        const domesticCleaned = cleaned.replace(/^1/, '');
        return domesticCleaned.length <= 10 ? domesticCleaned : domesticCleaned.substring(0, 10);
    }
    
    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length <= 10) {
            if (cleaned.length >= 6) {
                return cleaned.replace(/(\d{3})(\d{3})(\d{0,4})/, '($1) $2-$3');
            } else if (cleaned.length >= 3) {
                return cleaned.replace(/(\d{3})(\d{0,3})/, '($1) $2');
            }
        }
        
        return phone;
    }
    
    getTotalSteps() {
        return this.TOTAL_STEPS;
    }
    
    isValidStep(stepNumber) {
        return stepNumber >= 1 && stepNumber <= this.TOTAL_STEPS;
    }
}

// Export to window for non-module usage
window.OnboardingRules = OnboardingRules;
