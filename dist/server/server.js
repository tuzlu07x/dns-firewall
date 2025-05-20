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
exports.DNSServer = void 0;
const dgram_1 = __importDefault(require("dgram"));
const dnsPacket = __importStar(require("dns-packet"));
/**
 * DNS Server that listens for queries and processes them
 */
class DNSServer {
    /**
     * Create a new DNS server
     * @param config Server configuration
     * @param resolver DNS resolver to handle queries
     * @param logger Logger instance
     */
    constructor(config, resolver, logger) {
        this.running = false;
        this.config = config;
        this.resolver = resolver;
        this.logger = logger;
        this.server = dgram_1.default.createSocket("udp4");
        this.setupEventHandlers();
    }
    /**
     * Setup UDP socket event handlers
     */
    setupEventHandlers() {
        // Handle incoming messages
        this.server.on("message", (msg, rinfo) => {
            this.handleMessage(msg, rinfo).catch((err) => {
                this.logger.error(`Error handling DNS message: ${err}`);
            });
        });
        // Handle server errors
        this.server.on("error", (err) => {
            this.logger.error(`Server error: ${err.message}`);
            this.server.close();
        });
        // Log when server starts listening
        this.server.on("listening", () => {
            const address = this.server.address();
            this.logger.info(`DNS server listening on ${address.address}:${address.port}`);
            this.running = true;
        });
    }
    /**
     * Start the DNS server
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.server.bind(this.config.port, this.config.address, () => {
                    resolve();
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stop the DNS server
     */
    stop() {
        return new Promise((resolve) => {
            if (!this.running) {
                resolve();
                return;
            }
            this.server.close(() => {
                this.running = false;
                this.logger.info("DNS server stopped");
                resolve();
            });
        });
    }
    /**
     * Handle incoming DNS message
     */
    async handleMessage(msg, rinfo) {
        try {
            // Parse the DNS query
            const query = dnsPacket.decode(msg);
            if (!query.questions || query.questions.length === 0) {
                this.logger.warn("Received DNS query with no questions");
                return;
            }
            const clientInfo = { ip: rinfo.address };
            // Process each question in the query
            const promises = query.questions.map(async (question) => {
                this.logger.debug(`Query from ${rinfo.address}: ${question.name} (${question.type})`);
                // Create a DNSQuery object with all required properties
                const dnsQuery = {
                    id: query.id || 0,
                    name: question.name,
                    type: question.type,
                    class: question.class ?? "IN",
                };
                // Resolve the query
                const response = await this.resolver.resolve(dnsQuery, clientInfo);
                // Send the response back to the client
                if (response) {
                    // Convert the response to a format compatible with dns-packet
                    const packetResponse = {
                        id: response.id,
                        type: "response",
                        flags: response.flags,
                        questions: response.questions.map((q) => ({
                            name: q.name,
                            type: q.type,
                            class: q.class ?? "IN",
                        })),
                        answers: response.answers,
                        authorities: response.authorities || [],
                        additionals: response.additionals || [],
                    };
                    const responseBuffer = dnsPacket.encode(packetResponse);
                    this.server.send(responseBuffer, rinfo.port, rinfo.address);
                }
            });
            await Promise.all(promises);
        }
        catch (error) {
            this.logger.error(`Error processing DNS message: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.DNSServer = DNSServer;
