const MESSAGE_STYLES = {
    // Tone categories with performance metrics
    tones: {
        formal: {
            name: 'Formal',
            description: 'Professional and structured communication',
            avgResponseRate: 0.15,
            conversionRate: 0.08,
            bestFor: ['business_page']
        },
        
        casual: {
            name: 'Casual',
            description: 'Relaxed and conversational style',
            avgResponseRate: 0.22,
            conversionRate: 0.12,
            bestFor: ['personal_brand', 'creator']
        },
        
        friendly: {
            name: 'Friendly',
            description: 'Warm and personable communication',
            avgResponseRate: 0.28,
            conversionRate: 0.15,
            bestFor: ['personal_brand', 'creator']
        },
        
        professional: {
            name: 'Professional',
            description: 'Business-focused with expertise emphasis',
            avgResponseRate: 0.18,
            conversionRate: 0.10,
            bestFor: ['business_page']
        },
        
        humorous: {
            name: 'Humorous',
            description: 'Light-hearted with appropriate humor',
            avgResponseRate: 0.35,
            conversionRate: 0.08,
            bestFor: ['meme_page', 'creator']
        }
    },
    
    // Structure types for message organization
    structures: {
        short: {
            name: 'Short Form',
            description: 'Concise, direct messages',
            wordRange: '20-50',
            avgEngagement: 0.25
        },
        
        medium: {
            name: 'Medium Form',
            description: 'Balanced detail and brevity',
            wordRange: '50-150',
            avgEngagement: 0.20
        },
        
        long: {
            name: 'Long Form',
            description: 'Detailed, comprehensive messages',
            wordRange: '150-400',
            avgEngagement: 0.12
        },
        
        bullet: {
            name: 'Bullet Points',
            description: 'Structured, scannable format',
            avgEngagement: 0.18
        },
        
        question: {
            name: 'Question-Based',
            description: 'Engagement through inquiry',
            avgEngagement: 0.30
        }
    }
};



// Data refresh and cache management constants
const CACHE_KEYS = {
    MESSAGE_MATRIX: 'analytics_message_matrix',
    CONVERSION_HEATMAP: 'analytics_conversion_heatmap',
    CTA_TRACKER: 'analytics_cta_tracker',
    FEEDBACK_EXPLORER: 'analytics_feedback_explorer',
    CRM_COMPARATOR: 'analytics_crm_comparator',
    TIMELINE_OVERLAY: 'analytics_timeline_overlay',
    ITERATION_TRACKER: 'analytics_iteration_tracker',
    TEAM_DASHBOARD: 'analytics_team_dashboard',
    CLAUDE_GUIDANCE: 'analytics_claude_guidance',
    RISK_CLASSIFIER: 'analytics_risk_classifier',
    USER_PROFILE: 'analytics_user_profile',
    BUSINESS_DATA: 'analytics_business_data',
    FILTER_STATE: 'analytics_filter_state',
    EXPORT_CONFIG: 'analytics_export_config',
    FEATURE_FLAGS: 'analytics_feature_flags'
};

// Export and reporting configuration
const EXPORT_CONFIG = {
    formats: {
        pdf: {
            name: 'PDF Report',
            mimeType: 'application/pdf',
            extension: '.pdf',
            features: ['charts', 'tables', 'insights', 'branding']
        },
        csv: {
            name: 'CSV Data',
            mimeType: 'text/csv',
            extension: '.csv',
            features: ['raw_data', 'processed_data']
        },
        json: {
            name: 'JSON Data',
            mimeType: 'application/json',
            extension: '.json',
            features: ['raw_data', 'metadata', 'structure']
        },
        xlsx: {
            name: 'Excel Workbook',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            extension: '.xlsx',
            features: ['multiple_sheets', 'charts', 'formatting', 'formulas']
        }
    },
    
    defaults: {
        format: 'pdf',
        includeCharts: true,
        includeTables: true,
        includeInsights: true,
        dateRange: '30d',
        compression: true
    }
};

// Initialize configuration when DOM is ready or OsliraApp is available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicConfig);
} else {
    loadDynamicConfig();
}

// Also listen for OsliraApp initialization
if (window.OsliraApp?.events) {
    window.OsliraApp.events.addEventListener('appInitialized', loadDynamicConfig);
}

// Export helper functions globally
window.AnalyticsConfig = {
    isFeatureEnabled,
    enableFeature,
    disableFeature,
    getFeatureFlags,
    loadDynamicConfig
};
