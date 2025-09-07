// =============================================================================
// FOOTER-MANAGER.JS - Updated for Component Classes
// =============================================================================

class FooterManager {
    constructor() {
        this.initialized = false;
        this.currentConfig = null;
    }
    
    // =========================================================================
    // MAIN RENDER METHOD
    // =========================================================================
    
    render(container, config = {}) {
        try {
            console.log('🦶 [FooterManager] Rendering footer...');
            
            this.currentConfig = {
                showSocialLinks: true,
                showNewsletter: true,
                year: new Date().getFullYear(),
                companyName: 'Oslira',
                ...config
            };
            
            // Get container element
            const targetElement = typeof container === 'string' 
                ? document.getElementById(container) || document.querySelector(container)
                : container;
                
            if (!targetElement) {
                throw new Error(`Container element not found: ${container}`);
            }
            
            // Inject footer HTML
            targetElement.innerHTML = this.getFooterHTML();
            targetElement.className = 'w-full';
            
            // Initialize functionality
            this.initializeFooter();
            
            console.log('✅ [FooterManager] Footer rendered successfully');
            return this;
            
        } catch (error) {
            console.error('❌ [FooterManager] Render failed:', error);
            throw error;
        }
    }
    
    // =========================================================================
    // HTML TEMPLATE WITH COMPONENT CLASSES
    // =========================================================================
    
