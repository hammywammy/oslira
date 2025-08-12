// =============================================================================
// STAGING ENVIRONMENT PASSWORD PROTECTION
// Only runs on staging domains - protects from unauthorized access
// =============================================================================

(function() {
    'use strict';
    
    // Only run on staging domains
    const isStaging = window.location.hostname.includes('test') || 
                     window.location.hostname.includes('staging') ||
                     window.location.hostname.includes('osliratest');
    
    if (!isStaging) { 
        console.log('🔓 Production environment - no password protection needed');
        return;
    }
    
    console.log('🔒 Staging environment detected - checking password protection');
    
    // Configuration - get password from environment config
    let STAGING_PASSWORD = null;
    
    // Get password from environment config
    try {
        const envConfig = window.getEnvConfig ? window.getEnvConfig() : null;
        STAGING_PASSWORD = envConfig?.STAGING_PASSWORD || null;
    } catch (error) {
        console.warn('Could not load staging password from config');
    }
    
    // Fallback: try to get from a global config
    if (!STAGING_PASSWORD && window.CONFIG?.STAGING_PASSWORD) {
        STAGING_PASSWORD = window.CONFIG.STAGING_PASSWORD;
    }
    
    // If no password configured, skip protection
    if (!STAGING_PASSWORD) {
        console.log('🔓 No staging password configured - skipping protection');
        return;
    }
    const SESSION_KEY = 'staging_auth_verified';
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    
    // Check if already authenticated
    function isAuthenticated() {
        const authData = localStorage.getItem(SESSION_KEY);
        if (!authData) return false;
        
        try {
            const { timestamp, verified } = JSON.parse(authData);
            const isExpired = Date.now() - timestamp > SESSION_DURATION;
            
            return verified && !isExpired;
        } catch (error) {
            localStorage.removeItem(SESSION_KEY);
            return false;
        }
    }
    
    // Save authentication
    function saveAuthentication() {
        const authData = {
            verified: true,
            timestamp: Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(authData));
    }
    
    // Create password prompt overlay
    function createPasswordPrompt() {
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        const overlay = document.createElement('div');
        overlay.id = 'staging-password-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 400px;
            width: 90%;
        `;
        
        modal.innerHTML = `
            <div style="margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                    🔒 Staging Environment
                </h2>
                <p style="margin: 0; color: #6b7280; font-size: 16px;">
                    This is a development environment.<br>
                    Please enter the access password to continue.
                </p>
            </div>
            
            <form id="staging-password-form" style="margin-bottom: 20px;">
                <input 
                    type="password" 
                    id="staging-password-input"
                    placeholder="Enter staging password"
                    style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 16px;
                        margin-bottom: 16px;
                        box-sizing: border-box;
                        outline: none;
                    "
                    autocomplete="current-password"
                    required
                />
                <button 
                    type="submit"
                    style="
                        width: 100%;
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 12px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background 0.2s;
                    "
                    onmouseover="this.style.background='#2563eb'"
                    onmouseout="this.style.background='#3b82f6'"
                >
                    Access Staging Environment
                </button>
            </form>
            
            <div id="staging-error-message" style="
                color: #dc2626;
                font-size: 14px;
                margin-top: 12px;
                display: none;
            "></div>
            
            <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 12px;">
                Environment: ${window.location.hostname}<br>
                Contact admin if you need access
            </p>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Focus on input
        const input = document.getElementById('staging-password-input');
        setTimeout(() => input.focus(), 100);
        
        // Handle form submission
        const form = document.getElementById('staging-password-form');
        const errorDiv = document.getElementById('staging-error-message');
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const enteredPassword = input.value.trim();
            
            if (enteredPassword === STAGING_PASSWORD) {
                console.log('✅ Staging password correct - granting access');
                saveAuthentication();
                document.body.removeChild(overlay);
                document.body.style.overflow = '';
                
                // Show success message briefly
                showSuccessMessage();
            } else {
                console.log('❌ Staging password incorrect');
                errorDiv.textContent = 'Incorrect password. Please try again.';
                errorDiv.style.display = 'block';
                input.value = '';
                input.focus();
                
                // Shake animation
                modal.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    modal.style.animation = '';
                }, 500);
            }
        });
        
        // Add shake animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 20%, 40%, 60%, 80% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show success message
    function showSuccessMessage() {
        const success = document.createElement('div');
        success.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 500;
        `;
        success.textContent = '✅ Access granted to staging environment';
        
        document.body.appendChild(success);
        
        setTimeout(() => {
            success.style.opacity = '0';
            success.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(success)) {
                    document.body.removeChild(success);
                }
            }, 300);
        }, 3000);
    }
    
    // Initialize protection
    function initializeProtection() {
        if (isAuthenticated()) {
            console.log('✅ Staging access already verified');
            return;
        }
        
        console.log('🔒 Staging access required - showing password prompt');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createPasswordPrompt);
        } else {
            createPasswordPrompt();
        }
    }
    
    // Start protection
    initializeProtection();
    
    // Clear authentication on page unload (optional - remove if you want persistent auth)
    window.addEventListener('beforeunload', function() {
        // Uncomment next line to require password on every page load
        // localStorage.removeItem(SESSION_KEY);
    });
    
})();
