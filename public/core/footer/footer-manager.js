// =============================================================================
// FOOTER-MANAGER.JS - Modern Clean Design
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
    // MODERN CLEAN FOOTER HTML
    // =========================================================================
    
    getFooterHTML() {
        return `
            <footer class="footer-main">
                <div class="footer-container">
                    <!-- Main Footer Grid -->
                    <div class="footer-grid">
                        
                        <!-- Company Branding -->
                        <div class="footer-section footer-brand">
                            <div class="footer-logo-container">
                                <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" class="footer-logo-image">
                                <h3 class="footer-company-name">${this.currentConfig.companyName}</h3>
                            </div>
                            <p class="footer-company-description">
                                Transform your business with AI-powered automation and intelligent workflows.
                            </p>
                            ${this.currentConfig.showSocialLinks ? this.getSocialLinksHTML() : ''}
                        </div>
                        
                        <!-- Product Links -->
                        <div class="footer-section">
                            <h4 class="footer-section-title">Product</h4>
                            <nav class="footer-nav-list">
                                <a href="/footer/about" class="footer-link">About</a>
                                <a href="/footer/pricing" class="footer-link">Pricing</a>
                                <a href="/footer/case-studies" class="footer-link">Case Studies</a>
                                <a href="/footer/status" class="footer-link">Status</a>
                            </nav>
                        </div>
                        
                        <!-- Resources Links -->
                        <div class="footer-section">
                            <h4 class="footer-section-title">Resources</h4>
                            <nav class="footer-nav-list">
                                <a href="/footer/guides" class="footer-link">Guides</a>
                                <a href="/footer/api" class="footer-link">API Docs</a>
                                <a href="/footer/help" class="footer-link">Help Center</a>
                                <a href="/footer/security" class="footer-link">Security</a>
                            </nav>
                        </div>
                        
                        <!-- Newsletter Section -->
                        <div class="footer-section footer-newsletter-section">
                            ${this.currentConfig.showNewsletter ? this.getNewsletterHTML() : ''}
                        </div>
                        
                    </div>
                    
                    <!-- Footer Bottom -->
                    <div class="footer-bottom">
                        <div class="footer-bottom-content">
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
    // COMPONENT SECTIONS
    // =========================================================================
    
    getSocialLinksHTML() {
        return `
            <div class="footer-social-container">
                <a href="https://twitter.com/oslira" class="footer-social-link" target="_blank" rel="noopener">
                    <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                    </svg>
                </a>
                <a href="https://linkedin.com/company/oslira" class="footer-social-link" target="_blank" rel="noopener">
                    <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
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
    
    // =========================================================================
    // FOOTER FUNCTIONALITY
    // =========================================================================
    
    initializeFooter() {
        console.log('🔧 [FooterManager] Initializing footer functionality...');
        
        this.setupNewsletterForm();
        this.setupSocialLinks();
        this.initialized = true;
        
        console.log('✅ [FooterManager] Footer functionality initialized');
    }
    
    setupNewsletterForm() {
        const form = document.querySelector('.footer-newsletter-form');
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewsletterSubmit(e);
        });
    }
    
    setupSocialLinks() {
        const socialLinks = document.querySelectorAll('.footer-social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleSocialClick(e);
            });
        });
    }
    
    handleNewsletterSubmit(e) {
        const form = e.target;
        const emailInput = form.querySelector('.footer-newsletter-input');
        const button = form.querySelector('.footer-newsletter-button');
        
        if (!emailInput.value || !emailInput.validity.valid) {
            emailInput.focus();
            return;
        }
        
        // Show loading state
        const originalText = button.textContent;
        button.textContent = 'Subscribing...';
        button.disabled = true;
        
        // Simulate subscription (replace with actual API call)
        setTimeout(() => {
            button.textContent = 'Subscribed!';
            button.style.background = '#10b981';
            emailInput.value = '';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
                button.style.background = '';
            }, 2000);
        }, 1000);
        
        console.log('📧 [Footer] Newsletter subscription:', emailInput.value);
    }
    
    handleSocialClick(e) {
        const link = e.currentTarget;
        const platform = link.href.includes('twitter') ? 'twitter' : 'linkedin';
        console.log('🔗 [Footer] Social link clicked:', platform);
    }
    
    // =========================================================================
    // UTILITY METHODS
    // =========================================================================
    
    updateConfig(newConfig) {
        this.currentConfig = { ...this.currentConfig, ...newConfig };
        console.log('🔄 [FooterManager] Config updated:', this.currentConfig);
    }
    
    refresh() {
        if (this.initialized) {
            console.log('🔄 [FooterManager] Refreshing footer...');
            const container = document.querySelector('.footer-main')?.parentElement;
            if (container) {
                this.render(container, this.currentConfig);
            }
        }
    }
    
    destroy() {
        console.log('🗑️ [FooterManager] Destroying footer...');
        
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
    
    getVersion() {
        return '3.0.0'; // Modern clean version
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

window.FooterManager = FooterManager;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FooterManager;
}

console.log('✅ [FooterManager] Modern clean footer loaded');
