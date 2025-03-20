import fs from "fs";
import {
  BlockingConfig,
  ClientInfo,
  DNSResponse,
  FilterResult,
} from "../types";

/**
 * Manages domain filtering based on blocklists and allowlists
 */
export class FilterManager {
  private config: BlockingConfig;
  private denyListDomains: Map<string, Set<string>> = new Map();
  private denyListRegex: Map<string, RegExp[]> = new Map();
  private allowListDomains: Map<string, Set<string>> = new Map();
  private allowListRegex: Map<string, RegExp[]> = new Map();

  constructor(config: BlockingConfig) {
    this.config = config;
  }

  /**
   * Initialize the filter manager by loading lists
   */
  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Load deny lists
    for (const [listName, sources] of Object.entries(this.config.denylists)) {
      const domains = new Set<string>();
      const regexPatterns: RegExp[] = [];

      for (const source of sources) {
        try {
          // Check if source is a file path or URL
          if (source.startsWith("http://") || source.startsWith("https://")) {
            await this.loadFromUrl(source, domains, regexPatterns);
          } else {
            await this.loadFromFile(source, domains, regexPatterns);
          }
        } catch (error) {
          console.error(
            `Error loading deny list ${listName} from ${source}:`,
            error
          );
        }
      }

      this.denyListDomains.set(listName, domains);
      this.denyListRegex.set(listName, regexPatterns);
    }

