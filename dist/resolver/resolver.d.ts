import { UpstreamConfig, DNSQuery, DNSResponse, ClientInfo } from "../types";
import { CacheManager } from "../cache/cacheManager";
import { FilterManager } from "../filter/filterManager";
import { Logger } from "../utils/logger";
export declare class Resolver {
    private config;
    private cacheManager;
    private filterManager;
    private logger;
    constructor(config: UpstreamConfig, cacheManager: CacheManager, filterManager: FilterManager, logger: Logger);
    resolve(query: DNSQuery, clientInfo: ClientInfo): Promise<DNSResponse | null>;
    private createBlockedResponse;
    private createEmptyResponse;
    private queryUpstream;
    private queryUdp;
    private queryDoH;
    /**
     * Convert a dns-packet decoded response to our DNSResponse type
     */
    private convertPacketToDNSResponse;
    private getCacheKey;
    private updateResponseId;
}
