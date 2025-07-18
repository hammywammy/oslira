// Chart themes with feature flag support
const CHART_THEMES = {
    // Color palette matching dashboard.css CSS variables
    colors: {
        primary: '#2D6CDF',
        secondary: '#8A6DF1',
        accent: '#53E1C5',
        warning: '#F59E0B',
        error: '#EF4444',
        success: '#10B981',
        info: '#3B82F6',
        neutral: '#6B7280'
    },
    
    // Chart color schemes
    schemes: {
        performance: ['#EF4444', '#F59E0B', '#10B981'],
        categorical: ['#2D6CDF', '#8A6DF1', '#53E1C5', '#FF6B35', '#10B981', '#F59E0B', '#EF4444', '#6366F1'],
        heatmap: ['#F3F4F6', '#E5E7EB', '#9CA3AF', '#6B7280', '#374151'],
        sequential: ['#E8F3FF', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'],
        diverging: ['#DC2626', '#F87171', '#FEF3C7', '#86EFAC', '#10B981'],
        
        // High contrast themes for accessibility
        highContrast: {
            primary: '#000000',
            secondary: '#FFFFFF', 
            accent: '#FFD700',
            warning: '#FF0000',
            error: '#FF0000',
            success: '#00FF00',
            info: '#0000FF',
            neutral: '#808080'
        }
    },
    
    // Font configuration matching dashboard typography
    fonts: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        sizes: {
            title: 16,
            subtitle: 14,
            body: 12,
            caption: 10,
            legend: 11
        },
        weights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
        }
    },
    
    // Animation configurations with accessibility support
    animations: {
        standard: { 
            duration: () => isFeatureEnabled('enableReducedMotion') ? 0 : 750, 
            easing: 'easeInOutQuart' 
        },
        realTime: { 
            duration: () => isFeatureEnabled('enableReducedMotion') ? 0 : 300, 
            easing: 'easeOutQuart' 
        },
        complex: { 
            duration: () => isFeatureEnabled('enableReducedMotion') ? 0 : 1200, 
            easing: 'easeInOutCubic' 
        },
        none: { duration: 0 }
    },
    
    // Responsive breakpoints
    responsive: {
        mobile: 480,
        tablet: 768,
        desktop: 1024,
        wide: 1400
    },
    
    // Theme selection based on feature flags
    getActiveTheme: () => {
        if (isFeatureEnabled('enableHighContrastMode')) {
            return {
                ...CHART_THEMES,
                colors: CHART_THEMES.schemes.highContrast
            };
        }
        return CHART_THEMES;
    }
};
