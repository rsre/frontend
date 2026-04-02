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

  console.clear();

  const { waitUntilExit } = render(<App connection={connection} />);

  await waitUntilExit();
  connection.close();
}

main();
