// ===============================================================================
// MODAL BUILDER ENGINE - Assembles modals based on analysis type
// ===============================================================================

class ModalBuilder {
    constructor() {
        this.components = new ModalComponents();
        this.configs = new AnalysisConfigs();
    }

    // ===============================================================================
    // MAIN BUILD METHOD
    // ===============================================================================
    
    buildAnalysisModal(lead, analysisData) {
        const analysisType = lead.analysis_type;
        const config = this.configs.getConfig(analysisType);
        
        console.log('🏗️ [ModalBuilder] Building modal for analysis type:', analysisType);
        
        // Build modal sections
        const sections = config.components
            .map(componentName => this.renderComponent(componentName, lead, analysisData))
            .filter(section => section !== null)
            .join('');
        
        // Wrap in modal container
        return `
            <div class="overflow-y-auto max-h-[90vh]">
                ${sections}
                ${this.renderFooter()}
            </div>
        `;
    }

    // ===============================================================================
    // COMPONENT RENDERING
    // ===============================================================================
    
    renderComponent(componentName, lead, analysisData) {
        const component = this.components.getComponent(componentName);
        
        if (!component) {
            console.warn('🚨 [ModalBuilder] Component not found:', componentName);
            return null;
        }

        // Check condition if exists
        if (component.condition && !component.condition(lead, analysisData)) {
            return null;
        }

        // Render component
        try {
            return component.render(lead, analysisData);
        } catch (error) {
            console.error('🚨 [ModalBuilder] Error rendering component:', componentName, error);
            return null;
        }
    }

    renderFooter() {
        return `
            <div class="p-6 border-t border-gray-200 bg-gray-50">
                <div class="flex justify-end space-x-3">
                    <button onclick="closeLeadAnalysisModal()" 
                            class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        `;
    }

    // ===============================================================================
    // EXTENSION METHODS
    // ===============================================================================
    
    // Add new component to the system
    addComponent(name, component) {
        this.components.registerComponent(name, component);
    }

    // Add new analysis type
    addAnalysisType(type, config) {
        this.configs.registerAnalysisType(type, config);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalBuilder;
} else {
    window.ModalBuilder = ModalBuilder;
}
