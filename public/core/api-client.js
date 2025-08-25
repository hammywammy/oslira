class OsliraApiClient {
    constructor(config, auth) {
        this.baseUrl = config.WORKER_URL;
        this.auth = auth;
        this.timeout = 30000;
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

window.OsliraApi = OsliraApiClient;
