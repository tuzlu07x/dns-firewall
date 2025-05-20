"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = exports.FilterManager = exports.Resolver = exports.ConfigManager = exports.DNSServer = void 0;
exports.createServer = createServer;
const server_1 = require("./server/server");
const configManager_1 = require("./config/configManager");
const resolver_1 = require("./resolver/resolver");
const filterManager_1 = require("./filter/filterManager");
const cacheManager_1 = require("./cache/cacheManager");
const logger_1 = require("./utils/logger");
var server_2 = require("./server/server");
Object.defineProperty(exports, "DNSServer", { enumerable: true, get: function () { return server_2.DNSServer; } });
var configManager_2 = require("./config/configManager");
Object.defineProperty(exports, "ConfigManager", { enumerable: true, get: function () { return configManager_2.ConfigManager; } });
var resolver_2 = require("./resolver/resolver");
Object.defineProperty(exports, "Resolver", { enumerable: true, get: function () { return resolver_2.Resolver; } });
var filterManager_2 = require("./filter/filterManager");
Object.defineProperty(exports, "FilterManager", { enumerable: true, get: function () { return filterManager_2.FilterManager; } });
var cacheManager_2 = require("./cache/cacheManager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cacheManager_2.CacheManager; } });
__exportStar(require("./types"), exports);
/**
 * Create and start a DNS firewall server
 * @param configPath Path to configuration file
 */
async function createServer(configPath) {
    const configManager = new configManager_1.ConfigManager(configPath);
    await configManager.load();
    const config = configManager.getConfig();
    const logger = new logger_1.Logger(config.logging); // <--- burası önemli
    logger.info("Starting DNS Firewall...");
    logger.info("Configuration loaded");
    const cacheManager = new cacheManager_1.CacheManager(config.cache);
    const filterManager = new filterManager_1.FilterManager(config.blocking);
    await filterManager.initialize();
    const resolver = new resolver_1.Resolver(config.upstreams, cacheManager, filterManager, logger);
    const server = new server_1.DNSServer(config.server, resolver, logger);
    return server;
}
// CLI entrypoint
if (require.main === module) {
    const configPath = process.argv[2] || "./config.yml";
    createServer(configPath)
        .then((server) => server.start())
        .catch((err) => {
        console.error("Failed to start DNS Firewall:", err);
        process.exit(1);
    });
}
