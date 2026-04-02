#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { connect, loadConfig } from "./connection.js";
import { App } from "./app.js";

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  console.log(`Connecting to ${config.url}…`);

  let connection;
  try {
    connection = await connect(config);
  } catch (e) {
    console.error(
      `Failed to connect: ${e instanceof Error ? e.message : String(e)}`
    );
    process.exit(1);
  }

  // Enter alternate screen buffer — keeps Ink output out of scrollback history,
  // exactly like vim/htop/mc do. Restored unconditionally on exit.
  process.stdout.write("\x1b[?1049h\x1b[H");

  const cleanup = () => {
    process.stdout.write("\x1b[?1049l");
  };

  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });

  const { waitUntilExit } = render(<App connection={connection} />);

  await waitUntilExit();
  cleanup();
  connection.close();
}

main();
