"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resolver = void 0;
const dnsPacket = __importStar(require("dns-packet"));
const dgram_1 = __importDefault(require("dgram"));
class Resolver {
    constructor(config, cacheManager, filterManager, logger) {
        this.config = config;
        this.cacheManager = cacheManager;
        this.filterManager = filterManager;
        this.logger = logger;
    }
    async resolve(query, clientInfo) {
        const cacheKey = this.getCacheKey(query);
        const cachedResponse = this.cacheManager.get(cacheKey);
        if (cachedResponse) {
            this.logger.debug(`Cache hit for ${query.name}`);
            return this.updateResponseId(cachedResponse, query.id);
        }
        const filterResult = await this.filterManager.checkDomain(query.name, clientInfo);
        if (filterResult.blocked) {
            this.logger.info(`Blocked query for ${query.name} (${filterResult.reason})`);
            return this.createBlockedResponse(query);
        }
        try {
            const response = await this.queryUpstream(query, clientInfo);
            if (response) {
                const responseFilterResult = await this.filterManager.checkResponse(response, clientInfo);
                if (responseFilterResult.blocked) {
                    this.logger.info(`Blocked response for ${query.name} (${responseFilterResult.reason})`);
                    return this.createBlockedResponse(query);
                }
                if (response.answers && response.answers.length > 0) {
                    this.cacheManager.set(cacheKey, response);
                }
                return response;
            }
        }
        catch (error) {
            this.logger.error(`Error querying upstream for ${query.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
        return this.createEmptyResponse(query);
    }
    createBlockedResponse(query) {
        return {
            id: query.id,
            flags: dnsPacket.RECURSION_DESIRED | dnsPacket.RECURSION_AVAILABLE,
            questions: [query],
            answers: [],
            authorities: [],
            additionals: [],
        };
    }
    createEmptyResponse(query) {
        return {
            id: query.id,
            flags: dnsPacket.RECURSION_DESIRED | dnsPacket.RECURSION_AVAILABLE,
            questions: [query],
            answers: [],
            authorities: [],
            additionals: [],
        };
    }
    async queryUpstream(query, clientInfo) {
        const group = clientInfo.group || "default";
        const upstreams = this.config.groups[group] || this.config.groups.default;
        if (!upstreams || upstreams.length === 0) {
            this.logger.warn(`No upstream resolvers configured for group: ${group}`);
            return null;
        }
        const upstream = upstreams[Math.floor(Math.random() * upstreams.length)];
        if (upstream.startsWith("https://")) {
            return this.queryDoH(upstream, query);
        }
        else if (upstream.startsWith("tcp-tls:")) {
            this.logger.warn("DoT not implemented yet, falling back to UDP");
        }
        return this.queryUdp(upstream, query);
    }
    async queryUdp(upstream, query) {
        const socket = dgram_1.default.createSocket("udp4");
        const timeout = this.config.timeout || 5000;
        let address = upstream;
        let port = 53;
        if (upstream.includes(":")) {
            const parts = upstream.split(":");
            address = parts[0];
            port = parseInt(parts[1], 10);
        }
        // Define a packet that conforms to dns-packet's expected format
        const packet = {
            id: query.id,
            type: "query",
            flags: dnsPacket.RECURSION_DESIRED,
            questions: [
                {
                    name: query.name,
                    type: query.type,
                    class: query.class ?? "IN",
                },
            ],
        };
        const buffer = dnsPacket.encode(packet);
        try {
            return await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    socket.close();
                    reject(new Error(`Upstream query timed out after ${timeout}ms`));
                }, timeout);
                socket.on("message", (msg) => {
                    clearTimeout(timeoutId);
                    try {
                        // Process the response packet and convert it to our DNSResponse type
                        const decodedPacket = dnsPacket.decode(msg);
                        const response = this.convertPacketToDNSResponse(decodedPacket, query.id);
                        socket.close();
                        resolve(response);
                    }
                    catch (err) {
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
        }
        catch (error) {
            this.logger.error(`UDP query error: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    async queryDoH(upstream, query) {
        try {
            // Define a packet that conforms to dns-packet's expected format
            const packet = {
                id: query.id,
                type: "query",
                flags: dnsPacket.RECURSION_DESIRED,
                questions: [
                    {
                        name: query.name,
                        type: query.type,
                        class: query.class ?? "IN",
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
                throw new Error(`DoH request failed: ${response.status} ${response.statusText}`);
            }
            const responseBuffer = await response.arrayBuffer();
            const decodedPacket = dnsPacket.decode(Buffer.from(responseBuffer));
            return this.convertPacketToDNSResponse(decodedPacket, query.id);
        }
        catch (error) {
            this.logger.error(`DoH query error: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    /**
     * Convert a dns-packet decoded response to our DNSResponse type
     */
    convertPacketToDNSResponse(packet, queryId) {
        // Map questions from dns-packet format to our DNSQuery format
        const questions = (packet.questions || []).map((q) => ({
            id: queryId,
            name: q.name,
            type: q.type,
            class: q.class || "IN",
        }));
        // Map answers from dns-packet format to our DNSAnswer format
        const answers = (packet.answers || []).map((a) => {
            // Handle the case where 'a' might be an OptAnswer which doesn't have ttl
            const ttl = "ttl" in a ? a.ttl : 0;
            return {
                name: a.name,
                type: a.type,
                class: a.class || "IN",
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
    getCacheKey(query) {
        return `${query.name}:${query.type}`;
    }
    updateResponseId(response, id) {
        return {
            ...response,
            id,
        };
    }
}
exports.Resolver = Resolver;
