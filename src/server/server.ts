import dgram from "dgram";
import * as dnsPacket from "dns-packet";
import { ServerConfig, DNSQuery } from "../types";
import { Resolver } from "../resolver/resolver";
import { Logger } from "../utils/logger";

/**
 * DNS Server that listens for queries and processes them
 */
export class DNSServer {
  private server: dgram.Socket;
  private config: ServerConfig;
  private resolver: Resolver;
  private logger: Logger;
  private running: boolean = false;

  /**
   * Create a new DNS server
   * @param config Server configuration
   * @param resolver DNS resolver to handle queries
   * @param logger Logger instance
   */
  constructor(config: ServerConfig, resolver: Resolver, logger: Logger) {
    this.config = config;
    this.resolver = resolver;
    this.logger = logger;
    this.server = dgram.createSocket("udp4");

    this.setupEventHandlers();
  }

  /**
   * Setup UDP socket event handlers
   */
  private setupEventHandlers(): void {
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
      this.logger.info(
        `DNS server listening on ${address.address}:${address.port}`
      );
      this.running = true;
    });
  }

  /**
   * Start the DNS server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.bind(this.config.port, this.config.address, () => {
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the DNS server
   */
  public stop(): Promise<void> {
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
  private async handleMessage(
    msg: Buffer,
    rinfo: dgram.RemoteInfo
  ): Promise<void> {
    try {
      // Parse the DNS query
      const query = dnsPacket.decode(msg) as dnsPacket.Packet;

      if (!query.questions || query.questions.length === 0) {
        this.logger.warn("Received DNS query with no questions");
        return;
      }

      const clientInfo = { ip: rinfo.address };

      // Process each question in the query
      const promises = query.questions.map(async (question) => {
        this.logger.debug(
          `Query from ${rinfo.address}: ${question.name} (${question.type})`
        );

        // Create a DNSQuery object with all required properties
        const dnsQuery: DNSQuery = {
          id: query.id || 0,
          name: question.name,
          type: question.type,
          class: question.class ?? ("IN" as dnsPacket.RecordClass),
        };

        // Resolve the query
        const response = await this.resolver.resolve(dnsQuery, clientInfo);

        // Send the response back to the client
        if (response) {
          // Convert the response to a format compatible with dns-packet
          const packetResponse: dnsPacket.Packet = {
            id: response.id,
            type: "response",
            flags: response.flags,
            questions: response.questions.map((q) => ({
              name: q.name,
              type: q.type,
              class: q.class ?? ("IN" as dnsPacket.RecordClass),
            })),
            answers: response.answers as dnsPacket.Answer[],
            authorities: response.authorities || [],
            additionals: response.additionals || [],
          };

          const responseBuffer = dnsPacket.encode(packetResponse);
          this.server.send(responseBuffer, rinfo.port, rinfo.address);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      this.logger.error(
        `Error processing DNS message: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
