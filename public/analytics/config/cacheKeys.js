// ==========================================
// CACHE KEYS - Centralized Cache Key Management
// Standardized cache keys for all Oslira analytics modules
// ==========================================

/**
 * Centralized cache key constants for the Oslira Analytics Dashboard
 * Prevents key collisions and provides consistent naming
 * Version 1.0.0
 */

// Base cache prefixes
const CACHE_PREFIXES = {
    ANALYTICS: 'analytics_',
    INSIGHTS: 'insights_',
    SUMMARY: 'summary_',
    MODULE: 'module_',
    USER: 'user_',
    CONFIG: 'config_',
    EXPORT: 'export_',
    TEMP: 'temp_'
};

// Analytics data cache keys
const ANALYTICS_KEYS = {
    DASHBOARD_DATA: `${CACHE_PREFIXES.ANALYTICS}dashboard_data`,
    PERFORMANCE_METRICS: `${CACHE_PREFIXES.ANALYTICS}performance_metrics`,
    USER_ACTIVITY: `${CACHE_PREFIXES.ANALYTICS}user_activity`,
    CONVERSION_DATA: `${CACHE_PREFIXES.ANALYTICS}conversion_data`,
    LEAD_ANALYTICS: `${CACHE_PREFIXES.ANALYTICS}lead_analytics`,
    CAMPAIGN_METRICS: `${CACHE_PREFIXES.ANALYTICS}campaign_metrics`,
    ROI_DATA: `${CACHE_PREFIXES.ANALYTICS}roi_data`,
    TREND_DATA: `${CACHE_PREFIXES.ANALYTICS}trend_data`
};

// AI Insights cache keys
const INSIGHTS_KEYS = {
    GENERATED_INSIGHTS: `${CACHE_PREFIXES.INSIGHTS}generated`,
    RISK_ANALYSIS: `${CACHE_PREFIXES.INSIGHTS}risk_analysis`,
    PERFORMANCE_OPPORTUNITIES: `${CACHE_PREFIXES.INSIGHTS}performance_opportunities`,
    LEAD_OPTIMIZATION: `${CACHE_PREFIXES.INSIGHTS}lead_optimization`,
    CLAUDE_GUIDANCE: `${CACHE_PREFIXES.INSIGHTS}claude_guidance`,
    FEEDBACK_ANALYSIS: `${CACHE_PREFIXES.INSIGHTS}feedback_analysis`,
    PREDICTIVE_ANALYTICS: `${CACHE_PREFIXES.INSIGHTS}predictive_analytics`
};

// Summary panel cache keys
const SUMMARY_KEYS = {
    QUICK_METRICS: `${CACHE_PREFIXES.SUMMARY}quick_metrics`,
    TOTAL_LEADS: `${CACHE_PREFIXES.SUMMARY}total_leads`,
    HIGH_RISK_PERCENTAGE: `${CACHE_PREFIXES.SUMMARY}high_risk_percentage`,
    AVERAGE_ROI: `${CACHE_PREFIXES.SUMMARY}average_roi`,
    WEEKLY_CHANGE: `${CACHE_PREFIXES.SUMMARY}weekly_change`,
    CONVERSION_RATE: `${CACHE_PREFIXES.SUMMARY}conversion_rate`,
    ACTIVE_OUTREACH: `${CACHE_PREFIXES.SUMMARY}active_outreach`,
    SPARKLINE_DATA: `${CACHE_PREFIXES.SUMMARY}sparkline_data`
};

