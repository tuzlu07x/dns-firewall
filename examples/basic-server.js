const { createServer } = require("dns-firewall");

// Create and start a DNS firewall server with default configuration
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

    process.on("SIGTERM", () => {
      console.log("Shutting down...");
      server.stop().then(() => process.exit(0));
    });
  })
  .catch((err) => {
    console.error("Failed to start DNS Firewall:", err);
    process.exit(1);
  });
