import NodeCache from "node-cache";
import { CacheConfig, DNSResponse } from "../types";

/**
 * Manages caching of DNS responses
 */
export class CacheManager {
  private cache: NodeCache;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new NodeCache({
      stdTTL: config.ttl,
      checkperiod: Math.min(config.ttl / 2, 600), // Check for expired items
      maxKeys: config.maxSize,
      useClones: false, // For better performance
    });
  }

  /**
   * Set a DNS response in the cache
   * @param key Cache key
   * @param response DNS response to cache
   */
  public set(key: string, response: DNSResponse): void {
    if (!this.config.enabled) {
      return;
    }

    // Find lowest TTL from all answer records
    let minTtl = this.config.ttl;
    if (response.answers && response.answers.length > 0) {
      const answerTtls = response.answers
        .map((a) => a.ttl)
        .filter((ttl) => ttl > 0);
      if (answerTtls.length > 0) {
        minTtl = Math.min(...answerTtls, this.config.ttl);
      }
    }

    // Cache with the determined TTL
    this.cache.set(key, response, minTtl);
  }

  /**
   * Get a DNS response from the cache
   * @param key Cache key
   */
  public get(key: string): DNSResponse | null {
    if (!this.config.enabled) {
      return null;
    }

    return (this.cache.get(key) as DNSResponse) || null;
  }

  /**
   * Clear the cache
   */
  public clear(): void {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  public getStats(): { keys: number; hits: number; misses: number } {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
    };
  }
}