// Module-specific cache keys
const MODULE_KEYS = {
    CTA_EFFECTIVENESS: `${CACHE_PREFIXES.MODULE}cta_effectiveness`,
    LEAD_CONVERSION_HEATMAP: `${CACHE_PREFIXES.MODULE}lead_conversion_heatmap`,
    MESSAGE_STYLE_MATRIX: `${CACHE_PREFIXES.MODULE}message_style_matrix`,
    FEEDBACK_SIGNAL_EXPLORER: `${CACHE_PREFIXES.MODULE}feedback_signal_explorer`,
    CRM_PERFORMANCE_COMPARATOR: `${CACHE_PREFIXES.MODULE}crm_performance_comparator`,
    OUTREACH_TIMELINE: `${CACHE_PREFIXES.MODULE}outreach_timeline`,
    MESSAGE_ITERATION_ROI: `${CACHE_PREFIXES.MODULE}message_iteration_roi`,
    TEAM_IMPACT_DASHBOARD: `${CACHE_PREFIXES.MODULE}team_impact_dashboard`,
    CLAUDE_GUIDANCE_HISTORY: `${CACHE_PREFIXES.MODULE}claude_guidance_history`,
    MESSAGE_RISK_CLASSIFIER: `${CACHE_PREFIXES.MODULE}message_risk_classifier`,
    NAVIGATION_SIDEBAR: `${CACHE_PREFIXES.MODULE}navigation_sidebar`,
    MODULE_DISCOVERY: `${CACHE_PREFIXES.MODULE}discovery`,
    MODULE_HEALTH: `${CACHE_PREFIXES.MODULE}health`
};

// User-specific cache keys
const USER_KEYS = {
    PROFILE: `${CACHE_PREFIXES.USER}profile`,
    PREFERENCES: `${CACHE_PREFIXES.USER}preferences`,
    DASHBOARD_CONFIG: `${CACHE_PREFIXES.USER}dashboard_config`,
    RECENT_SEARCHES: `${CACHE_PREFIXES.USER}recent_searches`,
    SAVED_FILTERS: `${CACHE_PREFIXES.USER}saved_filters`,
    BOOKMARKS: `${CACHE_PREFIXES.USER}bookmarks`,
    NOTIFICATION_SETTINGS: `${CACHE_PREFIXES.USER}notification_settings`,
    THEME_SETTINGS: `${CACHE_PREFIXES.USER}theme_settings`
};

// Configuration cache keys
const CONFIG_KEYS = {
    ANALYTICS_CONFIG: `${CACHE_PREFIXES.CONFIG}analytics`,
    MODULE_CONFIG: `${CACHE_PREFIXES.CONFIG}modules`,
    UI_CONFIG: `${CACHE_PREFIXES.CONFIG}ui`,
    SECURITY_CONFIG: `${CACHE_PREFIXES.CONFIG}security`,
    PERFORMANCE_CONFIG: `${CACHE_PREFIXES.CONFIG}performance`,
    FEATURE_FLAGS: `${CACHE_PREFIXES.CONFIG}feature_flags`,
    API_ENDPOINTS: `${CACHE_PREFIXES.CONFIG}api_endpoints`
};

// Export/Import cache keys
const EXPORT_KEYS = {
    EXPORT_DATA: `${CACHE_PREFIXES.EXPORT}data`,
    EXPORT_METADATA: `${CACHE_PREFIXES.EXPORT}metadata`,
    EXPORT_PROGRESS: `${CACHE_PREFIXES.EXPORT}progress`,
    EXPORT_HISTORY: `${CACHE_PREFIXES.EXPORT}history`,
    IMPORT_TEMPLATES: `${CACHE_PREFIXES.EXPORT}import_templates`
};

// Temporary cache keys (short TTL)
const TEMP_KEYS = {
    LOADING_STATES: `${CACHE_PREFIXES.TEMP}loading_states`,
    ERROR_STATES: `${CACHE_PREFIXES.TEMP}error_states`,
    FORM_DATA: `${CACHE_PREFIXES.TEMP}form_data`,
    SEARCH_RESULTS: `${CACHE_PREFIXES.TEMP}search_results`,
    VALIDATION_CACHE: `${CACHE_PREFIXES.TEMP}validation`,
    SESSION_DATA: `${CACHE_PREFIXES.TEMP}session`,
    API_RESPONSES: `${CACHE_PREFIXES.TEMP}api_responses`
};

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
    VERY_SHORT: 30000,    // 30 seconds
    SHORT: 60000,         // 1 minute
    MEDIUM: 300000,       // 5 minutes
    LONG: 900000,         // 15 minutes
    VERY_LONG: 3600000,   // 1 hour
    PERSISTENT: 86400000  // 24 hours
};

