import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { Config } from "../types";

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Config = {
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
export class ConfigManager {
  private config: Config = DEFAULT_CONFIG;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * Load configuration from file
   */
  public async load(): Promise<void> {
    try {
      // Check if path is a directory
      const stats = await fs.promises.stat(this.configPath);

      if (stats.isDirectory()) {
        // Load all YAML files in directory
        await this.loadFromDirectory();
      } else {
        // Load single file
        await this.loadFromFile(this.configPath);
      }
    } catch (error) {
      throw new Error(
        `Failed to load configuration: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Config {
    return this.config;
  }

  /**
   * Load configuration from a directory containing YAML files
   */
  private async loadFromDirectory(): Promise<void> {
    const files = await fs.promises.readdir(this.configPath);
    const yamlFiles = files.filter(
      (file) => file.endsWith(".yml") || file.endsWith(".yaml")
    );

    // Load and merge all YAML files
    for (const file of yamlFiles) {
      const filePath = path.join(this.configPath, file);
      await this.loadFromFile(filePath);
    }
  }

  /**
   * Load configuration from a single file
   */
  private async loadFromFile(filePath: string): Promise<void> {
    const content = await fs.promises.readFile(filePath, "utf8");
    let fileConfig: Partial<Config>;

    try {
      // Parse YAML
      fileConfig = yaml.load(content) as Partial<Config>;

      // Merge with current config
      this.config = this.deepMerge(this.config, fileConfig);
    } catch (error) {
      throw new Error(
        `Failed to parse config file ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    if (!source) return target;

    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  /**
   * Check if value is an object
   */
  private isObject(item: any): boolean {
    return item && typeof item === "object" && !Array.isArray(item);
  }
}
