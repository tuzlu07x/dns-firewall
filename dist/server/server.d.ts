import { ServerConfig } from "../types";
import { Resolver } from "../resolver/resolver";
import { Logger } from "../utils/logger";
/**
 * DNS Server that listens for queries and processes them
 */
export declare class DNSServer {
    private server;
    private config;
    private resolver;
    private logger;
    private running;
    /**
     * Create a new DNS server
     * @param config Server configuration
     * @param resolver DNS resolver to handle queries
     * @param logger Logger instance
     */
    constructor(config: ServerConfig, resolver: Resolver, logger: Logger);
    /**
     * Setup UDP socket event handlers
     */
    private setupEventHandlers;
    /**
     * Start the DNS server
     */
    start(): Promise<void>;
    /**
     * Stop the DNS server
     */
    stop(): Promise<void>;
    /**
     * Handle incoming DNS message
     */
    private handleMessage;
}
