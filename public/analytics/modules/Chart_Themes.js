// Chart themes configuration for SecureChartFactory
const chart_themes = {
    default: {
        name: 'Default',
        colors: {
            primary: '#2D6CDF',
            secondary: '#8A6DF1',
            accent: '#53E1C5',
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            neutral: '#6B7280',
            background: '#FFFFFF',
            surface: '#F9FAFB',
            text: '#111827',
            textSecondary: '#6B7280'
        },
        fonts: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 12,
            weight: 'normal',
            titleSize: 16,
            titleWeight: 'bold'
        },
        spacing: {
            padding: 16,
            margin: 8,
            borderRadius: 8
        },
        opacity: {
            fill: 0.2,
            hover: 0.8,
            active: 1.0
        },
        chartSpecific: {
            line: {
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4
            },
            bar: {
                borderWidth: 1,
                borderRadius: 4,
                categoryPercentage: 0.8,
                barPercentage: 0.9
            },
            doughnut: {
                cutout: '60%',
                borderWidth: 2,
                hoverBorderWidth: 3
            },
            pie: {
                borderWidth: 2,
                hoverBorderWidth: 3
            },
            radar: {
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5
            },
            scatter: {
                pointRadius: 5,
                pointHoverRadius: 7,
                borderWidth: 2
            },
            polarArea: {
                borderWidth: 2,
                hoverBorderWidth: 3
            }
        }
    },

    highContrast: {
        name: 'High Contrast',
        colors: {
            primary: '#000000',
            secondary: '#FFFFFF',
            accent: '#FFD700',
            success: '#00FF00',
            warning: '#FF8C00',
            error: '#FF0000',
            neutral: '#808080',
            background: '#FFFFFF',
            surface: '#F0F0F0',
            text: '#000000',
            textSecondary: '#404040'
        },
        fonts: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 14,
            weight: 'bold',
            titleSize: 18,
            titleWeight: 'bold'
        },
        spacing: {
            padding: 20,
            margin: 12,
            borderRadius: 4
        },
        opacity: {
            fill: 0.3,
            hover: 0.9,
            active: 1.0
        },
        chartSpecific: {
            line: {
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8,
                tension: 0.2
            },
            bar: {
                borderWidth: 2,
                borderRadius: 2,
                categoryPercentage: 0.7,
                barPercentage: 0.8
            },
            doughnut: {
                cutout: '50%',
                borderWidth: 3,
                hoverBorderWidth: 4
            },
            pie: {
                borderWidth: 3,
                hoverBorderWidth: 4
            },
            radar: {
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 7
            },
            scatter: {
                pointRadius: 6,
                pointHoverRadius: 9,
                borderWidth: 3
            },
            polarArea: {
                borderWidth: 3,
                hoverBorderWidth: 4
            }
        }
    },

    dark: {
        name: 'Dark',
        colors: {
            primary: '#60A5FA',
            secondary: '#A78BFA',
            accent: '#34D399',
            success: '#10B981',
            warning: '#FBBF24',
            error: '#F87171',
            neutral: '#9CA3AF',
            background: '#111827',
            surface: '#1F2937',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB'
        },
        fonts: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 12,
            weight: 'normal',
            titleSize: 16,
            titleWeight: 'bold'
        },
        spacing: {
            padding: 16,
            margin: 8,
            borderRadius: 8
        },
        opacity: {
            fill: 0.25,
            hover: 0.85,
            active: 1.0
        },
        chartSpecific: {
            line: {
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4
            },
            bar: {
                borderWidth: 1,
                borderRadius: 4,
                categoryPercentage: 0.8,
                barPercentage: 0.9
            },
            doughnut: {
                cutout: '60%',
                borderWidth: 2,
                hoverBorderWidth: 3
            },
            pie: {
                borderWidth: 2,
                hoverBorderWidth: 3
            },
            radar: {
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5
            },
            scatter: {
                pointRadius: 5,
                pointHoverRadius: 7,
                borderWidth: 2
            },
            polarArea: {
                borderWidth: 2,
                hoverBorderWidth: 3
            }
        }
    },

    minimal: {
        name: 'Minimal',
        colors: {
            primary: '#374151',
            secondary: '#6B7280',
            accent: '#9CA3AF',
            success: '#059669',
            warning: '#D97706',
            error: '#DC2626',
            neutral: '#E5E7EB',
            background: '#FFFFFF',
            surface: '#FEFEFE',
            text: '#111827',
            textSecondary: '#6B7280'
        },
        fonts: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 11,
            weight: 'normal',
            titleSize: 14,
            titleWeight: '500'
        },
        spacing: {
            padding: 12,
            margin: 6,
            borderRadius: 6
        },
        opacity: {
            fill: 0.15,
            hover: 0.75,
            active: 1.0
        },
        chartSpecific: {
            line: {
                borderWidth: 1.5,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.3
            },
            bar: {
                borderWidth: 0,
                borderRadius: 2,
                categoryPercentage: 0.85,
                barPercentage: 0.95
            },
            doughnut: {
                cutout: '70%',
                borderWidth: 1,
                hoverBorderWidth: 2
            },
            pie: {
                borderWidth: 1,
                hoverBorderWidth: 2
            },
            radar: {
                borderWidth: 1.5,
                pointRadius: 2,
                pointHoverRadius: 4
            },
            scatter: {
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 1.5
            },
            polarArea: {
                borderWidth: 1,
                hoverBorderWidth: 2
            }
        }
    },

    vibrant: {
        name: 'Vibrant',
        colors: {
            primary: '#7C3AED',
            secondary: '#EC4899',
            accent: '#06B6D4',
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            neutral: '#8B5CF6',
            background: '#FFFFFF',
            surface: '#FAFAFA',
            text: '#1F2937',
            textSecondary: '#6B7280'
        },
        fonts: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 12,
            weight: '500',
            titleSize: 16,
            titleWeight: 'bold'
        },
        spacing: {
            padding: 18,
            margin: 10,
            borderRadius: 10
        },
        opacity: {
            fill: 0.3,
            hover: 0.9,
            active: 1.0
        },
        chartSpecific: {
            line: {
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.5
            },
            bar: {
                borderWidth: 2,
                borderRadius: 6,
                categoryPercentage: 0.75,
                barPercentage: 0.85
            },
            doughnut: {
                cutout: '55%',
                borderWidth: 3,
                hoverBorderWidth: 4
            },
            pie: {
                borderWidth: 3,
                hoverBorderWidth: 4
            },
            radar: {
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6
            },
            scatter: {
                pointRadius: 6,
                pointHoverRadius: 8,
                borderWidth: 3
            },
            polarArea: {
                borderWidth: 3,
                hoverBorderWidth: 4
            }
        }
    }
};

