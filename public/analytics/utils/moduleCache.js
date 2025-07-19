// ==========================================
// MODULE CACHE - Enterprise LocalStorage TTL Cache System
// High-performance caching with compression and analytics
// ==========================================

/**
 * Enterprise-grade caching system for Oslira Analytics Dashboard
 * Features: TTL management, compression, analytics, quota management
 * Version 2.0.0 - Fixed memory leaks and added proper cleanup
 */

// Cache configuration with secure defaults
const CACHE_CONFIG = {
    PREFIX: 'oslira_cache_',
    METADATA_KEY: 'oslira_cache_metadata',
    STATS_KEY: 'oslira_cache_stats',
    DEFAULT_TTL: 300000, // 5 minutes
    MAX_SIZE: 50 * 1024 * 1024, // 50MB localStorage limit
    COMPRESSION_THRESHOLD: 1024, // Compress items larger than 1KB
    CLEANUP_INTERVAL: 60000, // Cleanup every minute
    EMERGENCY_CLEANUP_THRESHOLD: 0.9, // 90% of max size
    MAX_CACHE_ITEMS: 1000, // Maximum number of cached items
    ENABLE_ANALYTICS: true,
    ENABLE_COMPRESSION: true
};

// Global cache metadata and statistics
let CACHE_METADATA = {
    totalSize: 0,
    itemCount: 0,
    items: new Map(),
    lastCleanup: Date.now(),
    version: '2.0.0'
};

let CACHE_STATS = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    compressions: 0,
    decompressions: 0,
    errors: 0,
    totalSize: 0,
    itemCount: 0,
    startTime: Date.now()
};

// Cleanup timer reference
let cleanupTimer = null;
let isInitialized = false;

/**
 * Initialize the cache system
 */
function initializeCache() {
    if (isInitialized) return;
    
    try {
        // Load existing metadata
        loadCacheMetadata();
        
        // Load existing stats
        loadCacheStats();
        
        // Validate and clean existing cache
        validateExistingCache();
        
        // Start periodic cleanup
        startPeriodicCleanup();
        
        // Setup beforeunload cleanup
        setupUnloadCleanup();
        
        isInitialized = true;
        console.log('💾 Cache system initialized successfully');
        
    } catch (error) {
        console.error('❌ Cache initialization failed:', error);
        // Initialize with empty state
        CACHE_METADATA = {
            totalSize: 0,
            itemCount: 0,
            items: new Map(),
            lastCleanup: Date.now(),
            version: '2.0.0'
        };
        isInitialized = true;
    }
}

/**
 * Load cache metadata from localStorage
 */
function loadCacheMetadata() {
    try {
        const stored = localStorage.getItem(CACHE_CONFIG.METADATA_KEY);
        if (stored) {
            const metadata = JSON.parse(stored);
            
            // Convert items array back to Map
            if (metadata.items && Array.isArray(metadata.items)) {
                CACHE_METADATA = {
                    ...metadata,
                    items: new Map(metadata.items)
                };
            } else {
                CACHE_METADATA.items = new Map();
            }
            
            console.log(`💾 Loaded cache metadata: ${CACHE_METADATA.itemCount} items, ${formatBytes(CACHE_METADATA.totalSize)}`);
        }
    } catch (error) {
        console.warn('⚠️ Failed to load cache metadata:', error);
        CACHE_METADATA.items = new Map();
    }
}

/**
 * Save cache metadata to localStorage
 */
function saveCacheMetadata() {
    try {
        const metadataToSave = {
            ...CACHE_METADATA,
            items: Array.from(CACHE_METADATA.items.entries())
        };
        
        localStorage.setItem(CACHE_CONFIG.METADATA_KEY, JSON.stringify(metadataToSave));
    } catch (error) {
        console.error('❌ Failed to save cache metadata:', error);
    }
}

/**
 * Load cache statistics from localStorage
 */
function loadCacheStats() {
    try {
        const stored = localStorage.getItem(CACHE_CONFIG.STATS_KEY);
        if (stored) {
            const stats = JSON.parse(stored);
            CACHE_STATS = { ...CACHE_STATS, ...stats };
            console.log(`📊 Loaded cache stats: ${CACHE_STATS.hits} hits, ${CACHE_STATS.misses} misses`);
        }
    } catch (error) {
        console.warn('⚠️ Failed to load cache stats:', error);
    }
}

