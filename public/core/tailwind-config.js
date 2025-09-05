// File: public/core/tailwind-config.js
// Create this new file to handle Tailwind loading and configuration

/**
 * TAILWIND CONFIGURATION MODULE
 * Loads Tailwind CSS and configures it with Oslira brand colors
 * Integrates with existing script loader architecture
 */

class TailwindManager {
    constructor() {
        this.loaded = false;
        this.config = null;
    }
    
    async init() {
        if (this.loaded) {
            console.log('🎨 [TailwindManager] Already loaded');
            return;
        }
        
        try {
            console.log('🎨 [TailwindManager] Loading Tailwind CSS...');
            
            // Load Tailwind CSS from CDN
            await this.loadTailwindCDN();
            
            // Configure with Oslira brand colors
            this.configureTailwind();
            
            this.loaded = true;
            console.log('✅ [TailwindManager] Tailwind CSS loaded and configured');
            
        } catch (error) {
            console.error('❌ [TailwindManager] Failed to load Tailwind:', error);
            // Don't throw - app should work without Tailwind
        }
    }
    
    async loadTailwindCDN() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector('script[src*="tailwindcss"]')) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.tailwindcss.com';
            script.defer = true;
            
            script.onload = () => {
                console.log('✅ [TailwindManager] Tailwind script loaded');
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error('Failed to load Tailwind CSS from CDN'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    configureTailwind() {
        // Wait for Tailwind to be available
        const checkTailwind = () => {
            if (typeof tailwind !== 'undefined') {
                this.applyConfiguration();
            } else {
                setTimeout(checkTailwind, 50);
            }
        };
        
        checkTailwind();
    }
    
    applyConfiguration() {
        // Configure Tailwind with Oslira brand colors and design system
        this.config = {
            theme: {
                extend: {
                    colors: {
                        // Oslira Brand Colors (from design-system.css)
                        'primary': '#2D6CDF',      // --primary-blue
                        'secondary': '#8A6DF1',    // --secondary-purple  
                        'accent': '#06B6D4',       // --accent-teal
                        'success': '#10B981',      // --success
                        'warning': '#F59E0B',      // --warning
                        'danger': '#EF4444',       // --error
                        
                        // Extended Gray Palette
                        'gray': {
                            50: '#F8FAFC',   // --bg-secondary
                            100: '#F1F5F9',  // --bg-light
                            200: '#E2E8F0',  // --border-light
                            300: '#CBD5E1',  // --border-medium
                            400: '#94A3B8',  // --border-dark
                            500: '#64748B',  // --border-strong
                            600: '#475569',  // --text-secondary
                            700: '#334155',  // --text-primary (lighter)
                            800: '#1E293B',  // --text-primary (darker)
                            900: '#0F172A'   // --bg-dark
                        }
                    },
                    fontFamily: {
                        'sans': ['Inter', 'system-ui', 'sans-serif']
                    },
                    boxShadow: {
                        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        'sidebar': '2px 0 20px rgba(45, 108, 223, 0.08)',
                        'glow-blue': '0 0 20px rgba(45, 108, 223, 0.3)',
                        'glow-purple': '0 0 20px rgba(139, 109, 241, 0.3)',
                        'glow-subtle': '0 0 10px rgba(45, 108, 223, 0.15)'
                    },
                    spacing: {
                        '18': '4.5rem',
                        '88': '22rem'
                    },
                    zIndex: {
                        '60': '60',
                        '70': '70'
                    },
                    animation: {
                        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                        'shimmer': 'shimmer 1.5s ease-in-out infinite'
                    },
                    keyframes: {
                        'pulse-glow': {
                            '0%, 100%': { 
                                opacity: '1',
                                transform: 'scale(1)'
                            },
                            '50%': { 
                                opacity: '0.7',
                                transform: 'scale(1.05)'
                            }
                        },
                        'shimmer': {
                            '0%': { opacity: '0.5' },
                            '50%': { opacity: '1' },
                            '100%': { opacity: '0.5' }
                        }
                    }
                }
            }
        };
        
        // Apply configuration to Tailwind
        if (typeof tailwind !== 'undefined' && tailwind.config) {
            tailwind.config = this.config;
            console.log('✅ [TailwindManager] Configuration applied');
        } else {
            console.warn('⚠️ [TailwindManager] Tailwind global not available for configuration');
        }
    }
    
    // Utility methods for components
    isLoaded() {
        return this.loaded;
    }
    
    getConfig() {
        return this.config;
    }
    
    // Helper for adding custom utilities
    addUtilities(utilities) {
        if (this.loaded && typeof tailwind !== 'undefined') {
            // This would require build-time Tailwind, for CDN we use CSS classes
            console.log('🎨 [TailwindManager] Custom utilities would need build-time Tailwind');
        }
    }
}

// Create global instance
window.OsliraTailwind = new TailwindManager();

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TailwindManager;
}

console.log('🎨 TailwindManager ready for initialization');