// Color palette generators for dynamic theming
const colorPalettes = {
    // Generate sequential colors for multiple datasets
    sequential: (baseColor, count) => {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const opacity = 0.3 + (0.7 * i / (count - 1));
            colors.push(baseColor + Math.floor(opacity * 255).toString(16).padStart(2, '0'));
        }
        return colors;
    },

    // Generate distinct colors for categorical data
    categorical: (theme, count) => {
        const baseColors = Object.values(theme.colors).slice(0, 7); // Exclude background/text colors
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    },

    // Generate gradient colors
    gradient: (startColor, endColor, count) => {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const ratio = i / (count - 1);
            colors.push(interpolateColor(startColor, endColor, ratio));
        }
        return colors;
    }
};

// Utility function to interpolate between two colors
function interpolateColor(color1, color2, ratio) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Theme application utilities
const themeUtils = {
    // Apply theme to chart options
    applyTheme: (chartOptions, theme, chartType) => {
        const themeConfig = theme.chartSpecific[chartType] || {};
        
        // Apply global theme settings
        chartOptions.plugins = chartOptions.plugins || {};
        
        // Legend styling
        chartOptions.plugins.legend = {
            ...chartOptions.plugins.legend,
            labels: {
                ...chartOptions.plugins.legend?.labels,
                font: {
                    family: theme.fonts.family,
                    size: theme.fonts.size,
                    weight: theme.fonts.weight
                },
                color: theme.colors.text,
                padding: theme.spacing.margin
            }
        };
        
        // Title styling
        chartOptions.plugins.title = {
            ...chartOptions.plugins.title,
            font: {
                family: theme.fonts.family,
                size: theme.fonts.titleSize,
                weight: theme.fonts.titleWeight
            },
            color: theme.colors.text,
            padding: theme.spacing.padding
        };
        
        // Tooltip styling
        chartOptions.plugins.tooltip = {
            ...chartOptions.plugins.tooltip,
            backgroundColor: theme.colors.surface,
            titleColor: theme.colors.text,
            bodyColor: theme.colors.textSecondary,
            borderColor: theme.colors.neutral,
            borderWidth: 1,
            cornerRadius: theme.spacing.borderRadius,
            titleFont: {
                family: theme.fonts.family,
                size: theme.fonts.size,
                weight: theme.fonts.weight
            },
            bodyFont: {
                family: theme.fonts.family,
                size: theme.fonts.size - 1
            }
        };
        
        // Grid and scale styling
        if (chartOptions.scales) {
            Object.keys(chartOptions.scales).forEach(scaleKey => {
                chartOptions.scales[scaleKey] = {
                    ...chartOptions.scales[scaleKey],
                    ticks: {
                        ...chartOptions.scales[scaleKey]?.ticks,
                        color: theme.colors.textSecondary,
                        font: {
                            family: theme.fonts.family,
                            size: theme.fonts.size - 1
                        }
                    },
                    grid: {
                        ...chartOptions.scales[scaleKey]?.grid,
                        color: theme.colors.neutral + '40'
                    }
                };
            });
        }
        
        return chartOptions;
    },
    
    // Generate dataset styling based on theme
    styleDatasets: (datasets, theme, chartType) => {
        const themeConfig = theme.chartSpecific[chartType] || {};
        const colors = colorPalettes.categorical(theme, datasets.length);
        
        return datasets.map((dataset, index) => {
            const baseColor = colors[index];
            const backgroundColor = baseColor + Math.floor(theme.opacity.fill * 255).toString(16).padStart(2, '0');
            
            return {
                ...dataset,
                borderColor: baseColor,
                backgroundColor: backgroundColor,
                hoverBackgroundColor: baseColor + Math.floor(theme.opacity.hover * 255).toString(16).padStart(2, '0'),
                hoverBorderColor: baseColor,
                ...themeConfig
            };
        });
    },
    
    // Get theme by name or preference
    getTheme: (themeName, userPreferences = {}) => {
        let selectedTheme = chart_themes[themeName] || chart_themes.default;
        
        // Apply user preference overrides
        if (userPreferences.highContrast) {
            selectedTheme = chart_themes.highContrast;
        }
        
        if (userPreferences.darkMode) {
            selectedTheme = chart_themes.dark;
        }
        
        // Apply accessibility adjustments
        if (userPreferences.reducedMotion) {
            selectedTheme = {
                ...selectedTheme,
                animation: { duration: 0 }
            };
        }
        
        if (userPreferences.largeText) {
            selectedTheme = {
                ...selectedTheme,
                fonts: {
                    ...selectedTheme.fonts,
                    size: selectedTheme.fonts.size + 2,
                    titleSize: selectedTheme.fonts.titleSize + 2
                }
            };
        }
        
        return selectedTheme;
    }
};

export { 
    chart_themes, 
    colorPalettes, 
    themeUtils, 
    interpolateColor 
};
