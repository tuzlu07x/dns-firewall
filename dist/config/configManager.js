"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
    server: {
        port: 53,
        address: "0.0.0.0",
        timeout: 5000,
    },
    cache: {
        enabled: true,
        maxSize: 10000,
        ttl: 3600,
    },
    upstreams: {
        groups: {
            default: ["8.8.8.8", "1.1.1.1"],
        },
        timeout: 5000,
    },
    blocking: {
        enabled: true,
        denylists: {},
        allowlists: {},
        clientGroupsBlock: {
            default: [],
        },
    },
    logging: {
        level: "info",
        queryLog: true,
        file: undefined,
    },
};
/**
 * Manages configuration loading and access
 */
class ConfigManager {
    constructor(configPath) {
        this.config = DEFAULT_CONFIG;
        this.configPath = configPath;
    }
    /**
     * Load configuration from file
     */
    async load() {
        try {
            // Check if path is a directory
            const stats = await fs_1.default.promises.stat(this.configPath);
            if (stats.isDirectory()) {
                // Load all YAML files in directory
                await this.loadFromDirectory();
            }
            else {
                // Load single file
                await this.loadFromFile(this.configPath);
            }
        }
        catch (error) {
            throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Load configuration from a directory containing YAML files
     */
    async loadFromDirectory() {
        const files = await fs_1.default.promises.readdir(this.configPath);
        const yamlFiles = files.filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
        // Load and merge all YAML files
        for (const file of yamlFiles) {
            const filePath = path_1.default.join(this.configPath, file);
            await this.loadFromFile(filePath);
        }
    }
    /**
     * Load configuration from a single file
     */
    async loadFromFile(filePath) {
        const content = await fs_1.default.promises.readFile(filePath, "utf8");
        let fileConfig;
        try {
            // Parse YAML
            fileConfig = js_yaml_1.default.load(content);
            // Merge with current config
            this.config = this.deepMerge(this.config, fileConfig);
        }
        catch (error) {
            throw new Error(`Failed to parse config file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        if (!source)
            return target;
        const output = { ...target };
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach((key) => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    }
                    else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                }
                else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
    /**
     * Check if value is an object
     */
    isObject(item) {
        return item && typeof item === "object" && !Array.isArray(item);
    }
}
exports.ConfigManager = ConfigManager;
