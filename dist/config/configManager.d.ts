import { Config } from "../types";
/**
 * Manages configuration loading and access
 */
export declare class ConfigManager {
    private config;
    private configPath;
    constructor(configPath: string);
    /**
     * Load configuration from file
     */
    load(): Promise<void>;
    /**
     * Get the current configuration
     */
    getConfig(): Config;
    /**
     * Load configuration from a directory containing YAML files
     */
    private loadFromDirectory;
    /**
     * Load configuration from a single file
     */
    private loadFromFile;
    /**
     * Deep merge two objects
     */
    private deepMerge;
    /**
     * Check if value is an object
     */
    private isObject;
}
