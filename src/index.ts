import { DNSServer } from "./server/server";
import { ConfigManager } from "./config/configManager";
import { Resolver } from "./resolver/resolver";
import { FilterManager } from "./filter/filterManager";
import { CacheManager } from "./cache/cacheManager";
import { Logger } from "./utils/logger";

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
export async function createServer(configPath: string): Promise<DNSServer> {
  const configManager = new ConfigManager(configPath);
  await configManager.load();
  const config = configManager.getConfig();

  const logger = new Logger(config.logging); // <--- burası önemli
  logger.info("Starting DNS Firewall...");
  logger.info("Configuration loaded");

  const cacheManager = new CacheManager(config.cache);
  const filterManager = new FilterManager(config.blocking);
  await filterManager.initialize();

  const resolver = new Resolver(
    config.upstreams,
    cacheManager,
    filterManager,
    logger
  );
  const server = new DNSServer(config.server, resolver, logger);

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
