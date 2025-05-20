import { BlockingConfig, ClientInfo, DNSResponse, FilterResult } from "../types";
/**
 * Manages domain filtering based on blocklists and allowlists
 */
export declare class FilterManager {
    private config;
    private denyListDomains;
    private denyListRegex;
    private allowListDomains;
    private allowListRegex;
    constructor(config: BlockingConfig);
    /**
     * Initialize the filter manager by loading lists
     */
    initialize(): Promise<void>;
    /**
     * Check if a domain should be blocked
     * @param domain Domain to check
     * @param clientInfo Client information
     */
    checkDomain(domain: string, clientInfo: ClientInfo): Promise<FilterResult>;
    /**
     * Check if a DNS response should be blocked
     * @param response DNS response to check
     * @param clientInfo Client information
     */
    checkResponse(response: DNSResponse, clientInfo: ClientInfo): Promise<FilterResult>;
    /**
     * Check if a domain is in a list of domains
     * @param domain Domain to check
     * @param list List of domains to check against
     */
    private isDomainInList;
    /**
     * Check if a domain matches any regex in a list
     * @param domain Domain to check
     * @param regexList List of regex patterns to check against
     */
    private isDomainMatchingRegex;
    /**
     * Load domains from a file
     * @param filePath Path to file
     * @param domains Set to add domains to
     * @param regexPatterns Array to add regex patterns to
     */
    private loadFromFile;
    /**
     * Load domains from a URL
     * @param url URL to load from
     * @param domains Set to add domains to
     * @param regexPatterns Array to add regex patterns to
     */
    private loadFromUrl;
    /**
     * Parse domains from content
     * @param content Content to parse
     * @param domains Set to add domains to
     * @param regexPatterns Array to add regex patterns to
     */
    private parseDomainsFromContent;
    /**
     * Check if a string is a valid domain
     * @param domain Domain to check
     */
    private isValidDomain;
}
