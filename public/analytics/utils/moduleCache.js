// ==========================================
// MODULE CACHE - Enterprise Caching System
// Secure localStorage-based caching with TTL, compression, and analytics
// ==========================================

/**
 * Enterprise-grade caching system for analytics modules
 * Provides secure localStorage management with TTL, compression, and monitoring
 */

// Cache configuration and constants
const CACHE_CONFIG = {
    PREFIX: 'oslira_analytics_',
    VERSION: '1.0.0',
    MAX_CACHE_SIZE: 10 * 1024 * 1024, // 10MB total cache limit
    MAX_ITEM_SIZE: 2 * 1024 * 1024,   // 2MB per item limit
    DEFAULT_TTL: 3600000,             // 1 hour default TTL
    CLEANUP_INTERVAL: 300000,         // 5 minutes cleanup interval
    COMPRESSION_THRESHOLD: 10240,     // 10KB - compress items larger than this
    ENABLE_ANALYTICS: true,
    ENABLE_ENCRYPTION: false          // Future enhancement
};

// Cache statistics and monitoring
const CACHE_STATS = {
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
    lastCleanup: Date.now(),
    createdAt: Date.now()
};

// Cache metadata storage
const CACHE_METADATA = {
    items: new Map(),       // key -> { size, ttl, compressed, created, accessed }
    totalSize: 0,
    cleanupTimer: null,
    initialized: false
};

/**
 * Initialize the cache system
 */
function initializeCache() {
    if (CACHE_METADATA.initialized) return;
    
    try {
        // Load existing metadata from localStorage
        loadCacheMetadata();
        
        // Start periodic cleanup
        startCleanupTimer();
        
        // Setup storage event listener for cross-tab sync
        setupStorageListener();
        
        // Setup beforeunload cleanup
        setupUnloadCleanup();
        
        CACHE_METADATA.initialized = true;
        
        console.log('💾 Module cache initialized:', {
            version: CACHE_CONFIG.VERSION,
            maxSize: formatBytes(CACHE_CONFIG.MAX_CACHE_SIZE),
            itemCount: CACHE_METADATA.items.size,
            totalSize: formatBytes(CACHE_METADATA.totalSize)
        });
        
    } catch (error) {
        console.error('❌ Cache initialization failed:', error);
        CACHE_STATS.errors++;
    }
}

/**
 * Load cache metadata from localStorage
 */
function loadCacheMetadata() {
    try {
        const metadataKey = `${CACHE_CONFIG.PREFIX}metadata`;
        const stored = localStorage.getItem(metadataKey);
        
        if (stored) {
            const metadata = JSON.parse(stored);
            
            // Validate and restore metadata
            if (metadata.version === CACHE_CONFIG.VERSION) {
                CACHE_METADATA.items = new Map(metadata.items);
                CACHE_METADATA.totalSize = metadata.totalSize || 0;
                
                // Validate items still exist and update statistics
                validateStoredItems();
            } else {
                console.warn('💾 Cache version mismatch, clearing cache');
                clearAllCachedData();
            }
        }
        
    } catch (error) {
        console.warn('⚠️ Failed to load cache metadata:', error);
        CACHE_METADATA.items.clear();
        CACHE_METADATA.totalSize = 0;
    }
}

/**
 * Save cache metadata to localStorage
 */
function saveCacheMetadata() {
    try {
        const metadataKey = `${CACHE_CONFIG.PREFIX}metadata`;
        const metadata = {
            version: CACHE_CONFIG.VERSION,
            items: Array.from(CACHE_METADATA.items.entries()),
            totalSize: CACHE_METADATA.totalSize,
            savedAt: Date.now()
        };
        
        localStorage.setItem(metadataKey, JSON.stringify(metadata));
        
    } catch (error) {
        console.warn('⚠️ Failed to save cache metadata:', error);
        CACHE_STATS.errors++;
    }
}