// Cache strategies
const CACHE_STRATEGIES = {
    ANALYTICS: {
        ttl: CACHE_TTL.MEDIUM,
        compression: true,
        priority: 'high'
    },
    INSIGHTS: {
        ttl: CACHE_TTL.LONG,
        compression: true,
        priority: 'medium'
    },
    SUMMARY: {
        ttl: CACHE_TTL.SHORT,
        compression: false,
        priority: 'high'
    },
    MODULE: {
        ttl: CACHE_TTL.MEDIUM,
        compression: true,
        priority: 'medium'
    },
    USER: {
        ttl: CACHE_TTL.VERY_LONG,
        compression: false,
        priority: 'high'
    },
    CONFIG: {
        ttl: CACHE_TTL.PERSISTENT,
        compression: false,
        priority: 'critical'
    },
    TEMP: {
        ttl: CACHE_TTL.VERY_SHORT,
        compression: false,
        priority: 'low'
    }
};

// Utility functions for cache key generation
const CacheKeyUtils = {
    /**
     * Generate a timestamped cache key
     * @param {string} baseKey - Base cache key
     * @param {number} timestamp - Optional timestamp
     * @returns {string} - Timestamped cache key
     */
    withTimestamp(baseKey, timestamp = Date.now()) {
        return `${baseKey}_${timestamp}`;
    },

    /**
     * Generate a user-specific cache key
     * @param {string} baseKey - Base cache key
     * @param {string} userId - User ID
     * @returns {string} - User-specific cache key
     */
    forUser(baseKey, userId) {
        return `${baseKey}_user_${userId}`;
    },

    /**
     * Generate a module-specific cache key
     * @param {string} baseKey - Base cache key
     * @param {string} moduleId - Module ID
     * @returns {string} - Module-specific cache key
     */
    forModule(baseKey, moduleId) {
        return `${baseKey}_module_${moduleId}`;
    },

    /**
     * Generate a filtered cache key
     * @param {string} baseKey - Base cache key
     * @param {Object} filters - Filter parameters
     * @returns {string} - Filtered cache key
     */
    withFilters(baseKey, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return baseKey;
        }
        
        const filterString = Object.entries(filters)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}:${value}`)
            .join('|');
        
        const filterHash = btoa(filterString).slice(0, 12);
        return `${baseKey}_filter_${filterHash}`;
    },

    /**
     * Generate a versioned cache key
     * @param {string} baseKey - Base cache key
     * @param {string} version - Version string
     * @returns {string} - Versioned cache key
     */
    withVersion(baseKey, version) {
        return `${baseKey}_v${version}`;
    },

    /**
     * Generate a composite cache key
     * @param {string} category - Cache category
     * @param {string} type - Cache type
     * @param {string} identifier - Unique identifier
     * @returns {string} - Composite cache key
     */
    composite(category, type, identifier) {
        return `${category}_${type}_${identifier}`;
    }
};

// Export all cache keys and utilities
export const CACHE_KEYS = {
    // Prefixes
    PREFIXES: CACHE_PREFIXES,
    
    // Category keys
    ANALYTICS: ANALYTICS_KEYS,
    INSIGHTS: INSIGHTS_KEYS,
    SUMMARY: SUMMARY_KEYS,
    MODULE: MODULE_KEYS,
    USER: USER_KEYS,
    CONFIG: CONFIG_KEYS,
    EXPORT: EXPORT_KEYS,
    TEMP: TEMP_KEYS,
    
    // TTL constants
    TTL: CACHE_TTL,
    
    // Cache strategies
    STRATEGIES: CACHE_STRATEGIES,
    
    // Utilities
    Utils: CacheKeyUtils
};

// Export individual categories for convenience
export {
    CACHE_PREFIXES,
    ANALYTICS_KEYS,
    INSIGHTS_KEYS,
    SUMMARY_KEYS,
    MODULE_KEYS,
    USER_KEYS,
    CONFIG_KEYS,
    EXPORT_KEYS,
    TEMP_KEYS,
    CACHE_TTL,
    CACHE_STRATEGIES,
    CacheKeyUtils
};

// Default export
export default CACHE_KEYS;

console.log('🔑 Cache keys loaded successfully with', Object.keys(CACHE_KEYS).length - 2, 'categories');
