#!/usr/bin/env node

const path = require("path");
const { createServer } = require("../dist/index");

const args = process.argv.slice(2);
let configPath = "./config.yml";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--config" && i + 1 < args.length) {
    configPath = args[i + 1];
    i++;
  }
}

configPath = path.resolve(process.cwd(), configPath);

console.log(`
┌───────────────────────────────────┐
│            DNS FIREWALL           │
└───────────────────────────────────┘
`);

console.log(`Starting DNS Firewall with config: ${configPath}`);

createServer(configPath)
  .then((server) => {
    server.start();
    console.log("DNS Firewall started successfully!");

    process.on("SIGINT", () => {
      console.log("\nShutting down...");
      server.stop().then(() => process.exit(0));
    });

    process.on("SIGTERM", () => {
      console.log("\nShutting down...");
      server.stop().then(() => process.exit(0));
    });
  })
  .catch((err) => {
    console.error("Failed to start DNS Firewall:", err);
    process.exit(1);
  });
