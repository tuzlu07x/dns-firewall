import * as dnsPacket from "dns-packet";

export interface ServerConfig {
  port: number;
  address: string;
  timeout: number;
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number; // Time to live in seconds
}

export interface UpstreamConfig {
  groups: {
    [groupName: string]: string[];
  };
  timeout: number;
}

export interface BlockingConfig {
  enabled: boolean;
  denylists: {
    [listName: string]: string[];
  };
  allowlists: {
    [listName: string]: string[];
  };
  clientGroupsBlock: {
    [groupName: string]: string[];
  };
}

export interface LoggingConfig {
  level: "error" | "warn" | "info" | "debug";
  queryLog: boolean;
  file?: string;
}

export interface Config {
  server: ServerConfig;
  cache: CacheConfig;
  upstreams: UpstreamConfig;
  blocking: BlockingConfig;
  logging: LoggingConfig;
}

// Define our own DNSPacket type that closely aligns with dns-packet's Packet type
export interface DNSPacket {
  id: number;
  type: "query" | "response";
  flags: number;
  questions: dnsPacket.Question[];
  answers?: dnsPacket.Answer[];
  authorities?: dnsPacket.Answer[];
  additionals?: dnsPacket.Answer[];
}

// Define our own DNSQuestion that aligns with dns-packet's structure
export interface DNSQuestion {
  name: string;
  type: dnsPacket.RecordType;
  class: dnsPacket.RecordClass;
}

export interface DNSQuery extends DNSQuestion {
  id: number;
}

// Our custom DNSAnswer with guaranteed ttl
export interface DNSAnswer {
  name: string;
  type: dnsPacket.RecordType;
  class: dnsPacket.RecordClass;
  ttl: number;
  data: string | Buffer | object;
}

export interface DNSResponse {
  id: number;
  flags: number;
  questions: DNSQuery[];
  answers: DNSAnswer[];
  authorities: dnsPacket.Answer[];
  additionals: dnsPacket.Answer[];
}

export interface CacheEntry {
  response: DNSResponse;
  expires: number;
}

export interface FilterResult {
  blocked: boolean;
  reason?: string;
  listName?: string;
}

export interface ClientInfo {
  ip: string;
  group?: string;
}
