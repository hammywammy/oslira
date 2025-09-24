class OsliraApiClient {
constructor(config, auth) {
    console.log('🔍 [ApiClient] Constructor called with:', {
        config: config,
        configKeys: config ? Object.keys(config) : 'null',
        WORKER_URL: config?.WORKER_URL,
        workerUrl: config?.workerUrl,
        hasAuth: !!auth
    });
    
    this.baseUrl = config?.WORKER_URL || config?.workerUrl;
    this.auth = auth;
    this.timeout = 30000;
    
    console.log('✅ [ApiClient] Initialized with baseUrl:', this.baseUrl);
    
    if (!this.baseUrl) {
        console.error('❌ [ApiClient] CRITICAL: baseUrl is undefined!', {
            configReceived: config,
            availableKeys: config ? Object.keys(config) : 'none'
        });
    }
}
    
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        
        const config = {
            timeout: this.timeout,
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(this.auth?.session?.access_token && {
                    'Authorization': `Bearer ${this.auth.session.access_token}`
                }),
                ...options.headers
            }
        };
        
        // Retry logic
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new ApiError(response.status, await response.text());
                }
                
                return await response.json();
                
            } catch (error) {
                if (attempt === 2) throw error;
                await this.delay(1000 * Math.pow(2, attempt));
            }
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Specific API methods
    async analyzeProfile(data) {
        return this.request('/v1/analyze', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async bulkAnalyze(profiles) {
        return this.request('/v1/bulk-analyze', {
            method: 'POST',
            body: JSON.stringify({ profiles })
        });
    }
    
    async getAnalytics(businessId, dateRange) {
        return this.request(`/analytics/summary?business_id=${businessId}&range=${dateRange}`);
    }
    
    async health() {
        return this.request('/health');
    }
}

class ApiError extends Error {
    constructor(status, message) {
        super(`API Error ${status}: ${message}`);
        this.status = status;
    }
}

// Export class for instantiation, not instance
window.OsliraApiClient = OsliraApiClient;
window.ApiError = ApiError;

// Debug helper for development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('staging')) {
    window.debugApiClient = {
        getInstance: () => window.OsliraApiClient,
        testConnection: async () => {
            if (window.OsliraApiClient && window.OsliraApiClient.health) {
                return await window.OsliraApiClient.health();
            } else {
                throw new Error('API Client not properly initialized');
            }
        }
    };
}
