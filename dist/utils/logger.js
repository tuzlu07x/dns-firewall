"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Log levels
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
/**
 * Simple logger for the DNS firewall
 */
class Logger {
    /**
     * Initialize the logger
     * @param config Logging configuration
     */
    constructor(config) {
        this.level = LogLevel.INFO;
        this.queryLog = true;
        if (config) {
            this.configure(config);
        }
    }
    /**
     * Configure the logger
     * @param config Logging configuration
     */
    configure(config) {
        // Set log level
        switch (config.level) {
            case "error":
                this.level = LogLevel.ERROR;
                break;
            case "warn":
                this.level = LogLevel.WARN;
                break;
            case "info":
                this.level = LogLevel.INFO;
                break;
            case "debug":
                this.level = LogLevel.DEBUG;
                break;
            default:
                this.level = LogLevel.INFO;
        }
        this.queryLog = config.queryLog;
        // Setup log file if specified
        if (config.file) {
            this.logFile = config.file;
            // Create directory if it doesn't exist
            const dir = path_1.default.dirname(this.logFile);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            // Open log stream
            this.logStream = fs_1.default.createWriteStream(this.logFile, { flags: "a" });
        }
    }
    /**
     * Log an error message
     * @param message Message to log
     */
    error(message) {
        this.log(LogLevel.ERROR, `ERROR: ${message}`);
    }
    /**
     * Log a warning message
     * @param message Message to log
     */
    warn(message) {
        this.log(LogLevel.WARN, `WARN: ${message}`);
    }
    /**
     * Log an info message
     * @param message Message to log
     */
    info(message) {
        this.log(LogLevel.INFO, `INFO: ${message}`);
    }
    /**
     * Log a debug message
     * @param message Message to log
     */
    debug(message) {
        this.log(LogLevel.DEBUG, `DEBUG: ${message}`);
    }
    /**
     * Log a query
     * @param clientIp Client IP address
     * @param domain Domain being queried
     * @param type Query type
     * @param blocked Whether the query was blocked
     */
    logQuery(clientIp, domain, type, blocked) {
        if (!this.queryLog) {
            return;
        }
        const timestamp = new Date().toISOString();
        const action = blocked ? "BLOCKED" : "ALLOWED";
        const message = `${timestamp},${clientIp},${domain},${type},${action}`;
        if (this.logStream) {
            this.logStream.write(`${message}\n`);
        }
        this.debug(`Query: ${message}`);
    }
    /**
     * Close the logger
     */
    close() {
        if (this.logStream) {
            this.logStream.end();
        }
    }
    /**
     * Log a message at a specific level
     * @param level Log level
     * @param message Message to log
     */
    log(level, message) {
        if (level > this.level) {
            return;
        }
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${message}`;
        // Output to console
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
        // Output to log file
        if (this.logStream) {
            this.logStream.write(`${formattedMessage}\n`);
        }
    }
}
exports.Logger = Logger;