/**
 * Save cache statistics to localStorage
 */
function saveCacheStats() {
    try {
        CACHE_STATS.totalSize = CACHE_METADATA.totalSize;
        CACHE_STATS.itemCount = CACHE_METADATA.itemCount;
        
        localStorage.setItem(CACHE_CONFIG.STATS_KEY, JSON.stringify(CACHE_STATS));
    } catch (error) {
        console.warn('⚠️ Failed to save cache stats:', error);
    }
}

/**
 * Validate existing cache items and remove invalid ones
 */
function validateExistingCache() {
    const invalidKeys = [];
    
    // Check each cached item
    CACHE_METADATA.items.forEach((metadata, key) => {
        const fullKey = `${CACHE_CONFIG.PREFIX}${key}`;
        
        if (!localStorage.getItem(fullKey)) {
            invalidKeys.push(key);
        }
    });
    
    // Remove invalid entries
    invalidKeys.forEach(key => {
        const metadata = CACHE_METADATA.items.get(key);
        if (metadata) {
            CACHE_METADATA.totalSize -= metadata.size;
        }
        CACHE_METADATA.items.delete(key);
    });
    
    if (invalidKeys.length > 0) {
        console.log(`💾 Cleaned up ${invalidKeys.length} invalid cache entries`);
        saveCacheMetadata();
    }
}

/**
 * Start periodic cleanup timer
 */
function startPeriodicCleanup() {
    if (cleanupTimer) return;
    
    cleanupTimer = setInterval(() => {
        try {
            performCleanup();
        } catch (error) {
            console.error('❌ Periodic cleanup failed:', error);
        }
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
    
    console.log('🧹 Periodic cache cleanup started');
}

/**
 * Stop periodic cleanup timer
 */
function stopPeriodicCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
        console.log('🛑 Periodic cache cleanup stopped');
    }
}

/**
 * Setup cleanup on page unload
 */
function setupUnloadCleanup() {
    window.addEventListener('beforeunload', () => {
        try {
            saveCacheMetadata();
            saveCacheStats();
            stopPeriodicCleanup();
        } catch (error) {
            console.error('❌ Unload cleanup failed:', error);
        }
    });
}

/**
 * Perform cache cleanup - remove expired items
 */
function performCleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    // Find expired items
    CACHE_METADATA.items.forEach((metadata, key) => {
        if (now > metadata.ttl) {
            expiredKeys.push(key);
        }
    });
    
    // Remove expired items
    expiredKeys.forEach(key => {
        deleteCachedData(key);
        CACHE_STATS.evictions++;
    });
    
    // Check if emergency cleanup is needed
    if (CACHE_METADATA.totalSize > CACHE_CONFIG.MAX_SIZE * CACHE_CONFIG.EMERGENCY_CLEANUP_THRESHOLD) {
        performEmergencyCleanup();
    }
    
    // Update last cleanup time
    CACHE_METADATA.lastCleanup = now;
    
    if (expiredKeys.length > 0) {
        console.log(`🧹 Cache cleanup: removed ${expiredKeys.length} expired items`);
        saveCacheMetadata();
        saveCacheStats();
    }
}

/**
 * Perform emergency cleanup when cache is near quota
 */
function performEmergencyCleanup() {
    console.warn('⚠️ Performing emergency cache cleanup');
    
    // Sort items by access time (oldest first) and size (largest first)
    const itemsToClean = Array.from(CACHE_METADATA.items.entries())
        .map(([key, metadata]) => ({ key, ...metadata }))
        .sort((a, b) => {
            // Prioritize: old items first, then large items
            const ageWeight = a.accessTime - b.accessTime;
            const sizeWeight = (b.size - a.size) * 0.1; // Lower weight for size
            return ageWeight + sizeWeight;
        });
    
    // Remove oldest/largest items until we're under the threshold
    const targetSize = CACHE_CONFIG.MAX_SIZE * 0.7; // Clean to 70% capacity
    let removedCount = 0;
    
    for (const item of itemsToClean) {
        if (CACHE_METADATA.totalSize <= targetSize) break;
        
        deleteCachedData(item.key);
        removedCount++;
        CACHE_STATS.evictions++;
    }
    
    console.log(`🚨 Emergency cleanup: removed ${removedCount} items, freed ${formatBytes(CACHE_CONFIG.MAX_SIZE * CACHE_CONFIG.EMERGENCY_CLEANUP_THRESHOLD - CACHE_METADATA.totalSize)}`);
}

