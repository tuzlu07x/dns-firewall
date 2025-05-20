# DNS Firewall

A robust DNS proxy with firewall capabilities to block unwanted domains, provide caching, and enhance your network security.

## Features

- **DNS Proxy**: Acts as a proxy between your devices and upstream DNS servers
- **Domain Blocking**: Block unwanted domains with customizable allow and deny lists
- **Caching**: Cache DNS responses for faster resolution and reduced external queries
- **Multiple Upstream Resolvers**: Configure different upstream DNS servers for different client groups
- **Deep Inspection**: Detect and block domains in CNAME records
- **DNS over HTTPS (DoH) Support**: Forward queries to DoH-enabled upstream resolvers
- **Flexible Configuration**: Simple YAML configuration with support for multiple files
- **Comprehensive Logging**: Log DNS queries and responses

## Installation

```bash
npm install dns-firewall
```

## Usage

### Basic Example

Create a simple DNS server with default settings:

```javascript
const { createServer } = require("dns-firewall");

// Create and start a DNS firewall server
const configPath = "./config.yml";

createServer(configPath)
  .then((server) => {
    server.start();
    console.log("DNS Firewall started!");

    // Handle termination signals
    process.on("SIGINT", () => {
      console.log("Shutting down...");
      server.stop().then(() => process.exit(0));
    });
  })
  .catch((err) => {
    console.error("Failed to start DNS Firewall:", err);
    process.exit(1);
  });
```

### Configuration File

Create a `config.yml` file with your desired configuration:

```yaml
# Server configuration
server:
  port: 53
  address: 0.0.0.0
  timeout: 5000

# Cache configuration
cache:
  enabled: true
  maxSize: 10000
  ttl: 3600

# Upstream DNS servers
upstreams:
  groups:
    default:
      - 8.8.8.8
      - 1.1.1.1
      # DNS over HTTPS example
      - https://dns.google/dns-query
    kids:
      - 1.1.1.3 # Cloudflare family filter
      - 8.8.8.8
  timeout: 5000

# Blocking configuration
blocking:
  enabled: true
  denylists:
    ads:
      - https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts # I did not activate Allowlist if you want to use it, please uncomment this line
    malware:
      - https://raw.githubusercontent.com/blocklistproject/Lists/master/malware.txt # I did not activate Allowlist if you want to use it, please uncomment this line
  allowlists:
    whitelist:
      - ./allowlists/whitelist.txt
  clientGroupsBlock:
    default:
      - ads
    kids:
      - ads
      - malware

# Logging configuration
logging:
  level: info
  queryLog: true
  file: ./logs/dns-queries.log
```

### Running the DNS Firewall

Run the DNS Firewall using the provided `bin/dns-firewall.js` script:

```bash
node bin/dns-firewall.js
```

This will start the DNS server with the specified configuration.

#### Example Output

```bash
┌───────────────────────────────────┐
│            DNS FIREWALL           │
└───────────────────────────────────┘

Starting DNS Firewall with config: /Users/fatihtuzlu/Downloads/project/config.yml
[2025-05-20T18:06:13.093Z] INFO: Starting DNS Firewall...
[2025-05-20T18:06:13.095Z] INFO: Configuration loaded
DNS Firewall started successfully!
[2025-05-20T18:06:13.101Z] INFO: DNS server listening on 127.0.0.1:5354
```

This output confirms the server is running and listening on 127.0.0.1:5354.

### Testing with dig

Use the dig command to test the DNS Firewall. Below are examples of blocked and unblocked domains based on the configuration.

Blocked Domain Example
Domains listed in the denylists (e.g., coccyxwickimp.com from the StevenBlack hosts file) return no answer or NXDOMAIN:

```bash
dig +short @127.0.0.1 -p 5354 coccyxwickimp.com
```

Expected Output: (No response, indicating the domain is blocked)

### Unblocked Domain Example

Domains not in the denylists or explicitly allowed (e.g., google.com) resolve to their IP addresses:

```bash
dig +short @127.0.0.1 -p 5354 google.com
111.XXX.XXX.XXX
```

## Configuration Options

### Server

- `port`: Port to listen on (default: 53)
- `address`: Interface to bind to (default: 0.0.0.0)
- `timeout`: Request timeout in milliseconds (default: 5000)

### Cache

- `enabled`: Enable or disable caching (default: true)
- `maxSize`: Maximum number of cached entries (default: 10000)
- `ttl`: Default time-to-live in seconds (default: 3600)

### Upstreams

- `groups`: Groups of upstream DNS servers
  - `default`: Default group used for clients without a specific group
- `timeout`: Timeout for upstream queries in milliseconds (default: 5000)

### Blocking

- `enabled`: Enable or disable blocking (default: true)
- `denylists`: Lists of domains to block
  - Each list can contain file paths or URLs
- `allowlists`: Lists of domains to allow regardless of blocklists
  - Each list can contain file paths or URLs
- `clientGroupsBlock`: Mapping of client groups to the lists they should use

### Logging

- `level`: Log level (error, warn, info, debug)
- `queryLog`: Enable or disable query logging
- `file`: Optional file path for logging

## Block Lists

DNS Firewall supports various blocklist formats:

1. **Plain domain lists**: One domain per line
2. **Hosts file format**: `127.0.0.1 domain.com`
3. **RegEx patterns**: `/example\\.com/i`

You can specify block lists as local files or URLs.

## Running as a System Service

### Using systemd (Linux)

Create a systemd service file:

```
[Unit]
Description=DNS Firewall Service
After=network.target

[Service]
ExecStart=/usr/bin/node /path/to/your/dns-firewall-server.js
Restart=on-failure
User=nobody
Group=nogroup
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Save this to `/etc/systemd/system/dns-firewall.service`, then:

```bash
sudo systemctl enable dns-firewall
sudo systemctl start dns-firewall
```

## CLI Usage

You can also use DNS Firewall as a command-line tool:

```bash
npx dns-firewall --config ./config.yml
```

## API Reference

### createServer(configPath)

Creates a new DNS Firewall server instance:

```javascript
const { createServer } = require("dns-firewall");
const server = await createServer("./config.yml");
```

### server.start()

Starts the DNS server:

```javascript
await server.start();
```

### server.stop()

Stops the DNS server:

```javascript
await server.stop();
```

## Development

To contribute to DNS Firewall:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run tests: `npm test`

## License

MIT
