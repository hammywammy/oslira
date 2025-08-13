/*!
 * Oslira Universal Alert System v1.0.0
 * Self-contained, zero-dependency alert system
 * Add to any page: <script src="/assets/js/alert-system.min.js"></script>
 */

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
    // ERROR MAPPINGS - Transform technical errors to user-friendly messages
    // =========================================================================
    const ERROR_MAPPINGS = {
        // Network Errors
        'Failed to fetch': {
            title: 'Connection Problem',
            message: 'Unable to connect to our servers. Please check your internet connection.',
            suggestions: ['Check your internet', 'Try refreshing the page']
        },
        'NetworkError': {
            title: 'Network Issue',
            message: 'Having trouble reaching our servers.',
            suggestions: ['Check connection', 'Try again']
        },
        
        // Auth Errors
        'JWT expired': {
            title: 'Session Expired',
            message: 'Your session has expired. Please log in again.',
            actions: [{ label: 'Go to Login', action: 'redirect:/auth.html' }]
        },
        'User not authenticated': {
            title: 'Login Required',
            message: 'Please log in to continue.',
            actions: [{ label: 'Login', action: 'redirect:/auth.html' }]
        },
        
        // Credit Errors
        'Insufficient credits': {
            title: 'Not Enough Credits',
            message: 'You need more credits for this action.',
            actions: [{ label: 'Get Credits', action: 'redirect:/pricing.html' }]
        },
        
        // Supabase Errors
        'Invalid API key': {
            title: 'Configuration Error',
            message: 'There\'s an issue with our setup. Our team has been notified.',
            severity: 'critical'
        },
        
        // Analysis Errors
        'Profile not found': {
            title: 'Profile Not Found',
            message: 'We couldn\'t find that Instagram profile. Please check the username.',
            suggestions: ['Verify the username', 'Remove @ symbol', 'Check if profile is public']
        },
        'Analysis failed': {
            title: 'Analysis Failed',
            message: 'We couldn\'t complete the analysis. Please try again.',
            actions: [{ label: 'Retry', action: 'retry' }]
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
    // IGNORE PATTERNS - Never show these to users (development noise)
    // =========================================================================
    const IGNORE_PATTERNS = [
        // Development logs
        /console\.(log|debug|info)/i,
        /^📊|^🔍|^✅|^❌|^🎯|^📝|^🚀/,  // Emoji debug logs
        /debug:|info:|trace:/i,
        
        // Browser noise
        /ResizeObserver|Non-Error promise rejection captured/i,
        /Non-Error promise rejection/i,
        
        // Third-party noise
        /gtag|google|analytics|facebook|stripe\.js/i,
        /extension:|chrome-extension:/i,
        
        // Expected conditions
        /no\s*business\s*profiles/i,
        /no\s*leads\s*found/i,
        /waiting|pending|loading/i
    ];

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
            this.historyPanel = null;
            this.pausedAlerts = new Set();
        }

        // ---------------------------------------------------------------------
        // INITIALIZATION
        // ---------------------------------------------------------------------
        init() {
            if (this.initialized) return;
            
            console.log('🚀 Oslira Alert System initializing...');
            
            this.createContainer();
            this.loadHistory();
            this.createStyles();
            this.setupGlobalErrorHandling();
            this.setupCompatibilityLayer();
            this.detectPageContext();
            
            this.initialized = true;
            console.log('✅ Alert System ready');
        }

        // ---------------------------------------------------------------------
        // CRITICAL ERROR DETECTION
        // ---------------------------------------------------------------------
        isErrorCritical(error, context = {}) {
            const errorStr = typeof error === 'string' ? error : error?.message || error?.toString() || '';
            
            // Check if it matches ignore patterns
            for (const pattern of IGNORE_PATTERNS) {
                if (pattern.test(errorStr)) {
                    return false; // Not critical, just noise
                }
            }
            
            // Check if it matches critical patterns
            for (const pattern of CRITICAL_PATTERNS) {
                if (pattern.test(errorStr)) {
                    return true; // Critical error
                }
            }
            
            // Check context flags
            if (context.critical || context.userAction) {
                return true;
            }
            
            // Default: only show actual Error objects or explicit user messages
            return error instanceof Error && !errorStr.includes('console.');
        }

        // ---------------------------------------------------------------------
        // SMART ERROR TRANSFORMATION
        // ---------------------------------------------------------------------
        transformError(error) {
            const errorStr = typeof error === 'string' ? error : error?.message || '';
            
            // Check for mapped errors
            for (const [pattern, mapping] of Object.entries(ERROR_MAPPINGS)) {
                if (errorStr.includes(pattern)) {
                    return mapping;
                }
            }
            
            // Generic transformation for unknown errors
            if (errorStr.includes('500') || errorStr.includes('Internal Server Error')) {
                return {
                    title: 'Server Error',
                    message: 'Our servers are having issues. Please try again in a moment.',
                    suggestions: ['Wait a few seconds', 'Refresh the page']
                };
            }
            
            if (errorStr.includes('timeout')) {
                return {
                    title: 'Request Timeout',
                    message: 'The request took too long. Please try again.',
                    actions: [{ label: 'Retry', action: 'retry' }]
                };
            }
            
            // Default for unmapped errors
            return {
                title: 'Something Went Wrong',
                message: 'An unexpected error occurred. Please try again.',
                details: errorStr
            };
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
            
            // Check for deduplication
            if (alert.dedupeKey && this.dedupeMap.has(alert.dedupeKey)) {
                const existing = this.dedupeMap.get(alert.dedupeKey);
                if (Date.now() - existing.timestamp < CONFIG.dedupeWindowMs) {
                    this.updateDupeCount(existing.id);
                    return existing.id;
                }
            }
            
            // Add to queue
            this.queue.push(alert);
            
            // Store in dedupe map
            if (alert.dedupeKey) {
                this.dedupeMap.set(alert.dedupeKey, alert);
            }
            
            // Process queue
            this.processQueue();
            
            // Add to history
            this.addToHistory(alert);
            
            return alert.id;
        }

        success(options) { return this.notify('success', options); }
        info(options) { return this.notify('info', options); }
        warning(options) { return this.notify('warning', options); }
        
        error(error, options = {}) {
            // Special handling for errors
            if (!this.isErrorCritical(error, options.context)) {
                console.log('🔇 Non-critical error suppressed:', error);
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
        // DOM CREATION
        // ---------------------------------------------------------------------
        createContainer() {
            // Remove existing if present
            const existing = document.getElementById(CONFIG.containerId);
            if (existing) existing.remove();
            
            this.container = document.createElement('div');
            this.container.id = CONFIG.containerId;
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-label', 'Notifications');
            this.container.setAttribute('aria-live', 'polite');
            
            document.body.appendChild(this.container);
        }

        renderAlert(alert) {
            const alertEl = document.createElement('div');
            alertEl.id = `alert-${alert.id}`;
            alertEl.className = `oslira-alert oslira-alert-${alert.severity}`;
            alertEl.setAttribute('role', alert.severity === 'error' ? 'alert' : 'status');
            
            // Create progress bar for timed alerts
            const progressBar = alert.timeoutMs ? `
                <div class="oslira-alert-progress" style="animation-duration: ${alert.timeoutMs}ms"></div>
            ` : '';
            
            // Create actions HTML
            const actionsHtml = alert.actions.length > 0 ? `
                <div class="oslira-alert-actions">
                    ${alert.actions.map(action => `
                        <button class="oslira-alert-action" data-action="${action.action || ''}" data-alert-id="${alert.id}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            ` : '';
            
            // Create suggestions HTML
            const suggestionsHtml = alert.suggestions ? `
                <div class="oslira-alert-suggestions">
                    <div class="suggestions-title">Try:</div>
                    <ul>
                        ${alert.suggestions.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
            ` : '';
            
            alertEl.innerHTML = `
                <div class="oslira-alert-content">
                    <div class="oslira-alert-icon">${this.getIcon(alert.severity)}</div>
                    <div class="oslira-alert-body">
                        <div class="oslira-alert-title">${alert.title}</div>
                        <div class="oslira-alert-message">${alert.message}</div>
                        ${suggestionsHtml}
                        ${alert.details ? `
                            <button class="oslira-alert-details-toggle" data-alert-id="${alert.id}">
                                Show Details
                            </button>
                            <div class="oslira-alert-details" style="display: none;">
                                <pre>${alert.details}</pre>
                            </div>
                        ` : ''}
                    </div>
                    <button class="oslira-alert-close" data-alert-id="${alert.id}" aria-label="Dismiss">
                        ✕
                    </button>
                </div>
                ${actionsHtml}
                ${progressBar}
            `;
            
            // Add event listeners
            this.attachAlertEvents(alertEl, alert);
            
            return alertEl;
        }

        // ---------------------------------------------------------------------
        // STYLES
        // ---------------------------------------------------------------------
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
                
                .oslira-alert-suggestions {
                    margin-top: 8px;
                    padding: 8px;
                    background: rgba(0,0,0,0.03);
                    border-radius: 6px;
                    font-size: 13px;
                }
                
                .oslira-alert-suggestions .suggestions-title {
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: #374151;
                }
                
                .oslira-alert-suggestions ul {
                    margin: 0;
                    padding-left: 20px;
                    color: #6b7280;
                }
                
                .oslira-alert-details-toggle {
                    margin-top: 8px;
                    background: none;
                    border: 1px solid #e5e7eb;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #6b7280;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .oslira-alert-details-toggle:hover {
                    background: rgba(0,0,0,0.03);
                    border-color: #d1d5db;
                }
                
                .oslira-alert-details {
                    margin-top: 8px;
                    padding: 8px;
                    background: #f9fafb;
                    border-radius: 4px;
                    font-size: 12px;
                    overflow-x: auto;
                }
                
                .oslira-alert-details pre {
                    margin: 0;
                    font-family: 'Monaco', 'Courier New', monospace;
                    white-space: pre-wrap;
                    word-break: break-all;
                    color: #4b5563;
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
                
                .oslira-alert-actions {
                    padding: 0 16px 12px 52px;
                    display: flex;
                    gap: 8px;
                }
                
                .oslira-alert-action {
                    padding: 6px 12px;
                    border: 1px solid #e5e7eb;
                    background: white;
                    color: #374151;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .oslira-alert-action:hover {
                    background: #f3f4f6;
                    transform: translateY(-1px);
                }
                
                .oslira-alert-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    width: 100%;
                    background: currentColor;
                    opacity: 0.2;
                    animation: osliraProgress linear forwards;
                }
                
                .oslira-alert-success .oslira-alert-progress { color: #10b981; }
                .oslira-alert-info .oslira-alert-progress { color: #3b82f6; }
                .oslira-alert-warning .oslira-alert-progress { color: #f59e0b; }
                .oslira-alert-error .oslira-alert-progress { color: #ef4444; }
                
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
                
                @keyframes osliraProgress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                
                @media (prefers-reduced-motion: reduce) {
                    .oslira-alert,
                    .oslira-alert.removing {
                        animation: none;
                    }
                    
                    .oslira-alert-progress {
                        animation: none;
                        display: none;
                    }
                }
                
                @media (max-width: 480px) {
                    #${CONFIG.containerId} {
                        width: calc(100vw - 20px);
                        min-width: unset;
                    }
                    
                    .oslira-alert-content {
                        padding: 12px;
                    }
                    
                    .oslira-alert-actions {
                        padding-left: 48px;
                    }
                }
            `;
            
            document.head.appendChild(styles);
        }

        // ---------------------------------------------------------------------
        // EVENT HANDLING
        // ---------------------------------------------------------------------
        attachAlertEvents(alertEl, alert) {
            // Close button
            const closeBtn = alertEl.querySelector('.oslira-alert-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.dismiss(alert.id));
            }
            
            // Action buttons
            alertEl.querySelectorAll('.oslira-alert-action').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    this.handleAction(action, alert);
                });
            });
            
            // Details toggle
            const detailsToggle = alertEl.querySelector('.oslira-alert-details-toggle');
            if (detailsToggle) {
                detailsToggle.addEventListener('click', () => {
                    const details = alertEl.querySelector('.oslira-alert-details');
                    const isVisible = details.style.display !== 'none';
                    details.style.display = isVisible ? 'none' : 'block';
                    detailsToggle.textContent = isVisible ? 'Show Details' : 'Hide Details';
                });
            }
            
            // Pause on hover
            alertEl.addEventListener('mouseenter', () => {
                if (alert.timeoutId) {
                    clearTimeout(alert.timeoutId);
                    this.pausedAlerts.add(alert.id);
                }
            });
            
            alertEl.addEventListener('mouseleave', () => {
                if (this.pausedAlerts.has(alert.id) && alert.timeoutMs) {
                    alert.timeoutId = setTimeout(() => this.dismiss(alert.id), 2000);
                    this.pausedAlerts.delete(alert.id);
                }
            });
        }

        handleAction(action, alert) {
            if (!action) return;
            
            if (action.startsWith('redirect:')) {
                const url = action.replace('redirect:', '');
                window.location.href = url;
            } else if (action === 'retry') {
                // Emit retry event
                window.dispatchEvent(new CustomEvent('alert-retry', { detail: alert }));
            } else if (action === 'reload') {
                window.location.reload();
            }
            
            this.dismiss(alert.id);
        }

        // ---------------------------------------------------------------------
        // QUEUE MANAGEMENT
        // ---------------------------------------------------------------------
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
            
            // Set timeout for auto-dismiss
            if (alert.timeoutMs) {
                alert.timeoutId = setTimeout(() => this.dismiss(alert.id), alert.timeoutMs);
            }
            
            // Trigger reflow for animation
            alertEl.offsetHeight;
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

        dismissAll() {
            this.visible.forEach((alert, id) => this.dismiss(id));
            this.queue = [];
        }

        // ---------------------------------------------------------------------
        // HISTORY MANAGEMENT
        // ---------------------------------------------------------------------
        addToHistory(alert) {
            this.history.unshift(alert);
            if (this.history.length > CONFIG.maxHistory) {
                this.history = this.history.slice(0, CONFIG.maxHistory);
            }
            this.saveHistory();
        }

        saveHistory() {
            try {
                localStorage.setItem(CONFIG.historyKey, JSON.stringify(this.history));
            } catch (e) {
                console.warn('Failed to save alert history:', e);
            }
        }

        loadHistory() {
            try {
                const saved = localStorage.getItem(CONFIG.historyKey);
                if (saved) {
                    this.history = JSON.parse(saved);
                }
            } catch (e) {
                console.warn('Failed to load alert history:', e);
            }
        }

        // ---------------------------------------------------------------------
        // GLOBAL ERROR HANDLING
        // ---------------------------------------------------------------------
        setupGlobalErrorHandling() {
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
            
            // Intercept console.error (but preserve it)
            const originalConsoleError = console.error;
            console.error = (...args) => {
                originalConsoleError.apply(console, args);
                
                // Only show critical console errors to users
                const errorStr = args.map(a => String(a)).join(' ');
                if (this.isErrorCritical(errorStr, { context: 'console' })) {
                    this.error(errorStr, {
                        context: 'Console Error',
                        silent: true
                    });
                }
            };
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
        // PAGE CONTEXT DETECTION
        // ---------------------------------------------------------------------
        detectPageContext() {
            const path = window.location.pathname;
            const context = {
                isDashboard: path.includes('dashboard'),
                isAuth: path.includes('auth'),
                isOnboarding: path.includes('onboarding'),
                isAdmin: path.includes('admin'),
                hasQueue: !!document.querySelector('.analysis-queue'),
                hasModal: !!document.querySelector('.modal.show')
            };
            
            // Adjust positioning based on context
            if (context.hasQueue) {
                CONFIG.topOffset = 120; // Move below queue
            } else if (context.isDashboard) {
                CONFIG.topOffset = 80; // Account for dashboard header
            }
            
            return context;
        }

        // ---------------------------------------------------------------------
        // UTILITIES
        // ---------------------------------------------------------------------
        generateId() {
            return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        getIcon(severity) {
            const icons = {
                success: '✓',
                info: 'i',
                warning: '!',
                error: '✕'
            };
            return icons[severity] || 'i';
        }

                getDefaultTitle(severity) {
            const titles = {
                success: 'Success',
                info: 'Information',
                warning: 'Warning',
                error: 'Error'
            };
            return titles[severity] || 'Notification';
        }

        updateDupeCount(alertId) {
            const alertEl = document.getElementById(`alert-${alertId}`);
            if (!alertEl) return;
            
            let badge = alertEl.querySelector('.oslira-alert-dupe-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'oslira-alert-dupe-badge';
                badge.style.cssText = `
                    background: rgba(0,0,0,0.2);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 11px;
                    margin-left: 8px;
                `;
                alertEl.querySelector('.oslira-alert-title').appendChild(badge);
            }
            
            const currentCount = parseInt(badge.textContent || '1') + 1;
            badge.textContent = `×${currentCount}`;
        }

        // ---------------------------------------------------------------------
        // PUBLIC API FOR TESTING
        // ---------------------------------------------------------------------
        test() {
            console.log('🧪 Running Alert System tests...');
            
            // Test all severity levels
            this.success({ message: 'Test success message' });
            this.info({ message: 'Test info message with action', actions: [{ label: 'OK', action: 'dismiss' }] });
            this.warning({ message: 'Test warning with suggestions', suggestions: ['Try this', 'Or this'] });
            this.error('Test error message', { details: 'Stack trace would appear here' });
            
            // Test deduplication
            setTimeout(() => {
                this.info({ message: 'Duplicate test', dedupeKey: 'test-dupe' });
                this.info({ message: 'Duplicate test', dedupeKey: 'test-dupe' });
            }, 2000);
            
            console.log('✅ Tests dispatched. Check UI for results.');
        }

        getStats() {
            return {
                visible: this.visible.size,
                queued: this.queue.length,
                historyCount: this.history.length,
                errors: this.history.filter(a => a.severity === 'error').length,
                successes: this.history.filter(a => a.severity === 'success').length
            };
        }
    }

    // =========================================================================
    // INSTANTIATION AND GLOBAL SETUP
    // =========================================================================
    
    // Create the global instance
    const alertSystem = new OsliraAlertSystem();
    
    // Expose global APIs
    window.AlertSystem = alertSystem;
    window.Alert = alertSystem; // Shorter alias
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => alertSystem.init());
    } else {
        // DOM already loaded
        setTimeout(() => alertSystem.init(), 0);
    }
    
    // Expose version info
    window.AlertSystem.version = '1.0.0';
    window.AlertSystem.ready = new Promise(resolve => {
        const checkReady = setInterval(() => {
            if (alertSystem.initialized) {
                clearInterval(checkReady);
                resolve(alertSystem);
            }
        }, 50);
    });

})();
