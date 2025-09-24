// =============================================================================
// FOOTER-MANAGER.JS - COMPLETELY REDESIGNED VERSION
// =============================================================================

class FooterManager {
    constructor() {
        this.initialized = false;
        this.currentConfig = null;
    }
    
    render(container, config = {}) {
        try {
            console.log('🦶 [FooterManager] Rendering NEW REDESIGNED footer...');
            
            this.currentConfig = {
                showSocialLinks: true,
                showNewsletter: true,
                year: new Date().getFullYear(),
                companyName: 'Oslira',
                ...config
            };
            
            const targetElement = typeof container === 'string' 
                ? document.getElementById(container) || document.querySelector(container)
                : container;
                
            if (!targetElement) {
                throw new Error(`Container element not found: ${container}`);
            }
            
            // Inject completely new footer HTML
            targetElement.innerHTML = this.getNewFooterHTML();
            targetElement.className = 'w-full';
            
            this.initializeFooter();
            
            console.log('✅ [FooterManager] NEW REDESIGNED footer rendered successfully');
            return this;
            
        } catch (error) {
            console.error('❌ [FooterManager] Render failed:', error);
            throw error;
        }
    }
    
    getNewFooterHTML() {
        return `
            <footer class="new-footer-main">
                <div class="new-footer-container">
                    
                    <!-- Single Row Layout -->
                    <div class="new-footer-content">
                        
                        <!-- Left: Company Info -->
                        <div class="new-footer-brand">
                            <div class="new-footer-logo">
                                <img src="/assets/images/oslira-logo.png" alt="Oslira" class="new-footer-logo-img">
                                <span class="new-footer-company">${this.currentConfig.companyName}</span>
                            </div>
                            <p class="new-footer-tagline">
                                Transform your business with AI-powered automation and intelligent workflows.
                            </p>
                        </div>
                        
                        <!-- Center: Navigation -->
<div class="new-footer-nav">
                            <div class="new-footer-nav-group">
                                <h4 class="new-footer-nav-title">Product</h4>
                                <a href="/footer/about" class="new-footer-nav-link">About</a>
                                <a href="/footer/pricing" class="new-footer-nav-link">Pricing</a>
                                <a href="/footer/case-studies" class="new-footer-nav-link">Case Studies</a>
                                <a href="/footer/status" class="new-footer-nav-link">Status</a>
                            </div>
                            <div class="new-footer-nav-group">
                                <h4 class="new-footer-nav-title">Resources</h4>
                                <a href="/footer/guides" class="new-footer-nav-link">Guides</a>
                                <a href="/footer/api" class="new-footer-nav-link">API Docs</a>
                                <a href="/footer/help" class="new-footer-nav-link">Help Center</a>
                                <a href="/footer/security" class="new-footer-nav-link">Security</a>
                            </div>
                            <div class="new-footer-nav-group">
                                <h4 class="new-footer-nav-title">Legal</h4>
                                <a href="/footer/privacy" class="new-footer-nav-link">Privacy Policy</a>
                                <a href="/footer/terms" class="new-footer-nav-link">Terms of Service</a>
                                <a href="/footer/refund" class="new-footer-nav-link">Refund Policy</a>
                                <a href="/footer/disclaimer" class="new-footer-nav-link">Disclaimer</a>
                            </div>
                        </div>
                        
                        <!-- Right: Newsletter -->
                        <div class="new-footer-newsletter">
                            <h3 class="new-footer-newsletter-title">Stay Updated</h3>
                            <p class="new-footer-newsletter-desc">Get the latest updates and insights delivered to your inbox.</p>
                            <div class="new-footer-newsletter-form">
                                <input type="email" placeholder="Enter your email" class="new-footer-email-input">
                                <button type="button" class="new-footer-subscribe-btn">Subscribe</button>
                            </div>
                        </div>
                        
                    </div>
                    
                    <!-- Bottom Row -->
                    <div class="new-footer-bottom">
                        <div class="new-footer-bottom-content">
                            <p class="new-footer-copyright">
                                © ${this.currentConfig.year} ${this.currentConfig.companyName}. All rights reserved.
                            </p>
                            
                            <!-- Social Links -->
                            <div class="new-footer-social">
                                <a href="https://twitter.com/oslira" class="new-footer-social-link">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                                    </svg>
                                </a>
                                <a href="https://linkedin.com/company/oslira" class="new-footer-social-link">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                </a>
                            </div>
                            
                            <!-- Legal Links -->
                            <div class="new-footer-legal">
                                <a href="/footer/legal/privacy" class="new-footer-legal-link">Privacy</a>
                                <a href="/footer/legal/terms" class="new-footer-legal-link">Terms</a>
                                <a href="/footer/help" class="new-footer-legal-link">Support</a>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </footer>
        `;
    }
    
    initializeFooter() {
        console.log('🔧 [FooterManager] Initializing NEW footer functionality...');
        
        // Newsletter form handler
        const subscribeBtn = document.querySelector('.new-footer-subscribe-btn');
        const emailInput = document.querySelector('.new-footer-email-input');
        
        if (subscribeBtn && emailInput) {
            subscribeBtn.addEventListener('click', () => {
                const email = emailInput.value.trim();
                if (email && email.includes('@')) {
                    subscribeBtn.textContent = 'Subscribed!';
                    subscribeBtn.style.backgroundColor = '#10b981';
                    emailInput.value = '';
                    setTimeout(() => {
                        subscribeBtn.textContent = 'Subscribe';
                        subscribeBtn.style.backgroundColor = '';
                    }, 2000);
                }
            });
        }
        
        this.initialized = true;
        console.log('✅ [FooterManager] NEW footer functionality initialized');
    }
    
    // Keep existing utility methods
    updateConfig(newConfig) {
        this.currentConfig = { ...this.currentConfig, ...newConfig };
    }
    
    refresh() {
        if (this.initialized) {
            const container = document.querySelector('.new-footer-main')?.parentElement;
            if (container) {
                this.render(container, this.currentConfig);
            }
        }
    }
    
    destroy() {
        this.initialized = false;
        this.currentConfig = null;
    }
    
    getVersion() {
        return '4.0.0-redesigned';
    }
    
    getStatus() {
        return {
            initialized: this.initialized,
            config: this.currentConfig,
            version: this.getVersion()
        };
    }
}

// Export
window.FooterManager = FooterManager;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FooterManager;
}

console.log('✅ [FooterManager] COMPLETELY NEW REDESIGNED footer manager loaded v4.0.0');
