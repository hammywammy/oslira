// Tailwind CSS dynamic loader with fallback
(function() {
    'use strict';
    
    function loadTailwindCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/css/tailwind.css';
        link.id = 'tailwind-css';
        
        link.onload = function() {
            console.log('✅ [TailwindLoader] Tailwind CSS loaded successfully');
            document.documentElement.classList.add('tailwind-loaded');
        };
        
        link.onerror = function() {
            console.warn('⚠️ [TailwindLoader] Failed to load Tailwind CSS, using fallback');
            // Load from CDN as fallback
            const fallbackLink = document.createElement('link');
            fallbackLink.rel = 'stylesheet';
            fallbackLink.href = 'https://cdn.tailwindcss.com';
            fallbackLink.id = 'tailwind-css-fallback';
            document.head.appendChild(fallbackLink);
        };
        
        document.head.appendChild(link);
    }
    
    // Load immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadTailwindCSS);
    } else {
        loadTailwindCSS();
    }
})();