/**
 * Validate that stored items still exist in localStorage
 */
function validateStoredItems() {
    const invalidKeys = [];
    
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
        
        // Decompress if needed
        let data = cacheItem.data;
        if (metadata.compressed && cacheItem.compressed) {
            data = decompressData(cacheItem.data);
            CACHE_STATS.decompressions++;
        }
        
        // Update access time
        metadata.accessed = Date.now();
        saveCacheMetadata();
        
        CACHE_STATS.hits++;
        
        return data;
        
    } catch (error) {
        console.error(`❌ Error retrieving cached data for key "${key}":`, error);
        CACHE_STATS.errors++;
        
        // Clean up corrupted item
        try {
            deleteCachedData(key);
        } catch (cleanupError) {
            console.error('❌ Failed to clean up corrupted cache item:', cleanupError);
        }
        
        return null;
    }
}

/**
 * Set cached data with TTL and size management
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (optional)
 * @returns {boolean} - Success status
 */
export function setCachedData(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    if (!key || typeof key !== 'string') {
        console.warn('💾 setCachedData: Invalid key provided');
        return false;
    }
    
    if (data === undefined) {
        console.warn('💾 setCachedData: Cannot cache undefined data');
        return false;
    }
    
    initializeCache();
    
    try {
        // Serialize data
        const serialized = JSON.stringify(data);
        const dataSize = new Blob([serialized]).size;
        
        // Check item size limit
        if (dataSize > CACHE_CONFIG.MAX_ITEM_SIZE) {
            console.warn(`💾 Item too large to cache: ${key} (${formatBytes(dataSize)})`);
            return false;
        }
        
        // Prepare cache item
        let cacheItem = {
            data: data,
            version: CACHE_CONFIG.VERSION,
            created: Date.now(),
            compressed: false
        };
        
        let shouldCompress = false;
        let compressedData = null;
        
        // Check if compression is beneficial
        if (dataSize > CACHE_CONFIG.COMPRESSION_THRESHOLD) {
            compressedData = compressData(data);
            const compressedSize = new Blob([JSON.stringify(compressedData)]).size;
            
            if (compressedSize < dataSize * 0.8) { // Only compress if at least 20% savings
                shouldCompress = true;
                cacheItem.data = compressedData;
                cacheItem.compressed = true;
                CACHE_STATS.compressions++;
            }
        }
        
        // Calculate final item size
        const itemString = JSON.stringify(cacheItem);
        const finalSize = new Blob([itemString]).size;
        
        // Check if we need to evict items
        const requiredSpace = finalSize;
        if (!ensureSpace(requiredSpace, key)) {
            console.warn(`💾 Unable to free enough space for: ${key}`);
            return false;
        }
        
        // Store the item
        const fullKey = `${CACHE_CONFIG.PREFIX}${key}`;
        localStorage.setItem(fullKey, itemString);
        
        // Update metadata
        const existingMetadata = CACHE_METADATA.items.get(key);
        if (existingMetadata) {
            CACHE_METADATA.totalSize -= existingMetadata.size;
        }
        
        const newMetadata = {
            size: finalSize,
            ttl: Date.now() + ttl,
            compressed: shouldCompress,
            created: Date.now(),
            accessed: Date.now()
        };
        
        CACHE_METADATA.items.set(key, newMetadata);
        CACHE_METADATA.totalSize += finalSize;
        
        // Save metadata
        saveCacheMetadata();
        
        CACHE_STATS.sets++;
        CACHE_STATS.totalSize = CACHE_METADATA.totalSize;
        CACHE_STATS.itemCount = CACHE_METADATA.items.size;
        
        console.log(`💾 Cached: ${key} (${formatBytes(finalSize)}${shouldCompress ? ', compressed' : ''})`);
        
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
 * Delete cached data (internal function)
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
            saveCacheMetadata();
        }
        
        CACHE_STATS.deletes++;
        CACHE_STATS.totalSize = CACHE_METADATA.totalSize;
        CACHE_STATS.itemCount = CACHE_METADATA.items.size;
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error deleting cached data for key "${key}":`, error);
        CACHE_STATS.errors++;
        return false;
    }
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
        
        // Remove metadata
        const metadataKey = `${CACHE_CONFIG.PREFIX}metadata`;
        localStorage.removeItem(metadataKey);
        
        // Reset metadata
        CACHE_METADATA.items.clear();
        CACHE_METADATA.totalSize = 0;
        
        // Reset stats
        CACHE_STATS.deletes += keys.length;
        CACHE_STATS.totalSize = 0;
        CACHE_STATS.itemCount = 0;
        
        console.log(`💾 Cleared all cached data (${keys.length} items)`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error clearing all cached data:', error);
        CACHE_STATS.errors++;
        return false;
    }
}

/**
 * Get cache statistics and health information
 * @returns {Object} - Cache statistics
 */
export function getCacheStats() {
    initializeCache();
    
    const hitRate = CACHE_STATS.hits + CACHE_STATS.misses > 0 
        ? (CACHE_STATS.hits / (CACHE_STATS.hits + CACHE_STATS.misses)) * 100 
        : 0;
    
    const compressionRate = CACHE_STATS.sets > 0 
        ? (CACHE_STATS.compressions / CACHE_STATS.sets) * 100 
        : 0;
    
    return {
        // Basic stats
        hits: CACHE_STATS.hits,
        misses: CACHE_STATS.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        
        // Operations
        sets: CACHE_STATS.sets,
        deletes: CACHE_STATS.deletes,
        evictions: CACHE_STATS.evictions,
        errors: CACHE_STATS.errors,
        
        // Compression
        compressions: CACHE_STATS.compressions,
        decompressions: CACHE_STATS.decompressions,
        compressionRate: Math.round(compressionRate * 100) / 100,
        
        // Size and capacity
        itemCount: CACHE_METADATA.items.size,
        totalSize: CACHE_METADATA.totalSize,
        totalSizeFormatted: formatBytes(CACHE_METADATA.totalSize),
        maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
        maxSizeFormatted: formatBytes(CACHE_CONFIG.MAX_CACHE_SIZE),
        utilizationPercent: Math.round((CACHE_METADATA.totalSize / CACHE_CONFIG.MAX_CACHE_SIZE) * 100),
        
        // Health
        lastCleanup: CACHE_STATS.lastCleanup,
        uptime: Date.now() - CACHE_STATS.createdAt,
        
        // Configuration
        config: {
            defaultTTL: CACHE_CONFIG.DEFAULT_TTL,
            maxItemSize: CACHE_CONFIG.MAX_ITEM_SIZE,
            compressionThreshold: CACHE_CONFIG.COMPRESSION_THRESHOLD,
            cleanupInterval: CACHE_CONFIG.CLEANUP_INTERVAL
        }
    };
}

/**
 * Get information about cached items
 * @returns {Array} - Array of cache item information
 */
export function getCacheItems() {
    initializeCache();
    
    const items = [];
    const now = Date.now();
    
    CACHE_METADATA.items.forEach((metadata, key) => {
        items.push({
            key,
            size: metadata.size,
            sizeFormatted: formatBytes(metadata.size),
            compressed: metadata.compressed,
            created: new Date(metadata.created).toISOString(),
            accessed: new Date(metadata.accessed).toISOString(),
            ttl: metadata.ttl,
            expiresIn: Math.max(0, metadata.ttl - now),
            expired: now > metadata.ttl,
            age: now - metadata.created
        });
    });
    
    return items.sort((a, b) => b.accessed - a.accessed);
}

/**
 * Ensure sufficient space is available for new item
 * @param {number} requiredSize - Required space in bytes
 * @param {string} excludeKey - Key to exclude from eviction
 * @returns {boolean} - Whether space was made available
 */
function ensureSpace(requiredSize, excludeKey = null) {
    const availableSpace = CACHE_CONFIG.MAX_CACHE_SIZE - CACHE_METADATA.totalSize;
    
    if (availableSpace >= requiredSize) {
        return true;
    }
    
    const spaceNeeded = requiredSize - availableSpace;
    let spaceFreed = 0;
    
    // Get items sorted by access time (oldest first)
    const items = Array.from(CACHE_METADATA.items.entries())
        .filter(([key]) => key !== excludeKey)
        .sort(([, a], [, b]) => a.accessed - b.accessed);
    
    // Evict oldest items until we have enough space
    for (const [key, metadata] of items) {
        if (spaceFreed >= spaceNeeded) break;
        
        deleteCachedData(key);
        spaceFreed += metadata.size;
        CACHE_STATS.evictions++;
        
        console.log(`💾 Evicted cache item: ${key} (${formatBytes(metadata.size)})`);
    }
    
    return spaceFreed >= spaceNeeded;
}

/**
 * Perform cleanup of expired items
 */
function performCleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    CACHE_METADATA.items.forEach((metadata, key) => {
        if (now > metadata.ttl) {
            expiredKeys.push(key);
        }
    });
    
    expiredKeys.forEach(key => {
        deleteCachedData(key);
    });
    
    CACHE_STATS.lastCleanup = now;
    
    if (expiredKeys.length > 0) {
        console.log(`💾 Cleanup removed ${expiredKeys.length} expired items`);
    }
}

/**
 * Perform emergency cleanup when quota is exceeded
 */
function performEmergencyCleanup() {
    console.warn('💾 Performing emergency cache cleanup');
    
    // Remove oldest 25% of items
    const items = Array.from(CACHE_METADATA.items.entries())
        .sort(([, a], [, b]) => a.accessed - b.accessed);
    
    const itemsToRemove = Math.ceil(items.length * 0.25);
    
    for (let i = 0; i < itemsToRemove && i < items.length; i++) {
        const [key] = items[i];
        deleteCachedData(key);
        CACHE_STATS.evictions++;
    }
    
    console.log(`💾 Emergency cleanup removed ${itemsToRemove} items`);
}

/**
 * Start periodic cleanup timer
 */
function startCleanupTimer() {
    if (CACHE_METADATA.cleanupTimer) {
        clearInterval(CACHE_METADATA.cleanupTimer);
    }
    
    CACHE_METADATA.cleanupTimer = setInterval(() => {
        try {
            performCleanup();
        } catch (error) {
            console.error('❌ Cache cleanup error:', error);
            CACHE_STATS.errors++;
        }
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
}

/**
 * Setup storage event listener for cross-tab synchronization
 */
function setupStorageListener() {
    window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith(CACHE_CONFIG.PREFIX)) {
            // Another tab modified cache, reload metadata
            loadCacheMetadata();
        }
    });
}

/**
 * Setup cleanup on page unload
 */
function setupUnloadCleanup() {
    window.addEventListener('beforeunload', () => {
        if (CACHE_METADATA.cleanupTimer) {
            clearInterval(CACHE_METADATA.cleanupTimer);
        }
        
        // Final cleanup
        try {
            performCleanup();
        } catch (error) {
            // Ignore errors during unload
        }
    });
}

/**
 * Simple compression using Run-Length Encoding for repeated data
 * @param {*} data - Data to compress
 * @returns {string} - Compressed data
 */
function compressData(data) {
    try {
        const jsonString = JSON.stringify(data);
        
        // Simple RLE compression for demonstration
        // In production, consider using a proper compression library
        let compressed = '';
        let count = 1;
        let prev = jsonString[0];
        
        for (let i = 1; i < jsonString.length; i++) {
            const char = jsonString[i];
            
            if (char === prev && count < 255) {
                count++;
            } else {
                if (count > 3) {
                    compressed += `~${count}${prev}`;
                } else {
                    compressed += prev.repeat(count);
                }
                prev = char;
                count = 1;
            }
        }
        
        // Handle last character
        if (count > 3) {
            compressed += `~${count}${prev}`;
        } else {
            compressed += prev.repeat(count);
        }
        
        return compressed.length < jsonString.length ? compressed : jsonString;
        
    } catch (error) {
        console.warn('💾 Compression failed:', error);
        return JSON.stringify(data);
    }
}

/**
 * Decompress data compressed with compressData
 * @param {string} compressedData - Compressed data string
 * @returns {*} - Decompressed data
 */
function decompressData(compressedData) {
    try {
        // Check if data was actually compressed
        if (!compressedData.includes('~')) {
            return JSON.parse(compressedData);
        }
        
        let decompressed = '';
        let i = 0;
        
        while (i < compressedData.length) {
            if (compressedData[i] === '~') {
                // Extract count and character
                i++; // Skip ~
                let countStr = '';
                
                while (i < compressedData.length && /\d/.test(compressedData[i])) {
                    countStr += compressedData[i];
                    i++;
                }
                
                const count = parseInt(countStr);
                const char = compressedData[i];
                
                decompressed += char.repeat(count);
                i++;
            } else {
                decompressed += compressedData[i];
                i++;
            }
        }
        
        return JSON.parse(decompressed);
        
    } catch (error) {
        console.warn('💾 Decompression failed:', error);
        // Try to parse as regular JSON
        try {
            return JSON.parse(compressedData);
        } catch (parseError) {
            console.error('💾 Failed to parse compressed data as JSON:', parseError);
            return null;
        }
    }
}

/**
 * Format bytes into human-readable string
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
 * Check if cache key exists
 * @param {string} key - Cache key to check
 * @returns {boolean} - Whether key exists and is not expired
 */
export function hasCachedData(key) {
    if (!key || typeof key !== 'string') return false;
    
    initializeCache();
    
    const metadata = CACHE_METADATA.items.get(key);
    if (!metadata) return false;
    
    return Date.now() <= metadata.ttl;
}

/**
 * Get remaining TTL for a cache key
 * @param {string} key - Cache key
 * @returns {number} - Remaining TTL in milliseconds, or -1 if not found
 */
export function getCacheTTL(key) {
    if (!key || typeof key !== 'string') return -1;
    
    initializeCache();
    
    const metadata = CACHE_METADATA.items.get(key);
    if (!metadata) return -1;
    
    return Math.max(0, metadata.ttl - Date.now());
}

/**
 * Update TTL for existing cache item
 * @param {string} key - Cache key
 * @param {number} newTTL - New TTL in milliseconds
 * @returns {boolean} - Success status
 */
export function updateCacheTTL(key, newTTL) {
    if (!key || typeof key !== 'string') return false;
    
    initializeCache();
    
    const metadata = CACHE_METADATA.items.get(key);
    if (!metadata) return false;
    
    metadata.ttl = Date.now() + newTTL;
    saveCacheMetadata();
    
    return true;
}

// Export cache configuration for external access
export const cacheConfig = CACHE_CONFIG;

// Initialize cache on module load
initializeCache();

export {
  getCachedData,
  setCachedData,
  clearCachedData,
  clearAllCachedData,
  getCacheStats,
  getCacheItems,
  hasCachedData,
  getCacheTTL,
  updateCacheTTL,
  cacheConfig
};

if (typeof window !== 'undefined') {
  window.OsliraApp = window.OsliraApp || {};
  window.OsliraApp.moduleCache = {
    getCachedData,
    setCachedData,
    clearCachedData,
    clearAllCachedData,
    getCacheStats,
    getCacheItems,
    hasCachedData,
    getCacheTTL,
    updateCacheTTL,
    cacheConfig
  };
}

console.log('💾 Module cache system loaded successfully');
