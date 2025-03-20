import fs from "fs";
import path from "path";
import { LoggingConfig } from "../types";

/**
 * Log levels
 */
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Simple logger for the DNS firewall
 */
export class Logger {
  private level: LogLevel = LogLevel.INFO;
  private queryLog: boolean = true;
  private logFile?: string;
  private logStream?: fs.WriteStream;

  /**
   * Initialize the logger
   * @param config Logging configuration
   */
  constructor(config?: LoggingConfig) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the logger
   * @param config Logging configuration
   */
  public configure(config: LoggingConfig): void {
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
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Open log stream
      this.logStream = fs.createWriteStream(this.logFile, { flags: "a" });
    }
  }

  /**
   * Log an error message
   * @param message Message to log
   */
  public error(message: string): void {
    this.log(LogLevel.ERROR, `ERROR: ${message}`);
  }

  /**
   * Log a warning message
   * @param message Message to log
   */
  public warn(message: string): void {
    this.log(LogLevel.WARN, `WARN: ${message}`);
  }

  /**
   * Log an info message
   * @param message Message to log
   */
  public info(message: string): void {
    this.log(LogLevel.INFO, `INFO: ${message}`);
  }

  /**
   * Log a debug message
   * @param message Message to log
   */
  public debug(message: string): void {
    this.log(LogLevel.DEBUG, `DEBUG: ${message}`);
  }

  /**
   * Log a query
   * @param clientIp Client IP address
   * @param domain Domain being queried
   * @param type Query type
   * @param blocked Whether the query was blocked
   */
  public logQuery(
    clientIp: string,
    domain: string,
    type: number,
    blocked: boolean
  ): void {
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
  public close(): void {
    if (this.logStream) {
      this.logStream.end();
    }
  }

  /**
   * Log a message at a specific level
   * @param level Log level
   * @param message Message to log
   */
  private log(level: LogLevel, message: string): void {
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
