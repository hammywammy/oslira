// ===============================================================================
// ANALYSIS TYPE CONFIGURATIONS - Define what components each type uses
// ===============================================================================

class AnalysisConfigs {
    constructor() {
        this.configs = new Map();
        this.registerDefaultConfigs();
    }

registerDefaultConfigs() {
    // Light Analysis Configuration
    this.configs.set('light', {
        components: [
            'heroHeader',
            'aiSummary',
            'lightAnalysisNotice'
        ]
    });

    // Deep Analysis Configuration  
    this.configs.set('deep', {
    components: [
        'heroHeader',           // Your existing header with profile/score
        'deepSummary',          // New - shows deep_summary
        'sellingPoints',        // Existing - shows selling_points from payload
        'outreachMessage',      // Existing - shows outreach_message from payload
        'engagementBreakdown',  // New - shows engagement metrics
        'payloadAudienceInsights', // New - shows audience_insights 
        'reasons',              // Existing - shows reasons array
        'latestPosts',          // New - shows latest_posts (when available)
        'aiSummary'             // Existing fallback
    ]
    });

// X-Ray Analysis Configuration
this.configs.set('xray', {
    components: [
        'heroHeader',
        'copywriterProfile',
        'commercialIntelligence', 
        'persuasionStrategy',
        'aiSummary'
    ]
});
}

    getConfig(analysisType) {
        return this.configs.get(analysisType) || this.configs.get('light');
    }

    // Easy method to add new analysis types
    registerAnalysisType(type, config) {
        this.configs.set(type, config);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalysisConfigs;
} else {
    window.AnalysisConfigs = AnalysisConfigs;
}