    // Load allow lists
    for (const [listName, sources] of Object.entries(this.config.allowlists)) {
      const domains = new Set<string>();
      const regexPatterns: RegExp[] = [];

      for (const source of sources) {
        try {
          // Check if source is a file path or URL
          if (source.startsWith("http://") || source.startsWith("https://")) {
            await this.loadFromUrl(source, domains, regexPatterns);
          } else {
            await this.loadFromFile(source, domains, regexPatterns);
          }
        } catch (error) {
          console.error(
            `Error loading allow list ${listName} from ${source}:`,
            error
          );
        }
      }

      this.allowListDomains.set(listName, domains);
      this.allowListRegex.set(listName, regexPatterns);
    }
  }

  /**
   * Check if a domain should be blocked
   * @param domain Domain to check
   * @param clientInfo Client information
   */
  public async checkDomain(
    domain: string,
    clientInfo: ClientInfo
  ): Promise<FilterResult> {
    if (!this.config.enabled) {
      return { blocked: false };
    }

    // Normalize domain (lowercase, remove trailing dot)
    const normalizedDomain = domain.toLowerCase().replace(/\.$/, "");

    // Get client group
    const clientGroup = clientInfo.group || "default";

    // Get lists for this client group
    const listsToCheck = this.config.clientGroupsBlock[clientGroup] || [];

    // First check if domain is in any allowlist
    for (const listName of listsToCheck) {
      const allowList = this.allowListDomains.get(listName);
      if (allowList && this.isDomainInList(normalizedDomain, allowList)) {
        return { blocked: false, reason: "Domain in allowlist", listName };
      }

      const allowRegexList = this.allowListRegex.get(listName);
      if (
        allowRegexList &&
        this.isDomainMatchingRegex(normalizedDomain, allowRegexList)
      ) {
        return {
          blocked: false,
          reason: "Domain matched allowlist regex",
          listName,
        };
      }
    }

    // Then check if domain is in any denylist
    for (const listName of listsToCheck) {
      const denyList = this.denyListDomains.get(listName);
      if (denyList && this.isDomainInList(normalizedDomain, denyList)) {
        return { blocked: true, reason: "Domain in denylist", listName };
      }

      const denyRegexList = this.denyListRegex.get(listName);
      if (
        denyRegexList &&
        this.isDomainMatchingRegex(normalizedDomain, denyRegexList)
      ) {
        return {
          blocked: true,
          reason: "Domain matched denylist regex",
          listName,
        };
      }
    }

    return { blocked: false };
  }

  /**
   * Check if a DNS response should be blocked
   * @param response DNS response to check
   * @param clientInfo Client information
   */
  public async checkResponse(
    response: DNSResponse,
    clientInfo: ClientInfo
  ): Promise<FilterResult> {
    if (
      !this.config.enabled ||
      !response.answers ||
      response.answers.length === 0
    ) {
      return { blocked: false };
    }

    for (const answer of response.answers) {
      if (answer.type === "CNAME" && typeof answer.data === "string") {
        const cnameTarget = answer.data.toLowerCase().replace(/\.$/, "");
        const cnameResult = await this.checkDomain(cnameTarget, clientInfo);

        if (cnameResult.blocked) {
          return {
            blocked: true,
            reason: `CNAME points to blocked domain: ${cnameTarget}`,
            listName: cnameResult.listName,
          };
        }
      }
    }

    return { blocked: false };
  }

  /**
   * Check if a domain is in a list of domains
   * @param domain Domain to check
   * @param list List of domains to check against
   */
  private isDomainInList(domain: string, list: Set<string>): boolean {
    // Check exact match
    if (list.has(domain)) {
      return true;
    }

    // Check parent domains
    let parts = domain.split(".");
    while (parts.length > 2) {
      // Don't check TLD
      parts.shift();
      const parentDomain = parts.join(".");
      if (list.has(parentDomain)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a domain matches any regex in a list
   * @param domain Domain to check
   * @param regexList List of regex patterns to check against
   */
  private isDomainMatchingRegex(domain: string, regexList: RegExp[]): boolean {
    return regexList.some((regex) => regex.test(domain));
  }

  /**
   * Load domains from a file
   * @param filePath Path to file
   * @param domains Set to add domains to
   * @param regexPatterns Array to add regex patterns to
   */
  private async loadFromFile(
    filePath: string,
    domains: Set<string>,
    regexPatterns: RegExp[]
  ): Promise<void> {
    const content = await fs.promises.readFile(filePath, "utf8");
    this.parseDomainsFromContent(content, domains, regexPatterns);
  }

  /**
   * Load domains from a URL
   * @param url URL to load from
   * @param domains Set to add domains to
   * @param regexPatterns Array to add regex patterns to
   */
  private async loadFromUrl(
    url: string,
    domains: Set<string>,
    regexPatterns: RegExp[]
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch from ${url}: ${response.status} ${response.statusText}`
      );
    }

    const content = await response.text();
    this.parseDomainsFromContent(content, domains, regexPatterns);
  }

  /**
   * Parse domains from content
   * @param content Content to parse
   * @param domains Set to add domains to
   * @param regexPatterns Array to add regex patterns to
   */
  private parseDomainsFromContent(
    content: string,
    domains: Set<string>,
    regexPatterns: RegExp[]
  ): void {
    const lines = content.split(/\r?\n/);

    for (let line of lines) {
      // Remove comments
      line = line.replace(/#.*$/, "").trim();

      // Skip empty lines
      if (!line) {
        continue;
      }

      // Check if it's a hosts file format
      if (line.match(/^\s*\d+\.\d+\.\d+\.\d+\s+/)) {
        // Extract domain from hosts file format (e.g., "127.0.0.1 example.com")
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const domain = parts[1].toLowerCase();
          if (this.isValidDomain(domain)) {
            domains.add(domain);
          }
        }
      }
      // Check if it's a regex pattern
      else if (line.startsWith("/") && line.match(/\/[a-z]*$/i)) {
        try {
          // Parse regex pattern (e.g., "/example\\.com/i")
          const match = line.match(/^\/(.*)\/([a-z]*)$/i);
          if (match) {
            const [, pattern, flags] = match;
            regexPatterns.push(new RegExp(pattern, flags));
          }
        } catch (e) {
          console.error(`Invalid regex pattern: ${line}`);
        }
      }
      // Otherwise treat as a domain
      else if (this.isValidDomain(line)) {
        domains.add(line.toLowerCase());
      }
    }
  }

  /**
   * Check if a string is a valid domain
   * @param domain Domain to check
   */
  private isValidDomain(domain: string): boolean {
    // Simple domain validation (not comprehensive)
    return /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(domain);
  }
}
