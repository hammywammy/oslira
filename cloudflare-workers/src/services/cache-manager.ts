//NEEDS IMPLEMENTATION, also look through the other files and remove unnecesary caching stuff
export class CacheManager {
  private env: Env;
  
  async getWithStrategy(key: string, generator: () => Promise<any>, options: CacheOptions): Promise<any> {
    // Check multiple cache layers
    const memoryCache = this.checkMemoryCache(key);
    if (memoryCache) return memoryCache;
    
    const r2Cache = await this.checkR2Cache(key);
    if (r2Cache && this.isFresh(r2Cache, options)) {
      this.setMemoryCache(key, r2Cache.data, options.memoryTTL);
      return r2Cache.data;
    }
    
    // Stale-while-revalidate pattern
    if (r2Cache && options.staleWhileRevalidate) {
      // Return stale data immediately
      this.revalidateInBackground(key, generator, options);
      return r2Cache.data;
    }
    
    // Generate fresh data
    const freshData = await generator();
    await this.setR2Cache(key, freshData, options.r2TTL);
    this.setMemoryCache(key, freshData, options.memoryTTL);
    
    return freshData;
  }
  
  private revalidateInBackground(key: string, generator: () => Promise<any>, options: CacheOptions) {
    // Use waitUntil to extend request lifetime
    generator().then(freshData => {
      this.setR2Cache(key, freshData, options.r2TTL);
      this.setMemoryCache(key, freshData, options.memoryTTL);
    }).catch(err => {
      console.error('Background revalidation failed:', err);
    });
  }
}
