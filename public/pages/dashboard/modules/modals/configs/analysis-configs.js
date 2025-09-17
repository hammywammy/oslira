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
            'heroHeader',
            'metricsGrid',
            'aiSummary',
            'sellingPoints',
            'outreachMessage',
            'engagementInsights'
        ]
    });

    // X-Ray Analysis Configuration
    this.configs.set('xray', {
        components: [
            'heroHeader',
            'metricsGrid', 
            'aiSummary',
            'sellingPoints',
            'outreachMessage',
            'engagementInsights',
            'reasons'
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
