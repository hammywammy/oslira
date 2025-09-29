// =============================================================================
// CONFIGURATION MANAGER - CENTRALIZED CONFIG LOADING
// =============================================================================

class ConfigManager {
    constructor() {
        this.config = null;
        this.isLoaded = false;
        this.loadPromise = null;
        
        // Start loading immediately
        this.loadPromise = this.loadConfiguration();
    }
    
    // =============================================================================
    // MAIN CONFIGURATION LOADING
    // =============================================================================
    
    async loadConfiguration() {
        if (this.isLoaded) {
            return this.config;
        }
        
        console.log('🔧 [Config] Starting configuration load...');
        
        try {
            // Try loading from Netlify edge function first
            this.config = await this.loadFromNetlifyEdge();
            
            if (!this.config) {
                // Fallback to local config file
                this.config = await this.loadFromLocalFile();
            }
            
            if (!this.config) {
                throw new Error('No configuration source available');
            }
            
            // Process and validate config
            this.processConfiguration();
            
            console.log('✅ [Config] Configuration loaded successfully');
            this.isLoaded = true;
            
            return this.config;
            
        } catch (error) {
            console.error('❌ [Config] Failed to load configuration:', error);
            
            // Use fallback configuration
            this.config = this.getFallbackConfig();
            this.processConfiguration();
            this.isLoaded = true;
            
            return this.config;
        }
    }
    
    // =============================================================================
    // LOADING METHODS
    // =============================================================================
    
    async loadFromNetlifyEdge() {
        try {
            console.log('🌐 [Config] Loading from Netlify edge function...');
            
            const response = await fetch('/api/public-config');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const config = await response.json();
            console.log('✅ [Config] Loaded from Netlify edge function');
            
            return config;
            
        } catch (error) {
            console.warn('⚠️  [Config] Netlify edge function failed:', error.message);
            return null;
        }
    }
    
    async loadFromLocalFile() {
        try {
            console.log('📁 [Config] Loading from local config file...');
            
            // Try to load config.js file
            const response = await fetch('/config.js');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const configText = await response.text();
            
            // Extract CONFIG object from the file
            const configMatch = configText.match(/const\s+CONFIG\s*=\s*({[\s\S]*?});/);
            
            if (!configMatch) {
                throw new Error('CONFIG object not found in config.js');
            }
            
            const config = eval(`(${configMatch[1]})`);
            console.log('✅ [Config] Loaded from local config file');
            
            return config;
            
        } catch (error) {
            console.warn('⚠️  [Config] Local config file failed:', error.message);
            return null;
        }
    }
    
getFallbackConfig() {
    console.log('🔄 [Config] Using fallback configuration');
    
    return {
        supabaseUrl: 'https://jswzzihuqtjqvobfosks.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzd3p6aWh1cXRqcXZvYmZvc2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ3NjcsImV4cCI6MjA1MDU1MDc2N30.Z7EQBfC8N4QQjl8uIi-cGLM4-MJb4LrUa1Dz6kqBWPU',
        workerUrl: window.OsliraEnv?.WORKER_URL || 'https://api.oslira.com',
        environment: window.OsliraEnv?.ENV || 'development',
        fallback: true
    };
}
    
    // =============================================================================
    // CONFIGURATION PROCESSING
    // =============================================================================
    
    processConfiguration() {
        if (!this.config) return;
        
        // Add environment context if available
        if (window.OsliraEnv) {
            console.log('🌍 [Config] Environment Detection:', {
                detected: window.OsliraEnv.ENV,
                page: window.OsliraEnv.CURRENT_PAGE,
                production: window.OsliraEnv.IS_PRODUCTION
            });
            
            this.config.environment = window.OsliraEnv.ENV;
            this.config.currentPage = window.OsliraEnv.CURRENT_PAGE;
            this.config.isProduction = window.OsliraEnv.IS_PRODUCTION;
            this.config.baseUrl = window.OsliraEnv.BASE_URL;
            this.config.authCallbackUrl = window.OsliraEnv.AUTH_CALLBACK_URL;
        }
        
// Override worker URL with environment-specific one
if (window.OsliraEnv?.WORKER_URL) {
    this.config.workerUrl = window.OsliraEnv.WORKER_URL;
    this.config.WORKER_URL = window.OsliraEnv.WORKER_URL; // Also set uppercase version for API client
    
    console.log('🔧 [Config] Worker URL set:', {
        envWorkerUrl: window.OsliraEnv.WORKER_URL,
        configWorkerUrl: this.config.workerUrl,
        configWORKER_URL: this.config.WORKER_URL
    });
} else {
    console.warn('⚠️ [Config] No WORKER_URL from environment:', window.OsliraEnv);
}
        
        // Validate required fields
        this.validateConfiguration();
    }
    
    validateConfiguration() {
const required = ['supabaseUrl', 'supabaseAnonKey'];
        const missing = required.filter(key => !this.config[key] || this.config[key].includes('placeholder'));
        
        if (missing.length > 0) {
            console.warn('⚠️  [Config] Missing or placeholder configuration:', missing);
            
            if (this.config.environment === 'production') {
                console.error('🚨 [Config] Critical: Missing configuration in production');
            }
        }
    }
    
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    
    async getConfig() {
        if (!this.isLoaded) {
            await this.loadPromise;
        }
        return this.config;
    }
    
    async get(key) {
        const config = await this.getConfig();
        return config[key];
    }
    
async getSupabaseConfig() {
    const config = await this.getConfig();
    return {
        url: config.supabaseUrl,
        key: config.supabaseAnonKey || config.supabaseKey  // Support both key names
    };
}
    
    async getWorkerUrl() {
        const config = await this.getConfig();
        return config.workerUrl;
    }
    
    isConfigLoaded() {
        return this.isLoaded;
    }
    
    // =============================================================================
    // STAGING PASSWORD HANDLING
    // =============================================================================
    
    async checkStagingAccess() {
        if (!window.OsliraEnv?.IS_STAGING) {
            return true; // Not staging, no check needed
        }
        
        const config = await this.getConfig();
        
        if (!config.stagingPassword) {
            return true; // No password required
        }
        
        // Check if already authenticated for staging
        const stagingAuth = sessionStorage.getItem('staging-authenticated');
        if (stagingAuth === 'true') {
            return true;
        }
        
        // Prompt for staging password
        return this.promptStagingPassword(config.stagingPassword);
    }
    
    async promptStagingPassword(correctPassword) {
        const password = prompt('This is a staging environment. Please enter the access password:');
        
        if (!password) {
            alert('Access denied. Redirecting to production site.');
            window.location.href = 'https://oslira.com';
            return false;
        }
        
        // Simple hash check (in production, this would be more secure)
        const hashedPassword = await this.simpleHash(password);
        const hashedCorrect = await this.simpleHash(correctPassword);
        
        if (hashedPassword === hashedCorrect) {
            sessionStorage.setItem('staging-authenticated', 'true');
            return true;
        } else {
            alert('Incorrect password. Redirecting to production site.');
            window.location.href = 'https://oslira.com';
            return false;
        }
    }
    
    async simpleHash(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// =============================================================================
// INITIALIZATION & GLOBAL EXPORT
// =============================================================================

// Create global instance
const configManager = new ConfigManager();

// Export to window for global access
window.OsliraConfig = configManager;

// Also export the configuration getter for immediate access
window.getOsliraConfig = () => configManager.getConfig();

console.log('🔧 [Config] ConfigManager initialized and exposed as window.OsliraConfig');
