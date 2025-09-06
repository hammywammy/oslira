// =============================================================================
// FOOTER-MANAGER.JS - Modular Footer Implementation
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
    // HTML TEMPLATE WITH TAILWIND
    // =========================================================================
    
    getFooterHTML() {
        return `
            <footer class="bg-gray-900 text-white">
                <div class="max-w-6xl mx-auto px-6 py-16">
                    <!-- Main Footer Content -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                        
                        <!-- Company Section -->
                        <div class="footer-section">
                            <div class="flex items-center gap-3 mb-6">
                                <img src="/assets/images/oslira-logo.png" alt="Oslira Logo" 
                                     class="w-8 h-8 object-contain">
                                <h3 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    ${this.currentConfig.companyName}
                                </h3>
                            </div>
                            <p class="text-gray-300 leading-relaxed mb-6">
                                Transform your business with AI-powered automation and intelligent workflows.
                            </p>
                            ${this.currentConfig.showSocialLinks ? this.getSocialLinksHTML() : ''}
                        </div>
                        
                        <!-- Product Section -->
                        <div class="footer-section">
                            <h3 class="text-lg font-semibold mb-4 text-white">Product</h3>
                            <ul class="space-y-2">
                                <li><a href="/footer/about" class="text-gray-300 hover:text-white transition-colors duration-200">About</a></li>
                                <li><a href="/footer/pricing" class="text-gray-300 hover:text-white transition-colors duration-200">Pricing</a></li>
                                <li><a href="/footer/case-studies" class="text-gray-300 hover:text-white transition-colors duration-200">Case Studies</a></li>
                                <li><a href="/footer/status" class="text-gray-300 hover:text-white transition-colors duration-200">Status</a></li>
                            </ul>
                        </div>
                        
                        <!-- Resources Section -->
                        <div class="footer-section">
                            <h3 class="text-lg font-semibold mb-4 text-white">Resources</h3>
                            <ul class="space-y-2">
                                <li><a href="/footer/guides" class="text-gray-300 hover:text-white transition-colors duration-200">Guides</a></li>
                                <li><a href="/footer/api" class="text-gray-300 hover:text-white transition-colors duration-200">API Docs</a></li>
                                <li><a href="/footer/help" class="text-gray-300 hover:text-white transition-colors duration-200">Help Center</a></li>
                                <li><a href="/footer/security" class="text-gray-300 hover:text-white transition-colors duration-200">Security</a></li>
                            </ul>
                        </div>
                        
                        <!-- Legal Section -->
                        <div class="footer-section">
                            <h3 class="text-lg font-semibold mb-4 text-white">Legal</h3>
                            <ul class="space-y-2">
                                <li><a href="/footer/legal/privacy" class="text-gray-300 hover:text-white transition-colors duration-200">Privacy Policy</a></li>
                                <li><a href="/footer/legal/terms" class="text-gray-300 hover:text-white transition-colors duration-200">Terms of Service</a></li>
                                <li><a href="/footer/legal/refund" class="text-gray-300 hover:text-white transition-colors duration-200">Refund Policy</a></li>
                                <li><a href="/footer/legal/disclaimer" class="text-gray-300 hover:text-white transition-colors duration-200">Disclaimer</a></li>
                            </ul>
                        </div>
                        
                    </div>
                    
                    <!-- Newsletter Section -->
                    ${this.currentConfig.showNewsletter ? this.getNewsletterHTML() : ''}
                    
                    <!-- Footer Bottom -->
                    <div class="border-t border-gray-800 pt-8 mt-8">
                        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                            <p class="text-gray-400 text-sm">
                                © ${this.currentConfig.year} ${this.currentConfig.companyName}. All rights reserved.
                            </p>
                            <div class="flex items-center gap-6">
                                <a href="/footer/legal/privacy" class="text-gray-400 hover:text-white text-sm transition-colors duration-200">Privacy</a>
                                <a href="/footer/legal/terms" class="text-gray-400 hover:text-white text-sm transition-colors duration-200">Terms</a>
                                <a href="/footer/help" class="text-gray-400 hover:text-white text-sm transition-colors duration-200">Support</a>
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
            <div class="flex gap-4">
                <a href="#" class="text-gray-400 hover:text-white transition-colors duration-200 group">
                    <svg class="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                </a>
                <a href="#" class="text-gray-400 hover:text-white transition-colors duration-200 group">
                    <svg class="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                    </svg>
                </a>
                <a href="#" class="text-gray-400 hover:text-white transition-colors duration-200 group">
                    <svg class="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                </a>
            </div>
        `;
    }
    
    getNewsletterHTML() {
        return `
            <div class="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl p-8 mb-8 border border-blue-500/20">
                <div class="text-center max-w-md mx-auto">
                    <h3 class="text-xl font-bold mb-2">Stay Updated</h3>
                    <p class="text-gray-300 mb-6">Get the latest updates and insights delivered to your inbox.</p>
                    <form class="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="email" 
                            placeholder="Enter your email" 
                            class="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                        >
                        <button 
                            type="submit" 
                            class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            Subscribe
                        </button>
                    </form>
                </div>
            </div>
        `;
    }
    
    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    
    initializeFooter() {
        this.setupNewsletterForm();
        this.setupLinkHandling();
        
        this.initialized = true;
        console.log('✅ [FooterManager] Footer functionality initialized');
    }
    
    setupNewsletterForm() {
        const form = document.querySelector('footer form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = form.querySelector('input[type="email"]').value;
                if (email) {
                    console.log('Newsletter signup:', email);
                    // Implement newsletter signup logic
                }
            });
        }
    }
    
    setupLinkHandling() {
        // Add any special link handling if needed
        console.log('🔗 [FooterManager] Link handling setup complete');
    }
}

// =============================================================================
// GLOBAL EXPOSURE
// =============================================================================

window.FooterManager = FooterManager;
console.log('✅ [FooterManager] Class loaded and exposed globally');
