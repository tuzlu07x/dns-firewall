import { CacheConfig, DNSResponse } from "../types";
/**
 * Manages caching of DNS responses
 */
export declare class CacheManager {
    private cache;
    private config;
    constructor(config: CacheConfig);
    /**
     * Set a DNS response in the cache
     * @param key Cache key
     * @param response DNS response to cache
     */
    set(key: string, response: DNSResponse): void;
    /**
     * Get a DNS response from the cache
     * @param key Cache key
     */
    get(key: string): DNSResponse | null;
    /**
     * Clear the cache
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        keys: number;
        hits: number;
        misses: number;
    };
}
