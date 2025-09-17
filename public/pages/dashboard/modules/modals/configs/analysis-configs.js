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
                'header',
                'summary',
                'upgradeNotice'
            ]
        });

        // Deep Analysis Configuration  
        this.configs.set('deep', {
            components: [
                'header',
                'summary',
                'sellingPoints',
                'reasons',
                'engagementMetrics',
                'audienceInsights',
                'outreachMessage'
            ]
        });

        // X-Ray Analysis Configuration
        this.configs.set('xray', {
            components: [
                'header',
                'summary',
                'sellingPoints',
                'reasons',
                'engagementMetrics',
                'audienceInsights',
                'outreachMessage'
                // Future: Add xray-specific components like 'copywriterProfile', 'commercialIntelligence'
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
