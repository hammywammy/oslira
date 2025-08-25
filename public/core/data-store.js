// =============================================================================
// DATA-STORE.JS - Centralized State Management System
// Reactive state management with localStorage persistence
// =============================================================================

class OsliraDataStore {
    constructor() {
        this.state = {
            // User data
            user: null,
            session: null,
            businesses: [],
            selectedBusiness: null,
            
            // Application data
            leads: [],
            analytics: {
                summary: null,
                trends: null,
                lastUpdated: null
            },
            
            // UI state
            preferences: {
                theme: 'light',
                sidebarCollapsed: false,
                dashboardView: 'grid',
                notificationsEnabled: true
            },
            
            // Cache
            cache: {
                apiResponses: new Map(),
                lastRefresh: null,
                version: '1.0.0'
            },
            
            // Real-time subscriptions
            subscriptions: new Map(),
            
            // Application status
            status: {
                online: navigator.onLine,
                loading: false,
                error: null,
                lastSync: null
            }
        };
        
        this.subscribers = new Map();
        this.middleware = [];
        this.initialized = false;
        
        this.init();
    }
    
    init() {
        if (this.initialized) return;
        
        // Load persisted state
        this.loadFromStorage();
        
        // Setup online/offline detection
        this.setupNetworkListeners();
        
        // Setup periodic state cleanup
        this.setupCleanupInterval();
        
        this.initialized = true;
        console.log('✅ [Store] Data Store initialized');
    }
    
    // =============================================================================
    // STATE MANAGEMENT
    // =============================================================================
    
    /**
     * Get state value by path
     * @param {string} path - Dot notation path (e.g., 'user.id', 'preferences.theme')
     * @returns {any} State value
     */
    get(path) {
        if (!path) return this.state;
        
        const keys = path.split('.');
        let current = this.state;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        
        return current;
    }
    
    /**
     * Set state value by path
     * @param {string} path - Dot notation path
     * @param {any} value - New value
     * @param {object} options - Options for persistence and notification
     */
    set(path, value, options = {}) {
        const {
            persist = true,
            notify = true,
            merge = false
        } = options;
        
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.state;
        
        // Navigate to parent object
        for (const key of keys) {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        // Set the value
        const oldValue = current[lastKey];
        
        if (merge && typeof value === 'object' && typeof oldValue === 'object') {
            current[lastKey] = { ...oldValue, ...value };
        } else {
            current[lastKey] = value;
        }
        
        // Execute middleware
        this.executeMiddleware(path, value, oldValue);
        
        // Persist to localStorage if needed
        if (persist) {
            this.persistToStorage(path, current[lastKey]);
        }
        
        // Notify subscribers if needed
        if (notify) {
            this.notifySubscribers(path, current[lastKey], oldValue);
        }
        
        console.log(`📊 [Store] Updated ${path}:`, current[lastKey]);
    }
    
    /**
     * Update nested object properties
     * @param {string} path - Path to object
     * @param {object} updates - Properties to update
     */
    update(path, updates, options = {}) {
        const currentValue = this.get(path);
        if (typeof currentValue === 'object' && currentValue !== null) {
            this.set(path, { ...currentValue, ...updates }, options);
        } else {
            this.set(path, updates, options);
        }
    }
    
    /**
     * Delete state property
     * @param {string} path - Path to delete
     */
    delete(path) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const parentPath = keys.join('.');
        const parent = parentPath ? this.get(parentPath) : this.state;
        
        if (parent && typeof parent === 'object') {
            const oldValue = parent[lastKey];
            delete parent[lastKey];
            
            this.notifySubscribers(path, undefined, oldValue);
            this.persistToStorage(parentPath, parent);
            
            console.log(`🗑️ [Store] Deleted ${path}`);
        }
    }
    
    // =============================================================================
    // SUBSCRIPTION SYSTEM
    // =============================================================================
    
    /**
     * Subscribe to state changes
     * @param {string} path - Path to watch
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        
        this.subscribers.get(path).add(callback);
        
        // Return unsubscribe function
        return () => {
            const pathSubscribers = this.subscribers.get(path);
            if (pathSubscribers) {
                pathSubscribers.delete(callback);
                if (pathSubscribers.size === 0) {
                    this.subscribers.delete(path);
                }
            }
        };
    }
    
    /**
     * Subscribe to multiple paths
     * @param {object} subscriptions - Object with path: callback pairs
     * @returns {function} Unsubscribe all function
     */
    subscribeMultiple(subscriptions) {
        const unsubscribers = Object.entries(subscriptions).map(([path, callback]) =>
            this.subscribe(path, callback)
        );
        
        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    }
    