    getFooterHTML() {
        return `
            <footer class="footer-main">
                <div class="footer-container">
                    <!-- Main Footer Content -->
                    <div class="footer-grid">
                        
                        <!-- Company Section -->
                        <div class="footer-section">
                            <div class="footer-logo-container">
                                <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                                     class="footer-logo-image">
                                <h3 class="footer-company-name">
                                    ${this.currentConfig.companyName}
                                </h3>
                            </div>
                            <p class="footer-description">
                                Transform your business with AI-powered automation and intelligent workflows.
                            </p>
                            ${this.currentConfig.showSocialLinks ? this.getSocialLinksHTML() : ''}
                        </div>
                        
                        <!-- Product Section -->
                        <div class="footer-section">
                            <h3 class="footer-section-title">Product</h3>
                            <ul class="footer-link-list">
                                <li><a href="/footer/about" class="footer-link">About</a></li>
                                <li><a href="/footer/pricing" class="footer-link">Pricing</a></li>
                                <li><a href="/footer/case-studies" class="footer-link">Case Studies</a></li>
                                <li><a href="/footer/status" class="footer-link">Status</a></li>
                            </ul>
                        </div>
                        
                        <!-- Resources Section -->
                        <div class="footer-section">
                            <h3 class="footer-section-title">Resources</h3>
                            <ul class="footer-link-list">
                                <li><a href="/footer/guides" class="footer-link">Guides</a></li>
                                <li><a href="/footer/api" class="footer-link">API Docs</a></li>
                                <li><a href="/footer/help" class="footer-link">Help Center</a></li>
                                <li><a href="/footer/security" class="footer-link">Security</a></li>
                            </ul>
                        </div>
                        
                        <!-- Newsletter Section -->
                        <div class="footer-section">
                            ${this.currentConfig.showNewsletter ? this.getNewsletterHTML() : this.getLegalLinksHTML()}
                        </div>
                    </div>
                    
                    <!-- Footer Bottom -->
                    <div class="footer-bottom">
                        <div class="footer-bottom-container">
                            <p class="footer-copyright">
                                © ${this.currentConfig.year} ${this.currentConfig.companyName}. All rights reserved.
                            </p>
                            <div class="footer-legal-links">
                                <a href="/footer/legal/privacy" class="footer-legal-link">Privacy</a>
                                <a href="/footer/legal/terms" class="footer-legal-link">Terms</a>
                                <a href="/footer/help" class="footer-legal-link">Support</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }
    
    // =========================================================================
    // COMPONENT SECTIONS WITH COMPONENT CLASSES
    // =========================================================================
    
    getSocialLinksHTML() {
        return `
            <div class="footer-social-container">
                <a href="#" class="footer-social-link">
                    <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                </a>
                <a href="#" class="footer-social-link">
                    <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                    </svg>
                </a>
                <a href="#" class="footer-social-link">
                    <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                </a>
                <a href="#" class="footer-social-link">
                    <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.357-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                    </svg>
                </a>
            </div>
        `;
    }
    
    getNewsletterHTML() {
        return `
            <div class="footer-newsletter-container">
                <h3 class="footer-newsletter-title">Stay Updated</h3>
                <p class="footer-newsletter-description">
                    Get the latest updates and insights delivered to your inbox.
                </p>
                <form class="footer-newsletter-form" onsubmit="return false;">
                    <input 
                        type="email" 
                        placeholder="Enter your email" 
                        class="footer-newsletter-input"
                        required
                    >
                    <button type="submit" class="footer-newsletter-button">
                        Subscribe
                    </button>
                </form>
            </div>
        `;
    }
    
    getLegalLinksHTML() {
        return `
            <div class="footer-section">
                <h3 class="footer-section-title">Legal</h3>
                <ul class="footer-link-list">
                    <li><a href="/footer/legal/privacy" class="footer-link">Privacy Policy</a></li>
                    <li><a href="/footer/legal/terms" class="footer-link">Terms of Service</a></li>
                    <li><a href="/footer/legal/disclaimer" class="footer-link">Disclaimer</a></li>
                    <li><a href="/footer/legal/refund" class="footer-link">Refund Policy</a></li>
                </ul>
            </div>
        `;
    }
    
    // =========================================================================
    // INITIALIZATION AND EVENT HANDLERS
    // =========================================================================
    
    initializeFooter() {
        console.log('🔧 [FooterManager] Initializing footer functionality...');
        
        // Newsletter form handling
        const newsletterForm = document.querySelector('.footer-newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', this.handleNewsletterSubmit.bind(this));
        }
        
        // Social link tracking
        const socialLinks = document.querySelectorAll('.footer-social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', this.handleSocialClick.bind(this));
        });
        
        console.log('✅ [FooterManager] Footer functionality initialized');
    }
    
    handleNewsletterSubmit(event) {
        event.preventDefault();
        const emailInput = event.target.querySelector('.footer-newsletter-input');
        const email = emailInput.value;
        
        if (email) {
            console.log('📧 [FooterManager] Newsletter signup:', email);
            // TODO: Implement actual newsletter signup
            emailInput.value = '';
            // Show success message
        }
    }
    
    handleSocialClick(event) {
        const platform = this.getSocialPlatform(event.currentTarget);
        console.log('📱 [FooterManager] Social link clicked:', platform);
        // TODO: Implement analytics tracking
    }
    
getSocialPlatform(linkElement) {
        const svg = linkElement.querySelector('svg path');
        if (!svg) return 'unknown';
        
        const path = svg.getAttribute('d');
        if (path.includes('24 4.557')) return 'twitter';
        if (path.includes('22.46 6')) return 'twitter';
        if (path.includes('20.447 20.452')) return 'linkedin';
        if (path.includes('12.017 0')) return 'pinterest';
        return 'unknown';
    }
    
    // =========================================================================
    // PUBLIC API METHODS
    // =========================================================================
    
    updateConfig(newConfig) {
        this.currentConfig = { ...this.currentConfig, ...newConfig };
        console.log('🔄 [FooterManager] Config updated:', this.currentConfig);
    }
    
    refresh() {
        if (this.initialized) {
            console.log('🔄 [FooterManager] Refreshing footer...');
            // Re-render with current config
            const container = document.querySelector('.footer-main')?.parentElement;
            if (container) {
                this.render(container, this.currentConfig);
            }
        }
    }
    
    destroy() {
        console.log('🗑️ [FooterManager] Destroying footer...');
        
        // Remove event listeners
        const newsletterForm = document.querySelector('.footer-newsletter-form');
        if (newsletterForm) {
            newsletterForm.removeEventListener('submit', this.handleNewsletterSubmit);
        }
        
        const socialLinks = document.querySelectorAll('.footer-social-link');
        socialLinks.forEach(link => {
            link.removeEventListener('click', this.handleSocialClick);
        });
        
        this.initialized = false;
        this.currentConfig = null;
        
        console.log('✅ [FooterManager] Footer destroyed');
    }
    
    // =========================================================================
    // UTILITY METHODS
    // =========================================================================
    
    getVersion() {
        return '2.0.0'; // Component classes version
    }
    
    getStatus() {
        return {
            initialized: this.initialized,
            config: this.currentConfig,
            version: this.getVersion(),
            componentsDetected: {
                newsletter: !!document.querySelector('.footer-newsletter-form'),
                socialLinks: document.querySelectorAll('.footer-social-link').length,
                sections: document.querySelectorAll('.footer-section').length
            }
        };
    }
}

// =============================================================================
// GLOBAL EXPORT
// =============================================================================

// Export to window for global access (maintains existing architecture)
window.FooterManager = FooterManager;

// Export for module systems (future compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FooterManager;
}

console.log('✅ [FooterManager] Class loaded with component classes support');
