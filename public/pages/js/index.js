        // Demo form handler
        async function handleDemo(event) {
            event.preventDefault();
            
            const form = event.target;
            const input = document.getElementById('demo-input');
            const username = input.value.trim().replace('@', '');
            
            if (!username) {
                showMessage('Please enter a valid Instagram username', 'error');
                return;
            }
            
            // Validate username format
            if (!validateUsername(username)) {
                showMessage('Please enter a valid Instagram username', 'error');
                return;
            }
            
            // Add loading state
            form.classList.add('demo-loading');
            const button = form.querySelector('.demo-button');
            const originalText = button.textContent;
            button.textContent = 'Analyzing...';
            button.disabled = true;
            
            try {
                // Simulate analysis delay
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Store the username for the auth page
                sessionStorage.setItem('demo_username', username);
                
                // Redirect to signup with demo context
                window.location.href = `/auth.html?demo=${encodeURIComponent(username)}`;
                
            } catch (error) {
                console.error('Demo error:', error);
                showMessage('Something went wrong. Please try again.', 'error');
            } finally {
                // Remove loading state
                form.classList.remove('demo-loading');
                button.textContent = originalText;
                button.disabled = false;
            }
        }

        // Validate username format
        function validateUsername(username) {
            const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
            return usernameRegex.test(username) && 
                   !username.includes('..') && 
                   !username.startsWith('.') && 
                   !username.endsWith('.');
        }

        // Show message function
        function showMessage(text, type = 'success') {
            const message = document.createElement('div');
            message.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                background: ${type === 'success' ? 'var(--success)' : 'var(--error)'};
            `;
            message.textContent = text;
            document.body.appendChild(message);

            setTimeout(() => {
                message.style.opacity = '1';
                message.style.transform = 'translateX(0)';
            }, 100);

            setTimeout(() => {
                message.style.opacity = '0';
                message.style.transform = 'translateX(100%)';
                setTimeout(() => message.remove(), 300);
            }, 3000);
        }

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Enhanced navigation scroll effect
        window.addEventListener('scroll', () => {
            const nav = document.querySelector('nav');
            if (window.scrollY > 100) {
                nav.style.background = 'rgba(255, 255, 255, 0.98)';
                nav.style.boxShadow = '0 4px 20px rgba(45, 108, 223, 0.1)';
            } else {
                nav.style.background = 'rgba(255, 255, 255, 0.95)';
                nav.style.boxShadow = 'none';
            }
        });

        // Intersection Observer for feature animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Initialize feature card animations
        document.addEventListener('DOMContentLoaded', () => {
            const featureCards = document.querySelectorAll('.feature-card');
            featureCards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
                observer.observe(card);
            });

            // Also animate step cards
            const stepCards = document.querySelectorAll('.step');
            stepCards.forEach((step, index) => {
                step.style.opacity = '0';
                step.style.transform = 'translateY(30px)';
                step.style.transition = `opacity 0.6s ease ${index * 0.2}s, transform 0.6s ease ${index * 0.2}s`;
                observer.observe(step);
            });
        });

        // Keyboard navigation support
        document.addEventListener('keydown', function(event) {
            // Allow Enter key to trigger button clicks
            if (event.key === 'Enter' && event.target.classList.contains('cta-button')) {
                event.target.click();
            }
        });

        // Screen reader announcements for dynamic content
        function announceToScreenReader(message) {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            announcement.textContent = message;
            
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        }

        // Enhanced demo form with better accessibility
        const demoForm = document.querySelector('.demo-form');
        const demoInput = document.getElementById('demo-input');

        demoInput.addEventListener('input', function() {
            // Remove any invalid characters as user types
            this.value = this.value.replace(/[^a-zA-Z0-9._@]/g, '');
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            // Alt + D to focus demo input
            if (event.altKey && event.key === 'd') {
                event.preventDefault();
                demoInput.focus();
                announceToScreenReader('Demo input focused. Enter an Instagram username to analyze.');
            }
        });

        // Performance optimization - lazy load images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }

        // Error boundary for JavaScript errors
        window.addEventListener('error', function(event) {
            console.error('JavaScript error:', event.error);
            // Don't expose errors to users in production
        });

        // Prevent form submission if JavaScript fails
        window.addEventListener('beforeunload', function() {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                if (form.classList.contains('demo-loading')) {
                    form.classList.remove('demo-loading');
                    const button = form.querySelector('button[type="submit"]');
                    if (button) {
                        button.disabled = false;
                        button.textContent = 'Analyze Profile';
                    }
                }
            });
        });