/**
 * Cache data with TTL and optional compression
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 * @returns {boolean} - Success status
 */
export function setCachedData(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    initializeCache();
    
    if (!key || typeof key !== 'string') {
        console.warn('💾 setCachedData: Invalid key provided');
        return false;
    }
    
    if (data === undefined) {
        console.warn('💾 setCachedData: Cannot cache undefined data');
        return false;
    }
    
    try {
        // Serialize data
        let serializedData = JSON.stringify(data);
        let isCompressed = false;
        let originalSize = new Blob([serializedData]).size;
        
        // Compress if enabled and data is large enough
        if (CACHE_CONFIG.ENABLE_COMPRESSION && originalSize > CACHE_CONFIG.COMPRESSION_THRESHOLD) {
            try {
                const compressed = compressString(serializedData);
                if (compressed.length < serializedData.length * 0.9) { // Only use if 10%+ savings
                    serializedData = compressed;
                    isCompressed = true;
                    CACHE_STATS.compressions++;
                }
            } catch (compressionError) {
                console.warn('⚠️ Compression failed, storing uncompressed:', compressionError);
            }
        }
        
        const finalSize = new Blob([serializedData]).size;
        const now = Date.now();
        
        // Create cache item
        const cacheItem = {
            data: serializedData,
            compressed: isCompressed,
            created: now,
            ttl: now + ttl,
            accessTime: now,
            accessCount: 0,
            originalSize: originalSize,
            compressedSize: finalSize
        };
        
        const fullKey = `${CACHE_CONFIG.PREFIX}${key}`;
        
        // Check if we need to remove existing item
        const existingMetadata = CACHE_METADATA.items.get(key);
        if (existingMetadata) {
            CACHE_METADATA.totalSize -= existingMetadata.size;
        }
        
        // Check quota before storing
        const newSize = finalSize + 100; // Add overhead estimate
        if (CACHE_METADATA.totalSize + newSize > CACHE_CONFIG.MAX_SIZE) {
            // Try cleanup first
            performCleanup();
            
            // If still too large, try emergency cleanup
            if (CACHE_METADATA.totalSize + newSize > CACHE_CONFIG.MAX_SIZE) {
                performEmergencyCleanup();
            }
            
            // If still can't fit, reject
            if (CACHE_METADATA.totalSize + newSize > CACHE_CONFIG.MAX_SIZE) {
                console.warn(`💾 Cache quota exceeded, cannot store ${key}`);
                return false;
            }
        }
        
        // Store in localStorage
        localStorage.setItem(fullKey, JSON.stringify(cacheItem));
        
        // Update metadata
        const metadata = {
            size: finalSize,
            ttl: cacheItem.ttl,
            created: cacheItem.created,
            accessTime: cacheItem.accessTime,
            accessCount: cacheItem.accessCount,
            compressed: isCompressed,
            originalSize: originalSize
        };
        
        CACHE_METADATA.items.set(key, metadata);
        CACHE_METADATA.totalSize += finalSize;
        CACHE_METADATA.itemCount = CACHE_METADATA.items.size;
        
        // Update stats
        CACHE_STATS.sets++;
        CACHE_STATS.totalSize = CACHE_METADATA.totalSize;
        CACHE_STATS.itemCount = CACHE_METADATA.itemCount;
        
        // Periodic save (not on every operation for performance)
        if (CACHE_STATS.sets % 10 === 0) {
            saveCacheMetadata();
            saveCacheStats();
        }
        
        console.log(`💾 Cached "${key}" (${formatBytes(finalSize)}${isCompressed ? ', compressed' : ''})`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error caching data for key "${key}":`, error);
        CACHE_STATS.errors++;
        
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError') {
            console.warn('💾 localStorage quota exceeded, attempting cleanup');
            performEmergencyCleanup();
            return false;
        }
        
        return false;
    }
}

/**
 * Get cached data safely
 * @param {string} key - Cache key
 * @returns {*} - Cached data or null if not found/expired
 */
export function getCachedData(key) {
    if (!key || typeof key !== 'string') {
        console.warn('💾 getCachedData: Invalid key provided');
        return null;
    }
    
    initializeCache();
    
    try {
        const fullKey = `${CACHE_CONFIG.PREFIX}${key}`;
        const metadata = CACHE_METADATA.items.get(key);
        
        // Check if item exists in metadata
        if (!metadata) {
            CACHE_STATS.misses++;
            return null;
        }
        
        // Check TTL
        if (Date.now() > metadata.ttl) {
            console.log(`💾 Cache expired for key: ${key}`);
            deleteCachedData(key);
            CACHE_STATS.misses++;
            return null;
        }
        
        // Get item from localStorage
        const stored = localStorage.getItem(fullKey);
        if (!stored) {
            console.warn(`💾 Cache metadata exists but item missing: ${key}`);
            CACHE_METADATA.items.delete(key);
            saveCacheMetadata();
            CACHE_STATS.misses++;
            return null;
        }
        
        // Parse stored data
        const cacheItem = JSON.parse(stored);
        
        // Validate cache item structure
        if (!cacheItem || typeof cacheItem !== 'object' || !cacheItem.hasOwnProperty('data')) {
            console.warn(`💾 Invalid cache item structure: ${key}`);
            deleteCachedData(key);
            CACHE_STATS.misses++;
            return null;
        }
        
        // Update access statistics
        const now = Date.now();
        cacheItem.accessTime = now;
        cacheItem.accessCount = (cacheItem.accessCount || 0) + 1;
        
        // Update metadata
        metadata.accessTime = now;
        metadata.accessCount = cacheItem.accessCount;
        
        // Save updated item (async to avoid blocking)
        setTimeout(() => {
            try {
                localStorage.setItem(fullKey, JSON.stringify(cacheItem));
            } catch (error) {
                console.warn('Failed to update access stats:', error);
            }
        }, 0);
        
        // Decompress if needed
        let data = cacheItem.data;
        if (cacheItem.compressed) {
            try {
                data = decompressString(data);
                CACHE_STATS.decompressions++;
            } catch (decompressionError) {
                console.error(`💾 Decompression failed for key "${key}":`, decompressionError);
                deleteCachedData(key);
                CACHE_STATS.errors++;
                CACHE_STATS.misses++;
                return null;
            }
        }
        
        // Parse final data
        const parsedData = JSON.parse(data);
        
        // Update stats
        CACHE_STATS.hits++;
        
        console.log(`💾 Cache hit for "${key}" (${formatBytes(metadata.size)}${metadata.compressed ? ', compressed' : ''})`);
        
        return parsedData;
        
    } catch (error) {
        console.error(`❌ Error retrieving cached data for key "${key}":`, error);
        CACHE_STATS.errors++;
        CACHE_STATS.misses++;
        return null;
    }
}

/**
 * Delete cached data
 * @param {string} key - Cache key to delete
 * @returns {boolean} - Success status
 */
function deleteCachedData(key) {
    try {
        const fullKey = `${CACHE_CONFIG.PREFIX}${key}`;
        const metadata = CACHE_METADATA.items.get(key);
        
        // Remove from localStorage
        localStorage.removeItem(fullKey);
        
        // Update metadata
        if (metadata) {
            CACHE_METADATA.totalSize -= metadata.size;
            CACHE_METADATA.items.delete(key);
            CACHE_METADATA.itemCount = CACHE_METADATA.items.size;
        }
        
        CACHE_STATS.deletes++;
        CACHE_STATS.totalSize = CACHE_METADATA.totalSize;
        CACHE_STATS.itemCount = CACHE_METADATA.itemCount;
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error deleting cached data for key "${key}":`, error);
        CACHE_STATS.errors++;
        return false;
    }
}

