import { DNSServer } from "./server/server";
export { DNSServer } from "./server/server";
export { ConfigManager } from "./config/configManager";
export { Resolver } from "./resolver/resolver";
export { FilterManager } from "./filter/filterManager";
export { CacheManager } from "./cache/cacheManager";
export * from "./types";
/**
 * Create and start a DNS firewall server
 * @param configPath Path to configuration file
 */
export declare function createServer(configPath: string): Promise<DNSServer>;