    notifySubscribers(path, newValue, oldValue) {
        // Notify exact path subscribers
        const pathSubscribers = this.subscribers.get(path);
        if (pathSubscribers) {
            pathSubscribers.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`Error in subscriber for ${path}:`, error);
                }
            });
        }
        
        // Notify parent path subscribers
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            const parentSubscribers = this.subscribers.get(parentPath);
            if (parentSubscribers) {
                parentSubscribers.forEach(callback => {
                    try {
                        callback(this.get(parentPath), undefined, parentPath);
                    } catch (error) {
                        console.error(`Error in parent subscriber for ${parentPath}:`, error);
                    }
                });
            }
        }
    }
    
    // =============================================================================
    // MIDDLEWARE SYSTEM
    // =============================================================================
    
    /**
     * Add middleware for state changes
     * @param {function} middleware - Middleware function
     */
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }
    
    executeMiddleware(path, newValue, oldValue) {
        this.middleware.forEach(middleware => {
            try {
                middleware(path, newValue, oldValue, this);
            } catch (error) {
                console.error('Middleware error:', error);
            }
        });
    }
    
    // =============================================================================
    // PERSISTENCE
    // =============================================================================
    
    loadFromStorage() {
        try {
            // Load user preferences
            const preferences = localStorage.getItem('oslira-preferences');
            if (preferences) {
                this.set('preferences', JSON.parse(preferences), { notify: false });
            }
            
            // Load selected business
            const selectedBusinessId = localStorage.getItem('selectedBusinessId');
            if (selectedBusinessId) {
                this.set('selectedBusiness', { id: selectedBusinessId }, { notify: false });
            }
            
            // Load cached data with expiration check
            const cachedData = localStorage.getItem('oslira-cache');
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const expirationTime = parsed.timestamp + (24 * 60 * 60 * 1000); // 24 hours
                
                if (Date.now() < expirationTime) {
                    this.set('cache', parsed.data, { notify: false, persist: false });
                }
            }
            
            console.log('📁 [Store] State loaded from localStorage');
        } catch (error) {
            console.error('Failed to load state from storage:', error);
        }
    }
    
    persistToStorage(path, value) {
        try {
            // Persist specific state branches
            if (path.startsWith('preferences')) {
                localStorage.setItem('oslira-preferences', JSON.stringify(this.get('preferences')));
            } else if (path === 'selectedBusiness') {
                if (value && value.id) {
                    localStorage.setItem('selectedBusinessId', value.id);
                }
            } else if (path.startsWith('cache')) {
                localStorage.setItem('oslira-cache', JSON.stringify({
                    data: this.get('cache'),
                    timestamp: Date.now()
                }));
            }
        } catch (error) {
            console.error('Failed to persist state to storage:', error);
        }
    }
    
    // =============================================================================
    // BUSINESS METHODS
    // =============================================================================
    
    setSelectedBusiness(business) {
        this.set('selectedBusiness', business);
        
        // Emit business change event
        window.dispatchEvent(new CustomEvent('business:changed', {
            detail: { business }
        }));
    }
    
    getSelectedBusiness() {
        return this.get('selectedBusiness');
    }
    
    addLead(lead) {
        const leads = this.get('leads') || [];
        const newLead = {
            ...lead,
            id: lead.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: lead.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.set('leads', [...leads, newLead]);
        
        // Update analytics
        this.updateLeadAnalytics();
        
        return newLead;
    }
    
    updateLead(leadId, updates) {
        const leads = this.get('leads') || [];
        const updatedLeads = leads.map(lead => 
            lead.id === leadId 
                ? { ...lead, ...updates, updatedAt: new Date().toISOString() }
                : lead
        );
        
        this.set('leads', updatedLeads);
        this.updateLeadAnalytics();
    }
    
    deleteLead(leadId) {
        const leads = this.get('leads') || [];
        const filteredLeads = leads.filter(lead => lead.id !== leadId);
        
        this.set('leads', filteredLeads);
        this.updateLeadAnalytics();
    }
    
    updateLeadAnalytics() {
        const leads = this.get('leads') || [];
        
        const analytics = {
            total: leads.length,
            highQuality: leads.filter(lead => lead.score >= 80).length,
            mediumQuality: leads.filter(lead => lead.score >= 60 && lead.score < 80).length,
            lowQuality: leads.filter(lead => lead.score < 60).length,
            lastUpdated: new Date().toISOString()
        };
        
        this.set('analytics.summary', analytics, { persist: false });
    }
    
    // =============================================================================
    // CACHE MANAGEMENT
    // =============================================================================
    
    setCache(key, data, ttl = 3600000) { // 1 hour default TTL
        const cache = this.get('cache.apiResponses') || new Map();
        cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
        
        this.set('cache.apiResponses', cache, { persist: false });
    }
    
    getCache(key) {
        const cache = this.get('cache.apiResponses') || new Map();
        const entry = cache.get(key);
        
        if (!entry) return null;
        
        // Check if cache entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            cache.delete(key);
            this.set('cache.apiResponses', cache, { persist: false });
            return null;
        }
        
        return entry.data;
    }
    
    clearCache(pattern = null) {
        const cache = this.get('cache.apiResponses') || new Map();
        
        if (pattern) {
            // Clear cache entries matching pattern
            for (const key of cache.keys()) {
                if (key.includes(pattern)) {
                    cache.delete(key);
                }
            }
        } else {
            // Clear all cache
            cache.clear();
        }
        
        this.set('cache.apiResponses', cache, { persist: false });
        console.log(`🧹 [Store] Cache cleared${pattern ? ` (pattern: ${pattern})` : ''}`);
    }
    
    getCacheSize() {
        const cache = this.get('cache.apiResponses') || new Map();
        return cache.size;
    }
    
    // =============================================================================
    // NETWORK STATUS
    // =============================================================================
    
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.set('status.online', true, { persist: false });
            console.log('🌐 [Store] Network status: ONLINE');
        });
        
        window.addEventListener('offline', () => {
            this.set('status.online', false, { persist: false });
            console.log('🌐 [Store] Network status: OFFLINE');
        });
    }
    
    isOnline() {
        return this.get('status.online');
    }
    
    // =============================================================================
    // CLEANUP & MAINTENANCE
    // =============================================================================
    
    setupCleanupInterval() {
        // Run cleanup every 30 minutes
        setInterval(() => {
            this.cleanup();
        }, 30 * 60 * 1000);
    }
    
    cleanup() {
        // Clean expired cache entries
        const cache = this.get('cache.apiResponses') || new Map();
        let cleanedCount = 0;
        
        for (const [key, entry] of cache.entries()) {
            if (Date.now() - entry.timestamp > entry.ttl) {
                cache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.set('cache.apiResponses', cache, { persist: false });
            console.log(`🧹 [Store] Cleaned ${cleanedCount} expired cache entries`);
        }
        
        // Update last cleanup time
        this.set('cache.lastCleanup', new Date().toISOString(), { persist: false });
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    /**
     * Deep clone a value
     */
    clone(value) {
        if (value === null || typeof value !== 'object') return value;
        if (value instanceof Date) return new Date(value.getTime());
        if (value instanceof Array) return value.map(item => this.clone(item));
        if (value instanceof Map) {
            const cloned = new Map();
            value.forEach((val, key) => cloned.set(key, this.clone(val)));
            return cloned;
        }
        if (value instanceof Set) {
            return new Set([...value].map(item => this.clone(item)));
        }
        if (typeof value === 'object') {
            const cloned = {};
            Object.keys(value).forEach(key => {
                cloned[key] = this.clone(value[key]);
            });
            return cloned;
        }
        return value;
    }
    
    /**
     * Get state snapshot for debugging
     */
    getSnapshot() {
        return this.clone(this.state);
    }
    
    /**
     * Reset specific state branch
     */
    reset(path) {
        const defaultStates = {
            'leads': [],
            'analytics': {
                summary: null,
                trends: null,
                lastUpdated: null
            },
            'cache': {
                apiResponses: new Map(),
                lastRefresh: null,
                version: '1.0.0'
            },
            'preferences': {
                theme: 'light',
                sidebarCollapsed: false,
                dashboardView: 'grid',
                notificationsEnabled: true
            }
        };
        
        if (defaultStates[path]) {
            this.set(path, this.clone(defaultStates[path]));
            console.log(`🔄 [Store] Reset ${path} to default state`);
        }
    }
    
    /**
     * Import state from external source
     */
    import(data, options = {}) {
        const { merge = false, validate = true } = options;
        
        if (validate && !this.validateStateStructure(data)) {
            throw new Error('Invalid state structure for import');
        }
        
        if (merge) {
            // Merge with existing state
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    this.update(key, data[key]);
                } else {
                    this.set(key, data[key]);
                }
            });
        } else {
            // Replace entire state
            this.state = this.clone(data);
            this.notifyAllSubscribers();
        }
        
        console.log('📥 [Store] State imported');
    }
    
    /**
     * Export state for backup/transfer
     */
    export(includeCache = false) {
        const exported = this.clone(this.state);
        
        if (!includeCache) {
            delete exported.cache;
        }
        
        return {
            ...exported,
            exportedAt: new Date().toISOString(),
            version: this.get('cache.version')
        };
    }
    
    /**
     * Validate state structure
     */
    validateStateStructure(data) {
        const requiredKeys = ['user', 'businesses', 'leads', 'preferences', 'status'];
        return requiredKeys.every(key => key in data);
    }
    
    /**
     * Notify all subscribers (used during import)
     */
    notifyAllSubscribers() {
        this.subscribers.forEach((callbacks, path) => {
            const value = this.get(path);
            callbacks.forEach(callback => {
                try {
                    callback(value, undefined, path);
                } catch (error) {
                    console.error(`Error notifying subscriber for ${path}:`, error);
                }
            });
        });
    }
    
    // =============================================================================
    // REAL-TIME SUBSCRIPTIONS
    // =============================================================================
    
    /**
     * Add real-time subscription (e.g., Supabase subscription)
     */
    addSubscription(key, subscription) {
        this.get('subscriptions').set(key, subscription);
        console.log(`📡 [Store] Added real-time subscription: ${key}`);
    }
    
    /**
     * Remove real-time subscription
     */
    removeSubscription(key) {
        const subscriptions = this.get('subscriptions');
        const subscription = subscriptions.get(key);
        
        if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
        }
        
        subscriptions.delete(key);
        console.log(`📡 [Store] Removed real-time subscription: ${key}`);
    }
    
    /**
     * Remove all subscriptions
     */
    clearSubscriptions() {
        const subscriptions = this.get('subscriptions');
        
        subscriptions.forEach((subscription, key) => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        });
        
        subscriptions.clear();
        console.log('📡 [Store] Cleared all real-time subscriptions');
    }
    
    // =============================================================================
    // PERFORMANCE MONITORING
    // =============================================================================
    
    getPerformanceStats() {
        return {
            subscribersCount: Array.from(this.subscribers.values()).reduce((total, set) => total + set.size, 0),
            pathsWatched: this.subscribers.size,
            cacheSize: this.getCacheSize(),
            lastCleanup: this.get('cache.lastCleanup'),
            memoryUsage: this.getMemoryUsage(),
            stateSize: JSON.stringify(this.state).length
        };
    }
    
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }
    
    // =============================================================================
    // DEBUG HELPERS
    // =============================================================================
    
    debug() {
        console.group('🔍 [Store] Debug Information');
        console.log('Current State:', this.getSnapshot());
        console.log('Subscribers:', Object.fromEntries(
            Array.from(this.subscribers.entries()).map(([path, callbacks]) => [path, callbacks.size])
        ));
        console.log('Performance:', this.getPerformanceStats());
        console.groupEnd();
    }
    
    // =============================================================================
    // DESTRUCTION
    // =============================================================================
    
    destroy() {
        // Clear all subscriptions
        this.clearSubscriptions();
        
        // Clear all state subscribers
        this.subscribers.clear();
        
        // Clear middleware
        this.middleware = [];
        
        // Clear cache
        this.clearCache();
        
        console.log('🗑️ [Store] Data Store destroyed');
    }
}

// Export for global use
window.OsliraDataStore = OsliraDataStore;