/**
 * Clear specific cached data
 * @param {string} key - Cache key to clear
 * @returns {boolean} - Success status
 */
export function clearCachedData(key) {
    if (!key || typeof key !== 'string') {
        console.warn('💾 clearCachedData: Invalid key provided');
        return false;
    }
    
    return deleteCachedData(key);
}

/**
 * Clear all cached data
 * @returns {boolean} - Success status
 */
export function clearAllCachedData() {
    try {
        const keys = Array.from(CACHE_METADATA.items.keys());
        
        // Remove all cache items
        keys.forEach(key => {
            const fullKey = `${CACHE_CONFIG.PREFIX}${key}`;
            localStorage.removeItem(fullKey);
        });
        
        // Clear metadata
        CACHE_METADATA.items.clear();
        CACHE_METADATA.totalSize = 0;
        CACHE_METADATA.itemCount = 0;
        
        // Update stats
        CACHE_STATS.deletes += keys.length;
        CACHE_STATS.totalSize = 0;
        CACHE_STATS.itemCount = 0;
        
        // Save updated metadata and stats
        saveCacheMetadata();
        saveCacheStats();
        
        console.log(`💾 Cleared all cached data (${keys.length} items)`);
        return true;
        
    } catch (error) {
        console.error('❌ Error clearing all cached data:', error);
        CACHE_STATS.errors++;
        return false;
    }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
export function getCacheStats() {
    initializeCache();
    
    const uptime = Date.now() - CACHE_STATS.startTime;
    const hitRate = CACHE_STATS.hits + CACHE_STATS.misses > 0 ? 
        (CACHE_STATS.hits / (CACHE_STATS.hits + CACHE_STATS.misses)) * 100 : 0;
    
    return {
        ...CACHE_STATS,
        hitRate: Math.round(hitRate * 100) / 100,
        uptime: uptime,
        uptimeFormatted: formatDuration(uptime),
        totalSizeFormatted: formatBytes(CACHE_STATS.totalSize),
        averageItemSize: CACHE_STATS.itemCount > 0 ? 
            Math.round(CACHE_STATS.totalSize / CACHE_STATS.itemCount) : 0,
        quotaUsed: Math.round((CACHE_STATS.totalSize / CACHE_CONFIG.MAX_SIZE) * 100),
        compressionRatio: CACHE_STATS.compressions > 0 ? 
            Math.round((CACHE_STATS.compressions / CACHE_STATS.sets) * 100) : 0
    };
}

/**
 * Get cache item information
 * @param {string} key - Cache key
 * @returns {Object|null} - Cache item info
 */
export function getCacheItemInfo(key) {
    if (!key || typeof key !== 'string') {
        return null;
    }
    
    initializeCache();
    
    const metadata = CACHE_METADATA.items.get(key);
    if (!metadata) {
        return null;
    }
    
    const now = Date.now();
    const age = now - metadata.created;
    const timeToExpiry = metadata.ttl - now;
    
    return {
        key: key,
        size: metadata.size,
        sizeFormatted: formatBytes(metadata.size),
        originalSize: metadata.originalSize,
        originalSizeFormatted: formatBytes(metadata.originalSize),
        compressed: metadata.compressed,
        compressionRatio: metadata.compressed ? 
            Math.round((1 - metadata.size / metadata.originalSize) * 100) : 0,
        created: new Date(metadata.created).toISOString(),
        age: age,
        ageFormatted: formatDuration(age),
        ttl: metadata.ttl,
        timeToExpiry: timeToExpiry,
        timeToExpiryFormatted: timeToExpiry > 0 ? formatDuration(timeToExpiry) : 'Expired',
        accessCount: metadata.accessCount,
        lastAccess: new Date(metadata.accessTime).toISOString(),
        isExpired: timeToExpiry <= 0
    };
}

/**
 * List all cached items
 * @returns {Array} - Array of cache item info
 */
export function listCachedItems() {
    initializeCache();
    
    return Array.from(CACHE_METADATA.items.keys())
        .map(key => getCacheItemInfo(key))
        .filter(Boolean)
        .sort((a, b) => b.accessCount - a.accessCount); // Sort by access count
}

/**
 * Optimize cache by removing old or unused items
 * @param {Object} options - Optimization options
 * @returns {Object} - Optimization results
 */
export function optimizeCache(options = {}) {
    const {
        maxAge = 24 * 60 * 60 * 1000, // 24 hours
        minAccessCount = 1,
        targetQuota = 0.8 // 80% of max size
    } = options;
    
    initializeCache();
    
    const now = Date.now();
    const targetSize = CACHE_CONFIG.MAX_SIZE * targetQuota;
    let removedCount = 0;
    let freedBytes = 0;
    
    // Find items to remove
    const itemsToRemove = [];
    
    CACHE_METADATA.items.forEach((metadata, key) => {
        const age = now - metadata.created;
        const shouldRemove = (
            age > maxAge || 
            metadata.accessCount < minAccessCount ||
            now > metadata.ttl
        );
        
        if (shouldRemove) {
            itemsToRemove.push({ key, size: metadata.size, reason: 
                now > metadata.ttl ? 'expired' :
                age > maxAge ? 'old' : 'unused'
            });
        }
    });
    
    // Remove identified items
    itemsToRemove.forEach(item => {
        if (deleteCachedData(item.key)) {
            removedCount++;
            freedBytes += item.size;
        }
    });
    
    // If still over target, remove oldest items
    if (CACHE_METADATA.totalSize > targetSize) {
        const remainingItems = Array.from(CACHE_METADATA.items.entries())
            .map(([key, metadata]) => ({ key, ...metadata }))
            .sort((a, b) => a.accessTime - b.accessTime); // Oldest first
        
        for (const item of remainingItems) {
            if (CACHE_METADATA.totalSize <= targetSize) break;
            
            if (deleteCachedData(item.key)) {
                removedCount++;
                freedBytes += item.size;
            }
        }
    }
    
    // Save metadata after optimization
    saveCacheMetadata();
    saveCacheStats();
    
    const results = {
        removedCount,
        freedBytes,
        freedBytesFormatted: formatBytes(freedBytes),
        remainingItems: CACHE_METADATA.itemCount,
        remainingSize: CACHE_METADATA.totalSize,
        remainingSizeFormatted: formatBytes(CACHE_METADATA.totalSize),
        quotaUsed: Math.round((CACHE_METADATA.totalSize / CACHE_CONFIG.MAX_SIZE) * 100)
    };
    
    console.log(`🔧 Cache optimized: removed ${removedCount} items, freed ${formatBytes(freedBytes)}`);
    
    return results;
}

/**
 * Simple string compression using LZ-style algorithm
 * @param {string} str - String to compress
 * @returns {string} - Compressed string
 */
function compressString(str) {
    if (!str) return '';
    
    try {
        // Simple RLE + dictionary compression
        const dict = new Map();
        let dictSize = 256;
        let result = [];
        let w = '';
        
        for (let i = 0; i < str.length; i++) {
            const c = str.charAt(i);
            const wc = w + c;
            
            if (dict.has(wc)) {
                w = wc;
            } else {
                if (w) {
                    result.push(dict.has(w) ? dict.get(w) : w);
                }
                dict.set(wc, dictSize++);
                w = c;
            }
        }
        
        if (w) {
            result.push(dict.has(w) ? dict.get(w) : w);
        }
        
        return JSON.stringify(result);
        
    } catch (error) {
        console.warn('Compression failed, returning original:', error);
        return str;
    }
}

/**
 * Decompress string compressed with compressString
 * @param {string} compressed - Compressed string
 * @returns {string} - Decompressed string
 */
function decompressString(compressed) {
    if (!compressed) return '';
    
    try {
        const data = JSON.parse(compressed);
        if (!Array.isArray(data)) return compressed;
        
        const dict = new Map();
        let dictSize = 256;
        let result = '';
        let w = String.fromCharCode(data[0]);
        result = w;
        
        for (let i = 1; i < data.length; i++) {
            const k = data[i];
            let entry;
            
            if (dict.has(k)) {
                entry = dict.get(k);
            } else if (k === dictSize) {
                entry = w + w.charAt(0);
            } else {
                throw new Error('Invalid compressed data');
            }
            
            result += entry;
            dict.set(dictSize++, w + entry.charAt(0));
            w = entry;
        }
        
        return result;
        
    } catch (error) {
        console.warn('Decompression failed, returning as-is:', error);
        return compressed;
    }
}

/**
 * Format bytes in human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in human readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
}

/**
 * Destroy cache system and cleanup
 */
export function destroyCache() {
    try {
        // Stop cleanup timer
        stopPeriodicCleanup();
        
        // Save final state
        saveCacheMetadata();
        saveCacheStats();
        
        // Clear memory
        CACHE_METADATA.items.clear();
        
        // Reset initialization flag
        isInitialized = false;
        
        console.log('💾 Cache system destroyed and cleaned up');
        
    } catch (error) {
        console.error('❌ Error destroying cache:', error);
    }
}

// Export cache configuration for external access
export const CACHE_CONFIG_READONLY = { ...CACHE_CONFIG };

// Export for debugging
export function getInternalState() {
    return {
        metadata: CACHE_METADATA,
        stats: CACHE_STATS,
        config: CACHE_CONFIG,
        isInitialized
    };
}

console.log('💾 ModuleCache system loaded successfully with enterprise features');
