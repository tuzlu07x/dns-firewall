"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
/**
 * Manages caching of DNS responses
 */
class CacheManager {
    constructor(config) {
        this.config = config;
        this.cache = new node_cache_1.default({
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
    set(key, response) {
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
    get(key) {
        if (!this.config.enabled) {
            return null;
        }
        return this.cache.get(key) || null;
    }
    /**
     * Clear the cache
     */
    clear() {
        this.cache.flushAll();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            keys: this.cache.keys().length,
            hits: this.cache.getStats().hits,
            misses: this.cache.getStats().misses,
        };
    }
}
exports.CacheManager = CacheManager;
