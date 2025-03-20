import * as dnsPacket from "dns-packet";
import dgram from "dgram";
import {
  UpstreamConfig,
  DNSQuery,
  DNSResponse,
  ClientInfo,
  DNSPacket,
  DNSAnswer,
} from "../types";
import { CacheManager } from "../cache/cacheManager";
import { FilterManager } from "../filter/filterManager";
import { Logger } from "../utils/logger";

export class Resolver {
  private config: UpstreamConfig;
  private cacheManager: CacheManager;
  private filterManager: FilterManager;
  private logger: Logger;

  constructor(
    config: UpstreamConfig,
    cacheManager: CacheManager,
    filterManager: FilterManager,
    logger: Logger
  ) {
    this.config = config;
    this.cacheManager = cacheManager;
    this.filterManager = filterManager;
    this.logger = logger;
  }

  public async resolve(
    query: DNSQuery,
    clientInfo: ClientInfo
  ): Promise<DNSResponse | null> {
    const cacheKey = this.getCacheKey(query);

    const cachedResponse = this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      this.logger.debug(`Cache hit for ${query.name}`);
      return this.updateResponseId(cachedResponse, query.id);
    }

    const filterResult = await this.filterManager.checkDomain(
      query.name,
      clientInfo
    );
    if (filterResult.blocked) {
      this.logger.info(
        `Blocked query for ${query.name} (${filterResult.reason})`
      );
      return this.createBlockedResponse(query);
    }

    try {
      const response = await this.queryUpstream(query, clientInfo);

      if (response) {
        const responseFilterResult = await this.filterManager.checkResponse(
          response,
          clientInfo
        );
        if (responseFilterResult.blocked) {
          this.logger.info(
            `Blocked response for ${query.name} (${responseFilterResult.reason})`
          );
          return this.createBlockedResponse(query);
        }

        if (response.answers && response.answers.length > 0) {
          this.cacheManager.set(cacheKey, response);
        }

        return response;
      }
    } catch (error) {
      this.logger.error(
        `Error querying upstream for ${query.name}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return this.createEmptyResponse(query);
  }

  private createBlockedResponse(query: DNSQuery): DNSResponse {
    return {
      id: query.id,
      flags: dnsPacket.RECURSION_DESIRED | dnsPacket.RECURSION_AVAILABLE,
      questions: [query],
      answers: [],
      authorities: [],
      additionals: [],
    };
  }

  private createEmptyResponse(query: DNSQuery): DNSResponse {
    return {
      id: query.id,
      flags: dnsPacket.RECURSION_DESIRED | dnsPacket.RECURSION_AVAILABLE,
      questions: [query],
      answers: [],
      authorities: [],
      additionals: [],
    };
  }

  private async queryUpstream(
    query: DNSQuery,
    clientInfo: ClientInfo
  ): Promise<DNSResponse | null> {
    const group = clientInfo.group || "default";
    const upstreams = this.config.groups[group] || this.config.groups.default;

    if (!upstreams || upstreams.length === 0) {
      this.logger.warn(`No upstream resolvers configured for group: ${group}`);
      return null;
    }

    const upstream = upstreams[Math.floor(Math.random() * upstreams.length)];

    if (upstream.startsWith("https://")) {
      return this.queryDoH(upstream, query);
    } else if (upstream.startsWith("tcp-tls:")) {
      this.logger.warn("DoT not implemented yet, falling back to UDP");
    }

    return this.queryUdp(upstream, query);
  }

  private async queryUdp(
    upstream: string,
    query: DNSQuery
  ): Promise<DNSResponse | null> {
    const socket = dgram.createSocket("udp4");
    const timeout = this.config.timeout || 5000;

    let address = upstream;
    let port = 53;

    if (upstream.includes(":")) {
      const parts = upstream.split(":");
      address = parts[0];
      port = parseInt(parts[1], 10);
    }

    // Define a packet that conforms to dns-packet's expected format
    const packet: DNSPacket = {
      id: query.id,
      type: "query",
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [
        {
          name: query.name,
          type: query.type,
          class: query.class ?? ("IN" as dnsPacket.RecordClass),
        },
      ],
    };

    const buffer = dnsPacket.encode(packet);

    try {
      return await new Promise<DNSResponse | null>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          socket.close();
          reject(new Error(`Upstream query timed out after ${timeout}ms`));
        }, timeout);

        socket.on("message", (msg) => {
          clearTimeout(timeoutId);
          try {
            // Process the response packet and convert it to our DNSResponse type
            const decodedPacket = dnsPacket.decode(msg);
            const response: DNSResponse = this.convertPacketToDNSResponse(
              decodedPacket,
              query.id
            );
            socket.close();
            resolve(response);
          } catch (err) {
            socket.close();
            reject(err);
          }
        });

        socket.on("error", (err) => {
          clearTimeout(timeoutId);
          socket.close();
          reject(err);
        });

        socket.send(buffer, port, address, (err) => {
          if (err) {
            clearTimeout(timeoutId);
            socket.close();
            reject(err);
          }
        });
      });
    } catch (error) {
      this.logger.error(
        `UDP query error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  private async queryDoH(
    upstream: string,
    query: DNSQuery
  ): Promise<DNSResponse | null> {
    try {
      // Define a packet that conforms to dns-packet's expected format
      const packet: DNSPacket = {
        id: query.id,
        type: "query",
        flags: dnsPacket.RECURSION_DESIRED,
        questions: [
          {
            name: query.name,
            type: query.type,
            class: query.class ?? ("IN" as dnsPacket.RecordClass),
          },
        ],
      };

      const buffer = dnsPacket.encode(packet);

      const base64url = buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const response = await fetch(`${upstream}?dns=${base64url}`, {
        headers: {
          Accept: "application/dns-message",
        },
      });

      if (!response.ok) {
        throw new Error(
          `DoH request failed: ${response.status} ${response.statusText}`
        );
      }

      const responseBuffer = await response.arrayBuffer();
      const decodedPacket = dnsPacket.decode(Buffer.from(responseBuffer));
      return this.convertPacketToDNSResponse(decodedPacket, query.id);
    } catch (error) {
      this.logger.error(
        `DoH query error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Convert a dns-packet decoded response to our DNSResponse type
   */
  private convertPacketToDNSResponse(
    packet: dnsPacket.Packet,
    queryId: number
  ): DNSResponse {
    // Map questions from dns-packet format to our DNSQuery format
    const questions: DNSQuery[] = (packet.questions || []).map((q) => ({
      id: queryId,
      name: q.name,
      type: q.type,
      class: q.class || ("IN" as dnsPacket.RecordClass),
    }));

    // Map answers from dns-packet format to our DNSAnswer format
    const answers: DNSAnswer[] = (packet.answers || []).map((a: any) => {
      // Handle the case where 'a' might be an OptAnswer which doesn't have ttl
      const ttl = "ttl" in a ? a.ttl : 0;

      return {
        name: a.name,
        type: a.type,
        class: a.class || ("IN" as dnsPacket.RecordClass),
        ttl: ttl || 0,
        data: a.data || {},
      };
    });

    return {
      id: queryId, // Use the query ID passed in to ensure consistency
      flags: packet.flags || 0,
      questions: questions,
      answers: answers,
      authorities: packet.authorities || [],
      additionals: packet.additionals || [],
    };
  }

  private getCacheKey(query: DNSQuery): string {
    return `${query.name}:${query.type}`;
  }

  private updateResponseId(response: DNSResponse, id: number): DNSResponse {
    return {
      ...response,
      id,
    };
  }
}
