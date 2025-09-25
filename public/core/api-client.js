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
    
// File: public/core/api-client.js - Updated request method

async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    // Get fresh session token using the proper method
    let accessToken = null;
    
    // Try multiple methods to get the session token
    if (window.SimpleAuth?.supabase) {
        try {
            const { data: sessionData } = await window.SimpleAuth.supabase().auth.getSession();
            accessToken = sessionData?.session?.access_token;
            console.log('✅ [ApiClient] Got token from SimpleAuth:', !!accessToken);
        } catch (error) {
            console.warn('⚠️ [ApiClient] SimpleAuth session failed:', error);
        }
    }
    
    // Fallback to auth manager
    if (!accessToken && this.auth?.session?.access_token) {
        accessToken = this.auth.session.access_token;
        console.log('✅ [ApiClient] Using fallback token from auth manager');
    }
    
    // Fallback to global auth manager
    if (!accessToken && window.OsliraAuth?.getCurrentSession?.().access_token) {
        accessToken = window.OsliraAuth.getCurrentSession().access_token;
        console.log('✅ [ApiClient] Using token from global auth manager');
    }
    
    if (!accessToken) {
        throw new Error('No valid authentication token available');
    }
    
    const config = {
        timeout: this.timeout,
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers
        }
    };
    
    console.log('🔥 [ApiClient] Making request:', {
        url,
        method: config.method || 'GET',
        hasAuth: !!accessToken,
        tokenPrefix: accessToken ? accessToken.substring(0, 20) + '...' : 'none'
    });
    
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
                const errorText = await response.text();
                console.error(`❌ [ApiClient] Request failed:`, {
                    status: response.status,
                    statusText: response.statusText,
                    errorBody: errorText,
                    url,
                    attempt: attempt + 1
                });
                throw new ApiError(response.status, errorText);
            }
            
            const result = await response.json();
            console.log('✅ [ApiClient] Request successful:', {
                url,
                status: response.status
            });
            return result;
            
        } catch (error) {
            console.error(`❌ [ApiClient] Request attempt ${attempt + 1} failed:`, error);
            if (attempt === 2) throw error;
            await this.delay(1000 * Math.pow(2, attempt));
        }
    }
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
