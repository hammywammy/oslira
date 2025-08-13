// MODIFIED ALERT SYSTEM - COMPATIBLE WITH STAGING GUARD
// Place this BEFORE staging-guard.js in your HTML

(function() {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const CONFIG = {
        maxVisible: 3,
        zIndex: 99999,
        topOffset: 20,
        containerId: 'oslira-alert-container',
        historyKey: 'oslira-alerts-history',
        maxHistory: 100,
        dedupeWindowMs: 3000,
        animationDuration: 300,
        defaultTimeout: {
            success: 5000,
            info: 5000,
            warning: 8000,
            error: null // Sticky by default
        }
    };

    // =========================================================================
    // CRITICAL ERROR PATTERNS - Only show these to users
    // =========================================================================
    const CRITICAL_PATTERNS = [
        // Auth/Security
        /unauthorized|forbidden|401|403/i,
        /session\s*expired|jwt\s*expired/i,
        /not\s*authenticated|not\s*logged/i,
        
        // Payment/Credits
        /insufficient|credits|payment|stripe/i,
        /subscription|billing/i,
        
        // Data Loss
        /failed\s*to\s*save|could\s*not\s*save/i,
        /data\s*loss|lost\s*data/i,
        
        // Critical Failures
        /critical|fatal|severe/i,
        /database|connection\s*failed/i,
        /api\s*error|server\s*error|500|502|503/i,
        
        // User Actions Failed
        /analysis\s*failed|failed\s*to\s*analyze/i,
        /export\s*failed|download\s*failed/i,
        /could\s*not\s*load|failed\s*to\s*load/i
    ];

    // =========================================================================
    // IGNORE PATTERNS - Never show these (development noise)
    // =========================================================================
    const IGNORE_PATTERNS = [
        // Development logs with emojis
        /^📊|^🔍|^✅|^❌|^🎯|^📝|^🚀|^🔧|^⚡|^🌐/,
        /debug:|info:|trace:/i,
        
        // Browser noise
        /ResizeObserver|Non-Error promise rejection captured/i,
        
        // Third-party noise
        /gtag|google|analytics|facebook|stripe\.js/i,
        /extension:|chrome-extension:/i,
        
        // Expected conditions
        /no\s*business\s*profiles/i,
        /no\s*leads\s*found/i,
        /waiting|pending|loading/i
    ];

    // =========================================================================
    // ERROR MAPPINGS
    // =========================================================================
    const ERROR_MAPPINGS = {
        'Failed to fetch': {
            title: 'Connection Problem',
            message: 'Unable to connect. Please check your internet connection.',
            suggestions: ['Check your internet', 'Try refreshing the page']
        },
        'JWT expired': {
            title: 'Session Expired',
            message: 'Your session has expired. Please log in again.',
            actions: [{ label: 'Go to Login', action: 'redirect:/auth.html' }]
        },
        'Insufficient credits': {
            title: 'Not Enough Credits',
            message: 'You need more credits for this action.',
            actions: [{ label: 'Get Credits', action: 'redirect:/pricing.html' }]
        },
        'Profile not found': {
            title: 'Profile Not Found',
            message: 'We couldn\'t find that Instagram profile.',
            suggestions: ['Verify the username', 'Remove @ symbol', 'Check if profile is public']
        }
    };

    // =========================================================================
    // ALERT SYSTEM CLASS
    // =========================================================================
    class OsliraAlertSystem {
        constructor() {
            this.queue = [];
            this.visible = new Map();
            this.history = [];
            this.dedupeMap = new Map();
            this.initialized = false;
            this.container = null;
            this.originalConsole = null;
            this.pausedAlerts = new Set();
        }

        init() {
            if (this.initialized) return;
            
            // Store original console methods BEFORE staging guard disables them
            this.originalConsole = {
                log: console.log,
                warn: console.warn,
                error: console.error,
                info: console.info
            };
            
            this.createContainer();
            this.loadHistory();
            this.createStyles();
            this.setupGlobalErrorHandling();
            this.setupCompatibilityLayer();
            this.detectPageContext();
            
            this.initialized = true;
            
            // Use original console.log to announce readiness
            this.originalConsole.log('✅ Alert System ready');
        }

        // ---------------------------------------------------------------------
        // CRITICAL ERROR DETECTION
        // ---------------------------------------------------------------------
        isErrorCritical(error, context = {}) {
            const errorStr = typeof error === 'string' ? error : error?.message || error?.toString() || '';
            
            // Check ignore patterns first
            for (const pattern of IGNORE_PATTERNS) {
                if (pattern.test(errorStr)) {
                    return false;
                }
            }
            
            // Check critical patterns
            for (const pattern of CRITICAL_PATTERNS) {
                if (pattern.test(errorStr)) {
                    return true;
                }
            }
            
            // Context-based decisions
            if (context.critical || context.userAction) {
                return true;
            }
            
            return error instanceof Error && !errorStr.includes('console.');
        }

        // ---------------------------------------------------------------------
        // MAIN API METHODS
        // ---------------------------------------------------------------------
        notify(severity, options) {
            if (typeof options === 'string') {
                options = { message: options };
            }
            
            const alert = {
                id: options.id || this.generateId(),
                severity: severity,
                title: options.title || this.getDefaultTitle(severity),
                message: options.message,
                details: options.details,
                actions: options.actions || [],
                suggestions: options.suggestions,
                timeoutMs: options.timeoutMs !== undefined ? options.timeoutMs : CONFIG.defaultTimeout[severity],
                dedupeKey: options.dedupeKey,
                timestamp: Date.now(),
                context: options.context
            };
            
            // Deduplication check
            if (alert.dedupeKey && this.dedupeMap.has(alert.dedupeKey)) {
                const existing = this.dedupeMap.get(alert.dedupeKey);
                if (Date.now() - existing.timestamp < CONFIG.dedupeWindowMs) {
                    this.updateDupeCount(existing.id);
                    return existing.id;
                }
            }
            
            this.queue.push(alert);
            
            if (alert.dedupeKey) {
                this.dedupeMap.set(alert.dedupeKey, alert);
            }
            
            this.processQueue();
            this.addToHistory(alert);
            
            return alert.id;
        }

        success(options) { return this.notify('success', options); }
        info(options) { return this.notify('info', options); }
        warning(options) { return this.notify('warning', options); }
        
        error(error, options = {}) {
            // Critical error filtering
            if (!this.isErrorCritical(error, options.context)) {
                // Use original console.log for suppressed errors (if available)
                if (this.originalConsole?.log) {
                    this.originalConsole.log('🔇 Non-critical error suppressed:', error);
                }
                return null;
            }
            
            let errorOptions = options;
            
            if (error instanceof Error || typeof error === 'string') {
                const transformed = this.transformError(error);
                errorOptions = {
                    ...transformed,
                    ...options,
                    details: options.details || error.stack || error.toString()
                };
            }
            
            return this.notify('error', errorOptions);
        }

        // ---------------------------------------------------------------------
        // ERROR TRANSFORMATION
        // ---------------------------------------------------------------------
        transformError(error) {
            const errorStr = typeof error === 'string' ? error : error?.message || '';
            
            for (const [pattern, mapping] of Object.entries(ERROR_MAPPINGS)) {
                if (errorStr.includes(pattern)) {
                    return mapping;
                }
            }
            
            return {
                title: 'Something Went Wrong',
                message: 'An unexpected error occurred. Please try again.',
                details: errorStr
            };
        }

        // ---------------------------------------------------------------------
        // GLOBAL ERROR HANDLING - MODIFIED FOR STAGING GUARD COMPATIBILITY
        // ---------------------------------------------------------------------
        setupGlobalErrorHandling() {
            // Store original console.error BEFORE it gets disabled
            const originalError = this.originalConsole.error;
            
            // Capture unhandled errors
            window.addEventListener('error', (event) => {
                if (this.isErrorCritical(event.error || event.message, { context: 'global' })) {
                    this.error(event.error || event.message, {
                        context: 'JavaScript Error',
                        details: `Line ${event.lineno}, Column ${event.colno}\nFile: ${event.filename}`
                    });
                }
            });
            
            // Capture unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                if (this.isErrorCritical(event.reason, { context: 'promise' })) {
                    this.error(event.reason, {
                        context: 'Unhandled Promise'
                    });
                }
            });
            
            // Create a safe console.error interceptor that won't conflict with staging guard
            window._originalError = originalError; // Preserve for staging guard
            
            // Don't override console.error here - let staging guard handle it
            // Instead, provide a way for other code to trigger alerts directly
        }

        // ---------------------------------------------------------------------
        // COMPATIBILITY LAYER
        // ---------------------------------------------------------------------
        setupCompatibilityLayer() {
            // Support for existing OsliraApp.showMessage
            window.OsliraApp = window.OsliraApp || {};
            window.OsliraApp.showMessage = (message, type = 'info', duration) => {
                const method = type === 'error' ? 'error' : type;
                return this[method]({
                    message: message,
                    timeoutMs: duration
                });
            };
            
            // Support for showError functions
            window.showError = (message) => this.error(message);
            window.showSuccess = (message) => this.success({ message });
            window.showMessage = window.OsliraApp.showMessage;
        }

        // ---------------------------------------------------------------------
        // DOM CREATION & RENDERING (keep all the existing DOM methods...)
        // ---------------------------------------------------------------------
        createContainer() {
            const existing = document.getElementById(CONFIG.containerId);
            if (existing) existing.remove();
            
            this.container = document.createElement('div');
            this.container.id = CONFIG.containerId;
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-label', 'Notifications');
            this.container.setAttribute('aria-live', 'polite');
            
            document.body.appendChild(this.container);
        }

        createStyles() {
            const styleId = 'oslira-alert-styles';
            if (document.getElementById(styleId)) return;
            
            const styles = document.createElement('style');
            styles.id = styleId;
            styles.textContent = `
                #${CONFIG.containerId} {
                    position: fixed;
                    top: ${CONFIG.topOffset}px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: ${CONFIG.zIndex};
                    pointer-events: none;
                    max-width: 480px;
                    min-width: 320px;
                    width: 90vw;
                }
                
                .oslira-alert {
                    pointer-events: auto;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                    margin-bottom: 12px;
                    overflow: hidden;
                    animation: osliraSlideDown 0.3s ease-out;
                    position: relative;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                
                .oslira-alert.removing {
                    animation: osliraSlideUp 0.3s ease-out forwards;
                }
                
                .oslira-alert-content {
                    padding: 16px;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                
                .oslira-alert-icon {
                    flex-shrink: 0;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: bold;
                    color: white;
                }
                
                .oslira-alert-success .oslira-alert-icon { background: #10b981; }
                .oslira-alert-info .oslira-alert-icon { background: #3b82f6; }
                .oslira-alert-warning .oslira-alert-icon { background: #f59e0b; }
                .oslira-alert-error .oslira-alert-icon { background: #ef4444; }
                
                .oslira-alert-body {
                    flex: 1;
                    min-width: 0;
                }
                
                .oslira-alert-title {
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 4px;
                    font-size: 15px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .oslira-alert-message {
                    color: #6b7280;
                    font-size: 14px;
                    line-height: 1.5;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .oslira-alert-close {
                    flex-shrink: 0;
                    width: 32px;
                    height: 32px;
                    border: none;
                    background: transparent;
                    color: #9ca3af;
                    cursor: pointer;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    font-size: 18px;
                }
                
                .oslira-alert-close:hover {
                    background: rgba(0,0,0,0.05);
                    color: #6b7280;
                }
                
                @keyframes osliraSlideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes osliraSlideUp {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                }
            `;
            
            document.head.appendChild(styles);
        }

        // Add all other methods (renderAlert, processQueue, etc. - keeping them the same)
        renderAlert(alert) {
            const alertEl = document.createElement('div');
            alertEl.id = `alert-${alert.id}`;
            alertEl.className = `oslira-alert oslira-alert-${alert.severity}`;
            alertEl.setAttribute('role', alert.severity === 'error' ? 'alert' : 'status');
            
            alertEl.innerHTML = `
                <div class="oslira-alert-content">
                    <div class="oslira-alert-icon">${this.getIcon(alert.severity)}</div>
                    <div class="oslira-alert-body">
                        <div class="oslira-alert-title">${alert.title}</div>
                        <div class="oslira-alert-message">${alert.message}</div>
                    </div>
                    <button class="oslira-alert-close" data-alert-id="${alert.id}" aria-label="Dismiss">
                        ✕
                    </button>
                </div>
            `;
            
            // Add event listeners
            const closeBtn = alertEl.querySelector('.oslira-alert-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.dismiss(alert.id));
            }
            
            return alertEl;
        }

        processQueue() {
            while (this.queue.length > 0 && this.visible.size < CONFIG.maxVisible) {
                const alert = this.queue.shift();
                this.showAlert(alert);
            }
        }

        showAlert(alert) {
            const alertEl = this.renderAlert(alert);
            this.container.appendChild(alertEl);
            this.visible.set(alert.id, alert);
            
            if (alert.timeoutMs) {
                alert.timeoutId = setTimeout(() => this.dismiss(alert.id), alert.timeoutMs);
            }
            
            alertEl.offsetHeight; // Trigger reflow
        }

        dismiss(alertId) {
            const alert = this.visible.get(alertId);
            if (!alert) return;
            
            const alertEl = document.getElementById(`alert-${alertId}`);
            if (alertEl) {
                alertEl.classList.add('removing');
                setTimeout(() => {
                    alertEl.remove();
                    this.visible.delete(alertId);
                    this.processQueue();
                }, CONFIG.animationDuration);
            }
            
            if (alert.timeoutId) {
                clearTimeout(alert.timeoutId);
            }
        }

        // Utility methods
        generateId() {
            return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        getIcon(severity) {
            const icons = { success: '✓', info: 'i', warning: '!', error: '✕' };
            return icons[severity] || 'i';
        }

        getDefaultTitle(severity) {
            const titles = { success: 'Success', info: 'Information', warning: 'Warning', error: 'Error' };
            return titles[severity] || 'Notification';
        }

        addToHistory(alert) {
            this.history.unshift(alert);
            if (this.history.length > CONFIG.maxHistory) {
                this.history = this.history.slice(0, CONFIG.maxHistory);
            }
        }

        detectPageContext() {
            const path = window.location.pathname;
            if (path.includes('dashboard')) {
                CONFIG.topOffset = 80;
            }
        }

        // Public testing API
        test() {
            this.success({ message: 'Test success message' });
            this.info({ message: 'Test info message' });
            this.warning({ message: 'Test warning message' });
            this.error('Test error message');
        }

        getStats() {
            return {
                visible: this.visible.size,
                queued: this.queue.length,
                historyCount: this.history.length
            };
        }
    }

    // =========================================================================
    // INSTANTIATION
    // =========================================================================
    const alertSystem = new OsliraAlertSystem();
    
    // Expose global APIs
    window.AlertSystem = alertSystem;
    window.Alert = alertSystem;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => alertSystem.init());
    } else {
        setTimeout(() => alertSystem.init(), 0);
    }
})();
