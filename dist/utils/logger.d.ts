import { LoggingConfig } from "../types";
/**
 * Simple logger for the DNS firewall
 */
export declare class Logger {
    private level;
    private queryLog;
    private logFile?;
    private logStream?;
    /**
     * Initialize the logger
     * @param config Logging configuration
     */
    constructor(config?: LoggingConfig);
    /**
     * Configure the logger
     * @param config Logging configuration
     */
    configure(config: LoggingConfig): void;
    /**
     * Log an error message
     * @param message Message to log
     */
    error(message: string): void;
    /**
     * Log a warning message
     * @param message Message to log
     */
    warn(message: string): void;
    /**
     * Log an info message
     * @param message Message to log
     */
    info(message: string): void;
    /**
     * Log a debug message
     * @param message Message to log
     */
    debug(message: string): void;
    /**
     * Log a query
     * @param clientIp Client IP address
     * @param domain Domain being queried
     * @param type Query type
     * @param blocked Whether the query was blocked
     */
    logQuery(clientIp: string, domain: string, type: number, blocked: boolean): void;
    /**
     * Close the logger
     */
    close(): void;
    /**
     * Log a message at a specific level
     * @param level Log level
     * @param message Message to log
     */
    private log;
}
